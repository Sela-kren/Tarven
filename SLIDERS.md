# Sliders for the new heroine: body and face

How the look sliders reshape her today, what the rebuilt model (`tools/blender/real_heroin/heroine/`) should use instead, and
the full slider list with ranges taken from the reference study (`MODEL_STUDY.md`).

**Rule:** slider ends span the *range* of the nine references' proportions. No slider set, saved look, preset or test
fixture may recreate a named reference character's body or face. Ranges only; the face is never fitted to a ref.

## 1. How sliders work today

- **Data.** `Look.sliders` is `Record<id, number>`, -1..1, missing = 0 = the model as built (`src/game/appearance.ts:36`).
  The cup slider runs past 1 (to 1.64 at Z) through `stops` (`CUPS`, `appearance.ts:204`). Saves are read by id;
  unknown ids are dropped and missing ones are 0 (`readLook`, `appearance.ts:4014-4023`), so **keeping ids keeps saves**.
- **Definitions.** `SliderDef` (`appearance.ts:162-181`): `id`, `label`, `tab` (body/face/hair), `group` (a heading in
  the panel), `stops`, `roll` (random-look spread, `randomLook` `appearance.ts:3951`), `early`, `rest`, `height`, and
  `terms: BoneTerm[]`. Female list: `FEMALE_SLIDERS` (`appearance.ts:475-709`); 45 sliders, of which 3 are on the face
  tab (`head`, `faceWidth`, `faceLength`) and 2 on hair. The panel builds a range input per def, grouped by `group`
  (`src/game/customizer.ts:219-247`, `sliderRow` `:447`, `stopsRow` `:478`).
- **Mechanism: CPU vertex rewrite, no morph targets, no bone scale.** There are no morph targets anywhere in `src/`.
  - `activeTerms` (`appearance.ts:1920`) turns slider values into per-bone `ActiveTerm` lists.
  - `reshape` (`:1847`) moves a point given as an offset from a bone's joint, in **model (bind) space**: scale about
    the joint (or `lobes` / `about` centres), `span`/`pivot` lengthwise growth along +y, `fade`/`band`/`back` height
    and depth masks, `shift`, `apart`, `turn`, `midline`, `reach`.
  - `Dresser.apply` (`:2711`): each body vertex moves by the sum over its 4 skin weights of that bone's reshape
    (`:2755-2772`); joints move by their parent's reshape (`:2716-2733`); clothes, shoes, cum and jewels copy the
    nearest 4 body points' moves (`follow`, `:2495`, `:2781`); the result is written into the cloned geometry's
    `position` (`writePositions` `:3519`); bones get the new joint places (`:2866-2871`); feet are re-grounded
    (`:2836-2844`). **Height** is only a uniform scale of the root (`:2880-2882`).
  - The face rig (`refreshFace` `:2953`) re-finds eyes, brows and lips on the *shaped* points, so expressions follow.
- **What the GLB must hold.** Root object `Female`; skinned meshes whose part is found by name (`partOf`); bones
  `Female_<label>` with the labels the terms use: `Torso`, `Hips`, `Head`, `Thigh_L/R`, `ThighSoft_L/R`, `Shin_L/R`,
  `UpperArm_L/R`, `ForeArm_L/R`, `HandFingers/HandTips/HandThumb_L/R`, `Bust`, `Belly`, `Glute_L/R`, `Strand_L/R`,
  plus hair springs `HairSoft`, `HairTail` (bones built in `build_world.py:7360-7369`, soft bones `:2930-2941`).
  Materials the face rig reads: `T_soot` (eyes), `T_hair_f` (brows), `T_lip`/`T_lip_lit`, `T_teeth*`, `T_tongue`,
  `T_face_*`.
- **Limits.**
  1. Scaling and shifting about joints can only swell or squash what is there: no sculpted anatomy (abs, collarbone,
     deltoid, lumbar arch, glute shelf). `MODEL_STUDY.md` section 4 hit exactly this wall.
  2. Every term is tuned in metres to the old mesh: `BREASTS` lobes, `GLUTE_MIDDLE` 0.065, `HIPS_AT` 0.86,
     `TORSO_AT` 0.98, hand `about`, foot `pivot` -0.475, all `fade`/`band` heights. All must be re-measured.
  3. Lengthwise growth is along model +y only. Legs are near vertical, but the new heroine is built in an A-pose
     (`ARM` 41.5 degrees in `build_heroine.py`), so an arm-length term would stretch arms straight up.
  4. Face sliders scale the whole `Head` bone: face width also widens the skull and anything weighted to it.
  5. Normals are not recomputed after reshaping (only nipple, vulva, anus and penis meshes are). Fine for swelling,
     wrong for sculpted detail; the outline (`outline.ts`) pushes along those stale normals too.
  6. Only 4 weights per vertex are read (`k < 4`, `:2759`), the glTF/Three.js limit per `JOINTS_0` set.

## 2. Recommended mechanism for the new model

**Lengths, joint places and overall size: bones. Soft shape and all face features: morph targets (Blender shape
keys), baked on the CPU in `Dresser.apply`, never run in the shader.** The existing `BoneTerm` system stays for
what it does well (bust behaviour, rear tweaks, posture, hair).

- **Bone-driven**: height, leg length, knee height, arm length, hand and foot size, neck length, shoulder width (the
  clavicle/upper-arm joints), hip-joint spacing, head size. These move joints, so they must move bones; a morph
  cannot move a bone, and animation, IK, cut-ins and poses read joint places.
- **Morph-driven**: build, muscle, cup size, ribcage, waist, waist height, stomach, hips (soft part), rear size,
  thighs, calves, ankles, arm fullness, neck thickness, shoulders (soft part: deltoid and trapezius) and every face
  slider. These are shapes a sculptor makes once; a morph can hold real anatomy where bone scaling cannot.
- **Why bake on the CPU, not use Three.js morphs** (three `0.187.0`, `package.json`; WebGL2 path in
  `node_modules/three/src/renderers/webgl/WebGLMorphtargets.js`):
  - No hard target cap any more: all targets go in one `DataArrayTexture` (one layer per target), but each vertex
    takes a full RGBA float texel per target (16 B; 32 B with morph normals), the influence array is a uniform sized
    `MORPHTARGETS_COUNT` (a new shader variant per count, and it eats vertex uniform slots, WebGL2 minimum 256), and
    the vertex shader loops over every target every frame.
  - The texture is cached **per geometry**, and the `Dresser` clones every character's geometry
    (`appearance.ts:2431`). 50k verts x 56 targets x 32 B = ~90 MB of VRAM per character on screen. Not viable for
    a tavern full of guests (`game.ts:2480` makes a `Dresser` per guest).
  - Sliders change only in the customise panel and when a guest is made; the `Dresser` already rewrites positions
    then. So: at load, read `geometry.morphAttributes.position` into `Float32Array` deltas, **delete
    `morphAttributes` and `morphTargetInfluences`** (no GPU upload), and in `apply` first form
    `base = bind + sum(weight_i * delta_i)` (deltas taken through the `bindMatrix` 3x3), then run the existing
    bone terms, joint moves and clothes-follow on `base` instead of `bind`. Face expressions then sit on the
    shaped face for free.
  - Then recompute the body's normals once per `apply`, welded by position (a position-to-index table built at
    load) so UV seams don't crease. 50-60k verts is a few ms. This also fixes limit 5.
- **Target naming and asymmetry.** One shape key per direction where the shape is not mirror-linear:
  `<sliderId>+` and `<sliderId>-` (e.g. `waist+`, `waist-`). A slider with only `<id>+` uses negative weight for -1.
  The cup slider drives `bust+` past 1 (to 1.64) by extrapolation. GLTFLoader reads names from
  `mesh.extras.targetNames` into `morphTargetDictionary` and sets `morphTargetsRelative = true`
  (`GLTFLoader.js:2513`), so deltas are relative, as needed.
- **Joint deltas for morphs that move a landmark.** When face morphs move the eyeballs or the jaw (eye and jaw
  bones are planned in `MODEL_REWORK.md` Phase 8), the build writes, per target, how far each such joint moves into
  the GLB extras (`extras.jointDeltas[target][bone] = [dx, dy, dz]`); the `Dresser` adds them to its joint shifts.
- **Separate head mesh.** Keep the head (`head_mesh.py`) a separate skinned mesh with its own material, as the refs
  do. Face targets then live only on its ~7-10k verts and body targets never touch it. Face morphs change only the
  face front and jaw, never the skull cap, so hairstyles still fit; head size stays a bone so hair scales with it.
- **Clothes need no targets**: they follow the body points (`follow`) as today. Only body and head carry keys.
- **File size** (current `female.glb` is 21 MB). Dense float32 positions = 12 B x verts per target: 600 KB for a
  50k body. glTF sparse accessors store only touched verts (index + 12 B); GLTFLoader expands them to dense on load
  (`GLTFLoader.js:3275-3304`), so sparse saves download size only, which is all we need (RAM copy is ours and
  shared). Estimate: ~24 body targets (global ones like build/muscle dense, regional ones 100-300 KB) ~7 MB, ~32
  face targets on the head ~1.5 MB. Export **without morph normals** (we recompute), which halves it. Optional
  later: quantise deltas to int16 with gltf-transform for another 2x.
- **Blender export.** `build_world.py:8473` exports with `export_apply=True`; Blender cannot apply modifiers to a
  mesh with shape keys, so the heroine body and head must have every non-Armature modifier applied *before* keys
  are added, and the export call needs `export_morph=True, export_morph_normal=False, export_try_sparse_sk=True`.
  Check `targetNames` in the written GLB after every build.
- **Making the targets.** Both generators are parametric, which makes targets cheap and repeatable:
  - Head: `head_mesh.py` builds a fixed topology (quad sphere `N`, insets, relax) from parameters (`EYE`, `EYE_R`,
    `eye_arcs`, `MOUTH_W`, `MOUTH_Z`, `base_field`). Rebuild with one parameter nudged, check the vertex count is
    unchanged, store the difference as the target.
  - Body: the SDF is meshed by OpenVDB, whose topology changes with every parameter. Build the final retopologised
    body once, then for each target evaluate the varied SDF and pull every base vertex onto its zero surface
    (a few Newton steps along the field's gradient). Good for soft, mostly-normal changes; lengths stay bones.
- **Rig axes.** Bone-driven length sliders on the new UE-style rig need a term option to grow along the bone's own
  direction (A-posed arms, limit 3), and the game-driven labels above must exist or be mapped (`MODEL_REWORK.md`
  Phase 8: "the game keeps driving Torso").

## 3. Slider table

Shares are of barefoot stature (as in `MODEL_STUDY.md`); "0" is as built, which should sit on the refs' median
(and where Tarven measures now, after `study_fit`, it is shown in brackets). "ref" is the refs' min-max. Ends are set
a little past the ref range so every ref sits inside, not on the stop. B = bone, M = morph, T = keep existing bone
terms (re-tuned). New ids are marked *new*; everything else keeps its id.

### Body

| id | Changes | Mech | -1 | 0 | +1 | ref |
|---|---|---|---|---|---|---|
| `height` | Whole figure | B (root scale) | 1.61 m | 1.70 m | 1.79 m | 1.61-1.79 (factor 0.06 -> 0.053) |
| `legs` | Thigh+shin length, **stature held** (root rescaled) | B | crotch 0.465 | 0.526 (0.524) | 0.55 | 0.464-0.546 |
| `kneeHeight` *new* | Thigh:shin split, crotch held | B | knee 0.31 | 0.327 (0.329) | 0.34 | 0.313-0.336 |
| `armLength` *new* | Upper arm / forearm, along the bone | B | 0.130 / 0.136 | 0.142 / 0.148 | 0.150 / 0.163 | 0.133-0.147 / 0.139-0.160 |
| `hands`, `feet` | Size | B (T today) | -15% | as built | +25% | - (keep) |
| `neckLength` | Chin to shoulder joint | B | 0.056 | 0.064 (0.062) | 0.076 | ~0.058-0.074 |
| `shoulders` | Shoulder joints apart + deltoid/trapezius | B + M | 0.143 | 0.150 | 0.193 | 0.147-0.190 |
| `build` | Overall softness: every girth | M | thigh 0.32, upper arm 0.135 | median | thigh 0.38, upper arm 0.175 | thigh 0.336-0.362, arm 0.141-0.160 |
| `muscle` *new* | Definition: deltoid, abs, obliques, quads, calves | M (+/-) | soft, no definition | refs' soft broad landmarks | athletic | not measured |
| `bust` (cups) | Cup size | M (`bust+`, `bust-`) + T (drop, apart) | A: bust ~0.40 | 0.525 | ~0.62 at Q, on to Z | 0.499-0.547 |
| `ribcage` *new* | Underbust girth | M | 0.340 | 0.360 (0.342) | 0.380 | 0.347-0.370 |
| `waist` | Waist girth / width / depth | M (+/-) | 0.320 / 0.105 / 0.090 | 0.376 / 0.140 / 0.096 | 0.41 / 0.150 / 0.112 | 0.328-0.400 / 0.109-0.143 / 0.094-0.108 |
| `waistHeight` *new* | Narrowest point up/down | M | 0.648 | 0.663 | 0.678 | 0.652-0.673 |
| `stomach` | Belly forward/round | M (+/-) | flat, drawn in | flat | soft round | not measured |
| `hips` | Hip girth / width + hip joints apart | M + B | 0.590 / 0.222 / joints 0.084 | 0.620 / 0.237 / 0.107 | 0.660 / 0.250 / 0.120 | 0.597-0.646 / 0.226-0.245 / 0.086-0.118 |
| `rear` | Rear size: hip depth | M + T (jiggle) | depth 0.112 | 0.119 (0.104) | 0.155 | 0.117-0.150 |
| `thighs` | Thigh girth | M | 0.320 | 0.344 | 0.370 | 0.336-0.362 |
| `calves`, `ankles` | Calf, ankle fullness | M | -15% | as built | +20% | not measured |
| `arms` | Upper arm / forearm / wrist girth | M | 0.135 / 0.138 / 0.085 | 0.155 / 0.150 / 0.100 | 0.165 / 0.170 / 0.110 | 0.141-0.160 / 0.143-0.165 / 0.088-0.106 (one 0.166 is a bracer) |
| `neckWidth` | Neck girth | M | 0.145 | 0.162 (0.140) | 0.172 | 0.152-0.167 |
| `bustHeight`, `bustLift` | Breast position, nipple height | T | nipple 0.745 | 0.761 | 0.780 | 0.754-0.776 (one outlier 0.654, not a target) |
| `bustProjection` | Bust depth | T (or M later) | 0.130 | 0.144 | 0.162 | 0.137-0.158 |
| `bustUpper`, `bustSpacing`, `bustCloser`, `bustTogether`, `bustInner`, `bustSupport` | As today | T | | | | - |
| `rearLift`, `rearWidth`, `rearProjection`, `rearUpper`, `rearLower` | As today | T | | | | - |
| `arch`, `upperArch` | Posture | T + pose | | | | - |
| `nippleSize`, `areolaSize`, `pubesSize`, `vulva*`, `anusSize` | Own systems | unchanged | | | | - |

Notes: the cup letters are read off a tape on the old body. By the refs' tight-suit numbers the bust stands 22-30 cm
over the band (about G-H in EU sizing), so either the new body is built smaller at 0 and keeps "C", or `CUPS.zero`
is re-anchored; saved values survive either way but their letter may change. Decide before tuning `bust+`.

### Face

No face measurements were taken in the study beyond head size, so face ranges are given against the new head's own
build values (`head_mesh.py`, at 1.70 m: head width W = 16.3 cm, eye opening 34.5 x 12.2 mm, inner eye corners
32 mm apart, mouth 41 mm wide). A head-relative pass over the refs (ratios only, min and max kept, nothing per
ref) can widen or narrow these ends later. All are M unless marked.

| id | Changes | -1 | 0 | +1 |
|---|---|---|---|---|
| `head` | Head size, hair follows | B: 0.110 of stature (9.1 heads) | 0.1176 (8.5) | 0.126 (7.9); refs 0.117-0.122. Term 12% -> 7% |
| `faceWidth` | Cheeks, jaw, face front; skull kept | head width 0.084 of stature | 0.096 | 0.101; refs 0.085-0.100 |
| `faceLength` | Eye line to chin; lower face moves down | -6% | as built | +6% |
| `jawWidth` *new* | Width at the jaw angles | -12% | | +12% |
| `chinHeight` *new* | Chin taller/shorter | -4 mm | | +4 mm |
| `chinWidth` *new* | Pointed to broad | -25% | | +25% |
| `chinProjection` *new* | Chin back/forward | -4 mm | | +4 mm |
| `cheekbones` *new* | Cheekbone height and prominence | flat, low | | high, +3 mm out |
| `cheeks` *new* | Soft cheek fullness | hollow -2 mm | | full +3 mm |
| `eyeSize` *new* | Opening + eyeball, about the eye centre | width 0.19 W | 0.21 W | 0.24 W |
| `eyeOpen` *new* | Opening height:width (almond to round) | 0.30 | 0.35 | 0.42 |
| `eyeTilt` *new* | Outer corner up/down | 0 deg | ~9 deg | 16 deg |
| `eyeSpacing` *new* | Inner-corner gap / eye width | 0.80 | 0.93 | 1.10 |
| `eyeHeight` *new* | Eye line up/down on the face | -3 mm | | +3 mm |
| `eyeDepth` *new* | Eyes set in / forward | -2 mm | | +2 mm |
| `browHeight` *new* | Brow up/down (cards ride the face surface) | -3 mm | | +3 mm |
| `browTilt` *new* | Inner end down (stern) / up (soft) | -2.5 mm | | +2.5 mm |
| `browRidge` *new* | Brow bone prominence | -2 mm | | +2 mm |
| `noseSize` *new* | Whole nose, about its root | -15% | | +15% |
| `noseLength` *new* | Root to tip | -12% | | +12% |
| `noseWidth` *new* | Alar width | -15% | | +15% |
| `noseBridge` *new* | Bridge height in profile | -2 mm | | +2 mm |
| `noseTip` *new* | Tip turned down / up | -10 deg | | +10 deg |
| `mouthWidth` *new* | Corner to corner | 0.22 W | 0.25 W | 0.29 W |
| `lipsFull` *new* | Both lips' height and pout | -35% | | +35% |
| `lipRatio` *new* | Upper vs lower lip | upper thinner | | upper fuller |
| `mouthHeight` *new* | Philtrum length (mouth up/down) | -3 mm | | +3 mm |
| `earSize` *new* | Ear size | -20% | | +20% |
| `earOut` *new* | Ear stands off the head | -10 deg | | +10 deg |
| `earPoint` *new, optional* | Rounded to pointed tip (ask the user) | rounder | human | pointed |

Count: 15 body morph sliders (~24 targets) + 28 face morph sliders (~32 targets) = ~56 targets.
`roll` for random looks: 0.5 on face sliders, 0.8 on soft body sliders, 0.4 on lengths.

## 4. Coverage test (body only, no presets)

A headless script (`tools/blender/real_heroin/heroine/coverage.py`, to write) builds the body at slider settings, measures it
with the study's method (exact slice cuts, convex-hull girths, arms left out by dominant bone, barefoot stature)
and checks:

1. **Ends reach the range.** For each row below, the one slider at -1 (others 0) measures at or below the ref min and
   at +1 at or above the ref max: stature; crotch; knee joint; shoulder joint; chin; heads tall; shoulder joints
   apart; hip joints apart; upper arm and forearm length; neck length; bust, underbust, waist, hip, thigh, neck,
   upper-arm, forearm and wrist girths; bust depth; waist width and depth; hip width and depth; nipple, underbust
   and waist heights.
2. **Every ref is reachable.** For each ref, fit the body slider values by least squares to its measurement vector
   (read at test time from the gitignored `ref/` study output) and report the residual per landmark; pass at under
   2% of stature on heights and 3% on girths. The fitted values are printed and thrown away: never written to the
   repo, `LOOK_OPTIONS`, saves or a test fixture. The face is never fitted to a ref.
3. **Independence.** `height` leaves every share unchanged; `legs` and `kneeHeight` keep stature; girth sliders move
   no landmark height by more than 0.5% of stature.
4. **Combined extremes stay sound.** Corners of {bust, waist, hips, build, muscle} at +/-1: no self-intersection
   at the thigh gap, under the bust or at the armpit; joints stay inside the mesh; feet stay on the floor; clothes
   keep clear after `follow` (the `keep_clothes_clear` margin).
5. **Saves.** Every existing female slider id still exists; an old save loads with no id dropped.
