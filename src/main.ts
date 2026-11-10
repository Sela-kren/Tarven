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
import { addBedroom, addBin, addFrontDoorway, BEDROOM_FROM_X, BEDROOM_SOUTH_Z, BEDROOM_VIEW } from "./game/furnishings";
import { Game, WHOLE_PIECES } from "./game/game";
import { claimFurniture } from "./game/houseview";
import { Input } from "./game/input";
import { DayNightLighting } from "./game/lighting";
import { RetroPipeline } from "./game/retro";
import { WorldClock } from "./game/time";
import { setupWorld } from "./game/world";

// 3/4 view: looking 45 degrees down, so both tops and fronts of things show.
const CAMERA_OFFSET = new Vector3(0, 10, 10);
const CAMERA_FOLLOW_RATE = 8;
const MAX_FRAME_TIME = 1 / 20;
const SHADOW_UPDATE_INTERVAL = 0.1;

async function start(): Promise<void> {
  const status = document.getElementById("status")!;

  const renderer = new WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = BasicShadowMap;
  renderer.shadowMap.autoUpdate = false;
  document.body.prepend(renderer.domElement);

  const pipeline = new RetroPipeline(renderer);
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
  const [worldFile, maleFile, femaleFile, propsFile] = await Promise.all([
    loader.loadAsync(`${base}models/world.glb`),
    loader.loadAsync(`${base}models/male.glb`),
    loader.loadAsync(`${base}models/female.glb`),
    loader.loadAsync(`${base}models/props.glb`),
  ]);

  addBedroom(worldFile.scene);
  addBin(worldFile.scene);
  addFrontDoorway(worldFile.scene);
  const claimed = claimFurniture(worldFile.scene);
  const world = setupWorld(worldFile.scene, [...WHOLE_PIECES, ...claimed.whole]);
  scene.add(worldFile.scene);
  lighting.addSkyGlow(worldFile.scene, ["T_window"]);

  const input = new Input();
  const audio = new Soundscape(base);
  const game = new Game(scene, input, world, {
    male: maleFile.scene,
    female: femaleFile.scene,
    props: propsFile.scene,
    furniture: claimed.defaults,
  }, camera, renderer, clock, audio);

  const focus = new Vector3();
  const updateCameraTarget = () => {
    if (game.buildFocus) {
      focus.copy(game.buildFocus);
      return;
    }
    // The bedroom is off the side of the main room's shot, so the camera moves over to look at it.
    if (game.focus.x > BEDROOM_FROM_X && game.focus.z < BEDROOM_SOUTH_Z) {
      focus.copy(BEDROOM_VIEW);
      return;
    }
    const limits = game.cameraLimits;
    focus.set(
      MathUtils.clamp(game.focus.x, limits.minX, limits.maxX),
      0.8,
      MathUtils.clamp(game.focus.z, limits.minZ, limits.maxZ),
    );
  };
  updateCameraTarget();
  const look = focus.clone();
  let zoom = 1;
  camera.position.copy(look).add(CAMERA_OFFSET);
  camera.lookAt(look);

  if (import.meta.env.DEV) {
    Object.assign(window, { __tarven: { game, world, renderer, clock, audio } });
  }

  let last = performance.now();
  let elapsed = 0;
  let nextShadowUpdate = 0;
  renderer.setAnimationLoop((now) => {
    const dt = MathUtils.clamp((now - last) / 1000, 0, MAX_FRAME_TIME);
    last = now;
    elapsed += dt;

    game.update(dt);
    world.update(elapsed);
    lighting.apply(clock);

    updateCameraTarget();
    const shot = game.closeup;
    if (shot) {
      // Hold the staged shot; the follow camera starts settled on the player afterwards.
      look.copy(focus);
      camera.position.copy(shot.eye);
      camera.lookAt(shot.target);
    } else {
      const follow = 1 - Math.exp(-CAMERA_FOLLOW_RATE * dt);
      look.lerp(focus, follow);
      zoom += (game.cameraZoom - zoom) * follow;
      camera.position.copy(look).addScaledVector(CAMERA_OFFSET, zoom);
      camera.lookAt(look);
    }

    if (elapsed >= nextShadowUpdate) {
      renderer.shadowMap.needsUpdate = true;
      nextShadowUpdate = elapsed + SHADOW_UPDATE_INTERVAL;
    }

    game.renderSpeech();
    pipeline.render(scene, camera);
  });

  status.remove();
}

start().catch((error: unknown) => {
  console.error(error);
  const status = document.getElementById("status");
  if (status) status.textContent = `Could not start the game: ${String(error)}`;
});
