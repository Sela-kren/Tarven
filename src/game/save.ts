import { readLooks, type Looks } from "./appearance";
import type { Standing } from "./daystory";
import { isHouseLayout } from "./house";
import { formatHour } from "./time";
import { BOTTLE_KINDS, UPGRADES, type Mess, type MessKind, type TavernSave, type UpgradeId, type Ware } from "./tavern";

/** Bump when the saved shape changes; older saves are then ignored rather than misread. */
const SAVE_VERSION = 1;
const KEY_PREFIX = "tarven.save.";

/** The autosave, taken whenever a night opens, and three slots the player saves to. */
export type SlotId = "auto" | 1 | 2 | 3;
export const SLOTS: SlotId[] = ["auto", 1, 2, 3];
export const MANUAL_SLOTS: SlotId[] = [1, 2, 3];

/**
 * The very moment a save was made, mid-day or mid-night: the time on the world clock, where she stood, and the
 * tavern as it was (moment.ts). The autosave, taken as a day begins, has none and opens on the day's card.
 */
export interface Moment {
  /** Hours since the game began, on the world clock. */
  time: number;
  /** Where she stood on the floor, and which way she faced. */
  at: { x: number; z: number; facing: number };
  /** How things stood as the day began, for the morning after to measure the night against. */
  dayStart: Standing | null;
  tavern: Record<string, unknown>;
  lantern: Record<string, unknown>;
}

/** A saved game: the start of a day, or (with a moment) the moment it was saved. */
export interface SaveData {
  version: number;
  savedAt: number;
  /** Which character the player picked: 0 male, 1 female. */
  active: number;
  tavern: TavernSave;
  /** How both siblings look. Saves from before customising have none, and load with the looks as built. */
  looks?: Looks;
  /** The moment the save was made. Without one, the save opens at the start of its day. */
  moment?: Moment;
}

const isInt = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

const MESS_KINDS: readonly MessKind[] = ["dishes", "spill", "dust", "cobweb"];
const isWare = (value: unknown): value is Ware => value === "cup" || value === "dish";

function isMess(raw: unknown): raw is Mess {
  if (!raw || typeof raw !== "object") return false;
  const mess = raw as Partial<Mess>;
  return (
    isInt(mess.id, 0, 1e6) &&
    MESS_KINDS.includes(mess.kind as MessKind) &&
    Array.isArray(mess.spots) &&
    mess.spots.length > 0 &&
    mess.spots.every((spot) => isInt(spot, 0, 1e3)) &&
    // Saves from before the washing up have no list of what's in the pile.
    (mess.wares === undefined || (Array.isArray(mess.wares) && mess.wares.length === mess.spots.length && mess.wares.every(isWare)))
  );
}

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isFields = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/** A moment that looks whole; what's inside the tavern's part is checked as it loads (Tavern.resumeMoment). */
function readMoment(raw: unknown): Moment | undefined {
  if (!isFields(raw)) return undefined;
  const m = raw as Partial<Moment>;
  if (!isNumber(m.time) || m.time < 0 || !isFields(m.at)) return undefined;
  if (!isNumber(m.at.x) || !isNumber(m.at.z) || !isNumber(m.at.facing)) return undefined;
  if (!isFields(m.tavern) || !isFields(m.lantern)) return undefined;
  const dayStart = isFields(m.dayStart) && Object.values(m.dayStart).every(isNumber) ? (m.dayStart as unknown as Standing) : null;
  return { time: m.time, at: { x: m.at.x, z: m.at.z, facing: m.at.facing }, dayStart, tavern: m.tavern, lantern: m.lantern };
}

/** Accepts only a save this version of the game can load. */
function validate(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<SaveData>;
  const tavern = data.tavern as Partial<TavernSave> | undefined;
  if (data.version !== SAVE_VERSION || typeof data.savedAt !== "number" || !isInt(data.active, 0, 1)) return null;
  // The nights go on for as long as she plays (STORY.md: no night count ends the run).
  if (!tavern || !isInt(tavern.nightIndex, 0, 1e5)) return null;
  if (!isInt(tavern.gold, 0, 1e6) || !isInt(tavern.trust, -1e3, 1e3) || !isInt(tavern.heat, -1e3, 1e3)) return null;
  if (!isInt(tavern.tapLeft, 0, 1e3) || !Array.isArray(tavern.upgrades)) return null;
  if (!tavern.upgrades.every((id) => typeof id === "string" && id in UPGRADES)) return null;
  // Saves from before the morning mess have none, which is fine; a broken list is not.
  const messes = tavern.messes ?? [];
  if (!Array.isArray(messes) || !messes.every(isMess)) return null;
  // Saves from before the building plans have none, which means the building as it started.
  if (tavern.layout !== undefined && !isHouseLayout(tavern.layout)) return null;
  // Saves from before the washing up have neither of these, and start with the usual set.
  if (tavern.stock !== undefined && !(isInt(tavern.stock.cup, 0, 1e3) && isInt(tavern.stock.dish, 0, 1e3))) return null;
  if (tavern.tub !== undefined && !(Array.isArray(tavern.tub) && tavern.tub.every(isWare))) return null;
  // A name that isn't a short string is forgotten; the journal just asks for one again.
  if (tavern.name !== undefined && !(typeof tavern.name === "string" && tavern.name.length <= 40)) delete tavern.name;
  // Saves from before the bottled drinks have none, and start with an empty shelf. A broken list only loses the
  // drinks, not the night.
  if (tavern.bottles !== undefined && !(Array.isArray(tavern.bottles) && tavern.bottles.every((b) => BOTTLE_KINDS.includes(b)))) {
    delete tavern.bottles;
  }
  // A broken looks entry only loses the looks, not the night.
  const looks = readLooks(data.looks) ?? undefined;
  // A broken moment only loses the moment: the save opens at the start of its day.
  const moment = readMoment(data.moment);
  return {
    version: data.version,
    savedAt: data.savedAt,
    active: data.active,
    looks,
    ...(moment ? { moment } : {}),
    tavern: { ...(tavern as TavernSave), upgrades: [...new Set(tavern.upgrades as UpgradeId[])], messes },
  };
}

/** Stores a save. False when the browser refuses (private mode, storage full or blocked). */
export function writeSave(slot: SlotId, active: number, tavern: TavernSave, looks?: Looks, moment?: Moment): boolean {
  const data: SaveData = { version: SAVE_VERSION, savedAt: Date.now(), active, tavern, looks, ...(moment ? { moment } : {}) };
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

/** The time on the in-game clock a save was made at, such as "7:30 PM"; the start of the day for an autosave. */
export function saveHour(data: SaveData): string | null {
  return data.moment ? formatHour(data.moment.time) : null;
}

/** One line about a save, such as "Night 2 · 7:30 PM · Female · 45 gold · 10 Nov, 19:58". */
export function describeSave(data: SaveData, playerLabels: readonly string[]): string {
  const when = new Date(data.savedAt).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const hour = saveHour(data);
  return `Night ${data.tavern.nightIndex + 1}${hour ? ` · ${hour}` : ""} · ${playerLabels[data.active]} · ${data.tavern.gold} gold · ${when}`;
}
