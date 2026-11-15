import type { Input } from "./input";

/**
 * Plays any on-screen menu from the keyboard: W/S (or the arrows) move a cursor through its buttons, sliders, tick
 * boxes and drop-downs, top to bottom; A/D (or left/right) slide a slider or step a drop-down; and E, Enter or
 * Space picks what the cursor is on. Esc stays with each screen, which knows what backing out means there.
 *
 * The cursor is the same light as a mouse hover (`kb-cursor` in pixel.css and panel.css), and the mouse moves it
 * too, so only one control is ever lit. Whoever owns the screen passes in the element its controls sit in each
 * frame; when that menu is rebuilt, the cursor comes back to the first control.
 */

const TARGETS = [
  "button:not(:disabled)",
  "input[type=range]:not(:disabled)",
  "input[type=checkbox]:not(:disabled)",
  "select:not(:disabled)",
].join(", ");

export const CURSOR_CLASS = "kb-cursor";

const PICK_KEYS = ["KeyE", "Enter", "Space"];
const MOVE_KEYS = ["KeyW", "KeyS", "KeyA", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

/** How many presses of A or D take a slider from one end to the other. */
const SLIDER_PRESSES = 20;

/** Whether an element is drawn at all: not hidden, nor inside something closed. */
function shown(el: HTMLElement): boolean {
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
}

export class KeyNav {
  private root: HTMLElement | null = null;
  private current: HTMLElement | null = null;

  constructor(private readonly input: Input) {
    // The mouse moves the same cursor, so a hovered control and a keyed one are never lit at once.
    document.addEventListener("pointerover", (event) => {
      const target = (event.target as Element | null)?.closest?.(TARGETS);
      if (target instanceof HTMLElement && this.root?.contains(target)) this.moveTo(target);
    });
  }

  /** The controls in the menu, in reading order. */
  private targets(): HTMLElement[] {
    if (!this.root) return [];
    return [...this.root.querySelectorAll<HTMLElement>(TARGETS)].filter(shown);
  }

  private moveTo(el: HTMLElement | null): void {
    if (el === this.current) return;
    this.current?.classList.remove(CURSOR_CLASS);
    this.current = el;
    if (!el) return;
    el.classList.add(CURSOR_CLASS);
    el.scrollIntoView({ block: "nearest" });
  }

  /** Lets go of the menu: no cursor until one is given again. */
  release(): void {
    this.moveTo(null);
    this.root = null;
  }

  /**
   * Reads this frame's keys for the menu in `root` (null when no menu is up). A key it acts on is used up, so the
   * screen underneath doesn't act on it too: an E that picks "Back to work" doesn't also pour a drink.
   */
  update(root: HTMLElement | null): void {
    if (root !== this.root) {
      this.moveTo(null);
      this.root = root;
    }
    if (!root) return;
    const targets = this.targets();
    // A rebuilt or shrunk menu: back to its first control.
    if (!this.current || !targets.includes(this.current)) this.moveTo(targets[0] ?? null);
    const el = this.current;
    if (!el) return;
    const { input } = this;
    const step = (dir: 1 | -1) => {
      const at = targets.indexOf(el);
      this.moveTo(targets[(at + dir + targets.length) % targets.length]);
    };
    // Held, these keep going, like a held arrow key in a text box.
    const held = (...codes: string[]) => codes.some((code) => input.pressedOrHeld(code));
    if (held("KeyW", "ArrowUp")) step(-1);
    else if (held("KeyS", "ArrowDown")) step(1);
    else if (held("KeyA", "ArrowLeft")) this.nudge(el, -1);
    else if (held("KeyD", "ArrowRight")) this.nudge(el, 1);
    else if (input.pressed("KeyE") || input.pressed("Enter") || input.pressed("Space")) {
      if (el instanceof HTMLInputElement && el.type === "range") return;
      input.consume(...PICK_KEYS);
      el.click();
      return;
    } else {
      return;
    }
    input.consume(...MOVE_KEYS);
  }

  /** Slides a slider one step, or moves a drop-down to its next option, telling the page as a hand would. */
  private nudge(el: HTMLElement, dir: 1 | -1): void {
    if (el instanceof HTMLInputElement && el.type === "range") {
      // A twentieth of the slider's run a press, in whole steps of its own.
      const min = Number(el.min || 0);
      const max = Number(el.max || 100);
      const unit = Number(el.step) || 1;
      const by = Math.max(unit, Math.round((max - min) / SLIDER_PRESSES / unit) * unit);
      const before = el.value;
      el.value = String(Math.min(max, Math.max(min, Number(el.value) + dir * by)));
      if (el.value === before) return;
    } else if (el instanceof HTMLSelectElement) {
      const next = el.selectedIndex + dir;
      if (next < 0 || next >= el.options.length) return;
      el.selectedIndex = next;
    } else {
      return;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
