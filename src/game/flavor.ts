/**
 * Flavour lines for the brawl and duel logs: where those rules ask for an AI-written line for what just happened.
 * The game plugs the AI narrator's line bank in (see ainarrator.ts); with nothing plugged in, as in tests, every
 * ask comes back empty and the logs read exactly as written.
 *
 * Keys: `fight:<event>` for brawls, `duel:her:<move>:<state>`, `duel:their:<area>:<state>` and `duel:givesin`
 * for after-hours duels. Lines are in the second person, like the logs they go in.
 */
import type { GuestKind } from "./tavern";

export type FlavorSource = (key: string, guest: GuestKind) => string | null;

let source: FlavorSource | null = null;

/** Plugs in where flavour lines come from, or unplugs it with null. */
export function setFlavorSource(next: FlavorSource | null): void {
  source = next;
}

/** A flavour line for this moment, or null if there's none to give. */
export function flavor(key: string, guest: GuestKind): string | null {
  return source?.(key, guest) ?? null;
}
