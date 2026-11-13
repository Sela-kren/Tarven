/**
 * What happens when she gives in: the "Give in" answer, offered only once her desire runs well past what a touch
 * needs, and only ever picked by the player. Every other answer is still there beside it, Pull away included.
 *
 * Each line is her own choice: she could stop it, and she decides not to. Never write one where she tries to get
 * away and is held, or where a touch lands after she has said no (GAME_CONCEPT.md, 7.1; GAME_PATH.MD, consent rule).
 *
 * Keyed by touch id (touchtalk.ts), with several lines per touch: one is picked at random each time, so giving in
 * doesn't read the same twice. A touch with no lines here uses its "allow" text. `{piece}` is the garment.
 */
export const GIVE_IN_TEXTS: Record<string, readonly string[]> = {
  // Level 3: waist.
  waist: [
    "You start to step out of reach, then stop. You let the hand settle on your waist, and leave it there. Your face is hot.",
    "You could slide away with the tray. You don't. You let the hand rest on your waist and stand there a moment longer than you need to.",
    "Their hand finds your waist and you decide, right then, to let it stay. You set the cups down slowly.",
    "You feel the hand settle and think about moving. Instead you lean your hip into it, just slightly. Nobody misses it.",
  ],

  // Level 4: rear.
  smack: [
    "You see it coming and could step aside. You don't. SMACK. You yelp, the table roars, and you're grinning.",
    "You catch the look in their eye and turn your back on purpose. SMACK. You gasp, then laugh along with the whole table.",
    "You know exactly what's coming, and you let it. SMACK. Your cheeks burn, and not only the ones on your face.",
    "You could swat the hand away before it lands. You hold still instead. SMACK. \"Was that worth it?\" you ask. Their grin says yes.",
  ],

  // Level 4: clothes.
  tugTie: [
    "You reach to hold the {piece}, then let your hand drop. You let them pull it free. The table whistles.",
    "Your fingers go to the {piece} out of habit, and stop there. You let them work it loose. Someone at the next table cheers.",
    "You could knot it tighter. You loosen it for them instead, and let them take the {piece}. The room goes loud.",
    "You meet their eyes and give the smallest nod. The {piece} comes away in their hand, and the whole table bangs their cups.",
  ],

  // Level 5: lap.
  lap: [
    "You could stand. Instead you let yourself be drawn down onto their knee, the whole table watching. Your heart is hammering.",
    "You feel the arm come round and choose to sit. Their knee, their warmth, the table's whistles. You stay.",
    "You set the tray down first, so you can't pretend it was an accident, and settle onto their lap.",
    "You let them pull you down, and when you could get up again, you don't. The room can look all it likes.",
  ],

  // Level 5: thigh.
  thigh: [
    "You go to move the hand, and don't. You let it slide higher. The cups rattle in your hands.",
    "The hand rests on your thigh and you let it, then let it climb a little. You keep your face very still.",
    "You could step back. You shift your weight toward them instead, and the hand slides up with it.",
    "You look down at the hand on your thigh and then at them, and let it stay. Your breath has gone short.",
  ],

  // Level 5: kiss on the cheek.
  cheekKiss: [
    "You could turn away. You turn toward them instead, and let the kiss land. Your skin tingles where it did.",
    "You see them lean in and tip your cheek toward them. The kiss lands soft, and the table hoots.",
    "You let them kiss your cheek, and then you let them do it again. Someone shouts for a third.",
    "You hold still for it on purpose. The kiss lands warm, and you're the one who lingers.",
  ],
};

/**
 * An impulsive guest who doesn't wait to ask, shown before the touch's own "allow" line. Only ever used once the
 * player has said yes to impulsive guests (touchsettings.ts), so each line is the guest acting on impulse and her
 * letting it be: never her trying to stop it.
 */
export const IMPULSE_LINES: readonly string[] = [
  "They don't wait to ask. The hand's there before you've set the cup down, and you let it be.",
  "Too eager to bother asking. You feel it coming, and you don't move away.",
  "They act before they think, the way some do after a few. You let them.",
  "No asking, no warning, just an eager hand. You'd said you didn't mind, and tonight you don't.",
];
