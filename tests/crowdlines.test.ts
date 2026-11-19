import { describe, expect, it } from "vitest";
import { BRAWL_HERE_LOG, crowdOf, REVEL_ASK_LOG, TABLE_END_LOG, TABLE_START_LOG, type Crowd, type CrowdLines } from "../src/game/loglines";
import { DEFEAT_IDS, defeatWords } from "../src/game/defeat";

const CROWDS: Crowd[] = ["men", "women", "mixed"];
const POOLS: Record<string, CrowdLines> = { TABLE_START_LOG, TABLE_END_LOG, BRAWL_HERE_LOG, REVEL_ASK_LOG };
/** Words only a man has, or that say only men are there. */
const MAN_ONLY = /\b(cocks?|seed|spend|men|man|his|he|him|pulls? out|come in you)\b/i;

describe("lines by who's on her: men, women, or both", () => {
  it("tells the crowd from the partners", () => {
    expect(crowdOf([{ female: false }, { female: false }])).toBe("men");
    expect(crowdOf([{ female: true }])).toBe("women");
    expect(crowdOf([{ female: true }, { female: false }])).toBe("mixed");
    expect(crowdOf([])).toBe("men");
  });

  it("every crowd pool has lines for all three, and the women's never give her a man", () => {
    for (const [name, pool] of Object.entries(POOLS)) {
      for (const crowd of CROWDS) expect(pool[crowd].length, `${name}.${crowd}`).toBeGreaterThan(1);
      for (const line of pool.women) expect(line, name).not.toMatch(MAN_ONLY);
    }
  });

  it("every defeat has its own women's and mixed openings and mornings", () => {
    for (const id of DEFEAT_IDS) {
      for (const crowd of CROWDS) {
        const words = defeatWords(id, crowd);
        expect(words.start.length, `${id}.${crowd}`).toBeGreaterThan(1);
        expect(words.morning.length, `${id}.${crowd}`).toBeGreaterThan(1);
      }
      const women = defeatWords(id, "women");
      // The Baron is still the Baron ("his copy"): he isn't in the room.
      for (const line of [...women.start, ...women.morning]) expect(line.replace(/the Baron will want his copy|The Baron will want his copy/g, ""), id).not.toMatch(MAN_ONLY);
    }
  });
});
