/** The settings, save and load menus, and the yes/no question they ask before overwriting or losing progress. */
import { devResumeOn, setDevResume } from "./devresume";
import type { Button, Game } from "./game";
import { CUT_INS, type CutKind } from "./cutin";
import { SCENE_POSE_LIST } from "./sexpose";
import type { GuestKind } from "./tavern";
import { pixelSvg } from "./icons";
import { MANUAL_SLOTS, readSave, readThumb, slotName, SLOTS } from "./save";
import { desirePenalties, horny, WET_PLEASURE, type DesirePenalties } from "./desire";
import { KINK_NAMES } from "./kinktalk";
import { METER_NAMES, METERS, PASSIVE_BY_ID, PASSIVE_GROUPS } from "./passives";
import { DIFFICULTIES, HOLD_BASE, PREFER_PUSH, writeTouchSettings, type Difficulty } from "./touchsettings";
import { FRIEND_AT, FRIEND_PERK, FRIEND_RARITY, POSTING_FEE, RARITY_NAME, STAFF_BY_ID, STAFF_PERK_BY_ID, staffStage, staffStageLine, staffTier, type StaffMember } from "./staff";
import { GUILD_COUNTER_COST, REVEL_HALL_COST } from "./tavern";
import * as Feed from "./feedstar";
import * as Knight from "./knight";
import * as Guild from "./guild";

/** The gear that marks a settings board, in the same pixel art as the HUD's icons. */
const GEAR = pixelSvg(
  [
    "......KKKK......",
    "...KK.KGGK.KK...",
    "..KGGKKGGKKGGK..",
    "..KGGGGGGGGGGK..",
    "...KGGGDDGGGK...",
    ".KKKGGDKKDGGKKK.",
    "KGGGGDK..KDGGGGK",
    "KGGGGDK..KDGGGGK",
    "KDDDGDK..KDGDDDK",
    "KDDDDDK..KDDDDDK",
    ".KKKDDDKKDDDKKK.",
    "...KDDDDDDDDK...",
    "..KDDDDDDDDDDK..",
    "..KDDKKDDKKDDK..",
    "...KK.KDDK.KK...",
    "......KKKK......",
  ],
  { K: "#1c140e", G: "#ffe27a", D: "#b8922c" },
);

/**
 * The settings: music and effects levels, each on a slider (M still mutes everything at any time), and whether
 * eager guests may touch her without asking: on or off, up to how bold, and how often.
 */
export function showSettingsMenu(game: Game, back: () => void): void {
  game.openMenu("Settings", [], [], back);
  const box = game.panelEl.querySelector(".box");
  const menu = box?.querySelector(".menu");
  if (!box || !menu) return;
  // Settings wear a gear in the corner.
  const gear = document.createElement("div");
  gear.className = "corner-icon";
  gear.setAttribute("aria-hidden", "true");
  gear.innerHTML = GEAR;
  box.append(gear);
  const { settings } = game.audio;
  /** A row with a slider, from `min` to `max`, showing its value the way `format` writes it. */
  const ranged = (
    name: string,
    value: number,
    { min, max, step, format }: { min: number; max: number; step: number; format: (value: number) => string },
    set: (value: number) => void,
    onLetGo?: () => void,
  ) => {
    const row = document.createElement("label");
    row.className = "slider";
    const label = document.createElement("span");
    label.className = "name";
    label.textContent = name;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    const shown = document.createElement("span");
    shown.className = "value";
    const show = () => {
      const at = Number(input.value);
      shown.textContent = format(at);
      // The track fills up to the thumb.
      input.style.setProperty("--fill", `${((at - min) / (max - min)) * 100}%`);
    };
    show();
    input.addEventListener("input", () => {
      show();
      set(Number(input.value));
    });
    if (onLetGo) input.addEventListener("change", onLetGo);
    row.append(label, input, shown);
    return row;
  };
  const percent = { min: 0, max: 100, step: 5, format: (value: number) => (value === 0 ? "Off" : `${value}%`) };
  const slider = (name: string, level: number, set: (level: number) => void, onLetGo?: () => void) =>
    ranged(name, Math.round(level * 100), percent, (value) => set(value / 100), onLetGo);
  box.insertBefore(
    slider("Music", settings.music, (music) => game.audio.change({ music, muted: false })),
    menu,
  );
  box.insertBefore(
    // Letting go plays a sound at the new level, so you hear what you've picked.
    slider("Effects", settings.effects, (effects) => game.audio.change({ effects, muted: false }), () => game.audio.play("click")),
    menu,
  );

  // Eager guests: switching it on here is the player saying yes to it, so it takes effect at once.
  const touch = game.tavern.touchSettings;
  const save = () => writeTouchSettings(touch);
  const heading = document.createElement("div");
  heading.className = "settings-heading";
  heading.textContent = "Consent";
  const note = document.createElement("p");
  note.className = "settings-note";
  note.textContent =
    "On: every touch stops and asks you, at the bar and in a brawl; Pull away always works; nothing happens when you're too drunk; after a lost brawl you're asked, and can always stop. Off is Karryn's Prison: at the bar, a lustful, bold guest's push is checked against your hold, and if they push past it the touch plays out on its own. In a brawl their hands just land, and they tear your clothes off. Dead drunk, a guest can have you on a table whether you're ready or not. Lose a brawl, and the one who won and their friends take you where you fell, with no Stop. Passed out, nothing happens to you either way.";
  const toggle = document.createElement("button");
  toggle.className = "settings-toggle";
  // Consent off is the player saying yes in advance: eager guests' touches play out on their own.
  const auto = () => touch.autoTouch && touch.agreed;
  const showToggle = () => {
    toggle.textContent = auto() ? "Consent: Off (Karryn's Prison: nobody asks)" : "Consent: On (always ask me)";
    toggle.classList.toggle("on", !auto());
  };
  showToggle();
  toggle.addEventListener("click", () => {
    if (auto()) touch.autoTouch = false;
    else {
      touch.autoTouch = true;
      touch.agreed = true;
    }
    save();
    showToggle();
    game.audio.play("click");
  });
  // Karryn's Prison's switches for two of the brawl scenes (brawlscenes.ts).
  const sceneToggle = (which: "rimjob" | "footjob", name: string) => {
    const button = document.createElement("button");
    button.className = "settings-toggle";
    const show = () => {
      button.textContent = `${name} scenes: ${touch[which] ? "On" : "Off"}`;
      button.classList.toggle("on", touch[which]);
    };
    show();
    button.addEventListener("click", () => {
      touch[which] = !touch[which];
      save();
      show();
      game.audio.play("click");
    });
    return button;
  };
  // Karryn's Prison's difficulty: how tough they are in a brawl, and how fast she grows.
  const difficulty = document.createElement("button");
  difficulty.className = "settings-toggle";
  const order: Difficulty[] = ["easy", "normal", "hard"];
  const showDifficulty = () => {
    const d = DIFFICULTIES[touch.difficulty];
    difficulty.textContent = `Difficulty: ${d.name} (foes ×${d.foes}, growth ×${d.growth})`;
  };
  showDifficulty();
  difficulty.addEventListener("click", () => {
    touch.difficulty = order[(order.indexOf(touch.difficulty) + 1) % order.length];
    save();
    showDifficulty();
    game.audio.play("click");
  });
  const rimjob = sceneToggle("rimjob", "Rimjob");
  const footjob = sceneToggle("footjob", "Footjob");
  // KP's accessories: her trinkets, to put on and take off (trinkets.ts).
  const trinkets = document.createElement("button");
  trinkets.className = "settings-toggle";
  trinkets.textContent = "Trinkets (wear up to 2)";
  trinkets.addEventListener("click", () => showTrinkets(game, () => showSettingsMenu(game, back)));
  // KP's side jobs, from a menu until their art is made (sidejobs.ts).
  const work = document.createElement("button");
  work.className = "settings-toggle";
  work.textContent = "Side work (dance, rooms, bathhouse)";
  work.addEventListener("click", () => showSideWork(game, () => showSettingsMenu(game, back)));
  // Staff (staff.ts) and the Revel House (revel.ts), from menus until their art is made.
  const staff = document.createElement("button");
  staff.className = "settings-toggle";
  staff.textContent = "Staff (hire, wages, stories)";
  staff.addEventListener("click", () => showStaff(game, () => showSettingsMenu(game, back)));
  const revel = document.createElement("button");
  revel.className = "settings-toggle";
  revel.textContent = "Revel nights (18+)";
  revel.addEventListener("click", () => showRevel(game, () => showSettingsMenu(game, back)));
  // Feed Star (feedstar.ts), the Knight path (knight.ts) and the Guild (guild.ts), from menus until their art is made.
  const sideMenu = (text: string, open: (game: Game, back: () => void) => void) => {
    const button = document.createElement("button");
    button.className = "settings-toggle";
    button.textContent = text;
    button.addEventListener("click", () => open(game, () => showSettingsMenu(game, back)));
    return button;
  };
  const feed = sideMenu("Feed (posts, DMs, streams, sponsors)", (g, b) => showFeed(g, b));
  const knight = sideMenu("Knight (the garrison)", showKnight);
  const guild = sideMenu("Guild (quests and party)", (g, b) => showGuild(g, b));
  const debt = sideMenu(game.tavern.owed > 0 ? `The Baron's debt (pay Pell: ${game.tavern.owed} owed)` : "The Baron's debt (paid)", (g, b) => showDebt(g, b));
  // Revel nights only once the Revel Hall's built and she's ready for it (revelOpen); till then it's hidden.
  const rows = [heading, note, toggle, rimjob, footjob, difficulty, trinkets, work, staff, ...(game.tavern.revelOpen ? [revel] : []), feed, knight, guild, debt];
  for (const row of rows) box.insertBefore(row, menu);
}

/**
 * The Baron's debt (STORY.md section 7): she can pay Pell whenever she has the gold, a little or all of it, instead
 * of waiting for him to come and collect. Pell still comes at his beats, for whatever's left.
 */
export function showDebt(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const again = () => showDebt(game, back);
  const pay = (amount: number) => () => {
    if (tavern.payDebt(amount) > 0) game.audio.play("click");
    again();
  };
  const lines =
    tavern.owed === 0
      ? ["The debt is paid. Grandma's tavern is yours, free and clear."]
      : [
          `You owe the Baron ${tavern.owed} gold${tavern.arrears > 0 ? `, and you're ${tavern.arrears} behind on Pell's last collection` : ""}. You have ${tavern.gold}.`,
          "Pay whenever you like. Pell still comes to collect at his beats, but only for what's left.",
          ...(tavern.bookPromised ? ["Paying the gold won't stop him asking about the book you promised."] : []),
          ...(tavern.fight || tavern.duel ? ["Not in the middle of a fight."] : []),
        ];
  const all = Math.min(tavern.owed, tavern.gold);
  game.openMenu(
    "The Baron's debt",
    lines,
    tavern.owed === 0
      ? []
      : [
          { label: "Pay 50 gold", disabled: !tavern.canPayDebt || tavern.gold < 50 || tavern.owed < 50, onPick: pay(50) },
          { label: "Pay 100 gold", disabled: !tavern.canPayDebt || tavern.gold < 100 || tavern.owed < 100, onPick: pay(100) },
          { label: `Pay all you can (${all} gold)`, disabled: !tavern.canPayDebt, onPick: pay(all) },
        ],
    back,
  );
}

/** One number for the dev panel: whole numbers plain, the rest to one place. */
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * The ] key, in development: the Consent check laid bare. Her side (desires, exposure, passives, practice) as she
 * stands now, and the last guest who reached: their side, both totals, and what came of it.
 */
export function showDevPanel(game: Game, back: () => void): void {
  const { tavern } = game;
  const s = tavern.touchSettings;
  const consentOff = s.autoTouch && s.agreed;
  const her: string[] = [
    `Consent: ${consentOff ? "Off: Karryn's Prison, her desire decides every touch" : "On: every touch asks"}`,
    `Desires: ${METERS.map((m) => `${METER_NAMES[m]} ${Math.floor(tavern.meters[m])}`).join(" · ")}`,
    `Clothing: ${tavern.strippedPieces.length === 0 ? "dressed" : `${tavern.strippedPieces.length} off (${tavern.strippedPieces.join(", ")})`}`,
    `Passives: ${passiveCounts(tavern.passives)}`,
    `Kink (how she talks after the check): ${KINK_NAMES[tavern.kink]}`,
    `Experience (times let): ${experience(tavern.touchMemory.lets)}`,
    `Lewdness ${tavern.lewdness} · Corruption ${num(tavern.corruption)} · Drunk ${num(tavern.drunk)} · Willpower ${tavern.willpower}`,
    `Horny: ${horny(tavern.meters) ? "yes" : "no"} · Wet: ${tavern.wet ? "yes" : "no"} (pleasure ${Math.floor(tavern.pleasure)}, needs ${num(WET_PLEASURE - tavern.meters.pussy / 4)})`,
    `In a brawl: ${brawlPenalties(desirePenalties(tavern.meters))}`,
  ];
  const last = tavern.lastImpulse;
  const them: string[] = last
    ? [
        `Last reach: ${last.guest} (${last.kind}, likes ${last.prefers})${last.brawl ? " in a brawl" : ""} · ${last.touch} on the ${last.region}, boldness ${last.facts.level}`,
        `Their push ${num(last.check.push)} = nerve ${last.facts.nerve} + taste ${last.facts.prefers ? PREFER_PUSH : 0} + exposure ${last.facts.exposed}`,
        `Her hold ${num(last.check.hold)} = ${HOLD_BASE} + boldness ${last.facts.level}${last.check.clothing ? ` + clothing ${last.check.clothing}` : ""}${last.check.passives ? ` ${last.check.passives > 0 ? "+" : "−"} passives ${num(Math.abs(last.check.passives))}` : ""} − desire ${num(last.check.want.desire)} − passives ${num(last.check.want.passives)} − experience ${num(last.check.want.experience)} − skill ${num(last.check.want.skill)} − exhibition ${num(last.check.want.exhibition)}`,
        `Check: ${last.check.lands ? "push wins" : "hold stands"} · ${
          last.landed
            ? "it played out without asking"
            : !last.eager
              ? "asked (guest not impulsive)"
              : !last.covered
                ? "asked (not a touch she could say yes to, or past the boldness)"
                : !last.consentOff
                  ? "asked (Consent is on)"
                  : "asked (her hold stood)"
        }`,
      ]
    : ["Last reach: nobody has reached yet."];
  // One button flips Consent, the same as Settings: switching it off is the player's yes, so no first-time offer.
  const flip = () => {
    if (consentOff) s.autoTouch = false;
    else {
      s.autoTouch = true;
      s.agreed = true;
    }
    writeTouchSettings(s);
    showDevPanel(game, back);
  };
  game.openMenu(
    "Dev: Consent check",
    [...her, "", ...them],
    [
      { label: consentOff ? "Consent is Off: switch On (always ask)" : "Consent is On: switch Off (stop asking)", onPick: flip },
      { label: "Cut-in tester", onPick: () => showCutInTester(game, back) },
      { label: "Scene pose tester", onPick: () => showScenePoseTester(game, back) },
      { label: "Quest map tester", onPick: () => showQuestTester(game, back) },
      {
        label: devResumeOn()
          ? "Resume after reload is On: a reload brings you back here (switch Off)"
          : "Resume after reload is Off: a reload goes to the title (switch On)",
        onPick: () => (setDevResume(!devResumeOn()), showDevPanel(game, back)),
      },
      { label: "Refresh", onPick: () => showDevPanel(game, back) },
    ],
    back,
  );
}

/**
 * In development, from the ] panel: any quest's map, straight away. It gives her a guild card if she has none, puts
 * the quest on today's board, takes it and sets out (a quest already taken today is let go first).
 */
function showQuestTester(game: Game, back: () => void): void {
  const tavern = game.tavern;
  game.openMenu(
    "Dev: Quest map tester",
    ["Pick a quest to walk its map now. Space or F strikes."],
    Guild.QUEST_TEMPLATES.map((q) => ({
      label: `[${q.rank}] ${q.title} · ${q.place}`,
      onPick: () => {
        if (!tavern.guild) {
          tavern.fans = Math.max(tavern.fans, Guild.JOIN_FANS);
          tavern.joinGuild();
        }
        const g = tavern.guild;
        if (!g) return;
        tavern.guildQuests();
        if (!tavern.guildBoard.includes(q.id)) tavern.guildBoard.push(q.id);
        g.accepted = null;
        tavern.guildQuestToday = false;
        tavern.guildAccept(q.id);
        if (!game.startQuestField()) showDevPanel(game, back);
      },
    })),
    back,
  );
}

/** The cut-in tester's choices, kept while the game runs. */
const tester: { guest: GuestKind } = { guest: "farmer" };
const TEST_GUESTS: GuestKind[] = ["farmer", "smuggler", "soldier", "fugitive", "adventurer", "bandit", "noble"];

/**
 * In development, from the ] panel: every cut-in, to play on her now (always bare, as in the game), with any kind of guest's
 * hands. It stays up until \ takes it down or another plays; [ plays the last one again.
 */
function showCutInTester(game: Game, back: () => void): void {
  const again = () => showCutInTester(game, back);
  const kinds = Object.keys(CUT_INS) as CutKind[];
  game.openMenu(
    "Dev: Cut-in tester",
    [
      "Pick one to play it on her now. It stays up until the \\ key takes it down or another plays.",
      "[ plays the last one again; ] opens this panel.",
    ],
    [
      {
        label: `Guest: ${tester.guest} (next)`,
        onPick: () => ((tester.guest = TEST_GUESTS[(TEST_GUESTS.indexOf(tester.guest) + 1) % TEST_GUESTS.length]), again()),
      },
      ...kinds.map((kind, i) => ({
        label: `${i + 1}. ${kind} (KP ${CUT_INS[kind].kp})`,
        onPick: () => {
          back();
          game.testCutIn(kind, tester.guest);
        },
      })),
    ],
    back,
  );
}

/** The scene pose tester's choices, kept while the game runs. */
const poseTester: { guest: GuestKind; joins: boolean } = { guest: "soldier", joins: false };

/**
 * In development, from the ] panel: every sex-scene pose (sexpose.ts), shown in the big picture in the game's own
 * camera, with a man as the lead and, if asked, one at each join. \ takes it down.
 */
function showScenePoseTester(game: Game, back: () => void): void {
  const again = () => showScenePoseTester(game, back);
  game.openMenu(
    "Dev: Scene pose tester",
    ["Pick a pose to show it now in the big picture. \\ takes it down."],
    [
      {
        label: `Guest: ${poseTester.guest} (next)`,
        onPick: () => ((poseTester.guest = TEST_GUESTS[(TEST_GUESTS.indexOf(poseTester.guest) + 1) % TEST_GUESTS.length]), again()),
      },
      { label: `Joins: ${poseTester.joins ? "on" : "off"}`, onPick: () => ((poseTester.joins = !poseTester.joins), again()) },
      ...SCENE_POSE_LIST.map((scene) => ({
        label: scene,
        onPick: () => {
          back();
          game.testScenePose(scene, poseTester.guest, poseTester.joins);
        },
      })),
    ],
    back,
  );
}

/** What her desire costs her in a brawl right now, in words. */
function brawlPenalties(p: DesirePenalties): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const parts = [
    p.accuracy ? `aim -${pct(p.accuracy)} (Mouth)` : "",
    p.dodge ? `dodge -${pct(p.dodge)} (Breasts)` : "",
    p.voice ? `talk/stare -${pct(p.voice)} (Pussy)` : "",
    p.damage ? `blows -${p.damage} (Body)` : "",
    p.grapple ? `their grapples +${pct(p.grapple)} (Butt)` : "",
    p.reach ? `their reaches +${pct(p.reach)} (Cock)` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "nothing yet (every desire under 50)";
}

function passiveCounts(owned: ReadonlySet<string>): string {
  const counts = new Map<string, number>();
  for (const id of owned) {
    const group = PASSIVE_BY_ID.get(id)?.group;
    if (group) counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  const parts = PASSIVE_GROUPS.filter((g) => counts.has(g.id)).map((g) => `${g.name} ${counts.get(g.id)}`);
  return parts.length ? parts.join(" · ") : "none";
}

function experience(lets: Partial<Record<string, number>>): string {
  const parts = Object.entries(lets).filter(([, n]) => (n ?? 0) > 0).map(([region, n]) => `${region} ${n}`);
  return parts.length ? parts.join(" · ") : "none yet";
}

/** Lists the save slots; picking one saves this very moment there, day or night. */
export function showSaveMenu(game: Game, back: () => void, notice?: string): void {
  game.openMenu(
    "Save game",
    notice ? [notice] : [],
    MANUAL_SLOTS.map((slot) => {
      const existing = readSave(slot);
      const label = slotName(slot);
      const save = () => {
        const notice = `Saved to ${slotName(slot)}.`;
        // Shown again once its picture is taken, a frame later, if the board is still up.
        const saved = game.saveNow(slot, () => {
          if (game.menuShowing("Save game")) showSaveMenu(game, back, notice);
        });
        showSaveMenu(game, back, saved ? notice : "Could not save: game browser is blocking storage.");
      };
      return {
        label,
        save: existing ?? undefined,
        thumb: existing ? readThumb(slot) : null,
        onPick: existing
          ? () => confirmMenu(game, `Overwrite ${slotName(slot)}?`, null, save, () => showSaveMenu(game, back))
          : save,
      };
    }),
    back,
    "grid",
  );
}

/** Lists every save; picking one loads it. Mid-game, it asks first, since anything not saved is lost. */
export function showLoadMenu(game: Game, back: () => void): void {
  const midNight = game.screen === "paused";
  game.openMenu(
    "Load game",
    [],
    SLOTS.map((slot) => {
      const data = readSave(slot);
      const load = () => data && game.loadGame(data);
      return {
        label: slotName(slot),
        save: data ?? undefined,
        thumb: data ? readThumb(slot) : null,
        disabled: !data,
        onPick:
          midNight && data
            ? () => confirmMenu(game, `Load ${slotName(slot)}?`, "Anything you have done since you last saved will be lost.", load, () => showLoadMenu(game, back))
            : load,
      };
    }),
    back,
    "grid",
  );
}

/** A yes/no question; `warning` says what's at stake, when something is. */
export function confirmMenu(game: Game, title: string, warning: string | null, yes: () => void, no: () => void): void {
  game.openMenu(title, warning ? [warning] : [], [{ label: "Yes", onPick: yes }], no);
}

/** Her trinkets (KP's accessories, trinkets.ts): each with what it does; the ones she has can be worn or taken off. */
export function showTrinkets(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const list = tavern.trinkets();
  const again = () => showTrinkets(game, back);
  game.openMenu(
    "Trinkets",
    ["Wear up to two. What they look like on you is still to come; for now they change your numbers."],
    list.map((t) => ({
      label: `${t.worn ? "✓ " : ""}${t.name} · ${t.about}${t.owned ? "" : ` (needs ${t.needs})`}`,
      disabled: !t.owned,
      onPick: () => {
        tavern.toggleTrinket(t.id);
        game.audio.play("click");
        again();
      },
    })),
    back,
  );
}

/** KP's side jobs and the bathhouse (sidejobs.ts), from a menu until the stage, the front desk and her hair are drawn. */
export function showSideWork(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const again = () => showSideWork(game, back);
  game.openMenu(
    "Side work",
    [
      `A riot night: ${tavern.riot ? "yes, trouble starts twice as easily (win 2 brawls to put it down)" : "no"}.`,
      `Your hair: ${tavern.hairGrowth} (${tavern.hairNights} nights since a trim).`,
    ],
    [
      { label: "Dance on the bar (18+) · once a night, during service", disabled: !tavern.canDance, onPick: () => { tavern.danceOnBar(); game.audio.play("cheers"); again(); } },
      { label: "Let the rooms upstairs · at last call or bedtime", disabled: !tavern.canRentRooms, onPick: () => { tavern.rentOutRooms(); game.audio.play("cheers"); again(); } },
      { label: "Get trimmed at the bathhouse", disabled: tavern.hairNights === 0, onPick: () => { tavern.trimHair(); game.audio.play("click"); again(); } },
    ],
    back,
  );
}

/** A perk's name and what it does, for the menus. */
const perkText = (ids: readonly string[]) =>
  ids.length === 0 ? "no perk" : ids.map((id) => `${STAFF_PERK_BY_ID[id]?.name ?? id}: ${STAFF_PERK_BY_ID[id]?.detail ?? ""}`).join("; ");

/** One of her staff, or an applicant, in a line. */
const memberText = (m: StaffMember) =>
  `${m.name} (${m.age}, ${m.female ? "woman" : "man"}), ${m.job} · ${RARITY_NAME[m.rarity]} · skill ${m.skill}, appeal ${m.appeal}, charm ${m.charm}, stamina ${m.stamina.current}/${m.stamina.max}, loyalty ${Math.round(m.loyalty)}, fame ${Math.round(m.fame)}, wage ${m.wage} · ${perkText(m.perks)} · ${staffTier(m.corruption)}, ${staffStage(m)}: "${staffStageLine(m)}"`;

/**
 * Her staff (staff.ts, STAFF.md), from a menu until the Staff page and the HUD's staff bar are drawn: the stage and
 * the cap, each one she has (wage up or down, let go, their story's beat when it's due), the applicants answering
 * her notice, the friends who'll work for her, and the people she's getting to know.
 */
export function showStaff(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const again = () => showStaff(game, back);
  const click = (run: () => unknown) => () => {
    run();
    game.audio.play("click");
    again();
  };
  const { have, cap } = tavern.staffCap;
  const can = tavern.canManageStaff;
  const paragraphs = [
    `Stage: ${tavern.staffStage}. Staff ${have} of ${cap} (the Lantern's girls don't count).${tavern.staffStage === "early" ? " Nobody's asking for work yet: you work alone for now." : ""}`,
    `Hiring, wages and letting go are done while the tavern's shut. Their portraits and work clothes are still to come.`,
    ...tavern.staff.map((m) => {
      const beat = tavern.staffBeat(m.id);
      return `${memberText(m)}${beat ? ` · Story: "${beat.title}": ${beat.text}` : ""}`;
    }),
    ...tavern.lantern.girls.filter((g) => !g.quit).map((g) => `${g.name}, a girl at the Lantern (off the cap; see the house plans).`),
  ];
  const buttons: Button[] = [];
  for (const m of tavern.staff) {
    buttons.push({ label: `${m.name}: wage +1 (${m.wage})`, onPick: click(() => tavern.setWage(m.id, m.wage + 1)) });
    buttons.push({ label: `${m.name}: wage -1 (${m.wage})`, disabled: m.wage <= 0, onPick: click(() => tavern.setWage(m.id, m.wage - 1)) });
    const beat = tavern.staffBeat(m.id);
    if (beat) for (const o of beat.outcomes) buttons.push({ label: `${m.name}, "${beat.title}": ${o.text}`, onPick: click(() => tavern.playStaffBeat(m.id, o.id)) });
    buttons.push({ label: `Let ${m.name} go`, disabled: !can, onPick: click(() => tavern.fireStaff(m.id)) });
  }
  const room = have < cap;
  for (const d of tavern.staffHireable()) {
    const perk = FRIEND_PERK[d.id];
    buttons.push({
      label: `Hire your friend ${d.name} (${d.age}), ${d.job} · ${RARITY_NAME[FRIEND_RARITY[d.id] ?? "epic"]} · wage ${d.wage} · ${perkText(perk ? [perk] : [])} · ${d.about}`,
      disabled: !can,
      onPick: click(() => tavern.hireStaff(d.id)),
    });
  }
  for (const a of tavern.applicants) {
    buttons.push({ label: `Hire applicant: ${memberText(a)}`, disabled: !can || !room, onPick: click(() => tavern.hireApplicant(a.id)) });
  }
  if (tavern.staffStage !== "early") {
    buttons.push({ label: `Post for work: a fresh lot of applicants (${POSTING_FEE} gold)`, disabled: !can || tavern.gold < POSTING_FEE, onPick: click(() => tavern.postForWork()) });
  }
  for (const f of tavern.staffToBefriend()) {
    buttons.push({
      label: `Spend time with ${f.def.name} (friendship ${f.friendship}/${FRIEND_AT}${STAFF_BY_ID[f.def.id] ? `, ${f.def.job}` : ""})${f.spentToday ? " · done today" : ""}`,
      disabled: f.spentToday,
      onPick: click(() => tavern.spendTimeWith(f.def.id)),
    });
  }
  game.openMenu("Staff", paragraphs, buttons, back);
}

/**
 * Revel nights (revel.ts, REVEL_HOUSE.md), from a menu until the Revel Hall and the group poses are drawn: whether
 * it's open (and what's missing), the night's three settings, and the switch for tonight. Everyone who comes
 * through the door has come for it; with Consent on she's still asked about her own part.
 */
export function showRevel(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const again = () => showRevel(game, back);
  const s = tavern.revelSettings;
  const day = tavern.phase === "day";
  const missing = tavern.revelMissing();
  const click = (run: () => unknown) => () => {
    run();
    game.audio.play("click");
    again();
  };
  const WHO = { men: "Mostly men", mixed: "Mixed (men and women)", women: "Women only" };
  const PART = { host: "Hosting (you run the room)", join: "Joining in", centrepiece: "The centrepiece (it's about you)" };
  const DOOR = { open: "Open", invite: "By invitation (regulars and fans)", paying: "Paying (a fee at the door)" };
  game.openMenu(
    "Revel nights",
    [
      tavern.revelOpen ? "The Revel House is open to you. Choose by day; the hall opens as the tavern shuts." : `Not yet. Still needed: ${missing.join("; ")}.`,
      `The Revel Hall: ${tavern.revelHall ? "built" : `not built (house plans, ${REVEL_HALL_COST} gold, from Act 3)`}.`,
      "The hall, the groups around the room and the revel outfits are still to be drawn; for now the night plays out in the log.",
    ],
    [
      { label: `Who's invited: ${WHO[s.who]}`, disabled: !day, onPick: click(() => tavern.cycleRevel("who")) },
      { label: `Your part: ${PART[s.herPart]}`, disabled: !day, onPick: click(() => tavern.cycleRevel("herPart")) },
      { label: `The door: ${DOOR[s.door]}`, disabled: !day, onPick: click(() => tavern.cycleRevel("door")) },
      {
        label: `${tavern.revelTonight ? "✓ " : ""}Hold a revel tonight`,
        disabled: !day || (!tavern.revelOpen && !tavern.revelTonight),
        onPick: click(() => tavern.setRevelTonight(!tavern.revelTonight)),
      },
    ],
    back,
  );
}

// ---------- Feed Star, the Knight path and the Guild (placeholder menus until their art) ----------

/** Starts a brawl from a menu: the menu shuts and the night's brawl screen takes over. */
function toTheBrawl(game: Game): void {
  game.closePanel();
  game.screen = "play";
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Where the feed's and the guild's menus go back to once a sub-menu has done its thing (set as each opens). */
let feedBack: () => void = () => {};
let guildBack: () => void = () => {};

/**
 * Feed Star (feedstar.ts, FEED_STAR.md), from a menu until the phone screen is drawn: her page, a post (the photo
 * shoot as choices and a timing button), her DMs, a live stream, this week's trend, and sponsors.
 */
export function showFeed(game: Game, back: () => void, note?: string): void {
  const tavern = game.tavern;
  feedBack = back;
  const again = (n?: string) => showFeed(game, back, n);
  const f = tavern.feed;
  const held = tavern.watchedPassives.map((id) => Feed.WATCHED_PASSIVES.find((p) => p.id === id)?.name ?? id);
  const trend = Feed.TRENDS[tavern.feedTrend];
  const paragraphs = [
    `${f.followers} followers · ${f.totalLikes} likes · ${f.boldPosts} bold posts · ${f.virals} viral · ${f.streams} streams.`,
    `Watched: ${cap(tavern.watchedStage)}${held.length ? ` (${held.join(", ")})` : ""}.`,
    `Sponsors: ${tavern.feedDeals.length ? tavern.feedDeals.map((d) => `${Feed.SPONSORS[d.id].name} ${d.postsThisWeek}/${Feed.SPONSORS[d.id].perWeek} this week`).join("; ") : "none"}.`,
    "The phone screen, the photo poses and the scrying crystal are still to be drawn; for now it's menus and the log.",
  ];
  if (note) paragraphs.push(note);
  const dms = tavern.phase === "day" ? tavern.feedDms().length : 0;
  const buttons: Button[] = [
    { label: tavern.postedToday ? "Make a post (done today)" : "Make a post: the shoot, then the post (1 gold)", disabled: !tavern.canFeedPost, onPick: () => showFeedShoot(game, () => again(), {}) },
    { label: `Read your DMs (${dms})`, disabled: tavern.phase !== "day" || dms === 0, onPick: () => showFeedDms(game, () => again()) },
    { label: tavern.feedStreamedToday ? "Go live (done today)" : "Go live on the scrying crystal (18+ dares, all yours to take or not)", disabled: !tavern.canStream, onPick: () => { tavern.feedGoLive(); showFeedStream(game, () => again()); } },
    {
      label: `This week's trend: ${trend.tag} (${trend.what})${tavern.feedTrendWeek === tavern.feedWeek ? " · done this week" : ""}`,
      disabled: !tavern.canTrend,
      onPick: () => showFeedTrend(game, () => again(), []),
    },
    ...tavern.feedSponsorOffers().map((id) => ({
      label: `Sign with ${Feed.SPONSORS[id].name} (${Feed.SPONSORS[id].who}): ${Feed.SPONSORS[id].pay} gold a post showing their goods, ${Feed.SPONSORS[id].perWeek} a week`,
      onPick: () => {
        tavern.signSponsor(id);
        game.audio.play("click");
        again();
      },
    })),
  ];
  game.openMenu("Feed", paragraphs, buttons, back);
}

/** The shoot, one choice at a time: the post, outfit, prop, angle, then the tap. */
function showFeedShoot(
  game: Game,
  back: () => void,
  pick: { kind?: Feed.PostKind; outfit?: Feed.ShootOutfit; prop?: Feed.ShootProp; angle?: Feed.ShootAngle },
): void {
  const tavern = game.tavern;
  const next = (p: typeof pick) => () => showFeedShoot(game, back, p);
  if (!pick.kind) {
    game.openMenu(
      "The shoot: what's the post?",
      ["Bolder posts open as her arc and her Watched stage go on."],
      Feed.POST_KINDS.map((k) => ({
        label: `${Feed.POSTS[k].name} (${["plain", "flirty", "bold", "bare"][Feed.POSTS[k].tier]})`,
        disabled: !tavern.feedAllowedPosts().includes(k),
        onPick: next({ kind: k }),
      })),
      back,
    );
    return;
  }
  if (!pick.outfit) {
    const outfits: Feed.ShootOutfit[] = ["apron", "dress", "lace", "nothing"];
    game.openMenu("The shoot: what's she wearing?", [], outfits.map((o) => ({ label: cap(o), disabled: Feed.OUTFIT_TIER[o] > tavern.feedMaxTier, onPick: next({ ...pick, outfit: o }) })), back);
    return;
  }
  if (!pick.prop) {
    const props: Feed.ShootProp[] = ["stew", "tankard", "candle", "mirror"];
    game.openMenu("The shoot: the prop", ["The right prop for the post makes a better picture."], props.map((p) => ({ label: cap(p), onPick: next({ ...pick, prop: p }) })), back);
    return;
  }
  if (!pick.angle) {
    const angles: Feed.ShootAngle[] = ["front", "shoulder", "above", "low"];
    const words = { front: "From the front", shoulder: "Over the shoulder", above: "From above", low: "From low" };
    game.openMenu("The shoot: the angle", ["A daring angle makes a shot bolder than its outfit."], angles.map((a) => ({ label: words[a], onPick: next({ ...pick, angle: a }) })), back);
    return;
  }
  const shoot = (when: "early" | "on" | "late") => () => {
    const out = tavern.feedPost(pick.kind!, { outfit: pick.outfit!, prop: pick.prop!, angle: pick.angle! }, tavern.feedTapOffset(when));
    game.audio.play("click");
    showFeed(game, feedBack, out ? `${out.post.line} (${out.shot.grade}, quality ${Math.round(out.shot.quality * 100)}%)` : "You can't post that today.");
  };
  game.openMenu(
    "The shoot: tap when the light's right",
    ["The candle flickers, her pose settles... now."],
    [
      { label: "Too early", onPick: shoot("early") },
      { label: "Right on the moment", onPick: shoot("on") },
      { label: "Too late", onPick: shoot("late") },
    ],
    back,
  );
}


/** Today's DMs, each with her four answers. */
function showFeedDms(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const dms = tavern.feedDms();
  const words: Record<Feed.DmChoice, string> = { charm: "Charm", tease: "Tease", ignore: "Ignore", block: "Block" };
  game.openMenu(
    "DMs",
    dms.length ? dms.map((d, i) => `${i + 1}. ${d.from}: "${d.text}"`) : ["Nothing new."],
    dms.flatMap((d, i) =>
      Feed.DM_CHOICES.map((c) => ({
        label: `${i + 1}. ${d.from}: ${words[c]}`,
        onPick: () => {
          tavern.feedReply(i, c);
          game.audio.play("click");
          showFeedDms(game, back);
        },
      })),
    ),
    back,
  );
}

/** The live stream: one chat request at a time, take it, decline it, or let it pass. */
function showFeedStream(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const req = tavern.feedStreamRequest;
  if (!req) {
    back();
    return;
  }
  const answer = (a: boolean | null) => () => {
    const result = tavern.feedStreamAnswer(a);
    game.audio.play("click");
    if (result) showFeed(game, feedBack, result.endedEarly ? `The chat drifted off. (+${result.tips} gold)` : `Stream over: +${result.tips} gold, +${result.newFollowers} followers.`);
    else showFeedStream(game, back);
  };
  const tooBold = req.tier > tavern.feedMaxTier;
  game.openMenu(
    "Live on the crystal",
    [`Chat: "${req.text}" (${["plain", "flirty", "bold", "bare"][req.tier]}, tip ${req.tip})`, tooBold ? "That's more than she's ready for: taking it counts as a no." : "Her choice, always."],
    [
      { label: "Take the dare", onPick: answer(true) },
      { label: "Decline", onPick: answer(false) },
      { label: "Let it pass", onPick: answer(null) },
    ],
    back,
  );
}

/** This week's trend as a run of timing buttons, one per beat. */
function showFeedTrend(game: Game, back: () => void, beats: ("early" | "on" | "late" | "miss")[]): void {
  const tavern = game.tavern;
  const def = Feed.TRENDS[tavern.feedTrend];
  if (beats.length >= def.beats.length) {
    const result = tavern.feedTrendDance(tavern.feedTrendTaps(beats));
    showFeed(game, feedBack, result ? `${def.tag}: accuracy ${Math.round(result.accuracy * 100)}%, +${result.newFollowers} followers.` : undefined);
    return;
  }
  const tap = (b: "early" | "on" | "late" | "miss") => () => {
    game.audio.play("click");
    showFeedTrend(game, back, [...beats, b]);
  };
  game.openMenu(
    def.tag,
    [def.what, `Beat ${beats.length + 1} of ${def.beats.length}.`],
    [
      { label: "Early", onPick: tap("early") },
      { label: "On the beat", onPick: tap("on") },
      { label: "Late", onPick: tap("late") },
      { label: "Miss it", onPick: tap("miss") },
    ],
    back,
  );
}

/**
 * The Knight path (knight.ts, KNIGHT_PATH.md), from a menu until the drill yard, the lists and her kits are drawn:
 * her rank and standing, what's missing for the next, and the day's work.
 */
export function showKnight(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const again = () => showKnight(game, back);
  const click = (run: () => unknown) => () => {
    run();
    game.audio.play("click");
    again();
  };
  const k = tavern.knight;
  const day = tavern.phase === "day";
  if (!k) {
    game.openMenu(
      "Knight",
      ["Captain Rhea Vance's garrison takes volunteers by day. It's the Baron's garrison: you'd be climbing inside his army."],
      [{ label: "Sign up at the garrison", disabled: !tavern.canJoinGarrison, onPick: click(() => tavern.joinGarrison()) }],
      back,
    );
    return;
  }
  const rank = Knight.KNIGHT_RANKS[k.rank];
  const fx = Knight.effectsOf(k);
  const check = Knight.canPromote(k, tavern.knightFacts());
  const paragraphs = [
    `${rank.name}. Favour ${k.favour}, scandal ${k.scandal}/${Knight.SCANDAL_LIMIT}. Best drill ${k.drillBest}, patrols ${k.patrols}, raids ${k.raids}, tourney wins ${k.tourneyWins}, oath ${k.oath ?? "not sworn"}.`,
    `Your rank: +${fx.brawlDamage} brawl damage, ${fx.heatPerNight} heat a night (in favour), +${fx.respectPerWeek} respect a week, the Baron's watch ${fx.baronWatch}/4.`,
    k.squad.length ? `Squad: ${k.squad.map((m) => `${m.name} (${m.loyalty})`).join(", ")}.` : "No squad yet.",
    check.next ? (check.ok ? `Ready for ${Knight.KNIGHT_RANKS[check.next].name}.` : `For ${Knight.KNIGHT_RANKS[check.next].name}: ${check.missing.join("; ")}.`) : check.missing.join(" "),
    "The drill yard, the lists and the knight kits are still to be drawn.",
  ];
  const buttons: Button[] = [
    { label: "Drill: keep steady on the beat", disabled: !tavern.canKnight("drill"), onPick: click(() => tavern.knightDrill(tavern.knightDrillTimings("steady"))) },
    { label: "Drill: push the pace", disabled: !tavern.canKnight("drill"), onPick: click(() => tavern.knightDrill(tavern.knightDrillTimings("rushed"))) },
    { label: "Drill: go through the motions", disabled: !tavern.canKnight("drill"), onPick: click(() => tavern.knightDrill(tavern.knightDrillTimings("sloppy"))) },
    { label: "Walk a patrol", disabled: !tavern.canKnight("patrol"), onPick: () => showPatrol(game, again) },
    { label: `Raid with your squad${fx.raids ? "" : " (Knight-Captain)"}`, disabled: !fx.raids || !tavern.canKnight("raid"), onPick: () => showRaids(game, again) },
    {
      label: "Fight in the tourney (a brawl, once a week)",
      disabled: !tavern.canTourney,
      onPick: () => {
        if (tavern.knightTourney()) toTheBrawl(game);
      },
    },
    { label: "Swear the oath to the Baron", disabled: !day || k.rank !== "squire" || k.tourneyWins < 1 || k.oath !== null, onPick: click(() => tavern.knightOath("baron")) },
    { label: "Swear the oath to the town", disabled: !day || k.rank !== "squire" || k.tourneyWins < 1 || k.oath !== null, onPick: click(() => tavern.knightOath("town")) },
    { label: check.next ? `Ask for promotion to ${Knight.KNIGHT_RANKS[check.next].name}` : "Promotion", disabled: !day || !check.ok, onPick: click(() => tavern.knightPromote()) },
  ];
  if (k.rank === "captain") {
    buttons.push({
      label: `Call out ${Knight.OLD_COMMANDER.name} (a brawl)`,
      disabled: !day || k.commanderBeaten || tavern.fight !== null,
      onPick: () => {
        if (tavern.knightCommanderDuel()) toTheBrawl(game);
      },
    });
    buttons.push({ label: "Call the squad's vote", disabled: !day || k.voteWon, onPick: click(() => tavern.knightVote()) });
  }
  if (fx.rules) {
    const order: Knight.GarrisonRules[] = ["none", "fair", "harsh", "loose"];
    const nextRules = order[(order.indexOf(k.rules) + 1) % order.length];
    buttons.push({ label: `Garrison rules: ${k.rules === "none" ? "none" : Knight.GARRISON_RULES[k.rules].name} (change)`, onPick: click(() => tavern.knightRules(nextRules)) });
  }
  const reeve = tavern.reeveCheck();
  if (tavern.politics.reeve) buttons.push({ label: "The Law board (Reeve)", onPick: () => showLaws(game, again) });
  else buttons.push({ label: reeve.ok ? "Take the Reeve's chain" : `Reeve of Tarven (still needed: ${reeve.missing.join("; ")})`, disabled: !reeve.ok, onPick: click(() => tavern.becomeReeve()) });
  game.openMenu("Knight", paragraphs, buttons, back);
}

/** Today's patrol: its event and her choices (a fight choice is a real brawl). */
function showPatrol(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const event = tavern.knightPatrol();
  if (!event) {
    back();
    return;
  }
  game.openMenu(
    event.name,
    [event.intro],
    event.choices.map((c) => ({
      label: `${c.label}${c.fight ? " (a brawl)" : ""}`,
      onPick: () => {
        const r = tavern.knightPatrolChoose(c.id);
        game.audio.play("click");
        if (r === "fight") toTheBrawl(game);
        else back();
      },
    })),
    back,
  );
}

/** Raids open to her rank, each with the three orders. */
function showRaids(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const k = tavern.knight;
  if (!k) {
    back();
    return;
  }
  const buttons: Button[] = [];
  for (const id of Object.keys(Knight.RAID_TARGETS) as Knight.RaidTargetId[]) {
    if (!Knight.canRaid(k, id)) continue;
    for (const order of Object.keys(Knight.SQUAD_ORDERS) as Knight.SquadOrder[]) {
      buttons.push({
        label: `${Knight.RAID_TARGETS[id].name}: ${Knight.SQUAD_ORDERS[order].name} (${Math.round(Knight.raidOdds(k.squad, id, order) * 100)}%)`,
        onPick: () => {
          tavern.knightRaid(id, order);
          game.audio.play("click");
          back();
        },
      });
    }
  }
  game.openMenu("Raid", buttons.length ? ["Pick a target and give the order."] : ["Nothing your rank can raid yet."], buttons, back);
}

/** What the board as it stands does, in a line (townhall.ts `lawEffects`). */
function lawSummary(tavern: Game["tavern"]): string {
  const e = tavern.lawEffects;
  const parts = [
    e.nightlyGold ? `${e.nightlyGold > 0 ? "+" : ""}${e.nightlyGold} gold a night` : "",
    e.nightlyHeat ? `+${e.nightlyHeat} heat a night` : "",
    e.bareLegal ? "being seen bare costs you nothing" : e.exposureRespect > 1 ? "being seen bare costs you double" : "",
    e.veyraFaith ? "the Warm House recruits twice as fast" : "",
    e.freeUse ? `free use (${e.freeUse === 2 ? "everyone" : "devotees"}): ${tavern.consentOff ? "hands land unasked in the street" : "they ask you first, and your no costs you with the devotees"}` : "",
    e.publicAffection === 2 ? "sex anywhere in the streets" : e.publicAffection === 1 ? "touching allowed in the streets" : "",
  ].filter(Boolean);
  return parts.length ? `What the board does now: ${parts.join("; ")}.` : "The board as the Baron left it changes nothing yet.";
}

/** The Law board (townhall.ts): each law, and the levels she can put to the council, and what the board does now. */
export function showLaws(game: Game, back: () => void): void {
  const tavern = game.tavern;
  if (!tavern.politics.reeve) {
    back();
    return;
  }
  const k = tavern.politics;
  const again = () => showLaws(game, back);
  const buttons: Button[] = [];
  for (const id of Object.keys(Knight.LAWS) as Knight.LawId[]) {
    const law = Knight.LAWS[id];
    ([0, 1, 2] as Knight.LawLevel[]).forEach((level) => {
      if (level === k.laws[id]) return;
      const cost = Knight.lawCost(k.laws[id], level);
      buttons.push({
        label: `${law.name}: ${law.levels[level]} (support ${cost.support}, ${cost.gold} gold)`,
        disabled: tavern.gold < cost.gold || tavern.councilSupport < cost.support,
        onPick: () => {
          tavern.passLaw(id, level);
          game.audio.play("click");
          again();
        },
      });
    });
  }
  game.openMenu(
    "The Law board",
    [
      `Council support for you: ${tavern.councilSupport}.`,
      ...(Object.keys(Knight.LAWS) as Knight.LawId[]).map((id) => `${Knight.LAWS[id].name}: ${Knight.LAWS[id].levels[k.laws[id]]}. ${Knight.LAWS[id].changes}`),
      lawSummary(tavern),
    ],
    buttons,
    back,
  );
}

/**
 * The Adventurers' Guild (guild.ts, ADVENTURERS_GUILD.md), from a menu until the hall is drawn: her card, the board,
 * her party, and the hall once she runs it.
 */
export function showGuild(game: Game, back: () => void, note?: string): void {
  const tavern = game.tavern;
  guildBack = back;
  const again = (n?: string) => showGuild(game, back, n);
  const click = (run: () => unknown) => () => {
    run();
    game.audio.play("click");
    again();
  };
  const g = tavern.guild;
  if (!g) {
    game.openMenu(
      "Guild",
      [tavern.guildOpen ? "Kestrel Vey has a guild card with your name on it, if you want it." : `The guild only ranks names people know: ${Guild.JOIN_FANS} fans (${tavern.fans}).`],
      [{ label: "Join the guild (F rank)", disabled: !tavern.guildOpen || tavern.phase !== "day", onPick: click(() => tavern.joinGuild()) }],
      back,
    );
    return;
  }
  const rank = Guild.GUILD_RANK_BY_ID[g.rank];
  const missing = tavern.guildMissing();
  const master = tavern.guildMasterCheck();
  const paragraphs = [
    `${rank.name} (${rank.career}). ${g.points} points, ${g.quests} quests done, ${g.failed} failed.`,
    missing.length ? `Next rank: ${missing.join("; ")}.` : g.rank === "S" ? "The top of the guild." : "Ready for the next rank.",
    `Party (${g.party.length}/${rank.maxCompanions}): ${g.party.length ? g.party.map((c) => `${c.name} (${c.role}${c.fee ? `, fee ${c.fee}` : ""})`).join(", ") : "nobody"}.`,
    g.injuries.length ? `Hurt: ${g.injuries.map((i) => `${i.who === "her" ? "you" : i.who}: ${Guild.INJURIES[i.id].name} (${i.days} days)`).join("; ")}.` : "Nobody's hurt.",
  ];
  const accepted = tavern.acceptedQuest;
  if (accepted) {
    paragraphs.push(`Your quest: [${accepted.rank}] ${accepted.title} · ${accepted.place} · ${accepted.gold} gold, ${accepted.points} points. ${accepted.blurb}`);
  }
  if (note) paragraphs.push(note);
  const setOut = tavern.guildSetOutBlocked();
  const buttons: Button[] = [];
  if (accepted) {
    buttons.push(
      { label: `Set out: ${accepted.title}${setOut ? ` (${setOut})` : ""}`, disabled: setOut !== null, onPick: () => game.startQuestField() },
      { label: "Give the quest back", onPick: click(() => tavern.guildGiveUp()) },
    );
  }
  buttons.push(
    { label: "The quest board", disabled: tavern.phase !== "day", onPick: () => showQuestBoard(game, () => again()) },
    { label: "Your party", onPick: () => showParty(game, () => again()) },
    { label: "Ask the clerk to rank you up", disabled: missing.length > 0, onPick: click(() => tavern.guildPromote()) },
  );
  if (Guild.rankIndex(g.rank) >= Guild.rankIndex("A") && !g.counter) {
    buttons.push({ label: `Put up a guild counter at your bar (${GUILD_COUNTER_COST} gold)`, disabled: tavern.gold < GUILD_COUNTER_COST || tavern.phase !== "day", onPick: click(() => tavern.buildGuildCounter()) });
  }
  if (!g.master) buttons.push({ label: master.ok ? "Take the hall: become guild master" : `Guild master (still needed: ${master.missing.join("; ")})`, disabled: !master.ok, onPick: click(() => tavern.becomeGuildMaster()) });
  else {
    const cuts: Guild.QuestCutId[] = ["low", "fair", "steep"];
    buttons.push({ label: `The hall's cut: ${Guild.QUEST_CUTS[g.cut].name} (change)`, onPick: click(() => tavern.setGuildCut(cuts[(cuts.indexOf(g.cut) + 1) % cuts.length])) });
    buttons.push({ label: "Run the hall today", disabled: tavern.guildHallToday || tavern.phase !== "day", onPick: click(() => tavern.runGuildHall()) });
    for (const d of Object.values(Guild.RECRUIT_DRIVES)) {
      buttons.push({ label: `Run the hall with a drive: ${d.name} (${d.cost} gold)`, disabled: tavern.guildHallToday || tavern.phase !== "day" || tavern.gold < d.cost, onPick: click(() => tavern.runGuildHall(d.id)) });
    }
  }
  game.openMenu("Guild", paragraphs, buttons, back);
}

/** Today's board: each quest, and whether she can take it. Accepting one makes it hers to walk (questfield.ts). */
function showQuestBoard(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const quests = tavern.guildQuests();
  game.openMenu(
    "The quest board",
    quests.length
      ? ["Take one quest a day off the board, then set out from the guild page: you walk it, and fight what's on the road yourself. Every monster you put down makes you stronger."]
      : ["Nothing for you today."],
    quests.map((q) => {
      const blocked = tavern.guildAcceptBlocked(q.id);
      return {
        label: `Accept [${q.rank}] ${q.title} · ${q.place} · ${q.gold} gold, ${q.points} points${blocked ? ` (${blocked})` : ""}`,
        disabled: blocked !== null,
        onPick: () => {
          const ok = tavern.guildAccept(q.id);
          game.audio.play("click");
          showGuild(game, guildBack, ok ? `You took "${q.title}". Set out when your party's ready.` : undefined);
        },
      };
    }),
    back,
  );
}

/** Her party: friends on her staff to take along, adventurers to hire for one quest, anyone to leave behind. */
function showParty(game: Game, back: () => void): void {
  const tavern = game.tavern;
  const g = tavern.guild;
  if (!g) {
    back();
    return;
  }
  const again = () => showParty(game, back);
  const click = (run: () => unknown) => () => {
    run();
    game.audio.play("click");
    again();
  };
  const buttons: Button[] = [
    ...g.party.map((c) => ({ label: `Leave ${c.name} behind`, onPick: click(() => tavern.guildLeave(c.id)) })),
    ...tavern.guildFriends()
      .filter((c) => !g.party.some((p) => p.id === c.id))
      .map((c) => ({ label: `Take ${c.name} (${c.role}, power ${c.power}, loyalty ${c.loyalty}) · ${c.about}`, onPick: click(() => tavern.guildTakeFriend(c.id)) })),
    ...Guild.PARTY_ROLES.map((role) => ({ label: `Hire a ${role} off the bench · ${Guild.ROLE_ABOUT[role]}`, onPick: click(() => tavern.guildHire(role)) })),
  ];
  game.openMenu("Your party", [`Up to ${Guild.GUILD_RANK_BY_ID[g.rank].maxCompanions} at ${Guild.GUILD_RANK_BY_ID[g.rank].name}. Staff friends go for nothing; the hired are paid from the quest.`], buttons, back);
}
