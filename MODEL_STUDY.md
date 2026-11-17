# Reference study — hero-shooter heroines, measured in 3D

What the reference models in `ref/` are made of, measured rather than eyeballed, and how Tarven's female compares.
The numbers feed `STUDY_FIT` and `HEROIC["head"]` in `tools/blender/build_world.py` and the phases in
`MODEL_REWORK.md`.

**Rule:** the refs are measured for proportion and technique only. Tarven's model stays original: no ref mesh,
texture, face or outfit is copied, traced or shrink-wrapped onto (the same rule as `MODEL_REWORK.md`).

## 1. What was studied

| Ref (folder in `ref/`) | Tris | Heel lift | Heads (barefoot) | Bones |
|---|---|---|---|---|
| black-widow-marvel-rivals | 138,781 | 10.7 cm | 8.46 | 469 |
| emma-frost-marvel-rivals | 106,398 | 11.9 cm | 8.58 | 521 |
| invisible-woman-azure-shade | 108,037 | 2.5 cm | 8.26 | 478 |
| invisible-woman-mcu | 105,830 | 2.7 cm | 8.22 | 539 |
| invisible-woman-riann-landau-the-debater | 122,537 | 3.6 cm | 8.20 | 514 |
| luna-snow-cool-summer | 131,212 | 8.2 cm | 8.38 | 565 |
| phoenix-viridian-vogue | 103,715 | 5.0 cm | 8.43 | 680 |
| psylocke-vengeance | 142,984 | 7.9 cm | 8.42 | 762 |
| rogue-marvel-rivals | 148,587 | 8.3 cm | 8.57 | 594 |
| invisible-women-marvel-rivals (Malice GLB) | — | — | — | dropped: imported at another scale (2.68 m, joints offset) |

- Each outer zip held a second zip in `source/`; both are now unpacked. Models and full texture sets are in
  `ref/<name>/source/extracted/` (FBX + PNGs). `ref/` is gitignored.
- Measured headless in Blender 5.1 with scripts kept in the session scratchpad (`measure.py`, `barefoot.py`,
  `profile.py`, `lineup.py`):
  - **Slices** are exact: every triangle edge cut by the height plane, not nearby vertices (ring-built meshes
    have rows more than 8 mm apart and a band can miss them).
  - **Girth** is the convex hull of the slice: what a tape measure reads.
  - **Arms left out** of trunk slices by each vertex's dominant bone.
  - **Heels taken out**: most refs stand in heels, which add up to 12 cm and stretch every leg and head-count
    ratio. Barefoot stature = (crown − ankle joint) / (1 − 0.045), the ankle joint put back at 0.045 of stature.
    All shares below are of barefoot stature.
  - **Girths, depths and widths** use only the refs whose suit is tight at that height (no jacket, belt, cape,
    skirt or boot over it): mostly Black Widow, both Invisible Woman suits and Luna Snow.
  - Phoenix's crotch is hidden by her coat and left out.
- Renders (scratchpad, not in the repo):
  - `…\scratchpad\refstudy\renders\lineup_front_marked.png` and `lineup_side_marked.png`: all refs, heel-corrected,
    same height, beside old and new Tarven, with the 8.42-head grid and median landmark lines
  - `…\renders\rogue_wire_sheet.png`: topology close-ups; `…\renders\study_luna.png`: skin-showing body and face
    wire; `…\renders\profile_chart.png`: side and front silhouettes by height

  (`…` = `C:\Users\USER\AppData\Local\Temp\claude\386429955e1e2db0\f129f0da-221e-45c8-8698-870d75abee63\scratchpad`)

## 2. Proportions (barefoot, shares of stature)

Heights from the floor. The "at 1.70 m" column is the median at Tarven's stature.

| Landmark | Median | Range | At 1.70 m |
|---|---|---|---|
| Stature, barefoot | 1.66 m | 1.61–1.79 m | — |
| Heads tall | 8.42 | 8.20–8.58 | head 20.2 cm |
| Head (chin to crown) | 0.119 | 0.117–0.122 | 20.2 cm |
| Head width / depth | 0.096 / 0.108 | 0.085–0.100 / 0.106–0.112 | 16.3 / 18.4 cm |
| Chin | 0.881 | 0.878–0.883 | 149.8 cm |
| Shoulder joint | 0.817 | 0.809–0.820 | 138.9 cm |
| Nipple (bust's front) | 0.761 | 0.754–0.776 (Psylocke 0.654) | 129.4 cm |
| Underbust | 0.699 | 0.694–0.726 | 118.8 cm |
| Waist (narrowest) | 0.663 | 0.652–0.673 | 112.7 cm |
| Hip joint | 0.582 | 0.570–0.597 | 98.9 cm |
| Crotch | 0.526 | 0.464–0.546 | 89.4 cm |
| Knee joint | 0.327 | 0.313–0.336 | 55.6 cm |
| Shoulder joints apart | 0.147 | 0.147–0.190 | 25.0 cm |
| Hip joints apart | 0.107 | 0.086–0.118 | 18.2 cm |
| Upper arm / forearm length | 0.142 / 0.148 | 0.133–0.147 / 0.139–0.160 | 24.1 / 25.2 cm |

| Girth / size | Median | Range | At 1.70 m |
|---|---|---|---|
| Bust | 0.525 | 0.499–0.547 | 89 cm |
| Underbust | 0.360 | 0.347–0.370 | 61 cm |
| Waist | 0.376 | 0.328–0.400 | 64 cm |
| Hips (max, at/above crotch) | 0.620 | 0.597–0.646 | 105 cm |
| Thigh (top) | 0.344 | 0.336–0.362 | 58.5 cm |
| Neck | 0.162 | 0.152–0.167 | 27.5 cm |
| Upper arm (middle) | 0.155 | 0.141–0.160 | 26.4 cm |
| Forearm (fullest, bare-armed refs) | ~0.150 | 0.143–0.165 | ~25.5 cm |
| Wrist | 0.106 | 0.088–0.166 | 18 cm |
| Bust depth | 0.144 | 0.137–0.158 | 24.5 cm |
| Waist width / depth | 0.140 / 0.096 | 0.109–0.143 / 0.094–0.108 | 23.8 / 16.3 cm |
| Hip width / depth | 0.237 / 0.119 | 0.226–0.245 / 0.117–0.150 | 40.3 / 20.2 cm |

- The style in one line: human bust and hips, a small waist (0.38 of stature; average women ~0.53, slim ~0.40),
  long legs (crotch 0.526; real women ~0.47), a head a touch small (8.4 heads), full arms and thighs.
- Not targets: elbow and wrist heights (the refs stand in an A-pose, arms ~41° from vertical; hers hang at 17°).
- Silhouette by height (depth and half width, every 1%, tight-suit medians) is the `profile` table in `STUDY_FIT`.
  Posture differs between refs (front and back measured from the knee line wander by 3–4 cm), so only depth and
  width are taken, never position.

## 3. How they are built

### Mesh
- One skinned mesh per character, 104–149k triangles, with 9–14 material slots: Body, Head, Equip_01…05, Hair_01/02,
  Eyes_01–03, Tooth.
- Head: ~13.3k tris on the same base mesh across skins (all three Invisible Woman skins: 13,344). Teeth and tongue
  ~10k. Eyes in three shells (eyeball ~1,200, cornea/highlight 720, eye-shadow shell ~64).
- Density: face ~1,100 tris/dm²; hands/arms skin ~600–700; trunk skin ~150–300; legs equip ~160; hair ~130–170.
  Skin edge length median 6–10 mm (10th percentile 2 mm). An even quad grid, triangulated on export.
- Muscle and bone landmarks are sculpted into the mesh, soft and broad; the tight suits' panel seams are shallow
  grooves in the geometry.

### Clothes
- Garments are separate shells in the same mesh with modelled thickness: back faces found within 3 cm for 55–98% of
  a garment's corners, median shell 3–7 mm (coats and boots up to 12–16 mm).
- **The skin under clothes is deleted.** Only 3–30% of the remaining skin has cloth within 6 mm over it (the
  overlap at hems). Skin area left: 0.12–1.38 m² (a whole body is ~1.6–1.9).
- Tight suits are body-shaped panels sitting 0–5 mm where the skin would be (Psylocke's suit: 60% of its corners
  within 5 mm of skin). Jackets, belts, straps, boots and gloves are their own thick geometry; collars and coat
  tails hang on cloth bone chains.

### Textures
- One sheet per material, mostly 2048² for Body, Head and each Equip; hair, eyes and many masks 1024².
- Map sets: `D` colour (65 files), `N` normal (54), `ORM` packed occlusion/roughness/metal (41), `S` (37), `M`
  masks (27), and on hair `AO`, `ID`, `AN`.
- **D is hand-painted**: soft light and muscle shading baked in, in flat painterly planes; ink lines at creases;
  freckles and make-up on the face. The back of the scalp is left flat grey under the hair.
- **S is a hand-picked shadow colour** (darker, cooler, more saturated than D: skin to brown-purple, green suit to
  deep green). Two-tone toon shading picks between D and S; shadows are painted, not D darkened.
- Texel density (median texels per metre): face ~5,300, hair ~5,500, body ~2,200, clothes ~2,400, eyes ~21,000.
  The face gets about twice the body's resolution.
- Hair: alpha strand masks (`Hair_M`) on card and ribbon meshes; brows and lashes as cards on the same sheet.

### Vertex colour and extra UVs
- One RGBA colour set (`PSKVTXCOL_0`). Only G varies (about 0–0.11), lower on the face and eyes: a per-vertex
  outline width. R is constant per model (0, 0.05, 0.09 or 0.99: a shading switch); B and A sit at ~0.5.
- Extra UV sets are used only on hair: one runs 0–1 root to tip along every strand card (highlight and alpha
  gradient), another a narrow strip (a colour or ramp lookup).

### Rig
- Unreal-mannequin core: `root`, `pelvis`, `spine_01–05`, `neck_01–02`, `head`; `clavicle`, `upperarm`,
  `lowerarm`, `hand`; four fingers with a metacarpal and three joints each, a three-joint thumb (38–46 finger
  bones); `thigh`, `calf`, `foot`, `ball`; `ik_*` foot and hand targets; weapon and FX sockets.
- Twist bones: 2–3 on each upper arm, forearm, thigh and calf (24–45 in all).
- **Face: 45 bones, identical names on every ref** (jaw, brows ×3, eye ball / blink / lower / lacrimal, upper and
  lower lips and corners, cheeks ×3, nose ×3, tongue ×3, teeth ×2). **No shape keys on any model**: faces are
  posed by bones.
- Hair chains 41–198 bones (Emma's hair is rigid); cloth chains (collars, belts, coat tails) 2–58.
- Helper joints: scapula, clavicle, chest (one per breast), trapezius, latissimus, a crotch fix.
- Psylocke and Rogue add 69–80 pose-driven correctives (`L_Shoulder_Fix_1…8_Jnt`, elbow ×5, wrist ×8, hip ×8,
  knee ×3, ankle ×2).
- Up to 8 bone weights per vertex.

## 4. Tarven against the refs

Her rework build before `study_fit` (1.70 m barefoot, the leg pass in, `HEROIC["head"]` 1.04). The committed
`female.glb` was older still: 1.64 m, 8.1 heads, crotch 0.467.

| | Refs | Tarven | |
|---|---|---|---|
| Heads tall | 8.42 | 9.04 | head 7% small (0.111) |
| Chin / shoulder joint | 0.881 / 0.817 | 0.889 / 0.835 | chin to nipple 0.112 against 0.120 |
| Knee joint / crotch | 0.327 / 0.526 | 0.295 / 0.502 | shin short, thigh long |
| Nipple / underbust / waist | 0.761 / 0.699 / 0.663 | 0.751 / 0.692 / 0.671 | close |
| Bust girth / depth | 0.525 / 0.144 | 0.403 / 0.115 | −23% / −20% |
| Waist girth / width | 0.376 / 0.140 | 0.306 / 0.108 | −19% / −23% |
| Hip girth / depth | 0.620 / 0.119 | 0.486 / 0.077 | −22% / −35% (flat glutes) |
| Thigh / neck girth | 0.344 / 0.162 | 0.271 / 0.131 | −21% / −19% |
| Upper arm / forearm / wrist | 0.155 / ~0.150 / 0.106 | 0.102 / 0.088 / 0.084 | −34% / −41% / −21% |

- The leg stretch scaled the whole figure down to 1.70 m, so everything above the legs went thin and the head
  small.
- By silhouette: her upper chest above the bust is 3–5 cm shallower (0.78–0.84 of stature); the refs carry a full
  upper chest and upper breast.
- Done so far:
  - `HEROIC["head"]` raised (1.04 → 1.075)
  - a new last pass, `study_fit` with `STUDY_FIT`:
    1. heights remapped onto the landmarks (feet held, head riding on top)
    2. trunk filled out by height about her middle, front and back each by its own factor, plus a glute swell
       behind (a hand-tuned table)
    3. legs fuller about each leg's line (less on the inside, keeping the thigh gap), arms fuller about their own
       axis (full deltoid and upper forearm, slim elbow and wrist)
  - clothes and bones go through the same moves, then `keep_clothes_clear`
- Tried and dropped: fitting each trunk slice automatically to the refs' depth and half width. One depth per
  height can't tell bust, belly and back apart; it bloated the belly, flattened the bust and squared the shoulders.
  Also dropped: widening at the neck's base, which squared off the shoulders' tops instead.

**Results after study_fit** (2026-11-16, built in a scratch folder, not yet in `public/models`; refs' barefoot
median after the slash):

| | Tarven | refs |
|---|---|---|
| heads tall | 8.50 | 8.42 |
| chin / nipple / underbust | 0.882 / 0.762 / 0.704 | 0.881 / 0.761 / 0.699 |
| crotch / knee joint / shoulder joint | 0.524 / 0.329 / 0.820 | 0.526 / 0.327 / 0.817 |
| bust / underbust / waist / hip girth | 0.467 / 0.342 / 0.366 / 0.563 | 0.525 / 0.360 / 0.376 / 0.620 |
| bust depth / hip depth | 0.141 / 0.104 | 0.144 / 0.119 |
| thigh / neck / upper arm / forearm girth | 0.345 / 0.140 / 0.151 / 0.145 | 0.344 / 0.162 / 0.155 / ~0.15 |

Heights within about 1%, limbs within about 3%; bust, hip and neck girth still 9 to 14% under. Seen in grey, the
proportions now match, but the form doesn't: her body stays a smooth tube (the waist and hips soften into a ring,
the abs flatten, and from the side there is no lumbar arch or glute shelf). Scaling a ring-built body can't add
the sculpted anatomy that makes the refs read the way they do; see section 5.

## 5. What "very like the refs" still needs, beyond proportions

Ranked by how much each changes the look:

| # | Need | From the study | `MODEL_REWORK.md` phase |
|---|---|---|---|
| 1 | Hand-painted D plus an S shadow-colour map at 2048², a toon ramp shader picking between them, rim light, outline width from vertex colour G | D/S/ORM sets; face ~5,300 texels/m, body ~2,200 | Phase 10 (skin and shading); new UVs in Phase 1 |
| 2 | Finer even quad topology | skin edges 6–10 mm, face ~1,100 tris/dm², ~100–150k tris all in | Phase 1 (topology base) |
| 3 | Modelled face posed by bones: jaw, lids, brows, lips, eyeballs; teeth and tongue | 45 face bones, no shape keys | Phase 6 (head and face), Phase 8 (rig) |
| 4 | UE-style rig | `spine_01–05`, `neck_01–02`, clavicles, per-finger chains with metacarpals, 2–3 twist bones per long bone, foot + ball, breast/scapula helpers, optional correctives | Phase 8 (rig), Phase 5 (hands), Phase 7 (feet) |
| 5 | Clothes as separate thick shells, the skin under them hidden or removed per outfit | shells 3–7 mm; 3–30% skin left under cloth | Phase 1 (outfits grow in step), Phase 9 |
| 6 | Card hair with alpha strand masks and a root-to-tip UV; brows and lashes as cards | `Hair_M`, `ID`, `AO`, extra UV on hair | Phase 6 (hairstyles), Phase 10 |
| 7 | Side S-curve: chest up, lumbar arched, glutes high and back | lineup side view | `study_fit` follow-up |

Number 5 needs care in Tarven: the adult systems and the "animate, don't vanish" rule need the skin there when
clothes come off, so hide the skin under each worn piece instead of deleting it.
