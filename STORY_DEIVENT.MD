You are working on the adult visual novel / tavern sim "Last Call at Tarven" (repo: Sela-kren/Tarven, branch: dev).

## Goal
Strengthen the slow "innocent / sheltered → gradual build-up → more open/debauched" personal arc for the heroine, in a Karryn's Prison-inspired style. The mechanical systems already support this (desire meters, Lewdness, Corruption, passives, records, touch system, consent toggle). The story and writing currently underuse them.

## Hard Constraints (do not break)
- All characters are 18+.
- Consent toggle already exists:
  - Consent On: normal service touches always ask first; Slap/Pull always work; drunk blocks yes.
  - Consent Off: high-Nerve/Horny guests may land touches without the choice screen; more pressure possible. Pull/Slap still available on next reach.
- Sexual scenes stay non-graphic (18+ cards).
- Do not remove or weaken existing consent rules in code. Only improve story/writing around them.
- Keep the existing political/mystery spine (red book, Baron, Wren, debt, fans/popularity).

## Key Files to Read and Update
- STORY.md (main story design — highest priority)
- GAME_CONCEPT.md
- GAME_PATH.MD
- PASSIVES_DESIGN.md
- Relevant code comments or dialogue files if you touch them (touchtalk.ts, story-related files)

## What to Do

1. **Define clear progression stages** (add a new section to STORY.md)
   - Sheltered (low Lewdness, almost no allows)
   - Curious (first kisses / chest / thigh, mid Lewdness)
   - Willing (several upstairs or high meters)
   - Known (high Lewdness + multiple guest kinds)
   - For each stage: approximate Lewdness/firsts triggers, how her inner thoughts change, how guests treat her, and how it affects story beats.

2. **Connect the personal arc to the existing plot**
   - Use Wren’s past (Red Lantern madam) as a personal mirror.
   - Make high Lewdness / Corruption change how named characters, village talk, rivals, and the Baron react.
   - Ensure at least one major plot choice feels different depending on her stage + Corruption.

3. **Make named guests carry the build-up**
   - Pick 2–3 recurring characters (suggest from the existing cast: Silas, a soldier type, etc.).
   - Outline how their dialogue and boldness remember previous allows with them.
   - Add example memory lines for early vs later stages.

4. **Surface the systems in writing**
   - Expand guidance for “first time” thoughts and passive unlock thoughts so they feel like real moments.
   - Note how morning reports, journal, and table talk should reflect the current stage.
   - Support both Consent On (deliberate, player-driven) and Consent Off (more pressure, Karryn-like) in the text examples.

5. **Practical deliverables**
   - Update STORY.md with the new stages section, connections to the plot, and concrete writing guidelines.
   - Add short example inner thoughts for the same touch at different stages (Consent On vs Off).
   - Suggest 3–5 specific early-night or Act 1 beats that should be rewritten to show more initial resistance.
   - Keep changes focused and implementable. Do not rewrite the entire story from scratch.

## Output Style
- Be concrete and actionable.
- Use clear sections and tables where helpful.
- Reference existing systems (desire meters, Lewdness, passives, records, consent toggle) instead of inventing new core mechanics.
- End with a short prioritized list of next coding or writing tasks.

Start by reading the four markdown files listed above, then implement the improvements directly in STORY.md (and other docs only if needed).