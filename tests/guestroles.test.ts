import { describe, expect, it } from "vitest";
import { GUEST_KIND_LIST, ROLES, ROLES_OF, rollStats, statsOf, type GuestRole } from "../src/game/guestroles";

/** A seeded random, so a run of rolls is the same every time. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const ALL = Object.keys(ROLES) as GuestRole[];

describe("guest types", () => {
  it("puts every type in its group's roster, and every group has one", () => {
    for (const kind of GUEST_KIND_LIST) expect(ROLES_OF[kind].length).toBeGreaterThan(0);
    for (const role of ALL) expect(ROLES_OF[ROLES[role].kind]).toContain(role);
  });

  it("makes types in one group play differently", () => {
    expect(ROLES.warrior.fight.stamina).toBeGreaterThan(ROLES.mage.fight.stamina);
    expect(ROLES.cleric.patience).toBeGreaterThan(ROLES.warrior.patience);
    expect(ROLES.brute.fight.attack).toBeGreaterThan(ROLES.rogue.fight.attack);
    expect(ROLES.rogue.fight.accuracy).toBeGreaterThan(ROLES.brute.fight.accuracy);
    expect(ROLES.noble.pay).toBeGreaterThan(ROLES.servant.pay);
    expect(ROLES.noble.fussy).toBeGreaterThan(ROLES.brute.fussy);
  });

  it("falls back to the group's first type when the type doesn't fit the group", () => {
    expect(statsOf("adventurer").label).toBe("Archer");
    expect(statsOf("bandit", "brute").label).toBe("Brute");
    expect(statsOf("farmer", "brute").label).toBe("Farmer");
  });
});

describe("rolled stats", () => {
  it("keeps each guest's numbers in their type's range", () => {
    const random = seeded(7);
    for (const role of ALL) {
      const base = ROLES[role];
      for (let i = 0; i < 200; i++) {
        const s = rollStats(role, random);
        expect(s.patience).toBeGreaterThanOrEqual(Math.floor(base.patience * 0.8));
        expect(s.patience).toBeLessThanOrEqual(Math.ceil(base.patience * 1.2));
        expect(Math.abs(s.tip - base.tip)).toBeLessThanOrEqual(1);
        expect(Math.abs(s.nerve - base.nerve)).toBeLessThanOrEqual(1);
        expect(Math.abs(s.fight.attack - base.fight.attack)).toBeLessThanOrEqual(1);
        expect(s.fight.accuracy).toBeGreaterThanOrEqual(0.3);
        expect(s.fight.accuracy).toBeLessThanOrEqual(0.95);
        expect(s.lustCeiling).toBeGreaterThanOrEqual(0);
        expect(s.lustCeiling).toBeLessThanOrEqual(10);
        expect(s.load).toBeGreaterThanOrEqual(1);
        // What they are doesn't roll.
        expect(s.kind).toBe(base.kind);
        expect(s.favourite).toBe(base.favourite);
        expect(s.outfit).toBe(base.outfit);
      }
    }
  });

  it("makes two of the same type come out different", () => {
    const random = seeded(3);
    const a = rollStats("warrior", random);
    const b = rollStats("warrior", random);
    expect([a.patience, a.pay, a.fight.stamina]).not.toEqual([b.patience, b.pay, b.fight.stamina]);
  });

  it("keeps a weak type weaker than a strong one, even at the ends of their ranges", () => {
    // The mage's best roll still lasts less in a brawl than the brute's worst.
    expect(ROLES.mage.fight.stamina * 1.2).toBeLessThan(ROLES.brute.fight.stamina * 0.8);
  });
});
