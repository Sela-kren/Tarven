/**
 * Her clothes in a brawl, Karryn's Prison style (GAME_PATH.MD 7l): a foe stops swinging and goes for her clothes
 * (KP's stripping), and once a piece is off, she's barer for the rest of the fight: they stare, and scenes open up.
 * Fix Clothes (an energy skill) gets the last piece they had off her back on.
 *
 * Her clothes only ever come off through a reach she's asked about (Consent on) or the push-vs-hold check
 * (Consent off), like any brawl touch: Pull away always works. Nothing is torn off her unasked.
 *
 * The log's lines, as raw as KP's: what he does, what he says (by his type), what she says (by her voice, brawlher.ts),
 * the room and the other foes. `{Name}` / `{name}` is the foe, `{piece}` the garment, `{Who}` someone in the room,
 * `{mate}` the one it's about.
 */
import type { HerVoice } from "./brawlher";
import type { GuestKind } from "./tavern";

/** What Fix Clothes costs (KP's energy skill). */
export const FIX_CLOTHES_ENERGY = 4;
/** How often a foe who wants her goes for her clothes instead of a grope, talk or a stare, while she has any on. */
export const STRIP_CHANCE = 0.3;

/** Clothes in a fight: the garments she has, in the order they come off, and how many are off going in. */
export interface FightClothes {
  pieces: readonly string[];
  off: number;
}

/** Him going for her clothes, in the log, before she's asked. */
export const STRIP_REACH_LINES: readonly string[] = [
  "{Name} stops swinging and gets both fists in your {piece}.",
  "{Name} lunges, not for your face but for your {piece}.",
  "{Name} hooks his fingers in your {piece} and pulls.",
  "{Name} grabs a fistful of your {piece} and hauls.",
  "{Name} ducks your swing and goes for your {piece}.",
  "{Name} catches your {piece} and yanks you off balance with it.",
  "{Name} gets behind you and starts tugging at your {piece}.",
  "{Name} forgets the fight entirely. His hands are on your {piece}.",
  "{Name} pins your arm and reaches for your {piece} with the other hand.",
  "{Name} grins and twists his hand into your {piece}.",
];

/** A piece coming off her, in the log, once she's let it (or it's landed, Consent off). */
export const STRIPPED_LINES: readonly string[] = [
  "Your {piece} comes away in {name}'s hands.",
  "{Name} rips your {piece} off and tosses it into the crowd.",
  "{Name} peels your {piece} off you and holds it up like a trophy.",
  "Your {piece} hits the floorboards. {Name} kicks it under a table.",
  "{Name} tears your {piece} away. The cold air hits your skin.",
  "{Name} sniffs your {piece}, grinning, then stuffs it in his belt.",
  "There goes your {piece}. {Name} whoops and waves it over his head.",
  "{Name} yanks your {piece} down and off, and stares at what's under it.",
  "Your {piece} is gone. {Name} flings it at the bar.",
  "{Name} strips your {piece} off you in one long pull.",
];

/** The last piece gone: she's fighting bare. */
export const BARE_LINES: readonly string[] = [
  "You're stark naked in the middle of the taproom, fists up.",
  "There's nothing left on you now. Every eye in the room is on your bare body.",
  "Naked. Completely naked, in your own tavern, and the brawl isn't over.",
  "Not a stitch left on you. Somebody drops a tankard.",
  "You're bare from head to toe, and the whole room is drinking you in.",
];

/** What he says, getting it off her, by his type. */
export const STRIP_VOICES: Readonly<Record<GuestKind, readonly string[]>> = {
  farmer: [
    "Shuck 'er like corn, I say!",
    "Off it comes, missus! Like skinning a rabbit!",
    "Cor, look what was hiding under there!",
    "Been wanting to do that since I walked in!",
    "Hold still, I've peeled ewes quicker than this!",
    "Now we're talking! Get the rest off an' all!",
    "Ha! Prettier than a prize heifer under there!",
    "That's going on my wall at home, that is.",
  ],
  soldier: [
    "Uniform off, innkeeper. That's an order.",
    "Disarming the enemy. Every piece of her.",
    "Strip inspection! Hold still!",
    "Stand at attention. Tits out.",
    "Spoils of war, love.",
    "First rule of a fight: take their cover away.",
    "I've stripped men twice your size. You're easy.",
    "Kit off. All of it. Move!",
  ],
  smuggler: [
    "Let's see what you're really carrying under there.",
    "I'll take that. Call it a toll.",
    "This'll fetch a pretty price with your scent on it.",
    "Unwrapping the goods. Always the best part.",
    "No hiding anything from me, sweetheart.",
    "Fair trade: your clothes for my cock. You'll see.",
    "Contraband, this. Confiscated.",
    "Lighter on your feet now, aren't you?",
  ],
  fugitive: [
    "Off. Off. I need to see you.",
    "Been so long... let me see skin...",
    "Mine. That's mine now.",
    "Don't cover up. Don't you dare cover up.",
    "I'll rip it all off you. Every thread.",
    "Gods, you smell good under there.",
    "No more hiding from me.",
    "I've dreamed about this in the cells.",
  ],
  adventurer: [
    "Loot! The finest loot in the realm!",
    "Armour broken! Ha, I always find the weak spot.",
    "Another trophy for my collection.",
    "Critical hit! On your clothes!",
    "That's what I call a treasure chest!",
    "I've stripped dragons of their hoards. You're nothing.",
    "Next piece, then the real prize.",
    "Ha! The bards will sing of this!",
  ],
  bandit: [
    "Get it off, bitch!",
    "Strip, whore! Strip!",
    "Let's see them tits!",
    "I'll have every rag off you!",
    "Tear it! Tear it all off her!",
    "That's it! Show the lads your goods!",
    "Bandits take everything, girl. Everything.",
    "Bare arse in the sawdust, that's where you belong!",
  ],
  noble: [
    "Cheap fabric. It tore like paper.",
    "Peasant rags. You look better without them.",
    "There. Now you're dressed for your station.",
    "I'll buy you something worse to wear later.",
    "Remove it. Or I'll have it removed. Oh, I just did.",
    "Ah, the commoner's body. Not unpleasant.",
    "Undressing the help. How quaint.",
    "Stand still, girl. I'm admiring my purchase.",
  ],
};

/** What she says as a piece comes off her, by her voice. */
export const HER_STRIPPED_LINES: Readonly<Record<HerVoice, readonly string[]>> = {
  first: ["N-no! Give that back! Nobody's ever seen me like this!", "D-don't look! Don't any of you look!"],
  proper: [
    "Give that back, you swine!",
    "You'll pay for that, every thread of it!",
    "Stop staring! I'll gouge your eyes out!",
    "That's mine! Give it back!",
    "You think that'll stop me? Come here!",
    "Pervert! Animal!",
    "I'll fight you naked if I have to!",
    "You'll be picking that out of your teeth!",
  ],
  easy: [
    "H-hey! Not there...",
    "Don't... everyone can see...",
    "Give it back... please...",
    "Ah! Not in front of the whole room!",
    "Stop it... I'm all exposed...",
    "W-why does being looked at feel like this...",
    "Don't pull so hard, you'll tear it...",
    "I can feel all of them staring...",
  ],
  lewd: [
    "Mm, you could've just asked.♥",
    "Like what you see?♥",
    "Take your time. I'm not going anywhere.♥",
    "Go on then, everyone, have a good look.♥",
    "Keep it. Something to remember me by.♥",
    "Next piece is yours if you can catch me.♥",
    "Finally, I was getting so hot in that.♥",
    "Careful, I might start to enjoy this.♥",
  ],
  horny: [
    "Ahh... the air on my skin...",
    "Don't... stop... I mean... don't look...",
    "I'm getting so wet... they'll all see...",
    "My nipples... they're so hard...",
    "More... no... I mean...",
    "Everyone's looking... and it feels...",
    "Haah... my body's burning...",
    "Take it... take it all off...",
  ],
  broken: ["...my clothes...", "...don't...", "...cold...", "..."],
};

/** The room, as a piece comes off her. */
export const CROWD_STRIPPED_LINES: readonly string[] = [
  "{Who} roars: \"Get the rest off!\"",
  "{Who} bangs the table: \"Off! Off! Off!\"",
  "{Who} whistles long and loud.",
  "{Who} shouts: \"Throw it here! I'll keep it warm!\"",
  "{Who} stands on a chair for a better view.",
  "{Who} hollers: \"Best brawl I've ever paid to see!\"",
  "{Who} cackles: \"Look at her trying to cover up!\"",
  "{Who} calls: \"Now that's a barmaid's uniform!\"",
  "{Who} chants: \"More! More! More!\"",
  "{Who} yells: \"Turn round, innkeeper, let's see the back!\"",
];

/** The room, when she gets something back on. */
export const CROWD_FIXED_LINES: readonly string[] = [
  "{Who} boos: \"Put that away? Shame!\"",
  "{Who} groans: \"Aww, no! Rip it off her again!\"",
  "{Who} shouts: \"Just leave it off, love!\"",
  "{Who} jeers: \"Won't stay on long!\"",
  "{Who} laughs: \"Getting dressed in the middle of a brawl!\"",
  "{Who} yells: \"Get it off her again, you lot!\"",
];

/** The other foes, as one of them gets a piece off her. */
export const MATE_STRIPPED_LINES: readonly string[] = [
  "{Name} cheers {mate}: \"That's it! Strip her bare!\"",
  "{Name} laughs: \"Nice work, mate! Next piece is mine!\"",
  "{Name} grabs for it: \"Give it here, I want a sniff!\"",
  "{Name} shouts: \"Keep going, mate, get her naked!\"",
  "{Name} groans: \"Look at that skin...\"",
  "{Name} whistles at {mate}: \"Now we're having fun!\"",
  "{Name} grins: \"She can't fight for covering herself up!\"",
  "{Name} shouts: \"Hold her, I'll get the rest!\"",
];

/** Her yanking her clothes straight mid-brawl (Fix Clothes). */
export const FIX_LINES: readonly string[] = [
  "You snatch your {piece} up off the floor and drag it back on.",
  "You wrestle your {piece} back into place, glaring.",
  "You yank your {piece} back on, fast, fists back up.",
  "You grab your {piece} back and get it on you in one rough pull.",
  "You straighten your clothes and get your {piece} back where it belongs.",
  "You tug your {piece} back on, red to the ears.",
];

/** Fills in the garment. */
export function withPiece(text: string, piece: string): string {
  return text.replaceAll("{piece}", piece);
}
