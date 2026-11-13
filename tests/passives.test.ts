import { describe, expect, it } from "vitest";
import {
  earned,
  effectsOf,
  lewdnessOf,
  METER_OF,
  METERS,
  newRecords,
  PASSIVE_BY_ID,
  PASSIVE_GROUPS,
  PASSIVES,
  readProgress,
} from "../src/game/passives";
import { PASSIVE_ICONS } from "../src/game/passiveicons";
import { Tavern } from "../src/game/tavern";
import { TOUCHES } from "../src/game/touchtalk";

const SEATS = 11;

function bedtime(t: Tavern): void {
  t.phase = "bedtime";
  t.sleep();
}

describe("the passive list", () => {
  it("has unique ids, a group that exists, and a picture for every group", () => {
    expect(new Set(PASSIVES.map((p) => p.id)).size).toBe(PASSIVES.length);
    const groups = new Set(PASSIVE_GROUPS.map((g) => g.id));
    for (const p of PASSIVES) expect(groups.has(p.group)).toBe(true);
    for (const g of PASSIVE_GROUPS) {
      expect(PASSIVE_ICONS[g.id]).toContain("<svg");
      expect(PASSIVES.some((p) => p.group === g.id)).toBe(true);
    }
    expect(PASSIVES.length).toBeGreaterThanOrEqual(70);
  });

  it("gives every touch a meter, and the new intimate touches need Pussy desire", () => {
    for (const touch of TOUCHES) expect(METERS).toContain(METER_OF[touch.region]);
    expect(TOUCHES.filter((t) => t.region === "intimate").length).toBeGreaterThanOrEqual(3);
    expect(METER_OF.intimate).toBe("pussy");
  });

  it("adds up effects, and works lewdness out from passives and records", () => {
    const owned = new Set(["warmHands", "easyShoulders", "stolenKiss"]);
    const e = effectsOf(owned);
    expect(e.start.body).toBe(10);
    expect(e.ease.lips).toBe(10);
    const records = newRecords();
    expect(lewdnessOf(owned, 10, records)).toBe(2 + 2 + 4 + 2);
    records.invitations = 1;
    expect(lewdnessOf(owned, 10, records)).toBe(12);
  });
});

describe("earning passives", () => {
  it("earns them as she goes to bed, and they take hold the next night", () => {
    const t = new Tavern(SEATS);
    t.playerBody = "Female";
    t.touchMemory.lets.hand = 3;
    bedtime(t);
    expect(t.newPassives.map((p) => p.id)).toContain("warmHands");
    expect(t.passives.has("warmHands")).toBe(true);
    t.nextNight();
    expect(t.meters.body).toBe(5);
    // Earned once only.
    t.phase = "bedtime";
    t.sleep();
    expect(t.newPassives.map((p) => p.id)).not.toContain("warmHands");
  });

  it("needs every part of a requirement, not just the count", () => {
    const facts = new Tavern(SEATS).passiveFacts();
    facts.lets.hand = 10;
    const handInHand = PASSIVE_BY_ID.get("handInHand")!;
    expect(earned(handInHand, facts)).toBe(false);
    facts.records.kinds.hand = ["farmer", "soldier", "smuggler"];
    expect(earned(handInHand, facts)).toBe(true);
  });

  it("counts maxed meters and nights with nobody let close", () => {
    const t = new Tavern(SEATS);
    t.playerBody = "Female";
    t.open();
    t.meters.mouth = 100;
    (t as unknown as { peak: Record<string, number> }).peak.mouth = 100;
    t.touchesTonight.reached = 2;
    bedtime(t);
    expect(t.records.maxed.mouth).toBe(1);
    expect(t.records.chasteNights).toBe(1);
    expect(t.passives.has("restless")).toBe(true);
  });

  it("makes selling secrets corrupt her, with passives that pay for it", () => {
    const t = new Tavern(SEATS);
    t.phase = "lastcall";
    t.heardRumor = true;
    t.chooseLastCall(2);
    expect(t.corruption).toBeGreaterThan(0);
    expect(t.persona.sold).toBe(1);
    t.sleep();
    expect(t.passives.has("looseLips")).toBe(true);
    expect(t.effects.secretGold).toBe(3);
  });
});

describe("desire tonight", () => {
  it("fills with drink, and each touch needs its own meter", () => {
    const t = new Tavern(SEATS);
    t.open();
    expect(t.desireFor("lips")).toBe(0);
    t.meters.mouth = 60;
    expect(t.desireFor("lips")).toBe(6);
    expect(t.desireFor("chest")).toBe(0);
    t.passives.add("stolenKiss");
    t.effects = effectsOf(t.passives);
    expect(t.desireFor("lips")).toBe(7);
  });
});

describe("upstairs and the 18+ moments", () => {
  it("lets her choose only what she's warm enough for, pays, and keeps the bar waiting", () => {
    const t = new Tavern(SEATS);
    t.open();
    const choices = t.upstairsChoices();
    expect(choices.find((c) => c.act === "kiss")?.ready).toBe(true);
    expect(choices.find((c) => c.act === "bed")?.ready).toBe(false);
    t.meters.pussy = 90;
    // Pussy desire alone isn't enough for the bed: she has to be wet too (50 pleasure less a quarter of it).
    expect(t.upstairsChoices().find((c) => c.act === "bed")?.ready).toBe(false);
    t.pleasure = 28;
    expect(t.upstairsChoices().find((c) => c.act === "bed")?.ready).toBe(true);
    const gold = t.gold;
    const line = t.goUpstairs({ kind: "upstairs", guestId: 1, guestKind: "soldier" }, "bed");
    expect(line.length).toBeGreaterThan(0);
    expect(t.gold).toBeGreaterThan(gold);
    expect(t.records.invitations).toBe(1);
    expect(t.records.acts.bed).toBe(1);
    expect(t.records.upstairsKinds).toEqual(["soldier"]);
  });

  it("lets her ease the ache herself at bedtime only when she's restless", () => {
    const t = new Tavern(SEATS);
    t.playerBody = "Female";
    t.phase = "bedtime";
    expect(t.restless).toBe(false);
    t.meters.pussy = 70;
    expect(t.restless).toBe(true);
    t.easeAche();
    expect(t.records.alone).toBe(1);
    expect(t.meters.pussy).toBe(0);
    t.sleep();
    expect(t.passives.has("restlessHands")).toBe(true);
  });
});

describe("saving", () => {
  it("keeps records, passives and corruption, and shrugs off a broken save", () => {
    const t = new Tavern(SEATS);
    t.records.slapped = 7;
    t.records.acts.mouth = 2;
    t.passives.add("firmHand");
    t.corruption = 22;
    const loaded = new Tavern(SEATS);
    loaded.restore(t.snapshot());
    expect(loaded.records.slapped).toBe(7);
    expect(loaded.records.acts.mouth).toBe(2);
    expect(loaded.passives.has("firmHand")).toBe(true);
    expect(loaded.effects.slapStops).toBe(true);
    expect(loaded.corruption).toBe(22);

    const broken = readProgress({ corruption: "lots", passives: ["firmHand", "nonsense", 4], records: { slapped: -3, kinds: { lips: ["farmer", "dragon"] } } });
    expect(broken.corruption).toBe(0);
    expect(broken.passives).toEqual(["firmHand"]);
    expect(broken.records.slapped).toBe(0);
    expect(broken.records.kinds.lips).toEqual(["farmer"]);
  });

  it("loads a save from before passives, letting the old lasting desire go", () => {
    const t = new Tavern(SEATS);
    const old = { ...t.snapshot(), touch: { desire: 6, lets: { lips: 4 } } } as ReturnType<Tavern["snapshot"]>;
    delete (old as { progress?: unknown }).progress;
    const loaded = new Tavern(SEATS);
    loaded.restore(old);
    expect(loaded.touchMemory.lets.lips).toBe(4);
    expect(loaded.passives.size).toBe(0);
  });
});
