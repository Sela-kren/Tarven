import { isHouseLayout } from "./house";
import { NIGHTS, UPGRADES, type Mess, type MessKind, type TavernSave, type UpgradeId } from "./tavern";

/** Bump when the saved shape changes; older saves are then ignored rather than misread. */
const SAVE_VERSION = 1;
const KEY_PREFIX = "tarven.save.";

/** The autosave, taken whenever a night opens, and three slots the player saves to. */
export type SlotId = "auto" | 1 | 2 | 3;
export const SLOTS: SlotId[] = ["auto", 1, 2, 3];
export const MANUAL_SLOTS: SlotId[] = [1, 2, 3];

/** A saved game: the start of one night. */
export interface SaveData {
  version: number;
  savedAt: number;
  /** Which character the player picked: 0 male, 1 female. */
  active: number;
  tavern: TavernSave;
}

const isInt = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

const MESS_KINDS: readonly MessKind[] = ["dishes", "spill", "dust"];

function isMess(raw: unknown): raw is Mess {
  if (!raw || typeof raw !== "object") return false;
  const mess = raw as Partial<Mess>;
  return (
    isInt(mess.id, 0, 1e6) &&
    MESS_KINDS.includes(mess.kind as MessKind) &&
    Array.isArray(mess.spots) &&
    mess.spots.length > 0 &&
    mess.spots.every((spot) => isInt(spot, 0, 1e3))
  );
}

/** Accepts only a save this version of the game can load. */
function validate(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<SaveData>;
  const tavern = data.tavern as Partial<TavernSave> | undefined;
  if (data.version !== SAVE_VERSION || typeof data.savedAt !== "number" || !isInt(data.active, 0, 1)) return null;
  if (!tavern || !isInt(tavern.nightIndex, 0, NIGHTS.length - 1)) return null;
  if (!isInt(tavern.gold, 0, 1e6) || !isInt(tavern.trust, -1e3, 1e3) || !isInt(tavern.heat, -1e3, 1e3)) return null;
  if (!isInt(tavern.tapLeft, 0, 1e3) || !Array.isArray(tavern.upgrades)) return null;
  if (!tavern.upgrades.every((id) => typeof id === "string" && id in UPGRADES)) return null;
  // Saves from before the morning mess have none, which is fine; a broken list is not.
  const messes = tavern.messes ?? [];
  if (!Array.isArray(messes) || !messes.every(isMess)) return null;
  // Saves from before the building plans have none, which means the building as it started.
  if (tavern.layout !== undefined && !isHouseLayout(tavern.layout)) return null;
  return {
    version: data.version,
    savedAt: data.savedAt,
    active: data.active,
    tavern: { ...(tavern as TavernSave), upgrades: [...new Set(tavern.upgrades as UpgradeId[])], messes },
  };
}

/** Stores a save. False when the browser refuses (private mode, storage full or blocked). */
export function writeSave(slot: SlotId, active: number, tavern: TavernSave): boolean {
  const data: SaveData = { version: SAVE_VERSION, savedAt: Date.now(), active, tavern };
  try {
    localStorage.setItem(KEY_PREFIX + slot, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function readSave(slot: SlotId): SaveData | null {
  try {
    const text = localStorage.getItem(KEY_PREFIX + slot);
    return text ? validate(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}

/** The most recently written save, for "Continue". */
export function latestSave(): { slot: SlotId; data: SaveData } | null {
  let latest: { slot: SlotId; data: SaveData } | null = null;
  for (const slot of SLOTS) {
    const data = readSave(slot);
    if (data && (!latest || data.savedAt > latest.data.savedAt)) latest = { slot, data };
  }
  return latest;
}

export function slotName(slot: SlotId): string {
  return slot === "auto" ? "Autosave" : `Slot ${slot}`;
}

/** One line about a save, such as "Night 2 · Female · 45 gold · 10 Nov, 19:58". */
export function describeSave(data: SaveData, playerLabels: readonly string[]): string {
  const when = new Date(data.savedAt).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Night ${data.tavern.nightIndex + 1} · ${playerLabels[data.active]} · ${data.tavern.gold} gold · ${when}`;
}
