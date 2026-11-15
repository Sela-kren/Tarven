import { describe, expect, it } from "vitest";
import { DuelStage, GANGBANG_FROM, type StagePartner } from "../src/game/duelstage";
import { KIND_POSITIONS, onTable, SCENE_JOINS, SCENE_POSES, sceneForEntry } from "../src/game/sexpose";
import type { GuestKind } from "../src/game/tavern";

const man = (id: number, kind: GuestKind = "farmer"): StagePartner => ({ id, kind, female: false, done: false });
const their = (partner: number, part: "kiss" | "hands" | "mouth" | "breasts" | "butt" | "pussy", stage = 0, kind: GuestKind = "farmer") =>
  ({ side: "partner" as const, part, stage, kind, partner });
const hers = (partner: number, move: "kiss" | "hands" | "mouth" | "ride" | "anal" | "caress", kind: GuestKind = "farmer") =>
  ({ side: "her" as const, move, kind, partner });
const go = { defeated: false, alt: false };

/** The slot a joined partner is at, by name. */
function slotOf(stage: DuelStage, partner: number): string | undefined {
  const cast = stage.cast!;
  const join = cast.joins.find((j) => j.partner === partner);
  return join ? SCENE_JOINS[cast.scene]![join.spot].slot : undefined;
}

describe("1. a scene that holds stays until he's done with her", () => {
  it("his lesser moves leave her in it; a bolder hold of his moves her on", () => {
    const stage = new DuelStage();
    const them = [man(1)];
    stage.moment(their(1, "butt", 2), them, go);
    expect(stage.cast?.scene).toBe("doggy");
    expect(stage.moment(their(1, "kiss"), them, go)).toBe(false);
    expect(stage.moment(hers(1, "caress"), them, go)).toBe(false);
    expect(stage.cast?.scene).toBe("doggy");
    stage.moment(their(1, "mouth", 2), them, go);
    expect(stage.cast?.scene).toBe("throat");
  });

  it("a scene that doesn't hold gives way to the next moment", () => {
    const stage = new DuelStage();
    const them = [man(1)];
    stage.moment(their(1, "kiss"), them, go);
    stage.moment(their(1, "hands", 1), them, go);
    expect(stage.cast?.scene).toBe("stroke");
  });

  it("once he's given in, the next man's move takes her", () => {
    const stage = new DuelStage();
    const them = [man(1), man(2)];
    stage.moment(their(1, "pussy", 2), them, go);
    them[0].done = true;
    stage.moment(their(2, "breasts", 1), them, go);
    expect(stage.cast).toMatchObject({ scene: "suck", lead: 2 });
  });
});

describe("2. how his type has her", () => {
  it("going all the way, each type has his own position", () => {
    expect(sceneForEntry(their(1, "pussy", 2, "soldier"), false)).toBe(KIND_POSITIONS.soldier.pussy);
    expect(sceneForEntry(their(1, "butt", 2, "smuggler"), false)).toBe("bentover");
    expect(sceneForEntry(their(1, "pussy", 2, "adventurer"), false)).toBe("carry");
    expect(sceneForEntry(hers(1, "anal", "fugitive"), false)).toBe(KIND_POSITIONS.fugitive.butt);
  });

  it("riding him is her own way, whoever he is", () => {
    expect(sceneForEntry(hers(1, "ride", "soldier"), false)).toBe("cowgirl");
    expect(sceneForEntry(hers(1, "ride", "soldier"), false, true)).toBe("reverse");
  });

  it("every type has a position for both", () => {
    for (const positions of Object.values(KIND_POSITIONS)) {
      expect(positions.pussy).toBeTruthy();
      expect(positions.butt).toBeTruthy();
    }
  });
});

describe("3. others join her in the scene she's held in", () => {
  it("at the slot for what they're after, if one's free", () => {
    const stage = new DuelStage();
    const them = [man(1), man(2), man(3), man(4)];
    stage.moment(their(1, "butt", 2), them, go);
    stage.moment(their(2, "mouth", 1), them, go);
    expect(stage.cast?.scene).toBe("doggy");
    expect(slotOf(stage, 2)).toBe("mouth");
    stage.moment(hers(3, "hands"), them, go);
    expect(slotOf(stage, 3)).toBe("right");
    // Doggy has no more slots: the fourth doesn't get in.
    expect(stage.moment(their(4, "hands", 0), them, go)).toBe(false);
    expect(stage.cast?.joins).toHaveLength(2);
  });

  it("stay at their slot as she moves on, where the new scene has it", () => {
    const stage = new DuelStage();
    const them = [man(1), man(2)];
    stage.moment(their(1, "butt", 2), them, go);
    stage.moment(their(2, "mouth", 1), them, go);
    stage.moment(their(1, "pussy", 2), them, go);
    expect(stage.cast?.scene).toBe("missionary");
    expect(slotOf(stage, 2)).toBe("mouth");
  });

  it("drop out once they've given in", () => {
    const stage = new DuelStage();
    const them = [man(1), man(2)];
    stage.moment(their(1, "butt", 2), them, go);
    stage.moment(their(2, "mouth", 1), them, go);
    them[1].done = true;
    stage.moment(their(1, "butt", 2), them, go);
    expect(stage.cast?.joins).toEqual([]);
  });

  it(`with ${GANGBANG_FROM} or more and nothing holding her, they take her together`, () => {
    const stage = new DuelStage();
    const them = [man(1), man(2), man(3)];
    stage.moment(their(1, "kiss"), them, go);
    expect(stage.cast?.scene).toBe("gangbang");
    expect(stage.cast?.joins.map((j) => j.partner).sort()).toEqual([2, 3]);
    // One of them going all the way holds her his own way, the others still with her where there's room.
    stage.moment(their(1, "butt", 2), them, go);
    expect(stage.cast?.scene).toBe("doggy");
  });
});

describe("4. after a brawl she lost, she starts down where she fell", () => {
  it("the one who won over her, his crew round her", () => {
    const stage = new DuelStage();
    stage.start(true, [man(1, "bandit"), man(2, "bandit"), man(3, "bandit")]);
    expect(stage.cast).toMatchObject({ scene: "downed", lead: 1 });
    expect(stage.cast?.joins).toHaveLength(2);
  });

  it("otherwise there's nothing to show until something happens", () => {
    const stage = new DuelStage();
    stage.start(false, [man(1)]);
    expect(stage.cast).toBeNull();
  });

  it("the first move takes her up off the floor", () => {
    const stage = new DuelStage();
    const them = [man(1)];
    stage.start(true, them);
    stage.moment(their(1, "mouth", 1), them, go);
    expect(stage.cast?.scene).toBe("kneel");
  });
});

describe("4b. on a table in the taproom (KP's Waitress Sex)", () => {
  it("starts with her on her back across it, the one who asked between her legs, the others at her head and hand", () => {
    const stage = new DuelStage();
    stage.start(false, [man(1), man(2), man(3)], true);
    expect(stage.cast).toMatchObject({ scene: "tableBack", lead: 1 });
    expect(stage.cast?.joins.map((j) => slotOf(stage, j.partner)).sort()).toEqual(["left", "mouth"]);
    expect(SCENE_POSES.tableBack.table).toBeDefined();
    expect(SCENE_POSES.tableBent.table).toBeDefined();
  });

  it("stays on the table: lying back or riding on her back across it, from behind bent over it", () => {
    expect(onTable("missionary")).toBe("tableBack");
    expect(onTable("cowgirl")).toBe("tableBack");
    expect(onTable("doggy")).toBe("tableBent");
    expect(onTable("prone")).toBe("tableBent");
    expect(onTable("kneel")).toBe("kneel");
    const stage = new DuelStage();
    const them = [man(1, "farmer"), man(2)];
    stage.start(false, them, true);
    stage.moment(their(1, "butt", 2), them, go);
    expect(stage.cast?.scene).toBe("tableBent");
  });

  it("a crowd on her is still the table, not the floor", () => {
    const stage = new DuelStage();
    const them = [man(1), man(2), man(3), man(4)];
    stage.start(false, them, true);
    them[0].done = true;
    stage.moment(their(2, "kiss"), them, go);
    expect(stage.cast?.scene).toBe("tableBack");
  });
});

describe("5. with her willpower gone", () => {
  const spent = { defeated: true, alt: false };

  it("she can't hold herself up: limp on her back, or flat on her front", () => {
    const stage = new DuelStage();
    stage.moment(their(1, "pussy", 2), [man(1)], spent);
    expect(stage.cast?.scene).toBe("used");
    const other = new DuelStage();
    other.moment(their(1, "butt", 2, "smuggler"), [man(1, "smuggler")], spent);
    expect(other.cast?.scene).toBe("prone");
  });

  it("lighter moves find her slumped on the floor; her mouth on him still holds", () => {
    const stage = new DuelStage();
    stage.moment(their(1, "kiss"), [man(1)], spent);
    expect(stage.cast?.scene).toBe("slumped");
    stage.moment(their(1, "mouth", 1), [man(1)], spent);
    expect(stage.cast?.scene).toBe("kneel");
  });
});
