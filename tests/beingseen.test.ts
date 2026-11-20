import { describe, expect, it } from "vitest";
import { actEffect, exposure, outfitNoticed, PHOTOS_A_DAY, SHAME_BEFORE, walkOfShame, YESES_A_DAY, type SeenFacts } from "../src/game/beingseen";
import { Tavern } from "../src/game/tavern";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
const base: SeenFacts = { arc: "sheltered", dress: "dressed", outfit: "work", messy: false, hour: 10, today: new Set() };

function day(): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.crowdRandom = null;
  t.random = () => 0.5;
  return t;
}

describe("being seen: what's done with a word (TOWN_DAY.md step 5)", () => {
  it("a photo spreads her name, and more of it when there's more of her in it", () => {
    const dressed = actEffect("photo", null, base, 0)!;
    expect(dressed.fans).toBe(1);
    expect(dressed.lust ?? 0).toBe(0);
    const bare = actEffect("photo", null, { ...base, dress: "topless" }, 0)!;
    expect(bare.fame).toBe(1);
    expect(bare.lust).toBe(1);
  });

  it("only so many photos and yeses count a day", () => {
    const today = new Set(Array.from({ length: PHOTOS_A_DAY }, (_, i) => `seen:photo:${i}`));
    expect(actEffect("photo", null, { ...base, today }, 0)).toBeNull();
    const yeses = new Set(Array.from({ length: YESES_A_DAY }, (_, i) => `seen:yes:${i}`));
    expect(actEffect("proposition", "yes", { ...base, today: yeses }, 0)).toBeNull();
  });

  it("a yes brings them in tonight; a no, or no question, does nothing", () => {
    expect(actEffect("proposition", "yes", base, 0)!.guests).toBe(1);
    expect(actEffect("proposition", "no", base, 0)).toBeNull();
    expect(actEffect("proposition", null, base, 0)).toBeNull();
    expect(actEffect("offer-coin", null, base, 0)).toBeNull();
    expect(actEffect("bow", null, base, 0)).toBeNull();
  });

  it("a hand that lands stirs the part it found, and counts as a grab", () => {
    const t = day();
    const effect = actEffect("grope", null, base, 0.1)!;
    expect(effect.touched).toBe("butt");
    const before = t.meters.butt;
    t.beSeen(effect);
    expect(t.meters.butt).toBeGreaterThan(before);
    expect(t.records.grabbed).toBe(1);
  });

  it("a whistle only stirs her once she's past Sheltered", () => {
    expect(actEffect("whistle", null, base, 0)).toBeNull();
    expect(actEffect("whistle", null, { ...base, arc: "curious" }, 0)!.desire).toBe(2);
  });
});

describe("being seen: what she wears outside", () => {
  it("measures how much of her shows, outfit and all", () => {
    expect(exposure("dressed", "work")).toBe(0);
    expect(exposure("dressed", "revealing")).toBe(1);
    expect(exposure("dressed", "lingerie")).toBe(2);
    expect(exposure("topless", "work")).toBe(3);
    expect(exposure("naked", "modern")).toBe(4);
  });

  it("is noticed once a day for each step further: Respect down, Lust and Fame up", () => {
    expect(outfitNoticed(base, 0)).toBeNull();
    const bare = outfitNoticed({ ...base, dress: "topless" }, 0)!;
    expect(bare.respect).toBeLessThan(0);
    expect(bare.lust).toBeGreaterThan(0);
    expect(bare.fame).toBeGreaterThan(0);
    expect(outfitNoticed({ ...base, dress: "topless", today: new Set(["seen:outfit:3"]) }, 0)).toBeNull();
    expect(outfitNoticed({ ...base, dress: "naked", today: new Set(["seen:outfit:3"]) }, 0)!.mark).toBe("seen:outfit:4");
  });

  it("costs a Known keeper a point less Respect: they've seen it", () => {
    const early = outfitNoticed({ ...base, dress: "underwear" }, 0)!;
    const known = outfitNoticed({ ...base, dress: "underwear", arc: "known" }, 0)!;
    expect(known.respect!).toBe(early.respect! + 1);
  });

  it("is applied once, however often the street looks", () => {
    const t = day();
    const effect = outfitNoticed({ ...base, dress: "naked" }, 0)!;
    const fame = t.persona.fame;
    t.beSeen(effect);
    t.beSeen(effect);
    expect(t.persona.fame - fame).toBe(effect.fame);
  });
});

describe("being seen: the walk of shame", () => {
  it("comes before noon, still messy or in last night's state of dress, once a day", () => {
    expect(walkOfShame(base, 0)).toBeNull();
    expect(walkOfShame({ ...base, messy: true }, 0)).not.toBeNull();
    expect(walkOfShame({ ...base, dress: "missingPiece" }, 0)).not.toBeNull();
    expect(walkOfShame({ ...base, messy: true, hour: SHAME_BEFORE }, 0)).toBeNull();
    expect(walkOfShame({ ...base, messy: true, today: new Set(["seen:walk"]) }, 0)).toBeNull();
  });

  it("is mortifying early on, owned when Willing, and a parade when Known", () => {
    const early = walkOfShame({ ...base, messy: true }, 0)!;
    const known = walkOfShame({ ...base, messy: true, arc: "known" }, 0)!;
    expect(early.effect.respect).toBeLessThan(0);
    expect(known.effect.respect ?? 0).toBe(0);
    expect(known.effect.guests).toBeGreaterThan(0);
    expect(known.lines.join(" ")).toContain("parade");
  });
});
