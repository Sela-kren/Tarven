/**
 * Force / resist-fail text additions for touchtalk.ts
 *
 * 
 * Add these two optional fields to the TouchDef interface:
 *
 *   force?: string;
 *   resistFail?: string;
 *
 * Then add the strings below to the matching TouchDef entries
 * (by id). Start with the higher-level touches; the low ones
 * can stay consent-only if you want.
 */

// === Example force texts (add to the matching objects in the TOUCHES array) ===

export const FORCE_TEXTS: Record<string, { force: string; resistFail?: string }> = {
  // Level 3 – waist
  waist: {
    force: "You try to step out of the hand. It stays on your waist, fingers curling, until the tray is set down. Your face is hot.",
    resistFail: "You twist. The hand follows for a moment, then drops. The table is already looking.",
  },

  // Level 4 – rear
  smack: {
    force: "SMACK. You yelp and spin, but the hand is already gone. The whole table is roaring. Your cheeks burn.",
    resistFail: "You turn too late. The smack lands. \"You brute!\" The table howls with laughter.",
  },

  // Level 4 – clothes (strip)
  tugTie: {
    force: "You grab for the {piece}. Their fingers are faster. It comes free in their hand. The table whistles.",
    resistFail: "You clutch the {piece}. They tug once, hard. It loosens. You yank it back, face burning.",
  },

  // Level 5 – lap
  lap: {
    force: "You try to stand. The arm around your middle holds. You end up on their knee with the whole table watching. Your heart is hammering.",
    resistFail: "You push at their arm. They let you up after a second, grinning. Your legs feel unsteady.",
  },

  // Level 5 – thigh
  thigh: {
    force: "You shift to move the hand. It slides higher for a moment before you can get free. The cups rattle in your hands.",
    resistFail: "You step back. The hand follows, then drops. Your thigh is still warm through the cloth.",
  },

  // Level 5 – cheek kiss
  cheekKiss: {
    force: "You turn your head. Their lips still find your cheek. The table cheers. Your skin tingles where they kissed you.",
    resistFail: "You pull away a fraction too late. The kiss lands. Your hand goes to your cheek without thinking.",
  },

  // Higher level examples (add more as needed)
  // chest, intimate, etc. — fill these in the same style when you reach them
};

// === Usage note ===
//
// In the UI / comic code, when the answer is "force":
//   - Use touch.force ?? touch.allow as the narration text
//   - Apply the "force" outcome from touchOutcome()
//   - Optionally skip showing a button and auto-resolve
//
// When you want a "tried to resist but failed" flavor even on slap/pull:
//   - Check a small random chance or low desire and use resistFail text instead of the normal slap/pull line
//
// Keep the original allow / lean / slap / pull texts. The new ones are only used on the force path.