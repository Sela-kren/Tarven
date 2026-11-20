/**
 * Tarven's town hall (TOWN_DAY.md section 6.2, build step 8): the council, the town's vote, the Reeve's chain and
 * the Law board, and what the laws do to the town.
 *
 * - **The council seat** comes with being First in Tarven (the Copper Bell beaten, the end of Chapter 1). The council
 *   meets on the market cross's steps, as it always has.
 * - **The vote:** each of the town's blocs (knight.ts `TOWN_BLOCS`: farmers, merchants, soldiers, devotees, nobles
 *   and Oden's faithful) has a mood toward her, from what she's done (`factionMoods`), what she's canvassed by day,
 *   and the laws she's passed. Over half the town's vote, with her seat, and the chain is hers: she needn't be a
 *   knight (a Commander's rank still counts for a tenth). The Baron's fall, the other road in, is Act 3's.
 * - **The laws** (knight.ts `LAWS`, put to the council as before) now change the town (`lawEffects`): the ale tax and
 *   the curfew move her nightly takings, the brothel law what the lit Lantern brings, the dress code what being seen
 *   costs her, Veyra as the state faith speeds the Warm House's recruits, and Free use and Public affection change
 *   how the street treats her, exactly as TOWN_DAY.md 6.3 says (confirmed by the user, 2026-11-20): with Consent On
 *   she's asked, everywhere, and her no still counts (it costs her with the devotees); with Consent Off, hands land
 *   unasked in the street, as in a brawl. Never while she's passed out, and the Baron is never a client.
 *
 * Pure rules: the tavern keeps `PoliticsState` and applies what comes out.
 */
import { BARON_LAWS, LAWS, TOWN_BLOCS, townVoteShare, type Faction, type KnightRank, type LawBoard, type LawId, type LawLevel } from "./knight";

export const FACTIONS = Object.keys(TOWN_BLOCS) as Faction[];

export interface PoliticsState {
  reeve: boolean;
  laws: LawBoard;
  /** What her canvassing has won each bloc, and what her laws have done to them. */
  campaign: Partial<Record<Faction, number>>;
  lawShift: Partial<Record<Faction, number>>;
}

export function newPolitics(): PoliticsState {
  return { reeve: false, laws: { ...BARON_LAWS }, campaign: {}, lawShift: {} };
}

/** What the blocs read off the rest of the game. */
export interface HallFacts {
  /** The village's trust (0 to 15ish), her Respect (-10 to 10), Fame (0 to 100), corruption, fans. */
  trust: number;
  respect: number;
  fame: number;
  corruption: number;
  fans: number;
  knightRank: KnightRank | null;
  /** -1 until she's joined the clergy (careers.ts). */
  clergyRank: number;
  /** Recruits she's helped up the hill, and warned off (recruits.ts). */
  helped: number;
  warned: number;
  /** Ledger houses she's partnered and ruined, and the farmers' and the garrison's own. */
  partners: number;
  ruins: number;
  ciderPartner: boolean;
  ciderRuined: boolean;
  canteenPartner: boolean;
  canteenRuined: boolean;
  /** Story: Oden's chapel shut, Mara taken, how far Oden's route has gone. */
  odenShut: boolean;
  maraArrested: boolean;
  odenRoute: number;
  lanternLit: boolean;
  /** First in Tarven: the council seat. */
  seat: boolean;
  /** The Baron has fallen (Act 3: the book went to the crown's auditor): the town picks its own Reeve. */
  baronFallen?: boolean;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const RANK_WEIGHT: Readonly<Record<KnightRank, number>> = { volunteer: 1, squire: 2, knight: 3, captain: 4, commander: 5 };

/** Each bloc's mood toward her, -100 to 100: what she's done, plus her canvassing and her laws. */
export function factionMoods(f: HallFacts, p: PoliticsState): Record<Faction, number> {
  const base: Record<Faction, number> = {
    farmers: f.trust * 4 + (f.ciderPartner ? 10 : 0) - (f.ciderRuined ? 15 : 0) - (f.maraArrested ? 20 : 0),
    merchants: Math.min(30, f.fans / 15) + f.partners * 5 - f.ruins * 8,
    soldiers: (f.knightRank ? RANK_WEIGHT[f.knightRank] * 8 : 0) + (f.canteenPartner ? 10 : 0) - (f.canteenRuined ? 10 : 0),
    devotees: (f.clergyRank + 1) * 8 + f.helped * 6 - f.warned * 6 + (f.lanternLit ? 5 : 0),
    nobles: f.respect * 3 + f.fame / 4 - (f.corruption >= 80 ? 10 : 0),
    oden: f.odenRoute * 5 + f.respect * 2 - f.corruption / 10 - (f.odenShut ? 40 : 0) - Math.max(0, f.clergyRank) * 5,
  };
  const out = {} as Record<Faction, number>;
  for (const id of FACTIONS) out[id] = clamp(Math.round(base[id] + (p.campaign[id] ?? 0) + (p.lawShift[id] ?? 0)), -100, 100);
  return out;
}

/** Her share of the town's vote, 0 to 1 (knight.ts `townVoteShare`: each bloc by its size and mood). */
export function voteShare(f: HallFacts, p: PoliticsState): number {
  return townVoteShare(factionMoods(f, p), f.knightRank ?? undefined);
}

/** What she still lacks to take the Reeve's chain, [] when she can stand. */
export function reeveMissing(f: HallFacts, p: PoliticsState): string[] {
  if (p.reeve) return [];
  const missing: string[] = [];
  if (!f.seat) missing.push("a council seat (First in Tarven)");
  // With the Baron fallen, the town picks its own Reeve: the one who brought him down, with a seat.
  if (f.baronFallen) return missing;
  const share = voteShare(f, p);
  if (share <= 0.5) missing.push(`over half the town's vote (${Math.round(share * 100)}%)`);
  return missing;
}

/** The council's support for her laws, 0 to 100: her share of the vote, and her Respect. */
export function councilSupport(f: HallFacts, p: PoliticsState): number {
  return clamp(Math.round(voteShare(f, p) * 100 + f.respect * 2), 0, 100);
}

// ---- Canvassing ----

/** What a day's canvassing wins a bloc, and the most it can ever win. */
export const CANVASS_GAIN = 8;
export const CANVASS_MOST = 40;

export const CANVASS: Readonly<Record<Faction, { label: string; cost: number; hours: number; line: string }>> = {
  farmers: { label: "Stand the farmers a round at the Cider Barn (5 gold)", cost: 5, hours: 1, line: "A round for the farmers and an hour listening about the toll. They don't say they'll vote for you. They don't say they won't." },
  merchants: { label: "Shake hands down the market stalls", cost: 0, hours: 1, line: "Every stall, every hand, every complaint about the Baron's weights. The fishmonger's grip lingers. So does the smell." },
  soldiers: { label: "Drink with the garrison off duty (3 gold)", cost: 3, hours: 1, line: "A round at the drill yard. You laugh at their jokes and lose at their dice on purpose. Twice." },
  devotees: { label: "Speak at the Warm House's evening service", cost: 0, hours: 1, line: "You speak at the Warm House about what Tarven needs. They hear \"what you need.\" They're very supportive. Very, very supportive." },
  nobles: { label: "Dine with the nobles on the keep road (10 gold)", cost: 10, hours: 2, line: "Seven courses and a lot of talk about \"the right sort of Reeve.\" You're the right sort, by the pudding." },
  oden: { label: "Sit with Oden's faithful after the chapel service", cost: 0, hours: 1, line: "You sit through Oden's service and stay for the weak tea after. The old women decide you're \"not as bad as they say.\"" },
};

/** What a day's canvassing does to a bloc's campaign score, capped. */
export function canvass(p: PoliticsState, faction: Faction): PoliticsState {
  return { ...p, campaign: { ...p.campaign, [faction]: Math.min(CANVASS_MOST, (p.campaign[faction] ?? 0) + CANVASS_GAIN) } };
}

/** A passed law's shifts kept on the blocs (knight.ts `passLaw` gives them). */
export function shiftByLaw(p: PoliticsState, law: LawId, level: LawLevel, shifts: Partial<Record<Faction, number>>): PoliticsState {
  const lawShift = { ...p.lawShift };
  for (const [f, n] of Object.entries(shifts) as [Faction, number][]) lawShift[f] = (lawShift[f] ?? 0) + n;
  return { ...p, laws: { ...p.laws, [law]: level }, lawShift };
}

// ---- What the laws do ----

export interface LawEffects {
  /** Gold and heat every night. */
  nightlyGold: number;
  nightlyHeat: number;
  /** What being seen half-dressed costs her Respect: 1 as the Baron left it, more when modest, none when bare is legal. */
  exposureRespect: number;
  /** Bare is legal: being seen costs her no heat either. */
  bareLegal: boolean;
  /** Free use (0 off, 1 devotees only, 2 everyone) and Public affection (0 private, 1 touching, 2 sex anywhere). */
  freeUse: LawLevel;
  publicAffection: LawLevel;
  /** Veyra the state faith: the Warm House's recruits go twice as fast, as with Oden's chapel shut. */
  veyraFaith: boolean;
}

/** What the board as it stands does. `lanternLit`: whether her Lantern burns (the brothel law touches it). */
export function lawEffects(board: LawBoard, lanternLit: boolean): LawEffects {
  const ale = [0, 3, 6][board.aleTax];
  const curfew = [-4, 0, 4][board.curfew];
  const brothels = lanternLit ? [0, 0, 3][board.brothels] : 0;
  return {
    nightlyGold: ale + curfew + brothels,
    nightlyHeat: lanternLit && board.brothels === 0 ? 1 : 0,
    exposureRespect: [2, 1, 0][board.dressCode],
    bareLegal: board.dressCode === 2,
    freeUse: board.freeUse,
    publicAffection: board.publicAffection,
    veyraFaith: board.stateFaith === 2,
  };
}

/** What she says no to under Free use costs her with the devotees (TOWN_DAY.md 6.3): their mood, by this much. */
export const REFUSAL_COST = 3;

/** Read from a save (or from a knight's save from before the town hall), or fresh. */
export function readPolitics(raw: unknown, knight?: { reeve?: boolean; laws?: Partial<LawBoard> } | null): PoliticsState {
  const out = newPolitics();
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const laws = (src?.laws ?? knight?.laws) as Partial<Record<string, unknown>> | undefined;
  if (laws && typeof laws === "object") {
    for (const id of Object.keys(LAWS) as LawId[]) {
      const v = laws[id];
      if (v === 0 || v === 1 || v === 2) out.laws[id] = v;
    }
  }
  out.reeve = src ? src.reeve === true : knight?.reeve === true;
  for (const key of ["campaign", "lawShift"] as const) {
    const table = src?.[key];
    if (!table || typeof table !== "object") continue;
    for (const f of FACTIONS) {
      const n = (table as Record<string, unknown>)[f];
      if (typeof n === "number" && Number.isFinite(n)) out[key][f] = clamp(n, -200, 200);
    }
  }
  return out;
}
