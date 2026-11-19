// An RGB MoCap face export (.txt or Live Link .csv) as her face: a track to play, and one averaged face as a preset
// line for face.ts. Run through vitest so it can load the game's own modules; see tools/facecap/README.md.
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { test } from "vitest";
import { averageFace, captureTrack, parseFaceCapture, presetLine, smoothTrack, trackJson } from "../../src/game/facecap";

const num = (name: string) => (process.env[name] === undefined || process.env[name] === "" ? undefined : Number(process.env[name]));

test("convert a face capture", () => {
  const input = process.env.FACECAP_IN;
  if (!input) throw new Error("Set FACECAP_IN to an RGB MoCap face export (.txt or .csv).");
  const capture = parseFaceCapture(readFileSync(input, "utf8"));
  const mirror = process.env.FACECAP_MIRROR === "1";
  const track = smoothTrack(captureTrack(capture, { mirror }), num("FACECAP_SMOOTH") ?? 0.05);

  const output = process.env.FACECAP_OUT ?? join(dirname(input), basename(input, extname(input)) + ".tarven-face.json");
  writeFileSync(output, trackJson(track));

  const seen = track.tracked.filter(Boolean).length;
  const from = num("FACECAP_FROM");
  const to = num("FACECAP_TO");
  const name = process.env.FACECAP_NAME ?? "captured";
  const lines = [
    `Read ${capture.frames.length} frames at ${capture.fps} fps (${seen} with a face, ${capture.frames.length - seen} held)${mirror ? ", mirrored" : ""}.`,
    `Track written to ${output}`,
  ];
  if (seen > 0) {
    const at = (s: number | undefined, end: string) => (s === undefined ? end : `${s} s`);
    const span = from !== undefined || to !== undefined ? ` from ${at(from, "the start")} to ${at(to, "the end")}` : "";
    lines.push(`Averaged face${span}, for EXPRESSIONS in src/game/face.ts:`, "  " + presetLine(name, averageFace(track, from, to)));
  }
  console.log("\n" + lines.join("\n") + "\n");
});
