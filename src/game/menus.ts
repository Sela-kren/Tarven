/** The settings, save and load menus, and the yes/no question they ask before overwriting or losing progress. */
import type { Game } from "./game";
import { pixelSvg } from "./icons";
import { MANUAL_SLOTS, readSave, slotName, SLOTS, writeSave } from "./save";
import { AUTO_TOUCH_MAX, writeTouchSettings } from "./touchsettings";

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
  heading.textContent = "Eager guests";
  const note = document.createElement("p");
  note.className = "settings-note";
  note.textContent =
    "A lustful, bold guest may sometimes touch you without asking, on touches you'd say yes to anyway. Never when anyone's too drunk, never your clothes. Every other reach still asks, and Pull away always works.";
  const toggle = document.createElement("button");
  toggle.className = "settings-toggle";
  const on = () => touch.autoTouch && touch.agreed;
  const showToggle = () => {
    toggle.textContent = `Touch without asking: ${on() ? "On" : touch.autoTouch ? "Ask me the first time" : "Off"}`;
    toggle.classList.toggle("on", on());
  };
  showToggle();
  toggle.addEventListener("click", () => {
    if (on()) touch.autoTouch = false;
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
  const chance = ranged(
    "How often",
    Math.round(touch.chance * 100),
    { min: 5, max: 100, step: 5, format: (value) => `${value}%` },
    (value) => {
      touch.chance = value / 100;
      save();
    },
  );
  for (const row of [heading, note, toggle, boldness, chance]) box.insertBefore(row, menu);
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
