import type { Material, WebGLProgramParametersWithUniforms, WebGLRenderer } from "three";
import { CLIT_AT, HOLE_AT, VULVA_COLUMNS, VULVA_CUT, VULVA_ROWS } from "./vulva";

/**
 * Painted detail on her areolae and vulva, KP's look: their meshes are one flat colour each, so the detail is drawn
 * in their shaders from where each point lies on them (their UVs carry it: the nipple disc's ring and spoke, the
 * vulva grid's column and row). Colour (soft rose gradients, darker creases, the tip of the nipple, the clit), a
 * soft edge that melts into the skin under it (no hard rim), small bumps lit by the light (the areola's little
 * glands, the folds round the hood) and a painted wet glint. Added to any material by name, in the room
 * (retro.ts) and in a close-up's painted skin alike.
 */

type DetailKind = "areola" | "labia" | "vulva" | "canal";

const KINDS: Record<string, DetailKind> = { T_areola: "areola", T_labia: "labia", T_vulva: "vulva", T_canal: "canal" };

/** Which detail a material by this name takes, if any. */
export function detailKind(name: string): DetailKind | null {
  return KINDS[name] ?? null;
}

/** How strong each part is: shared so the room and the close-ups agree. Heights are in metres on her. */
export const SKIN_DETAIL = {
  /** The areola fades into the skin from this far out (0 the tip, 1 the disc's edge, in its rings) to its edge. */
  areolaFade: [0.7, 1.0],
  /** The little glands round the areola: how many, how high. */
  glands: 11,
  glandHeight: 0.00012,
  /** The fine wrinkles round the nipple's side. */
  wrinkle: 0.00007,
  /** The outer lips melt into the skin from this far out (a share of the patch's half width, and of its length). */
  labiaFade: [0.72, 0.97],
  /** How far out from the slit's faces the outer lips blush rose, in metres. */
  blushReach: 0.01,
  /** The clit, under the hood: how much rounder it is painted than the mesh makes it. */
  clit: 0.0003,
  /** The painted glint: how bright on the nipple and the wet inner lips, and how tight. */
  glint: 0.4,
  glintPower: 70,
} as const;

const f = (v: number) => v.toFixed(5);

/** The slit's faces (T_vulva): this far across (a share of the half width) and along (from the middle, of the length). */
const VULVA_SLIT = [0.2, 1 / 3] as const;
/** The grid's half width and length on her at her usual size, in metres: VULVA_HALF and VULVA_LENGTH, by vulvaScale(0). */
const VULVA_METRES = [0.034 * 0.84, 0.085 * 0.84] as const;
/**
 * The colour the outer lips (her skin) and the slit (its pink) meet at, along the slit's edge: the outer lips' own
 * colour times this, and the slit's divided by it. Halfway between them (the square root of the slit's colour over
 * the skin's, linear, as built), so each side shades half the way.
 */
const MEET = "vec3(0.866, 0.632, 0.943)";

const COMMON = /* glsl */ `
varying vec2 vDetailUv;
varying vec2 vDetailDir;
float sdHash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
float sdBell(float x, float at, float width) { float d = (x - at) / width; return exp(-d * d); }
/** The normal tilted by a height field (metres) over the surface: Mikkelsen's bump mapping, from screen derivatives. */
vec3 sdBump(vec3 p, vec3 n, float h) {
  vec3 sx = dFdx(p);
  vec3 sy = dFdy(p);
  vec3 r1 = cross(sy, n);
  vec3 r2 = cross(n, sx);
  float det = dot(sx, r1);
  vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(abs(det) * n - grad);
}
`;

/** The vulva grid's column (a fraction between columns, from its u) as a place across her, -1 to 1. */
const VULVA_ACROSS = /* glsl */ `
const float SD_COLUMNS[${VULVA_COLUMNS.length}] = float[${VULVA_COLUMNS.length}](${VULVA_COLUMNS.map((c) => c.toFixed(3)).join(", ")});
float sdAcross(float u) {
  float c = clamp(u * ${(VULVA_COLUMNS.length - 1).toFixed(1)}, 0.0, ${(VULVA_COLUMNS.length - 1).toFixed(1)});
  int i = int(min(floor(c), ${(VULVA_COLUMNS.length - 2).toFixed(1)}));
  return mix(SD_COLUMNS[i], SD_COLUMNS[i + 1], c - float(i));
}
`;

/**
 * Per kind: what's worked out once (masks, the height field) and the colour, after the material's own colour; the
 * normal, after its own; and how strong the glint is (sdGlintAt), added at the end. Each sees vDetailUv (u, v as three reads them: v upside
 * down from Blender's) and vDetailDir (the spoke's direction round a nipple disc).
 */
const PARTS: Record<DetailKind, { color: string; normal: string; final: string; fades: boolean }> = {
  areola: {
    fades: true,
    color: /* glsl */ `
float sdU = vDetailUv.x;
float sdAng = atan(vDetailDir.y, vDetailDir.x);
float sdTurn = sdAng / 6.2831853 + 0.5;
// The nipple (inside its crease), its tip, the crease round its base, and the areola out from it.
float sdNip = 1.0 - smoothstep(0.42, 0.52, sdU);
float sdTip = 1.0 - smoothstep(0.0, 0.24, sdU);
float sdCrease = sdBell(sdU, 0.5, 0.035);
float sdAreola = smoothstep(0.46, 0.6, sdU);
// The little glands round the areola, two loose rings of them.
float sdGlands = 0.0;
for (int ringNo = 0; ringNo < 2; ringNo++) {
  float count = ringNo == 0 ? ${SKIN_DETAIL.glands.toFixed(1)} : ${Math.round(SKIN_DETAIL.glands * 0.6).toFixed(1)};
  float spin = ringNo == 0 ? 0.0 : 0.37;
  float slot = (sdTurn + spin) * count;
  float cell = floor(slot);
  for (int side = -1; side <= 1; side++) {
    float id = mod(cell + float(side), count) + float(ringNo) * 31.0;
    float at = cell + float(side) + 0.5 + (sdHash(id + 3.1) - 0.5) * 0.5;
    float ring = (ringNo == 0 ? 0.72 : 0.86) + (sdHash(id + 7.7) - 0.5) * 0.08;
    float big = 0.6 + 0.5 * sdHash(id + 1.3);
    float across = (slot - at) / count * 6.2831853 * ring * 0.55;
    float d2 = (pow((sdU - ring) / 0.04, 2.0) + pow(across / 0.04, 2.0)) / big;
    sdGlands += exp(-d2 * 1.4) * big * step(0.35, sdHash(id + 5.9));
  }
}
// Fine wrinkles round the nipple's side, and a small dimple at its tip.
float sdWrinkle = sin(sdAng * 13.0 + 2.5 * sin(sdAng * 5.0)) * smoothstep(0.1, 0.22, sdU) * (1.0 - smoothstep(0.36, 0.46, sdU));
float sdHeight = sdGlands * ${f(SKIN_DETAIL.glandHeight)} + sdWrinkle * ${f(SKIN_DETAIL.wrinkle)} - sdBell(sdU, 0.0, 0.07) * 0.00025
  - sdCrease * 0.00025;
vec3 sdTint = vec3(1.0);
// Rosier and a little deeper just round the nipple, easing out to the skin's own tone.
sdTint *= mix(vec3(1.0), vec3(0.88, 0.74, 0.8), sdBell(sdU, 0.66, 0.2) * sdAreola);
sdTint *= mix(vec3(1.0), vec3(1.03, 0.97, 0.98), smoothstep(0.85, 1.0, sdU));
// The nipple a touch lighter and pinker, its tip darker, the crease round its base darker still.
sdTint *= mix(vec3(1.0), vec3(1.14, 1.04, 1.06), sdNip);
sdTint *= mix(vec3(1.0), vec3(0.88, 0.76, 0.8), sdTip * 0.7);
sdTint *= mix(vec3(1.0), vec3(0.8, 0.66, 0.72), sdCrease * 0.6);
sdTint *= mix(vec3(1.0), vec3(1.12, 1.05, 1.05), clamp(sdGlands, 0.0, 1.0));
float sdFade = smoothstep(${f(SKIN_DETAIL.areolaFade[0])}, ${f(SKIN_DETAIL.areolaFade[1])}, sdU);
diffuseColor.rgb *= sdTint;
diffuseColor.a *= 1.0 - sdFade * sdFade;
float sdGlintAt = sdNip * ${f(SKIN_DETAIL.glint)} + 0.12 * (1.0 - sdFade);
`,
    normal: "normal = sdBump(-vViewPosition, normal, sdHeight);",
    final: "",
  },
  labia: {
    fades: true,
    color: /* glsl */ `
float sdS = sdAcross(vDetailUv.x);
float sdA = abs(sdS);
float sdT = 1.0 - vDetailUv.y;
float sdW = (sdT - 0.5) / 0.36;
// How far out from the slit's own faces (T_vulva) this is, in metres on her at her usual size: a rose blush deepens
// in towards them, meeting the slit's colour halfway at their edge, so there's no hard line between the two.
float sdOut = length(vec2(max(sdA - ${f(VULVA_SLIT[0])}, 0.0) * ${f(VULVA_METRES[0])}, max(abs(sdT - 0.5) - ${f(VULVA_SLIT[1])}, 0.0) * ${f(VULVA_METRES[1])}));
float sdNear = 1.0 - smoothstep(0.0, ${f(SKIN_DETAIL.blushReach)}, sdOut);
// The hood over the clit, pinker.
float sdHood = exp(-pow(sdA / 0.22, 2.0)) * sdBell(sdW, -0.88, 0.25);
// A soft drawn line where the outer lips' slopes turn into the slit, along it.
float sdFold = sdBell(sdA, 0.23, 0.035) * smoothstep(-0.72, -0.5, sdW) * (1.0 - smoothstep(0.75, 0.95, sdW));
float sdHeight = -sdFold * 0.00012;
vec3 sdTint = mix(vec3(1.0), ${MEET}, pow(sdNear, 1.4));
sdTint *= mix(vec3(1.0), vec3(1.0, 0.86, 0.88), sdHood * (1.0 - sdNear));
sdTint *= mix(vec3(1.0), vec3(0.78, 0.6, 0.66), sdFold * 0.6);
diffuseColor.rgb *= sdTint;
// And at the patch's own edges it melts into the skin under it.
// (Not at its bottom: the skin under her opening is hidden there while the patch shows, in steps.)
float sdFade = max(smoothstep(${f(SKIN_DETAIL.labiaFade[0])}, ${f(SKIN_DETAIL.labiaFade[1])}, sdA), 1.0 - smoothstep(0.0, 0.1, sdT));
diffuseColor.a *= 1.0 - sdFade;
float sdGlintAt = 0.05 * sdNear + 0.06 * sdHood;
`,
    normal: "normal = sdBump(-vViewPosition, normal, sdHeight);",
    final: "",
  },
  vulva: {
    fades: true,
    color: /* glsl */ `
float sdS = sdAcross(vDetailUv.x);
float sdA = abs(sdS);
float sdT = 1.0 - vDetailUv.y;
float sdW = (sdT - 0.5) / 0.36;
// Towards the edges of these faces it turns to meet the outer lips' blush (MEET, from their side): no hard line.
float sdEdge = max(smoothstep(0.11, ${f(VULVA_SLIT[0])}, sdA), smoothstep(${f(VULVA_SLIT[1] - 0.09)}, ${f(VULVA_SLIT[1])}, abs(sdT - 0.5)));
// Where the inner lips are along the slit (from round the clit down to near its bottom), and how far out their
// ridge is: closer together at their top. Their shapes, the hood's and the clit's are the mesh's own (vulvaAt in
// vulva.ts); this paints them.
float sdLips = smoothstep(-0.85, -0.6, sdW) * (1.0 - smoothstep(0.78, 0.92, sdW));
float sdRidge = 0.05 + 0.035 * smoothstep(-0.75, -0.25, sdW);
// The clit, a bead just under the hood's free edge, with a soft outline; and the fold of that edge arching over it.
float sdClitAt = length(vec2(sdS / 0.11, (sdW - ${f(CLIT_AT)}) / 0.12));
float sdClit = exp(-sdClitAt * sdClitAt * 1.6);
float sdClitRim = sdBell(sdClitAt, 1.0, 0.25);
float sdHoodEdge = sdBell(sdW + 0.75 + 1.2 * sdS * sdS, 0.0, 0.045) * (1.0 - smoothstep(0.12, 0.22, sdA));
// From the middle out: the slit itself, deep rose; the vestibule between the lips, a wetter red-pink; each inner
// lip, its inner face darker and its crest lighter and wet; then the soft groove between it and the outer lip.
float sdSlit = (1.0 - smoothstep(0.0, 0.02, sdA)) * smoothstep(-0.62, -0.5, sdW) * (1.0 - smoothstep(0.86, 0.96, sdW));
float sdVestibule = (1.0 - smoothstep(0.3, 0.75, sdA / sdRidge)) * sdLips;
float sdRim = sdBell(sdA / sdRidge, 0.55, 0.18) * sdLips;
float sdCrest = sdBell(sdA / sdRidge, 1.0, 0.25) * sdLips;
float sdGroove = sdBell(sdA - sdRidge, 0.1, 0.025) * sdLips;
float sdHeight = sdClit * ${f(SKIN_DETAIL.clit)} - sdHoodEdge * 0.0001 - sdGroove * 0.0001 + sdCrest * 0.00008 - sdSlit * 0.0001;
vec3 sdTint = vec3(1.0);
sdTint *= mix(vec3(1.0), vec3(0.92, 0.56, 0.5), sdVestibule);
sdTint *= mix(vec3(1.0), vec3(0.6, 0.3, 0.28), sdSlit * 0.9);
sdTint *= mix(vec3(1.0), vec3(0.8, 0.62, 0.7), sdRim * 0.8);
sdTint *= mix(vec3(1.0), vec3(1.14, 1.06, 1.06), sdCrest);
sdTint *= mix(vec3(1.0), vec3(0.68, 0.5, 0.58), sdGroove * 0.85);
sdTint *= mix(vec3(1.0), vec3(0.64, 0.46, 0.54), sdHoodEdge * 0.85);
sdTint *= mix(vec3(1.0), vec3(0.7, 0.5, 0.58), sdClitRim * 0.7);
sdTint = mix(sdTint, vec3(1.45, 1.15, 1.2), sdClit);
sdTint = mix(sdTint, 1.0 / ${MEET}, pow(sdEdge, 1.4));
diffuseColor.rgb *= sdTint;
// Above the inner lips, beside the hood, its edge melts into the skin under it, which is the outer lips' own colour
// there (the skin under the slit is only hidden lower down, round the opening): its gloss is the slit's, wetter
// than theirs, and would show its straight edge.
diffuseColor.a *= 1.0 - smoothstep(0.12, 0.2, sdA) * (1.0 - smoothstep(0.24, 0.32, sdT));
float sdGlintAt = ${f(SKIN_DETAIL.glint)} * (0.5 * sdCrest + 0.4 * sdVestibule + 1.5 * sdClit) + 0.1;
`,
    normal: "normal = sdBump(-vViewPosition, normal, sdHeight);",
    final: "",
  },
  canal: {
    fades: false,
    color: /* glsl */ `
// Deeper and darker the further in: u runs across from one side of the opening down into her and back up; and down
// the cut, pink and shallow under her clit, darkest at the hole low down (holeShare in vulva.ts).
float sdRow = (1.0 - vDetailUv.y) * ${(VULVA_ROWS - 1).toFixed(1)};
float sdAlong = clamp((sdRow - ${VULVA_CUT[0].toFixed(1)}) / ${(VULVA_CUT[1] - VULVA_CUT[0]).toFixed(1)}, 0.0, 1.0);
float sdHole = sin(3.1415927 * pow(sdAlong, ${HOLE_AT.toFixed(1)}));
float sdDeep = sin(clamp(vDetailUv.x, 0.0, 1.0) * 3.1415927) * (0.3 + 0.7 * sdHole);
diffuseColor.rgb *= mix(vec3(1.0), vec3(0.6, 0.32, 0.3), sdDeep);
float sdGlintAt = 0.15 * (1.0 - sdDeep);
float sdHeight = 0.0;
`,
    normal: "",
    // In shadow inside her, after every light and rim: depth, not a pale shine on its walls.
    final: "gl_FragColor.rgb *= mix(vec3(0.8, 0.42, 0.38), vec3(0.14, 0.03, 0.03), sdDeep * sdDeep);",
  },
};

/** A painted glint, as from a lamp up and to the left of the viewer, on what's wet or round. */
const glint = (final: string) => /* glsl */ `{
  vec3 sdHalf = normalize(normalize(vec3(-0.45, 0.6, 0.65)) + normalize(vViewPosition));
  float sdSpec = pow(max(dot(normalize(normal), sdHalf), 0.0), ${SKIN_DETAIL.glintPower.toFixed(1)});
  gl_FragColor.rgb += vec3(1.0, 0.96, 0.95) * sdSpec * sdGlintAt;
  ${final}
}
#include <dithering_fragment>`;

/** Puts one kind's detail into a shader about to compile: a three.js lit material's (Lambert or physical). */
function addTo(shader: WebGLProgramParametersWithUniforms, kind: DetailKind, opaque = false): void {
  const part = PARTS[kind];
  // On a hand-sculpted vulva (opaque) the outer lips and the slit are her skin itself, with none under them: their
  // edges don't melt away, or she'd be see-through there. Only the areola, a disc over her skin, still fades.
  const color = opaque && kind !== "areola" ? part.color.replace(/^diffuseColor\.a \*=.*$/gm, "") : part.color;
  shader.vertexShader = `varying vec2 vDetailUv;\nvarying vec2 vDetailDir;\n${shader.vertexShader}`.replace(
    "#include <uv_vertex>",
    `#include <uv_vertex>
vDetailUv = uv;
vDetailDir = vec2(cos(uv.y * 6.2831853), sin(uv.y * 6.2831853));`,
  );
  const extra = kind === "labia" || kind === "vulva" ? VULVA_ACROSS : "";
  shader.fragmentShader = `${COMMON}${extra}${shader.fragmentShader}`
    .replace("#include <color_fragment>", `#include <color_fragment>\n${color}`)
    .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\n${part.normal}`)
    .replace("#include <dithering_fragment>", glint(part.final));
}

/**
 * Gives a material its detail, if its name is one that takes some (detailKind): after whatever it compiles with
 * already, so it adds to the room's skin glow and to a close-up's painted skin. The areola and the outer lips fade
 * into the skin under them at their edges, so they're drawn see-through.
 */
export function addSkinDetail(material: Material): void {
  const kind = detailKind(material.name);
  if (!kind || material.userData.skinDetail) return;
  material.userData.skinDetail = kind;
  const before = material.onBeforeCompile;
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer) => {
    before.call(material, shader, renderer);
    addTo(shader, kind, material.userData.skinDetailOpaque === true);
  };
  const key = material.customProgramCacheKey;
  material.customProgramCacheKey = () =>
    `${key.call(material)}|skin-detail-${kind}${material.userData.skinDetailOpaque === true ? "-opaque" : ""}`;
  if (PARTS[kind].fades && material.userData.skinDetailOpaque !== true) material.transparent = true;
  material.needsUpdate = true;
}

/**
 * Marks a material as a hand-sculpted vulva's (or anus's): its detail no longer fades out at its edges and it's drawn
 * solid, as there's no skin under it to melt into (her sculpt, Female_Body's "vulva_sculpted").
 */
export function keepSkinDetailOpaque(material: Material): void {
  if (material.userData.skinDetailOpaque === true) return;
  material.userData.skinDetailOpaque = true;
  if (detailKind(material.name) !== "areola") material.transparent = false;
  material.needsUpdate = true;
}
