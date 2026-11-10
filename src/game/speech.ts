import { Vector3, type Camera } from "three";
import { BUBBLE_TYPE_SPEED, type Said } from "./chatter";
import { pixelSvg } from "./icons";
import { MOOD_LABELS, type Mood } from "./mood";

/** How long a bubble takes to fade once its time is up. */
const FADE = 0.25;
/** Bubbles keep this many pixels clear of the edge of the screen. */
const MARGIN = 8;

export interface Speaker {
  id: number;
  said: Said;
  /** The point in the room the bubble's tail points at, just above the speaker's head. */
  at: Vector3;
  /** They're talking about you and you're too far off to make it out. */
  hushed: boolean;
}

interface Bubble {
  root: HTMLElement;
  /** The state the speaker is in. */
  status: HTMLElement;
  /** The letters said so far. */
  shown: HTMLElement;
  /** The letters still to come, there but invisible, so the bubble doesn't grow as it types. */
  rest: HTMLElement;
  text: string;
  hushed: boolean;
  letters: number;
}

const point = new Vector3();

const icon = (rows: readonly string[]) => pixelSvg(rows, { "#": "currentColor" });

const MOOD_ICONS: Record<Exclude<Mood, "calm">, string> = {
  happy: icon([".#####.", "#.....#", "#.#.#.#", "#.....#", "#.#.#.#", "#..#..#", ".#####."]),
  angry: icon(["##.#.##", "#..#..#", ".......", "###.###", ".......", "#..#..#", "##.#.##"]),
  lust: icon([".##.##.", "#######", "#######", ".#####.", "..###..", "...#...", "......."]),
  idolize: icon(["...#...", "...#...", "#######", ".#####.", "..###..", ".##.##.", ".#...#."]),
  drunk: icon([".####..", ".#..###", ".#..#.#", ".#..#.#", ".#..###", ".####..", "......."]),
  gloomy: icon(["...#...", "...#...", "..###..", ".#####.", ".#####.", "..###..", "......."]),
  scared: icon(["..###..", "..###..", "..###..", "...#...", "...#...", ".......", "...#..."]),
  scheming: icon(["...#...", "..###..", ".#.#...", "..###..", "...#.#.", "..###..", "...#..."]),
};
const EYE_ICON = icon([".......", "..###..", ".#...#.", "#..#..#", ".#...#.", "..###..", "......."]);

/** A whisper: you can see that something's being said, but not what. */
function muffled(text: string): string {
  return text.replace(/\S/g, "·");
}

/** The speech bubbles over the guests' heads, laid over the room as page elements so the words stay sharp. */
export class SpeechBubbles {
  private readonly bubbles = new Map<number, Bubble>();

  constructor(private readonly root: HTMLElement) {}

  private create(id: number): Bubble {
    const root = document.createElement("div");
    const status = document.createElement("div");
    status.className = "status";
    const shown = document.createElement("span");
    const rest = document.createElement("span");
    rest.className = "rest";
    root.append(status, shown, rest);
    this.root.append(root);
    const bubble = { root, status, shown, rest, text: "", hushed: false, letters: -1 };
    this.bubbles.set(id, bubble);
    return bubble;
  }

  /** The row over the words: what state they're in, and whether it's you they're on about. */
  private drawStatus(bubble: Bubble, said: Said, hushed: boolean): void {
    let markup = "";
    if (said.mood !== "calm") markup += `<span>${MOOD_ICONS[said.mood]}${MOOD_LABELS[said.mood]}</span>`;
    if (said.aboutYou) markup += `<span class="about">${EYE_ICON}${hushed ? "Whispering" : "About you"}</span>`;
    bubble.status.innerHTML = markup;
    bubble.status.hidden = markup === "";
  }

  /** Draws everyone who's talking this frame, and removes the bubbles of anyone who's stopped. */
  render(speakers: readonly Speaker[], camera: Camera): void {
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    const live = new Set<number>();

    for (const { id, said, at, hushed } of speakers) {
      point.copy(at).project(camera);
      // Past the far plane means it's behind the camera.
      if (point.z > 1) continue;
      live.add(id);

      const bubble = this.bubbles.get(id) ?? this.create(id);
      const newLine = bubble.text !== said.text;
      if (newLine || bubble.hushed !== hushed) {
        bubble.text = said.text;
        bubble.hushed = hushed;
        bubble.letters = -1;
        bubble.root.className = `bubble ${said.tone} mood-${said.mood}${hushed ? " hushed" : ""}`;
        this.drawStatus(bubble, said, hushed);
      }
      if (newLine) {
        // Restarts the pop for a new line from someone already talking.
        bubble.root.style.animation = "none";
        void bubble.root.offsetWidth;
        bubble.root.style.animation = "";
      }
      const letters = Math.min(said.text.length, Math.floor(said.age * BUBBLE_TYPE_SPEED));
      if (bubble.letters !== letters) {
        const words = hushed ? muffled(said.text) : said.text;
        bubble.letters = letters;
        bubble.shown.textContent = words.slice(0, letters);
        bubble.rest.textContent = words.slice(letters);
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
