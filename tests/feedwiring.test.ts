import { describe, expect, it } from "vitest";
import { Tavern } from "../src/game/tavern";
import { SPONSORS, sponsorPayout, TRENDS } from "../src/game/feedstar";

/** A seeded roll (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dayOne(): Tavern {
  const t = new Tavern(11);
  t.random = seeded(3);
  t.gold = 20;
  return t;
}

const STEW = { outfit: "apron", prop: "stew", angle: "above" } as const;

describe("a Feed Star post", () => {
  it("costs the relay's fee, brings likes and followers, and counts toward the Watched passives", () => {
    const t = dayOne();
    const out = t.feedPost("stew", STEW, 0);
    expect(out).not.toBeNull();
    expect(out!.shot.grade).toBe("perfect");
    expect(t.gold).toBe(19);
    expect(t.postedToday).toBe(true);
    expect(t.feed.followers).toBe(out!.post.newFollowers);
    expect(t.feed.totalLikes).toBe(out!.post.likes);
    expect(t.records.feedPosts).toBe(1);
    expect(t.records.feedLikes).toBe(out!.post.likes);
    expect(t.errandGuests).toBeGreaterThan(0);
    // Her first post earns Camera-Shy, which adds to every post's likes.
    expect(t.passives.has("camera_shy")).toBe(true);
    expect(t.effects.feedLikes).toBeGreaterThan(0);
    // Once a day, shared with the plain post.
    expect(t.feedPost("pour", STEW, 0)).toBeNull();
    expect(t.canPostOnFeed()).toBe(false);
  });

  it("won't post what her arc isn't ready for", () => {
    const t = dayOne();
    expect(t.feedAllowedPosts()).toEqual(["stew", "pour"]);
    expect(t.feedPost("bare", { outfit: "nothing", prop: "candle", angle: "low" }, 0)).toBeNull();
    expect(t.postedToday).toBe(false);
  });

  it("pays a signed sponsor for a post that shows their goods", () => {
    const t = dayOne();
    t.feed = { ...t.feed, followers: 60 };
    expect(t.feedSponsorOffers()).toContain("brunhild");
    expect(t.signSponsor("brunhild")).toBe(true);
    const gold = t.gold;
    const out = t.feedPost("pour", { outfit: "apron", prop: "tankard", angle: "front" }, 0)!;
    expect(t.gold).toBe(gold - 1 + sponsorPayout("brunhild", "pour", out.shot.quality));
    expect(t.feedDeals[0].postsThisWeek).toBe(1);
  });
});

describe("the feed over days", () => {
  it("grows a little on a day she posted, and the sponsors count her posts at the week's turn", () => {
    const t = dayOne();
    t.feed = { ...t.feed, followers: 100 };
    t.records.feedPosts = 3;
    t.feedDeals = [{ id: "edda", postsThisWeek: 0 }];
    t.nightIndex = 6;
    t.postedToday = true;
    t.phase = "dawn";
    t.nextNight();
    expect(t.nightIndex).toBe(7);
    expect(t.feed.followers).toBe(102);
    // Short of Edda's posts: a warning, then broken a week later.
    expect(t.feedWarned).toEqual(["edda"]);
    expect(t.feedDeals[0].postsThisWeek).toBe(0);
    t.nightIndex = 13;
    t.phase = "dawn";
    t.nextNight();
    expect(t.feedDeals).toEqual([]);
    expect(t.feedBroken).toEqual(["edda"]);
    expect(t.feedSponsorOffers()).not.toContain("edda");
    expect(SPONSORS.edda.perWeek).toBeGreaterThan(0);
  });

  it("loses followers after quiet days", () => {
    const t = dayOne();
    t.feed = { ...t.feed, followers: 200 };
    t.records.feedPosts = 1;
    for (let i = 0; i < 3; i++) {
      t.phase = "dawn";
      t.nextNight();
    }
    expect(t.feed.followers).toBeLessThan(200);
    expect(t.feedQuietDays).toBe(3);
  });
});

describe("DMs, streams and trends", () => {
  it("rolls one to three DMs a day, and a reply takes one off the pile", () => {
    const t = dayOne();
    const dms = t.feedDms();
    expect(dms.length).toBeGreaterThanOrEqual(1);
    expect(dms.length).toBeLessThanOrEqual(3);
    const n = dms.length;
    expect(t.feedReply(0, "ignore")).not.toBeNull();
    expect(t.feedDms().length).toBe(n - 1);
  });

  it("plays a stream request by request, and counts one seen through", () => {
    const t = dayOne();
    expect(t.feedGoLive()).toBe(true);
    expect(t.canStream).toBe(false);
    let result = null;
    while (t.feedStreamRequest) result = t.feedStreamAnswer(t.feedStreamRequest.tier === 0);
    expect(result).not.toBeNull();
    expect(t.feedStream).toBeNull();
    expect(t.feed.streams).toBe(result!.endedEarly ? 0 : 1);
    expect(t.feedGoLive()).toBe(false);
  });

  it("joins the week's trend once, on the beat", () => {
    const t = dayOne();
    expect(t.feedTrend).toBe("ale");
    expect(t.canTrend).toBe(true);
    const taps = t.feedTrendTaps(TRENDS.ale.beats.map(() => "on"));
    const r = t.feedTrendDance(taps)!;
    expect(r.placement).toBe(1);
    expect(t.feed.followers).toBe(r.newFollowers);
    expect(t.canTrend).toBe(false);
  });
});

describe("saving the feed", () => {
  it("round-trips her feed, deals and today's state", () => {
    const t = dayOne();
    t.feedPost("stew", STEW, 0);
    t.feed = { ...t.feed, followers: 130, boldPosts: 2, virals: 1, streams: 1 };
    t.feedDeals = [{ id: "brunhild", postsThisWeek: 1 }];
    t.feedWarned = ["brunhild"];
    t.feedBroken = ["warmhouse"];
    t.feedHype = 0.1;
    t.feedTrendWeek = 0;
    t.feedDms();
    const save = JSON.parse(JSON.stringify(t.snapshot()));
    const back = new Tavern(11);
    back.restore(save);
    expect(back.feed).toEqual(t.feed);
    expect(back.feedDeals).toEqual(t.feedDeals);
    expect(back.feedWarned).toEqual(["brunhild"]);
    expect(back.feedBroken).toEqual(["warmhouse"]);
    expect(back.feedHype).toBeCloseTo(0.1);
    expect(back.feedTrendWeek).toBe(0);
    expect(back.feedInbox).toEqual(t.feedInbox);
    expect(back.records.feedPosts).toBe(1);
    expect(back.passives.has("camera_shy")).toBe(true);
  });

  it("loads an older save with no feed", () => {
    const t = new Tavern(11);
    const save = t.snapshot();
    expect(save.feed).toBeUndefined();
    const back = new Tavern(11);
    back.restore(save);
    expect(back.feed.followers).toBe(0);
    expect(back.feedDeals).toEqual([]);
  });
});
