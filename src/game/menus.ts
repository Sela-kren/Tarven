/** The settings, save and load menus, and the yes/no question they ask before overwriting or losing progress. */
import type { Game } from "./game";
import { pixelSvg } from "./icons";
import { MANUAL_SLOTS, readSave, slotName, SLOTS, writeSave } from "./save";
import { desirePenalties, horny, WET_PLEASURE, type DesirePenalties } from "./desire";
import { KINK_NAMES } from "./kinktalk";
import { METER_NAMES, METERS, PASSIVE_BY_ID, PASSIVE_GROUPS } from "./passives";
import { AUTO_TOUCH_MAX, HOLD_BASE, PREFER_PUSH, writeTouchSettings } from "./touchsettings";

/** The gear that marks a settings board, in the same pixel art as the HUD's icons. */
const GEAR = pixelSvg(
  [
    "......KKKK......",
    "...KK.KGGK.KK...",
    "..KGGKKGGKKGGK..",
    "..KGGGGGGGGGGK..",
    "...KGGGDDGGGK...",
    ".KKKGGDKKDGGKKK.",
    "KGGGGDK..KDGGGGK",
    "KGGGGDK..KDGGGGK",
    "KDDDGDK..KDGDDDK",
    "KDDDDDK..KDDDDDK",
    ".KKKDDDKKDDDKKK.",
    "...KDDDDDDDDK...",
    "..KDDDDDDDDDDK..",
    "..KDDKKDDKKDDK..",
    "...KK.KDDK.KK...",
    "......KKKK......",
  ],
  { K: "#1c140e", G: "#ffe27a", D: "#b8922c" },
);

/**
 * The settings: music and effects levels, each on a slider (M still mutes everything at any time), and whether
 * eager guests may touch her without asking: on or off, up to how bold, and how often.
 */
export function showSettingsMenu(game: Game, back: () => void): void {
  game.openMenu("Settings", [], [], back);
  const box = game.panelEl.querySelector(".box");
  const menu = box?.querySelector(".menu");
  if (!box || !menu) return;
  // Settings wear a gear in the corner.
  const gear = document.createElement("div");
  gear.className = "corner-icon";
  gear.setAttribute("aria-hidden", "true");
  gear.innerHTML = GEAR;
  box.append(gear);
  const { settings } = game.audio;
  /** A row with a slider, from `min` to `max`, showing its value the way `format` writes it. */
  const ranged = (
    name: string,
    value: number,
    { min, max, step, format }: { min: number; max: number; step: number; format: (value: number) => string },
    set: (value: number) => void,
    onLetGo?: () => void,
  ) => {
    const row = document.createElement("label");
    row.className = "slider";
    const label = document.createElement("span");
    label.className = "name";
    label.textContent = name;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    const shown = document.createElement("span");
    shown.className = "value";
    const show = () => {
      const at = Number(input.value);
      shown.textContent = format(at);
      // The track fills up to the thumb.
      input.style.setProperty("--fill", `${((at - min) / (max - min)) * 100}%`);
    };
    show();
    input.addEventListener("input", () => {
      show();
      set(Number(input.value));
    });
    if (onLetGo) input.addEventListener("change", onLetGo);
    row.append(label, input, shown);
    return row;
  };
  const percent = { min: 0, max: 100, step: 5, format: (value: number) => (value === 0 ? "Off" : `${value}%`) };
  const slider = (name: string, level: number, set: (level: number) => void, onLetGo?: () => void) =>
    ranged(name, Math.round(level * 100), percent, (value) => set(value / 100), onLetGo);
  box.insertBefore(
    slider("Music", settings.music, (music) => game.audio.change({ music, muted: false })),
    menu,
  );
  box.insertBefore(
    // Letting go plays a sound at the new level, so you hear what you've picked.
    slider("Effects", settings.effects, (effects) => game.audio.change({ effects, muted: false }), () => game.audio.play("click")),
    menu,
  );

  // Eager guests: switching it on here is the player saying yes to it, so it takes effect at once.
  const touch = game.tavern.touchSettings;
  const save = () => writeTouchSettings(touch);
  const heading = document.createElement("div");
  heading.className = "settings-heading";
  heading.textContent = "Consent";
  const note = document.createElement("p");
  note.className = "settings-note";
  note.textContent =
    "On: every touch stops and asks you, at the bar and in a brawl. Off: when a lustful, bold guest (or a worked-up brawler) reaches, their push (nerve, their taste, how much of you is on show) is checked against your hold (the touch's boldness, less your desire, passives and experience). If they push past it, the touch plays out on its own; if not, you're asked. Only touches you'd say yes to anyway, never when anyone's too drunk, and Pull away still works on the next reach. Your clothes go through the same check, but you hold on to them harder.";
  const toggle = document.createElement("button");
  toggle.className = "settings-toggle";
  // Consent off is the player saying yes in advance: eager guests' touches play out on their own.
  const auto = () => touch.autoTouch && touch.agreed;
  const showToggle = () => {
    toggle.textContent = auto() ? "Consent: Off (eager guests don't ask)" : "Consent: On (always ask me)";
    toggle.classList.toggle("on", !auto());
  };
  showToggle();
  toggle.addEventListener("click", () => {
    if (auto()) touch.autoTouch = false;
    else {
      touch.autoTouch = true;
      touch.agreed = true;
    }
    save();
    showToggle();
    game.audio.play("click");
  });
  const boldness = ranged(
    "Up to boldness",
    touch.upTo,
    { min: 1, max: AUTO_TOUCH_MAX, step: 1, format: (value) => `${value}/10` },
    (value) => {
      touch.upTo = value;
      save();
    },
  );
  for (const row of [heading, note, toggle, boldness]) box.insertBefore(row, menu);
}

/** One number for the dev panel: whole numbers plain, the rest to one place. */
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * The ] key, in development: the Consent check laid bare. Her side (desires, exposure, passives, practice) as she
 * stands now, and the last guest who reached: their side, both totals, and what came of it.
 */
export function showDevPanel(game: Game, back: () => void): void {
  const { tavern } = game;
  const s = tavern.touchSettings;
  const consentOff = s.autoTouch && s.agreed;
  const her: string[] = [
    `Consent: ${consentOff ? "Off: touches that push past her hold play out on their own" : "On: every touch asks"} · up to boldness ${s.upTo}`,
    `Desires: ${METERS.map((m) => `${METER_NAMES[m]} ${Math.floor(tavern.meters[m])}`).join(" · ")}`,
    `Clothing: ${tavern.strippedPieces.length === 0 ? "dressed" : `${tavern.strippedPieces.length} off (${tavern.strippedPieces.join(", ")})`}`,
    `Passives: ${passiveCounts(tavern.passives)}`,
    `Kink (how she talks after the check): ${KINK_NAMES[tavern.kink]}`,
    `Experience (times let): ${experience(tavern.touchMemory.lets)}`,
    `Lewdness ${tavern.lewdness} · Corruption ${num(tavern.corruption)} · Drunk ${num(tavern.drunk)} · Willpower ${tavern.willpower}`,
    `Horny: ${horny(tavern.meters) ? "yes" : "no"} · Wet: ${tavern.wet ? "yes" : "no"} (pleasure ${Math.floor(tavern.pleasure)}, needs ${num(WET_PLEASURE - tavern.meters.pussy / 4)})`,
    `In a brawl: ${brawlPenalties(desirePenalties(tavern.meters))}`,
  ];
  const last = tavern.lastImpulse;
  const them: string[] = last
    ? [
        `Last reach: ${last.guest} (${last.kind}, likes ${last.prefers})${last.brawl ? " in a brawl" : ""} · ${last.touch} on the ${last.region}, boldness ${last.facts.level}`,
        `Their push ${num(last.check.push)} = nerve ${last.facts.nerve} + taste ${last.facts.prefers ? PREFER_PUSH : 0} + exposure ${last.facts.exposed}`,
        `Her hold ${num(last.check.hold)} = ${HOLD_BASE} + boldness ${last.facts.level}${last.check.clothing ? ` + clothing ${last.check.clothing}` : ""} − desire ${num(last.check.want.desire)} − passives ${num(last.check.want.passives)} − experience ${num(last.check.want.experience)} − skill ${num(last.check.want.skill)} − exhibition ${num(last.check.want.exhibition)}`,
        `Check: ${last.check.lands ? "push wins" : "hold stands"} · ${
          last.landed
            ? "it played out without asking"
            : !last.eager
              ? "asked (guest not impulsive)"
              : !last.covered
                ? "asked (not a touch she could say yes to, or past the boldness)"
                : !last.consentOff
                  ? "asked (Consent is on)"
                  : "asked (her hold stood)"
        }`,
      ]
    : ["Last reach: nobody has reached yet."];
  // One button flips Consent, the same as Settings: switching it off is the player's yes, so no first-time offer.
  const flip = () => {
    if (consentOff) s.autoTouch = false;
    else {
      s.autoTouch = true;
      s.agreed = true;
    }
    writeTouchSettings(s);
    showDevPanel(game, back);
  };
  game.openMenu(
    "Dev: Consent check",
    [...her, "", ...them],
    [
      { label: consentOff ? "Consent is Off: switch On (always ask)" : "Consent is On: switch Off (stop asking)", onPick: flip },
      { label: "Refresh", onPick: () => showDevPanel(game, back) },
    ],
    back,
  );
}

/** What her desire costs her in a brawl right now, in words. */
function brawlPenalties(p: DesirePenalties): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const parts = [
    p.accuracy ? `aim -${pct(p.accuracy)} (Mouth)` : "",
    p.dodge ? `dodge -${pct(p.dodge)} (Breasts)` : "",
    p.voice ? `talk/stare -${pct(p.voice)} (Pussy)` : "",
    p.damage ? `blows -${p.damage} (Body)` : "",
    p.grapple ? `their grapples +${pct(p.grapple)} (Butt)` : "",
    p.reach ? `their reaches +${pct(p.reach)} (Cock)` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "nothing yet (every desire under 50)";
}

function passiveCounts(owned: ReadonlySet<string>): string {
  const counts = new Map<string, number>();
  for (const id of owned) {
    const group = PASSIVE_BY_ID.get(id)?.group;
    if (group) counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  const parts = PASSIVE_GROUPS.filter((g) => counts.has(g.id)).map((g) => `${g.name} ${counts.get(g.id)}`);
  return parts.length ? parts.join(" · ") : "none";
}

function experience(lets: Partial<Record<string, number>>): string {
  const parts = Object.entries(lets).filter(([, n]) => (n ?? 0) > 0).map(([region, n]) => `${region} ${n}`);
  return parts.length ? parts.join(" · ") : "none yet";
}

/** Lists the save slots; picking one saves the start of today there. */
export function showSaveMenu(game: Game, back: () => void, notice?: string): void {
  game.openMenu(
    "Save game",
    notice ? [notice] : [],
    MANUAL_SLOTS.map((slot) => {
      const existing = readSave(slot);
      const label = existing ? slotName(slot) : `${slotName(slot)}: empty`;
      const save = () => {
        const saved = writeSave(slot, game.active, game.checkpoint, game.looks);
        showSaveMenu(game, back, saved ? `Saved to ${slotName(slot)}.` : "Could not save: game browser is blocking storage.");
      };
      return {
        label,
        save: existing ?? undefined,
        onPick: existing
          ? () => confirmMenu(game, `Overwrite ${slotName(slot)}?`, null, save, () => showSaveMenu(game, back))
          : save,
      };
    }),
    back,
  );
}

/** Lists every save; picking one loads it. Mid-night, it asks first, since tonight's progress is lost. */
export function showLoadMenu(game: Game, back: () => void): void {
  const midNight = game.screen === "paused";
  game.openMenu(
    "Load game",
    [],
    SLOTS.map((slot) => {
      const data = readSave(slot);
      const load = () => data && game.loadGame(data);
      return {
        label: data ? slotName(slot) : `${slotName(slot)}: empty`,
        save: data ?? undefined,
        disabled: !data,
        onPick:
          midNight && data
            ? () => confirmMenu(game, `Load ${slotName(slot)}?`, "Anything you have done since today began will be lost.", load, () => showLoadMenu(game, back))
            : load,
      };
    }),
    back,
  );
}

/** A yes/no question; `warning` says what's at stake, when something is. */
export function confirmMenu(game: Game, title: string, warning: string | null, yes: () => void, no: () => void): void {
  game.openMenu(title, warning ? [warning] : [], [{ label: "Yes", onPick: yes }], no);
}
