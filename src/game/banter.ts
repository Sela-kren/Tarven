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
import { HIGH_RESPECT, LOW_RESPECT, type Mood } from "./mood";
import type { GuestRole, RoleStats } from "./guestroles";
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
  /** Hidden from the player for now: nothing shows these and nothing changes them yet. 0 to 10. */
  lust: number;
  desires: number;
  /** How popular you've become, from 0 to 100. Guests start to idolize you as it climbs. */
  fame: number;
  /** How the room regards you, from -10 to 10. Low, and they stop seeing an innkeeper and start seeing something else. */
  respect: number;
}

export const PERSONA_KEYS = ["flirt", "kindness", "greed", "drinks", "protected", "informed", "sold", "lust", "desires", "fame", "respect"] as const;

const LIMITS: Record<keyof Persona, [number, number]> = {
  flirt: [0, 10],
  kindness: [-10, 10],
  greed: [0, 10],
  drinks: [0, 999],
  protected: [0, 99],
  informed: [0, 99],
  sold: [0, 99],
  lust: [0, 10],
  desires: [0, 10],
  fame: [0, 100],
  respect: [-10, 10],
};

export function newPersona(): Persona {
  return { flirt: 0, kindness: 0, greed: 0, drinks: 0, protected: 0, informed: 0, sold: 0, lust: 0, desires: 0, fame: 0, respect: 0 };
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
  /** Who's speaking: their group, and their type in it when it's one guest. */
  kind: GuestKind;
  role?: GuestRole;
  /** That guest's own rolled numbers, when it's one guest. */
  stats?: RoleStats;
  /** The state the speaker is in, and how much lust and longing they carry, when it's one guest talking. */
  mood?: Mood;
  lust?: number;
  desires?: number;
  /** How many pieces of clothing you've lost to guests tonight. */
  stripped?: number;
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
  /** What you say aloud when you pick it. Answers already in quotes are said as they read. */
  say?: string;
  /** Taking this answer costs you a piece of clothing. */
  strip?: boolean;
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
  adventurer: "Adventurer",
  bandit: "Bandit",
  noble: "Noble",
};

// How flirty your reputation is: shy, warm, or bold.
const shy: When = (c) => c.persona.flirt <= 2;
const warm: When = (c) => c.persona.flirt >= 3 && c.persona.flirt <= 5;
const bold: When = (c) => c.persona.flirt >= 6;
const female: When = (c) => c.body === "Female";
const male: When = (c) => c.body === "Male";
const disrespected: When = (c) => c.persona.respect <= LOW_RESPECT;
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
  // They've stopped respecting you, and it shows.
  { id: "c.smut.price", text: "\"How much for the evening? Everyone on the pass says you've got a price.\"", when: disrespected },
  { id: "c.smut.knee", text: "\"Come and sit on this knee. I hear it's your usual seat.\"", when: disrespected },
  { id: "c.smut.door", text: "\"Leave your door on the latch tonight, eh? Everyone says you do.\"", when: disrespected },
  // What they've heard about you colours it.
  { id: "c.kind", text: "\"A kind heart and a face like that. The village is lucky to have you.\"", when: (c) => c.persona.kindness >= 4 },
  { id: "c.greed", text: "\"Pretty as a coin, and they say just as easy to buy.\"", when: (c) => c.persona.greed >= 4 },
  { id: "c.drinker", text: "\"Anyone who can drink like you and still look that good is a marvel.\"", when: (c) => c.persona.drinks >= 5 },
  // You've already lost something to the room tonight.
  { id: "c.stripped.service", text: "\"Now that's what I call service. Don't go putting it all back on.\"", when: (c) => (c.stripped ?? 0) >= 1 },
  { id: "c.stripped.view", text: "\"Best view on the whole pass, and I didn't even have to climb for it.\"", when: (c) => (c.stripped ?? 0) >= 2 },
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
  { id: "r.smut", text: "\"You know what they call this place now? Ask the soldiers. They laugh when they say it.\"", when: disrespected },
  { id: "r.respected", text: "\"Folk mind their manners in here now. That's your doing.\"", when: (c) => c.persona.respect >= HIGH_RESPECT },
  {
    id: "r.stripped",
    text: "\"Lost something tonight, innkeeper? Half the room's wearing a piece of you.\"",
    when: (c) => (c.stripped ?? 0) >= 2,
  },
  { id: "r.cold", text: "\"They say you're hard to get a smile out of. I'll keep trying.\"", when: (c) => c.persona.flirt === 0 && c.night >= 1 },
];

const SHAMELESS: Reply = {
  id: "flirt.shameless",
  label: "Flirt back shamelessly",
  say: "\"Come closer. No, closer. I'll tell you a secret.\"",
  result: "You lean in close and whisper something that turns them red to the ears. They empty their purse onto the table. (+5 gold)",
  gold: 5,
  trust: 0,
  heat: 0,
  persona: { flirt: 2, respect: -2 },
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
  say: "\"Ha! Keep that up and I'll start charging for it.\"",
  result: "You wink. They laugh far too loudly and press another coin into your hand. (+3 gold)",
  gold: 3,
  trust: 0,
  heat: 0,
  persona: { flirt: 1, respect: -1 },
};
const THANKS: Reply = {
  id: "flirt.thanks",
  label: "Thank them and brush it off",
  say: "\"Kind of you. Enjoy your drink.\"",
  result: "You smile, thank them, and move on. They raise their cup to your back.",
  gold: 0,
  trust: 0,
  heat: 0,
  persona: { flirt: -1, respect: 1 },
};
const MANNERS: Reply = {
  id: "flirt.manners",
  label: "\"Mind your manners.\"",
  result: "They go red and mumble an apology into their cup.",
  gold: 0,
  trust: 0,
  heat: 0,
  persona: { flirt: -2, respect: 2 },
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
    id: "f.ewe",
    kinds: ["farmer"],
    ask: "\"My ewe's due any night now. If my boy comes running, would you send him to the mill for me?\"",
    agree: reply("f.ewe.yes", "\"I'll send him straight on.\"", "They grin and raise their cup to you. (+1 trust)", {
      trust: 1,
      persona: { kindness: 1 },
    }),
    refuse: reply("f.ewe.no", "\"I've no time to run errands.\"", "\"No, no, of course,\" they say, and look at the door all night."),
  },
  {
    id: "f.slate",
    kinds: ["farmer"],
    ask: "\"Could you put tonight on my slate? I'll pay when the barley's sold. On my word.\"",
    agree: reply("f.slate.yes", "\"Your word's good here.\"", "They shake your hand hard. The village hears you're fair. (+1 trust, -2 gold)", {
      gold: -2,
      trust: 1,
      persona: { kindness: 1 },
    }),
    refuse: reply("f.slate.no", "\"Coin on the table, friend.\"", "They count out their last coppers, slowly.", { persona: { greed: 1 } }),
  },
  {
    id: "f.seed",
    kinds: ["farmer"],
    ask: "\"The baron's men took my seed grain. If you've any barley to spare, I'd pay you back at harvest.\"",
    agree: reply("f.seed.yes", "\"Take a sack from the cellar.\"", "They go quiet, then hug you over the table. (+2 trust)", {
      trust: 2,
      heat: 1,
      persona: { kindness: 2 },
    }),
    refuse: reply("f.seed.no", "\"I've barely enough myself.\"", "\"Aye,\" they say. \"Hard year for all of us.\""),
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
      persona: { flirt: 1, respect: -1 },
    }),
    refuse: reply("f.feast.no", "\"I've a tavern to run.\"", "He sulks into his cup for the rest of the night."),
    when: (c) => c.persona.flirt >= 4,
  },
  {
    id: "f.song",
    kinds: ["soldier"],
    ask: "\"Sing us one, innkeeper! The lads have heard you've a voice on you.\"",
    agree: reply("f.song.yes", "Sing them a mountain song", "The whole table bangs their cups in time. The garrison likes you better for it. (-1 heat)", {
      say: "\"One verse. Then you're all buying.\"",
      heat: -1,
      persona: { fame: 2 },
    }),
    refuse: reply("f.song.no", "\"I pour. I don't sing.\"", "They boo, cheerfully, and start singing badly themselves."),
  },
  {
    id: "f.backway",
    kinds: ["fugitive"],
    ask: "\"Is there a back way out of this place? Just... in case I need to leave quickly.\"",
    agree: reply("f.backway.yes", "Show them the bedroom window", "They let out a long breath and thank you. You've helped someone the baron wants. (+1 trust, +1 heat)", {
      say: "\"Through the bedroom. The window opens onto the woodpile.\"",
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

/**
 * What's said when a guest with a few drinks in them goes for a piece of your clothing. Which piece, and in
 * what order, is the wardrobe's business (`wardrobe.ts`); this is only the writing.
 */
export interface StripPiece {
  id: string;
  /** What they say as they reach for it. */
  dare: string;
  /** Letting them have it. */
  accept: string;
  /** What you say as you do. */
  say: string;
  /** What happens. */
  result: string;
}

/** Written lines for each garment, by its wardrobe id. Anything without its own gets `stripPiece`'s generic ones. */
export const DARES: Record<string, Omit<StripPiece, "id">> = {
  apron: {
    dare: "\"Off with that apron, innkeeper! Nobody here minds a spill.\" They tug at the strings behind your back.",
    accept: "Let them untie your apron",
    say: "\"Go on, then. Just the apron.\"",
    result: "The apron drops to the floor. The table whistles and slaps the boards.",
  },
  belt: {
    dare: "\"That belt's done nothing for anyone all night.\" A hand hooks under the buckle.",
    accept: "Let them have the belt",
    say: "\"Careful with the buckle. It was Grandma's.\"",
    result: "They wave your belt over their head like a trophy. The room cheers.",
  },
  bodice: {
    dare: "\"Loosen those laces! You can't breathe in that thing.\" They pick at the knot at your side.",
    accept: "Let them unlace your bodice",
    say: "\"Slowly. And only the bodice.\"",
    result: "The laces give and the bodice comes away, leaving you in your chemise. The room goes quiet, then roars.",
  },
  skirt: {
    dare: "\"That skirt's hiding the best part of the evening. Let it drop!\" Someone tugs at the waist tie.",
    accept: "Untie your skirt",
    say: "\"You'll pay for the privilege.\"",
    result: "The skirt pools at your feet and you step out of it in your stockings. The room thunders.",
  },
  stockings: {
    dare: "\"The stockings next! One for the table and one for me.\"",
    accept: "Roll down your stockings",
    say: "\"One each. Don't fight over them.\"",
    result: "You roll them down and toss them over. Two of them nearly come to blows.",
  },
  blouse: {
    dare: "\"The chemise too, innkeeper! You've come this far.\" The whole table is chanting.",
    accept: "Pull the chemise over your head",
    say: "\"Fine. But that's plenty for one night.\"",
    result: "The chemise comes off, and you stand in your smallclothes while coins rain onto the table.",
  },
  tunic: {
    dare: "\"Too warm in here for a tunic. Off with it!\" They grab a fistful of the hem.",
    accept: "Pull your tunic over your head",
    say: "\"If it'll stop you pestering me.\"",
    result: "You pull it off and toss it over your shoulder. The room hollers and coins clatter on the table.",
  },
  trousers: {
    dare: "\"Trousers next! Let's see what the baron's tax left you.\" They're already pulling at your belt.",
    accept: "Drop your trousers",
    say: "\"The belt stays on. I've some dignity left.\"",
    result: "Down to your braies and boots. The room howls and slaps the table.",
  },
  bra: {
    dare: "\"The band next! Let's see what it's been holding up all night.\" A hand tugs at the knot behind your back.",
    accept: "Untie your breast band",
    say: "\"Mind the knot. It's tied at the back.\"",
    result: "The band loosens and falls away. The room roars, and coins clatter onto the table.",
  },
  smalls: {
    dare: "\"All of it, innkeeper! Every last stitch!\" The whole room is on its feet, banging their cups.",
    accept: "Take off your smallclothes",
    say: "\"Every last stitch, then. You'd better make it worth my while.\"",
    result: "The last of your smallclothes drops to the boards. The room erupts, and coins rain onto the table.",
  },
  ribbons: {
    dare: "\"Those pretty green ribbons! One for my hat, innkeeper.\" A finger hooks under the bow on your arm.",
    accept: "Untie your arm ribbons",
    say: "\"One each side. Don't lose them.\"",
    result: "The ribbons slip off your sleeves and get tied round two tankards. The table cheers its new decorations.",
  },
  sleeves: {
    dare: "\"Those fancy sleeves are wasted in a tavern. Slip them off, priestess!\"",
    accept: "Slide off your sleeves",
    say: "\"Gently. They tear if you look at them wrong.\"",
    result: "You peel the sleeves down your arms and drape them over the nearest shoulder. Somebody bows to you.",
  },
  top: {
    dare: "\"All that gold on your chest! Let's see if it's real.\" They reach for the clasp at your back.",
    accept: "Unclasp your gold top",
    say: "\"It's real. And it costs more than your horse.\"",
    result: "The gold top comes away with a clink. The room gasps, then stamps and cheers.",
  },
  drapes: {
    dare: "\"Those drapes are hiding the view! Let them fall!\" Someone gathers a fistful of silk.",
    accept: "Unhook your drapes",
    say: "\"Front and back, then. Try not to drool on them.\"",
    result: "The drapes slide from the girdle and pool on the boards. The whole room roars.",
  },
  girdle: {
    dare: "\"And that gold belt! It's holding nothing up any more.\" They pick at the clasp at your hip.",
    accept: "Let them have your girdle",
    say: "\"Weigh it if you like. You can't afford it.\"",
    result: "The girdle comes off in a jingle of gold and goes round the table from hand to hand.",
  },
  // The bunny set's own.
  ears: {
    dare: "\"Hop over here, bunny! Give us those ears, I want to wear them.\" A hand reaches for the band on your head.",
    accept: "Hand over your bunny ears",
    say: "\"Careful. They suit me better than they'll suit you.\"",
    result: "The ears come off your head and go straight on a bearded farmhand. The table howls.",
  },
  bowtie: {
    dare: "\"That little pink bow at your throat! Pull the end of it, go on.\"",
    accept: "Untie your bow tie",
    say: "\"Pull it yourself, if your hands are steady enough.\"",
    result: "The bow comes loose with one tug and gets tied round somebody's tankard handle.",
  },
  collar: {
    dare: "\"Collar and cuffs, like a lord's servant. Unbutton them, bunny!\"",
    accept: "Unbutton your collar and cuffs",
    say: "\"Neck first, then the wrists. Watch closely.\"",
    result: "The white collar and cuffs come off one by one and land in a little pile among the mugs.",
  },
  tail: {
    dare: "\"I've been eyeing that fluffy tail all night. Turn round and let me have it.\"",
    accept: "Let them pluck your tail",
    say: "\"Turn round, he says. As if you weren't looking already.\"",
    result: "You turn and bend a little, and someone plucks the tail off your bottom to loud cheers.",
  },
  // The babydoll's and the corset gown's.
  straps: {
    dare: "\"Those little straps aren't hiding anything anyway. Unclip them!\" A finger hooks under the one at your neck.",
    accept: "Unclip your choker and straps",
    say: "\"You're right, they aren't. Off they come.\"",
    result: "The choker clicks open and the straps slither down over your breasts. The table whistles.",
  },
  trim: {
    dare: "\"All that lace! Let's have it, one strip at a time.\" Somebody pinches the edge and tugs.",
    accept: "Let them tear off your lace",
    say: "\"Slowly. It took a seamstress a week.\"",
    result: "The lace comes away in long strips and gets wound round wrists and tankards all down the table.",
  },
};

/** The lines for a garment: its own if it has them, otherwise ones made from what it's called. */
export function stripPiece(garment: { id: string; label: string; styled?: boolean }): StripPiece {
  // Her band's and braies' own lines don't fit a thong or a bodysuit worn in their place.
  const written = garment.styled ? undefined : DARES[garment.id];
  if (written) return { id: garment.id, ...written };
  const { label } = garment;
  return {
    id: garment.id,
    dare: `"Off with that ${label}, innkeeper!" A hand is already reaching for it.`,
    accept: `Let them have your ${label}`,
    say: `"Fine. Just the ${label}."`,
    result: `Your ${label} comes off to whistles and stamping.`,
  };
}

/** Gold for each piece; every one after the first is worth more to the room. */
export const STRIP_GOLD = 3;
export const STRIP_GOLD_STEP = 2;

/** Your answers when a guest goes for your clothes: let them have it, or slap their hand away. */
export function stripReplies(piece: StripPiece, alreadyOff: number): Reply[] {
  const gold = STRIP_GOLD + alreadyOff * STRIP_GOLD_STEP;
  return [
    {
      id: `strip.${piece.id}`,
      label: piece.accept,
      say: piece.say,
      result: `${piece.result} (+${gold} gold)`,
      gold,
      trust: 0,
      heat: 0,
      persona: { flirt: 1, respect: -1, fame: 2 },
      strip: true,
    },
    {
      id: "strip.no",
      label: "Slap their hand away",
      say: "\"Hands on your cup, not on me.\"",
      result: "They snatch their hand back, and the table laughs at them instead of you.",
      gold: 0,
      trust: 0,
      heat: 0,
      persona: { respect: 1 },
    },
  ];
}
