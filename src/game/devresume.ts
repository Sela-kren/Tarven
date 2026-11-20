/**
 * Development only: picks the game back up where it was after the page reloads. Saving a file makes Vite reload the
 * whole page, and without this every change meant the title screen and playing back to whatever was being tested.
 *
 * Just before the reload (Vite's own warning, or the page closing for F5), the game is written to sessionStorage:
 * the tavern as it stands (the same moment a mid-night save keeps, moment.ts), and a brawl or sex fight in progress,
 * on its turn (Tavern.devCaptureBattle). When the page comes back up it skips the title and opens straight there.
 *
 * Only for this tab (sessionStorage), so closing it starts clean. "?fresh" on the address skips it once; the dev
 * panel (]) switches it off for good; "Quit to the title" and "Play again" go to the title as they always did.
 * Nothing here runs in a built copy of the game.
 */

import type { Game } from "./game";
import { showDuel, showFight } from "./fightpanels";
import type { Looks } from "./appearance";
import { SAVE_VERSION, validate, type Moment } from "./save";
import type { DevBattle, TavernSave } from "./tavern";

const KEY = "tarven.dev.resume";
const OFF_KEY = "tarven.dev.resumeOff";

/** The game as it stood just before a reload. */
interface DevSnapshot {
  takenAt: number;
  active: number;
  tavern: TavernSave;
  looks: Looks;
  moment: Moment;
  battle: DevBattle | null;
}

/** Set when the game is reloading on purpose to go back to the title: nothing is kept. */
let leaving = false;

/** Whether the dev resume is on (it is, unless the dev panel switched it off). */
export function devResumeOn(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) !== "1";
  } catch {
    return true;
  }
}

/** Switches the dev resume on or off, for every reload after this one. */
export function setDevResume(on: boolean): void {
  try {
    if (on) localStorage.removeItem(OFF_KEY);
    else {
      localStorage.setItem(OFF_KEY, "1");
      sessionStorage.removeItem(KEY);
    }
  } catch {
    // Storage blocked: nothing to remember it in.
  }
}

/** Reloads the page to the title, as "Quit to the title" does, without the dev resume bringing the game back. */
export function reloadToTitle(): void {
  leaving = true;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing kept, then.
  }
  location.reload();
}

function snapshotOf(game: Game): DevSnapshot | null {
  if (!game.inGame) return null;
  return {
    takenAt: Date.now(),
    active: game.active,
    tavern: game.tavern.snapshot(),
    looks: game.looks,
    moment: game.captureMoment(),
    battle: game.tavern.devCaptureBattle(),
  };
}

/**
 * Keeps the game before every reload, and opens a kept one now if there is one. Call once, with the game built and
 * on its title screen.
 */
export function installDevResume(game: Game): void {
  if (!import.meta.env.DEV) return;

  const keep = () => {
    if (leaving || !devResumeOn()) return;
    try {
      const snapshot = snapshotOf(game);
      // Still on the title (or mid-way through picking back up): the last one kept stays.
      if (snapshot) sessionStorage.setItem(KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn("[dev resume] couldn't keep the game for the reload", error);
    }
  };
  import.meta.hot?.on("vite:beforeFullReload", keep);
  window.addEventListener("pagehide", keep);

  if (!devResumeOn() || new URLSearchParams(location.search).has("fresh")) return;
  let text: string | null = null;
  try {
    text = sessionStorage.getItem(KEY);
  } catch {
    return;
  }
  if (!text) return;
  try {
    const snapshot = JSON.parse(text) as DevSnapshot;
    const data = validate({
      version: SAVE_VERSION,
      savedAt: snapshot.takenAt,
      active: snapshot.active,
      tavern: snapshot.tavern,
      looks: snapshot.looks,
      moment: snapshot.moment,
    });
    if (!data) throw new Error("the kept game doesn't load as a save any more");
    const battle = snapshot.battle;
    console.info(`[dev resume] picking up where you were${battle ? ` (a ${battle.kind === "fight" ? "brawl" : "sex fight"} in progress)` : ""}. ?fresh skips it.`);
    game.loadGame(data, () => {
      if (!battle) return;
      try {
        game.tavern.devResumeBattle(battle);
        if (battle.kind === "fight") showFight(game);
        else showDuel(game);
      } catch (error) {
        game.tavern.fight = null;
        game.tavern.duel = null;
        console.warn("[dev resume] the tavern's back, but the battle couldn't be picked up", error);
      }
    });
  } catch (error) {
    sessionStorage.removeItem(KEY);
    console.warn("[dev resume] couldn't pick the game back up; starting at the title", error);
  }
}
