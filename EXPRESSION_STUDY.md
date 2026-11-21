# Expression study: Karryn's Prison's faces, and Tarven's

Started 19 Nov 2026. A study of how Karryn's Prison (KP) builds and picks Karryn's face, and what Tarven takes from it
for her face (`src/game/face.ts`). Their art is reference only and is never copied into Tarven.

## Where the material is

| What | Where |
|---|---|
| The interactive study sheet (every preset, every random look, part library, heatmaps, notes per face) | `D:\hh\Karryns.Prison.v1.2.7.2.Incl.ALL.DLC.Uncensored\...\Decrypted\expression-study\index.html` (its data is `data.js`, its pictures `img\`) |
| KP's face code | `RemtairyKarrynEmote.js → emoteStandbyPose` under KP's `www\js\plugins` |
| Her layers (every pose's face pieces) | `...\Decrypted\karryn\<pose>\` |
| Tarven's expressions | `src/game/face.ts` (`EXPRESSIONS` as brow/eye/mouth shape keys, `VARIANTS`, `faceFor`); played as morph targets by `facekeys.ts` |
| Her face's shape keys (sculpted, the source of truth since 21 Nov) | `art/female_face_keys.blend` → `public/models/female_face.json` (BLENDER_BRIDGE.md) |
| The old face rig (only to bake keys from now) | `src/game/facerig.ts` |
| Tarven's fight faces (already part-pooled the KP way) | `src/game/fightface.ts` |
| Her old expressions as Blender shape keys (superseded) | `art/face_expressions.blend` |
| Tools: every expression to OBJ | `tools/facepreview/` |

The study sheet's notes box saves to that browser only. Copy any notes you want to keep into this doc.

## 1. How KP builds a face

1. **Situation → preset id.** On every pose or state change KP walks a fixed list of checks; the first that's true
   picks a face id:
   1. an enemy just came on her (bukkake score lv1-3)
   2. an enemy just harassed her: groped, talked, kissed, stripped, spanked, toyed (lv1-3)
   3. she just used Petting / Cock Stare (lv0-3)
   4. she's **horny** (lv1-3 × 3 stamina bands)
   5. she's **off balance** (masochism lv1-3 × 3 bands)
   6. she's **aroused** (lv1-3 × 5 bands)
   7. otherwise **calm** (5 stamina bands)

   "lv" is her reaction score: how lewd she's become. The whole tree exists twice: her normal stance, and her
   **confident** stance (head level, smugger art).
2. **Preset → random pools.** A preset names a pool of brows, a pool of eyes and a pool of mouths. One of each is
   picked at random, plus switches: **blush** (`hoppe`, sometimes only if aroused) and **sweat** 1 or 2. Calm at 40-21%
   stamina is 2 brows × 2 eyes × 3 mouths = 12 looks that all read "tiring".
3. **Layers.** Each part is a full-size picture already in place, stacked: body → hair colour → blush → sweat → mouth →
   eyes → eyebrows → stray hair / semen → hat. Brows are above everything but the hat, so they always show through her
   fringe.

## 2. The parts

Family names are KP's own (Japanese, romanised). A digit after a name is a variant of the same family (`mae3`).

| Part | Family | What it is | Tarven today (FaceShape) | Tarven has it? |
|---|---|---|---|---|
| Brows | `kiri` | sharp, determined | brow −0.3, browInner −0.4, browOuter +0.15 (`stern`) | yes |
| Brows | `koma` | troubled, worried, pleading: inner ends up | browInner +0.6…1, browOuter −0.6, browNear + | yes |
| Brows | `nico` | relaxed arch, smiling | brow +0.25, browArch +0.5 | yes |
| Brows | `oko` | angry, knitted down | angry: the sharp V the user drew (browInner −1.35, browOuter 1.55, browSpread 1.15…) | yes |
| Eyes | `mae` | open, looking ahead; `mae3` drooping | rest; mae3 ≈ lidUpper 0.35 | yes |
| Eyes | `jito` | half-lidded side-eye | lidUpper 0.45…0.6 | yes |
| Eyes | `toji` | closed | lidUpper 1, lidLower 0.4 | yes |
| Eyes | `oko` | angry, narrowed | lidUpper 0.3, lidLower 0.25 | yes |
| Eyes | `uru` | wet, glossy | needs an eye shine | **no** |
| Eyes | `namida` | crying, tears | needs tears | **no** |
| Eyes | `heart` | heart pupils | needs a heart eye shape | **no** |
| Mouth | `hu` | faint closed smile, "hmph" | smile +0.25…0.3 | yes |
| Mouth | `mu` | pressed shut, pouty | smile −0.2, press + | yes |
| Mouth | `ku` | gritted teeth, enduring | smile −0.6, open 0.12, bare + | yes |
| Mouth | `wa` | open, shocked, gasping | open 0.6…0.7 | yes, but bigger than KP's |
| Mouth | `ho` | small round "o", panting | open 0.3, round 1, purse + | yes |
| Mouth | `nico` | smile | smile 0.8, open 0.2 | yes |
| Mouth | `wara` | big grin, laughing | smile 1.15, open 0.8 | yes, but bigger than KP's |
| Mouth | `pero` | tongue out, playful | tongue 0.5, smile + | partly (no "teasing" preset) |
| Mouth | `ahe` | open, tongue out, gone | open 1, tongue 1, lookY 1 (`lost`) | yes |
| Extra | `hoppe` | cheek blush | blush 0…1 | yes |
| Extra | `sweat` 1/2 | a few drops / heavy | needs sweat drops | **no** |

The standby pose has only 8 brows, 11 eyes and 20 mouths in the normal stance. Sex poses add more: looking down /
up / aside eyes (`sita`, `ue`, `yoko`), `fera`, `chu`, `kiss` mouths (table in the appendix).

**What KP's parts look like, compared with Tarven's:** KP's mouths are small, even open (`wa`, `ahe` stay inside the
width of her nose-to-cheek). Its brows are thin lines that change angle more than height. Its eyes carry the most
detail (iris, shine, lids), where Tarven's eye is one dot.

## 3. Takeaways

1. **Stamina is the strongest dial.** Every row wears down left to right the same way: eyes `mae` → `mae3`/`toji`,
   brows `kiri` → `koma` (sharp to troubled), mouth closed (`hu`/`mu`) → `ku` gritted → `wa`/`ho` open, sweat 1 → 2.
   Being tired reads before being lewd does.
2. **Lewdness changes the kind of face, not its strength.** lv1 keeps her resisting (`oko`/`kiri` brows, `mu`/`ku`
   mouths, blush only). lv2 lets in `uru` wet eyes and `nico` smiles. lv3 brings `heart` eyes, `pero` tongue, `wara`
   grin and `ahe`. The same situation at a higher level is a different person.
3. **Few parts, many faces.** Brows carry the attitude, eyes how far gone she is, the mouth the moment. Blush and
   sweat are separate switches for any face.
4. **Confident stance = the same tree with new art:** more `jito` half-lids and `wara`/`nico` mouths. Attitude is a
   second axis over the situation.
5. **Pools stop it looking robotic.** Most presets have 2-4 options per part and re-roll on every hit or pose change,
   so the face twitches between close looks. One fixed face per state looks stiff.
6. **Blush is a gate, hearts are a reward.** Calm faces never blush; every aroused, horny and off-balance face does.
   Heart eyes appear only at horny lv3 and the top reaction faces (#43, #88, #85, #91): "fully gone" and nothing else.
7. **The masochist face is crying and smiling.** Off-balance lv3 (#34-36) is the only place `namida` tears are used,
   with `nico` smiles and `ahe`. Useful for the masochist Queen.
8. **Confident starts smug.** Normal calm starts on `hu`/`mu` (composed); confident calm on `wara`/`nico` (grinning),
   and when worn out slips into `jito` half-lids rather than closing her eyes.
9. **Reactions win over moods.** Something that just happened (harassed, came on, she stared) overrides the mood face
   for that moment, then the mood face comes back.

## 4. Tarven now, against KP

How Tarven picks her face (`face.ts`): a reaction to a touch first, then a moment (tip, walk-out, refusal), then what
she's in the middle of (after-hours game, showing a guest, a brawl); otherwise her **bearing** from Slut Level (stern →
neutral → confident) with her state blended over it: tired as willpower runs out, embarrassed as clothes come off,
drunk, aroused. 22 fixed expressions; brawls use part pools (`fightface.ts`).

| KP idea | Tarven | Gap |
|---|---|---|
| Reactions first, then mood | same order (`leading`) | none |
| Two stances (normal / confident) | bearing by Slut Level | none in spirit |
| Stamina wears the face down in steps | one `tired` blend below half willpower | no gritted middle step (`ku`), no closing eyes, no sweat |
| Lewd level changes the kind of face | Slut Level moves bearing; reactions change at `BEARING.confident` | mood faces don't get wet eyes / smiles / hearts by level |
| Random pools per preset | only in brawls | everyday faces are one fixed shape each |
| Calm never blushes | `blush` 0 at calm, but the face mesh has pink cheeks painted in | her resting face still looks flushed |
| Small mouths | open mouths reach `open` 0.7-1 | `surprised`, `drunk`, `delighted`, `panting` read much bigger |
| Wet eyes, tears, heart eyes, sweat | none | needs separate eye pieces (see `art/face_expressions.blend` notes) and sweat |

## 5. What to change in Tarven (proposals)

In rough order of payoff for the work:

1. **Stamina steps for her everyday face** (KP's calm row): fresh = composed; mid = brows harder, mouth set (`mu`);
   low = troubled brows (`koma`), gritted (`ku`), eyes drooping; spent = eyes closing, mouth open (`wa`). Tarven's
   willpower is the stamina here.
2. **Pools for everyday faces**: each expression gets 2-3 close variants (brow, mouth), re-picked when her face
   changes, as `fightface.ts` already does for brawls.
3. **Smaller open mouths** to KP's size: lower the `open` values of `surprised`, `drunk`, `delighted`, `panting`,
   `overwhelmed`, `edge`, `lost`, or scale the jaw reach.
4. **No blush at rest**: her painted cheek pink only at `blush` > 0.
5. **Lewd level changes the kind of face**: at higher Slut Level, aroused/showing faces lean to smiles and half-lids
   (`jito`), not just stronger versions.
6. **New eye art** (needs the separate eye pieces, "step B"): wet-eye shine (`uru`), tears (`namida`), heart pupils,
   and sweat drops tied to willpower.

## 6. Done so far

- 19 Nov: `angry` reshaped by hand in `art/face_expressions.blend` (sharp V brows flaring up and out, mouth a little
  higher) and fitted into `face.ts`; new controls `browSpread` and `mouthUp`. Outer brow ends are thinner than drawn:
  the rig can't thicken a brow.
- 19 Nov, from §5 (proposals 1-4):
  - **Mouth size** (proposal 3): measured, Tarven's open mouths were *not* bigger than KP's (mouth height ÷ eye-to-chin:
    KP `wa` 0.41-0.49, Tarven `surprised` 0.23). The real difference was her whole chin dropping, so her face grew up
    to 27% longer. Now the drop fades below her lower lip to a quarter at her chin (`FACE_REACH.jawLip`,
    `jawChinShare`, `jawDepthShare`): her mouth opens inside her face. Wide open, the skin under her lip bunches a
    little.
  - **Stamina steps** (proposal 1): `STAMINA_STEPS`, willpower 0.8 → 0: bearing → `set` (KP mu) → `gritted` (ku) →
    `tired` → `spent` (koma, toji, wa). Lewd and confident, she wears down only 70% of the way and keeps her smirk.
  - **Variants** (proposal 2): `VARIANTS`, two close variants per expression, re-picked when her expression changes
    and every 5-9 s (`game.ts` FACE_VARIANT_EVERY). Not in brawls (their own pools). `angry`'s touch only her mouth.
  - **No blush at rest** (proposal 4): her cheek and nose-tip planes are her skin's colour until she blushes
    (`appearance.ts` BLUSH_RESTS_AS).
  - New expressions `set`, `gritted`, `spent` aren't in `art/face_expressions.blend` yet.
- 19 Nov, anime eyes (proposal 6's base): each eye is now layered pieces in front of the socket
  (`build_world.py` add_anime_eyes, materials `T_eye_*`): white, iris with a darker top, pupil, two shines, upper and
  lower eyelids in her skin framing the opening, and a thick upper lash line with a wing plus a thin lower one.
  - The game closes her lids by moving their edges (`face.ts` eyeMove, EYE_OPENING mirrors the build's EYE_SHAPE),
    slides the iris behind them to look about (along each eye's sloped plane: her sockets turn back steeply), and grows
    or shrinks the pupil (new control `pupil`; wider with arousal and drink, `WIDE_PUPILS`).
  - `game.ts` adds blinks (sooner when nervous, slower drunk or worn out) and glances on top (`BLINK`, `GLANCE`).
  - Eye colour in the customizer dyes the iris, its top and the pupil (`HER_EYE_COLORS`, with violet, red, gold).
- 19 Nov, later: the eyes made 15% bigger (`EYE_SCALE`, the user's ask) and given 3D (the user: "anime eye, but 3D"):
  an eyeball dome out of the socket shaped to the opening (`EYE_DOME`, mirrored in face.ts so what moves stays on it),
  the round pieces filled with rings so they curve, lashes and lids built as quad strips, and the upper lid's shadow
  on the white (`T_eye_shade`, moving with the lid). Front-on they read as before; at an angle they're a ball.
- 19 Nov, KP's extras: wet eyes (`wet`: a pale band and two sparkles on the iris, on as she's aroused once at ease),
  tears (`tears`: `strained`, `overwhelmed`), heart pupils (`heart`: confident, aroused 0.8+, in a pleasure face only)
  and sweat (`sweat`: as her willpower runs low, in brawls and games; KP's sweat 1 and 2), each a piece that shows past
  `FACE_EXTRAS` (appearance.ts EXTRA_MATERIALS).
- `art/face_expressions.blend` rebuilt from the game (`tools/facepreview/build_face_blend.py`) with all of this: the
  old one (dot eyes, the user's hand-drawn `angry`) is kept as `art/face_expressions_v1.blend`.

- 21 Nov, **shape keys instead of code** (the user asked for the KP way: eye keys and mouth keys, combined in the game).
  A face is now one expression's brows, eyes and mouth, each a shape key (`Brow_angry`, `Eye_tired`, `Mouth_panting`...),
  sculpted in `art/female_face_keys.blend` and played as morph targets (face.ts `FaceShape` = a weight per expression per
  part, plus blink, look, pupil and the drawn extras). `VARIANTS` are KP-style pool picks now: a part, or half of one,
  from a close expression (angry's: half `set`'s or half `gritted`'s mouth). Brawl faces (fightface.ts) were already
  built from parts, so they take keys directly. Blinks and heavy lids are the `Blink` key over her eyes' own.
  - The first keys came from the old rig: brows and mouths are exactly what the game showed before. `Eye_*` and
    `Blink` are empty, because the old rig couldn't close her real_heroin lids (her face skin), and they need sculpting.
    `Look_*` turn the eyeballs, and `Pupil_*` are the master eyes' own keys.
  - The old rig's open mouths look boxy on her new face (`panting`, `delighted`, `surprised`): the first thing to sculpt.

## Appendix: every KP standby face

Generated from the study sheet's `data.js`. "Looks" counts the distinct faces the pools can make.

### Normal stance (ids 1-43, 86-88)

| Situation | # | Stamina / level | Brows | Eyes | Mouth | Blush | Sweat | Looks |
|---|---|---|---|---|---|---|---|---|
| Calm | 1 | 100-81% | kiri1 | mae1 | hu1, hu2 |  |  | 2 |
|  | 2 | 80-61% | kiri1, oko1 | mae1 | mu1, mu2 |  |  | 4 |
|  | 3 | 60-41% | kiri1, oko1 | mae1, mae2 | ku1, ku2 |  | 1 | 8 |
|  | 4 | 40-21% | koma1, oko2 | mae3, mae2 | ku3, ku2, wa1 |  | 2 | 12 |
|  | 5 | 20-0% | koma2 | mae3, toji1 | ku3, wa2 |  | 2 | 4 |
| Aroused · lv1 | 6 | 100-81% | koma1, oko1 | mae1 | mu3, ho1 | yes |  | 4 |
|  | 7 | 80-61% | koma1, oko2 | mae1 | mu2, ho1 | yes |  | 4 |
|  | 8 | 60-41% | koma1, oko2 | mae2 | ku1, wa1 | yes | 1 | 4 |
|  | 9 | 40-21% | koma2 | mae3, uru2 | ku2, ku3 | yes | 2 | 4 |
|  | 10 | 20-0% | koma2 | toji1 | wa2, wa3 | yes | 2 | 2 |
| Aroused · lv2 | 17 | 100-81% | koma1, oko1 | mae1 | hu2, ho2 | yes |  | 4 |
|  | 18 | 80-61% | koma1, oko2 | mae1, uru1 | mu3, mu4 | yes |  | 8 |
|  | 19 | 60-41% | koma1, oko2 | uru2 | ku1, mu2 | yes | 1 | 4 |
|  | 20 | 40-21% | koma2 | mae3, uru2 | ku3, mu1 | yes | 2 | 4 |
|  | 21 | 20-0% | koma2 | toji2 | wa1, ho1 | yes | 2 | 2 |
| Aroused · lv3 | 28 | 100-81% | kiri1, kiri2 | uru1 | nico2, nico1, pero1 | yes |  | 6 |
|  | 29 | 80-61% | kiri1, oko2 | uru1, mae1 | ho2, ho1 | yes |  | 8 |
|  | 30 | 60-41% | oko1, oko2 | uru2 | hu1, hu2 | yes | 1 | 4 |
|  | 32 | 40-21% | koma1 | uru2, mae3 | ku1, mu3 | yes | 2 | 4 |
|  | 33 | 20-0% | koma2 | toji2, mae3 | wa3 | yes | 2 | 2 |
| Off-balance · lv1 | 11 | 100-61% | oko1 | mae1 | ku1, ku2 | if aroused | 1 | 2 |
|  | 12 | 60-21% | koma1 | mae2, mae3 | ku3, ku2 | if aroused | 2 | 4 |
|  | 13 | 20-0% | koma2 | toji1, mae3 | wa2 | if aroused | 2 | 2 |
| Off-balance · lv2 | 22 | 100-61% | koma1, kiri2 | mae2 | ho1, ho2 | if aroused | 1 | 4 |
|  | 23 | 60-21% | koma1, koma2 | mae3 | hu2, mu3 | if aroused | 2 | 4 |
|  | 24 | 20-0% | koma2 | toji2, mae3 | ku1, wa2 | if aroused | 2 | 4 |
| Off-balance · lv3 | 34 | 100-61% | koma1, koma2 | namida1 | nico1, nico2 | yes | 1 | 4 |
|  | 35 | 60-21% | koma1, koma2 | namida2 | ahe2, nico2 | yes | 2 | 4 |
|  | 36 | 20-0% | koma2 | toji2, namida2 | ahe1, ku2 | yes | 2 | 4 |
| Horny · lv1 | 14 | 100-61% | kiri2 | mae1 | hu2, ho1 | yes |  | 2 |
|  | 15 | 60-21% | oko1, oko2 | mae2 | hu2, hu1 | yes | 1 | 4 |
|  | 16 | 20-0% | koma2, oko2 | mae3 | wa3 | yes | 2 | 2 |
| Horny · lv2 | 25 | 100-61% | nico1 | uru1 | pero1, nico2 | yes |  | 2 |
|  | 26 | 60-21% | koma2 | uru2 | hu1, nico1 | yes | 1 | 2 |
|  | 27 | 20-0% | koma2 | mae3, toji1 | ahe1, ho2 | yes | 2 | 4 |
| Horny · lv3 | 37 | 100-61% | nico1, nico2 | heart2 (kept when messy) | pero2, ahe1, nico2 | yes |  | 6 |
|  | 38 | 60-21% | kiri2, oko2 | heart2 (kept when messy) | pero1, ahe2 | yes | 1 | 4 |
|  | 39 | 20-0% | koma2 | heart2 (kept when messy) | ahe1, ahe2, ho1 | yes | 2 | 3 |
| She stares / pets | 40 | stare lv0 | oko1, oko2 | mae1 | ku3, wa2, wa3 |  | 2 | 6 |
|  | 41 | lv1 | koma1, koma2 | mae2 | ku1, wa1, wa2 |  | 1 | 6 |
|  | 42 | lv2 | nico1, nico2 | mae1, mae2 | ho1, ho2, hu2, wa1 | yes |  | 16 |
|  | 43 | lv3 | nico1, nico2, koma2 | heart1, heart2 | pero1, pero2, ahe2, nico2 | yes |  | 24 |
| Harassed / bukkake | 86 | lv1 | koma2, koma1, oko1, oko2 | mae3, toji1 | wa2, wa3, ku1, ku2, ku3 | yes | 2 | 36 |
|  | 87 | lv2 | koma2, koma1, oko1, oko2 | uru1, uru2, mae3, toji2 | wa2, wa3, wa1, ahe1, ho1 | yes | 1 | 36 |
|  | 88 | lv3 | koma2, koma1, nico1, nico2 | uru1, uru2, heart1, heart2, mae3, toji1 | ahe1, ahe2, nico1, ho2, wa3 | yes |  | 36 |

### Confident stance (ids 44-85, 89-91)

| Situation | # | Stamina / level | Brows | Eyes | Mouth | Blush | Sweat | Looks |
|---|---|---|---|---|---|---|---|---|
| Calm | 44 | 100-81% | kiri1, kiri2 | mae1, mae2 | wara1, wara2 |  |  | 8 |
|  | 45 | 80-61% | kiri1, kiri2 | mae1, mae2 | nico1, nico2, nico3 |  |  | 12 |
|  | 46 | 60-41% | kiri1, kiri2 | mae1, mae2 | ho1, ho2 |  | 1 | 8 |
|  | 47 | 40-21% | oko1, koma1 | jito1, mae2 | mu3, ho2 |  | 2 | 8 |
|  | 48 | 20-0% | koma2, koma1 | jito1, jito2, toji2 | ho3, wa1, ku1 |  | 2 | 18 |
| Aroused · lv1 | 49 | 100-81% | kiri2, kiri1 | mae1 | nico1, nico2 | yes |  | 4 |
|  | 50 | 80-61% | kiri2, kiri1, kiri3 | mae1, mae2 | mu2, mu3, wa1 | yes |  | 18 |
|  | 51 | 60-41% | oko1, oko2 | mae1, mae2 | ho1, ho2 | yes | 1 | 8 |
|  | 52 | 40-21% | oko1, oko2 | oko1, jito1 | ku1, wa1, wa2 | yes | 2 | 12 |
|  | 53 | 20-0% | koma3 | toji2, jito2 | mu1, ku2 | yes | 2 | 4 |
| Aroused · lv2 | 60 | 100-81% | kiri1, kiri2 | mae1, mae2 | wara1, nico3 | yes |  | 8 |
|  | 61 | 80-61% | koma1, oko1 | jito1, mae2 | nico1, nico2 | yes |  | 8 |
|  | 62 | 60-41% | oko2, oko1 | uru2 | ho1, mu3 | yes | 1 | 4 |
|  | 63 | 40-21% | koma2, koma3 | uru2 | mu1, wa1 | yes | 1 | 4 |
|  | 64 | 20-0% | koma2, koma3 | jito2 | ku1, ku2, ahe1 | yes | 2 | 6 |
| Aroused · lv3 | 71 | 100-81% | kiri1, kiri3, nico1, nico2 | uru1, uru2 | pero1, nico4, nico3 | yes |  | 24 |
|  | 72 | 80-61% | kiri1, kiri2, kiri3 | uru1, uru2 | pero2, nico1, nico2 | yes |  | 18 |
|  | 73 | 60-41% | oko1, oko2 | oko1, uru2 | wara1, wara2 | yes | 1 | 8 |
|  | 74 | 40-21% | koma1 | jito1, uru2 | ahe3, ho3 | yes | 1 | 4 |
|  | 75 | 20-0% | nico1, nico2 | jito2, toji2 | ho1, mu2, mu3 | yes | 2 | 12 |
| Off-balance · lv1 | 54 | 100-61% | kiri1, kiri2 | mae1 | wara1, nico1 | if aroused | 1 | 4 |
|  | 55 | 60-21% | koma1, kiri2 | mae2, jito1 | wa1, ho2 | if aroused | 1 | 8 |
|  | 56 | 20-0% | koma1 | jito2 | wa2, ku2 | if aroused | 2 | 2 |
| Off-balance · lv2 | 65 | 100-61% | kiri3, nico1 | mae2, uru2 | wara2, nico3 | if aroused | 1 | 8 |
|  | 66 | 60-21% | kiri1, kiri2 | uru2 | nico1, ho1 | if aroused | 1 | 4 |
|  | 67 | 20-0% | koma1, koma3 | toji1, jito2 | ho2, ho3 | if aroused | 2 | 8 |
| Off-balance · lv3 | 76 | 100-61% | koma2, kiri3 | uru2 | ahe2, ahe3 | yes | 1 | 4 |
|  | 77 | 60-21% | koma2 | uru2 | pero2, nico4 | yes | 1 | 2 |
|  | 78 | 20-0% | koma3 | toji2, toji1 | wa1, wara1, ahe1 | yes | 2 | 6 |
| Horny · lv1 | 57 | 100-61% | kiri1, kiri3 | mae2 | wara2, nico3 | yes |  | 4 |
|  | 58 | 60-21% | kiri2, koma1 | mae2, jito1 | nico2, nico1 | yes | 1 | 8 |
|  | 59 | 20-0% | oko1 | uru2 | wa1, ho3 | yes | 2 | 2 |
| Horny · lv2 | 68 | 100-61% | kiri1, kiri3 | uru1 | pero1, pero2 | yes |  | 4 |
|  | 69 | 60-21% | kiri2, nico2 | uru2 | ahe1, nico1 | yes | 1 | 4 |
|  | 70 | 20-0% | koma2 | jito1 | nico1, ho4 | yes | 2 | 2 |
| Horny · lv3 | 79 | 100-61% | kiri1, kiri3 | heart3 (kept when messy) | pero1, pero2, ahe2 | yes |  | 6 |
|  | 80 | 60-21% | kiri2, koma1 | heart1 (kept when messy) | nico4, wara2 | yes | 1 | 4 |
|  | 81 | 20-0% | koma2, koma3 | heart2 (kept when messy) | ahe1, ahe3, ho4 | yes | 2 | 6 |
| She stares / pets | 82 | stare lv0 | oko1, oko2 | oko1, mae1, jito1 | wa2, ku2, ho3, mu3 |  | 2 | 24 |
|  | 83 | lv1 | kiri1, kiri2, koma1, koma2 | mae2, mae1, jito1 | ho1, wa1, mu3 |  | 1 | 36 |
|  | 84 | lv2 | nico1, nico2 | mae2, uru2, jito1 | nico1, ho1, ho3, ho4, wa1 | yes |  | 30 |
|  | 85 | lv3 | nico1, nico2, koma1, koma2, kiri3 | heart1, heart2, heart3 | pero2, ahe2, ahe3, nico4, wara1 | yes |  | 36 |
| Harassed / bukkake | 89 | lv1 | koma2, koma1, koma3, oko1, oko2 | jito1, jito2, toji2, oko1 | wa2, ho3, ho4, ku1, ku2 | yes | 2 | 36 |
|  | 90 | lv2 | koma2, koma1, koma3, oko1, oko2 | uru1, jito2, uru2, toji1 | wa1, ho3, ho4, wa2, ahe1 | yes | 1 | 36 |
|  | 91 | lv3 | koma2, koma1, nico1, nico2 | uru1, heart1, uru2, heart2, heart3, toji2, jito2 | ahe1, ahe2, ahe3, nico4, ho4, pero2 | yes |  | 36 |

### Face part families in other poses

| Pose | Brows | Eyes | Mouth |
|---|---|---|---|
| attack | - (0) | - (7) | - (10) |
| bj_kneeling | kiri, koma, nico, oko (7) | ahe, heartahe, heartsita, heartue, heartyoko, sita, toji, ue, urusita, uruue, uruyoko, yoko (24) | fera (6) |
| cowgirl_karryn | kiri, koma, nico (6) | ahe, heartmae, heartsita, mae, sita, toji, urumae, urusita (14) | ahe, fera, ho, nico, pero (18) |
| cowgirl_lizardman | hu, kiri, koma, ku, nico, oko (11) | ahe, heart, mae, sage, toji, yoko (16) | chu, gugi, ho, name, nico, wa (19) |
| defeated_guard | kiri, koma, nico, oko (7) | ahe, heartahe, heartsita, sita, toji, urusita (11) | ahe, ho, ku, mu, nico, wa (16) |
| defeated_level1 | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, heartsita, mae, sita, toji, urumae, urusita (20) | ahe, cum, fera, ho, ku, mu, nico, wa (24) |
| defeated_level2 | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, heartyoko, mae, toji, urumae, uruyoko, yoko (15) | ahe, ho, ku, mu, nico, pero, wa (19) |
| defeated_level3 | kiri, koma, nico, oko (6) | ahe, heartmae, mae, toji, urumae (9) | ahe, chu, fera, ho, ku, nico, pero, wa (22) |
| defeated_level4 | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, heartyoko, mae, toji, urumae, uruyoko, yoko (16) | ahe, fera, ho, ku, mu, nico (20) |
| defeated_level5 | kiri, koma, nico, oko (7) | ahe, heartahe, heartleft, heartmae, heartright, left, mae, right, toji, uruleft, urumae, ururight (24) | ahe, ho, ku, mu, nico, pero, wa (26) |
| defend | - (0) | - (7) | - (13) |
| down_falldown | kiri, koma, ku, nico, oko (8) | heart, mae, toji, uru (9) | ahe, au, gugi, mu, nico, pero, wa (16) |
| down_stamina | kiri, koma, nico, oko (7) | camera, heart, toji, uru (8) | ahe, ho, ku, mu, nico, pero, wa, wara (18) |
| evade | - (0) | - (6) | - (12) |
| footj | kiri, koma, nico, oko (14) | ahe, heartahe, heartmae, heartyoko, mae, toji, urumae, uruyoko, yoko (34) | ahe, fera, ho, ku, mu, nico, wa (21) |
| goblin_cl | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, heartsita, mae, sita, toji, urumae, urusita (15) | ahe, fera, ho, ku, nico, wa (17) |
| guard_gb | koma, nico, oko (6) | ahe, heartahe, heartsita, heartyoko, sita, toji, urusita, uruyoko, yoko (17) | ahe, fera, ho, ku, nico, wa (19) |
| gym_fera | kiri, koma, nico, oko (14) | ahe, heartahe, heartmae, mae, toji, urumae (20) | ahe, chu, fera, ho, mu, nico, pero, wa (32) |
| gym_kisu | kiri, koma, nico, oko (14) | ahe, heartahe, heartmae, mae, toji, urumae (22) | ahe, bero, chu, ho, mu, nico, pero, re, wa (36) |
| gym_paizuri | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, mae, toji, urumae (10) | ahe, ho, ku, mu, nico, pero, wa (22) |
| gym_rinkan | kiri, koma, nico, oko (14) | ahe, heartahe, heartmae, heartyoko, mae, toji, urumae, uruyoko, yoko (25) | ahe, chu, ho, ku, nico, wa (26) |
| gym_tekoki | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, heartsita, mae, sita, toji, urumae, urusita (17) | ahe, ho, ku, mu, nico, pero, wa (26) |
| hj_standing | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, heartyoko, mae, toji, urumae, uruyoko, yoko (17) | ahe, ho, ku, mu, nico, pero, wa, wara (17) |
| kick | - (0) | - (7) | - (10) |
| kick_counter | kiri, koma, nico, oko (16) | ahe, heartahe, heartmae, heartue, heartyoko, mae, toji, ue, urumae, uruue, uruyoko, yoko (38) | ahe, ho, kiss, ku, nico, pero, wa (17) |
| map | kiri, koma, nico, oko (18) | ahe, drunk, heartyoko, mae, oko, sita, sitayoko, toji, urumae, uruyoko, yoko (30) | ahe, be, ho, ku, mu, nico, pero, wa, wara (41) |
| mas_couch | kiri, koma, nico, oko (14) | ahe, heartahe, heartmae, mae, toji, urumae (20) | ahe, chu, ho, ku, mu, nico, wa (33) |
| mas_inbattle | kiri, koma, nico, oko (10) | ahe, heartmae, mae, toji, urumae (10) | ahe, chu, ho, hu, ku, nico, pero, wa (20) |
| orc_paizuri | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, left, mae, right, toji, uruleft, urumae, ururight (20) | ahe, cum, fera, ho, ku, mu, nico, pero, wa (24) |
| paizuri_laying | kiri, koma, nico, oko (7) | ahe, heartahe, heartsita, left, right, sita, toji, uruleft, ururight, urusita (20) | ahe, chu, fera, ho, ku, nico, wa (26) |
| receptionist | kiri, koma, nico, oko, sita (10) | ahe, mae, nico, sita, toji (10) | ahe, ho, kiss, ku, mu, nico, wa (22) |
| rimming | kiri, koma, nico, oko (7) | ahe, heartahe, heartsita, heartyoko, sita, toji, urusita, uruyoko, yoko (17) | yodare (1) |
| slime_piledriver | kiri, koma, nico, oko (7) | ahe, heartahe, heartsita, sita, toji, urusita (10) | ahe, fera, ho, ku, mu, nico, wa (22) |
| standby | kiri, koma, nico, oko (18) | heart, jito, mae, namida, oko, toji, uru (23) | ahe, ho, hu, ku, mu, nico, pero, wa, wara (42) |
| stripper_boobs | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, mae, toji, urumae (10) | ahe, ho, hu, ku, mu, nico, pero, wa (22) |
| stripper_butt | kiri, koma, nico, oko (7) | ahe, heartahe, heartyoko, toji, uruyoko, yoko (9) | ho, ku, mu, nico, wa (12) |
| stripper_mouth | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, mae, toji, urumae (10) | chu, fera, ho, ku, mu, nico, pero, suck, wa (23) |
| stripper_pussy | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, mae, toji, urumae (10) | ahe, ho, hu, ku, nico, pero, wa (21) |
| stripper_vip | kiri, koma, nico, oko (14) | ahe, heartahe, heartleft, heartmae, heartright, heartsita, left, mae, right, sita, toji, uruleft, urumae, ururight, urusita (39) | ahe, ho, ku, mu, nico, pero, wa (25) |
| thug_gb | kiri, koma, nico, oko (7) | ahe, heartahe, heartleft, heartright, heartsita, left, right, sita, toji, uruleft, ururight, urusita (24) | ahe, chu, fera, ho, ku, nico, pero, wa (27) |
| toilet_sit_left | kiri, koma, nico, oko (8) | ahe, heartahe, heartmae, heartsita, mae, sita, toji, urumae, urusita (17) | ah, ahe, be, hard, ho, ku, nico, pero, rero, soft (25) |
| toilet_sit_right | kiri, koma, nico, oko (8) | ahe, heartahe, heartmae, heartsita, mae, sita, toji, urumae, urusita (17) | ah, ahe, be, hard, ho, ku, nico, pero, rero, soft (25) |
| toilet_sitting | fu, koma, nico, oko (13) | heart, heartahe, heartleft, heartright, heartsita, left, mae, right, sita, toji, uruleft, ururight, urusita (25) | ahe, fu, ho, ku, mu, nico, pero, wa (30) |
| toilet_stand_left | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, heartsita, heartyoko, mae, sita, toji, urumae, urusita, uruyoko, yoko (21) | ah, ahe, hard, ho, ku, nico, pero, soft (21) |
| toilet_stand_right | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, heartsita, heartyoko, mae, sita, toji, urumae, urusita, uruyoko, yoko (21) | ah, ahe, hard, ho, ku, nico, pero, soft (21) |
| unarmed | kiri, koma, nico, oko (9) | camera, heart, jito, toji, uru (10) | ahe, ho, ku, mu, nico, pero, wa, wara (23) |
| waitress_table | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, heartsita, heartyoko, mae, sita, toji, urumae, urusita, uruyoko, yoko (24) | ahe, chu, fera, ho, ku, mu, nico, pero, straw, wa (31) |
| werewolf_back | koma, nico, oko (6) | ahe, heartahe, heartmae, heartyoko, mae, toji, urumae, uruyoko, yoko (19) | ahe, chu, fera, ho, ku, nico, pero (20) |
| yeti_carry | kiri, koma, nico, oko (7) | ahe, heartahe, heartmae, heartsita, mae, sita, toji, urumae, urusita (15) | ahe, ho, kiss, ku, nico, pero (14) |
| yeti_paizuri | kiri, koma, nico, oko (14) | ahe, heartahe, heartmae, heartsita, mae, sita, toji, urumae, urusita (30) | ahe, fera, fu, ho, ku, nico (15) |
