import { Group, MathUtils, Object3D } from "three";
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
    this.body.pose(this.stride, this.swing);
  }
}

type Mode = "walking-in" | "sitting" | "seated" | "standing" | "walking-out";

/** The 3D character for one guest, driven by that guest's state in the rules. */
export class GuestActor {
  readonly group: Group;
  private readonly walker: Walker;
  private readonly orderIcon = new Icon();
  private readonly rumorIcon = new Icon(0.42);
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
    private readonly door: Vec2,
    private readonly makeItem: (item: Guest["order"]) => Object3D,
    private readonly tableLayer: Object3D,
  ) {
    this.walker = new Walker(body);
    this.group = this.walker.group;
    this.group.position.set(door.x, 0, door.z);
    this.seatedY = body.seatedOffset(seat.height);
    this.walker.setPath(this.route(door, seat.approach));
    this.group.add(this.orderIcon.sprite, this.rumorIcon.sprite);
    this.bar = new PatienceBar(this.group);
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

  private updateOverlay(): void {
    const { guest } = this;
    const seated = guest.status === "waiting";
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

  /** Returns true when the guest has gone out of the door and can be removed. */
  update(dt: number, tavern: Tavern): boolean {
    const { guest } = this;

    switch (this.mode) {
      case "walking-in":
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
          tavern.guestArrived(guest.id);
        }
        break;
      case "seated":
        if (guest.status === "leaving") this.mode = "standing";
        break;
      case "standing":
        this.sitProgress = Math.max(0, this.sitProgress - dt / SIT_TIME);
        this.applySit();
        if (this.sitProgress === 0) {
          this.walker.setPath(this.route(this.seat.approach, this.door));
          this.mode = "walking-out";
        }
        break;
      case "walking-out":
        if (this.walker.walk(dt)) return true;
        break;
    }

    const showRumor = guest.rumor && !tavern.heardRumor && (guest.status === "waiting" || guest.status === "eating");
    this.rumorIcon.show(showRumor ? "dots" : null);
    this.rumorIcon.sprite.position.y = RUMOR_ICON_HEIGHT - this.group.position.y;
    this.updateOverlay();
    this.updatePlate();
    return false;
  }
}
