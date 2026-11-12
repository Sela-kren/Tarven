/**
 * The livelier side of an after-hours duel with a man: what he does with the part of her he's taken as he grows
 * bolder, what he says while he does it, and what she can't help saying back. Like Karryn's battle log, where
 * enemies taunt between moves and she gasps. The AI bank (ai-lines.json) writes more of the same; these are the
 * lines used until it has some, and in a game without the bank.
 *
 * Every line stays on the part of her he has: never outside the rules she set.
 */
import type { DuelArea, DuelState } from "./duel";

/** A man's moves on the part of her he has: first, then bolder, then boldest, the longer he keeps it. */
export const THEIR_STAGES: Record<DuelArea, readonly { action: string; line: string }[]> = {
  hands: [
    { action: "Wandering hands", line: "His rough hands roam all over you, squeezing everything he can reach." },
    { action: "Puts your hand on him", line: "He wraps your fingers round his hard cock and makes you stroke it." },
    { action: "Fucks your fist", line: "He grips your hand round his cock and thrusts into your fist, grunting." },
  ],
  mouth: [
    { action: "Deep kiss", line: "He kisses you hard, his tongue shoved deep in your mouth." },
    { action: "Cock in your mouth", line: "He pushes his cock past your lips and holds your head while you suck." },
    { action: "Fucks your throat", line: "He grabs your hair and fucks your throat until you gag and drool." },
  ],
  breasts: [
    { action: "Breast play", line: "He kneads your tits roughly and pinches your nipples hard." },
    { action: "Sucks your tits", line: "He sucks your nipple into his mouth and bites down until you whimper." },
    { action: "Fucks your tits", line: "He shoves his cock between your tits and fucks them, slick and fast." },
  ],
  butt: [
    { action: "Butt grab", line: "He grabs your ass in both hands and spreads your cheeks wide." },
    { action: "Spanks you", line: "He spanks your ass hard, again and again, until it glows red." },
    { action: "Fucks your ass", line: "He pushes his cock into your ass and pounds you, deep and hard." },
  ],
  pussy: [
    { action: "Between your thighs", line: "His thick fingers slide into your wet pussy and curl." },
    { action: "Eats you out", line: "He buries his face between your thighs and licks your clit greedily." },
    { action: "Fucks you", line: "He thrusts his cock deep into your pussy and fucks you hard." },
  ],
};

/** What he says while he's at it, by the part of her he has (or a kiss). */
export const TALK: Record<"kiss" | DuelArea, readonly string[]> = {
  kiss: [
    '"Been wanting a taste of you all night."',
    '"Come here. Let me feel that mouth."',
    '"You kiss like you want my cock already."',
  ],
  hands: [
    '"That\'s it, stroke my cock. Harder."',
    '"Feel how hard you\'ve got me, girl."',
    '"Those hands were made for my cock."',
  ],
  mouth: [
    '"Fuck, that\'s it. Suck it like you mean it."',
    '"Look at you choking on my cock. Good girl."',
    '"Take it all the way down your throat."',
  ],
  breasts: [
    '"Gods, these tits. I could fuck them all night."',
    '"Squeeze them tighter round my cock."',
    '"Your nipples are hard as rocks, you slut."',
  ],
  butt: [
    '"What an ass. I\'m going to ruin it."',
    '"Push back on my cock. That\'s it."',
    '"Your ass is so fucking tight."',
  ],
  pussy: [
    '"You\'re dripping. Your pussy wants my cock."',
    '"Fuck, you\'re so wet and tight."',
    '"Take every inch of my cock, girl."',
  ],
};

/** What slips out of her, by how close she is. */
export const MOANS: Record<DuelState, readonly string[]> = {
  calm: [
    '"Is that all you\'ve got?"',
    '"Mm. You\'ll have to do better than that."',
    '"Careful, or you\'ll lose before I\'ve started."',
  ],
  aroused: [
    '"Ah! Fuck, don\'t stop..."',
    '"Mmh, your cock feels so good..."',
    '"Harder... yes, like that..."',
  ],
  edge: [
    '"I\'m so close, fuck, I can\'t hold it..."',
    '"Please, please, I\'m going to come..."',
    '"Ahh! Too much, it\'s too much!"',
  ],
};
