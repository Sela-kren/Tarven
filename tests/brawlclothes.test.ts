import { describe, expect, it } from "vitest";
import { FIX_CLOTHES_ENERGY, HER_STRIPPED_LINES, STRIP_VOICES } from "../src/game/brawlclothes";
import { Fight, type FighterStats } from "../src/game/fight";
import { emptyMeters } from "../src/game/passives";
import { Tavern } from "../src/game/tavern";
import { pickTouch } from "../src/game/touch";

const LEVELS = { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 };
const PIECES = ["apron", "bodice", "skirt", "smallclothes"];
// A worked-up foe who wants her, and she's too drunk for a scene: he goes for something else.
const BASE: FighterStats = {
  levels: LEVELS,
  damage: 0,
  dodge: 0,
  talk: 0,
  stare: 0,
  energy: 30,
  maxEnergy: 30,
  desire: emptyMeters(),
  workedUp: true,
  sexOk: false,
  clothes: { pieces: PIECES, off: 0 },
};
const fight = (extra: Partial<FighterStats> = {}) => new Fight(1, "bandit", false, { ...BASE, ...extra }, () => 0.1);

/** He's gone for her clothes; she lets him, and the tavern says how many are off her now. */
function stripOne(f: Fight): void {
  f.act("dodge");
  expect(f.reaching).toBe(true);
  expect(f.reachingFor).toBe("clothes");
  f.setClothes(f.clothesOff + 1);
  f.afterReach("yes", f.will);
}

describe("her clothes in a brawl, Karryn's Prison style (7l)", () => {
  it("a foe who wants her goes for her clothes, and it waits on her answer like any reach", () => {
    const f = fight();
    f.act("dodge");
    expect(f.events).toContain("their:strip");
    expect(f.reachingFor).toBe("clothes");
    expect(f.log.some((l) => l.includes("apron"))).toBe(true);
    // Pulling away, nothing comes off.
    f.afterReach("pull", f.will);
    expect(f.clothesOff).toBe(0);
    expect(f.events).not.toContain("their:stripped");
  });

  it("let it happen, a piece comes off: he crows, she answers, and she's barer for the rest of the fight", () => {
    const f = fight();
    expect(f.exposure).toBe(0);
    stripOne(f);
    expect(f.events).toContain("their:stripped");
    expect(f.exposure).toBeCloseTo(1 / PIECES.length);
    expect(f.log.some((l) => STRIP_VOICES.bandit.some((v) => l.includes(v)))).toBe(true);
    expect(f.log.some((l) => Object.values(HER_STRIPPED_LINES).some((lines) => lines.some((h) => l.includes(h))))).toBe(true);
  });

  it("Fix Clothes puts the last piece back on, for energy and her turn; only what came off this brawl", () => {
    const f = fight({ clothes: { pieces: PIECES, off: 1 } });
    const fix = () => f.choices().find((c) => c.move === "fixClothes")!;
    expect(fix().disabled).toBe(true);
    stripOne(f);
    expect(f.clothesOff).toBe(2);
    expect(fix().disabled).toBe(false);
    expect(fix().label).toContain("bodice");
    const energy = f.energy;
    f.act("fixClothes");
    expect(f.clothesOff).toBe(1);
    expect(f.energy).toBeLessThanOrEqual(energy - FIX_CLOTHES_ENERGY);
    expect(f.events).toContain("fixClothes");
    // The apron she came in without stays off.
    if (f.reaching) f.afterReach("pull", f.will);
    expect(fix().disabled).toBe(true);
  });

  it("the last piece gone, she's fighting bare, and there's nothing left for him to go for", () => {
    const f = fight({ clothes: { pieces: PIECES, off: PIECES.length - 1 } });
    stripOne(f);
    expect(f.events).toContain("bare");
    expect(f.exposure).toBe(1);
    expect(f.nextPiece).toBeNull();
    f.act("dodge");
    expect(f.reachingFor === "clothes" && f.reaching).toBe(false);
  });

  it("no clothes in the fight, no going for them; her exposure is what she came in with", () => {
    const f = fight({ clothes: undefined, exposure: 0.5 });
    expect(f.exposure).toBe(0.5);
    expect(f.choices().some((c) => c.move === "fixClothes")).toBe(false);
    f.act("dodge");
    expect(f.events).not.toContain("their:strip");
  });

  it("going for her clothes, only the scuffle's strip tries; none with nothing left to take", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const touch = pickTouch("bandit", 9, () => i / 20, { canStrip: true, stripOnly: true, brawl: true, seen });
      expect(touch?.strip && touch.brawl).toBe(true);
    }
    expect(pickTouch("bandit", 9, () => 0.5, { canStrip: false, stripOnly: true, brawl: true, seen })).toBeNull();
    // An ordinary brawl reach never takes her clothes.
    for (let i = 0; i < 20; i++) expect(pickTouch("bandit", 9, () => i / 20, { canStrip: false, brawl: true, seen })?.strip).toBeFalsy();
  });

  it("every type has its own say getting her clothes off, and she has hers in every voice", () => {
    for (const lines of Object.values(STRIP_VOICES)) expect(lines.length).toBeGreaterThanOrEqual(8);
    for (const lines of Object.values(HER_STRIPPED_LINES)) expect(lines.length).toBeGreaterThan(0);
  });

  it("in the tavern: asked like any touch (no yes without the desire for it), and what comes off stays off", () => {
    const start = (desire: number) => {
      const t = new Tavern(4);
      t.random = () => 0;
      t.open();
      t.tick(0, { listeningTo: null, night: true });
      for (let i = 0; i < 40; i++) t.tick(0.1, { listeningTo: null, night: true });
      const guest = t.guests[0];
      t.guestArrived(guest.id);
      t.playerBody = "Female";
      guest.lust = 10;
      const meters = (t as unknown as { meters: Record<string, number> }).meters;
      for (const k of Object.keys(meters)) meters[k] = k === "cock" ? 0 : desire;
      t.startFight(guest.id);
      t.fightMove("dodge");
      expect(t.fight?.reachingFor).toBe("clothes");
      return t;
    };
    // Not wanting it, only Slap and Pull away.
    const cold = start(0);
    expect(cold.talkChoices.map((c) => c.label)).toEqual(["Slap them", "Pull away"]);
    cold.chooseTalk(1);
    expect(cold.stripped).toBe(0);
    // Wanting it, she can let them take it: it's off her, in the fight and the tavern both.
    const warm = start(60);
    const labels = warm.talkChoices.map((c) => c.label);
    expect(labels[labels.length - 1]).toMatch(/^Pull away/);
    warm.chooseTalk(labels.indexOf("Let them take it"));
    expect(warm.stripped).toBe(1);
    expect(warm.fight?.clothesOff).toBe(1);
    expect(warm.fight?.events).toContain("their:stripped");
  });
});
