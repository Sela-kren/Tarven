/**
 * The fight screens: a tavern brawl, the After Hours duel (the sex fight) from the bedtime offer through her rules
 * to the end, and the 18+ cards (upstairs, alone, and how a duel ended). The duel's rules are in duel.ts and its
 * moves in duelmoves.ts; this file only draws them and passes her picks on.
 */
import { CUM_NAMES, CUM_SPOTS } from "./cum";
import { AREA_NAMES, DUEL_AREAS, MAX_PARTNERS, STATE_NAMES, type Duel, type DuelArea, type DuelLogEntry, type DuelTest, type Partner } from "./duel";
import { ROLE_PLAYS, type RolePlay } from "./duellines";
import { GUEST_KIND_LIST, statsOf } from "./guestroles";
import type { Button, Game } from "./game";
import type { AdultScene, InviteScene } from "./tavern";
import { willLabel } from "./willpower";
import { DESIRE_STRONG } from "./desire";
import { METER_NAMES, METERS } from "./passives";
import type { Fight } from "./fight";

/** Her desire in a brawl, in a line: horny or wet first, then each desire past 50 that's getting in her way. */
function desireSummary(fight: Fight): string {
  const desire = fight.desire;
  if (!desire) return "";
  const strong = METERS.filter((m) => desire[m] >= DESIRE_STRONG).map((m) => `${METER_NAMES[m]} ${Math.floor(desire[m])}`);
  const state = [fight.horny ? "Horny" : null, fight.wet ? "Wet" : null].filter(Boolean);
  const parts = [...state, ...strong];
  return parts.length ? parts.join(" · ") : `Cool-headed · Cock ${Math.floor(desire.cock)}`;
}

/** One bar on a fight screen: who, a track filled to how much they have left, and the number. */
function statBar(who: string, now: number, max: number, tone: string): HTMLElement {
  const line = document.createElement("div");
  line.className = `fight-bar ${tone}`;
  const label = document.createElement("span");
  label.textContent = who;
  const track = document.createElement("span");
  track.className = "track";
  const fill = document.createElement("span");
  fill.className = "fill";
  fill.style.width = `${(now / max) * 100}%`;
  track.append(fill);
  const value = document.createElement("b");
  value.textContent = `${now}/${max}`;
  line.append(label, track, value);
  return line;
}

/** The last few lines of a fight's log: what just happened. */
function fightLog(lines: readonly string[]): HTMLElement {
  const log = document.createElement("div");
  log.className = "fight-log";
  for (const line of lines.slice(-4)) {
    const p = document.createElement("p");
    p.textContent = line;
    log.append(p);
  }
  return log;
}

/**
 * An 18+ moment, as a card over the room: placeholder wallpaper, the 18+ mark, one short line, and the
 * choices. Never more than the one line; the art will be the game's own one day.
 */
export function showAdultCard(game: Game, title: string, line: string, scene: "door" | "candle" | "bed", buttons: Button[]): void {
  game.openPanel(title, [], buttons);
  game.panelEl.classList.add("adult-open");
  const box = game.panelEl.querySelector(".box");
  if (!box) return;
  const art = document.createElement("div");
  art.className = `wallpaper ${scene}`;
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = "18+";
  const note = document.createElement("span");
  note.className = "placeholder";
  note.textContent = "Placeholder art";
  art.append(badge, note);
  const words = document.createElement("p");
  words.className = "adult-line";
  words.textContent = line;
  box.insertBefore(words, box.querySelector(".menu"));
  box.insertBefore(art, words);
}

/** Shows whatever 18+ moment the last answer led to, then gets back to work. */
export function playAdultScene(game: Game, scene: AdultScene): void {
  const back = () => {
    game.panelEl.classList.remove("adult-open");
    game.closePanel();
    game.screen = "play";
  };
  if (scene.kind === "overwhelmed") {
    showAdultCard(game, "Overwhelmed", "It all comes over you at once. For a moment the tavern simply isn't there.", "candle", [
      { label: "Pull yourself together", onPick: back },
    ]);
    game.panelBack = back;
    return;
  }
  showInvitation(game, scene);
}

/** Back to work from an 18+ card. */
function backToWork(game: Game): void {
  game.panelEl.classList.remove("adult-open");
  game.closePanel();
  game.screen = "play";
}

/**
 * She's said yes to an invitation (invitetalk.ts tells it). Where is hers to choose: up the stairs with them, or
 * right here in the taproom, with them and whoever else in the room wants in (taproom.ts). The taproom isn't on
 * offer at all when either side has had too much; it's there but shut, with the reason, when nobody else wants
 * in or it's her first time. She can still change her mind.
 */
export function showInvitation(game: Game, scene: InviteScene): void {
  const { tavern } = game;
  const back = () => backToWork(game);
  const taproom = tavern.taproomOption(scene);
  const buttons: Button[] = [{ label: "Take them upstairs", onPick: () => showUpstairs(game, scene) }];
  if (taproom.shown) {
    const n = taproom.joiners.length;
    buttons.push({
      label: taproom.blocked
        ? `Stay down here, in the taproom (18+) (${taproom.blocked})`
        : `Stay down here, in the taproom (18+): ${n} more ${n === 1 ? "wants" : "want"} to join`,
      disabled: Boolean(taproom.blocked),
      onPick: () => showTaproomRules(game, scene, new Set(taproom.joiners.map((g) => g.id)), new Set(), "plain"),
    });
  }
  buttons.push({ label: "Change your mind, gently", onPick: back });
  showAdultCard(game, "The invitation", tavern.inviteChoiceLine(scene), "door", buttons);
  game.panelBack = back;
}

/** Up the stairs: the walk up and the room at the top, then what happens there, still hers to choose. */
function showUpstairs(game: Game, scene: InviteScene): void {
  const { tavern } = game;
  const back = () => backToWork(game);
  const choices: Button[] = tavern.upstairsChoices().map(({ act, label, ready }) => ({
    label: ready ? label : `${label} (not warm enough yet)`,
    disabled: !ready,
    onPick: () => {
      const line = tavern.takeUpstairs(scene, act);
      showAdultCard(game, "Upstairs", line, act === "kiss" ? "candle" : "bed", [{ label: "Go back down to the bar", onPick: back }]);
      game.panelBack = back;
    },
  }));
  choices.push({ label: "Change your mind, gently", onPick: back });
  showAdultCard(game, "Upstairs", tavern.upstairsLine(scene), "door", choices);
  game.panelBack = back;
}

/**
 * Her rules for the taproom, before it starts: who joins (each of them asked, and she picks), which parts of her
 * are in play (only ones she's warm enough for), and the role-play. No stake: they tip if it's played out. It
 * plays as the After Hours game, so Stop (and Esc) ends it at once.
 */
function showTaproomRules(game: Game, scene: InviteScene, picked: Set<number>, areas: Set<DuelArea>, play: RolePlay, open = true): void {
  const { tavern } = game;
  const redraw = () => showTaproomRules(game, scene, picked, areas, play, open);
  const joiners = tavern.taproomJoiners(scene);
  const buttons: Button[] = joiners.map((g) => ({
    label: `${picked.has(g.id) ? "[x]" : "[ ]"} The ${g.label.toLowerCase()}: ${tavern.joinAsk(g.id)}`,
    onPick: () => {
      if (picked.has(g.id)) picked.delete(g.id);
      else picked.add(g.id);
      redraw();
    },
  }));
  for (const area of tavern.duelAreas()) {
    buttons.push({
      label: area.ready ? `${areas.has(area.id) ? "[x]" : "[ ]"} ${area.name}` : `[ ] ${area.name} (needs ${area.need} ${area.meter} desire; you're at ${area.have})`,
      disabled: !area.ready,
      onPick: () => {
        if (areas.has(area.id)) areas.delete(area.id);
        else areas.add(area.id);
        redraw();
      },
    });
  }
  const plays = tavern.rolePlays();
  const ready = plays.filter((p) => p.ready);
  const current = plays.find((p) => p.id === play) ?? plays[0];
  buttons.push({
    label: `Role-play: ${current.name} (change)`,
    disabled: ready.length < 2,
    onPick: () => showTaproomRules(game, scene, picked, areas, ready[(ready.findIndex((p) => p.id === play) + 1) % ready.length].id, open),
  });
  buttons.push({
    label: `${open ? "[x]" : "[ ]"} Leave the room open: anyone watching who gets worked up joins the line as it goes`,
    onPick: () => showTaproomRules(game, scene, picked, areas, play, !open),
  });
  if (joiners.length > 1) {
    const all = joiners.every((g) => picked.has(g.id));
    buttons.push({
      label: all ? "Clear the picks" : `Everyone who asked (${joiners.length})`,
      onPick: () => {
        if (all) picked.clear();
        else for (const g of joiners) picked.add(g.id);
        redraw();
      },
    });
  }
  const chosen = joiners.filter((g) => picked.has(g.id)).map((g) => g.id);
  const total = chosen.length + 1;
  const line = total > MAX_PARTNERS ? ` (${MAX_PARTNERS} at once, ${total - MAX_PARTNERS} in line)` : "";
  buttons.push({
    label: chosen.length === 0 ? "Begin (18+) (pick at least one to join)" : `Begin (18+) with ${total} of them${line}`,
    disabled: chosen.length === 0,
    onPick: () => {
      if (tavern.startTaproom(scene, chosen, [...areas], play, open)) showDuel(game);
    },
  });
  buttons.push({ label: "Back", onPick: () => showInvitation(game, scene) });
  game.openPanel(
    "In the taproom",
    [
      `The ${(scene.guestStats?.label ?? scene.guestKind).toLowerCase()} who asked is in. Pick who else joins: each of them asked, and none of them will mind a no. Up to ${MAX_PARTNERS} at once; past that, they wait in line and step in as each one's done. A kiss is always in play. They'll keep to your rules, and you can stop at any time, for all of them.`,
      `${current.name}: ${current.about}`,
    ],
    buttons,
  );
  game.panelBack = () => showInvitation(game, scene);
}

/** Brawl events where a blow lands on her, and where one of hers lands on them (fight.ts). */
const HURTS_HER = new Set(["their:hit", "their:grab", "their:headlock", "their:hairpull", "their:tackle", "lost"]);
const HURTS_THEM = new Set(["strike:hit", "shove:hit", "grab:hit", "headlock:hit", "hairpull:hit", "tackle:hit", "throw"]);

/** Ends the night straight from the brawl: everyone gone, and to bed. */
function closeTheNight(game: Game): void {
  game.panelEl.classList.remove("adult-open");
  game.closePanel();
  game.dismissGuests();
  game.tavern.sleep();
  game.goToSleep();
}

/**
 * After a lost brawl, the one who won asks her (GAME_PATH.MD, "Brawl loss"). Two plain answers: go on, to the
 * After Hours rules (her parts, her stake, and stop any time), or stop here. Stopping costs nothing past the
 * fight itself. Too drunk on either side, and going on isn't offered. The night ends either way.
 */
export function showBrawlOffer(game: Game, lost = ""): void {
  const { tavern } = game;
  const offer = tavern.brawlOffer;
  if (!offer) {
    closeTheNight(game);
    return;
  }
  const blocked = tavern.duelBlocked;
  const who = (offer.stats.label ?? offer.kind).toLowerCase();
  const stop = () => {
    tavern.declineBrawlOffer();
    closeTheNight(game);
  };
  const line = `${lost ? `${lost} ` : ""}The fight's gone out of the ${who}. They offer you a hand up and hold your eye a moment too long. "No hard feelings. Stay up a while with me?"`;
  showAdultCard(game, "Knocked down", line, "door", [
    {
      label: blocked ? `Go on (18+) (${blocked.toLowerCase().replace(/\.$/, "")})` : "Go on (18+): set your rules",
      disabled: Boolean(blocked),
      onPick: () => showDuelRules(game, new Set(), 0),
    },
    { label: "Stop: send them off, and end the night", onPick: stop },
  ]);
  game.panelBack = stop;
}

/**
 * A brawl, turn by turn: both sides' stamina, what just happened, and her moves with the chance each has.
 * When it's over, how it went, and back to work.
 */
export function showFight(game: Game): void {
  const { tavern } = game;
  const fight = tavern.fight;
  if (!fight) {
    game.hideDuelMoment();
    const result = tavern.takeFightResult();
    // Lost, and the one who won is asking: hers to answer.
    if (result?.outcome === "lost" && tavern.brawlOffer) {
      showBrawlOffer(game, result.text);
      return;
    }
    const back = () => {
      game.closePanel();
      game.screen = "play";
    };
    const title = result?.outcome === "lost" ? "Knocked down" : result?.outcome === "talked" ? "Talked down" : "Thrown out";
    game.openPanel(title, [result?.text ?? ""], [{ label: "Back to work", onPick: back }]);
    game.panelBack = back;
    return;
  }
  const buttons: Button[] = fight.choices().map((choice) => ({
    label: choice.chance === null ? choice.label : `${choice.label} · ${Math.round(choice.chance * 100)}%`,
    disabled: choice.disabled,
    onPick: () => {
      const before = fight.events.length;
      tavern.fightMove(choice.move);
      // The turn's moments play in the comic panel, and a blow that lands on her shows in the big picture.
      const events = fight.events.slice(before);
      game.showFightMoments(events, fight.kind);
      if (events.some((e) => HURTS_HER.has(e))) game.battleHit(true);
      if (events.some((e) => HURTS_THEM.has(e))) game.foeHit(0);
      game.audio.play(fight.outcome === "lost" ? "walkOut" : "cloth");
      // They reached for her instead of swinging: she's asked on the touch screen, and the fight waits.
      if (tavern.inConversation) {
        game.showBrawlReach();
        return;
      }
      showFight(game);
    },
  }));
  game.openPanel(`Brawl with a ${fight.name}`, [], buttons);
  game.panelEl.classList.add("fight-open", "battle-open");
  const off = tavern.strippedPieces.length;
  game.showBattle("brawl", "You · Brawl", 0, false, [
    { label: "Stamina", value: `${fight.stamina}/${fight.maxStamina}`, tone: fight.stamina < fight.maxStamina / 2 ? "hurt" : undefined },
    { label: "Willpower", value: `${fight.will}/${fight.maxWill} · ${willLabel(fight.will, fight.maxWill)}` },
    { label: "Clothes", value: off === 0 ? "Dressed" : `${off} ${off === 1 ? "piece" : "pieces"} off` },
    // Her desire, Karryn-style (desire.ts): the strongest ones, and whether she's horny or wet.
    ...(fight.desire ? [{ label: "Desire", value: desireSummary(fight), tone: fight.horny ? ("hurt" as const) : undefined }] : []),
  ], [
    {
      guestId: fight.guestId,
      kind: fight.kind,
      title: `The ${fight.name}`,
      status: [
        { label: "Stamina", value: `${fight.foeStamina}/${fight.foeMax}`, tone: fight.foeStamina < fight.foeMax / 2 ? "hurt" : undefined },
        { label: "State", value: fight.drunk ? "Roaring drunk" : "Angry" },
      ],
    },
  ]);
  const box = game.panelEl.querySelector(".box");
  if (!box) return;
  const bars = document.createElement("div");
  bars.className = "fight-bars";
  bars.append(
    statBar("You", fight.stamina, fight.maxStamina, "you"),
    statBar("Willpower", fight.will, fight.maxWill, "will"),
    statBar(`The ${fight.name}${fight.drunk ? " (drunk)" : ""}`, fight.foeStamina, fight.foeMax, "foe"),
  );
  const log = fightLog(fight.log);
  box.insertBefore(log, box.querySelector(".menu"));
  box.insertBefore(bars, log);
  // No running from it: Esc does nothing until it's settled.
  game.panelBack = () => undefined;
}

/**
 * At bedtime: a guest she warmed to might be lingering to ask for an after-hours game, which she can say yes
 * or no to; and if she's too restless to sleep, she can ease the ache first.
 */
export function showBedChoice(game: Game): void {
  const { tavern } = game;
  const sleep = () => {
    game.panelEl.classList.remove("adult-open");
    game.closePanel();
    tavern.sleep();
    game.goToSleep();
  };
  const paragraphs: string[] = [];
  const buttons: Button[] = [];
  const offer = tavern.duelOffer();
  if (offer) {
    paragraphs.push(
      tavern.duelOfferFrom === "talked"
        ? `The ${offer} you talked down earlier is lingering at the door, sheepish. "About before... let me make it up to you? One game before bed. Loser pays."`
        : `A ${offer} you warmed to tonight is lingering at the door. "One more game before bed? Loser pays."`,
    );
    const blocked = tavern.duelBlocked;
    buttons.push({
      label: blocked ? `Play after hours (18+) (${blocked.toLowerCase().replace(/\.$/, "")})` : "Play after hours (18+)",
      disabled: Boolean(blocked),
      onPick: () => showDuelRules(game, new Set(), tavern.duelStakes()[Math.min(1, tavern.duelStakes().length - 1)] ?? 0),
    });
  }
  if (tavern.restless) paragraphs.push("You lie down, but you can't stop thinking about tonight.");
  buttons.push({ label: offer ? "Send them home, and sleep" : "Sleep it off", onPick: sleep });
  if (tavern.restless) {
    buttons.push({
      label: "Ease the ache first (18+)",
      onPick: () => {
        tavern.easeAche();
        showAdultCard(game, "Alone", "You blow out the candle and take care of it yourself. Sleep comes easily after.", "candle", [
          { label: "Sleep", onPick: sleep },
        ]);
      },
    });
  }
  game.openPanel(offer ? "After Hours" : "Restless", paragraphs, buttons);
  game.panelBack = () => {
    game.closePanel();
    game.screen = "play";
  };
}

/**
 * Her rules for an after-hours game, before it starts: which parts of her are in play (only ones she's warm
 * enough for tonight) and the stake. A kiss is always part of it.
 */
export function showDuelRules(game: Game, areas: Set<DuelArea>, stake: number, scene: RolePlay = "plain"): void {
  const { tavern } = game;
  const kind = tavern.duelOffer();
  if (!kind) {
    game.closePanel();
    game.screen = "play";
    return;
  }
  const stakes = tavern.duelStakes();
  const buttons: Button[] = tavern.duelAreas().map((area) => ({
    label: area.ready
      ? `${areas.has(area.id) ? "[x]" : "[ ]"} ${area.name}`
      : `[ ] ${area.name} (needs ${area.need} ${area.meter} desire; you're at ${area.have})`,
    disabled: !area.ready,
    onPick: () => {
      if (areas.has(area.id)) areas.delete(area.id);
      else areas.add(area.id);
      showDuelRules(game, areas, stake, scene);
    },
  }));
  buttons.push({
    label: `Stake: ${stake} gold (change)`,
    disabled: stakes.length < 2,
    onPick: () => showDuelRules(game, areas, stakes[(stakes.indexOf(stake) + 1) % stakes.length], scene),
  });
  // Role-play: steps through the ones she's ready for; the rest say what passive they need.
  const plays = tavern.rolePlays();
  const ready = plays.filter((p) => p.ready);
  const current = plays.find((p) => p.id === scene) ?? plays[0];
  const locked = plays.filter((p) => !p.ready).map((p) => `${p.name} needs ${p.needs}`);
  buttons.push({
    label: `Role-play: ${current.name} (change)${locked.length > 0 ? ` · ${locked.join(", ")}` : ""}`,
    disabled: ready.length < 2,
    onPick: () => showDuelRules(game, areas, stake, ready[(ready.findIndex((p) => p.id === scene) + 1) % ready.length].id),
  });
  buttons.push({
    label: "Begin (18+)",
    onPick: () => {
      if (tavern.startDuel([...areas], stake, scene)) showDuel(game);
    },
  });
  // Back to whoever asked: the brawl winner's offer, or the bedside.
  const back = () => (tavern.brawlOffer ? showBrawlOffer(game) : showBedChoice(game));
  buttons.push({ label: "Back", onPick: back });
  game.openPanel(
    "Your rules",
    [
      `Choose what's in play with the ${kind}. A kiss always is. They'll keep to your rules, and you can stop at any time.`,
      `${current.name}: ${current.about}`,
    ],
    buttons,
  );
  game.panelBack = back;
}

/** Entries shown in the duel log; older ones scroll up out of sight. */
const DUEL_LOG_ENTRIES = 12;

/**
 * The duel's log, set out like Karryn's battle log: each entry has who acted (you in gold, partners in rose), the
 * move and who it went to, the words of it, then a line of numbers for everyone's bars. Newest at the bottom.
 */
function duelLog(entries: readonly DuelLogEntry[]): HTMLElement {
  const log = document.createElement("div");
  log.className = "duel-log";
  for (const entry of entries.slice(-DUEL_LOG_ENTRIES)) {
    const el = document.createElement("div");
    el.className = `entry by-${entry.side}`;
    if (entry.actor) {
      const head = document.createElement("div");
      head.className = "head";
      const actor = document.createElement("b");
      actor.className = "actor";
      actor.textContent = entry.actor;
      head.append(actor);
      if (entry.action) {
        const action = document.createElement("span");
        action.className = "action";
        action.textContent = entry.action;
        head.append(action);
      }
      if (entry.target) {
        const target = document.createElement("span");
        target.className = "target";
        target.textContent = `→ ${entry.target}`;
        head.append(target);
      }
      el.append(head);
    }
    const text = document.createElement("p");
    text.className = "text";
    text.textContent = entry.text;
    el.append(text);
    if (entry.effects.length > 0) {
      const nums = document.createElement("div");
      nums.className = "effects";
      for (const effect of entry.effects) {
        const chip = document.createElement("span");
        chip.className = `effect by-${effect.side} ${effect.stat} ${effect.amount < 0 ? "down" : "up"}`;
        chip.textContent =
          effect.stat === "cum" ? `${effect.who} +${effect.amount} ml` : `${effect.who} ${effect.amount > 0 ? "+" : ""}${effect.amount} ${effect.stat}`;
        nums.append(chip);
      }
      el.append(nums);
    }
    log.append(el);
  }
  // Newest at the bottom, in view.
  requestAnimationFrame(() => (log.scrollTop = log.scrollHeight));
  return log;
}

/** The partner her moves go to, picked by clicking them; the first still in when none is picked. */
let targetId: number | undefined;
/** Loads already shown, so a new one splashes the screen once. */
let shownLoads = 0;

/** What's on her and in her so far this game, by where, for under her bars; empty with none yet. */
function cumTally(duel: Duel): HTMLElement | null {
  const parts = CUM_SPOTS.filter((spot) => (duel.cum[spot] ?? 0) > 0).map((spot) => `${CUM_NAMES[spot]} ${duel.cum[spot]} ml`);
  if (parts.length === 0) return null;
  const tally = document.createElement("p");
  tally.className = "duel-cum";
  tally.textContent = `Cum on you: ${parts.join(" · ")}`;
  return tally;
}

/** A white splash over the fight screen when a man finishes; it fades by itself. */
function splash(box: Element): void {
  const el = document.createElement("div");
  el.className = "cum-splash";
  for (let i = 0; i < 7; i++) {
    const drop = document.createElement("span");
    drop.style.left = `${10 + Math.random() * 80}%`;
    drop.style.top = `${5 + Math.random() * 70}%`;
    drop.style.setProperty("--size", `${30 + Math.random() * 70}px`);
    drop.style.animationDelay = `${i * 40}ms`;
    el.append(drop);
  }
  box.append(el);
  window.setTimeout(() => el.remove(), 1600);
}

/** A partner's row on the fight screen: who, which part of her they've taken, and their bars. Click to aim at them. */
function partnerRow(duel: Duel, partner: Partner, aimed: boolean, onPick: () => void): HTMLElement {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "partner";
  row.classList.toggle("aimed", aimed);
  row.classList.toggle("done", partner.done);
  row.disabled = partner.done;
  const head = document.createElement("span");
  head.className = "who";
  const where = partner.done ? "gave in" : partner.area ? `has your ${AREA_NAMES[partner.area].toLowerCase()}` : "waiting";
  head.textContent = `${aimed ? "▶ " : ""}${duel.nameOf(partner)} ${partner.female ? "(woman)" : "(man)"} · ${where}`;
  row.append(head, statBar("Pleasure", partner.pleasure, 100, "pleasure"), statBar("Stamina", partner.stamina, partner.maxStamina, "foe"));
  row.addEventListener("click", onPick);
  return row;
}

/**
 * An after-hours game, turn by turn: her pleasure and stamina, how she's feeling, each partner (click one to aim
 * your moves at them), what just happened, and her moves. Stop is always there, and Esc stops too. When it's over,
 * the 18+ card, then bed; a test fight offers another go instead.
 */
export function showDuel(game: Game): void {
  const { tavern } = game;
  const duel = tavern.duel;
  if (!duel) {
    targetId = undefined;
    shownLoads = 0;
    game.hideDuelMoment();
    const result = tavern.takeDuelResult();
    if (result?.test) {
      const back = () => {
        game.closePanel();
        game.screen = "play";
      };
      game.openPanel("Test fight over", [result.text], [
        { label: "Test again", onPick: () => showDuelTest(game) },
        { label: "Back", onPick: back },
      ]);
      game.panelBack = back;
      return;
    }
    // The taproom game, played out: its card, then back to the bar; the night goes on. (Called off, it's the
    // usual "Called off" note below, which goes back to the bar too.)
    if (result?.taproom && result.outcome !== "stopped") {
      const back = () => backToWork(game);
      const title = result.outcome === "won" ? `The taproom · +${result.gold} gold` : `The taproom · you give in · +${result.gold} gold`;
      showAdultCard(game, title, result.line, "candle", [{ label: "Back to work", onPick: back }]);
      game.panelBack = back;
      return;
    }
    // After a lost brawl the night is over, however the game went.
    if (result?.brawl && result.outcome === "stopped") {
      const toBed = () => closeTheNight(game);
      game.openPanel("Called off", [result.text, "The night's over. You bar the door behind them."], [{ label: "Go to bed", onPick: toBed }]);
      game.panelBack = toBed;
      return;
    }
    if (!result || result.outcome === "stopped") {
      const back = () => {
        game.closePanel();
        game.screen = "play";
      };
      game.openPanel("Called off", [result?.text ?? ""], [{ label: "Back", onPick: back }]);
      game.panelBack = back;
      return;
    }
    const sleep = result.brawl
      ? () => closeTheNight(game)
      : () => {
          game.panelEl.classList.remove("adult-open");
          game.closePanel();
          tavern.sleep();
          game.goToSleep();
        };
    showAdultCard(game, result.outcome === "won" ? `You win · +${result.gold} gold` : `You lose · ${result.gold} gold`, result.line, "bed", [
      { label: "Sleep", onPick: sleep },
    ]);
    game.panelBack = sleep;
    return;
  }
  const target = duel.target(targetId);
  targetId = target?.id;
  const buttons: Button[] = duel.choices(targetId).map((choice) => ({
    label: choice.label,
    disabled: choice.disabled,
    onPick: () => {
      const before = duel.entries.length;
      tavern.duelMove(choice.move, targetId);
      // The turn's last moment plays in the comic panel beside the log, Karryn-style.
      const turn = duel.entries.slice(before);
      const shown = [...turn].reverse().find((e) => e.part || e.move || e.spot);
      if (shown) game.showDuelMoment(shown, duel.state);
      // His hands on her, or him finishing on her, jolts her in the big picture.
      if (turn.some((e) => e.side === "partner" && (e.part || e.spot))) game.battleHit(turn.some((e) => e.spot));
      game.audio.play("cloth");
      // Played to the end: the last of the log first (who gave in, and where they finished), then the result.
      if (!tavern.duel && duel.outcome !== "stopped") showDuelEnd(game, duel);
      else showDuel(game);
    },
  }));
  const many = duel.partners.length > 1;
  const title = duel.everyone > 1 ? `After hours with ${duel.everyone} of them` : `After hours with the ${duel.kind}`;
  game.openPanel(title, [], buttons);
  game.panelEl.classList.add("fight-open", "duel-open", "battle-open");
  showDuelBattle(game, duel);
  const box = game.panelEl.querySelector(".box");
  if (box) {
    const bars = document.createElement("div");
    bars.className = "fight-bars";
    bars.append(
      statBar("Your pleasure", duel.pleasure, 100, "pleasure"),
      statBar("Your stamina", duel.stamina, duel.maxStamina, "you"),
      statBar("Your willpower", duel.will, duel.maxWill, "will"),
    );
    const partners = document.createElement("div");
    partners.className = "partners";
    for (const partner of duel.partners) {
      partners.append(
        partnerRow(duel, partner, many && partner.id === targetId, () => {
          targetId = partner.id;
          showDuel(game);
        }),
      );
    }
    const state = document.createElement("p");
    state.className = `duel-state ${duel.state}`;
    const inPlay = ["Kiss", ...DUEL_AREAS.filter((a) => duel.areas.has(a.id)).map((a) => a.name)].join(", ");
    const aim = many && target ? ` · Your moves go to: ${duel.nameOf(target)}` : "";
    const line = duel.waiting.length > 0 ? ` · ${duel.waiting.length} waiting their turn` : "";
    const stake = duel.stake > 0 ? ` · Stake: ${duel.stake} gold` : "";
    const lost = duel.defeated ? " · Lost: they're not done yet (Stop still ends it)" : "";
    state.textContent = `You feel: ${STATE_NAMES[duel.state]}${lost} · In play: ${inPlay}${stake}${aim}${line}`;
    const log = duelLog(duel.entries);
    box.insertBefore(log, box.querySelector(".menu"));
    box.insertBefore(state, log);
    box.insertBefore(partners, state);
    box.insertBefore(bars, partners);
    const tally = cumTally(duel);
    if (tally) box.insertBefore(tally, partners);
    if (duel.loads > shownLoads) splash(box);
    shownLoads = duel.loads;
  }
  if (tavern.testing) {
    game.panelEl.classList.add("duel-test-open");
    game.panelEl.append(testSidebar(game, duel));
  }
  // Esc always stops it.
  game.panelBack = () => {
    tavern.duelMove("stop");
    showDuel(game);
  };
}

/** What she's wearing in a duel, by how far she's undressed. */
const UNDRESSED = ["Dressed", "In her shift", "Naked"];

/** The big picture of her beside the duel, Karryn-style, with her status board: clothes, feeling, what's on her. */
function showDuelBattle(game: Game, duel: Duel): void {
  const cum = CUM_SPOTS.filter((spot) => (duel.cum[spot] ?? 0) > 0);
  game.showBattle("duel", "You · After hours", duel.pleasure / 100, duel.state === "edge", [
    { label: "Feeling", value: STATE_NAMES[duel.state], tone: duel.state === "calm" ? undefined : "hot" },
    { label: "Pleasure", value: `${duel.pleasure}/100`, tone: "hot" },
    { label: "Willpower", value: `${duel.will}/${duel.maxWill} · ${willLabel(duel.will, duel.maxWill)}` },
    { label: "Clothes", value: UNDRESSED[Math.min(2, duel.undressed)] },
    ...(cum.length
      ? cum.map((spot) => ({ label: CUM_NAMES[spot], value: `${duel.cum[spot]} ml`, tone: "cum" as const }))
      : [{ label: "Cum", value: "None yet" }]),
  ]);
}

/** The finished game's last moments: the bars, what's on her, and the end of the log, before the result. */
function showDuelEnd(game: Game, duel: Duel): void {
  const title = duel.outcome === "won" ? "They give in" : "You give in";
  const next = () => showDuel(game);
  game.openPanel(title, [], [{ label: "Continue", onPick: next }]);
  game.panelEl.classList.add("fight-open", "duel-open", "battle-open");
  showDuelBattle(game, duel);
  game.panelBack = next;
  const box = game.panelEl.querySelector(".box");
  if (!box) return;
  const bars = document.createElement("div");
  bars.className = "fight-bars";
  bars.append(statBar("Your pleasure", duel.pleasure, 100, "pleasure"), statBar("Your stamina", duel.stamina, duel.maxStamina, "you"));
  const log = duelLog(duel.entries);
  const menu = box.querySelector(".menu");
  box.insertBefore(bars, menu);
  const tally = cumTally(duel);
  if (tally) box.insertBefore(tally, menu);
  box.insertBefore(log, menu);
  if (duel.loads > shownLoads) splash(box);
  shownLoads = duel.loads;
}

/** A fresh test setup: everything in play, one fugitive, everyone fresh. */
function defaultTest(): DuelTest {
  return {
    areas: DUEL_AREAS.map((a) => a.id),
    stake: 10,
    pleasure: 0,
    stamina: null,
    undressed: 0,
    scene: "plain",
    partners: [{ kind: "fugitive", female: false, pleasure: 0, stamina: null }],
  };
}

/** The test setup, kept while the game is open: every edit in the sidebar goes here too, for "Restart". */
let test = defaultTest();

/**
 * The sex fight test (P, in development only): starts a test fight at once from the last setup, with the test
 * sidebar on the right. Nothing in a test fight counts: no gold, experience or records.
 */
export function showDuelTest(game: Game): void {
  targetId = undefined;
  shownLoads = 0;
  game.tavern.startTestDuel(test);
  showDuel(game);
}

/**
 * The test sidebar, beside a test fight: change her, what's in play, and each partner while it runs, add or take
 * away partners, or start again. Every change lands on the fight at once, and in the setup for the next restart.
 */
function testSidebar(game: Game, duel: Duel): HTMLElement {
  const side = document.createElement("aside");
  side.className = "duel-test";
  const redraw = () => showDuel(game);
  const heading = (text: string) => {
    const h = document.createElement("h2");
    h.textContent = text;
    side.append(h);
  };
  const field = (label: string, control: HTMLElement, hint = "") => {
    const row = document.createElement("label");
    row.className = "field";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = label;
    row.append(name, control);
    if (hint) {
      const note = document.createElement("span");
      note.className = "hint";
      note.textContent = hint;
      row.append(note);
    }
    side.append(row);
  };
  const number = (value: number, max: number, onSet: (n: number) => void) => {
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = String(max);
    input.value = String(value);
    input.addEventListener("change", () => {
      const n = Number(input.value);
      if (!Number.isFinite(n)) return;
      onSet(Math.max(0, Math.min(max, Math.round(n))));
      redraw();
    });
    return input;
  };
  const pick = <T extends string>(options: readonly { value: T; label: string }[], value: T, onSet: (v: T) => void) => {
    const select = document.createElement("select");
    for (const option of options) {
      const el = document.createElement("option");
      el.value = option.value;
      el.textContent = option.label;
      el.selected = option.value === value;
      select.append(el);
    }
    select.addEventListener("change", () => {
      onSet(select.value as T);
      redraw();
    });
    return select;
  };
  const button = (label: string, onClick: () => void, disabled = false) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "small";
    el.textContent = label;
    el.disabled = disabled;
    el.addEventListener("click", onClick);
    return el;
  };

  const title = document.createElement("h1");
  title.textContent = "Test setup";
  side.append(title);

  // The role-play is set when the fight starts, so changing it starts the fight again.
  field(
    "Role-play",
    pick(
      ROLE_PLAYS.map((p) => ({ value: p.id, label: p.name })),
      duel.scene,
      (scene) => {
        test.scene = scene;
        showDuelTest(game);
      },
    ),
    "Restarts the fight",
  );

  heading("You");
  field("Pleasure", number(duel.pleasure, 99, (n) => (duel.pleasure = test.pleasure = n)), "Aroused 50+ · Edge 80+");
  field(
    "Stamina",
    number(duel.stamina, duel.maxStamina, (n) => {
      duel.stamina = n;
      test.stamina = n === duel.maxStamina ? null : n;
    }),
    `of ${duel.maxStamina}`,
  );
  field(
    "Clothes",
    pick(
      [
        { value: "0", label: "Dressed" },
        { value: "1", label: "Down to her shift" },
        { value: "2", label: "Bare" },
      ],
      String(duel.undressed),
      (v) => (duel.undressed = test.undressed = Number(v)),
    ),
  );
  const areas = document.createElement("div");
  areas.className = "areas";
  for (const area of DUEL_AREAS) {
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = duel.areas.has(area.id);
    box.addEventListener("change", () => {
      if (box.checked) duel.areas.add(area.id);
      else duel.areas.delete(area.id);
      test.areas = DUEL_AREAS.map((a) => a.id).filter((id) => duel.areas.has(id));
      redraw();
    });
    label.append(box, `${area.name}${area.holds > 1 ? ` (${area.holds})` : ""}`);
    areas.append(label);
  }
  field("In play", areas);

  const kinds = GUEST_KIND_LIST.map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) }));
  duel.partners.forEach((partner, index) => {
    heading(`${duel.nameOf(partner)}${partner.done ? " (gave in)" : ""}`);
    const setup = () => (test.partners[index] ??= { kind: partner.kind, female: partner.female, pleasure: 0, stamina: null });
    field(
      "Kind",
      pick(kinds, partner.kind, (kind) => {
        partner.kind = setup().kind = kind;
        partner.maxStamina = statsOf(kind).partner.stamina;
        partner.stamina = Math.min(partner.stamina, partner.maxStamina);
      }),
    );
    field(
      "Is a",
      pick(
        [
          { value: "man", label: "Man" },
          { value: "woman", label: "Woman" },
        ],
        partner.female ? "woman" : "man",
        (v) => (partner.female = setup().female = v === "woman"),
      ),
    );
    field(
      "Pleasure",
      number(partner.pleasure, 99, (n) => {
        partner.pleasure = setup().pleasure = n;
        partner.done = false;
      }),
    );
    field(
      "Stamina",
      number(partner.stamina, partner.maxStamina, (n) => {
        partner.stamina = n;
        setup().stamina = n === partner.maxStamina ? null : n;
      }),
      `of ${partner.maxStamina}`,
    );
    side.append(
      button(
        "Remove",
        () => {
          duel.removePartner(partner.id);
          test.partners.splice(index, 1);
          redraw();
        },
        duel.partners.length <= 1,
      ),
    );
  });

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(
    button(
      "Add partner",
      () => {
        const kind = kinds[duel.partners.length % kinds.length].value;
        if (duel.addPartner({ kind, female: false })) test.partners.push({ kind, female: false, pleasure: 0, stamina: null });
        redraw();
      },
      duel.partners.length >= MAX_PARTNERS,
    ),
    button("Restart from setup", () => showDuelTest(game)),
    button("Reset setup", () => {
      test = defaultTest();
      showDuelTest(game);
    }),
  );
  side.append(actions);
  return side;
}
