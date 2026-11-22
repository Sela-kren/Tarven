/**
 * Her outfits as files of their own, loaded when she first wears one (tools/blender/glb_split.py splits her model at
 * Send). The base model has everything she always needs (her body, hair, shoes, jewellery, the plain tavern dress and
 * her skeleton) and lists the rest in its `asset.extras.tarvenOutfits`: {"Tee": "female/Tee.glb", ...}. Each outfit
 * file holds that outfit's meshes and the same skeleton, so its meshes are bound onto a character's own bones by name
 * (attachOutfit) and handed to her Dresser (Dresser.addMeshes).
 *
 * The game asks for an outfit as she puts it on (game.ts applyLook: she keeps what she had on until it's in), fetches
 * her start outfit with the model, and fetches the rest one by one in the background once the game is running, so
 * guests (who wear their plain clothes until theirs is in) soon have all of them.
 */
import { Skeleton, SkinnedMesh, type Bone, type Object3D } from "three";

/** The outfit files a split model lists: each outfit's mesh name ("Tee") and its file, relative to the model's folder. */
export type OutfitList = Readonly<Record<string, string>>;

/** The outfit files listed by a loaded model's glTF `asset`, or null if it has all its outfits in it. */
export function outfitListOf(asset: { extras?: Record<string, unknown> } | undefined): OutfitList | null {
  const listed = asset?.extras?.tarvenOutfits;
  return listed && typeof listed === "object" ? (listed as OutfitList) : null;
}

/** An outfit's own objects in a loaded outfit file: the top "<Body>_Cloth<Outfit>" objects (a group per mesh). */
function outfitObjects(scene: Object3D): Object3D[] {
  const out: Object3D[] = [];
  const isOutfit = (o: Object3D | null) => !!o && /_Cloth[A-Z]/.test(o.name);
  scene.traverse((o) => {
    if (isOutfit(o) && !isOutfit(o.parent)) out.push(o);
  });
  return out;
}

/**
 * Puts copies of a loaded outfit file's objects onto a character (its loaded model, or a body taken out of one): each
 * under the object of the same name as its parent in the file (her armature), each skinned mesh bound to the
 * character's own bones by name. The file's own objects are left for the next character. Returns the skinned meshes.
 */
export function attachOutfit(outfit: Object3D, character: Object3D): SkinnedMesh[] {
  const byName = new Map<string, Object3D>();
  character.traverse((o) => {
    if (o.name && !byName.has(o.name)) byName.set(o.name, o);
  });
  const added: SkinnedMesh[] = [];
  for (const top of outfitObjects(outfit)) {
    // Already on (a second request answered twice): left as it is.
    if (byName.has(top.name)) continue;
    const parent = (top.parent && byName.get(top.parent.name)) || character;
    const copy = top.clone(true);
    copy.traverse((o) => {
      if (!(o instanceof SkinnedMesh)) return;
      const bones = o.skeleton.bones.map((bone) => {
        const own = byName.get(bone.name);
        if (!own) throw new Error(`${o.name}: ${character.name} has no bone ${bone.name}`);
        return own as Bone;
      });
      o.bind(new Skeleton(bones, o.skeleton.boneInverses.map((m) => m.clone())), o.bindMatrix.clone());
      added.push(o);
    });
    parent.add(copy);
  }
  return added;
}

/** Where a character's outfit files are, which are in, and who's told when one arrives. */
export class OutfitFiles {
  private readonly loading = new Map<string, Promise<Object3D | null>>();
  private readonly loaded = new Map<string, Object3D>();
  private readonly listeners: ((mesh: string, outfit: Object3D) => void)[] = [];

  /**
   * `list` is the model's (outfitListOf); `fetch` loads one file (a path relative to the model's folder) as a scene
   * ready to wear: its materials made the game's, its packed attributes unpacked.
   */
  constructor(readonly list: OutfitList, private readonly fetch: (path: string) => Promise<Object3D>) {}

  /** Whether a character has this outfit's meshes: in the base model (not listed), or its file is in. */
  has(mesh: string): boolean {
    return !(mesh in this.list) || this.loaded.has(mesh);
  }

  /**
   * Calls `listener` for each outfit file as it arrives (with the loaded scene, to attachOutfit), and at once for those
   * already in (her start outfit, fetched with the model).
   */
  onLoad(listener: (mesh: string, outfit: Object3D) => void): void {
    this.listeners.push(listener);
    for (const [mesh, outfit] of this.loaded) listener(mesh, outfit);
  }

  /** Fetches an outfit's file, once; resolves when it's in and every listener has it. A missing file is warned of. */
  request(mesh: string): Promise<void> {
    if (this.has(mesh)) return Promise.resolve();
    let pending = this.loading.get(mesh);
    if (!pending) {
      pending = this.fetch(this.list[mesh]).then(
        (outfit) => {
          this.loaded.set(mesh, outfit);
          for (const listener of this.listeners) listener(mesh, outfit);
          return outfit;
        },
        (error) => {
          console.warn(`outfit ${mesh} didn't load:`, error);
          this.loading.delete(mesh);
          return null;
        },
      );
      this.loading.set(mesh, pending);
    }
    return pending.then(() => undefined);
  }

  /** Fetches every outfit not in yet, one at a time (so they don't crowd out anything the game asks for). */
  async prefetch(): Promise<void> {
    for (const mesh of Object.keys(this.list)) await this.request(mesh);
  }
}
