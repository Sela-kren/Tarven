/**
 * A save, told in pixel icons instead of a line of words: a moon and the night it's on, the sign of the sibling
 * being played, and a coin with the gold. The date, when shown, sits after them in small type.
 */
import { COIN } from "./hud";
import { pixelSvg } from "./icons";
import type { SaveData } from "./save";

const OUTLINE = "#1c140e";

const MOON = pixelSvg(
  [
    "....K.......",
    "...KDK......",
    "..KDMK......",
    ".KDMK.......",
    "KDMMK.......",
    "KDMMK.......",
    "KDMMMK......",
    "KDMMMMKKKK..",
    ".KDMMMMMMDK.",
    "..KDMMMMDK..",
    "...KDDDDK...",
    "....KKKK....",
  ],
  { K: OUTLINE, M: "#f4ead0", D: "#b9ae8e" },
);

/** The sister: a ring with a cross under it. */
const FEMALE = pixelSvg(
  [
    "...KKKKKK...",
    "..KPPPPPPK..",
    ".KPPKKKKPPK.",
    ".KPK....KPK.",
    ".KPPKKKKPPK.",
    "..KPPPPPPK..",
    "...KKPPKK...",
    "..KKKPPKKK..",
    "..KPPPPPPK..",
    "..KKKPPKKK..",
    "....KPPK....",
    "....KKKK....",
  ],
  { K: OUTLINE, P: "#ef8fa8" },
);

/** The brother: a ring with an arrow off its shoulder. */
const MALE = pixelSvg(
  [
    "......KKKKKK",
    "......KBBBBK",
    ".......KKBBK",
    "..KKKKKKBKBK",
    ".KBBBBBBK.KK",
    "KBBKKKKBBK..",
    "KBK....KBK..",
    "KBK....KBK..",
    "KBK....KBK..",
    "KBBKKKKBBK..",
    ".KBBBBBBK...",
    "..KKKKKK....",
  ],
  { K: OUTLINE, B: "#7fb2e8" },
);

/** By sibling index, as in the save: the male body, then the female one. */
const SIBLINGS = [MALE, FEMALE];

function badge(icon: string, text: string | null): HTMLElement {
  const el = document.createElement("span");
  el.className = "badge";
  el.innerHTML = icon;
  if (text !== null) {
    const value = document.createElement("span");
    value.textContent = text;
    el.append(value);
  }
  return el;
}

/** The icons for one save, as a row to put on its button. */
export function saveBadges(data: SaveData, playerLabels: readonly string[]): HTMLElement {
  const row = document.createElement("span");
  row.className = "save-badges";
  const night = badge(MOON, String(data.tavern.nightIndex + 1));
  night.title = `Night ${data.tavern.nightIndex + 1}`;
  const who = badge(SIBLINGS[data.active] ?? FEMALE, null);
  who.title = playerLabels[data.active] ?? "";
  const gold = badge(COIN, String(data.tavern.gold));
  gold.title = `${data.tavern.gold} gold`;
  const when = document.createElement("span");
  when.className = "when";
  when.textContent = new Date(data.savedAt).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  row.append(night, who, gold, when);
  return row;
}
