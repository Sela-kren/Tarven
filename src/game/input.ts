const GAME_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "ShiftLeft", "ShiftRight",
  "KeyC", "KeyE", "Enter", "Digit1", "Digit2", "Digit3", "Digit4",
]);

export class Input {
  private readonly held = new Set<string>();
  private readonly justPressed = new Set<string>();

  constructor(target: Window = window) {
    target.addEventListener("keydown", (e) => {
      if (!GAME_KEYS.has(e.code)) return;
      e.preventDefault();
      this.held.add(e.code);
      if (!e.repeat) this.justPressed.add(e.code);
    });
    target.addEventListener("keyup", (e) => this.held.delete(e.code));
    // A key released while the window is unfocused would otherwise stay stuck.
    target.addEventListener("blur", () => this.held.clear());
  }

  private any(...codes: string[]): boolean {
    return codes.some((code) => this.held.has(code));
  }

  get left() { return this.any("KeyA", "ArrowLeft"); }
  get right() { return this.any("KeyD", "ArrowRight"); }
  get up() { return this.any("KeyW", "ArrowUp"); }
  get down() { return this.any("KeyS", "ArrowDown"); }
  get run() { return this.any("ShiftLeft", "ShiftRight"); }

  /** True during the one frame after a key goes down. */
  pressed(code: string): boolean {
    return this.justPressed.has(code);
  }

  /** Call once at the end of every frame. */
  endFrame(): void {
    this.justPressed.clear();
  }
}
