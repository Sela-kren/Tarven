/**
 * The message log's lines around her sex scenes (the log rewrite, batch 1). Each is a pool the game picks one line
 * from as it says it (pickLog), so the same moment doesn't read the same every night. Tokens in braces are filled
 * where the line is said (fillLog). Pools for lines kept in their own modules stay there: TABLE_OPEN_LINES and
 * TAPROOM_MORNING (invitetalk.ts), REDRESS_LINES (barwork.ts), the revel's lines (revel.ts), the defeat mornings
 * (defeat.ts), the sensitivity notes (lewd.ts) and the town heat summaries (towntalk.ts).
 */

/** One line from a pool, by a roll in 0 to 1. */
export function pickLog(lines: readonly string[], roll: number): string {
  return lines[Math.floor(roll * lines.length) % lines.length];
}

/** Fills a line's {tokens}; any it isn't given are left as they are. */
export function fillLog(text: string, tokens: Readonly<Record<string, string | number>> = {}): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in tokens ? String(tokens[key]) : whole));
}

/**
 * Who's on her in a scene: all men, all women, or both. Lines about what they do to her come in one set per crowd,
 * so a woman never gets a man's line (no cocks, no coming in her) and a mixed group gets both.
 */
export type Crowd = "men" | "women" | "mixed";

/** A pool written once per crowd. */
export type CrowdLines = Readonly<Record<Crowd, readonly string[]>>;

/** The crowd a set of partners makes (no one at all counts as men, the old default). */
export function crowdOf(partners: readonly { female: boolean }[]): Crowd {
  const women = partners.filter((p) => p.female).length;
  return women === 0 ? "men" : women === partners.length ? "women" : "mixed";
}

/** A steady roll in 0 to 1 from a few numbers: for pure rules that pick a line without a random source. */
export function seedRoll(...seeds: number[]): number {
  const x = Math.sin(seeds.reduce((sum, n, i) => sum + n * (12.9898 + i * 65.83), 0) + 0.5) * 43758.5453;
  return x - Math.floor(x);
}

/** On a taproom table with them, as it starts. {who}: "the farmer" or "3 of them". */
export const TABLE_START_LOG: CrowdLines = {
  men: [
    "You climb onto a table in the taproom and let {who} fuck you hard while you take it.",
    "You lie back on a taproom table and spread for {who}, taking them deep.",
    "On a table in the taproom you get pounded by {who}, bare and open.",
  ],
  women: [
    "You climb onto a taproom table and let {who} push your thighs apart, fingers and tongues first.",
    "You lie back on a taproom table and spread for {who}, soft hands and wet mouths all over you.",
    "On a taproom table, bare and open, you let {who} work you with fingers and tongue.",
  ],
  mixed: [
    "You climb onto a taproom table and let {who} have you: cocks at one end, soft mouths at the other.",
    "You lie back on a taproom table for {who}, the men pounding you while the women's hands roam everywhere.",
    "On a table in the taproom you take {who}, a man between your legs and a woman's tongue on your tits.",
  ],
};

/** The taproom table played out. {gold} {fame} {respect} {heat} {trust} as the code fills them. */
export const TABLE_END_LOG: CrowdLines = {
  men: [
    "The taproom is yours again once they have finished using you. +{gold} gold from them, fame +{fame}, respect {respect}.{heat}{trust}",
    "Quiet returns to the taproom after they pulled out and left you spent. +{gold} gold from them, fame +{fame}, respect {respect}.{heat}{trust}",
    "You have the taproom back once the last of them has come in you. +{gold} gold from them, fame +{fame}, respect {respect}.{heat}{trust}",
  ],
  women: [
    "The taproom is yours again once they've had their fill of you, tongues and fingers and all. +{gold} gold from them, fame +{fame}, respect {respect}.{heat}{trust}",
    "Quiet returns to the taproom after the last of them slides off you, flushed and grinning. +{gold} gold from them, fame +{fame}, respect {respect}.{heat}{trust}",
    "You have the taproom back once the last of them has come on your fingers and left you dripping. +{gold} gold from them, fame +{fame}, respect {respect}.{heat}{trust}",
  ],
  mixed: [
    "The taproom is yours again once the men have come in you and the women have had their turn on your face. +{gold} gold from them, fame +{fame}, respect {respect}.{heat}{trust}",
    "Quiet returns after the last cock pulls out and the last woman climbs off you, giggling. +{gold} gold from them, fame +{fame}, respect {respect}.{heat}{trust}",
    "You have the taproom back, filled by the men and licked half clean by the women. +{gold} gold from them, fame +{fame}, respect {respect}.{heat}{trust}",
  ],
};

/** She called the taproom table off: they stop at once. */
export const TABLE_STOP_LOG: readonly string[] = [
  "You told them no. They stepped back at once. No hands, no more of it. The room drinks on.",
  "You called it off sharp. They stopped and backed off. Nothing more happens.",
  "Stop. They pull away at once and leave you be. The taproom goes back to its ale.",
];

/** A lost brawl, the winner asked and she said yes: right there. {them}: "them" or "3 of them". */
export const BRAWL_HERE_LOG: CrowdLines = {
  men: [
    "You go down on the taproom floor with {them} and take them while the room watches you get filled.",
    "Right there on the sawdust with {them}, you spread and let them fuck you as everyone stares.",
    "You take {them} on the taproom floor, bare and open, with the whole room looking on.",
  ],
  women: [
    "You go down on the taproom floor with {them} and let their fingers and tongues have you while the room watches.",
    "Right there on the sawdust with {them}, you spread and let them grind and lick you as everyone stares.",
    "You take {them} on the taproom floor, bare and open, thighs tangled, the whole room looking on.",
  ],
  mixed: [
    "You go down on the taproom floor with {them}: the men take turns filling you while the women keep your mouth busy.",
    "Right there on the sawdust with {them}, cocks and soft hands everywhere, and everyone stares.",
    "You take {them} on the taproom floor, men and women both, bare and open with the whole room looking on.",
  ],
};

/** The same, out in the yard. */
export const BRAWL_YARD_LOG: readonly string[] = [
  "You drag {them} out into the yard, already undoing your laces.",
  "Out back in the yard with {them}, against the wall where anyone could see.",
  "You take {them} into the yard. The cold air on your skin as they push you against the wall.",
];

/** The same, up in her room. */
export const BRAWL_ROOM_LOG: readonly string[] = [
  "You pull {them} up the stairs to your room, laces already loose.",
  "Up to your room with {them}. The door barely shuts before you're on the bed.",
  "You take {them} upstairs. Your room, your bed, and no one watching but them.",
];

/** Consent off, a lost brawl: nobody asks. {they}: "they" or "3 of them". */
export const FORCED_FLOOR_LOG: readonly string[] = [
  "Down on the taproom floor where you fell, {they} take you while the room watches.",
  "You're on the floor and {they} don't ask. The room just watches them use you.",
  "Right where you went down, {they} have you on the floor and the whole room sees.",
];

/** Intruders beat her on her own floor. */
export const INVADED_DOWN_LOG: readonly string[] = [
  "You're down on your own floor and they're standing over you, already undoing their belts.",
  "On your own floor, beaten, and they're standing over you with their cocks out.",
  "You're down and they're over you. No one asks. They're just going to take what they want.",
];

/** She eased the ache herself, and someone heard. {who}: "3 of them" or "The farmer". */
export const HEARD_YOU_LOG: readonly string[] = [
  "Someone heard you touching yourself. {who} came back in.",
  "They heard the sounds from your room. {who} came back in.",
  "Your moans carried. {who} came back in.",
];

/** An after-hours game: they gave in first. {gold}. */
export const GAME_WON_LOG: readonly string[] = [
  "You won the game. They're spent and you're not. +{gold} gold.",
  "You held out longer. They gave in first. +{gold} gold.",
  "You won. They finished before you did. +{gold} gold.",
];

/** Its result line. */
export const GAME_WON_LINE: readonly string[] = [
  "They give in first. You win, and the candle burns down on the two of you still joined.",
  "They come first. You win. Candle gutters on the two of you.",
  "They finish before you. You win. Candle burns low on you both.",
];

/** An after-hours game: she gave in first. {paid}. */
export const GAME_LOST_LOG: readonly string[] = [
  "You lost the game. You came first. -{paid} gold.",
  "You couldn't hold out. You went first. -{paid} gold.",
  "You lost. You finished before they did. -{paid} gold.",
];

/** Its result line. */
export const GAME_LOST_LINE: readonly string[] = [
  "It's too much and you go first. Neither of you minds losing much when it's like this.",
  "You come first. Too much. Neither of you cares much about the game after that.",
  "You give in first. It's too good to hold back. Neither of you minds.",
];

/** She stopped the game: nothing more after it. */
export const GAME_STOPPED_LOG: readonly string[] = [
  "You called it off. Nothing lost. They kiss your hand goodnight and go. Nothing more.",
  "You stopped it. They kiss your hand and leave. That's the end of it.",
  "You called it off. They kiss your hand goodnight and go. No more after that.",
];

/** Consent off: the revel puts her in the middle. {n}: "3 of them" or "one of them". */
export const REVEL_CENTRE_FORCED_LOG: readonly string[] = [
  "The hall makes room in the middle and you're at the heart of it: {n}. No asking.",
  "They make space in the middle and you're in it with {n}. The hall watches.",
  "Room in the middle and you're the one in it: {n}. They don't wait for yes.",
];

/** They want her in the middle, but she's too drunk: nothing happens to her. */
export const REVEL_TOO_DRUNK_LOG: readonly string[] = [
  "They want you in the middle but you've had too much. The room carries on without you.",
  "They want you in the middle. You're too drunk. Nothing happens. The room goes on.",
  "They want you in the heart of it but you're too far gone. Room carries on without you.",
];

/** They want her in the middle: hers to answer at bedtime. {n}: "3 of them want" or "One of them wants". */
export const REVEL_ASK_LOG: CrowdLines = {
  men: [
    "{n} you right in the middle of it, to be fucked by all of them. Yours to say yes or no at bedtime.",
    "{n} you smack in the thick of things, legs spread for the lot. The choice remains yours at bedtime.",
    "{n} you at the heart of it, to take them one after another. You can still say yes or no come bedtime.",
  ],
  women: [
    "{n} you right in the middle of it, to be licked and fingered by all of them. Yours to say yes or no at bedtime.",
    "{n} you smack in the thick of things, a tangle of women all over you. The choice remains yours at bedtime.",
    "{n} you at the heart of it, to ride their thighs and faces one after another. You can still say yes or no come bedtime.",
  ],
  mixed: [
    "{n} you right in the middle of it, the men to fuck you and the women to have their turn. Yours to say yes or no at bedtime.",
    "{n} you smack in the thick of things, cocks and tongues and the lot. The choice remains yours at bedtime.",
    "{n} you at the heart of it, men and women taking turns. You can still say yes or no come bedtime.",
  ],
};

/** Morning: they wanted her at the revel, but she'd gone to bed. {n}: a number. */
export const REVEL_MISSED_LOG: readonly string[] = [
  "{n} of them wanted you at the revel, but you'd already gone up to bed.",
  "{n} of them were looking for you at the revel. You were already in bed.",
  "{n} of them wanted you down there. You'd gone up to bed already.",
];

/** Her pleasure past 70. */
export const CLOSE_LOG: readonly string[] = [
  "You're getting close... cunt clenching.",
  "Getting close. Legs shaking.",
  "So close you can barely stand.",
];

/** Her pleasure right at the edge. */
export const EDGE_LOG: readonly string[] = [
  "So close— right on the edge.",
  "So close— almost there.",
  "Right on the edge—",
];

/** One piece of her clothing off. */
export const PIECE_OFF_LOG: readonly string[] = [
  "A piece comes off. Cool air on your skin.",
  "Something comes off. You're more bare.",
  "A piece of clothing comes off.",
];

/** Two or more pieces off. */
export const MORE_OFF_LOG: readonly string[] = [
  "More clothes gone. You're really exposed now. They can see everything.",
  "More off. You're bare enough that nothing's hidden.",
  "More clothes gone. You're properly exposed.",
];

/** A guest grabs her while she works. {guest}: "farmer"; {when}: "take their order" or "serve them". */
export const GRAB_LOG: readonly string[] = [
  "A {guest} grabs you as you {when} and shoves a hand between your legs.",
  "A {guest} grabs you as you {when}. Doesn't let go quick.",
  "A {guest} grabs you as you {when}. Hand stays where it is.",
];

/** A guest offers gold for a look. {guest}; {part}. */
export const SHOW_OFFER_LOG: readonly string[] = [
  "A {guest} offers gold for a look at your {part}. Coin on the bar.",
  "A {guest} puts gold down for a look at your {part}.",
  "A {guest} offers gold just to see your {part}.",
];

/** She showed them (a look only). {part}; {gold}. */
export const SHOWED_LOG: readonly string[] = [
  "You bare your {part} and hold still while they look their fill. +{gold} gold.",
  "You give them a slow, close look at your {part}, and they don't blink once. +{gold} gold.",
  "They stare at your {part} until you cover up again, flushed. +{gold} gold.",
];

/** She let a grab happen and got paid. {gold}. */
export const GRAB_GOLD_LOG: readonly string[] = [
  "+{gold} gold: they like a girl who doesn't pull away when they grab.",
  "+{gold} gold for not pulling away when they put their hands on you.",
  "+{gold} gold. They like that you stayed put.",
];

/** A desire meter gets strong: bolder touches unlocked, and it gets in her way in a brawl. {Part}. */
export const DESIRE_STRONG_LOG: readonly string[] = [
  "{Part} desire is getting strong: bolder touches there are on the table, and it'll get in your way in a brawl.",
  "{Part} desire's strong now. Bolder touches are allowed, but it'll hinder you in a fight.",
  "{Part} desire is high: bolder touches unlocked, and it will hurt you in a brawl.",
];

/** A desire meter hits horny. {Part}. */
export const HORNY_LOG: readonly string[] = [
  "{Part} desire is burning. You're horny as hell.",
  "{Part} desire's on fire. You're properly horny.",
  "{Part} desire is burning. You need it.",
];
