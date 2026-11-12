/**
 * After Hours role-play: the words for each kind of game she can choose to play. Every move has a few lines to
 * pick from, so the log doesn't repeat itself; a move with no lines here uses its plain line from duelmoves.ts.
 *
 * Every scene here is a game between adults who agreed to it first: she sets the rules, and the safe word (or
 * Stop) ends it at once, every time. The Captive scene is play-acted struggle, agreed on beforehand, never real.
 *
 * Words in braces are filled in when the line is shown: {safe} is the safe word below.
 */
import type { DuelArea } from "./duel";
import type { HerMove } from "./duelmoves";

/** The safe word they agree on before a role-play. Change it here and every line that says it follows. */
export const SAFE_WORD = "<guard word>";

export type RolePlay = "plain" | "tender" | "rough" | "captive";

/** The role-plays she can pick, what each is, and the passive she needs before she's willing (none: always). */
export const ROLE_PLAYS: readonly { id: RolePlay; name: string; about: string; needs?: string }[] = [
  { id: "plain", name: "Just a game", about: "No role-play: a friendly contest." },
  { id: "tender", name: "Sweethearts", about: "Slow and fond, like lovers who've waited all night." },
  { id: "rough", name: "Rough", about: "Hard hands and harder words, all agreed on.", needs: "stingingCheeks" },
  { id: "captive", name: "Captive", about: "She plays the caught barmaid and fights it, all pretend, with a safe word.", needs: "likesItRough" },
];

type Lines = readonly string[];

export interface SceneLines {
  /** Said once, as it starts, after the stake. */
  opening: Lines;
  /** Her moves on a man, and on a woman. */
  her: Partial<Record<HerMove, Lines>>;
  herOnWoman: Partial<Record<HerMove, Lines>>;
  /** A man's moves on her, and a woman's, by the part of her they have (or a kiss). */
  him: Partial<Record<"kiss" | DuelArea, Lines>>;
  her2: Partial<Record<"kiss" | DuelArea, Lines>>;
  /** A partner giving in: a man, a woman. */
  givesIn: Lines;
  givesInWoman: Lines;
  /** She wins; she goes first. */
  win: Lines;
  lose: Lines;
}

export const SCENES: Record<Exclude<RolePlay, "plain">, SceneLines> = {
  // ---------- Sweethearts: slow, fond, lovers ----------
  tender: {
    opening: [
      "The candle's low and the common room is quiet. They brush the hair from your face and smile like they've been waiting all night for this.",
      "They take your hand and lead you to the hearth, slow, as if there's all the time in the world.",
    ],
    her: {
      kiss: [
        "You cup their face and kiss them slowly, tasting the ale on their lips, until they sigh into your mouth.",
        "You kiss them soft, then deeper, and feel their heart hammering under your palm.",
      ],
      caress: [
        "You trace the line of their chest with your fingertips, unhurried, learning every place that makes them shiver.",
        "You slide your hands under their shirt and over warm skin, and they lean into your touch like a cat.",
      ],
      tease: [
        "You rest your forehead against theirs and whisper everything you've thought about tonight. They forget how to breathe.",
      ],
      hands: [
        "You wrap your fingers around them and stroke slowly, watching their face the whole time, smiling at every gasp.",
        "You take them in hand, gentle at first, then firmer, until they're rocking into your palm.",
      ],
      mouth: [
        "You kneel and take them into your mouth, slow and warm, your eyes on theirs as they tangle their fingers in your hair.",
        "You kiss your way down their stomach and take them in, unhurried, savouring every sound they make.",
      ],
      tits: [
        "You cradle them between your breasts and move slowly, and they groan your name like a prayer.",
        "You press your soft breasts around them, rocking gently, and they watch you like you're the only thing in the world.",
      ],
      ride: [
        "You climb into their lap and sink down onto them, slow, foreheads together, breathing each other's breath.",
        "You ride them in long, lazy rolls of your hips, their hands warm on your waist, guiding you.",
      ],
      anal: [
        "You ease back onto them with a slow breath, and they hold still, stroking your back, until you start to move.",
        "You take them in your ass, inch by careful inch, and they whisper how good you feel.",
      ],
    },
    herOnWoman: {
      kiss: [
        "You kiss her slowly, your fingers in her hair, until she's melting against you.",
        "You kiss along her jaw to her lips, soft as a secret, and she sighs into you.",
      ],
      caress: [
        "You run your hands down her curves, slow and admiring, and she arches into every touch.",
        "You trace circles on her bare hip with your thumb, and she shivers and pulls you closer.",
      ],
      tease: ["You whisper in her ear exactly how you're going to make her feel. She bites her lip and loses her rhythm."],
      hands: [
        "You slip your fingers between her thighs and find her wet, and work her in slow, patient circles.",
        "You stroke her gently, then deeper, your mouth on her neck, until she's trembling.",
      ],
      mouth: [
        "You kiss down her belly and settle between her thighs, using your tongue slowly, savouring her.",
        "You go down on her, unhurried, holding her hips as she gasps your name.",
      ],
      tits: [
        "You press your breasts to hers, skin to skin, moving slowly, nipples brushing until you both gasp.",
      ],
      ride: [
        "You straddle her thigh and grind against her, slow and deep, your mouths never apart.",
        "You lock your legs with hers and rock together, slow, foreheads pressed close.",
      ],
    },
    him: {
      kiss: ["They kiss you slowly, thumb stroking your cheek, until your knees go soft.", "They pull you in for a long, lingering kiss that leaves you dizzy."],
      hands: ["Their hands roam over you, gentle and warm, as if they're memorising you.", "They stroke your arms, your waist, your hips, slow and reverent."],
      mouth: ["They kiss you deep and slow until you can't think of anything but their mouth.", "Their tongue finds yours, unhurried, and the room seems to tilt."],
      breasts: ["They cup your breasts and kiss them softly, then take a nipple in their mouth.", "Their thumbs circle your nipples, slow, until you're arching into their hands."],
      butt: ["They cup your bottom and pull you close, slow, pressing you against them.", "Their hands slide down to your butt and squeeze, gentle and greedy at once."],
      pussy: ["Their fingers slip between your thighs and stroke you slowly, watching your face.", "They sink into you slowly, holding you close, kissing you through every gasp."],
    },
    her2: {
      kiss: ["She kisses you softly, her fingers laced through yours.", "She pulls you close and kisses you, slow and sweet, until you're breathless."],
      hands: ["Her hands drift over you, light as feathers, learning every curve.", "She strokes your waist and hips, slow, smiling at every shiver."],
      mouth: ["She kisses you deep and slow, her tongue teasing yours.", "She kisses your throat, your jaw, then your lips, unhurried."],
      breasts: ["She kisses your breasts tenderly, then circles a nipple with her tongue.", "She cups your breasts and kisses between them, slow and warm."],
      butt: ["She cups your bottom and draws you into her, hips to hips.", "She strokes your butt, slow, and pulls you tight against her."],
      pussy: ["Her fingers slip between your thighs and stroke you in slow, patient circles.", "She settles between your thighs and uses her tongue, slow and devoted."],
    },
    givesIn: ["They shudder and give in, holding you tight and whispering your name.", "They come apart in your arms with a long, helpless groan."],
    givesInWoman: ["She trembles and gives in, clinging to you with a soft cry.", "She comes apart with a gasp, her fingers tight in your hair."],
    win: ["They give in first, and you curl up together by the dying fire. You win."],
    lose: ["It's too much, too sweet. You go first, wrapped up in their arms."],
  },

  // ---------- Rough: hard hands, hard words, all agreed ----------
  rough: {
    opening: [
      'Before anything, they ask what your word is. "{safe}," you tell them. They grin. Then their hand closes in your hair.',
      "They shove the bar stools aside and back you against the counter, rough and hungry, the way you told them you like it.",
    ],
    her: {
      kiss: ["You grab them by the collar and kiss them hard, teeth and all.", "You bite their lip and drag them into a kiss that's half a fight."],
      caress: ["You rake your nails down their chest and they hiss through their teeth.", "You shove their shirt up and grip them hard, marking skin."],
      tease: ["You laugh in their face and tell them they'll never last. It throws them right off their rhythm."],
      hands: ["You grip them hard and stroke fast, rough, glaring up at them the whole time.", "You take them in a tight fist and work them until they're swearing."],
      mouth: ["You drop to your knees and take them deep, fast and messy, nails digging into their thighs.", "You swallow them down hard and don't let up, pinning their hips to the bar."],
      tits: ["You squeeze your breasts tight around them and work them hard, daring them to last.", "You grip them between your breasts and move fast, rough, watching them crack."],
      ride: ["You shove them down onto the bench and ride them hard, fast, nails in their shoulders.", "You slam down onto them again and again, taking what you want."],
      anal: ["You push back onto them hard and take them in your ass, gasping, demanding more.", "You brace on the bar and back onto them, rough and greedy, until they're cursing."],
    },
    herOnWoman: {
      kiss: ["You grab her by the hair and kiss her hard, biting her lip.", "You pin her to the wall with a kiss that's all teeth."],
      caress: ["You drag your nails down her back and she gasps.", "You grip her hips hard enough to leave marks."],
      tease: ["You tell her exactly how loud you're going to make her. She stumbles over her own breath."],
      hands: ["You pin her against the bar and work your fingers into her hard and fast.", "You shove her thighs apart and finger her rough, until she's clutching the counter."],
      mouth: ["You push her back onto a table and bury your face between her thighs, relentless.", "You hold her hips down and eat her out hard, not letting her squirm away."],
      tits: ["You grind your breasts against hers and pinch her nipples until she yelps."],
      ride: ["You straddle her thigh and grind down hard, fingers knotted in her hair.", "You lock your legs with hers and rock against her, rough and fast."],
    },
    him: {
      kiss: ["They grab your jaw and kiss you hard, stealing your breath.", "They bite your lip and kiss you like they're starving."],
      hands: ["Their hands are everywhere, rough, squeezing, pinching.", "They spin you around and pin your hands to the bar."],
      mouth: ["They pull your hair back and kiss your throat hard, then your mouth harder.", "They kiss you so rough your lips sting."],
      breasts: ["They yank your neckline down and grab your breasts, pinching your nipples hard.", "They squeeze your breasts roughly and bite, and you cry out."],
      butt: ["They smack your butt hard and grab it, hauling you back against them.", "They grip your ass with both hands and grind you into them."],
      pussy: ["They shove their fingers into you, rough and deep, holding you up against the bar.", "They bend you over the table and take you hard, one hand on the back of your neck."],
    },
    her2: {
      kiss: ["She grabs your hair and kisses you hard.", "She bites your lip and pulls you into a bruising kiss."],
      hands: ["Her nails rake down your sides, rough, possessive.", "She pins your wrists and runs her hands over you, rough."],
      mouth: ["She kisses your neck hard enough to mark you.", "She kisses you like a fight she means to win."],
      breasts: ["She pinches your nipples hard and bites your breast, grinning at your yelp.", "She squeezes your breasts rough and sucks hard."],
      butt: ["She smacks your butt and grabs it, pulling you against her.", "She grips your ass with both hands, nails digging in."],
      pussy: ["She shoves her fingers into you, fast and rough, pinning you to the bar.", "She holds you down and eats you out, relentless."],
    },
    givesIn: ["They give in with a snarl, gripping you hard as they finish.", "They swear and give in, shaking against you."],
    givesInWoman: ["She gives in with a sharp cry, nails digging into your shoulders.", "She comes hard, bucking against you, cursing your name."],
    win: ["They give in first, breathing hard. You shove them off and laugh. You win."],
    lose: ["It's too much, too rough, too good. You go first, gasping against the bar."],
  },

  // ---------- Captive: play-acted struggle, agreed beforehand, with a safe word ----------
  captive: {
    opening: [
      `You agree on the game and the word first: "{safe}", and it stops at once. Then they catch your wrist and growl that the barmaid's been caught at last.`,
      `"{safe}," you remind them, and they nod. Then the act begins: they back you into the corner, and you pretend you've nowhere to run.`,
    ],
    her: {
      kiss: ["You turn your face away, then let them catch your mouth anyway, kissing back despite yourself.", "You glare at them and kiss them, as if it's a punishment you've chosen."],
      caress: ["You push at their chest as if to shove them off, and your hands stay there, roaming.", "You struggle in their arms, your hands \"accidentally\" sliding all over them."],
      tease: ["You tell them they'll never break you. The defiance gets to them, and they lose their rhythm."],
      hands: ["\"Is this what you want?\" you spit, and take them in hand, stroking like you're trying to finish them before they finish you.", "You grab them, defiant, and stroke hard, eyes blazing."],
      mouth: ["They push you to your knees, and you glare up at them as you take them into your mouth, as if you could win this way.", "You pretend to refuse, then take them in your mouth and work them, determined to make them break first."],
      tits: ["Pinned against the wall, you press your breasts around them and move, glaring defiance the whole time."],
      ride: ["You twist free just long enough to shove them down and ride them, as if taking control is your escape.", "You climb onto them, furious and flushed, riding them hard to win."],
      anal: ["Bent over the table, you push back onto them, taking them in your ass, playing at fighting it the whole way.", "You hiss that you'll never give in, and take them in your ass to prove it."],
    },
    herOnWoman: {
      kiss: ["You turn your face away, then she catches your mouth, and you kiss her back despite yourself."],
      caress: ["You push her away, then pull her back, your hands all over her."],
      tease: ["You swear she'll never break you. The fire in your voice throws her off."],
      hands: ["Pinned by her, you slip your fingers between her thighs, as if that's your way out."],
      mouth: ["She pushes you down, and you go down on her, defiant, determined to make her break first."],
      tits: ["Caught against the wall, you press your breasts against hers, glaring, moving."],
      ride: ["You flip her over and grind against her, furious and flushed, fighting to win."],
    },
    him: {
      kiss: ["They catch your jaw and kiss you while you pretend to struggle.", "They hold you still and kiss you, slow, as you squirm."],
      hands: ["They pin your wrists over your head and run their free hand all over you.", "They hold you against the wall and let their hands roam while you twist."],
      mouth: ["They hold your face and kiss you deep while you make a show of fighting it.", "They kiss your throat as you strain against their grip."],
      breasts: ["They tug your bodice open and grope your breasts while you protest, flushed.", "They hold your arms back and take your nipple in their mouth."],
      butt: ["They bend you over the table and grab your butt, laughing at your outrage.", "They smack your ass and hold you down, enjoying your squirming."],
      pussy: ["They hold you down and slide their fingers into you, grinning at how wet you are.", "Pinned beneath them, you play at fighting as they take you, hard and slow."],
    },
    her2: {
      kiss: ["She holds your chin and kisses you while you pretend to resist.", "She traps you against the wall with a kiss."],
      hands: ["She pins your wrists and runs her hand over you, slow, while you squirm.", "She holds you down, her hands roaming wherever she likes."],
      mouth: ["She kisses your neck while you struggle in her grip.", "She holds your face and kisses you deep."],
      breasts: ["She pulls your bodice open and teases your nipples while you protest.", "She pins you and kisses your breasts, ignoring your glare."],
      butt: ["She bends you over and squeezes your butt, laughing at you.", "She smacks your ass and holds you in place."],
      pussy: ["She holds you down and slips her fingers into you, grinning at your gasp.", "She pins your thighs open and uses her tongue on you."],
    },
    givesIn: ["They break first, groaning, their grip going slack. You've beaten your captor.", "They give in, shuddering, and let you go."],
    givesInWoman: ["She breaks first, crying out, her grip falling away.", "She gives in, shaking, and lets you go."],
    win: ["Your captor breaks first. You slip free, flushed and triumphant. You win.", "They give in before you do. The captive wins."],
    lose: ["You can't hold out any longer. You give in, and they hold you as you shake.", "It's too much. You break first, just as they promised you would."],
  },
};

/** Fills in a line's words in braces. */
export function fill(line: string): string {
  return line.replaceAll("{safe}", SAFE_WORD);
}
