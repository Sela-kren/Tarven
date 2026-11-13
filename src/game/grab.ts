/**
 * A grab at the table: as she sets down what a guest ordered, they take hold of her (a wrist, her waist, her apron
 * strings) and keep hold. Not a touch in itself, but what comes before one: a guest with hold of her goes for her
 * clothes next (the "held" touches in touchtalk.ts).
 *
 * Consent on, she answers the grab: twist free (always works), slap their hand, or let them hold her. Only if she
 * lets them does the strip try come, and that asks like any touch, Pull away included.
 * Consent off, the grab just happens; the strip try that follows goes to the push-vs-hold check, their grip adding
 * to their push (HELD_PUSH). Either way it's talked through: what they do, what they say, what she says.
 */
import type { GuestKind } from "./tavern";

/** What they do as she sets the order down. `{item}` is what she brought them. */
export const GRAB_MOVES: readonly string[] = [
  "As you set the {item} down, a hand closes round your wrist and doesn't let go.",
  "You lean over to put down the {item}, and an arm snakes round your waist and holds you there.",
  "They catch your apron strings as you turn to go, and reel you back to the table.",
  "A hand grabs your forearm before you can straighten up from the {item}.",
  "They hook two fingers in your belt as you put the {item} down, and hold on.",
];

/** What they say with hold of her, by kind. */
export const GRAB_SAYS: Record<GuestKind, readonly string[]> = {
  farmer: ["Stay a minute, eh? I've been in the fields since dawn.", "Don't run off. You're the best thing I've seen all week."],
  smuggler: ["Easy. I only want a closer look at the merchandise.", "Where are you off to in such a hurry, sweet?"],
  soldier: ["Not so fast. The garrison wants a word with you.", "Hold still, love. That's an order."],
  fugitive: ["Please, just... stay a moment. Nobody's been kind to me in weeks.", "Sit with me. I won't bite. Much."],
  adventurer: ["Caught you! Finders keepers, that's the rule on the road.", "One drink's no reward. You'll do nicely."],
  bandit: ["Got you. And I don't let go of what I've got.", "Where d'you think you're going? We're not done."],
  noble: ["Remain. I have not dismissed you.", "Such a pretty wrist. One could get used to holding it."],
};

/** What she thinks with a hand on her, before she answers. */
export const GRAB_THOUGHTS: readonly string[] = [
  "(Their grip's tight. Do I pull away, or...)",
  "(The whole table's watching to see what I'll do.)",
  "(Strong hands. Too strong. Or just strong enough?)",
];

/** Consent on: her answers to a grab. */
export const GRAB_TWIST = "Twist free";
export const GRAB_SLAP = "Slap their hand away";
export const GRAB_LET = "Let them hold you";

export interface GrabAnswerLines {
  /** What she says. */
  you: readonly string[];
  /** What comes of it, told. */
  told: readonly string[];
  /** What they say back. */
  they: readonly string[];
}

export const GRAB_TWIST_LINES: GrabAnswerLines = {
  you: ["\"Hands to yourself.\"", "\"Not tonight.\"", "\"I've got other tables.\""],
  told: ["You twist your wrist out of their grip, quick and easy, the way you learned behind the bar.", "You turn out of their hold and step back before they can tighten it."],
  they: ["Can't blame a body for trying.", "Slippery one, aren't you?", "Next time, then."],
};

export const GRAB_SLAP_LINES: GrabAnswerLines = {
  you: ["\"Let. Go.\"", "\"Try that again and you're out.\"", "\"Who said you could touch me?\""],
  told: ["SMACK. You crack your palm across the back of their hand and they let go fast.", "SMACK. Their hand jerks back, and the next table laughs at them."],
  they: ["Ow! Alright, alright!", "You'll pay for that.", "Feisty. I like feisty."],
};

export const GRAB_LET_LINES: GrabAnswerLines = {
  you: ["\"...Just a minute, then.\"", "\"You've got a strong grip.\"", "\"And what do you mean to do with me?\""],
  told: ["You stop pulling. Their grip doesn't loosen.", "You let them hold you there, the tray forgotten in your other hand."],
  they: ["That's better.", "Now, let's see what you're hiding.", "Good girl. Stay right there."],
};

/** Consent off: the grab just happens, and she's caught before she can answer it. */
export const GRAB_CAUGHT: readonly string[] = [
  "You don't get the chance to pull away. They've got you.",
  "Before you can twist free, the grip tightens.",
  "You tug once. It doesn't give.",
];

/** Consent off, her startled thought with their hand on her. */
export const GRAB_CAUGHT_THOUGHTS: readonly string[] = ["(Hey— let go—!)", "(They're not letting go.)", "(Oh. Oh, they mean it.)"];

/** Consent on or off, when there's nothing they go on to try: they let go. */
export const GRAB_LETS_GO: readonly string[] = [
  "They hold you a moment longer, then let go with a wink.",
  "They give your wrist a squeeze and let you go back to work.",
];

/** How likely each kind is to grab, as a share of the usual (GRAB_CHANCE). */
export const GRAB_KIND: Record<GuestKind, number> = {
  farmer: 0.7,
  smuggler: 1.2,
  soldier: 1.2,
  fugitive: 0.5,
  adventurer: 1,
  bandit: 1.6,
  noble: 0.8,
};

/** The usual chance a guest grabs her as she serves them, before their nerve and mood. */
export const GRAB_CHANCE = 0.08;
/** More per point of nerve past 3. */
export const GRAB_PER_NERVE = 0.025;
/** Drunk or lusting guests grab this much more often. */
export const GRAB_LOOSE = 1.5;
/** The most it can ever be. */
export const GRAB_MAX = 0.4;

/** How likely a guest with this much nerve, in this mood, is to grab her as she serves them. */
export function grabChance(kind: GuestKind, guestNerve: number, loose: boolean, reach = 0): number {
  const chance = (GRAB_CHANCE + GRAB_PER_NERVE * Math.max(0, guestNerve - 3)) * GRAB_KIND[kind] * (loose ? GRAB_LOOSE : 1) * Math.max(0, 1 + reach);
  return Math.min(GRAB_MAX, chance);
}
