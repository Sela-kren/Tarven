import { describe, expect, it } from "vitest";
import { cardLines, cardTitle, isCardTitle } from "../src/game/tropes";

describe("a story card's title on the dawn report", () => {
  it("comes first, as its own line, and is known for a title", () => {
    const lines = cardLines({ title: "The photo", lines: ["One.", "Two."] });
    expect(lines).toEqual([cardTitle("The photo"), "One.", "Two."]);
    expect(isCardTitle(lines[0])).toBe(true);
    expect(isCardTitle("One.")).toBe(false);
    expect(isCardTitle("Served 12, 0 walked out — a good night.")).toBe(false);
  });
});
