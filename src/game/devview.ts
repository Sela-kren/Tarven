import { Object3D, PerspectiveCamera, Vector3 } from "three";
import type { Game } from "./game";

/**
 * Development only: puts the game's camera where a Blender camera is around her master file, and takes the frame
 * the game draws from there (with the retro screen pass, vertex snapping and all), so the Blender bridge can set
 * the game's own picture beside Blender's. Reached from the browser console as `__tarven.viewHer(...)` and
 * `__tarven.shot()`.
 *
 * Blender's places are Z-up around her master's origin: (x, y, z) there is (x, z, -y) in her model, which is then
 * placed wherever she stands in the game.
 */
export class DevView {
  private view: { eye: Vector3; target: Vector3; fov: number; near: number } | null = null;
  private waiting: ((url: string) => void)[] = [];
  private readonly fov: number;
  private readonly near: number;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly game: Game,
    private readonly canvas: HTMLCanvasElement,
  ) {
    this.fov = camera.fov;
    this.near = camera.near;
  }

  /** Her model's root (the "Female" node) as the game has placed her. */
  private her(): Object3D | null {
    for (const sibling of this.game.siblings) {
      const root = sibling.root.getObjectByName("Female");
      if (root?.getObjectByName("Female_Body")) return root;
    }
    return null;
  }

  /** Looks at her from a Blender camera (eye and target in her master's Blender space, fov in degrees,
   * vertical), or back to the game's own camera with null. */
  viewHer(view: { eye: [number, number, number]; target: [number, number, number]; fov?: number } | null): boolean {
    if (!view) {
      this.view = null;
      this.camera.fov = this.fov;
      this.camera.near = this.near;
      this.camera.updateProjectionMatrix();
      return true;
    }
    const her = this.her();
    if (!her) return false;
    her.updateMatrixWorld(true);
    const place = ([x, y, z]: [number, number, number]) => new Vector3(x, z, -y).applyMatrix4(her.matrixWorld);
    this.view = { eye: place(view.eye), target: place(view.target), fov: view.fov ?? this.fov, near: 0.05 };
    return true;
  }

  /** Puts the camera at the Blender view, if one is set; true when it did (the game's camera then waits). */
  apply(): boolean {
    if (!this.view) return false;
    this.camera.position.copy(this.view.eye);
    this.camera.lookAt(this.view.target);
    if (this.camera.fov !== this.view.fov || this.camera.near !== this.view.near) {
      this.camera.fov = this.view.fov;
      this.camera.near = this.view.near;
      this.camera.updateProjectionMatrix();
    }
    return true;
  }

  /** The next frame the game draws, as a PNG data URL. */
  shot(): Promise<string> {
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  /** Called right after a frame is drawn: hands it to whoever asked for a shot. */
  afterRender(): void {
    if (!this.waiting.length) return;
    const url = this.canvas.toDataURL("image/png");
    for (const done of this.waiting.splice(0)) done(url);
  }
}
