# Female model rework — hero-shooter style, human-ready

The goal: an original heroine built in the style of stylized hero shooters (clean sculpted forms, heroic proportions,
painted textures), detailed enough for the adult scenes up close. We study the genre's proportions and shapes; we
never copy a character's body, face or outfit.

Everything stays in the code-built pipeline (`tools/blender/build_world.py`), because the 16 outfits, cum layers,
jewellery, nipples, vulva and anus are all generated from the body's rings. Rebuild the body that way and they
keep fitting.

**Each phase is done the same way:** before/after renders (solid + wireframe) → you approve → check in game
(poses, outfits, the adult systems, paired scenes) → tests pass → next phase.

## New direction (2026-11-16): a new heroine built from scratch, "very like the refs"
The reference heroines were measured in 3D (`MODEL_STUDY.md`). Scaling the ring-built body to their numbers
(`study_fit`) gets her proportions within about 1–3%, but she stays a smooth tube. MPFB was considered and dropped
(you want her made from scratch, not from a stock base). She is now sculpted in code as a signed distance field:
`tools/blender/real_heroin/heroine/sdf.py` (pure numpy: the median ref skeleton, a lofted trunk with her S-curve, anatomical
parts — breasts, glutes, pecs, clavicles, scapulae, thigh and calf muscles, kneecaps, ankle bones, deltoid, biceps,
forearm, a hand with jointed fingers, feet with toes, a skull with a modelled face) blended smoothly, and
`tools/blender/real_heroin/build_heroine.py` (meshes the field with OpenVDB in ~20 s at 2.5 mm, ~70 s at 1.2 mm).
Every pass is checked against the refs' own 3D models: side-by-side clay renders and silhouette overlays
(ref only magenta, hers cyan, both white), front and side, whole body and head only. No ref mesh is used.
1. [~] Body form: front silhouette matches the barefoot ref (IW azure) closely; side posture between the refs;
       muscle detail is a first pass (needs abs, ribcage, iliac line, knee and elbow detail)
   - Torso pass (2026-11-17), compared torso-only (arms, legs, head cut off every model by the same nearest-bone
     rule) and measured relative to each model's own spine line (hip centre to neck base), against 6 refs:
     front depth RMS 15.2 → 7.1 mm, back 16.4 → 7.1 mm. Ribcage and belly brought ~2 cm forward, a broad flat back
     (own back squareness in `TRUNK_KEYS`), spine groove along the lumbar curve, lower-back muscles, the glute
     cleft, glutes raised and set in, round breasts with a crisp fold, upper abs, crotch raised 0.87 → 0.91 m (refs
     0.91–0.94), hips 1.7 cm narrower at the top. Cage densified to the refs' ~12 mm (`COL_N`, `BAND_N`);
     `build_body.py` now also writes `Body_game` (triangles; navel, abs line and sternum snapped on as detail).
     Second round (2026-11-17): Black Widow and Rogue dropped from the comparisons (their "skin" is a suit); the
     abs line and sternum detail strips removed, the navel is now a ringed patch like the refs' (12 spokes); bust
     set to an F cup by default (`BUST_SCALE` 1.21, ~950 ml each, refs ~520 ml) and left out of the bust score.
     Legs compared legs-only, radially round each leg's own bone line: RMS 11.8 → 5.2 mm (calf lower and longer,
     shin set behind the bone line, kneecap blended, tibialis, thigh mass to the front and inside); the knee and
     ankle moved back to the refs' leg line (shin slants back, ankle 55 mm behind the knee); foot moved 22 mm
     forward and the cage's foot run out to the toes (242 mm long, heel matched; refs 254 mm). Still open on the
     legs: the foot is a mitten (no separate toes in the cage).
     Third round (2026-11-17, your picks): legs matched to Luna from behind (RMS vs Luna 10.0 → 5.0 mm: slimmer
     inner and front, the calf's mass to the back-outer); the lower torso toward Luna's (shorter glute cleft
     starting below a flat sacrum, compact rounder glutes set higher with a crisper fold). The bust measured
     across the refs grows forward and up, not down (Luna → IW → Emma → Rogue: apex stays at 1.30–1.32, the fold
     at 1.23–1.25, the upper slope lengthens, width grows less than projection); the F cup now grows that way
     (`BUST_SCALE` 1.24, ~945 ml): apex 1.320, fold 1.232.
     Fourth round (2026-11-17, three loops in parallel, merged): crotch/glutes/thighs vs IW, Psylocke, Luna on the
     uncut mesh (the crotch spans the leg join; its cage was clean, the faults were in the field): mons tucked
     (+6..+16 → −3..+4 mm), thigh fronts fuller (−7..−11 → −1..−5), the glute-top shelf and hip dip gone, glutes
     upright and lower, one soft fold carve (deep inside, fading out) instead of two that pinched, a hip line
     waist → thigh, groin crease, hip width at the join +13 → +2. Stomach vs IW, Luna, Psy (Emma has no belly
     skin): front squarer-to-rounder trunk keys z 1.08–1.16, hip front moved back with an ASIS point, a lower-belly
     pad, V lines, softer rib edge. Bust shape (size kept, 937 ml): was a dome with a shelf above it, set high,
     close and pointing ahead; now apex 1.304, inner gap 22 mm, turned ~17° out, the upper pole a straight slope
     into the chest (within −2..+8 mm of Rogue, the nearest-sized ref). Torso back RMS 10.1 → 5.5 mm.
     Navel (2026-11-17): the game mesh's patch snapped its rings along the field gradient, which slid both up
     the pit's wall onto its lip round a spike (it read as a raised plug). The rings now drop straight onto the pit
     along the belly normal, on ovals, and faces with a corner over the pit are cut away. The pit is a tall slit
     ~9.5 mm deep like the refs' (they rise steeply sideways, slowly up and down): profile RMS vs the IW/Luna/Psy
     median 1.93 → 1.22 mm.
     Fifth round (2026-11-17, five loops in parallel, merged):
     - Bust: was 70 mm wide, ran past the chest side, with a deep cleavage slot and an 8 mm blend. Now a teardrop
       (`BUST` dict), with inner fill, cleavage floor, a tail into the armpit and a soft fold. The nipple is a ~2 mm
       bump (`nip_d`). 936 ml; inner gap 22 → 14 mm.
     - Knee: the kneecap sat 2.6 cm under the joint, with a tendon blob below making a knob and a V crease. Now
       at the joint line, flatter, with a tibial condyle, the calf top behind and a hollow beside it. Knee shape
       vs Luna 4.7 → 3.9.
     - Back to arm: the "lat" ellipsoid made a lump at the back of the armpit, and the scapula tipped outward
       into a plate. Lat removed; scapula thinner and laid in; the spine groove runs to the neck. Back outline vs
       IW/Luna 8.8 → 4.4.
     - Foot: `foot_loft` (FOOT_KEYS) plus five separate toe chains (TOES), with toe tubes in the cage (8/6/6/6/6
       sides), an arch, an ankle tendon ramp and ankle bones like IW's. Silhouette mismatch 18 → 10 %.
     - Glutes: a curved crease (`chain_s` slit plus ramp), a deeper cleft top and inner-thigh fills.
       - Merge fix: the inner-thigh fills moved up (t 0.40/0.42 → 0.30/0.32) and shortened, as they had added
         +10 mm mid-thigh.
       - The mesh still halves narrow creases (cage fit): this is the next pass.
     - Merged: cage folded quads 42 → 12; fp front/back/width 6.6/5.5/16.8; lfp vs Luna 5.4.
     - Front torso (merged after):
       - Upper-abs panels raised so the waist pinches under the ribcage.
       - Lower-belly pad lengthened, which fills a dip at navel height.
       - A linea alba groove (`line_shape`).
       - The V-line groove removed: the refs show one line, the groin crease.
       - The hip-bone point became a crest running up and back.
       - A ribcage front-side corner.
       - Rib-to-waist step at 50°: 20.0 → 21.1 mm (IW 22.2). fp 6.1/5.3/16.3, folded quads 14.
     - Glutes, second pass:
       - The game mesh (cage spacing, ~13.5 mm) halved anything narrower. Inside `body_mesh.FINE_BACK` (cleft,
         sacrum, fold) build_body now keeps subdivision level 1, snapped onto the field (`fine_snap`).
       - It also sets custom normals there from the field's gradient (`FIELD_NORMALS`, on by default), as the refs
         carry their sculpts' normals.
       - Merged with the other session's hand change: the hands keep their extra level too.
       - Cleft: mesh − field 5.2 → 0.9 mm; now a closed V like the refs', no longer a 15 mm channel.
       - Sacrum: a flat inverted-triangle plate (`sacrum()`); the spine groove starts at z 1.095.
       - fp 6.1/4.9/10.8.
       - Game mesh: 13,712 verts (hands + fine zone).
       - Open: a dent at the inner bottom of each glute (fold/ramp/gap carves overlap); the round lower curve.
     Arms (2026-11-17), compared arms-only (nearest-bone cut: upper arm, forearm, hand vs spine, shoulder line,
     hips, legs), radius at 8 angles round each arm's own bone line, 18 stations, against the 6 refs whose arm
     covering is skin-tight (Emma, IW azure, IW MCU, Luna, Phoenix, Psylocke; no ref has a fully bare arm, so the
     innermost surface of the tight sleeve/glove is measured; Black Widow and Rogue left out, bulky). RMS
     7.4 → 1.1 mm. The arm is now a `limb` loft (`UPPER_ARM`, `FOREARM` in sdf.py: 8 radii per station): the
     refs' bone runs near the arm's outer back, the mass sits front and inside, the wrist is flat (wide front to
     back). Hand rebuilt to the refs' bones: palm 88 mm (refs 87), knuckle span 63 (66), fingers +20 mm longer,
     slimmer tips, palm 78 mm wide (79). Fixed a bug: the palm and its pads were ellipsoids on the WORLD axes (a
     flat disc at the wrist), now in the hand's frame. The hand layout (`HAND_BASE`, `FINGERS`, `KNUCKLE_B`,
     `finger_chains`) now lives in sdf.py only and the mesh builder reads it. Mesh: arm rings ~11 mm apart (were
     16), fingertips close round (a small ring out on the tip's cap).
     Shoulder (second arm round): the cut-arm compare starts 20% down the upper arm, so the shoulder was measured
     separately on the uncut models (ray fans from the shoulder joint, first skin hit, front and side planes):
     ours was 10–15 mm too big all round (a round ball, the arm coming out of it thin). Shoulder cap sphere
     40 → 33 mm, the arm's top section and its blends trimmed, the trapezius lowered and shortened: fans now
     within ±5 mm (the armpit underside +10). The torso check improved with it (front RMS 8.2 → 6.3 mm, width
     17.6 → 15.3). Silhouette overlays against Invisible Woman (same skeleton as ours) line up front, side, back.
     Still open on the arms: the cage's knuckle webs are flat (a step between the fingers on the back of the hand),
     fingers are 4-sided tubes in the cage; both for the topology phase.
     Still open: upper back and shoulder edges 16–18 mm (that band also sets the arm hole, fixed at the wrist's
     16 slots); the nipple nub is now inside the breast (the adult systems' nipple discs must be re-aimed).
2. [~] Head and face: skull size and profile now fit the refs' heads; the face is a first pass and does not yet
       read like the refs (eyes, lips, cheeks, nose need more work)
3. [ ] Topology: retopologise the dense field mesh to an even quad mesh (skin edges 6–10 mm, face denser, ~40–60k
       quads), separate eyeballs, teeth and tongue
4. [ ] UVs and textures: 2K painted colour + shadow-colour (S) maps, normal, toon ramp shading, outline width
       from vertex colour G
5. [ ] Rig: UE-style skeleton on her joints (from the study), weights, and mapping to the bones the game drives
       (Hips, Torso, Head, arms, hands, legs, Bust, Belly, Glutes, hair and skirt helpers); face bones
6. [ ] Into the game: the build script takes her as its `Skin`; outfits refitted as thick shells with the skin
       hidden under them; adult parts, cum layers, jewellery, feet and shoes re-aimed; sliders and poses re-tuned
7. [ ] Hair as cards with strand masks, brows and lashes

## Done
- [x] Proportions: legs +7%, hips wider at the trochanters, waist higher and tighter, glutes fuller and higher,
      squarer shoulders (`heroic_reshape`, `HEROIC`)
- [x] Height check (2026-11-16), measured chin to crown on the built model: the old model was 8.1 heads, the
      first rework 8.9 (its head shrunk 6% — too small, long thin neck, shoulders 1.6 heads across). Now 8.1 heads
      at 1.64 m (head +4% and set 12 mm lower on the neck, the neck 8% fuller, shoulders broadened to about hip
      width, arms 3 cm further out). The head lines fall on the classic landmarks: nipples at 2, navel at 3,
      crotch at 4 (just under half height), feet at 8. The duplicate `ankle` key in `HEROIC` split into `ankle`
      (where the leg stretch starts, 0.14 as it effectively was) and `ankle_full`.
- [x] Shoulders (2026-11-16): the trapezius slopes down from the neck to the shoulder (`trap_*` in `HEROIC`),
      the deltoid's cap is rounded over the square corner seen from the front (`cap_*`), and the shoulder top is
      rounded into the upper back and the upper chest seen from the side, following the shoulder line down from the
      neck (`shoulder_top`, `edge_*`). The neck's flare band is cut into finer faces before it is fitted to the
      shoulders (`NECK_FLARE["cuts"]`), so its bottom follows their curve: the ragged seam across the back is gone.
      Tried and dropped: smoothing the shoulder skin by averaging (it shrank the deltoids and opened the neck
      flare at the front), and tucking the shoulder skin under the flare (it opened a slit at the back).
      Still open: a small notch in the neck seam on her left back, the step at the back of each armpit, and the
      neck still reads as a column from the side (a fuller trapezius into the neck belongs with the head pass).
- [x] Chest and ribcage side clean-up (2026-11-16), each found by render, fixed, re-rendered:
      - sawtooth along the fold under the bust: the dome's edge turns in so steeply that neighbouring corners got
        all or nothing; its moves are now averaged over the skin a few times (`BREAST_SMOOTH`) and the clothes take
        the skin's move nearest them
      - lumps on the outer side of the bust: the serratus fingers were aimed onto the bust itself; moved below and
        behind its outer edge
      - crease across the side of the chest: the refined (and rounded) bust region stopped where the arm held a
        fifth of the skin, beside flat whole faces; it now runs up into the armpit (`REFINE_ARM_SHARE` 0.5)
      - refined regions' border edges keep their middle corners on the straight edge (`refine_soft_parts`)
      - flat raised patch under the cleavage: the rib-arch bump and the arch ridge's tip stood on two big faces;
        the bump dropped, the ridge starts just off the middle, the under-bust fill made broader and lower
      - clothes poking through (the bunny corset, the rogue top's edge): a last pass pushes any cloth corner inside
        or within 3 mm of the finished skin back out along its normal (`keep_clothes_clear`, `CLEAR`)
      Tried and dropped: splitting the waist finer for the muscle (its border showed as a band of hard edges and the
      skin then stood through the coarser clothes; split for the clothes too, the file doubled to 38 MB); a looser
      facing cut-off on the bust (lumpier sides); splitting the bust region flat (faceted, noisy under the fold).
      - the step from the bust's fine faces straight to the belly's broad ones (one row of long fans): a band under
        the bust split once more in `REFINE_REGIONS`, skin and clothes alike, so the faces grow in two steps; kept
        above the navel's own splitting, which overlapping it left slivers
      - the clothes' clearance runs right after the sculpt (before the stains are laid on them) and again after the
        reshape, the stains on the clothes moved with them
- [x] Ribcage against measured women (2026-11-16): ANSUR II (US Army 2012 survey, 1,986 women) gives, as shares of
      stature, axilla 0.761, bust 0.720, tenth rib 0.649, navel 0.602; waist girth 0.53 (slim women ~0.38-0.40),
      chest breadth 0.165, hip breadth 0.217. Built (and in the original model) her waist was 46 cm round (0.28 of
      her height, a doll's), narrowest at the tenth rib, and her trunk 12 cm deep under the bust (a slim woman's
      ribcage is ~20). Now `ribcage_w` (a width table reaching down to the tenth rib) and `trunk_depth` (front and
      back moved out, what lies on them riding along): waist 57 cm (0.35) narrowest just above the navel,
      underbust ~60 cm, ribcage 15-16 cm deep, chest breadth 0.145 of stature. Hip breadth unchanged (0.212).
      Game check: hands placed on her waist in paired scenes may now sit ~2 cm inside her.
- [x] Torso rounded seen from above (2026-11-16): sliced, the trunk was a box from waist to shoulders (flat back,
      square corners, straight sides, a flat front under the bust and on the upper chest). `trunk_sections`
      measures her skin's reach in 36 directions at every centimetre of height (smoothed), and `round_section`
      moves each point along its direction 70% of the way to an oval of her own width and depth: all round below the
      bust and on the upper chest, behind only beside the bust, fading out before the neck's flare. Tried and
      dropped: a formula for the box's shape (overshot into lumps); measuring from inside out to reach the
      arm-joined skin (hit hidden inner surfaces, dented the back).
      Still open: the side just under the armpit stays flatter (that skin rides partly on the arm, so it gets only
      part of the rounding).
      Still open: faint facets on the upper belly and a small knot in the profile under the fold: the belly's faces
      are 2-3 cm across, too coarse for the muscle sculpted on them. The real fix is a re-mesh of the trunk with
      even, finer faces (skin and clothes together), best done alongside the head rebuild.
- [x] Notched lines on the side of the ribcage and waist (2026-11-16, seen in the T-pose review): where a refined
      region met whole faces, those faces kept the new corner on their shared edge as a five-sided face, which the
      export fanned into a sliver triangle 1.8 mm thin (the surface folded 70-87 degrees across it), and its normal
      threw the shading out in a notch. `refine_soft_parts` and the neck flare's split now tessellate a face with
      one split edge (`use_single_edge`) and cut anything left over four sides into well-shaped triangles.
      Also tried, no help (kept, harmless): the muscle push along normals smoothed over neighbours
      (`smoothed_normals`). Review renders now leave out the lingerie and pubic overlays (shown only when worn).
      Still open: the shoulders and armpit crumple when the arm is raised (skin weights), see the T-pose renders.
- [x] Shoulders bending (2026-11-16, T-pose review): the arm's share of the weight round the shoulder came in flat
      steps, one per ring of the coarse body (0.25, 0.37, 0.5, 0.68, 0.85), and a raised arm folded the skin in a
      flat band at each. `ease_shoulder_weights` averages it over neighbouring corners (skin and every outfit), the
      arm itself (past a quarter of the way to the elbow) keeping its own; `SHOULDER_REFINE` splits the shoulders
      and armpits once more, flat, so they have corners enough to bend round. File 20.9 MB.
      Still open: the deepest part of the armpit still crumples a little at a full 90-degree raise (plain linear
      skinning squeezes it; the fix is a corrective shape or helper bone there, part of the rig pass).
- [x] Reference study (2026-11-16, `MODEL_STUDY.md`): 9 hero-shooter heroines measured in 3D, heels taken out.
      They stand 8.4 heads barefoot; she was 9.0 heads (head small after the leg stretch), knee low (0.295 / 0.327),
      and 15–34% slimmer everywhere. `study_fit` (`STUDY_FIT`, last pass) remaps her heights onto theirs and fills
      out trunk, legs and arms; `HEROIC["head"]` 1.04 → 1.075. Now 8.50 heads, heights within ~1%, limbs within ~3%;
      bust, hip and neck girth still 9–14% under. Exported to `public/models/female.glb` (not yet checked in game).
      Tried and dropped: an automatic slice-by-slice trunk fit (bloated the belly, flattened the bust).
- [x] Smooth shading, sharp only at real creases (55°)
- [x] Phase 1: skin of trunk and limbs and every outfit subdivided once (`subdivide_layers`); small clothing
      trims stay crisp; head and hands left out so they don't pull away
- [x] Landmark sculpt (`LANDMARKS`, `sculpt_landmarks`), applied to skin and clothes alike: hip bones, groin
      lines, trochanters, back dimples, glute creases, kneecaps, knee hollows, calves, lower belly, belly line,
      ribcage edge, collarbones, throat notch, spine groove, shoulder blades, deltoids, elbows
- [x] Fuller thighs and calves round each leg's own middle, and fuller upper arms and forearms round each arm's,
      in `HEROIC` (loose clothes and the trunk near the shoulders left alone)
- [x] Neck sunk into the shoulders and flared to the sides (trapezius slope), its bottom laid on the shoulders
- [x] Bare foot rebuilt (`bare_foot`): heel, instep, arch, ankle bones, five toes with nails; fitted into the leg
      (`fit_bare_feet`) and smoothed; the skin's open edges kept in place through subdivision (`keep_open_edges`)
- [x] Hand rebuilt for her (`detailed_hand`, `hand_detail`): thinner palm with a thumb pad and rounded knuckles,
      three-jointed fingers and thumb with nails, on the same finger bones the game's fist uses
- [x] Upper torso: broader shoulders with rounded caps and stronger deltoids, a slight ribcage flare under the
      arms (`ribs` in `HEROIC`), fuller upper chest, back flanks; the old rib easing (`round_ribs`) skipped for a
      subdivided body, which removed a ridge across the back
- [x] Stomach slider in the game (`stomach` in `FEMALE_SLIDERS`, on the Belly bone): -1 flat, 1 soft and round
      (not yet checked in the game)
- [x] Muscle and bone definition (more `LANDMARKS`): stomach columns, two lines across them, obliques and the
      groove beside them; hip-bone points and crest, hollow behind the hip, deeper back dimples; the columns either
      side of the spine and the shoulder blades' inner edges; stronger collarbones, breastbone, chest-shoulder
      groove; the muscle above the inner knee, outer thigh, shin edge
- [x] Flank and side of the back: the oblique's flank pad over the hip crest (the crest now a furrow under it),
      three serratus fingers on the side of the ribcage, the lat sweeping from under the arm to the lower back
- [x] Inner thigh: the adductors filling the top of the inner thigh, and the crease where the thigh meets the
      pelvis at the front (kept 5 cm and more from the middle; the genital meshes themselves untouched)
- [x] Front profile: the ribcage arches forwards under the bust to match the lower belly (was 5 mm behind it),
      the lower belly's rise halved, and the notch under each breast filled from 2 cm to a tight fold
- [x] Ribcage reworked as an egg (`ribcage` in `HEROIC`): the waist's narrowest moved down from under the bust to
      just above the navel; the lower ribcage's sides and back filled out (half width under the bust 71 → 100 mm)
      without moving the bust; armpit to lower ribs now runs nearly straight, then in to the waist
- [x] Chest muscle: the front fold of the armpit (the chest muscle's lower edge carrying the outer bust into the
      arm) and the armpit hollow behind it
- [ ] Lumpy patches on the side of the ribcage under the bust where several landmarks overlap
- [x] Face decided: fully modelled (eyeballs, eyelids, expression shapes); face.ts and the cut-ins move over to it
- [ ] Still to do: faint wavy seam where the neck meets the back; the jagged fold under the bust (the refined
      region's edge); the head and face; small cut ends at the outer fingers' roots

## Found in the close-up check (2026-11-16)
- Belly is a plain smooth tube: no ribcage edge, no lower-belly curve, no centre line, no obliques.
- Navel is a star of thin triangles; the belly and groin are fans of long thin triangles, which shade badly and
  will bend badly.
- A hard ledge across the chest where the bust band meets the ribcage; the breasts read as cups set on, not grown
  from the chest.
- Back is flat: no spine groove, no shoulder blades, no dimples above the glutes.
- Neck is a long thin tube with a step into the shoulders; no trapezius, no collarbones.
- Shoulders are boxes; arms show 4–6 flat sides; forearms too thin; no elbows.
- Hands are a paddle with stick fingers; the wrist joins abruptly.
- Legs: no kneecaps, faceted calves, very thin shins.
- Bare feet are a shoe shape: no toes, no arch.
- Head: an egg with painted features; wedge nose, no lips, flat paddle ears, no eyes or mouth to open.
- Large dark triangles at the groin crease (hidden-opening faces poking through?) — verify in game.
- Rig: only Hips / Torso / Head in the trunk; no spine split, neck, collarbones, jaw, eyes or toes; the four fingers
  move as one.
- Skin texture is 128px and pixel-crushed, so every limb looks blocky.

## Build list

### Phase 1 — Topology base (do first; everything else sits on it)
- [ ] Raise ring sides: limbs 8 → 16, trunk ring points doubled, more rings at every bend (3+ loops at hips,
      knees, elbows, shoulders, wrists, ankles)
- [ ] Quads in place of triangle fans on belly, groin, back and neck; even spacing so it shades cleanly
- [ ] Keep the ring/face indices the outfits, smallclothes, cum and opening systems look up (or remap them in one
      place)
- [ ] Budget: body ~30–40k tris (now ~12k); each outfit grows in step

### Phase 2 — Pelvis and legs
- [ ] Hip bones (ASIS) showing softly at the front; the crest blending into the waist
- [ ] Trochanter swell, the widest point of the hips
- [ ] Glute crease under each cheek; dimples above the glutes; the sacral triangle
- [ ] Clear gap between the upper thighs; the inner-thigh line into the groin
- [ ] Kneecap, the knee's inner pad, the hollow behind the knee
- [ ] Calf shape (inner calf lower than outer), shin front, ankle bones
- [ ] Fix the dark groin triangles

### Phase 3 — Belly and torso
- [ ] Ribcage: its lower edge and the arch under the bust
- [ ] Soft lower-belly curve below the navel; faint centre line; obliques into the hips
- [ ] Navel rebuilt as a clean ring of quads (still pressed by `press_navel`)
- [ ] Breasts grown from the chest: no ledge, a soft upper slope, a proper fold underneath; keep the jiggle
      bones and the nipple discs
- [ ] Collarbones, the pit between them, the sternum
- [ ] Back: spine groove, shoulder blades, the waist's back curve

### Phase 4 — Neck, shoulders, arms
- [ ] Shorter, fuller neck; trapezius slope into the shoulders
- [ ] Rounded deltoids; a soft armpit that folds when the arm lifts
- [ ] Elbow point; a forearm that swells near the elbow and tapers to the wrist; wrist bones

### Phase 5 — Hands
- [ ] Palm with thumb pad; four separate fingers with three joints each; nails
- [ ] Bones per finger (index, middle, ring, little, thumb), so hands can grip, point, stroke and touch
- [ ] Keep the current fist/open poses working through the new bones

### Phase 6 — Head and face
- [ ] Sculpted skull, cheekbones, jaw, chin; nose bridge and tip; modelled lips; real ears
- [ ] Eye sockets with eyeballs and eyelids (blink, half-lidded)
- [ ] Mouth that opens, with teeth, tongue and inside the mouth (oral scenes, gasps, the cum-in-mouth layers)
- [ ] Face shapes the game can blend: blink, smile, frown, mouth open, O mouth, tongue out, brows up/down, blush
      (moving from painted faces to modelled ones — `face.ts` and the cut-ins move over with it)
- [ ] Hairstyles refitted to the new skull

### Phase 7 — Feet
- [ ] Arch, heel, ankle; five toes with nails; toe bone
- [ ] Refit all 23 shoe styles to the new foot

### Phase 8 — Rig
- [ ] Spine split: Hips → Spine → Chest → Neck → Head (the game keeps driving Torso; map it onto the new ones)
- [ ] Collarbones; jaw; eyes; toes; finger bones (Phase 5)
- [ ] Twist bones in the forearms and thighs so they don't twist like candy wrappers
- [ ] Re-weight the body; check every pose in `battlepose.ts`, the adult poses and paired scenes

### Phase 9 — Adult detail
- [ ] Vulva, anus and nipple grids rebuilt on the finer mesh, keeping how the game shapes and opens them
- [ ] Pubic patch, lingerie patch and smallclothes painted on the new UVs
- [ ] Areola and nipple shape sized to the new bust
- [ ] Cum layers rebuilt on the new skin (they are made from it, so this mostly reruns)

### Phase 10 — Skin and shading (the style itself)
- [ ] New UV layout for the body; skin texture at 1024–2048px, hand-painted look: soft colour shifts (warmer at
      knees, elbows, knuckles, cheeks; flush on the chest), no pixel crush
- [ ] Toon-PBR material in the game: a soft light ramp, a rim light, the outline already in `outline.ts`
- [ ] Same treatment for hair (painted strands) and the outfits' cloth

### Phase 11 — Bring the rest of the cast along
- [ ] Male, guests, knights and named regulars get the same proportions pass, topology and textures, so
      she doesn't stand out from them

## Movement — what v1 is missing to move in the hero-shooter way

The style, taken from general animation principles rather than any character: strong key poses with a clear line
through the body; fast in, slow settle; anticipation before an action and follow-through after it; leaning into
speed and turns; overshoot and settle on stops; a personality in the idle; nothing ever fully still.

### v1 already has (keep it)
- Procedural walk and run with a real female gait: hips leading, roll, twist, crossover, the planted foot, five
  style levels (`player.ts`)
- Contrapposto stance with breathing, slow sway, hand on hip and the arched back
- Drunk veer, stumble, limp and sway; sitting; carrying
- Springs on bust, glutes, belly, skirt hem and hair (`jiggle.ts`, `skirt.ts`)
- Fight poses that snap in like Karryn's Prison (`battlepose.ts`, by design) and scene poses that blend
  (`sexpose.ts`)

### Rig gaps (fix with Phase 8, which moves up to right after Phase 1)
- [ ] **No foot bone**: the foot is part of the shin, so it can't point, flex, rise on tiptoe, push off in a run
      or lie flat when kneeling. Add Foot and Toes bones.
- [ ] **One Torso bone** for the whole trunk: no S-curve, no chest leading, twist can't spread up the spine. Split
      into Spine → Chest.
- [ ] **No neck bone**: the head turns from its base like a doll's. Add Neck.
- [ ] **No collarbones**: shoulders can't shrug, rise or roll forward; arms raised high crush the shoulder. Add
      Clavicle bones.
- [ ] **Four fingers move as one**: no pointing, counting, beckoning, a proper grip on a mug or on a partner.
      One chain per finger.
- [ ] **No jaw or eye bones**: no speaking mouth, no gasp, no eyes following anything.
- [ ] **No twist bones** in the forearms and thighs: they twist like candy wrappers.

### Motion gaps
- [ ] **Turning**: the heading swings round almost at once (`TURN_RATE` 14) with no lean; the feet slide. Lean
      into turns, the head leads, and tight turns plant a foot and pivot.
- [ ] **Starts and stops**: speed changes at once. Lean forward to set off; on stopping, a small overshoot and
      settle, the hair and soft parts carrying on.
- [ ] **Easing**: blends are straight lerps. Ease curves with anticipation and overshoot for picking up, serving,
      sitting, standing, reaching (not for the fight picture, which keeps its KP snap).
- [ ] **Foot locking / foot IK**: feet slide on turns and stops; the feet don't find steps, rugs or a partner's
      body. Lock planted feet and solve the leg to the floor.
- [ ] **Hand IK**: hands are posed by angle, so they hover near the mug, the table or a partner. Two-bone IK onto
      targets.
- [ ] **Look-at**: head and eyes never track the guest she's serving, the player's camera or her partner. Layered
      look-at through neck, head and eyes.
- [ ] **Idle breaks**: only breathing and sway. Add short idle moments now and then: tuck the hair, roll the
      shoulders, swap the standing leg, glance around, smooth the skirt, stretch when tired. Pick by mood, arousal
      and drunkenness.
- [ ] **Hit reactions in the world**: flinch, stagger, catch herself on a table, not only in the fight picture.
- [ ] **More secondary motion**: springs on sleeves, apron ties, long hair strands, ponytail, jewellery and
      the outfits' loose parts; the breasts and glutes reacting to landing and stopping, not just walking.
- [ ] **Face in motion**: blinking, a mouth that moves with her lines, quick reaction faces timed to hits and
      touches (with the painted-face hybrid, the jaw bone and an open-mouth shape carry most of this).

## Rules
- Original designs only; references are for proportion and shape, never a character.
- Animate, don't vanish: nothing new may make clothes disappear in place of acting a scene out.
- Nothing is committed until you ask.
