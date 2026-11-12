/** The journal on the chest, opened over the game: ribbon tabs across the top, one spread per tab. */
import type { Game } from "./game";
import { journalBook, passivesBook, privateBook, recordsBook, skillsBook } from "./journal";
import { DEBT, HEAT_MAX, NIGHTS, TRUST_MAX, TRUST_TO_OVERTHROW } from "./tavern";

/** The journal's spreads, in tab order. */
export type JournalPage = "ledger" | "private" | "passives" | "skills" | "records";
export const JOURNAL_PAGES: readonly { id: JournalPage; label: string }[] = [
  { id: "ledger", label: "Ledger" },
  { id: "private", label: "Private" },
  { id: "passives", label: "Passives" },
  { id: "skills", label: "Skills" },
  { id: "records", label: "Records" },
];

/**
 * Opens the journal: your name and how you stand, or the adult side: tonight's desire, her passives, and her
 * records. Ribbon tabs (or 1 to 4) turn between them. The night waits while you read.
 */
export function showJournal(game: Game, page: JournalPage = "ledger"): void {
  const { tavern } = game;
  game.clearTarget();
  game.audio.play("click");
  const close = () => {
    game.closePanel();
    game.screen = "play";
  };
  const facts = tavern.passiveFacts();
  let book: HTMLElement;
  if (page === "ledger") {
    book = journalBook(
      {
        name: tavern.name,
        night: tavern.nightIndex + 1,
        nights: NIGHTS.length,
        gold: tavern.gold,
        debt: DEBT,
        trust: tavern.trust,
        trustMax: TRUST_MAX,
        trustToRise: TRUST_TO_OVERTHROW,
        heat: tavern.heat,
        heatMax: HEAT_MAX,
        persona: tavern.persona,
        lewdness: tavern.lewdness,
        corruption: Math.round(tavern.corruption),
      },
      (name) => (tavern.name = name),
    );
  } else if (page === "private") {
    book = privateBook({
      touchable: tavern.playerBody === "Female",
      lewdness: tavern.lewdness,
      corruption: Math.round(tavern.corruption),
      meters: { ...tavern.meters },
      pleasure: tavern.pleasure,
      tonight: { ...tavern.touchesTonight },
      clothesLost: tavern.stripped,
      lets: tavern.touchMemory.lets,
      passivesHeld: tavern.passives.size,
    });
  } else if (page === "passives") {
    book = passivesBook({ owned: tavern.passives, facts });
  } else if (page === "skills") {
    book = skillsBook({ xp: tavern.xp, bonus: tavern.effects.skill, touchable: tavern.playerBody === "Female" });
  } else {
    book = recordsBook({ facts });
  }

  // Ribbon tabs over the top of the book, one for each spread.
  const tabs = document.createElement("div");
  tabs.className = "journal-tabs";
  for (const [index, tab] of JOURNAL_PAGES.entries()) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `tab ${tab.id}`;
    el.classList.toggle("on", tab.id === page);
    const key = document.createElement("span");
    key.className = "key";
    key.textContent = String(index + 1);
    el.append(key, tab.label);
    el.addEventListener("click", () => tab.id !== page && showJournal(game, tab.id));
    tabs.append(el);
  }

  const shut = document.createElement("button");
  shut.type = "button";
  shut.className = "journal-close";
  shut.textContent = "Close";
  shut.addEventListener("click", close);
  const wrap = document.createElement("div");
  wrap.className = "journal";
  wrap.append(tabs, book, shut);
  game.panelEl.classList.remove("title-screen", "adult-open");
  game.panelEl.classList.add("open", "journal-open");
  game.panelEl.replaceChildren(wrap);
  game.panelButtons = [
    ...JOURNAL_PAGES.map((tab) => ({ label: tab.label, onPick: () => tab.id !== page && showJournal(game, tab.id) })),
    { label: "Close", onPick: close },
  ];
  game.panelBack = close;
  game.screen = "panel";
}
