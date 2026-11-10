import { Vector3, type Camera } from "three";
import { BUBBLE_TYPE_SPEED, type Said } from "./chatter";

/** How long a bubble takes to fade once its time is up. */
const FADE = 0.25;
/** Bubbles keep this many pixels clear of the edge of the screen. */
const MARGIN = 8;

export interface Speaker {
  id: number;
  said: Said;
  /** The point in the room the bubble's tail points at, just above the speaker's head. */
  at: Vector3;
}

interface Bubble {
  root: HTMLElement;
  /** The letters said so far. */
  shown: HTMLElement;
  /** The letters still to come, there but invisible, so the bubble doesn't grow as it types. */
  rest: HTMLElement;
  text: string;
}

const point = new Vector3();

/** The speech bubbles over the guests' heads, laid over the room as page elements so the words stay sharp. */
export class SpeechBubbles {
  private readonly bubbles = new Map<number, Bubble>();

  constructor(private readonly root: HTMLElement) {}

  private create(id: number): Bubble {
    const root = document.createElement("div");
    const shown = document.createElement("span");
    const rest = document.createElement("span");
    rest.className = "rest";
    root.append(shown, rest);
    this.root.append(root);
    const bubble = { root, shown, rest, text: "" };
    this.bubbles.set(id, bubble);
    return bubble;
  }

  /** Draws everyone who's talking this frame, and removes the bubbles of anyone who's stopped. */
  render(speakers: readonly Speaker[], camera: Camera): void {
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    const live = new Set<number>();

    for (const { id, said, at } of speakers) {
      point.copy(at).project(camera);
      // Past the far plane means it's behind the camera.
      if (point.z > 1) continue;
      live.add(id);

      const bubble = this.bubbles.get(id) ?? this.create(id);
      if (bubble.text !== said.text) {
        bubble.text = said.text;
        bubble.root.className = `bubble ${said.tone}`;
        // Restarts the pop for a new line from someone already talking.
        bubble.root.style.animation = "none";
        void bubble.root.offsetWidth;
        bubble.root.style.animation = "";
      }
      const letters = Math.min(said.text.length, Math.floor(said.age * BUBBLE_TYPE_SPEED));
      if (bubble.shown.textContent?.length !== letters) {
        bubble.shown.textContent = said.text.slice(0, letters);
        bubble.rest.textContent = said.text.slice(letters);
      }
      bubble.root.style.opacity = String(Math.min(1, (said.duration - said.age) / FADE));

      const halfWidth = bubble.root.offsetWidth / 2;
      const x = Math.min(width - halfWidth - MARGIN, Math.max(halfWidth + MARGIN, ((point.x + 1) / 2) * width));
      const y = Math.max(bubble.root.offsetHeight + MARGIN, ((1 - point.y) / 2) * height);
      bubble.root.style.left = `${Math.round(x)}px`;
      bubble.root.style.top = `${Math.round(y)}px`;
    }

    for (const [id, bubble] of this.bubbles) {
      if (live.has(id)) continue;
      bubble.root.remove();
      this.bubbles.delete(id);
    }
  }
}
