/**
 * The message log under the stats in the top-left corner: what just happened, what was said at the table, and
 * any passive she's just earned. Newest at the bottom; each line fades out after a while, passives last longest.
 */
import type { PassiveDef } from "./passives";
import type { TalkLine } from "./tavern";

export type LogKind = "info" | "talk" | "choice" | "passive" | "ai";

/** Lines kept on screen at once; older ones drop off the top. */
const MAX_LINES = 9;
/** How long each kind of line stays, in seconds. */
const LIFE: Record<LogKind, number> = { info: 6, talk: 8, choice: 8, passive: 14, ai: 12 };
/** The last seconds of a line's life, spent fading out. */
const FADE_SECONDS = 1.2;

interface Entry {
  el: HTMLElement;
  text: string;
  left: number;
  repeats: number;
}

export class MessageLog {
  private readonly root = document.createElement("div");
  private readonly entries: Entry[] = [];

  constructor(parent: HTMLElement) {
    this.root.className = "log";
    this.root.setAttribute("role", "log");
    this.root.setAttribute("aria-live", "polite");
    parent.append(this.root);
  }

  /** A line of news. The same line twice in a row counts up instead of repeating. */
  add(text: string, kind: LogKind = "info"): void {
    if (!text) return;
    const last = this.entries.at(-1);
    if (last && last.text === text) {
      last.repeats++;
      last.left = LIFE[kind];
      last.el.style.opacity = "";
      last.el.dataset.repeats = `×${last.repeats}`;
      return;
    }
    const el = document.createElement("p");
    el.className = `line ${kind}`;
    el.textContent = text;
    this.push({ el, text, left: LIFE[kind], repeats: 1 });
  }

  /** Something said in a conversation: the speaker's name, then their words; narration on its own. */
  addTalk(line: TalkLine): void {
    if (!line.speaker) return this.add(line.text, "talk");
    const el = document.createElement("p");
    el.className = "line talk";
    const who = document.createElement("b");
    who.textContent = `${line.speaker}: `;
    el.append(who, line.text);
    this.push({ el, text: `${line.speaker}: ${line.text}`, left: LIFE.talk, repeats: 1 });
  }

  /** What she picked in a conversation. */
  addChoice(label: string): void {
    this.add(`› ${label}`, "choice");
  }

  /** A passive she's just earned: its name, and what it does for her. */
  addPassive(def: PassiveDef): void {
    const el = document.createElement("p");
    el.className = "line passive";
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = "New passive";
    const name = document.createElement("b");
    name.textContent = def.name;
    const what = document.createElement("span");
    what.className = "what";
    what.textContent = def.benefit;
    el.append(tag, name, what);
    this.push({ el, text: `New passive: ${def.name}`, left: LIFE.passive, repeats: 1 });
  }

  update(dt: number): void {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      entry.left -= dt;
      if (entry.left <= 0) {
        entry.el.remove();
        this.entries.splice(i, 1);
      } else if (entry.left < FADE_SECONDS) {
        entry.el.style.opacity = String(entry.left / FADE_SECONDS);
      }
    }
  }

  /** Empties the log, for a loaded game. */
  clear(): void {
    for (const entry of this.entries) entry.el.remove();
    this.entries.length = 0;
  }

  private push(entry: Entry): void {
    this.entries.push(entry);
    this.root.append(entry.el);
    while (this.entries.length > MAX_LINES) this.entries.shift()?.el.remove();
  }
}
