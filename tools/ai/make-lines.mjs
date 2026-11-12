// Fills the AI narrator's line bank (public/ai-lines.json) using a local model in KoboldCpp, ahead of time, so the
// game can show a fitting explicit line the instant something happens instead of waiting on the model.
//
//   1. Start KoboldCpp (C:\Game\AI\start-ai.bat).
//   2. node tools/ai/make-lines.mjs                 (her lines, 10 per situation)
//      node tools/ai/make-lines.mjs --pronoun he     (his, for the male sibling)
//      node tools/ai/make-lines.mjs --per 20         (more lines per situation; keeps what's there and adds)
//      node tools/ai/make-lines.mjs --only touch:chest   (just the situations starting with that)
//
// It saves after every situation, so it can be stopped and run again; it skips situations that already have enough.
// Lines use {name} for the innkeeper and {guest} for the kind of guest; the game fills them in.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
};
const PRONOUN = arg("pronoun", "she");
const PER = Number(arg("per", "10"));
const ENDPOINT = arg("endpoint", "http://localhost:5001");
const ONLY = arg("only", "");
const OUT = fileURLToPath(new URL("../../public/ai-lines.json", import.meta.url));
const BATCH = 5;

const she = PRONOUN === "she";
const P = she ? { sub: "she", obj: "her", pos: "her" } : { sub: "he", obj: "him", pos: "his" };

const REGIONS = {
  hand: "takes the innkeeper's hand",
  face: "strokes the innkeeper's face",
  hair: "runs fingers through the innkeeper's hair",
  shoulder: "puts a hand on the innkeeper's shoulder",
  waist: "slides an arm around the innkeeper's waist",
  rear: "grabs the innkeeper's arse",
  chest: she ? "gropes the innkeeper's breasts" : "runs a hand over the innkeeper's chest",
  lap: "pulls the innkeeper down onto their lap",
  lips: "goes in to kiss the innkeeper on the lips",
  neck: "kisses the innkeeper's neck",
  thigh: "slides a hand up the innkeeper's thigh",
  clothes: "tugs at the innkeeper's clothes to get a piece off",
  intimate: she ? "reaches between the innkeeper's legs" : "reaches for the innkeeper's crotch",
  invite: "whispers an invitation to take the innkeeper upstairs",
};

const ANSWERS = {
  allow: `${P.sub} lets them`,
  lean: `${P.sub} leans into it, wanting more`,
  slap: `${P.sub} slaps their hand away`,
  pull: `${P.sub} pulls away from them`,
};
/** Words the ACTION line must use for each part of her, so a line about her rear is about her rear. */
const REGION_WORDS = {
  hand: /\b(hand|hands|fingers|palm|wrist)\b/i,
  face: /\b(face|cheek|cheeks|chin|jaw)\b/i,
  hair: /\b(hair|braid|braids|curls|locks)\b/i,
  shoulder: /\bshoulders?\b/i,
  waist: /\b(waist|hips?|middle)\b/i,
  rear: /\b(ass|arse|rear|rump|bum|bottom|behind|backside|cheeks|buttocks?)\b/i,
  chest: /\b(tits|breasts?|bosom|chest|nipples?|boobs?|peaks)\b/i,
  lap: /\b(lap|knee|knees)\b/i,
  lips: /\b(lips|kiss|kisses|kissing|mouth)\b/i,
  neck: /\b(neck|throat|nape)\b/i,
  thigh: /\b(thighs?|legs?)\b/i,
  clothes: /\b(clothes|laces?|skirt|blouse|apron|dress|bodice|shirt|straps?|buttons?|garter|stockings?|strips?)\b/i,
  intimate: /\b(legs|crotch|pussy|cunt|mound|sex|skirt|groin|cock|slit|core)\b/i,
  invite: /\b(upstairs|room|bed|invites?|night|whispers?)\b/i,
};
/** Words the REACTION line must use when she says no, so a refusal always reads as one. */
const ANSWER_WORDS = {
  slap: /\b(slaps?|smacks?|swats?|bats?|cuffs?|strikes?|hits?|knocks?|shoves?|slapped|smacked)\b/i,
  pull: /\b(away|back|free|twists?|pulls?|steps?|retreats?|withdraws?|dodges?|slips?|shoves?|pushes|sidesteps?|jerks?)\b/i,
};

const TIERS = [
  `${P.sub} is still proud and resisting hard. Tone: dirty and crude, but full of denial, shame, and her body betraying her. She keeps trying to stay composed.`,
  `${P.sub} is losing the fight against her own body. Tone: explicit and filthy, pride cracking, reluctant pleasure leaking through every reaction.`,
  `${P.sub} has mostly given in and the room can see it. Tone: as graphic and obscene as possible, but still with lingering shame and the feeling that she shouldn't want this.`,
];

/** How she's feeling in an after-hours duel, from duel.ts's DuelState. */
const DUEL_STATES = {
  calm: "you're still in control, cocky and teasing",
  aroused: "you're aroused, wet and breathing hard",
  edge: "you're on the edge of coming and barely holding on",
};
/** Her moves in a duel (duelmoves.ts HER_MOVES), all with a man she agreed to play with. */
const DUEL_HER = {
  kiss: "you kiss the {guest}",
  caress: "you caress the {guest}'s body",
  tease: "you tease the {guest} with dirty words and looks",
  undress: "you strip for the {guest}",
  hands: "you stroke the {guest}'s cock with your hands",
  mouth: "you suck the {guest}'s cock",
  tits: "you fuck the {guest}'s cock with your tits",
  ride: "you ride the {guest}'s cock",
  anal: "you take the {guest}'s cock in your ass",
};
/**
 * Their moves in a duel, only ever on the parts of her she put in play: a kiss (by how she feels), and for each
 * part he's taken, his first, bolder and boldest move with it (dueltalk.ts THEIR_STAGES).
 */
const DUEL_KISS = "the {guest} kisses you";
const DUEL_THEIR = {
  hands: [
    "the {guest}'s rough hands grope and squeeze all over your body",
    "the {guest} wraps your hand round his hard cock and makes you stroke it",
    "the {guest} fucks your fist, thrusting his cock through your grip",
  ],
  mouth: [
    "the {guest} kisses you hard and deep with his tongue",
    "the {guest} pushes his cock into your mouth and makes you suck it",
    "the {guest} grabs your hair and fucks your throat with his cock",
  ],
  breasts: [
    "the {guest} gropes your tits and pinches your nipples",
    "the {guest} sucks and bites your nipples",
    "the {guest} fucks your tits, his cock sliding between them",
  ],
  butt: [
    "the {guest} grabs your ass and spreads your cheeks",
    "the {guest} spanks your ass hard",
    "the {guest} fucks your ass with his cock",
  ],
  pussy: [
    "the {guest} fingers your wet pussy",
    "the {guest} eats your pussy, licking your clit",
    "the {guest} fucks your pussy with his cock",
  ],
};
/** What he talks about, by the part of her he has (dueltalk.ts TALK). */
const DUEL_TALK = {
  kiss: "while kissing you",
  hands: "while you stroke his cock with your hand",
  mouth: "while you suck his cock",
  breasts: "while he plays with and fucks your tits",
  butt: "while he grabs, spanks and fucks your ass",
  pussy: "while he fingers, licks and fucks your pussy",
};
/** Where he finishes (cum.ts CumSpot), and the words that show it. */
const DUEL_CUM = {
  mouth: ["the {guest} comes in your mouth and you swallow his load", /\b(mouth|throat|tongue|swallow|gulp)/i],
  face: ["the {guest} pulls out and comes all over your face", /\b(face|cheeks?|lips|chin|eyes|nose|forehead)/i],
  breasts: ["the {guest} comes all over your tits", /\b(tits|breasts?|chest|nipples?|cleavage)/i],
  pussy: ["the {guest} comes deep inside your pussy and fills you up", /\b(pussy|cunt|womb|inside|fill)/i],
  ass: ["the {guest} comes deep inside your ass and fills it", /\b(ass|arse|asshole|inside|fill)/i],
  body: ["the {guest} comes all over your belly and hands", /\b(belly|stomach|skin|hands?|body|navel)/i],
};
const CUM_WORDS = /\b(cum|come|comes|coming|load|seed|spurt|spill|fill|flood|pump|squirt|jizz|explod|erupt|ropes?|spray|shoot|semen|cream|essence|spunk|splatter|paint|drip|glob|sticky)/i;
/** Brawl events (fight.ts): rough, never sexual — a fight never leads to anything else. */
const FIGHT = {
  start: "the {guest} picks a fight with you, squaring up and spitting threats and filthy insults",
  "strike:hit": "you punch the {guest} hard and it lands",
  "strike:miss": "you swing at the {guest} and miss",
  "shove:hit": "you shove the {guest} back into the tables",
  "shove:miss": "you try to shove the {guest} but he doesn't budge",
  dodge: "you get light on your feet, ready to duck the {guest}'s next swing",
  "talk:ok": "no fists: with words alone you talk the {guest} down, sweet or sharp-tongued, and it works: he grumbles and sits back down",
  "talk:fail": "you try to talk the {guest} down; he won't hear it and gets angrier",
  "stare:ok": "you stare the {guest} down and his nerve falters",
  "stare:win": "you stare the {guest} down until he backs off and leaves",
  "stare:fail": "you try to stare the {guest} down and he laughs in your face",
  throw: "you haul the worn-out {guest} up by the collar and throw him out into the snow",
  knockout: "the {guest} goes down and stays down; regulars carry him out",
  staggered: "the {guest} is still reeling from your shove",
  "their:hit": "the {guest} punches you and it lands",
  "their:miss": "the {guest} swings at you and misses",
  "their:dodged": "you duck under the {guest}'s swing",
  lost: "the {guest} knocks you to the floor and you lose the fight",
};
/** Who has to be acting in each brawl line, and the words that show it's the right event. */
const YOU_FIRST = /^(you|your)\b/i;
const THEM_FIRST = /^(the \{guest\}|he|his)\b/i;
const FIGHT_CHECK = {
  start: [THEM_FIRST, /./],
  "strike:hit": [YOU_FIRST, /\b(punch|fist|knuckles|jab|hook|blow|cracks?|lands?|smash|elbow|uppercut|strike)/i],
  "strike:miss": [YOU_FIRST, /\b(miss|wide|whiff|air|nothing|ducks?|dodges?|sways?)/i],
  "shove:hit": [YOU_FIRST, /\b(shove|push|slam|table|bench|back|stagger|sprawl)/i],
  "shove:miss": [/./, /\b(shove|push|budge|ground|plant|immovable|wall|stands?|doesn't move|won't move)/i],
  dodge: [YOU_FIRST, /\b(feet|light|ready|bounce|weav|crouch|step|circle|fists up|guard|toes)/i],
  "talk:ok": [/./, /\b(sits?|sat|seat|calm|settles?|backs? down|stands? down|grumbl|sheepish|nods?|mutters?|slumps?|deflat|crumbl|relent|subsid|gives? up|chair|bench|stool)/i],
  "talk:fail": [/./, /\b(talk|say|said|words?|tell|voice|calm|reason|"|listen|hear|angrier|worse|rage|snarl)/i],
  "stare:ok": [/./, /\b(stare|eyes|glare|gaze|look)/i],
  "stare:win": [/./, /\b(stare|eyes|glare|gaze|look|backs?|leaves|slinks|retreat|door)/i],
  "stare:fail": [/./, /\b(stare|eyes|glare|gaze|look|laugh|smirk|grin|sneer)/i],
  throw: [/./, /\b(throw|toss|hurl|snow|door|out|collar|boot)/i],
  knockout: [/./, /\b(down|floor|out cold|carry|carried|limp|unconscious|stays)/i],
  staggered: [/./, /\b(reel|stagger|sway|wobbl|groggy|dazed|feet|shak)/i],
  "their:hit": [THEM_FIRST, /\b(your|you)\b/i],
  "their:miss": [THEM_FIRST, /\b(miss|wide|whiff|air|nothing|swing)/i],
  "their:dodged": [YOU_FIRST, /\b(duck|dodge|slip|weav|sway|under|past)/i],
  lost: [/./, /\b(floor|down|ground|boards|knock|sprawl|black|dark)/i],
};

/** The words each duel move has to use, so a line is about what's actually being done. */
const DUEL_HER_WORDS = {
  kiss: /\b(kiss|lips|mouth|tongue)/i,
  caress: /\b(hands?|fingers?|palms?|stroke|caress|trac|skin|chest|body)/i,
  tease: /\b(whisper|words?|tease|look|eyes|wink|say|purr|"|smile|lick your lips)/i,
  undress: /\b(strip|dress|bare|naked|peel|slip|fall|drop|clothes|bodice|skirt)/i,
  hands: /\b(hands?|fingers?|palms?|fist|grip|strok|pump|jerk)/i,
  mouth: /\b(mouth|lips|tongue|throat|suck|swallow|gag)/i,
  tits: /\b(tits|breasts?|cleavage|chest|nipples?)/i,
  ride: /\b(ride|riding|hips|straddl|bounce|grind|sink|inside)/i,
  anal: /\b(ass|arse|anal|backdoor|behind|cheeks|inside)/i,
};
const DUEL_THEIR_WORDS = {
  kiss: /\b(kiss|lips|mouth)/i,
  hands: /\b(hands?|fingers?|palms?|grab|touch|paw|roam)/i,
  mouth: /\b(tongue|kiss|mouth|lips|throat|suck|gag|cock)/i,
  breasts: /\b(tits|breasts?|nipples?|chest)/i,
  butt: /\b(ass|arse|butt|cheeks|rump|spank|bottom)/i,
  pussy: /\b(pussy|cunt|clit|slit|thighs|sex|folds|wet|fingers?)/i,
};
/** Words for the parts she may not have put in play: only lines for that part may use them. */
const GENITAL = /\b(pussy|cunt|clit|slit|folds|panties|cock (in|inside)|inside you)\b/i;
const ANAL = /\b(ass|arse|anal|asshole|butt)\b/i;

/** A brawl line that turns sexual is thrown out: in this game a fight is only ever a fight. */
const SEXUAL_ACT = /\b(grop|fondl|molest|rap(e|es|ed|ing)\b|thrust|penetrat|strip|undress|lick|kiss|squeez|fuck(s|ed|ing)? (you|her)\b)/i;

/** Every situation the bank covers: its key, what to tell the model, and how many lines it wants. */
function situations() {
  const list = [];
  // Brawls and duels first: their logs are in the second person, one line each (see src/game/flavor.ts).
  const you = (line) => /\b(you|your)\b/i.test(line);
  for (const [event, what] of Object.entries(FIGHT))
    list.push({
      key: `fight:${event}`,
      style: "you",
      about: /^(talk|stare)/.test(event)
        ? `A tavern standoff, no blows thrown in this line: ${what}. Tone: tense and foul-mouthed, sharp crude words, hard eyes. Nothing sexual happens.`
        : `A tavern brawl: ${what}. Tone: brutal, bloody and foul-mouthed, crude insults and taunts, bruises and spit. Nothing sexual happens.`,
      want: Math.round(PER * 1.5),
      check: (line) => {
        const [who, words] = FIGHT_CHECK[event];
        // Talking and staring are done without fists.
        const noBlows = !/^(talk|stare)/.test(event) || !/\b(punch|fist|knuckles?|kick|elbow|headbutt|boot|blood|slap)/i.test(line);
        return you(line) && !SEXUAL_ACT.test(line) && who.test(line) && words.test(line) && noBlows;
      },
    });
  // Duels are written for her body (duel.ts); the male sibling's duels keep their written lines.
  for (const [move, what] of Object.entries(she ? DUEL_HER : {}))
    for (const [state, feel] of Object.entries(DUEL_STATES))
      list.push({
        key: `duel:her:${move}:${state}`,
        style: "you",
        about: `An after-hours pleasure duel you agreed to, by rules you set: ${what}, and ${feel}. Tone: as graphic and obscene as you can write.`,
        want: PER,
        // About this move, and nothing done with a part of her this move doesn't use.
        check: (line) =>
          you(line) &&
          DUEL_HER_WORDS[move].test(line) &&
          (move === "ride" || !GENITAL.test(line)) &&
          (move === "anal" || !ANAL.test(line)),
      });
  for (const [state, feel] of Object.entries(she ? DUEL_STATES : {}))
    list.push({
      key: `duel:their:kiss:${state}`,
      style: "you",
      about: `An after-hours pleasure duel you agreed to: ${DUEL_KISS}, and ${feel}. Only kissing. Tone: hungry and filthy.`,
      want: PER,
      check: (line) => you(line) && DUEL_THEIR_WORDS.kiss.test(line) && !GENITAL.test(line) && !ANAL.test(line),
    });
  for (const [area, stages] of Object.entries(she ? DUEL_THEIR : {}))
    stages.forEach((what, stage) =>
      list.push({
        key: `duel:their:${area}:${stage}`,
        style: "you",
        about:
          `An after-hours pleasure duel you agreed to, by rules you set: ${what}. ` +
          "He uses only that part of you, nothing else. Tone: as graphic and obscene as you can write.",
        want: PER,
        // Never outside her rules: the line stays on the part of her he has, like the duel itself.
        check: (line) =>
          you(line) &&
          DUEL_THEIR_WORDS[area].test(line) &&
          (area === "pussy" || !GENITAL.test(line)) &&
          (area === "butt" || !ANAL.test(line)),
      }),
    );
  // What he says while he's at it, and what slips out of her: spoken lines, in quotes.
  for (const [area, what] of Object.entries(she ? DUEL_TALK : {}))
    list.push({
      key: `duel:talk:${area}`,
      style: "talk",
      about: `An after-hours pleasure duel you agreed to. The {guest} talks dirty to you ${what}. Write what HE says: crude, filthy, cocky dirty talk.`,
      want: PER * 2,
      check: (line) => (area === "pussy" || !GENITAL.test(line)) && (area === "butt" || !ANAL.test(line)),
    });
  for (const [state, feel] of Object.entries(she ? DUEL_STATES : {}))
    list.push({
      key: `duel:moan:${state}`,
      style: "talk",
      about: `An after-hours pleasure duel you agreed to, and ${feel}. Write what YOU say or moan to the {guest}: ${state === "calm" ? "a cocky, dirty taunt" : "breathless, filthy moaning and begging"}.`,
      want: PER * 2,
      check: (line) => !GENITAL.test(line) && !ANAL.test(line),
    });
  for (const [spot, [what, words]] of Object.entries(she ? DUEL_CUM : {}))
    list.push({
      key: `duel:cum:${spot}`,
      style: "you",
      about: `An after-hours pleasure duel you agreed to: ${what}. Tone: as graphic and obscene as you can write, thick and messy.`,
      want: PER,
      check: (line) =>
        you(line) && CUM_WORDS.test(line) && words.test(line) && (spot === "pussy" || !GENITAL.test(line)) && (spot === "ass" || !ANAL.test(line)),
    });
  if (she) list.push({
    key: "duel:givesin",
    style: "you",
    about: "An after-hours pleasure duel you agreed to: the {guest} is right at the edge and can't hold back any longer; he gives in to you, groaning. Tone: graphic and obscene.",
    want: PER,
    check: you,
  });
  for (const [region, act] of Object.entries(REGIONS))
    for (const [answer, how] of Object.entries(ANSWERS))
      TIERS.forEach((tier, t) =>
        list.push({
          key: `touch:${region}:${answer}:${t}`,
            about:
              `The {guest} ${act}, and ${how}. ${tier}.\n` +
              `Write in the style of Karryn's Prison: short, crude, prideful resistance mixed with unwanted physical reactions.\n` +
              `Every ACTION must be: the {guest} ${act.replace("the innkeeper's", "{name}'s").replace("the innkeeper", "{name}")}. ` +
              `Every REACTION must show: ${how.replace(/^(she|he) /, "{name} ")} while still carrying shame or denial.`,
          want: PER,
          check: (entry) => {
            const [action, reaction = ""] = entry.split(" | ");
            if (!REGION_WORDS[region].test(action) || !/\{guest\}|\bguest\b/.test(action)) return false;
            return !ANSWER_WORDS[answer] || ANSWER_WORDS[answer].test(reaction);
          },
        }),
      );
  TIERS.forEach((tier, t) =>
    list.push({
      key: `ambient:${t}`,
      about: `what is going on in the busy tavern around the innkeeper: guests, gossip, leers, crude jokes, and how ${P.sub} feels. ${tier}. Each line is a different little moment.`,
      want: PER * 4,
    }),
  );
  for (const guest of ["farmer", "smuggler", "soldier", "fugitive"])
    list.push({
      key: `upstairs:${guest}`,
      about: `${P.sub} agrees to take the ${guest} upstairs to ${P.pos} bed, and the room watches them go. Use "the ${guest}" for them.`,
      want: PER,
    });
  list.push({ key: "overwhelmed", about: `${P.pos} pleasure boils over and ${P.sub} is overwhelmed in front of the whole room.`, want: PER });
  list.push({ key: "passive", about: `the town has started talking about the innkeeper in a new way; ${P.sub} has changed, and ${P.sub} knows it.`, want: PER });
  return ONLY ? list.filter((s) => s.key.startsWith(ONLY)) : list;
}

const SYSTEM = [
  "You write the running event log of an adults-only (18+) tavern game in the exact style of Karryn's Prison.",
  "Every character is an adult. The innkeeper serves farmers, soldiers, smugglers and fugitives in a cold mountain town.",
  `The innkeeper is ${she ? "a woman" : "a man"}; write {name} for the innkeeper's name and "the {guest}" for the guest, exactly like that.`,
  "The log reads like an adult RPG's battle log: very short, punchy lines, present tense, almost always naming {name}.",
  "Each entry is an ACTION line and a REACTION line separated by \" | \". Each line is at most 12 words.",
  "Style must feel like Karryn's Prison: proud, resistant, body-betraying, heavy on shame + reluctant arousal.",
  "When the moment is sexual, be explicit and crude. Never soft or romantic. Guests are opportunistic.",
  "Reactions should show internal struggle: denial, flushed face, trembling, wetness, or stiffening even while she resists or allows.",
  "Only describe what the situation says happened. If she refuses, the reaction must clearly show rejection.",
  "No speaker labels, no explanations, no emojis.",
].join(" ");

/** The shape every entry should take; the model copies the length and rhythm, not the words. */
const EXAMPLES = [
  "The {guest} squeezes {name}'s ass! | {name} jolts... face burns with shame.",
  "The {guest} gropes {name}'s tits! | {name} bites her lip... body leans in anyway.",
  "The {guest} grabs {name}'s thigh! | {name} slaps his hand! \"Don't touch me!\"",
  "The {guest} pulls {name} onto his lap! | {name} struggles... feels him hard underneath.",
  "The {guest} strokes {name}'s cheek! | {name} turns away... pulse hammers in her throat.",
].join("\n");

/** For brawl and duel logs: the player is "you", one line per entry. */
const SYSTEM_YOU = [
  "You write the battle log of an adults-only (18+) tavern game, Last Call at Tarven. Every character is an adult.",
  'The player is "you"; write "the {guest}" for the other man, exactly like that.',
  "Each entry is ONE short punchy line, at most 16 words, second person, present tense, like an adult RPG's battle log.",
  "Be vivid and specific. Never soften or censor. No speaker labels, no explanations, no emojis.",
].join(" ");
const EXAMPLES_YOU = [
  "Your fist cracks into the {guest}'s jaw. He spits blood and calls you a cow.",
  "The {guest}'s knuckles split your lip. You taste copper and grin back.",
  "You lick a slow stripe up the {guest}'s chest. He groans like a dying man.",
].join("\n");

/** For what's said in a duel: one spoken line, nothing else. */
const SYSTEM_TALK = [
  "You write what is SAID in the battle log of an adults-only (18+) tavern game, Last Call at Tarven. Every character is an adult.",
  'The player is "you"; the other man is "the {guest}".',
  "Each entry is ONE short spoken line in double quotes, at most 14 words, like an adult RPG's dirty talk.",
  "Crude and explicit; never soften or censor. No narration, no speaker labels, no emojis.",
].join(" ");
const EXAMPLES_TALK = ['"Look at you, dripping for it already."', "\"Gods, don't you dare stop now.\"", "\"That all you've got, big man?\""].join("\n");

function prompt(about, style) {
  if (style === "talk") {
    const user =
      `Situation: ${about}\n\nThe log's style, for length and rhythm only (do not copy these):\n${EXAMPLES_TALK}\n\n` +
      `Write ${BATCH} different lines for this situation, numbered 1 to ${BATCH}, one per line, each only the spoken words in quotes.`;
    return `<|im_start|>system\n${SYSTEM_TALK}<|im_end|>\n<|im_start|>user\n${user}<|im_end|>\n<|im_start|>assistant\n1.`;
  }
  if (style === "you") {
    const user =
      `Situation: ${about}\n\nThe log's style, for length and rhythm only (do not copy these):\n${EXAMPLES_YOU}\n\n` +
      `Write ${BATCH} different entries for this situation, numbered 1 to ${BATCH}, one per line. ` +
      "They are alternatives, not a story: the game shows only ONE, so each must show this exact moment on its own.";
    return `<|im_start|>system\n${SYSTEM_YOU}<|im_end|>\n<|im_start|>user\n${user}<|im_end|>\n<|im_start|>assistant\n1.`;
  }
  const user =
    `Situation: ${about}\n\nThe log's style, for length and rhythm only (do not copy these):\n${EXAMPLES}\n\n` +
    `Write ${BATCH} different entries for this situation, numbered 1 to ${BATCH}, one per line, each "ACTION | REACTION". ` +
    "They are alternatives, not a story: the game shows only ONE, so each must show what the guest does AND how {name} answers. " +
    "Always write \"the {guest}\" with \"the\".";
  return `<|im_start|>system\n${SYSTEM}<|im_end|>\n<|im_start|>user\n${user}<|im_end|>\n<|im_start|>assistant\n1.`;
}

/** The numbered lines out of the model's answer, cleaned and checked. */
function parse(raw, style) {
  const lines = `1.${raw}`
    .replace(/<\|im_(start|end)\|>.*/s, "")
    .split("\n")
    .map((l) => l.match(/^\s*\d+[.)]\s*(.+)$/)?.[1]?.trim() ?? "")
    .map((l) => l.replace(/^"(.*)"$/, "$1").trim());
  // Spoken lines: just the words, put back in one pair of quotes.
  if (style === "talk")
    return lines
      .map((l) => l.replace(/^["“]+|["”]+$/g, "").trim())
      .filter((l) => !/["“”|]/.test(l) && l.length >= 6 && l.length <= 100 && /[.!?…]$/.test(l))
      .filter((l) => !/\{(?!guest\})[^}]*\}/.test(l) && !/[[\]<>*]/.test(l))
      .map((l) => `"${l}"`);
  if (style === "you")
    return lines
      .map((l) => ((l.match(/"/g) ?? []).length % 2 ? l.replace(/^"\s*|\s*"$/g, "") : l).trim())
      .filter((l) => !l.includes("|") && l.length >= 15 && l.length <= 120 && /[.!?"”…]$/.test(l))
      .filter((l) => !/\{(?!guest\})[^}]*\}/.test(l) && !/[[\]<>]/.test(l));
  return lines
    .map((l) =>
      l
        .split("|")
        // A quote left dangling at either end of a line is the model's slip, not speech.
        .map((part) => part.trim())
        .map((part) => ((part.match(/"/g) ?? []).length % 2 ? part.replace(/^"\s*|\s*"$/g, "") : part).trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(" | "),
    )
    // The reaction names her, like the rest of the log, and "Name" is the model forgetting the fill-in.
    .filter((l) => (l.split(" | ")[1] ?? l).includes("{name}") && !/\bName\b/.test(l))
    // Short lines only, each part finished, like a battle log; anything long or cut off is thrown away.
    .filter((l) => l.split(" | ").every((part) => part.length >= 8 && part.length <= 90 && /[.!?"”…]$/.test(part)))
    // Only the two fill-ins the game knows; anything else in braces means the model went off script.
    .filter((l) => !/\{(?!name\}|guest\})[^}]*\}/.test(l) && !/[[\]<>]/.test(l));
}

async function generate(about, style) {
  const response = await fetch(`${ENDPOINT}/api/v1/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt(about, style),
      max_length: 300,
      max_context_length: 2048,
      temperature: 1.05,
      top_p: 0.95,
      min_p: 0.05,
      rep_pen: 1.1,
      stop_sequence: ["<|im_end|>", "<|im_start|>"],
    }),
  });
  if (!response.ok) throw new Error(`KoboldCpp answered ${response.status}`);
  const data = await response.json();
  return parse(data.results?.[0]?.text ?? "", style);
}

const bank = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { version: 1, lines: {} };
bank.lines[PRONOUN] ??= {};
const mine = bank.lines[PRONOUN];

const todo = situations();
let done = 0;
/** Entries thrown out for the wrong part of her or a refusal that didn't read as one. */
let rejected = 0;
for (const s of todo) {
  done++;
  const have = new Set(mine[s.key] ?? []);
  let tries = 0;
  while (have.size < s.want && tries < Math.ceil(s.want / BATCH) * 5) {
    tries++;
    try {
      for (const line of await generate(s.about, s.style)) {
        if (have.size >= s.want) break;
        if (!s.check || s.check(line)) have.add(line);
        else {
          rejected++;
          // DEBUG=1 shows what was thrown out, to tune a situation's checks.
          if (process.env.DEBUG) console.log(`   x ${line}`);
        }
      }
    } catch (error) {
      console.error(`\nCan't reach KoboldCpp at ${ENDPOINT}: ${error.message}. Is start-ai.bat running?`);
      process.exit(1);
    }
  }
  mine[s.key] = [...have];
  bank.model = "MN-12B-Mag-Mell-R1 (IQ4_XS)";
  writeFileSync(OUT, `${JSON.stringify(bank, null, 1)}\n`);
  process.stdout.write(`[${done}/${todo.length}] ${s.key}: ${have.size} lines\n`);
}
const total = Object.values(mine).reduce((n, l) => n + l.length, 0);
console.log(`Done: ${total} lines for "${PRONOUN}" in ${OUT} (${rejected} off-script entries thrown out)`);
