/**
 * The words for adult play, Karryn's Prison style (KP's Waitress Sex, GAME_PATH.MD 7f): mid-shift, a guest with his
 * hands on her wants her down on a table right here in the taproom, and the room wants in. What they say to ask her,
 * how the room takes it, the table, and the morning after.
 *
 * Every beat is still asked and hers to answer (the consent rule): everyone is an adult, Pull away is always there,
 * and too drunk on either side, nobody asks. The lines are as raw as KP's.
 *
 * Lines a guest says are written without quote marks: the tavern adds them, as it does for every guest line.
 * The rules for when it comes up are in `adultplay.ts`; who joins and what it costs, `taproom.ts`.
 */
import type { GuestKind } from "./tavern";

/** One of a set of lines, by a roll from 0 to 1. */
export function pickLine(lines: readonly string[], roll: number): string {
  return lines[Math.min(lines.length - 1, Math.max(0, Math.floor(roll * lines.length)))];
}

/** What they say to ask her onto the table, by kind of guest: said as they get their hands on her. */
export const INVITE_ASKS: Record<GuestKind, readonly string[]> = {
  farmer: [
    "Missus, I can't take it no more. Lie back on this table and let me have you, right here.",
    "I'll clear the plates off myself. Just you get up there and open them legs for me.",
    "You've been wiggling past me all night. Bend over this table, missus, and I'll plough you proper.",
    "Never had a woman on a table before. Let me have you on this one?",
  ],
  soldier: [
    "On the table, innkeeper. Legs apart. That's not an order. Yet.",
    "I've been staring at that arse all night. Bend over the table and let me have it.",
    "We march at dawn. Tonight I want you on this table, in front of the whole squad.",
    "Lie back. I'll have you here and now, and the lads can wait their turn.",
  ],
  smuggler: [
    "Here's the deal, sweetheart: you on this table, me between your legs, and the room gets a show.",
    "Why waste coin on a room? This table's sturdy enough. Lie back.",
    "Everyone's watching anyway. Let's give them something worth the price of the ale.",
    "I'll pay double for the table. Spread out on it for me.",
  ],
  fugitive: [
    "I can't wait. Not another minute. Get on the table. Please.",
    "Been so long. Let me have you right here, on the table, I don't care who sees.",
    "Lie back for me. I need to be inside you, now.",
    "They'll hang me tomorrow anyway. Tonight, let me have you on this table.",
  ],
  adventurer: [
    "I've conquered dungeons. Now let me conquer you, right here on the table!",
    "Every tavern has a legend. Be mine: on this table, in front of everyone.",
    "Lie back, beautiful. I'll give this room a tale they'll tell for years.",
    "A hero takes his reward where he finds it. Up on the table with you.",
  ],
  bandit: [
    "Table. Now. On your back, legs open, and don't make me ask twice.",
    "I've been wanting to fuck you since I walked in. Bend over that table.",
    "Get up there, whore, and spread 'em. Unless you say no, and you won't.",
    "Shove the tankards off. I'm having you on this table, if you'll let me.",
  ],
  noble: [
    "How rustic. I find I want you bent over one of your own tables. Will you oblige?",
    "Lie back on the table, girl. I want the peasants to watch what their betters get.",
    "I could have you in silk sheets. I'd rather have you on this filthy table, in front of them all.",
    "On the table, my dear. Consider it a command performance.",
  ],
};

/** The room, as the question hangs there: before she answers. */
export const INVITE_HUSH: readonly string[] = [
  "The table beside them has gone quiet. Nobody's pretending not to listen.",
  "A cup stops halfway to someone's mouth. The whole room has heard.",
  "Somebody whistles low across the room, and somebody else shushes them so they can hear your answer.",
  "Every head in the taproom turns your way. Somebody's already clearing a table.",
];

/** The room, once she's said yes: they cheer, they clear a table, they crowd in. */
export const INVITE_ROOM_YES: readonly string[] = [
  "A cheer goes up from the far table, and someone sweeps the tankards off the nearest one.",
  "The room pretends not to watch for all of a breath, then gives up and crowds round.",
  "Someone shouts \"She said yes!\" and the whole taproom roars.",
  "Plates and cups go crashing to the floor as they clear a table for you.",
];

/** On the card, when nobody else in the room is up for it yet: just the two of them, on the table. */
export const INVITE_CHOICE: readonly string[] = [
  "They've cleared a table and they're waiting, hands on your hips. It's still yours to say.",
  "They lift you onto the edge of the table and wait for your word.",
];

/** On the card, when others in the room want in: they're already crowding round the table. */
export const INVITE_CHOICE_ROOM: readonly string[] = [
  "They have you on the edge of the table, and the room is crowding round. \"Us too!\" somebody calls, and cups bang on every board.",
  "Nobody's looking at their drink any more. A ring of them closes round the table, cocks already out, waiting on your word.",
];

/** As the table opens up: drunk enough, or she's come enough this shift (adultplay.ts). */
export const TABLE_OPEN_LINES: readonly string[] = [
  "The taproom's gone warm and hazy. Their stares have you wet and aching; any of them could pull you onto a table and fuck you now.",
  "Heat fills the room and their eyes make your cunt throb. One more look and any of them could have you on a table, legs spread.",
  "Everything softens at the edges. They watch you like they might drag you onto a table and take you hard any moment.",
  "You cannot stop thinking about the tables and getting fucked on one until you come. Neither can they.",
  "Your thoughts keep returning to the tables and what it would feel like to be taken on them. Theirs do the same.",
  "You and they both keep glancing at the tables, picturing you spread and filled on one.",
  "Legs like water, head swimming. If one of them pulled you onto a table now, you'd probably spread for them.",
  "You're that far gone. A hand on your hip and you'd be on your back on the nearest table.",
  "Loose and warm and not sure you'd say no if they pushed you down on a table right now.",
];

/** On the table, as it starts: the room makes space, and the door gets barred. */
export const TAPROOM_START: readonly string[] = [
  "Tankards go flying as they sweep a table clear and lay you back across it. Somebody bars the door.",
  "They lift you up onto the nearest table, its boards sticky with ale, and the room crowds in round you.",
  "You're pushed down over a table, cheek against the wood, and the whole taproom gathers to watch.",
  "They clear a table with one swipe of an arm and you're on your back on it before you've caught your breath.",
];

/** What a guest who wants in says, by kind (KP's patrons joining): every one asks, and she chooses who. */
export const JOIN_ASKS: Record<GuestKind, readonly string[]> = {
  farmer: ["Room for one more on that table, missus? I'll be quick.", "Let me have a go too? Please? I'll cheer either way.", "Cor. Can I put it in your hand while he's at you?"],
  soldier: ["Permission to join? I'll take her mouth.", "Make room, private. If she'll have me, that is.", "Second in line, ma'am. Say the word."],
  smuggler: ["Mind if I deal myself in? Plenty of you to go round.", "I could watch. I'd rather not. Your call, sweet.", "Two for the price of one? Let me in."],
  fugitive: ["Me too. Please. Let me touch you too.", "Could I... could I have your mouth? You can say no.", "I'll wait my turn. Just let me have one."],
  adventurer: ["A party's a party! Room on the table for me?", "Never leave a comrade out. Can I join in?", "Saving the best for last. Me next?"],
  bandit: ["Got a hole free for me, girl? I'm asking. This once.", "Move over, mate. If she says I can.", "Open that pretty mouth for me too?"],
  noble: ["How delightfully improper. May I partake?", "I've never shared before. May I begin tonight?", "Your other hand looks idle, my dear. May I?"],
};

/** The same, from a woman who wants in: her own words, nothing she hasn't got. */
export const JOIN_ASKS_WOMEN: Record<GuestKind, readonly string[]> = {
  farmer: ["Room for one more on that table, missus? I've a quick tongue.", "Let me have a go too? I've milked enough cows to know what to do with my hands.", "Cor. Can I kiss you while they're at you?"],
  soldier: ["Permission to join, ma'am? I'll hold you steady.", "Make room, private. If she'll have a woman, that is.", "Second in line, ma'am. Gauntlets off. Say the word."],
  smuggler: ["Mind if I deal myself in, sweet? Plenty of you to go round.", "I could watch. I'd rather taste. Your call.", "Two girls for the price of one? Let me in."],
  fugitive: ["Me too? Please. I just want to touch you.", "Could I... could I kiss you down there? You can say no.", "I'll wait my turn. Just let me have one."],
  adventurer: ["A party's a party! Room on the table for a girl?", "Never leave a comrade out. Can I join in? I'm good with my hands.", "Saving the best for last. Me next, love?"],
  bandit: ["Shift over, lads. Let a woman show you how it's done. If she says I can.", "Got room for me, girl? I'm asking. This once.", "Open those pretty thighs for me too?"],
  noble: ["How delightfully improper. May a lady partake?", "I've never shared a girl before. May I begin tonight?", "Your mouth looks idle, my dear. May I sit?"],
};

/** After a lost brawl, she's said yes to the one who won: up the stairs to her room, just the two of them. */
export const BRAWL_ROOM_ONE: readonly string[] = [
  "You lead them up the stairs to your room under the eaves, sore and still breathing hard, and bar the door behind you.",
  "Up in your room, the noise of the taproom far below, they wait for you to say what's allowed.",
];

/** After a lost brawl, she's said yes to the one who won and their companions: {n} of them, up in her room. */
export const BRAWL_ROOM_CREW: readonly string[] = [
  "Up in your room under the eaves, {n} of them crowd in after you, and the door bangs shut. They wait for you to say what's allowed.",
  "You take the stairs with {n} of them behind you. The little room has never felt so full, and every one of them is looking at you.",
];

/** After a lost brawl, right where she fell: the room still there, and nobody heading for the door. */
export const BRAWL_HERE_ONE: readonly string[] = [
  "Right there on the boards where you went down, with the room still crowded round from the fight, they kneel over you and wait for you to say what's allowed.",
  "Nobody's gone back to their seat. A bench gets shoved aside, the cheering drops to a murmur, and they wait for your word, right there in the middle of the taproom.",
];
export const BRAWL_HERE_CREW: readonly string[] = [
  "Right where you fell, {n} of them close in round you, and the room that watched the fight stays to watch this. They wait for you to say what's allowed.",
  "The tables are still knocked crooked from the brawl. {n} of them gather round you on the floor, and the whole taproom holds its breath.",
];

/** After a lost brawl, out the back door into the yard: half private, under the stars. */
export const BRAWL_YARD_ONE: readonly string[] = [
  "Out the back door and into the yard, against the woodpile, the noise of the taproom muffled behind the wall. They wait for you to say what's allowed.",
  "The night air hits your hot face. Behind the water butt, in the dark of the yard, they wait for your word.",
];
export const BRAWL_YARD_CREW: readonly string[] = [
  "Out the back into the yard, {n} of them crowding after you past the water butt, the stars overhead. They wait for you to say what's allowed.",
  "{n} of them follow you out into the dark yard behind the tavern. Someone props the back door shut. They wait for your word.",
];

/** Consent off, a brawl she lost (KP's defeat): nobody asks. Right where she fell, the one who won. */
export const FORCED_HERE_ONE: readonly string[] = [
  "You're still on the boards where you went down when they drag you up onto your knees. Nobody asks you anything.",
  "They pin you to the floor where you fell, one knee on your skirt, and the room closes in to watch.",
  "Too dazed to get up, you feel them haul your hips back. \"You lost, innkeeper. Now you pay.\"",
];
/** Consent off, a brawl she lost, with the winner's whole company: {n} of them. */
export const FORCED_HERE_CREW: readonly string[] = [
  "{n} of them close in round you on the floor where you fell. Hands everywhere. Nobody's asking.",
  "\"Spoils, lads!\" {n} of them drag you into the middle of the taproom, and the room roars.",
  "You try to crawl away. {n} pairs of hands pull you back into the middle of them.",
];

/** How the taproom scene ends, by how it went: one short line for the 18+ card. */
export const TAPROOM_END = {
  won: [
    "One by one they give in, and the room roars. You straighten your hair and go back behind the bar as if nothing happened.",
    "The last of them gives in, and somebody starts a slow clap that the whole room takes up.",
  ],
  lost: [
    "It's too much, all of them at once, and you go first with the whole room watching. Nobody minds much, least of all you.",
    "You lose yourself somewhere in the middle of it, and the taproom cheers like it's a feast day.",
  ],
  stopped: [
    "You say stop, and they stop at once. The tables go back where they were, and the room goes back to its drink.",
    "\"That's enough,\" you say, and it is. They step back, and somebody hands you your apron.",
  ],
} as const;

/** The morning after a night in the taproom. */
export const TAPROOM_MORNING: readonly string[] = [
  "Morning. Taproom reeks of ale and sex. Someone scratched a tally on the bar. You scrub it off before the cook sees.",
  "Morning. The tables still smell of last night. A mark on the bar gets wiped clean quick.",
  "Morning. Candle smoke and spilt ale. You scrub the fresh scratches off the bar before anyone else is down.",
  "Morning. A belt under the bench that isn't yours. Tip jar heavier than it should be.",
  "Morning. Someone left a belt behind. More coin in the jar than the night's orders explain.",
  "Morning. A stranger's belt by the bench and the tip jar fuller than you left it.",
  "Morning. Village is already talking. You hear your name twice before the shutters are open.",
  "Morning. Gossip's flying. Your name's in it before you've even swept the floor.",
  "Morning. They're talking about last night. You catch your own name twice.",
];
