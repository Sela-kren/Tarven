/**
 * The brawl log's lewd lines (GAME_PATH.MD 7i), Karryn's Prison's battle log style (RemLines.json, as raw as KP's):
 * what a foe does to her, what she does with him (clumsy her first times, eager once she's used to it), and what the
 * room shouts. What he says is brawlvoices.ts; what she says back, brawlher.ts. Each list is picked from at random;
 * `{Name}` / `{name}` is the foe ("the bandit"), `{Who}` someone in the room.
 */
import type { LewdPart } from "./brawlai";
import type { DuelArea } from "./duel";
import type { JoinSlot } from "./sexpose";

/** Him staring at what's bare of her, by the part. */
export const SIGHT_LINES: Readonly<Record<LewdPart, readonly string[]>> = {
  mouth: [
    "{Name} stares at your lips, breathing hard.",
    "{Name} licks his own lips, watching yours.",
    "{Name} can't take his eyes off your mouth.",
    "{Name} watches you pant, wide-eyed, palming his crotch.",
    "{Name} stares at your open mouth like he's measuring it.",
  ],
  breasts: [
    "{Name} stops dead to gawp at your bare tits.",
    "{Name}'s eyes are glued to your chest as it heaves.",
    "{Name} forgets to swing, staring at your bare breasts bouncing.",
    "{Name} groans at the sight of your nipples, hard and pink.",
    "{Name} leans in for a better look at your tits.",
    "{Name} rubs his cock through his trousers, eyes on your chest.",
  ],
  butt: [
    "{Name} leers at your bare arse as you turn.",
    "{Name} whistles at your bare arse.",
    "{Name} tilts his head to follow your rear as you dodge.",
    "{Name} stares at your bare backside, rubbing himself.",
    "{Name}'s gaze drops to your arse and stays there.",
    "{Name} watches your cheeks bounce and licks his lips.",
  ],
  pussy: [
    "{Name} stares between your legs, slack-jawed.",
    "{Name} can't stop looking at your bare cunt.",
    "{Name} drops to a crouch to get a better look between your legs.",
    "{Name} sees how wet you are and grins.",
    "{Name}'s breath catches at the sight of you, bare and glistening.",
    "{Name} watches a drop run down your thigh and groans.",
  ],
  cock: [
    "{Name} palms himself through his trousers, staring at you.",
    "{Name} adjusts his trousers, eyeing you up and down.",
    "{Name} squeezes the bulge in his trousers.",
    "{Name} pulls his cock out and strokes it, watching you.",
    "{Name} shows you exactly how hard you've made him.",
  ],
};

/** Him starting a scene with her, by the part of her he takes. */
export const OFFER_LINES: Readonly<Record<DuelArea, readonly string[]>> = {
  hands: [
    "{Name} catches your wrist and pulls your hand down onto his cock.",
    "{Name} pins you to a post and shoves your hand down his trousers.",
    "{Name} grabs your hand and wraps it round his shaft.",
    "{Name} presses up against you and guides your hand to his hard cock.",
    "{Name} pulls his cock out and pushes it into your palm.",
  ],
  mouth: [
    "{Name} grabs a fistful of your hair and pushes you down onto your knees in front of his cock.",
    "{Name} forces you down to your knees and pulls himself out, right at your lips.",
    "{Name} shoves your head down to his crotch.",
    "{Name} drags you down to the floorboards and stands over you, cock out.",
    "{Name} pinches your nose until you open your mouth, then shoves his cock in.",
  ],
  breasts: [
    "{Name} shoves you against the bar and pushes his cock between your bare tits.",
    "{Name} pushes you down on a bench and straddles your chest.",
    "{Name} grabs both your breasts and squeezes them round his cock.",
    "{Name} kneels over you and slaps his cock down between your tits.",
    "{Name} spits between your breasts and pushes himself in.",
  ],
  pussy: [
    "{Name} gets you down on the floorboards and forces your knees apart.",
    "{Name} sweeps the tankards off a table and lays you back on it, legs spread.",
    "{Name} hoists you up by the thighs and lines his cock up with your cunt.",
    "{Name} pins you on your back in the sawdust and pushes between your legs.",
    "{Name} rubs the head of his cock up and down your wet slit.",
  ],
  butt: [
    "{Name} bends you over a table, your face in the spilled ale, and drags your hips back against his cock.",
    "{Name} pins you face-down over the bar and yanks your hips back.",
    "{Name} spins you round and presses his cock against your bare arse.",
    "{Name} forces you down on all fours and spreads your cheeks.",
    "{Name} spits on your arse and presses the head of his cock against it.",
  ],
};

/** Her letting him: the scene starts. */
export const TAKEN_LINES: Readonly<Record<DuelArea, readonly string[]>> = {
  hands: [
    "Your hand closes round his cock. He groans.",
    "You wrap your fingers round him, hot and hard and twitching.",
    "You start to stroke his cock, right there in the taproom.",
    "His cock throbs in your fist as you start to pump it.",
  ],
  mouth: [
    "You open your mouth and take his cock in, there in front of everyone.",
    "Your lips close round his cock, and the room goes quiet.",
    "You take him in your mouth, his hands in your hair.",
    "He pushes his cock past your lips, all the way to your throat.",
  ],
  breasts: [
    "You squeeze your tits together round his cock and let him rut between them.",
    "You press your breasts tight round his shaft.",
    "You let him slide his cock between your tits.",
    "His cock pokes up between your breasts, leaking on your chin.",
  ],
  pussy: [
    "He shoves his cock into your cunt, and the whole room hears you gasp.",
    "He sinks into you in one long thrust, all the way to the hilt.",
    "He fills your cunt up, and you cry out.",
    "His cock spreads you open, and he starts to fuck you in front of the whole room.",
  ],
  butt: [
    "He forces his cock into your arse, and you grip the table edge white-knuckled.",
    "He pushes into your arse, inch by inch.",
    "He takes your arse, and you bite back a scream.",
    "His cock stretches your arse wide, and he starts to pound you.",
  ],
};

/** His turn in a scene with her. */
export const POSE_LINES: Readonly<Record<DuelArea, readonly string[]>> = {
  hands: [
    "{Name} thrusts into your fist, grunting.",
    "{Name} squeezes your hand tighter round his cock.",
    "{Name} rocks his hips, fucking your hand.",
    "{Name} gropes your tits while you stroke him.",
    "{Name} pants in your ear, pushing his cock into your grip.",
    "{Name} leaks precum all over your fingers.",
  ],
  mouth: [
    "{Name} holds your head and fucks your mouth.",
    "{Name} pushes deeper. You gag around his cock.",
    "{Name} thrusts into your throat, groaning.",
    "{Name} pulls out to slap your face with his cock, then pushes back in.",
    "{Name} grips your hair and makes you take all of him.",
    "{Name} holds himself deep in your throat until you choke.",
    "{Name} fucks your face, his balls slapping your chin.",
  ],
  breasts: [
    "{Name} ruts between your tits, faster.",
    "{Name} pinches your nipples as he thrusts.",
    "{Name} squeezes your tits tighter round his cock.",
    "{Name} pushes up between them to your chin.",
    "{Name} grunts, sliding slick between your breasts.",
    "{Name} fucks your tits, his precum smearing your chest.",
  ],
  pussy: [
    "{Name} pounds into your cunt, the floorboards creaking.",
    "{Name} grabs your hips and drives his cock deeper.",
    "{Name} hammers into you, the table shaking.",
    "{Name} sucks your nipple while he fucks you.",
    "{Name} lifts your leg over his shoulder and fucks you deeper.",
    "{Name} grinds his cock against the deepest part of you.",
    "{Name} slaps your tits as he fucks you.",
  ],
  butt: [
    "{Name} slams his cock into your arse, the table rattling.",
    "{Name} spanks you as he fucks your arse.",
    "{Name} pulls your hair back as he pounds your arse.",
    "{Name} grinds deep into your arse.",
    "{Name} grips your hips and drives into your arse, hard.",
    "{Name} spreads your cheeks to watch his cock go in.",
    "{Name} reaches round to rub your cunt while he takes your arse.",
  ],
};

/** How she does it: clumsy her first times, steady once she's done it a while, eager once she loves it. */
export type Skill = "awkward" | "steady" | "eager";

/** Her going along with it, by the part of her and how she does it (KP's poseskill lines by experience). */
export const GO_ALONG_LINES: Readonly<Record<DuelArea, Readonly<Record<Skill, readonly string[]>>>> = {
  hands: {
    awkward: ["You clumsily tug at his cock.", "You grip him too hard, then too soft, unsure.", "You stroke him slowly, staring at it."],
    steady: ["You stroke him faster, twisting your wrist.", "You run your thumb round the head of his cock.", "You pump him, slow, then fast."],
    eager: ["You jerk him off fast and hard, grinning.", "You cup his balls and squeeze while you stroke him.", "You spit in your palm and work his cock with both hands."],
  },
  mouth: {
    awkward: ["You timidly lick the tip of his cock.", "You suck the head of him, awkward and slow.", "You gag as you try to take more of him."],
    steady: ["You suck him hard, your tongue working.", "You bob your head on his cock.", "You swirl your tongue round the head of his cock."],
    eager: ["You take his cock all the way down your throat.", "You slurp and suck him like he's the best thing you've ever tasted.", "You deepthroat him, your nose in his belly."],
  },
  breasts: {
    awkward: ["You press your breasts round him, unsure.", "You rub your tits on him clumsily.", "You hold your breasts together and let him move."],
    steady: ["You bounce your tits on his cock, squeezing tight.", "You press them tight round him and rock.", "You lick the head of him as it pokes up between them."],
    eager: ["You drool between your tits and fuck him with them.", "You squeeze your tits round his cock and bounce hard.", "You suck the tip of his cock every time it pops up between your breasts."],
  },
  pussy: {
    awkward: ["You lie stiff, not sure what to do.", "You grip his shoulders and hold on.", "You try to move your hips with him and lose the rhythm."],
    steady: ["You roll your hips to meet him.", "You wrap your legs round him and pull him deeper.", "You clench your cunt round his cock."],
    eager: ["You grind your cunt up against him, moaning.", "You lock your legs round him and buck your hips.", "You squeeze his cock with your cunt, milking him."],
  },
  butt: {
    awkward: ["You grit your teeth and try to relax.", "You hold still, breathing hard.", "You clench without meaning to, and he groans."],
    steady: ["You push back onto his cock.", "You grind your arse back against him.", "You arch your back and take him deeper."],
    eager: ["You slam your arse back onto his cock.", "You spread your own cheeks for him.", "You squeeze your arse round him, begging for more."],
  },
};

/** Him coming, and spent. */
export const COME_LINES: Readonly<Record<DuelArea | "none", readonly string[]>> = {
  hands: [
    "{Name} comes all over your hand and sags, spent.",
    "{Name} spurts across your fingers and staggers back, spent.",
    "{Name} comes in your fist with a grunt, spent.",
    "{Name} shoots up your arm, then slumps, spent.",
  ],
  mouth: [
    "{Name} comes in your mouth with a shout, then staggers back, spent.",
    "{Name} pulls out and comes across your face, then sinks onto a bench, spent.",
    "{Name} holds you down and comes down your throat, then lets go, spent.",
    "{Name} floods your mouth until it spills down your chin, then sags, spent.",
  ],
  breasts: [
    "{Name} comes over your tits and slumps against the bar, spent.",
    "{Name} comes up your chest and onto your chin, spent.",
    "{Name} paints your tits white and falls back, spent.",
    "{Name} comes in your cleavage, then staggers off, spent.",
  ],
  pussy: [
    "{Name} comes inside you, then pulls out, spent, his cum dripping out of you.",
    "{Name} pulls out and comes over your belly, spent.",
    "{Name} buries himself deep and fills your cunt, then slumps, spent.",
    "{Name} groans and pumps his load into you, then rolls off, spent.",
  ],
  butt: [
    "{Name} comes deep in your arse, then lets go of you, spent.",
    "{Name} pulls out and comes over your arse, spent.",
    "{Name} fills your arse and collapses on your back, spent.",
    "{Name} pumps his load into your arse, then staggers back, spent.",
  ],
  none: [
    "{Name} groans and comes in his trousers, staring at you. He's spent.",
    "{Name} doubles over, a wet patch spreading on his trousers. He's spent.",
    "{Name} comes into his own hand, staring at you, and sags, spent.",
  ],
};

/** Her struggling free, or not. */
export const STRUGGLE_LINES = {
  free: [
    "You twist out from under him and shove him off.",
    "You drive an elbow into his gut and squirm free, his cock slipping out.",
    "You knee him away and scramble clear.",
    "You wrench loose and shove him into a table.",
    "You headbutt him and roll away.",
  ],
  fail: [
    "You try to wrench free, but he holds you right where you are.",
    "You squirm, but he pins you down harder and keeps going.",
    "You push at him, but your arms have no strength in them.",
    "You twist, and he just laughs and fucks you harder.",
    "You try to crawl away, and he drags you back onto his cock.",
  ],
} as const;

/** What the room's watching for. */
export type CrowdMoment = "lewd" | "taken" | "pose" | "hit" | "free" | "come" | "refused" | "herCome";

/** The room, egging him on, calling dibs, laughing at him, cheering. */
export const CROWD_LINES: Readonly<Record<CrowdMoment, readonly string[]>> = {
  lewd: [
    "{Who} shouts: \"Go on, she's loving it!\"",
    "{Who} bangs the table: \"Get her tits out!\"",
    "{Who} whistles: \"Look at her blush!\"",
    "{Who} hollers: \"Tell her what you'll do to her!\"",
    "{Who} laughs: \"She's going red as a beetroot!\"",
    "{Who} calls out: \"Bet she's wetter than the ale!\"",
    "{Who} jeers: \"Give us a look too, innkeeper!\"",
    "{Who} chuckles: \"She's not saying no, is she?\"",
    "{Who} shouts: \"Strip her! Strip her!\"",
    "{Who} howls: \"Her nipples are hard, look!\"",
  ],
  taken: [
    "{Who} shouts: \"Oi, my turn next!\"",
    "{Who} jeers: \"Save some for the rest of us!\"",
    "{Who} cheers: \"About time somebody fucked her!\"",
    "{Who} stands on a bench: \"Can't see! Move over!\"",
    "{Who} roars: \"That's how you end a brawl!\"",
    "{Who} laughs: \"The innkeeper's open for business!\"",
    "{Who} calls: \"Best show this tavern's ever had!\"",
    "{Who} shouts: \"Queue forms behind me!\"",
    "{Who} whoops: \"Look at her take it!\"",
    "{Who} pulls his cock out under the table.",
  ],
  pose: [
    "{Who} roars: \"Harder, mate, harder!\"",
    "{Who} laughs: \"Listen to her moan!\"",
    "{Who} shouts: \"Don't hog her all night!\"",
    "{Who} bangs a tankard: \"Go on! Go on!\"",
    "{Who} whistles: \"She's really into it now!\"",
    "{Who} heckles: \"Is that the best you've got?\"",
    "{Who} calls out: \"Faster, I've got a horse to catch!\"",
    "{Who} cheers: \"Put your back into it!\"",
    "{Who} shouts: \"Fill her up!\"",
    "{Who} strokes himself, watching.",
  ],
  hit: [
    "{Who} laughs: \"Ha! She flattened you!\"",
    "{Who} jeers: \"Beaten by the barmaid!\"",
    "{Who} howls: \"Get up, you sop!\"",
    "{Who} winces: \"Ooh, that one'll leave a mark.\"",
    "{Who} cheers: \"Give him another!\"",
    "{Who} calls: \"My money's on the innkeeper!\"",
    "{Who} roars: \"She hits harder than my wife!\"",
    "{Who} shouts: \"Right in the bollocks!\"",
  ],
  free: [
    "{Who} laughs: \"She threw you off like a sack of turnips!\"",
    "{Who} jeers: \"Can't even hold a barmaid down!\"",
    "{Who} shouts: \"Lost your grip, did you?\"",
    "{Who} hoots: \"Slippery as an eel, that one!\"",
    "{Who} cackles: \"Back of the queue, then!\"",
    "{Who} laughs: \"His cock's flapping in the wind!\"",
  ],
  come: [
    "{Who} cheers: \"Hah! Didn't last long, did he!\"",
    "{Who} shouts: \"Who's next, then?\"",
    "{Who} roars with laughter: \"Look at his face!\"",
    "{Who} claps: \"Bravo! Encore!\"",
    "{Who} jeers: \"Two minutes! I timed it!\"",
    "{Who} whistles: \"Someone fetch a mop!\"",
    "{Who} calls: \"She's barely broken a sweat!\"",
    "{Who} shouts: \"She's dripping with it!\"",
    "{Who} groans and comes in his trousers.",
  ],
  herCome: [
    "{Who} roars: \"She's cumming! The innkeeper's cumming!\"",
    "{Who} bangs the table: \"Look at her shake!\"",
    "{Who} howls with laughter: \"In the middle of a brawl!\"",
    "{Who} whistles: \"Did she just...? She did!\"",
    "{Who} shouts: \"Again! Make her do it again!\"",
    "{Who} gawps: \"Gods, look at her face.\"",
    "{Who} cheers: \"Best brawl this tavern's ever seen!\"",
    "{Who} laughs: \"She's soaked the floorboards!\"",
  ],
  refused: [
    "{Who} laughs: \"She told you!\"",
    "{Who} jeers: \"Turned down flat!\"",
    "{Who} hoots: \"Not tonight, lover boy!\"",
    "{Who} cackles: \"She'd sooner fuck a pig!\"",
    "{Who} calls: \"Try buying her a drink first!\"",
    "{Who} laughs into his ale: \"Rejected!\"",
    "{Who} shouts: \"Put it away, mate, she's not having it!\"",
  ],
};

/** Another of them joining her in the scene she's in, at a slot (KP's pose joins), by the slot. */
export const JOIN_LINES: Readonly<Record<JoinSlot, readonly string[]>> = {
  mouth: [
    "{Name} grabs your chin and pushes his cock at your lips.",
    "{Name} kneels by your head and shoves his cock in your face.",
    "{Name} pulls your head round by the hair, cock out and ready.",
    "{Name} slaps his cock against your cheek, waiting for your mouth.",
    "{Name} pinches your nose shut until you open up for him.",
  ],
  left: [
    "{Name} grabs your left hand and wraps it round his cock.",
    "{Name} pushes his cock into your free hand.",
    "{Name} pulls your hand onto his shaft and holds it there.",
    "{Name} presses up beside you, cock in your palm.",
  ],
  right: [
    "{Name} takes your right hand and puts it to work on his cock.",
    "{Name} closes your fingers round his cock for you.",
    "{Name} shoves his cock into your other hand.",
    "{Name} guides your hand down his shaft.",
  ],
};

/** Her letting him join in. */
export const JOINED_LINES: Readonly<Record<JoinSlot, readonly string[]>> = {
  mouth: [
    "You open your mouth for him too. Now you're stuffed at both ends.",
    "You take a second cock in your mouth, there in front of everyone.",
    "Your lips close round him as the other keeps going.",
  ],
  left: ["Your left hand closes round him and starts to pump.", "You stroke him with your free hand.", "You grip his cock and start to jerk him."],
  right: ["Your right hand closes round him too.", "You take him in your other hand.", "You work him with your right hand, both hands full now."],
};

/** His turn, joined in with her at a slot. */
export const JOINED_POSE_LINES: Readonly<Record<JoinSlot, readonly string[]>> = {
  mouth: [
    "{Name} fucks your mouth while the other takes you.",
    "{Name} holds your head and thrusts into your throat.",
    "{Name} shoves deeper, drool running down your chin.",
    "{Name} pulls out to rub his cock over your face, then pushes back in.",
    "{Name} groans as your tongue works him.",
  ],
  left: [
    "{Name} thrusts into your left hand.",
    "{Name} squeezes your fingers tighter round his cock.",
    "{Name} grunts, leaking over your hand.",
    "{Name} gropes your tits while you jerk him.",
  ],
  right: [
    "{Name} fucks your right hand, panting.",
    "{Name} pushes his hips into your grip.",
    "{Name} drips precum on your wrist.",
    "{Name} pinches your nipple as you stroke him.",
  ],
};

/** What the foes say to each other. */
export type MateMoment = "down" | "taken" | "joined" | "come" | "joinBrawl" | "hit" | "herCome";

/**
 * The foes among themselves (KP's enemies egging each other on): `{Name}` is who says it, `{mate}` the one it's
 * about (the one knocked down, the one with her, the one who came, the one she just hit).
 */
export const FOE_CHATTER: Readonly<Record<MateMoment, readonly string[]>> = {
  down: [
    "{Name} shouts at {mate}: \"Get up, you useless sod!\"",
    "{Name} laughs at {mate}: \"One barmaid and you're done? Pathetic.\"",
    "{Name} spits: \"More for me, then.\"",
    "{Name} cracks his knuckles: \"My turn to have a go at her.\"",
    "{Name} winces: \"She laid out {mate}! Careful, lads.\"",
    "{Name} shouts: \"Pin her arms! Don't let her do that to me!\"",
    "{Name} sneers: \"I'll break her for that.\"",
    "{Name} steps over {mate}: \"Leave her to a real man.\"",
  ],
  taken: [
    "{Name} shouts: \"Oi, mate! Save me a hole!\"",
    "{Name} laughs: \"Look at {mate} go!\"",
    "{Name} whistles: \"Go on, mate, give it to her!\"",
    "{Name} pulls his cock out: \"Don't take all night, I'm next.\"",
    "{Name} grins: \"She's loving it, mate. Look at her face.\"",
    "{Name} shouts: \"Hold her down, I want her mouth!\"",
    "{Name} groans: \"Lucky bastard...\"",
    "{Name} jeers: \"Fuck her harder, mate, she can take it!\"",
  ],
  joined: [
    "{Name} grunts at {mate}: \"Take her mouth, I've got the rest.\"",
    "{Name} laughs: \"Plenty to go round, eh, mate?\"",
    "{Name} pants: \"Her hands are good too, mate, ain't they?\"",
    "{Name} grins at {mate}: \"Look at her. Taking us both.\"",
    "{Name} shouts: \"That's it, fill her up at both ends!\"",
    "{Name} gasps: \"Gods, she's good, mate.\"",
  ],
  come: [
    "{Name} laughs at {mate}: \"Is that it, mate? My turn.\"",
    "{Name} jeers: \"Two strokes, mate! Two!\"",
    "{Name} shoves {mate} aside: \"Move. Let a real man finish her.\"",
    "{Name} grins: \"She's all wet and ready now. Cheers, mate.\"",
    "{Name} shouts: \"Next! Me! Me!\"",
    "{Name} laughs: \"You've made a right mess of her, mate.\"",
    "{Name} groans: \"Watching that nearly did me in too.\"",
  ],
  joinBrawl: [
    "{Name} shouts: \"Oi! Nobody starts a brawl without me!\"",
    "{Name} rolls up his sleeves: \"Need a hand with her, lads?\"",
    "{Name} laughs: \"I want a piece of the innkeeper too!\"",
    "{Name} cracks his neck: \"Right. My turn.\"",
    "{Name} roars: \"Get her! Get her tits out!\"",
    "{Name} grins: \"Been wanting to get my hands on her all night.\"",
    "{Name} shouts: \"Two against one, barmaid. How's that?\"",
  ],
  herCome: [
    "{Name} laughs: \"Ha! She came! Look at her!\"",
    "{Name} grins: \"Cumming in the middle of a fight? Slut.\"",
    "{Name} jeers: \"Some fighter. One squeeze and she's gushing.\"",
    "{Name} shouts: \"She's done for, lads! Get her!\"",
    "{Name} laughs: \"Your legs are shaking, innkeeper.\"",
    "{Name} sneers: \"Enjoyed that, did you?\"",
    "{Name} groans: \"Gods, I want to make her do that again.\"",
  ],
  hit: [
    "{Name} shouts: \"She's a wildcat! Grab her arms!\"",
    "{Name} laughs at {mate}: \"She's beating you, mate!\"",
    "{Name} growls: \"You'll pay for that, barmaid.\"",
    "{Name} shouts: \"Get behind her, I'll hold her!\"",
    "{Name} jeers at {mate}: \"Hit her back, you coward!\"",
    "{Name} winces: \"Ooh. Right in the face.\"",
  ],
};

/** How likely the foes have a word among themselves on a turn worth talking about. */
export const MATE_CHANCE = 0.5;

/** Her coming mid-brawl: in the fight, or in a scene with one of them. */
export const CLIMAX_LINES = {
  fight: [
    "Your knees buckle and you come, right there in the middle of the brawl.",
    "It hits you all at once: you double over, shaking, and come in front of the whole room.",
    "You cry out and come, clutching a table to stay on your feet.",
    "Your whole body clenches, and you come hard, juices running down your thighs.",
    "You sink to your knees, cumming, unable to stop it.",
  ],
  scene: [
    "You come around him, crying out, your whole body shaking.",
    "You clench and come hard, and he groans as you squeeze him.",
    "You arch your back and come, right there in front of everyone.",
    "Your toes curl and you come, gushing.",
    "You scream as you come, the room roaring around you.",
  ],
} as const;

/** Coming back to herself after she's come. */
export const RECOVER_LINES: readonly string[] = [
  "You come back to yourself, legs shaking.",
  "You catch your breath, face burning.",
  "You push yourself up, still trembling.",
  "You blink the stars away and get your feet under you.",
];

/** How likely the room says something on a turn something's happened worth shouting about. */
export const CROWD_CHANCE = 0.4;

/** Picks one of `lines` by a roll of 0 to 1, with the foe's name put in. */
export function line(lines: readonly string[], roll: number, name: string): string {
  const text = lines[Math.min(lines.length - 1, Math.floor(roll * lines.length))] ?? "";
  return fill(text, name);
}

/** The foe's name put into a line: "{Name}" starts a sentence, "{name}" doesn't. */
export function fill(text: string, name: string): string {
  return text.replaceAll("{Name}", `The ${name}`).replaceAll("{name}", `the ${name}`);
}
