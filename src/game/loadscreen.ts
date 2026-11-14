/**
 * The loading screen: a bar that fills as the game gets ready, and a line saying what it's doing, so the player can
 * see it's working and when it's nearly done. The model downloads fill most of the bar by bytes; the steps after
 * them (building the tavern, the guests, the shaders) each take their share as they finish.
 *
 * In development, each step's time goes to the console ("[load] ..."), to find what's slow.
 */

/** How much of the bar each part of loading fills, in order. They add up to 1. */
export const LOAD_SHARES = {
  download: 0.7,
  world: 0.05,
  game: 0.15,
  shaders: 0.1,
} as const;

export type LoadStep = keyof typeof LOAD_SHARES;

const ORDER = Object.keys(LOAD_SHARES) as LoadStep[];

export const STEP_TEXT: Record<LoadStep, string> = {
  download: "Unpacking the tavern",
  world: "Building the tavern",
  game: "Seating the guests",
  shaders: "Lighting the lamps",
};

/** How far along the bar is, 0 to 1, with `step` under way and `within` of it done. */
export function progressAt(step: LoadStep, within: number): number {
  let done = 0;
  for (const s of ORDER) {
    if (s === step) return Math.min(1, done + LOAD_SHARES[s] * Math.min(1, Math.max(0, within)));
    done += LOAD_SHARES[s];
  }
  return 1;
}

/** Bytes downloaded so far across several files, for a bar: each file's share by its size once it's known. */
export class DownloadTally {
  private readonly loaded = new Map<string, number>();
  private readonly total = new Map<string, number>();

  constructor(private readonly files: readonly string[]) {}

  update(file: string, loaded: number, total: number): void {
    this.loaded.set(file, loaded);
    if (total > 0) this.total.set(file, total);
  }

  done(file: string): void {
    const total = this.total.get(file) ?? this.loaded.get(file) ?? 1;
    this.total.set(file, total);
    this.loaded.set(file, total);
  }

  /** 0 to 1. A file whose size isn't known yet counts as nothing done of it. */
  get fraction(): number {
    let loaded = 0;
    let total = 0;
    for (const file of this.files) {
      const size = this.total.get(file);
      if (size === undefined) {
        total += 1;
        continue;
      }
      total += size;
      loaded += Math.min(size, this.loaded.get(file) ?? 0);
    }
    return total > 0 ? loaded / total : 0;
  }

  /** "4.1 of 13.7 MB", once every size is known; otherwise null. */
  get megabytes(): string | null {
    if (this.files.some((f) => !this.total.has(f))) return null;
    const mb = (n: number) => (n / 1_048_576).toFixed(1);
    const total = [...this.total.values()].reduce((a, b) => a + b, 0);
    const loaded = this.files.reduce((sum, f) => sum + Math.min(this.total.get(f) ?? 0, this.loaded.get(f) ?? 0), 0);
    return `${mb(loaded)} of ${mb(total)} MB`;
  }
}

/** Waits for the browser to draw a frame, so the bar shows before the next long step starts. */
export function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

/** The bar and its line, on the page's #status element. */
export class LoadScreen {
  private readonly fill: HTMLElement;
  private readonly line: HTMLElement;
  private readonly percent: HTMLElement;
  private stepStart = performance.now();
  private readonly began = performance.now();
  private current: LoadStep | null = null;

  constructor(private readonly root: HTMLElement) {
    root.textContent = "";
    root.classList.add("loading");
    root.setAttribute("role", "progressbar");
    root.setAttribute("aria-valuemin", "0");
    root.setAttribute("aria-valuemax", "100");
    const title = document.createElement("div");
    title.className = "load-title";
    title.textContent = "Last Call at Tarven";
    const bar = document.createElement("div");
    bar.className = "load-bar";
    this.fill = document.createElement("div");
    this.fill.className = "load-fill";
    bar.append(this.fill);
    this.line = document.createElement("div");
    this.line.className = "load-step";
    this.percent = document.createElement("span");
    this.percent.className = "load-percent";
    root.append(title, bar, this.line);
    this.show("download", 0);
  }

  /** Moves the bar: `step` under way, `within` of it done, and an optional detail after its words. */
  show(step: LoadStep, within: number, detail?: string | null): void {
    if (step !== this.current) {
      this.logStep();
      this.current = step;
      this.stepStart = performance.now();
    }
    const at = Math.round(progressAt(step, within) * 100);
    this.fill.style.width = `${at}%`;
    this.root.setAttribute("aria-valuenow", String(at));
    this.percent.textContent = ` ${at}%`;
    this.line.textContent = `${STEP_TEXT[step]}...${detail ? ` (${detail})` : ""}`;
    this.line.append(this.percent);
  }

  /** All done: the last step's time, the whole load's, and the screen goes. */
  finish(): void {
    this.logStep();
    if (import.meta.env.DEV) console.info(`[load] ready in ${Math.round(performance.now() - this.began)} ms`);
    this.root.remove();
  }

  /** Shows what went wrong instead of the bar. */
  fail(message: string): void {
    this.root.classList.remove("loading");
    this.root.removeAttribute("role");
    this.root.textContent = message;
  }

  private logStep(): void {
    if (!this.current || !import.meta.env.DEV) return;
    console.info(`[load] ${this.current}: ${Math.round(performance.now() - this.stepStart)} ms`);
  }
}
