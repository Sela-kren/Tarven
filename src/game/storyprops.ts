/**
 * The story you can see: things the acts talk about, standing in the tavern once they're true, so the story isn't
 * only words on a card (STORY.md sections 9 to 13).
 *
 * - **Wren's red lantern**, hung inside the front door once she hangs it (the Lantern, section 12), lit while the
 *   house is open. Until then the hook is bare.
 * - **Wren's book stand**, under her bedroom window: empty until the red book starts coming back to her (Act 2's
 *   pieces, Act 3's last pages). Each piece she wins appears on it: the cover with Oden's brass lock, Mara's silver
 *   pages, Silas's toll-route map, and the last pages tied with string. She can look at it (E) to see what she
 *   holds and where the rest is.
 *
 * Built once with the room (`addStoryProps`, before the world's colliders are read), shown or hidden as the story
 * stands (`syncStoryProps`).
 */
import { BoxGeometry, CylinderGeometry, Object3D, Vector3, type Material } from "three";
import { box, flat, Piece, roomMaterials } from "./furnishings";
import { buildDoorLamp, setDoorLampLit } from "./upstairspieces";
import * as Act2 from "./act2";

/** What the props show: read off the tavern each frame (cheap) and applied only when it changes. */
export interface StoryPropsState {
  /** The red lantern is hung, and whether it's lit (the house open for the night). */
  lantern: "none" | "hung" | "lit";
  /** Which of the red book's pieces she holds. */
  cover: boolean;
  silver: boolean;
  routes: boolean;
  lastPages: boolean;
}

export const NO_STORY_PROPS: StoryPropsState = { lantern: "none", cover: false, silver: false, routes: false, lastPages: false };

const NAMES = {
  lantern: "Story_RedLantern",
  stand: "Story_BookStand",
  cover: "Story_Book_Cover",
  silver: "Story_Book_Silver",
  routes: "Story_Book_Routes",
  lastPages: "Story_Book_LastPages",
} as const;

/** The props' names, for the room to keep whole (setupWorld) so they can be shown and hidden. */
export const STORY_PIECES: readonly string[] = Object.values(NAMES);

/** Where the book stand stands: under the bedroom window, against the north wall between the closet and the nightstand. */
const BOOK_STAND = new Vector3(8.5, 0, -2.15);
/** Where she stands to read it: just in front, facing the window, clear of the closet's spot. */
export const BOOK_STAND_SPOT = new Vector3(8.5, 0, -1.65);
export const BOOK_STAND_RANGE = 0.8;
const STAND_TOP = 0.92;

/** Inside the front door on the north wall, east of the doorway, where the lantern's bracket goes. */
const LANTERN_AT = new Vector3(-0.55, 0, -4.97);

/** Builds every story prop into the room, hidden. Call with the other room builders, before setupWorld. */
export function addStoryProps(root: Object3D): void {
  const m = roomMaterials(root);

  // The lantern: the door lamp's red lantern on its bracket, standing out into the room from the wall.
  const lamp = buildDoorLamp(m);
  lamp.name = NAMES.lantern;
  // The glow does the work; a real light here would change every shader in the taproom.
  lamp.traverse((object) => delete object.userData.light);
  lamp.position.copy(LANTERN_AT);
  lamp.visible = false;
  root.add(lamp);

  // The book stand: a slanted reading desk on one post, always there (it blocks like furniture), empty to begin.
  const { x, z } = BOOK_STAND;
  const stand = new Piece(NAMES.stand, true)
    .add(box([x - 0.18, 0, z - 0.14], [x + 0.18, 0.04, z + 0.14]), m("T_wood"))
    .add(box([x - 0.04, 0.04, z - 0.04], [x + 0.04, STAND_TOP - 0.04, z + 0.04], { swap: true }), m("T_wood"))
    .add(slab(0.5, 0.03, 0.34, x, STAND_TOP, z), m("T_tabletop"))
    .add(slab(0.5, 0.03, 0.03, x, STAND_TOP + 0.02, z + 0.16), m("T_wood"));
  stand.into(root);

  const leather = flat("T_redbook", 0x8c1c1c);
  const pages = flat("T_redbook_pages", 0xe6d8b0);
  const brass = flat("T_redbook_brass", 0xc29235);
  const silverEdge = flat("T_redbook_silver", 0xcfd4dc);
  const parchment = flat("T_redbook_map", 0xc8b07a);
  const string = flat("T_redbook_string", 0x5a4630);

  // The cover, lying open on the stand, with Oden's brass lock hanging off its clasp and the key beside it.
  const cover = new Piece(NAMES.cover)
    .add(slab(0.4, 0.015, 0.27, x, STAND_TOP + 0.03, z), leather)
    .add(slab(0.03, 0.03, 0.05, x + 0.205, STAND_TOP + 0.04, z), brass)
    .add(new CylinderGeometry(0.008, 0.008, 0.07, 5).rotateZ(Math.PI / 2).translate(x + 0.12, STAND_TOP + 0.07, z - 0.1), brass);
  cover.group.visible = false;
  cover.into(root);
  // Mara's pages: a thick block of pages in the open book, their edges gone silver.
  const silver = new Piece(NAMES.silver)
    .add(slab(0.34, 0.03, 0.22, x - 0.01, STAND_TOP + 0.055, z), pages)
    .add(slab(0.345, 0.006, 0.225, x - 0.01, STAND_TOP + 0.072, z), silverEdge);
  silver.group.visible = false;
  silver.into(root);
  // Silas's map: rolled, leaning on the stand's lip.
  const routes = new Piece(NAMES.routes).add(
    new CylinderGeometry(0.025, 0.025, 0.36, 7).rotateZ(Math.PI / 2).translate(x, STAND_TOP + 0.06, z + 0.13),
    parchment,
  );
  routes.group.visible = false;
  routes.into(root);
  // The last pages: a thin bundle tied crosswise with string, on top.
  const last = new Piece(NAMES.lastPages)
    .add(slab(0.2, 0.025, 0.15, x + 0.05, STAND_TOP + 0.09, z - 0.03), pages)
    .add(slab(0.205, 0.028, 0.012, x + 0.05, STAND_TOP + 0.09, z - 0.03), string)
    .add(slab(0.012, 0.028, 0.155, x + 0.05, STAND_TOP + 0.09, z - 0.03), string);
  last.group.visible = false;
  last.into(root);
}

/**
 * The same red lantern out on the high street, on her tavern's front wall beside the door (street.ts), so the town
 * sees it too. `m` is the room's materials (the street has none of its own); `doorX` and `frontZ` are the door's.
 */
export function addStreetLantern(street: Object3D, m: (name: string) => Material, doorX: number, frontZ: number): void {
  const lamp = buildDoorLamp(m);
  lamp.name = NAMES.lantern;
  lamp.traverse((object) => delete object.userData.light);
  lamp.position.set(doorX - 1.7, 0.35, frontZ + 0.02);
  lamp.visible = false;
  street.add(lamp);
}

/** A flat box centred on (x, z), its underside at y, for things lying on the stand. */
function slab(w: number, h: number, d: number, x: number, y: number, z: number): BoxGeometry {
  return new BoxGeometry(w, h, d).translate(x, y + h / 2, z);
}

/** Shows the props as the story stands. Cheap when nothing's changed: it keeps what it last showed. */
export function syncStoryProps(root: Object3D, state: StoryPropsState): void {
  const key = JSON.stringify(state);
  if (root.userData.storyProps === key) return;
  root.userData.storyProps = key;
  const show = (name: string, visible: boolean) => {
    const object = root.getObjectByName(name);
    if (object) object.visible = visible;
  };
  show(NAMES.lantern, state.lantern !== "none");
  const lamp = root.getObjectByName(NAMES.lantern);
  if (lamp) setDoorLampLit(lamp, state.lantern === "lit");
  show(NAMES.cover, state.cover);
  show(NAMES.silver, state.silver);
  show(NAMES.routes, state.routes);
  show(NAMES.lastPages, state.lastPages);
}

/** How many of the red book's four parts she holds. */
export function bookCount(state: StoryPropsState): number {
  return [state.cover, state.silver, state.routes, state.lastPages].filter(Boolean).length;
}

/** Where each part of the red book is won, in words she'd use. */
const PLACE_WORDS: Record<Act2.Piece["place"], string> = {
  chapel: "the chapel on the high street",
  fields: "Mara's fields, out along the west end of the high street",
  quarry: "the quarry road, at the east end of the high street",
};

/**
 * What she reads at the book stand: what she holds, and for each piece she's heard of but not won, who has it and
 * where to go. Pieces she hasn't heard of stay a blank, as on the Ledger card.
 */
export function bookStandLines(book: Readonly<Record<Act2.PieceId, Act2.PieceStatus>>, lastPages: boolean): string[] {
  const lines: string[] = [];
  for (const id of Act2.PIECE_IDS) {
    const piece = Act2.PIECES[id];
    const status = book[id];
    if (status === "held") lines.push(`✓ ${cap(piece.name)}: yours.`);
    else if (status === "heard") lines.push(`• ${cap(piece.name)}: ${piece.holder} has it. Go to ${PLACE_WORDS[piece.place]}, by day.`);
    else lines.push("• A piece you haven't heard of yet.");
  }
  lines.push(lastPages ? "✓ The last pages, from the keep's cells: yours." : "• The last pages: somewhere past the pass. (Act 3.)");
  return lines;
}

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
