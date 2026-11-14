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
  // STORY.md section 2 ("The intro, rewritten"), with the two sheltered lines from section 4b.
  {
    cg: "split",
    speaker: "narrator",
    text: "Two winters ago, Father went east on an errand for Grandma Wren. He never said what it was.",
  },
  {
    cg: "coins",
    speaker: "narrator",
    text: "His letters stopped by spring. The money stopped with them. By summer, so had the marriage.",
  },
  {
    cg: "coins",
    speaker: "narrator",
    text: "Mother took in washing. She never said Wren's name again, and she never said why.",
  },
  {
    cg: "coins",
    speaker: "narrator",
    text: "She kept you close after that. Chapel on Sundays, washing on Mondays, and no boys at the door.",
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
    text: "She left the tavern to you. Not to Father. To you.",
  },
  {
    cg: "town",
    speaker: "narrator",
    text: "You're twenty-four now, a grown adult, and the deed has your name on it. Everything you own fits in one bag.",
  },
  { speaker: "you", text: "So this is it. Grandma's tavern." },
  { speaker: "you", text: "It's smaller than I remember. I was eight. Mother got us out in the night and never told me why." },
  { speaker: "you", text: "And the bravest thing I've ever done is ride up this mountain." },
  { speaker: "you", text: "There's a letter waiting on the bar. It has the baron's seal on it." },
  {
    cg: "baron",
    speaker: "narrator",
    text: "Grandma owed the baron {debt} gold. Now you do. He'll send his man to collect once the tavern's on its feet. Until then, every night counts.",
  },
  { speaker: "you", text: "Behind the bar there's a clean square in the dust, where a book used to stand." },
  { speaker: "you", text: "Grandma kept something here. Somebody's taken it. Or been looking for it." },
  { speaker: "you", text: "Mother can't help. Father can't be found. It's just me now." },
  { speaker: "you", text: "Then I open tonight. And I keep my ears open." },
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
