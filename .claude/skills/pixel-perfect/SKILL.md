---
name: pixel-perfect
description: Keep Tarven's 3D look crisp, retro pixel art, following Red Giraffe's "The Secret to Crisp 3D Pixel Art Rendering | Pixel Perfect" video (a point-filtered low-res pass, then snapping colours to a hand-picked palette in a perceptual colour space, CIE Lab or OKLab) mapped onto Tarven's own screen pipeline (src/game/retro.ts RetroPipeline and the 5-bit comic/portrait/battle screens). Use when the user says the game looks blurry, muddy, smeared, too smooth or "not pixel art enough", asks about resolution, pixel size, pixel scaling, dithering, colour banding, colour depth, a limited palette, a colour palette per place, time of day or mood, a palette swap, or "crisp pixels"; or when changing retro.ts, the post pass, or a screen drawn small and scaled up.
---

# Pixel perfect

How to make a 3D scene read as real pixel art and not just a blurry low-res picture, from a video the user picked,
and how each step maps onto how Tarven already draws its screen. **Most of the first half is already in the game.
The second half (palette snapping) isn't yet.**

## The video

Red Giraffe, "The Secret to Crisp 3D Pixel Art Rendering | Pixel Perfect" (Ep. 1, 11:43, Feb 2026),
<https://www.youtube.com/watch?v=Mp7eQsiZ_wA>. It's done in Unity URP, but nothing in it depends on Unity. It solves two
problems: the **grid problem** and the **colour problem**.

**Why 3D at all (1:38):** after a model is built you can light it, animate it and turn it freely: no sprite for every
angle, light that follows time of day, real shadows. Tarven relies on this (3/4 camera, lamplight, skinned characters).

**1. The grid problem (2:10 to 5:15)**
- Bilinear filtering samples the four nearest texels and blends them. That melts hard edges into gradients and makes
  colours the art never had. Rendering small and stretching it to the screen is **not** pixel art: it comes out blurry.
- The fix is a two-step pass, run after the solid geometry is drawn and before anything rebuilds the picture:
  1. **Draw the scene into a small render target with point (nearest) filtering**, so each low-res pixel holds
     exactly one colour.
  2. **Scale that buffer up to the screen with a point-clamp sampler**, so each texel becomes an even block of screen
     pixels. A checkerboard stays a checkerboard, with no muddy in-between colours.
- Result (5:01): edges between objects are crisp, colours don't bleed, meshes stay readable even at very low
  resolution. **But it still doesn't *feel* like pixel art.** That comes from the colours.

**2. The colour problem (5:24 to 11:00)**
- Classic pixel art used a **limited palette** (the NES could show 54 colours, 25 at once). One brown did the work of
  earth, shadow and skin. Modern pixel art picks **16 or 32 colours** on purpose: it holds the art together, sets the
  mood and keeps hundreds of assets consistent.
- So **quantize**: map every lit, shaded output pixel to the *nearest colour in a hand-picked palette*. Clamping or
  stepping RGB isn't enough.
- **Don't measure "nearest" in RGB.** Treating RGB as a cube and taking the Euclidean nearest neighbour is correct
  maths but wrong for the eye. The eye is far more sensitive to green than to blue, equal RGB steps aren't equal
  visible steps, and RGB ignores lightness sensitivity and hue non-linearity. That hurts pixel art most, because small
  contrasts and hue shifts carry the shapes.
- **Measure it in CIE Lab** (L = lightness, a = green to magenta, b = blue to yellow): sRGB, then linear, then
  XYZ, then Lab. It costs more per pixel, but it runs in parallel on the GPU. The video's description names
  **OKLab**, a newer space that does the same job more cheaply, with steadier hues. In the side-by-side (10:05),
  the Lab result looks the most deliberate, a big step up from RGB, with a few pixel choices still debatable,
  which comes with doing it in 3D.
- **The palette is data, not art (10:31):** once quantizing is maths, the game's colour identity is a small array on
  the GPU. Swap the array and the whole picture changes mood with no asset touched.
- Next episodes (11:11): extra passes for **outlines, lighting, reflections**.

## What Tarven already does (src/game/retro.ts)

| Video step | Tarven today |
| --- | --- |
| Low-res render target, point filter | `RetroPipeline.target`: `WebGLRenderTarget`, `NearestFilter`, `HalfFloatType` (so it holds **linear** colour) |
| Point-clamp upscale | Post pass reads `texelFetch(tScene, ivec2(gl_FragCoord.xy / uScale))`: no sampler, no blending at all |
| Even pixel blocks | `resize()`: `scale = round(screenHeight / RETRO_HEIGHT)`, a **whole number** of screen pixels per game pixel |
| Crisp textures | `makeTextureRetro()`: every map gets `NearestFilter`, no mipmaps, anisotropy 1 |
| (extra, PS1) | Vertex snapping to a `SNAP_HEIGHT` grid (540) in `withPs1Rasterizer`; affine textures exist but are off (`AFFINE_TEXTURES`) |
| Colour quantizing | **Not a palette.** Per-channel steps: `COLOR_LEVELS = 63` (6-bit) with a 4x4 Bayer dither in sRGB |
| Outlines (next ep.) | `src/game/outline.ts`: inverted-hull outline material |

Other screens drawn small and scaled up do their own colour, on the CPU: `comic.ts`, `portraits.ts`, `battleview.ts`
and `touchcomic.ts` each have `LEVELS = 31` (5-bit) and the same `BAYER4`. `cg.ts` dithers between hand-picked colours,
and `skydial.ts` bands the sky in 5-bit steps. Their comments say they match "the game's dithered screen", which is now
63 levels: keep them in step with whatever the main screen does.

**Settings the user has already chosen. Don't undo them without asking:** the user said the game looked
**blurry** and wanted it **crisp, PS1 style but higher quality** (memory: tarven-game-direction). `RETRO_HEIGHT` is now
720 and the colour is 6-bit, so the dither is faint. Lowering the resolution or the colour depth is a look change: show
the user before and after.

## Where to work

### The grid: keep it sharp
- Never sample the low-res target with `texture()` or a linear filter. Keep `texelFetch`, or `NearestFilter` with
  integer coordinates.
- Any new screen drawn small (a canvas, a render target, a portrait) must use `NearestFilter`, no mipmaps, a whole-number
  scale and CSS `image-rendering: pixelated` (as in `src/styles/base.css`). A non-integer scale gives uneven pixel
  widths, which read as shimmer when the camera moves.
- UI text and icons over the game shouldn't be blurred by the same scale. Keep them crisp at their own size.
- If the camera moves in sub-pixel steps, edges crawl. If the user complains about that, snapping the camera to the
  low-res grid is the known fix (not covered in this video).

### The colour: palette snapping (the part not built yet)
Do it in `RetroPipeline`'s post fragment shader, where the colour is already linear (HalfFloat target), so you skip the
sRGB-to-linear step on the GPU:

```glsl
uniform vec3 uPaletteLab[64];   // OKLab, worked out once on the CPU when the palette changes
uniform vec3 uPaletteSrgb[64];  // the same colours as shown on screen
uniform int uPaletteSize;        // 0 = off: keep today's per-channel levels
uniform float uDitherL;          // lightness dither, about half the L gap between palette neighbours; 0 = none

vec3 linearToOklab(vec3 c) {
  vec3 lms = mat3(0.4122214708, 0.2119034982, 0.0883024619,
                  0.5363325363, 0.6806995451, 0.2817188376,
                  0.0514459929, 0.1073969566, 0.6299787005) * c;   // column-major
  lms = pow(max(lms, 0.0), vec3(1.0 / 3.0));
  return mat3(0.2104542553, 1.9779984951, 0.0259040371,
              0.7936177850, -2.4285922050, 0.7827717662,
              -0.0040720468, 0.4505937099, -0.8086757660) * lms;
}

// in main(), instead of the per-channel step when uPaletteSize > 0:
vec3 lab = linearToOklab(clamp(scene, 0.0, 1.0));
lab.x += threshold * uDitherL;       // optional: Bayer dither on lightness only, keeps hues clean
float best = 1e9; int pick = 0;
for (int i = 0; i < 64; i++) {
  if (i >= uPaletteSize) break;
  vec3 d = lab - uPaletteLab[i];
  float dist = dot(d, d);
  if (dist < best) { best = dist; pick = i; }
}
gl_FragColor = vec4(uPaletteSrgb[pick], 1.0);
```

- Keep the drunk ripple **before** the snap (it already samples `tScene` first), so the wobble stays on the palette too.
- Keep a switch (`uPaletteSize = 0`) to the current 63-level path, so the old look is one value away.
- **Palette swaps are the payoff:** one palette per place (tavern lamplight, the street at night, Mara's farm), per
  time of day (`time.ts`, `skydial.ts`) or per mood or event. Swap the uniforms; no models change. Ease between two
  palettes by snapping to both and picking with the Bayer threshold, not by blending colours (blending makes
  off-palette colours).

**Risks specific to Tarven. Check every one before shipping a palette:**
- **Customizer colours.** `appearance.ts` offers `SKIN_TONES`, `HAIR_COLORS`, `CLOTH_COLORS`, `LIP_COLORS` and so on.
  A small global palette merges many of them into one on screen (in the test, her yellow shoes went beige with 16
  colours taken from the picture). Either build the palette to include a ramp for each choice (dark, mid, light), use
  more colours (48 to 64), or keep characters out of the snap.
- **Skin.** The skin glow (`SKIN_GLOW` sheen, rim and gloss) and the painted skin detail (`skindetail.ts`) are subtle
  gradients. Too few skin colours turns them into hard bands or loses them. Give skin its own ramp of about 5 or 6 colours.
- **Cloth folds** (make-clothes skill) are shown by shading. If the palette is too coarse the folds vanish. Check a
  clothed close-up.
- **Darks.** The tavern is lamplit and mostly dark. A palette taken from a bright shot leaves no room for the shadows.
  Take it from a shot of the actual place and lighting.

## Try a palette before touching the game

`palette_preview.py` (this folder) puts one shot through the video's colour step offline: the shot as given, the game's
current 63-level dither, and the nearest palette colour in RGB, CIE Lab and OKLab, side by side, with the palette
underneath. It prints how many colours were used and the hex list, ready to paste into a palette array.

```powershell
python -I .claude/skills/pixel-perfect/palette_preview.py <shot.png> --scale <screen px per game px> --palette auto:32
python -I .claude/skills/pixel-perfect/palette_preview.py <shot.png> --scale 2 --palette tavern.hex --dither 0.5
```

- `--palette auto:N` picks N colours from the shot itself (k-means in OKLab). You can also give `picture.png:N`
  (colours from another picture, such as a reference the user likes), a `.hex` list or a GIMP `.gpl` palette.
- `--scale`: in a full-window screenshot each game pixel is `round(height / 720)` screen pixels (2 on a 1440p window).
  The script takes the middle of each block, as `texelFetch` does.
- `--dither 0` is the video (no dither). `1` spreads the game's Bayer pattern over one palette step.
- The "mean OKLab error" is only a hint: dithering raises it while often looking better. Judge the sheet by eye,
  and show it to the user.
- Sheets go to `%TEMP%\tarven-pixel\` unless `--out` is given.

Getting a shot: run the dev server and open it **with `?mute`** (memory: test-with-sound-off), go to the place, and
screenshot the window (Chrome `save_to_disk`). Take shots in the tavern, the street and a close-up of her face,
because one palette has to work in all of them.

## Steps for a palette change in the game
1. Shots of the places it has to work in. Preview the candidate palettes with `palette_preview.py` and show the user
   the sheets. **The user picks the palette**: it sets the game's mood.
2. Add the palette uniforms and the OKLab snap to `RetroPipeline` behind a switch, with the current 63-level path as the
   fallback.
3. Put the palettes in their own module (one exported `readonly string[]` of hex per palette). Work out the OKLab
   values once when a palette is set, not every frame.
4. Bring the 5-bit CPU screens (`comic.ts`, `portraits.ts`, `battleview.ts`, `touchcomic.ts`) onto the same palette,
   with the same nearest-colour function in TS, so a comic doesn't look different from the game behind it.
5. Check in the game (`?mute`): crisp edges, no shimmer when the camera moves, her skin ramp, the customizer's colours
   in the wardrobe, cloth folds, the dark corners of the tavern, drunk vision. Run the tests from PowerShell
   (memory: run-tests-from-powershell).
