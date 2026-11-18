/**
 * The house plans: buy and sell floor, draw walls, and place, move and store furniture (the Build tab), and buy
 * upgrades, set rules and look in on her people (the other tabs, see `PLAN_TABS`). Time stops and the camera is
 * free while it's open. The rules are in `HousePlan`; this is the mouse, the keys and the toolbar.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  Color,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Plane,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
} from "three";
import { BUILD_ICONS, type BuildIcon } from "./buildicons";
import type { Rect } from "./collision";
import {
  edgeAt,
  edgeRect,
  faceTable,
  footprint,
  FURNITURE_KINDS,
  FURNITURE_NAMES,
  FURNITURE_PRICES,
  LOT_BOUNDS,
  MIN_SEATS,
  refund,
  seatSpecs,
  TILE_COST,
  WALL_COST,
  type FurnitureKind,
  type HousePlan,
  type Placed,
} from "./house";
import type { HouseView } from "./houseview";
import type { Input } from "./input";
import type { StaffJob } from "./staff";
import type { EdictBranch, EdictState } from "./tavernrules";

type Tool = "hand" | "floor" | "sell" | "wall" | "unwall";

/**
 * The plans' tabs, as Karryn's Prison splits building from its edicts: Build lays out the room (floor, walls,
 * furniture, storage); Upgrades improves what's there (upgrades, stock, drinks, the Lantern, the Revel Hall); Edicts
 * is the edict tree (tavernrules.ts) and the Lantern's house rules; Staff puts her people on posts. A new tab is one
 * more row here; a tab with nothing on it stays hidden.
 */
export type PlanTab = "build" | "upgrades" | "edicts" | "staff";

const PLAN_TABS: { id: PlanTab; label: string; icon: BuildIcon; hint: string }[] = [
  { id: "build", label: "Build", icon: "wallDraw", hint: "Lay out the room: floor, walls and furniture." },
  { id: "upgrades", label: "Upgrades", icon: "done", hint: "Improve the tavern: upgrades, stock and drinks." },
  { id: "edicts", label: "Edicts", icon: "rule", hint: "Enact edicts with edict points and gold. Each needs one above it; some lock another out. Enacted is for good." },
  { id: "staff", label: "Staff", icon: "heart", hint: "Click someone, then click a post (or Resting) to put them there for tonight." },
];

/** Each branch's picture on the edict tree. */
const BRANCH_ICONS: Record<EdictBranch, BuildIcon> = { service: "cup", staff: "heart", conduct: "rule", order: "rule", house: "lantern" };

/** One edict as the tree shows it. */
export interface EdictView {
  id: string;
  name: string;
  branch: EdictBranch;
  tier: number;
  state: EdictState;
  points: number;
  gold: number;
  /** What it does and costs, and what it needs or locks out, for the note line. */
  detail: string;
  canEnact: boolean;
  enact(): void;
}

/** The Staff tab: the posts, and who's where. */
export interface StaffBoard {
  posts: { job: StaffJob; name: string; slots: number }[];
  /** `post` is null while they rest. */
  people: { id: string; name: string; job: StaffJob; post: StaffJob | null; detail: string }[];
  /** Posts can only change while the tavern's shut. */
  canChange: boolean;
}

const TOOLS: { id: Tool; label: string; icon: BuildIcon; hint: string }[] = [
  { id: "hand", label: "Move", icon: "move", hint: "Click furniture to pick it up. R turns it, X or Delete sends it to storage." },
  { id: "floor", label: "Buy floor", icon: "floorBuy", hint: `Drag over the blue squares to buy floor (${TILE_COST}g each). The walls move out to fit.` },
  { id: "sell", label: "Sell floor", icon: "floorSell", hint: `Drag over floor you bought to sell it for ${refund(TILE_COST)}g.` },
  { id: "wall", label: "Draw wall", icon: "wallDraw", hint: `Drag along the floor lines to draw walls (${WALL_COST}g each). Leave a gap for a doorway.` },
  { id: "unwall", label: "Remove wall", icon: "wallRemove", hint: "Drag along walls you drew to take them down." },
];

const PAN_SPEED = 9;
/** Furniture snaps to quarter-metre steps. */
const SNAP = 4;
/** Heights checked when clicking furniture: table tops first, so what you see is what you get. */
const PICK_HEIGHTS = [0.8, 0.5, 0];
const PICK_MARGIN = 0.08;
const OVERLAY_HEIGHT = 0.03;
const GOOD = 0x58d68d;
const BAD = 0xe0533d;
const HOVER = 0xf0e4c4;
const BLUEPRINT = 0x4a90e2;
/** Far enough south that the toolbar doesn't cover the front of the room. */
const STARTING_FOCUS = new Vector3(0, 0.8, 2.5);

/** Something for the tavern bought from the plans: an upgrade (bought once) or more cups or dishes. */
export interface Supply {
  name: string;
  icon: BuildIcon;
  /** Left out for a switch, such as lighting the lantern, which costs nothing to flip. */
  price?: number;
  /** What it does, shown when the pointer is on it. */
  detail: string;
  /** Already bought, for upgrades that can only be had once. */
  owned: boolean;
  /** How many you have, for wares that stack, and the most you can keep. */
  count?: number;
  max?: number;
  /** The heading it's shown under; "Upgrades" if not given. */
  group?: string;
  /** The tab it's on; "upgrades" if not given. */
  tab?: PlanTab;
  canBuy: boolean;
  buy(): void;
}

/** What the build mode needs from the game. */
export interface BuildHost {
  /** Upgrades and wares on sale, in the order to show them. */
  supplies(): Supply[];
  /** A small picture of a piece of furniture, as an image URL. */
  furnitureImage(kind: FurnitureKind): string;
  camera: Camera;
  plan(): HousePlan;
  gold(): number;
  addGold(amount: number): void;
  /** What furniture can't overlap, beyond the plan's own walls and furniture. */
  blockers(): readonly Rect[];
  /** What the plan as it stands cuts off, in words, or null. */
  routeProblem(): string | null;
  /** The edict tree: her unspent edict points, how many she earns a morning, the branches and their edicts. */
  edicts(): { points: number; perDay: number; branches: readonly { id: EdictBranch; name: string }[]; list: EdictView[] };
  /** Her staff and the posts they can work. */
  staffBoard(): StaffBoard;
  /** Puts one of them on a post, or to rest; false if the post is full or it can't change now. */
  setPost(id: string, post: StaffJob | "rest"): boolean;
  leave(): void;
}

interface Held {
  kind: FurnitureKind;
  /** Bought pieces aren't paid for until they're put down; moved and stored ones go back if cancelled. */
  source: "bought" | "stored" | "moved";
  /** Where a moved piece came from. */
  from: Placed | null;
  turn: number;
  ghost: Object3D;
}

export class BuildMode {
  readonly focus = STARTING_FOCUS.clone();

  private active = false;
  private tool: Tool = "hand";
  private tab: PlanTab = "build";
  /** The staff member taken up on the Staff tab, to put on a post with the next click. */
  private pickedStaff: string | null = null;
  private held: Held | null = null;
  private message = "";
  private dragging = false;
  private readonly visited = new Set<string>();

  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2(0, 0);
  private readonly floorPoint = new Vector3();
  private readonly overlay = new Object3D();
  private readonly grid: LineSegments;
  private readonly buyable = new Mesh(
    new BufferGeometry(),
    new MeshBasicMaterial({ color: BLUEPRINT, transparent: true, opacity: 0.4, depthWrite: false }),
  );
  private readonly cursorMaterial = new MeshBasicMaterial({ color: GOOD, transparent: true, opacity: 0.5, depthWrite: false });
  private readonly cursor = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.cursorMaterial);

  private readonly tabsEl = document.createElement("div");
  private readonly barEl = document.createElement("div");
  private readonly noteEl = document.createElement("div");

  constructor(
    root: HTMLElement,
    scene: Scene,
    private readonly view: HouseView,
    private readonly input: Input,
    private readonly host: BuildHost,
  ) {
    this.tabsEl.className = "tabs";
    this.barEl.className = "bar";
    this.noteEl.className = "note";
    root.append(this.tabsEl, this.barEl, this.noteEl);

    this.grid = this.makeGrid();
    this.buyable.position.y = OVERLAY_HEIGHT;
    this.cursor.position.y = OVERLAY_HEIGHT * 2;
    this.overlay.add(this.grid, this.buyable, this.cursor);
    this.overlay.visible = false;
    scene.add(this.overlay);

    window.addEventListener("pointermove", (event) => this.onPointerMove(event));
    window.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    window.addEventListener("pointerup", () => (this.dragging = false));
    window.addEventListener("contextmenu", (event) => {
      if (!this.active) return;
      event.preventDefault();
      this.cancelHeld();
    });
  }

  private get plan(): HousePlan {
    return this.host.plan();
  }

  private makeGrid(): LineSegments {
    const { minX, maxX, minZ, maxZ } = LOT_BOUNDS;
    const points: number[] = [];
    for (let x = minX; x <= maxX; x++) points.push(x, OVERLAY_HEIGHT, minZ, x, OVERLAY_HEIGHT, maxZ);
    for (let z = minZ; z <= maxZ; z++) points.push(minX, OVERLAY_HEIGHT, z, maxX, OVERLAY_HEIGHT, z);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(points), 3));
    return new LineSegments(geometry, new LineBasicMaterial({ color: BLUEPRINT, transparent: true, opacity: 0.3 }));
  }

  enter(): void {
    this.active = true;
    this.focus.copy(STARTING_FOCUS);
    this.overlay.visible = true;
    this.setTool("hand");
    this.root().classList.add("open");
  }

  private root(): HTMLElement {
    return this.barEl.parentElement as HTMLElement;
  }

  /** Esc: drops what you're holding, or leaves if your hands are empty. */
  escape(): void {
    if (this.held) this.cancelHeld();
    else this.tryLeave();
  }

  private tryLeave(): void {
    this.cancelHeld();
    const seats = seatSpecs(this.plan.layout.furniture).length;
    if (seats < MIN_SEATS) {
      this.say(`Guests need somewhere to sit: put at least ${MIN_SEATS} seats beside tables or the bar (you have ${seats}).`);
      return;
    }
    this.active = false;
    this.dragging = false;
    this.overlay.visible = false;
    this.root().classList.remove("open");
    this.host.leave();
  }

  private say(text: string): void {
    this.message = text;
    this.render();
  }

  private setTool(tool: Tool): void {
    this.cancelHeld();
    this.tool = tool;
    this.message = "";
    this.refreshBuyable();
    this.render();
  }

  /** Opens a tab of the plans. Leaving Build puts down nothing: what's held goes back, and the floor tools stop. */
  private setTab(tab: PlanTab): void {
    if (tab === this.tab) return;
    if (tab !== "build") this.cancelHeld();
    this.tab = tab;
    this.tool = "hand";
    this.message = "";
    this.refreshBuyable();
    this.render();
  }

  private redraw(): void {
    this.view.rebuild(this.plan);
    this.refreshBuyable();
    this.render();
  }

  /** The blue squares that show where floor can be bought. */
  private refreshBuyable(): void {
    this.buyable.visible = this.tool === "floor";
    if (!this.buyable.visible) return;
    const points: number[] = [];
    for (const [col, row] of this.plan.buyableTiles()) {
      const [x0, x1, z0, z1] = [col + 0.04, col + 0.96, row + 0.04, row + 0.96];
      points.push(x0, 0, z0, x0, 0, z1, x1, 0, z1, x0, 0, z0, x1, 0, z1, x1, 0, z0);
    }
    this.buyable.geometry.dispose();
    this.buyable.geometry = new BufferGeometry();
    this.buyable.geometry.setAttribute("position", new BufferAttribute(new Float32Array(points), 3));
  }

  /** A titled cluster of tiles on the bar. */
  private group(title: string): HTMLElement {
    const group = document.createElement("div");
    group.className = "group";
    const heading = document.createElement("div");
    heading.className = "title";
    heading.textContent = title;
    const tiles = document.createElement("div");
    tiles.className = "tiles";
    group.append(heading, tiles);
    this.barEl.append(group);
    return tiles;
  }

  /**
   * One square on the bar: a picture, with a price tag or a count in its corner. Its name, and what it does,
   * show in the note line while the pointer is on it.
   */
  private tile(
    parent: HTMLElement,
    options: {
      icon?: BuildIcon;
      image?: string;
      name: string;
      hint?: string;
      price?: number;
      count?: number;
      max?: number;
      on?: boolean;
      off?: boolean;
      owned?: boolean;
      /** Edict points it costs, in a badge in the top corner. */
      points?: number;
      /** A name written under the picture, where a row of the same picture needs telling apart. */
      caption?: string;
      /** Extra classes: "locked" or "excluded" on the edict tree, "slot" for an empty post. */
      classes?: string[];
      onPick: () => void;
    },
  ): HTMLElement {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "tile";
    for (const name of options.classes ?? []) el.classList.add(name);
    if (options.points !== undefined && !options.owned) {
      const points = document.createElement("span");
      points.className = "points";
      points.textContent = `${options.points} EP`;
      el.append(points);
    }
    if (options.caption) {
      const caption = document.createElement("span");
      caption.className = "caption";
      caption.textContent = options.caption;
      el.append(caption);
    }
    const art = document.createElement("span");
    art.className = "art";
    if (options.image) {
      const img = document.createElement("img");
      img.src = options.image;
      img.alt = "";
      art.append(img);
    } else if (options.icon) {
      art.innerHTML = BUILD_ICONS[options.icon];
    }
    el.append(art);
    if (options.price !== undefined && !options.owned) {
      const price = document.createElement("span");
      price.className = "price";
      price.innerHTML = BUILD_ICONS.coin;
      price.append(String(options.price));
      el.append(price);
    }
    if (options.count !== undefined) {
      const count = document.createElement("span");
      count.className = "count";
      count.textContent = options.max !== undefined ? `${options.count}/${options.max}` : `x${options.count}`;
      count.classList.toggle("full", options.max !== undefined && options.count >= options.max);
      el.append(count);
    }
    if (options.owned) {
      const tick = document.createElement("span");
      tick.className = "tick";
      tick.innerHTML = BUILD_ICONS.done;
      el.append(tick);
    }
    el.disabled = Boolean(options.off);
    el.classList.toggle("on", Boolean(options.on));
    el.classList.toggle("owned", Boolean(options.owned));
    const cost = options.owned ? "owned" : options.price !== undefined ? `${options.price} gold` : "";
    const words = [options.name, cost].filter(Boolean).join(" · ");
    el.setAttribute("aria-label", words);
    el.addEventListener("click", options.onPick);
    // The name and what it does show in the note line while the pointer is on it; the note goes back after.
    el.addEventListener("pointerenter", () => {
      this.noteEl.textContent = options.hint ? `${words}: ${options.hint}` : words;
    });
    el.addEventListener("pointerleave", () => this.render());
    parent.append(el);
    return el;
  }

  private render(): void {
    if (!this.active) return;
    this.barEl.replaceChildren();
    const supplies = this.host.supplies();
    const tabOf = (supply: Supply): PlanTab => supply.tab ?? "upgrades";
    const edicts = this.host.edicts();
    const board = this.host.staffBoard();
    const used = supplies.map(tabOf);
    if (edicts.list.length > 0) used.push("edicts");
    if (board.people.length > 0) used.push("staff");
    this.renderTabs(used);
    const onTab = supplies.filter((supply) => tabOf(supply) === this.tab);
    if (this.tab === "build") this.renderBuild();
    else if (this.tab === "edicts") this.renderEdicts(edicts);
    else if (this.tab === "staff") this.renderStaff(board);
    if (this.tab !== "build") this.renderSupplies(onTab);

    const spacer = document.createElement("span");
    spacer.className = "spacer";
    this.barEl.append(spacer);
    const done = document.createElement("button");
    done.type = "button";
    done.className = "done";
    done.innerHTML = BUILD_ICONS.done;
    done.append("Done");
    done.addEventListener("click", () => this.tryLeave());
    this.barEl.append(done);

    const seats = seatSpecs(this.plan.layout.furniture).length;
    const hint = this.held
      ? "Click to put it down. R turns it. X sends it to storage. Right-click or Esc cancels."
      : this.tab === "build"
        ? TOOLS.find(({ id }) => id === this.tool)?.hint
        : PLAN_TABS.find(({ id }) => id === this.tab)?.hint;
    this.noteEl.textContent = `${seats} seats · ${this.message || hint}`;
  }

  /** The tab strip: Build always, the others while they have something on them. */
  private renderTabs(used: PlanTab[]): void {
    this.tabsEl.replaceChildren();
    for (const { id, label, icon } of PLAN_TABS) {
      if (id !== "build" && !used.includes(id)) continue;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "tab";
      el.innerHTML = BUILD_ICONS[icon];
      el.append(label);
      el.classList.toggle("on", this.tab === id);
      el.addEventListener("click", () => this.setTab(id));
      this.tabsEl.append(el);
    }
    // A tab that's emptied (the last girl gone, say) gives way to Build.
    if (this.tab !== "build" && !used.includes(this.tab)) this.tab = "build";
  }

  /** The Build tab: the tools, furniture to buy, and what's in storage. */
  private renderBuild(): void {
    const gold = this.host.gold();
    const tools = this.group("Build");
    for (const { id, label, icon, hint } of TOOLS) {
      this.tile(tools, { icon, name: label, hint, on: this.tool === id && !this.held, onPick: () => this.setTool(id) });
    }

    const furniture = this.group("Furniture");
    for (const kind of FURNITURE_KINDS) {
      const price = FURNITURE_PRICES[kind];
      this.tile(furniture, {
        image: this.host.furnitureImage(kind),
        name: FURNITURE_NAMES[kind],
        hint: "Click it, then click the floor to put it down.",
        price,
        off: gold < price,
        onPick: () => this.buy(kind),
      });
    }

    const stored = FURNITURE_KINDS.filter((kind) => this.plan.layout.stored.includes(kind));
    if (stored.length > 0) {
      const storage = this.group("Storage");
      for (const kind of stored) {
        const count = this.plan.layout.stored.filter((other) => other === kind).length;
        const stack = document.createElement("div");
        stack.className = "stack";
        storage.append(stack);
        this.tile(stack, {
          image: this.host.furnitureImage(kind),
          name: FURNITURE_NAMES[kind],
          hint: "In storage. Click it to put it back in the room.",
          count,
          onPick: () => this.takeFromStorage(kind),
        });
        // Selling one back: a small coin plank under the picture.
        const money = refund(FURNITURE_PRICES[kind]);
        const sell = document.createElement("button");
        sell.type = "button";
        sell.className = "sell";
        sell.innerHTML = BUILD_ICONS.coin;
        sell.append(`+${money}`);
        sell.setAttribute("aria-label", `Sell a ${FURNITURE_NAMES[kind].toLowerCase()} for ${money} gold`);
        sell.addEventListener("click", () => this.sellStored(kind));
        stack.append(sell);
      }
    }
  }

  /**
   * The edict tree, Karryn's Prison style: a column per branch, its edicts in rows by tier, each needing one in the
   * row above. Enacted ones carry a tick; ones still to grow into are dimmed; ones an either/or locked out are struck.
   */
  private renderEdicts(edicts: ReturnType<BuildHost["edicts"]>): void {
    const tree = document.createElement("div");
    tree.className = "tree";
    const purse = document.createElement("div");
    purse.className = "purse";
    purse.textContent = `${edicts.points} EP`;
    purse.title = `Edict points: ${edicts.points}. You earn ${edicts.perDay} each morning.`;
    tree.append(purse);
    for (const branch of edicts.branches) {
      const list = edicts.list.filter((edict) => edict.branch === branch.id);
      if (list.length === 0) continue;
      const column = document.createElement("div");
      column.className = "branch";
      const heading = document.createElement("div");
      heading.className = "title";
      heading.textContent = branch.name;
      column.append(heading);
      const tiers = [...new Set(list.map((edict) => edict.tier))].sort((a, b) => a - b);
      for (const tier of tiers) {
        const row = document.createElement("div");
        row.className = "tiles";
        column.append(row);
        for (const edict of list.filter((e) => e.tier === tier)) {
          this.tile(row, {
            icon: BRANCH_ICONS[edict.branch],
            name: edict.name,
            caption: edict.name,
            hint: edict.detail,
            price: edict.gold,
            points: edict.points,
            owned: edict.state === "enacted",
            off: !edict.canEnact,
            classes: edict.state === "needs" ? ["locked"] : edict.state === "excluded" ? ["excluded"] : [],
            onPick: () => {
              edict.enact();
              this.render();
            },
          });
        }
      }
      tree.append(column);
    }
    this.barEl.append(tree);
  }

  /**
   * The Staff tab: a group per post, with who's on it and its empty places, and one for whoever's resting. Click
   * someone to take them up, then click a place on a post (or Resting) to put them there.
   */
  private renderStaff(board: StaffBoard): void {
    const picked = board.people.find((person) => person.id === this.pickedStaff) ?? null;
    if (!picked) this.pickedStaff = null;
    const person = (parent: HTMLElement, p: StaffBoard["people"][number]) =>
      this.tile(parent, {
        icon: "heart",
        name: p.name,
        caption: p.name.split(" ")[0],
        hint: p.detail,
        on: p.id === this.pickedStaff,
        off: !board.canChange,
        onPick: () => {
          this.pickedStaff = this.pickedStaff === p.id ? null : p.id;
          this.message = "";
          this.render();
        },
      });
    const place = (to: StaffJob | "rest", label: string) => () => {
      if (!picked) {
        this.say("Click someone first, then the place to put them.");
        return;
      }
      if (!this.host.setPost(picked.id, to)) {
        this.say(`There's no room for ${picked.name.split(" ")[0]} on ${label}.`);
        return;
      }
      this.pickedStaff = null;
      this.message = "";
      this.render();
    };
    for (const post of board.posts) {
      const on = board.people.filter((p) => p.post === post.job);
      const tiles = this.group(`${post.name} ${on.length}/${post.slots}`);
      for (const p of on) person(tiles, p);
      for (let i = on.length; i < post.slots; i++) {
        this.tile(tiles, {
          name: `Empty place: ${post.name}`,
          hint: picked ? `Put ${picked.name} here tonight.` : "Click someone first, then this place.",
          caption: "Empty",
          classes: ["slot"],
          off: !board.canChange,
          onPick: place(post.job, post.name),
        });
      }
    }
    const resting = this.group("Resting");
    for (const p of board.people.filter((x) => x.post === null)) person(resting, p);
    this.tile(resting, {
      icon: "bed",
      name: "Rest tonight",
      hint: picked ? `${picked.name} takes the night off: no wage, and their stamina comes back.` : "Click someone first, then this to give them the night off.",
      classes: ["slot"],
      off: !board.canChange,
      onPick: place("rest", "the rest list"),
    });
  }

  /** Any other tab: its supplies, under their headings. */
  private renderSupplies(supplies: Supply[]): void {
    const groups = new Map<string, HTMLElement>();
    for (const supply of supplies) {
      const title = supply.group ?? "Upgrades";
      let tiles = groups.get(title);
      if (!tiles) {
        tiles = this.group(title);
        groups.set(title, tiles);
      }
      this.tile(tiles, {
        icon: supply.icon,
        name: supply.name,
        hint: supply.detail,
        price: supply.price,
        count: supply.count,
        max: supply.max,
        owned: supply.owned,
        off: !supply.canBuy,
        onPick: () => {
          supply.buy();
          this.render();
        },
      });
    }
  }

  private buy(kind: FurnitureKind): void {
    if (this.host.gold() < FURNITURE_PRICES[kind]) return;
    this.hold({ kind, source: "bought", from: null, turn: 0 });
  }

  private takeFromStorage(kind: FurnitureKind): void {
    const { stored } = this.plan.layout;
    stored.splice(stored.indexOf(kind), 1);
    this.hold({ kind, source: "stored", from: null, turn: 0 });
  }

  private sellStored(kind: FurnitureKind): void {
    const { stored } = this.plan.layout;
    stored.splice(stored.indexOf(kind), 1);
    this.host.addGold(refund(FURNITURE_PRICES[kind]));
    this.render();
  }

  private hold(held: Omit<Held, "ghost">): void {
    this.cancelHeld();
    this.tool = "hand";
    const ghost = this.view.makeGhost(held.kind);
    this.overlay.add(ghost);
    this.held = { ...held, ghost };
    this.message = "";
    this.refreshBuyable();
    this.render();
  }

  private releaseGhost(): void {
    this.held?.ghost.removeFromParent();
    this.held = null;
  }

  /** Puts what you're holding back where it came from. */
  private cancelHeld(): void {
    const { held } = this;
    if (!held) return;
    if (held.source === "stored") this.plan.layout.stored.push(held.kind);
    if (held.from) this.plan.layout.furniture.push(held.from);
    this.releaseGhost();
    this.redraw();
  }

  private storeHeld(): void {
    const { held } = this;
    if (!held) return;
    if (held.source === "bought") {
      this.cancelHeld();
      return;
    }
    this.plan.layout.stored.push(held.kind);
    this.releaseGhost();
    this.redraw();
  }

  /** The held piece as it would stand under the pointer, or null with the pointer off the floor. */
  private heldPlacement(): Placed | null {
    const { held } = this;
    if (!held || !this.aimAt(0)) return null;
    const item: Placed = {
      kind: held.kind,
      x: Math.round(this.floorPoint.x * SNAP) / SNAP,
      z: Math.round(this.floorPoint.z * SNAP) / SNAP,
      turn: held.turn,
    };
    item.turn = faceTable(item, this.plan.layout.furniture);
    return item;
  }

  private dropHeld(): void {
    const { held } = this;
    const item = this.heldPlacement();
    if (!held || !item) return;
    const { furniture } = this.plan.layout;
    const problem = this.plan.placeProblem(item, this.host.blockers());
    if (problem) {
      this.say(problem);
      return;
    }
    furniture.push(item);
    const blocked = this.host.routeProblem();
    if (blocked) {
      furniture.pop();
      this.say(blocked);
      return;
    }
    if (held.source === "bought") this.host.addGold(-FURNITURE_PRICES[held.kind]);
    this.releaseGhost();
    this.message = "";
    this.redraw();
  }

  /** Turns the held piece, or the one under the pointer if it still fits once turned. */
  private rotate(): void {
    if (this.held) {
      this.held.turn = (this.held.turn + 1) % 4;
      return;
    }
    const index = this.furnitureAt();
    if (index < 0) return;
    const { furniture } = this.plan.layout;
    const turned = { ...furniture[index], turn: (furniture[index].turn + 1) % 4 };
    const problem = this.plan.placeProblem(turned, this.host.blockers(), index);
    if (problem) {
      this.say(problem);
      return;
    }
    furniture[index] = turned;
    this.redraw();
  }

  private store(): void {
    if (this.held) {
      this.storeHeld();
      return;
    }
    const index = this.furnitureAt();
    if (index < 0) return;
    const { furniture, stored } = this.plan.layout;
    stored.push(furniture[index].kind);
    furniture.splice(index, 1);
    this.redraw();
  }

  private aimAt(height: number): boolean {
    this.raycaster.setFromCamera(this.pointer, this.host.camera);
    const plane = new Plane(new Vector3(0, 1, 0), -height);
    return this.raycaster.ray.intersectPlane(plane, this.floorPoint) !== null;
  }

  private furnitureAt(): number {
    const { furniture } = this.plan.layout;
    for (const height of PICK_HEIGHTS) {
      if (!this.aimAt(height)) continue;
      const { x, z } = this.floorPoint;
      const index = furniture.findIndex((item) => {
        const r = footprint(item);
        return (
          x >= r.minX - PICK_MARGIN && x <= r.maxX + PICK_MARGIN && z >= r.minZ - PICK_MARGIN && z <= r.maxZ + PICK_MARGIN
        );
      });
      if (index >= 0) return index;
    }
    return -1;
  }

  private onPointerMove(event: PointerEvent): void {
    this.pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    if (this.active && this.dragging && this.tool !== "hand") this.paint();
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.active || this.tab !== "build" || event.button !== 0 || !(event.target instanceof HTMLCanvasElement)) return;
    this.onPointerMove(event);
    if (this.held) {
      this.dropHeld();
      return;
    }
    if (this.tool === "hand") {
      this.pickUp();
      return;
    }
    this.dragging = true;
    this.visited.clear();
    this.paint();
  }

  private pickUp(): void {
    const index = this.furnitureAt();
    if (index < 0) return;
    const { furniture } = this.plan.layout;
    const [item] = furniture.splice(index, 1);
    this.hold({ kind: item.kind, source: "moved", from: item, turn: item.turn });
    this.view.rebuild(this.plan);
  }

  /** Applies the tool once to whatever is under the pointer, skipping what this drag has already touched. */
  private paint(): void {
    if (!this.aimAt(0)) return;
    const { x, z } = this.floorPoint;
    const tileTool = this.tool === "floor" || this.tool === "sell";
    const spot = tileTool ? `${Math.floor(x)}:${Math.floor(z)}` : edgeAt(x, z);
    if (this.visited.has(spot)) return;
    this.visited.add(spot);
    if (this.tool === "floor") this.buyFloor(Math.floor(x), Math.floor(z));
    else if (this.tool === "sell") this.sellFloor(Math.floor(x), Math.floor(z));
    else if (this.tool === "wall") this.drawWall(spot);
    else if (this.tool === "unwall") this.removeWall(spot);
  }

  private buyFloor(col: number, row: number): void {
    if (!this.plan.canBuyTile(col, row)) return;
    if (this.host.gold() < TILE_COST) {
      this.say("Not enough gold.");
      return;
    }
    this.plan.buyTile(col, row);
    this.host.addGold(-TILE_COST);
    this.message = "";
    this.redraw();
  }

  private sellFloor(col: number, row: number): void {
    const problem = this.plan.sellProblem(col, row);
    if (problem) {
      this.say(problem);
      return;
    }
    const walls = this.plan.sellTile(col, row);
    this.host.addGold(refund(TILE_COST) + walls * refund(WALL_COST));
    this.message = "";
    this.redraw();
  }

  private drawWall(edge: string): void {
    const problem = this.plan.wallProblem(edge);
    if (problem) {
      this.say(problem);
      return;
    }
    if (this.host.gold() < WALL_COST) {
      this.say("Not enough gold.");
      return;
    }
    const { walls } = this.plan.layout;
    walls.push(edge);
    const blocked = this.host.routeProblem();
    if (blocked) {
      walls.pop();
      this.say(blocked);
      return;
    }
    this.host.addGold(-WALL_COST);
    this.message = "";
    this.redraw();
  }

  private removeWall(edge: string): void {
    const { walls } = this.plan.layout;
    const index = walls.indexOf(edge);
    if (index < 0) return;
    walls.splice(index, 1);
    this.host.addGold(refund(WALL_COST));
    this.message = "";
    this.redraw();
  }

  private showCursor(rect: Rect | null, color: number): void {
    this.cursor.visible = rect !== null;
    if (!rect) return;
    this.cursor.position.x = (rect.minX + rect.maxX) / 2;
    this.cursor.position.z = (rect.minZ + rect.maxZ) / 2;
    this.cursor.scale.set(rect.maxX - rect.minX, 1, rect.maxZ - rect.minZ);
    (this.cursorMaterial.color as Color).setHex(color);
  }

  private updateCursor(): void {
    const { held, plan } = this;
    if (held) {
      const item = this.heldPlacement();
      held.ghost.visible = item !== null;
      if (!item) {
        this.showCursor(null, GOOD);
        return;
      }
      held.ghost.position.set(item.x, 0, item.z);
      held.ghost.rotation.y = (item.turn * Math.PI) / 2;
      this.showCursor(footprint(item), plan.placeProblem(item, this.host.blockers()) ? BAD : GOOD);
      return;
    }
    if (this.tool === "hand") {
      const index = this.furnitureAt();
      this.showCursor(index >= 0 ? footprint(plan.layout.furniture[index]) : null, HOVER);
      return;
    }
    if (!this.aimAt(0)) {
      this.showCursor(null, GOOD);
      return;
    }
    const { x, z } = this.floorPoint;
    if (this.tool === "floor" || this.tool === "sell") {
      const [col, row] = [Math.floor(x), Math.floor(z)];
      const fine = this.tool === "floor" ? plan.canBuyTile(col, row) : plan.sellProblem(col, row) === null;
      this.showCursor({ minX: col, maxX: col + 1, minZ: row, maxZ: row + 1 }, fine ? GOOD : BAD);
      return;
    }
    const edge = edgeAt(x, z);
    const fine = this.tool === "wall" ? plan.wallProblem(edge) === null : plan.layout.walls.includes(edge);
    this.showCursor(edgeRect(edge), fine ? GOOD : BAD);
  }

  update(dt: number): void {
    const { input } = this;
    const step = PAN_SPEED * dt;
    const { minX, maxX, minZ, maxZ } = LOT_BOUNDS;
    this.focus.x = Math.min(maxX, Math.max(minX, this.focus.x + (Number(input.right) - Number(input.left)) * step));
    this.focus.z = Math.min(maxZ, Math.max(minZ, this.focus.z + (Number(input.down) - Number(input.up)) * step));
    if (this.tab !== "build") {
      this.showCursor(null, GOOD);
      return;
    }
    if (input.pressed("KeyR")) this.rotate();
    if (input.pressed("KeyX") || input.pressed("Delete")) this.store();
    this.updateCursor();
  }
}
