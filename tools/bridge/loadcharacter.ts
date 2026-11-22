/**
 * Loads a character for the tools (Node), the way the game does: her model (a split one with its outfit files merged
 * back in, glb_split.py), its packed attributes unpacked, and a Dresser over it. With `late`, as the game itself
 * does: the base alone first, then each outfit file put on her (outfitfiles.ts attachOutfit, Dresser.addMeshes).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Object3D } from "three";
import { Dresser, type BodyName } from "../../src/game/appearance";
import { attachOutfit, outfitListOf } from "../../src/game/outfitfiles";
import { unpackModel } from "../../src/game/unpack";
import { stripImages } from "../posepreview/raster";

export interface LoadedCharacter {
  model: Object3D;
  root: Object3D;
  dresser: Dresser;
  /** With `late`, puts on every outfit not in the base yet (as the game does once their files arrive). */
  addAll(): Promise<void>;
}

async function parse(path: string, merge: boolean) {
  const gltf = await new GLTFLoader().parseAsync(stripImages(readFileSync(path), dirname(path), merge), "");
  unpackModel(gltf.scene);
  return gltf;
}

/** A model as the tools want it: a split one with its outfit files merged back in. */
export async function parseGlb(path: string): Promise<Object3D> {
  return (await parse(path, true)).scene;
}

export async function loadCharacterNode(body: BodyName, path?: string, options: { late?: boolean } = {}): Promise<LoadedCharacter> {
  const file = path ?? join("public", "models", `${body.toLowerCase()}.glb`);
  const gltf = await parse(file, !options.late);
  const model = gltf.scene;
  const root = model.getObjectByName(body) ?? model;
  const dresser = new Dresser(root, body);
  const list = options.late ? outfitListOf(gltf.asset) : null;
  const addAll = async () => {
    for (const relative of Object.values(list ?? {})) {
      const outfit = (await parse(join(dirname(file), relative), false)).scene;
      dresser.addMeshes(attachOutfit(outfit, root));
    }
  };
  return { model, root, dresser, addAll };
}
