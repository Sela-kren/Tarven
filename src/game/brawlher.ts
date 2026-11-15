/**
 * What she says back in a brawl's log, Karryn's Prison style (Karryn's lines in RemLines.json, as raw as KP's;
 * GAME_PATH.MD 7i).
 *
 * How she says it:
 * - Answering talk, a stare, turning him down or struggling: by her Slut Level (fightface.ts tiers: proper, easy,
 *   lewd).
 * - In a scene with him: by how used she is to it (KP's experience levels for each act): the first time ever
 *   ("first"), then proper, easy and lewd as she's done it more (EXPERIENCE_FROM).
 * - Over either: horny, she can't keep it out of her voice; with no willpower left, she's broken, barely words.
 */
import type { DuelArea } from "./duel";
import type { FightTier } from "./fightface";

/** What she's answering. */
export type HerMoment = "talk" | "sight" | "taken" | "pose" | "goAlong" | "struggle" | "refuse";
/** How she says it: her very first time at it, her tier, or her state over it. */
export type HerVoice = "first" | FightTier | "horny" | "broken";
/** In a scene, these moments go by her experience at it, not her Slut Level. */
export const SCENE_MOMENTS: ReadonlySet<HerMoment> = new Set<HerMoment>(["taken", "pose", "goAlong"]);

/** Times she's done an act before she talks about it easy, then lewd (KP's experience levels 1, 2, 3). */
export const EXPERIENCE_FROM = { easy: 5, lewd: 15 } as const;

/** How used she is to an act, by how many times she's done it. */
export function experienceTier(times: number): "first" | FightTier {
  if (times <= 0) return "first";
  return times >= EXPERIENCE_FROM.lewd ? "lewd" : times >= EXPERIENCE_FROM.easy ? "easy" : "proper";
}

/**
 * Her voice. Broken first, with no willpower left; then her first time at it, which nothing else can make easy;
 * then horny, unless she's past caring (lewd); else her tier (or experience).
 */
export function herVoice(tier: "first" | FightTier, horny: boolean, will: number): HerVoice {
  if (will <= 0) return "broken";
  if (tier === "first") return "first";
  if (horny && tier !== "lewd") return "horny";
  return tier;
}

type Lines = Readonly<Record<HerVoice, readonly string[]>>;

/** Her answer, by what she's answering and how she is. */
export const HER_LINES: Readonly<Record<HerMoment, Lines>> = {
  talk: {
    first: ["W-what did you just say to me?!", "How can you say something so filthy out loud?!"],
    proper: [
      "Keep your filthy mouth shut!",
      "Say that again and you'll be eating the floor.",
      "Pig. Get out of my tavern.",
      "Talk like that and you'll leave without your teeth.",
      "Disgusting. Absolutely disgusting.",
      "I've heard better from drunk goats.",
      "You think I'd let your little cock anywhere near me?",
      "Keep dreaming, you sad, sad man.",
    ],
    easy: [
      "W-where do you get off saying that...",
      "Stop it... don't talk about me like that.",
      "You... you can't just say that...",
      "Ugh, everyone can hear you!",
      "I'm not... it's not like that...",
      "Q-quiet, you idiot!",
      "Don't say cock so loud...!",
      "Why is my face so hot...",
    ],
    lewd: [
      "Mm? Is that a promise?♥",
      "Talk is cheap. Show me your cock.♥",
      "Go on, tell me more.♥ Tell me exactly what you'd do.",
      "Is that all? Say something filthier.♥",
      "Careful. I might hold you to that.♥",
      "Ooh, I like the way you think.♥",
      "Big words. Is the cock as big?♥",
      "Keep talking like that and I'll be dripping.♥",
    ],
    horny: [
      "Stop... saying things like that... I can't think...",
      "Gods, why does that make me so wet...",
      "Don't... don't put pictures in my head...",
      "Ngh... shut up... shut up...",
      "My body... it's listening to you...",
      "Please, stop talking... or don't...",
      "I can feel myself getting wetter... damn you...",
      "Every word goes straight between my legs...",
    ],
    broken: ["...please...", "...don't...", "...whatever you say...", "...mm..."],
  },
  sight: {
    first: ["D-don't look! Nobody's ever seen me like this!", "Stop staring! I've never... not in front of people...!"],
    proper: [
      "Eyes up here, pig!",
      "Stop staring!",
      "Look at me like that again and I'll gouge them out.",
      "Enjoy it. It's the last thing you'll see.",
      "Turn your head, or I'll turn it for you.",
      "What are you gawping at?!",
      "Never seen a woman before? Pathetic.",
      "Stop drooling on my floor.",
    ],
    easy: [
      "D-don't look... don't look at me...",
      "Ugh, quit gawping...",
      "S-stop staring, it's embarrassing!",
      "Why does everyone have to look...",
      "I'm not putting on a show for you!",
      "Close your eyes. Please.",
      "It's not on purpose, my clothes just...!",
      "Don't look at my... there...",
    ],
    lewd: [
      "Like what you see?♥",
      "Look all you like. Touching costs extra.♥",
      "Go on, take a good long look.♥",
      "Want to see more?♥",
      "Enjoying the view?♥ I can tell you are.",
      "Stare harder. I like it.♥",
      "My tits are better up close, you know.♥",
      "Look how wet you've made me.♥",
    ],
    horny: [
      "Stop looking... it makes me...",
      "Your eyes... I can feel them...",
      "Gods, everyone's watching... and I'm getting wetter...",
      "Don't look at me like that, I'll...",
      "Ah... why does it feel good to be seen...",
      "Look... look at me...",
      "My nipples are so hard... don't stare...",
      "If you keep looking, I'll... ngh...",
    ],
    broken: ["...", "...stop...", "...look then...", "...don't care..."],
  },
  taken: {
    first: [
      "W-wait, I've never done this before...!",
      "Is this... is this how it goes...?",
      "Ahh! It's... it's so big...!",
      "My first time... in a taproom... in front of everyone...",
      "S-slow down, I don't know how...!",
      "Ngh! It hurts, it hurts...!",
    ],
    proper: [
      "Damn you... just get it over with.",
      "This doesn't mean anything!",
      "I'll remember your face for this.",
      "Fine. Fine. But you'll regret it.",
      "Don't think this means you've won.",
      "Get it done and get out.",
      "I'm only letting you because I'm tired of fighting.",
      "Tch. Not again...",
    ],
    easy: [
      "Ah... wait... not here...",
      "Everyone's watching... ah...",
      "Not in front of... ahh...",
      "J-just this once...",
      "I can't believe I'm doing this again...",
      "B-be gentle, at least...",
      "Ahh... it's going in...",
      "I keep ending up like this...",
    ],
    lewd: [
      "Finally. Took you long enough.♥",
      "Mm. Go on then.♥",
      "There you go. Was that so hard?♥",
      "Let's give them a show.♥",
      "Hurry up and fill me.♥",
      "Don't you dare hold back.♥",
      "Welcome in.♥ Make yourself at home.",
      "Ooh, a nice thick one.♥",
    ],
    horny: [
      "Yes... yes, I need it...",
      "Hurry... please...",
      "I can't wait... I can't...",
      "Gods, yes, finally...",
      "Give it to me...",
      "I've wanted a cock all night...",
      "Fill me, fill me up...",
      "Ahh, it's in, it's in...!",
    ],
    broken: ["...ah...", "...whatever... you want...", "...", "...okay..."],
  },
  pose: {
    first: [
      "Ah! Ah! What is this feeling...?!",
      "It's... too much... I didn't know...!",
      "My body's... doing things on its own...!",
      "Is it supposed to feel like this...?!",
      "Ngh... ahh... I can't... think...!",
    ],
    proper: [
      "Ngh... I won't... give you the satisfaction...",
      "Hurry up and finish...",
      "Is that... all you've got...",
      "I'm not... feeling anything...",
      "Tch... pathetic...",
      "Just... get it over with...",
      "I'm not... enjoying this... ngh...",
      "Don't you dare... make me moan...",
    ],
    easy: [
      "Ah... ahh... too much...",
      "Don't... make me... ngh...",
      "S-so deep... ah...",
      "Wait... slow down...",
      "Ah! Not so hard...",
      "People are... watching... ah...",
      "It's rubbing... right there... ah...",
      "I'm... I'm starting to feel it...",
    ],
    lewd: [
      "Ahh, yes, like that!♥",
      "Harder, don't hold back!♥",
      "Mm, there, right there!♥",
      "Is that all? More!♥",
      "Yes! Use me!♥",
      "Don't you dare stop!♥",
      "Your cock feels so good!♥",
      "Fuck me harder, harder!♥",
    ],
    horny: [
      "Ah! Ah! More, more!",
      "Don't stop, gods, don't stop!",
      "I'm... I'm going to...!",
      "Yes, yes, yes!",
      "It's so good, it's so good!",
      "Fill me up!",
      "Your cock, your cock, your cock...!",
      "I'm cumming, I'm cumming...!",
    ],
    broken: ["...ah... ah...", "...", "...mm...", "...hah..."],
  },
  goAlong: {
    first: [
      "L-like this? Is this right?",
      "I've never... touched one before...",
      "It's so hot... and it's twitching...",
      "W-what do I do? Do I just...?",
      "It tastes... strange...",
    ],
    proper: [
      "The sooner you're done, the sooner you're out.",
      "Just... get on with it.",
      "There. Happy now?",
      "Don't get used to this.",
      "I'm only doing this to end it.",
      "Finish already.",
      "If I do this, you'll leave. Understood?",
      "Hurry up and come, damn you.",
    ],
    easy: [
      "L-like this...?",
      "Is this... what you want...?",
      "D-don't tell anyone...",
      "Am I... doing it right?",
      "Mm... it's not so bad...",
      "Your cock's so hard... because of me?",
      "I'm getting better at this...",
      "Tell me when you're close...",
    ],
    lewd: [
      "Let me show you how it's done.♥",
      "Mm, you like that?♥",
      "Watch closely, boys.♥",
      "I'll have you finished in no time.♥",
      "Feel that? That's skill.♥",
      "Don't you dare come too soon.♥",
      "Mmh, I love the taste of you.♥",
      "Give me all of it.♥",
    ],
    horny: [
      "I can't stop... I can't stop...",
      "More... give me more...",
      "I need it... I need all of it...",
      "So good... so good...",
      "Don't you dare stop now...",
      "Gods, I want your cum...",
      "I'll do anything... just keep going...",
      "My body won't stop moving...",
    ],
    broken: ["...", "...yes...", "...like this...", "...mm..."],
  },
  struggle: {
    first: ["N-no! Not my first time, not like this!", "Get off! I've never... get off!"],
    proper: [
      "Get your hands OFF me!",
      "Enough! Get off!",
      "Let go, you animal!",
      "I said NO!",
      "Off! Now!",
      "Touch me again and lose the hand!",
      "Get your filthy cock away from me!",
      "Off, pig!",
    ],
    easy: [
      "N-no! Not like this!",
      "Let go of me!",
      "Wait, stop, stop!",
      "Not here, not in front of everyone!",
      "Please, let me up!",
      "I-I'm not doing this!",
      "Not again, not again...!",
      "Get it out of me!",
    ],
    lewd: [
      "Not yet, big boy. Earn it.♥",
      "Patience. You'll get your turn.♥",
      "Ah ah. Not like that.♥",
      "Catch me first.♥",
      "You'll have to work for it.♥",
      "Not so fast.♥",
      "Mm, I like it when you hold me down. But no.♥",
      "Too easy. Try harder.♥",
    ],
    horny: [
      "I... no... I have to... get off...",
      "Stop... before I can't...",
      "Let me go... let me go before I...",
      "My body won't... move... properly...",
      "No... no, I don't want... I do...",
      "Get off... please...",
      "If you keep going I'll... cum...",
      "My legs won't... close...",
    ],
    broken: ["...let... go...", "...no...", "...please...", "..."],
  },
  refuse: {
    first: ["N-no! I've never done that and I'm not starting with you!", "Absolutely not! I don't even... no!"],
    proper: [
      "Not a chance!",
      "In your dreams!",
      "Over my dead body.",
      "Try that again and I'll break your arm.",
      "Not in a thousand years.",
      "Hands off, pig!",
      "Put that tiny thing away.",
      "I'd sooner fuck a goat.",
    ],
    easy: [
      "N-not now!",
      "Hands off! I mean it!",
      "Not here! Are you mad?",
      "I'm... I'm not that kind of woman!",
      "Stop it, people are watching!",
      "N-no! Absolutely not!",
      "Put it away, put it away!",
      "Not with everyone looking...!",
    ],
    lewd: [
      "Not like that, you don't.♥",
      "You'll have to do better than that.♥",
      "Buy me a drink first.♥",
      "Is that how you ask a lady?♥",
      "Not yet. Beg a little.♥",
      "Nice try.♥",
      "Mm, tempting. But no.♥",
      "Ask me nicer and maybe.♥",
    ],
    horny: [
      "No... I... not yet...",
      "Don't... tempt me...",
      "I want... no. No!",
      "Stop, before I say yes...",
      "Ngh... not... now...",
      "Don't make this harder...",
      "Don't show me that... I'll...",
      "I'm so wet... but no...",
    ],
    broken: ["...no...", "...", "...not... that...", "...stop..."],
  },
};

/** Her, when he comes, by where he has her (KP's swallow, creampie and bukkake lines), and how she is. */
export const HER_COME_LINES: Readonly<Record<DuelArea | "none", Lines>> = {
  hands: {
    first: ["Eek! Something's coming out! It's all over my hand!", "It's so warm... and sticky... what is this...?"],
    proper: ["Ugh! All over my hand. Disgusting.", "Get a rag. Now.", "Filthy... I'll be scrubbing this off for days.", "Satisfied? Get out."],
    easy: ["Ah... it's everywhere...", "So much... and so hot...", "It's dripping through my fingers...", "You were really saving that up..."],
    lewd: ["Mm, look at all that.♥", "My hand's all sticky now.♥ Lick it clean?", "So much cum.♥ Good boy.", "Already? Shame.♥"],
    horny: ["Ahh... let me taste it...", "So much... I want it inside...", "More... I want more...", "It's so warm..."],
    broken: ["...", "...warm...", "...hah...", "...over...?"],
  },
  mouth: {
    first: ["Mmph?! Bleh! W-what is this?!", "It's... so bitter... I... swallowed it...", "*cough* Something shot into my throat!"],
    proper: ["*spits* Vile. Absolutely vile.", "Ugh... the taste... get out.", "I'm going to wash my mouth out with ale for a week.", "Never. Again."],
    easy: ["*gulp*... it's so thick...", "Hah... it's stuck in my throat...", "So much... it's coming out of my nose...", "I swallowed it all... ugh..."],
    lewd: ["*gulp*♥ Delicious.", "Mm♥ Thick and salty, just how I like it.", "Ahh♥ Look, all gone.", "Thank you for the meal.♥"],
    horny: ["*gulp* more... more...", "So thick... I need another...", "I love the taste... gods...", "Give me all of it..."],
    broken: ["...*gulp*...", "...", "...mm...", "...hah..."],
  },
  breasts: {
    first: ["Eek! It's all over my chest!", "Hot! It's so hot and sticky on my breasts!"],
    proper: ["All over my tits. You pig.", "I'll be washing this off for an hour.", "Disgusting. Get away from me.", "Was that really necessary?"],
    easy: ["It's dripping down between them...", "So much... my chest is covered...", "It's on my chin too...", "Ugh... it's sliding down..."],
    lewd: ["Mm, painted me white.♥", "Look at my tits now.♥ Pretty?", "So much.♥ Rub it in for me.", "Good boy.♥ Next?"],
    horny: ["So warm on my skin...", "More... cover me...", "I want to lick it off...", "Ahh... it's everywhere..."],
    broken: ["...", "...warm...", "...sticky...", "..."],
  },
  pussy: {
    first: ["Ah! Something hot... inside me...!", "He came... he came inside me...!", "It's filling me... is it supposed to...?!"],
    proper: ["Inside?! You bastard!", "Get it out of me... get out!", "I'll make you pay for every drop.", "Filthy... it's dripping out..."],
    easy: ["Ahh... so much inside...", "It's... it's spilling out...", "So warm... deep inside...", "I can feel it... filling me..."],
    lewd: ["Mm♥ So much inside me.", "Ahh♥ Fill me right up.", "Look, it's dripping out.♥ Wasteful.", "That's it.♥ Every drop in me."],
    horny: ["Yes... yes, fill me, fill me...", "So hot inside... more...", "I'm cumming too... ahh...!", "Don't pull out... not yet..."],
    broken: ["...full...", "...", "...warm...", "...ah..."],
  },
  butt: {
    first: ["Ahh! In my... back there... it's so hot...!", "Something's... gushing inside my rear...!"],
    proper: ["In my arse?! You animal!", "Get out of me. Get out!", "I'll break every bone in your body.", "Disgusting... it's leaking..."],
    easy: ["It's... deep in my rear...", "So much... in my arse...", "I can feel it... so deep...", "It's leaking out... ugh..."],
    lewd: ["Mm♥ Filled my arse right up.", "Ahh♥ So warm back there.", "Look, it's dripping out.♥", "That was a lot.♥ Good boy."],
    horny: ["Yes... fill my arse... more...", "So hot inside... ahh...", "I'm cumming from my arse...!", "Don't stop..."],
    broken: ["...", "...full...", "...hah...", "...mm..."],
  },
  none: {
    first: ["Did he just... in his trousers?", "W-what happened to him?"],
    proper: ["Pathetic.", "Hah. Couldn't even get it out.", "Go home and change, little man.", "That's the saddest thing I've seen all night."],
    easy: ["D-did he just...?", "Is that... a wet patch?", "Just from looking at me...?", "Um..."],
    lewd: ["Just from looking at me?♥ Cute.", "Aw, wasted.♥", "I didn't even touch you.♥", "That's flattering, honestly.♥"],
    horny: ["What a waste... I wanted that...", "Ahh... I wanted it in me...", "No... that was mine...", "Next time... give it to me..."],
    broken: ["...", "...hah...", "...", "..."],
  },
};

/** Her, coming mid-brawl (KP's karryn_orgasm lines), by her Slut Level and how she is. */
export const HER_CLIMAX_LINES: Lines = {
  first: ["W-what's happening to me?! Ahhh!", "I'm... I'm... AHHH!"],
  proper: [
    "N-no... not here... not in front of... AHH!",
    "Damn it... damn it... ngh... AHHH!",
    "I won't... I won't... hnnngh!!",
    "Don't look... don't look at me...!",
    "This isn't... happening... AHH!",
    "Curse you... all of you... ahhh...!",
  ],
  easy: [
    "Ah... ah... I'm... I'm cumming!",
    "N-not in front of everyone... ahhh!",
    "It's too much... I can't hold it... AHH!",
    "Everyone's... watching me cum...!",
    "My legs... ahh... they're shaking...",
    "No, no, no... ahhhh!",
  ],
  lewd: [
    "Ahhh♥ I'm cumming♥ I'm cummiiing♥",
    "Watch me♥ Watch me cum♥",
    "Yes♥ Yes♥ YESSS♥",
    "Gods, that's good♥ Ahhh♥",
    "Look at me♥ Cumming in my own taproom♥",
    "Mmmhh♥ More♥ Again♥",
  ],
  horny: [
    "I'm cumming, I'm cumming, I'm cumming!",
    "AHH! I can't stop it! I can't!",
    "Gods, finally, finally... ahhh!",
    "It's coming... it's... AHHH!",
    "So good... so good... I'm... ngh!!",
    "Don't stop... I'm... AHHH!",
  ],
  broken: ["...ah... ah...!", "...hnngh...!", "...aah...", "...!"],
};
