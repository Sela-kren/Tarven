import type { GuestKind } from "./tavern";

/**
 * The writing for guests who reach for the innkeeper: what each touch looks like as it comes, what she thinks
 * at each level of her desire, and what happens if she lets it or leans into it. The rules for who reaches for
 * what, and what she can answer, are in `touch.ts`.
 *
 * She's a grown woman who never had anyone court her; the writing is a sheltered adult finding out what she
 * likes, never anything younger. Guests are "they": the room is full of all sorts.
 */

/** Where on her a touch lands, which frames the comic panel and picks the lines shared by a whole kind of touch. */
export type TouchRegion =
  | "hand"
  | "face"
  | "hair"
  | "shoulder"
  | "waist"
  | "rear"
  | "chest"
  | "lap"
  | "lips"
  | "neck"
  | "thigh"
  | "clothes"
  | "intimate"
  | "invite";

export interface TouchDef {
  id: string;
  /** How bold the touch is, from 1 (barely there) to 10 (the invitation). */
  level: number;
  region: TouchRegion;
  /** The kinds of guest who go for it; empty is anyone. */
  kinds: readonly GuestKind[];
  /** Narration as the hand comes in. `{piece}` is the garment they're after. */
  reach: string;
  /** What she thinks: not ready for it, torn, and wanting it. */
  thoughts: readonly [string, string, string];
  /** What happens when she lets it. */
  allow: string;
  /** What happens when she leans into it. */
  lean: string;
  /** Takes the next piece of clothing off the strip ladder. */
  strip?: boolean;
  /** Only a lover asks this; nobody reaches for it in the room yet. */
  romance?: boolean;
}

const ANY: readonly GuestKind[] = [];
const FARMER: readonly GuestKind[] = ["farmer"];
const SOLDIER: readonly GuestKind[] = ["soldier"];
const SMUGGLER: readonly GuestKind[] = ["smuggler"];
const FUGITIVE: readonly GuestKind[] = ["fugitive"];

export const TOUCHES: readonly TouchDef[] = [
  // 1: barely there.
  {
    id: "fingers",
    level: 1,
    region: "hand",
    kinds: ANY,
    reach: "Their fingers brush yours as they take the cup, and stay there a moment longer than they need to.",
    thoughts: ["(Was that on purpose?)", "(Their hand's warm. I didn't pull away... why didn't I?)", "(I hope they do it again.)"],
    allow: "You leave your fingers where they are. Neither of you lets go of the cup for a moment.",
    lean: "You let your fingertips trail across their knuckles as you let go. They forget to drink.",
  },
  {
    id: "handOnHers",
    level: 1,
    region: "hand",
    kinds: FARMER,
    reach: "The farmer rests a rough hand over yours on the table. \"You've been run off your feet all night.\"",
    thoughts: ["(Oh! Nobody's ever just... held my hand like that.)", "(It's only a hand. It's nice. It's only a hand.)", "(I could stand here all night.)"],
    allow: "You leave your hand under theirs. They give it a little squeeze before letting go.",
    lean: "You turn your hand over and lace your fingers with theirs. The farmer goes pink to the ears.",
  },
  {
    id: "gaze",
    level: 1,
    region: "face",
    kinds: ANY,
    reach: "They don't look at the cup. They look at you, slow and steady, as if they've got all night.",
    thoughts: ["(Why are they staring? Is there something on my face?)", "(I should look away. I'm not looking away.)", "(Let them look.)"],
    allow: "You hold their gaze until they're the one who blinks.",
    lean: "You hold their gaze and let a slow smile come. Their ears go red.",
  },
  {
    id: "wrist",
    level: 1,
    region: "hand",
    kinds: SMUGGLER,
    reach: "As you turn to go, the smuggler catches your wrist, gently. \"Not so fast, innkeeper.\"",
    thoughts: ["(Let go— no, they're not hurting me. Just... holding.)", "(My pulse is going so fast they must feel it.)", "(Don't let go yet.)"],
    allow: "You stop and let them hold you there. Their thumb moves once across your wrist.",
    lean: "You step back in close instead of pulling free. \"Fast enough for you?\"",
  },
  {
    id: "crumb",
    level: 1,
    region: "shoulder",
    kinds: FARMER,
    reach: "The farmer picks a crumb off your sleeve, then brushes the cloth smooth, taking their time about it.",
    thoughts: ["(That's... kind of them? I think?)", "(They're still smoothing it. There's nothing there now.)", "(Any excuse, hm?)"],
    allow: "You let them fuss over your sleeve until there's nothing left to brush.",
    lean: "\"Missed a bit,\" you say, offering the other arm. They laugh, and brush that one too.",
  },

  // 2: small and sweet.
  {
    id: "hairEar",
    level: 2,
    region: "hair",
    kinds: SMUGGLER,
    reach: "The smuggler reaches up and tucks a loose strand of hair behind your ear.",
    thoughts: ["(W-what? Why would they—)", "(My ear's burning. Can they tell?)", "(Their fingers can stay there.)"],
    allow: "You hold still while their fingers trace the curve of your ear.",
    lean: "You tilt your head into their hand like a cat. The smuggler's grin goes soft.",
  },
  {
    id: "cheek",
    level: 2,
    region: "face",
    kinds: ANY,
    reach: "A hand comes up and cups your cheek, still warm from the cup it was holding.",
    thoughts: ["(Nobody's touched my face like this. Not ever.)", "(I'm blushing. I know I'm blushing.)", "(Mm. Warm.)"],
    allow: "You let them hold your face a moment. Your cheek is hot under their palm.",
    lean: "You turn and press a quick kiss into their palm. They stare at their hand as if you'd put gold in it.",
  },
  {
    id: "holdHand",
    level: 2,
    region: "hand",
    kinds: FUGITIVE,
    reach: "The stranger takes your hand in both of theirs and says nothing at all. Their hands are shaking a little.",
    thoughts: ["(Are they all right? Should I...?)", "(They're as nervous as I am.)", "(Let them hold on.)"],
    allow: "You let them hold your hand until the shaking stops.",
    lean: "You squeeze back and stay a moment. \"You're safe in here.\" They hold on tighter.",
  },
  {
    id: "nose",
    level: 2,
    region: "face",
    kinds: SOLDIER,
    reach: "The soldier taps you on the nose. \"Boop. You looked too serious.\"",
    thoughts: ["(Did a grown soldier just— boop me?)", "(I'm trying not to smile. I'm failing.)", "(Two can play at that.)"],
    allow: "You wrinkle your nose at them, and the whole table laughs.",
    lean: "You tap their nose right back. \"Boop yourself.\" They go red to the ears.",
  },
  {
    id: "collar",
    level: 2,
    region: "shoulder",
    kinds: FARMER,
    reach: "\"Your collar's all crooked.\" The farmer straightens it, knuckles brushing your collarbone.",
    thoughts: ["(That's close. That's very close to my—)", "(They're taking an awfully long time over a collar.)", "(Crooked on purpose, maybe.)"],
    allow: "You let them fix it, and then fix it again.",
    lean: "\"Is it straight now?\" You lift your chin to let them see. They have to check twice.",
  },

  // 3: close.
  {
    id: "armRound",
    level: 3,
    region: "shoulder",
    kinds: SOLDIER,
    reach: "The soldier throws an arm round your shoulders and hauls you in against their side. \"This one! Best innkeeper on the pass!\"",
    thoughts: ["(Too close, too close, they smell of ale—)", "(They're so warm. And solid.)", "(I fit here rather well.)"],
    allow: "You stay tucked under their arm while they boast about you to the table.",
    lean: "You slip an arm round their waist in return. The table bangs their cups for you both.",
  },
  {
    id: "waist",
    level: 3,
    region: "waist",
    kinds: ANY,
    reach: "A hand slides round your waist as you set the cup down.",
    thoughts: ["(W-what are they— no one's ever...)", "(My heart's pounding. Why don't I hate this?)", "(I've been waiting all night for someone to do that.)"],
    allow: "You go still. You don't move the hand.",
    lean: "You set the tray down and let them draw you close.",
  },
  {
    id: "bench",
    level: 3,
    region: "shoulder",
    kinds: FARMER,
    reach: "The farmer pats the bench. \"Sit a minute. Just a minute.\" They tug you down beside them, hip to hip.",
    thoughts: ["(I have tables waiting. I have— oh, I'm sitting.)", "(Our legs are touching. They must notice.)", "(A minute. Or five.)"],
    allow: "You sit with them a minute, pressed close on the narrow bench.",
    lean: "You sit, and rest your head on their shoulder a moment. The farmer forgets how to breathe.",
  },
  {
    id: "whisper",
    level: 3,
    region: "neck",
    kinds: SMUGGLER,
    reach: "The smuggler leans in to whisper something. Their lips almost touch your ear, and you don't hear a word of it.",
    thoughts: ["(I can feel their breath. What did they say?)", "(Say it again. Slower.)", "(Whatever it was, the answer's yes.)"],
    allow: "You stay close and let them whisper. You still don't catch a word.",
    lean: "You turn your head so your cheek brushes theirs. \"Say that again.\"",
  },
  {
    id: "lowBack",
    level: 3,
    region: "waist",
    kinds: ANY,
    reach: "As you squeeze past the table, a hand settles on the small of your back to steer you through.",
    thoughts: ["(I can manage on my own, thank you!)", "(It's just a hand. Low on my back. Just a hand.)", "(A little lower and I wouldn't mind.)"],
    allow: "You let them guide you through. The hand stays a moment after you're clear.",
    lean: "You slow right down, so the hand has to stay longer.",
  },

  // 4: cheeky.
  {
    id: "smack",
    level: 4,
    region: "rear",
    kinds: SOLDIER,
    reach: "A soldier's hand swings toward your backside as you turn from the table.",
    thoughts: ["(Are they really going to—)", "(I should be furious. Why am I blushing?)", "(Finally.)"],
    allow: "SMACK. You squeak, and the whole table roars. \"You brute!\" But you're smiling.",
    lean: "SMACK. You look back over your shoulder. \"That the best you've got, soldier?\"",
  },
  {
    id: "kissHand",
    level: 4,
    region: "hand",
    kinds: SMUGGLER,
    reach: "The smuggler takes your hand and lifts it to their lips, eyes on yours the whole time.",
    thoughts: ["(Like a lady in a story. Nobody does that to an innkeeper.)", "(Their lips are soft. Oh no.)", "(Don't stop at the hand.)"],
    allow: "You let them kiss the back of your hand. They take their time over it.",
    lean: "You turn your hand so they kiss your wrist instead. The smuggler's eyes go dark.",
  },
  {
    id: "tugTie",
    level: 4,
    region: "clothes",
    kinds: SOLDIER,
    strip: true,
    reach: "A soldier hooks a finger in your {piece} and tugs. \"This needs to come off, love.\"",
    thoughts: ["(No— that's mine, give it—)", "(It's only my {piece}. It's only...)", "(Go on, then.)"],
    allow: "Your {piece} comes away in their hand. The table whistles.",
    lean: "You turn so they can get at it better. Your {piece} comes off, and the table howls.",
  },
  {
    id: "twirl",
    level: 4,
    region: "waist",
    kinds: FARMER,
    reach: "The farmer grabs both your hands and spins you round in a clumsy little dance between the tables.",
    thoughts: ["(I don't know how to dance! I'll tread on—)", "(I'm laughing. When did I start laughing?)", "(Again! Spin me again.)"],
    allow: "You let them spin you round and catch you at the end.",
    lean: "You spin right into their arms at the end, and stay there a moment too long.",
  },
  {
    id: "chin",
    level: 4,
    region: "face",
    kinds: SMUGGLER,
    reach: "The smuggler lifts your chin with one finger, so you have to look at them.",
    thoughts: ["(Why am I letting them— I can't look away.)", "(Are they going to kiss me? Are they?)", "(Well? Go on.)"],
    allow: "You let them tip your face up and look at you as long as they like.",
    lean: "You hold still, lips parted, and watch them lose their nerve first.",
  },

  // 5: bold.
  {
    id: "lap",
    level: 5,
    region: "lap",
    kinds: SOLDIER,
    reach: "The soldier catches you round the middle and pulls you down onto their lap.",
    thoughts: ["(Put me down! People are watching!)", "(Everyone's watching. I'm still sitting here.)", "(Comfortable, actually.)"],
    allow: "You end up on their knee, and you don't get up straight away.",
    lean: "You settle in and loop an arm round their neck. The table bangs their cups.",
  },
  {
    id: "cheekKiss",
    level: 5,
    region: "face",
    kinds: ANY,
    reach: "They lean in quick and plant a kiss on your cheek.",
    thoughts: ["(On my cheek— in front of everyone!)", "(My cheek's tingling. Is that normal?)", "(Only the cheek?)"],
    allow: "You touch your cheek where they kissed it. It's still warm.",
    lean: "You turn the other cheek to them. \"Fair's fair.\" They oblige.",
  },
  {
    id: "thigh",
    level: 5,
    region: "thigh",
    kinds: ANY,
    reach: "A hand lands on your thigh as you lean in to take the empties.",
    thoughts: ["(That's my leg! That's— my leg!)", "(Through the cloth I can feel how warm it is.)", "(Stay a while.)"],
    allow: "You let the hand rest there while you stack the cups. Slowly.",
    lean: "You take your time with the cups. A long time.",
  },
  {
    id: "lock",
    level: 5,
    region: "hair",
    kinds: SMUGGLER,
    reach: "The smuggler winds a lock of your hair round one finger and gives it a little tug.",
    thoughts: ["(Hey! That's attached!)", "(Why does that make my stomach flip?)", "(Tug it again.)"],
    allow: "You let them play with your hair while they finish their drink.",
    lean: "You lean closer, so they can reach more of it.",
  },
  {
    id: "behind",
    level: 5,
    region: "waist",
    kinds: FUGITIVE,
    reach: "Arms slide round you from behind and hold on. The stranger's forehead rests between your shoulders.",
    thoughts: ["(Oh! Who— oh. It's them. They're trembling.)", "(Nobody's held me like this. Ever.)", "(I'll stay till they're ready to let go.)"],
    allow: "You stand still and let them hold you for a while.",
    lean: "You cover their hands with yours and keep them there.",
  },
  {
    id: "feed",
    level: 5,
    region: "lips",
    kinds: FARMER,
    reach: "The farmer holds a bit of bread up to your lips. \"Go on. You've not eaten all night.\"",
    thoughts: ["(From their fingers? That's so—)", "(Their fingers touched my lip.)", "(Mm. And the fingers.)"],
    allow: "You take it from their fingers. They watch you chew like it's the best show in town.",
    lean: "You take the bread, and nip their fingertip for good measure. The farmer chokes on their ale.",
  },

  // 6: hands wander.
  {
    id: "squeeze",
    level: 6,
    region: "rear",
    kinds: SOLDIER,
    reach: "A hand settles on your backside and squeezes, bold as anything.",
    thoughts: ["(They're— how dare—)", "(My face is on fire. My legs won't move.)", "(Bold. I like bold.)"],
    allow: "You freeze, flushed to the ears, and let them have their handful.",
    lean: "You push back into their hand, just a little. The soldier forgets their own name.",
  },
  {
    id: "nuzzle",
    level: 6,
    region: "neck",
    kinds: SMUGGLER,
    reach: "The smuggler buries their face in your neck and breathes you in.",
    thoughts: ["(That tickles— that's my neck— what—)", "(My knees have gone weak.)", "(Don't you dare stop.)"],
    allow: "You tip your head aside and let them. Your eyes close by themselves.",
    lean: "You tip your head right back to give them more.",
  },
  {
    id: "bounce",
    level: 6,
    region: "lap",
    kinds: SOLDIER,
    reach: "The soldier sits you on their knee and bounces you like a pony ride. \"Giddy up!\"",
    thoughts: ["(I'm going to fall off!)", "(This is ridiculous. I can't stop laughing.)", "(Faster, then.)"],
    allow: "You hang on to their shoulders and laugh till you can't breathe.",
    lean: "You hang on and ride it out, shrieking. The table cheers you on.",
  },
  {
    id: "hip",
    level: 6,
    region: "waist",
    kinds: ANY,
    reach: "The hand on your waist slides down, slow, until it's resting on your hip.",
    thoughts: ["(That's not my waist any more.)", "(Lower. It went lower. I didn't stop it.)", "(Better.)"],
    allow: "You let the hand settle on your hip and stay there.",
    lean: "You shift your weight into it, so their hand fits just right.",
  },
  {
    id: "pullClose",
    level: 6,
    region: "shoulder",
    kinds: FUGITIVE,
    reach: "The stranger pulls you in against their chest and holds you there, close enough to hear their heart.",
    thoughts: ["(Their heart's racing. So's mine.)", "(I could stay like this.)", "(I want more than this.)"],
    allow: "You rest against them and listen to their heart slow down.",
    lean: "You wrap your arms round them in return and hold on just as tight.",
  },

  // 7: over the line.
  {
    id: "grab",
    level: 7,
    region: "chest",
    kinds: SOLDIER,
    reach: "The soldier pulls you close, and their hand slides up from your waist to your chest.",
    thoughts: ["(No, no, that's too far—)", "(Nobody's ever... I don't know what to do.)", "(Don't stop.)"],
    allow: "You can't breathe. You don't stop them.",
    lean: "You press into their hand. The table goes quiet. Then someone whistles.",
  },
  {
    id: "kiss",
    level: 7,
    region: "lips",
    kinds: ANY,
    reach: "They catch your face in both hands and kiss you, right on the lips.",
    thoughts: ["(They're— mmph!)", "(Oh. Oh, so that's what all the songs are about.)", "(Finally.)"],
    allow: "You let them kiss you. When they let go, you've forgotten what you came over for.",
    lean: "You kiss them back. The table bangs the boards like a drum.",
  },
  {
    id: "coin",
    level: 7,
    region: "chest",
    kinds: SMUGGLER,
    reach: "The smuggler slides a silver coin into your neckline. \"For later.\"",
    thoughts: ["(Their fingers were right— in my— !)", "(The coin's cold. Their fingers weren't.)", "(I'll want more than one.)"],
    allow: "You leave the coin where it is. It's warm by the time you take it out.",
    lean: "\"Only one?\" They laugh, and slide in another.",
  },
  {
    id: "pin",
    level: 7,
    region: "waist",
    kinds: SOLDIER,
    reach: "The soldier backs you up against the bar, one hand either side of you, grinning.",
    thoughts: ["(I can't get past— let me past—)", "(I'm trapped. I don't want to get out.)", "(Now what are you going to do about it?)"],
    allow: "You stay pinned, back to the bar, heart hammering, until they let you go.",
    lean: "You hook a finger in their collar and pull them closer.",
  },
  {
    id: "stolenKiss",
    level: 7,
    region: "lips",
    kinds: FARMER,
    reach: "As you bend to clear their table, the farmer steals a kiss, quick, and goes bright red.",
    thoughts: ["(They— just— !)", "(I'll pretend that didn't happen. I'll think about it all night.)", "(Shy farmer. Not so shy.)"],
    allow: "You straighten up, touch your lips, and say nothing at all.",
    lean: "You bend down and steal one right back. The farmer nearly falls off the bench.",
  },

  // 8: heated.
  {
    id: "neckKiss",
    level: 8,
    region: "neck",
    kinds: SMUGGLER,
    reach: "The smuggler's lips find your neck, and work their way down, slow.",
    thoughts: ["(Nobody's ever— stop, I—)", "(I can't think. I can't think at all.)", "(Lower.)"],
    allow: "You hold on to the edge of the table and let them, eyes closed.",
    lean: "You tip your head back and pull them in closer.",
  },
  {
    id: "thighUp",
    level: 8,
    region: "thigh",
    kinds: ANY,
    reach: "A hand on your knee starts sliding up your thigh, slow.",
    thoughts: ["(Too high, too high—)", "(I should stop them. Why can't I move?)", "(Higher.)"],
    allow: "You catch your breath and let the hand stay where it stopped.",
    lean: "You catch their wrist, and don't push it away.",
  },
  {
    id: "teeth",
    level: 8,
    region: "clothes",
    kinds: SOLDIER,
    strip: true,
    reach: "The soldier catches the tie of your {piece} in their teeth and pulls.",
    thoughts: ["(With their teeth?! That's—)", "(I can feel it coming loose.)", "(Go on. All the way.)"],
    allow: "The tie gives, and your {piece} goes. The table goes wild.",
    lean: "You lean in to make it easier. Your {piece} goes, and the whole room is watching now.",
  },
  {
    id: "bothHands",
    level: 8,
    region: "chest",
    kinds: SOLDIER,
    reach: "Both of the soldier's hands come up, bold as you like, and take a good handful.",
    thoughts: ["(B-both of them— in front of everyone!)", "(Everyone's watching. I'm letting them.)", "(Mm. Greedy.)"],
    allow: "You go red to the roots of your hair and let them.",
    lean: "You arch into it with a sigh, and half the room spills their drinks.",
  },
  {
    id: "holdLap",
    level: 8,
    region: "lap",
    kinds: ANY,
    reach: "They pull you onto their lap and lock their arms round you. \"You're not going anywhere.\"",
    thoughts: ["(I have work! Let me go!)", "(I'm not trying very hard to get up.)", "(Good. I wasn't planning to.)"],
    allow: "You stop wriggling and let them hold you there.",
    lean: "You get comfortable, and hold on to them right back.",
  },

  // 9: barely holding back.
  {
    id: "deepKiss",
    level: 9,
    region: "lips",
    kinds: ANY,
    reach: "They pull you down and kiss you deep and slow, as if there's nobody else in the room.",
    thoughts: ["(I can't— breathe— !)", "(I'm melting. I'm actually melting.)", "(Yes.)"],
    allow: "You let it go on until your knees give. They hold you up.",
    lean: "You kiss them back just as hard. The room goes quiet, then erupts.",
  },
  {
    id: "unlace",
    level: 9,
    region: "clothes",
    kinds: SOLDIER,
    strip: true,
    reach: "The soldier gets hold of your {piece} and starts working it loose, slow, while the table counts along.",
    thoughts: ["(Not here! Not in front of all of—)", "(They're counting. I'm letting them count.)", "(Faster.)"],
    allow: "Your {piece} comes off on 'five'. The cheer shakes the windows.",
    lean: "You help them with it. Your {piece} comes off, and the cheer shakes the windows.",
  },
  {
    id: "wall",
    level: 9,
    region: "waist",
    kinds: SMUGGLER,
    reach: "The smuggler draws you into the dark corner by the barrels and presses you back against the wall.",
    thoughts: ["(It's dark— what are they—)", "(Nobody can see us here. That's the problem.)", "(Nobody can see us here. Good.)"],
    allow: "You stay there in the dark with them until someone shouts for ale.",
    lean: "You pull them in closer, and the shadows swallow you both.",
  },
  {
    id: "roam",
    level: 9,
    region: "waist",
    kinds: SMUGGLER,
    reach: "The smuggler's hands roam, slow and sure, as if they're learning you by heart.",
    thoughts: ["(Everywhere— their hands are everywhere—)", "(I've stopped pretending I want them to stop.)", "(Learn it all.)"],
    allow: "You stand there and let them, breathing hard.",
    lean: "You guide their hands where you want them.",
  },
  {
    id: "carry",
    level: 9,
    region: "waist",
    kinds: SOLDIER,
    reach: "The soldier heaves you up over their shoulder like a sack of grain and parades you round the room.",
    thoughts: ["(Put me DOWN!)", "(I'm upside down and laughing like a fool.)", "(Victory lap!)"],
    allow: "You beat their back with your fists, laughing, as they carry you a full lap.",
    lean: "You wave to the room like a queen. They carry you round twice.",
  },

  // 8 and 9, intimate: a hand that goes where nobody's ever been let go. Never described past the touch itself.
  {
    id: "underTable",
    level: 8,
    region: "intimate",
    kinds: ANY,
    reach: "Under the table, a hand slides up between your knees, and doesn't stop.",
    thoughts: ["(Under the table— not there, not—)", "(Nobody can see. Nobody can see what they're doing.)", "(Don't stop.)"],
    allow: "You grip the edge of the table and keep your face very still.",
    lean: "You shift your knees apart, just a little, and bite your lip.",
  },
  {
    id: "lingering",
    level: 8,
    region: "intimate",
    kinds: FARMER,
    reach: "The farmer's fingers trace the inside of your thigh, higher, until there's nowhere higher to go.",
    thoughts: ["(That's— that's as high as—)", "(My whole body's listening to that one hand.)", "(Yes. There.)"],
    allow: "You stand frozen, breathing hard, and let them stay.",
    lean: "You close your eyes and lean back against them.",
  },
  {
    id: "beneath",
    level: 9,
    region: "intimate",
    kinds: SMUGGLER,
    reach: "The smuggler's hand finds its way under your skirt, slow and certain, as if it's been there before.",
    thoughts: ["(Under my— they can't—)", "(They can. I'm letting them.)", "(There. Right there.)"],
    allow: "You go very still, and very red, and let them.",
    lean: "You press into their hand and hide your face in their shoulder.",
  },
  {
    id: "pinned",
    level: 9,
    region: "intimate",
    kinds: [...SOLDIER, ...FUGITIVE],
    reach: "They pull you down between their knees, one arm round your waist, and the other hand goes lower.",
    thoughts: ["(Everyone's right there—!)", "(Nobody's looking. Everybody's looking. I can't tell.)", "(Lower. Please.)"],
    allow: "You hold on to their shoulders and let it happen, trembling.",
    lean: "You rock against their hand, and forget the room entirely.",
  },

  // 10: the invitation. A lover's, after closing: nobody in the room reaches for these yet.
  {
    id: "upstairs",
    level: 10,
    region: "invite",
    kinds: SMUGGLER,
    romance: true,
    reach: "\"Upstairs. Now,\" the smuggler murmurs against your ear.",
    thoughts: ["(I've never... not with anyone.)", "(My hands are shaking. I want to.)", "(Yes.)"],
    allow: "You take their hand, and the stairs creak under you both.",
    lean: "You're halfway up the stairs before they are.",
  },
  {
    id: "lead",
    level: 10,
    region: "invite",
    kinds: ANY,
    romance: true,
    reach: "They take your hand and lead you, slowly, toward the stairs.",
    thoughts: ["(Where are we— oh.)", "(I could stop. I'm not stopping.)", "(Finally.)"],
    allow: "You let them lead you up.",
    lean: "You lead them instead.",
  },
  {
    id: "key",
    level: 10,
    region: "invite",
    kinds: FUGITIVE,
    romance: true,
    reach: "The stranger presses a key into your palm. \"Room three. If you want.\"",
    thoughts: ["(A key. To their room.)", "(I want to.)", "(I've wanted to for nights.)"],
    allow: "You close your hand round the key.",
    lean: "You close your hand round the key, and kiss them before you go up.",
  },
  {
    id: "stay",
    level: 10,
    region: "invite",
    kinds: ANY,
    romance: true,
    reach: "They kiss you, then pull back just far enough to ask. \"Stay with me tonight?\"",
    thoughts: ["(I don't know how. I don't know anything.)", "(Yes. Yes, I think so.)", "(Yes.)"],
    allow: "\"Yes,\" you whisper.",
    lean: "You answer with another kiss.",
  },
];

/** What she says and what comes of it when she slaps the hand away or slips out of reach, for any touch. */
export const SLAPS: readonly { say: string; result: string }[] = [
  { say: "\"Hands to yourself!\"", result: "Your palm cracks across their hand. They snatch it back, glaring." },
  { say: "\"How dare you!\"", result: "SLAP. The table goes quiet. Then someone laughs at them, not you." },
  { say: "\"Keep your hands on your cup.\"", result: "You smack their hand away. They rub it, sulking." },
  { say: "\"Try that again and you're out in the snow.\"", result: "You slap them away. They mutter into their ale and don't try it again." },
];

export const PULLS: readonly { say: string; result: string }[] = [
  { say: "\"I— I have other tables!\"", result: "You slip out of reach, flustered. They laugh it off." },
  { say: "\"Not tonight.\"", result: "You step back, out of reach. They raise their hands and let you go." },
  { say: "\"Behave.\"", result: "You twist free with a look. They grin, but they let you be." },
  { say: "\"I'm working.\"", result: "You slide away before the hand lands. They shrug and go back to their drink." },
];

/** Why only slapping and pulling away are on offer when someone's had far too much. */
export const TOO_DRUNK_TO_ALLOW = "(Not like this. Not when I can barely stand.)";
export const GUEST_TOO_DRUNK = "(They're too drunk to know what they're doing. No.)";

/** What she thinks the first time she lets something like it happen, by where it lands. */
export const FIRSTS: Record<TouchRegion, string> = {
  hand: "(Nobody's ever held my hand like that.)",
  face: "(Nobody's ever touched my face like that.)",
  hair: "(I didn't know having my hair touched could feel like that.)",
  shoulder: "(Nobody's ever pulled me close like that.)",
  waist: "(Nobody's ever held me like that.)",
  rear: "(Nobody's ever dared touch me there.)",
  chest: "(Nobody's ever touched me there. Nobody.)",
  lap: "(I've never sat on anyone's lap. Ever.)",
  lips: "(My first kiss. In a tavern. With the whole room watching.)",
  neck: "(I didn't know my neck could feel like that.)",
  thigh: "(No one's ever touched me there.)",
  clothes: "(I've never let anyone take my clothes off.)",
  intimate: "(Nobody's ever touched me there. Not ever. Not even me, much.)",
  invite: "(I've never... with anyone.)",
};

/** What she says once she's used to it, by where it lands: she's stopped being shocked and started teasing. */
export const CONFIDENT: Record<TouchRegion, string> = {
  hand: "\"Your hands are cold. Warm them up, then.\"",
  face: "\"You like my face, don't you?\"",
  hair: "\"Careful. It took me all morning.\"",
  shoulder: "\"You're comfy. Don't let it go to your head.\"",
  waist: "\"Is that where your hand lives now?\"",
  rear: "\"That'll cost you extra.\"",
  chest: "\"Bold. Tip accordingly.\"",
  lap: "\"Best seat in the house, this.\"",
  lips: "\"Mm. You'll want to pay for that.\"",
  neck: "\"You'll leave a mark. People will talk.\"",
  thigh: "\"Higher costs more.\"",
  clothes: "\"You only get one piece a night. Choose well.\"",
  intimate: "\"Not where the whole room can see. ...Under the table's fine.\"",
  invite: "\"I thought you'd never ask.\"",
};
