/**
 * The Warm House's first recruits (TOWN_DAY.md build step 6, CHURCH_RECRUITMENT.md, CHURCH_CONCEPT.md section 6):
 * three named townspeople, one for each of Tarven's common kinds of frustration, each walked up the hill by the
 * Church of Veyra, one stage at a time:
 *
 * - **0. Untouched:** a normal guest who complains about their sex life over ale.
 * - **1. First visit:** talk only, a small red ribbon. Curious about it at the bar.
 * - **2. Opening:** a looser outfit, open talk, higher lust. They tip more and stay longer.
 * - **3. Committed:** the full outfit, out in town by day, a toy kept in. Crude, open speech, and a recruit line in
 *   her direction. They don't come back down.
 *
 * A recruit goes up the hill on some days, more often the further along they are; VISITS_PER_STAGE visits make a
 * stage. She can **help** (put in a word: they go tomorrow, and it counts double; Lust and Fame up, Respect down),
 * **warn them off** (Respect and Kindness up; they mostly stay away until someone sends them back), or leave it.
 * With Oden's chapel shut, Veyra moves into the empty faith and every visit counts double (CHURCH_CONCEPT.md).
 * Every stage change is a story card in the church's voice (CORRUPTION_TROPES.md: brainwashing and rationalisation,
 * through the five beats), and the town's gossip.
 *
 * Every recruit is an adult, with their age stated, and chooses each stage; anyone at stage 1 or 2 can walk away. The
 * heroine's own consent rule (GAME_PATH.MD) isn't touched: she only helps or warns. Pure rules and words.
 */
import type { GuestKind } from "./tavern";
import type { FallBeat, StageCard, TropeId } from "./tropes";

export type RecruitId = "hedda" | "tobin" | "ilse";
export const RECRUIT_IDS: readonly RecruitId[] = ["hedda", "tobin", "ilse"];
export type RecruitStage = 0 | 1 | 2 | 3;

/** What one of the guest bodies wears at a stage: an outfit (appearance.ts) and its colours. */
export interface RecruitOutfit {
  id: string;
  colors: Record<string, string>;
}

export interface RecruitDef {
  id: RecruitId;
  name: string;
  /** What the town calls them. */
  short: string;
  /** Always an adult, and said so. */
  age: number;
  /** Which of CHURCH_RECRUITMENT.md's target types. */
  type: string;
  /** Who they are in Tarven, in a few words. */
  who: string;
  kind: GuestKind;
  female: boolean;
  /** Their own face, hair and skin (a guest look seed): the same person every time. */
  look: number;
  /** What they wear at each stage. */
  outfits: readonly [RecruitOutfit, RecruitOutfit, RecruitOutfit, RecruitOutfit];
  /** What she sees and hears of them at her bar, at each stage. */
  atBar: readonly [string, string, string, string];
  /** How they look at the Warm House door, at each stage. */
  atDoor: readonly [string, string, string, string];
  /** The stage cards: 0 to 1, 1 to 2, 2 to 3. */
  cards: readonly [RecruitCard, RecruitCard, RecruitCard];
  /** What the town says the morning after each step. */
  gossip: readonly [string, string, string];
}

type RecruitCard = Omit<StageCard, "id" | "who"> & { trope: TropeId; beat: FallBeat };

/** Veyra's red, for the stand-in church colours on the bodies with no church outfit yet. */
const VEYRA_RED = "#b8324a";

export const RECRUITS: Readonly<Record<RecruitId, RecruitDef>> = {
  hedda: {
    id: "hedda",
    name: "Hedda Cooper",
    short: "Hedda",
    age: 34,
    type: "frustrated wife",
    who: "the cooper's wife",
    kind: "farmer",
    female: true,
    look: 4711,
    outfits: [
      { id: "casual", colors: { knit: "#8a7a5a", denim: "#3a3a4a" } },
      { id: "casual", colors: { knit: "#8a7a5a", denim: "#3a3a4a" } },
      // The plunge dress, not the halter: the halter's cloth is built near-black and won't take a bright red.
      { id: "plunge", colors: { dress: VEYRA_RED } },
      { id: "priestess", colors: {} },
    ],
    atBar: [
      "Hedda Cooper (34), the cooper's wife, is in for a cider and a moan. \"Twelve years married. He touches his barrels more than me. At least the barrels get oiled.\"",
      "Hedda Cooper is in, a small red ribbon tied at her wrist. She keeps turning it. \"Have you been up to the Warm House? Just to talk, I mean. They only talked.\"",
      "Hedda Cooper is in, in a red plunge dress the cooper has definitely never seen. She tips double and says \"cock\" out loud, twice, to see what it feels like.",
      "Hedda Cooper sweeps in in Veyra's robes, very little of them, and sits like she's got something inside her. She has. \"Keeper. You look tight. I know a goddess.\"",
    ],
    atDoor: [
      "Hedda Cooper walks past the Warm House twice a day and never looks at the door. She looks at the door.",
      "Hedda Cooper hovers at the Warm House door with her ribbon on, pretending to read the notice by it.",
      "Hedda Cooper goes in at the Warm House door like a regular, in a dress the market's still talking about.",
      "Hedda Cooper holds the Warm House door for newcomers now, in Veyra's robes, and smiles at the nervous ones.",
    ],
    cards: [
      {
        title: "Hedda's first visit",
        trope: "rationalisation",
        beat: "setup",
        lines: [
          "Hedda Cooper went up the hill yesterday. \"Just to talk.\"",
          "The priestess asked where it hurt. Hedda told her: twelve years, and he looks at her like a barrel he's already sealed. \"Your husband doesn't have to know,\" the priestess said. \"Veyra only asks what you need.\"",
          "She came home with a red ribbon and didn't tell him what it was for.",
        ],
      },
      {
        title: "Hedda, opening",
        trope: "brainwashing",
        beat: "erosion",
        lines: [
          "Third visit. This time the priestess's hands didn't stop at talking, and Hedda didn't ask them to.",
          "A deacon showed her the robes the priestesses wear. \"This is what it looks like when someone stops holding back.\" Hedda went home and took the hem up on her best dress. Then up again.",
        ],
      },
      {
        title: "Hedda, committed",
        trope: "brainwashing",
        also: "rationalisation",
        beat: "break",
        lines: [
          "Hedda Cooper took the robes. And the toy, the one they keep in so the tightness never comes back.",
          "\"I never did this before I came here,\" she says to anyone who'll listen. She says it like a hymn.",
          "The cooper has started drinking at your bar. He doesn't say why. Everyone knows why.",
        ],
      },
    ],
    gossip: [
      "\"Hedda Cooper was seen coming down from the Warm House with a red ribbon on. Her! Hedda!\"",
      "\"Did you see what the cooper's wife wore to market? I could see her opinions.\"",
      "\"Hedda Cooper's taken Veyra's robes. The cooper's taken up whittling. Very fast whittling.\"",
    ],
  },
  tobin: {
    id: "tobin",
    name: "Tobin Marsh",
    short: "Tobin",
    age: 41,
    type: "lonely single",
    who: "the miller's clerk",
    kind: "farmer",
    female: false,
    look: 9133,
    outfits: [
      { id: "hoodie", colors: { knit: "#5a5f66", denim: "#2b2b30" } },
      { id: "hoodie", colors: { knit: "#5a5f66", denim: "#2b2b30" } },
      { id: "casual", colors: { knit: VEYRA_RED, denim: "#2f4f7f" } },
      // A stand-in until the men's church outfit is modelled (CHURCH_CONCEPT.md section 5): Veyra's red, bare arms.
      { id: "sporty", colors: { knit: VEYRA_RED, denim: VEYRA_RED } },
    ],
    atBar: [
      "Tobin Marsh (41), the miller's clerk, sits alone with a small ale and counts the knots in the table. \"Seven years since anyone touched me on purpose. I counted that too.\"",
      "Tobin Marsh is in with a red ribbon round his wrist and a look of a man who's been listened to. \"They didn't laugh,\" he tells you. \"Nobody laughed.\"",
      "Tobin Marsh is in a red tee a size too tight, telling the next table exactly what a priestess did with her mouth. He tips like a lord.",
      "Tobin Marsh comes in bare-armed in Veyra's red, sits wide and calm. \"Keeper. Seven years I waited. Don't wait seven years.\" He leaves a red ribbon by your till.",
    ],
    atDoor: [
      "Tobin Marsh walks the long way round the square so he doesn't pass the Warm House. Then he passes it.",
      "Tobin Marsh waits by the Warm House door with his ribbon on, early for an appointment he swears he hasn't got.",
      "Tobin Marsh goes in at the Warm House door whistling. He used to apologise to doors.",
      "Tobin Marsh greets the newcomers at the Warm House door in Veyra's red, a hand on each shoulder.",
    ],
    cards: [
      {
        title: "Tobin's first visit",
        trope: "rationalisation",
        beat: "setup",
        lines: [
          "Tobin Marsh went up the hill. He told the priest he'd come about the roof.",
          "\"You don't need a partner,\" the priest said, once Tobin stopped talking about the roof. \"The church already has people ready.\" Tobin cried a bit. They gave him tea and a ribbon.",
        ],
      },
      {
        title: "Tobin, opening",
        trope: "conditioning",
        also: "brainwashing",
        beat: "erosion",
        lines: [
          "Tobin's third visit. A priestess and a small toy, and a priest talking him through it like a sermon.",
          "\"Say it out loud,\" they told him. \"Say what feels good.\" Tobin, who has never said anything out loud in his life, said a great deal.",
        ],
      },
      {
        title: "Tobin, committed",
        trope: "brainwashing",
        beat: "break",
        lines: [
          "Tobin Marsh has taken Veyra's red. And the toy, kept in, so he's never empty again.",
          "He walked the length of the Warm House's hall so the visitors could see him. Seven years of nobody looking, and now everybody does.",
          "The miller says his clerk's handwriting has never been better. Nobody knows what to do with that.",
        ],
      },
    ],
    gossip: [
      "\"Tobin Marsh! At the Warm House! I thought he was a coat stand someone had left out.\"",
      "\"The miller's clerk winked at me. Tobin. Winked. I had to sit down.\"",
      "\"Tobin Marsh is in Veyra's red now, and he's the happiest man in Tarven. It's unsettling.\"",
    ],
  },
  ilse: {
    id: "ilse",
    name: "Ilse Brandt",
    short: "Corporal Brandt",
    age: 27,
    type: "overworked soldier",
    who: "a garrison corporal",
    kind: "soldier",
    female: true,
    look: 2207,
    outfits: [
      { id: "hoodie", colors: { knit: "#4a5a3a", denim: "#2b2b2b" } },
      { id: "hoodie", colors: { knit: "#4a5a3a", denim: "#2b2b2b" } },
      { id: "sporty", colors: { knit: VEYRA_RED, denim: "#1c1c22" } },
      { id: "babydoll", colors: { straps: VEYRA_RED, skirt: VEYRA_RED, trim: "#1c1c22" } },
    ],
    atBar: [
      "Corporal Ilse Brandt (27) falls into a chair, still in her drill boots. \"Double watch, the Baron's tolls, and Pike shouting. I can't remember the last time anything felt good.\"",
      "Corporal Brandt is in, a red ribbon knotted round her sword hand. \"One session,\" she says, \"and the knot in my back's gone. Gone! Pike thinks I'm on something.\"",
      "Corporal Brandt is in, off duty in a red crop top, laughing with her whole chest. She tips double, stays till close, and arm-wrestles anyone who looks at her.",
      "Corporal Brandt walks in in Veyra's red babydoll and drill boots, salutes you, and sits very carefully. \"Keeper. You carry your shoulders like I used to. Come up the hill.\"",
    ],
    atDoor: [
      "Corporal Brandt jogs past the Warm House on patrol, eyes front, every day.",
      "Corporal Brandt stands by the Warm House door at parade rest, ribbon on, waiting for her slot.",
      "Corporal Brandt goes in at the Warm House door at a march, already undoing her collar.",
      "Corporal Brandt stands guard at the Warm House door in Veyra's red. Nobody gets past without being welcomed.",
    ],
    cards: [
      {
        title: "The corporal's first visit",
        trope: "rationalisation",
        beat: "setup",
        lines: [
          "Corporal Ilse Brandt went up the hill on her afternoon off. \"For my back,\" she says.",
          "\"One session and the tightness leaves,\" the priestess told her. \"You can come back whenever the stress returns.\" The stress returned that evening, at drill.",
        ],
      },
      {
        title: "The corporal, opening",
        trope: "conditioning",
        beat: "erosion",
        lines: [
          "Ilse's been back three times. Every time Pike shouts, she thinks about the Warm House. Every time she thinks about the Warm House, she stops minding Pike.",
          "They gave her something lighter to change into. She wore it home under her coat.",
        ],
      },
      {
        title: "The corporal, committed",
        trope: "brainwashing",
        also: "conditioning",
        beat: "break",
        lines: [
          "Corporal Brandt has taken Veyra's red, and the toy. Kept in on duty too. Her marksmanship has never been better.",
          "\"Please use me,\" she practises, at attention, with perfect diction. The Warm House is very proud.",
          "Captain Rhea has asked, carefully, whether this is a uniform issue. Nobody's answered her.",
        ],
      },
    ],
    gossip: [
      "\"Ilse Brandt from the garrison, at the Warm House! For her back, she says. Her back!\"",
      "\"The corporal was laughing on duty. Laughing! Pike nearly fainted.\"",
      "\"Corporal Brandt's in Veyra's red now. The patrol's never been so popular.\"",
    ],
  },
};

// ---- State ----

export interface RecruitState {
  stage: RecruitStage;
  /** Visits since their last stage. */
  visits: number;
  /** She warned them off: they mostly stay away until someone sends them back. */
  warned: boolean;
  /** She put in a word today: they go tomorrow, and it counts double. */
  nudged: boolean;
  /** How often she's helped, and warned. */
  helped: number;
  warnings: number;
}

export function newRecruit(): RecruitState {
  return { stage: 0, visits: 0, warned: false, nudged: false, helped: 0, warnings: 0 };
}

export function newRecruits(): Record<RecruitId, RecruitState> {
  return { hedda: newRecruit(), tobin: newRecruit(), ilse: newRecruit() };
}

/** Visits that make a stage. */
export const VISITS_PER_STAGE = 3;
/** The chance a recruit goes up the hill on a day, by their stage (0 to 2). */
export const VISIT_CHANCE: readonly [number, number, number] = [0.3, 0.45, 0.6];
/** Warned off, they go this much less often. */
export const WARNED_FACTOR = 0.2;
/** A committed recruit she helped up the hill brings her this many fans (the Her tag, CHURCH_CONCEPT.md). */
export const DEVOTEE_FANS = 5;

/** Who stands where now: what changes when she helps, and what she gets for it. */
export const HELP = { lust: 1, fame: 1, respect: -1, desire: 5 } as const;
export const WARN = { respect: 1, kindness: 1 } as const;

/** One day for a recruit: whether they went up the hill, and whether it took them a stage further. */
export function churchDay(state: RecruitState, roll: number, chapelShut: boolean): { state: RecruitState; stepped: boolean } {
  if (state.stage >= 3) return { state: { ...state, nudged: false }, stepped: false };
  const chance = state.nudged ? 1 : VISIT_CHANCE[state.stage as 0 | 1 | 2] * (state.warned ? WARNED_FACTOR : 1);
  if (roll >= chance) return { state: { ...state, nudged: false }, stepped: false };
  const visits = state.visits + (state.nudged ? 2 : 1) * (chapelShut ? 2 : 1);
  if (visits < VISITS_PER_STAGE) return { state: { ...state, visits, nudged: false }, stepped: false };
  return { state: { ...state, stage: (state.stage + 1) as RecruitStage, visits: 0, nudged: false }, stepped: true };
}

/** She puts in a word for them: they go tomorrow, and the warning's forgotten. Not once they're committed. */
export function helpRecruit(state: RecruitState): RecruitState | null {
  if (state.stage >= 3) return null;
  return { ...state, nudged: true, warned: false, helped: state.helped + 1 };
}

/** She warns them off: they mostly stay away, and the visits they'd made count for nothing. Not once committed. */
export function warnRecruit(state: RecruitState): RecruitState | null {
  if (state.stage >= 3) return null;
  return { ...state, warned: true, nudged: false, visits: 0, warnings: state.warnings + 1 };
}

/** A recruit's stage card for the dawn report, filled. */
export function recruitCard(def: RecruitDef, stage: 1 | 2 | 3): StageCard {
  const card = def.cards[stage - 1];
  return { ...card, id: `recruit.${def.id}.${stage}`, who: "the church" };
}

/** The chance a recruit comes in to her bar on a night, by stage: the further along, the thirstier. */
export const BAR_CHANCE: readonly [number, number, number, number] = [0.25, 0.35, 0.45, 0.5];

/** Read from a save, or fresh. */
export function readRecruits(raw: unknown): Record<RecruitId, RecruitState> {
  const out = newRecruits();
  if (!raw || typeof raw !== "object") return out;
  for (const id of RECRUIT_IDS) {
    const r = (raw as Record<string, unknown>)[id];
    if (!r || typeof r !== "object") continue;
    const src = r as Record<string, unknown>;
    const n = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);
    out[id] = {
      stage: n(src.stage, 3) as RecruitStage,
      visits: n(src.visits, VISITS_PER_STAGE),
      warned: src.warned === true,
      nudged: src.nudged === true,
      helped: n(src.helped, 1000),
      warnings: n(src.warnings, 1000),
    };
  }
  return out;
}
