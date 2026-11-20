import { describe, expect, it } from "vitest";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { addStoryProps, addStreetLantern, bookStandLines, NO_STORY_PROPS, STORY_PIECES, syncStoryProps } from "../src/game/storyprops";
import { roomMaterials } from "../src/game/furnishings";
import { newBook } from "../src/game/act2";

/** A room with the materials world.glb has, as the props borrow them. */
function room(): Group {
  const root = new Group();
  for (const name of ["T_iron", "T_wax", "T_flame", "T_wood", "T_tabletop"]) root.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial({ name })));
  return root;
}

const shown = (root: Group, name: string) => root.getObjectByName(name)!.visible;

describe("the story props", () => {
  it("are built hidden, every one named so the room keeps it whole", () => {
    const root = room();
    addStoryProps(root);
    for (const name of STORY_PIECES) expect(root.getObjectByName(name), name).toBeDefined();
    syncStoryProps(root, NO_STORY_PROPS);
    expect(shown(root, "Story_RedLantern")).toBe(false);
    expect(shown(root, "Story_Book_Cover")).toBe(false);
    // The stand itself is always there.
    expect(shown(root, "Story_BookStand")).toBe(true);
  });

  it("show the lantern once it's hung, lit while the house is open", () => {
    const root = room();
    addStoryProps(root);
    syncStoryProps(root, { ...NO_STORY_PROPS, lantern: "hung" });
    const lamp = root.getObjectByName("Story_RedLantern")!;
    expect(lamp.visible).toBe(true);
    expect(lamp.userData.lit).toBe(false);
    syncStoryProps(root, { ...NO_STORY_PROPS, lantern: "lit" });
    expect(lamp.userData.lit).toBe(true);
  });

  it("put each piece of the red book on the stand as she wins it", () => {
    const root = room();
    addStoryProps(root);
    syncStoryProps(root, { ...NO_STORY_PROPS, cover: true, lastPages: true });
    expect(shown(root, "Story_Book_Cover")).toBe(true);
    expect(shown(root, "Story_Book_Silver")).toBe(false);
    expect(shown(root, "Story_Book_Routes")).toBe(false);
    expect(shown(root, "Story_Book_LastPages")).toBe(true);
  });

  it("hang the lantern out on the street too", () => {
    const street = new Group();
    addStreetLantern(street, roomMaterials(room()), 26, -11);
    syncStoryProps(street, { ...NO_STORY_PROPS, lantern: "hung" });
    expect(shown(street as unknown as Group, "Story_RedLantern")).toBe(true);
  });

  it("say at the stand what she holds, and where to go for the rest", () => {
    const book = { ...newBook(), cover: "held" as const, silver: "heard" as const };
    const lines = bookStandLines(book, false);
    expect(lines[0]).toMatch(/^✓ The lock and key/);
    expect(lines[1]).toMatch(/Mara Holt has it\. Go to Mara's fields/);
    expect(lines[2]).toBe("• A piece you haven't heard of yet.");
    expect(lines[3]).toMatch(/last pages: somewhere/);
  });
});
