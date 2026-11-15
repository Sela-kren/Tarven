import { MathUtils, Vector3 } from "three";

/**
 * How the big fight picture frames her, the way Karryn's Prison frames Karryn in a fight: close, from just over her
 * head down to mid-thigh, her head in the top of the picture. The framing follows her head, so when she drops
 * (bent over winded, on her knees) the picture comes down with her rather than zooming out, and each pose reads at
 * the same size, like Karryn's fight set.
 */

/** How much of her standing height the picture shows, from the top down: her head to mid-thigh. */
export const FRAME_KEEP = 0.62;
/** Room left over her hair, as a share of her height. */
export const FRAME_HEADROOM = 0.03;
/** How far the camera stands off to the side of the fight, as a share of her height. */
export const FRAME_SIDE = 0.15;
/** How far the picture shifts to follow her head when it moves aside (1 keeps it centred on her head). */
export const FRAME_FOLLOW = 0.5;

/** How far she stands turned towards the fight, past facing the camera, in radians. */
export const FACE_FIGHT = 0.35;

/**
 * The turn of her whole body in the picture: facing the camera (the model faces -Z at rest), and turned a little
 * towards the fight, on the right of the picture (`side` 1) or the left (-1). Positive turns her to the right.
 */
export function facingTurn(side: number): number {
  return Math.PI + FACE_FIGHT * side;
}

export interface FrameInput {
  /**
   * The top of her hair, where it is in this pose (world space, the body standing at the origin): a point fixed
   * to her head, so it tips with her head when she hangs it.
   */
  crown: Vector3;
  /** How tall she stands. */
  height: number;
  /** The fight on the picture's right (1) or left (-1). */
  side: number;
  fov: number;
}

/** Where the camera stands and what it looks at, to frame her in a pose. */
export function cardFraming(input: FrameInput): { position: Vector3; target: Vector3 } {
  const { crown, height } = input;
  const top = crown.y + FRAME_HEADROOM * height;
  const span = FRAME_KEEP * height;
  const middle = top - span / 2;
  const distance = span / 2 / Math.tan(MathUtils.degToRad(input.fov) / 2);
  const x = crown.x * FRAME_FOLLOW;
  return {
    position: new Vector3(x + FRAME_SIDE * height * input.side, middle + 0.02 * height, distance + crown.z),
    target: new Vector3(x, middle, crown.z),
  };
}
