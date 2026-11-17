/** The settings, save and load menus, and the yes/no question they ask before overwriting or losing progress. */
import type { Button, Game } from "./game";
import { CUT_INS, type CutKind } from "./cutin";
import type { GuestKind } from "./tavern";
import { pixelSvg } from "./icons";
import { MANUAL_SLOTS, readSave, slotName, SLOTS } from "./save";
import { desirePenalties, horny, WET_PLEASURE, type DesirePenalties } from "./desire";
import { KINK_NAMES } from "./kinktalk";
import { METER_NAMES, METERS, PASSIVE_BY_ID, PASSIVE_GROUPS } from "./passives";
import { AUTO_TOUCH_MAX, DIFFICULTIES, HOLD_BASE, PREFER_PUSH, writeTouchSettings, type Difficulty } from "./touchsettings";
import { FRIEND_AT, FRIEND_PERK, FRIEND_RARITY, POSTING_FEE, RARITY_NAME, STAFF_BY_ID, STAFF_PERK_BY_ID, type StaffMember } from "./staff";
import { REVEL_HALL_COST } from "./tavern";

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
    "On: every touch stops and asks you, at the bar and in a brawl; Pull away always works; nothing happens when you're too drunk; after a lost brawl you're asked, and can always stop. Off is Karryn's Prison: at the bar, a lustful, bold guest's push is checked against your hold, and if they push past it the touch plays out on its own. In a brawl their hands just land, and they tear your clothes off. Dead drunk, a guest can have you on a table whether you're ready or not. Lose a brawl, and the one who won and their friends take you where you fell, with no Stop. Passed out, nothing happens to you either way.";
  const toggle = document.createElement("button");
  toggle.className = "settings-toggle";
  // Consent off is the player saying yes in advance: eager guests' touches play out on their own.
  const auto = () => touch.autoTouch && touch.agreed;
  const showToggle = () => {
    toggle.textContent = auto() ? "Consent: Off (Karryn's Prison: nobody asks)" : "Consent: On (always ask me)";
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
  // Karryn's Prison's switches for two of the brawl scenes (brawlscenes.ts).
  const sceneToggle = (which: "rimjob" | "footjob", name: string) => {
    const button = document.createElement("button");
    button.className = "settings-toggle";
    const show = () => {
      button.textContent = `${name} scenes: ${touch[which] ? "On" : "Off"}`;
      button.classList.toggle("on", touch[which]);
    };
    show();
    button.addEventListener("click", () => {
      touch[which] = !touch[which];
      save();
      show();
      game.audio.play("click");
    });
    return button;
  };
  // Karryn's Prison's difficulty: how tough they are in a brawl, and how fast she grows.
  const difficulty = document.createElement("button");
  difficulty.className = "settings-toggle";
  const order: Difficulty[] = ["easy", "normal", "hard"];
  const showDifficulty = () => {
    const d = DIFFICULTIES[touch.difficulty];
    difficulty.textContent = `Difficulty: ${d.name} (foes ×${d.foes}, growth ×${d.growth})`;
  };
  showDifficulty();
  difficulty.addEventListener("click", () => {
    touch.difficulty = order[(order.indexOf(touch.difficulty) + 1) % order.length];
    save();
    showDifficulty();
    game.audio.play("click");
  });
  const rimjob = sceneToggle("rimjob", "Rimjob");
  const footjob = sceneToggle("footjob", "Footjob");
  // KP's accessories: her trinkets, to put on and take off (trinkets.ts).
  const trinkets = document.createElement("button");
  trinkets.className = "settings-toggle";
  trinkets.textContent = "Trinkets (wear up to 2)";
  trinkets.addEventListener("click", () => showTrinkets(game, () => showSettingsMenu(game, back)));
  // KP's side jobs, from a menu until their art is made (sidejobs.ts).
  const work = document.createElement("button");
  work.className = "settings-toggle";
  work.textContent = "Side work (dance, rooms, bathhouse)";
  work.addEventListener("click", () => showSideWork(game, () => showSettingsMenu(game, back)));
  // Staff (staff.ts) and the Revel House (revel.ts), from menus until their art is made.
  const staff = document.createElement("button");
  staff.className = "settings-toggle";
  staff.textContent = "Staff (hire, wages, stories)";
  staff.addEventListener("click", () => showStaff(game, () => showSettingsMenu(game, back)));
  const revel = document.createElement("button");
  revel.className = "settings-toggle";
  revel.textContent = "Revel nights (18+)";
  revel.addEventListener("click", () => showRevel(game, () => showSettingsMenu(game, back)));
  for (const row of [heading, note, toggle, boldness, rimjob, footjob, difficulty, trinkets, work, staff, revel]) box.insertBefore(row, menu);
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
        `Her hold ${num(last.check.hold)} = ${HOLD_BASE} + boldness ${last.facts.level}${last.check.clothing ? ` + clothing ${last.check.clothing}` : ""}${last.check.passives ? ` ${last.check.passives > 0 ? "+" : "−"} passives ${num(Math.abs(last.check.passives))}` : ""} − desire ${num(last.check.want.desire)} − passives ${num(last.check.want.passives)} − experience ${num(last.check.want.experience)} − skill ${num(last.check.want.skill)} − exhibition ${num(last.check.want.exhibition)}`,
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
      { label: "Cut-in tester", onPick: () => showCutInTester(game, back) },
      { label: "Refresh", onPick: () => showDevPanel(game, back) },
    ],
    back,
  );
}

/** The cut-in tester's choices, kept while the game runs. */
const tester: { guest: GuestKind } = { guest: "farmer" };
const TEST_GUESTS: GuestKind[] = ["farmer", "smuggler", "soldier", "fugitive", "adventurer", "bandit", "noble"];

/**
 * In development, from the ] panel: every cut-in, to play on her now (always bare, as in the game), with any kind of guest's
 * hands. It stays up until \ takes it down or another plays; [ plays the last one again.
 */
function showCutInTester(game: Game, back: () => void): void {
  const again = () => showCutInTester(game, back);
  const kinds = Object.keys(CUT_INS) as CutKind[];
  game.openMenu(
    "Dev: Cut-in tester",
    [
      "Pick one to play it on her now. It stays up until the \\ key takes it down or another plays.",
      "[ plays the last one again; ] opens this panel.",
    ],
    [
      {
        label: `Guest: ${tester.guest} (next)`,
        onPick: () => ((tester.guest = TEST_GUESTS[(TEST_GUESTS.indexOf(tester.guest) + 1) % TEST_GUESTS.length]), again()),
      },
      ...kinds.map((kind, i) => ({
        label: `${i + 1}. ${kind} (KP ${CUT_INS[kind].kp})`,
        onPick: () => {
          back();
          game.testCutIn(kind, tester.guest);
        },
      })),
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

/** Lists the save slots; picking one saves this very moment there, day or night. */
export function showSaveMenu(game: Game, back: () => void, notice?: string): void {
  game.openMenu(
    "Save game",
    notice ? [notice] : [],
    MANUAL_SLOTS.map((slot) => {
      const existing = readSave(slot);
      const label = existing ? slotName(slot) : `${slotName(slot)}: empty`;
      const save = () => {
        const saved = game.saveNow(slot);
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

/** Lists every save; picking one loads it. Mid-game, it asks first, since anything not saved is lost. */
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
            ? () => confirmMenu(game, `Load ${slotName(slot)}?`, "Anything you have done since you last saved will be lost.", load, () => showLoadMenu(game, back))
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

/** Her trinkets (KP's accessories, trinkets.ts): each with what it does; the ones she has can be worn or taken off. */
export function showTrinkets(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const list = tavern.trinkets();
  const again = () => showTrinkets(game, back);
  game.openMenu(
    "Trinkets",
    ["Wear up to two. What they look like on you is still to come; for now they change your numbers."],
    list.map((t) => ({
      label: `${t.worn ? "✓ " : ""}${t.name} · ${t.about}${t.owned ? "" : ` (needs ${t.needs})`}`,
      disabled: !t.owned,
      onPick: () => {
        tavern.toggleTrinket(t.id);
        game.audio.play("click");
        again();
      },
    })),
    back,
  );
}

/** KP's side jobs and the bathhouse (sidejobs.ts), from a menu until the stage, the front desk and her hair are drawn. */
export function showSideWork(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const again = () => showSideWork(game, back);
  game.openMenu(
    "Side work",
    [
      `A riot night: ${tavern.riot ? "yes, trouble starts twice as easily (win 2 brawls to put it down)" : "no"}.`,
      `Your hair: ${tavern.hairGrowth} (${tavern.hairNights} nights since a trim).`,
    ],
    [
      { label: "Dance on the bar (18+) · once a night, during service", disabled: !tavern.canDance, onPick: () => { tavern.danceOnBar(); game.audio.play("cheers"); again(); } },
      { label: "Let the rooms upstairs · at last call or bedtime", disabled: !tavern.canRentRooms, onPick: () => { tavern.rentOutRooms(); game.audio.play("cheers"); again(); } },
      { label: "Get trimmed at the bathhouse", disabled: tavern.hairNights === 0, onPick: () => { tavern.trimHair(); game.audio.play("click"); again(); } },
    ],
    back,
  );
}

/** A perk's name and what it does, for the menus. */
const perkText = (ids: readonly string[]) =>
  ids.length === 0 ? "no perk" : ids.map((id) => `${STAFF_PERK_BY_ID[id]?.name ?? id}: ${STAFF_PERK_BY_ID[id]?.detail ?? ""}`).join("; ");

/** One of her staff, or an applicant, in a line. */
const memberText = (m: StaffMember) =>
  `${m.name} (${m.age}, ${m.female ? "woman" : "man"}), ${m.job} · ${RARITY_NAME[m.rarity]} · skill ${m.skill}, appeal ${m.appeal}, charm ${m.charm}, stamina ${m.stamina.current}/${m.stamina.max}, loyalty ${Math.round(m.loyalty)}, fame ${Math.round(m.fame)}, wage ${m.wage} · ${perkText(m.perks)}`;

/**
 * Her staff (staff.ts, STAFF.md), from a menu until the Staff page and the HUD's staff bar are drawn: the stage and
 * the cap, each one she has (wage up or down, let go, their story's beat when it's due), the applicants answering
 * her notice, the friends who'll work for her, and the people she's getting to know.
 */
export function showStaff(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const again = () => showStaff(game, back);
  const click = (run: () => unknown) => () => {
    run();
    game.audio.play("click");
    again();
  };
  const { have, cap } = tavern.staffCap;
  const can = tavern.canManageStaff;
  const paragraphs = [
    `Stage: ${tavern.staffStage}. Staff ${have} of ${cap} (the Lantern's girls don't count).${tavern.staffStage === "early" ? " Nobody's asking for work yet: you work alone for now." : ""}`,
    `Hiring, wages and letting go are done while the tavern's shut. Their portraits and work clothes are still to come.`,
    ...tavern.staff.map((m) => {
      const beat = tavern.staffBeat(m.id);
      return `${memberText(m)}${beat ? ` · Story: "${beat.title}": ${beat.text}` : ""}`;
    }),
    ...tavern.lantern.girls.filter((g) => !g.quit).map((g) => `${g.name}, a girl at the Lantern (off the cap; see the house plans).`),
  ];
  const buttons: Button[] = [];
  for (const m of tavern.staff) {
    buttons.push({ label: `${m.name}: wage +1 (${m.wage})`, onPick: click(() => tavern.setWage(m.id, m.wage + 1)) });
    buttons.push({ label: `${m.name}: wage -1 (${m.wage})`, disabled: m.wage <= 0, onPick: click(() => tavern.setWage(m.id, m.wage - 1)) });
    const beat = tavern.staffBeat(m.id);
    if (beat) for (const o of beat.outcomes) buttons.push({ label: `${m.name}, "${beat.title}": ${o.text}`, onPick: click(() => tavern.playStaffBeat(m.id, o.id)) });
    buttons.push({ label: `Let ${m.name} go`, disabled: !can, onPick: click(() => tavern.fireStaff(m.id)) });
  }
  const room = have < cap;
  for (const d of tavern.staffHireable()) {
    const perk = FRIEND_PERK[d.id];
    buttons.push({
      label: `Hire your friend ${d.name} (${d.age}), ${d.job} · ${RARITY_NAME[FRIEND_RARITY[d.id] ?? "epic"]} · wage ${d.wage} · ${perkText(perk ? [perk] : [])} · ${d.about}`,
      disabled: !can,
      onPick: click(() => tavern.hireStaff(d.id)),
    });
  }
  for (const a of tavern.applicants) {
    buttons.push({ label: `Hire applicant: ${memberText(a)}`, disabled: !can || !room, onPick: click(() => tavern.hireApplicant(a.id)) });
  }
  if (tavern.staffStage !== "early") {
    buttons.push({ label: `Post for work: a fresh lot of applicants (${POSTING_FEE} gold)`, disabled: !can || tavern.gold < POSTING_FEE, onPick: click(() => tavern.postForWork()) });
  }
  for (const f of tavern.staffToBefriend()) {
    buttons.push({
      label: `Spend time with ${f.def.name} (friendship ${f.friendship}/${FRIEND_AT}${STAFF_BY_ID[f.def.id] ? `, ${f.def.job}` : ""})${f.spentToday ? " · done today" : ""}`,
      disabled: f.spentToday,
      onPick: click(() => tavern.spendTimeWith(f.def.id)),
    });
  }
  game.openMenu("Staff", paragraphs, buttons, back);
}

/**
 * Revel nights (revel.ts, REVEL_HOUSE.md), from a menu until the Revel Hall and the group poses are drawn: whether
 * it's open (and what's missing), the night's three settings, and the switch for tonight. Everyone who comes
 * through the door has come for it; with Consent on she's still asked about her own part.
 */
export function showRevel(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const again = () => showRevel(game, back);
  const s = tavern.revelSettings;
  const day = tavern.phase === "day";
  const missing = tavern.revelMissing();
  const click = (run: () => unknown) => () => {
    run();
    game.audio.play("click");
    again();
  };
  const WHO = { men: "Mostly men", mixed: "Mixed (men and women)", women: "Women only" };
  const PART = { host: "Hosting (you run the room)", join: "Joining in", centrepiece: "The centrepiece (it's about you)" };
  const DOOR = { open: "Open", invite: "By invitation (regulars and fans)", paying: "Paying (a fee at the door)" };
  game.openMenu(
    "Revel nights",
    [
      tavern.revelOpen ? "The Revel House is open to you. Choose by day; the hall opens as the tavern shuts." : `Not yet. Still needed: ${missing.join("; ")}.`,
      `The Revel Hall: ${tavern.revelHall ? "built" : `not built (house plans, ${REVEL_HALL_COST} gold, late game)`}.`,
      "The hall, the groups around the room and the revel outfits are still to be drawn; for now the night plays out in the log.",
    ],
    [
      { label: `Who's invited: ${WHO[s.who]}`, disabled: !day, onPick: click(() => tavern.cycleRevel("who")) },
      { label: `Your part: ${PART[s.herPart]}`, disabled: !day, onPick: click(() => tavern.cycleRevel("herPart")) },
      { label: `The door: ${DOOR[s.door]}`, disabled: !day, onPick: click(() => tavern.cycleRevel("door")) },
      {
        label: `${tavern.revelTonight ? "✓ " : ""}Hold a revel tonight`,
        disabled: !day || (!tavern.revelOpen && !tavern.revelTonight),
        onPick: click(() => tavern.setRevelTonight(!tavern.revelTonight)),
      },
    ],
    back,
  );
}
