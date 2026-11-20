import type { ArcStage } from "./lewd";
import type { PlotFlag } from "./plot";
import type { HouseId } from "./ledger";
import { rivalActions, ruinedLine } from "./rivalvisits";
import { HELP, RECRUIT_IDS, RECRUITS, WARN, type RecruitId, type RecruitState } from "./recruits";
import { careerActions, careerTitle, type CareerId, type CareerState } from "./careers";
import { HOUSES } from "./ledger";
import { RIVAL_PLANS } from "./rivalvisits";
import { CANVASS, CANVASS_MOST, FACTIONS } from "./townhall";
import type { Faction } from "./knight";
import { PIECES, type BookFacts, type PieceId, type PieceStatus } from "./act2";

/**
 * Tarven by day, version 1 (TOWN_DAY.md §3): something to do at every place on the high street, so the day is a
 * small plan (hours are the currency, §2) that feeds the night. The market and flyers are in errands.ts; this is
 * everywhere else.
 *
 * - **Notice board:** day jobs for gold (§5): honest work from day 1, the painter at Curious, lewder work at
 *   Willing and Known.
 * - **Chapel:** Oden (talk, a candle for Wren, confession that costs something, STORY.md §8). Talking to him is his
 *   route (TOWN_DAY.md step 4, ODEN_ROUTE): Wren's past, the salt under his floor, his doubts, one talk at a time.
 * - **Warm House:** a first look at the Church of Veyra (CHURCH_CONCEPT.md): a ribbon, a blessing, a session.
 * - **The rival houses** (the Copper Bell, the Bakehouse, the Cider Barn, the garrison's Watch Canteen and the
 *   Toll-Gate Inn): the Village Ledger's fight by day, scout it, beat it fairly or dirty (rivalvisits.ts).
 * - **Bakehouse, Cider Barn:** honest work, pies, gossip, the farmers' trust.
 * - **Garrison yard:** sparring, laundry, a drink with Rhea that cools the heat.
 * - **Mara's fields, the quarry road:** the harvest and Mara; hauling stone and Silas's crates.
 *
 * Each action is pure data plus a function from what the town sees of her to what it does: tavern.ts applies it
 * (`doTownAction`) and game.ts shows it and moves the clock. Every character is an adult (18+). The lewd jobs are
 * work she picks herself, written as non-graphic cards; the consent rule (GAME_PATH.MD) is untouched.
 */

export type TownPlaceId =
  | "board" | "chapel" | "warmhouse" | "copperbell" | "bakehouse" | "ciderbarn" | "garrison" | "fields" | "quarry" | "tollgate" | "townhall";

/** What the town sees of her when she picks something to do. */
export interface TownState {
  arc: ArcStage;
  corruption: number;
  fame: number;
  respect: number;
  flirt: number;
  heat: number;
  trust: number;
  /** 0 to 5 (herstate.ts). Hard work is refused at 5. */
  fatigueLevel: number;
  flags: ReadonlySet<PlotFlag>;
  /** The Village Ledger's houses she's beaten (partner, ruined, fallen). */
  houses: Partial<Record<HouseId, string>>;
  /** Her fans (ledger.ts), set against a rival house's. */
  fans: number;
  /** Nights she's opened the doors: the first of them was the salt night. */
  nights: number;
  /** How many times she's ever done each thing in town ("place:action"), and how far along a route ("oden:route"). */
  done: Readonly<Record<string, number>>;
  /** The Warm House's recruits (recruits.ts), and how far up the hill each has gone. */
  recruits: Readonly<Record<RecruitId, RecruitState>>;
  /** Her careers by day (careers.ts): the smuggler's and the clergy's ladders. */
  careers: Readonly<Record<CareerId, CareerState>>;
  /** Which sibling is out (her titles by body); she, when left out. */
  body?: "Female" | "Male";
  /** Her garrison rank (knight.ts) and guild rank (guild.ts), or null when she hasn't joined. */
  knightRank?: string | null;
  guildRank?: string | null;
  /** The town hall (townhall.ts): her seat, the chain, her share of the vote, what she still lacks, her canvassing. */
  hall?: { seat: boolean; reeve: boolean; vote: number; missing: readonly string[]; campaign: Partial<Record<Faction, number>> };
  /** The red book (act2.ts): which pieces she's heard of and holds, and what their ways read off her. */
  book?: { status: Readonly<Record<PieceId, PieceStatus>>; facts: BookFacts };
}

/** What an action does. Everything is optional; gold can be earned (plus) or spent (minus). */
export interface TownOutcome {
  line: string;
  gold?: number;
  /** Fans, counted at dawn, and guests who come in tonight because of it. */
  fans?: number;
  guests?: number;
  respect?: number;
  fame?: number;
  flirt?: number;
  lust?: number;
  kindness?: number;
  heat?: number;
  trust?: number;
  corruption?: number;
  /** Fatigue added (minus rests her). */
  fatigue?: number;
  /** Added to her strongest desire meter (pussy, or cock for him), for tonight. */
  desire?: number;
  /** A step on a route she's taken (counted in TownState.done under this name), such as "oden:route". */
  mark?: string;
  /** She helped a recruit up the hill, or warned them off (recruits.ts). */
  recruit?: { id: RecruitId; act: "help" | "warn" };
  /** A step on a career (careers.ts): joining it, a job done, or a rank up. */
  career?: { id: CareerId; act: "join" | "job" | "promote" };
  /** The town hall: a bloc canvassed, or she stands for Reeve (townhall.ts). */
  hall?: { canvass?: Faction; stand?: boolean };
  /** A piece of the red book won, and how (act2.ts). */
  book?: { piece: PieceId; way: "trust" | "desire" | "coin" | "fists" };
}

export interface TownAction {
  id: string;
  label: string;
  hours: number;
  /** Gold it costs up front (the outcome can still earn). */
  cost?: number;
  /** Why she can't, or null if she can. */
  locked?: (s: TownState) => string | null;
  /** Left off the place's list altogether: it doesn't apply (a fight with a house she's beaten). */
  hidden?: (s: TownState) => boolean;
  run: (s: TownState, rng: () => number) => TownOutcome;
}

export interface TownPlace {
  id: TownPlaceId;
  title: string;
  /** What she sees walking in, by what the town knows (a line or two). */
  describe: (s: TownState) => string[];
  actions: readonly TownAction[];
}

const ARC_ORDER: readonly ArcStage[] = ["sheltered", "curious", "willing", "known", "legend"];
/** Known or past it: a Legend is Known underneath. */
const knownUp = (s: TownState) => s.arc === "known" || s.arc === "legend";
const atLeast = (stage: ArcStage, label: string) => (s: TownState) =>
  ARC_ORDER.indexOf(s.arc) >= ARC_ORDER.indexOf(stage) ? null : `needs ${label}`;
const notTooTired = (s: TownState) => (s.fatigueLevel >= 5 ? "too tired" : null);
const pick = <T>(list: readonly T[], rng: () => number): T => list[Math.floor(rng() * list.length) % list.length];
/** Lines by her stage; a Legend has her own where they're written, else the Known ones. */
type ArcLines = Record<Exclude<ArcStage, "legend">, readonly string[]> & { legend?: readonly string[] };
const byArc = (s: TownState, lines: ArcLines, rng: () => number) => pick(s.arc === "legend" ? (lines.legend ?? lines.known) : lines[s.arc], rng);

/**
 * Oden's route (TOWN_DAY.md step 4, STORY.md: Oden "loved Wren once, hides Silas's salt, saw the night she died"):
 * each talk with him moves it on a step, once that step's moment has come; until it has, he talks about the day.
 * The last step only hints at what he saw the night Wren died: he tells it at Act 2's midpoint (STORY.md, "The
 * nightshirt").
 */
interface OdenStep {
  /** Whether it's time for this one yet. */
  ready: (s: TownState) => boolean;
  line: (s: TownState) => string;
  effects?: Omit<TownOutcome, "line">;
}

export const ODEN_ROUTE: readonly OdenStep[] = [
  {
    ready: () => true,
    line: () => "Oden pours you weak tea. \"You've her chin, you know. Wren's. She sat on that same bench the week she came up the mountain, with one bag and a black eye she wouldn't explain.\"",
  },
  {
    ready: () => true,
    line: () =>
      "\"Your grandmother hung a red lantern in that window for twenty years,\" Oden says, \"and the whole valley pretended it was for travellers. The chapel brothers preached against her every midsummer. Then they came round the back door every winter.\" He sips his tea. \"She let them in. She wrote their names down, mind.\"",
  },
  {
    // The salt night has been played: what she did there decides what he says.
    ready: (s) => s.nights >= 1,
    line: (s) =>
      s.flags.has("silasOwes")
        ? "Oden doesn't look up from his candles. \"Pell came asking about my floor. Somebody sent him to the quarry instead.\" He sets a candle in front of you, already lit. \"Wren would've done the same. She'd have charged Silas for it, mind.\""
        : s.flags.has("silasAngry")
          ? "\"Silas tells me somebody sold what's under my floor,\" Oden says. \"The Baron hasn't come for it yet. That means whoever bought it is saving it.\" He looks at you a long time. He doesn't ask."
          : "Oden lowers his voice. \"You'll hear things in that bar. One of them will be about my floor. Silas keeps salt under it, and the salt feeds the valley in winter when the Baron's tolls don't.\" He doesn't ask you to keep quiet. He doesn't have to.",
    effects: { trust: 1 },
  },
  {
    ready: (s) => s.nights >= 3,
    line: () =>
      "Oden looks up at the Stone-Hearted's carving, its helmet shut. \"Forty years I've prayed to a god who keeps his visor down. The Warm House across the square gets answers in an afternoon.\" He laughs, not happily. \"Don't tell the Baron's chaplain I said that.\"",
  },
  {
    ready: (s) => s.nights >= 5,
    line: () =>
      "\"I asked your grandmother to marry me once,\" Oden says, out of nowhere. \"The spring the lantern went up. She laughed so hard she fell off this bench. Then she kissed me, said no, and stayed my friend for forty years.\" He's smiling. \"Best no I ever got.\"",
    effects: { kindness: 1 },
  },
  {
    // Late in Act 1 (Pell has named the real price): he almost tells her.
    ready: (s) => s.fans >= 250,
    line: () =>
      "Oden's hands stop on his beads. \"The night Wren died, I was up late with a sick lamb, and I saw something from the lane.\" He shakes his head. \"Not yet. When I'm braver. Or when you need it more than I need to keep quiet.\"",
  },
];

/** Oden's everyday talk, by her stage, once his route is done or while its next step waits. */
function odenEveryday(s: TownState, rng: () => number): string {
  return byArc(s, {
    sheltered: [
      "Oden pours you weak tea and talks about the roof. It leaks. It has leaked since Wren was your age.",
      "\"Your grandmother kept the best ale on the pass and the worst secrets,\" Oden says. \"I'll tell you about the ale.\"",
    ],
    curious: ["Oden notices you blush when a soldier passes the window. He pretends he didn't. \"Wren was shy too, once,\" he says. \"Once.\""],
    willing: ["Oden sighs into his tea. \"They're saying things about your tavern. The same things they said about hers.\" He doesn't say it's wrong. He just says it."],
    known: ["\"You don't need my blessing,\" Oden says. \"But you have it, for what it's worth. Wren had it too. Even with the lantern.\""],
    legend: ["Oden pours the tea and doesn't mention the song, though he clearly knows the second verse. \"Sit a while,\" he says. \"Quiet's good for a body. Even a famous one.\" It is, annoyingly."],
  }, rng);
}

/** Helping a recruit up the hill, or warning them off, at the Warm House door (recruits.ts): one of each per recruit. */
function recruitActions(): TownAction[] {
  return RECRUIT_IDS.flatMap((id): TownAction[] => {
    const r = RECRUITS[id];
    const committed = (s: TownState) => s.recruits[id].stage >= 3;
    return [
      {
        id: `help_${id}`,
        label: `Put in a word for ${r.name} with the priestesses`,
        hours: 0.5,
        hidden: committed,
        run: (s) => ({
          line:
            s.recruits[id].stage === 0
              ? `You tell a priestess about ${r.short}, ${r.who}, and how tight ${r.female ? "she" : "he"} looks. She writes the name down with a little smile. Tomorrow someone will knock.`
              : `You tell the priestesses ${r.short} is nearly ready. They thank you warmly, and a deacon presses a ribbon into your own hand, \"for later.\"`,
          ...HELP,
          recruit: { id, act: "help" },
        }),
      },
      {
        id: `warn_${id}`,
        label: `Warn ${r.name} off`,
        hours: 0.5,
        hidden: committed,
        run: (s) => ({
          line:
            s.recruits[id].stage === 0
              ? `You catch ${r.short} looking at the Warm House door and steer ${r.female ? "her" : "him"} off for a cider and a long talk. ${r.female ? "She" : "He"} laughs it off. ${r.female ? "She" : "He"} also walks home the long way.`
              : `You take ${r.short} aside at the Warm House door. \"You don't have to go back.\" ${r.female ? "She" : "He"} looks at the ribbon a long time, then puts it in a pocket. Oden will hear you did this.`,
          ...WARN,
          recruit: { id, act: "warn" },
        }),
      },
    ];
  });
}

/** What she sees of the recruits at the Warm House door: each as far up the hill as they've gone. */
function recruitsSeen(s: TownState): string[] {
  return RECRUIT_IDS.map((id) => RECRUITS[id].atDoor[s.recruits[id].stage]);
}

/** A line naming her rank on a career at its place, once she's joined it. */
function titleLine(s: TownState, id: CareerId, say: (title: string) => string): string[] {
  const title = careerTitle(id, s.careers[id], s.body !== "Male");
  return title ? [say(title)] : [];
}

/** The house directly above her on the Ledger that she hasn't beaten yet, or null when none is left. */
function nextRival(s: TownState) {
  return HOUSES.find((h) => !s.houses[h.id]) ?? null;
}

/**
 * The red book's piece held at a place (act2.ts): once she's heard of it, each way of winning it that fits its holder,
 * with what it still needs. Gone once she holds it.
 */
function bookActions(piece: PieceId): TownAction[] {
  const def = PIECES[piece];
  return def.ways.map((w): TownAction => ({
    id: `book_${piece}_${w.way}`,
    label: `The red book: ${w.label}`,
    hours: 1,
    cost: w.gold,
    hidden: (s) => s.book?.status[piece] !== "heard",
    locked: (s) => (s.book ? w.needs(s.book.facts) : "not yet"),
    run: () => ({
      line: `${w.line} (You have ${def.name}.)`,
      heat: w.heat,
      corruption: w.corruption,
      respect: w.respect,
      fatigue: w.fatigue,
      book: { piece, way: w.way },
    }),
  }));
}

/** A rival house's own actions shut once she's ruined it. */
function shutIfRuined(house: HouseId, actions: readonly TownAction[]): TownAction[] {
  return actions.map((action) => ({
    ...action,
    locked: (s) => (s.houses[house] === "ruin" ? "it's shut" : (action.locked?.(s) ?? null)),
    hidden: (s) => s.houses[house] === "ruin" || (action.hidden?.(s) ?? false),
  }));
}

export const TOWN_PLACES: Record<TownPlaceId, TownPlace> = {
  board: {
    id: "board",
    title: "The Notice Board",
    describe: () => [
      "LOST: one goat, answers to Gerald. WANTED: strong backs for the quarry. A poster for the Copper Bell's \"Two-for-One Thursdays\". Somebody has drawn something rude on the Baron's toll notice.",
      "Pinned among them, the day's work, for anyone with the hours.",
    ],
    actions: [
      {
        id: "gerald",
        label: "Find Gerald the goat",
        hours: 1,
        locked: notTooTired,
        run: (_s, rng) =>
          rng() < 0.6
            ? { line: pick(["Gerald is on the chapel roof. Nobody knows how. His owner pays you in coin and a long story.", "Gerald is in the Copper Bell's cellar, drunk. You bring him home. Four gold, and Jory owes you a cask."], rng), gold: 4, fatigue: 1 }
            : { line: "An hour of calling \"Gerald!\" round the back lanes. No Gerald. Several people now think Gerald is your boyfriend.", fatigue: 1, fame: 0 },
      },
      {
        id: "painter",
        label: "Sit for the painter in the lane",
        hours: 2,
        locked: atLeast("curious", "Curious"),
        run: (s, rng) => ({
          line: byArc(s, {
            sheltered: [""],
            curious: ["Two hours on a stool by the window while old Fennick paints you \"as the Spirit of the Pass.\" He keeps asking you to lower your neckline \"for the light.\" Ten gold, and a portrait he'll hang in the square."],
            willing: ["Fennick paints you on his couch, shoulders bare, two hours and a lot of \"hold that look.\" Ten gold. The portrait goes up in the square by dusk, and people stop to look."],
            known: ["Fennick barely needs you to sit any more; he knows every line of you. Ten gold, and his apprentices sell sketches of the painting on the feed."],
          }, rng),
          gold: 10,
          fame: 1,
          flirt: 1,
        }),
      },
      {
        id: "model",
        label: "Model nude for Fennick's \"serious art\" class",
        hours: 2,
        locked: atLeast("willing", "Willing"),
        run: (s, rng) => ({
          line: byArc(s, {
            sheltered: [""],
            curious: [""],
            willing: [
              "Two hours bare on a plinth while eight serious artists draw you very seriously. One of them is the blacksmith. He draws mostly your chest. Twenty gold.",
              "Fennick's class, nude, two hours. A student faints. Fennick calls it \"the highest compliment.\" Twenty gold.",
            ],
            known: ["Nude on the plinth again. The class is twice the size it was, and half of them can't draw. Twenty gold, and they'll all be at your bar tonight."],
            legend: ["The class chants your name as you climb on the plinth, and you strike a pose nobody asked for. Fennick weeps. Twenty gold, and a queue round the block for the next class."],
          }, rng),
          gold: 20,
          fame: 1,
          lust: 1,
          respect: -1,
          desire: 8,
          guests: knownUp(s) ? 2 : 0,
        }),
      },
      // ---- The rest of the day-job ladder (TOWN_DAY.md section 5, build step 7) ----
      {
        id: "sacks",
        label: "Carry flour sacks for the mill",
        hours: 2,
        locked: notTooTired,
        run: () => ({ line: "Two hours of flour sacks up the mill's ladder. You come down white to the eyebrows. Five gold, and the miller's boys stop calling you \"the new girl.\"", gold: 5, fatigue: 3, trust: 1 }),
      },
      {
        id: "rounds",
        label: "Run the Bakehouse's bread round",
        hours: 1,
        locked: notTooTired,
        run: () => ({ line: "Loaves to twenty doors. Every door wants to chat. Three gold, and twenty households now know where your tavern is.", gold: 3, fatigue: 1, fans: 1 }),
      },
      {
        id: "lunch",
        label: "Serve at a noble's lunch on the keep road",
        hours: 2,
        locked: atLeast("curious", "Curious"),
        run: (s, rng) => ({
          line: byArc(s, {
            sheltered: [""],
            curious: ["You pour wine for six nobles in a garden on the keep road. One keeps dropping his napkin so you'll bend for it. Twelve gold, and he'll be at your bar."],
            willing: ["You serve the nobles' lunch in a borrowed apron and very little else under it, by request. Twelve gold, and the host asks for you by name next time."],
            known: ["The nobles' lunch is mostly an excuse to look at you. You let them. Twelve gold, and three of them book a table tonight."],
          }, rng),
          gold: 12,
          flirt: 1,
          fame: 1,
          guests: knownUp(s) ? 2 : 1,
        }),
      },
      {
        id: "shift",
        label: "Work a shift behind a rival's bar",
        hours: 3,
        locked: (s) => atLeast("curious", "Curious")(s) ?? (nextRival(s) ? null : "no house left above you"),
        run: (s) => {
          const house = nextRival(s)!;
          return {
            line: `Three hours pulling pints at ${house.name} for ${house.boss}. Eight gold, sore feet, and you know exactly how they keep their regulars now: you've scouted it from the inside.`,
            gold: 8,
            fatigue: 2,
            flirt: 1,
            mark: `${RIVAL_PLANS[house.id].place}:scout_${house.id}`,
          };
        },
      },
      {
        id: "bath",
        label: "Attend at the bathhouse by the mill race",
        hours: 2,
        locked: atLeast("willing", "Willing"),
        run: (_s, rng) => ({
          line: pick(
            [
              "Two hours with a sponge and a lot of steam. The bathers are very clean by the end, and very grateful. Eighteen gold.",
              "The bathhouse wants an attendant \"with a friendly touch.\" You have one. Eighteen gold, and you leave pink from more than the steam.",
            ],
            rng,
          ),
          gold: 18,
          lust: 1,
          respect: -1,
          desire: 12,
          fatigue: 1,
        }),
      },
      {
        id: "escort",
        label: "Escort travellers down the pass (guild work)",
        hours: 3,
        locked: (s) => (s.guildRank ? notTooTired(s) : "a guild card"),
        run: () => ({ line: "Three merchants and a nervous mule down the pass road. A wolf thinks about it and changes its mind. Twenty gold, and the merchants promise to stop at yours on the way back.", gold: 20, fatigue: 3, guests: 1, fans: 1 }),
      },
      {
        id: "gate",
        label: "Hold the gate for the garrison (guild work)",
        hours: 2,
        locked: (s) => (s.knightRank ? notTooTired(s) : "a place in the garrison"),
        run: () => ({ line: "Two hours at the west gate with a spear and a list. You turn back one drunk and one goat. Ten gold, and Rhea's sergeant says you'll do.", gold: 10, fatigue: 2, heat: -1, respect: 1 }),
      },
      {
        id: "delivery",
        label: "A \"private delivery\" for a lonely customer",
        hours: 1,
        locked: atLeast("known", "Known"),
        run: (_s, rng) => ({
          line: pick(
            [
              "The note says \"one bottle of wine, delivered personally, take your time.\" You take your time. Twenty-five gold, and he signs the receipt with a shaky hand.",
              "A widow on the mill lane orders a basket of bread and asks you to stay for the afternoon. You stay for the afternoon. Twenty-five gold and a very satisfied review on the feed.",
            ],
            rng,
          ),
          gold: 25,
          lust: 1,
          respect: -1,
          desire: 15,
          fatigue: 2,
        }),
      },
    ],
  },

  chapel: {
    id: "chapel",
    title: "The Chapel",
    describe: (s) =>
      s.flags.has("odenShut")
        ? ["The chapel door is barred. A note in Oden's careful hand: \"Gone to my sister's. Pray at home.\" The candles inside have burned out."]
        : ["Cold stone and the smell of candles. A carving of the Stone-Hearted watches the door, his helmet shut. Brother Oden is somewhere at the back, pretending he didn't see you come in."],
    actions: [
      {
        id: "oden",
        label: "Talk to Brother Oden",
        hours: 0.5,
        locked: (s) => (s.flags.has("odenShut") ? "Oden's gone" : null),
        run: (s, rng) => {
          const respect = s.corruption < 40 ? 1 : 0;
          if (s.corruption >= 80) {
            return { line: "Oden listens, and doesn't look at you. \"Wren sold secrets too, you know. She never sold people.\" He goes back to his candles.", kindness: 1 };
          }
          const step = ODEN_ROUTE[s.done["oden:route"] ?? 0];
          if (step?.ready(s)) return { kindness: 1, respect, ...step.effects, line: step.line(s), mark: "oden:route" };
          return { line: odenEveryday(s, rng), kindness: 1, respect };
        },
      },
      {
        id: "candle",
        label: "Light a candle for Wren (1 gold)",
        hours: 0.25,
        cost: 1,
        locked: (s) => (s.flags.has("odenShut") ? "the chapel's shut" : null),
        run: () => ({ line: "You light a candle for Grandma and sit with it a while. The ache in your feet goes quiet for once.", fatigue: -3 }),
      },
      {
        id: "confess",
        label: "Confess to Oden",
        hours: 1,
        locked: (s) => (s.flags.has("odenShut") ? "Oden's gone" : s.corruption < 40 ? "nothing heavy enough yet" : null),
        run: () => ({
          line: "You tell Oden what you did. All of it. He doesn't forgive you; he says that isn't his to give. But he listens, and something sits lighter. By evening, half the square knows you were in the confession box a long time.",
          corruption: -5,
          respect: -1,
          heat: 1,
        }),
      },
      ...bookActions("cover"),
    ],
  },

  warmhouse: {
    id: "warmhouse",
    title: "The Warm House",
    describe: (s) => [
      "Red curtains, warm air, and the smell of scented oil. Veyra's priestesses move about in very little, and nobody seems to mind.",
      s.arc === "sheltered"
        ? "A priestess at the door smiles like she already knows exactly how tight you are, and offers you a ribbon."
        : "The priestess at the door greets you by name now, and doesn't bother offering the ribbon.",
      ...recruitsSeen(s),
      ...titleLine(s, "clergy", (t) => `You serve here as ${t} of Veyra. The priestesses kiss your cheek as you pass.`),
    ],
    actions: [
      {
        id: "ribbon",
        label: "Take a red ribbon and listen",
        hours: 0.5,
        run: (_s, rng) => ({
          line: pick(
            [
              "\"Veyra only asks what you need,\" the priestess says, tying the red ribbon at your wrist. \"And you need so much.\" You leave flushed, and not sure why.",
              "You sit at the back of a service. It's mostly breathing. It's very good breathing. You leave with a red ribbon and pink ears.",
            ],
            rng,
          ),
          lust: 1,
          desire: 5,
        }),
      },
      {
        id: "blessing",
        label: "A blessing of Veyra (2 gold)",
        hours: 1,
        cost: 2,
        locked: atLeast("curious", "Curious"),
        run: () => ({
          line: "Warm oil on your wrists and throat, a prayer whispered into your ear, and hands that know exactly where to stop. You walk out wanting the night to start now.",
          lust: 1,
          flirt: 1,
          desire: 15,
        }),
      },
      {
        id: "session",
        label: "Take a session with the priestesses",
        hours: 2,
        locked: atLeast("willing", "Willing"),
        run: (_s, rng) => ({
          line: pick(
            [
              "Two priestesses, a warm room and a long, slow afternoon. They send you home rosy, loose-limbed and humming, and the whole street can tell.",
              "The session runs long. You come out at the back door with your ribbon untied and your hair a mess, and a priestess presses a pamphlet into your hand: \"Next time, bring a friend.\"",
            ],
            rng,
          ),
          lust: 2,
          respect: -1,
          desire: 25,
          fatigue: 3,
        }),
      },
      ...recruitActions(),
      ...careerActions("clergy"),
    ],
  },

  copperbell: {
    id: "copperbell",
    title: "The Copper Bell",
    describe: (s) => [
      ruinedLine("copperBell", s) ??
        (s.houses.copperBell
          ? "The Copper Bell is quieter since you beat it. Jory Bell nods to you across the room, half friend, half rival, all business."
          : "The biggest tavern in Tarven, and it knows it. Jory Bell is polishing the same tankard he was polishing last week, and watching you count his customers."),
    ],
    actions: rivalActions("copperBell"),
  },

  bakehouse: {
    id: "bakehouse",
    title: "The Bakehouse",
    describe: (s) => [
      ruinedLine("bakehouse", s) ??
        "Warm bread, pies cooling on the sill and one long table full of gossip. Goodwife Tansy runs the ovens and knows everyone's business, including yours.",
    ],
    actions: shutIfRuined("bakehouse", [
      {
        id: "ovens",
        label: "Help Tansy at the ovens",
        hours: 2,
        locked: notTooTired,
        run: () => ({ line: "Two hot hours kneading dough. Tansy pays you in coin and a pie, and tells you three things about the Baron you didn't want to know.", gold: 4, fatigue: 2, kindness: 1 }),
      },
      {
        id: "pies",
        label: "Buy a tray of pies for the bar tonight (4 gold)",
        hours: 0.5,
        cost: 4,
        run: () => ({ line: "A tray of Tansy's pies on your bar tonight. Word gets round: the farmers will come for them.", guests: 1, fans: 1 }),
      },
      {
        id: "gossip",
        label: "Sit at the long table for the gossip",
        hours: 0.5,
        run: (s, rng) => ({
          line:
            s.flags.has("deniedLantern") && s.arc !== "sheltered"
              ? "Tansy watches you over her pie. \"Respectable house, you told me. Your grandmother told me that too, once.\" The table laughs. You don't."
              : byArc(s, {
                  sheltered: ["The table talks about the Baron's tolls, the price of salt, and you. Mostly about whether you'll last the winter."],
                  curious: ["\"Is it true a soldier kissed you behind the bar?\" the miller's wife asks. The whole table leans in. You go red. That's answer enough for them."],
                  willing: ["The gossip stops when you sit down, then starts again, louder, about you. Tansy refills your cup and winks."],
                  known: ["Half the long table has been to your tavern after dark. The other half wants to go. You leave with a dozen promises to visit tonight."],
                  legend: ["The long table stands up and sings the first verse when you sit down. Tansy conducts with a rolling pin. You take a bow and a pie."],
                }, rng),
          fame: knownUp(s) ? 1 : 0,
          fans: 1,
        }),
      },
      ...rivalActions("bakehouse"),
    ]),
  },

  ciderbarn: {
    id: "ciderbarn",
    title: "Hollin's Cider Barn",
    describe: (s) => [
      ruinedLine("cider", s) ??
        "Half the farmers in Tarven drink here on credit, sitting on hay bales. Hollin writes every cup in his little book, and the chickens wander in and out like paying customers.",
    ],
    actions: shutIfRuined("cider", [
      {
        id: "press",
        label: "Help press the apples",
        hours: 2,
        locked: notTooTired,
        run: () => ({ line: "Two hours on the press, sticky to the elbows. Hollin pays you and the farmers decide you're all right.", gold: 5, fatigue: 3, trust: 1 }),
      },
      {
        id: "cider",
        label: "Share a cider with the farmers (1 gold)",
        hours: 0.5,
        cost: 1,
        run: (s) => ({
          line:
            s.flags.has("maraArrested")
              ? "The farmers drink quietly. Nobody mentions Mara. Nobody has to."
              : "The farmers talk about the toll, the harvest and Mara's meetings in low voices. They don't stop talking when you sit down. That's something.",
          trust: s.flags.has("maraArrested") ? 0 : 1,
          kindness: 1,
        }),
      },
      ...rivalActions("cider"),
    ]),
  },

  garrison: {
    id: "garrison",
    title: "The Garrison Yard",
    describe: (s) => [
      "Soldiers drilling half-heartedly. Two of them are checking their phones under their helmets. Up on the keep's tower the relay stone glows: every message in town goes through it, and Pell reads them all.",
      ruinedLine("canteen", s) ??
        (s.houses.canteen
          ? "Sergeant Pike's Watch Canteen is round the side of the yard, and his lads wave you over."
          : "Round the side of the yard, Sergeant Pike's Watch Canteen: the garrison's own drinking room, and a rival of yours on the Ledger."),
    ],
    actions: [
      {
        id: "spar",
        label: "Spar with the soldiers",
        hours: 1.5,
        locked: notTooTired,
        run: (s, rng) => ({
          line: byArc(s, {
            sheltered: ["You spar with a bored recruit and put him on his back. The yard cheers. Sergeant Pike says you've Wren's elbow. He doesn't explain."],
            curious: ["You spar and win, and the soldier you pinned asks for a rematch. Then a second rematch. He isn't trying very hard to win."],
            willing: ["The yard stops drilling to watch you spar. Every hold turns into something closer. You win, eventually, flushed, and the soldiers book a table for tonight."],
            known: ["Sparring with you has become the garrison's favourite exercise. Pike has started a waiting list. Half of it will be at your bar tonight."],
            legend: ["The whole yard chants your name while you spar. You pin three recruits at once and they thank you. Pike has stopped pretending it's training."],
          }, rng),
          fatigue: 4,
          respect: 1,
          guests: s.arc === "willing" || knownUp(s) ? 2 : 1,
        }),
      },
      {
        id: "laundry",
        label: "Wash the garrison's laundry",
        hours: 2,
        locked: notTooTired,
        run: () => ({ line: "Two hours of soldiers' shirts in a tub. You find a love letter, three dice and a sock that should be burned. Five gold.", gold: 5, fatigue: 2 }),
      },
      {
        id: "rhea",
        label: "Drink with Captain Rhea off duty (2 gold)",
        hours: 1,
        cost: 2,
        run: (s) => ({
          line: s.flags.has("rheaDoubts")
            ? "Rhea drinks like someone with a lot on her mind. \"The silver,\" she says, and stops. \"Never mind. Your round.\" She tells her patrols to leave your street alone."
            : "Rhea is better company off duty: dry, funny, and very good at cards. She takes your money and tells her patrols to leave your street alone.",
          heat: -1,
          trust: s.flags.has("rheaDoubts") ? 1 : 0,
        }),
      },
      ...rivalActions("canteen"),
    ],
  },

  fields: {
    id: "fields",
    title: "Mara's Fields",
    describe: (s) =>
      s.flags.has("maraArrested")
        ? ["Mara's fields, half harvested. Her neighbours are bringing in what they can. Nobody says her name above a whisper."]
        : ["Out past the gate, long grass and golden fields under the mountain. Mara Holt is in the middle of them with a scythe, and doesn't stop when she sees you."],
    actions: [
      {
        id: "harvest",
        label: "Help with the harvest",
        hours: 2,
        locked: notTooTired,
        run: (s) => ({
          line: s.flags.has("maraArrested")
            ? "You work Mara's rows with her neighbours. Nobody thanks you out loud. They remember."
            : "Two hours in the fields beside Mara. She doesn't say much. At the end she hands you a sack of apples and says, \"Wren used to help too.\"",
          gold: 3,
          fatigue: 3,
          kindness: 1,
          trust: 1,
        }),
      },
      {
        id: "mara",
        label: "Talk with Mara",
        hours: 0.5,
        locked: (s) => (s.flags.has("maraArrested") ? "Mara's been taken" : null),
        run: (s, rng) => ({
          line: byArc(s, {
            sheltered: ["\"My husband ran errands for your grandmother's house,\" Mara says, leaning on her scythe. \"I know what it was. I'll make up my own mind about you.\""],
            curious: ["\"You went red as a beet when that soldier took your hand,\" Mara says. \"I liked you for it.\" She almost smiles."],
            willing: ["\"You've changed,\" Mara says. \"Wren changed too, they say. She was still kind.\" She watches you to see if you are."],
            known: ["Mara looks you over, all of you. \"The whole pass knows your name now. Use it for something.\" Then she tells you about the meeting."],
          }, rng),
          trust: 1,
        }),
      },
      ...bookActions("silver"),
    ],
  },

  tollgate: {
    id: "tollgate",
    title: "The Toll-Gate Inn",
    describe: (s) => [
      ruinedLine("tollgate", s) ??
        (s.houses.tollgate
          ? "The Toll-Gate Inn leans against the west gate, all clean sheets and lace. Agnes Crale lifts her pen from the register when you come in, and puts it down again."
          : "The Toll-Gate Inn leans against the west gate, all clean sheets and lace. Agnes Crale sits by the door with a register, and writes down everyone who comes in. Everyone."),
    ],
    actions: rivalActions("tollgate"),
  },

  townhall: {
    id: "townhall",
    title: "The Market Cross",
    describe: (s) => {
      const hall = s.hall;
      const lines = ["Tarven's council meets on the market cross's steps, as it has since before the Baron: six old men, two old women and a dog that votes with whoever feeds it."];
      if (!hall?.seat) lines.push("You've no seat on it. The first house in Tarven gets one; you're not that yet.");
      else if (hall.reeve) lines.push("The Reeve's chair at the top of the steps is yours. The Law board hangs on the cross behind it.");
      else {
        lines.push(`You've a seat on the steps now, First in Tarven. The town's vote stands at ${Math.round(hall.vote * 100)}% for you.`);
        lines.push(hall.missing.length ? `To take the Reeve's chain you still need ${hall.missing.join(" and ")}.` : "The chain is yours for the asking: over half the town would vote for you.");
      }
      return lines;
    },
    actions: [
      ...FACTIONS.map(
        (f): TownAction => ({
          id: `canvass_${f}`,
          label: CANVASS[f].label,
          hours: CANVASS[f].hours,
          cost: CANVASS[f].cost,
          hidden: (s) => !s.hall?.seat,
          locked: (s) => ((s.hall?.campaign[f] ?? 0) >= CANVASS_MOST ? "they've heard all you have to say" : null),
          run: () => ({ line: CANVASS[f].line, hall: { canvass: f } }),
        }),
      ),
      {
        id: "stand",
        label: "Stand for Reeve",
        hours: 1,
        hidden: (s) => !s.hall?.seat || s.hall.reeve,
        locked: (s) => (s.hall?.missing.length ? `needs ${s.hall.missing.join(", ")}` : null),
        run: () => ({
          line: "The town gathers round the cross. Hands go up, more than half of them, and the dog barks once. The old Reeve takes off his chain and hangs it round your neck. Reeve of Tarven.",
          fame: 3,
          respect: 1,
          hall: { stand: true },
        }),
      },
    ],
  },

  quarry: {
    id: "quarry",
    title: "The Quarry Road",
    describe: (s) => [
      "The road climbs east toward the quarry and the high pass: stone dust, shouting, and men who don't ask questions. Up there the phones go quiet, which is exactly why Silas's crew likes it.",
      ...titleLine(s, "smuggler", (t) => `Silas's crew nod to you on the road: their ${t}.`),
    ],
    actions: [
      {
        id: "haul",
        label: "Haul stone at the quarry",
        hours: 2,
        locked: notTooTired,
        run: (_s, rng) => ({
          line: pick(
            [
              "Two hours hauling stone with the quarrymen. They bet you'd quit in ten minutes. You win six gold and their respect.",
              "Stone dust in your hair and a blister on each hand. Six gold, and the quarrymen promise to drink at yours tonight.",
            ],
            rng,
          ),
          gold: 6,
          fatigue: 4,
          guests: 1,
        }),
      },
      {
        id: "crate",
        label: "Carry a crate for Silas's crew, and ask nothing",
        hours: 1,
        locked: (s) => (s.flags.has("silasAngry") ? "Silas won't deal with you" : null),
        run: () => ({
          line: "A heavy crate, a back lane, and a man at the other end who doesn't look at your face. Fifteen gold. The garrison will wonder where it went.",
          gold: 15,
          heat: 2,
          corruption: 3,
        }),
      },
      ...careerActions("smuggler"),
      ...bookActions("routes"),
    ],
  },
};

export function isTownPlace(id: string): id is TownPlaceId {
  return id in TOWN_PLACES;
}

/** Why she can't do this now, or null: locked, already done today, can't afford it, or no time left. */
export function blockedReason(action: TownAction, s: TownState, gold: number, doneToday: boolean, hoursLeft: number): string | null {
  if (doneToday) return "done today";
  const why = action.locked?.(s) ?? null;
  if (why) return why;
  if ((action.cost ?? 0) > gold) return "not enough gold";
  if (hoursLeft <= 0) return "it's past five";
  return null;
}

/** How an action's cost and time read on its button: "2 hours", "half an hour, 2 gold". */
export function costLabel(action: TownAction): string {
  const h = action.hours;
  const time = h === 0.25 ? "a quarter of an hour" : h === 0.5 ? "half an hour" : h === 1 ? "an hour" : h === 1.5 ? "an hour and a half" : `${h} hours`;
  return time;
}
