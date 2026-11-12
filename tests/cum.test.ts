import { describe, expect, it } from "vitest";
import { Duel, type DuelArea, type DuelistStats } from "../src/game/duel";
import { coatStages, spotFor } from "../src/game/cum";
import { emptyMeters, newRecords, readProgress } from "../src/game/passives";
import { setFlavorSource } from "../src/game/flavor";

const BASE: DuelistStats = { level: () => 1, sens: emptyMeters(), power: 0, resist: 0, stamina: 0, hold: 0, edge: 0, undress: 0 };
const duel = (areas: DuelArea[], random: () => number = () => 0.99, female = false, kind: "soldier" | "farmer" = "soldier") =>
  new Duel(kind, new Set(areas), 10, BASE, random, [{ kind, female }]);

/** Plays her move until it's over, holding back when she's tired. */
function play(d: Duel, move: "mouth" | "ride" | "kiss"): void {
  for (let i = 0; i < 80 && !d.outcome; i++) d.act(d.stamina >= 8 ? move : "hold");
}

describe("a man finishing in a duel", () => {
  it("leaves a load where she had him, in ml, with a log line for it", () => {
    const d = duel(["mouth"], () => 0.99, false, "farmer");
    play(d, "mouth");
    expect(d.outcome).toBe("won");
    expect(d.loads).toBe(1);
    expect(d.cum.mouth).toBeGreaterThan(0);
    const entry = d.entries.find((e) => e.action === "Cums");
    expect(entry?.effects[0]).toMatchObject({ stat: "cum", side: "her" });
  });

  it("never lands on a part of her she kept out of play", () => {
    const d = duel(["mouth"]);
    play(d, "mouth");
    expect(Object.keys(d.cum).every((spot) => spot === "mouth" || spot === "face")).toBe(true);
  });

  it("goes on her body when nothing but a kiss was in play", () => {
    expect(spotFor(null, false, () => 0)).toBe("body");
    expect(spotFor("butt", true, () => 0)).toBe("ass");
  });

  it("leaves nothing from a woman", () => {
    const d = duel(["hands"], () => 0.99, true);
    for (let i = 0; i < 80 && !d.outcome; i++) d.act(d.stamina >= 4 ? "hands" : "hold");
    expect(d.loads).toBe(0);
  });

  it("gets bolder the longer he keeps a part of her", () => {
    const d = duel(["pussy"], () => 0);
    for (let i = 0; i < 6 && !d.outcome; i++) d.act("kiss");
    const his = d.entries.filter((e) => e.side === "partner" && e.action !== "Says").map((e) => e.action);
    expect(his).toContain("Between your thighs");
    expect(his).toContain("Fucks you");
  });

  it("talks dirty now and then, from the AI bank when it has a line", () => {
    setFlavorSource((key) => (key.startsWith("duel:talk:") ? '"Bank line."' : null));
    const d = duel(["mouth"], () => 0.1);
    d.act("kiss");
    setFlavorSource(null);
    expect(d.entries.some((e) => e.action === "Says" && e.text === '"Bank line."')).toBe(true);
  });
});

describe("cum in her records", () => {
  it("keeps every spot and the number of loads in a save", () => {
    const records = { ...newRecords(), cum: { mouth: 30, pussy: 12, nowhere: 5 }, loads: 4 };
    const back = readProgress(JSON.parse(JSON.stringify({ corruption: 0, records, passives: [] }))).records;
    expect(back.cum).toEqual({ mouth: 30, pussy: 12 });
    expect(back.loads).toBe(4);
  });
});

describe("what shows on her", () => {
  it("is clean with nothing on her", () => {
    expect(coatStages({})).toEqual({ Mouth: 0, Face: 0, Breasts: 0, Body: 0, Pussy: 0, Ass: 0, Back: 0, Arms: 0, Hands: 0 });
  });

  it("goes from less to more as loads land on the same part of her", () => {
    expect(coatStages({ breasts: 9 }).Breasts).toBe(1);
    expect(coatStages({ breasts: 18 }).Breasts).toBe(2);
    expect(coatStages({ breasts: 40 }).Breasts).toBe(3);
    expect(coatStages({ breasts: 400 }).Breasts).toBe(3);
  });

  it("keeps each part of her apart", () => {
    const stages = coatStages({ face: 20, pussy: 8 });
    expect(stages.Face).toBe(2);
    expect(stages.Pussy).toBe(1);
    expect(stages.Breasts).toBe(0);
  });

  it("shows what went in her mouth on her mouth, not her face", () => {
    const mouthed = coatStages({ mouth: 20 });
    expect(mouthed.Mouth).toBe(2);
    expect(mouthed.Face).toBe(0);
    expect(coatStages({ mouth: 9 }).Mouth).toBe(1);
    expect(coatStages({ mouth: 40 }).Mouth).toBe(3);
  });

  it("catches her lips a little when he finishes on her face", () => {
    const faced = coatStages({ face: 20 });
    expect(faced.Face).toBe(2);
    expect(faced.Mouth).toBe(1);
  });

  it("puts a load from behind on her back as well as her ass, and one in her hands on her arms", () => {
    const behind = coatStages({ ass: 30 });
    expect(behind.Ass).toBe(2);
    expect(behind.Back).toBe(2);
    const hands = coatStages({ body: 10 });
    expect(hands.Body).toBe(1);
    expect(hands.Arms).toBe(1);
    expect(hands.Hands).toBe(1);
  });
});
