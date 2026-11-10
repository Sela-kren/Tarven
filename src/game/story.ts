import { drawCg, type CgName } from "./cg";

/** The narrator, the sibling the player chose, or the other one. */
export type Speaker = "narrator" | "you" | "other";

export interface StoryLine {
  speaker: Speaker;
  /** `{other}` becomes "your brother" or "your sister"; `{debt}` the gold owed. */
  text: string;
  /** A full-screen picture behind the line. Lines without one show the siblings in the tavern. */
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
    text: "She left her tavern to you and {other}. A week later you rode the morning cart up to Tarven, a little market town under the mountains.",
  },
  {
    cg: "town",
    speaker: "narrator",
    text: "Everything you own fits in two bags. The tavern is the biggest building on the high street, its old sign still swinging.",
  },
  { speaker: "other", text: "So this is it. Grandma's tavern." },
  { speaker: "you", text: "It's smaller than I remember. And colder." },
  { speaker: "other", text: "There was a letter waiting on the bar. It has the baron's seal on it." },
  {
    cg: "baron",
    speaker: "narrator",
    text: "Grandma owed the baron {debt} gold. Now you do. He collects in three nights, or the tavern is his.",
  },
  { speaker: "other", text: "Mother can't help us. Father won't. It's just us now." },
  { speaker: "you", text: "Then we open tonight. Ale, bread, anything we can sell." },
  { speaker: "other", text: "And we keep our ears open. Grandma always said travellers pay more for secrets than for stew." },
  {
    cg: "townDusk",
    speaker: "narrator",
    text: "By evening the lamps are lit along the high street, and the first travellers off the mountain road are walking up to your door.",
  },
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
  /** Standing sprites: the brother on the left, the sister on the right. */
  sprites: [HTMLElement, HTMLElement];
}

/** Who a speaker is, for the name tag and which sprite steps forward. */
export interface Cast {
  name(speaker: Speaker): string;
  /** 0 for the brother, 1 for the sister, null for the narrator. */
  sprite(speaker: Speaker): number | null;
  fill(text: string): string;
}

/** A visual novel scene: pictures, standing sprites and a dialog box that types each line out. */
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

  /** Puts each sibling's sprite image in place. */
  setSprites(images: [HTMLCanvasElement, HTMLCanvasElement]): void {
    this.view.sprites.forEach((holder, index) => holder.replaceChildren(images[index]));
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
    view.name.textContent = narrator ? "" : this.cast.name(line.speaker);

    // A new picture fades in over the last; dialog lines fade the picture away to show the siblings.
    const cg = line.cg ?? null;
    if (cg && cg !== this.cg) {
      view.cg.replaceChildren(drawCg(cg));
      view.cg.classList.remove("enter");
      void view.cg.offsetWidth; // Restarts the fade-in animation.
      view.cg.classList.add("enter");
    }
    this.cg = cg;
    view.root.classList.toggle("has-cg", cg !== null);

    const talking = this.cast.sprite(line.speaker);
    view.sprites.forEach((sprite, i) => {
      sprite.classList.toggle("speaking", talking === i);
      sprite.classList.toggle("listening", talking !== null && talking !== i);
    });
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
