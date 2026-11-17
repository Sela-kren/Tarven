# Karryn's Prison and Tarven compared: what's next

**Update, 18 Nov 2026:**
- **Now built:** enemy prefixes (§1), foes coming more than once (§3), difficulty (§7), and her own moves (§2: Flaunt, Open Pleasure, Give Up, and Take the lead).
- **Kept for later:** start choices (§6).
- **Now built as rules, with the art still to come** (listed in POSES_TODO.md):
  - defeat scenes (§4): 6, with how many men by her records
  - trinkets (§5): 12, worn in Settings
  - toys (§8): 3, with Pull them out
  - Deny Ejaculation
  - dancing on the bar and renting rooms (§9)
  - riot nights
  - her hair growing
  - 10 new passives
- **Still open:** the glory hole and gym side jobs, which need the yard and the garrison built first.

The KP numbers in this file were checked against the game's own files (v1.2.7.2, `www/js/plugins`, `www/data`), and the Tarven ones against `src/game` on 18 Nov 2026. It lists what Tarven already matches, what's still missing, and a suggested order for the rest.

## Already matching KP

- **Desire:** six meters, plus the ceiling (60 → 75 → 100)
- **In a fight:** pleasure, being horny, being wet, her willpower skills, energy and fatigue, stances, coming mid-fight
- **Sex in a fight:** 26 scenes (KP has 18, plus 8 of Tarven's own), with joining, moving a scene on to a bolder one, the kick counter and the first-time rule
- **Several foes in one fight,** each with their own mind, and a battle log where they talk
- **Bar work** (KP's waitress job) and the table scene
- **The night invasion**
- **Cut-ins**
- **Clothes being torn off** in a fight
- **The cum record** (`cum.ts`)
- **Regulars** (KP's wanted enemies)
- **Passives, titles, tavern rules** (KP's edicts) and debuffs, all working the same way, though fewer of each (see the table below)
- **Her lines,** which change with her stage and her experience
- **The Consent switch,** where Off plays like KP

## Gaps, most worthwhile first

### 1. Enemy prefixes (KP: about 24) — Tarven has none
KP puts a word in front of an enemy's name, and the word changes how he plays:
- **Stronger or weaker:** Elite, Big, Strong, Weak, Agile, Slow, Enduring, Dexterous, Inept
- **His mood or desires:** Horny, Angry, Drunk, Hungry, Starving, Sensitive, Maso, Sado
- **His habits:** Talk (a talker), Sight (a starer), Virgin
- **Special:** Metal (runs away after a few turns)
- **Good or Bad** (better or worse loot)

In Tarven, guests have rolled stats but no names that show it.
- **For Tarven:** about 12 prefixes on guests. For example, "a **big** bandit" (more stamina, larger body), "a **virgin** farmer" (comes fast, eager), "a **talker** smuggler" (more lewd talk), or "a **sensitive** noble" (his pleasure rises faster). They'd show in the guest's name and in the fight panel.
- **Size of job:** small to medium, with no new art (except "big" scaling the body).

### 2. Her own sex moves in a fight (KP: about 12) — Tarven has 3
KP's Karryn can start the following herself, each once she has the passive that unlocks it:
- kiss, cock stare, handjob, blowjob, titjob, footjob, rimjob, vaginal, anal
- **Flaunt** (shows off to draw them in)
- **Open Pleasure** (a stance where she gives in)
- **Give Up** (lose all her stamina on purpose)

Tarven has hands, mouth and ride.
- **For Tarven:** let her start most of the 26 scenes herself, unlocked by passives. Add *Flaunt*, *Open Pleasure* and *Give Up* too.
- **Size of job:** medium. The scenes and poses already exist.

### 3. Foes coming more than once (KP: ejaculation stock) — Tarven foes come once and leave
In KP, each enemy has a set number of times he can come, and his arousal point rises after each one. Elite and Big enemies have more.
- **For Tarven:** a stock of 1 to 3 by type and prefix, so a foe who comes stays in the fight, slower to get going again.
- **Size of job:** small.

### 4. Defeat scenes (KP: 6) — Tarven has 1
Planned in **DEFEAT_SCENES.md**.

### 5. Accessories that change her (KP: 46) — Tarven's jewellery is looks only
KP's rings and other accessories change her numbers. For example, lip gloss makes kisses need 20 less desire, nail polish does the same for handjobs, and the fingerclaw ring makes kisses need 35 more. Some rings make her stronger but needier. They're unlocked by Charm.
- **For Tarven:** about 15 trinkets, bought at market or given by regulars, that change the numbers on scenes, touches or fights. They'd be worn through the wardrobe.
- **Size of job:** medium. The equip slots exist in `wardrobe.ts` and `appearance.ts`.

### 6. Choices at the start (KP character creation) — Tarven picks a sibling and a body
KP asks three things at the start: her past title (a small bonus), an extra-sensitive body part, and a dormant desire (one desire starts higher).
- **For Tarven:** 3 choices after the customiser:
  - **Her past:** a lady's maid, a farm girl, or a soldier's daughter, each with a stat bonus.
  - **A sensitive spot:** that desire fills 20% faster.
  - **A secret want:** that desire starts each night at +10.
- **Size of job:** small.

### 7. Difficulty (KP: Easy, Normal, Hard) — Tarven has none
KP's difficulty changes how fast her stats grow and how strong enemies are.
- **For Tarven:** Easy, Normal and Hard. They'd change how fast she earns XP, how strong foes are, and how big the debt is.
- **Size of job:** small.

### 8. Toys (KP: rotor, dildo, anal beads) — Tarven has none
In KP, enemies can put toys in her mid-fight. Each one stays in and keeps working, and has its own cut-in.
- **For Tarven:** wooden or glass toys that fit the setting, sold by a smuggler or traded by guests. They'd need a cut-in each, and new art.
- **Size of job:** medium to large (art).

### 9. Side jobs (KP: waitress, receptionist, glory hole, stripper, gym) — Tarven has bar work
- **Stripper → a stage show:** dancing on the bar for coin. It builds on `show.ts`, which already handles guests paying for a look.
- **Receptionist → renting rooms:** guests book rooms at the front desk, and some ask for more.
- **Glory hole → the privy out back:** needs the yard.
- **Gym → training at the garrison:** where she's in charge. Needs the town.
- **Size of job:** large. Each one is a small game of its own, with poses.

### 10. How much content there is

| | KP | Tarven |
|---|---|---|
| Passives | 480 | about 160 |
| Titles | 159 | 15 |
| Edicts / tavern rules | well over 100 | 6 |
| Endings | several | 1 (plus 4 epilogues planned in PASSIVES_DESIGN §8) |
| New Game+ | yes | planned |

**For Tarven:** grow these over time, for example passives and titles for each new scene, a tavern rule for each kind of guest, and the epilogues and New Game+ once the 15-night run is in.

## Smaller things to look at

- **Pubic hair that grows** day by day, and can be trimmed (KP `RemtairyHair.js`). Tarven has `pubes.ts` styles, but no growth.
- **"Deny ejaculation" willpower skills** (stop them finishing on her, or in her). KP unlocks these through the sadism side.
- **Her reaction score** (KP `RemtairyReactionScore.js`): how she reacts goes by how often each thing has happened to her. Tarven does part of this by her stage and her experience.
- **Riots and order** (KP's prison management): Tarven's version is heat, trust and the debt. Bar brawls could pile up into a "riot night".

## Suggested order

1. Enemy prefixes
2. Foes coming more than once
3. Choices at the start
4. Difficulty

These four are small and use no new art.

5. Her own sex moves
6. Accessories

These two are medium and use the art that already exists.

7. Defeat scenes (DEFEAT_SCENES.md)
8. Toys
9. Side jobs

These three are large and need new poses (POSES_TODO.md).
