/**
 * Cards that pop in at the top of the screen when she gains something: a new passive, a stat or skill level, a
 * change in her kink. Big and plain enough that the player can't miss it, the way Karryn's pop a banner, and gone
 * again on their own. The same news also goes in the log and on the morning report.
 */

export type ToastTone = "passive" | "level" | "kink" | "debuff";

export interface Toast {
  tone: ToastTone;
  /** The small label over the name: "New passive", "Level up". */
  tag: string;
  title: string;
  /** Lines under the name: what it does. A line starting with "+" shows green, "-" red, anything else plain. */
  lines: readonly string[];
  /** An inline SVG icon, if there is one. */
  icon?: string;
}

/** How long a card stays, in seconds, and how many show at once; the rest wait their turn. */
const LIFE = 6;
const FADE = 0.6;
const MAX_SHOWN = 4;

interface Shown {
  el: HTMLElement;
  left: number;
}

export class UnlockToasts {
  private readonly root = document.createElement("div");
  private readonly shown: Shown[] = [];
  private readonly waiting: Toast[] = [];

  constructor(parent: HTMLElement = document.body) {
    this.root.id = "unlock-toasts";
    this.root.setAttribute("role", "status");
    this.root.setAttribute("aria-live", "polite");
    parent.append(this.root);
  }

  show(toast: Toast): void {
    this.waiting.push(toast);
    this.fill();
  }

  update(dt: number): void {
    for (let i = this.shown.length - 1; i >= 0; i--) {
      const card = this.shown[i];
      card.left -= dt;
      if (card.left <= 0) {
        card.el.remove();
        this.shown.splice(i, 1);
      } else if (card.left < FADE) {
        card.el.classList.add("leaving");
      }
    }
    this.fill();
  }

  private fill(): void {
    while (this.shown.length < MAX_SHOWN && this.waiting.length > 0) {
      const el = card(this.waiting.shift()!);
      // Click it away early.
      el.addEventListener("click", () => {
        const shown = this.shown.find((s) => s.el === el);
        if (shown) shown.left = Math.min(shown.left, FADE);
      });
      this.root.append(el);
      this.shown.push({ el, left: LIFE });
    }
  }
}

function card(toast: Toast): HTMLElement {
  const el = document.createElement("div");
  el.className = `unlock-toast ${toast.tone}`;
  const icon = document.createElement("span");
  icon.className = "icon";
  if (toast.icon) icon.innerHTML = toast.icon;
  const body = document.createElement("div");
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = toast.tag;
  const title = document.createElement("b");
  title.textContent = toast.title;
  body.append(tag, title);
  for (const line of toast.lines) {
    const p = document.createElement("p");
    p.className = line.startsWith("+") ? "good" : line.startsWith("-") ? "bad" : "plain";
    p.textContent = line;
    body.append(p);
  }
  el.append(icon, body);
  return el;
}
