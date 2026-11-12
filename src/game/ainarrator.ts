/**
 * The AI narrator: extra lines for the message log as things happen — what a guest's hand does, how she takes it,
 * what the room makes of her — in the crude, running style of an adult RPG's side log. The lines come first from a
 * bank a local model (Mag-Mell in KoboldCpp) wrote ahead of time, so they show the instant something happens and
 * need no AI to play; a situation the bank doesn't cover is asked of the live model, if it's running. It only
 * ever adds to the log; every rule and every choice stays in the game.
 */

/** Where KoboldCpp listens unless told otherwise. */
export const DEFAULT_ENDPOINT = "http://localhost:5001";
const STORE_KEY = "tarven.aiNarrator";

/** Seconds between live lines, so the model never floods the log. */
const COOLDOWN = 4;
/** Seconds of a busy night with no big moment before the narrator says something about the room anyway. */
const AMBIENT_GAP = 12;
/** Seconds to wait before trying again once KoboldCpp didn't answer. */
const RETRY_GAP = 30;
/** Seconds a request may take before it's dropped. */
const TIMEOUT = 25;
/** Recent events kept for the model to read. */
const MAX_NOTES = 12;
/** The longest log line the model may write; an entry is two of these at most. */
const MAX_CHARS = 90;
/** The narrator's own last lines, shown to the model so it doesn't say the same thing twice. */
const MAX_OWN = 5;

/** What an in-between line can be about, so the log keeps changing. The later ones only come once she's lewd. */
const AMBIENT_FOCUS: readonly { from: number; text: string }[] = [
  { from: 0, text: "what one of the guests is doing or saying right now" },
  { from: 0, text: "the gossip going round the tables about the innkeeper" },
  { from: 0, text: "how the innkeeper looks as she works the room" },
  { from: 20, text: "a guest openly leering at the innkeeper and what he is thinking" },
  { from: 20, text: "what the innkeeper is secretly thinking and feeling in her body" },
  { from: 40, text: "a crude remark or dirty joke a guest makes about the innkeeper's body" },
  { from: 40, text: "how aroused the innkeeper is and how she hides or shows it" },
  { from: 60, text: "the room's hungry attention on the innkeeper and how she enjoys it" },
];

/** A focus for an in-between line, picked at random from what her lewdness allows. */
export function ambientFocus(lewdness: number, roll = Math.random()): string {
  const open = AMBIENT_FOCUS.filter((f) => lewdness >= f.from);
  return open[Math.min(open.length - 1, Math.floor(roll * open.length))].text;
}

/** What the model is told about her and the night, worked out by the game. */
export interface NarratorFacts {
  /** Her name from the journal, or empty. */
  name: string;
  pronoun: "she" | "he";
  night: number;
  /** Whether the doors are open and guests are in. */
  serving: boolean;
  guests: number;
  lewdness: number;
  corruption: number;
  pleasure: number;
  /** "Tipsy", "Drunk", "Hammered", or empty. */
  drunk: string;
  /** What guests have got off her tonight. */
  stripped: readonly string[];
}

const SYSTEM = [
  "You write the running event log of an adults-only (18+) tavern game, Last Call at Tarven.",
  "Every character is an adult. The innkeeper serves farmers, soldiers, smugglers and fugitives in a cold mountain town.",
  "The log reads like an adult RPG's battle log: very short, punchy lines, present tense, naming the innkeeper.",
  'Write ONE entry: an ACTION line and a REACTION line separated by " | ", each at most 12 words.',
  "Use ! for actions and ... for her feelings. No long description, no dialogue longer than four words.",
  "When the moment is sexual, be explicit and crude; otherwise be bawdy.",
  "Only describe what the events say happened. If the innkeeper refused or pushed someone away, the reaction shows that refusal.",
  "Vary your wording every time; never repeat a line you already wrote.",
  "No speaker labels, no lists, no explanations, no emojis.",
  'Example of the shape only: The soldier gropes Mira\'s tits! | Mira gasps... her knees go weak.',
].join(" ");

/** The prompt for one line, in ChatML, which Mag-Mell and most roleplay models expect. */
export function buildPrompt(facts: NarratorFacts, notes: readonly string[], about: string, own: readonly string[] = []): string {
  const who = facts.name || "the innkeeper";
  const state = [
    `Innkeeper: ${who} (${facts.pronoun}).`,
    `Night ${facts.night + 1}${facts.serving ? `, serving ${facts.guests} guest${facts.guests === 1 ? "" : "s"}` : ""}.`,
    `Lewdness ${Math.round(facts.lewdness)}, corruption ${Math.round(facts.corruption)}, pleasure ${Math.round(facts.pleasure)}/100.`,
    facts.drunk ? `${facts.drunk}.` : "Sober.",
    facts.stripped.length ? `Guests have taken off: ${facts.stripped.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const recent = notes.length ? notes.map((n) => `- ${n}`).join("\n") : "- (nothing yet)";
  const said = own.length ? `\n\nLines you already wrote (say something new):\n${own.map((l) => `- ${l}`).join("\n")}` : "";
  const user = `${state}\n\nRecent events:\n${recent}${said}\n\nWrite the next log line about: ${about}`;
  return `<|im_start|>system\n${SYSTEM}<|im_end|>\n<|im_start|>user\n${user}<|im_end|>\n<|im_start|>assistant\n`;
}

/** The model's answer made fit for the log: one entry, no wrapping quotes or labels, each part cut short. */
export function cleanLine(raw: string): string {
  let text = raw.replace(/<\|im_(start|end)\|>.*/s, "").split("\n").find((l) => l.trim()) ?? "";
  text = text.trim().replace(/^(log|narrator|line)\s*:\s*/i, "").replace(/^[-*•]\s*/, "");
  if (/^".*"$/.test(text)) text = text.slice(1, -1).trim();
  return splitEntry(text)
    .map((part) => {
      if (part.length <= MAX_CHARS) return part;
      const cut = part.slice(0, MAX_CHARS);
      const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
      return end > 20 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
    })
    .join(" | ");
}

/** An entry's log lines: the action and her reaction, written "ACTION | REACTION". */
export function splitEntry(entry: string): string[] {
  return entry
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
}

interface Settings {
  enabled: boolean;
  endpoint: string;
}

function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") as Partial<Settings>;
    return { enabled: saved.enabled ?? true, endpoint: saved.endpoint || DEFAULT_ENDPOINT };
  } catch {
    return { enabled: true, endpoint: DEFAULT_ENDPOINT };
  }
}

function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(settings));
  } catch {
    // Private window or blocked storage: it just won't be remembered.
  }
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Lines the model wrote ahead of time (tools/ai/make-lines.mjs fills public/ai-lines.json), by pronoun and then by
 * situation: `touch:<region>:<answer>:<tier>`, `ambient:<tier>`, `upstairs:<guest kind>`, `overwhelmed`, `passive`.
 * `{name}` and `{guest}` in a line are filled in by the game.
 */
export interface LineBank {
  version: number;
  lines: Partial<Record<NarratorFacts["pronoun"], Record<string, string[]>>>;
}

/** How lewd she is, in the three steps the bank is written for. */
export function lewdTier(lewdness: number): 0 | 1 | 2 {
  return lewdness >= 60 ? 2 : lewdness >= 30 ? 1 : 0;
}

const GUEST_WORDS = ["farmer", "smuggler", "soldier", "fugitive"];

/** A banked line made ready for the log: her name and the guest put in, and a capital to start. */
export function fillLine(line: string, name: string, guest?: string, roll = Math.random()): string {
  const who = guest ?? GUEST_WORDS[Math.floor(roll * GUEST_WORDS.length) % GUEST_WORDS.length];
  // "the {guest}" stays as written; a bare "{guest}" (or "{guest}'s") gets its "the".
  const text = line
    .replaceAll("{name}", name || "the innkeeper")
    .replace(/(\b(?:the|a|an|that|this|each|every) )?\{guest\}/gi, (_, before: string | undefined) => `${before ?? "the "}${who}`);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A big moment waiting for a line: what happened, and where in the bank its lines are. */
interface Moment {
  text: string;
  key?: string;
  guest?: string;
}

export class AiNarrator {
  private readonly settings: Settings;
  private readonly notes: string[] = [];
  private readonly own: string[] = [];
  private bank: LineBank | null = null;
  /** For each situation, the banked lines not shown yet this time round, so none repeats until all have been seen. */
  private readonly decks = new Map<string, string[]>();
  /** The big moment waiting for a line, the newest one if several came while the model was busy. */
  private pending: Moment | null = null;
  private busy = false;
  private cooldown = 0;
  private sinceLine = 0;
  private notesSinceLine = 0;
  /** Seconds until KoboldCpp is tried again, while it isn't answering. */
  private offlineFor = 0;
  /** Counts up on every clear, so a line asked for before a load never lands after it. */
  private epoch = 0;

  constructor(
    /** Where the finished lines go. */
    private readonly onLine: (text: string) => void,
    /** The game's view of her right now. */
    private readonly facts: () => NarratorFacts,
    private readonly fetcher: Fetch = (url, init) => fetch(url, init),
    private readonly random: () => number = Math.random,
  ) {
    this.settings = loadSettings();
  }

  get enabled(): boolean {
    return this.settings.enabled;
  }

  get endpoint(): string {
    return this.settings.endpoint;
  }

  /** How many lines are banked for her, or him. */
  bankSize(pronoun: NarratorFacts["pronoun"]): number {
    return Object.values(this.bank?.lines[pronoun] ?? {}).reduce((n, lines) => n + lines.length, 0);
  }

  /** Takes the lines written ahead of time. */
  setBank(bank: LineBank): void {
    this.bank = bank;
    this.decks.clear();
  }

  /** Fetches the line bank shipped with the game. Without one, every line has to come from the live model. */
  async loadBank(url: string): Promise<void> {
    try {
      const response = await this.fetcher(url, {});
      if (response.ok) this.setBank((await response.json()) as LineBank);
    } catch {
      // No bank: the live model covers everything, if it's running.
    }
  }

  /** Turns the narrator on or off, and says which it is now. */
  toggle(): boolean {
    this.settings.enabled = !this.settings.enabled;
    this.offlineFor = 0;
    saveSettings(this.settings);
    return this.settings.enabled;
  }

  /** Something that happened, for the model to know about. It doesn't get a line of its own. */
  note(text: string): void {
    if (!text) return;
    this.notes.push(text);
    if (this.notes.length > MAX_NOTES) this.notes.shift();
    this.notesSinceLine++;
  }

  /**
   * A big moment that deserves a line: a touch answered, a passive earned, a scene. `key` is where its lines are
   * in the bank (with `{tier}` standing for her lewdness step); `guest` is the kind of guest, for `{guest}`.
   */
  moment(text: string, key?: string, guest?: string): void {
    this.note(text);
    this.pending = { text, key, guest };
  }

  /** Forgets the night, for a loaded game. */
  clear(): void {
    this.notes.length = 0;
    this.own.length = 0;
    this.pending = null;
    this.notesSinceLine = 0;
    this.sinceLine = 0;
    this.epoch++;
  }

  update(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.offlineFor = Math.max(0, this.offlineFor - dt);
    this.sinceLine += dt;
    if (!this.settings.enabled) return;

    // A big moment: a banked line straight away if there is one, or ask the live model.
    if (this.pending) {
      const { text, key, guest } = this.pending;
      if (this.fromBank(key, guest)) this.pending = null;
      else if (this.canAsk()) {
        this.pending = null;
        void this.ask(text);
      }
      return;
    }

    // Between moments on a busy night, something about the room.
    if (this.sinceLine < AMBIENT_GAP || this.notesSinceLine < 1) return;
    const facts = this.facts();
    if (!facts.serving) return;
    if (!this.fromBank("ambient:{tier}") && this.canAsk()) void this.ask(ambientFocus(facts.lewdness, this.random()));
  }

  private canAsk(): boolean {
    return !this.busy && this.cooldown <= 0 && this.offlineFor <= 0;
  }

  /** Shows the next banked line for this situation, if the bank has any. */
  private fromBank(key: string | undefined, guest?: string): boolean {
    const line = key ? this.draw(key, guest) : null;
    if (line) this.show(line);
    return Boolean(line);
  }

  /**
   * The next banked line for a situation, filled in and ready, or null if the bank has none (or the narrator is
   * off). Brawls and duels use this for their own logs; it never asks the live model, so a fight never waits.
   */
  draw(key: string, guest?: string): string | null {
    if (!this.bank || !this.settings.enabled) return null;
    const facts = this.facts();
    const full = key.replace("{tier}", String(lewdTier(facts.lewdness)));
    const lines = this.bank.lines[facts.pronoun]?.[full];
    if (!lines?.length) return null;
    const deckKey = `${facts.pronoun}/${full}`;
    let deck = this.decks.get(deckKey);
    if (!deck?.length) {
      deck = [...lines];
      this.decks.set(deckKey, deck);
    }
    const [line] = deck.splice(Math.floor(this.random() * deck.length), 1);
    return fillLine(line, facts.name, guest, this.random());
  }

  private show(line: string): void {
    for (const part of splitEntry(line)) this.onLine(part);
    this.own.push(line);
    if (this.own.length > MAX_OWN) this.own.shift();
    this.sinceLine = 0;
    this.notesSinceLine = 0;
  }

  private async ask(about: string): Promise<void> {
    this.busy = true;
    // Whatever comes back, the room waits its turn before another in-between line.
    this.sinceLine = 0;
    const epoch = this.epoch;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT * 1000);
    try {
      const response = await this.fetcher(`${this.settings.endpoint}/api/v1/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: buildPrompt(this.facts(), this.notes, about, this.own),
          max_length: 60,
          max_context_length: 2048,
          temperature: 1.0,
          top_p: 0.95,
          min_p: 0.05,
          rep_pen: 1.1,
          stop_sequence: ["<|im_end|>", "<|im_start|>", "\n"],
        }),
      });
      if (!response.ok) throw new Error(`KoboldCpp answered ${response.status}`);
      const data = (await response.json()) as { results?: { text?: string }[] };
      const line = cleanLine(data.results?.[0]?.text ?? "");
      if (line && epoch === this.epoch && this.settings.enabled) this.show(line);
      this.cooldown = COOLDOWN;
    } catch {
      // Not running, or too slow: stay quiet and try again later.
      this.offlineFor = RETRY_GAP;
    } finally {
      clearTimeout(timer);
      this.busy = false;
    }
  }
}
