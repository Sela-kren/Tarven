import { Group, MathUtils, Object3D, type Vector3 } from "three";
import type { Vec2 } from "./collision";
import { Icon, PatienceBar } from "./icons";
import type { NavGrid } from "./path";
import type { Body } from "./player";
import type { Guest, Tavern } from "./tavern";
import type { Seat } from "./world";

const WALK_SPEED = 2.4;
const STRIDE_RATE = 2.6;
const TURN_RATE = 12;
const SIT_TIME = 0.4;
const ARRIVE_DISTANCE = 0.06;
const ICON_HEIGHT = 2.25;
const BAR_HEIGHT = 1.88;
const RUMOR_ICON_HEIGHT = 2.72;
/** Where a speech bubble points, clear of the order icon, and of the rumor icon when there is one. */
const SPEECH_HEIGHT = 2.7;
const SPEECH_HEIGHT_OVER_RUMOR = 3.02;
/** How close a guest coming for a fight gets before they square up, and how often they look for her again. */
const SQUARE_UP_DISTANCE = 1.05;
const RECHASE_SECONDS = 0.35;

/** Moves a body along a list of waypoints and animates its legs. */
export class Walker {
  readonly group = new Group();
  private path: Vec2[] = [];
  private next = 0;
  heading = 0;
  private stride = 0;
  private swing = 0;

  constructor(readonly body: Body) {
    this.group.add(body.root);
  }

  setPath(path: Vec2[]): void {
    this.path = path;
    this.next = 0;
  }

  /** Returns true once the last waypoint has been reached. */
  walk(dt: number): boolean {
    const target = this.path[this.next];
    if (!target) {
      this.settle(dt);
      return true;
    }
    const dx = target.x - this.group.position.x;
    const dz = target.z - this.group.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < ARRIVE_DISTANCE) {
      this.next++;
      return this.walk(dt);
    }

    const step = Math.min(distance, WALK_SPEED * dt);
    this.group.position.x += (dx / distance) * step;
    this.group.position.z += (dz / distance) * step;
    this.turnTo(Math.atan2(-dx, -dz), dt);
    this.stride += WALK_SPEED * STRIDE_RATE * dt;
    this.swing += (1 - this.swing) * Math.min(1, 12 * dt);
    this.body.advance(dt);
    this.body.pose(this.stride, this.swing);
    return false;
  }

  turnTo(desired: number, dt: number): void {
    const delta = Math.atan2(Math.sin(desired - this.heading), Math.cos(desired - this.heading));
    this.heading += delta * Math.min(1, TURN_RATE * dt);
    this.body.root.rotation.y = this.heading;
  }

  /** Eases the legs back to standing. */
  settle(dt: number): void {
    this.swing -= this.swing * Math.min(1, 12 * dt);
    this.body.advance(dt);
    this.body.pose(this.stride, this.swing);
  }
}

/**
 * Where a guest is: on the way in, sitting down, seated, getting up to go, on the way out; or, when trouble
 * boils over, getting up for a fight, coming for her, squared up in front of her, and back to their seat after.
 */
type Mode =
  | "walking-in"
  | "sitting"
  | "seated"
  | "standing"
  | "walking-out"
  | "rising"
  | "charging"
  | "squared"
  | "returning";

/** The 3D character for one guest, driven by that guest's state in the rules. */
export class GuestActor {
  readonly group: Group;
  private readonly walker: Walker;
  private readonly orderIcon = new Icon();
  private readonly rumorIcon = new Icon(0.42);
  /** The angry mark over their head while trouble brews and they come for her. */
  private readonly troubleIcon = new Icon(0.7);
  /** Whether they've sat down for the first time, which tells the rules they've arrived. */
  private arrived = false;
  /** Counts down to looking for her again while coming for her, since she moves. */
  private rechase = 0;
  private readonly bar: PatienceBar;
  private readonly seatedY: number;
  private mode: Mode = "walking-in";
  private sitProgress = 0;
  private plate: Object3D | null = null;

  constructor(
    body: Body,
    private readonly guest: Guest,
    private readonly seat: Seat,
    private readonly nav: NavGrid,
    /** The way in from out of sight to just inside the door, in walking order. */
    private readonly entrance: readonly Vec2[],
    private readonly makeItem: (item: Guest["order"]) => Object3D,
    private readonly tableLayer: Object3D,
    /** Seconds to wait out of sight before walking in, so guests arriving together come through the door in turn. */
    private wait = 0,
  ) {
    this.walker = new Walker(body);
    this.group = this.walker.group;
    this.group.position.set(entrance[0].x, 0, entrance[0].z);
    this.group.visible = wait <= 0;
    this.seatedY = body.seatedOffset(seat.height);
    this.walker.setPath([...entrance, ...this.route(this.doorstep, seat.approach)]);
    this.group.add(this.orderIcon.sprite, this.rumorIcon.sprite, this.troubleIcon.sprite);
    this.bar = new PatienceBar(this.group);
  }

  private get doorstep(): Vec2 {
    return this.entrance[this.entrance.length - 1];
  }

  /** True while on the way in or out, when they may need the front door. */
  get walking(): boolean {
    return this.mode === "walking-in" || this.mode === "walking-out";
  }

  /** The guest's body, without the icons and bars that float over it. */
  get bodyRoot(): Object3D {
    return this.walker.body.root;
  }

  /** Sets `out` to the point over this guest's head that their speech bubble points at. */
  speechAnchor(out: Vector3): Vector3 {
    const { x, z } = this.group.position;
    return out.set(x, this.rumorIcon.sprite.visible ? SPEECH_HEIGHT_OVER_RUMOR : SPEECH_HEIGHT, z);
  }

  private route(from: Vec2, to: Vec2): Vec2[] {
    return this.nav.findPath(from, to) ?? [{ x: to.x, z: to.z }];
  }

  private applySit(): void {
    const t = this.sitProgress;
    const { approach, position } = this.seat;
    this.group.position.set(
      MathUtils.lerp(approach.x, position.x, t),
      this.seatedY * t,
      MathUtils.lerp(approach.z, position.z, t),
    );
    this.walker.body.pose(0, 0, 0, t);
  }

  private updateOverlay(tavern: Tavern): void {
    const { guest } = this;
    const trouble = tavern.trouble?.guestId === guest.id;
    this.troubleIcon.show(trouble ? "anger" : null);
    this.troubleIcon.sprite.position.y = ICON_HEIGHT - this.group.position.y;
    const seated = guest.status === "waiting" && !trouble && this.mode === "seated";
    const lift = -this.group.position.y;
    this.orderIcon.show(seated ? guest.order : null);
    this.orderIcon.sprite.position.y = ICON_HEIGHT + lift;
    if (seated) this.bar.show(BAR_HEIGHT + lift, guest.patience / guest.maxPatience);
    else this.bar.hide();
  }

  private updatePlate(): void {
    if (this.guest.status === "eating" && !this.plate) {
      this.plate = this.makeItem(this.guest.order);
      this.plate.position.copy(this.seat.plate);
      this.tableLayer.add(this.plate);
    } else if (this.guest.status === "leaving" && this.plate) {
      this.tableLayer.remove(this.plate);
      this.plate = null;
    }
  }

  /** Where they are on the floor right now. */
  private get here(): Vec2 {
    return { x: this.group.position.x, z: this.group.position.z };
  }

  /** Heads for her, stopping a step short; called again as she moves. */
  private chase(her: Vec2): void {
    const { x, z } = this.group.position;
    const dx = x - her.x;
    const dz = z - her.z;
    const distance = Math.hypot(dx, dz) || 1;
    const stop = { x: her.x + (dx / distance) * SQUARE_UP_DISTANCE * 0.9, z: her.z + (dz / distance) * SQUARE_UP_DISTANCE * 0.9 };
    this.walker.setPath(this.route(this.here, stop));
    this.rechase = RECHASE_SECONDS;
  }

  /** Turns to look at her. */
  private face(her: Vec2, dt: number): void {
    const { x, z } = this.group.position;
    this.walker.turnTo(Math.atan2(-(her.x - x), -(her.z - z)), dt);
  }

  /** Off out of the door from wherever they're standing (after a brawl that went either way). */
  private leaveFromHere(): void {
    this.walker.setPath([...this.route(this.here, this.doorstep), ...[...this.entrance].reverse()]);
    this.mode = "walking-out";
  }

  /**
   * Returns true when the guest has gone out of the door and can be removed. `her` is where the innkeeper on
   * the floor is standing, for a guest who comes for her in a brawl.
   */
  update(dt: number, tavern: Tavern, her: Vec2): boolean {
    const { guest } = this;
    const coming = tavern.trouble?.guestId === guest.id && tavern.trouble.stage === "coming";
    const fighting = coming || tavern.fight?.guestId === guest.id;

    switch (this.mode) {
      case "walking-in":
        if (this.wait > 0) {
          this.wait -= dt;
          this.group.visible = this.wait <= 0;
          break;
        }
        if (this.walker.walk(dt)) this.mode = "sitting";
        break;
      case "sitting":
        this.walker.turnTo(this.seat.heading, dt);
        this.sitProgress = Math.min(1, this.sitProgress + dt / SIT_TIME);
        this.applySit();
        if (this.sitProgress === 1) {
          this.walker.heading = this.seat.heading;
          this.walker.body.root.rotation.y = this.seat.heading;
          this.mode = "seated";
          if (!this.arrived) tavern.guestArrived(guest.id);
          this.arrived = true;
        }
        break;
      case "seated":
        if (coming) this.mode = "rising";
        else if (guest.status === "leaving") this.mode = "standing";
        break;
      case "rising":
        this.sitProgress = Math.max(0, this.sitProgress - (dt * 1.6) / SIT_TIME);
        this.applySit();
        if (this.sitProgress === 0) {
          this.chase(her);
          this.mode = "charging";
        }
        break;
      case "charging": {
        if (!fighting) {
          this.mode = guest.status === "leaving" ? "walking-out" : "returning";
          if (guest.status === "leaving") this.leaveFromHere();
          else this.walker.setPath(this.route(this.here, this.seat.approach));
          break;
        }
        const close = Math.hypot(her.x - this.group.position.x, her.z - this.group.position.z) <= SQUARE_UP_DISTANCE;
        if (close) {
          this.mode = "squared";
          tavern.troubleArrived(guest.id);
          break;
        }
        this.rechase -= dt;
        if (this.rechase <= 0) this.chase(her);
        this.walker.walk(dt);
        break;
      }
      case "squared":
        this.face(her, dt);
        this.walker.settle(dt);
        if (fighting) break;
        // The brawl's over: thrown out or stormed off, or talked down and back to their seat.
        if (guest.status === "leaving") this.leaveFromHere();
        else {
          this.walker.setPath(this.route(this.here, this.seat.approach));
          this.mode = "returning";
        }
        break;
      case "returning":
        if (guest.status === "leaving") {
          this.leaveFromHere();
          break;
        }
        if (this.walker.walk(dt)) this.mode = "sitting";
        break;
      case "standing":
        this.sitProgress = Math.max(0, this.sitProgress - dt / SIT_TIME);
        this.applySit();
        if (this.sitProgress === 0) {
          this.walker.setPath([...this.route(this.seat.approach, this.doorstep), ...[...this.entrance].reverse()]);
          this.mode = "walking-out";
        }
        break;
      case "walking-out":
        if (this.walker.walk(dt)) return true;
        break;
    }

    const seated = (guest.status === "waiting" || guest.status === "eating") && this.mode === "seated";
    const showRumor = guest.rumor && !tavern.heardRumor && seated;
    this.rumorIcon.show(showRumor ? "dots" : null);
    this.rumorIcon.sprite.position.y = RUMOR_ICON_HEIGHT - this.group.position.y;
    this.updateOverlay(tavern);
    this.updatePlate();
    return false;
  }
}
