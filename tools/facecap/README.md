# facecap: a captured face on hers

Turns an RGB MoCap face export into Tarven's face controls (`FaceShape` in `src/game/face.ts`). The mapping itself
lives in `src/game/facecap.ts`.

## 1. Capture in RGB MoCap (`C:\Game\toyxyz_RGBMocap`)

1. Open the video and reconstruct the body as usual, with **Track Face** on.
2. **File > Export...**, turn on **Export Face**. Either format works:
   **RGB MoCap Face (.txt)** (the default) or **Unreal Live Link Face (.csv)**.
   The face file lands beside the motion export, named `<motion>_face.txt`.

## 2. Convert (PowerShell, from `C:\Game\Tarven`)

```powershell
$env:FACECAP_IN = "C:\path\to\take_face.txt"
npx vitest run --config tools/facecap/vitest.config.ts --silent=false
```

It prints how many frames had a face and writes `take_face.tarven-face.json` beside the input: her face frame by
frame, smoothed. It also prints one averaged face as a line you can paste into `EXPRESSIONS`.

| Setting | What it does |
| --- | --- |
| `FACECAP_IN` | The export to read (required). |
| `FACECAP_OUT` | Where to write the track (default: beside the input). |
| `FACECAP_FROM`, `FACECAP_TO` | Average only this stretch, in seconds, for the preset line. |
| `FACECAP_NAME` | The preset's name in the printed line (default `captured`). |
| `FACECAP_SMOOTH` | Smoothing, in seconds (default `0.05`; `0` for none). |
| `FACECAP_MIRROR` | `1` swaps left and right (see below). |

Clear a setting between runs with `Remove-Item Env:FACECAP_FROM`.

## Making a preset from a capture

Pull the face in front of the camera, hold it for a second or two, and note the time. Then:

```powershell
$env:FACECAP_FROM = "3.0"; $env:FACECAP_TO = "4.5"; $env:FACECAP_NAME = "shy"
npx vitest run --config tools/facecap/vitest.config.ts --silent=false
```

The printed `shy: face({ ... }),` line is a starting point. Her presets also carry things the capture can't
(`blush`, `browArch`, `browTip`), so keep those from the existing preset when you replace one.

## First capture: check the sides and the strength

- **Sides:** look to your own left and wink your own left eye. If the track has her looking to her right
  (`lookX` positive), rerun with `FACECAP_MIRROR=1`.
- **Strength:** her face is drawn, not real, so a real expression may look weaker on her. Each control has a gain
  in `CAP_GAIN` (`src/game/facecap.ts`), 1 as measured. Raise one that reads too faint.

## What doesn't carry over

Her eyes move together, so a wink becomes both eyes half shut. She has no puffed cheeks or sideways jaw. Her smirk
is only on her own left, so a smirk on either side lands there. RGB MoCap doesn't track the tongue. Blush comes from
the game, not the capture.
