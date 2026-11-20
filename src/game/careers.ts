/**
 * Her careers by day (TOWN_DAY.md section 6.1, build step 7): the two ladders the town didn't have yet. The Knight
 * (knight.ts) and the Adventurer (guild.ts) are built and run from their own menus; the Madam is the Lantern; the
 * Reeve is step 8. This is the rest:
 *
 * - **Smuggler** (Silas, on the quarry road): Runner → Partner → Boss of the pass routes. It opens once she's
 *   carried his crates and he trusts her (never once she's crossed him). Gold, heat and corruption.
 * - **Clergy** (the Warm House, CHURCH_CONCEPT.md section 5 and 7): Acolyte → Deacon → Priest → High Priest → Warm
 *   Mother → Voice of Veyra, the names by her body. She can take a rank once she's Willing (section 7); Priest and up
 *   wear the robes and keep the toy in during temple hours, as every devotee of that rank does.
 *
 * Each rank opens its own day job at the career's place, and pays a little every night once she's far enough up
 * (`nightlyPay`). A step up is asked for, and `missing` says what she still lacks. Every job is one she picks
 * herself; nothing here touches the consent rule (GAME_PATH.MD). Pure rules: townplaces.ts turns them into actions,
 * tavern.ts keeps the state.
 */
import type { TownAction, TownPlaceId, TownState } from "./townplaces";
import { RECRUIT_IDS } from "./recruits";
import type { ArcStage } from "./lewd";

export type CareerId = "smuggler" | "clergy";
export const CAREER_IDS: readonly CareerId[] = ["smuggler", "clergy"];

/** Her place on a career: rank -1 until she's joined, and the jobs she's done on it. */
export interface CareerState {
  rank: number;
  jobs: number;
}

export function newCareers(): Record<CareerId, CareerState> {
  return { smuggler: { rank: -1, jobs: 0 }, clergy: { rank: -1, jobs: 0 } };
}

interface Job {
  label: string;
  hours: number;
  lines: readonly string[];
  /** What it pays and costs: TownOutcome's numbers. */
  gold?: number;
  heat?: number;
  corruption?: number;
  lust?: number;
  fame?: number;
  respect?: number;
  desire?: number;
  fatigue?: number;
  guests?: number;
  fans?: number;
}

interface Rank {
  /** Her title, as her and as him. */
  name: readonly [string, string];
  /** What's still missing for this rank, or [] when she can ask for it (the first rank: to join). */
  needs: (s: TownState) => string[];
  job: Job;
  /** Gold every night once she holds it, and heat with it. */
  pay?: { gold: number; heat?: number };
}

interface Career {
  id: CareerId;
  place: TownPlaceId;
  /** Who she asks. */
  boss: string;
  join: string;
  promote: string;
  ranks: readonly Rank[];
  /** Why the career's shut to her now, whatever her rank (Silas crossed), or null. */
  shut?: (s: TownState) => string | null;
}

const ARC_ORDER: readonly ArcStage[] = ["sheltered", "curious", "willing", "known", "legend"];
const atLeast = (s: TownState, stage: ArcStage) => ARC_ORDER.indexOf(s.arc) >= ARC_ORDER.indexOf(stage);
const jobsAt = (s: TownState, id: CareerId) => s.careers[id].jobs;
const need = (ok: boolean, what: string) => (ok ? [] : [what]);
const visits = (s: TownState, ...ids: string[]) => ids.reduce((n, id) => n + (s.done[id] ?? 0), 0);

export const CAREERS: Readonly<Record<CareerId, Career>> = {
  smuggler: {
    id: "smuggler",
    place: "quarry",
    boss: "Silas",
    join: "Tell Silas you'll run for him",
    promote: "Ask Silas for a bigger cut",
    shut: (s) => (s.flags.has("silasAngry") ? "Silas won't deal with you" : null),
    ranks: [
      {
        name: ["Runner", "Runner"],
        needs: (s) => need(visits(s, "quarry:crate") >= (s.flags.has("silasOwes") ? 1 : 2), s.flags.has("silasOwes") ? "carry one of his crates first" : "carry two of his crates first"),
        job: {
          label: "Run a satchel over the ridge, and ask nothing",
          hours: 1.5,
          lines: [
            "A satchel, a goat path over the ridge, and a woman at the top who counts the coins twice. Eighteen gold. The satchel clinked. You didn't ask.",
            "Over the ridge and back before the patrol changes. Your calves will never forgive you. Silas pays eighteen and calls you \"the quick one.\"",
          ],
          gold: 18,
          heat: 2,
          corruption: 3,
          fatigue: 2,
        },
      },
      {
        name: ["Partner", "Partner"],
        needs: (s) => [
          ...need(jobsAt(s, "smuggler") >= 5, `5 runs (${jobsAt(s, "smuggler")})`),
          ...need(s.corruption >= 40, "a shadier name (corruption 40)"),
          ...need(s.fans >= 150, "150 fans: a house worth hiding things in"),
        ],
        job: {
          label: "Keep a shipment in your cellar overnight",
          hours: 0.5,
          lines: [
            "Six crates behind your ale casks, marked \"turnips.\" They are not turnips. Thirty gold, and Silas's word your cellar will be empty by dawn.",
            "The crew rolls the barrels in at noon. One of them sloshes in a very un-turnip way. Thirty gold, no questions, a wink from Silas.",
          ],
          gold: 30,
          heat: 3,
          corruption: 4,
        },
        pay: { gold: 5 },
      },
      {
        name: ["Boss of the pass routes", "Boss of the pass routes"],
        needs: (s) => [
          ...need(jobsAt(s, "smuggler") >= 12, `12 jobs for the crew (${jobsAt(s, "smuggler")})`),
          ...need(s.corruption >= 80, "a crooked name (corruption 80)"),
          ...need(s.fans >= 300, "300 fans"),
          ...need(s.heat < 8, "the keep's eye off you (heat under 8)"),
        ],
        job: {
          label: "Set the week's routes with the crew",
          hours: 1,
          lines: [
            "A map on your bar, Silas on one side and you on the other. Which ridge, which night, which guard gets the bottle. Fifty gold, and the crew calls you \"boss\" now. Silas lets them.",
          ],
          gold: 50,
          heat: 2,
          corruption: 5,
        },
        pay: { gold: 12, heat: 1 },
      },
    ],
  },
  clergy: {
    id: "clergy",
    place: "warmhouse",
    boss: "the Warm House",
    join: "Ask to serve Veyra as an Acolyte",
    promote: "Ask the High Priestess for the next rank",
    ranks: [
      {
        name: ["Acolyte", "Acolyte"],
        needs: (s) => [
          // CHURCH_CONCEPT.md section 7: she can take a rank once she's Willing.
          ...need(atLeast(s, "willing"), "Willing"),
          ...need(visits(s, "warmhouse:ribbon", "warmhouse:blessing", "warmhouse:session") >= 3, "3 visits to the Warm House"),
        ],
        job: {
          label: "Greet at the door and mop the oil off the floor",
          hours: 1,
          lines: [
            "An hour greeting nervous visitors at the door, and another wiping up scented oil from places oil shouldn't reach. Four gold, a smile from every priestess, and an ache you can't quite place.",
          ],
          gold: 4,
          lust: 1,
          desire: 5,
        },
      },
      {
        name: ["Deaconess", "Deacon"],
        needs: (s) => [
          ...need(jobsAt(s, "clergy") >= 3, `3 days of service (${jobsAt(s, "clergy")})`),
          ...need(RECRUIT_IDS.some((id) => s.recruits[id].helped > 0), "put in a word for one of the town's recruits"),
        ],
        job: {
          label: "Assist at a relief session",
          hours: 2,
          lines: [
            "You hold the oil and the hand of a very nervous farmer while a priestess works the tightness out of him. By the end you're holding rather more than his hand. Twelve gold.",
            "Two hours assisting. You learn where the knots live, and how to talk someone out of them, and what they sound like when they let go. Twelve gold, and your own knots are worse.",
          ],
          gold: 12,
          lust: 1,
          desire: 20,
          respect: -1,
          fatigue: 2,
        },
      },
      {
        name: ["Priestess", "Priest"],
        needs: (s) => [
          ...need(jobsAt(s, "clergy") >= 6, `6 days of service (${jobsAt(s, "clergy")})`),
          ...need(atLeast(s, "known"), "Known: the robes are worn in front of everyone"),
        ],
        job: {
          label: "Lead a relief session, in the robes",
          hours: 2,
          lines: [
            "In Veyra's robes, the toy in as the rank requires, you lead a session of your own. \"Tell me where it's tight,\" you say, and they do. Twenty-five gold, and a queue at the door.",
            "Your own session, your own visitors, your robes. The cooper's apprentice cries with relief. The priestesses applaud. Twenty-five gold.",
          ],
          gold: 25,
          lust: 1,
          fame: 1,
          desire: 25,
          respect: -1,
          fatigue: 3,
        },
        pay: { gold: 3 },
      },
      {
        name: ["High Priestess", "High Priest"],
        needs: (s) => [
          ...need(jobsAt(s, "clergy") >= 12, `12 days of service (${jobsAt(s, "clergy")})`),
          ...need(RECRUIT_IDS.some((id) => s.recruits[id].stage >= 3 && s.recruits[id].helped > 0), "a recruit you helped all the way up the hill"),
        ],
        job: {
          label: "Train the new priestesses",
          hours: 2,
          lines: [
            "A row of new priestesses, very earnest, very oiled. You show them where to put their hands and what to say. \"Say it out loud,\" you tell them. They say it out loud. Thirty-five gold.",
          ],
          gold: 35,
          fame: 1,
          desire: 15,
          respect: -1,
        },
        pay: { gold: 6 },
      },
      {
        name: ["Warm Mother", "Warm Father"],
        needs: (s) => [
          ...need(jobsAt(s, "clergy") >= 20, `20 days of service (${jobsAt(s, "clergy")})`),
          ...need(s.fame >= 50, `Fame 50 (${s.fame})`),
        ],
        job: {
          label: "Run the Warm House for the day",
          hours: 3,
          lines: [
            "You run the temple: the rota, the oil order, three sessions and a squabble over who gets the big cushion. Fifty gold, and the whole hill comes down to your bar tonight.",
          ],
          gold: 50,
          fame: 2,
          guests: 2,
          respect: -1,
        },
        pay: { gold: 10 },
      },
      {
        name: ["Voice of Veyra", "Voice of Veyra"],
        needs: (s) => [
          ...need(jobsAt(s, "clergy") >= 30, `30 days of service (${jobsAt(s, "clergy")})`),
          ...need(s.fans >= 400, `400 fans (${s.fans})`),
          ...need(s.fame >= 70, `Fame 70 (${s.fame})`),
        ],
        job: {
          label: "Preach from the Warm House steps",
          hours: 1,
          lines: [
            "You preach from the Warm House steps, and the square fills. \"Veyra only asks what you need,\" you tell them, \"and you need so much.\" Somebody faints. Somebody else proposes. The chapel bell rings, sulkily.",
          ],
          fame: 3,
          guests: 3,
          fans: 3,
          respect: -2,
          heat: 1,
        },
        pay: { gold: 15 },
      },
    ],
  },
};

/** Her title on a career, or null before she's joined. */
export function careerTitle(id: CareerId, state: CareerState, female: boolean): string | null {
  const rank = CAREERS[id].ranks[state.rank];
  return rank ? rank.name[female ? 0 : 1] : null;
}

/** What she still lacks for the next rank (or to join), [] when she can ask; null at the top. */
export function missing(id: CareerId, s: TownState): string[] | null {
  const next = CAREERS[id].ranks[s.careers[id].rank + 1];
  return next ? next.needs(s) : null;
}

/** What her careers pay every night: the sum of each one's rank pay. */
export function nightlyPay(careers: Readonly<Record<CareerId, CareerState>>): { gold: number; heat: number } {
  let gold = 0;
  let heat = 0;
  for (const id of CAREER_IDS) {
    const pay = CAREERS[id].ranks[careers[id].rank]?.pay;
    gold += pay?.gold ?? 0;
    heat += pay?.heat ?? 0;
  }
  return { gold, heat };
}

/** A career's actions at its place: join, each rank's job once she holds it, and asking for the next rank. */
export function careerActions(id: CareerId): TownAction[] {
  const c = CAREERS[id];
  const shut = (s: TownState) => c.shut?.(s) ?? null;
  const female = (s: TownState) => s.body !== "Male";
  const actions: TownAction[] = [
    {
      id: `join_${id}`,
      label: c.join,
      hours: 0.5,
      hidden: (s) => s.careers[id].rank >= 0,
      locked: (s) => shut(s) ?? (missing(id, s)!.length ? `needs ${missing(id, s)!.join(", ")}` : null),
      run: (s) => ({
        line: `${c.boss === "Silas" ? "Silas looks you over and spits. \"Fine. You run, you don't ask, you don't get caught.\"" : "The High Priestess ties Veyra's ribbon round your wrist herself. \"Welcome, sister. You'll start at the door.\""} You're ${careerTitle(id, { rank: 0, jobs: 0 }, female(s))} now.`,
        career: { id, act: "join" },
      }),
    },
    {
      id: `promote_${id}`,
      label: c.promote,
      hours: 0.5,
      hidden: (s) => s.careers[id].rank < 0 || s.careers[id].rank >= c.ranks.length - 1,
      locked: (s) => shut(s) ?? (missing(id, s)?.length ? `needs ${missing(id, s)!.join(", ")}` : null),
      run: (s) => {
        const next = careerTitle(id, { rank: s.careers[id].rank + 1, jobs: 0 }, female(s));
        return {
          line:
            id === "smuggler"
              ? `Silas counts your runs on his fingers, runs out of fingers, and laughs. "${next}, then." The crew raise their cups to you.`
              : `The priestesses dress you in your new rank's robes and walk you through the hall so everyone can see. You're ${next} of Veyra now.`,
          fame: 1,
          career: { id, act: "promote" },
        };
      },
    },
  ];
  c.ranks.forEach((rank, r) => {
    const job = rank.job;
    actions.push({
      id: `job_${id}_${r}`,
      label: job.label,
      hours: job.hours,
      hidden: (s) => s.careers[id].rank < r,
      locked: (s) => shut(s) ?? (s.fatigueLevel >= 5 && job.fatigue ? "too tired" : null),
      run: (_s, rng) => ({
        line: job.lines[Math.floor(rng() * job.lines.length) % job.lines.length],
        gold: job.gold,
        heat: job.heat,
        corruption: job.corruption,
        lust: job.lust,
        fame: job.fame,
        respect: job.respect,
        desire: job.desire,
        fatigue: job.fatigue,
        guests: job.guests,
        fans: job.fans,
        career: { id, act: "job" },
      }),
    });
  });
  return actions;
}

/** Read from a save, or fresh. */
export function readCareers(raw: unknown): Record<CareerId, CareerState> {
  const out = newCareers();
  if (!raw || typeof raw !== "object") return out;
  for (const id of CAREER_IDS) {
    const r = (raw as Record<string, unknown>)[id] as Record<string, unknown> | undefined;
    if (!r || typeof r !== "object") continue;
    const top = CAREERS[id].ranks.length - 1;
    const rank = typeof r.rank === "number" && Number.isFinite(r.rank) ? Math.max(-1, Math.min(top, Math.floor(r.rank))) : -1;
    const jobs = typeof r.jobs === "number" && Number.isFinite(r.jobs) ? Math.max(0, Math.floor(r.jobs)) : 0;
    out[id] = { rank, jobs };
  }
  return out;
}
