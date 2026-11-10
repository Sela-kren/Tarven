/**
 * What a guest says to the innkeeper's face when you sit down with them or they buy you a drink, coloured by
 * the state they're in and by how much they respect you. Calm guests with nothing to say leave this out.
 *
 * These show in the conversation box, not a bubble, so they can run a little longer: keep them under about
 * 150 letters. Lines are in quotes because they're spoken. Never "he" or "she" for the innkeeper.
 */
import type { BanterContext } from "./banter";
import { HIGH_RESPECT, LOW_RESPECT, type Mood } from "./mood";

/** What someone in each mood says to you directly. */
export const FACE_TALK: Partial<Record<Mood, readonly string[]>> = {
  happy: [
    "\"Do you know, this is the best night I've had since the thaw. Sit! Sit with me!\"",
    "\"You've a good place here. Warm, loud, nobody's asked me for money yet. Well, except you.\"",
    "\"I came in grumbling and now look at me. It's the fire. Or the ale. Or you.\"",
    "\"Tell me something cheerful. No, wait, I'll tell you something. I've forgotten it. Cheers anyway!\"",
    "\"The snow's up to the door, the baron wants his tax, and I don't care one bit. What did you put in this?\"",
    "\"Wren used to sit right where you're sitting. She'd be glad of the noise in here. I'm glad of it.\"",
    "\"I sold the cow! Well, half the cow. The other half's my brother's. Drink to the half!\"",
    "\"Look at that, a whole night and nobody's been arrested. That's a good night in Tarven.\"",
    "\"You've got a laugh like a kettle. I mean that kindly. Kettles are the best part of winter.\"",
    "\"Sit, sit. I've nothing to complain about and I need someone to help me get used to it.\"",
    "\"The stew was hot, the ale was cold, and the right way round for once. You've a gift.\"",
    "\"My wife says I'm to come home sober. I'll come home happy instead. She'll take that, mostly.\"",
    "\"Here's to you, innkeeper, and here's to the roof, and here's to the roof staying on. Mostly the roof.\"",
    "\"I'd stay all night if you'd let me. You won't, I know. But I'd stay.\"",
    "\"Even Sergeant Dunn's smiling in his sleep tonight. Look at him. That's your doing, that is.\"",
    "\"First time this winter my toes have been warm. I could kiss your hearth. I won't. But I could.\"",
  ],
  angry: [
    "\"Don't think a drink makes up for the wait. It doesn't. ...It helps. But it doesn't.\"",
    "\"I've a bone to pick with someone tonight, and you're standing closest.\"",
    "\"Sit down, then. But I'm still cross, and I'll be cross until I've finished this.\"",
    "\"Everyone on this pass wants something from me. What do you want?\"",
    "\"The baron's taxed my mule. My mule! What's next, the snow? Don't answer. He'll hear.\"",
    "\"I waited so long for that stew it went cold in my imagination before it got here.\"",
    "\"Don't smile at me. I'm not in a smiling mood, and your smile's making it worse.\"",
    "\"I walked down from the quarry in a blizzard for this. It had better be the best ale on the pass.\"",
    "\"Somebody's took my stool. My stool! Twenty years I've sat on it. Was it you? It was the stool's fault, wasn't it.\"",
    "\"You want to know what's wrong? Everything. Start with the baron and work your way down to the bread.\"",
    "\"I'm not shouting. This is just how I talk when I've been robbed by a toll gate.\"",
    "\"If one more soldier tells me to move along, I'll move along all right. Right into his nose.\"",
    "\"Your floor's sticky, your ale's late, and the fire's too far away. Apart from that, lovely.\"",
    "\"Don't you 'there, there' me. I'm not a horse. Well. Go on, then, a little 'there, there'.\"",
    "\"I paid for a full cup. This is a cup that's had a hard life. Look at it. It's three-quarters, at best.\"",
    "\"Wren would never have kept me waiting. Wren would have kept me waiting and made me laugh about it.\"",
  ],
  lust: [
    "\"Sit closer. No, closer. I don't bite. Not unless I'm asked nicely.\"",
    "\"I've been watching you cross that room all night. Don't pretend you hadn't noticed.\"",
    "\"Is it warm in here, or is it just you leaning over the table like that?\"",
    "\"I didn't come for the ale, you know. Though the ale's fine. You're finer.\"",
    "\"You've got lovely hands. For an innkeeper. For anyone, really. Can I hold one? For warmth.\"",
    "\"I keep ordering things I don't want just so you'll come back over. I've had four breads.\"",
    "\"Is there a fee for looking? Because I've been looking a while now, and I'd like to settle up.\"",
    "\"It's a long, cold walk home. Shame there's nobody to keep a body warm on the way.\"",
    "\"Don't go yet. Stay and tell me something. Anything. I just like watching you talk.\"",
    "\"You've flour on your cheek. Here. ...No, there. Stay still. I'll be thorough about it.\"",
    "\"I wrote you a poem. It's about a fire and the innkeeper who keeps it. It's very warm, that poem.\"",
    "\"If I said you were the best thing on this pass, would you laugh? Go on, laugh. I like that too.\"",
    "\"I'll be honest with you. I've thought about you on the road. More than's good for a body.\"",
    "\"Come sit on this side. The bench is warmer. I've warmed it. For you, specially.\"",
    "\"Do you ever finish a shift and want company? I'm asking for the whole room. Mostly for me.\"",
    "\"You could pour that slower. No reason. I just like the way you pour.\"",
  ],
  idolize: [
    "\"I can't believe I'm sitting with you. They talk about you all the way down the valley!\"",
    "\"Would you... could you touch my cup? I want to say I drank from it after you did.\"",
    "\"I walked two days to drink in your tavern. Two days! Worth every blister.\"",
    "\"When I tell my children about tonight they won't believe a word. Tell me something I can quote.\"",
    "\"Is it true you once served forty soldiers alone in one night? It's true, isn't it. I knew it.\"",
    "\"My sister named her goat after you. That's a compliment! It's a very good goat.\"",
    "\"I've heard the song. All nine verses. The one with the baron's hat is my favourite.\"",
    "\"Could you sign my boot? I've no paper. I'll never wash it. I mean the boot. Well, either.\"",
    "\"I'm sorry, I keep staring. You're smaller than in the song. No! I mean that nicely.\"",
    "\"What's your secret? The stew? The fire? It's the stew. Tell me it's the stew.\"",
    "\"In Harrowgate they say you've never once turned a traveller away. I told them I'd come and see.\"",
    "\"I'm going to open a tavern myself one day. I'll do everything exactly like you. Even that bit.\"",
    "\"You poured my ale! You! I'll not drink it. I'll keep it. ...No, I'll drink it. But slowly.\"",
    "\"Folk on the coast tell stories about you, innkeeper. Half are lies. I hope the good half are true.\"",
    "\"Will you wave to me when I go? Just once? My whole village wants to know if you're real.\"",
    "\"I sat on every stool in here, so I'd be sure to have sat on yours. Was I right? Which one?\"",
  ],
  drunk: [
    "\"You! I love you. I love this table. I love that wall. Have you met the wall?\"",
    "\"I have had... several. Several is a number. It's my number tonight.\"",
    "\"Sit down, the room's going round and I need something to hold on to. You'll do.\"",
    "\"I'm going to tell you a secret. ...I've forgotten it. It was a good one, though.\"",
    "\"You've got two faces. Both lovely. Which one do I pay?\"",
    "\"I'm not drunk. I'm practising for being drunk later. Tonight's the warm-up.\"",
    "\"Did you know there's a mountain outside? Massive. Somebody should do something about it.\"",
    "\"I'm going to fight the baron. Tomorrow. After a nap. And breakfast. Next week, maybe.\"",
    "\"My feet have gone. I know where they are, roughly. They're just not answering.\"",
    "\"Everyone in here's my friend. Except him. No, him too. Him especially. Where'd he go?\"",
    "\"Is this ale or water? Don't tell me. I like not knowing. Keeps a body guessing.\"",
    "\"Sing with me! No? I'll sing for both of us. I know all the words. Some of the words.\"",
    "\"I tried to leave an hour ago. The door moved. Doors shouldn't move. Have a word with it.\"",
    "\"Sergeant Dunn's got the right idea, sleeping through it all. Wake me when it's spring.\"",
    "\"You're a good innkeeper. A great innkeeper. The greatest innkeeper in this room. Are there others?\"",
    "\"One more. One more and then I'll go home. Where is home? Never mind. One more.\"",
  ],
  gloomy: [
    "\"Sit, if you like. Not much to say. There never is, this time of year.\"",
    "\"You're kind to bother. Most people don't. I don't blame them.\"",
    "\"Do you ever feel the whole valley's holding its breath? I do. Every night.\"",
    "\"Drink up. It won't help, but it won't hurt either, and that's more than most things.\"",
    "\"The ewe died. The good one. Not that you'd know which one was the good one. I knew.\"",
    "\"I used to come here when Wren had it. She'd tell me to cheer up. Never worked. Liked her asking.\"",
    "\"The snow'll lift in spring, they say. They said that last year. And it did. Then it came back.\"",
    "\"I keep thinking I'll leave Tarven. Then I think, and go where? Harrowgate? It's just Tarven, bigger.\"",
    "\"Don't mind me. I'm only sitting here. Sitting's about all I've got the knack of, this week.\"",
    "\"The baron took my roof tiles for tax. Now I've a roof made of hope. It leaks.\"",
    "\"You ever look at the fire and feel it knows something you don't? No? Just me, then.\"",
    "\"I'd tell you my troubles, but you've got your own. Everyone in here's got their own.\"",
    "\"My boy went over the ridge last spring. Writes sometimes. Not often. Not lately.\"",
    "\"I'll have the same again. Not because I want it. Because there's nowhere else to be.\"",
    "\"You're doing well, innkeeper. I mean that. Somebody in this town ought to be.\"",
    "\"Chapel bell rang this morning. Somebody's gone. Always somebody, this time of year.\"",
  ],
  scared: [
    "\"Keep your voice down. Please. Is anyone watching us? Don't look. Just tell me.\"",
    "\"You won't tell anyone I was here, will you? I'll pay. I've not got much, but I'll pay.\"",
    "\"Sit between me and the door, would you? Just for a moment. Thank you.\"",
    "\"I keep thinking every knock is for me. It's a terrible way to drink.\"",
    "\"That soldier by the fire. Has he been looking at me? Be honest. No. Lie. Lie to me.\"",
    "\"If anyone asks, I'm a wool merchant. From the ford. I know nothing about wool.\"",
    "\"Is there another way out of here? Not that I need one. I just like knowing. Where is it?\"",
    "\"The north path's being watched. The ridge too. I came over the quarry. Don't ask how.\"",
    "\"I heard horses outside. Did you hear horses? It's the wind. Tell me it's the wind.\"",
    "\"I'm not hiding. I'm sitting in a dark corner with my hood up. Different thing entirely.\"",
    "\"Can I sleep in your cellar? Just one night. I'll be quiet. I'm very good at quiet now.\"",
    "\"They had my face on a notice in Harrowgate. It wasn't even a good likeness. That's the worst part.\"",
    "\"Please don't say my name. Not that you know it. Good. Keep not knowing it.\"",
    "\"You've an honest face, innkeeper. I need you to have an honest face. Please have one.\"",
    "\"If the captain comes in, I'll be under this table. Just put your foot on my back and look bored.\"",
    "\"My hands won't stop shaking. It's not the cold. You can tell it's not the cold, can't you.\"",
  ],
  scheming: [
    "\"Sit. You and I might be useful to each other, innkeeper. Very useful.\"",
    "\"I hear things. You hear more. Imagine what we'd hear together.\"",
    "\"How much would you say a quiet word from you is worth? Roughly. I'm only curious.\"",
    "\"Pour me one and I'll tell you which of these fine people owes the baron the most.\"",
    "\"A cart's coming over the ridge on Thursday. If nobody notices it, nobody need notice you either.\"",
    "\"That debt of yours. I could make it smaller. Not gone, mind. Smaller. Everything has a price.\"",
    "\"Your cellar's bigger than it looks from the street. I measured. Professional interest.\"",
    "\"Let's say I left a crate here. And let's say you never opened it. Wouldn't that be a nice story?\"",
    "\"The captain drinks here, doesn't he? What does he talk about, after his third? Just roughly.\"",
    "\"I don't want anything. Not tonight. I'm just making friends. Friends are an investment.\"",
    "\"You know what's better than gold, innkeeper? Knowing where the baron's gold is going on Tuesday.\"",
    "\"I've a cousin at the mill who's got a cousin at the fort. And now I've got you. Lovely.\"",
    "\"You're cleverer than old Wren was. Wren would never have sat with me. Wren was right, mind.\"",
    "\"Here's a coin for the ale, and here's another for forgetting my face. Fair rates, I think.\"",
    "\"Pike talks in his sleep, I hear. So does Dunn, and Dunn's always asleep. Think of it.\"",
    "\"The baron needs a tavern on this pass, and so do I. Only one of us is offering to pay you for it.\"",
  ],
};

/** Said to an innkeeper the room has stopped respecting. */
export const LOW_RESPECT_TALK: readonly string[] = [
  "\"Sit on my knee, then. Everyone says it's your favourite seat.\"",
  "\"Go on, what's the price? Not for the ale. You know what I'm asking.\"",
  "\"They told me at the fort you're very friendly after closing. Very friendly.\"",
  "\"No need to play shy with me, innkeeper. I've heard all about you.\"",
  "\"Lean over like that again. I'm paying for the view as much as the ale.\"",
  "\"Wren ran a respectable house. Shame what it's become. Still, I'm not complaining.\"",
  "\"What's on the back of the price board, then? The lads at the garrison said to ask.\"",
  "\"Don't go running off. I've paid for the bench, and you look like you come with it.\"",
  "\"I hear you take payment in all sorts. I've a few coins and an empty evening. Interested?\"",
  "\"You've got the whole garrison queuing. Can I jump ahead? I'm a farmer. We're very patient, usually.\"",
  "\"Sit down, sweetheart. You're not too busy for me. You're never too busy, I hear.\"",
  "\"Is the back room free tonight? Or do I need to ask Pike when he's done?\"",
  "\"My wife told me not to come in here. She said you'd be like this. She was right, too.\"",
  "\"Put it on my tab, love. Not the ale. The other thing. You know what I mean.\"",
  "\"The chapel says you're a disgrace. I came to see for myself. Go on. Disgrace me a bit.\"",
  "\"How's business, innkeeper? Both kinds, I mean. Ha! Don't look at me like that.\"",
  "\"I'd tip you more if you smiled more. And leaned more. Mostly leaned.\"",
  "\"Nobody calls this a respectable house now, but nobody stops coming, either. Funny, that.\"",
  "\"Come here and keep a poor soul warm. That's what you do, isn't it? Everyone says so.\"",
  "\"I've heard what the smugglers pay. I can't pay that. What do I get for a third of it?\"",
  "\"Sit down and drink with me. Then sit closer and drink some more. That's how it goes here, isn't it?\"",
];

/** Said to an innkeeper the room has learned to respect. */
export const HIGH_RESPECT_TALK: readonly string[] = [
  "\"I'm honored you'd sit with us. You keep a straight house, and folk notice.\"",
  "\"Mind your language, lads, the innkeeper's at the table.\"",
  "\"You've your grandmother's backbone. Nobody takes liberties in here any more.\"",
  "\"I'll not keep you long. I know you've a house to run, and you run it well.\"",
  "\"I wiped my boots before I came in. Twice. Didn't want you to look at me the way you look at Pike.\"",
  "\"Good evening, innkeeper. I've brought my own cup back. Washed it, too. Thought you'd like that.\"",
  "\"You turned the captain out last week for being rude, I heard. The captain! I'll be on my best.\"",
  "\"My father drank here under Wren. He'd say you do her proud. He'd say it twice, he liked saying things twice.\"",
  "\"I came to settle my tab. All of it. It didn't feel right owing you, somehow.\"",
  "\"There's not a house on the pass kept like this one. Clean floor, fair measure, no nonsense.\"",
  "\"Would you take a word of thanks? You stood up for the ford folk. Nobody else would've.\"",
  "\"I'll keep my voice down, innkeeper. It's that sort of house now. I like it that way.\"",
  "\"My lad wants to work for you, come spring. I told him he'd learn more here than at the chapel.\"",
  "\"Even the baron's clerk takes his hat off in here. I saw it. I nearly fell off my stool.\"",
  "\"Thank you for the seat. I won't stop long. I know your time's worth more than my stories.\"",
  "\"You've made this a place a body can bring their mother. Not mine. Mine's terrible. But a mother.\"",
];

/**
 * Something a guest in `mood` says to your face, or null if they've nothing in particular to say. Respect
 * comes first: a guest who's stopped respecting you says so whatever their mood.
 */
export function faceLine(mood: Mood, c: BanterContext, said: Set<string>, random: () => number): string | null {
  let pool: readonly string[] | undefined;
  if (c.persona.respect <= LOW_RESPECT && mood !== "scared" && mood !== "idolize") pool = LOW_RESPECT_TALK;
  else if (c.persona.respect >= HIGH_RESPECT && mood === "calm") pool = HIGH_RESPECT_TALK;
  else pool = FACE_TALK[mood];
  if (!pool || pool.length === 0) return null;
  const fresh = pool.filter((text) => !said.has(text));
  const from = fresh.length > 0 ? fresh : pool;
  const text = from[Math.floor(random() * from.length) % from.length];
  said.add(text);
  return text;
}
