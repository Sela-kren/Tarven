import { drawCg, type CgName } from "./cg";

/** The narrator, or the player's character speaking. */
export type Speaker = "narrator" | "you";

export interface StoryLine {
  speaker: Speaker;
  /** `{debt}` becomes the gold owed. */
  text: string;
  /** A full-screen picture behind the line. Lines without one show the player in the tavern. */
  cg?: CgName;
}

export const INTRO: StoryLine[] = [
  { cg: "split", speaker: "narrator", text: "Two winters ago, your parents split up. The shouting stopped. So did the money." },
  {
    cg: "coins",
    speaker: "narrator",
    text: "Father went east looking for work and stopped writing. Mother took in washing, and every month it still came up short.",
  },
  {
    cg: "letter",
    speaker: "narrator",
    text: "Then a letter came from Tarven, up on the mountain road. Grandma Wren had passed away in her sleep.",
  },
  {
    cg: "grave",
    speaker: "narrator",
    text: "You buried her on the hill behind the village, where she could see the mountains.",
  },
  {
    cg: "town",
    speaker: "narrator",
    text: "She left her tavern to you. A week later you rode the morning cart up to Tarven, a little market town under the mountains.",
  },
  {
    cg: "town",
    speaker: "narrator",
    text: "Everything you own fits in one bag. The tavern is the biggest building on the high street, its old sign still swinging.",
  },
  { speaker: "you", text: "So this is it. Grandma's tavern." },
  { speaker: "you", text: "It's smaller than I remember. And colder." },
  { speaker: "you", text: "There's a letter waiting on the bar. It has the baron's seal on it." },
  {
    cg: "baron",
    speaker: "narrator",
    text: "Grandma owed the baron {debt} gold. Now you do. He collects in three nights, or the tavern is his.",
  },
  { speaker: "you", text: "Mother can't help. Father won't. It's just me now." },
  { speaker: "you", text: "Then I open tonight. Ale, bread, stew, anything I can sell." },
  { speaker: "you", text: "And I keep my ears open. Grandma always said travellers pay more for secrets than for stew." },
  { speaker: "you", text: "The road gets busy after dark. I'll get the place ready, then open the front door." },
];

/** Letters revealed per second. */
const TYPE_SPEED = 48;

export interface StoryView {
  root: HTMLElement;
  name: HTMLElement;
  text: HTMLElement;
  next: HTMLElement;
  /** Holds the full-screen picture. */
  cg: HTMLElement;
  /** Holds the player's standing sprite. */
  sprite: HTMLElement;
}

/** Details of the player's run that the story fills in. */
export interface Cast {
  /** Which character the player picked: 0 male, 1 female. Pictures that show the player use it. */
  player(): number;
  fill(text: string): string;
}

/** A visual novel scene: pictures, a standing sprite and a dialog box that types each line out. */
export class StoryBox {
  private lines: StoryLine[] = [];
  private index = 0;
  private shown = 0;
  private text = "";
  private cg: CgName | null = null;
  private onFinish: (() => void) | null = null;

  constructor(
    private readonly view: StoryView,
    private readonly cast: Cast,
  ) {}

  get running(): boolean {
    return this.onFinish !== null;
  }

  /** Puts the player's sprite image in place. */
  setSprite(image: HTMLCanvasElement): void {
    this.view.sprite.replaceChildren(image);
  }

  start(lines: StoryLine[], onFinish: () => void): void {
    this.lines = lines;
    this.onFinish = onFinish;
    this.cg = null;
    this.view.root.classList.add("open");
    this.show(0);
  }

  private show(index: number): void {
    const { view } = this;
    this.index = index;
    const line = this.lines[index];
    this.text = this.cast.fill(line.text);
    this.shown = 0;
    view.text.textContent = "";
    view.next.classList.remove("ready");

    const narrator = line.speaker === "narrator";
    view.root.classList.toggle("narrator", narrator);
    view.name.textContent = narrator ? "" : "You";

    // A new picture fades in over the last; dialog lines fade the picture away to show the player.
    const cg = line.cg ?? null;
    if (cg && cg !== this.cg) {
      view.cg.replaceChildren(drawCg(cg, this.cast.player()));
      view.cg.classList.remove("enter");
      void view.cg.offsetWidth; // Restarts the fade-in animation.
      view.cg.classList.add("enter");
    }
    this.cg = cg;
    view.root.classList.toggle("has-cg", cg !== null);

    view.sprite.classList.toggle("speaking", line.speaker === "you");
  }

  /** Finishes typing the current line, or moves to the next one. */
  advance(): void {
    if (!this.running) return;
    if (this.shown < this.text.length) {
      this.shown = this.text.length;
      this.view.text.textContent = this.text;
      this.view.next.classList.add("ready");
    } else if (this.index + 1 < this.lines.length) {
      this.show(this.index + 1);
    } else {
      this.finish();
    }
  }

  finish(): void {
    const done = this.onFinish;
    if (!done) return;
    this.onFinish = null;
    this.view.root.classList.remove("open");
    done();
  }

  update(dt: number): void {
    if (!this.running || this.shown >= this.text.length) return;
    this.shown = Math.min(this.text.length, this.shown + TYPE_SPEED * dt);
    this.view.text.textContent = this.text.slice(0, Math.floor(this.shown));
    if (this.shown >= this.text.length) this.view.next.classList.add("ready");
  }
}
