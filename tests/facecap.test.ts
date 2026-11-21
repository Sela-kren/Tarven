import { describe, expect, it } from "vitest";
import { CONTROL_KEYS as FACE_KEYS, EXPRESSION_CONTROLS as EXPRESSIONS, REST_CONTROLS as REST_FACE } from "../src/game/facerig";
import {
  ARKIT_CHANNELS,
  averageFace,
  capToFace,
  captureTrack,
  parseFaceCapture,
  presetLine,
  sampleTrack,
  smoothTrack,
  trackFromJson,
  trackJson,
  type ArkitChannel,
  type ArkitWeights,
} from "../src/game/facecap";

type Row = { state: "tracked" | "held" | "missing" | "reference"; weights?: ArkitWeights };

/** A file as RGB MoCap's face_export.write_txt writes it. */
function txt(rows: Row[], fps = 30): string {
  const head = [
    "# rgbmocap_face_v1",
    "# channels=ARKit52; tongueOut=unsupported_zero",
    "# frame_origin=0; timestamps=seconds; missing_values=empty",
    "# state=tracked,held,missing,reference",
    '# person="Person 1"',
    `# fps=${fps.toFixed(9)}; capture_fps=${fps}; capture_start=0.000000000`,
    ["export_frame", "export_seconds", "source_frame", "source_seconds", "state", "last_detected_source_frame", ...ARKIT_CHANNELS].join("\t"),
  ];
  const body = rows.map((row, i) => {
    const values = ARKIT_CHANNELS.map((name) => (row.state === "missing" ? "" : (row.weights?.[name] ?? 0).toFixed(7)));
    return [i, (i / fps).toFixed(9), i, (i / fps).toFixed(9), row.state, row.state === "missing" ? "" : i, ...values].join("\t");
  });
  return [...head, ...body].join("\n") + "\n";
}

/** The Unreal Live Link Face .csv, its channels in Live Link's order (not the .txt's) and capitalised. */
function csv(rows: (ArkitWeights | null)[]): string {
  const order = [...ARKIT_CHANNELS].reverse();
  const header = ["Timecode", "BlendShapeCount", ...order.map((n) => n[0].toUpperCase() + n.slice(1)), "HeadYaw", "HeadPitch"];
  const body = rows.map((w, i) => {
    const sub = Math.round((i * 30000) / 60);
    const code = `00:00:${String(Math.floor(sub / 30000)).padStart(2, "0")}:${String(Math.floor((sub % 30000) / 1000)).padStart(2, "0")}.${String(sub % 1000).padStart(3, "0")}`;
    return [code, order.length + 2, ...order.map((n) => (w?.[n] ?? 0).toFixed(7)), 0, 0].join(",");
  });
  return [header.join(","), ...body].join("\n");
}

const pair = (stem: string, v: number): ArkitWeights =>
  ({ [`${stem}Left`]: v, [`${stem}Right`]: v }) as Partial<Record<ArkitChannel, number>>;

describe("a captured face on hers", () => {
  it("reads RGB MoCap's .txt, with a frame that lost the face", () => {
    const capture = parseFaceCapture(txt([{ state: "tracked", weights: { jawOpen: 0.5 } }, { state: "missing" }, { state: "held", weights: { jawOpen: 0.5 } }]));
    expect(capture.fps).toBe(30);
    expect(capture.frames).toHaveLength(3);
    expect(capture.frames[0].weights?.jawOpen).toBeCloseTo(0.5);
    expect(capture.frames[1].weights).toBeNull();
    expect(capture.frames[2].seconds).toBeCloseTo(2 / 30);
  });

  it("skips the reference lead-in frame as no face", () => {
    const capture = parseFaceCapture(txt([{ state: "reference" }, { state: "tracked", weights: { jawOpen: 1 } }]));
    expect(capture.frames[0].weights).toBeNull();
  });

  it("reads the Live Link .csv whatever order its channels come in", () => {
    const capture = parseFaceCapture(csv([{ jawOpen: 0.25, eyeBlinkLeft: 1 }, null, { jawOpen: 0.75 }]));
    expect(capture.fps).toBeCloseTo(60, 0);
    expect(capture.frames[0].weights?.jawOpen).toBeCloseTo(0.25);
    expect(capture.frames[0].weights?.eyeBlinkLeft).toBeCloseTo(1);
    expect(capture.frames[1].weights).toBeNull();
    expect(capture.frames[2].seconds).toBeCloseTo(2 / 60);
  });

  it("rests when the capture's face rests", () => {
    for (const key of FACE_KEYS) expect(capToFace({})[key]).toBe(0);
  });

  it("opens her mouth, shuts her eyes and smiles as the capture does", () => {
    expect(capToFace({ jawOpen: 0.8 }).open).toBeCloseTo(0.8);
    // Lips held together over a dropped jaw read as less open.
    expect(capToFace({ jawOpen: 0.8, mouthClose: 0.5 }).open).toBeCloseTo(0.3);
    expect(capToFace(pair("eyeBlink", 1)).lidUpper).toBe(1);
    expect(capToFace(pair("eyeWide", 0.6)).wide).toBeCloseTo(0.6);
    expect(capToFace(pair("mouthSmile", 0.7)).smile).toBeCloseTo(0.7);
    expect(capToFace(pair("mouthFrown", 0.7)).smile).toBeCloseTo(-0.7);
    // A wink is half of both her eyes: they move together.
    expect(capToFace({ eyeBlinkLeft: 1 }).lidUpper).toBeCloseTo(0.5);
  });

  it("smirks on her left whichever side the capture smirks", () => {
    expect(capToFace({ mouthSmileLeft: 0.8 }).smirk).toBeCloseTo(0.8);
    expect(capToFace({ mouthSmileRight: 0.8 }).smirk).toBeCloseTo(0.8);
    expect(capToFace(pair("mouthSmile", 0.8)).smirk).toBe(0);
  });

  it("reads worried brows and cross ones the way her presets have them", () => {
    // Worried: inner ends up, outer ends not. Her shy and embarrassed faces: browInner up, browOuter down.
    const worried = capToFace({ browInnerUp: 1 });
    expect(Math.sign(worried.browInner)).toBe(Math.sign(EXPRESSIONS.embarrassed.browInner));
    expect(Math.sign(worried.browOuter)).toBe(Math.sign(EXPRESSIONS.embarrassed.browOuter));
    // Cross: brows drawn down. Her angry face: brow and browInner down, browOuter up, creased.
    const cross = capToFace(pair("browDown", 1));
    expect(Math.sign(cross.brow)).toBe(Math.sign(EXPRESSIONS.angry.brow));
    expect(Math.sign(cross.browInner)).toBe(Math.sign(EXPRESSIONS.angry.browInner));
    expect(Math.sign(cross.browOuter)).toBe(Math.sign(EXPRESSIONS.angry.browOuter));
    expect(cross.crease).toBeGreaterThan(0.5);
    // Surprised: the whole brow up, the ends level.
    const up = capToFace({ browInnerUp: 1, ...pair("browOuterUp", 1) });
    expect(up.brow).toBe(1);
    expect(up.browInner).toBe(0);
  });

  it("looks where the capture looks, and mirror swaps the sides", () => {
    // Looking to her own right: right eye out, left eye in.
    const right = { eyeLookOutRight: 0.8, eyeLookInLeft: 0.8 };
    expect(capToFace(right).lookX).toBeCloseTo(0.8);
    expect(capToFace(right, { mirror: true }).lookX).toBeCloseTo(-0.8);
    expect(capToFace(pair("eyeLookDown", 0.5)).lookY).toBeCloseTo(-0.5);
  });

  it("keeps each control in its range, however strong the gain", () => {
    const face = capToFace({ jawOpen: 1, ...pair("mouthSmile", 1) }, { gain: { open: 3, smile: 3 } });
    expect(face.open).toBe(1);
    expect(face.smile).toBe(1.25);
    expect(capToFace(pair("mouthFrown", 1), { gain: { smile: 3 } }).smile).toBe(-1);
  });

  it("holds the last face through frames that lost it, and starts on the first", () => {
    const track = captureTrack(
      parseFaceCapture(txt([{ state: "missing" }, { state: "tracked", weights: { jawOpen: 0.6 } }, { state: "missing" }, { state: "tracked", weights: { jawOpen: 0.2 } }])),
    );
    expect(track.faces.map((f) => f.open)).toEqual([0.6, 0.6, 0.6, 0.2].map((v) => expect.closeTo(v)));
    expect(track.tracked).toEqual([false, true, false, true]);
  });

  it("steadies jitter without trailing behind the face", () => {
    // A mouth flickering about half open, then shutting at frame 30.
    const rows: Row[] = Array.from({ length: 60 }, (_, i) => ({ state: "tracked", weights: { jawOpen: i < 30 ? 0.5 + (i % 2 ? 0.1 : -0.1) : 0 } }));
    const raw = captureTrack(parseFaceCapture(txt(rows)));
    const smooth = smoothTrack(raw);
    const flicker = (faces: typeof raw.faces) => Math.abs(faces[15].open - faces[16].open);
    expect(flicker(smooth.faces)).toBeLessThan(flicker(raw.faces) / 3);
    // The step is centred where it happened, not dragged later: halfway down between frames 29 and 30.
    expect(smooth.faces[27].open).toBeGreaterThan(0.35);
    expect(smooth.faces[32].open).toBeLessThan(0.15);
    expect((smooth.faces[29].open + smooth.faces[30].open) / 2).toBeCloseTo(0.25, 1);
  });

  it("plays between frames", () => {
    const track = captureTrack(parseFaceCapture(txt([{ state: "tracked", weights: { jawOpen: 0 } }, { state: "tracked", weights: { jawOpen: 1 } }])));
    expect(sampleTrack(track, 0.5 / 30).open).toBeCloseTo(0.5);
    expect(sampleTrack(track, -1).open).toBe(0);
    expect(sampleTrack(track, 99).open).toBe(1);
  });

  it("averages a stretch into one face, over the frames that had one", () => {
    const track = captureTrack(
      parseFaceCapture(txt([{ state: "tracked", weights: { jawOpen: 0.2 } }, { state: "tracked", weights: { jawOpen: 0.4 } }, { state: "missing" }, { state: "tracked", weights: { jawOpen: 1 } }])),
    );
    expect(averageFace(track).open).toBeCloseTo((0.2 + 0.4 + 1) / 3);
    expect(averageFace(track, 0, 1.5 / 30).open).toBeCloseTo(0.3);
    expect(() => averageFace(track, 5, 6)).toThrow();
  });

  it("writes a preset line like face.ts's", () => {
    expect(presetLine("gasp", { ...REST_FACE, open: 0.734, wide: 1, brow: -0.2 })).toBe("gasp: face({ brow: -0.2, wide: 1, open: 0.73 }),");
  });

  it("saves and loads a track", () => {
    const track = captureTrack(parseFaceCapture(txt([{ state: "tracked", weights: { jawOpen: 0.5, ...pair("mouthSmile", 0.3) } }, { state: "missing" }])));
    const back = trackFromJson(trackJson(track));
    expect(back.fps).toBe(30);
    expect(back.tracked).toEqual([true, false]);
    expect(back.faces[0].open).toBeCloseTo(0.5);
    expect(back.faces[1].smile).toBeCloseTo(0.3);
  });
});
