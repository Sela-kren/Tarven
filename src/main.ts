import {
  AmbientLight,
  BasicShadowMap,
  Color,
  HemisphereLight,
  MathUtils,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Game } from "./game/game";
import { Input } from "./game/input";
import { RetroPipeline } from "./game/retro";
import { setupWorld } from "./game/world";

// 3/4 view: looking 45 degrees down, so both tops and fronts of things show.
const CAMERA_OFFSET = new Vector3(0, 10, 10);
const CAMERA_FOLLOW_RATE = 8;
// Tight limits keep nearly the whole room in view, so you can watch both siblings' jobs.
const CAMERA_LIMIT_X = 0.5;
const CAMERA_LIMIT_Z = 1;
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
  scene.add(new AmbientLight(0x6a6480, 0.55));
  scene.add(new HemisphereLight(0x8fa4d0, 0x2a1a10, 0.5));

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

  const world = setupWorld(worldFile.scene);
  scene.add(worldFile.scene);

  const input = new Input();
  const game = new Game(scene, input, world, {
    male: maleFile.scene,
    female: femaleFile.scene,
    props: propsFile.scene,
  }, camera, renderer);

  const focus = new Vector3();
  const updateCameraTarget = () => {
    focus.set(
      MathUtils.clamp(game.focus.x, -CAMERA_LIMIT_X, CAMERA_LIMIT_X),
      0.8,
      MathUtils.clamp(game.focus.z, -CAMERA_LIMIT_Z, CAMERA_LIMIT_Z),
    );
  };
  updateCameraTarget();
  const look = focus.clone();
  camera.position.copy(look).add(CAMERA_OFFSET);
  camera.lookAt(look);

  if (import.meta.env.DEV) {
    Object.assign(window, { __tarven: { game, world, renderer } });
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

    updateCameraTarget();
    const shot = game.closeup;
    if (shot) {
      // Hold the staged shot; the follow camera starts settled on the active sibling afterwards.
      look.copy(focus);
      camera.position.copy(shot.eye);
      camera.lookAt(shot.target);
    } else {
      look.lerp(focus, 1 - Math.exp(-CAMERA_FOLLOW_RATE * dt));
      camera.position.copy(look).add(CAMERA_OFFSET);
      camera.lookAt(look);
    }

    if (elapsed >= nextShadowUpdate) {
      renderer.shadowMap.needsUpdate = true;
      nextShadowUpdate = elapsed + SHADOW_UPDATE_INTERVAL;
    }

    pipeline.render(scene, camera);
  });

  status.remove();
}

start().catch((error: unknown) => {
  console.error(error);
  const status = document.getElementById("status");
  if (status) status.textContent = `Could not start the game: ${String(error)}`;
});
