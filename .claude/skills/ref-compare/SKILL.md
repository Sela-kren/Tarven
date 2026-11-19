---
name: ref-compare
description: Compare a reference picture against her 3D model as the game shapes her (tools/refcompare/compare.py), lined up and measured in one sheet, with game and Blender renders side by side. Use whenever the user gives a picture (model sheet, art, photo, close-up of a face/bust/hips, an outfit) to match, check or fix the female model, her proportions, a body part or an outfit against; before and after every model or appearance change made to match a picture; or when they ask to compare, overlay or check the model against a reference.
---

# Ref compare

One command lines a picture up with her model and measures the difference. Use it instead of judging a
picture and a render separately by eye: it puts them at the same scale, from the same view, with the same
height lines, and prints numbers.

## Run it (PowerShell, from the repo root)

```powershell
python tools/refcompare/compare.py <picture> [--view front|back|left|right|quarter|quarter_r] [--part full|head|bust|torso|hips|legs]
```

The user's pictures go in `tools/refcompare/refs/` (git-ignored). If they paste one into the chat, ask for the file
or its path; the tool needs a file. Run from PowerShell: vitest fails from Git Bash (see memory).

It prints the report and writes `tools/refcompare/out/<picture>_<view>_<part>/`:
- `sheet.png`: picture | game | Blender | overlay, with her height lines and each line's difference. **Read this.**
- `overlay.png`: full-size overlay. Cyan is her outline, magenta the picture's, red is only in the picture, blue is only in the model.
- `report.txt` / `report.json`: widths (depths in side views) at each line, picture vs model, worst first.

Times: about 8 s the first time for a look and view (game render 3 s, Blender 4 s), then about 1.5 s while nothing changes.
Renders are cached against the model file, `src/game` and the tool, so rerunning after an edit re-renders by itself.

## The loop

1. **Pick the view and part** to match the picture. `side` means `left`; use `--flip` if the picture faces the other way.
2. **Run it.** On a plain or transparent background it finds the figure by itself. Otherwise it stops and writes `grid.png`:
   read the span off the grid (Y0 = top of the span, Y1 = bottom, X0..X1 centred on her middle) and rerun with
   `--box X0,Y0,X1,Y1`. A part (`--part head` and so on) always needs `--box` marking that span: head = top of hair to neck,
   bust = shoulders to waist, torso = neck to crotch, hips = waist to upper thigh, legs = crotch to soles.
3. **Check the alignment before trusting any number.** On the sheet, the yellow lines should sit at the same places on the
   picture and on her, and the magenta outline should follow the picture's figure. If the outline is wrong (a background
   close to her colours, a white top on a white page), rerun with `--keep-holes`, or with `--box` alone and judge by eye.
4. **Read the report.** Ignore lines marked `unsure` (an arm, hand or gap meets the outline there). Differences under
   about 5% at thin lines (neck, knee) and 2% at wide ones are noise. "height lines" lists proportion differences
   (where her waist or knee sits) apart from widths.
5. **Change the model or look, then run the same command again.** Report before and after to the user with the sheet.

## Her look

Default: the player's starting look (startLook, in the tee). Change it with `--outfit ID`, `--cup F`,
`--slider id=value` (any FEMALE_SLIDERS id, -1..1), `--look file.json` (a whole Look), `--posed` (as the game stands her,
arms spread), and `--flat` (preview colours). Use `--render game` to skip Blender when only shape matters (3 s).

## Limits

- Female model only (`public/models/female.glb`); she is the only playable body for now.
- No numbers on a busy background: the overlay is still lined up by `--box`, so compare by eye.
- Perspective photos don't line up exactly with an orthographic render; trust the middle of the span more than the ends.
- Close-up numbers are only as exact as the `--box`: a box 2% too tall reads every width about 2% narrower.
