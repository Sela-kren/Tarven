/**
 * Act 3: Last Call (STORY.md sections 13 and 14; from 1,500 fans, after Act 2). Pure rules and words; tavern.ts keeps
 * the state (in Act 2's save, act2.ts `Act2Save.flags`) and applies what comes out.
 *
 * - **Father's trail** (after the second Ledger): the last pages of the red book are in the keep's cells (decided 20 Nov
 *   2026: only his pages are there, not him). She reaches them through Rhea, Silas's tunnels, Kestrel's adventurers
 *   (hired), or Pell's price; or not yet, and it comes round again in a few nights.
 * - **The rival night** (1,750): a showdown with whichever rival is closest to her on the Pass Ledger: beat it fairly
 *   or dirty (STORY.md 7's columns), and it falls to her at dawn (act2.ts: buy, partner or ruin).
 * - **The auditor** (2,000): the crown's auditor lodges at the top house on the pass. If that isn't hers, she gets him
 *   through her door some other way, or doesn't. Baroness Varn arrives the same night to court him.
 * - **The last offer** (the morning after): the Baron's terms, through Pell (if he wasn't exposed) or the widow Hesk.
 *   On top of the pass with enough of the book, it's a partnership, not a threat (STORY.md 7, "Working with the Baron").
 * - **Last call** (the morning after that): the last night, the Baron at the back table, everyone her choices sent there;
 *   at last call he asks for the book, and she decides where it goes.
 * - **The final Ledger** (the next dawn): the last Pass Ledger, and her ending (`pickEnding`, section 14). The nights go
 *   on after it, as after Chapter 1.
 *
 * The Baron is leverage, never a client (STORY.md 12): nothing here has him in her bed, whatever she agrees to. Every
 * character is an adult; the consent rule (GAME_PATH.MD) isn't touched: Act 3 is talk, coin, brawls and the book.
 */
import type { FanGroup } from "./chapter1";
import { PASS_RIVALS, type RivalId } from "./act2";

export type Act3BeatId = "fathersTrail" | "rivalNight" | "auditor" | "lastOffer" | "lastCall" | "finalLedger";

/** The beats, in order: the fans each needs, and whether it waits a morning after the one before. */
export const ACT3_BEATS: readonly { id: Act3BeatId; fans: number }[] = [
  { id: "fathersTrail", fans: 1500 },
  { id: "rivalNight", fans: 1750 },
  { id: "auditor", fans: 2000 },
  { id: "lastOffer", fans: 2000 },
  { id: "lastCall", fans: 2000 },
  { id: "finalLedger", fans: 2000 },
];

/** Nights before Father's trail comes round again, when she can't reach the cells yet. */
export const TRAIL_RETRY = 3;
/** Pieces of the book (of four: Act 2's three and the last pages) that make it enough to hang the Baron. */
export const ENOUGH_OF_THE_BOOK = 3;

/** What Act 3 reads off her. */
export interface Act3Facts {
  gold: number;
  trust: number;
  respect: number;
  fame: number;
  corruption: number;
  informed: number;
  brawlsWon: number;
  arcKnown: boolean;
  flags: ReadonlySet<string>;
  /** Her place on the Pass Ledger (1 is the top), and the rival closest to her, if any stands. */
  passRank: number;
  closest: RivalId | null;
  /** Pieces of the red book she holds, of four. */
  pieces: number;
  /** Her guild rank, or null. */
  guild: string | null;
  /** The Lantern: hung, and one of her girls gone. */
  lanternHung: boolean;
  girlGone: boolean;
  /** What she still owes the Baron. */
  owed: number;
  /** Her biggest fan group (the crown it'd be), and the houses she owns on the pass. */
  crown: FanGroup;
  owned: number;
  /** Who she sees on the last night: her ledger lines. */
  ledger: string[];
}

export interface Act3Effect {
  lines: string[];
  gold?: number;
  trust?: number;
  heat?: number;
  corruption?: number;
  respect?: number;
  fame?: number;
  flags?: string[];
  /** A rival beaten in its showdown: it falls to her at dawn. */
  rivalFalls?: RivalId;
  /** A rival that won its showdown, and the fans it takes. */
  rivalGains?: { id: RivalId; fans: number };
  /** Father's trail can't be walked yet: come round again. */
  retry?: boolean;
}

export interface Act3Choice {
  id: string;
  label: string;
  hidden?: (f: Act3Facts) => boolean;
  run: (f: Act3Facts) => Act3Effect;
}

export interface Act3Card {
  title: string;
  lines: (f: Act3Facts) => string[];
  choices: (f: Act3Facts) => Act3Choice[];
}

const has = (f: Act3Facts, flag: string) => f.flags.has(flag);
const enough = (f: Act3Facts) => f.pieces >= ENOUGH_OF_THE_BOOK;

// ---- The rival night: fair and dirty, by rival (STORY.md 7, "The pass rivals") ----

interface Showdown {
  fair: { label: string; needs: (f: Act3Facts) => boolean; line: string };
  dirty: { label: string; line: string; heat: number; corruption: number };
}

const SHOWDOWNS: Readonly<Record<RivalId, Showdown>> = {
  stag: {
    fair: {
      label: "Out-host the Stag: the best supper on the pass, and every guest kept safe",
      needs: (f) => f.respect >= 2 && f.trust >= 8,
      line: "You lay on the finest supper the pass has seen, and walk every guest home yourself. The valley's diners decide the Stag was only ever the second-best house. The widow Hesk sends her compliments, through her teeth.",
    },
    dirty: {
      label: "Put laxatives in the Stag's ale, and let the silver out early",
      line: "A powder in the Stag's casks, and a word in the valley about whose silver sits in its strongroom. By midnight the Stag's guests are queueing for the privy and talking about the Baron. Nobody dines there again.",
      heat: 3,
      corruption: 15,
    },
  },
  velvet: {
    fair: {
      label: "Offer Sabine's girls better terms, and let them choose",
      needs: (f) => f.lanternHung && f.corruption < 150,
      line: "You put your terms on the Velvet House's own doorstep: a fair share, a night off, a door that locks from the inside. By dawn half Sabine's girls have walked up the hill to you, by choice. Sabine watches them go.",
    },
    dirty: {
      label: "Blackmail the Velvet House's best clients",
      line: "Three letters to three husbands' wives, and the Velvet House's best clients stop coming. Sabine's girls follow the money to your door. Nobody chose anything.",
      heat: 2,
      corruption: 20,
    },
  },
  rat: {
    fair: {
      label: "Out-fight the Rat: a brawl night with Grig's best, and Silas's crew at your back",
      needs: (f) => f.brawlsWon >= 15 && !has(f, "silasAngry"),
      line: "Grig's best against you and Silas's crew, in the Rat's own yard. You put Grig on his back yourself. The river drinks at yours now.",
    },
    dirty: {
      label: "Inform on Grig to the garrison",
      line: "A word to the garrison about who's been selling whose ale. They raid the Drowned Rat by midnight. Grig spends the night in a cell, and his regulars spend it at yours.",
      heat: 1,
      corruption: 10,
    },
  },
};

// ---- The cards ----

export const ACT3_CARDS: Readonly<Record<Act3BeatId, Act3Card>> = {
  fathersTrail: {
    title: "Father's trail",
    lines: () => [
      "The last pages of the red book are in the Baron's keep, in the cells under it, where he keeps everything he takes. Father's letter said so. Getting in is the hard part.",
    ],
    choices: (f) => [
      {
        id: "rhea",
        label: "Ask Captain Rhea to let you in on her watch",
        hidden: () => !has(f, "rheaDoubts") && !has(f, "rheaKnows"),
        run: () => ({
          lines: ["Rhea walks you down to the cells at the change of the watch and stands at the stair with her back turned. A box of papers in a cell with no prisoner. \"I didn't see you,\" she says. \"Be quick.\""],
          heat: 1,
          flags: ["lastPages", "pages:rhea"],
        }),
      },
      {
        id: "tunnels",
        label: "Go in through Silas's old smugglers' tunnel",
        hidden: () => has(f, "silasAngry") || (!has(f, "silasOwes") && !has(f, "routes:held")),
        run: () => ({
          lines: ["Silas's tunnel comes up under the keep's wine cellar. You crawl, you climb, you find the cell, and the box, and come out covered in cobwebs and Wren's handwriting."],
          heat: 2,
          flags: ["lastPages", "pages:tunnels"],
        }),
      },
      {
        id: "kestrel",
        label: "Hire Kestrel's adventurers for the job (80 gold)",
        hidden: () => !f.guild || f.gold < 80,
        run: () => ({
          lines: ["Kestrel's party goes over the keep's wall at midnight and comes back over it at one, with a box and a very smug look. \"Best eighty gold you'll ever spend,\" Kestrel says. It is."],
          gold: -80,
          flags: ["lastPages", "pages:kestrel"],
        }),
      },
      {
        id: "pell",
        label: "Pay Pell's price (120 gold, and a name)",
        hidden: () => has(f, "pellExposed") || f.gold < 120,
        run: () => ({
          lines: ["Pell takes the hundred and twenty, and a name from your room, and brings you the box himself. \"I never read it,\" he says. You don't believe him. It doesn't matter now."],
          gold: -120,
          corruption: 10,
          flags: ["lastPages", "pages:pell"],
        }),
      },
      {
        id: "wait",
        label: "Not yet: you can't reach them",
        run: () => ({ lines: ["The keep's cells stay locked to you, for now. You'll find a way. (It comes round again in a few nights.)"], retry: true }),
      },
    ],
  },
  rivalNight: {
    title: "The rival night",
    lines: (f) =>
      f.closest
        ? [`It comes down to you and ${PASS_RIVALS[f.closest].name}, neck and neck on the Pass Ledger. One of you is going to own this road by morning.`]
        : ["No rival's left standing on the pass to face you. The road's yours already. The rival night is a party instead."],
    choices: (f) => {
      if (!f.closest) return [{ id: "party", label: "Throw the party", run: () => ({ lines: ["The whole pass drinks at yours. Nobody remembers going home."], fame: 2 }) }];
      const id = f.closest;
      const s = SHOWDOWNS[id];
      const r = PASS_RIVALS[id];
      return [
        {
          id: "fair",
          label: s.fair.label,
          hidden: () => !s.fair.needs(f),
          run: () => ({ lines: [s.fair.line], rivalFalls: id, fame: 2 }),
        },
        {
          id: "dirty",
          label: s.dirty.label,
          run: () => ({ lines: [s.dirty.line], rivalFalls: id, heat: s.dirty.heat, corruption: s.dirty.corruption }),
        },
        {
          id: "letgo",
          label: `Let ${r.name} have the night`,
          run: () => ({ lines: [`You let ${r.name} have the night. It takes it, and a fair few of your regulars with it.`], rivalGains: { id, fans: 80 } }),
        },
      ];
    },
  },
  auditor: {
    title: "The auditor",
    lines: (f) => [
      "The crown's auditor rides up the pass dressed as a minor noble, with a very good hat and a very bad cover story. He'll lodge at the best house on the pass.",
      f.passRank === 1
        ? "That's yours. He takes your best room, asks for the stew twice, and watches everything."
        : "That isn't yours. He takes a room at the house above you on the Ledger.",
      "Baroness Isolde Varn arrives the same evening, in lowland silk, and courts him across the room all night. She wants Hesk's keep. She'd very much like to know what you know.",
    ],
    choices: (f) =>
      f.passRank === 1
        ? [{ id: "host", label: "Host him well", run: () => ({ lines: ["The auditor sleeps under your roof. Whatever he hears on the pass, he hears it from you."], flags: ["auditorHers"] }) }]
        : [
            {
              id: "varn",
              label: "Let Varn bring him to dinner at yours",
              run: () => ({ lines: ["Varn brings the auditor to your table for supper, and stays to watch you talk. She'll want a favour for it. They always do."], flags: ["auditorReached", "varnOwed"] }),
            },
            {
              id: "bribe",
              label: "Bribe his coachman to drive him to your door (50 gold)",
              hidden: () => f.gold < 50,
              run: () => ({ lines: ["Fifty gold, and the coachman \"loses his way\" to your yard. The auditor stays a night, puzzled and well fed."], gold: -50, corruption: 5, flags: ["auditorReached"] }),
            },
            {
              id: "leave",
              label: "Leave him where he is",
              run: () => ({ lines: ["The auditor stays where he is. Whatever he hears on the pass, he won't hear it from you."] }),
            },
          ],
  },
  lastOffer: {
    title: "The last offer",
    lines: (f) => {
      const who = has(f, "pellExposed") ? "The widow Hesk" : "Pell";
      return f.passRank === 1 && enough(f)
        ? [
            `${who} comes at dawn with the Baron's seal, and for once doesn't threaten anything.`,
            "\"The Baron proposes a partnership. Keep the book shut. He'll back your houses, grant your licences, lower your tolls and keep the garrison off your doors. You'll own the pass's taverns. He keeps his keep.\"",
            "\"Someone will have to answer for your grandmother, of course. Pell, perhaps.\"",
          ]
        : [
            `${who} comes at dawn with the Baron's seal, and doesn't sit down.`,
            "\"The Baron's last terms. Give him the book, and every debt you have is forgotten, your house is left alone, and nobody on the pass gets hurt. Refuse, and the garrison comes after Last Call.\"",
          ];
    },
    choices: (f) =>
      f.passRank === 1 && enough(f)
        ? [
            {
              id: "partner",
              label: "Accept the partnership (the book stays shut)",
              run: () => ({ lines: ["You shake the Baron's seal. A partner, never a client: the house rule holds. The pass's taverns will answer to you, and he'll answer to the book you're keeping shut."], flags: ["offer:partner"], heat: -3 }),
            },
            { id: "refuse", label: "Refuse him", run: () => ({ lines: ["You tell the Baron's messenger the book isn't for sale, or for sharing. The seal goes back in its pouch."], flags: ["offer:refused"], heat: 2 }) },
          ]
        : [
            { id: "refuse", label: "Refuse him", run: () => ({ lines: ["You tell the messenger to tell the Baron you'll see him at Last Call. The garrison starts sharpening things."], flags: ["offer:refused"], heat: 3 }) },
            {
              id: "give",
              label: "Give the Baron the book",
              hidden: () => f.pieces === 0,
              run: () => ({ lines: ["You hand over every piece of the red book you have. The debts are forgotten. The Baron keeps his keep. Everyone you protected pays for it, later, one by one."], flags: ["book:baron"], heat: -5, corruption: 20 }),
            },
          ],
  },
  lastCall: {
    title: "Last call",
    lines: (f) => {
      const room = [
        has(f, "rheaDoubts") || has(f, "rheaKnows") ? "Rhea's soldiers by the door, out of uniform" : "",
        has(f, "silasAngry") ? "" : "Silas's crew in the corner, too quiet",
        has(f, "maraArrested") ? "" : "Mara's farmers along the long table",
        f.lanternHung ? "your girls on the stairs" : "",
        "your fans, every table full",
      ].filter(Boolean);
      return [
        "A normal service night, except for who's in it. Baron Hesk sits at the back table with a cup of your ale he hasn't touched.",
        `The room is full of people your choices sent here: ${room.join(", ")}.`,
        "At last call the Baron stands, and the room goes quiet. \"The book,\" he says. \"Your grandmother's book. Now.\"",
      ];
    },
    choices: (f) => [
      {
        id: "auditor",
        label: "Give the book to the crown's auditor",
        hidden: () => !(has(f, "auditorHers") || has(f, "auditorReached")) || !enough(f) || has(f, "book:baron"),
        run: () => ({ lines: ["You put the red book on the auditor's table instead. Twenty years of stolen toll silver, in Wren's hand. The auditor turns the pages. The Baron stops smiling."], flags: ["book:auditor"] }),
      },
      {
        id: "varn",
        label: "Give the book to Baroness Varn",
        hidden: () => !enough(f) || has(f, "book:baron"),
        run: () => ({ lines: ["You slide the red book across to Baroness Varn. She smiles like a cat at a dairy. By morning she'll have Hesk's keep, and she'll owe you for it, and she'll start wondering what else you know."], flags: ["book:varn"] }),
      },
      {
        id: "partner",
        label: "Keep the book shut, as his partner",
        hidden: () => !has(f, "offer:partner") || has(f, "book:baron"),
        run: () => ({ lines: ["You raise your cup to the Baron. \"Partners,\" you say, and the room hears it. The book stays shut. The pass is yours to run, under his roof."], flags: ["book:partner"] }),
      },
      {
        id: "keep",
        label: "Keep the book",
        hidden: () => has(f, "book:baron"),
        run: () => ({ lines: ["\"No,\" you say. Just that. The Baron looks round the room, at every face your choices sent there, and sits back down."], flags: ["book:kept"] }),
      },
      {
        id: "close",
        label: "Call last orders",
        hidden: () => !has(f, "book:baron"),
        run: () => ({ lines: ["The Baron has his book already. He finishes the ale this time, nods to you, and leaves. The room drinks on, quieter."] }),
      },
    ],
  },
  finalLedger: {
    title: "The final Ledger",
    lines: (f) => ["The last Pass Ledger is read at dawn, in every house on the pass:", ...f.ledger],
    choices: () => [{ id: "ending", label: "Go on", run: () => ({ lines: [], flags: ["act3Done"] }) }],
  },
};

/** The next Act 3 beat she hasn't had, and the fans it needs; null once the act's done. */
export function nextAct3Beat(done: ReadonlySet<string>): { id: Act3BeatId; fans: number } | null {
  return ACT3_BEATS.find((b) => !done.has(b.id)) ?? null;
}

// ---- Endings (STORY.md section 14) ----

export type EndingId =
  | "boughtAndSold"
  | "baronsPartner"
  | "baronessHouse"
  | "lanternBurns"
  | "newBaron"
  | "villageRises"
  | "masterOfPass"
  | "redLantern"
  | "wrensHeir"
  | "lostToNight"
  | "paidInFull"
  | "lastCall";

export interface Ending {
  id: EndingId;
  title: string;
  lines: readonly string[];
}

export const ENDINGS: Readonly<Record<EndingId, Ending>> = {
  boughtAndSold: {
    id: "boughtAndSold",
    title: "Bought and Sold",
    lines: ["The debt is forgiven. The tavern is yours. The Baron keeps his keep and his silver.", "One by one, the people you protected pay for it. You keep the ale cold. You don't ask where they've gone."],
  },
  baronsPartner: {
    id: "baronsPartner",
    title: "The Baron's Partner",
    lines: ["You run the pass's houses under the Baron's protection: licences granted, tolls lowered, the garrison off your doors.", "Whether it's an uneasy peace or the start of a new tyranny depends on who you shielded on the way. The book stays shut, under your bed. He's a partner, never a client."],
  },
  baronessHouse: {
    id: "baronessHouse",
    title: "The Baroness's House",
    lines: ["Hesk hangs by midsummer. Baroness Varn rules the pass from his keep, and your house is her favourite.", "She dines with you every week. Lately she's started asking, very politely, about the book."],
  },
  lanternBurns: {
    id: "lanternBurns",
    title: "The Lantern Burns",
    lines: ["Your girls turned on you, the way Sabine once turned on Wren. Someone tells the Baron where you sleep.", "The lantern goes out one night and doesn't come back on. Sabine's story, told again, with your name in it."],
  },
  newBaron: {
    id: "newBaron",
    title: "The New Baron",
    lines: ["You win the pass, and become what you fought: every house pays you, every road answers to you, and nobody says no twice.", "The auditor dines with you. He brings his own wine."],
  },
  villageRises: {
    id: "villageRises",
    title: "The Village Rises",
    lines: ["The auditor reads Wren's book to the crown. The Baron hangs. Mara's farmers carry the toll gate down to the river and throw it in.", "Your tavern becomes the village's meeting hall. Grandma would have charged them for the chairs."],
  },
  masterOfPass: {
    id: "masterOfPass",
    title: "Master of the Pass",
    lines: ["Every tavern on the pass answers to you now: bought, partnered, or simply outshone.", "Down the road, there's talk of a ferry inn, a mountain lodge, a bathhouse with no keeper. (Expand mode is still to come.)"],
  },
  redLantern: {
    id: "redLantern",
    title: "The Red Lantern",
    lines: ["The lantern burns in your window every night, and the whole pass knows what it means.", "The most famous house on the pass, and the Baron can't touch it: you kept the book."],
  },
  wrensHeir: {
    id: "wrensHeir",
    title: "Wren's Heir",
    lines: ["You keep the book, and a new one beside it, in your own hand: every secret the room told you.", "Spymaster of the pass, exactly like Grandma. The Baron sends you a cask every midwinter, and doesn't sleep."],
  },
  lostToNight: {
    id: "lostToNight",
    title: "Lost to the Night",
    lines: ["You have the gold and the fans and the top of the pass. The room has your name: they sing it, they carve it, they buy it by the hour.", "Somewhere in all of it, the keeper went missing. The room owns her name now, not her."],
  },
  paidInFull: {
    id: "paidInFull",
    title: "Paid in Full",
    lines: ["Every coin the Baron claimed is paid. The tavern is yours, outright, and so is the book.", "The Baron's still watching. Let him."],
  },
  lastCall: {
    title: "Last Call",
    id: "lastCall",
    lines: ["The Baron goes home with nothing, and so does nobody else. The pass goes on, and so does your tavern.", "Tomorrow there'll be a fire to light and a floor to sweep. Grandma would say that's the whole of it."],
  },
};

/**
 * Her ending, the first that fits (STORY.md 14). Where the book went comes first: given to the Baron, kept as his
 * partner, or used to put Varn in Hesk's keep. Then what she became: her girls turned, rotten on top, the village
 * risen, master of the pass, her crown. The lovers' endings wait for the lovers' routes.
 */
export function pickEnding(f: Act3Facts): EndingId {
  const top = f.passRank === 1;
  const rotten = f.corruption >= 150;
  if (has(f, "book:baron")) return "boughtAndSold";
  if (has(f, "book:partner") && top) return "baronsPartner";
  if (has(f, "book:varn") && top) return "baronessHouse";
  if (f.lanternHung && rotten && f.girlGone) return "lanternBurns";
  if (top && rotten) return "newBaron";
  if (has(f, "book:auditor") && f.crown === "keeper" && !has(f, "maraArrested") && f.trust >= 13) return "villageRises";
  if (top && f.owned >= 2) return "masterOfPass";
  const kept = has(f, "book:kept") || has(f, "book:partner");
  if (kept && f.crown === "lantern" && f.corruption < 150) return "redLantern";
  if (kept && f.crown === "network" && f.informed >= 5) return "wrensHeir";
  if (f.arcKnown && f.respect <= -3 && !f.lanternHung) return "lostToNight";
  if (f.owed === 0 && !has(f, "book:baron")) return "paidInFull";
  return "lastCall";
}

