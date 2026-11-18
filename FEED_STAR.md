# Feed Star: her side job on the town feed

> **Rating: Adults only (18+).** All characters are adults. The heroine follows the consent rule in `GAME_PATH.MD`.
> **Status: rules and placeholder menus built, art to come (2026-11-18, the user's idea).** Rules: `src/game/feedstar.ts` (`tests/feedstar.test.ts`). Wired into `tavern.ts` (`feedPost`, `feedDms`/`feedReply`, `feedGoLive`/`feedStreamAnswer`, `feedTrendDance`, sponsors, `feedDayPassed`) and saved (`TavernSave.feed`, records `feed*`), tested in `tests/feedwiring.test.ts`. Played from **Settings › Feed** for now; no art yet (section 8).

## 1. The idea

Tarven has phones and a town feed (`WORLD.md`): everyone's posts, photos and rumours in one place, all through the Baron's relay stone, where Pell reads every word. Her tavern already has a page on it, and by day she can post a flyer there (`TOWN_DAY.md` §3, built in `errands.ts`).

**Feed Star** grows that into a side job. She posts from the tavern: a new stew, a perfect pour, an outfit for tonight, and later bolder shots. Posts bring **likes** and **followers**; followers bring guests, fame and **sponsors**. Bold posts grow her fame fast but cost her **Respect**, and every post carries risks: a **stalker**, a post going **viral**, **the Baron's men** reading it, and **gossip**.

Underneath it all is her **Watched** awakening: the slow discovery that she likes being looked at.

## 2. Posts

| Post | Tier | Opens at (arc / Watched) | Fame | Respect |
|---|---|---|---|---|
| Tonight's stew | 0 plain | always | 0 | 0 |
| A perfect pour | 0 plain | always | 0 | 0 |
| Outfit check | 1 flirty | Curious / any | +1 | 0 |
| Leaning over the bar | 2 bold | Willing / Curious | +2 | −1 |
| After hours, in lace | 2 bold | Willing / Curious | +2 | −1 |
| Nothing on but the apron | 3 bare | Known / Craving | +3 | −3 |

- **The gate** (`postAllowed`): a tier needs her arc (`lewd.ts`) at least that far, and her Watched stage at most one step behind it.
- **Likes** (`scorePost`): a base from the town browsing, plus her followers × 0.12, more the bolder the post, × the photo's quality (0.5 to 1.5) × a swing of ±20%. One new follower per 6 likes.
- **Viral**: 2% + 4% per tier + up to 6% for a great photo, never past 30%. A viral post gets 5× the likes and +3 fame, and a viral bold post costs double the respect.
- **Followers over time** (`followerDay`): +2% on a day she posts; one quiet day is free, then 3% a day drift away, but the loyal 10 always stay.

## 3. Sponsors

| Sponsor | Who | Offers at | Pays for | Gold a post (good photo) | Wants a week |
|---|---|---|---|---|---|
| **Copperkeg Ale** | Brunhild Copperkeg, the dwarf brewer friend (`staff.ts`) | 50 followers, any stage | pours, bar leans | 5 (8) | 2 |
| **Thornwick Dresses** | Edda Thornwick, the seamstress friend (`staff.ts`) | 120 followers, Curious | outfits, lace | 9 (14) | 2 |
| **The Warm House** | the Church of Veyra (`CHURCH_CONCEPT.md`) | 400 followers, Craving | lace, bare | 15 (23) | 1 |

A week short of their posts is a warning; a second is a **broken deal**: Respect −1, 5% of her followers, and −15 loyalty with Brunhild or Edda if they're on her staff. A broken sponsor never offers again. A "good photo" is quality 0.7 or more.

## 4. Risks

- **Stalker** (`stalkerChance`): 0.5% + 3% per tier + 1% per 100 followers, never past 30%. A stalker turns up at the end of the bar (a guest event, to be written; the doorman and Rhea are the answers).
- **The Baron's men** read the relay: 5% / 10% / 25% / 45% by tier (+20% if viral). When they do, heat +0 / 1 / 1 / 2 (+1 for a viral bold post). Pell keeps the pictures: leverage later (`WORLD.md`, Photos).
- **Gossip**: a viral post always, a bold one often (10% / 30% / 60%). It shows up at the Bakehouse long table and in `gossip.ts`.
- **Going viral** is a risk as much as a prize: more likes, more fame, and everyone sees it, including the keep.

## 5. The Watched awakening (Exhibition)

Four stages that follow her arc (`lewd.ts`): she's never further along here than her arc (Shy ↔ Sheltered, Curious ↔ Curious, Craving ↔ Willing, Known ↔ Known). Each stage is a passive in the Exhibition group (`PASSIVES_DESIGN.md`); the stage passive replaces the one before.

| Stage | Passive | Needs | What it does |
|---|---|---|---|
| **Shy** | Camera-Shy | her first post | Bold posts cost willpower: 2 a tier |
| **Curious** | Little Thrill | 25 followers, 200 likes | The likes thrill her: Body desire +6 when a post beats what she expected; 1 willpower a tier |
| **Craving** | Refresh, Refresh | 150 followers, 2000 likes, 5 bold posts | No willpower cost. Checks her phone mid-shift (25% a shift: a slower serve). A viral post: +15 desire. A day with no post: the night starts 10 desire up, restless |
| **Known** | Everyone's Watching | 600 followers, 10000 likes, 12 bold posts, 1 viral | An audience raises her pleasure (+15%); her Exhibition passives give 25% more |
| extra | Went Viral | 3 viral posts | a viral post's thrill +5 |
| extra | Crystal Darling | 5 live streams seen through | +5% pleasure with an audience |

The effects are data (`WatchedEffects`: `boldWillpower`, `likeThrill`, `phoneCheck`, `viralThrill`, `quietRestless`, `audiencePleasure`, `exhibitionBoost`) for the night to read.

## 6. The four minigames

**(a) Photo shoot** (`photoShoot`). She picks an **outfit** (apron, dress, lace, nothing), a **prop** (stew, tankard, candle, mirror) and an **angle** (front, over the shoulder, from above, from low), then **taps** when the light and her pose line up. Quality = half the tap (within 60 ms perfect, 150 good, 300 blurry), a quarter the prop that suits the post, a quarter a flattering angle. The shot is as bold as the post, or as its outfit plus a daring angle if that's bolder (an apron shot from above is still just a stew shot); use that tier for the post's risks.

**(b) Comments & DMs** (`replyDM`). Messages from fans, flirts, creeps, gift-givers and would-be sponsors; she answers **charm**, **tease**, **ignore** or **block**. Charm builds loyal followers; teasing builds hype for the next post. Teasing a creep feeds him (stalker risk up); blocking him lowers it. A gift pays (double if she teases, and the giver expects a picture). Answering a sponsor's message gets an offer.

**(c) Live stream on a scrying crystal** (`liveStream`). A hype meter starts at 50 and drains 1 a second. Chat requests come in with a timer; she answers before they expire. She **chooses** every dare: taking one raises hype (+8, +6 a tier) and earns its tip × (1 + tier); declining costs 3 hype, a missed request 6. A dare bolder than she's ready for can't be taken (it counts as a decline). If hype hits 0 the chat drifts off and the stream ends with no new followers; see it through and she gains one follower per 4 peak hype.

**(d) Trend challenges** (`trendChallenge`, `weeklyTrend`). A town trend each week, in turn: **#AleChallenge** (tier 0), **#BarTopDance** (tier 2, Willing), **#OutfitCheck** (tier 1). A rhythm game: tap on the beats (50 ms 3 points, 120 ms 2, 200 ms 1; a stray tap −1). Accuracy places her 1st (90%), 2nd (75%), 3rd (60%) or top ten (40%): 60 / 35 / 20 / 8 new followers, and a top-three spot catches a sponsor's eye.

## 7. Consent

She chooses every post, every reply and every dare; nothing is ever posted for her. A dare she won't do is declined at a small cost in hype and never more; a dare above what her arc and Watched stage allow isn't on offer. Everyone on the feed and in the chat is an adult (18+). The consent rule in `GAME_PATH.MD` holds everywhere this job reaches (a stalker who turns up at the bar is a guest like any other, under the same touch rules).

## 8. To do

**Art and UI**
- [ ] A **phone screen** (the journal's phone skin, `WORLD.md`): the feed, her page, likes counter, DMs, a camera view.
- [ ] **Photo poses** for the shoot: one per post kind (over the stew, the pour, a mirror pose, leaning on the bar, lace by candle, the apron), and the four angles as camera placements.
- [ ] A **scrying crystal** prop and a stream overlay (chat bubbles with timers, the hype meter).
- [ ] The trend rhythm-game screen (beats, hit markers) and three trend dances.
- [ ] Passive icons for the six Watched passives (`passiveicons.ts`).

**Wiring**
- [x] A Feed Star post (Settings › Feed: the shoot as choices and a timing button, then `scorePost`). It shares the day's one feed post with the plain one in `errands.ts`, which still works from the market. To do: open it from the market square too, and spend the day's hours.
- [x] Followers into fans and guests tonight; sponsors' gold; heat, respect and fame into her stats; a weekly sponsor check (warned, then broken, with Brunhild's or Edda's loyalty).
- [x] `WatchedEffects` partly into the night: `checksPhone` as the shift opens (guests wait 5% less), `quietRestless` at the day's start, `likeThrill` / `viralThrill` as Body desire, `boldWillpower` spent. Still to do: `audiencePleasure` in taproom scenes, `exhibitionBoost` on the Exhibition passives.
- [ ] The stalker as a guest event (now a log line and the `stalkers` record); gossip lines into `gossip.ts`; Pell's pictures as later leverage.
- [x] Records and save fields (`TavernSave.feed`; records `feedPosts`, `feedLikes`, `feedFollowersMost`, `feedBold`, `feedVirals`, `feedStreams`, `feedStage`, `stalkers`). The six Watched passives are in `PASSIVES` (Exhibition group, `passives.ts`): earned from those records, each adding a little to her posts' likes; the stage's own numbers follow her current stage live.
- [ ] Zane, the goblin who lives on the feed (`WORLD.md`): his reposts as a viral boost.
