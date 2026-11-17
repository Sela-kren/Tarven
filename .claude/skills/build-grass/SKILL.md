---
name: build-grass
description: Build stylized wind-blown grass (with flowers, colour patches, character push, toon light and cloud shadows) in Blender from tools/blender/build_grass.py. Use when the user asks for grass, a meadow, a field, a lawn, a yard or any outdoor ground cover in Blender, wants to tweak the grass look, or wants a grass test render.
---

# Build grass

Grass for Tarven's outdoor scenes. The builder is `tools/blender/build_grass.py`, a Blender port of
Dylearn's Godot grass ("How I made grass better than 99% of games"). It makes:

- Billboarded grass quads scattered on a ground plane by geometry nodes, lit with the ground normal and casting no shadows
- Colour patches from world-space noise, the same on grass and ground
- Accent blades (taller and darker, or short and yellow) and flowers (white, pink and blue petals)
- World-space wind from two diverging noises, played back at a stepped framerate (8 fps by default)
- Characters pushing the grass aside: put any object in the `SGrass_Characters` collection, and its `scale.x` sets how wide it pushes
- Toon light steps with soft edges, plus cloud shadows that drift across the ground

Everything it makes is named `SGrass_*`. Running it again replaces its own objects and leaves the rest of the scene alone.

## Run it

Blender 5.1 is at `D:\blender\blender.exe` (not on PATH). It works headless with no `TARVEN_ROOT` needed.

**Test render (headless, about 3 s):**
```bash
cd /d/blender && ./blender.exe -b --factory-startup \
  --python "D:/game dev/game_making/Tarven/tools/blender/build_grass.py" -- \
  clear=1 frame=60 render="<scratchpad>/grass.png"
```
Then open the PNG with Read and look at it. Check every render: if flowers or accents turn into solid
black boxes, the grass material's render method has been set back to `BLENDED` (keep it `DITHERED`).

**Save a .blend:** add `blend="<path>.blend"`. Keep test files in the scratchpad, and only save into `art/`
when the user asks. Their Blender overwrites a .blend when they close it (see memory "Blend file handoff"),
so don't write to a file they have open.

**Into the user's open Blender (Blender MCP, if it's running):**
```python
import sys; sys.path.insert(0, r"D:/game dev/game_making/Tarven/tools/blender")
import importlib, build_grass; importlib.reload(build_grass)
build_grass.build(density=30, make_camera=False, make_demo_character=False)
```
Pass `make_camera=False` and `make_demo_character=False` in someone's own scene, so it doesn't add a camera or a test sphere.
`build()` always makes a fresh `SGrass_Ground` plane. To grow grass on a mesh that's already in the scene, add a
Geometry Nodes modifier to that mesh with the `SGrass_Scatter` node group, after one `build()` has created the group.

## Options

Pass any `CONFIG` key as `key=value` (Python literals) on the command line, or as keyword arguments to `build()`.

| Option | Default | What it does |
|---|---|---|
| `ground_size` | 10.0 | Size of the ground plane, in metres |
| `density` | 40 | Grass quads per m² (also on the modifier, live) |
| `quad_size`, `size_jitter` | 0.32, 0.3 | Blade sprite height, and how much blade sizes vary |
| `accent1_prob` / `accent2_prob` / `flower_prob` | 0.05 / 0.04 / 0.035 | How often accent blades and flowers appear |
| `flower_colors`, `flower_center` | white, pink, blue / yellow | Petal colours (one picked at random per flower) |
| `grass_color`, `patch1_color`, `patch2_color` | greens | Base colour and the two patch colours |
| `wind_direction`, `wind_speed`, `wind_max_angle_deg` | (1,0.4,0), 0.8, 35 | Wind |
| `grass_fps` | 8 | Wind animation framerate (stepped look) |
| `push_radius`, `push_angle_deg` | 0.9, 60 | Character push |
| `toon_cuts`, `toon_gradient`, `ambient` | 3, 0.25, 0.45 | Toon light steps |
| `cloud_strength`, `cloud_scale`, `cloud_speed` | 0.35, 0.12, 0.15 | Cloud shadows (0 turns them off) |
| `pixel_res` | (384, 216) | Render size. The low default gives a pixel-art render |
| `sprite_filter` | "Closest" | "Closest" gives crisp pixel blades, "Linear" gives soft ones |
| `full_billboard` | True | Also tilts each quad up toward the camera |
| `make_camera`, `make_demo_character` | True, True | Adds a test ortho camera and a moving test sphere |
| `seed` | 0 | Changes the scatter |

Extra command-line keys: `clear=1` empties the scene first, `render=<png>`, `frame=<n>`, `blend=<path>`.

## Tarven's look

The game moved to the painted toon look of the hero-shooter refs on 2026-11-16. Pixel-art and dithered looks
are out. For game-facing renders, use `"pixel_res=(1920,1080)" sprite_filter=Linear`. The 16×20 pixel sprites
still look a little blocky up close. If the user wants grass up close, draw bigger blade sprites in
`_sprite_image` (for example 64×80).

## Getting it into the game

The game runs on three.js. This grass is made of Blender geometry nodes and shader nodes, and **neither
survives a GLB export**: no billboarding, no wind, no push, no toon shader. Don't export it with
`build_world.py` and expect it to work. To use it in the game, port the same ideas to three.js:

- One `InstancedMesh` of the quad, with per-instance attributes `accent`, `rand` and a random phase
- A `ShaderMaterial` (or `onBeforeCompile` on the toon material) that does the billboard, wind (two noises,
  stepped time) and push (a uniform array of character positions) in the vertex shader, and the patch colours,
  sprite alpha cut, toon steps and clouds in the fragment shader. The node math in `build_grass.py` is the spec.
- Light the grass with the world clock (`src/game/time.ts`, `sunHeight`), so the grass matches the time of day.

This port hasn't been built yet. Ask the user before starting it.
