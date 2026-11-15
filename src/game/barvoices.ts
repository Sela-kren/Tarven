/**
 * What guests say at the bar, raw, in their own type's voice (KP's patrons use its enemies' crude talk at the bar too;
 * Tarven is written raw, STORY.md house rules): as they reach for each part of her, crowing when she lets them,
 * sulking when she doesn't, and lewd quips when they order and when she serves them (once they're worked up).
 * The brawl's voices are brawlvoices.ts. All newly written for Tarven.
 */
import type { TouchRegion } from "./touchtalk";
import type { GuestKind } from "./tavern";

/** The part of her a bar touch goes for, as the lines group it. */
export type ReachPart = "chest" | "rear" | "thigh" | "intimate" | "mouth" | "body";

/** Which group each touch region's lines come from (the invitation and her clothes have their own words). */
export const REACH_PART: Readonly<Partial<Record<TouchRegion, ReachPart>>> = {
  chest: "chest",
  rear: "rear",
  thigh: "thigh",
  lap: "thigh",
  intimate: "intimate",
  lips: "mouth",
  face: "mouth",
  neck: "mouth",
  hair: "mouth",
  hand: "body",
  shoulder: "body",
  waist: "body",
};

/** The lust (0 to 10) a guest has to be at before the quips come out when they order and are served. */
export const QUIP_LUST = 6;

export interface BarVoice {
  reach: Readonly<Record<ReachPart, readonly string[]>>;
  /** She let it happen. */
  crow: readonly string[];
  /** She slapped them, or pulled away. */
  sulk: readonly string[];
  /** Ordering, worked up. */
  order: readonly string[];
  /** Served, worked up. */
  serve: readonly string[];
}

export const BAR_VOICES: Readonly<Record<GuestKind, BarVoice>> = {
  farmer: {
    reach: {
      chest: [
        "Cor, let's have a feel of them udders, missus.",
        "Just a squeeze. Been dreaming of 'em all through harvest.",
        "Them's softer than my best ewe, I'd wager.",
        "Hold still, I want a proper handful.",
        "Never felt a pair like that. Not once.",
      ],
      rear: [
        "Arse like a prize mare. Just a pat, missus.",
        "Bend over that table again, I want a grab.",
        "Lord, there's a lot to hold back there.",
        "Couldn't help it, it was swinging right at me.",
        "Firm as a ripe pumpkin, that is.",
      ],
      thigh: [
        "Up the skirt, just a little, missus. Like a hayloft.",
        "Thighs on you like a dairymaid. Let me feel.",
        "Warm under there, ain't it?",
        "Just goin' for a little wander up your leg.",
        "Don't mind me, I'm just checkin' the crop.",
      ],
      intimate: [
        "Bet you're wetter'n a spring field down there.",
        "Let's see if I can find that little seed, eh?",
        "I'll plough you right here if you let me.",
        "Feel that? That's a farmer's finger, that is.",
        "Lord, you're dripping, missus.",
      ],
      mouth: [
        "Give us a kiss. Taste like cider, I bet.",
        "Them lips, missus. Them lips.",
        "Suck on my thumb, go on, like a calf.",
        "Just a peck. A big wet one.",
        "My missus never kissed like you look like you'd kiss.",
      ],
      body: [
        "Come sit on my knee, missus.",
        "Feel what you've done to me, down here.",
        "Big strong arms on me, eh? Feel 'em.",
        "Let me hold you round the middle. Like a sack.",
        "Lean on me, I'll keep you warm.",
      ],
    },
    crow: [
      "Ha! Wait till the lads at the mill hear!",
      "Best thing that's happened since the spring lambs!",
      "Cor, missus. Cor.",
      "I'll never wash this hand again.",
      "You're a fine bit of livestock, you are.",
      "Same again next market day, eh?",
    ],
    sulk: [
      "Ow! Only bein' friendly...",
      "Fine, fine. Back to me stew.",
      "No need to clout a fella.",
      "Was worth a try. Ma'd be ashamed.",
      "Right. I'll go home to the pigs, then.",
    ],
    order: [
      "Ale, missus, and a look down your front.",
      "Stew, and you sat on my lap while I eat it.",
      "Whatever's hot. Like you.",
      "Cider. And maybe a milking, if you're offerin'.",
      "Bring me something wet. You'll do.",
    ],
    serve: [
      "Cor, you bent right over. I seen everything.",
      "That's a fine pair of jugs. The ale's alright too.",
      "Thank 'ee. Now how about dessert?",
      "Set it down slow, missus. Slower.",
      "Smells like stew and you. Lovely.",
    ],
  },
  soldier: {
    reach: {
      chest: [
        "Tits inspection, innkeeper. Hold still.",
        "Let's see what's in the supply wagon.",
        "Stand to attention. Your nipples already are.",
        "I've earned a squeeze, three weeks on the wall.",
        "Hands on. That's an order.",
      ],
      rear: [
        "Nice arse. Permission to grab. Granted.",
        "Turn around, innkeeper. Rear guard.",
        "That's an arse worth marching for.",
        "I'll take the high ground. Both cheeks.",
        "Hold your position. Just like that.",
      ],
      thigh: [
        "Advancing up the left flank.",
        "Spread your stance, innkeeper.",
        "I'm going under the skirt. Cover me.",
        "Scouting ahead. Warm country up here.",
        "Legs apart, at ease.",
      ],
      intimate: [
        "Breaching the gate.",
        "You're soaked, innkeeper. That's not regulation.",
        "Two fingers. Then three. Hold steady.",
        "I've stormed castles easier than you. Wetter, though, you are.",
        "Taking the objective.",
      ],
      mouth: [
        "Open up. Mouth inspection.",
        "Kiss me like I'm shipping out tomorrow. I am.",
        "Suck on that finger. Practice for later.",
        "Lips like that should be issued to every barracks.",
        "Tongue out, innkeeper.",
      ],
      body: [
        "Fall in, innkeeper. Into my lap.",
        "Feel that? That's my sword. Sort of.",
        "Grab you round the waist and carry you off, I could.",
        "Stand close. Closer. Good.",
        "That's a fine figure. Fit for service.",
      ],
    },
    crow: [
      "Ha! Pay up, lads, I told you she would!",
      "Mission accomplished.",
      "That's going in the regimental history.",
      "Good girl. At ease.",
      "Best posting I've ever had.",
      "Sergeant's going to be so jealous.",
    ],
    sulk: [
      "Retreat! Retreat!",
      "Insubordinate wench.",
      "Fine. Back to the lines.",
      "That's a court-martial slap, that is.",
      "Noted. Next time, flanking manoeuvre.",
    ],
    order: [
      "Ale. And your arse on this bench.",
      "Rations. And something soft to grab.",
      "Whatever's strongest. Then you.",
      "Soldier's special: ale, stew, and the innkeeper.",
      "Double ration. I'm starving. For you.",
    ],
    serve: [
      "Good service. Now bend over again.",
      "I could see right down your top. Thank you for your service.",
      "Ale's fine. View's better.",
      "Set it down and stay a while.",
      "Supplies received. Now the girl.",
    ],
  },
  smuggler: {
    reach: {
      chest: [
        "Let me appraise the goods, sweetheart.",
        "Smuggled better cargo than these? Never.",
        "Just checking the weight. Fine merchandise.",
        "A pinch. Call it a customs fee.",
        "Nobody's looking. Let me have them.",
      ],
      rear: [
        "Back door's open, is it?",
        "Nice hold on this vessel.",
        "I'll take that as payment.",
        "Smooth as silk. I'd know.",
        "Squeeze it like a full purse.",
      ],
      thigh: [
        "Let's see what's hidden under the skirt.",
        "I've a nose for secret places.",
        "Little further up the coast, love.",
        "Warm, quiet, and nobody watching. My favourite.",
        "Hidden compartment, is it?",
      ],
      intimate: [
        "Now there's the real treasure.",
        "Dripping, love. You'd fetch a fortune.",
        "Let me slip something in. Quiet as you like.",
        "I always find the soft spot.",
        "Wet as the harbour at night.",
      ],
      mouth: [
        "A kiss to seal the deal.",
        "Open your mouth, love. I've got something for it later.",
        "Your lips are worth more than my ship.",
        "Taste this. Then taste me.",
        "Lie to me with that mouth. Or suck me with it.",
      ],
      body: [
        "Come here, I'll make it worth your while.",
        "Sit close, sweetheart. Business is better close.",
        "Feel that? Contraband.",
        "Nobody needs to know where my hands go.",
        "Let's trade. Your waist for my coin.",
      ],
    },
    crow: [
      "Pleasure doing business.",
      "Knew you had a price, sweetheart.",
      "That's a deal I'll be back for.",
      "Best trade on the pass.",
      "Keep it quiet, eh? Or don't.",
      "Worth every coin I'd have paid.",
    ],
    sulk: [
      "No deal, then. Shame.",
      "Customs is strict tonight.",
      "Fine. I'll take my business elsewhere.",
      "You'll come round. They always do.",
      "Ouch. Price just went up.",
    ],
    order: [
      "Your best bottle, and a peek. Off the books.",
      "Something strong. Something wet. You choose.",
      "Ale for me, and a lap dance for my ledger.",
      "The usual, and whatever you're not selling.",
      "I'll pay double if you bring it bent over.",
    ],
    serve: [
      "Lovely delivery. The cargo especially.",
      "I saw that. Very generous of you.",
      "Leave the bottle. And your hand on my knee.",
      "Good service deserves a tip. In your hand. Now.",
      "You bent over like you wanted me to see.",
    ],
  },
  fugitive: {
    reach: {
      chest: [
        "I need to touch them. Please.",
        "Just hold them. I haven't touched a woman in so long.",
        "Soft... so soft...",
        "Let me... just let me...",
        "I'll go mad if I don't.",
      ],
      rear: [
        "I can't stop looking at you. At that.",
        "Let me grab it. Please.",
        "So warm... so round...",
        "I'll be gone by morning. Let me have this.",
        "Just a squeeze. Just one.",
      ],
      thigh: [
        "Let me under. I need to feel you.",
        "Your skin... gods, your skin...",
        "I'm shaking. Let me touch you.",
        "Higher. I need it higher.",
        "Don't move. Please don't move.",
      ],
      intimate: [
        "You're wet. You want it too.",
        "Let me in. Let me feel you.",
        "Months in a cell. Let me have this.",
        "So hot inside... gods...",
        "Don't make me stop. I can't stop.",
      ],
      mouth: [
        "Kiss me before they find me.",
        "Let me taste you. Just once.",
        "Your mouth... I dream about your mouth.",
        "Open. Please.",
        "One kiss and I'll run.",
      ],
      body: [
        "Hold me. Just for a minute.",
        "Let me feel you against me.",
        "You're so warm. I've been cold for months.",
        "Don't push me away. Please.",
        "Stay close. I need someone close.",
      ],
    },
    crow: [
      "Thank you... thank you...",
      "I'll remember that in the cells.",
      "Worth getting caught for.",
      "Gods, I needed that.",
      "Don't tell anyone I was here.",
      "I could die happy now.",
    ],
    sulk: [
      "Sorry... sorry...",
      "I know. I know. I'm nobody.",
      "Fine. I'll go.",
      "Can't blame me for trying.",
      "Even you won't have me.",
    ],
    order: [
      "Anything. And you. Mostly you.",
      "Ale... and sit with me. Please.",
      "Whatever's cheap. And whatever you'll give me.",
      "Food. Then your mouth. I'm starving for both.",
      "Just bring it close. Come close.",
    ],
    serve: [
      "You leaned so close... I could smell you...",
      "Thank you. Don't go.",
      "Your hand touched mine. Do it again.",
      "Sit. Please. Just for a moment.",
      "I'll eat it all. Then I'll eat you.",
    ],
  },
  adventurer: {
    reach: {
      chest: [
        "Treasure! I've found treasure!",
        "Let me examine these artefacts.",
        "Two perfect relics. I must claim them.",
        "Critical grab!",
        "I've slain dragons for less than these.",
      ],
      rear: [
        "Behold, the finest arse on the pass!",
        "I'll take this as my quest reward.",
        "A fine rear guard you have.",
        "Grab attack! It's super effective!",
        "Every hero needs something to hold onto.",
      ],
      thigh: [
        "Delving deeper into the dungeon!",
        "What secrets lie beneath the skirt?",
        "Onward! Upward!",
        "A hidden passage!",
        "The adventure continues up your leg.",
      ],
      intimate: [
        "I've reached the inner sanctum!",
        "It's a wet dungeon. My favourite kind.",
        "The legendary pearl! Found it!",
        "Ha! Just as the legends said: slick.",
        "I'll plunder this vault.",
      ],
      mouth: [
        "A kiss for the hero!",
        "Every quest ends with a kiss. Or more.",
        "Your lips, my lady, for my bravery.",
        "Open wide, I'll tell you a story.",
        "Kiss me like I've saved the realm.",
      ],
      body: [
        "Come, sit with the hero.",
        "Feel these arms. Slew a troll, these did.",
        "I'll carry you off on my shoulder.",
        "Lean on me. I'm used to damsels.",
        "Heroes need a warm body after a quest.",
      ],
    },
    crow: [
      "Victory! The bards will sing of this!",
      "Another conquest for the legend!",
      "Ha! Easiest quest I've done.",
      "Mark that on the map, lads!",
      "To the victor!",
      "Level up!",
    ],
    sulk: [
      "A setback! Merely a setback!",
      "She resists my charms. Intriguing.",
      "I'll grind more and come back.",
      "Ow. A worthy foe.",
      "Retreat, regroup, retry.",
    ],
    order: [
      "Ale for the party, and the barmaid for me!",
      "Your finest mead, my lady. And your finest view.",
      "Stew! And a tale of how I won your heart!",
      "A hero's portion. And a hero's reward after.",
      "Whatever's strongest. Tonight we celebrate. With you.",
    ],
    serve: [
      "A feast fit for a hero! And a fine serving wench!",
      "Thank you, my lady. Care to join the party?",
      "I saw down your top. Worth the whole quest.",
      "Stay. Tell me of your adventures. Or start one.",
      "Good loot, this. Especially you.",
    ],
  },
  bandit: {
    reach: {
      chest: [
        "Tits. Now.",
        "Get 'em out, I want a grab.",
        "Squeeze 'em? I'll squeeze 'em till you squeal.",
        "Nice pair. Mine tonight.",
        "Hold still, slut.",
      ],
      rear: [
        "Arse like that's begging to be smacked.",
        "C'mere. I'm grabbing that.",
        "Bend over, I want a feel.",
        "That's mine. Every inch.",
        "Bet you love a hand on that.",
      ],
      thigh: [
        "Skirt up. Let's see.",
        "Open your legs, girl.",
        "Going up. Don't you dare close 'em.",
        "Bet there's nothing under there.",
        "My hand's going where it wants.",
      ],
      intimate: [
        "Fuck, you're wet. Knew you were a slut.",
        "Gonna finger you in front of everyone.",
        "Spread for me.",
        "That cunt's mine tonight.",
        "Feel that? There's more coming.",
      ],
      mouth: [
        "Open your mouth. Wider.",
        "Kiss me, whore.",
        "Suck my finger. Practice.",
        "That mouth was made for cock.",
        "Lick it. Go on.",
      ],
      body: [
        "Come here. On my lap.",
        "Feel my cock. Hard for you.",
        "I'll hold you how I like.",
        "Don't squirm. Or do, I like it.",
        "You're coming with me later.",
      ],
    },
    crow: [
      "Ha! Told you she's a whore!",
      "That's how a bandit takes what he wants.",
      "She loved it. Look at her.",
      "Easy. Too easy.",
      "Next time I'm taking all of you.",
      "Good girl. Knew you'd open up.",
    ],
    sulk: [
      "Bitch. You'll regret that.",
      "Fine. For now.",
      "I'll have you yet.",
      "Hit me again and see what happens.",
      "Tease. I'll remember this.",
    ],
    order: [
      "Ale. And your tits out while I drink it.",
      "Bring it on your knees.",
      "Whatever, and a grope. I'm paying.",
      "Meat. Ale. You. In that order.",
      "Strongest you've got, wench.",
    ],
    serve: [
      "Took your time. Bend over and I'll forgive you.",
      "Nice tits. Ale's alright.",
      "Leave it, and leave your arse here too.",
      "Good girl. Now sit on it.",
      "I'd rather have you on the plate.",
    ],
  },
  noble: {
    reach: {
      chest: [
        "Let me inspect the merchandise. Hold still.",
        "Peasant breasts. Surprisingly fine.",
        "I'll have a handful, girl. I'm paying.",
        "Quite adequate. Let me see them properly.",
        "Present them. Don't make me ask twice.",
      ],
      rear: [
        "Turn. I wish to admire the rear.",
        "A commoner's backside, and still I'm tempted.",
        "Bend, girl. Your betters wish to touch.",
        "Hm. Firm. Good breeding stock.",
        "I'll take a squeeze. Put it on my account.",
      ],
      thigh: [
        "Lift your skirt. I'll not ask twice.",
        "Let me see what peasants keep under there.",
        "Higher. I'm not paying for knees.",
        "Hold still. My hand goes where I please.",
        "Your skin is coarse. Yet warm.",
      ],
      intimate: [
        "How common. You're wet already.",
        "Spread for your betters, girl.",
        "Such an eager little peasant cunt.",
        "I'll play with you as I like.",
        "Don't make that noise. Actually, do.",
      ],
      mouth: [
        "Kiss my ring. Then my lips.",
        "Open. I'll fill that mouth properly later.",
        "Your mouth would be wasted on ale.",
        "Suck. Like a lady. Or not.",
        "Your lips are the only refined thing here.",
      ],
      body: [
        "Sit beside me, girl. Be decorative.",
        "I'll hold you as I please. You'll thank me.",
        "Feel the silk? Now feel what's under it.",
        "Come here. I find you... diverting.",
        "Lean in. I'm not accustomed to waiting.",
      ],
    },
    crow: [
      "As expected. Everyone has a price.",
      "Adequate. I'll be back.",
      "The peasant knows her place.",
      "Delightfully vulgar.",
      "I'll tell the court. They'll be appalled.",
      "Good girl. Here's a coin.",
    ],
    sulk: [
      "How dare you. Do you know who I am?",
      "Insolent creature.",
      "I'll buy this tavern and dismiss you.",
      "Your loss, girl.",
      "Hm. Spirited. I'll break that.",
    ],
    order: [
      "Your least vile wine. And your company, bent.",
      "Bring me something, and bring yourself with it.",
      "The best you have, which isn't saying much. Except you.",
      "Wine. And kneel when you pour it.",
      "I'll have you on the side.",
    ],
    serve: [
      "Adequate service. Your posture was most revealing.",
      "Set it down. Then sit. On me.",
      "I saw everything. Commendable.",
      "Stay. I'm not finished looking.",
      "Pour it slower, so I can watch you lean.",
    ],
  },
};
