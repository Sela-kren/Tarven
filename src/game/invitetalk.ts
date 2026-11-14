/**
 * The words for an invitation, told as a little story: what the guest says to ask her, how the room takes it,
 * the walk up the stairs and the room at the top, or (her choice) staying down in the taproom with them and
 * whoever else in the room wants in, and the morning after.
 *
 * House rules hold here as everywhere (STORY.md, top): everyone is an adult, every beat is asked and hers to
 * answer, and nothing here is graphic. The scenes themselves stay as 18+ cards with one short line each.
 * Guests are "they": the room is full of all sorts. She's a grown woman who never had anyone court her.
 *
 * Lines a guest says are written without quote marks: the tavern adds them, as it does for every guest line.
 * The rules for who joins and what it costs are in `taproom.ts`.
 */
import type { GuestKind } from "./tavern";

/** One of a set of lines, by a roll from 0 to 1. */
export function pickLine(lines: readonly string[], roll: number): string {
  return lines[Math.min(lines.length - 1, Math.max(0, Math.floor(roll * lines.length)))];
}

/** What they say to ask her up, by kind of guest: said before they reach for her hand (or her ear, or a key). */
export const INVITE_ASKS: Record<GuestKind, readonly string[]> = {
  farmer: [
    "I've been working up to this all night, so I'll just say it plain. There's a room upstairs, and I'd like to spend the night in it with you.",
    "Ma always said, if you want something, ask for it. So I'm asking. Will you come up with me?",
    "I'm up at dawn for the plough. I'd rather not sleep at all, if you'd have me.",
  ],
  soldier: [
    "I've leave till first bell. I'd rather spend it upstairs with you than down here with this lot.",
    "Tomorrow they march us up the pass again. Tonight I'd like to be with you. If you'll have me.",
    "The sergeant says take what's offered. Nobody's offered. So I'm asking: come up?",
  ],
  smuggler: [
    "I deal in things nobody needs to know about. You'd be the best of them. Your room, or mine?",
    "I'd trade a whole cargo for one night upstairs with you. And I don't say that about cargo.",
    "Quiet word. The stairs, you and me, and nobody down here any the wiser.",
  ],
  fugitive: [
    "I don't know where I'll sleep tomorrow. I'd like to know where I'll sleep tonight. With you, if you'll have me.",
    "I've been running a long time. Let me stop, just for one night. Upstairs?",
    "Nobody here knows my name. You could. Come up with me.",
  ],
  adventurer: [
    "We're off to the ruins at dawn, and not all of us come back. Give me a night worth coming back for?",
    "I've faced worse than my own nerves. Barely. Come upstairs with me?",
    "Every inn on the road has a story. I'd like ours to be the best one.",
  ],
  bandit: [
    "I take what I want, mostly. Not this. This I'm asking for. Upstairs?",
    "Say no and I'll go quiet as a mouse. Say yes and I'll make it worth your while.",
    "The road's cold and the boss is colder. You're neither. Come up with me.",
  ],
  noble: [
    "Forgive the directness; I'm told it's the custom here. I've taken the best room. Will you join me in it?",
    "At court this would take a month of letters. I'd rather simply ask. Will you come up?",
    "I'm used to having things brought to me. Tonight I'd rather walk up those stairs beside you.",
  ],
};

/** The room, as the question hangs there: before she answers. */
export const INVITE_HUSH: readonly string[] = [
  "The table beside them has gone quiet. Nobody's pretending not to listen.",
  "A cup stops halfway to someone's mouth. The whole room has heard.",
  "Somebody whistles low across the room, and somebody else shushes them so they can hear your answer.",
];

/** The room, once she's said yes: some cheer, some pretend not to watch. */
export const INVITE_ROOM_YES: readonly string[] = [
  "A cheer goes up from the far table, and someone bangs a cup on the boards.",
  "The room pretends not to watch, and watches anyway.",
  "Someone at the bar grumbles about who'll pour the ale now. Someone else tells them to hush.",
];

/** On the invitation card, when nobody else in the room is up for more: just the stairs. */
export const INVITE_CHOICE: readonly string[] = [
  "They wait at the foot of the stairs with a hand held out. It's still yours to take, or not.",
  "They're on the bottom step, waiting for you. Nobody's going to rush you.",
];

/** On the invitation card, when others in the room want in: someone calls out, and the taproom's an answer too. */
export const INVITE_CHOICE_ROOM: readonly string[] = [
  "\"Why go up?\" someone calls from across the room. \"Stay down here with the rest of us!\" A few cups bang the tables in agreement.",
  "Nobody's looking at their drink any more. \"No need for the stairs,\" somebody says. \"There's room enough down here, and company.\"",
];

/** The walk up the stairs, by kind of guest. */
export const STAIRS: Record<GuestKind, readonly string[]> = {
  farmer: [
    "They take the stairs like they're walking into chapel, cap in their hands, and at the top they wait for you to lead.",
    "They climb behind you, careful on every step, as if the stairs might tell on them.",
  ],
  soldier: [
    "They take the stairs two at a time, then remember themselves and wait at the top, very nearly at attention.",
    "Their boots are loud on every step. At the top they unbuckle their sword belt and hang it on your door.",
  ],
  smuggler: [
    "They know which step creaks and skip it, and smile when you notice.",
    "They follow you up without a sound. You only know they're there by the hand at the small of your back.",
  ],
  fugitive: [
    "They glance back at the door once, then not again. Their hand doesn't leave yours all the way up.",
    "Halfway up they stop and just breathe, as if it's the first time in weeks nobody's been behind them.",
  ],
  adventurer: [
    "They bring their pack up out of habit, and drop it in the doorway with a laugh.",
    "They take the stairs like a dungeon, mock-careful, and make you laugh all the way to the top.",
  ],
  bandit: [
    "They let you go up first. You can feel them watching you climb, and you find you don't mind.",
    "They check the window before anything else, out of habit, then turn back to you and stop checking anything.",
  ],
  noble: [
    "They climb your narrow stairs as if they were a palace staircase, and bow you in through your own door.",
    "They duck under the low beam, laugh at themselves, and for once look nothing like a lord.",
  ],
};

/** The room at the top: the first time, and every time after. */
export const UPSTAIRS_ROOM_FIRST =
  "Your room under the eaves: a narrow bed, one candle, and the noise of the bar coming up through the boards. You've never brought anyone up here.";
export const UPSTAIRS_ROOM_AGAIN: readonly string[] = [
  "The same narrow bed, the same candle. The noise of the bar comes up through the boards, and you hardly hear it now.",
  "You know this room in the dark by now. You light the candle anyway, so you can see them.",
];

/** The morning after a night upstairs, by kind of guest: said as she wakes. */
export const MORNING_AFTER: Record<GuestKind, readonly string[]> = {
  farmer: [
    "Morning. The farmer left before dawn for the fields, and there's a fistful of wildflowers on your pillow.",
    "Morning. The farmer's mended your shutter on the way out. It hasn't closed properly in years.",
  ],
  soldier: [
    "Morning. The soldier's gone to muster. Their scarf is on your chair, folded neat as a uniform.",
    "Morning. You hear the garrison horn down the valley, and the soldier's side of the bed is still warm.",
  ],
  smuggler: [
    "Morning. The smuggler's long gone. There's a twist of good salt by the candle, and no note.",
    "Morning. The smuggler left a coin on the sill, and a map of the back roads scratched into the dust beside it.",
  ],
  fugitive: [
    "Morning. The stranger is still asleep when you get up: the first sound sleep they've had in weeks, by the look of them.",
    "Morning. The stranger's gone, but they've written a name on the back of your hand in ink. Their real one, maybe.",
  ],
  adventurer: [
    "Morning. The adventurer's carved a little mark into your bedpost, for luck, they said, and gone off toward the ruins.",
    "Morning. The adventurer left a strange old coin on your pillow, \"from the ruins\", and a promise to come back.",
  ],
  bandit: [
    "Morning. The bandit's gone out of the window, the way you half expected. Your purse is still there. You check twice.",
    "Morning. The bandit's left a red scarf knotted round your bedpost. Nobody on the road will trouble this house now.",
  ],
  noble: [
    "Morning. A servant brings up a note on heavy paper: thanks in a fine hand, and a pressed flower.",
    "Morning. The noble's gone before you wake, and paid for the room twice over, with a word to the servant about discretion.",
  ],
};

/** The taproom, as she stays down: the room makes space, and the door gets barred. */
export const TAPROOM_START: readonly string[] = [
  "Nobody heads for the stairs. Somebody drags a table aside, somebody else bars the door, and the fire is banked up high.",
  "Benches scrape back. Someone bars the door and someone lights another candle, and the taproom's all yours.",
];

/** What a guest who wants in says, by kind: every one asks, and she chooses who. */
export const JOIN_ASKS: Record<GuestKind, readonly string[]> = {
  farmer: ["Room for one more? I'll mind my manners.", "If you'll have me too, I'd like that. If not, I'll just cheer."],
  soldier: ["Permission to join? Only if you say so.", "Make room. If she'll have me, that is."],
  smuggler: ["Mind if I deal myself in?", "I could watch. I'd rather not. Your call, sweet."],
  fugitive: ["Only if you want me there. Do you?", "Could I... join you? You can say no."],
  adventurer: ["A party's a party. Can I join?", "We never leave anyone out on the road. Room for me?"],
  bandit: ["Got room for a rogue? Ask nicely and I'll behave.", "I'm asking, not taking. Me too?"],
  noble: ["How delightfully improper. May I?", "I've never done anything of the sort. May I begin tonight?"],
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
  "Morning. The taproom smells of spilt ale and candle smoke. Someone's scratched a tally on the bar, and you scrub it off before anyone sees.",
  "Morning. You find a stranger's belt under a bench, and more coin in the tip jar than you remember.",
  "Morning. The village is talking. You hear your own name twice before you've opened the shutters.",
];
