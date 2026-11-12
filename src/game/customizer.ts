import {
  copyLook, legwearOf, LOOK_OPTIONS, nearestStop, outfitOf, playerOutfits, stopValue, wearOutfit,
  type BodyName, type Look, type LookTab, type SliderStops,
} from "./appearance";

const TABS: { id: LookTab; label: string }[] = [
  { id: "body", label: "Body" },
  { id: "face", label: "Face" },
  { id: "hair", label: "Hair" },
  { id: "skin", label: "Skin" },
  { id: "clothes", label: "Clothes" },
];

/** Sliders run in whole steps from -100 to 100 on screen and from -1 to 1 in the look. */
const SLIDER_STEPS = 100;

export interface CustomizerHooks {
  /** The look changed; put it on the character now. */
  change(look: Look): void;
  /** Another tab was opened, so the camera can frame what it edits. */
  tab(tab: LookTab): void;
  done(): void;
  /** The colour a setting has as built, for its "as built" swatch. */
  builtColor(id: string): string;
  /** A new random look for this body. */
  random(body: BodyName): Look;
  /** Takes the clothes off to see the body (true), or puts them back on. Only for the preview. */
  undress(undressed: boolean): void;
}

function make<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

/** The side panel where a character's body, face, skin and clothes are changed. */
export class Customizer {
  private body: BodyName = "Male";
  private look: Look = { sliders: {}, colors: {}, hidden: [] };
  private current: LookTab = "body";
  private readonly titleEl = make("h2");
  private readonly tabsEl = make("div", "tabs");
  private readonly paneEl = make("div", "pane");
  private readonly clothesEl = make("input");

  constructor(private readonly el: HTMLElement, private readonly hooks: CustomizerHooks) {
    const box = make("div", "box");
    this.tabsEl.setAttribute("role", "tablist");
    const actions = make("div", "actions");
    const resetTab = make("button", "", "Reset tab");
    const resetAll = make("button", "", "Reset all");
    const done = make("button", "done", "Done");
    for (const button of [resetTab, resetAll, done]) button.type = "button";
    resetTab.addEventListener("click", () => this.reset(this.current));
    resetAll.addEventListener("click", () => this.reset(null));
    done.addEventListener("click", () => this.hooks.done());
    actions.append(resetTab, resetAll, done);
    const hint = make("p", "hint", "Drag the character to turn them round. Double-click a slider to set it back.");

    const view = make("div", "view");
    const random = make("button", "random", "Random");
    random.type = "button";
    random.title = "Roll a whole new look. Reset all brings back the look as built.";
    random.addEventListener("click", () => {
      this.look = this.hooks.random(this.body);
      this.changed();
      this.show(this.current);
    });
    const clothes = make("label", "clothes");
    this.clothesEl.type = "checkbox";
    this.clothesEl.checked = true;
    this.clothesEl.addEventListener("change", () => this.hooks.undress(!this.clothesEl.checked));
    clothes.append(this.clothesEl, make("span", "", "Clothes on"));
    view.append(random, clothes);

    box.append(this.titleEl, view, this.tabsEl, this.paneEl, actions, hint);
    this.el.replaceChildren(box);
  }

  get tab(): LookTab {
    return this.current;
  }

  get isOpen(): boolean {
    return this.el.classList.contains("open");
  }

  open(body: BodyName, look: Look, label: string): void {
    this.body = body;
    this.look = copyLook(look);
    this.titleEl.textContent = `Customize: ${label}`;
    this.clothesEl.checked = true;
    this.el.classList.add("open");
    this.show("body");
  }

  close(): void {
    this.el.classList.remove("open");
  }

  /** Sets the settings on one tab, or on every tab with null, back to the model as built. */
  private reset(tab: LookTab | null): void {
    const options = LOOK_OPTIONS[this.body];
    for (const def of options.sliders) if (tab === null || def.tab === tab) delete this.look.sliders[def.id];
    for (const def of options.colors) if (tab === null || def.tab === tab) delete this.look.colors[def.id];
    if (tab === null || tab === "clothes") {
      this.look.hidden = [];
      delete this.look.outfit;
      delete this.look.legwear;
    }
    if (tab === null || tab === "hair") delete this.look.hairstyle;
    if (tab === null || tab === "body") {
      delete this.look.nipples;
      delete this.look.bustShape;
      delete this.look.pubes;
    }
    this.changed();
    this.show(this.current);
  }

  private changed(): void {
    this.hooks.change(copyLook(this.look));
  }

  private show(tab: LookTab): void {
    this.current = tab;
    this.tabsEl.replaceChildren(
      ...TABS.map(({ id, label }) => {
        const button = make("button", id === tab ? "on" : "", label);
        button.type = "button";
        button.setAttribute("role", "tab");
        button.setAttribute("aria-selected", String(id === tab));
        button.addEventListener("click", () => this.show(id));
        return button;
      }),
    );
    const options = LOOK_OPTIONS[this.body];
    const rows: HTMLElement[] = [];
    if (tab === "hair") rows.push(this.hairstyleRow());
    if (tab === "clothes" && playerOutfits(this.body).length > 1) rows.push(this.outfitRow());
    if (tab === "clothes" && legwearOf(this.body, this.look)) rows.push(this.legwearRow());
    let group: string | undefined;
    for (const def of options.sliders) {
      if (def.tab !== tab) continue;
      if (def.group && def.group !== group) {
        rows.push(make("h3", "group", def.group));
        if (def.group === "Bust" && options.bustShapes.length) {
          rows.push(this.choiceRow("Shape", options.bustShapes, () => this.look.bustShape, (id) => (this.look.bustShape = id)));
        }
        if (def.group === "Nipples" && options.nipples.length) {
          rows.push(this.choiceRow("Type", options.nipples, () => this.look.nipples, (id) => (this.look.nipples = id)));
        }
        if (def.group === "Pubic hair" && options.pubes.length) {
          rows.push(this.choiceRow("Style", options.pubes, () => this.look.pubes, (id) => (this.look.pubes = id)));
        }
      }
      group = def.group;
      rows.push(def.stops ? this.stopsRow(def.id, def.label, def.stops) : this.sliderRow(def.id, def.label));
      // Her pubic hair's colour sits with its style and size, as well as with her hair's on the hair tab.
      const pubes = def.group === "Pubic hair" ? options.colors.find((color) => color.id === "pubes") : undefined;
      if (pubes && tab !== pubes.tab) rows.push(this.colorRow(pubes.id, "Colour", pubes.palette));
    }
    // The clothes tab shows only what the chosen outfit has, in the outfit's own order.
    const outfit = outfitOf(this.body, this.look);
    const worn = (id: string) => tab !== "clothes" || outfit.colors.includes(id);
    const order = (id: string) => (tab === "clothes" ? outfit.colors.indexOf(id) : 0);
    const colors = options.colors.filter((def) => def.tab === tab && worn(def.id)).sort((a, b) => order(a.id) - order(b.id));
    for (const def of colors) rows.push(this.colorRow(def.id, def.label, def.palette));
    if (tab === "clothes") for (const piece of options.pieces) if (worn(piece.id)) rows.push(this.pieceRow(piece.id, piece.label));
    this.paneEl.replaceChildren(...rows);
    this.hooks.tab(tab);
  }

  private hairstyleRow(): HTMLElement {
    const row = make("div", "row styles");
    row.append(make("span", "name", "Hairstyle"));
    const grid = make("div", "style-grid");
    const styles = LOOK_OPTIONS[this.body].hairstyles;
    const buttons = styles.map((style, index) => {
      const button = make("button", "", style.label);
      button.type = "button";
      button.addEventListener("click", () => {
        if (index === 0) delete this.look.hairstyle;
        else this.look.hairstyle = style.id;
        mark();
        this.changed();
      });
      return button;
    });
    const mark = () => {
      const chosen = this.look.hairstyle ?? styles[0].id;
      buttons.forEach((button, index) => {
        button.classList.toggle("on", styles[index].id === chosen);
        button.setAttribute("aria-pressed", String(styles[index].id === chosen));
      });
    };
    mark();
    grid.append(...buttons);
    row.append(grid);
    return row;
  }

  /**
   * One of a set of named choices, as the bust's shape or the nipples' type. The first is the default, which the
   * look leaves out: `set` gets undefined for it.
   */
  private choiceRow(
    label: string,
    choices: readonly { id: string; label: string }[],
    get: () => string | undefined,
    set: (id: string | undefined) => void,
  ): HTMLElement {
    const row = make("div", "row styles");
    row.append(make("span", "name", label));
    const grid = make("div", "style-grid");
    const buttons = choices.map((choice, index) => {
      const button = make("button", "", choice.label);
      button.type = "button";
      button.addEventListener("click", () => {
        set(index === 0 ? undefined : choice.id);
        mark();
        this.changed();
      });
      return button;
    });
    const mark = () => {
      const chosen = get() ?? choices[0].id;
      buttons.forEach((button, index) => {
        button.classList.toggle("on", choices[index].id === chosen);
        button.setAttribute("aria-pressed", String(choices[index].id === chosen));
      });
    };
    mark();
    grid.append(...buttons);
    row.append(grid);
    return row;
  }

  /** The lengths of legwear to choose from, for an outfit that has legwear. Its colour is the "Legwear" swatch below. */
  private legwearRow(): HTMLElement {
    const row = make("div", "row styles");
    row.append(make("span", "name", "Legwear"));
    const grid = make("div", "style-grid");
    const styles = LOOK_OPTIONS[this.body].legwear;
    const buttons = styles.map((style) => {
      const button = make("button", "", style.label);
      button.type = "button";
      button.addEventListener("click", () => {
        this.look.legwear = style.id;
        mark();
        this.changed();
      });
      return button;
    });
    const mark = () => {
      const chosen = legwearOf(this.body, this.look)?.id;
      buttons.forEach((button, index) => {
        button.classList.toggle("on", styles[index].id === chosen);
        button.setAttribute("aria-pressed", String(styles[index].id === chosen));
      });
    };
    mark();
    grid.append(...buttons);
    row.append(grid);
    return row;
  }

  /** The outfits to choose from. Picking one puts on its own colours, which can then be changed below. */
  private outfitRow(): HTMLElement {
    const row = make("div", "row styles");
    row.append(make("span", "name", "Outfit"));
    const grid = make("div", "style-grid");
    const chosen = outfitOf(this.body, this.look).id;
    for (const outfit of playerOutfits(this.body)) {
      const button = make("button", outfit.id === chosen ? "on" : "", outfit.label);
      button.type = "button";
      button.setAttribute("aria-pressed", String(outfit.id === chosen));
      button.addEventListener("click", () => {
        this.look = wearOutfit(this.body, this.look, outfit.id);
        this.changed();
        this.show(this.current);
      });
      grid.append(button);
    }
    row.append(grid);
    return row;
  }

  private sliderRow(id: string, label: string): HTMLElement {
    const row = make("label", "row slider");
    const name = make("span", "name", label);
    const value = make("output");
    const input = make("input");
    input.type = "range";
    input.min = String(-SLIDER_STEPS);
    input.max = String(SLIDER_STEPS);
    input.step = "1";
    const set = (steps: number) => {
      input.value = String(steps);
      value.textContent = steps > 0 ? `+${steps}` : String(steps);
      if (steps === 0) delete this.look.sliders[id];
      else this.look.sliders[id] = steps / SLIDER_STEPS;
    };
    set(Math.round((this.look.sliders[id] ?? 0) * SLIDER_STEPS));
    input.addEventListener("input", () => {
      set(Number(input.value));
      this.changed();
    });
    input.addEventListener("dblclick", () => {
      set(0);
      this.changed();
    });
    const top = make("span", "top");
    top.append(name, value);
    row.append(top, input);
    return row;
  }

  /** A slider that snaps to named steps, as cup sizes, and shows the step's name. */
  private stopsRow(id: string, label: string, stops: SliderStops): HTMLElement {
    const row = make("label", "row slider");
    const name = make("span", "name", label);
    const value = make("output");
    const input = make("input");
    input.type = "range";
    input.min = "0";
    input.max = String(stops.labels.length - 1);
    input.step = "1";
    const set = (index: number) => {
      input.value = String(index);
      value.textContent = stops.labels[index];
      if (index === stops.zero) delete this.look.sliders[id];
      else this.look.sliders[id] = stopValue(stops, index);
    };
    set(nearestStop(stops, this.look.sliders[id] ?? 0));
    input.addEventListener("input", () => {
      set(Number(input.value));
      this.changed();
    });
    input.addEventListener("dblclick", () => {
      set(stops.zero);
      this.changed();
    });
    const top = make("span", "top");
    top.append(name, value);
    row.append(top, input);
    return row;
  }

  private colorRow(id: string, label: string, palette: string[]): HTMLElement {
    const row = make("div", "row color");
    row.append(make("span", "name", label));
    const swatches = make("div", "swatches");
    const built = this.hooks.builtColor(id);
    const buttons: { button: HTMLButtonElement; hex: string | null }[] = [];
    const custom = make("input");
    custom.type = "color";
    custom.title = "Any colour";
    custom.setAttribute("aria-label", `${label}: any colour`);
    const mark = () => {
      const chosen = this.look.colors[id] ?? null;
      for (const { button, hex } of buttons) button.classList.toggle("on", hex === chosen);
      custom.value = chosen ?? built;
      custom.classList.toggle("on", chosen !== null && !palette.includes(chosen));
    };
    const pick = (hex: string | null) => {
      if (hex) this.look.colors[id] = hex;
      else delete this.look.colors[id];
      mark();
      this.changed();
    };
    const swatch = (hex: string | null, title: string) => {
      const button = make("button", hex ? "swatch" : "swatch built");
      button.type = "button";
      button.title = title;
      button.setAttribute("aria-label", `${label}: ${title}`);
      button.style.setProperty("--swatch", hex ?? built);
      button.addEventListener("click", () => pick(hex));
      buttons.push({ button, hex });
      return button;
    };
    swatches.append(swatch(null, "as built"), ...palette.map((hex) => swatch(hex, hex)), custom);
    custom.addEventListener("input", () => pick(custom.value.toLowerCase()));
    mark();
    row.append(swatches);
    return row;
  }

  private pieceRow(id: string, label: string): HTMLElement {
    const row = make("label", "row piece");
    const box = make("input");
    box.type = "checkbox";
    box.checked = !this.look.hidden.includes(id);
    box.addEventListener("change", () => {
      this.look.hidden = box.checked ? this.look.hidden.filter((piece) => piece !== id) : [...this.look.hidden, id];
      this.changed();
    });
    row.append(box, make("span", "name", `Wear the ${label.toLowerCase()}`));
    return row;
  }
}
