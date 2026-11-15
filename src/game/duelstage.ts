import type { DuelArea, DuelLogEntry } from "./duel";
import type { HerMove } from "./duelmoves";
import { defeatedScene, HOLDING_SCENES, SCENE_JOINS, sceneForEntry, type JoinSlot, type ScenePoseName } from "./sexpose";
import type { GuestKind } from "./tavern";

/**
 * Who's in the big after-hours picture, and how, the way Karryn's Prison runs its sex poses (RemtairyEnemySex.js):
 *
 * - A scene that holds (KP's sex poses: on her knees for him, riding him, him in her) stays until the man she's in it
 *   with is done with her. His lesser moves don't take her out of it; a bolder one of his moves her on.
 * - Going all the way, a man has her the way his type does (sexpose.ts KIND_POSITIONS), as each of KP's enemy types
 *   has its own pose.
 * - While she's held in a scene, another partner's move joins her in it at a free slot (KP's pose joins): at her
 *   mouth, or at one of her hands. With three or more of them and nothing holding her, they all take her together.
 * - A game after a brawl she lost starts with her down on the floor where she fell, the winner over her.
 * - With her willpower gone, she can't hold herself up: the scenes become their limp, defeated ones.
 */

/** A partner, as the stage needs them. */
export interface StagePartner {
  id: number;
  kind: GuestKind;
  female: boolean;
  /** Given in, and out of the game. */
  done: boolean;
}

/** Who's in the picture: the scene, the partner she's in it with, and anyone joined at a slot (an index into the scene's SCENE_JOINS). */
export interface StageCast {
  scene: ScenePoseName;
  lead: number;
  joins: readonly { partner: number; spot: number }[];
}

/** With this many of them still in it and nothing holding her, they all take her together. */
export const GANGBANG_FROM = 3;

/** The part of her a moment is at, for which slot a partner joins at. */
const MOVE_AREA: Partial<Record<HerMove, "kiss" | DuelArea>> = { kiss: "kiss", hands: "hands", mouth: "mouth", tits: "breasts", ride: "pussy", anal: "butt" };

/** The slots a partner at this part of her would take, best first. */
function slotsFor(area: "kiss" | DuelArea | undefined): readonly JoinSlot[] {
  if (area === "mouth" || area === "kiss") return ["mouth", "left", "right"];
  if (area === "hands") return ["left", "right", "mouth"];
  return ["left", "right", "mouth"];
}

export class DuelStage {
  private scene: ScenePoseName | null = null;
  private lead: number | null = null;
  /** Partner id to the spot they've joined at. */
  private readonly joined = new Map<number, number>();

  /** Who's in the picture now, or null before anything's happened. */
  get cast(): StageCast | null {
    if (!this.scene || this.lead === null) return null;
    return { scene: this.scene, lead: this.lead, joins: [...this.joined].map(([partner, spot]) => ({ partner, spot })) };
  }

  /**
   * A new game. After a brawl she lost (`fromBrawl`) she starts down on the floor, the one who won standing over her
   * and his crew round her; otherwise there's no picture of them together until something happens.
   */
  start(fromBrawl: boolean, partners: readonly StagePartner[]): void {
    this.scene = null;
    this.lead = null;
    this.joined.clear();
    const first = partners.find((p) => !p.done);
    if (!fromBrawl || !first) return;
    this.scene = "downed";
    this.lead = first.id;
    for (const p of partners) if (p !== first && !p.done) this.join(p.id, undefined);
  }

  /**
   * A moment of the game (the one its comic panel shows): who it puts in the picture, and how. `alt` picks between
   * scenes that stand for the same move (riding him facing him or his feet). Says whether the picture changed.
   */
  moment(
    entry: Pick<DuelLogEntry, "side" | "part" | "stage" | "move" | "kind" | "partner">,
    partners: readonly StagePartner[],
    options: { defeated: boolean; alt: boolean },
  ): boolean {
    const before = JSON.stringify(this.cast);
    const byId = (id: number | null) => partners.find((p) => p.id === id);
    // Whoever's given in is out of it.
    for (const id of [...this.joined.keys()]) if (byId(id)?.done !== false) this.joined.delete(id);
    const partner = byId(entry.partner ?? null);
    const want = partner && !partner.done ? sceneForEntry(entry, partner.female, options.alt) : null;
    if (partner && want) this.take(partner, options.defeated ? defeatedScene(want) : want, entry, partners);
    return JSON.stringify(this.cast) !== before;
  }

  private take(partner: StagePartner, want: ScenePoseName, entry: Pick<DuelLogEntry, "part" | "move">, partners: readonly StagePartner[]): void {
    const leadIn = this.lead !== null && partners.some((p) => p.id === this.lead && !p.done);
    const holding = this.scene !== null && HOLDING_SCENES.has(this.scene) && leadIn;
    if (holding && partner.id !== this.lead) {
      // She's held with someone: another joins her in it, at the slot for what he's after, if one's free.
      this.join(partner.id, entry.part ?? (entry.move ? MOVE_AREA[entry.move] : undefined));
      return;
    }
    // The one she's held with: only a bolder hold of his moves her on.
    if (holding && !HOLDING_SCENES.has(want)) return;
    const active = partners.filter((p) => !p.done && !p.female);
    if (!HOLDING_SCENES.has(want) && !partner.female && active.length >= GANGBANG_FROM && active.some((p) => p.id === partner.id)) {
      this.set("gangbang", partner.id);
      for (const p of active) if (p.id !== partner.id) this.join(p.id, undefined);
      return;
    }
    this.set(want, partner.id);
  }

  /** Puts her in a scene with a partner; those joined stay on at the same slot, if the new scene has it. */
  private set(scene: ScenePoseName, lead: number): void {
    const spots = SCENE_JOINS[scene] ?? [];
    const old = this.scene ? (SCENE_JOINS[this.scene] ?? []) : [];
    const kept = [...this.joined].filter(([id]) => id !== lead).map(([id, spot]) => [id, old[spot]?.slot] as const);
    this.scene = scene;
    this.lead = lead;
    this.joined.clear();
    for (const [id, slot] of kept) {
      const spot = spots.findIndex((s, i) => s.slot === slot && ![...this.joined.values()].includes(i));
      if (spot >= 0) this.joined.set(id, spot);
    }
  }

  /** Joins a partner to the scene at a free slot, the best for what they're after; nowhere, if there's none. */
  private join(id: number, area: "kiss" | DuelArea | undefined): void {
    if (!this.scene || id === this.lead || this.joined.has(id)) return;
    const spots = SCENE_JOINS[this.scene] ?? [];
    const taken = new Set(this.joined.values());
    for (const slot of slotsFor(area)) {
      const spot = spots.findIndex((s, i) => s.slot === slot && !taken.has(i));
      if (spot >= 0) {
        this.joined.set(id, spot);
        return;
      }
    }
  }
}
