/**
 * Every scene a foe can start with her mid-brawl, after Karryn's Prison's battle sex poses (RemtairyPoses.js POSE_*
 * 11 to 28, and each enemy's `<AI PoseStart Skills>` in Enemies.json). GAME_PATH.MD 7i.
 *
 * - The first five are Tarven's own (one per part of her: her hands, mouth, breasts, pussy and rear), shown the way
 *   his type has her (sexpose.ts). Every kind can start these, for the part his type goes for, as before.
 * - The rest are KP's: each kind of guest has the ones his KP counterpart starts (KIND_SCENES): the bandit's gangbang
 *   (KP's thug), the soldier's (KP's guard), the fugitive's hands and mouth (KP's prisoner), and so on.
 * - Each needs her ready for it (KP's canGet...Inserted, on Tarven's 0 to 100 desire: roughly KP's numbers × 0.8),
 *   has the slots others can join her at (KP's pose joins), and a boldness: in a scene, the one who has her may move
 *   it on to a bolder one of his (KP's tryUpgradeSexPose), asked like any scene.
 * - A fugitive won't start or join her mouth, pussy or rear until she's done that act before (KP's prisoners).
 * - A bandit or adventurer can catch her kick and turn it into a scene (KP's kick counter: thugs and yetis).
 * - Rimjobs and footjobs can be switched off in Settings, as in KP.
 *
 * - Eight more of Tarven's own (deep throat, on her back, laid on a table, bent over the bar, against the wall, flat
 *   on her belly, on his lap), for variety: each kind has a couple more.
 *
 * The big picture for the KP scenes uses Tarven's nearest pose for now (`pose`); POSES_TODO.md lists the ones still
 * to be made. Pure rules and data, kept apart from fight.ts so they can be tested.
 */
import type { DuelArea } from "./duel";
import type { JoinSlot, ScenePoseName } from "./sexpose";
import type { GuestKind } from "./tavern";
import type { Meters } from "./passives";

export type FoeSceneId =
  // Tarven's own, one per part of her.
  | "hands"
  | "mouth"
  | "breasts"
  | "pussy"
  | "butt"
  // Karryn's Prison's.
  | "footjob"
  | "rimjob"
  | "standPaizuri"
  | "licked"
  | "gangbang"
  | "soldierGangbang"
  | "backPussy"
  | "backAnal"
  | "cowgirl"
  | "reverse"
  | "carry"
  | "piledriver"
  | "kickCounter"
  // More of Tarven's own, for variety: each kind has a couple.
  | "throat"
  | "missionary"
  | "tableLaid"
  | "bentOverBar"
  | "bentOverAnal"
  | "againstWall"
  | "proneBone"
  | "lapRide";

/** What she has to be ready for: her desires, wet, and how much of her clothes are off (0 to 1). */
export interface SceneReady {
  need: Partial<Meters>;
  wet?: boolean;
  exposure?: number;
}

export interface FoeSceneDef {
  id: FoeSceneId;
  /** What the log and the offer call it. */
  label: string;
  /** The part of her it is: her desire for it rises, and it counts toward her experience and records as this. */
  area: DuelArea;
  ready: SceneReady;
  /** The slots others can join her at, if she's ready for what each takes (KP's pose joins). */
  joins: readonly JoinSlot[];
  /** How bold it is: in a scene, he can only move it on to a bolder one. */
  boldness: number;
  /** Tarven's pose for it in the big picture; left out, the part's own (his type's way: brawlscene.ts takenScene). */
  pose?: ScenePoseName;
  /** KP's pose it's after (its folder in img/karryn), for POSES_TODO.md. */
  kp: string;
  /** Its Settings switch, if it has one. */
  toggle?: "rimjob" | "footjob";
  /** Only ever a counter to her kick, never started on his turn. */
  counterOnly?: boolean;
  /** The log: him starting it, it starting, and his turns in it. `{Name}` is him. */
  offer: readonly string[];
  taken: readonly string[];
  pose_: readonly string[];
}

const PUSSY: SceneReady = { need: { pussy: 80, cock: 70 }, wet: true, exposure: 0.7 };
const ANAL: SceneReady = { need: { butt: 80, cock: 70 }, exposure: 0.7 };

/**
 * The scenes. The log lines for KP's were written with Grok in the house voice (STORY.md); the first five keep their
 * own lines (brawllines.ts, by part).
 */
export const FOE_SCENES: Readonly<Record<FoeSceneId, FoeSceneDef>> = {
  hands: { id: "hands", label: "her hands", area: "hands", ready: { need: { cock: 40 } }, joins: ["mouth", "left"], boldness: 1, kp: "hj_standing", offer: [], taken: [], pose_: [] },
  mouth: { id: "mouth", label: "her mouth", area: "mouth", ready: { need: { mouth: 80, cock: 50 } }, joins: ["left", "right"], boldness: 2, kp: "bj_kneeling", offer: [], taken: [], pose_: [] },
  breasts: { id: "breasts", label: "her breasts", area: "breasts", ready: { need: { breasts: 80, cock: 50 }, exposure: 0.4 }, joins: ["mouth"], boldness: 2, kp: "paizuri_laying", offer: [], taken: [], pose_: [] },
  pussy: { id: "pussy", label: "her", area: "pussy", ready: PUSSY, joins: ["mouth", "left", "right"], boldness: 4, kp: "(his type's way)", offer: [], taken: [], pose_: [] },
  butt: { id: "butt", label: "her rear", area: "butt", ready: ANAL, joins: ["mouth", "left", "right"], boldness: 4, kp: "(his type's way)", offer: [], taken: [], pose_: [] },

  footjob: {
    id: "footjob",
    label: "a footjob",
    area: "hands",
    ready: { need: { cock: 50 } },
    joins: ["mouth", "left", "right"],
    boldness: 1,
    pose: "stroke",
    kp: "footj",
    toggle: "footjob",
    offer: [
      "{Name} drops onto the bench, yanks your boots off, and plants both your bare feet on his hard cock.",
      "{Name} grins at the watching room and starts grinding his shaft between your soles.",
      "{Name} grabs your ankles and tells you to keep those toes curled while he uses them.",
      "{Name} spits on his cock and slides it up between your arches so the whole tavern can see.",
      "{Name} sits back on the bench, pulls your feet onto his lap, and rubs his cock between your soles until the tankards rattle.",
      "{Name} spits on his shaft and slides it under your arches while the watching room bets how long he'll last.",
      "{Name} grabs both your ankles and starts stroking himself with your feet like they're the best pair of boots in the tavern.",
    ],
    taken: [
      "Your feet clamp around his cock as he starts thrusting between them on the sawdust floor.",
      "Tankards bang on tables while he works your soles over his shaft.",
      "The room cheers as your toes slip and slide along his length.",
    ],
    pose_: [
      "{Name} pumps hard between your feet, making your toes slick with spit and pre.",
      "{Name} squeezes your ankles tighter and slaps his cock against your soles for the crowd.",
      "{Name} groans and keeps thrusting, your arches sliding wet along his shaft.",
      "{Name} holds your feet together and fucks them steady while the benches creak.",
      "{Name} thrusts faster between your feet and laughs when your toes curl and slip off his cock.",
      "{Name} holds your soles tight together and pumps until pre drips onto the sawdust under the bench.",
      "{Name} slaps his cock against the bottoms of your feet and tells the room your arches feel better than any whore's cunt.",
    ],
  },
  rimjob: {
    id: "rimjob",
    label: "her mouth on his rear",
    area: "mouth",
    ready: { need: { mouth: 80 } },
    joins: ["left", "right"],
    boldness: 3,
    pose: "kneel",
    kp: "rimming",
    toggle: "rimjob",
    offer: [
      "{Name} bends over the table, drops his breeches, and shoves his bare ass back toward your face.",
      "{Name} grabs the back of your head and pulls your mouth onto his hole.",
      "{Name} spreads his cheeks with both hands and tells you to lick while the room watches.",
      "{Name} leans further over the table so your tongue can reach deep.",
      "{Name} bends over the end of the table, drops his breeches to his knees, and backs his ass right onto your mouth.",
      "{Name} spreads his cheeks with one hand and pulls your face in with the other while the benches whoop.",
      "{Name} leans further forward so his hole is right in your face and tells you to get your tongue working before the ale runs out.",
    ],
    taken: [
      "Your tongue presses into his ass as he braces on the tabletop.",
      "Sawdust sticks to his thighs while you work your mouth over his rear.",
      "The watching room whoops as he pushes back onto your face.",
    ],
    pose_: [
      "{Name} grinds his ass against your mouth, making you lick deeper.",
      "{Name} reaches back and holds your head there while he flexes.",
      "{Name} moans and spreads wider so the whole tavern sees your tongue on him.",
      "{Name} keeps rocking back, your spit running down his crack onto the floor.",
      "{Name} rocks his ass back onto your tongue and groans when the watching room starts chanting.",
      "{Name} reaches back, holds your head steady, and grinds his hole across your lips until spit runs down his thighs.",
      "{Name} flexes and pushes harder so your nose is buried in his crack while tankards bang on the tables.",
    ],
  },
  standPaizuri: {
    id: "standPaizuri",
    label: "her breasts, standing",
    area: "breasts",
    ready: { need: { breasts: 80, cock: 50 }, exposure: 0.4 },
    joins: ["mouth"],
    boldness: 2,
    pose: "paizuri",
    kp: "orc_paizuri / yeti_paizuri",
    offer: [
      "{Name} backs you against the post, rips your top open, and shoves his cock between your breasts.",
      "{Name} grabs your tits and squeezes them around his shaft.",
      "{Name} spits down your cleavage and starts thrusting up between them.",
      "{Name} pins you to the post so the room can watch him fuck your tits.",
      "{Name} shoves you against the support post, yanks your top down, and wedges his cock between your tits.",
      "{Name} spits down your cleavage, squeezes your breasts around his shaft, and starts thrusting up.",
      "{Name} pins your shoulders to the post and fucks your tits while the room watches your spit drip onto the sawdust.",
    ],
    taken: [
      "His cock slides wet between your breasts as he holds you against the post.",
      "Tankards clatter while he pumps upward into your cleavage.",
      "The watching room cheers as your tits bounce around his shaft.",
    ],
    pose_: [
      "{Name} thrusts hard between your tits, his cockhead poking up under your chin.",
      "{Name} squeezes your breasts tighter and fucks the gap faster.",
      "{Name} groans and keeps pounding, spit and pre slicking your skin.",
      "{Name} holds the post with one hand and your tits with the other while he works.",
      "{Name} pumps faster between your breasts and laughs when his cockhead bumps your chin.",
      "{Name} squeezes your tits harder and keeps thrusting until pre coats your skin and runs down to your belly.",
      "{Name} holds the post with one hand and your breasts with the other while he works his shaft in the gap.",
    ],
  },
  licked: {
    id: "licked",
    label: "his mouth on her",
    area: "pussy",
    ready: { need: { pussy: 70 }, exposure: 0.7 },
    joins: ["left", "right"],
    boldness: 2,
    pose: "licked",
    kp: "goblin_cl",
    offer: [
      "{Name} drops to his knees in the sawdust, shoves your skirt up, and buries his face between your legs.",
      "{Name} grabs your hips and pulls your cunt onto his mouth.",
      "{Name} licks up your slit and tells the room he's tasting the tavern keeper.",
      "{Name} spreads your thighs wider and goes to work with his tongue.",
      "{Name} drops to his knees in the sawdust, shoves your skirt up over your hips, and buries his face in your cunt.",
      "{Name} spreads your thighs wide and starts licking while the watching room leans over the benches to see.",
      "{Name} grabs your ass and pulls you onto his mouth, telling the tavern he's drinking straight from the keeper.",
    ],
    taken: [
      "His tongue slides into you while he kneels on the dirty floor.",
      "Benches creak as he holds you open and licks steady.",
      "The watching room leans in to watch him eat you out.",
    ],
    pose_: [
      "{Name} sucks your clit and keeps his tongue working inside you.",
      "{Name} grips your ass and pulls you harder onto his face.",
      "{Name} moans into your cunt and licks deeper while the room cheers.",
      "{Name} stays on his knees and keeps going until your thighs shake.",
      "{Name} sucks your clit hard and keeps his tongue working inside you while the benches cheer.",
      "{Name} grips your hips and pulls you tighter against his face until your juices run down his chin onto the floor.",
      "{Name} moans into your pussy and licks deeper, making the whole room watch you shake on his mouth.",
    ],
  },
  gangbang: {
    id: "gangbang",
    label: "her, with his mates",
    area: "pussy",
    ready: PUSSY,
    joins: ["mouth", "left", "right"],
    boldness: 5,
    pose: "gangbang",
    kp: "thug_gb",
    offer: [
      "{Name} throws you on the sawdust floor, spreads your legs, and shoves his cock in while his mates crowd around.",
      "{Name} pins your wrists and starts fucking you as the bandits line up.",
      "{Name} grins at the room and tells his boys to get ready while he takes the first turn.",
      "{Name} thrusts deep and holds you open so the next one can see.",
      "{Name} throws you onto the sawdust, shoves his cock in, and waves his mates over while he starts thrusting.",
      "{Name} pins your wrists above your head and fucks you as the other bandits crowd in and grab what they can.",
      "{Name} holds your legs open and tells the room the whole crew is taking turns on the tavern keeper.",
    ],
    taken: [
      "His cock fills you on the floor while the other bandits press in close.",
      "Tankards bang as they watch and wait their turns.",
      "The watching room howls while he pounds you and the line forms.",
    ],
    pose_: [
      "{Name} fucks you hard on the floor, his mates already grabbing your tits and mouth.",
      "{Name} pulls out and shoves the next bandit in while he holds your legs open.",
      "{Name} keeps you pinned and takes another turn once the others have had a go.",
      "{Name} laughs and thrusts back in while the crowd watches the whole line.",
      "{Name} pounds you on the floor then pulls out so the next bandit can shove in while he holds your thighs.",
      "{Name} takes another turn, gripping your hips and thrusting hard while the others wait and watch.",
      "{Name} laughs, shoves back inside you, and keeps you pinned so the line can keep moving.",
    ],
  },
  soldierGangbang: {
    id: "soldierGangbang",
    label: "her, the squad's way",
    area: "pussy",
    ready: PUSSY,
    joins: ["mouth", "left", "right"],
    boldness: 5,
    pose: "gangbang",
    kp: "guard_gb",
    offer: [
      "{Name} marches you to the middle of the room, bends you over a bench, and shoves in while his squad forms ranks.",
      "{Name} calls the drill and starts fucking you as the soldiers line up behind.",
      "{Name} holds your hips and thrusts in time while the next man steps forward.",
      "{Name} keeps you bent and tells the squad to stay in order.",
      "{Name} bends you over the bench, calls the squad to form up, and shoves his cock in while they wait in ranks.",
      "{Name} holds your hips and starts the drill, thrusting steady as the next soldier steps forward.",
      "{Name} keeps you in position and tells the room the squad is taking the tavern keeper in order.",
    ],
    taken: [
      "His cock drives into you while the squad waits in neat formation.",
      "Boots scuff the sawdust as they keep the line tight.",
      "The watching room stays quiet while the soldiers take turns like drill.",
    ],
    pose_: [
      "{Name} pounds you steady, then pulls out so the next soldier can step up.",
      "{Name} holds your waist and keeps the pace while the squad cycles through.",
      "{Name} takes his second turn and fucks you harder once the line has moved.",
      "{Name} calls the next man forward and stays to hold you in place.",
      "{Name} fucks you hard then pulls out so the next man can step up while he holds your waist.",
      "{Name} takes his turn again, pounding deeper once the line has cycled past.",
      "{Name} calls the next soldier forward and stays to keep you bent over the bench.",
    ],
  },
  backPussy: {
    id: "backPussy",
    label: "her, from behind",
    area: "pussy",
    ready: PUSSY,
    joins: ["mouth"],
    boldness: 4,
    pose: "doggy",
    kp: "werewolf_back",
    offer: [
      "{Name} shoves you onto all fours on the sawdust, grabs your hips, and drives his cock into your pussy from behind.",
      "{Name} pulls your skirt up and thrusts deep while the room watches your ass.",
      "{Name} slaps your ass and starts fucking you on the floor.",
      "{Name} holds your waist and pounds in so the benches shake.",
      "{Name} puts you on all fours in the sawdust, grabs your hips, and drives his cock into your pussy from behind.",
      "{Name} pulls your skirt up over your back and starts thrusting while the watching room cheers your ass.",
      "{Name} holds your waist and pounds in so the table legs rattle on the floor.",
    ],
    taken: [
      "His cock fills your pussy as he fucks you on all fours.",
      "Sawdust sticks to your knees while he thrusts from behind.",
      "The watching room cheers as your tits swing with every stroke.",
    ],
    pose_: [
      "{Name} grips your hips and pounds your pussy hard from behind.",
      "{Name} reaches under and rubs your clit while he keeps thrusting.",
      "{Name} slaps your ass and fucks deeper, making the table legs rattle.",
      "{Name} holds you steady and keeps pumping until your arms shake.",
      "{Name} grips your hips tighter and fucks your pussy harder, making your tits swing.",
      "{Name} reaches under to rub your clit while he keeps thrusting from behind.",
      "{Name} slaps your ass and pumps deep until sawdust sticks to both your knees.",
    ],
  },
  backAnal: {
    id: "backAnal",
    label: "her rear, from behind",
    area: "butt",
    ready: ANAL,
    joins: ["mouth"],
    boldness: 4,
    pose: "doggy",
    kp: "werewolf_back",
    offer: [
      "{Name} puts you on all fours, spits on your ass, and shoves his cock into your hole from behind.",
      "{Name} grabs your hips and forces in while the room watches.",
      "{Name} spreads your cheeks and starts fucking your ass on the sawdust.",
      "{Name} holds you down and thrusts deep so everyone can see.",
      "{Name} puts you on all fours, spits on your hole, and shoves his cock into your ass from behind.",
      "{Name} spreads your cheeks and starts thrusting while the room watches him take your rear.",
      "{Name} holds your hips and fucks your ass deep so the benches creak.",
    ],
    taken: [
      "His cock pushes into your ass as he fucks you on all fours.",
      "Your knees scrape the floor while he works in deeper.",
      "The watching room howls as he takes your ass from behind.",
    ],
    pose_: [
      "{Name} grips your waist and pounds your ass hard.",
      "{Name} spits again and keeps thrusting deeper into your hole.",
      "{Name} slaps your ass and fucks steady while the benches creak.",
      "{Name} holds you open and keeps going so the whole room sees.",
      "{Name} grips your waist and pounds your ass harder, making your body rock forward.",
      "{Name} spits again and keeps thrusting until his cock slides easy in your hole.",
      "{Name} holds you open and pumps steady while the watching room howls.",
    ],
  },
  cowgirl: {
    id: "cowgirl",
    label: "her, on top",
    area: "pussy",
    ready: PUSSY,
    joins: ["mouth", "left", "right"],
    boldness: 4,
    pose: "cowgirl",
    kp: "cowgirl_lizardman",
    offer: [
      "{Name} lies back on the table, pulls you on top, and guides your cunt down onto his cock.",
      "{Name} grabs your hips and tells you to ride while the room watches.",
      "{Name} thrusts up into you and grins at the watching benches.",
      "{Name} holds your waist so you bounce on him in the middle of the tavern.",
      "{Name} lies back on the table, pulls you on top of him, and guides your cunt down onto his cock.",
      "{Name} grabs your hips and tells you to ride while the watching room bangs their tankards.",
      "{Name} thrusts up into you and holds you steady so everyone can see you bounce.",
    ],
    taken: [
      "You sink onto his cock while he lies back and holds your hips.",
      "Tankards clink as you start riding him on the table.",
      "The watching room cheers while you move on his shaft.",
    ],
    pose_: [
      "{Name} thrusts up hard while you ride, making your tits bounce.",
      "{Name} grips your ass and pulls you down harder onto him.",
      "{Name} groans and keeps bucking up so the table rocks.",
      "{Name} holds your hips and fucks you from below while the room watches.",
      "{Name} bucks up hard under you and laughs when your tits slap his chest.",
      "{Name} grips your ass and pulls you down harder onto his shaft.",
      "{Name} keeps thrusting from below until the table rocks and tankards roll off.",
    ],
  },
  reverse: {
    id: "reverse",
    label: "her rear, facing away",
    area: "butt",
    ready: ANAL,
    joins: ["mouth", "left", "right"],
    boldness: 4,
    pose: "reverse",
    kp: "cowgirl_reverse",
    offer: [
      "{Name} sits on the bench, pulls you onto his lap facing the room, and shoves his cock up your ass.",
      "{Name} spreads your legs so everyone can see him buried in you.",
      "{Name} grabs your hips and starts bouncing you on his shaft.",
      "{Name} holds you open and fucks your ass while the tavern watches.",
      "{Name} sits on the bench, pulls you onto his lap facing the room, and shoves his cock up your ass.",
      "{Name} spreads your legs wide so the whole tavern can see him buried in your hole.",
      "{Name} grabs your hips and starts bouncing you while the watching room cheers.",
    ],
    taken: [
      "His cock fills your ass as he sits and bounces you on his lap.",
      "Your legs spread wide so the watching room sees everything.",
      "Benches creak while he thrusts up into your hole.",
    ],
    pose_: [
      "{Name} grips your thighs and fucks your ass hard while you face the room.",
      "{Name} spreads you wider and keeps thrusting so everyone watches.",
      "{Name} holds your waist and bounces you steady on his cock.",
      "{Name} groans and keeps pumping your ass in front of the whole tavern.",
      "{Name} holds your thighs open and fucks your ass harder while you face the benches.",
      "{Name} grips your waist and pulls you down onto his cock so everyone watches.",
      "{Name} keeps thrusting up into your hole until your legs shake on his lap.",
    ],
  },
  carry: {
    id: "carry",
    label: "her, carried",
    area: "pussy",
    ready: PUSSY,
    joins: [],
    boldness: 5,
    pose: "carry",
    kp: "yeti_carry",
    offer: [
      "{Name} lifts you clean off your feet, wraps your legs around him, and shoves his cock in.",
      "{Name} holds you up and starts fucking you standing in the middle of the room.",
      "{Name} bounces you on his shaft while your feet dangle above the sawdust.",
      "{Name} grips your ass and thrusts deep so the watching room sees.",
      "{Name} lifts you off your feet, wraps your legs around his waist, and shoves his cock in.",
      "{Name} holds you up in the middle of the room and starts thrusting while your feet dangle.",
      "{Name} grips your ass and fucks you standing so the watching room can see everything.",
    ],
    taken: [
      "He holds you off the floor and fucks you while you cling to him.",
      "Your legs wrap his waist as he thrusts upward.",
      "The room cheers while he carries you and pounds you standing.",
    ],
    pose_: [
      "{Name} bounces you on his cock, your feet swinging above the floor.",
      "{Name} grips your ass harder and fucks you deeper while he holds you up.",
      "{Name} walks a step and keeps thrusting so the whole tavern watches.",
      "{Name} holds you tight and pounds steady until your arms shake.",
      "{Name} bounces you harder on his cock, making your tits swing above the sawdust.",
      "{Name} holds you tight and thrusts deeper while he walks a step or two.",
      "{Name} keeps you off the floor and pumps steady until your arms wrap tighter around him.",
    ],
  },
  piledriver: {
    id: "piledriver",
    label: "her rear, folded up",
    area: "butt",
    ready: ANAL,
    joins: ["mouth"],
    boldness: 5,
    pose: "prone",
    kp: "slime_piledriver",
    offer: [
      "{Name} folds you onto your back, pushes your legs over your head, and drives his cock into your ass from above.",
      "{Name} holds your ankles by your ears and starts fucking your hole.",
      "{Name} spreads you open on the floor and thrusts deep so the room sees.",
      "{Name} pins you folded and pounds your ass while the benches watch.",
      "{Name} folds you onto your back, pushes your legs over your head, and drives his cock into your ass.",
      "{Name} holds your ankles by your ears and starts thrusting while the room watches your hole.",
      "{Name} pins you folded on the sawdust and fucks your ass from above.",
    ],
    taken: [
      "His cock pushes into your ass while you're folded up on the sawdust.",
      "Your legs stay pinned by your head as he thrusts from above.",
      "The watching room howls while he takes you in that position.",
    ],
    pose_: [
      "{Name} holds your legs tight and pounds your ass hard from above.",
      "{Name} thrusts deeper into your hole while you stay folded on the floor.",
      "{Name} grips your ankles and keeps fucking so everyone can see.",
      "{Name} stays over you and pumps steady until the table legs rattle.",
      "{Name} grips your legs tighter and pounds your ass harder in the piledriver.",
      "{Name} thrusts deeper into your hole while you stay folded under him.",
      "{Name} keeps pumping from above until the watching room bangs tankards on the tables.",
    ],
  },
  kickCounter: {
    id: "kickCounter",
    label: "her, caught by the leg",
    area: "pussy",
    ready: PUSSY,
    joins: ["mouth"],
    boldness: 4,
    pose: "carry",
    kp: "kick_counter",
    counterOnly: true,
    offer: [
      "{Name} catches your kick, yanks your leg high, and shoves his cock into you while you stand on one foot.",
      "{Name} holds your raised leg and starts fucking you standing in the middle of the room.",
      "{Name} keeps your ankle up by his shoulder and thrusts deep.",
      "{Name} pins your leg high so the watching room sees him take you.",
      "{Name} catches your raised kick, yanks your leg high onto his shoulder, and shoves his cock into you.",
      "{Name} holds your ankle up and starts thrusting while you balance on one foot.",
      "{Name} keeps your leg pinned high and fucks you standing so the whole room sees.",
    ],
    taken: [
      "He holds your leg up high and fucks you while you balance on the other.",
      "Sawdust shifts under your standing foot as he thrusts.",
      "The room cheers while he keeps your kick caught and pounds you.",
    ],
    pose_: [
      "{Name} grips your raised ankle and fucks you hard standing.",
      "{Name} keeps your leg high and thrusts deeper so everyone watches.",
      "{Name} holds you steady and pounds while your other foot scrapes the floor.",
      "{Name} stays with your kick caught and keeps going until your standing leg shakes.",
      "{Name} grips your raised ankle tighter and pounds you harder on your standing leg.",
      "{Name} holds your leg up and thrusts deeper while sawdust scrapes under your other foot.",
      "{Name} keeps your kick caught and fucks steady until your standing knee shakes.",
    ],
  },
  // ---- More of Tarven's own, for variety ----
  throat: {
    id: "throat",
    label: "her mouth, deep",
    area: "mouth",
    ready: { need: { mouth: 80, cock: 60 } },
    joins: ["left", "right"],
    boldness: 3,
    pose: "throat",
    kp: "(none: Tarven's own; KP's bj_kneeling, deeper)",
    offer: [
      "{Name} pushes you to your knees in the sawdust and grabs the back of your head.",
      "{Name} shoves his cock past your lips and holds your head steady.",
      "{Name} tells the watching room to look while he fucks your mouth deep.",
      "{Name} grips your hair and starts thrusting into your throat.",
    ],
    taken: [
      "His cock fills your mouth as he holds your head and pushes deeper.",
      "Sawdust sticks to your knees while he works your throat.",
      "The room cheers as he keeps your face pressed to his hips.",
    ],
    pose_: [
      "{Name} holds your head with both hands and fucks your throat hard.",
      "{Name} pulls back just enough for you to gasp then shoves in again.",
      "{Name} groans and keeps your mouth full while the benches watch.",
      "{Name} grips your hair tighter and thrusts steady down your throat.",
    ],
  },
  missionary: {
    id: "missionary",
    label: "her, on her back",
    area: "pussy",
    ready: PUSSY,
    joins: ["mouth", "left", "right"],
    boldness: 4,
    pose: "missionary",
    kp: "(none: Tarven's own)",
    offer: [
      "{Name} lays you back on the sawdust floor and climbs between your legs.",
      "{Name} shoves his cock into your pussy and pins your wrists above your head.",
      "{Name} starts thrusting while the watching room leans in close.",
      "{Name} holds your thighs open and fucks you on the dirty floor.",
    ],
    taken: [
      "His cock fills your pussy as he lies on top of you in the sawdust.",
      "Your back scrapes the floor while he thrusts between your legs.",
      "Tankards bang as the room watches him take you missionary.",
    ],
    pose_: [
      "{Name} pounds your pussy hard while he holds you down on the floor.",
      "{Name} grabs your hips and keeps thrusting deep into you.",
      "{Name} groans and pins your legs wider so everyone can see.",
      "{Name} stays on top and fucks you steady until the benches creak.",
    ],
  },
  tableLaid: {
    id: "tableLaid",
    label: "her, laid across a table",
    area: "pussy",
    ready: PUSSY,
    joins: ["mouth", "left", "right"],
    boldness: 4,
    pose: "tableBack",
    kp: "(none: Tarven's own; like KP's waitress_table)",
    offer: [
      "{Name} sweeps the tankards off the table and lays you back across it.",
      "{Name} spreads your legs and shoves his cock into your pussy.",
      "{Name} holds your hips and starts fucking you on the tabletop.",
      "{Name} tells the room to watch while he takes you laid out flat.",
    ],
    taken: [
      "His cock fills your pussy as you lie back across the cleared table.",
      "Tankards roll on the floor while he thrusts into you.",
      "The watching room cheers as your tits bounce on the wood.",
    ],
    pose_: [
      "{Name} grips the table edge and pounds your pussy hard.",
      "{Name} pulls your legs up and keeps thrusting deep.",
      "{Name} groans and fucks you faster so the whole table shakes.",
      "{Name} holds you open and pumps steady while the room watches.",
    ],
  },
  bentOverBar: {
    id: "bentOverBar",
    label: "her, bent over the bar",
    area: "pussy",
    ready: PUSSY,
    joins: ["mouth"],
    boldness: 4,
    pose: "bentover",
    kp: "(none: Tarven's own)",
    offer: [
      "{Name} bends you over the bar counter and shoves his cock into your pussy from behind.",
      "{Name} grabs your hips and starts thrusting while the room watches your ass.",
      "{Name} holds you down on the bar and fucks you deep.",
      "{Name} slaps your ass and keeps pounding so the tankards rattle.",
    ],
    taken: [
      "His cock fills your pussy as he bends you over the bar.",
      "Your tits press against the wood while he thrusts from behind.",
      "The watching room leans in to see him take you over the counter.",
    ],
    pose_: [
      "{Name} grips your waist and pounds your pussy hard against the bar.",
      "{Name} reaches under and rubs your clit while he keeps thrusting.",
      "{Name} slaps your ass and fucks deeper so the counter creaks.",
      "{Name} holds you bent and pumps steady while the room cheers.",
    ],
  },
  bentOverAnal: {
    id: "bentOverAnal",
    label: "her rear, bent over the bar",
    area: "butt",
    ready: ANAL,
    joins: ["mouth"],
    boldness: 4,
    pose: "bentover",
    kp: "(none: Tarven's own)",
    offer: [
      "{Name} bends you over the bar, spits on your ass, and shoves his cock into your hole.",
      "{Name} spreads your cheeks and starts fucking your ass over the counter.",
      "{Name} holds your hips and thrusts deep while the room watches.",
      "{Name} keeps you bent and pounds your ass so the tankards jump.",
    ],
    taken: [
      "His cock pushes into your ass as he bends you over the bar.",
      "Your hands grip the counter while he works in deeper.",
      "The watching room howls as he takes your hole from behind.",
    ],
    pose_: [
      "{Name} grips your waist and pounds your ass hard against the bar.",
      "{Name} spits again and keeps thrusting deeper into your hole.",
      "{Name} slaps your ass and fucks steady so the whole counter shakes.",
      "{Name} holds you open and pumps while the room watches your rear.",
    ],
  },
  againstWall: {
    id: "againstWall",
    label: "her, against the wall",
    area: "pussy",
    ready: PUSSY,
    joins: [],
    boldness: 4,
    pose: "bentover",
    kp: "(none: Tarven's own)",
    offer: [
      "{Name} presses you face-first to the wall and shoves his cock into your pussy from behind.",
      "{Name} holds your hips and starts thrusting while your tits scrape the wood.",
      "{Name} pins you to the wall and fucks you standing.",
      "{Name} tells the room to watch as he takes you against the boards.",
    ],
    taken: [
      "His cock fills your pussy as he presses you to the wall.",
      "Your face stays against the wood while he thrusts from behind.",
      "The watching room cheers as he pounds you standing.",
    ],
    pose_: [
      "{Name} grips your hips and fucks your pussy hard against the wall.",
      "{Name} reaches around and rubs your clit while he keeps thrusting.",
      "{Name} groans and pounds deeper so your body slaps the boards.",
      "{Name} holds you pinned and pumps steady while the benches watch.",
    ],
  },
  proneBone: {
    id: "proneBone",
    label: "her, flat on her belly",
    area: "pussy",
    ready: PUSSY,
    joins: ["mouth"],
    boldness: 4,
    pose: "prone",
    kp: "(none: Tarven's own)",
    offer: [
      "{Name} pushes you flat on your belly in the sawdust and climbs on top.",
      "{Name} shoves his cock into your pussy from behind and lies full on you.",
      "{Name} holds your wrists and starts thrusting while you're pinned.",
      "{Name} keeps you flat and fucks you so the room sees your ass.",
    ],
    taken: [
      "His cock fills your pussy as he lies on top of you on the floor.",
      "Your face stays in the sawdust while he thrusts from behind.",
      "The watching room leans close to watch him take you prone.",
    ],
    pose_: [
      "{Name} grips your hips and pounds your pussy while lying on you.",
      "{Name} keeps your wrists pinned and thrusts deeper into you.",
      "{Name} groans and fucks steady so your body scrapes the floor.",
      "{Name} stays full on top and pumps hard while the room cheers.",
    ],
  },
  lapRide: {
    id: "lapRide",
    label: "her, on his lap",
    area: "pussy",
    ready: PUSSY,
    joins: ["left", "right"],
    boldness: 4,
    pose: "cowgirl",
    kp: "(none: Tarven's own)",
    offer: [
      "{Name} sits on the bench, pulls you onto his lap facing him, and guides your pussy down on his cock.",
      "{Name} grabs your hips and tells you to ride while the room watches.",
      "{Name} thrusts up into you and holds you steady on his shaft.",
      "{Name} spreads your legs so everyone can see you bounce on him.",
    ],
    taken: [
      "You sink onto his cock while he sits and holds your hips.",
      "Your tits press his chest as you start riding him on the bench.",
      "The watching room cheers while you move on his lap.",
    ],
    pose_: [
      "{Name} grips your ass and thrusts up hard while you ride facing him.",
      "{Name} holds your waist and pulls you down harder onto his cock.",
      "{Name} groans and keeps bucking so the bench creaks.",
      "{Name} spreads your thighs and fucks you from below while the room watches.",
    ],
  },
};

export const FOE_SCENE_LIST: readonly FoeSceneDef[] = Object.values(FOE_SCENES);

/**
 * KP's scenes each kind starts (its KP counterpart's `<AI PoseStart Skills>`), on top of the part his type goes for.
 * The bandit is KP's thug (and slime), the soldier the guard, the fugitive the prisoner, the farmer the goblin and
 * orc, the smuggler the rogue and the homeless man, the noble the nerd, the adventurer the werewolf, lizardman and yeti.
 */
export const KIND_SCENES: Readonly<Record<GuestKind, readonly FoeSceneId[]>> = {
  bandit: ["gangbang", "piledriver", "throat", "bentOverBar"],
  soldier: ["hands", "mouth", "breasts", "rimjob", "soldierGangbang", "throat", "tableLaid", "againstWall"],
  fugitive: ["hands", "mouth", "againstWall", "proneBone"],
  farmer: ["licked", "standPaizuri", "missionary", "lapRide"],
  smuggler: ["rimjob", "reverse", "tableLaid", "bentOverBar"],
  noble: ["footjob", "missionary", "bentOverAnal", "lapRide"],
  adventurer: ["backPussy", "backAnal", "cowgirl", "carry", "proneBone"],
};

/** Who catches her kick (KP: thugs and yetis), and the base chance they do. */
export const KICK_COUNTER_KINDS: ReadonlySet<GuestKind> = new Set(["bandit", "adventurer"]);
export const KICK_COUNTER = { base: 0.3, horny: 0.4, angry: -1, herHorny: 0.3, bare: 0.2 } as const;

/** Her state, as the scene rules read it. */
export interface HerReadiness {
  desire: Readonly<Meters>;
  wet: boolean;
  exposure: number;
  /** Times she's done each act before (records), for the fugitive's first-time rule. */
  experience?: Partial<Record<DuelArea, number>>;
  /** How much less each desire a scene needs of her (trinkets.ts, KP's accessories). */
  ease?: Partial<Record<keyof Meters, number>>;
  /** Settings switches: scenes switched off. */
  rimjob?: boolean;
  footjob?: boolean;
}

/** Whether she's ready for a scene: her desires, wet, her clothes, and its Settings switch. */
export function sceneReady(id: FoeSceneId, her: HerReadiness): boolean {
  const def = FOE_SCENES[id];
  if (def.toggle && her[def.toggle] === false) return false;
  for (const [meter, n] of Object.entries(def.ready.need) as [keyof Meters, number][]) if (her.desire[meter] < n - (her.ease?.[meter] ?? 0)) return false;
  if (def.ready.wet && !her.wet) return false;
  return her.exposure >= (def.ready.exposure ?? 0);
}

/** KP's prisoners: a fugitive won't go for her mouth, pussy or rear until she's done it before. */
const FIRST_TIME_AREAS: ReadonlySet<DuelArea> = new Set(["mouth", "pussy", "butt"]);
export function firstTimeHolds(kind: GuestKind, area: DuelArea, her: HerReadiness): boolean {
  return kind === "fugitive" && FIRST_TIME_AREAS.has(area) && (her.experience?.[area] ?? 0) <= 0;
}

/** Whether he'd start (or join at) this scene with her: she's ready, and the first-time rule doesn't hold him back. */
export function canStart(kind: GuestKind, id: FoeSceneId, her: HerReadiness): boolean {
  return sceneReady(id, her) && !firstTimeHolds(kind, FOE_SCENES[id].area, her);
}

/**
 * The scenes he'd start on his turn: his kind's KP scenes, and the part his type goes for, she's ready for (never a
 * kick counter, that's only ever a counter).
 */
export function startable(kind: GuestKind, prefers: DuelArea | undefined, her: HerReadiness): FoeSceneId[] {
  const ids = new Set<FoeSceneId>(KIND_SCENES[kind]);
  if (prefers) ids.add(prefers);
  return [...ids].filter((id) => !FOE_SCENES[id].counterOnly && canStart(kind, id, her));
}

/**
 * The scene he starts (KP tryStartSexPose: a few tries at his scenes, at random): `roll` 0 to 1 picks among those
 * she's ready for; if none, the boldest part of her she's ready for (Tarven's own, as before); null if nothing.
 */
const BOLDEST_PARTS: readonly FoeSceneId[] = ["pussy", "butt", "mouth", "breasts", "hands"];
export function pickFoeScene(kind: GuestKind, prefers: DuelArea | undefined, her: HerReadiness, roll: number): FoeSceneId | null {
  const mine = startable(kind, prefers, her);
  if (mine.length > 0) return mine[Math.floor(roll * mine.length) % mine.length];
  return BOLDEST_PARTS.find((id) => canStart(kind, id, her)) ?? null;
}

/** A bolder scene of his he could move hers on to (KP tryUpgradeSexPose), or null. `roll` picks among them. */
export function upgradeScene(kind: GuestKind, prefers: DuelArea | undefined, from: FoeSceneId, her: HerReadiness, roll: number): FoeSceneId | null {
  const bolder = startable(kind, prefers, her).filter((id) => FOE_SCENES[id].boldness > FOE_SCENES[from].boldness);
  // KP's goblin moves from his mouth on her to having her.
  if (from === "licked" && canStart(kind, "pussy", her)) bolder.push("pussy");
  if (bolder.length === 0) return null;
  return bolder[Math.floor(roll * bolder.length) % bolder.length];
}

/** The chance he catches her kick (KP counterCondition_kickCounter), 0 if he can't. */
export function kickCounterChance(
  kind: GuestKind,
  foe: { erect: boolean; horny: boolean; angry: boolean },
  her: HerReadiness & { horny: boolean },
): number {
  if (!KICK_COUNTER_KINDS.has(kind) || !foe.erect || !canStart(kind, "kickCounter", her)) return 0;
  const k = KICK_COUNTER;
  const chance = k.base + (foe.horny ? k.horny : 0) + (foe.angry ? k.angry : 0) + (her.horny ? k.herHorny : 0) + (her.exposure >= 0.7 ? k.bare : 0);
  return Math.max(0, Math.min(0.9, chance));
}

/** The free slots others can join her at in a scene, by what the scene leaves free and what she's ready for. */
export function joinSlots(id: FoeSceneId, kind: GuestKind, her: HerReadiness): JoinSlot[] {
  return FOE_SCENES[id].joins.filter((slot) => canStart(kind, slot === "mouth" ? "mouth" : "hands", her));
}

/**
 * The pose a scene takes in the big picture: KP's scenes their own (Tarven's nearest for now), or undefined for the
 * part's own, his type's way (brawlscene.ts takenScene).
 */
export function scenePose(id: FoeSceneId | undefined): ScenePoseName | undefined {
  return id ? FOE_SCENES[id].pose : undefined;
}
