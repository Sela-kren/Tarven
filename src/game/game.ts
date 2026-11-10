import { Group, Material, Mesh, Object3D, Scene, Vector3 } from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import type { Rect, Vec2 } from "./collision";
import { GuestActor, Walker } from "./guests";
import { Icon, type IconName } from "./icons";
import type { Input } from "./input";
import { NavGrid } from "./path";
import { Body, Sibling } from "./player";
import { applyRetroLook, solidRetroMaterial } from "./retro";
import {
  DEBT,
  ENDINGS,
  HEAT_MAX,
  NIGHTS,
  Tavern,
  TRUST_MAX,
  UPGRADE_COST,
  UPGRADES,
  type GuestKind,
  type Item,
  type Prompt,
  type Station,
  type Target,
  type UpgradeId,
} from "./tavern";
import type { World } from "./world";

const ROOM: Rect = { minX: -7, maxX: 7, minZ: -5, maxZ: 5 };
const DOOR: Vec2 = { x: -1.5, z: -4.4 };
const VISITOR_STOP: Vec2 = { x: -1.5, z: -3 };
const GUEST_CLEARANCE = 0.28;
const STATION_RANGE = 1.35;
const GUEST_RANGE = 1.7;
const LISTEN_RANGE = 2.2;
const HELPER_RANGE = 1.6;
const SIBLING_HALF_SIZE = 0.22;
const ITEM_SCALE = 1.6;
const TOAST_SECONDS = 5;
const POT_WARNING_SECONDS = 5;
const STATION_ICON_HEIGHT = 2;
const STATION_ARROW_HEIGHT = 2.6;
const GUEST_ARROW_HEIGHT = 3;
const SIBLING_MARK_HEIGHT = 2.6;
const HELD_ICON_HEIGHT = 2.15;
const BURNT_COLOR = 0x120c08;

const ITEM_NODES: Record<Item, string> = {
  ale: "Item_Ale",
  bread: "Item_Bread",
  stew: "Item_Stew",
  cask: "Item_Cask",
};

const OUTFITS: Record<GuestKind, { top: number; legs: number; hair: number }> = {
  farmer: { top: 0x8a7a3e, legs: 0x4c3a24, hair: 0x4a3420 },
  smuggler: { top: 0x24242e, legs: 0x18181e, hair: 0x101012 },
  soldier: { top: 0x8c2020, legs: 0x3a3a40, hair: 0x2b2018 },
  fugitive: { top: 0xbcb4a2, legs: 0x6a6252, hair: 0x9a8c7a },
};

/** Which part of an outfit each character material belongs to. */
const OUTFIT_SLOTS: Record<string, "top" | "legs" | "hair"> = {
  T_tunic: "top",
  T_tee_white: "top",
  T_pants_red: "legs",
  T_hair: "hair",
  T_hair_f: "hair",
};

const SIBLING_NAMES = ["Brother", "Sister"];
const STATIONS: Station[] = ["tap", "bread", "pot", "barrel"];
const HELPER_TEXT: Partial<Record<Station, string>> = {
  tap: "pouring ale",
  pot: "minding the pot",
};

interface Assets {
  male: Object3D;
  female: Object3D;
  props: Object3D;
}

interface Button {
  label: string;
  onPick: () => void;
  disabled?: boolean;
}

function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Page is missing #${id}`);
  return found;
}

function requireNode(root: Object3D, name: string): Object3D {
  const node = root.getObjectByName(name);
  if (!node) throw new Error(`props.glb is missing "${name}"`);
  return node;
}

export class Game {
  readonly tavern: Tavern;
  readonly siblings: [Sibling, Sibling];
  active = 0;

  private screen: "title" | "play" | "visitor" | "panel" = "title";
  private readonly nav: NavGrid;
  private readonly actors = new Map<number, GuestActor>();
  private readonly guestLayer = new Group();
  private readonly itemTemplates: Record<Item, Object3D>;
  private readonly guestModels: { male: Object3D; female: Object3D };
  private readonly recolors = new Map<string, Material>();
  private readonly spots: Record<Station, Vector3>;
  private readonly potStew: Mesh;
  private readonly potStewMaterial: Material;
  private readonly burntMaterial = solidRetroMaterial("T_burnt", BURNT_COLOR);
  private readonly carried: [Item | null, Item | null] = [null, null];
  private readonly siblingColliders: Rect[];

  private readonly tapIcon = new Icon();
  private readonly potIcon = new Icon();
  private readonly targetArrow = new Icon(0.5);
  private readonly activeMark = new Icon(0.42);
  // A carried dish is hidden by the body whenever a sibling faces away from the camera.
  private readonly heldIcons = [new Icon(0.45), new Icon(0.45)];

  private readonly statsEl = element("stats");
  private readonly promptEl = element("prompt");
  private readonly toastEl = element("toast");
  private readonly panelEl = element("panel");

  private panelButtons: Button[] = [];
  private visitor: Walker | null = null;
  private toastLeft = 0;
  private time = 0;

  constructor(
    scene: Scene,
    private readonly input: Input,
    private readonly world: World,
    assets: Assets,
  ) {
    applyRetroLook(assets.male);
    applyRetroLook(assets.female);
    applyRetroLook(assets.props);

    this.tavern = new Tavern(world.seats.length);
    this.nav = new NavGrid(world.colliders, GUEST_CLEARANCE, ROOM);

    const { props } = assets;
    props.updateMatrixWorld(true);
    this.itemTemplates = {} as Record<Item, Object3D>;
    for (const item of Object.keys(ITEM_NODES) as Item[]) {
      const template = requireNode(props, ITEM_NODES[item]);
      template.removeFromParent();
      template.scale.setScalar(ITEM_SCALE);
      this.itemTemplates[item] = template;
    }
    this.spots = {
      tap: requireNode(props, "Spot_Tap").getWorldPosition(new Vector3()),
      bread: requireNode(props, "Spot_Bread").getWorldPosition(new Vector3()),
      pot: requireNode(props, "Spot_Pot").getWorldPosition(new Vector3()),
      barrel: requireNode(props, "Spot_Barrel").getWorldPosition(new Vector3()),
    };
    this.potStew = requireNode(props, "Station_PotStew") as Mesh;
    this.potStewMaterial = this.potStew.material as Material;
    this.potStew.castShadow = false;
    this.potStew.visible = false;
    scene.add(props);

    // Copied first, because each Sibling moves its body out of the loaded model.
    this.guestModels = { male: cloneSkinned(assets.male), female: cloneSkinned(assets.female) };

    const { spawn } = world;
    this.siblings = [
      new Sibling(assets.male, "Male", spawn),
      new Sibling(assets.female, "Female", spawn.clone().setX(spawn.x + 1)),
    ];
    scene.add(this.siblings[0].root, this.siblings[1].root, this.guestLayer);

    this.siblingColliders = [...world.colliders, { minX: 0, maxX: 0, minZ: 0, maxZ: 0 }];

    this.tapIcon.sprite.position.copy(this.spots.tap).setY(STATION_ICON_HEIGHT);
    this.potIcon.sprite.position.copy(this.spots.pot).setY(STATION_ICON_HEIGHT);
    scene.add(
      this.tapIcon.sprite,
      this.potIcon.sprite,
      this.targetArrow.sprite,
      this.activeMark.sprite,
      this.heldIcons[0].sprite,
      this.heldIcons[1].sprite,
    );

    this.showTitle();
  }

  /** The point the camera should keep in view. */
  get focus(): Vector3 {
    return this.siblings[this.active].position;
  }

  private makeItem(item: Item): Object3D {
    const copy = this.itemTemplates[item].clone(true);
    copy.traverse((object) => (object.castShadow = false));
    return copy;
  }

  private recolor(base: Material, color: number): Material {
    const key = `${base.name}:${color}`;
    let material = this.recolors.get(key);
    if (!material) {
      material = solidRetroMaterial(key, color);
      this.recolors.set(key, material);
    }
    return material;
  }

  private makeGuestBody(kind: GuestKind, female: boolean): Body {
    const model = cloneSkinned(female ? this.guestModels.female : this.guestModels.male);
    const outfit = OUTFITS[kind];
    model.traverse((object) => {
      object.visible = true;
      if (!(object instanceof Mesh)) return;
      object.castShadow = false; // Only the siblings cast shadows, to keep the frame rate up.
      const material = object.material as Material;
      const slot = OUTFIT_SLOTS[material.name];
      if (slot) object.material = this.recolor(material, outfit[slot]);
    });
    return new Body(model, female ? "Female" : "Male");
  }

  private syncGuests(dt: number): void {
    const { tavern, actors } = this;
    for (const guest of [...tavern.guests]) {
      let actor = actors.get(guest.id);
      if (!actor) {
        actor = new GuestActor(
          this.makeGuestBody(guest.kind, guest.id % 2 === 0),
          guest,
          this.world.seats[guest.seat],
          this.nav,
          DOOR,
          (item) => this.makeItem(item),
          this.guestLayer,
        );
        actors.set(guest.id, actor);
        this.guestLayer.add(actor.group);
      }
      if (actor.update(dt, tavern)) {
        this.guestLayer.remove(actor.group);
        actors.delete(guest.id);
        tavern.guestLeft(guest.id);
      }
    }
  }

  private syncCarried(): void {
    this.siblings.forEach((sibling, index) => {
      const item = this.tavern.carrying[index];
      if (item === this.carried[index]) return;
      this.carried[index] = item;
      sibling.hold(item ? this.makeItem(item) : null);
      this.heldIcons[index].show(item);
    });
  }

  private syncStations(): void {
    const { tavern } = this;
    let tap: IconName | null = null;
    if (tavern.aleReady > 0) tap = "ale";
    else if (tavern.pourLeft !== null) tap = "dots";
    else if (tavern.tapLeft === 0) tap = "alert";
    this.tapIcon.show(tap);

    const blinkOn = Math.floor(this.time * 4) % 2 === 0;
    const aboutToBurn = tavern.potState === "ready" && tavern.potTimer < POT_WARNING_SECONDS;
    const potIcons: Record<typeof tavern.potState, IconName | null> = {
      empty: null,
      cooking: "dots",
      ready: aboutToBurn && blinkOn ? "alert" : "stew",
      burnt: "alert",
    };
    this.potIcon.show(potIcons[tavern.potState]);
    this.potStew.visible = tavern.potState !== "empty";
    this.potStew.material = tavern.potState === "burnt" ? this.burntMaterial : this.potStewMaterial;
  }

  private helperStation(): Station | null {
    const position = this.siblings[1 - this.active].position;
    for (const station of ["tap", "pot"] as const) {
      if (position.distanceTo(this.spots[station]) <= HELPER_RANGE) return station;
    }
    return null;
  }

  private findTarget(): { target: Target; at: Vector3; height: number; prompt: Prompt } | null {
    const position = this.siblings[this.active].position;
    let best: { target: Target; at: Vector3; height: number; prompt: Prompt; score: number } | null = null;

    const consider = (target: Target, at: Vector3, height: number, range: number) => {
      const distance = position.distanceTo(new Vector3(at.x, position.y, at.z));
      if (distance > range) return;
      const prompt = this.tavern.prompt(this.active, target);
      if (!prompt) return;
      // Anything you can actually do beats a status message, and serving a guest
      // beats putting the item back on a station that happens to be closer.
      const score = distance + (prompt.actionable ? 0 : 100) - (target.kind === "guest" ? 50 : 0);
      if (!best || score < best.score) best = { target, at, height, prompt, score };
    };

    for (const station of STATIONS) {
      consider({ kind: "station", station }, this.spots[station], STATION_ARROW_HEIGHT, STATION_RANGE);
    }
    for (const guest of this.tavern.guests) {
      consider({ kind: "guest", id: guest.id }, this.world.seats[guest.seat].position, GUEST_ARROW_HEIGHT, GUEST_RANGE);
    }
    return best;
  }

  private listeningTo(): number | null {
    const position = this.siblings[this.active].position;
    for (const guest of this.tavern.guests) {
      if (!guest.rumor || (guest.status !== "waiting" && guest.status !== "eating")) continue;
      const seat = this.world.seats[guest.seat].position;
      if (position.distanceTo(new Vector3(seat.x, position.y, seat.z)) <= LISTEN_RANGE) return guest.id;
    }
    return null;
  }

  private updateSiblingMarks(): void {
    const position = this.siblings[this.active].position;
    this.activeMark.show(this.screen === "play" ? "you" : null);
    this.activeMark.sprite.position.set(position.x, SIBLING_MARK_HEIGHT, position.z);
    this.siblings.forEach((sibling, index) => {
      this.heldIcons[index].sprite.position.set(sibling.position.x, HELD_ICON_HEIGHT, sibling.position.z);
    });
  }

  private updateHud(helper: Station | null): void {
    const { tavern } = this;
    const hands = (index: number) => tavern.carrying[index] ?? "empty hands";
    const you = `${SIBLING_NAMES[this.active]} (you): ${hands(this.active)}`;
    const other = 1 - this.active;
    const job = (helper && HELPER_TEXT[helper]) ?? hands(other);
    const text =
      `Night ${tavern.nightIndex + 1}/${NIGHTS.length}   Gold ${tavern.gold}/${DEBT}   ` +
      `Trust ${tavern.trust}/${TRUST_MAX}   Heat ${tavern.heat}/${HEAT_MAX}   ` +
      `Tap ${tavern.tapLeft}   Pot ${tavern.potState}\n` +
      `${you}   |   ${SIBLING_NAMES[other]}: ${job}`;
    if (this.statsEl.textContent !== text) this.statsEl.textContent = text;
  }

  private setPrompt(text: string): void {
    if (this.promptEl.textContent !== text) this.promptEl.textContent = text;
  }

  private updateToast(dt: number): void {
    const messages = this.tavern.takeMessages();
    if (messages.length > 0) {
      this.toastEl.textContent = messages[messages.length - 1];
      this.toastLeft = TOAST_SECONDS;
    } else if (this.toastLeft > 0) {
      this.toastLeft -= dt;
      if (this.toastLeft <= 0) this.toastEl.textContent = "";
    }
  }

  private openPanel(title: string, paragraphs: string[], buttons: Button[]): void {
    const box = document.createElement("div");
    box.className = "box";
    const heading = document.createElement("h1");
    heading.textContent = title;
    box.append(heading);
    for (const text of paragraphs) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      box.append(paragraph);
    }
    buttons.forEach((button, index) => {
      const el = document.createElement("button");
      el.type = "button";
      el.textContent = `${index + 1}. ${button.label}`;
      el.disabled = Boolean(button.disabled);
      el.addEventListener("click", () => button.onPick());
      box.append(el);
    });
    this.panelEl.replaceChildren(box);
    this.panelEl.classList.add("open");
    this.panelButtons = buttons;
    this.screen = "panel";
  }

  private closePanel(): void {
    this.panelEl.classList.remove("open");
    this.panelEl.replaceChildren();
    this.panelButtons = [];
  }

  private handlePanelKeys(): void {
    const buttons = this.panelButtons;
    const pick = buttons.findIndex((_, index) => this.input.pressed(`Digit${index + 1}`));
    if (pick >= 0 && !buttons[pick].disabled) buttons[pick].onPick();
    else if (buttons.length === 1 && this.input.pressed("Enter")) buttons[0].onPick();
  }

  private startPlaying(): void {
    this.closePanel();
    this.screen = "play";
  }

  private showTitle(): void {
    this.openPanel(
      "Last Call at Tarven",
      [
        "You and your sister have inherited a failing tavern on a dangerous mountain road, and the debt that came with it.",
        `The baron collects ${DEBT} gold in three nights. Everyone who stops here is hiding something, and everyone will pay to know what you heard.`,
      ],
      [{ label: "Open the doors", onPick: () => this.startPlaying() }],
    );
  }

  private startVisitor(): void {
    this.screen = "visitor";
    this.setPrompt("");
    this.targetArrow.show(null);
    const visitor = new Walker(this.makeGuestBody("soldier", false));
    visitor.group.position.set(DOOR.x, 0, DOOR.z);
    visitor.setPath(this.nav.findPath(DOOR, VISITOR_STOP) ?? [VISITOR_STOP]);
    this.guestLayer.add(visitor.group);
    this.visitor = visitor;
    this.toastEl.textContent = "The last guest is gone. Then the door opens again.";
    this.toastLeft = TOAST_SECONDS;
  }

  private removeVisitor(): void {
    if (this.visitor) this.guestLayer.remove(this.visitor.group);
    this.visitor = null;
  }

  private showLastCall(): void {
    const { tavern } = this;
    const call = tavern.plan.lastCall;
    const paragraphs = [`${call.visitor}: "${call.question}"`];
    paragraphs.push(tavern.heardRumor ? `You remember: ${call.rumor}` : "You never caught what anyone was saying tonight.");
    this.openPanel(
      "Last Call",
      paragraphs,
      tavern.lastCallChoices.map((choice, index) => ({
        label: choice.label,
        onPick: () => {
          tavern.chooseLastCall(index);
          this.removeVisitor();
          this.showDawn();
        },
      })),
    );
  }

  private showDawn(): void {
    const { tavern } = this;
    const upgrades = (Object.keys(UPGRADES) as UpgradeId[]).map((id): Button => ({
      label: `${UPGRADES[id].name} (${UPGRADE_COST} gold): ${tavern.upgrades.has(id) ? "owned" : UPGRADES[id].detail}`,
      disabled: !tavern.canBuy(id),
      onPick: () => {
        tavern.buy(id);
        this.showDawn();
      },
    }));
    this.openPanel(
      `Dawn after night ${tavern.nightIndex + 1}`,
      [
        tavern.lastResult,
        `Served ${tavern.served}, ${tavern.walkouts} walked out, earned ${tavern.earned} gold.`,
        `Gold ${tavern.gold}/${DEBT}   Trust ${tavern.trust}/${TRUST_MAX}   Heat ${tavern.heat}/${HEAT_MAX}`,
      ],
      [
        ...upgrades,
        {
          label: tavern.isLastNight ? "Face the baron" : "Open for the next night",
          onPick: () => this.advanceNight(),
        },
      ],
    );
  }

  private advanceNight(): void {
    const { tavern } = this;
    tavern.nextNight();
    if (tavern.phase === "ended" && tavern.ending) {
      const ending = ENDINGS[tavern.ending];
      this.openPanel(
        ending.title,
        [ending.text, `Final gold ${tavern.gold}/${DEBT}, Trust ${tavern.trust}, Heat ${tavern.heat}.`],
        [{ label: "Play again", onPick: () => location.reload() }],
      );
    } else {
      this.startPlaying();
    }
  }

  private updatePlay(dt: number): void {
    const { tavern, input } = this;
    if (input.pressed("KeyC")) this.active = 1 - this.active;

    const other = this.siblings[1 - this.active];
    const blocker = this.siblingColliders[this.siblingColliders.length - 1];
    blocker.minX = other.position.x - SIBLING_HALF_SIZE;
    blocker.maxX = other.position.x + SIBLING_HALF_SIZE;
    blocker.minZ = other.position.z - SIBLING_HALF_SIZE;
    blocker.maxZ = other.position.z + SIBLING_HALF_SIZE;
    this.siblings[this.active].move(dt, input, this.siblingColliders);
    other.rest(dt);

    const found = this.findTarget();
    if (found && found.prompt.actionable && input.pressed("KeyE")) tavern.interact(this.active, found.target);

    const helper = this.helperStation();
    const listening = this.listeningTo();
    tavern.tick(dt, { helper, listeningTo: listening });

    const refreshed = this.findTarget();
    if (refreshed?.prompt.actionable) {
      this.setPrompt(`E: ${refreshed.prompt.label}`);
      this.targetArrow.show("arrow");
      this.targetArrow.sprite.position.set(refreshed.at.x, refreshed.height, refreshed.at.z);
    } else {
      this.setPrompt(refreshed?.prompt.label ?? (listening !== null && !tavern.heardRumor ? "Listening..." : ""));
      this.targetArrow.show(null);
    }

    this.updateHud(helper);
    if (tavern.phase === "lastcall") this.startVisitor();
  }

  update(dt: number): void {
    this.time += dt;

    if (this.screen === "panel" || this.screen === "title") {
      this.handlePanelKeys();
      this.siblings.forEach((sibling) => sibling.rest(dt));
    } else if (this.screen === "play") {
      this.updatePlay(dt);
    } else if (this.visitor) {
      this.siblings.forEach((sibling) => sibling.rest(dt));
      if (this.visitor.walk(dt)) {
        this.visitor.turnTo(Math.PI, dt);
        this.showLastCall();
      }
    }

    this.syncGuests(dt);
    this.syncCarried();
    this.syncStations();
    this.updateSiblingMarks();
    this.updateToast(dt);
    this.input.endFrame();
  }
}
