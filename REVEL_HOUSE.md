# The Revel House: Tarven's end-game orgy path (plan)

**Status:** the rules and the mechanics are **built, art to come** (18 Nov 2026): `revel.ts`, wired into `tavern.ts` (`revelHall` from the house plans for 200 gold in the late game, `revelSettings`, `revelTonight`, `holdRevel` as the tavern shuts, saved as `TavernSave.revel`), the Revel passives in `passives.ts` (Open Hall, Room for Everyone, The Whole Pass) and the records (`revelNights`, `revelPartnersMost`, `mixedNights`), with a placeholder Settings › Revel nights menu. Her scene uses the After Hours game: with Consent on she's asked at bedtime (the offer is hers to take or not, and no defeat is counted); with Consent off it follows the Consent-off rules. Not built yet: the hall, background group poses, female partners at her slots in the taproom scene, revel guests walking in during service (the night is played out in the log at closing), the Queen of the Revel title, Revel fans as a separate tag, and the Baron's cut.

This is a late-game way to run the tavern. On chosen nights it's the pass's notorious **revel house**, where guests come for the orgy, not the stew. It's a third path alongside the Lantern (brothel) and the church, and it can mix with either. Every character is an adult (18+), and the consent rule applies to everyone in the room (below).

## When it opens

- **Late game: the Copper Bell beaten** (Jory, STORY.md 2.24, bosses unlock features). Her lewdness or corruption is high (Known stage), the table scene (`taproom.ts`) has happened several times (for example 10 table scenes, or 30 partners in all), and the tavern has the room for it (a House Plans build: **the Revel Hall**, made from the taproom with cushions and the big table).
- **A story moment:** the room asks for it, the Lantern's girls suggest it, or the church wants a feast night for Veyra.

## A revel night

She chooses it in House Plans by day, the same way as the Lantern's lit or dark switch:

| Setting | Choices | What it does |
|---|---|---|
| **Who's invited** | **Mostly men** (the gangbang night) / **Mixed** (men and women, the orgy night) / **Women only** | Changes who walks in: the guest mix, and which scenes happen. Mixed nights bring in female guests who join the men, each other, and her |
| **Her part** | Hosting (she runs the room) / Joining in / The centrepiece (it's about her) | How much of the night is her own scenes, against the room's |
| **The door** | Open / By invitation (regulars and fans only) / Paying (a fee at the door) | Gold, heat, and how wild it gets |
| **Staff** (STAFF.md) | Whoever chooses to join; each one decides | Famous staff draw their own crowd |

**On the night:**
- The guests pair off and group up across the room on their own, as a background scene. Couples and groups form and finish, and the room's heat rises.
- She moves through the room as on a normal night, but the "orders" are invitations: join a group, start one, watch, or keep the drinks flowing.
- **Her scenes** use what's built: the table scene's crowd and queue (`taproom.ts`, six on her at once and the rest waiting their turn), the After Hours game (`duel.ts`), and the brawl scenes' poses (`brawlscenes.ts`). A mixed night adds women as partners at her slots.
- **The centrepiece:** the night's big scene with her and as many as her records say, using the defeat crowd rule (`defeat.ts` `crowdFactor`), but chosen, not lost.

**At dawn:**
- Gold from the door and the drinks; fame up a lot; respect down; heat up (unless the Baron has his cut).
- Fans tagged **Revel**, and gossip all over the pass.
- Records and passives: revel nights, most partners in one night, mixed nights. Titles such as "Queen of the Revel".

## Consent (the same rule as everywhere)

- **Coming through the door is the yes:** a revel night is announced, and every guest who walks in has come for it. So the room doesn't stop to ask each one; groups just form. Anyone can still stop or walk out, and a no ends it for them. Staff and girls choose whether to work the night.
- **The heroine:** with Consent on, she's asked at every step, and Stop always works. With Consent off, it follows the Consent-off rules in GAME_PATH.MD.
- Never anyone passed out or roaring drunk. Never anyone under 18, and never anything childlike.

## How it ties in

- **The Lantern:** a revel night can be lit too. The girls take bookings upstairs while the hall runs downstairs. The Velvet House sees it as war.
- **The church:** a "Feast of Veyra" is a revel night the church blesses. Devotees come, chapel standing drops, and the church grows.
- **Staff** (STAFF.md): each staff member's own story can turn on it, with someone who loves it and someone who quits over it.
- **Endings:** a fourth ending, the Revel House, where the tavern is famous across every kingdom for it. Her epilogue still comes from her lewdness and corruption (PASSIVES_DESIGN.md §8).

## Code plan (when it's time)

1. **`revel.ts` (pure rules):** `RevelSettings` (who, her part, the door), plus `revelGuests(settings)` for the guest mix, `revelNight(...)` for the background groups and the room's heat, and `revelDawn(...)` for the night's results.
2. **`tavern.ts`:** a `houseMode` "revel" beside "brothel", set by day. Guest arrival reads `revelGuests`.
3. **`taproom.ts`:** let women join the queue and the slots on a mixed night. The table scene's crowd is men only today.
4. **Background groups:** the room's couples and groups shown as poses around the hall. These need the art.
5. **Art (later, POSES_TODO.md):** the Revel Hall set (cushions, drapes, the big table), background group poses (two, three and four people, male and female), female partner poses at her slots, and revel outfits.
6. **Lines:** from Grok in the house voice, as for the brawl scenes: openings, the room, her lines by stage, and dawn.
7. **Tests:** `tests/revel.test.ts`.
