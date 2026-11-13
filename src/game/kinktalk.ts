/**
 * What gets said after the Consent-off check (touchsettings.ts), shaped by her kink.
 *
 * - Their push wins: the guest crows (`guestWin`), then her **sub talk** (`sub`): she gives in, in her own voice.
 * - Her hold stands: her **dom talk** (`dom`): she mocks them for trying; then the guest is left sheepish
 *   (`guestFail`), and they have to ask after all.
 *
 * Her kink is the passive group she has the most passives in, of the ones that colour how she talks (`kinkOf`).
 * With none of them, it's the plain set. The guest's lines follow her kink too: they play to what they've heard about
 * her. `{guest}` is their type, lower case.
 */
import { PASSIVE_BY_ID, type PassiveGroup } from "./passives";

export type Kink = "plain" | "masochism" | "sadism" | "exhibition" | "cock" | "drink" | "composure";

/** The passive groups that colour her talk, first ones winning a tie. */
const KINK_GROUPS: readonly Exclude<Kink, "plain">[] = ["masochism", "sadism", "exhibition", "cock", "drink", "composure"];

export const KINK_NAMES: Record<Kink, string> = {
  plain: "Plain",
  masochism: "Masochist",
  sadism: "Sadist",
  exhibition: "Exhibitionist",
  cock: "Cock-hungry",
  drink: "Tipsy",
  composure: "Composed",
};

/** Her kink: the talk-colouring passive group she has the most passives in, or plain with none. */
export function kinkOf(passives: Iterable<string>): Kink {
  const counts = new Map<PassiveGroup, number>();
  for (const id of passives) {
    const group = PASSIVE_BY_ID.get(id)?.group;
    if (group) counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  let best: Kink = "plain";
  let most = 0;
  for (const kink of KINK_GROUPS) {
    const n = counts.get(kink) ?? 0;
    if (n > most) {
      best = kink;
      most = n;
    }
  }
  return best;
}

export interface KinkTalk {
  /** Hers, when their push wins: she gives in. */
  sub: readonly string[];
  /** Hers, when her hold stands: she mocks them. */
  dom: readonly string[];
  /** Theirs, when their push wins. */
  guestWin: readonly string[];
  /** Theirs, when her hold stands. */
  guestFail: readonly string[];
}

export const KINK_TALK: Record<Kink, KinkTalk> = {
  plain: {
    sub: [
      "\"...Fine. You win this one.\"",
      "\"Mm. I should stop you. I'm not going to.\"",
      "\"Bold {guest}. ...Go on, then.\"",
      "\"You didn't even ask.\" You don't pull away. \"Don't stop.\"",
      "\"Hah... I can't say no to you tonight, can I?\"",
      "\"Someone's sure of themselves.\" You lean into it. \"...You're right to be.\"",
      "\"Just this once.\" You both know it won't be.",
      "You bite your lip and look away. \"...Yes. Fine. Yes.\"",
    ],
    dom: [
      "The {guest} lunges without asking and fumbles it. You laugh in their face. \"Was that meant to be smooth?\"",
      "\"Bold. Clumsy, but bold.\" You catch the {guest}'s wrist mid-grab. \"Try asking.\"",
      "The {guest} goes for it and you step out of reach. \"Not on nerve like that, love.\"",
      "\"Is that all you've got?\" The {guest} turns red as the next table snickers.",
      "You raise an eyebrow at the {guest}'s hand. \"You'll have to do better than that.\"",
      "The {guest} tries to sneak a touch and knocks their own cup over instead. The room roars.",
      "\"Ooh, someone's brave tonight.\" You pat the {guest}'s cheek. \"Not brave enough.\"",
      "The {guest} hesitates halfway. You smirk. \"Lost your nerve? Ask nicely, then.\"",
    ],
    guestWin: [
      "Didn't need to ask, did I?",
      "Knew you wanted it. Saw it the moment I walked in.",
      "There we go. Not so prickly now, are you?",
      "Easy. Told the lads you'd let me.",
      "Shh. You'll only spoil it by talking.",
      "That's a good innkeeper.",
      "You've been begging for that all night.",
      "Look at you. Not even a slap.",
    ],
    guestFail: [
      "I— that wasn't— fine. Fine!",
      "...Worth a try.",
      "Alright, alright! No need to make a show of it.",
      "Gods. Can I at least have another drink?",
      "You didn't have to say it so loud.",
      "Hmph. Next time, then.",
      "I was only being friendly...",
      "Fine. May I, then? ...Please?",
    ],
  },
  masochism: {
    sub: [
      "\"Ah— rougher. Please.\"",
      "\"You don't ask. Good. Don't ever ask.\"",
      "You gasp and press into it. \"Is that all? Grip harder.\"",
      "\"I should hate this.\" Your voice shakes. \"I don't.\"",
      "\"Don't be gentle. I'll know if you're being gentle.\"",
      "You flinch, then hold still for more. \"...Again.\"",
      "\"Pin me if you like.\" You don't sound like you're joking.",
      "\"It stings.\" A shaky laugh. \"Good. Keep it stinging.\"",
    ],
    dom: [
      "\"That's it? I've had gentler slaps that hurt more.\" The {guest} goes red.",
      "You laugh at the {guest}'s timid grab. \"If you're going to take, take properly.\"",
      "\"Soft hands, soft nerve.\" You flick the {guest}'s ear. \"Come back when you mean it.\"",
      "\"You call that rough?\" You push the {guest}'s hand away, almost disappointed.",
      "\"You hesitated. I felt it.\" You shove the {guest} back. \"Don't waste my time.\"",
      "\"A tickle? That was a tickle.\" The table howls at the {guest}.",
      "\"I bruise easy, {guest}. You didn't even manage that.\"",
      "You grab the {guest}'s hand and squeeze till they wince. \"That's how it's done.\"",
    ],
    guestWin: [
      "Heard you like it hard. Heard right, didn't I?",
      "Squirm all you want. You love it.",
      "Look at you shake. Not from fear, is it?",
      "Bite your lip all you like. I can see it.",
      "You flinched toward me, not away.",
      "Harder, is it? Ask and you'll get it.",
      "Told you I'd not be soft about it.",
      "Gods, you actually like this.",
    ],
    guestFail: [
      "Gods, what do you WANT from me?",
      "I'm not— I don't do it like that!",
      "...You're a strange one, innkeeper.",
      "I'm not going to HURT you, mad woman!",
      "Rougher? In here? Are you—",
      "I'll... I'll think about it.",
      "That's not what I meant by friendly!",
      "You're enjoying watching me squirm, aren't you?",
    ],
  },
  sadism: {
    sub: [
      "\"Hm. Fine. Enjoy it while I let you.\"",
      "You let it happen, eyes cold. \"You'll pay for that later.\"",
      "\"Don't get used to it, {guest}.\"",
      "\"Clever. Once.\" You smile, and it isn't a kind smile.",
      "\"Savour it, {guest}. You won't get another.\"",
      "You let it happen and lean close. \"I'm keeping count.\"",
      "\"Brave.\" You trace a nail down their wrist. \"Remember this when I collect.\"",
      "\"Mm. Fine. You'll owe me for it.\"",
    ],
    dom: [
      "You catch the {guest}'s fingers and bend them back. \"Ask. Nicely.\"",
      "\"On your knees if you want to touch me.\" The {guest} actually wavers.",
      "You twist the {guest}'s wrist till they yelp. \"Again, and you'll lose the hand.\"",
      "\"Pathetic.\" You tip the {guest}'s chin up with one finger. \"Beg, and maybe.\"",
      "\"Hands behind your back, {guest}.\" They actually do it.",
      "You grab the {guest} by the collar. \"Did I say you could?\"",
      "\"Sit. Stay.\" The {guest} sits. The room snickers.",
      "You step on the {guest}'s foot, hard, and smile. \"Oops. Ask next time.\"",
    ],
    guestWin: [
      "Not so scary now, are you, mistress?",
      "Ha! Got you before you got me.",
      "Who's in charge now, eh?",
      "Bet nobody's ever got one over on you before.",
      "What's the matter? Lost your bite?",
      "I'll take my punishment later. Worth it.",
      "Thought you'd stop me. Too slow tonight.",
      "Go on, glare. I've still got my hand here.",
    ],
    guestFail: [
      "Ow! Ow— alright! I'll ask!",
      "Please. ...Please?",
      "Sorry, mistress. Sorry.",
      "Yes. Yes! I'll ask! Let go!",
      "I didn't mean anything by it, I swear.",
      "May I... please... touch you?",
      "You're terrifying. I love it. Ow.",
      "I'll be good. I'll be good.",
    ],
  },
  exhibition: {
    sub: [
      "\"In front of everyone?\" You glance at the room, flushed. \"...Let them look.\"",
      "\"They're all watching.\" You don't move away. \"Good.\"",
      "You turn so the next table gets a better view. \"Go on, then.\"",
      "\"Mm. Do it slower. The whole room should see.\"",
      "\"Not here— oh, why not here.\"",
      "You lean back so everyone can see where the hand is. \"Mm.\"",
      "\"Shall we give the bar something to talk about?\"",
      "\"Someone fetch the barman. He'll want to see this.\"",
    ],
    dom: [
      "\"Everyone saw you fumble that, {guest}.\" The room laughs on cue.",
      "You stand on the bench. \"This {guest} wants a touch and can't manage it! Applause!\"",
      "\"If you want an audience, at least give them a show.\" The {guest} slinks back.",
      "\"Shy? With all these people watching?\" You tut at the {guest}. \"Ask, out loud.\"",
      "\"Louder, {guest}! The back tables couldn't hear you fail.\"",
      "You hold up the {guest}'s wrist like a prize. \"Look what I caught!\"",
      "\"All eyes on you, {guest}. How does it feel?\"",
      "\"You wanted to be seen with me? Now you are.\" The {guest} wants the floor to swallow them.",
    ],
    guestWin: [
      "Give 'em a show, then.",
      "Look, lads! She doesn't even mind!",
      "You like them watching, don't you?",
      "Turn round so the lads by the fire can see.",
      "Whole tavern's watching you, love.",
      "Bet you'll tell the next table all about it.",
      "No shame at all. I like it.",
      "Someone's putting on a show tonight.",
    ],
    guestFail: [
      "Keep your voice down, gods!",
      "Everyone's looking at me now...",
      "Fine! In front of everyone, then— may I?",
      "Not in front of— oh gods, they're all looking.",
      "Must you announce it?!",
      "I'll never drink here again. ...Probably.",
      "Everyone heard that. Everyone.",
      "Could you not be so loud about it?",
    ],
  },
  cock: {
    sub: [
      "\"Finally. I was starting to think you'd never try.\"",
      "\"Mm. Is that all you came over for? ...Shame if it is.\"",
      "Your eyes drift down. \"Hands are a start, {guest}.\"",
      "\"Don't stop there. Don't you dare stop there.\"",
      "\"About time.\" You catch their belt. \"Now what else have you got?\"",
      "\"Mm, that's it. Upstairs is free later, you know.\"",
      "\"Bold, {guest}. I like bold. I like more.\"",
      "\"Careful. Keep that up and I won't let you leave.\"",
    ],
    dom: [
      "\"All that swagger, and that's your move?\" You glance at the {guest}'s breeches and smirk. \"Disappointing.\"",
      "\"Grabbing won't get you upstairs, {guest}. Asking might.\"",
      "\"Down, boy.\" You pat the {guest}'s chest. \"Earn it.\"",
      "\"I've seen more nerve from a novice.\" The {guest} sputters.",
      "\"That's it? I was promised a real one, not a nervous {guest}.\"",
      "\"I know what I want. You clearly don't.\" You turn your back on the {guest}.",
      "\"Come back when you can finish what you start.\"",
      "You tug the {guest}'s belt, then let it snap. \"Not tonight, sweet.\"",
    ],
    guestWin: [
      "Heard what you get up to upstairs. Thought I'd skip the queue.",
      "Hungry tonight, aren't you?",
      "Knew you'd not say no to me.",
      "Rumour says you're never full.",
      "Room upstairs still empty?",
      "Saw how you looked at me. Couldn't resist.",
      "Keep that look up and I'll carry you up the stairs.",
      "You're not getting rid of me tonight.",
    ],
    guestFail: [
      "But they said you— never mind.",
      "I'll... I'll ask properly. Later.",
      "Not even upstairs? ...Fine.",
      "I— can I at least buy you a drink first?",
      "Teasing's cruel, innkeeper.",
      "Upstairs later? ...Please?",
      "I'll do better. I swear I'll do better.",
      "You're hard to read for someone so easy to want.",
    ],
  },
  drink: {
    sub: [
      "\"Mm? Oh. Oh, that's nice.\" You giggle into your cup.",
      "\"S'fine. 'S all fine. Keep going.\"",
      "You sway into it. \"Wha' was I sayin'? ...Doesn't matter.\"",
      "\"Another round, an' you can keep your hand there.\"",
      "\"Wh— oh. Hello, you.\" You lean on them to stay upright.",
      "\"Is the room spinnin', or is that your hand?\"",
      "You laugh too loud. \"Fine, fine, I'm too warm to argue.\"",
      "\"Pour me another an' I won't notice a thing.\"",
    ],
    dom: [
      "You hiccup and swat the {guest}'s hand. \"Nope! Ask first. Hic.\"",
      "\"Drunk or not, I saw that coming a mile off, {guest}.\"",
      "You slosh ale over the {guest}'s grabbing hand. \"Oops. Try again sober.\"",
      "\"Even tipsy I'm quicker than you, {guest}.\"",
      "\"I'm drunk, {guest}, not blind.\" The room cheers.",
      "You wobble, but your slap lands dead centre on the {guest}'s hand.",
      "\"Nice try. Buy a round and try again.\" The {guest} digs for coin.",
      "\"Hic. No.\" That's all it takes; the {guest} backs off.",
    ],
    guestWin: [
      "Another drink for the lady! And another for me.",
      "Few more ales and you won't remember saying no.",
      "Warm tonight, aren't you?",
      "You'll not remember this in the morning.",
      "Drink up, love. You're friendlier with a few in you.",
      "Steady. I've got you.",
      "Ale's good tonight, eh? You're lovely tonight.",
      "Barely had to try.",
    ],
    guestFail: [
      "You're drunk and you still caught that?",
      "...Fair. I'll get the next round.",
      "Gods, you've a quick hand for a tippler.",
      "How are you that quick, three ales deep?",
      "Fine! I'll buy the round!",
      "Ow. Even your drunk slap hurts.",
      "Was worth a try while you were merry.",
      "I'll wait till you've had another, then.",
    ],
  },
  composure: {
    sub: [
      "You don't flinch. \"...Very well. This once.\"",
      "\"I'll allow it.\" Your voice stays level. Your cheeks don't.",
      "\"Noted.\" You let it be, and keep pouring.",
      "A long, slow breath. \"Fine. Quietly.\"",
      "\"...Don't make a habit of it.\" You don't move away.",
      "Your hands keep wiping the cup. Your breath doesn't keep steady.",
      "\"Discreetly, please.\" It's almost a request.",
      "\"I'll pretend this isn't happening.\" You don't stop it either.",
    ],
    dom: [
      "You don't even look up. \"No.\" The {guest}'s hand drops.",
      "\"I'll pretend I didn't see that, {guest}.\" You keep wiping the bar.",
      "One raised eyebrow, and the {guest} remembers their manners.",
      "\"Sit down.\" You say it calmly. The {guest} sits.",
      "You set the cup down very precisely. \"Try that again, {guest}.\" They don't.",
      "\"That will cost you a copper. And your dignity.\" The {guest} pays both.",
      "You simply wait. The {guest} withdraws their hand in shame.",
      "\"Manners, {guest}.\" Quiet, flat, final.",
    ],
    guestWin: [
      "Ice queen's thawing, is she?",
      "Didn't even blink. Means you liked it.",
      "Thought you'd stop me. Glad you didn't.",
      "Still so calm. I'll crack that face yet.",
      "Not even a flicker. You liked it, didn't you?",
      "Proper lady. Proper warm, under all that.",
      "Thought you were made of stone.",
      "Steady hands, unsteady breath, eh?",
    ],
    guestFail: [
      "Yes, ma'am.",
      "...Sorry. Sorry.",
      "How do you do that with one look?",
      "Forgive me. Forgive me.",
      "I'd rather you shouted, honestly.",
      "Right. Manners. Yes.",
      "That look could freeze the river.",
      "I'll just... sit, then.",
    ],
  },
};
