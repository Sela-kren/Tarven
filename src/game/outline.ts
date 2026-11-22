import { BackSide, BufferGeometry, Color, Material, Mesh, MeshBasicMaterial, Object3D, SkinnedMesh } from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

/** A solid colour drawn on the back faces of a copy pushed out along the normals: an inverted-hull outline. */
export function outlineMaterial(color: number, width: number): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ color: new Color(color), side: BackSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.outlineWidth = { value: width };
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "uniform float outlineWidth;\nvoid main() {")
      // Pushed out in the bind pose, before skinning, so the hull bends with the limbs.
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normal * outlineWidth;");
  };
  return material;
}

/**
 * A copy of a flat-shaded mesh with its corners joined and its normals averaged, so pushing it out along
 * the normals grows it evenly instead of pulling its faces apart at every hard edge.
 */
function smoothHull(geometry: BufferGeometry): BufferGeometry {
  const positions = new BufferGeometry();
  positions.setAttribute("position", geometry.getAttribute("position"));
  if (geometry.index) positions.setIndex(geometry.index);
  const welded = mergeVertices(positions);
  welded.computeVertexNormals();
  return welded;
}

/** A hidden outline around every mesh under `root`. Show it by setting `visible` and swapping `material`. */
export class Outline {
  private readonly hulls: Mesh[] = [];
  /** The mesh each hull outlines, in the same order: a hidden mesh, such as clothing taken off, gets no outline. */
  private readonly sources: Mesh[] = [];
  private readonly ownGeometry: BufferGeometry[] = [];

  /** The material it shows in now, or null while hidden. */
  private shown: MeshBasicMaterial | null = null;

  /** `smooth` rebuilds the normals of rigid, hard-edged meshes such as furniture; skinned meshes keep theirs. */
  constructor(private readonly root: Object3D, private readonly material: MeshBasicMaterial, private readonly smooth = false) {
    this.outlineNew();
  }

  /** Outlines meshes added under its root since (an outfit loaded later, outfitfiles.ts), shown as the rest are. */
  refresh(): void {
    this.outlineNew();
    this.show(this.shown);
  }

  private outlineNew(): void {
    const { material, smooth } = this;
    const sources: Mesh[] = [];
    const done = new Set<Object3D>([...this.sources, ...this.hulls]);
    this.root.traverse((object) => {
      // Cut-out cards (her strand hair) are left out: their hull would outline every card's whole rectangle.
      const cutOut = (m: Material | Material[]) => (Array.isArray(m) ? m : [m]).some((x) => x.alphaTest > 0);
      if (object instanceof Mesh && !done.has(object) && !cutOut(object.material)) sources.push(object);
    });
    for (const source of sources) {
      let hull: Mesh;
      if (source instanceof SkinnedMesh) {
        const skinned = new SkinnedMesh(source.geometry, material);
        skinned.bindMode = source.bindMode;
        skinned.bind(source.skeleton, source.bindMatrix);
        // The same morph weights as its mesh (his physique), shared so it keeps following them.
        if (source.morphTargetInfluences) {
          skinned.morphTargetInfluences = source.morphTargetInfluences;
          skinned.morphTargetDictionary = source.morphTargetDictionary;
        }
        hull = skinned;
      } else if (smooth) {
        const geometry = smoothHull(source.geometry);
        this.ownGeometry.push(geometry);
        hull = new Mesh(geometry, material);
      } else {
        hull = new Mesh(source.geometry, material);
      }
      hull.name = `${source.name}_Outline`;
      hull.position.copy(source.position);
      hull.quaternion.copy(source.quaternion);
      hull.scale.copy(source.scale);
      hull.castShadow = false;
      hull.receiveShadow = false;
      hull.frustumCulled = false;
      hull.visible = false;
      source.parent?.add(hull);
      this.hulls.push(hull);
      this.sources.push(source);
    }
  }

  /** Shows the outline in this material, or hides it with null. */
  show(material: MeshBasicMaterial | null): void {
    this.shown = material;
    this.hulls.forEach((hull, i) => {
      hull.visible = material !== null && this.sources[i].visible;
      if (material) hull.material = material;
    });
  }

  dispose(): void {
    for (const hull of this.hulls) hull.removeFromParent();
    this.hulls.length = 0;
    this.sources.length = 0;
    for (const geometry of this.ownGeometry) geometry.dispose();
    this.ownGeometry.length = 0;
  }
}
