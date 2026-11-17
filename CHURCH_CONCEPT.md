# Church of Veyra: Concept Document

> **Rating: Adults only (18+).**
> This is a future content concept for *Last Call at Tarven*. All characters are adults (18+).
> The heroine follows the consent rule in `GAME_PATH.MD` (Consent On / Off), like every other adult beat.
> **Status: concept, not built.** Updated 2026-11-17 to fit the game as it is now (fans, the Lantern, Oden's story, the day in town).

---

## 1. Pitch

A sex-focused church in Tarven whose god, Veyra, exists to relieve human sexual frustration.
Ordinary townspeople who have never done anything like this walk in tight. They leave dressed, talking and acting very slutty.
The deeper someone joins, the more permanent the change: slut outfits, internal toys kept in at all times, and open sexual service to others.

**In one line:** a cult that turns sexually frustrated locals into devoted, always-available sluts in the name of relieving stress.

The townsfolk call its building **the Warm House**.

---

## 2. Core fantasy

- She (and the town) watch normal people get pulled in.
- The church doesn't hide what it is. Its method is talk plus a lot of sex play.
- Higher ranks must stay in revealing "slut" clothing and keep toys inside them (men and women alike).
- The church's stated goal is simple and repeated: *relieve the tightness*.

---

## 3. How it fits Tarven

| What's in the game | How the church uses it |
|---|---|
| **Respect, Lust, Fame** (built) | Being seen at the Warm House raises Lust and Fame and costs Respect, the same way the Lantern does |
| **Her arc: sheltered → curious → willing → known** (`lewd.ts`) | Gates how far she can go inside the church (section 7) |
| **Fans** (STORY.md section 7) | Devotees who become her fans come in with the **Her** and **Girls** tags. Farmers' **Food / Safety** fans cool on her if she's tied to the church |
| **Brother Oden and the chapel** | Oden preaches against it. He wants to keep the chapel open (STORY.md cast), and the Warm House is emptying his pews. **If the chapel is shut (`odenShut`, built in `plot.ts`), Veyra moves into the empty faith**: the church grows twice as fast, and someone paints Veyra's mark on the chapel door |
| **The Lantern** (the brothel path, Stage I built) | Its natural ally and rival. Devotees who reach Priest rank can ask to work the Lantern's rooms. Sabine's Velvet House can fight the church for the same customers. Note: "pleasure house" in GAME_CONCEPT.md 7.7 is now the Lantern |
| **Guests** | Frustrated guests mention the church, arrive straight from it, or try to recruit her. Recruits change how they look between visits (section 6) |
| **Gossip** (built) | The whole town talks about who's started dressing differently, or who was seen leaving the Warm House |

The church can be:
- A **daytime location** she visits in town (see `TOWN_DAY.md`)
- A source of special guests at night
- A full alternative path next to the Lantern, with its own ending

---

## 4. The god

**Veyra, Goddess of Desire and the Warm Body.**

She's the god of sex, lust and the relief of sexual stress.
Everything the church does is framed as serving her, by loosening people who have held their tension too long.

Her place among the other gods (Bram, the Mother of Fields, the Stone-Hearted, the Cold One) is in `GODS_LORE.md`. The rival faith is **the Stone-Hearted**, the god of vows and the Baron's justice, whom Oden preaches. Breaking a vow under his name is said to crack the mountain, so every recruit who leaves a cold marriage for the Warm House is a crack in his chapel.

---

## 5. Church structure (clergy ranks)

An isekai-style ladder. From Priest rank up, the slut-outfit and internal-toy rules are mandatory.

| Rank | Title | Outfit | Toy | Main job |
|---|---|---|---|---|
| 1 | Acolyte | Simple | None | Chores, greeting, learning |
| 2 | Deacon / Deaconess | Revealing | Optional | Assists at sessions |
| 3 | Priest / Priestess | **Slut outfit required** | Kept in during temple hours | Leads ordinary relief sessions |
| 4 | High Priest / High Priestess | Full slut outfit | Always in | Hard cases, training, oversight |
| 5 | Bishop (Warm Mother / Warm Father) | Extreme, ceremonial slut attire | Permanent | Runs a temple |
| 6 | Archbishop / Voice of Veyra | Ceremonial slut garments | Always open | Highest authority |

Men and women follow the same clothing and toy rules from rank 3. The full rank rules are in `GODS_LORE.md`.

**Art this needs:** a church outfit set per rank on both bodies (`wardrobe.ts` / `lingerie.ts` garment layers), and a toy that can be shown or hinted at in cut-ins. Devotees must look like different people, not one body recoloured (the character-variety rule).

---

## 6. Recruitment (turning townspeople slutty)

Most new people have **never experienced** anything like the cult. The church uses a short arc that repeats:

1. **First visit:** talk only. They leave still normal, but curious.
2. **Return visits:** light sex play, and they see the outfits and start wanting them.
3. **Commitment:** a full slut outfit, a toy kept inside, practised slutty speech, and the behaviour starts leaking into daily town life.

Successful recruits stop looking and acting like ordinary frustrated villagers. They become openly slutty, at least while they're connected to the church.

**In the game:** each named townsperson in the arc has a stage (0 to 3). Their look changes with it: same face, shorter hem, more skin, and the church's ribbon. Their table talk and gossip lines change with it too. She can watch it happen night by night, help it along, or warn them off.

The full arc, target types and dialogue are in `CHURCH_RECRUITMENT.md`.

---

## 7. What she can do with it

| Her arc stage | At the Warm House |
|---|---|
| **Sheltered** | She can visit and talk. A priest reads her tightness and gives her a ribbon. She can leave at any time |
| **Curious** | Sessions are offered (stage 2 of the arc, with her as the visitor). With Consent On, every step asks first |
| **Willing** | She can take a rank. Acolyte and Deacon first; Priestess and up need the outfit and toy rules. Ranks give church passives (ideas: tips from devotees, Lust guests calmer, Respect down) |
| **Known** | The church wants her as its public face. She can lead sessions, recruit for it from her own bar, or bring the church into the tavern (below) |

Other hooks:
- Romance or recurring scenes with priests and high priests who are always in their outfit and toy.
- Story events: a guest tries to pull her in, Oden asks her to stand against the church, or the Baron wants to use it or shut it down.
- **The long path: the tavern tied to the church.** Night services in the taproom, devotee staff, and the lantern lit in Veyra's colour. It's a sister path to the Lantern, and it can merge with it.

---

## 8. Tone and boundaries

- Earthy, direct and sexual. The church isn't subtle.
- **The heroine:** the consent rule in `GAME_PATH.MD` applies. With Consent On, every step asks first, she can always leave, and being too drunk blocks every yes. Consent Off follows that file's Consent Off rules.
- **Townspeople:** every recruit chooses each stage. Anyone at stage 1 or 2 can walk away, and some do. Devotees who have taken the higher ranks live by the church's rules (outfits, toys, availability).
- Never while someone is passed out. Never anyone under 18, and never anything childlike.

---

## 9. Related files

| File | Contents |
|---|---|
| `WORLD.md` | The setting: medieval with modern things (devotees post photos on the town feed) |
| `CHURCH_RECRUITMENT.md` | The 3-stage recruitment arc and dialogue for townspeople |
| `TOWN_DAY.md` | Daytime outside: where the Warm House sits in the town and what she does there |
| `STORY.md` | The cast (Oden), fans, the Lantern arc |
| `GAME_PATH.MD` | The consent rule |
| `GODS_LORE.md` | The pantheon (Veyra, Bram, the Mother, the Stone-Hearted, the Cold One) and the full rank rules |

---

*Concept document for future Church of Veyra content. Adjust scope, explicitness or integration as the game develops.*
