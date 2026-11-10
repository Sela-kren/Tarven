import type { TalkChoice, TalkLine } from "./tavern";

/** Letters revealed per second, a touch quicker than the intro so service doesn't drag. */
const TYPE_SPEED = 60;

export interface DialogueView {
  root: HTMLElement;
  /** Holds the portrait of the guest speaking, on the left. */
  guest: HTMLElement;
  /** Holds the player's portrait, on the right. */
  you: HTMLElement;
  name: HTMLElement;
  text: HTMLElement;
  next: HTMLElement;
  choices: HTMLElement;
}

/**
 * A conversation in the tavern, shown like the intro: a name tag, a box that types each line out, and the
 * people talking standing either side. Lines play one at a time; after the last, the choices appear.
 */
export class DialogueBox {
  private lines: TalkLine[] = [];
  private choices: TalkChoice[] = [];
  private onChoose: ((index: number) => void) | null = null;
  private index = 0;
  private shown = 0;
  private text = "";

  constructor(
    private readonly view: DialogueView,
    /** The portrait for whoever says a line, or null for none. */
    private readonly portraitFor: (line: TalkLine) => HTMLCanvasElement | null,
  ) {
    view.root.addEventListener("click", () => this.advance());
  }

  get open(): boolean {
    return this.onChoose !== null;
  }

  /** True once every line has been shown and the choices are up. */
  get choosing(): boolean {
    return this.open && this.index === this.lines.length - 1 && this.shown >= this.text.length;
  }

  /** Plays `lines`, then offers `choices`; picking one calls `onChoose` with its index. */
  start(lines: TalkLine[], choices: TalkChoice[], onChoose: (index: number) => void): void {
    this.lines = lines.length > 0 ? lines : [{ speaker: null, text: "..." }];
    this.choices = choices;
    this.onChoose = onChoose;
    this.view.root.classList.add("open");
    this.show(0);
  }

  close(): void {
    this.onChoose = null;
    this.view.root.classList.remove("open");
    this.view.choices.replaceChildren();
  }

  private show(index: number): void {
    const { view } = this;
    const line = this.lines[index];
    this.index = index;
    this.text = line.text;
    this.shown = 0;
    view.text.textContent = "";
    view.next.classList.remove("ready");
    view.choices.replaceChildren();

    view.name.textContent = line.speaker ?? "";
    view.root.classList.toggle("narrator", line.speaker === null);

    // The speaker steps forward; the other side stays, dimmed, so you can see who you're talking to.
    const yours = line.speaker === "You";
    const portrait = this.portraitFor(line);
    const side = yours ? view.you : view.guest;
    if (portrait && side.firstChild !== portrait) side.replaceChildren(portrait);
    if (line.speaker !== null) {
      view.you.classList.toggle("speaking", yours);
      view.guest.classList.toggle("speaking", !yours);
      // Restarts the little hop, so each new line from the same person still reads as a new line.
      side.classList.remove("hop");
      void side.offsetWidth;
      side.classList.add("hop");
    } else {
      view.you.classList.remove("speaking");
      view.guest.classList.remove("speaking");
    }
  }

  /** Finishes typing the line, shows the next, or does nothing once the choices are up. */
  advance(): void {
    if (!this.open || this.choosing) return;
    if (this.shown < this.text.length) {
      this.shown = this.text.length;
      this.view.text.textContent = this.text;
      this.lineDone();
    } else {
      this.show(this.index + 1);
    }
  }

  /** Picks a choice by its index, when the choices are showing and it isn't greyed out. */
  choose(index: number): void {
    const choice = this.choices[index];
    if (!this.choosing || !choice || choice.disabled) return;
    this.onChoose?.(index);
  }

  private lineDone(): void {
    if (this.index < this.lines.length - 1) {
      this.view.next.classList.add("ready");
      return;
    }
    const buttons = this.choices.map((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${index + 1}. ${choice.label}`;
      button.disabled = choice.disabled;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this.choose(index);
      });
      return button;
    });
    this.view.choices.replaceChildren(...buttons);
  }

  update(dt: number): void {
    if (!this.open || this.shown >= this.text.length) return;
    this.shown = Math.min(this.text.length, this.shown + TYPE_SPEED * dt);
    this.view.text.textContent = this.text.slice(0, Math.floor(this.shown));
    if (this.shown >= this.text.length) this.lineDone();
  }
}
