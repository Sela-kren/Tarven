import { afterEach, describe, expect, it } from "vitest";
import { setFlavorSource } from "../src/game/flavor";
import { Fight } from "../src/game/fight";

const stats = {
  levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 },
  damage: 0,
  dodge: 0,
  talk: 0,
  stare: 0,
} as unknown as ConstructorParameters<typeof Fight>[3];

afterEach(() => setFlavorSource(null));

describe("brawl flavour lines", () => {
  it("adds the AI's line after what happened, asking for the right event and guest", () => {
    const asked: string[] = [];
    setFlavorSource((key, guest) => {
      asked.push(`${key}/${guest}`);
      return key === "fight:start" ? "The soldier cracks his knuckles and spits." : null;
    });
    const fight = new Fight(1, "soldier", false, stats, () => 0);
    expect(fight.log).toEqual(["The soldier squares up to you.", "The soldier cracks his knuckles and spits."]);
    expect(asked).toEqual(["fight:start/soldier"]);
  });

  it("reads exactly as written with nothing plugged in", () => {
    const fight = new Fight(1, "farmer", true, stats, () => 0);
    expect(fight.log).toEqual(["The farmer is roaring drunk and wants a fight."]);
  });
});
