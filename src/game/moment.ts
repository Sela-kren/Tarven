/**
 * Saving the moment, not just the morning. A save made mid-day or mid-night keeps the live state as it stands:
 * guests in their seats, what's in her hands, the pot on the fire, the meters. It's taken field by field off the
 * object it belongs to (the tavern, the Lantern), so a field added later is saved without anyone remembering to.
 *
 * Only plain data is kept: numbers, strings, lists, Sets, Maps and plain objects. Functions (the dice) and class
 * instances (a brawl or a duel in progress) are left out, and keep whatever the load put there.
 */

type Fields = Record<string, unknown>;

/** Marks a value that can't be saved; the field it's in is left out. */
const SKIP = Symbol("skip");

function isPlain(value: unknown): value is Fields {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function encode(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (value === undefined) return { $u: 1 };
  if (typeof value === "number") return Number.isFinite(value) ? value : { $n: String(value) };
  if (Array.isArray(value)) return value.map((item) => {
    const out = encode(item);
    return out === SKIP ? null : out;
  });
  if (value instanceof Set) return { $set: encode([...value]) };
  if (value instanceof Map) return { $map: encode([...value]) };
  if (isPlain(value)) {
    const out: Fields = {};
    for (const [key, item] of Object.entries(value)) {
      const coded = encode(item);
      if (coded !== SKIP) out[key] = coded;
    }
    return out;
  }
  return SKIP;
}

function decode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decode);
  if (!isPlain(value)) return value;
  if ("$u" in value) return undefined;
  if ("$n" in value) return Number(value.$n);
  if ("$set" in value) return new Set(decode(value.$set) as unknown[]);
  if ("$map" in value) return new Map(decode(value.$map) as [unknown, unknown][]);
  const out: Fields = {};
  for (const [key, item] of Object.entries(value)) out[key] = decode(item);
  return out;
}

/** The fields of `target` as saveable data, leaving out `skip` and anything that isn't plain data. */
export function captureFields(target: object, skip: readonly string[]): Fields {
  const out: Fields = {};
  for (const [key, value] of Object.entries(target)) {
    if (skip.includes(key)) continue;
    const coded = encode(value);
    if (coded !== SKIP) out[key] = coded;
  }
  return out;
}

/**
 * Puts captured fields back onto `target`. Lists, Sets, Maps and plain objects are refilled where they stand, so
 * anything holding on to them sees the change. A field the target no longer has is ignored, and one it has now
 * that the save didn't is left as it is. Throws when a value is of a different kind than the field holds, so a
 * save from a game that has changed too much isn't half-loaded: the caller falls back to the start of the day.
 */
export function applyFields(target: object, saved: unknown, skip: readonly string[]): void {
  if (!isPlain(saved)) throw new Error("Not a saved moment");
  const fields = target as Fields;
  for (const [key, raw] of Object.entries(saved)) {
    if (skip.includes(key) || !(key in fields)) continue;
    const value = decode(raw);
    const current = fields[key];
    if (current instanceof Set) {
      if (!(value instanceof Set)) throw new Error(`Saved ${key} is not a set`);
      current.clear();
      for (const item of value) current.add(item);
    } else if (current instanceof Map) {
      if (!(value instanceof Map)) throw new Error(`Saved ${key} is not a map`);
      current.clear();
      for (const [k, v] of value) current.set(k, v);
    } else if (Array.isArray(current)) {
      if (!Array.isArray(value)) throw new Error(`Saved ${key} is not a list`);
      current.splice(0, current.length, ...value);
    } else if (isPlain(current) && isPlain(value)) {
      for (const k of Object.keys(current)) delete current[k];
      Object.assign(current, value);
    } else if (current !== null && typeof current === "object" && !isPlain(current)) {
      // A class instance (a brawl, a duel): never saved, so left as the load set it.
      continue;
    } else {
      const known = current !== null && current !== undefined && value !== null && value !== undefined;
      if (known && typeof current !== typeof value) throw new Error(`Saved ${key} is the wrong kind`);
      if (known && isPlain(value) !== isPlain(current)) throw new Error(`Saved ${key} is the wrong kind`);
      fields[key] = value;
    }
  }
}
