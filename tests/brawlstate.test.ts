import { describe, expect, it } from "vitest";
import { INTIMATE_MOVES } from "../src/game/desire";
import { CLIMAX, EDGE, Fight, MIND_COST, RELEASE_AMOUNT, RESIST_AMOUNT, RESTORE_WILL, type FighterStats } from "../src/game/fight";
import { emptyMeters, type Meters } from "../src/game/passives";

const BASE: FighterStats = { levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 }, damage: 0, dodge: 0, talk: 0, stare: 0, will: 20, maxWill: 40 };
const meters = (set: Partial<Meters>): Meters => ({ ...emptyMeters(), ...set });
/** A foe who'd rather hurt her than anything else, missing every time (rolls of 0.99). */
const fight = (extra: Partial<FighterStats>, random = () => 0.99) => new Fight(1, "farmer", false, { ...BASE, ...extra }, random);

describe("her state in a brawl, Karryn's Prison style", () => {
  it("at the top of her pleasure she comes, mid-brawl, and it leaves her reeling a turn", () => {
    const f = fight({ desire: meters({ cock: 50 }), pleasure: 100 - INTIMATE_MOVES.hands.pleasure });
    const { will, stamina } = f;
    f.act("hands");
    expect(f.climaxes).toBe(1);
    expect(f.events).toContain("her:come");
    expect(f.pleasure).toBe(0);
    expect(f.will).toBeLessThanOrEqual(will - CLIMAX.will);
    expect(f.stamina).toBeLessThanOrEqual(stamina - CLIMAX.stamina);
    expect(f.dazed).toBe(true);
    expect(f.choices().map((c) => c.move)).toEqual(["recover"]);
    f.act("strike");
    expect(f.dazed).toBe(true);
    f.act("recover");
    expect(f.dazed).toBe(false);
  });

  it("Edging Control holds her right at the edge for a few turns", () => {
    const f = fight({ desire: meters({ cock: 50 }), pleasure: 90 });
    f.act("edge");
    f.act("hands");
    f.act("hands");
    f.act("hands");
    expect(f.climaxes).toBe(0);
    expect(f.pleasure).toBe(EDGE.cap);
  });

  it("Resist fights her pleasure back down; Release lets her desire in", () => {
    const f = fight({ desire: meters({ cock: 50, mouth: 10 }), pleasure: 60 });
    f.act("resist");
    expect(f.pleasure).toBe(60 - RESIST_AMOUNT);
    const g = fight({ desire: meters({ mouth: 10 }) });
    const will = g.will;
    g.act("release");
    expect(g.desire!.mouth).toBe(10 + RELEASE_AMOUNT);
    expect(g.desire!.cock).toBe(0);
    expect(g.will).toBe(will - MIND_COST.release);
  });

  it("her willpower skills don't take her turn, and there's one a turn", () => {
    const f = fight({ desire: meters({ mouth: 40 }) });
    const before = f.events.length;
    f.act("release");
    expect(f.events.slice(before).some((e) => e.startsWith("their:"))).toBe(false);
    const will = f.will;
    f.act("releaseCock");
    expect(f.will).toBe(will);
    expect(f.choices().find((c) => c.move === "releaseCock")?.disabled).toBe(true);
    f.act("dodge");
    expect(f.choices().find((c) => c.move === "releaseCock")?.disabled).toBe(false);
  });

  it("Eye of the Mind: her next blow can't miss, and hits harder", () => {
    const plain = fight({ desire: meters({}) });
    plain.act("strike");
    expect(plain.events).toContain("strike:miss");
    const f = fight({ desire: meters({}) });
    const stamina = f.foeStamina;
    f.act("eye");
    expect(f.choices().find((c) => c.move === "strike")?.chance).toBe(1);
    f.act("strike");
    expect(f.events).toContain("strike:hit");
    expect(stamina - f.foeStamina).toBe(Math.round(3 * 1.5));
  });

  it("gathering herself takes her turn, and gives her willpower back", () => {
    const f = fight({ desire: meters({}) });
    const will = f.will;
    f.act("restore");
    expect(f.will).toBe(will + RESTORE_WILL);
    expect(f.events.some((e) => e.startsWith("their:"))).toBe(true);
  });
});
