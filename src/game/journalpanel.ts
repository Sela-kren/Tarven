/** The journal on the chest, opened over the game: ribbon tabs across the top, one spread per tab. */
import type { Game } from "./game";
import { journalBook, lettersBook, passivesBook, privateBook, recordsBook, skillsBook, titlesBook, wantedBook, type LetterEntry } from "./journal";
import { LETTER_BY_ID, LETTERS, letterLines, type LetterSet } from "./letters";
import { CHAPTER_ENDINGS } from "./chapter1";
import { roleLabel } from "./guestroles";
import { MEMORY_WORDS, regularNerve, REGULARS_PER_KIND } from "./regulars";
import { lewdWord } from "./passives";
import { arcStageName } from "./lewd";
import { TWO_SLOTS_FAME } from "./titles";
import { DEBUFFS } from "./debuffs";
import { HOUSES } from "./ledger";
import { HEAT_MAX, TRUST_MAX, TRUST_TO_OVERTHROW } from "./tavern";

/** The journal's spreads, in tab order. */
export type JournalPage = "ledger" | "letters" | "private" | "passives" | "titles" | "skills" | "records" | "wanted";
export const JOURNAL_PAGES: readonly { id: JournalPage; label: string }[] = [
  { id: "ledger", label: "Ledger" },
  { id: "letters", label: "Letters" },
  { id: "private", label: "Private" },
  { id: "passives", label: "Passives" },
  { id: "titles", label: "Titles" },
  { id: "skills", label: "Skills" },
  { id: "records", label: "Records" },
  { id: "wanted", label: "Wanted" },
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
        gold: tavern.gold,
        debt: tavern.owed,
        promised: tavern.bookPromised,
        fans: tavern.fans,
        rank: tavern.rank,
        houses: HOUSES.map((h) => ({ name: h.name, boss: h.boss, fans: h.fans, fate: tavern.houses[h.id] })),
        debuffs: tavern.debuffs.map((d) => {
          const def = DEBUFFS[d.id];
          const lasts = def.nights === 0 ? "Until it's put right." : d.nights === 1 ? "Tonight." : `${d.nights} more nights.`;
          return { name: d.level > 1 ? `${def.name} ${d.level}` : def.name, detail: def.detail(d.level), lasts };
        }),
        trust: tavern.trust,
        trustMax: TRUST_MAX,
        trustToRise: TRUST_TO_OVERTHROW,
        heat: tavern.heat,
        heatMax: HEAT_MAX,
        persona: tavern.persona,
        lewdness: tavern.lewdness,
        corruption: Math.round(tavern.corruption),
        favors: tavern.favorsAhead.map((f) => ({ kind: f.kind, note: f.note })),
      },
      (name) => (tavern.name = name),
    );
  } else if (page === "letters") {
    // Wren's letters to reread, the blanks still to find, and how Chapter 1 ended (letters.ts, chapter1.ts).
    const SET_NAMES: Record<LetterSet, string> = { madam: "The madam's", keeper: "The keeper's", warning: "The warning", story: "The story" };
    const found = new Set(tavern.letters.found);
    const entry = (id: (typeof LETTERS)[number]["id"]): LetterEntry => {
      const def = LETTER_BY_ID.get(id)!;
      const has = found.has(id);
      return { title: def.title, set: SET_NAMES[def.set], unlock: def.unlock, found: has, ...(has ? { lines: letterLines(id) } : {}) };
    };
    const ending = tavern.chapterEnding ? CHAPTER_ENDINGS[tavern.chapterEnding] : null;
    book = lettersBook({
      letters: LETTERS.map((l) => entry(l.id)),
      found: tavern.letters.found.map(entry),
      ...(ending ? { chapter: { title: ending.title, previews: ending.previews, text: ending.text, needs: ending.needs } } : {}),
    });
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
      arc: { name: arcStageName(tavern.arcStage), note: tavern.legendNote },
    });
  } else if (page === "passives") {
    book = passivesBook({ owned: tavern.passives, facts });
  } else if (page === "titles") {
    // Putting one on or taking it off turns back to this page, showing what changed.
    book = titlesBook({
      facts,
      earned: tavern.titles,
      worn: tavern.worn,
      slots: tavern.titleSlots,
      canChange: tavern.canChangeTitles,
      twoSlotsFame: TWO_SLOTS_FAME,
      level: tavern.herLevel,
      slutLevel: tavern.slutLevel,
      slutWord: lewdWord(tavern.lewdness),
      onWear: (id) => tavern.wearTitle(id) && showJournal(game, "titles"),
      onTakeOff: (id) => tavern.takeOffTitle(id) && showJournal(game, "titles"),
    });
  } else if (page === "wanted") {
    book = wantedBook({
      perKind: REGULARS_PER_KIND,
      regulars: tavern.regulars.map((r) => ({
        name: r.name,
        who: roleLabel(r.role, r.female),
        since: r.since,
        nights: r.nights,
        nerve: r.stats.nerve,
        lasting: regularNerve(r),
        prefers: r.stats.prefers,
        memory: MEMORY_WORDS[r.last],
        lets: r.lets,
        adult: r.adult,
        beatHer: r.beatHer,
        lostToHer: r.lostToHer,
        fight: { stamina: r.stats.fight.stamina, attack: r.stats.fight.attack },
        partner: { stamina: r.stats.partner.stamina, skill: r.stats.partner.skill },
      })),
    });
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
