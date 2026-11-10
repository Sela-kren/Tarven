import { BackSide, Color, Mesh, MeshBasicMaterial, Object3D, SkinnedMesh } from "three";

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

/** A hidden outline around every mesh under `root`. Show it by setting `visible` and swapping `material`. */
export class Outline {
  private readonly hulls: Mesh[] = [];

  constructor(root: Object3D, material: MeshBasicMaterial) {
    const sources: Mesh[] = [];
    root.traverse((object) => {
      if (object instanceof Mesh) sources.push(object);
    });
    for (const source of sources) {
      let hull: Mesh;
      if (source instanceof SkinnedMesh) {
        const skinned = new SkinnedMesh(source.geometry, material);
        skinned.bindMode = source.bindMode;
        skinned.bind(source.skeleton, source.bindMatrix);
        hull = skinned;
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
    }
  }

  /** Shows the outline in this material, or hides it with null. */
  show(material: MeshBasicMaterial | null): void {
    for (const hull of this.hulls) {
      hull.visible = material !== null;
      if (material) hull.material = material;
    }
  }

  dispose(): void {
    for (const hull of this.hulls) hull.removeFromParent();
    this.hulls.length = 0;
  }
}
