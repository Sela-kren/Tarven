/**
 * A face captured from video, played on hers. RGB MoCap (C:\Game\toyxyz_RGBMocap, Track Face then Export Face) writes
 * a real face's expression as Apple's 52 ARKit weights a frame, 0 to 1 each: jawOpen, eyeBlinkLeft, mouthSmileRight
 * and the rest. Her face doesn't have those. It has the controls in face.ts's FaceShape (open, lidUpper, smile...),
 * so this reads RGB MoCap's export (its own tab separated .txt, or the Unreal Live Link Face .csv), turns each frame's
 * weights into her controls (`capToFace`), steadies the camera tracker's jitter (`smoothTrack`), and gives back either
 * the whole performance to play (`sampleTrack`) or one face averaged from a stretch of it (`averageFace`), written out
 * as a line for face.ts's EXPRESSIONS (`presetLine`). tools/facecap runs it on a file.
 *
 * What doesn't carry over: her eyes move together, so a wink becomes both eyes half shut; she has no puffed cheeks or
 * jaw sliding sideways; her smirk is only on her own left, so a smirk either side lands there. Her brows' arch and tips
 * (browArch, browTip) have no ARKit weight and stay at rest. Blush has none either: the game still flushes her itself.
 * RGB MoCap leaves tongueOut at zero.
 */
import { FACE_KEYS, REST_FACE, type FaceShape } from "./face";

/** The 52 ARKit weights, in RGB MoCap's .txt column order (mocap/face_data.py CHANNELS). */
export const ARKIT_CHANNELS = [
  "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight", "cheekPuff", "cheekSquintLeft",
  "cheekSquintRight", "eyeBlinkLeft", "eyeBlinkRight", "eyeLookDownLeft", "eyeLookDownRight", "eyeLookInLeft",
  "eyeLookInRight", "eyeLookOutLeft", "eyeLookOutRight", "eyeLookUpLeft", "eyeLookUpRight", "eyeSquintLeft",
  "eyeSquintRight", "eyeWideLeft", "eyeWideRight", "jawForward", "jawLeft", "jawOpen", "jawRight", "mouthClose",
  "mouthDimpleLeft", "mouthDimpleRight", "mouthFrownLeft", "mouthFrownRight", "mouthFunnel", "mouthLeft",
  "mouthLowerDownLeft", "mouthLowerDownRight", "mouthPressLeft", "mouthPressRight", "mouthPucker", "mouthRight",
  "mouthRollLower", "mouthRollUpper", "mouthShrugLower", "mouthShrugUpper", "mouthSmileLeft", "mouthSmileRight",
  "mouthStretchLeft", "mouthStretchRight", "mouthUpperUpLeft", "mouthUpperUpRight", "noseSneerLeft", "noseSneerRight",
  "tongueOut",
] as const;
export type ArkitChannel = (typeof ARKIT_CHANNELS)[number];
export type ArkitWeights = Readonly<Partial<Record<ArkitChannel, number>>>;

/** One frame of a capture: when it is, and the face's weights, or null where the tracker had no face. */
export interface CapFrame {
  seconds: number;
  weights: ArkitWeights | null;
}

export interface FaceCapture {
  /** Frames a second of the export, as RGB MoCap wrote it (or as the .csv's timecodes space them). */
  fps: number;
  frames: CapFrame[];
}

const ARKIT_SET = new Set<string>(ARKIT_CHANNELS);

/** RGB MoCap's face export, either its .txt or its Unreal Live Link Face .csv. */
export function parseFaceCapture(text: string): FaceCapture {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const first = lines.find((line) => line.trim() !== "" && !line.startsWith("#")) ?? "";
  return first.startsWith("Timecode") ? parseLiveLink(lines) : parseTxt(lines);
}

function parseTxt(lines: string[]): FaceCapture {
  let fps = NaN;
  let columns: string[] | null = null;
  const frames: CapFrame[] = [];
  for (const line of lines) {
    if (line.startsWith("#")) {
      const found = /(?:^|[#;\s])fps=([0-9.]+)/.exec(line);
      if (found) fps = Number(found[1]);
      continue;
    }
    if (line.trim() === "") continue;
    const cells = line.split("\t");
    if (!columns) {
      columns = cells;
      continue;
    }
    const at = (name: string) => cells[columns!.indexOf(name)] ?? "";
    const state = at("state");
    const weights: Partial<Record<ArkitChannel, number>> = {};
    let any = false;
    columns.forEach((name, i) => {
      if (!ARKIT_SET.has(name) || cells[i] === undefined || cells[i] === "") return;
      weights[name as ArkitChannel] = Number(cells[i]);
      any = true;
    });
    // The reference frame RGB MoCap can put first (a T pose's lead-in) is all zeros, not a face.
    frames.push({ seconds: Number(at("export_seconds")), weights: any && state !== "missing" && state !== "reference" ? weights : null });
  }
  if (!columns) throw new Error("Not an RGB MoCap face export: no column row.");
  return { fps: Number.isFinite(fps) ? fps : spacing(frames), frames };
}

/** The .csv's timecodes are on a 30 fps clock, HH:MM:SS:FF.fff with fff in thousandths of a frame. */
function timecodeSeconds(code: string): number {
  const found = /^(\d+):(\d+):(\d+):(\d+)(?:\.(\d+))?$/.exec(code.trim());
  if (!found) return NaN;
  const [, h, m, s, f, frac] = found;
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + (Number(f) + Number(`0.${frac ?? "0"}`)) / 30;
}

function parseLiveLink(lines: string[]): FaceCapture {
  const rows = lines.filter((line) => line.trim() !== "");
  const header = rows[0].split(",").map((name) => name.trim());
  const channel = header.map((name) => {
    const lower = name[0].toLowerCase() + name.slice(1);
    return ARKIT_SET.has(lower) ? (lower as ArkitChannel) : null;
  });
  const frames = rows.slice(1).map((row): CapFrame => {
    const cells = row.split(",");
    const weights: Partial<Record<ArkitChannel, number>> = {};
    let any = false;
    channel.forEach((name, i) => {
      if (!name) return;
      const value = Number(cells[i]);
      weights[name] = value;
      if (value !== 0) any = true;
    });
    // The .csv has no state column: RGB MoCap writes a frame without a face as all zeros.
    return { seconds: timecodeSeconds(cells[0]), weights: any ? weights : null };
  });
  return { fps: spacing(frames), frames };
}

function spacing(frames: readonly CapFrame[]): number {
  if (frames.length < 2) return 30;
  const step = (frames[frames.length - 1].seconds - frames[0].seconds) / (frames.length - 1);
  return step > 0 ? Math.round((1 / step) * 1000) / 1000 : 30;
}

/**
 * How strongly each of her controls answers the capture, 1 as measured. Her face is drawn, not a real one: a real jaw
 * open 0.4 may want to be more on hers to read the same. Tune these against a capture (tools/facecap).
 */
export const CAP_GAIN: Readonly<Record<keyof FaceShape, number>> = {
  brow: 1, browInner: 1, browArch: 1, browOuter: 1, browTip: 1, browNear: 1, browSpread: 1, lidUpper: 1, lidLower: 1, wide: 1, pupil: 1, lookX: 1,
  lookY: 1, smile: 1, smirk: 1, open: 1, round: 1, bare: 1, lift: 1, cup: 1, purse: 1, press: 1, mouthUp: 1, tongue: 1, blush: 1,
  crease: 1, wet: 1, tears: 1, heart: 1, sweat: 1,
};

/** The controls that go both ways (-1 to 1); the rest run 0 to 1. Her smile goes a little past 1, as her presets do. */
const SIGNED = new Set<keyof FaceShape>(["brow", "browInner", "browArch", "browOuter", "browSpread", "pupil", "lookX", "lookY", "smile", "purse", "mouthUp"]);
const TOP: Partial<Record<keyof FaceShape, number>> = { smile: 1.25 };

export interface CapOptions {
  gain?: Readonly<Partial<Record<keyof FaceShape, number>>>;
  /**
   * Swap the capture's left and right. ARKit's Left is the person's own left; if a test capture (look to your own
   * left, wink your own left eye) comes out on her other side, the tracker had it the camera's way round.
   */
  mirror?: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** One frame's ARKit weights as her face. */
export function capToFace(weights: ArkitWeights, options: CapOptions = {}): FaceShape {
  const side = (name: string): number => {
    const swapped = options.mirror ? name.replace(/Left$|Right$/, (s) => (s === "Left" ? "Right" : "Left")) : name;
    return weights[swapped as ArkitChannel] ?? 0;
  };
  const w = (name: ArkitChannel) => weights[name] ?? 0;
  const both = (stem: string) => (side(stem + "Left") + side(stem + "Right")) / 2;

  const inner = w("browInnerUp");
  const outer = both("browOuterUp");
  const down = both("browDown");
  const smile = both("mouthSmile");
  const happy = clamp(smile - both("mouthFrown"), 0, 1);
  const upper = both("mouthUpperUp");
  const lower = both("mouthLowerDown");
  // Where she looks: her own right is her right eye looking out and her left eye looking in, towards her nose.
  const toRight = (side("eyeLookOutRight") + side("eyeLookInLeft")) / 2;
  const toLeft = (side("eyeLookOutLeft") + side("eyeLookInRight")) / 2;

  const raw: FaceShape = {
    ...REST_FACE,
    brow: (inner + outer) / 2 - down,
    // Worried is the inner ends up past the outer; cross is the brows drawn down, which pulls the inner ends.
    browInner: inner - outer - down,
    // The outer ends drop as the inner ends lift (worried), and stand up as the brows knit down (cross).
    browOuter: outer - inner + down * 0.5,
    browNear: down * 0.5,
    lidUpper: both("eyeBlink"),
    lidLower: Math.max(both("eyeSquint"), both("cheekSquint") * 0.6),
    wide: both("eyeWide"),
    lookX: toRight - toLeft,
    lookY: both("eyeLookUp") - both("eyeLookDown"),
    smile: smile - both("mouthFrown"),
    smirk: Math.abs(side("mouthSmileLeft") - side("mouthSmileRight")),
    // mouthClose is the lips held together while the jaw drops, so it takes away from how open her mouth looks.
    open: w("jawOpen") - w("mouthClose"),
    round: w("mouthFunnel"),
    bare: (upper + lower) / 2,
    lift: upper * happy,
    cup: lower * happy,
    purse: w("mouthPucker") - both("mouthStretch"),
    press: Math.max(both("mouthPress"), (w("mouthRollLower") + w("mouthRollUpper")) / 2),
    tongue: w("tongueOut"),
    crease: Math.max(down, inner - outer),
  };
  const out = { ...REST_FACE };
  for (const key of FACE_KEYS) {
    const v = raw[key] * (options.gain?.[key] ?? CAP_GAIN[key]);
    out[key] = clamp(v, SIGNED.has(key) ? -1 : 0, TOP[key] ?? 1);
  }
  return out;
}

/** A performance on her face: a face a frame. */
export interface FaceTrack {
  fps: number;
  seconds: number[];
  faces: FaceShape[];
  /** Which frames had a real face; the others hold the last one (or rest, before the first). */
  tracked: boolean[];
}

/** The whole capture as her face, frame by frame. A frame without a face holds the one before it. */
export function captureTrack(capture: FaceCapture, options: CapOptions = {}): FaceTrack {
  let last: FaceShape = REST_FACE;
  const faces: FaceShape[] = [];
  const tracked: boolean[] = [];
  for (const frame of capture.frames) {
    if (frame.weights) last = capToFace(frame.weights, options);
    faces.push(last);
    tracked.push(frame.weights !== null);
  }
  // Frames before the first face take the first face, not rest, so she doesn't snap into it.
  const firstSeen = tracked.indexOf(true);
  for (let i = 0; i < firstSeen; i++) faces[i] = faces[firstSeen];
  return { fps: capture.fps, seconds: capture.frames.map((f) => f.seconds), faces, tracked };
}

/**
 * The tracker's frame-to-frame jitter steadied out. An ease forward then another backward, each over `seconds`, so
 * the result doesn't trail behind the face the way one pass would: a quick change stays where it happened.
 */
export function smoothTrack(track: FaceTrack, seconds = 0.05): FaceTrack {
  if (seconds <= 0 || track.faces.length < 2) return track;
  const k = 1 - Math.exp(-1 / (track.fps * seconds));
  const pass = (faces: FaceShape[]) => {
    const out = [faces[0]];
    for (let i = 1; i < faces.length; i++) {
      const prev = out[i - 1];
      const next = { ...prev };
      for (const key of FACE_KEYS) next[key] = prev[key] + (faces[i][key] - prev[key]) * k;
      out.push(next);
    }
    return out;
  };
  const faces = pass(pass(track.faces).reverse()).reverse();
  return { ...track, faces };
}

/** Her face at a moment of the track, between its frames. */
export function sampleTrack(track: FaceTrack, seconds: number): FaceShape {
  const { faces, seconds: times } = track;
  if (faces.length === 0) return REST_FACE;
  if (seconds <= times[0]) return faces[0];
  if (seconds >= times[times.length - 1]) return faces[faces.length - 1];
  let hi = 1;
  while (times[hi] < seconds) hi++;
  const t = (seconds - times[hi - 1]) / (times[hi] - times[hi - 1]);
  const out = { ...faces[hi - 1] };
  for (const key of FACE_KEYS) out[key] += (faces[hi][key] - out[key]) * t;
  return out;
}

/** One face from a stretch of the track (all of it by default), the mean of the frames that had a face. */
export function averageFace(track: FaceTrack, from = -Infinity, to = Infinity): FaceShape {
  const out = { ...REST_FACE };
  let count = 0;
  track.faces.forEach((face, i) => {
    if (!track.tracked[i] || track.seconds[i] < from || track.seconds[i] > to) return;
    for (const key of FACE_KEYS) out[key] += face[key];
    count++;
  });
  if (count === 0) throw new Error("No tracked face in that stretch of the capture.");
  for (const key of FACE_KEYS) out[key] /= count;
  return out;
}

/** A face as a line for face.ts's EXPRESSIONS, rounded to hundredths, its resting controls left out. */
export function presetLine(name: string, face: FaceShape): string {
  const parts = FACE_KEYS.flatMap((key) => {
    const v = Math.round(face[key] * 100) / 100;
    return v === 0 ? [] : [`${key}: ${v}`];
  });
  return `${name}: face({ ${parts.join(", ")} }),`;
}

/** The track as JSON for a file: the controls' names once, then a row of numbers a frame. */
export function trackJson(track: FaceTrack): string {
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return JSON.stringify({
    format: "tarven_facecap_v1",
    fps: track.fps,
    keys: FACE_KEYS,
    frames: track.faces.map((face, i) => [round(track.seconds[i]), track.tracked[i] ? 1 : 0, ...FACE_KEYS.map((key) => round(face[key]))]),
  });
}

/** A track back from trackJson's JSON. */
export function trackFromJson(text: string): FaceTrack {
  const data = JSON.parse(text) as { format: string; fps: number; keys: (keyof FaceShape)[]; frames: number[][] };
  if (data.format !== "tarven_facecap_v1") throw new Error("Not a Tarven face track.");
  const faces = data.frames.map((row) => {
    const face = { ...REST_FACE };
    data.keys.forEach((key, i) => {
      if (key in face) face[key] = row[2 + i];
    });
    return face;
  });
  return { fps: data.fps, seconds: data.frames.map((row) => row[0]), faces, tracked: data.frames.map((row) => row[1] === 1) };
}
