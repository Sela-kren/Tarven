import {
  BasicShadowMap,
  Color,
  MathUtils,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Soundscape } from "./game/audio";
import { addBakery, addBedroom, addBin, addFrontDoorway, addWashTub } from "./game/furnishings";
import { Game, WHOLE_PIECES } from "./game/game";
import { claimFurniture } from "./game/houseview";
import { Input } from "./game/input";
import { DayNightLighting } from "./game/lighting";
import { DownloadTally, LoadScreen, nextPaint } from "./game/loadscreen";
import { applyRetroLook, RetroPipeline } from "./game/retro";
import { loadPaint } from "./game/paint";
import { PALETTES, townLook } from "./game/palettes";
import { WorldClock } from "./game/time";
import { installDevResume } from "./game/devresume";
import { DevView } from "./game/devview";
import { addStoryProps, STORY_PIECES } from "./game/storyprops";
import { addStairHall, addUpstairs } from "./game/upstairs";
import { setupWorld } from "./game/world";

// 3/4 view: looking 45 degrees down, so both tops and fronts of things show.
const CAMERA_OFFSET = new Vector3(0, 10, 10);
/**
 * Out in the town the camera sits lower and further back, so the houses' roofs, the chapel tower and the keep on its
 * mound come into the shot (nothing tall stands south of where she walks, street.ts).
 */
const STREET_CAMERA_OFFSET = new Vector3(0, 9, 15);
/** ...and aims higher over her, at the first floors rather than her feet. */
const STREET_FOCUS_HEIGHT = 3;
const CAMERA_FOLLOW_RATE = 8;
const MAX_FRAME_TIME = 1 / 20;
const SHADOW_UPDATE_INTERVAL = 0.1;

async function start(): Promise<void> {
  // The code is here: the page's stall check (index.html) stands down, and the loading bar takes over.
  (window as unknown as { __tarvenStarted?: boolean }).__tarvenStarted = true;
  // A load that got this far worked: the next dropped download gets its one automatic retry again.
  try {
    sessionStorage.removeItem("tarven.retried");
  } catch {
    // No session storage: the retry just isn't remembered.
  }
  // The loading bar: it fills as the models download, then step by step as the game gets ready.
  const loading = new LoadScreen(document.getElementById("status")!);

  // Right-click belongs to the game, not the browser's menu. Text boxes keep it, for copy and paste.
  window.addEventListener("contextmenu", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, [contenteditable='true']")) return;
    event.preventDefault();
  });

  const renderer = new WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = BasicShadowMap;
  renderer.shadowMap.autoUpdate = false;
  document.body.prepend(renderer.domElement);

  const pipeline = new RetroPipeline(renderer);
  const town = townLook(location.search, import.meta.env.DEV);
  const scene = new Scene();
  scene.background = new Color(0x050404);
  // One clock for the whole world; the lighting follows it. Indoors, so no sky is painted.
  const clock = new WorldClock();
  const lighting = new DayNightLighting(scene);

  const camera = new PerspectiveCamera(32, 1, 0.5, 60);

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    pipeline.resize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", resize);
  resize();

  const base = import.meta.env.BASE_URL;
  const loader = new GLTFLoader();
  const files = ["world", "male", "female", "props"];
  const tally = new DownloadTally(files);
  const fetchModel = (name: string) =>
    loader
      .loadAsync(`${base}models/${name}.glb`, (event) => {
        tally.update(name, event.loaded, event.lengthComputable ? event.total : 0);
        loading.show("download", tally.fraction, tally.megabytes);
      })
      .then((file) => {
        tally.done(name);
        loading.show("download", tally.fraction, tally.megabytes);
        return file;
      });
  // Her hand-painted layers from the Blender bridge, if any (paint.ts), alongside the models.
  const painted = loadPaint(base, "female");
  const [worldFile, maleFile, femaleFile, propsFile] = await Promise.all(files.map(fetchModel));
  await painted;
  // The town kit for the high street. The game still runs without it, with a plainer street.
  const streetKit = await loader
    .loadAsync(`${base}models/streetkit.glb`)
    .then((file) => {
      applyRetroLook(file.scene);
      return file.scene;
    })
    .catch(() => null);

  loading.show("world", 0);
  await nextPaint();
  // Her bedroom behind the taproom's east door, the stair hall through the west wall, and the floor upstairs (the
  // Lantern's room and the guest rooms).
  addBedroom(worldFile.scene);
  addStairHall(worldFile.scene);
  addUpstairs(worldFile.scene);
  addBin(worldFile.scene);
  addWashTub(worldFile.scene);
  addBakery(worldFile.scene);
  addFrontDoorway(worldFile.scene);
  // What the story has put in the tavern: Wren's red lantern, and her book stand with the red book's pieces.
  addStoryProps(worldFile.scene);
  const claimed = claimFurniture(worldFile.scene);
  const world = setupWorld(worldFile.scene, [...WHOLE_PIECES, ...STORY_PIECES, ...claimed.whole]);
  scene.add(worldFile.scene);
  lighting.addSkyGlow(worldFile.scene, ["T_window"]);

  loading.show("game", 0);
  await nextPaint();
  const input = new Input();
  const audio = new Soundscape(base);
  // For testing: ?mute on the address (development only) starts muted, whatever was saved.
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("mute")) audio.change({ muted: true });
  const game = new Game(scene, input, world, {
    male: maleFile.scene,
    female: femaleFile.scene,
    props: propsFile.scene,
    streetKit,
    furniture: claimed.defaults,
  }, camera, renderer, clock, audio);
  // For testing in the browser (development only): the game, reachable from the console.
  if (import.meta.env.DEV) (window as unknown as { __game?: Game }).__game = game;
  // In development, a reload (every saved file) comes back to where it was, a brawl mid-turn and all (devresume.ts).
  installDevResume(game);

  const focus = new Vector3();
  const updateCameraTarget = () => {
    if (game.buildFocus) {
      focus.copy(game.buildFocus);
      return;
    }
    // Her bedroom and the stair hall are off the side of the main room's shot, and upstairs is a floor of its own: the
    // camera holds on the room she's in there, or follows her along the corridor (upstairs.ts roomViewAt).
    if (game.roomView(focus)) return;
    const limits = game.cameraLimits;
    focus.set(
      MathUtils.clamp(game.focus.x, limits.minX, limits.maxX),
      game.outdoors ? STREET_FOCUS_HEIGHT : 0.8,
      MathUtils.clamp(game.focus.z, limits.minZ, limits.maxZ),
    );
  };
  updateCameraTarget();
  const look = focus.clone();
  let zoom = 1;
  const offset = CAMERA_OFFSET.clone();
  let wasOutdoors = false;
  camera.position.copy(look).add(CAMERA_OFFSET);
  camera.lookAt(look);

  // Development only: the Blender bridge's camera and screenshots (devview.ts).
  const devView = import.meta.env.DEV ? new DevView(camera, game, renderer.domElement) : null;
  if (import.meta.env.DEV) {
    // town: its palette and lines can be swapped live (palettes.ts PALETTES) to compare looks.
    Object.assign(window, {
      __tarven: {
        game, world, renderer, clock, audio, town, palettes: PALETTES,
        viewHer: devView!.viewHer.bind(devView), shot: devView!.shot.bind(devView),
      },
    });
    // The Blender bridge's "Game shot" (vite.config.ts): look at her from Blender's camera and send the frame back.
    import.meta.hot?.on("tarven:view", async (view: Parameters<DevView["viewHer"]>[0] & { shot?: boolean; keep?: boolean }) => {
      devView!.viewHer(view);
      if (!view?.shot) return;
      const url = await devView!.shot();
      await fetch("/__tarven/shot", { method: "POST", body: url });
      if (!view.keep) devView!.viewHer(null);
    });
  }

  // Every shader the first frames need, compiled now (in the background where the browser can), rather than
  // freezing the first frame with nothing on screen to say why.
  loading.show("shaders", 0);
  await nextPaint();
  await renderer.compileAsync(scene, camera);

  let last = performance.now();
  let elapsed = 0;
  let nextShadowUpdate = 0;
  renderer.setAnimationLoop((now) => {
    const dt = MathUtils.clamp((now - last) / 1000, 0, MAX_FRAME_TIME);
    last = now;
    elapsed += dt;

    game.update(dt);
    world.update(elapsed);
    lighting.setSky(game.outdoors);
    lighting.apply(clock);

    updateCameraTarget();
    const shot = game.closeup;
    if (devView?.apply()) {
      // A Blender view of her (devview.ts) holds the camera.
    } else if (shot) {
      // Hold the staged shot; the follow camera starts settled on the player afterwards.
      look.copy(focus);
      camera.position.copy(shot.eye);
      camera.lookAt(shot.target);
    } else {
      const follow = 1 - Math.exp(-CAMERA_FOLLOW_RATE * dt);
      look.lerp(focus, follow);
      zoom += (game.cameraZoom - zoom) * follow;
      offset.lerp(game.outdoors ? STREET_CAMERA_OFFSET : CAMERA_OFFSET, game.outdoors === wasOutdoors ? follow : 1);
      wasOutdoors = game.outdoors;
      camera.position.copy(look).addScaledVector(offset, zoom);
      camera.lookAt(look);
    }

    if (elapsed >= nextShadowUpdate) {
      renderer.shadowMap.needsUpdate = true;
      nextShadowUpdate = elapsed + SHADOW_UPDATE_INTERVAL;
    }

    game.renderSpeech();
    // The town is drawn as pixel art in its own palette (palettes.ts TOWN_LOOK); the tavern keeps the usual look.
    pipeline.setPalette(game.outdoors ? town.palette : null);
    pipeline.setLines(game.outdoors ? town.lines : null);
    pipeline.render(scene, camera);
    devView?.afterRender();
  });

  loading.finish();
}

start().catch((error: unknown) => {
  console.error(error);
  const status = document.getElementById("status");
  if (status) {
    status.classList.remove("loading");
    status.removeAttribute("role");
    status.textContent = `Could not start the game: ${String(error)}`;
  }
});
