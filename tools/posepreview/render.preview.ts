/**
 * Draws the big fight picture's poses (src/game/battlepose.ts) on the real models, off screen, without a browser:
 * the model's skin is posed on the CPU and its triangles filled into a depth buffer, flat-lit. Each picture is
 * written as raw RGBA to POSE_OUT (default tools/posepreview/out), with a JSON index, for a script to lay out.
 *
 * POSES picks which poses (comma separated, default all), BODY the body ("female" or "male"), FACING the side the
 * fight is on ("left", as in a brawl, or "right"), CROP "1" to frame as the card does rather than the whole body.
 *
 * FIGHT_FACES "slut,arousal,stamina,foeStamina" puts on her face for each pose as a brawl picks it (fightface.ts),
 * VARIANTS times over (each a fresh pick, from a fixed seed), and frames her face close, square on.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { Box3, MathUtils, PerspectiveCamera, Mesh, Vector3 } from "three";
import { colourOf, draw, H, stripImages, W } from "./raster";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { applyPose, BATTLE_POSES, poseBones, type BattlePoseName } from "../../src/game/battlepose";
import { cardFraming, facingTurn } from "../../src/game/battleframe";
import { Dresser, newLook } from "../../src/game/appearance";
import { fightFace } from "../../src/game/fightface";

test("render the fight poses", async () => {
  const bodyFile = (process.env.BODY ?? "female").toLowerCase();
  const name = bodyFile === "male" ? "Male" : "Female";
  const facing = (process.env.FACING ?? "left") as "left" | "right";
  const crop = process.env.CROP === "1";
  const out = process.env.POSE_OUT ?? join("tools", "posepreview", "out");
  mkdirSync(out, { recursive: true });
  // MODELS reads the models from another folder, such as a fresh build to try out.
  const file = readFileSync(join(process.env.MODELS ?? join("public", "models"), `${bodyFile}.glb`));
  const gltf = await new GLTFLoader().parseAsync(stripImages(file), "");
  const model = gltf.scene;
  // Only the body as she's dressed by default; every other garment and overlay hidden.
  model.traverse((o) => {
    if (o instanceof Mesh) o.visible = colourOf(o, name) !== null;
  });
  const root = model.getObjectByName(name) ?? model;
  // HAND_SIZE puts a look on first, with that Hand size slider (-1 to 1), to see the hand keep its shape.
  if (process.env.HAND_SIZE) {
    const look = newLook();
    look.sliders.hands = Number(process.env.HAND_SIZE);
    new Dresser(root, name).apply(look);
    model.traverse((o) => {
      if (o instanceof Mesh) o.visible = colourOf(o, name) !== null;
    });
  }
  // FIGHT_FACES dresses her as she comes, so her face can move; what the look leaves hidden (a crease not
  // showing) stays hidden.
  const faces = process.env.FIGHT_FACES?.split(",").map(Number) ?? null;
  const dresser = faces ? new Dresser(root, name) : null;
  if (dresser) {
    dresser.apply(newLook());
    model.traverse((o) => {
      if (o instanceof Mesh) o.visible = o.visible && colourOf(o, name) !== null;
    });
  }
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const variants = Number(process.env.VARIANTS ?? 1);
  const bones = poseBones(model, name);
  const hipsBaseY = bones.hips?.position.y ?? 0;
  const legLength = hipsBaseY + (bones.thighL?.position.y ?? 0);
  const names = (process.env.POSES ? process.env.POSES.split(",") : Object.keys(BATTLE_POSES)) as BattlePoseName[];
  const side = facing === "right" ? 1 : -1;
  const baseTurn = facingTurn(side);
  model.updateMatrixWorld(true);
  const standing = new Box3().setFromObject(model, true);
  // The top of her hair, fixed to her head, so it tips with it.
  const standingHead = bones.head?.getWorldPosition(new Vector3()) ?? new Vector3();
  const crownLocal = bones.head ? bones.head.worldToLocal(new Vector3(standingHead.x, standing.max.y, standingHead.z)) : new Vector3();
  const index: { pose: string; file: string }[] = [];
  // EXPERIMENT: "bone:x,y,z;bone:x,y,z|..." sets raw rotations over the ready pose, one picture per group, to see
  // which way each axis turns a bone on this rig.
  const experiments = process.env.EXPERIMENT ? process.env.EXPERIMENT.split("|") : null;
  const runs = experiments ?? (faces ? names.flatMap((n) => Array.from({ length: variants }, (_, v) => `${n}#${v}`)) : names);
  for (const run of runs) {
    const pose = (experiments ? "ready" : run.split("#")[0]) as BattlePoseName;
    let picked = "";
    if (dresser && faces) {
      const [slut, arousal, stamina, foeStamina] = faces;
      const face = fightFace({ pose, slut, arousal, stamina, foeStamina }, random);
      dresser.setExpression(face.shape);
      picked = `${face.parts.brows}/${face.parts.eyes}/${face.parts.mouth}`;
    }
    const turn = applyPose(bones, BATTLE_POSES[pose], { mirror: facing === "right", female: name === "Female", legLength, hipsBaseY });
    if (experiments) {
      for (const part of run.split(";")) {
        const [bone, values] = part.split(":");
        const [x, y, z] = values.split(",").map(Number);
        model.getObjectByName(`${name}_${bone}`)?.rotation.set(x, y, z);
      }
    }
    // YAW turns the body for a look from another side (1.5708: her right side to the camera).
    model.rotation.set(0, baseTurn + turn + Number(process.env.YAW ?? 0), 0);
    model.updateMatrixWorld(true);
    const camera = new PerspectiveCamera(28, W / H, 0.05, 30);
    // FOCUS puts the camera close on one bone (by its name without the body), to look at a hand.
    const focus = process.env.FOCUS ? model.getObjectByName(`${name}_${process.env.FOCUS}`) : null;
    if (faces && bones.head) {
      // Square on to her face, wherever the pose has turned her head.
      const at = bones.head.localToWorld(new Vector3(0, 0.1, -0.06));
      camera.position.copy(bones.head.localToWorld(new Vector3(0, 0.1, -0.5)));
      camera.lookAt(at);
    } else if (focus) {
      const at = focus.getWorldPosition(new Vector3());
      camera.position.set(at.x + Number(process.env.FOCUS_SIDE ?? 0), at.y, at.z + 0.35);
      camera.lookAt(at);
    } else if (crop) {
      const crown = bones.head ? bones.head.localToWorld(crownLocal.clone()) : new Vector3(0, standing.max.y, 0);
      const frame = cardFraming({ crown, height: standing.max.y, side, fov: camera.fov });
      camera.position.copy(frame.position);
      camera.lookAt(frame.target);
    } else {
      const top = standing.max.y * 1.06;
      const distance = top / 2 / Math.tan(MathUtils.degToRad(camera.fov) / 2);
      camera.position.set(0.25 * side, top / 2, distance);
      camera.lookAt(0, top / 2, 0);
    }
    camera.updateProjectionMatrix();
    const rgba = draw(model, name, camera);
    const label = experiments ? `x${runs.indexOf(run)}` : run.replace("#", "_");
    const fileName = `${bodyFile}_${facing}_${crop ? "crop" : "full"}_${label}.rgba`;
    writeFileSync(join(out, fileName), rgba);
    index.push({ pose: picked ? `${run} ${picked}` : run, file: fileName });
  }
  const kind = experiments ? "exp" : faces ? "face" : crop ? "crop" : "full";
  writeFileSync(join(out, `index_${bodyFile}_${facing}_${kind}.json`), JSON.stringify({ w: W, h: H, items: index }));
  void root;
});
