/**
 * "Where things are": the pause menu's help page. Every key, and where every part of the game lives, because a lot
 * of it is a walk-up spot in one room or a side menu in Settings, and nothing else in play says so.
 *
 * Keep it in step with the game: a new feature's entry point goes in here, where the player would look for it.
 */
import type { Game } from "./game";

export interface HelpSection {
  title: string;
  lines: readonly string[];
}

export const HELP: readonly HelpSection[] = [
  {
    title: "Keys",
    lines: [
      "WASD or arrows: move. Shift: run. E: use, serve, talk (the prompt says what).",
      "< and >: camera view, top-down, third person or first person. In third and first person the mouse looks around (click the game to give it the mouse, Esc to free it).",
      "I: your own sheet. O: walk style. M: sound on or off. N: the AI narrator, if KoboldCpp is running. Esc: pause.",
      "On the character select: C to customize, Enter to start.",
    ],
  },
  {
    title: "In the tavern",
    lines: [
      "Open for the night: turn the Open/Closed sign by the front door, once the room's clean.",
      "Serve: the tap, the bottle shelf, the bread, the stew pot and the barrel. Wash up at the tub, scraps in the bin.",
      "Dance on the bar (18+): walk up to the middle of the bar during service, once a night.",
      "Let the rooms upstairs: the foot of the stairs, at last call or bedtime.",
    ],
  },
  {
    title: "Your bedroom (east door off the taproom)",
    lines: [
      "Your journal: the red book on the chest. The Ledger, Wren's letters, your passives, skills and records.",
      "The house plans: the desk, by day. Build and move furniture, upgrades, edicts, staff posts, the Lantern and the Revel Hall.",
      "Change clothes: the closet. Wash: the bath next door. Sleep or nap: the bed.",
      "Wren's red book: the stand under the window, once you've heard of its pieces (Act 2). It says what you hold and where the rest is.",
    ],
  },
  {
    title: "Tarven, by day (out of the front door)",
    lines: [
      "Walk up to a place and press E: the notice board, the market, the chapel, the Warm House, the Bakehouse, the Cider Barn, the Copper Bell, the garrison yard, the market cross, the Toll-Gate, Mara's fields (west road) and the quarry road (east road).",
      "The notice board: hire staff, and the Adventurers' Guild's quests.",
      "The garrison yard: sign on with the garrison (the Knight path), and pay the Baron's debt to Pell.",
      "Your rivals on the Village Ledger: scout them, or beat them, at their own places.",
      "The red book's pieces (Act 2): Brother Oden at the chapel, Mara Holt in her fields, Silas Crowe on the quarry road.",
    ],
  },
  {
    title: "Esc, then Settings",
    lines: [
      "Staff, Feed (posts, DMs, streams, sponsors), Knight, Guild, the Baron's debt, Trinkets and Side work all have a row here too.",
      "Revel nights get a row once the Revel Hall's built and she's ready for it.",
    ],
  },
  {
    title: "The story",
    lines: [
      "It moves on fans, not nights: each beat comes as a morning card once your fans reach it.",
      "Wren's letters turn up one a morning as you earn them; reread them in the journal's Letters tab.",
      "Once you hang Wren's red lantern (the Lantern, on the house plans), it shows by the front door, inside and out.",
    ],
  },
];

/** Opens the help page over the pause menu; `back` returns to it. */
export function showHelp(game: Game, back: () => void): void {
  const paragraphs: string[] = [];
  for (const section of HELP) {
    paragraphs.push(`— ${section.title} —`, ...section.lines);
  }
  game.openMenu("Where things are", paragraphs, [], back);
}
