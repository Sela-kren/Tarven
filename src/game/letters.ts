/**
 * Wren's letters (STORY.md section 10): her grandmother left letters hidden about the house, and each one turns up
 * at a milestone. The madam's letters answer her lewdness, the keeper's letters her willpower, trust and the
 * secrets she keeps; the warning letter comes if her corruption turns rotten; the story letters come at fixed beats.
 * **No set is the wrong one**, and each letter ends on a price Wren paid (STORY.md 4b, "Wren is the mirror").
 *
 * They're checked at dawn. A letter whose milestone she's reached joins a queue, and the next morning one comes off
 * it, found somewhere in the tavern: at most one a morning. Words only: a letter never starts anything.
 */
import { arcIndex, mindStage, corruptionTier, type ArcStage } from "./lewd";

export type LetterSet = "madam" | "keeper" | "warning" | "story";

export type LetterId =
  // The story letters: Act 1's finale (Pell at dawn), the midpoint (Act 2), Father's (Act 3).
  | "pell"
  | "midpoint"
  | "father"
  // The madam's letters, in order.
  | "madamFirst"
  | "madamWarming"
  | "madamDuel"
  | "madamEager"
  | "madamLantern"
  // The keeper's letters.
  | "keeperNo"
  | "keeperBrawl"
  | "keeperTrust"
  | "keeperNames"
  | "keeperGrandfather"
  // Corruption rotten.
  | "warning";

/** What the unlock checks read, all from what the game already keeps (and the two small counters below). */
export interface LetterFacts {
  /** Touches she's let happen, all told. */
  lets: number;
  /** Touches she refused while part of her wanted them (torn or wanting it). */
  temptedNo: number;
  /** After-hours duels played: won, lost or called off. */
  duels: number;
  /** Brawls won. */
  brawlsWon: number;
  lewdness: number;
  arc: ArcStage;
  trust: number;
  trustMax: number;
  /** Last calls where she protected someone. */
  protected: number;
  /** Nights in a row her willpower never dipped below half. */
  willStreak: number;
  corruption: number;
}

/** Nights of willpower kept above half for the keeper's last letter; secrets kept at last call for "the names". */
export const WILL_STREAK_NIGHTS = 5;
export const PROTECTS_FOR_NAMES = 3;

export interface LetterDef {
  id: LetterId;
  set: LetterSet;
  title: string;
  /** What finds it, in words, for the journal. */
  unlock: string;
  /** Where she finds it, as the morning card opens. */
  where: string;
  /** The letter, in Wren's hand. */
  text: readonly string[];
  /**
   * Whether she's reached it. Story letters have none: they're found by their beat (Pell's at dawn), or not at all
   * yet (Acts 2 and 3).
   */
  check?: (f: LetterFacts) => boolean;
}

export const LETTERS: readonly LetterDef[] = [
  // ---- Story ----
  {
    id: "pell",
    set: "story",
    title: "Don't drink anything he pours",
    unlock: "Act 1's finale: Pell at dawn.",
    where: "Later, in the hollow leg of the stool Grandma always sat on, you find a letter in her hand.",
    text: [
      "\"If Pell is asking you about my book, then I'm already dead, and it wasn't my heart. Don't drink anything he pours.",
      "P.S. If it was my heart, then I went happy and I was wrong about him, and you can laugh at your old gran. Don't drink anything he pours anyway. He waters it.",
      "There are more of these about the house. I've hidden them where you'll find them when you need them, and not before. Stop looking under the beds. W.\"",
    ],
  },
  {
    id: "midpoint",
    set: "story",
    title: "Pig's tails",
    unlock: "Later on the pass (Act 2).",
    where: "Folded into the back of Brother Oden's prayer book, at the page for the forgiveness of petty clerks.",
    text: [
      "\"If anybody shows you a note saying I owed Hesk money: I never owed that man a copper in my life. He owed me, a cudgel's worth of manners.",
      "Look at the loops. Pell can't do a proper g to save his life. His come out like a pig's tail. Mine look like a lady's ankle. If the note's got pig's tails on it, you know whose hand it is.",
      "And if he's been in this house after I'm gone, rummaging, he'll have done it at night in that nightshirt of his, the one with the ducks on. Ask Oden. Oden doesn't sleep much, and he notices ducks. W.\"",
    ],
  },
  {
    id: "father",
    set: "story",
    title: "For when you go after him",
    unlock: "At the top of the pass (Act 3).",
    where: "Inside the last pages of the red book, an envelope in Grandma's hand: FOR WHEN YOU GO AFTER HIM.",
    text: [
      "\"If you're going east after your father, take a warm coat, a good knife and twice the money you think. He never could read a map. He once got lost between the bar and the privy, sober.",
      "Tell him I'm not angry. Tell him I was never angry. Tell him his mother was a madam and a liar and a spy, and she loved him more than all three, and he can come home now.",
      "He'll pretend he isn't crying. He is. He gets that from me. W.\"",
    ],
  },
  // ---- The madam's letters (lewdness) ----
  {
    id: "madamFirst",
    set: "madam",
    title: "The second time",
    unlock: "The first touch you let happen.",
    where: "Under the loose board behind the bar, the one your foot lands on every time you pour, a letter's folded small.",
    text: [
      "\"So. Somebody's had a hand on you, and you let it stay. Don't you go red, girl. I can feel it from here.",
      "The first man who put his hand on my hip at this bar was a drover called Abel, with a beard like a hedge and breath like the back end of one. I slapped him so hard his hat came off. The whole room cheered.",
      "The second time, I didn't.",
      "Here's what nobody told me: the room doesn't decide what you are. Your hand does. Slap or don't, it's still your hand.",
      "Mother Agathe up at the chapel stopped saying good morning to me that week. Forty years, and she never started again. W.\"",
    ],
    check: (f) => f.lets >= 1,
  },
  {
    id: "madamWarming",
    set: "madam",
    title: "A maybe",
    unlock: "Her mind warming (mind stage 1).",
    where: "Inside the lid of the salt box in the kitchen, stuck down with old wax.",
    text: [
      "\"They know now. Not what you'll do: that you might. That's worse, and it's better.",
      "Watch the room tonight. The bold ones lean in like you're a fire. The shy ones go quiet as mice and tip double to make up for it. The married ones suddenly need the privy, the one past the bar, past you. Funny, that.",
      "A woman who might say yes is the most interesting thing on the pass. More than ale, more than a fight. Men will walk up a mountain in the snow to stand next to a maybe.",
      "Mind, it cuts both ways. Once they know you might, they ask every night, and a no costs you more than it used to. Keep some of your no for yourself. It's the only thing in this house nobody can tip for.",
      "The chapel moved my pew to the back that year. Then to the door. Then outside it. W.\"",
    ],
    check: (f) => mindStage(f.lewdness) >= 1,
  },
  {
    id: "madamDuel",
    set: "madam",
    title: "After",
    unlock: "Her first after-hours game.",
    where: "Pressed in the hymn book on your bedroom shelf, the one nobody's ever opened. It falls open straight to the letter.",
    text: [
      "\"After. That's when they talk.",
      "Not during. During, a man can manage three words, and two of them are your name and the third's a god's. After, though, lying there with his boots still on and his cock gone shy, he tells you everything. His debts. His wife's sister. Which captain takes coin off the toll. Where the Baron's silver goes when it doesn't go to the Crown.",
      "I started writing it down because I couldn't remember it all, and I kept writing it down because I could. That's the red book, girl. It started as a list of who owed me for candles.",
      "A man who's just finished will tell you anything except the truth about how long he lasted. Write down the rest. Never that. Have some mercy.",
      "The first name in the book was the chapel's own Brother Cuthbert. I never used it. He knew I could, and he never forgave me for that either. W.\"",
    ],
    check: (f) => f.duels >= 1,
  },
  {
    id: "madamEager",
    set: "madam",
    title: "The best years",
    unlock: "Her mind eager (mind stage 2).",
    where: "Sewn into the red cushion on the window seat. The stitches are Grandma's: small, neat, a little crooked.",
    text: [
      "\"You've stopped pretending you don't want it. Good. Pretending wastes the evenings.",
      "The Lantern's best years, then, since you're asking without asking. Six girls and me, a red lamp in the window, and a queue down the hill on market nights. Barons' sons and shepherds on the same stairs. A bell rope in every room, and a house rule that whoever rang it for no reason got a bucket of cold water and no refund.",
      "I was good at it, pet. I liked it. I'll not lie to you in a letter you're reading after I'm dead. I liked being wanted by a whole room, and I liked choosing which of them got me, and how, and for how much.",
      "The chapel shut its door on me at midsummer. Old Brother Aldo read my sins out from the step, in order, and I stood at the back and corrected his arithmetic. Your father was six. He asked me after why the priest knew my name and none of the other mothers'. I never did find a good answer. W.\"",
    ],
    check: (f) => mindStage(f.lewdness) >= 2,
  },
  {
    // Section 10's open question, settled by its proposed answer: Willing, not mind stage 3, so it lands with the
    // lantern's lewdness-50 gate.
    id: "madamLantern",
    set: "madam",
    title: "Where the lantern is",
    unlock: "Willing, on her arc.",
    where: "Under the oldest cask in the cellar, the one chalked VINEGAR. DO NOT., a letter's nailed to the floor. The cask is empty. It always was.",
    text: [
      "\"You'll have guessed by now. Tansy's face, the stairs, the bell ropes nobody ever cut. This house was the Red Lantern, I was its madam, and I'd do it again.",
      "The lantern's down here. Behind this cask, in the wall, wrapped in my second-best petticoat. Red glass, a brass cage, and a dent where Lord Ambrose's boy walked into it drunk with no breeches on.",
      "Hang it, and they'll know what this house is again.",
      "Don't hang it for me. I've had my nights. Hang it if you want the room looking at you like that every night, and the coin that comes with it, and the girls who'll need you to be fair to them. Or leave it in the wall and wear the petticoat. Either way, it's yours.",
      "When I took it down, your father stopped being ashamed of me. When your mother found out what it had been, she took the pair of you down the mountain in the night. I'd have done the same, in her shoes. I'd still have hung it. W.\"",
    ],
    check: (f) => arcIndex(f.arc) >= arcIndex("willing"),
  },
  // ---- The keeper's letters (willpower, trust, respect) ----
  {
    id: "keeperNo",
    set: "keeper",
    title: "Saying no anyway",
    unlock: "The first touch you refuse while part of you wanted it.",
    where: "Tucked behind the mirror over your washstand, so you'd find it the morning you looked at yourself a bit longer than usual.",
    text: [
      "\"You wanted that one. Don't argue with a dead woman: I know the look. I wore it for years.",
      "Wanting it and saying no anyway is the strongest thing you'll ever do behind this bar.",
      "Any milkmaid can say no to a man she doesn't fancy. Saying no to one you do, with your knees gone to porridge and the whole room watching, and then pouring his next ale like nothing happened: that's a keeper. That's the woman they'll trust with the till and their secrets.",
      "There was a lord's son once, the prettiest thing that ever came up this road, with an arse you could crack walnuts on. I wanted him so badly I burnt three pies. I said no, because he'd have owned this house by spring. He took his friends and their purses down the valley instead, and the Lantern ate porridge for a month. Worth it. Mostly. W.\"",
    ],
    check: (f) => f.temptedNo >= 1,
  },
  {
    id: "keeperBrawl",
    set: "keeper",
    title: "Into the snow",
    unlock: "A brawl won.",
    where: "The old cudgel under the bar has a hollow handle. This morning you finally pick it up, and a letter slides out of it.",
    text: [
      "\"You've thrown your first one out, then. How's the hand? Put it in the ale bucket. Not the one you serve from.",
      "Best night of my life that didn't happen in a bed: old Baron Hesk, this one's father, came in on midwinter's eve with six men and his breeches already undone, and said this house was his by right, and so was everyone in it.",
      "I hit him with that cudgel. Then I hit him with the door. Then the farmers carried him out by the ankles and dropped him in the snowbank by the well, and his men had to dig him out, and he never came up this hill again as long as he lived. His son's been sore about it ever since. That's half of why he wants this house. The other half's my book.",
      "It cost me. The keep stopped sending its officers to the Lantern, and their purses went with them. We ate turnips all spring. I'd do it again, with a bigger cudgel. W.\"",
    ],
    check: (f) => f.brawlsWon >= 1,
  },
  {
    id: "keeperTrust",
    set: "keeper",
    title: "Why I took it down",
    unlock: "The village's trust at half.",
    where: "In the chapel poor box Grandma kept on the bar, under the last of the coppers, a letter's folded into a square.",
    text: [
      "\"Half the village would stand with you now. Don't spend it, girl. It isn't that kind of coin.",
      "You'll want to know why I took the lantern down, when it paid better than anything on the pass. It wasn't the chapel. The chapel could go whistle.",
      "It was old Bet Holt, the winter the toll went up. She came in with three children and no coat and asked could she work upstairs. I looked at her, and I looked at my girls, and I thought: this house can be one of two things to Tarven. Where you go when you've nothing left to sell, or where you go when you need help. It can't be both.",
      "I took the lamp down the next morning. Bet washed my dishes for twenty years. The Lantern's money went over the pass, and two of my girls with it, and I had a quieter life than I'd ever planned for. Some nights I missed the noise. Most nights I didn't. W.\"",
    ],
    check: (f) => f.trust * 2 >= f.trustMax,
  },
  {
    id: "keeperNames",
    set: "keeper",
    title: "The names I never wrote",
    unlock: `Protecting someone at last call ${PROTECTS_FOR_NAMES} times.`,
    where: "Behind the hearthstone that rocks when you kneel on it, a letter's wrapped in oilcloth.",
    text: [
      "\"Three times now you've had a secret in your hand at last call, and given it back. You'll never be rich doing that. Good.",
      "Here's what I never told anyone: the red book has gaps in it. A soldier's wife who ran from him. Two shepherds who shared a hut, and more than a hut, which the chapel wouldn't have liked. Pike's old sergeant, who cried at the end of every song. A man who hid a deserter in my cellar, the same as you might. I heard every one of them, and I never wrote one down.",
      "Hesk would have paid me in silver for any of them. That's all a book is, girl: a list of things you could sell. The names you don't write down are the only ones that are really yours.",
      "I could have bought the toll gate with what I didn't sell. I never did buy it. I still had a good bar. W.\"",
    ],
    check: (f) => f.protected >= PROTECTS_FOR_NAMES,
  },
  {
    id: "keeperGrandfather",
    set: "keeper",
    title: "Why I chose him",
    unlock: `Willpower kept above half for ${WILL_STREAK_NIGHTS} nights in a row.`,
    where: "In the pocket of Grandfather's old coat, still on its peg by the back door. It smells of pipe smoke and wet dog.",
    text: [
      "\"Five nights, and your head clear every one of them. You'd have liked your grandfather. He was the same: steady as a wall, and about as chatty.",
      "He was a carter with a bad knee and good hands. He came in every night one winter and drank one ale, slowly, and never once tried his luck, and my girls ran a book on how long it'd take him. Nobody won. In the end I had to ask him.",
      "I chose him because he was the only man in Tarven who wanted me for the mornings. Everyone else wanted the nights. The nights were easy. Anybody can have the nights.",
      "Marrying him cost me the Lantern, a fortune, and the kind of fame they write songs about. I got thirty years of breakfasts with a man who thought I was funny. It was a fair price. It was a bargain. W.\"",
    ],
    check: (f) => f.willStreak >= WILL_STREAK_NIGHTS,
  },
  // ---- The warning letter (corruption rotten) ----
  {
    id: "warning",
    set: "warning",
    title: "Whose secrets",
    unlock: "Corruption gone rotten.",
    where: "Nailed inside the lid of the strongbox, where you'd only ever see it counting coin. The nail's gone to rust.",
    text: [
      "\"This one I hoped you'd never find. If you're reading it, you've been counting a lot of coin lately, and some of it smells.",
      "The book made me rich, then it made me clever, then it made me something worse than either. I stopped hearing people. I heard prices. A farmer cried at my bar about his daughter, and I thought: that's two silver to the right man.",
      "I kept the secrets so long I forgot whose they were.",
      "Your father knew. That's why he went east with the last pages: not because I asked, but because I was the kind of woman who'd ask. Don't send anybody on that kind of errand, girl. They don't always come home, and when they don't, it's never the Baron you end up blaming. W.\"",
    ],
    check: (f) => corruptionTier(f.corruption) === "rotten",
  },
];

export const LETTER_BY_ID: ReadonlyMap<LetterId, LetterDef> = new Map(LETTERS.map((l) => [l.id, l]));
export const LETTER_IDS: readonly LetterId[] = LETTERS.map((l) => l.id);
export const isLetterId = (value: unknown): value is LetterId => LETTER_IDS.includes(value as LetterId);

/** The madam's letters, in the order they're read: each waits for the one before, so they always come in order. */
const MADAM_ORDER: readonly LetterId[] = LETTERS.filter((l) => l.set === "madam").map((l) => l.id);

/** The letters in the tavern's hands: found (in the order found), waiting to be found, and the two small counters. */
export interface LetterState {
  found: LetterId[];
  queue: LetterId[];
  /** Touches refused while she was tempted (torn or wanting it). */
  temptedNo: number;
  /** Nights in a row her willpower stayed at half or more. */
  willStreak: number;
}

export function newLetterState(): LetterState {
  return { found: [], queue: [], temptedNo: 0, willStreak: 0 };
}

/** Whether a letter's milestone is reached (story letters never are: their beats find them). */
export function letterUnlocked(id: LetterId, facts: LetterFacts, have: ReadonlySet<LetterId> = new Set()): boolean {
  const def = LETTER_BY_ID.get(id);
  if (!def?.check || !def.check(facts)) return false;
  const at = MADAM_ORDER.indexOf(id);
  return at <= 0 || have.has(MADAM_ORDER[at - 1]);
}

/** At dawn: every letter whose milestone she's reached, not yet found or waiting, joins the queue. Returns those. */
export function queueLetters(state: LetterState, facts: LetterFacts): LetterId[] {
  const have = new Set<LetterId>([...state.found, ...state.queue]);
  const added: LetterId[] = [];
  for (const def of LETTERS) {
    if (have.has(def.id) || !letterUnlocked(def.id, facts, have)) continue;
    state.queue.push(def.id);
    have.add(def.id);
    added.push(def.id);
  }
  return added;
}

/** The morning: the next letter off the queue is found. One a morning at most. */
export function findNextLetter(state: LetterState): LetterId | null {
  const id = state.queue.shift();
  if (!id) return null;
  if (!state.found.includes(id)) state.found.push(id);
  return id;
}

/** A story letter found by its beat (Pell's at dawn): found now, and off the queue if it was on it. */
export function findLetter(state: LetterState, id: LetterId): void {
  state.queue = state.queue.filter((q) => q !== id);
  if (!state.found.includes(id)) state.found.push(id);
}

/** The willpower streak, at the end of a night: one more if it never dipped below half, back to none if it did. */
export function countWillNight(state: LetterState, keptHalf: boolean): void {
  state.willStreak = keptHalf ? state.willStreak + 1 : 0;
}

/** Where she found it, then the letter: the morning card's lines, and what the journal rereads. */
export function letterLines(id: LetterId): string[] {
  const def = LETTER_BY_ID.get(id)!;
  return [def.where, ...def.text];
}

/** What's saved: the letters found and waiting, and the counters. */
export interface LettersSave {
  found: string[];
  queue: string[];
  temptedNo: number;
  willStreak: number;
}

export function saveLetters(state: LetterState): LettersSave {
  return { found: [...state.found], queue: [...state.queue], temptedNo: state.temptedNo, willStreak: state.willStreak };
}

/**
 * From a save. Older saves have no letters: they start with none, except Pell's, when his dawn has already been
 * (it was shown then, as a line of the morning).
 */
export function readLetters(raw: unknown, pellDone: boolean): LetterState {
  const state = newLetterState();
  const r = raw && typeof raw === "object" ? (raw as Partial<Record<keyof LettersSave, unknown>>) : null;
  const ids = (list: unknown): LetterId[] => (Array.isArray(list) ? list.filter(isLetterId).filter((id, i, all) => all.indexOf(id) === i) : []);
  const count = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
  if (r) {
    state.found = ids(r.found);
    state.queue = ids(r.queue).filter((id) => !state.found.includes(id));
    state.temptedNo = count(r.temptedNo);
    state.willStreak = count(r.willStreak);
  } else if (pellDone) {
    state.found = ["pell"];
  }
  return state;
}
