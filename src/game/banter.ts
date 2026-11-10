/**
 * What guests say to you, and how it changes with who you've become.
 *
 * The player has a reputation (`Persona`) that builds up from their choices and lasts from night to night:
 * how flirtatious they are, how kind, how greedy, how much they drink, and what they did at last call.
 * Every line can ask for a reputation (`when`), so the same guest says different things to a shy innkeeper
 * than to the shameless charmer of the pass, and mentions the deeds the village has heard about.
 * Lines you've heard are skipped until the eligible ones run out.
 *
 * Kept apart from the rules so the writing is easy to change.
 */
import type { GuestKind } from "./tavern";

/** Which body the player chose, so compliments fit who they're flirting with. */
export type PlayerBody = "Male" | "Female";

/** The player's reputation. Every field starts at 0. */
export interface Persona {
  /** How flirtatious you're known to be: 0 proper, 10 the shameless charmer of the pass. */
  flirt: number;
  /** Kind to the village (up to 10), or cold and self-serving (down to -10). */
  kindness: number;
  /** How well known you are for doing things for coin. */
  greed: number;
  /** Drinks you've taken with guests, ever. */
  drinks: number;
  /** Last calls where you protected people, told on them, and sold what you heard. */
  protected: number;
  informed: number;
  sold: number;
}

export const PERSONA_KEYS = ["flirt", "kindness", "greed", "drinks", "protected", "informed", "sold"] as const;

const LIMITS: Record<keyof Persona, [number, number]> = {
  flirt: [0, 10],
  kindness: [-10, 10],
  greed: [0, 10],
  drinks: [0, 999],
  protected: [0, 99],
  informed: [0, 99],
  sold: [0, 99],
};

export function newPersona(): Persona {
  return { flirt: 0, kindness: 0, greed: 0, drinks: 0, protected: 0, informed: 0, sold: 0 };
}

/** Changes a reputation in place, keeping each part within its limits. */
export function shiftPersona(persona: Persona, change: Partial<Persona> = {}): void {
  for (const key of PERSONA_KEYS) {
    const [min, max] = LIMITS[key];
    persona[key] = Math.min(max, Math.max(min, persona[key] + (change[key] ?? 0)));
  }
}

/** A reputation from a save, with anything missing or broken put back to its start. */
export function readPersona(raw: unknown): Persona {
  const persona = newPersona();
  if (!raw || typeof raw !== "object") return persona;
  const fields = raw as Partial<Record<keyof Persona, unknown>>;
  for (const key of PERSONA_KEYS) {
    const value = fields[key];
    if (typeof value === "number" && Number.isFinite(value)) persona[key] = Math.round(value);
  }
  shiftPersona(persona);
  return persona;
}

/** What a line can depend on. */
export interface BanterContext {
  body: PlayerBody;
  persona: Persona;
  trust: number;
  heat: number;
  gold: number;
  debt: number;
  /** 0 for the first night. */
  night: number;
  /** How drunk you are, from 0 to 1. */
  drunk: number;
  /** Who's speaking. */
  kind: GuestKind;
}

type When = (c: BanterContext) => boolean;

/** Something a guest might say. The id stops it being said again too soon. */
export interface Line {
  id: string;
  text: string;
  when?: When;
}

/** An answer you can give, and what it does. */
export interface Reply {
  id: string;
  label: string;
  /** What happens, shown after you answer. */
  result: string;
  gold: number;
  trust: number;
  heat: number;
  persona?: Partial<Persona>;
}

export interface Favor {
  id: string;
  /** Who asks it. */
  kinds: GuestKind[];
  ask: string;
  agree: Reply;
  refuse: Reply;
  when?: When;
}

/**
 * One line from a list: only those whose `when` holds, and of those, one not said yet if there is one.
 * Marks it as said. Null if no line fits.
 */
export function pickLine<T extends { id: string; when?: When }>(
  lines: readonly T[],
  context: BanterContext,
  said: Set<string>,
  random: () => number,
): T | null {
  const fits = lines.filter((line) => !line.when || line.when(context));
  const fresh = fits.filter((line) => !said.has(line.id));
  const pool = fresh.length > 0 ? fresh : fits;
  if (pool.length === 0) return null;
  const line = pool[Math.floor(random() * pool.length) % pool.length];
  said.add(line.id);
  return line;
}

/** What each kind of guest is called when they speak. */
export const SPEAKERS: Record<GuestKind, string> = {
  farmer: "Farmer",
  smuggler: "Smuggler",
  soldier: "Soldier",
  fugitive: "Stranger",
};

// How flirty your reputation is: shy, warm, or bold.
const shy: When = (c) => c.persona.flirt <= 2;
const warm: When = (c) => c.persona.flirt >= 3 && c.persona.flirt <= 5;
const bold: When = (c) => c.persona.flirt >= 6;
const female: When = (c) => c.body === "Female";
const male: When = (c) => c.body === "Male";
const both = (a: When, b: When): When => (c) => a(c) && b(c);
const villager: When = (c) => c.kind === "farmer" || c.kind === "fugitive";

/** How they offer you the drink. */
export const OFFERS: Line[] = [
  { id: "offer.service", text: "\"Fine service! Here, pour yourself one on me.\"" },
  { id: "offer.coin", text: "\"Keep the coin. No, wait, have a drink with me instead!\"" },
  { id: "offer.best", text: "\"Best ale on the pass. Have one yourself, my treat.\"" },
  { id: "offer.sit", text: "\"Sit, sit! One cup with me. I'm paying.\"" },
  {
    id: "offer.drinker",
    text: "\"Ha! The innkeeper who drinks soldiers under the table! One more, on me.\"",
    when: (c) => c.persona.drinks >= 4,
  },
  { id: "offer.tipsy", text: "\"You've had a few already, I can tell. One more won't hurt, eh?\"", when: (c) => c.drunk >= 0.4 },
  { id: "offer.charmer", text: "\"For the charmer of Tarven. Drink, before someone else steals you away.\"", when: bold },
  { id: "offer.kind", text: "\"For the kindest host on the mountain. Drink, please.\"", when: both(villager, (c) => c.persona.kindness >= 4) },
  { id: "offer.coins", text: "\"I know you like coin better than ale. But have the ale too.\"", when: (c) => c.persona.greed >= 4 },
];

/** Said with a few drinks in them, a little too warmly. Bolder the flirtier your reputation. */
export const COMPLIMENTS: Line[] = [
  // Shy: they're working up the nerve.
  { id: "c.f.eyes", text: "\"Has anyone told you you've got the prettiest eyes on the whole pass?\"", when: both(female, shy) },
  {
    id: "c.f.dance",
    text: "\"If I were ten years younger, and a good deal more sober, I'd ask you to dance.\"",
    when: both(female, shy),
  },
  { id: "c.f.smile", text: "\"That smile could thaw the snow off the ridge, innkeeper.\"", when: both(female, shy) },
  { id: "c.m.arms", text: "\"Look at the arms on you! Bet you roll those casks like they're apples.\"", when: both(male, shy) },
  {
    id: "c.m.devil",
    text: "\"Handsome devil, aren't you? Half the village must find excuses to drink here.\"",
    when: both(male, shy),
  },
  { id: "c.m.daughter", text: "\"If my daughter saw you she'd never go home. Don't tell her I said so.\"", when: both(male, shy) },
  // Warm: they've heard you don't mind.
  { id: "c.f.tray", text: "\"You carry a tray the way a queen walks. I could watch you all night.\"", when: both(female, warm) },
  {
    id: "c.f.baron",
    text: "\"Running this place on your own, and looking like that? The baron should be paying you.\"",
    when: both(female, warm),
  },
  { id: "c.f.forget", text: "\"Every time you walk past, I forget what I ordered.\"", when: both(female, warm) },
  { id: "c.m.coins", text: "\"With a jaw like that you should be on the baron's coins, not him.\"", when: both(male, warm) },
  {
    id: "c.m.shoulders",
    text: "\"Those shoulders! You could carry the whole bar out the door if the baron came for it.\"",
    when: both(male, warm),
  },
  { id: "c.m.haggle", text: "\"Every time you lean on the bar, the farmwives forget to haggle.\"", when: both(male, warm) },
  // Bold: your reputation has gone round the pass.
  {
    id: "c.f.rumor",
    text: "\"Word on the pass is you flirt back. Is it true, or do I need another drink to find out?\"",
    when: both(female, bold),
  },
  {
    id: "c.f.half",
    text: "\"Half the men in this room came for your smile, not the ale. The other half are lying.\"",
    when: both(female, bold),
  },
  { id: "c.f.slowly", text: "\"Lean on the table and tell me the price of ale again. Slowly.\"", when: both(female, bold) },
  { id: "c.m.prove", text: "\"They say you flirt back. Prove it, handsome.\"", when: both(male, bold) },
  { id: "c.m.barrel", text: "\"Smile at me like that again and I'll have to buy the whole barrel.\"", when: both(male, bold) },
  { id: "c.m.sleeves", text: "\"Roll those sleeves up a little more and I'll pay double.\"", when: both(male, bold) },
  // What they've heard about you colours it.
  { id: "c.kind", text: "\"A kind heart and a face like that. The village is lucky to have you.\"", when: (c) => c.persona.kindness >= 4 },
  { id: "c.greed", text: "\"Pretty as a coin, and they say just as easy to buy.\"", when: (c) => c.persona.greed >= 4 },
  { id: "c.drinker", text: "\"Anyone who can drink like you and still look that good is a marvel.\"", when: (c) => c.persona.drinks >= 5 },
];

/** Talk about what you've done, which guests have heard about. */
export const REMARKS: Line[] = [
  {
    id: "r.protected",
    text: "\"Someone sent the baron's man the wrong way. Nobody's saying who.\" They tap their nose and grin at you.",
    when: (c) => c.persona.protected >= 1,
  },
  { id: "r.sold", text: "\"People say you sell what you hear. I'll mind my tongue around you.\"", when: (c) => c.persona.sold >= 1 },
  {
    id: "r.informed",
    text: "\"The soldiers marched on a tip from this inn, I heard. Hope it wasn't you.\"",
    when: (c) => c.persona.informed >= 1,
  },
  { id: "r.trust", text: "\"The whole village speaks well of you, you know.\"", when: (c) => c.trust >= 10 },
  { id: "r.heat", text: "\"Careful. The garrison's been asking questions about this place.\"", when: (c) => c.heat >= 5 },
  {
    id: "r.gold",
    text: "\"They say you'll pay the baron off yet. Wouldn't that be something!\"",
    when: (c) => c.gold >= c.debt * 0.7,
  },
  { id: "r.night", text: "\"Still standing! Folk bet you wouldn't last a week up here.\"", when: (c) => c.night >= 1 },
  { id: "r.drinker", text: "\"Is it true you drank a soldier under the table?\"", when: (c) => c.persona.drinks >= 5 },
  { id: "r.flirt", text: "\"Half the pass is in love with the innkeeper, they say.\"", when: bold },
  { id: "r.cold", text: "\"They say you're hard to get a smile out of. I'll keep trying.\"", when: (c) => c.persona.flirt === 0 && c.night >= 1 },
];

const SHAMELESS: Reply = {
  id: "flirt.shameless",
  label: "Flirt back shamelessly",
  result: "You lean in close and whisper something that turns them red to the ears. They empty their purse onto the table. (+5 gold)",
  gold: 5,
  trust: 0,
  heat: 0,
  persona: { flirt: 2 },
};
const PRICE: Reply = {
  id: "flirt.price",
  label: "\"Compliments are free. Tips aren't.\"",
  result: "They laugh and pay up. (+4 gold)",
  gold: 4,
  trust: 0,
  heat: 0,
  persona: { greed: 1 },
};
const PLAY_ALONG: Reply = {
  id: "flirt.play",
  label: "Laugh and play along",
  result: "You wink. They laugh far too loudly and press another coin into your hand. (+3 gold)",
  gold: 3,
  trust: 0,
  heat: 0,
  persona: { flirt: 1 },
};
const THANKS: Reply = {
  id: "flirt.thanks",
  label: "Thank them and brush it off",
  result: "You smile, thank them, and move on. They raise their cup to your back.",
  gold: 0,
  trust: 0,
  heat: 0,
  persona: { flirt: -1 },
};
const MANNERS: Reply = {
  id: "flirt.manners",
  label: "\"Mind your manners.\"",
  result: "They go red and mumble an apology into their cup.",
  gold: 0,
  trust: 0,
  heat: 0,
  persona: { flirt: -2 },
};

/**
 * How you can answer a compliment: three answers at most, so they fit on the keys. A bold answer is there
 * once your reputation allows it, then playing along, then turning it aside.
 */
export function complimentReplies(c: BanterContext): Reply[] {
  const replies: Reply[] = [];
  if (c.persona.flirt >= 3 && c.persona.flirt >= c.persona.greed) replies.push(SHAMELESS);
  else if (c.persona.greed >= 3) replies.push(PRICE);
  replies.push(PLAY_ALONG, c.persona.flirt <= 2 ? MANNERS : THANKS);
  return replies;
}

const reply = (id: string, label: string, result: string, effects: Partial<Omit<Reply, "id" | "label" | "result">> = {}): Reply => ({
  id,
  label,
  result,
  gold: 0,
  trust: 0,
  heat: 0,
  ...effects,
});

const distrusted: When = (c) => c.persona.sold + c.persona.informed >= 1;

/** What guests might ask of you. */
export const FAVORS: Favor[] = [
  {
    id: "f.letter",
    kinds: ["farmer"],
    ask: "\"Could you keep this letter behind the bar? My brother will come for it. Don't let the soldiers see it.\"",
    agree: reply("f.letter.yes", "\"I'll keep it safe.\"", "They squeeze your hand. Word gets round that you can be trusted. (+1 trust)", {
      trust: 1,
      persona: { kindness: 1 },
    }),
    refuse: reply("f.letter.no", "\"I can't get mixed up in that.\"", "They nod, disappointed, and put the letter away."),
    when: (c) => !distrusted(c),
  },
  {
    id: "f.vouch",
    kinds: ["farmer"],
    ask: "\"My boy wants to come to the village meeting. They'd let him in if you vouched for him.\"",
    agree: reply("f.vouch.yes", "\"Tell them I sent him.\"", "They shake your hand twice. You're part of it now. (+1 trust, +1 heat)", {
      trust: 1,
      heat: 1,
      persona: { kindness: 1 },
    }),
    refuse: reply("f.vouch.no", "\"Keep me out of your meetings.\"", "\"Suit yourself,\" they say, and look away."),
    when: (c) => c.night >= 1 && !distrusted(c),
  },
  {
    id: "f.never",
    kinds: ["smuggler"],
    ask: "\"If anyone comes asking, I was never here tonight. Understood?\" A coin slides across the table.",
    agree: reply("f.never.yes", "\"Never seen you before.\"", "The coin is yours. If the garrison asks, you're lying for a smuggler. (+3 gold, +1 heat)", {
      gold: 3,
      heat: 1,
      persona: { greed: 1 },
    }),
    refuse: reply("f.never.no", "\"I don't lie for strangers.\"", "They take the coin back with a thin smile."),
  },
  {
    id: "f.crate",
    kinds: ["smuggler"],
    ask: "\"I hear you're a practical sort. Keep a crate in your cellar tonight? Ten gold, no questions.\"",
    agree: reply("f.crate.yes", "\"Ten gold. No questions.\"", "Ten coins, and a crate you'd rather the soldiers never opened. (+10 gold, +2 heat)", {
      gold: 10,
      heat: 2,
      persona: { greed: 2 },
    }),
    refuse: reply("f.crate.no", "\"Not under my roof.\"", "\"Pity,\" they say. \"I'd heard you liked money.\""),
    when: (c) => c.persona.greed >= 3,
  },
  {
    id: "f.names",
    kinds: ["soldier"],
    ask: "\"Keep an ear out for troublemakers, eh? The captain pays well for names.\"",
    agree: reply("f.names.yes", "\"I'll let you know.\"", "The garrison counts you a friend. The village won't, if it hears. (-1 heat, -1 trust)", {
      trust: -1,
      heat: -1,
      persona: { kindness: -1 },
    }),
    refuse: reply("f.names.no", "\"I just pour the ale.\"", "The soldier's smile goes thin. \"Of course you do.\" (+1 heat)", { heat: 1 }),
  },
  {
    id: "f.feast",
    kinds: ["soldier"],
    ask: "\"The captain's holding a feast at the fort. Come as my guest? You'd turn every head in the hall.\"",
    agree: reply("f.feast.yes", "\"Save me a seat.\"", "He beams like a boy. The garrison will be kinder to you for it. (-1 heat)", {
      heat: -1,
      persona: { flirt: 1 },
    }),
    refuse: reply("f.feast.no", "\"I've a tavern to run.\"", "He sulks into his cup for the rest of the night."),
    when: (c) => c.persona.flirt >= 4,
  },
  {
    id: "f.backway",
    kinds: ["fugitive"],
    ask: "\"Is there a back way out of this place? Just... in case I need to leave quickly.\"",
    agree: reply("f.backway.yes", "Show them the bedroom window", "They let out a long breath and thank you. You've helped someone the baron wants. (+1 trust, +1 heat)", {
      trust: 1,
      heat: 1,
      persona: { kindness: 1 },
    }),
    refuse: reply("f.backway.no", "\"Only the front door, I'm afraid.\"", "They nod and keep their eyes on the door all evening."),
    when: (c) => !distrusted(c),
  },
  {
    id: "f.purse",
    kinds: ["fugitive"],
    ask: "\"They say you help people. Would you keep my purse till morning? It's all I have left.\"",
    agree: reply("f.purse.yes", "\"It'll be safe with me.\"", "They press it into your hands, near tears. (+1 trust)", {
      trust: 1,
      persona: { kindness: 1 },
    }),
    refuse: reply("f.purse.no", "\"Better you keep it close.\"", "They hold it tight against their chest."),
    when: (c) => c.persona.kindness >= 3 && !distrusted(c),
  },
  // Someone who's heard you talk to the baron's men keeps their troubles to themselves.
  {
    id: "f.distrust",
    kinds: ["farmer", "fugitive"],
    ask: "\"I'd ask you something, but I hear you sell what you hear. I'll keep my troubles to myself.\"",
    agree: reply("f.distrust.fair", "\"That's fair.\"", "They nod and turn back to their drink."),
    refuse: reply("f.distrust.wrong", "\"I'm not who they say I am.\"", "They look at you a long moment, and don't believe you."),
    when: distrusted,
  },
];
