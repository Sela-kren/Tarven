import { describe, expect, it } from "vitest";
import {
  FEED_COST,
  FLYER_COST,
  handOutFlyers,
  MARKET_PACK_COST,
  MARKET_REPLACE_COST,
  MARKET_SILAS_MARKUP,
  MAX_ERRAND_GUESTS,
  postOnFeed,
  type FlyerFacts,
} from "../src/game/errands";
import { NIGHTS, STOCK_COST, STOCK_PACK, Tavern } from "../src/game/tavern";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
const idle = { listeningTo: null, night: true };
const decent: FlyerFacts = { flirt: 0, fame: 0, respect: 0, dress: "dressed", outfit: "work", arc: "sheltered" };
const never = () => 0.99;

function day(): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.crowdRandom = null;
  t.random = () => 0.5;
  t.gold = 100;
  return t;
}

describe("the market stalls", () => {
  it("sell cups and dishes cheaper than the cart, by day only", () => {
    expect(MARKET_PACK_COST).toBeLessThan(STOCK_COST);
    const t = day();
    const cups = t.stock.cup;
    t.marketBuy("cup");
    expect(t.stock.cup).toBe(cups + STOCK_PACK);
    expect(t.gold).toBe(100 - MARKET_PACK_COST);
    t.phase = "service";
    expect(t.canMarketBuy("dish")).toBe(false);
  });

  it("charge more once Silas has been crossed", () => {
    const t = day();
    t.plotFlags.add("silasAngry");
    t.marketBuy("dish");
    expect(t.gold).toBe(100 - MARKET_PACK_COST - MARKET_SILAS_MARKUP);
  });

  it("replace a broken cup for less than the house plans", () => {
    const t = day();
    t.broken.cup = 2;
    t.stock.cup -= 2;
    t.marketReplace("cup");
    expect(t.broken.cup).toBe(1);
    expect(t.gold).toBe(100 - MARKET_REPLACE_COST);
  });
});

describe("flyers and the feed", () => {
  it("decent flyers bring a guest and a fan and cost nothing in respect", () => {
    const r = handOutFlyers(decent, never);
    expect(r.guests).toBe(1);
    expect(r.fans).toBe(1);
    expect(r.respect).toBe(0);
  });

  it("showing more draws more and costs respect, less once she's Known", () => {
    const bare = handOutFlyers({ ...decent, dress: "topless" }, never);
    expect(bare.guests).toBeGreaterThan(1);
    expect(bare.respect).toBe(-3);
    expect(handOutFlyers({ ...decent, dress: "topless", arc: "known" }, never).respect).toBe(-1);
  });

  it("flirt and fame draw more, never past the cap", () => {
    const star = handOutFlyers({ ...decent, flirt: 10, fame: 100, dress: "naked" }, () => 0);
    expect(star.guests).toBe(MAX_ERRAND_GUESTS);
  });

  it("the feed costs heat, because Pell reads it", () => {
    expect(postOnFeed(0, never)).toMatchObject({ guests: 1, fans: 1, heat: 1 });
    expect(postOnFeed(40, never).guests).toBe(2);
  });

  it("each errand runs once a day, and costs its price", () => {
    const t = day();
    expect(t.runErrand("flyers")).not.toBeNull();
    expect(t.runErrand("flyers")).toBeNull();
    expect(t.runErrand("feed")).not.toBeNull();
    expect(t.gold).toBe(100 - FLYER_COST - FEED_COST);
    expect(t.heat).toBe(1);
  });

  it("brings its guests in tonight and its fans at dawn", () => {
    const t = day();
    t.runErrand("flyers");
    t.runErrand("feed");
    const drawn = t.errandGuests;
    expect(drawn).toBeGreaterThanOrEqual(2);
    t.open();
    t.tick(0, idle);
    expect(t.tonight.length).toBe(NIGHTS[0].guests.length + drawn);
    expect(t.errandGuests).toBe(0);
  });

  it("are kept in a save made during the day", () => {
    const t = day();
    t.runErrand("flyers");
    const back = new Tavern(TABLES.length, TABLES);
    back.restore(JSON.parse(JSON.stringify(t.snapshot())));
    expect(back.flyeredToday).toBe(true);
    expect(back.postedToday).toBe(false);
    expect(back.errandGuests).toBe(t.errandGuests);
    expect(back.errandFans).toBe(t.errandFans);
  });
});
