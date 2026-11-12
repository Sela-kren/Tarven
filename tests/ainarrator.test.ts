import { describe, expect, it } from "vitest";
import { AiNarrator, ambientFocus, buildPrompt, cleanLine, fillLine, lewdTier, type NarratorFacts } from "../src/game/ainarrator";

const facts: NarratorFacts = {
  name: "Mira",
  pronoun: "she",
  night: 2,
  serving: true,
  guests: 5,
  lewdness: 42,
  corruption: 10,
  pleasure: 30,
  drunk: "Tipsy",
  stripped: ["apron"],
};

describe("buildPrompt", () => {
  it("tells the model who she is, what just happened, and what to write about", () => {
    const prompt = buildPrompt(facts, ["A soldier sits down."], "a soldier grabs her rear. She lets them.");
    expect(prompt).toContain("Innkeeper: Mira (she).");
    expect(prompt).toContain("Night 3, serving 5 guests.");
    expect(prompt).toContain("Tipsy.");
    expect(prompt).toContain("Guests have taken off: apron.");
    expect(prompt).toContain("- A soldier sits down.");
    expect(prompt).toContain("Write the next log line about: a soldier grabs her rear. She lets them.");
    expect(prompt.endsWith("<|im_start|>assistant\n")).toBe(true);
  });
});

describe("cleanLine", () => {
  it("keeps one line, without labels or wrapping quotes", () => {
    expect(cleanLine('Log: "The soldier squeezes, grinning."\nMore text')).toBe("The soldier squeezes, grinning.");
    expect(cleanLine("\n\n- She blushes.<|im_end|>junk")).toBe("She blushes.");
  });

  it("cuts a long line at a sentence", () => {
    const long = `${"She laughs and pours another round for the table. ".repeat(8)}`;
    const line = cleanLine(long);
    expect(line.length).toBeLessThanOrEqual(240);
    expect(line.endsWith(".")).toBe(true);
  });
});

describe("AiNarrator", () => {
  const reply = (text: string) =>
    Promise.resolve(new Response(JSON.stringify({ results: [{ text }] }), { status: 200 }));

  it("writes a line for a big moment, and passes the moment to the model", async () => {
    const lines: string[] = [];
    let body = "";
    const narrator = new AiNarrator(
      (t) => lines.push(t),
      () => facts,
      (_url, init) => {
        body = String(init.body);
        return reply(" The smuggler's hand lingers. ");
      },
    );
    if (!narrator.enabled) narrator.toggle();
    narrator.moment("A smuggler reaches for her hand. She lets them.");
    narrator.update(0.1);
    await new Promise((r) => setTimeout(r, 0));
    expect(lines).toEqual(["The smuggler's hand lingers."]);
    expect(body).toContain("A smuggler reaches for her hand.");
  });

  it("stays quiet when KoboldCpp isn't running", async () => {
    const lines: string[] = [];
    let calls = 0;
    const narrator = new AiNarrator(
      (t) => lines.push(t),
      () => facts,
      () => {
        calls++;
        return Promise.reject(new TypeError("Failed to fetch"));
      },
    );
    if (!narrator.enabled) narrator.toggle();
    narrator.moment("Something happens.");
    narrator.update(0.1);
    await new Promise((r) => setTimeout(r, 0));
    narrator.moment("Something else.");
    narrator.update(1);
    expect(lines).toEqual([]);
    // It waits before trying again rather than asking every frame.
    expect(calls).toBe(1);
  });

  it("drops a line that comes back after the game was loaded", async () => {
    const lines: string[] = [];
    let answer: (r: Response) => void = () => {};
    const narrator = new AiNarrator(
      (t) => lines.push(t),
      () => facts,
      () => new Promise<Response>((r) => (answer = r)),
    );
    if (!narrator.enabled) narrator.toggle();
    narrator.moment("Before the load.");
    narrator.update(0.1);
    narrator.clear();
    answer(new Response(JSON.stringify({ results: [{ text: "Stale line." }] })));
    await new Promise((r) => setTimeout(r, 0));
    expect(lines).toEqual([]);
  });
});

describe("ambientFocus", () => {
  it("only reaches for the crude topics once she's lewd", () => {
    expect(ambientFocus(0, 0.999)).not.toMatch(/crude|aroused|hungry/);
    expect(ambientFocus(100, 0.999)).toMatch(/hungry attention/);
  });

  it("shows the model its own last lines so it says something new", () => {
    const prompt = buildPrompt(facts, [], "the room", ["She wipes the bar."]);
    expect(prompt).toContain("Lines you already wrote (say something new):\n- She wipes the bar.");
  });
});

describe("the line bank", () => {
  const bank = {
    version: 1,
    lines: {
      she: {
        "touch:chest:lean:1": ["the {guest} squeezes and {name} arches into it.", "{name} moans as the {guest} gropes her."],
        "ambient:1": ["a farmer whistles at {name}."],
      },
    },
  };
  const never = () => Promise.reject(new Error("should not ask the live model"));

  it("shows a banked line the instant the moment happens, with her name and the guest filled in", () => {
    const lines: string[] = [];
    const narrator = new AiNarrator((t) => lines.push(t), () => facts, never, () => 0);
    if (!narrator.enabled) narrator.toggle();
    narrator.setBank(bank);
    narrator.moment("A soldier gropes her. She leans in.", "touch:chest:lean:{tier}", "soldier");
    narrator.update(0.016);
    expect(lines).toEqual(["The soldier squeezes and Mira arches into it."]);
  });

  it("goes through every banked line before any repeats", () => {
    const lines: string[] = [];
    const narrator = new AiNarrator((t) => lines.push(t), () => facts, never, () => 0);
    if (!narrator.enabled) narrator.toggle();
    narrator.setBank(bank);
    for (let i = 0; i < 2; i++) {
      narrator.moment("Again.", "touch:chest:lean:{tier}", "farmer");
      narrator.update(0.016);
    }
    expect(new Set(lines).size).toBe(2);
  });

  it("fills a quiet stretch of the night from the bank too", () => {
    const lines: string[] = [];
    const narrator = new AiNarrator((t) => lines.push(t), () => facts, never, () => 0);
    if (!narrator.enabled) narrator.toggle();
    narrator.setBank(bank);
    narrator.note("A guest sits down.");
    narrator.update(13);
    expect(lines).toEqual(["A farmer whistles at Mira."]);
  });

  it("asks the live model for a situation the bank doesn't have", async () => {
    let asked = 0;
    const narrator = new AiNarrator(
      () => {},
      () => facts,
      () => {
        asked++;
        return Promise.resolve(new Response(JSON.stringify({ results: [{ text: "Live line." }] })));
      },
    );
    if (!narrator.enabled) narrator.toggle();
    narrator.setBank(bank);
    narrator.moment("A fugitive kisses her neck. She pulls away.", "touch:neck:pull:{tier}", "fugitive");
    narrator.update(0.016);
    expect(asked).toBe(1);
  });

  it("knows her lewdness step", () => {
    expect([0, 29, 30, 59, 60, 100].map(lewdTier)).toEqual([0, 0, 1, 1, 2, 2]);
  });
});

describe("fillLine", () => {
  it("puts in her name and the guest, giving a bare guest its 'the'", () => {
    expect(fillLine("{name} swats {guest}'s hand.", "Mira", "soldier")).toBe("Mira swats the soldier's hand.");
    expect(fillLine("the {guest} grins at {name}.", "", "farmer")).toBe("The farmer grins at the innkeeper.");
  });
});

describe("short log entries", () => {
  it("shows an ACTION | REACTION entry as two log lines", () => {
    const lines: string[] = [];
    const narrator = new AiNarrator((t) => lines.push(t), () => facts, () => Promise.reject(new Error("no")), () => 0);
    if (!narrator.enabled) narrator.toggle();
    narrator.setBank({ version: 1, lines: { she: { "touch:rear:slap:1": ["The {guest} grabs {name}'s ass! | {name} slaps him away!"] } } });
    narrator.moment("A smuggler grabs her rear. She slaps them.", "touch:rear:slap:{tier}", "smuggler");
    narrator.update(0.016);
    expect(lines).toEqual(["The smuggler grabs Mira's ass!", "Mira slaps him away!"]);
  });

  it("keeps each part of a live answer short", () => {
    const long = `The soldier gropes her! | ${"She moans and moans. ".repeat(10)}`;
    const [action, reaction] = cleanLine(long).split(" | ");
    expect(action).toBe("The soldier gropes her!");
    expect(reaction.length).toBeLessThanOrEqual(90);
  });
});
