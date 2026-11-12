/** The settings, save and load menus, and the yes/no question they ask before overwriting or losing progress. */
import type { Game } from "./game";
import { pixelSvg } from "./icons";
import { MANUAL_SLOTS, readSave, slotName, SLOTS, writeSave } from "./save";

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

/** The settings: music and effects levels, each on a slider. M still mutes everything at any time. */
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
  const slider = (name: string, level: number, set: (level: number) => void, onLetGo?: () => void) => {
    const row = document.createElement("label");
    row.className = "slider";
    const label = document.createElement("span");
    label.className = "name";
    label.textContent = name;
    const input = document.createElement("input");
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.step = "5";
    input.value = String(Math.round(level * 100));
    const shown = document.createElement("span");
    shown.className = "value";
    const show = () => {
      const value = Number(input.value);
      shown.textContent = value === 0 ? "Off" : `${value}%`;
      // The track fills up to the thumb.
      input.style.setProperty("--fill", `${value}%`);
    };
    show();
    input.addEventListener("input", () => {
      show();
      set(Number(input.value) / 100);
    });
    if (onLetGo) input.addEventListener("change", onLetGo);
    row.append(label, input, shown);
    return row;
  };
  box.insertBefore(
    slider("Music", settings.music, (music) => game.audio.change({ music, muted: false })),
    menu,
  );
  box.insertBefore(
    // Letting go plays a sound at the new level, so you hear what you've picked.
    slider("Effects", settings.effects, (effects) => game.audio.change({ effects, muted: false }), () => game.audio.play("click")),
    menu,
  );
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
