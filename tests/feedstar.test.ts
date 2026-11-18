import { describe, expect, it } from "vitest";
import {
  allowedPosts,
  breakDeal,
  checksPhone,
  earnedWatchedPassives,
  EMPTY_RECORDS,
  expectedLikes,
  followerDay,
  LOYAL_FLOOR,
  liveStream,
  NO_WATCHED_EFFECTS,
  photoShoot,
  postAllowed,
  POSTS,
  recordPost,
  replyDM,
  rollRisks,
  scorePost,
  sponsorOffers,
  sponsorPayout,
  SPONSORS,
  STALKER_CAP,
  stalkerChance,
  STREAM_START_HYPE,
  trendAllowed,
  trendChallenge,
  TRENDS,
  VIRAL_CAP,
  VIRAL_MULT,
  WATCHED_AT,
  WATCHED_PASSIVES,
  watchedEffects,
  watchedStage,
  weekForDeal,
  weeklyTrend,
  type FeedRecords,
  type StreamRequest,
} from "../src/game/feedstar";

/** A fixed rng: returns the values in turn, then the last one forever. */
const seq = (...v: number[]) => {
  let i = 0;
  return () => v[Math.min(i++, v.length - 1)];
};

const rec = (r: Partial<FeedRecords>): FeedRecords => ({ ...EMPTY_RECORDS, ...r });
const KNOWN_REC = rec({ followers: 700, totalLikes: 12000, boldPosts: 15, virals: 1 });

describe("the Watched awakening", () => {
  it("starts Shy and steps up with followers, likes and bold posts", () => {
    expect(watchedStage(EMPTY_RECORDS, "known")).toBe("shy");
    expect(watchedStage(rec(WATCHED_AT.curious), "known")).toBe("curious");
    expect(watchedStage(rec(WATCHED_AT.craving), "known")).toBe("craving");
    expect(watchedStage(rec(WATCHED_AT.known), "known")).toBe("known");
  });

  it("needs every part of a stage, and can't skip one", () => {
    expect(watchedStage(rec({ ...WATCHED_AT.craving, boldPosts: 4 }), "known")).toBe("curious");
    expect(watchedStage(rec({ ...WATCHED_AT.known, virals: 0 }), "known")).toBe("craving");
  });

  it("is never ahead of her arc", () => {
    expect(watchedStage(KNOWN_REC, "sheltered")).toBe("shy");
    expect(watchedStage(KNOWN_REC, "curious")).toBe("curious");
    expect(watchedStage(KNOWN_REC, "willing")).toBe("craving");
    expect(watchedStage(KNOWN_REC, "known")).toBe("known");
  });

  it("gives one stage passive at a time, plus earned extras", () => {
    expect(earnedWatchedPassives(EMPTY_RECORDS, "known")).toEqual([]);
    expect(earnedWatchedPassives(rec({ totalLikes: 5 }), "known")).toEqual(["camera_shy"]);
    expect(earnedWatchedPassives(rec(WATCHED_AT.curious), "known")).toEqual(["little_thrill"]);
    expect(earnedWatchedPassives(rec(WATCHED_AT.craving), "willing")).toEqual(["refresh_refresh"]);
    const late = earnedWatchedPassives({ ...KNOWN_REC, virals: 3, streams: 5 }, "known");
    expect(late).toEqual(["everyones_watching", "went_viral", "crystal_darling"]);
  });

  it("every passive has an id, a name and effects", () => {
    expect(new Set(WATCHED_PASSIVES.map((p) => p.id)).size).toBe(WATCHED_PASSIVES.length);
    for (const p of WATCHED_PASSIVES) expect(p.name.length).toBeGreaterThan(0);
  });

  it("each stage's effects match the plan", () => {
    const shy = watchedEffects(["camera_shy"]);
    expect(shy.boldWillpower).toBe(2);
    expect(shy.likeThrill).toBe(0);
    const curious = watchedEffects(["little_thrill"]);
    expect(curious.likeThrill).toBeGreaterThan(0);
    expect(curious.phoneCheck).toBe(0);
    const craving = watchedEffects(["refresh_refresh"]);
    expect(craving.boldWillpower).toBe(0);
    expect(craving.phoneCheck).toBeGreaterThan(0);
    expect(craving.quietRestless).toBeGreaterThan(0);
    expect(craving.viralThrill).toBeGreaterThan(0);
    const known = watchedEffects(["everyones_watching", "went_viral", "crystal_darling"]);
    expect(known.audiencePleasure).toBeCloseTo(0.2);
    expect(known.exhibitionBoost).toBe(1.25);
    expect(known.viralThrill).toBe(25);
    expect(watchedEffects([])).toEqual(NO_WATCHED_EFFECTS);
  });

  it("checks her phone mid-shift only once she craves it", () => {
    expect(checksPhone(watchedEffects(["little_thrill"]), () => 0)).toBe(false);
    const craving = watchedEffects(["refresh_refresh"]);
    expect(checksPhone(craving, () => 0.1)).toBe(true);
    expect(checksPhone(craving, () => 0.9)).toBe(false);
  });
});

describe("posts", () => {
  it("are gated by her arc and Watched stage", () => {
    expect(allowedPosts("sheltered", "shy")).toEqual(["stew", "pour"]);
    expect(allowedPosts("curious", "shy")).toEqual(["stew", "pour", "outfit"]);
    expect(postAllowed("tease", "willing", "shy")).toBe(false);
    expect(postAllowed("tease", "willing", "curious")).toBe(true);
    expect(postAllowed("bare", "known", "curious")).toBe(false);
    expect(postAllowed("bare", "known", "craving")).toBe(true);
    expect(postAllowed("bare", "willing", "craving")).toBe(false);
  });

  it("scores likes, followers, fame and respect", () => {
    const r = scorePost({ kind: "stew", quality: 0.5, followers: 100, effects: NO_WATCHED_EFFECTS }, seq(0.99, 0.5));
    expect(r.viral).toBe(false);
    expect(r.likes).toBe(expectedLikes("stew", 100));
    expect(r.newFollowers).toBe(Math.floor(r.likes / 6));
    expect(r.fame).toBe(0);
    expect(r.respect).toBe(0);
    expect(r.willpower).toBe(0);
  });

  it("bold posts bring fame fast and cost respect; viral doubles that", () => {
    const calm = scorePost({ kind: "bare", quality: 1, followers: 200, effects: NO_WATCHED_EFFECTS }, seq(0.99, 0.5));
    expect(calm.fame).toBe(3);
    expect(calm.respect).toBe(-3);
    const viral = scorePost({ kind: "bare", quality: 1, followers: 200, effects: NO_WATCHED_EFFECTS }, seq(0, 0.5));
    expect(viral.viral).toBe(true);
    expect(viral.likes).toBe(calm.likes * VIRAL_MULT);
    expect(viral.respect).toBe(-6);
    expect(viral.fame).toBe(6);
  });

  it("the viral chance never passes the cap", () => {
    const r = scorePost({ kind: "bare", quality: 1, followers: 0, effects: NO_WATCHED_EFFECTS }, seq(VIRAL_CAP + 0.001, 0.5));
    expect(r.viral).toBe(false);
  });

  it("costs willpower when Shy, thrills her when Curious and on", () => {
    const shy = scorePost({ kind: "outfit", quality: 0.5, followers: 50, effects: watchedEffects(["camera_shy"]) }, seq(0.99, 0.5));
    expect(shy.willpower).toBe(-2);
    expect(shy.bodyDesire).toBe(0);
    const curious = scorePost({ kind: "outfit", quality: 1, followers: 50, effects: watchedEffects(["little_thrill"]) }, seq(0.99, 0.99));
    expect(curious.bodyDesire).toBe(6);
    const craving = scorePost({ kind: "tease", quality: 1, followers: 50, effects: watchedEffects(["refresh_refresh"]) }, seq(0, 0.5));
    expect(craving.bodyDesire).toBe(8 + 15);
    expect(craving.willpower).toBe(0);
  });

  it("records a post", () => {
    const res = scorePost({ kind: "lingerie", quality: 1, followers: 10, effects: NO_WATCHED_EFFECTS }, seq(0, 0.5));
    const r = recordPost(EMPTY_RECORDS, "lingerie", res);
    expect(r.boldPosts).toBe(1);
    expect(r.virals).toBe(1);
    expect(r.totalLikes).toBe(res.likes);
    expect(r.followers).toBe(res.newFollowers);
    expect(recordPost(EMPTY_RECORDS, "pour", res).boldPosts).toBe(0);
  });

  it("has a caption for every post kind", () => {
    for (const p of Object.values(POSTS)) expect(p.caption.length).toBeGreaterThan(0);
  });
});

describe("followers over time", () => {
  it("grow on a day she posts", () => {
    expect(followerDay(100, true, 0, NO_WATCHED_EFFECTS)).toEqual({ followers: 102, restless: 0 });
  });

  it("hold through a grace day, then drift away, never below the loyal few", () => {
    expect(followerDay(100, false, 1, NO_WATCHED_EFFECTS).followers).toBe(100);
    expect(followerDay(100, false, 2, NO_WATCHED_EFFECTS).followers).toBe(97);
    expect(followerDay(11, false, 5, NO_WATCHED_EFFECTS).followers).toBe(LOYAL_FLOOR);
  });

  it("a quiet day leaves her restless once she craves the feed", () => {
    expect(followerDay(100, false, 1, watchedEffects(["little_thrill"])).restless).toBe(0);
    expect(followerDay(100, false, 1, watchedEffects(["refresh_refresh"])).restless).toBe(10);
  });
});

describe("sponsors", () => {
  it("offer by followers and stage, once", () => {
    expect(sponsorOffers(40, "known", [])).toEqual([]);
    expect(sponsorOffers(50, "shy", [])).toEqual(["brunhild"]);
    expect(sponsorOffers(130, "shy", [])).toEqual(["brunhild"]);
    expect(sponsorOffers(130, "curious", ["brunhild"])).toEqual(["edda"]);
    expect(sponsorOffers(500, "craving", [], ["edda"])).toEqual(["brunhild", "warmhouse"]);
  });

  it("pay only for posts that show their goods, more for a good photo", () => {
    expect(sponsorPayout("brunhild", "stew", 1)).toBe(0);
    expect(sponsorPayout("brunhild", "pour", 0.5)).toBe(SPONSORS.brunhild.pay);
    expect(sponsorPayout("edda", "outfit", 0.8)).toBe(Math.round(SPONSORS.edda.pay * 1.5));
  });

  it("warn once, then break, and breaking costs", () => {
    expect(weekForDeal({ id: "edda", postsThisWeek: 2 }, true)).toBe("kept");
    expect(weekForDeal({ id: "edda", postsThisWeek: 1 }, false)).toBe("warned");
    expect(weekForDeal({ id: "edda", postsThisWeek: 1 }, true)).toBe("broken");
    const b = breakDeal("brunhild", 200);
    expect(b.respect).toBe(-1);
    expect(b.followersLost).toBe(10);
    expect(b.loyalty).toBeLessThan(0);
    expect(breakDeal("warmhouse", 200).loyalty).toBe(0);
  });
});

describe("risks", () => {
  it("stalkers grow likelier with boldness and followers, to a cap", () => {
    expect(stalkerChance(3, 100)).toBeGreaterThan(stalkerChance(0, 100));
    expect(stalkerChance(0, 1000)).toBeGreaterThan(stalkerChance(0, 10));
    expect(stalkerChance(3, 1e6)).toBe(STALKER_CAP);
  });

  it("a safe roll brings nothing", () => {
    const r = rollRisks(0, 10, false, () => 0.99);
    expect(r).toMatchObject({ stalker: false, baronRead: false, heat: 0, gossip: false });
    expect(r.lines).toEqual([]);
  });

  it("the Baron's men reading a bold post bring heat; viral always gets talked about", () => {
    const r = rollRisks(3, 500, true, () => 0);
    expect(r.stalker).toBe(true);
    expect(r.baronRead).toBe(true);
    expect(r.heat).toBe(3);
    expect(r.gossip).toBe(true);
    expect(r.lines.length).toBe(3);
    expect(rollRisks(0, 0, true, seq(0.99, 0.99)).gossip).toBe(true);
  });
});

describe("photo shoot", () => {
  it("a perfect tap with the right prop and angle is a perfect shot", () => {
    const r = photoShoot({ post: "stew", outfit: "apron", prop: "stew", angle: "above" }, 20);
    expect(r).toEqual({ quality: 1, grade: "perfect", tier: 0 });
  });

  it("timing windows and wrong choices lower the quality", () => {
    const base = { post: "pour", outfit: "apron", prop: "tankard", angle: "front" } as const;
    expect(photoShoot(base, -100).grade).toBe("good");
    expect(photoShoot(base, 250).grade).toBe("blurry");
    expect(photoShoot(base, 500)).toMatchObject({ grade: "missed", quality: 0.55 });
    expect(photoShoot({ ...base, prop: "candle", angle: "above" }, 0).quality).toBe(0.68);
  });

  it("the shot is as bold as the post, or its outfit and angle if bolder", () => {
    expect(photoShoot({ post: "outfit", outfit: "lace", prop: "mirror", angle: "front" }, 0).tier).toBe(2);
    expect(photoShoot({ post: "stew", outfit: "apron", prop: "stew", angle: "low" }, 0).tier).toBe(0);
    expect(photoShoot({ post: "outfit", outfit: "dress", prop: "mirror", angle: "low" }, 0).tier).toBe(2);
    expect(photoShoot({ post: "lingerie", outfit: "nothing", prop: "candle", angle: "above" }, 0).tier).toBe(3);
  });
});

describe("comments and DMs", () => {
  const fan = { kind: "fan", from: "Tansy", text: "Lovely stew!" } as const;
  const creep = { kind: "creep", from: "watcher99", text: "I know which window is yours." } as const;

  it("charm builds loyal followers, teasing builds hype", () => {
    expect(replyDM(fan, "charm", () => 0.5).loyal).toBe(2);
    expect(replyDM({ ...fan, kind: "flirt" }, "tease", () => 0.5).hype).toBeGreaterThan(0);
  });

  it("ignoring does nothing; blocking a creep lowers the stalker risk", () => {
    expect(replyDM(creep, "ignore", () => 0)).toMatchObject({ loyal: 0, hype: 0, stalkerRisk: 0 });
    expect(replyDM(creep, "block", () => 0).stalkerRisk).toBeLessThan(0);
    expect(replyDM(creep, "tease", () => 0).stalkerRisk).toBeGreaterThan(replyDM(creep, "charm", () => 0).stalkerRisk);
  });

  it("gifts pay, more for a tease; sponsors make offers", () => {
    const gift = { kind: "gift", from: "a knight", text: "For you." } as const;
    expect(replyDM(gift, "charm", () => 0).gold).toBe(3);
    expect(replyDM(gift, "tease", () => 0).gold).toBe(6);
    expect(replyDM({ kind: "sponsor", from: "Bootmakers", text: "" }, "charm", () => 0).sponsorOffer).toBe(true);
  });
});

describe("live stream", () => {
  const reqs: StreamRequest[] = [
    { id: "a", at: 2, ttl: 5, tier: 0, tip: 2, text: "Wave!" },
    { id: "b", at: 5, ttl: 5, tier: 2, tip: 5, text: "Lean closer to the crystal" },
    { id: "c", at: 8, ttl: 4, tier: 3, tip: 10, text: "Lose the apron" },
  ];

  it("taking dares builds hype and tips", () => {
    const r = liveStream(reqs, [{ id: "a", at: 3, accept: true }, { id: "b", at: 6, accept: true }], 20, 2);
    // c expires at 12: 50 - 3 + 8 - 3 + 20 - 6 - 6 - 8
    expect(r).toMatchObject({ taken: 2, declined: 0, missed: 1, tips: 2 + 15, endedEarly: false, lasted: 20 });
    expect(r.hype).toBe(STREAM_START_HYPE - 3 + 8 - 3 + 20 - 6 - 6 - 8);
    expect(r.peak).toBe(72);
    expect(r.newFollowers).toBe(18);
  });

  it("a dare past what she's ready for can't be taken: it counts as a decline", () => {
    const r = liveStream(reqs, [{ id: "c", at: 9, accept: true }], 20, 2);
    expect(r.taken).toBe(0);
    expect(r.declined).toBe(1);
    expect(r.tips).toBe(0);
  });

  it("the chat drifts off when hype runs out", () => {
    const r = liveStream([], [], 80, 3);
    expect(r.endedEarly).toBe(true);
    expect(r.lasted).toBe(50);
    expect(r.newFollowers).toBe(0);
  });
});

describe("trend challenges", () => {
  it("rotate weekly", () => {
    expect([0, 1, 2, 3].map(weeklyTrend)).toEqual(["ale", "bartop", "outfitcheck", "ale"]);
  });

  it("are gated like posts", () => {
    expect(trendAllowed("ale", "sheltered", "shy")).toBe(true);
    expect(trendAllowed("bartop", "curious", "curious")).toBe(false);
    expect(trendAllowed("bartop", "willing", "curious")).toBe(true);
  });

  it("perfect taps take first place and a sponsor's eye", () => {
    const r = trendChallenge("ale", TRENDS.ale.beats);
    expect(r).toMatchObject({ accuracy: 1, placement: 1, sponsorAttention: true });
    expect(r.newFollowers).toBeGreaterThan(0);
  });

  it("sloppy timing and stray taps place lower", () => {
    const off = TRENDS.outfitcheck.beats.map((b) => b + 100);
    const r = trendChallenge("outfitcheck", off);
    expect(r.accuracy).toBeCloseTo(0.67);
    expect(r.placement).toBe(3);
    expect(trendChallenge("outfitcheck", [...off, 50, 4000, 5000, 6000]).placement).toBe("top10");
    expect(trendChallenge("bartop", [])).toMatchObject({ placement: "unplaced", newFollowers: 0, sponsorAttention: false });
  });
});
