import type { Object3D } from "three";

/**
 * Her soft bust bones (tools/blender/bust_soft.py, after 2AM's "4 bones" jiggle setup): four on each breast, under
 * the Bust bone. BustOuter is the whole breast; BustTip (round the nipple), BustTop (its upper slope) and BustSide
 * (its outer side) hang from it. Together with the Bust bone they carry exactly the weight the Bust bone alone used
 * to, so whatever reads "how much the Bust bone holds this point" counts the whole family.
 */
export const BUST_SOFT_PARTS = ["Outer", "Tip", "Top", "Side"] as const;
export type BustSoftPart = (typeof BUST_SOFT_PARTS)[number];

const SOFT_LABEL = /^Bust(Outer|Tip|Top|Side)_[LR]$/;

/** A bone label (its name without the body's prefix) that is one of the breasts' own soft bones. */
export function isBustSoft(label: string): boolean {
  return SOFT_LABEL.test(label);
}

/** The Bust bone or one of the breasts' soft bones. */
export function isBustFamily(label: string): boolean {
  return label === "Bust" || SOFT_LABEL.test(label);
}

/** The indices, in a skeleton's bones, of the Bust bone and the breasts' soft bones of the body called `body`. */
export function bustFamilyIndices(bones: readonly Object3D[], body: string): Set<number> {
  const prefix = `${body}_`;
  const out = new Set<number>();
  bones.forEach((bone, i) => {
    if (bone.name.startsWith(prefix) && isBustFamily(bone.name.slice(prefix.length))) out.add(i);
  });
  return out;
}
