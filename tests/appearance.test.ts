import { describe, expect, it } from "vitest";
import { cupFixAmount, guestHairstyle, REVIEWED_CUPS } from "../src/game/appearance";

describe("guest hairstyles", () => {
  it("spreads guests over every style, each look always the same one", () => {
    for (const body of ["Female", "Male"] as const) {
      const seen = new Map<string, number>();
      for (let i = 0; i < 3000; i++) {
        const look = 1 + Math.floor(Math.random() * (1 << 30));
        const style = guestHairstyle(body, look)!;
        expect(guestHairstyle(body, look)).toBe(style);
        seen.set(style, (seen.get(style) ?? 0) + 1);
      }
      const styles = LOOK_OPTIONS[body].hairstyles;
      expect(seen.size).toBe(styles.length);
      for (const count of seen.values()) expect(count).toBeGreaterThan(3000 / styles.length / 2);
    }
  });
  it("keeps the plain look's own hair", () => {
    expect(guestHairstyle("Female", 0)).toBeUndefined();
  });
});

describe("sculpted cup fixes", () => {
  const [a, c, f] = REVIEWED_CUPS;
  it("is whole at its own cup and fades out by the reviewed cups either side", () => {
    expect(cupFixAmount(a, a)).toBe(1);
    expect(cupFixAmount(a, c)).toBe(0);
    expect(cupFixAmount(a, (a + c) / 2)).toBeCloseTo(0.5);
    expect(cupFixAmount(c, f)).toBe(0);
    expect(cupFixAmount(c, (c + f) / 2)).toBeCloseTo(0.5);
  });
  it("holds past the ends of the reviewed sizes", () => {
    expect(cupFixAmount(a, a - 0.2)).toBe(1);
  });
});
import {
  Bone,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  MeshLambertMaterial,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import {
  activeTerms,
  armSpreadFor,
  bandWeight,
  copyLook,
  CUP_TOP,
  CUPS,
  dressColors,
  Dresser,
  dyeColor,
  hairMeshFor,
  legwearOf,
  legwearSlot,
  shoeMeshFor,
  LOOK_OPTIONS,
  nearestStop,
  newLook,
  postureFor,
  standSpreadFor,
  startLook,
  startSliders,
  outfitOf,
  ADVENTURER_OUTFITS,
  BANDIT_OUTFITS,
  GUEST_LOOKS,
  NOBLE_OUTFITS,
  guestOutfitColors,
  HANG,
  hangAmount,
  hangField,
  hangTop,
  PIRATE_LOOKS,
  pirateGuestColors,
  playerOutfits,
  randomLook,
  readLook,
  readLooks,
  reshape,
  shapeAmount,
  smoothMoves,
  smoothTable,
  smoothTopGap,
  turnedPartners,
  weldNormals,
  stopValue,
  toneColor,
  sheerOf,
  underOf,
  wearOutfit,
  type Look,
} from "../src/game/appearance";
import { REST_FACE } from "../src/game/face";

/**
 * A tiny female-named rig: hips, one leg (thigh and shin) and a torso, with a body mesh of four points:
 * a sole on the floor under the shin, a knee, a hip and a chest, each skinned to one bone.
 */
function rig() {
  const model = new Group();
  const root = new Group();
  root.name = "Female";
  model.add(root);
  const bone = (name: string, x: number, y: number, z: number) => {
    const b = new Bone();
    b.name = `Female_${name}`;
    b.position.set(x, y, z);
    return b;
  };
  const hips = bone("Hips", 0, 0.86, 0);
  const thigh = bone("Thigh_L", -0.1, -0.06, 0);
  const shin = bone("Shin_L", 0, -0.33, 0);
  const torso = bone("Torso", 0, 0.12, 0);
  hips.add(thigh, torso);
  thigh.add(shin);
  root.add(hips);
  root.updateMatrixWorld(true);

  const geometry = new BufferGeometry();
  // sole (shin), knee (thigh), hip (hips), chest (torso)
  geometry.setAttribute("position", new Float32BufferAttribute([-0.1, 0, 0, -0.1, 0.5, 0, 0.1, 0.86, 0, 0.15, 1.2, 0.05], 3));
  geometry.setAttribute("skinIndex", new Uint16BufferAttribute([2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0], 4));
  geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
  const material = new MeshLambertMaterial({ name: "T_skirt", color: 0x2b3d23 });
  const mesh = new SkinnedMesh(geometry, material);
  // Named as the cloth layer, since the skirt's material belongs to it.
  mesh.name = "Female_Cloth";
  root.add(mesh);
  mesh.bind(new Skeleton([hips, thigh, shin, torso]));
  return { model, root, mesh, hips, thigh, shin, torso };
}

/** Where each of the mesh's points sits with the bones at rest, skinned. */
function skinned(mesh: SkinnedMesh): Vector3[] {
  mesh.parent!.updateMatrixWorld(true);
  mesh.skeleton.update();
  const points: Vector3[] = [];
  for (let i = 0; i < mesh.geometry.getAttribute("position").count; i++) {
    points.push(mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld));
  }
  return points;
}

const look = (sliders: Record<string, number> = {}, colors: Record<string, string> = {}): Look => ({
  ...newLook(),
  sliders,
  colors,
});

describe("smoothing a fitted top", () => {
  /** A flat grid of n by n points, 1 cm apart, with every inner point doubled as glTF does at a seam. */
  function grid(n: number) {
    const bind: number[] = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) bind.push(i * 0.01, j * 0.01, 0);
    const twin = bind.length / 3;
    bind.push(...bind.slice(0, 3 * n * n));
    const index: number[] = [];
    for (let j = 0; j + 1 < n; j++) {
      for (let i = 0; i + 1 < n; i++) {
        const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
        // The top half of the grid uses the doubled points, as the far side of a seam.
        const o = j >= n / 2 ? twin : 0;
        index.push(a + o, b + o, d + o, a + o, d + o, c + o);
      }
    }
    return { bind: Float32Array.from(bind), index, twin };
  }

  it("irons out ridges in its moves and keeps a seam closed", () => {
    const n = 12;
    const { bind, index, twin } = grid(n);
    const table = smoothTable(bind, index);
    expect(table.nodes).toBe(n * n);
    // Ridges across it: every other row pushed out, as the bust's moves left them.
    const moves = new Float32Array(bind.length);
    for (let v = 0; v < bind.length / 3; v++) moves[v * 3 + 2] = (v % twin) % (2 * n) < n ? 0.01 : 0;
    // The biggest step from one row to the next: the ridges' height. (The edges, held, leave a gentle slope.)
    const ridge = () => {
      let most = 0;
      for (let j = 1; j < n - 2; j++) for (let i = 1; i < n - 1; i++) {
        most = Math.max(most, Math.abs(moves[(j * n + i) * 3 + 2] - moves[((j + 1) * n + i) * 3 + 2]));
      }
      return most;
    };
    expect(ridge()).toBeCloseTo(0.01);
    smoothMoves(table, moves, 100);
    expect(ridge()).toBeLessThan(0.0015);
    // A point and its twin across the seam move as one.
    for (let v = 0; v < n * n; v++) expect(moves[(twin + v) * 3 + 2]).toBe(moves[v * 3 + 2]);
  });

  it("eases its edges only along themselves", () => {
    const n = 8;
    const { bind, index } = grid(n);
    const table = smoothTable(bind, index);
    // Everything inside pushed out, the edges still: the inside doesn't drag the hem with it.
    const moves = new Float32Array(bind.length);
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) moves[(j * n + i) * 3 + 2] = 0.01;
    smoothMoves(table, moves, 50);
    for (let v = 0; v < n * n; v++) {
      const i = v % n, j = Math.floor(v / n);
      if (i === 0 || j === 0 || i === n - 1 || j === n - 1) expect(moves[v * 3 + 2]).toBe(0);
    }
  });

  it("lights the points at one spot alike, so no hard edge shows across it", () => {
    const n = 4;
    const { bind, index, twin } = grid(n);
    const table = smoothTable(bind, index);
    // The build's hard edge at a gentle corner: the two copies of each point at the seam lean 47 degrees apart.
    const normals = new Float32Array(bind.length);
    const lean = Math.sin((23.5 * Math.PI) / 180), up = Math.cos((23.5 * Math.PI) / 180);
    for (let v = 0; v < bind.length / 3; v++) normals.set(v < twin ? [lean, 0, up] : [-lean, 0, up], v * 3);
    const normal = new Float32BufferAttribute(normals, 3);
    weldNormals(table, normal);
    for (let v = 0; v < n * n; v++) {
      expect(normal.getX(v)).toBeCloseTo(0);
      expect(normal.getZ(v)).toBeCloseTo(1);
      expect(normal.getX(twin + v)).toBeCloseTo(normal.getX(v));
    }
  });

  it("keeps a hem's turned edge crisp, and never averages opposite normals into nothing", () => {
    const n = 4;
    const { bind, index, twin } = grid(n);
    const table = smoothTable(bind, index);
    // A right-angled edge (a hem turned under), and copies facing opposite ways (cloth folded flat on itself).
    const normals = new Float32Array(bind.length);
    for (let v = 0; v < bind.length / 3; v++) {
      const at = v % twin;
      normals.set(v < twin ? [0, 0, 1] : at < n * 2 ? [0, 0, -1] : [1, 0, 0], v * 3);
    }
    const normal = new Float32BufferAttribute(normals, 3);
    weldNormals(table, normal);
    for (let v = 0; v < bind.length / 3; v++) {
      expect([normal.getX(v), normal.getY(v), normal.getZ(v)]).toEqual(Array.from(normals.subarray(v * 3, v * 3 + 3)));
    }
  });

  it("keeps fitted tops further off her skin the bigger her bust, from an F cup to an M", () => {
    const cup = (letter: string) => stopValue(CUPS, CUPS.labels.indexOf(letter));
    expect(smoothTopGap(cup("A"))).toBeCloseTo(0.002);
    expect(smoothTopGap(cup("F"))).toBeCloseTo(0.002);
    expect(smoothTopGap(cup("J"))).toBeGreaterThan(0.002);
    expect(smoothTopGap(cup("J"))).toBeLessThan(0.008);
    expect(smoothTopGap(cup("M"))).toBeCloseTo(0.008);
    expect(smoothTopGap(cup("Z"))).toBeCloseTo(0.008);
  });

  it("hangs her T-shirt straight down from a big bust, not back in under it", () => {
    const cup = (letter: string) => stopValue(CUPS, CUPS.labels.indexOf(letter));
    expect(hangAmount(cup("C"))).toBe(0);
    expect(hangAmount(cup("E"))).toBeGreaterThan(0);
    expect(hangAmount(cup("J"))).toBe(1);
    // Her upright line at z = 0. In front (-z): the front of a breast 20 cm out at 1.2 m, cloth under it 10 cm out
    // at 1.1 m, and some above it at 1.25 m 12 cm out. At her side (+x), 15 cm out under her arm, at 1.1 m.
    const shaped = Float32Array.from([0, 1.2, -0.2, 0, 1.1, -0.1, 0, 1.25, -0.12, 0.15, 1.1, 0]);
    const verts = [0, 1, 2, 3];
    const field = hangField(shaped, verts, 0)!;
    const moves = new Float32Array(shaped.length);
    hangTop(field, shaped, verts, moves, 1);
    // Under the breast: out to its front, less the slope over the 10 cm down.
    expect(-(shaped[5] + moves[5])).toBeCloseTo(0.2 - HANG.slope * 0.1, 2);
    // The breast, the cloth above it and her side stay.
    for (const k of [0, 1, 2, 6, 7, 8, 9, 10, 11]) expect(moves[k]).toBe(0);
    // Half as far at half the amount.
    const half = new Float32Array(shaped.length);
    hangTop(field, shaped, verts, half, 0.5);
    expect(half[5]).toBeCloseTo(moves[5] / 2, 5);
  });

  it("hangs the cloth from her bust smooth, without folds (the user, 2026-11-19: a towel, not pleats)", () => {
    // The front of a breast 20 cm out at 1.2 m with cloth 10 cm out under it at 1.1 m: under her cleavage, and half
    // a fold round (HANG.fold / 2 at 20 cm out).
    const way = HANG.fold / 2 / 0.2;
    const at = (r: number, y: number, round: number) => [r * Math.sin(round), y, -r * Math.cos(round)];
    const shaped = Float32Array.from([...at(0.2, 1.2, 0), ...at(0.1, 1.1, 0), ...at(0.2, 1.2, way), ...at(0.1, 1.1, way)]);
    const verts = [0, 1, 2, 3];
    const moves = new Float32Array(shaped.length);
    hangTop(hangField(shaped, verts, 0)!, shaped, verts, moves, 1);
    const out = (v: number) => Math.hypot(shaped[v * 3] + moves[v * 3], shaped[v * 3 + 2] + moves[v * 3 + 2]);
    expect(out(1)).toBeCloseTo(0.2 - HANG.slope * 0.1, 2);
    expect(out(3)).toBeCloseTo(out(1), 4);
  });

  it("spans the dip between her breasts like a towel, at their own height", () => {
    // Two breast fronts 20 cm out, 30 degrees either side of her front, and the cleavage between them 8 cm out, all
    // at 1.2 m: the cloth there comes out to the straight line between the breasts' fronts.
    const way = Math.PI / 6;
    const at = (r: number, round: number) => [r * Math.sin(round), 1.2, -r * Math.cos(round)];
    const shaped = Float32Array.from([...at(0.2, -way), ...at(0.08, 0), ...at(0.2, way)]);
    const verts = [0, 1, 2];
    const moves = new Float32Array(shaped.length);
    hangTop(hangField(shaped, verts, 0)!, shaped, verts, moves, 1);
    expect(-(shaped[5] + moves[5])).toBeCloseTo(0.2 * Math.cos(way), 2);
    expect(shaped[3] + moves[3]).toBeCloseTo(0, 5);
    // The breasts stay.
    for (const k of [0, 1, 2, 6, 7, 8]) expect(moves[k]).toBe(0);
  });

  it("turns a hem's turned-under strip with the fold it turns under at", () => {
    // Four points across (1 cm apart), in rows: the shirt at 1.02 m and 1.01 m, the fold at 1 m, and the turned-under
    // edge 2 mm in under the fold, joined row to row in squares.
    const rows = [[1.02, 0], [1.01, 0], [1, 0], [1, 0.002]];
    const bind = Float32Array.from(rows.flatMap(([y, z]) => [0, 1, 2, 3].flatMap((i) => [i * 0.01, y, z])));
    const index: number[] = [];
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 3; i++) {
        const a = r * 4 + i, b = a + 1, c = a + 4, d = c + 1;
        index.push(a, c, b, b, c, d);
      }
    }
    const partner = turnedPartners(bind, smoothTable(bind, index), index);
    // The turned-under edge's middle points go with the fold's above them; the rest go their own way.
    expect(partner[13]).toBe(9);
    expect(partner[14]).toBe(10);
    for (let v = 0; v < 16; v++) if (v !== 13 && v !== 14) expect(partner[v]).toBe(-1);
  });
});

describe("reshaping", () => {
  it("grows across, fades along the height, and only stretches inside its span", () => {
    const out = new Vector3();
    expect(reshape([{ grow: [0.5, 0, 0] }], new Vector3(0.2, 0, 0), out).x).toBeCloseTo(0.3);
    // Full at y = 0.3, nothing by y = 0.1: halfway up, half the growth.
    expect(reshape([{ grow: [0.5, 0, 0], fade: [0.3, 0.1] }], new Vector3(0.2, 0.2, 0), out).x).toBeCloseTo(0.25);
    expect(reshape([{ grow: [0.5, 0, 0], fade: [0.3, 0.1] }], new Vector3(0.2, 0.05, 0), out).x).toBeCloseTo(0.2);
    // A shin that grows 10% stretches down to the ankle; the foot below just moves down with it.
    expect(reshape([{ grow: [0, 0.1, 0], span: [-0.35, 0] }], new Vector3(0, -0.2, 0), out).y).toBeCloseTo(-0.22);
    expect(reshape([{ grow: [0, 0.1, 0], span: [-0.35, 0] }], new Vector3(0, -0.45, 0), out).y).toBeCloseTo(-0.485);
  });

  it("lengthens hair below its pivot only", () => {
    const out = new Vector3();
    const longer = [{ grow: [0, 0.9, 0] as [number, number, number], pivot: 0.12, span: [-1, 0] as const }];
    // Above the pivot (the top of the head) nothing moves; the ends 0.1 below it drop by 0.09.
    expect(reshape(longer, new Vector3(0, 0.2, 0), out).y).toBeCloseTo(0.2);
    expect(reshape(longer, new Vector3(0, 0.02, 0), out).y).toBeCloseTo(-0.07);
  });

  it("only gives bones terms for sliders that are set", () => {
    // Her back's curve is the one shape she has at 0 (see "the small of her back"); -1 takes it away.
    expect(activeTerms("Female", { arch: -1 }).size).toBe(0);
    const terms = activeTerms("Female", { bust: 1, nonsense: 1, arch: -1 });
    expect([...terms.keys()]).toEqual(["Bust"]);
    expect(terms.get("Bust")![0].grow).toEqual([4.0, 2.07, 2.6]);
    // Shrinking has its own, smaller amounts.
    expect(activeTerms("Female", { bust: -1 }).get("Bust")![0].grow).toEqual([-0.2, -0.25, -0.7]);
  });
});

describe("the small of her back", () => {
  const moved = (sliders: Record<string, number>, bone: string, d: Vector3) =>
    reshape(activeTerms("Female", sliders).get(bone) ?? [], d, new Vector3()).sub(d);

  it("draws in at the back only, some at 0, more with the Back arch slider, none at -1", () => {
    // The small of her back, 4 cm above the torso's joint and 4 cm behind it; and her belly in front of it.
    const back = new Vector3(0, 0.04, 0.04);
    const belly = new Vector3(0, 0.04, -0.07);
    const rest = moved({}, "Torso", back).z;
    expect(rest).toBeLessThan(-0.005);
    expect(moved({ arch: 1 }, "Torso", back).z).toBeLessThan(rest);
    expect(moved({ arch: -1 }, "Torso", back).length()).toBe(0);
    expect(moved({ arch: 1 }, "Torso", belly).length()).toBe(0);
    // The hips' share of the same skin moves alike, so the curve is smooth across the bones.
    expect(moved({}, "Hips", back.clone().add(new Vector3(0, 0.12, 0))).z).toBeCloseTo(rest, 6);
  });

  it("leaves her shoulder blades and her rear alone", () => {
    expect(moved({ arch: 1 }, "Torso", new Vector3(0, 0.25, 0.05)).length()).toBe(0);
    expect(moved({ arch: 1 }, "Hips", new Vector3(0, 0.0, 0.09)).length()).toBe(0);
  });
});

describe("her blush", () => {
  it("leaves her cheeks and the tip of her nose her skin's colour at rest, and reddens them as she blushes", () => {
    const { root, hips, thigh, shin, torso } = rig();
    const skin = new Color(0.86, 0.63, 0.5);
    const patch = (name: string, color: Color) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute([0, 1.45, -0.08], 3));
      geometry.setAttribute("skinIndex", new Uint16BufferAttribute([3, 0, 0, 0], 4));
      geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0], 4));
      const mesh = new SkinnedMesh(geometry, new MeshLambertMaterial({ name, color }));
      mesh.name = "Female_Body";
      root.add(mesh);
      mesh.bind(new Skeleton([hips, thigh, shin, torso]));
      return mesh;
    };
    const face = patch("T_face_skin", skin);
    const cheek = patch("T_face_blush", new Color(0.87, 0.6, 0.52));
    const nose = patch("T_face_pink", new Color(0.92, 0.55, 0.52));
    const dresser = new Dresser(root.parent!, "Female");
    dresser.apply(newLook());
    const colour = (mesh: SkinnedMesh) => (mesh.material as MeshLambertMaterial).color;
    for (const mesh of [cheek, nose]) expect(colour(mesh).getHex()).toBe(colour(face).getHex());
    dresser.setExpression({ ...REST_FACE, blush: 1 });
    for (const mesh of [cheek, nose]) {
      expect(colour(mesh).r - colour(mesh).g).toBeGreaterThan(0.4);
    }
  });
});

describe("her face's extras", () => {
  it("shows KP's extra layers only while her expression calls for them: hearts, wet eyes, tears, sweat", () => {
    const { root, hips, thigh, shin, torso } = rig();
    const patch = (name: string) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute([0, 1.45, -0.08], 3));
      geometry.setAttribute("skinIndex", new Uint16BufferAttribute([3, 0, 0, 0], 4));
      geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0], 4));
      const mesh = new SkinnedMesh(geometry, new MeshLambertMaterial({ name }));
      mesh.name = "Female_Body";
      root.add(mesh);
      mesh.bind(new Skeleton([hips, thigh, shin, torso]));
      return mesh;
    };
    const [heart, wet, tear, sweat, more] = ["T_eye_heart", "T_eye_wet", "T_drop_tear", "T_drop_sweat", "T_drop_sweat_more"].map(patch);
    const dresser = new Dresser(root.parent!, "Female");
    dresser.apply(newLook());
    for (const mesh of [heart, wet, tear, sweat, more]) expect(mesh.visible).toBe(false);
    dresser.setExpression({ ...REST_FACE, heart: 1, wet: 1, tears: 1, sweat: 0.5 });
    for (const mesh of [heart, wet, tear, sweat]) expect(mesh.visible).toBe(true);
    // A few drops of sweat, not yet the rest.
    expect(more.visible).toBe(false);
    dresser.setExpression({ ...REST_FACE, sweat: 1 });
    expect(more.visible).toBe(true);
    expect(heart.visible).toBe(false);
  });
});

describe("dressing a character", () => {
  it("leaves the model exactly as built for the default look", () => {
    const { model, mesh } = rig();
    const before = skinned(mesh);
    new Dresser(model, "Female").apply(newLook());
    skinned(mesh).forEach((point, i) => expect(point.distanceTo(before[i])).toBeLessThan(1e-6));
    expect(mesh.material).toBeInstanceOf(MeshLambertMaterial);
  });

  it("keeps the feet on the floor when the legs get longer or shorter", () => {
    for (const legs of [1, -1]) {
      const { model, mesh } = rig();
      const before = skinned(mesh);
      new Dresser(model, "Female").apply(look({ legs }));
      const after = skinned(mesh);
      expect(after[0].y).toBeCloseTo(0, 5);
      // The hip rises (or drops) by the thigh's and shin's growth together.
      expect(Math.sign(after[2].y - before[2].y)).toBe(legs);
    }
  });

  it("moves the joints with the shape, so the animation pivots in the right places", () => {
    const { model, hips } = rig();
    const restY = hips.position.y;
    const dresser = new Dresser(model, "Female");
    dresser.apply(look({ legs: 1 }));
    expect(hips.position.y).toBeGreaterThan(restY);
    // Going back to the default puts the bones back where they were.
    dresser.apply(newLook());
    expect(hips.position.y).toBeCloseTo(restY, 6);
  });

  it("puts the bones back at rest each time", () => {
    const { model, thigh } = rig();
    const dresser = new Dresser(model, "Female");
    thigh.rotation.x = 1;
    dresser.apply(newLook());
    expect(thigh.quaternion.w).toBeCloseTo(1);
  });

  it("scales the whole character for height", () => {
    const { model, root } = rig();
    new Dresser(model, "Female").apply(look({ height: 1 }));
    expect(root.scale.y).toBeCloseTo(1.06);
  });

  it("has copies of its own meshes, so others sharing them are untouched", () => {
    const { model, mesh } = rig();
    const shared = mesh.geometry;
    new Dresser(model, "Female").apply(look({ hips: 1 }));
    expect(mesh.geometry).not.toBe(shared);
    expect(shared.getAttribute("position").getX(2)).toBeCloseTo(0.1);
  });

  it("dyes a piece of clothing and changes it back", () => {
    const { model, mesh } = rig();
    const dresser = new Dresser(model, "Female");
    const original = mesh.material;
    dresser.apply(look({}, { skirt: "#8c2020" }));
    expect(mesh.material).not.toBe(original);
    expect((mesh.material as MeshLambertMaterial).name).toBe("T_skirt");
    dresser.apply(newLook());
    expect(mesh.material).toBe(original);
  });

  it("recolours guests without reshaping them", () => {
    const { model, mesh } = rig();
    const shared = mesh.geometry;
    dressColors(model, "Female", { skirt: "#24345a" });
    expect(mesh.geometry).toBe(shared);
    expect((mesh.material as MeshLambertMaterial).color.getHexString()).toBe("24345a");
  });
});

describe("clothes on the body", () => {
  /** The rig, plus trousers: one point just outside the hip, skinned to the thigh where the body's is on the hips. */
  function dressedRig() {
    const parts = rig();
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute([0.11, 0.86, 0], 3));
    geometry.setAttribute("skinIndex", new Uint16BufferAttribute([1, 0, 0, 0], 4));
    geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0], 4));
    const trousers = new SkinnedMesh(geometry, new MeshLambertMaterial({ name: "T_hose" }));
    trousers.name = "Female_Cloth_Trousers";
    parts.root.add(trousers);
    trousers.bind(parts.mesh.skeleton);
    parts.mesh.name = "Female_Body";
    return { ...parts, trousers };
  }

  it("moves cloth with the body under it, not with its own bones", () => {
    const { model, mesh, trousers } = dressedRig();
    new Dresser(model, "Female").apply(look({ hips: 1 }));
    const [, , hip] = skinned(mesh);
    const [cloth] = skinned(trousers);
    // The body's hip point moved out with the hips; the cloth just outside it moved the same way.
    expect(hip.x).toBeGreaterThan(0.1);
    expect(cloth.x - hip.x).toBeCloseTo(0.01, 3);
  });

  it("takes the clothes off to look, and puts them back", () => {
    const { model, mesh, trousers } = dressedRig();
    const dresser = new Dresser(model, "Female");
    dresser.apply(newLook());
    dresser.setUndressed(true);
    expect(trousers.visible).toBe(false);
    expect(mesh.visible).toBe(true);
    dresser.setUndressed(false);
    expect(trousers.visible).toBe(true);
  });
});

describe("random looks", () => {
  it("only uses known settings, within range, and its own swatches", () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 50; i++) {
      const rolled = randomLook("Female", random);
      expect(readLook(rolled, "Female")).toEqual(rolled);
      for (const value of Object.values(rolled.sliders)) expect(Math.abs(value)).toBeLessThanOrEqual(0.8);
      expect(rolled.colors.skin).toBeDefined();
    }
  });
});

describe("colours", () => {
  it("moves every skin shade by the same amount", () => {
    const ref = new Color(0.7, 0.35, 0.2);
    const shade = new Color(0.35, 0.175, 0.1);
    const target = new Color(0.35, 0.175, 0.1);
    const moved = toneColor(shade, ref, target);
    expect(moved.r).toBeCloseTo(0.175);
    expect(moved.g).toBeCloseTo(0.0875);
  });

  it("dyes to the new colour, keeping how much darker a material was", () => {
    const ref = new Color(0.5, 0.5, 0.5);
    const darker = new Color(0.25, 0.25, 0.25);
    const dyed = dyeColor(darker, ref, new Color(0.8, 0.2, 0.2));
    expect(dyed.r).toBeCloseTo(0.4);
    expect(dyed.g).toBeCloseTo(0.1);
  });
});

describe("keeping looks", () => {
  it("drops anything unknown or out of range", () => {
    const read = readLook(
      { sliders: { height: 3, bust: -0.5, wings: 1 }, colors: { skin: "#ABCDEF", hair: "red", fins: "#000000" }, hidden: ["apron", "hat"] },
      "Female",
    );
    // Saved with no outfit, she comes back in the one she starts in, in its colours and its own underwear.
    expect(read).toEqual({
      sliders: { height: 1, bust: -0.5 }, colors: { skin: "#abcdef", ...outfitOf("Female", { outfit: "tee" }).preset }, hidden: ["apron"],
      outfit: "tee", bra: "fullcup", briefs: "hipster",
    });
    // He has no other to start in: nothing stored for his.
    expect(readLook({ sliders: {}, colors: {}, hidden: [] }, "Male")).toEqual(newLook());
  });

  it("starts her J cup with bigger nipples, in a new game and in an old save she never shaped", () => {
    const start = startSliders();
    expect(startLook("Female").sliders).toMatchObject(start);
    expect(readLooks({ Female: { sliders: {}, colors: {}, hidden: [] } })!.Female.sliders).toMatchObject(start);
    // What she set herself stays, even as built, and reads back the same.
    const own = readLooks({ Female: { sliders: { bust: 0, nippleSize: -0.3 }, colors: {}, hidden: [] } })!.Female;
    expect(own.sliders).toMatchObject({ bust: 0, nippleSize: -0.3, areolaSize: start.areolaSize });
    expect(readLooks(JSON.parse(JSON.stringify({ Female: own })))!.Female.sliders).toEqual(own.sliders);
  });

  it("moves an old save's sexy everyday set over to the plain one, but keeps a set she picked herself", () => {
    const tee = outfitOf("Female", { outfit: "tee" }).preset;
    const old = { sliders: {}, colors: { ...tee, bra: "#b0213a", smalls: "#b0213a" }, hidden: [], outfit: "tee", bra: "demi", briefs: "brazilian" };
    expect(readLook(old, "Female")).toMatchObject({ bra: "fullcup", briefs: "hipster", colors: { bra: tee.bra, smalls: tee.smalls } });
    // Dyed another colour: the plain set, in her colour.
    const dyed = readLook({ ...old, colors: { ...old.colors, bra: "#123456" } }, "Female");
    expect(dyed).toMatchObject({ bra: "fullcup", colors: { bra: "#123456", smalls: tee.smalls } });
    // A set she chose in the customiser stays.
    expect(readLook({ ...old, bra: "plunge" }, "Female")).toMatchObject({ bra: "plunge", briefs: "brazilian" });
    // The tavern dress's old wine-red set too.
    const tavern = readLook({ sliders: {}, colors: { bra: "#7a1e2a", smalls: "#7a1e2a" }, hidden: [], outfit: "tavern", bra: "balconette", briefs: "tanga" }, "Female");
    expect(tavern).toMatchObject({ bra: "fullcup", briefs: "hipster", colors: { bra: "#e8e0d2", smalls: "#e8e0d2" } });
  });

  it("reads both siblings, with a missing one as built", () => {
    const looks = readLooks({ Male: { sliders: { pecs: 0.4 }, colors: {}, hidden: [] } });
    expect(looks!.Male.sliders).toEqual({ pecs: 0.4 });
    expect(looks!.Female).toEqual(startLook("Female"));
    expect(readLooks("nope")).toBeNull();
  });
});

describe("hairstyles", () => {
  /** The rig with two hairstyles on the hips bone: its own, and a long one. */
  function hairRig() {
    const parts = rig();
    const make = (name: string) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute([0, 1.5, 0], 3));
      geometry.setAttribute("skinIndex", new Uint16BufferAttribute([0, 0, 0, 0], 4));
      geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0], 4));
      const hair = new SkinnedMesh(geometry, new MeshLambertMaterial({ name: "T_hair_f" }));
      hair.name = name;
      parts.root.add(hair);
      hair.bind(parts.mesh.skeleton);
      return hair;
    };
    return { ...parts, own: make("Female_Hair"), long: make("Female_HairLong") };
  }

  it("shows only the chosen style, starting with the character's own", () => {
    const { model, own, long } = hairRig();
    const dresser = new Dresser(model, "Female");
    dresser.apply(newLook());
    expect([own.visible, long.visible]).toEqual([true, false]);
    dresser.apply({ ...newLook(), hairstyle: "long" });
    expect([own.visible, long.visible]).toEqual([false, true]);
  });

  it("gives guests their own hair only", () => {
    const { model, own, long } = hairRig();
    dressColors(model, "Female", {});
    expect([own.visible, long.visible]).toEqual([true, false]);
  });

  it("has no hair mesh for bald, and keeps only known styles", () => {
    expect(hairMeshFor("Male", { hairstyle: "bald" })).toBeNull();
    expect(hairMeshFor("Male", {})).toBe("");
    expect(readLook({ hairstyle: "long" }, "Female")!.hairstyle).toBe("long");
    expect(readLook({ hairstyle: "bob" }, "Female")!.hairstyle).toBeUndefined();
    expect(readLook({ hairstyle: "mohawk" }, "Female")!.hairstyle).toBeUndefined();
  });
});

describe("shoes", () => {
  /** The rig with her own shoes, standing on the floor, and stilettos whose heel reaches 9 cm below it. */
  function shoeRig() {
    const parts = rig();
    const make = (name: string, y: number, material = "T_leather") => {
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute([-0.1, y, 0], 3));
      geometry.setAttribute("skinIndex", new Uint16BufferAttribute([2, 0, 0, 0], 4));
      geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0], 4));
      const shoe = new SkinnedMesh(geometry, new MeshLambertMaterial({ name: material }));
      shoe.name = name;
      parts.root.add(shoe);
      shoe.bind(parts.mesh.skeleton);
      return shoe;
    };
    return {
      ...parts,
      own: make("Female_Shoes", 0),
      stiletto: make("Female_ShoesStiletto", -0.09),
      instep: make("Female_ShoesStiletto", -0.09, "T_instep"),
    };
  }

  it("shows only the pair she has on, starting with her own", () => {
    const { model, own, stiletto } = shoeRig();
    const dresser = new Dresser(model, "Female");
    dresser.apply(newLook());
    expect([own.visible, stiletto.visible]).toEqual([true, false]);
    dresser.apply({ ...newLook(), shoes: "stiletto" });
    expect([own.visible, stiletto.visible]).toEqual([false, true]);
  });

  it("lifts her onto her heels, and back down out of them", () => {
    const { model, hips } = shoeRig();
    const dresser = new Dresser(model, "Female");
    dresser.apply({ ...newLook(), shoes: "stiletto" });
    expect(hips.position.y).toBeCloseTo(0.86 + 0.09);
    dresser.apply(newLook());
    expect(hips.position.y).toBeCloseTo(0.86);
  });

  it("gives guests their own shoes only", () => {
    const { model, own, stiletto } = shoeRig();
    dressColors(model, "Female", {});
    expect([own.visible, stiletto.visible]).toEqual([true, false]);
  });

  it("shows the top of her foot in her stockings only where they reach the ankle", () => {
    const legwear = (id: string) => LOOK_OPTIONS.Female.legwear.find((style) => style.id === id)!;
    expect(legwearSlot(legwear("tights"), "Shoes", "T_instep")).toBeNull();
    expect(legwearSlot(legwear("tights"), "Shoes", "T_instep", true)).toBe("skin");
    expect(legwearSlot(legwear("leggings"), "Shoes", "T_instep")).toBe("skin");
    expect(legwearSlot(legwear("noshow"), "Shoes", "T_instep")).toBe("skin");
    expect(legwearSlot(null, "Shoes", "T_instep")).toBe("skin");
  });

  it("keeps only known styles, and the men have no others", () => {
    expect(shoeMeshFor("Female", { shoes: "thighboot" })).toBe("Thighboot");
    expect(shoeMeshFor("Female", {})).toBe("");
    expect(readLook({ shoes: "pump" }, "Female")!.shoes).toBe("pump");
    expect(readLook({ shoes: "shoes" }, "Female")!.shoes).toBeUndefined();
    expect(readLook({ shoes: "clogs" }, "Female")!.shoes).toBeUndefined();
    expect(LOOK_OPTIONS.Male.shoes).toEqual([]);
    expect(copyLook({ ...newLook(), shoes: "wedge" }).shoes).toBe("wedge");
  });
});

describe("a fuller bust", () => {
  it("drops and comes forwards as it grows, but not as it shrinks", () => {
    const bigger = activeTerms("Female", { bust: 1 }).get("Bust")![0];
    expect(bigger.shift![1]).toBeLessThan(0);
    expect(bigger.shift![2]).toBeLessThan(0);
    const smaller = activeTerms("Female", { bust: -1 }).get("Bust")![0];
    expect(smaller.shift).toEqual([0, 0, 0]);
  });

  it("swells each breast about its own middle, and only forwards towards the cleavage", () => {
    const term = { grow: [1, 0, 1] as [number, number, number], lobes: [0.07, 0, 0] as const };
    const out = new Vector3();
    // The middle of a breast stays put; a point 2 cm out from it goes to 4 cm out, on either side.
    expect(reshape([term], new Vector3(0.07, 0, 0), out).x).toBeCloseTo(0.07);
    expect(reshape([term], new Vector3(0.09, 0, 0), out).x).toBeCloseTo(0.11);
    expect(reshape([term], new Vector3(-0.09, 0, 0), out).x).toBeCloseTo(-0.11);
    // Between a breast's middle and the cleavage, points keep their place across and only come forwards.
    reshape([term], new Vector3(0.01, 0, -0.04), out);
    expect(out.x).toBeCloseTo(0.01);
    expect(out.z).toBeCloseTo(-0.08);
    expect(reshape([term], new Vector3(0, 0, -0.04), out).x).toBe(0);
  });

  it("rounds the inner side out towards the cleavage with inner fullness, never past the middle", () => {
    const full = { grow: [1, 0, 0] as [number, number, number], lobes: [0.08, 0, 0] as const, inner: 1 };
    const out = new Vector3();
    // Grown twice as wide, the inner side follows the curve (x / 8 cm)^2: 4 cm in goes to 2 cm.
    expect(reshape([full], new Vector3(0.04, 0, 0), out).x).toBeCloseTo(0.02);
    expect(reshape([full], new Vector3(-0.04, 0, 0), out).x).toBeCloseTo(-0.02);
    // The middle of the breast and the cleavage stay put.
    expect(reshape([full], new Vector3(0.08, 0, 0), out).x).toBeCloseTo(0.08);
    expect(reshape([full], new Vector3(0, 0, 0), out).x).toBe(0);
    // Half of it goes half way; negative draws the inner side in towards the middle instead.
    expect(reshape([{ ...full, inner: 0.5 }], new Vector3(0.04, 0, 0), out).x).toBeCloseTo(0.03);
    expect(reshape([{ ...full, inner: -1 }], new Vector3(0.02, 0, 0), out).x).toBeCloseTo(0.04);
  });

  it("gives inner fullness to the breast terms, 0.6 of the way round as built", () => {
    const inner = (value?: number) => activeTerms("Female", { bust: 1, bustInner: value ?? 0 }).get("Bust")!.map((t) => t.inner);
    expect(inner().every((v) => v === 0.6)).toBe(true);
    expect(inner(1).every((v) => v === 1)).toBe(true);
    expect(inner(-1).every((v) => v === -1)).toBe(true);
    expect(inner(0.5)[0]).toBeCloseTo(0.8);
    expect(inner(-0.375)[0]).toBeCloseTo(0);
  });

  it("swells a glute round into the cleft, never past the body's middle", () => {
    // The joint is 6.5 cm from the middle; growing twice as wide, a point on the outer side goes twice as far out.
    const term = { grow: [1, 0, 0] as [number, number, number], midline: 0.065 };
    const out = new Vector3();
    expect(reshape([term], new Vector3(-0.03, 0, 0), out).x).toBeCloseTo(-0.06);
    // On the inner side it follows mid * (1 - (1 - t)^2): halfway to the middle it goes three quarters of the way.
    expect(reshape([term], new Vector3(0.0325, 0, 0), out).x).toBeCloseTo(0.04875);
    // Close to the middle it closes in on it but stays on its own side.
    expect(reshape([term], new Vector3(0.06, 0, 0), out).x).toBeLessThan(0.065);
    expect(reshape([term], new Vector3(0.06, 0, 0), out).x).toBeGreaterThan(0.06);
    // The other glute mirrors it.
    expect(reshape([{ ...term, midline: -0.065 }], new Vector3(-0.0325, 0, 0), out).x).toBeCloseTo(-0.04875);
    // Shrinking draws it away from the middle as before.
    expect(reshape([{ grow: [-0.5, 0, 0] as [number, number, number], midline: 0.065 }], new Vector3(0.04, 0, 0), out).x).toBeCloseTo(0.02);
  });

  it("lifts her bust and draws it together while something holds it, within the sliders' ends", () => {
    const lift = (sliders: Record<string, number>, held: number) =>
      (activeTerms("Female", sliders, undefined, held).get("Bust") ?? []).reduce((sum, t) => sum + (t.shift?.[1] ?? 0), 0);
    // Bare, only her own sliders count; in her breast band the bust comes up.
    expect(lift({}, 0)).toBe(0);
    expect(lift({}, 1)).toBeGreaterThan(0);
    expect(lift({}, 1)).toBeGreaterThan(lift({}, 0.6));
    // Already lifted all the way, a band can't lift it past the slider's end.
    expect(lift({ bustLift: 1 }, 1)).toBeCloseTo(lift({ bustLift: 1 }, 0));
    // Drawn together: each side moves towards the middle.
    const apart = activeTerms("Female", {}, undefined, 1).get("Bust")!.reduce((sum, t) => sum + (t.apart ?? 0), 0);
    expect(apart).toBeLessThan(0);
  });

  it("grows her hands about the wrist, leaving the forearm alone", () => {
    const hand = activeTerms("Female", { hands: 1 }).get("ForeArm_L")!;
    const out = new Vector3();
    // The wrist stays where it is; a fingertip 15 cm below it, 1 cm out, goes a quarter further on both.
    expect(reshape(hand, new Vector3(-0.06, -0.2, 0.005), out).distanceTo(new Vector3(-0.06, -0.2, 0.005))).toBeCloseTo(0);
    reshape(hand, new Vector3(-0.07, -0.35, 0.005), out);
    expect(out.y).toBeCloseTo(-0.3875);
    expect(out.x).toBeCloseTo(-0.0725);
    // Up the forearm, nothing changes.
    expect(reshape(hand, new Vector3(-0.03, -0.1, 0), out).y).toBeCloseTo(-0.1);
  });

  it("stretches the neck by raising the head while the neck's base stays in the shoulders", () => {
    const active = activeTerms("Female", { neckLength: 1 });
    const out = new Vector3();
    // The torso carries the head's joint, 39 cm above its own, up by 2.5 cm; its own skin stays put.
    expect(reshape(active.get("Torso")!, new Vector3(0, 0.39, 0), out).y).toBeCloseTo(0.415);
    expect(reshape(active.get("Torso")!, new Vector3(0, 0.37, 0), out).y).toBeCloseTo(0.37);
    // On the head, the neck's base comes back down by the joint's 2.5 cm, so it stays where it was...
    expect(reshape(active.get("Head")!, new Vector3(0, -0.035, 0), out).y).toBeCloseTo(-0.06);
    // ...and from under the chin up, the head moves whole with its joint.
    expect(reshape(active.get("Head")!, new Vector3(0, 0.08, 0), out).y).toBeCloseTo(0.08);
  });

  it("grows a band of heights fully in its middle and not at all past its ends", () => {
    const band = [0, -0.06, -0.14, -0.27] as const;
    expect(bandWeight(band, -0.1)).toBe(1);
    expect(bandWeight(band, 0.05)).toBe(0);
    expect(bandWeight(band, -0.3)).toBe(0);
    // Halfway up the easing at the top, the smooth curve gives a half.
    expect(bandWeight(band, -0.03)).toBeCloseTo(0.5);
    const calf = { grow: [1, 0, 0] as [number, number, number], band };
    const out = new Vector3();
    expect(reshape([calf], new Vector3(0.05, -0.1, 0), out).x).toBeCloseTo(0.1);
    expect(reshape([calf], new Vector3(0.05, -0.35, 0), out).x).toBeCloseTo(0.05);
  });

  it("fades out smoothly, with no edge where it stops", () => {
    const fading = [{ grow: [1, 0, 0] as [number, number, number], fade: [0, 0.1] as const }];
    const out = new Vector3();
    // A quarter of the way in, the smooth curve gives less than the straight line's quarter.
    expect(reshape(fading, new Vector3(1, 0.075, 0), out).x).toBeCloseTo(1 + 0.15625);
  });
});

describe("cup sizes", () => {
  const bust = LOOK_OPTIONS.Female.sliders.find((def) => def.id === "bust")!;

  it("runs from A to Z, with C as built", () => {
    expect(bust.stops).toBe(CUPS);
    expect(CUPS.labels[0]).toBe("A");
    expect(CUPS.labels[CUPS.labels.length - 1]).toBe("Z");
    expect(CUPS.labels[nearestStop(CUPS, 0)]).toBe("C");
  });

  it("puts A at -1, B halfway down, D to Q evenly up to 1, and R to Z on past it by the same step", () => {
    expect(stopValue(CUPS, 0)).toBe(-1);
    expect(stopValue(CUPS, 1)).toBe(-0.5);
    expect(stopValue(CUPS, 3)).toBeCloseTo(1 / 14);
    expect(stopValue(CUPS, 16)).toBe(1);
    expect(stopValue(CUPS, 25)).toBeCloseTo(23 / 14);
    expect(CUP_TOP).toBeCloseTo(23 / 14);
    for (let i = 0; i < CUPS.labels.length; i++) expect(nearestStop(CUPS, stopValue(CUPS, i))).toBe(i);
    expect(CUPS.labels[nearestStop(CUPS, 9)]).toBe("Z");
  });

  it("grows past Q to Z, and a saved Z stays a Z", () => {
    const grow = (cup: number) => activeTerms("Female", { bust: cup }).get("Bust")![0].grow[2];
    expect(grow(CUP_TOP)).toBeCloseTo(grow(1) * CUP_TOP);
    expect(grow(5)).toBeCloseTo(grow(CUP_TOP));
    expect(readLook({ sliders: { bust: CUP_TOP } }, "Female")!.sliders.bust).toBeCloseTo(CUP_TOP);
    expect(readLook({ sliders: { bust: 1 } }, "Female")!.sliders.bust).toBe(1);
  });

  it("rolls random busts on a cup, and only up to about a J", () => {
    let seed = 1;
    const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 200; i++) {
      const value = randomLook("Female", random).sliders.bust ?? 0;
      const cup = nearestStop(CUPS, value);
      expect(stopValue(CUPS, cup)).toBeCloseTo(value);
      expect(CUPS.labels[cup] <= "J").toBe(true);
    }
  });

  it("spreads the arms for a fuller bust", () => {
    expect(armSpreadFor({ bust: 1 })).toBeGreaterThan(armSpreadFor({}));
  });

  it("standing still, spreads the arms for her build but not her bust, which they hang behind", () => {
    expect(standSpreadFor({ bust: CUP_TOP })).toBe(standSpreadFor({}));
    expect(standSpreadFor({ bust: 1, hips: 1 })).toBeCloseTo(armSpreadFor({ hips: 1 }), 6);
    expect(postureFor({ bust: 1, rear: 1 }).standSpread).toBeGreaterThan(0);
  });
});

describe("bust shape and height", () => {
  it("moves a whole breast for Height, reaching past where its weight thins out", () => {
    const term = { grow: [0, 0, 0] as [number, number, number], shift: [0, 0.03, 0] as [number, number, number], reach: 0.5 };
    const out = new Vector3();
    // Where the bone holds a quarter of the point, the move counts as half: after the caller's weighting, 0.5.
    const quarter = reshape([term], new Vector3(), out, 0.25).y * 0.25;
    expect(quarter).toBeCloseTo(0.015);
    // Held fully, it moves fully; Lift, without reach, moves only as far as the weight.
    expect(reshape([term], new Vector3(), out, 1).y).toBeCloseTo(0.03);
    expect(reshape([{ grow: [0, 0, 0], shift: [0, 0.03, 0] }], new Vector3(), out, 0.25).y * 0.25).toBeCloseTo(0.0075);
  });

  it("sets breasts apart and turns them outwards, each to its own side", () => {
    const out = new Vector3();
    expect(reshape([{ grow: [0, 0, 0], apart: 0.01 }], new Vector3(0.05, 0, 0), out).x).toBeCloseTo(0.06);
    expect(reshape([{ grow: [0, 0, 0], apart: 0.01 }], new Vector3(-0.05, 0, 0), out).x).toBeCloseTo(-0.06);
    // Turning moves the front (-z) of a breast most, and the back of it not at all.
    expect(reshape([{ grow: [0, 0, 0], turn: 0.02 }], new Vector3(0.05, 0, -0.06), out).x).toBeCloseTo(0.07);
    expect(reshape([{ grow: [0, 0, 0], turn: 0.02 }], new Vector3(0.05, 0, 0.02), out).x).toBeCloseTo(0.05);
    // Moving apart eases in from the middle: the skin on it stays put, so the two sides never tear apart there.
    expect(reshape([{ grow: [0, 0, 0], apart: 0.01 }], new Vector3(0.0005, 0, 0), out).x).toBeCloseTo(0.0006, 4);
  });

  it("opens the cleavage as the breasts are set apart, and closes it as they're pushed together", () => {
    const cleft = (sliders: Record<string, number>, shape?: string, held = 0) =>
      activeTerms("Female", { bust: 1, ...sliders }, shape, held).get("Bust")!.find((t) => t.lobes)!.cleft ?? 0;
    expect(cleft({})).toBe(0);
    expect(cleft({ bustSpacing: 0.5 })).toBeCloseTo(0.5);
    expect(cleft({ bustSpacing: 1 }, "sideset")).toBe(1);
    expect(cleft({}, "sideset")).toBeGreaterThan(0);
    expect(cleft({ bustInner: -1 })).toBeGreaterThan(0);
    expect(cleft({ bustSpacing: 0.5, bustTogether: 1 })).toBe(0);
    // The middle of her chest grows less, the breasts themselves as much as ever.
    const term = { grow: [0, 0, 1] as [number, number, number], lobes: [0.06, 0, 0] as const, cleft: 1 };
    const out = new Vector3();
    expect(reshape([term], new Vector3(0, 0, -0.04), out).z).toBeCloseTo(-0.04);
    expect(reshape([term], new Vector3(0.06, 0, -0.04), out).z).toBeCloseTo(-0.08);
  });

  it("sets a fuller bust wider apart, more with every cup, and leaves smaller ones where they are", () => {
    const spread = (cup: number) => (activeTerms("Female", { bust: cup }).get("Bust") ?? []).reduce((sum, t) => sum + (t.apart ?? 0), 0);
    expect(spread(0)).toBe(0);
    expect(spread(0.5)).toBeGreaterThan(0);
    expect(spread(1)).toBeCloseTo(spread(0.5) * 2);
    expect(spread(-1)).toBeCloseTo(0);
  });

  it("has teardrop first, as built, and gives shapes more to work with as the cup grows", () => {
    const shapes = LOOK_OPTIONS.Female.bustShapes;
    expect(shapes[0].id).toBe("teardrop");
    expect(shapes[0].terms).toEqual([]);
    expect(shapes.map((s) => s.id)).toEqual(["teardrop", "round", "bell", "eastwest", "athletic", "relaxed", "sideset", "slender"]);
    expect(shapeAmount(-1)).toBeLessThan(shapeAmount(0));
    expect(shapeAmount(1)).toBeGreaterThan(shapeAmount(0));
    expect(activeTerms("Female", { arch: -1 }, "teardrop").size).toBe(0);
    expect(activeTerms("Female", {}, "athletic").get("Bust")).toHaveLength(1);
  });

  it("keeps a known shape in the look, leaving the default out, and copies it", () => {
    expect(readLook({ bustShape: "bell" }, "Female")!.bustShape).toBe("bell");
    expect(readLook({ bustShape: "teardrop" }, "Female")!.bustShape).toBeUndefined();
    expect(readLook({ bustShape: "cone" }, "Female")!.bustShape).toBeUndefined();
    expect(copyLook({ ...newLook(), bustShape: "round" }).bustShape).toBe("round");
  });
});

describe("nipples in the look", () => {
  it("keeps a known type, leaving the default out, and copies it", () => {
    expect(readLook({ nipples: "puffy" }, "Female")!.nipples).toBe("puffy");
    expect(readLook({ nipples: "neat" }, "Female")!.nipples).toBe("neat");
    expect(readLook({ nipples: "full" }, "Female")!.nipples).toBeUndefined();
    expect(readLook({ nipples: "pierced" }, "Female")!.nipples).toBeUndefined();
    expect(readLook({ nipples: "puffy" }, "Male")!.nipples).toBeUndefined();
    expect(copyLook({ ...newLook(), nipples: "wide" }).nipples).toBe("wide");
  });

  it("has sliders for their sizes and a colour that follows the skin", () => {
    const ids = LOOK_OPTIONS.Female.sliders.filter((def) => def.group === "Nipples").map((def) => def.id);
    expect(ids).toEqual(["nippleSize", "areolaSize"]);
    expect(LOOK_OPTIONS.Female.colors.find((def) => def.id === "nipples")?.follows).toBe("skin");
  });
});

describe("outfits", () => {
  /** The rig with a dirndl's cloth mesh beside the tavern dress, both on the hips bone. */
  function outfitRig() {
    const parts = rig();
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute([0, 0.9, 0.1], 3));
    geometry.setAttribute("skinIndex", new Uint16BufferAttribute([0, 0, 0, 0], 4));
    geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0], 4));
    const dirndl = new SkinnedMesh(geometry, new MeshLambertMaterial({ name: "T_skirt" }));
    dirndl.name = "Female_ClothDirndl";
    parts.root.add(dirndl);
    dirndl.bind(parts.mesh.skeleton);
    return { ...parts, dirndl };
  }

  it("shows only the chosen outfit's cloth, starting with the character's own", () => {
    const { model, mesh, dirndl } = outfitRig();
    const dresser = new Dresser(model, "Female");
    dresser.apply(newLook());
    expect([mesh.visible, dirndl.visible]).toEqual([true, false]);
    dresser.apply({ ...newLook(), outfit: "dirndl" });
    expect([mesh.visible, dirndl.visible]).toEqual([false, true]);
  });

  it("starts her in her T-shirt and leggings, while a look naming none (a guest's) keeps the tavern dress", () => {
    const own = LOOK_OPTIONS.Female.outfits[0];
    expect([own.id, own.mesh]).toEqual(["tavern", ""]);
    expect(LOOK_OPTIONS.Female.defaultOutfit).toBe("tee");
    const start = startLook("Female");
    expect(outfitOf("Female", start)).toMatchObject({ id: "tee", mesh: "Tee", legwear: "leggings" });
    expect(start.colors).toEqual(outfitOf("Female", start).preset);
    expect(outfitOf("Female", newLook()).id).toBe("tavern");
    expect(outfitOf("Female", {}).id).toBe("tavern");
    expect(startLook("Male")).toEqual(newLook());
    // A saved look with none named is hers from before: back in the tee. The dress, named, stays the dress.
    expect(readLook({ sliders: {}, colors: {}, hidden: [] }, "Female")!.outfit).toBe("tee");
    expect(readLook({ sliders: {}, colors: { stockings: "#24345a" }, hidden: [] }, "Female")!.colors.stockings).toBe("#24345a");
    expect(readLook({ outfit: "tavern" }, "Female")!.outfit).toBe("tavern");
    // Rolled at random, she always names hers.
    let seed = 1;
    const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 20; i++) expect(randomLook("Female", random).outfit).toBeDefined();
  });

  it("puts guests in the tavern dress when none is named, never her T-shirt", () => {
    const { model, mesh, dirndl } = outfitRig();
    const tee = dirndl.clone();
    tee.name = "Female_ClothTee";
    dirndl.parent!.add(tee);
    dressColors(model, "Female", {});
    expect([mesh.visible, dirndl.visible, tee.visible]).toEqual([true, false, false]);
    dressColors(model, "Female", {}, "tee");
    expect([mesh.visible, dirndl.visible, tee.visible]).toEqual([false, false, true]);
  });

  it("dresses guests in the character's own outfit, unless another is named", () => {
    const { model, mesh, dirndl } = outfitRig();
    dressColors(model, "Female", {});
    expect([mesh.visible, dirndl.visible]).toEqual([true, false]);
    dressColors(model, "Female", {}, "dirndl");
    expect([mesh.visible, dirndl.visible]).toEqual([false, true]);
  });

  it("keeps the guests' outfits for guests: never offered, rolled or loaded for a player", () => {
    for (const body of ["Female", "Male"] as const) {
      for (const [id, mesh] of [
        ["pirate", "Pirate"], ["archer", "Archer"], ["warrior", "Warrior"], ["mage", "Mage"], ["cleric", "Cleric"],
        ["noble", "Noble"], ["servant", "Servant"], ["rogue", "Rogue"], ["brute", "Brute"],
      ] as const) {
        expect(outfitOf(body, { outfit: id }).mesh).toBe(mesh);
        expect(playerOutfits(body).map((o) => o.id)).not.toContain(id);
        expect(readLook({ outfit: id }, body)!.outfit).toBe(LOOK_OPTIONS[body].defaultOutfit);
        let seed = 0;
        const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
        for (let i = 0; i < 50; i++) expect(randomLook(body, random).outfit).not.toBe(id);
      }
    }
  });

  it("colours guests' pirate rigs in a few ways, all from the body's own clothes colours", () => {
    for (const body of ["Female", "Male"] as const) {
      const clothes = LOOK_OPTIONS[body].colors.filter((c) => c.tab === "clothes" || c.id === "hair").map((c) => c.id);
      const looks = Array.from({ length: PIRATE_LOOKS }, (_, i) => pirateGuestColors(body, i));
      for (const look of looks) for (const id of Object.keys(look)) expect(clothes, `${body}: ${id}`).toContain(id);
      expect(new Set(looks.map((look) => JSON.stringify(look))).size).toBe(PIRATE_LOOKS);
      expect(pirateGuestColors(body, PIRATE_LOOKS)).toEqual(looks[0]);
    }
  });

  it("colours the adventurers' and nobles' clothes in a few ways too, all from the body's own clothes colours", () => {
    for (const body of ["Female", "Male"] as const) {
      const clothes = LOOK_OPTIONS[body].colors.filter((c) => c.tab === "clothes").map((c) => c.id);
      for (const outfit of [...ADVENTURER_OUTFITS, ...NOBLE_OUTFITS, ...BANDIT_OUTFITS]) {
        const looks = Array.from({ length: GUEST_LOOKS }, (_, i) => guestOutfitColors(body, outfit, i));
        for (const look of looks) for (const id of Object.keys(look)) expect(clothes, `${body} ${outfit}: ${id}`).toContain(id);
        expect(new Set(looks.map((look) => JSON.stringify(look))).size).toBe(GUEST_LOOKS);
        expect(guestOutfitColors(body, outfit, -1)).toEqual(looks[GUEST_LOOKS - 1]);
      }
    }
    // Her gown and robes reach the floor but have stockings under them; the archer's breeches and warrior's mail have none.
    for (const outfit of ["noble", "mage", "cleric"]) expect(legwearOf("Female", { outfit })!.id).toBe("kneehigh");
    for (const outfit of ["archer", "warrior"]) expect(legwearOf("Female", { outfit })).toBeNull();
    // A party is four callings, each with an outfit on both bodies.
    expect(ADVENTURER_OUTFITS).toEqual(["archer", "warrior", "mage", "cleric"]);
    // The servant is her maid's dress and his footman's livery; the bandits all wear the gang's red.
    expect(outfitOf("Female", { outfit: "servant" }).label).toBe("Maid");
    expect(outfitOf("Male", { outfit: "servant" }).label).toBe("Footman");
    for (const body of ["Female", "Male"] as const) {
      for (const outfit of BANDIT_OUTFITS) {
        for (let i = 0; i < GUEST_LOOKS; i++) expect(guestOutfitColors(body, outfit, i).sash).toBe("#8c2020");
      }
    }
  });

  it("puts an outfit on in its own colours, keeping everything that isn't clothes", () => {
    const before: Look = { ...newLook(), colors: { skin: "#c68a64", skirt: "#24345a", belt: "#2b2b2b" }, hairstyle: "long" };
    const dirndl = wearOutfit("Female", before, "dirndl");
    expect(dirndl.outfit).toBe("dirndl");
    expect(dirndl.colors.skin).toBe("#c68a64");
    expect(dirndl.colors.belt).toBeUndefined();
    expect(dirndl.colors.apron).toBe(outfitOf("Female", dirndl).preset.apron);
    expect(dirndl.hairstyle).toBe("long");
    // Back to the tavern dress: the model's own colours again. She starts in her tee, so the dress is named.
    const tavern = wearOutfit("Female", dirndl, "tavern");
    expect(tavern.outfit).toBe("tavern");
    expect(tavern.colors).toEqual({ skin: "#c68a64", ...outfitOf("Female", { outfit: "tavern" }).preset });
    // His tunic is his own and what he starts in: nothing stored for it.
    expect(wearOutfit("Male", { ...newLook(), outfit: "pirate" }, "tunic").outfit).toBeUndefined();
  });

  it("puts the bunny set on with its heart pasties, which she can then change", () => {
    const bunny = wearOutfit("Female", { ...newLook(), bra: "plunge", briefs: "thong" }, "bunny");
    expect(bunny).toMatchObject({ outfit: "bunny", bra: "hearts", briefs: "heart" });
    expect(underOf("Female", bunny)).toMatchObject({ top: { id: "hearts" }, bottom: { id: "heart" } });
    // Every outfit she can pick comes with its own underwear, never the old band and braies.
    // Her everyday clothes come with plain underwear, not a sexy set.
    expect(wearOutfit("Female", bunny, "dirndl")).toMatchObject({ bra: "fullcup", briefs: "hipster" });
    expect(startLook("Female")).toMatchObject({ outfit: "tee", bra: "fullcup", briefs: "hipster" });
    for (const outfit of playerOutfits("Female")) {
      expect(outfit.under?.bra, outfit.id).toBeTruthy();
      expect(outfit.under?.briefs, outfit.id).toBeTruthy();
    }
    // A guest's look (in the first outfit, put on without wearOutfit) keeps the plain band and braies.
    expect(newLook().bra).toBeUndefined();
  });

  it("lists only clothes colours each body has, and keeps only known outfits", () => {
    for (const body of ["Female", "Male"] as const) {
      const clothes = LOOK_OPTIONS[body].colors.filter((c) => c.tab === "clothes").map((c) => c.id);
      for (const outfit of LOOK_OPTIONS[body].outfits) {
        for (const id of [...outfit.colors, ...Object.keys(outfit.preset)]) expect(clothes, `${outfit.id}: ${id}`).toContain(id);
      }
    }
    expect(readLook({ outfit: "priestess" }, "Female")!.outfit).toBe("priestess");
    expect(readLook({ outfit: "tavern" }, "Female")!.outfit).toBe("tavern");
    expect(readLook({ outfit: "ballgown" }, "Female")!.outfit).toBe("tee");
    expect(readLook({ outfit: "pirate" }, "Male")!.outfit).toBeUndefined();
    expect(copyLook({ ...newLook(), outfit: "dirndl" }).outfit).toBe("dirndl");
  });
});

describe("legwear", () => {
  /** The rig with her seat and thigh bands of stockings and the garter on the cloth, the sock cuff on the shoes and skin on the body. */
  function legRig() {
    const parts = rig();
    const piece = (name: string, material: string) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute([-0.1, 0.6, 0.05], 3));
      geometry.setAttribute("skinIndex", new Uint16BufferAttribute([1, 0, 0, 0], 4));
      geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0], 4));
      const mesh = new SkinnedMesh(geometry, new MeshLambertMaterial({ name: material }));
      mesh.name = name;
      parts.root.add(mesh);
      mesh.bind(parts.mesh.skeleton);
      return mesh;
    };
    const seat = piece("Female_Cloth_1", "T_hose");
    const thigh = piece("Female_Cloth_2", "T_hose_thigh");
    const garter = piece("Female_Cloth_3", "T_garter");
    const over = piece("Female_Cloth_4", "T_hose_over");
    const cuff = piece("Female_Shoes", "T_hose");
    const skin = piece("Female_Body", "T_skin_f");
    return { ...parts, seat, thigh, garter, over, cuff, skin };
  }

  it("lets her skin show through sheer stockings below their top band", () => {
    expect(sheerOf("Female", { outfit: "frills" })).toEqual({
      bands: ["T_hose_over", "T_hose_knee", "T_hose_calf", "T_hose_shin", "T_hose_low", "T_hose_ankle"], amount: 0.45,
    });
    expect(sheerOf("Female", { outfit: "frills", legwear: "noshow" })).toBeNull();
    expect(sheerOf("Female", { outfit: "bunny" })).toBeNull();
    // The halter dress has no legwear; its lace panels are its own sheer cloth.
    expect(sheerOf("Female", { outfit: "halter" })).toEqual({ bands: ["T_lace"], amount: 0.2 });

    const { model, thigh, over, skin } = legRig();
    (skin.material as MeshLambertMaterial).color.setRGB(0.8, 0.5, 0.4);
    const dresser = new Dresser(model, "Female");
    const frills = wearOutfit("Female", newLook(), "frills");
    dresser.apply(frills);
    const colour = (mesh: SkinnedMesh) => (mesh.material as MeshLambertMaterial).color;
    // The top band stays the stockings' own white; below it they take on her skin's warmth.
    expect(colour(over).b).toBeLessThan(colour(thigh).b - 0.1);
    dresser.apply({ ...frills, legwear: "thighhigh" });
    expect(colour(over).b).toBeLessThan(colour(thigh).b - 0.1);
    dresser.apply({ ...wearOutfit("Female", newLook(), "dirndl"), legwear: "thighhigh" });
    expect(colour(over).getHex()).toBe(colour(thigh).getHex());
  });

  it("comes with each outfit, and the pirate's rig has none", () => {
    expect(legwearOf("Female", {})!.id).toBe("tights");
    expect(legwearOf("Female", { outfit: "dirndl" })!.id).toBe("noshow");
    expect(legwearOf("Female", { outfit: "dirndl", legwear: "kneehigh" })!.id).toBe("kneehigh");
    expect(legwearOf("Female", { outfit: "pirate", legwear: "tights" })).toBeNull();
    expect(legwearOf("Male", {})).toBeNull();
  });

  it("shows the bands a style reaches, and paints a missing sock cuff in skin", () => {
    const { model, seat, thigh, garter, cuff, skin } = legRig();
    const dresser = new Dresser(model, "Female");
    dresser.apply(newLook());
    expect([seat.visible, thigh.visible, garter.visible]).toEqual([true, true, false]);
    expect((cuff.material as MeshLambertMaterial).name).toBe("T_hose");
    dresser.apply({ ...newLook(), legwear: "garter" });
    expect([seat.visible, thigh.visible, garter.visible]).toEqual([false, true, true]);
    dresser.apply({ ...newLook(), legwear: "leggings" });
    expect(cuff.material).toBe(skin.material);
    dresser.apply({ ...newLook(), legwear: "ankle" });
    expect([seat.visible, thigh.visible]).toEqual([false, false]);
    expect((cuff.material as MeshLambertMaterial).name).toBe("T_hose");
    // Rolled down: every band comes off, and the cuff goes to skin.
    dresser.apply({ ...newLook(), legwear: "garter" });
    dresser.setStripped(["stockings"]);
    expect([seat.visible, thigh.visible, garter.visible]).toEqual([false, false, false]);
    expect(cuff.material).toBe(skin.material);
  });

  it("pulls her T-shirt outfit's leggings down to her knees, bunched in a roll, rather than off", () => {
    const { model, seat, thigh, cuff, skin } = legRig();
    const tee = (material: string) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute([-0.1, 0.5, 0.05], 3));
      geometry.setAttribute("skinIndex", new Uint16BufferAttribute([1, 0, 0, 0], 4));
      geometry.setAttribute("skinWeight", new Float32BufferAttribute([1, 0, 0, 0], 4));
      const mesh = new SkinnedMesh(geometry, new MeshLambertMaterial({ name: material }));
      mesh.name = `Female_ClothTee_${material}`;
      model.getObjectByName("Female")!.add(mesh);
      mesh.bind(seat.skeleton);
      return mesh;
    };
    const [shirt, teeSeat, teeThigh, knee, calf, roll] = ["T_tee", "T_hose", "T_hose_thigh", "T_hose_knee", "T_hose_calf", "T_legroll"].map(tee);
    const dresser = new Dresser(model, "Female");
    const look = wearOutfit("Female", newLook(), "tee");
    dresser.apply(look);
    // Dressed: her tee and leggings, no roll, and none of the tavern dress's own bands.
    expect([shirt, teeSeat, teeThigh, knee, calf, roll].map((m) => m.visible)).toEqual([true, true, true, true, true, false]);
    expect([seat.visible, thigh.visible]).toEqual([false, false]);
    // Down: off her hips and thighs, still on from the knee down, rolled up above it.
    dresser.setStripped(["stockings"]);
    expect([shirt, teeSeat, teeThigh, knee, calf, roll].map((m) => m.visible)).toEqual([true, false, false, true, true, true]);
    expect(cuff.material).toBe(skin.material);
    // Undressed, they're off with everything else.
    dresser.setDressing("nude");
    expect([teeSeat, knee, calf, roll].map((m) => m.visible)).toEqual([false, false, false, false]);
    dresser.setDressing("dressed");
    // Thigh-highs don't reach her hips: they come off as stockings do.
    dresser.apply({ ...look, legwear: "thighhigh" });
    dresser.setStripped(["stockings"]);
    expect([teeThigh, knee, roll].map((m) => m.visible)).toEqual([false, false, false]);
  });

  it("dresses guests in their outfit's legwear unless another is named", () => {
    const { model, seat, garter } = legRig();
    dressColors(model, "Female", {});
    expect([seat.visible, garter.visible]).toEqual([true, false]);
    dressColors(model, "Female", {}, undefined, "garter");
    expect([seat.visible, garter.visible]).toEqual([false, true]);
  });

  it("goes back to the outfit's own when another outfit goes on, and keeps only known styles", () => {
    expect(wearOutfit("Female", { ...newLook(), legwear: "crew" }, "dirndl").legwear).toBeUndefined();
    expect(readLook({ legwear: "overknee" }, "Female")!.legwear).toBe("overknee");
    expect(readLook({ legwear: "fishnets" }, "Female")!.legwear).toBeUndefined();
    expect(copyLook({ ...newLook(), legwear: "capri" }).legwear).toBe("capri");
  });
});
