/**
 * What the room says about the innkeeper: behind their back, as table talk, and, once it has stopped
 * respecting them, crudely and to their face.
 *
 * Nothing here says "he" or "she" about the innkeeper, because the player can be either. A line has to fit
 * in a speech bubble, so keep them under about 90 letters. The word "innkeeper" in a conversation is how the
 * game knows it's about you, so every conversation here needs it.
 */
import type { BanterContext } from "./banter";
import { HIGH_RESPECT } from "./mood";
import type { Exchange } from "./tabletalk";
import type { GuestKind } from "./tavern";

/** A conversation about the innkeeper, and what the room has to have heard for it to come up. */
export interface AboutYou {
  lines: Exchange;
  when?: (c: BanterContext) => boolean;
}

const after = (night: number) => (c: BanterContext) => c.night >= night;
const speaker = (kind: GuestKind) => (c: BanterContext) => c.kind === kind;
const poor = (c: BanterContext) => c.gold < c.debt * 0.3;
const flush = (c: BanterContext) => c.gold >= c.debt * 0.6;

/** What people say about you when they think you can't hear. */
export const ABOUT_YOU: readonly AboutYou[] = [
  // From the first night: you're the new face in town.
  { lines: ["That's Wren's kin, the new innkeeper.", "Looks new to it.", "Looks tired for it.", "Give it a week."] },
  { lines: ["Do you think this innkeeper'll last?", "Wren lasted forty years.", "Wren was made of old rope.", "Fair point."] },
  { lines: ["The innkeeper's got Wren's way of looking at you.", "Like you owe money?", "Like you owe money and they're sorry about it."] },
  { lines: ["Who's the innkeeper talking to?", "Nobody. Themselves.", "That's the job, I suppose."] },
  { lines: ["I asked the innkeeper if the ale was fresh.", "What did they say?", "Fresher than you.", "Sounds like Wren all right."] },
  { lines: ["They inherited the debt along with the stools, this innkeeper.", "Poor soul.", "Nice stools, though."] },
  { lines: ["That innkeeper's run off their feet.", "Two of them, I heard. Brother and sister.", "You'd need more than two."] },
  { lines: ["Think the innkeeper can hear us?", "Over this racket?", "Good. That cup of mine was only half full."] },
  { lines: ["Watch how the innkeeper goes round the tables.", "What about it?", "Quick. Nervous quick.", "Debts'll do that."] },
  { lines: ["Innkeeper's new, isn't it? You can tell.", "How can you tell?", "They still say sorry."] },
  { lines: ["I'll say this for the innkeeper. They do listen.", "That's what worries me."] },
  { lines: ["Wren's grandchild, running the place. The new innkeeper.", "Wren had a grandchild?", "Wren had a lot of things. Mostly debts."] },
  { lines: ["The innkeeper asked me where the cellar key was.", "Did you know?", "Under the third barrel. Wren told everyone but family."] },
  { lines: ["New innkeeper hasn't learned who pays and who doesn't.", "Should we tell them?", "Not before my tab's been forgotten."] },
  { lines: ["How old's the innkeeper, would you say?", "Too young for this pass.", "Everyone's too young for this pass."] },
  { lines: ["The innkeeper tried lighting the fire with green wood.", "Did it take?", "Took an hour. Nearly took their eyebrows."] },
  { lines: ["I told the innkeeper the stool by the door wobbles.", "And?", "They said Wren liked it that way. Keeps folk awake."] },
  { lines: ["Innkeeper's from the valley, I heard. Soft hands.", "Seen them lift a barrel?", "...No.", "Then hush."] },
  { lines: ["The innkeeper's got flour on their nose.", "Should we say?", "And spoil the only cheerful thing on this pass?"] },
  { lines: ["What's that the innkeeper's humming?", "One of Wren's.", "The rude one?", "The very rude one."] },
  { lines: ["Somebody ought to warn the innkeeper about the roof.", "What about it?", "It's mostly snow, from the inside."] },
  // What you've made of yourself.
  { lines: ["The innkeeper's turned this place round.", "You think?", "There was a dead rat in the pot in Wren's day.", "That was the stew."], when: after(1) },
  { lines: ["Folk had a wager the innkeeper'd be gone by now.", "Who won?", "Nobody. They've raised the stakes."], when: after(1) },
  { lines: ["Still going, this innkeeper!", "Aye, and still smiling.", "It's a nervous smile.", "It's still a smile."], when: after(1) },
  { lines: ["Second night and the innkeeper's still standing.", "Leaning, more like.", "Leaning counts, on this pass."], when: after(1) },
  { lines: ["The innkeeper knows my order now.", "That's quick.", "I've only ever had the one order, mind."], when: after(1) },
  { lines: ["The innkeeper's stopped saying sorry.", "About time.", "Started saying 'pay up' instead."], when: after(1) },
  { lines: ["Quarry men come in now, for the innkeeper's pies.", "Quarry men eat gravel.", "Not since the pies."], when: after(1) },
  { lines: ["Three nights and the innkeeper's not run off.", "Run where? Snow's up to the sills.", "Fair."], when: after(2) },
  { lines: ["The innkeeper's got the measure of us now.", "Short measures, mostly.", "That's the ale, not them."], when: after(2) },
  { lines: ["I've stopped calling it Wren's. It's the innkeeper's now.", "Would Wren mind?", "Wren's past minding. I hope."], when: after(2) },
  // The village's trust.
  { lines: ["You can talk in front of this innkeeper.", "Sure?", "Good heart, that one. Wren's heart."], when: (c) => c.trust >= 8 },
  { lines: ["The innkeeper kept my brother's secret.", "Did they?", "Never said a word. You don't forget that."], when: (c) => c.trust >= 8 },
  { lines: ["Left my coat here a week. The innkeeper kept it dry.", "And the purse in the pocket?", "Every coin. I counted twice."], when: (c) => c.trust >= 8 },
  { lines: ["I'd trust the innkeeper with my daughter's wedding.", "With the cake?", "Nobody's that trustworthy."], when: (c) => c.trust >= 8 },
  { lines: ["Who'd you tell, if you'd something to hide?", "The chapel.", "And after?", "The innkeeper. Quieter than the chapel."], when: (c) => c.trust >= 9 },
  { lines: ["The whole village has come round to the innkeeper.", "Even old Bram?", "Even Bram's goat."], when: (c) => c.trust >= 10 },
  { lines: ["Bram says the innkeeper's one of us now.", "Bram says that about his goat.", "And has the goat ever let him down?"], when: (c) => c.trust >= 10 },
  { lines: ["The mill folk drink here now. On account of the innkeeper.", "The mill folk go nowhere.", "They go here. That's my point."], when: (c) => c.trust >= 10 },
  { lines: ["I don't know this innkeeper.", "Nobody does. That's the problem.", "Nobody's said a good word yet."], when: (c) => c.trust <= 2 },
  { lines: ["Careful of the innkeeper. Nobody's vouched for them.", "Wren's kin, though.", "Wren's dead, and we're still paying."], when: (c) => c.trust <= 2 },
  { lines: ["The innkeeper asked my name.", "Did you give it?", "I gave them Bram's. Can't be too careful."], when: (c) => c.trust <= 2 },
  { lines: ["Nobody's sat at the innkeeper's table yet.", "Nobody's been asked.", "Nobody'd go if they were."], when: (c) => c.trust <= 2 },
  { lines: ["The innkeeper wished me good evening.", "And?", "I'm still working out what they meant by it."], when: (c) => c.trust <= 3 },
  // Heat.
  { lines: ["Pike was in asking after the innkeeper.", "Pike can't spell innkeeper.", "He had someone write it on his hand."], when: (c) => c.heat >= 3 },
  { lines: ["The garrison's been sniffing round this innkeeper.", "What for?", "Do they need a reason?", "I'll finish up quickly, then."], when: (c) => c.heat >= 4 },
  { lines: ["There's been a soldier at that window an hour.", "Watching who?", "The innkeeper. And now us, for watching him."], when: (c) => c.heat >= 4 },
  { lines: ["If the captain comes for the innkeeper, I'm not here.", "You're never anywhere.", "That's why I'm still alive."], when: (c) => c.heat >= 5 },
  { lines: ["That innkeeper's in trouble with the baron.", "Who isn't?", "Trouble with a name on it, I mean."], when: (c) => c.heat >= 5 },
  { lines: ["The baron's men have a list, and the innkeeper's on it.", "What list?", "The list. There's only ever the one."], when: (c) => c.heat >= 6 },
  { lines: ["Drink up. The innkeeper's got the captain's eye.", "Which eye?", "The one that never blinks."], when: (c) => c.heat >= 6 },
  { lines: ["Sergeant Dunn woke up to ask about the innkeeper.", "Dunn woke up?", "Briefly. Asked, yawned, slept."], when: (c) => c.heat >= 7 },
  { lines: ["Garrison's left the innkeeper alone, I notice.", "Lucky.", "Or careful. I can't tell which yet."], when: (c) => c.heat === 0 && c.night >= 1 },
  // Money.
  { lines: ["They say the innkeeper might pay off the baron after all.", "Never.", "They've a full strongbox, I heard.", "Then rob it, not me."], when: flush },
  { lines: ["This innkeeper's making money hand over fist.", "Off us.", "Aye, off us. Good for them, though."], when: flush },
  { lines: ["The innkeeper's bought wax candles.", "Wax?", "Wax. There's money in this place now."], when: flush },
  { lines: ["Will the innkeeper clear Wren's debt, do you think?", "If they keep charging for bread.", "The bread's free!", "Not since Tuesday."], when: (c) => c.gold >= c.debt * 0.4 },
  { lines: ["The innkeeper's paid off the baron, I heard.", "All of it?", "Every penny. Now they owe him only a grudge."], when: (c) => c.gold >= c.debt },
  { lines: ["What's the innkeeper owe the baron, anyway?", "Everything, I heard.", "Must be nice to be that well known."], when: poor },
  { lines: ["The innkeeper's counting coins at the bar.", "Takes long?", "Not long enough, by their face."], when: poor },
  { lines: ["Heard the innkeeper sold Wren's good pot.", "Not the good pot!", "The baron wants paying. Pots don't pay."], when: poor },
  { lines: ["The baron's clerk was in, counting the innkeeper's barrels.", "What for?", "To see what's left to tax. The barrels."], when: poor },
  // Last call.
  { lines: ["Somebody sent the baron's man the wrong way.", "Was it the innkeeper?", "I never said that.", "Nor did I.", "Good. Buy them a drink."], when: (c) => c.persona.protected >= 1 },
  { lines: ["That innkeeper stood up to the baron's lot.", "Lied to their faces, I heard.", "Beautiful, isn't it?"], when: (c) => c.persona.protected >= 1 },
  { lines: ["I owe the innkeeper, and I'm not the owing sort.", "What did they do?", "Said they'd never seen me. Very convincingly."], when: (c) => c.persona.protected >= 1 },
  { lines: ["The baron's man asked the innkeeper about the ridge.", "And?", "Got sent up the north path. In the dark."], when: (c) => c.persona.protected >= 1 },
  { lines: ["They say the innkeeper's lied to the baron twice now.", "Only twice?", "Twice that we know of. Bless them."], when: (c) => c.persona.protected >= 2 },
  { lines: ["The ones on the run are calling this the safe house.", "The innkeeper won't want that said aloud.", "Then don't say it aloud!"], when: (c) => c.persona.protected >= 2 },
  { lines: ["I'd not say a thing near that innkeeper.", "Why's that?", "Somebody talked. Then soldiers came.", "...Mind your tongue, then."], when: (c) => c.persona.informed >= 1 },
  { lines: ["The innkeeper told on someone. That's what they say.", "Wren would've spat.", "Wren would've spat on them first."], when: (c) => c.persona.informed >= 1 },
  { lines: ["The innkeeper had a quiet word with the captain.", "About what?", "About who. That's the trouble."], when: (c) => c.persona.informed >= 1 },
  { lines: ["The ford folk won't drink here. Not since the innkeeper talked.", "Can you blame them?", "No. Pass the salt."], when: (c) => c.persona.informed >= 1 },
  { lines: ["Twice now the innkeeper's run to the garrison.", "Wren never ran anywhere.", "Wren couldn't. Her knees."], when: (c) => c.persona.informed >= 2 },
  { lines: ["The innkeeper'll sell whatever you say in here.", "Then say something expensive.", "Like what?", "Your name's Baron."], when: (c) => c.persona.sold >= 1 },
  { lines: ["How much do you reckon the innkeeper charged for that secret?", "More than they charge for the stew.", "Tastes better too, I'd guess."], when: (c) => c.persona.sold >= 1 },
  { lines: ["What does the innkeeper do with all that rumor money?", "Buys more ears.", "Ears aren't cheap this far up."], when: (c) => c.persona.sold >= 1 },
  { lines: ["Watch what you say. The innkeeper's got a buyer for everything.", "Even the weather?", "Smugglers pay well for weather."], when: (c) => c.persona.sold >= 1 },
  { lines: ["The innkeeper sold my cousin's secret for six silver.", "Six?", "I'm offended. It was worth ten."], when: (c) => c.persona.sold >= 2 },
  // Kindness and greed.
  { lines: ["The innkeeper slipped a bit extra in my bowl.", "Mine as well.", "It's no way to run a business.", "No. Eat up."], when: (c) => c.persona.kindness >= 3 },
  { lines: ["There's a kind one, that innkeeper.", "It'll be the ruin of them.", "Aye. Pity. Have you tried the bread?"], when: (c) => c.persona.kindness >= 3 },
  { lines: ["The innkeeper carried old Tam home through the snow.", "Tam's twice their size.", "Carried him anyway. Dropped him twice."], when: (c) => c.persona.kindness >= 4 },
  { lines: ["The innkeeper lets the widow Hale drink for nothing.", "All night?", "All winter. Don't tell the baron."], when: (c) => c.persona.kindness >= 5 },
  { lines: ["Kindest innkeeper on the pass, that.", "Only innkeeper on the pass.", "Still counts."], when: (c) => c.persona.kindness >= 6 },
  { lines: ["That innkeeper would charge you for the air.", "Have you seen the bill?", "I was charged for looking at the stew."], when: (c) => c.persona.greed >= 3 },
  { lines: ["Innkeeper's got coin where the heart should be.", "So does the baron.", "The baron doesn't bring you bread."], when: (c) => c.persona.greed >= 3 },
  { lines: ["The innkeeper's charging for the fire now.", "For sitting by it?", "For looking at it. Sitting's extra."], when: (c) => c.persona.greed >= 4 },
  { lines: ["The innkeeper weighed my bread before selling it.", "Was it short?", "It was. They charged me for the crumbs."], when: (c) => c.persona.greed >= 5 },
  { lines: ["The baron's clerk says this innkeeper drives a hard bargain.", "From him, that's praise.", "Or a warning."], when: (c) => c.persona.greed >= 6 },
  { lines: ["I hear this innkeeper can be cold.", "How cold?", "I've had warmer looks from a ewe."], when: (c) => c.persona.kindness <= -3 },
  { lines: ["Asked the innkeeper for a bit of credit.", "And?", "They laughed. Not unkindly. Not kindly either."], when: (c) => c.persona.kindness <= -3 },
  { lines: ["The innkeeper turned a beggar out into the snow.", "Tonight?", "Tonight. Wren would've given him a stool."], when: (c) => c.persona.kindness <= -5 },
  // Drink.
  { lines: ["The innkeeper's had a few tonight.", "How do you know?", "They walked round that table twice.", "It's a round table."], when: (c) => c.drunk >= 0.3 },
  { lines: ["Is the innkeeper swaying, or am I?", "Both of you, I think.", "Oh, good."], when: (c) => c.drunk >= 0.3 },
  { lines: ["The innkeeper just toasted the coat rack.", "Did it toast back?", "It's had fewer than they have."], when: (c) => c.drunk >= 0.5 },
  { lines: ["The innkeeper's singing behind the bar.", "Badly?", "Beautifully. That's how I know they're drunk."], when: (c) => c.drunk >= 0.5 },
  { lines: ["I watched the innkeeper out-drink a soldier.", "Which one?", "All of them, one after the other."], when: (c) => c.persona.drinks >= 4 },
  { lines: ["Can the innkeeper hold their drink?", "Hold it? They carry it home and tuck it in."], when: (c) => c.persona.drinks >= 4 },
  { lines: ["The innkeeper drinks with anyone who asks, I hear.", "Anyone?", "I asked. Three times. Lovely evening."], when: (c) => c.persona.drinks >= 8 },
  { lines: ["Never seen the innkeeper take a drop.", "Not one?", "Keeps their head while we lose ours. Clever."], when: (c) => c.persona.drinks === 0 && c.night >= 1 },
  // Flirting.
  { lines: ["Have you noticed the innkeeper's smile?", "Who hasn't?", "I've come in three nights running. I hate ale."], when: (c) => c.persona.flirt >= 2 },
  { lines: ["The innkeeper winked at me.", "They've got something in their eye.", "Both eyes, was it?", "...One."], when: (c) => c.persona.flirt >= 2 },
  { lines: ["The innkeeper laughed at my joke.", "Your joke isn't funny.", "I know. That's what's got me thinking."], when: (c) => c.persona.flirt >= 3 },
  { lines: ["The innkeeper touched my hand, giving me change.", "That's how change works.", "Not the way they did it."], when: (c) => c.persona.flirt >= 3 },
  { lines: ["Half the pass is in love with this innkeeper.", "Only half?", "The other half hasn't been in yet."], when: (c) => c.persona.flirt >= 5 },
  { lines: ["I hear that innkeeper's a shameless flirt.", "You say that like it's a bad thing.", "I say that like I'm next in the queue."], when: (c) => c.persona.flirt >= 5 },
  { lines: ["Pike's been to the barber twice. For the innkeeper.", "Pike's got no hair.", "That's why it took twice."], when: (c) => c.persona.flirt >= 5 },
  { lines: ["That innkeeper's got the whole garrison blushing.", "The sergeant?", "He's combed his eyebrows."], when: (c) => c.persona.flirt >= 6 },
  { lines: ["The innkeeper's charm ought to be taxed.", "Don't say that near the baron's men.", "They'd only want a share."], when: (c) => c.persona.flirt >= 7 },
  { lines: ["You can't get so much as a smile out of this innkeeper.", "I've tried.", "I've tried with flowers.", "In this weather?"], when: (c) => c.persona.flirt === 0 && c.night >= 1 },
  { lines: ["Proper, that innkeeper. Cold, but proper.", "Proper isn't cold.", "It is when you've been trying for a week."], when: (c) => c.persona.flirt <= 1 && c.night >= 2 },
  // Respect.
  { lines: ["Mind your manners around that innkeeper.", "Why?", "Last fellow who didn't got shown the snow."], when: (c) => c.persona.respect >= HIGH_RESPECT },
  { lines: ["That innkeeper won't stand for any nonsense.", "Tried it, have you?", "Once. My ear's still red."], when: (c) => c.persona.respect >= HIGH_RESPECT },
  { lines: ["There's a proper innkeeper. Straight back, clean house.", "Like Wren.", "Better than Wren, some nights."], when: (c) => c.persona.respect >= HIGH_RESPECT },
  { lines: ["Nobody spits on the floor now. The innkeeper's doing.", "And the last one who did?", "Mopped it. With his own hat."], when: (c) => c.persona.respect >= HIGH_RESPECT },
  { lines: ["The innkeeper told Pike to take his boots off the table.", "Did he?", "Off the table and out the door."], when: (c) => c.persona.respect >= HIGH_RESPECT },
  { lines: ["I called the innkeeper 'love' once.", "Once?", "Once. They looked at me. It's been 'innkeeper' since."], when: (c) => c.persona.respect >= HIGH_RESPECT },
  { lines: ["Even the smugglers wipe their feet for this innkeeper.", "Smugglers?", "Both feet. I watched."], when: (c) => c.persona.respect >= 6 },
  // Fame.
  { lines: ["Folk at the ford have never heard of this innkeeper.", "Good. More stew for us.", "Give it a month."], when: (c) => c.persona.fame < 5 && c.night >= 1 },
  { lines: ["People are starting to talk about this innkeeper.", "Talk where?", "In Harrowgate, I heard.", "Harrowgate? That's two days' walk!"], when: (c) => c.persona.fame >= 10 },
  { lines: ["This is the place. The innkeeper everyone's on about.", "It's quite small.", "All the best legends are."], when: (c) => c.persona.fame >= 15 },
  { lines: ["There's a song about this innkeeper now.", "Is it any good?", "Terrible. Very catchy."], when: (c) => c.persona.fame >= 20 },
  { lines: ["A peddler asked me the way to the innkeeper's.", "Not the way to Tarven?", "Didn't know the town's name. Just the innkeeper."], when: (c) => c.persona.fame >= 20 },
  { lines: ["I told a man in the valley I'd met the innkeeper of Tarven.", "And?", "He bought me dinner."], when: (c) => c.persona.fame >= 25 },
  { lines: ["Was that the innkeeper? THE innkeeper?", "That's them. Don't stare.", "I'm not staring. I'm remembering."], when: (c) => c.persona.fame >= 25 },
  { lines: ["They say the innkeeper's never spilled a drop.", "They tell that about every innkeeper.", "Not with this much feeling."], when: (c) => c.persona.fame >= 30 },
  { lines: ["They've named a pie after the innkeeper in Harrowgate.", "What's in it?", "Nobody knows. That's the joke."], when: (c) => c.persona.fame >= 30 },
  { lines: ["I've been told I'm sat where the innkeeper once sat.", "Which stool?", "Every stool, depending who's telling it."], when: (c) => c.persona.fame >= 35 },
  { lines: ["Children in the valley are playing innkeepers now.", "Who gets to be the innkeeper?", "There've been fights."], when: (c) => c.persona.fame >= 40 },
  { lines: ["The baron's jealous of this innkeeper, I'd wager.", "Of a tavern?", "Nobody's written a song about him."], when: (c) => c.persona.fame >= 40 },
  { lines: ["A minstrel came up the pass to see the innkeeper.", "For a song?", "For a second verse. The first one ran out."], when: (c) => c.persona.fame >= 45 },
  { lines: ["Is it true the innkeeper once stared down a wolf?", "It was a dog.", "It's a wolf by Harrowgate. A bear by the coast."], when: (c) => c.persona.fame >= 50 },
  // Who's talking: the garrison's view.
  { lines: ["Captain says the innkeeper's to be left be.", "Why?", "Says the stew's all that keeps the garrison sane."], when: speaker("soldier") },
  { lines: ["Innkeeper pours a fair measure for the garrison.", "Fairer than the quartermaster.", "Everything's fairer than the quartermaster."], when: speaker("soldier") },
  { lines: ["Dunn sleeps sounder here than in barracks.", "That's the innkeeper's stew.", "Or the innkeeper's chairs. Or just Dunn."], when: speaker("soldier") },
  { lines: ["If we're told to search the innkeeper's cellar...", "We search it slow.", "Very slow. Mind the good barrel."], when: (c) => c.kind === "soldier" && c.persona.kindness >= 0 },
  { lines: ["The innkeeper had me sweep the floor for my last ale.", "A soldier of the baron!", "Swept it well, too. Felt useful."], when: speaker("soldier") },
  // The farmers' view.
  { lines: ["The innkeeper bought my turnips at a fair price.", "Who taught them that?", "Not Wren. Wren haggled like a crow."], when: speaker("farmer") },
  { lines: ["My sheep likes the innkeeper.", "You've brought a sheep in here?", "Only the one. The innkeeper didn't mind."], when: speaker("farmer") },
  { lines: ["If the innkeeper wants a hand with that roof, I'm there.", "You've no head for heights.", "I've a head for free ale."], when: speaker("farmer") },
  { lines: ["Innkeeper asked me when the snow'd break.", "What did you say?", "Same as every year. Thursday. It's never Thursday."], when: speaker("farmer") },
  // The smugglers' view.
  { lines: ["The innkeeper asked no questions about the crates.", "None?", "Asked if they were heavy. That's a good question."], when: speaker("smuggler") },
  { lines: ["Good cellar, the innkeeper's got.", "For ale?", "For ale. Of course. What else would it be for."], when: speaker("smuggler") },
  { lines: ["The innkeeper counts coin like someone used to the dark.", "Have they been?", "We'll find out, won't we."], when: speaker("smuggler") },
  { lines: ["Could the innkeeper be bought, do you think?", "Everyone can be bought.", "Then why haven't we tried?", "We can't afford them."], when: speaker("smuggler") },
  // The fugitives' view.
  { lines: ["The innkeeper didn't look twice at my face.", "Good.", "They looked once. Very kindly. I nearly wept."], when: speaker("fugitive") },
  { lines: ["Does the innkeeper know who we are?", "The innkeeper knows who pays.", "Then let's keep paying."], when: speaker("fugitive") },
  { lines: ["The innkeeper left the back door unlatched.", "On purpose?", "I'm choosing to believe so."], when: speaker("fugitive") },
  { lines: ["If the innkeeper asks, we're cousins.", "Whose cousins?", "Anyone's. The innkeeper won't ask. That's the beauty."], when: speaker("fugitive") },
];

const lowerStill = (c: BanterContext) => c.persona.respect <= -6;

/** What the room says once it has stopped respecting the innkeeper. Only comes up at low respect. */
export const SMUTTY_GOSSIP: readonly AboutYou[] = [
  { lines: ["I hear the innkeeper's door stays open after closing.", "Which door?", "Depends how much you tip."] },
  { lines: ["What do you reckon the innkeeper charges for the back room?", "It's a bedroom.", "That's what I said."] },
  { lines: ["Every time the innkeeper bends over a table, the room goes quiet.", "I'd noticed.", "We've all noticed."] },
  { lines: ["Tip that innkeeper enough and they'll sit on your knee, I heard.", "Whose knee?", "Anyone's. There's a queue."] },
  { lines: ["Wren ran a decent house.", "And what's this, then?", "Ask the innkeeper. For the right coin."] },
  { lines: ["Nobody smiles like that innkeeper unless they're selling something.", "Selling what?", "Have a guess."] },
  { lines: ["I reckon that innkeeper's warmed half the beds on the pass.", "Just the half?", "It's been a busy week."] },
  { lines: ["Sergeant came back from here with his shirt on backwards.", "Did he say why?", "Said the innkeeper helped."] },
  { lines: ["Did you see the way the innkeeper leaned in?", "To you?", "To everyone. That's what I'm saying."] },
  { lines: ["My wife says I'm not to drink here any more.", "What's brought that on?", "She's heard about the innkeeper.", "Heard what?", "Same as you. Only she believes it."] },
  { lines: ["That innkeeper's got a price for everything, they say.", "Everything?", "Bring a full purse and a clean shirt."] },
  { lines: ["Does the innkeeper do that for all the customers?", "Do what?", "You know what.", "Not for me, they don't.", "Try tipping."] },
  { lines: ["The innkeeper's rooms go by the hour now, I heard.", "Rooms? There's one room.", "Busy room, then."] },
  { lines: ["Pike's in every night now. For the innkeeper, he says.", "For the ale, surely.", "Pike doesn't drink."] },
  { lines: ["The innkeeper's apron's got shorter.", "Has it, now?", "An inch a night. I've been measuring."] },
  { lines: ["Did the innkeeper just wink at the whole table?", "One wink each, I counted.", "Some of us got two."] },
  { lines: ["My brother says the innkeeper's very welcoming.", "Your brother's never been in.", "He says he has. Late."] },
  { lines: ["The chapel's preaching about this place now.", "About the ale?", "About the innkeeper. Long sermon. Very detailed."] },
  { lines: ["They say you can pay the innkeeper in kind.", "Turnips?", "Not turnips."] },
  { lines: ["Nobody comes for the stew any more.", "What, then?", "To watch the innkeeper bend to serve it."] },
  { lines: ["Somebody's written a rhyme about the innkeeper on the privy wall.", "Clever?", "Rude. Rhymes 'innkeeper' with 'cheaper'."] },
  { lines: ["The innkeeper hasn't done that collar up all night.", "Hot in here.", "It's snowing through the roof."] },
  { lines: ["Mothers at the mill won't let their sons past that door.", "On account of the ale?", "For the innkeeper."] },
  { lines: ["Ask the innkeeper about the special.", "What's the special?", "Not on the board. You have to ask nicely."] },
  { lines: ["The innkeeper's giggling with the soldiers again.", "Which ones?", "Whoever's purse is fattest that hour."] },
  { lines: ["Someone saw the innkeeper leaving the fort at dawn.", "Delivering ale?", "Without any ale."] },
  { lines: ["They're calling this place the Warm Lap now.", "The Warm Lap? Why?", "Ask the innkeeper. Or sit down and find out."] },
  { lines: ["Is the innkeeper on the menu tonight?", "Behind the stew, I heard.", "What's it cost?", "Less than the stew."], when: lowerStill },
  { lines: ["You can't call that a tavern any more.", "What do you call it?", "Ask the innkeeper. They'll show you the rates."], when: lowerStill },
  { lines: ["Whole garrison's tried charming that innkeeper.", "Any luck?", "It isn't luck when there's a queue."], when: lowerStill },
  { lines: ["Nobody respects an innkeeper who sits on every lap going.", "Nobody's complaining.", "No. That's the sad part."], when: lowerStill },
  { lines: ["The baron could clear that innkeeper's debt in one night.", "Clear it how?", "How do you think?"], when: lowerStill },
  { lines: ["The garrison's drawn up a rota for the innkeeper.", "A rota?", "Dunn's on it. He'll sleep through his turn."], when: lowerStill },
  { lines: ["Why are the innkeeper's knees always dusty?", "From scrubbing floors?", "That's the kind story."], when: lowerStill },
  { lines: ["There's a queue outside the innkeeper's back room.", "In this snow?", "Nobody's complained of the cold."], when: lowerStill },
  { lines: ["The innkeeper's got a price list pinned behind the bar.", "For drinks?", "Turn it over."], when: lowerStill },
  { lines: ["The baron's men don't tax this house any more.", "Why not?", "The innkeeper pays them another way, I heard."], when: lowerStill },
  { lines: ["What's the innkeeper go for, for a whole night?", "Less than a cask, these days.", "Cheaper than a bed in Harrowgate."], when: lowerStill },
  { lines: ["Wren kept a respectable house for forty years.", "And the innkeeper?", "Undid it in a week. Lying down, mostly."], when: lowerStill },
  { lines: ["A smuggler offered to buy the innkeeper by the crate.", "By the crate?", "And the innkeeper asked how big a crate."], when: lowerStill },
  { lines: ["The captain's on first-name terms with the innkeeper.", "Which name?", "The one you shout through a door at midnight."], when: lowerStill },
  { lines: ["Nobody says 'going to the tavern' any more.", "What do they say?", "'Going to see the innkeeper.' With a wink."], when: lowerStill },
];

/** How guests call you over once they've stopped respecting you. {Item} and {item} are their order. */
export const LEERING_CALLS: Record<GuestKind, readonly string[]> = {
  farmer: [
    "{Item}, sweetheart! And what else have you got?",
    "{Item}, love. I've heard you do extras.",
    "{Item}, and bring it slow. I like the walk.",
    "Oi, pet! {Item}, and none of your shy looks.",
    "{Item}, darling. Wife's at the mill all night.",
    "{Item}! And lean over the table when you set it down.",
  ],
  soldier: [
    "{Item}, darling! The lads say you're good for more!",
    "Oi, gorgeous! {Item}, and come sit on this knee!",
    "{Item}, and bring yourself with it!",
    "{Item}! The whole garrison sends its love. Wink wink.",
    "Over here, sweetness! {Item}, and I'm off duty!",
    "{Item}! Pike says hello. Very warmly, he says it.",
  ],
  smuggler: [
    "{Item}. And how much for the rest, friend?",
    "{Item}. I hear everything's for sale here.",
    "{Item}. And name your price for the after-hours.",
    "{Item}, my sweet. I trade in all sorts of goods.",
    "{Item}. I hear the back room has a better cellar.",
    "{Item}, and I'll pay double if you stay and pour it.",
  ],
  fugitive: [
    "{Item}, please. Is it... true, what they say about you?",
    "Could I have {item}? I've heard things. About you.",
    "{Item}, please. And... are you the one they talk about?",
    "{Item}? Sorry. I'm told I should ask about the extras.",
    "Um. {Item}. And, the men at the ford said to... no. Never mind.",
    "{Item}, please. I've only a little coin. Is that... enough for...?",
  ],
};

export const LEERING_THANKS: Record<GuestKind, readonly string[]> = {
  farmer: [
    "Keep the change. Buy something that covers less.",
    "Ta, love. Same time tonight, is it?",
    "Lovely. And the food's not bad either.",
    "Ta. Wren never served it with a wiggle.",
    "There's a good innkeeper. Very good, I hear.",
    "Ta, pet. Tell me when the back room's free.",
  ],
  soldier: [
    "Not bad. Lean over like that again.",
    "The lads were right about you.",
    "Ha! Worth the march down from the fort.",
    "Lovely. I'll be telling the barracks about that.",
    "Good. Now what's for afters, sweetness?",
    "Cheers, gorgeous. Put the rest on my tab. You know the rest.",
  ],
  smuggler: [
    "Nice. What's the price for the rest of the evening?",
    "Fine goods. All of them.",
    "Good. I'll look you over properly later.",
    "Ta. I'll take an inventory of you after closing.",
    "Very nice. Everything in this house has a price, eh?",
    "Mm. Fair trade. I'll make an offer on the rest.",
  ],
  fugitive: [
    "Thanks. They really do say a lot about you.",
    "Oh. You're exactly what they said.",
    "Th-thank you. I didn't mean to stare. I did. Sorry.",
    "Thanks. I'm... I'm not looking. I am looking. Sorry.",
    "Oh. They weren't lying about you, then.",
    "Thank you. I'll... think about you. Not like that. Like that.",
  ],
};
