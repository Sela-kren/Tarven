"""
Stylized 3D pixel-art grass for Blender 4.2+ / 5.x.

A Blender port of Dylearn's Godot grass ("How I made grass better than 99% of games",
https://www.youtube.com/watch?v=OxsuWDtjuGw). Each section below is tagged with the
video chapter it reproduces.

  - Quads with a pixel-art grass sprite, scattered on the ground, billboarded to the
    camera, alpha cut-out, no shadow casting, lit with the GROUND normal       [0:34]
  - Colour patches: world-space noise thresholds, same on grass and ground     [2:10]
  - Accent grass: per-instance random vs probability -> other size/colour/sprite [2:36]
  - World-space wind: two noises along diverged directions, multiplied, clamped,
    tilting blades around the axis perpendicular to the wind; + small view sway [3:04]
  - Fake perspective: UV.x of the sprite scaled toward the tip as the blade
    leans toward/away from an orthographic camera                              [5:14]
  - Stepped framerate: time quantised per blade, phase-shifted by a position seed [7:59]
  - Character displacement: any number of characters (a collection), circular
    mask^exponent, summed and clamped                                          [9:34]
  - Hybrid toon shading: stepped light cuts with smoothstepped edges            [13:42]
  - Cloud shadows: noise projected along the sun direction                      [15:07]

Run inside Blender (Scripting tab, `blender -P build_grass.py`, or an MCP code tool).
Edit CONFIG, or `import build_grass; build_grass.build(density=30, ...)`.
"""
import bpy
import math

CONFIG = dict(
    ground_size=10.0,
    density=40.0,             # grass quads per m^2
    quad_size=0.32,           # metres, height of one grass sprite quad
    size_jitter=0.3,
    # accents (video 2:36): probability, scale, height multiplier, colour
    accent1_prob=0.05, accent1_scale=1.15, accent1_height=1.4, accent1_color=(0.45, 0.68, 0.16, 1),
    accent2_prob=0.04, accent2_scale=0.7, accent2_height=0.9, accent2_color=(0.72, 0.80, 0.25, 1),
    # flowers: a third accent type; petals pick randomly from flower_colors
    flower_prob=0.035, flower_scale=1.7, flower_height=1.25,
    flower_colors=((0.96, 0.96, 0.92, 1), (0.95, 0.52, 0.68, 1), (0.55, 0.62, 0.98, 1)),
    flower_center=(1.0, 0.82, 0.18, 1),
    # colour patches (video 2:10): base + two patch colours
    grass_color=(0.20, 0.42, 0.10, 1),
    patch1_color=(0.28, 0.52, 0.12, 1),
    patch2_color=(0.14, 0.33, 0.08, 1),
    patch1_scale=0.35, patch1_threshold=0.52,
    patch2_scale=0.22, patch2_threshold=0.55,
    # wind (video 3:04)
    wind_direction=(1.0, 0.4, 0.0),
    wind_speed=0.8,
    wind_scale=0.25,
    wind_divergence_deg=25.0,
    wind_max_angle_deg=35.0,
    wind_brightness=0.0,      # "arbitrary value to adjust the brightness of the pattern"
    view_sway_deg=4.0,        # small view-space sway kept on top of world wind
    # fake perspective (video 5:14)
    fake_perspective=0.6,
    # stepped framerate (video 7:59)
    grass_fps=8.0,            # wind animation framerate (scene keeps its own fps)
    # character displacement (video 9:34)
    push_radius=0.9,          # multiplied by each character object's scale.x
    push_exponent=2.0,
    push_angle_deg=60.0,
    # toon (video 13:42)
    toon_cuts=3,
    toon_gradient=0.25,       # 0 = hard toon, 1 = fully smooth
    ambient=0.45,
    # clouds (video 15:07)
    cloud_strength=0.35, cloud_scale=0.12, cloud_speed=0.15,
    # pixel-art render
    pixel_res=(384, 216),     # Tarven's look is painted toon now: use (1920, 1080) for a clean render
    sprite_filter="Closest",  # "Closest" = crisp pixel sprites, "Linear" = soft (toon look)
    ortho_scale=8.0,
    full_billboard=True,      # also pitch quads toward the camera (Godot "billboard enabled")
    make_camera=True,
    make_demo_character=True,
    seed=0,
)

P = "SGrass_"


# ------------------------------------------------------------------ small helpers
def _rm(name, coll):
    old = coll.get(name)
    if old is not None:
        coll.remove(old)


def N(tree, kind, loc=(0, 0), **props):
    n = tree.nodes.new(kind)
    n.location = loc
    for k, v in props.items():
        setattr(n, k, v)
    return n


def L(tree, a, b):
    """link output socket a -> input socket b"""
    tree.links.new(a, b)


def M(tree, op, a=None, b=None, loc=(0, 0), clamp=False):
    """Math node; a/b may be sockets or numbers. Returns output socket."""
    n = N(tree, "ShaderNodeMath", loc, operation=op, use_clamp=clamp)
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            L(tree, v, n.inputs[i])
    return n.outputs[0]


def VM(tree, op, a=None, b=None, scale=None, loc=(0, 0)):
    n = N(tree, "ShaderNodeVectorMath", loc, operation=op)
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (tuple, list)):
            n.inputs[i].default_value = v
        else:
            L(tree, v, n.inputs[i])
    if scale is not None:
        if isinstance(scale, (int, float)):
            n.inputs["Scale"].default_value = scale
        else:
            L(tree, scale, n.inputs["Scale"])
    return n.outputs["Value"] if op in ("DOT_PRODUCT", "LENGTH", "DISTANCE") else n.outputs["Vector"]


def XYZ(tree, x=0.0, y=0.0, z=0.0, loc=(0, 0)):
    n = N(tree, "ShaderNodeCombineXYZ", loc)
    for s, v in zip("XYZ", (x, y, z)):
        if isinstance(v, (int, float)):
            n.inputs[s].default_value = v
        else:
            L(tree, v, n.inputs[s])
    return n.outputs[0]


def SEP(tree, v, loc=(0, 0)):
    n = N(tree, "ShaderNodeSeparateXYZ", loc)
    L(tree, v, n.inputs[0])
    return n.outputs


def MAPR(tree, value, fmin, fmax, tmin=0.0, tmax=1.0, interp="LINEAR", loc=(0, 0)):
    n = N(tree, "ShaderNodeMapRange", loc, interpolation_type=interp, clamp=True)
    for sock, v in (("Value", value), ("From Min", fmin), ("From Max", fmax),
                    ("To Min", tmin), ("To Max", tmax)):
        if isinstance(v, (int, float)):
            n.inputs[sock].default_value = v
        else:
            L(tree, v, n.inputs[sock])
    return n.outputs["Result"]


def NOISE2D(tree, vec, scale=1.0, detail=1.0, loc=(0, 0)):
    n = N(tree, "ShaderNodeTexNoise", loc, noise_dimensions="2D")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    L(tree, vec, n.inputs["Vector"])
    return n.outputs["Fac"]


# ------------------------------------------------------------------ sprites [0:34]
def _sprite_image(name, blades, w=16, h=20):
    """Pixel-art grass sprite drawn procedurally. blades: (x_base, x_tip, height, width)."""
    _rm(name, bpy.data.images)
    img = bpy.data.images.new(name, w, h, alpha=True)
    # transparent texels carry a mid shade (not black) so GPU mipmaps don't leak dark pixels
    px = [0.8, 0.8, 0.8, 0.0] * (w * h)
    for xb, xt, bh, bw in blades:
        top = int(bh * (h - 1))
        for y in range(top + 1):
            t = y / max(top, 1)
            x = xb + (xt - xb) * t * t           # curved blade
            half = max(bw * (1 - t), 0.5)
            shade = 0.70 + 0.30 * t              # darker at the base, light tip
            if y == top:
                shade = 1.0
            for xi in range(int(round(x - half)), int(round(x + half)) + 1):
                if 0 <= xi < w:
                    i = (y * w + xi) * 4
                    px[i:i + 4] = [shade, shade, shade, 1.0]
    img.pixels[:] = px
    img.pack()
    return img


def _flower_image(name, w=16, h=20):
    """Pixel-art flower. Channels are masks, not colours: R = shade, G = petal, B = centre.
    The shader turns them into stem (grass patch colour), petal colour and centre colour."""
    _rm(name, bpy.data.images)
    img = bpy.data.images.new(name, w, h, alpha=True)
    px = [0.8, 0.0, 0.0, 0.0] * (w * h)

    def put(x, y, shade, petal=0.0, centre=0.0):
        if 0 <= x < w and 0 <= y < h:
            i = (y * w + x) * 4
            px[i:i + 4] = [shade, petal, centre, 1.0]

    cx, head = 8, 14
    for y in range(head):                      # stem with a slight bend
        put(cx + (1 if 5 <= y < 10 else 0), y, 0.70 + 0.2 * y / head)
    for x, y in ((6, 4), (5, 5), (10, 6), (11, 7)):   # two small leaves
        put(x, y, 0.85)
    petals = [(-2, 0), (2, 0), (0, -2), (0, 2), (-1, -1), (1, -1), (-1, 1), (1, 1),
              (-2, 1), (2, -1), (-1, 2), (1, -2)]
    for dx, dy in petals:
        put(cx + dx, head + dy, 1.0 if dy >= 0 else 0.85, petal=1.0)
    put(cx, head, 1.0, centre=1.0)
    img.pixels[:] = px
    img.pack()
    return img


def make_sprites():
    clump = _sprite_image(P + "Sprite", [
        (7.5, 2.0, 0.70, 1.2), (7.5, 7.0, 1.00, 1.4), (8.0, 13.0, 0.80, 1.2),
        (6.5, 4.5, 0.50, 1.0), (9.0, 11.0, 0.55, 1.0)])
    accent = _sprite_image(P + "SpriteAccent", [
        (7.5, 8.5, 1.00, 0.9), (7.5, 3.0, 0.45, 0.8), (8.0, 12.5, 0.55, 0.8)])
    flower = _flower_image(P + "SpriteFlower")
    return clump, accent, flower


def make_quad(c):
    name = P + "Quad"
    _rm(name, bpy.data.objects)
    _rm(name, bpy.data.meshes)
    s = c["quad_size"]
    w = s * 16 / 20
    me = bpy.data.meshes.new(name)
    me.from_pydata([(-w / 2, 0, 0), (w / 2, 0, 0), (w / 2, 0, s), (-w / 2, 0, s)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name="UVMap")
    for li, co in zip(range(4), [(0, 0), (1, 0), (1, 1), (0, 1)]):
        uv.data[li].uv = co
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.hide_render = ob.hide_viewport = True
    return ob


# ------------------------------------------------------------------ shared shading
def _time_value(nt, loc):
    """Seconds, driven from the frame number (shader-side clock for clouds)."""
    v = N(nt, "ShaderNodeValue", loc)
    fcu = v.outputs[0].driver_add("default_value")
    fcu.driver.expression = f"frame / {bpy.context.scene.render.fps}"
    return v.outputs[0]


def _patch_color(nt, c, pos, x=-1400):
    """[2:10] world-space noise thresholds pick one of three colours."""
    n1 = NOISE2D(nt, pos, c["patch1_scale"], 2.0, (x, 400))
    n2 = NOISE2D(nt, VM(nt, "ADD", pos, (37.1, 11.3, 0), loc=(x - 200, 250)), c["patch2_scale"], 2.0, (x, 250))
    m1 = M(nt, "GREATER_THAN", n1, c["patch1_threshold"], (x + 200, 400))
    m2 = M(nt, "GREATER_THAN", n2, c["patch2_threshold"], (x + 200, 250))
    mix1 = N(nt, "ShaderNodeMix", (x + 400, 400), data_type="RGBA")
    mix1.inputs[6].default_value = c["grass_color"]
    mix1.inputs[7].default_value = c["patch1_color"]
    L(nt, m1, mix1.inputs[0])
    mix2 = N(nt, "ShaderNodeMix", (x + 600, 300), data_type="RGBA")
    L(nt, mix1.outputs[2], mix2.inputs[6])
    mix2.inputs[7].default_value = c["patch2_color"]
    L(nt, m2, mix2.inputs[0])
    return mix2.outputs[2]


def _light(nt, c, sun, x=-600):
    """Ground-normal diffuse -> luminance -> clouds -> hybrid toon [13:42][15:07]."""
    diff = N(nt, "ShaderNodeBsdfDiffuse", (x - 600, -300))
    diff.inputs["Color"].default_value = (1, 1, 1, 1)
    up = N(nt, "ShaderNodeCombineXYZ", (x - 800, -400))
    up.inputs["Z"].default_value = 1.0
    L(nt, up.outputs[0], diff.inputs["Normal"])   # every blade lit like the ground under it
    s2r = N(nt, "ShaderNodeShaderToRGB", (x - 400, -300))
    L(nt, diff.outputs[0], s2r.inputs[0])
    bw = N(nt, "ShaderNodeRGBToBW", (x - 200, -300))
    L(nt, s2r.outputs["Color"], bw.inputs[0])
    lum = M(nt, "MULTIPLY", bw.outputs[0], 1.0 / math.pi * 1.6, (x, -300), clamp=True)

    # clouds: sun-space XY == world position projected along the light direction
    if sun is not None and c["cloud_strength"] > 0:
        tc = N(nt, "ShaderNodeTexCoord", (x - 600, -600), object=sun)
        t = _time_value(nt, (x - 600, -800))
        off = XYZ(nt, M(nt, "MULTIPLY", t, c["cloud_speed"], (x - 400, -800)), 0.0, 0.0, (x - 200, -800))
        cv = VM(nt, "ADD", tc.outputs["Object"], off, loc=(x - 200, -600))
        cn = NOISE2D(nt, cv, c["cloud_scale"], 3.0, (x, -600))
        shadow = MAPR(nt, cn, 0.48, 0.58, 1.0, 1.0 - c["cloud_strength"], "SMOOTHSTEP", (x + 200, -600))
        lum = M(nt, "MULTIPLY", lum, shadow, (x + 200, -300))

    # hybrid toon: v = (c - w) + smoothstep(c - h, c + h, L) * w, c = round(L*N)/N
    n_cuts = float(max(c["toon_cuts"], 1))
    w = 1.0 / n_cuts
    h = max(c["toon_gradient"], 1e-3) * w / 2
    cc = M(nt, "DIVIDE", M(nt, "ROUND", M(nt, "MULTIPLY", lum, n_cuts, (x + 400, -300)), None, (x + 550, -300)),
           n_cuts, (x + 700, -300))
    lo = M(nt, "SUBTRACT", cc, h, (x + 850, -200))
    hi = M(nt, "ADD", cc, h, (x + 850, -400))
    t = MAPR(nt, lum, lo, hi, 0.0, 1.0, "SMOOTHSTEP", (x + 1000, -300))
    v = M(nt, "ADD", M(nt, "SUBTRACT", cc, w, (x + 1000, -500)), M(nt, "MULTIPLY", t, w, (x + 1150, -300)),
          (x + 1300, -350), clamp=True)
    amb = c["ambient"]
    return M(nt, "ADD", M(nt, "MULTIPLY", v, 1.0 - amb, (x + 1450, -350)), amb, (x + 1600, -350))


def _finish(nt, color, light, alpha=None, x=1400):
    mul = N(nt, "ShaderNodeMix", (x, 0), data_type="RGBA", blend_type="MULTIPLY")
    mul.inputs[0].default_value = 1.0
    L(nt, color, mul.inputs[6])
    lc = N(nt, "ShaderNodeCombineColor", (x - 200, -200))
    for s in ("Red", "Green", "Blue"):
        L(nt, light, lc.inputs[s])
    L(nt, lc.outputs[0], mul.inputs[7])
    emis = N(nt, "ShaderNodeEmission", (x + 200, 0))
    L(nt, mul.outputs[2], emis.inputs["Color"])
    out = N(nt, "ShaderNodeOutputMaterial", (x + 600, 0))
    if alpha is None:
        L(nt, emis.outputs[0], out.inputs["Surface"])
        return
    cut = M(nt, "GREATER_THAN", alpha, 0.5, (x + 200, -200))    # alpha scissor
    mixs = N(nt, "ShaderNodeMixShader", (x + 400, 0))
    tr = N(nt, "ShaderNodeBsdfTransparent", (x + 200, 150))
    L(nt, cut, mixs.inputs[0])
    L(nt, tr.outputs[0], mixs.inputs[1])
    L(nt, emis.outputs[0], mixs.inputs[2])
    L(nt, mixs.outputs[0], out.inputs["Surface"])


def make_ground_material(c, sun):
    name = P + "GroundMat"
    _rm(name, bpy.data.materials)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    pos = N(nt, "ShaderNodeNewGeometry", (-1800, 300)).outputs["Position"]
    col = _patch_color(nt, c, pos)
    _finish(nt, col, _light(nt, c, sun))
    return mat


def make_grass_material(c, sun, sprite, accent_sprite, flower_sprite):
    name = P + "GrassMat"
    _rm(name, bpy.data.materials)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    pos = N(nt, "ShaderNodeNewGeometry", (-1800, 300)).outputs["Position"]
    col = _patch_color(nt, c, pos)

    # accent id from geometry nodes: 0 normal, 1 = flower, 2 = accent2, 3 = accent1
    acc = N(nt, "ShaderNodeAttribute", (-1400, 700), attribute_type="INSTANCER", attribute_name="accent").outputs["Fac"]
    is_a1 = M(nt, "GREATER_THAN", acc, 2.5, (-1200, 750))
    is_any = M(nt, "GREATER_THAN", acc, 1.5, (-1200, 650))
    is_flower = M(nt, "MULTIPLY", M(nt, "GREATER_THAN", acc, 0.5, (-1200, 900)),
                  M(nt, "LESS_THAN", acc, 1.5, (-1200, 1000)), (-1000, 950))
    ca = N(nt, "ShaderNodeMix", (-1000, 700), data_type="RGBA")
    ca.inputs[6].default_value = c["accent2_color"]
    ca.inputs[7].default_value = c["accent1_color"]
    L(nt, is_a1, ca.inputs[0])
    cmix = N(nt, "ShaderNodeMix", (-600, 500), data_type="RGBA")
    L(nt, col, cmix.inputs[6])
    L(nt, ca.outputs[2], cmix.inputs[7])
    L(nt, is_any, cmix.inputs[0])

    # [5:14] fake perspective: uv.x = clamp((uv.x - .5) / (1 + uv.y * persp) + .5)
    uv = SEP(nt, N(nt, "ShaderNodeUVMap", (-1800, -100), uv_map="UVMap").outputs[0], (-1600, -100))
    persp = N(nt, "ShaderNodeAttribute", (-1800, -300), attribute_type="INSTANCER", attribute_name="persp").outputs["Fac"]
    k = M(nt, "ADD", M(nt, "MULTIPLY", M(nt, "MULTIPLY", uv["Y"], persp, (-1400, -250)),
                       c["fake_perspective"], (-1250, -250)), 1.0, (-1100, -250))
    k = M(nt, "MAXIMUM", k, 0.2, (-950, -250))
    ux = M(nt, "ADD", M(nt, "DIVIDE", M(nt, "SUBTRACT", uv["X"], 0.5, (-1400, -100)), k, (-950, -100)),
           0.5, (-800, -100), clamp=True)
    uvp = XYZ(nt, ux, uv["Y"], 0.0, (-650, -100))

    t1 = N(nt, "ShaderNodeTexImage", (-450, -50), image=sprite, interpolation=c["sprite_filter"], extension="CLIP")
    t2 = N(nt, "ShaderNodeTexImage", (-450, -350), image=accent_sprite, interpolation=c["sprite_filter"], extension="CLIP")
    L(nt, uvp, t1.inputs["Vector"])
    L(nt, uvp, t2.inputs["Vector"])
    tex = N(nt, "ShaderNodeMix", (-200, -100), data_type="RGBA")
    L(nt, is_any, tex.inputs[0])
    L(nt, t1.outputs["Color"], tex.inputs[6])
    L(nt, t2.outputs["Color"], tex.inputs[7])
    alpha = N(nt, "ShaderNodeMix", (-200, -300), data_type="FLOAT")
    L(nt, is_any, alpha.inputs[0])
    L(nt, t1.outputs["Alpha"], alpha.inputs[2])
    L(nt, t2.outputs["Alpha"], alpha.inputs[3])
    alb = N(nt, "ShaderNodeMix", (0, 300), data_type="RGBA", blend_type="MULTIPLY")
    alb.inputs[0].default_value = 1.0
    L(nt, cmix.outputs[2], alb.inputs[6])
    L(nt, tex.outputs[2], alb.inputs[7])

    # flowers: stem keeps the grass patch colour, petals pick a colour from a random
    # per-instance value, centre uses flower_center. Sprite channels: R shade, G petal, B centre.
    t3 = N(nt, "ShaderNodeTexImage", (-450, -650), image=flower_sprite, interpolation=c["sprite_filter"], extension="CLIP")
    L(nt, uvp, t3.inputs["Vector"])
    fm = SEP(nt, t3.outputs["Color"], (-250, -650))
    rnd = N(nt, "ShaderNodeAttribute", (-650, -900), attribute_type="INSTANCER", attribute_name="rand").outputs["Fac"]
    pal = N(nt, "ShaderNodeValToRGB", (-450, -900))
    pal.color_ramp.interpolation = "CONSTANT"
    cols = list(c["flower_colors"]) or [(1, 1, 1, 1)]
    els = pal.color_ramp.elements
    els[0].position, els[0].color = 0.0, cols[0]
    els[1].position, els[1].color = 1.0 - 1e-4, cols[-1]
    for i, colr in enumerate(cols[1:-1], start=1):
        e = els.new(i / len(cols))
        e.color = colr
    if len(cols) > 1:
        els[-1].position = (len(cols) - 1) / len(cols)
    L(nt, rnd, pal.inputs["Fac"])
    f1 = N(nt, "ShaderNodeMix", (-50, -650), data_type="RGBA")
    L(nt, col, f1.inputs[6])
    L(nt, pal.outputs["Color"], f1.inputs[7])
    L(nt, fm["Y"], f1.inputs[0])
    f2 = N(nt, "ShaderNodeMix", (100, -650), data_type="RGBA")
    L(nt, f1.outputs[2], f2.inputs[6])
    f2.inputs[7].default_value = c["flower_center"]
    L(nt, fm["Z"], f2.inputs[0])
    f3 = N(nt, "ShaderNodeMix", (250, -650), data_type="RGBA", blend_type="MULTIPLY")
    f3.inputs[0].default_value = 1.0
    L(nt, f2.outputs[2], f3.inputs[6])
    L(nt, XYZ(nt, fm["X"], fm["X"], fm["X"], (100, -800)), f3.inputs[7])
    alb2 = N(nt, "ShaderNodeMix", (400, 300), data_type="RGBA")
    L(nt, is_flower, alb2.inputs[0])
    L(nt, alb.outputs[2], alb2.inputs[6])
    L(nt, f3.outputs[2], alb2.inputs[7])
    alpha2 = N(nt, "ShaderNodeMix", (400, -300), data_type="FLOAT")
    L(nt, is_flower, alpha2.inputs[0])
    L(nt, alpha.outputs[0], alpha2.inputs[2])
    L(nt, t3.outputs["Alpha"], alpha2.inputs[3])

    _finish(nt, alb2.outputs[2], _light(nt, c, sun), alpha2.outputs[0])
    # The alpha is binary (scissor), so dithered is exact. BLENDED was used before, but in
    # Blender 5.1 every accent/flower instance then renders as a solid black box (tested
    # 2026-11-17: dithered renders them correctly, blended does not).
    if hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "DITHERED"
    else:
        mat.blend_method = "CLIP"
    return mat


# ------------------------------------------------------------------ geometry nodes
def make_node_group(c, quad, characters, camera):
    name = P + "Scatter"
    _rm(name, bpy.data.node_groups)
    ng = bpy.data.node_groups.new(name, "GeometryNodeTree")
    if hasattr(ng, "is_modifier"):
        ng.is_modifier = True
    iface = ng.interface
    iface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    iface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")

    def inp(n, st, d, lo=None, hi=None):
        s = iface.new_socket(n, in_out="INPUT", socket_type=st)
        s.default_value = d
        if lo is not None:
            s.min_value = lo
        if hi is not None:
            s.max_value = hi

    inp("Density", "NodeSocketFloat", c["density"], 0, 2000)
    inp("Size Jitter", "NodeSocketFloat", c["size_jitter"], 0, 1)
    inp("Accent 1 Probability", "NodeSocketFloat", c["accent1_prob"], 0, 1)
    inp("Accent 2 Probability", "NodeSocketFloat", c["accent2_prob"], 0, 1)
    inp("Flower Probability", "NodeSocketFloat", c["flower_prob"], 0, 1)
    inp("Wind Direction", "NodeSocketVector", c["wind_direction"])
    inp("Wind Speed", "NodeSocketFloat", c["wind_speed"], 0, 20)
    inp("Wind Scale", "NodeSocketFloat", c["wind_scale"], 0.001, 10)
    inp("Wind Divergence", "NodeSocketFloat", math.radians(c["wind_divergence_deg"]), 0, 1.6)
    inp("Wind Max Angle", "NodeSocketFloat", math.radians(c["wind_max_angle_deg"]), 0, 1.6)
    inp("Wind Brightness", "NodeSocketFloat", c["wind_brightness"], -1, 1)
    inp("View Sway", "NodeSocketFloat", math.radians(c["view_sway_deg"]), 0, 0.5)
    inp("Grass FPS", "NodeSocketFloat", c["grass_fps"], 1, 120)
    inp("Push Radius", "NodeSocketFloat", c["push_radius"], 0, 20)
    inp("Push Exponent", "NodeSocketFloat", c["push_exponent"], 0.1, 10)
    inp("Push Angle", "NodeSocketFloat", math.radians(c["push_angle_deg"]), 0, 1.6)
    inp("Seed", "NodeSocketInt", c["seed"], 0, 100000)
    s = iface.new_socket("Characters", in_out="INPUT", socket_type="NodeSocketCollection")
    s.default_value = characters

    g = N(ng, "NodeGroupInput", (-3200, 0))
    gi = g.outputs
    out = N(ng, "NodeGroupOutput", (2600, 0))

    # ---- scatter points (quads keep the terrain normal: Instance rotation from normal is
    #      replaced by the billboard; lighting uses the ground normal in the shader)
    dist = N(ng, "GeometryNodeDistributePointsOnFaces", (-2900, 600))
    L(ng, gi["Geometry"], dist.inputs["Mesh"])
    L(ng, gi["Density"], dist.inputs["Density"])
    L(ng, gi["Seed"], dist.inputs["Seed"])
    pts = dist.outputs["Points"]

    # ---- [9:34] character displacement, summed over a collection with a repeat zone
    cinfo = N(ng, "GeometryNodeCollectionInfo", (-2900, 200), transform_space="RELATIVE")
    L(ng, gi["Characters"], cinfo.inputs["Collection"])
    cinfo.inputs["Separate Children"].default_value = True
    cinfo.inputs["Reset Children"].default_value = False
    chars = cinfo.outputs[0]
    dsize = N(ng, "GeometryNodeAttributeDomainSize", (-2700, 200), component="INSTANCES")
    L(ng, chars, dsize.inputs[0])

    init = N(ng, "GeometryNodeStoreNamedAttribute", (-2700, 600), data_type="FLOAT_VECTOR", domain="POINT")
    init.inputs["Name"].default_value = "push"
    L(ng, pts, init.inputs["Geometry"])

    rin = N(ng, "GeometryNodeRepeatInput", (-2450, 450))
    rout = N(ng, "GeometryNodeRepeatOutput", (-1300, 450))
    rin.pair_with_output(rout)
    rout.repeat_items.new("INT", "Index")
    L(ng, dsize.outputs["Instance Count"], rin.inputs["Iterations"])
    L(ng, init.outputs[0], rin.inputs["Geometry"])

    pos_n = N(ng, "GeometryNodeInputPosition", (-2450, 100)).outputs[0]
    si_p = N(ng, "GeometryNodeSampleIndex", (-2250, 250), data_type="FLOAT_VECTOR", domain="INSTANCE")
    L(ng, chars, si_p.inputs["Geometry"])
    L(ng, pos_n, si_p.inputs["Value"])
    L(ng, rin.outputs["Index"], si_p.inputs["Index"])
    iscale = N(ng, "GeometryNodeInputInstanceScale", (-2450, 0)).outputs[0]
    si_s = N(ng, "GeometryNodeSampleIndex", (-2250, 50), data_type="FLOAT_VECTOR", domain="INSTANCE")
    L(ng, chars, si_s.inputs["Geometry"])
    L(ng, iscale, si_s.inputs["Value"])
    L(ng, rin.outputs["Index"], si_s.inputs["Index"])
    radius = M(ng, "MAXIMUM", M(ng, "MULTIPLY", SEP(ng, si_s.outputs[0], (-2050, 50))["X"], gi["Push Radius"],
                                 (-1900, 50)), 1e-4, (-1750, 50))
    d = VM(ng, "MULTIPLY", VM(ng, "SUBTRACT", pos_n, si_p.outputs[0], loc=(-2050, 250)), (1, 1, 0), loc=(-1900, 250))
    mask = M(ng, "POWER", M(ng, "SUBTRACT", 1.0, M(ng, "DIVIDE", VM(ng, "LENGTH", d, loc=(-1750, 300)), radius,
                                                     (-1600, 200), clamp=True), (-1450, 200)),
             gi["Push Exponent"], (-1450, 100))
    contrib = VM(ng, "SCALE", VM(ng, "NORMALIZE", d, loc=(-1750, 400)), scale=mask, loc=(-1450, 350))
    acc_prev = N(ng, "GeometryNodeInputNamedAttribute", (-1750, 550), data_type="FLOAT_VECTOR")
    acc_prev.inputs["Name"].default_value = "push"
    st = N(ng, "GeometryNodeStoreNamedAttribute", (-1350, 650), data_type="FLOAT_VECTOR", domain="POINT")
    st.inputs["Name"].default_value = "push"
    L(ng, rin.outputs["Geometry"], st.inputs["Geometry"])
    L(ng, VM(ng, "ADD", acc_prev.outputs["Attribute"], contrib, loc=(-1500, 550)), st.inputs["Value"])
    L(ng, st.outputs[0], rout.inputs["Geometry"])
    L(ng, M(ng, "ADD", rin.outputs["Index"], 1.0, (-1500, 300)), rout.inputs["Index"])
    pts = rout.outputs["Geometry"]

    push_attr = N(ng, "GeometryNodeInputNamedAttribute", (-1100, 250), data_type="FLOAT_VECTOR")
    push_attr.inputs["Name"].default_value = "push"
    pv = SEP(ng, push_attr.outputs["Attribute"], (-950, 250))
    push = VM(ng, "SCALE", XYZ(ng, M(ng, "MINIMUM", M(ng, "MAXIMUM", pv["X"], -1.0, (-800, 300)), 1.0, (-650, 300)),
                               M(ng, "MINIMUM", M(ng, "MAXIMUM", pv["Y"], -1.0, (-800, 200)), 1.0, (-650, 200)),
                               0.0, (-500, 250)), scale=gi["Push Angle"], loc=(-350, 250))

    # ---- [7:59] stepped framerate with a per-blade phase from a world-position seed
    stime = N(ng, "GeometryNodeInputSceneTime", (-2900, -400)).outputs["Seconds"]
    dt = M(ng, "DIVIDE", 1.0, gi["Grass FPS"], (-2700, -500))
    wn = N(ng, "ShaderNodeTexWhiteNoise", (-2700, -300), noise_dimensions="3D")
    L(ng, pos_n, wn.inputs["Vector"])
    phase = M(ng, "MULTIPLY", wn.outputs["Value"], dt, (-2500, -350))
    tq = M(ng, "MULTIPLY", M(ng, "FLOOR", M(ng, "DIVIDE", M(ng, "ADD", stime, phase, (-2350, -400)), dt,
                                             (-2200, -400)), None, (-2050, -400)), dt, (-1900, -400))

    # ---- [3:04] world-space wind: two diverging noise samples, multiplied and clamped
    wdir = VM(ng, "NORMALIZE", VM(ng, "MULTIPLY", gi["Wind Direction"], (1, 1, 0), loc=(-2900, -800)),
              loc=(-2750, -800))

    def rotz(vec, ang, loc):
        r = N(ng, "ShaderNodeVectorRotate", loc, rotation_type="Z_AXIS")
        L(ng, vec, r.inputs["Vector"])
        L(ng, ang, r.inputs["Angle"])
        return r.outputs[0]

    dir_a = rotz(wdir, gi["Wind Divergence"], (-2550, -700))
    dir_b = rotz(wdir, M(ng, "MULTIPLY", gi["Wind Divergence"], -1.0, (-2750, -950)), (-2550, -900))
    ts = M(ng, "MULTIPLY", tq, gi["Wind Speed"], (-1750, -500))
    # sample 1: pos*scale - dir_a * t * speed
    s1 = VM(ng, "SUBTRACT", VM(ng, "SCALE", pos_n, scale=gi["Wind Scale"], loc=(-1600, -650)),
            VM(ng, "SCALE", dir_a, scale=ts, loc=(-1600, -750)), loc=(-1450, -700))
    # sample 2: different speed and UV scale using pi so the two never line up
    ts2 = M(ng, "MULTIPLY", ts, math.pi / 2, (-1750, -1000))
    sc2 = M(ng, "MULTIPLY", gi["Wind Scale"], math.pi / 4, (-1750, -1100))
    s2 = VM(ng, "SUBTRACT", VM(ng, "SCALE", pos_n, scale=sc2, loc=(-1600, -950)),
            VM(ng, "SCALE", dir_b, scale=ts2, loc=(-1600, -1050)), loc=(-1450, -1000))
    n1 = NOISE2D(ng, s1, 1.0, 1.0, (-1300, -700))
    n2 = NOISE2D(ng, s2, 1.0, 1.0, (-1300, -1000))
    # noise is ~0.5 centred; remap so the product spans 0..1 before clamping
    wv = M(ng, "ADD", M(ng, "MULTIPLY", M(ng, "MULTIPLY", n1, n2, (-1100, -850)), 4.0, (-950, -850)), -0.6,
           (-800, -850))
    wv = M(ng, "ADD", wv, gi["Wind Brightness"], (-650, -850), clamp=True)
    wind = VM(ng, "SCALE", wdir, scale=M(ng, "MULTIPLY", wv, gi["Wind Max Angle"], (-500, -900)), loc=(-350, -850))

    # ---- camera basis (horizontal) for billboard, sway and fake perspective
    cam = N(ng, "GeometryNodeObjectInfo", (-2900, -1400), transform_space="ORIGINAL")
    cam.inputs["Object"].default_value = camera
    ceul = N(ng, "FunctionNodeRotationToEuler", (-2700, -1400))
    L(ng, cam.outputs["Rotation"], ceul.inputs[0])
    ce = SEP(ng, ceul.outputs[0], (-2550, -1400))
    sz = M(ng, "SINE", ce["Z"], None, (-2350, -1350))
    cz = M(ng, "COSINE", ce["Z"], None, (-2350, -1500))
    fwd = XYZ(ng, M(ng, "MULTIPLY", sz, -1.0, (-2200, -1350)), cz, 0.0, (-2050, -1350))
    right = XYZ(ng, cz, sz, 0.0, (-2050, -1500))

    # small view-space sway kept from the old version ("keeps it feeling alive")
    sw = M(ng, "MULTIPLY", M(ng, "SINE", M(ng, "ADD", M(ng, "MULTIPLY", tq, 2.3, (-1750, -1250)),
                                                    M(ng, "MULTIPLY", wn.outputs["Value"], 2 * math.pi, (-1750, -1350)),
                                                    (-1600, -1300)), None, (-1450, -1300)),
           gi["View Sway"], (-1300, -1300))
    sway = VM(ng, "SCALE", right, scale=sw, loc=(-1150, -1300))

    bend = VM(ng, "ADD", VM(ng, "ADD", wind, push, loc=(-200, -500)), sway, loc=(-50, -600))
    bs = SEP(ng, bend, (100, -600))
    tilt_rot = N(ng, "FunctionNodeEulerToRotation", (400, -600))
    L(ng, XYZ(ng, M(ng, "MULTIPLY", bs["Y"], -1.0, (250, -550)), bs["X"], 0.0, (250, -650)), tilt_rot.inputs[0])

    # [5:14] how much the tip moves toward (-) / away (+) from the camera -> shader
    persp = VM(ng, "DOT_PRODUCT", bend, fwd, loc=(100, -850))
    persp = M(ng, "MULTIPLY", persp, -1.0, (250, -850))

    # billboard: yaw to camera, and optionally pitch so the sprite faces the view
    jit = N(ng, "FunctionNodeRandomValue", (-200, -1100), data_type="FLOAT")
    jit.inputs["Min"].default_value = -0.15
    jit.inputs["Max"].default_value = 0.15
    pitch = M(ng, "SUBTRACT", ce["X"], math.pi / 2, (-200, -1300)) if c["full_billboard"] else 0.0
    bb = N(ng, "FunctionNodeEulerToRotation", (100, -1200))
    L(ng, XYZ(ng, pitch, 0.0, M(ng, "ADD", ce["Z"], jit.outputs["Value"], (-50, -1150)), (-50, -1250)), bb.inputs[0])
    rot = N(ng, "FunctionNodeRotateRotation", (650, -800), rotation_space="GLOBAL")
    L(ng, bb.outputs[0], rot.inputs["Rotation"])
    L(ng, tilt_rot.outputs[0], rot.inputs["Rotate By"])

    # ---- [2:36] accents by random value vs probability
    rnd = N(ng, "FunctionNodeRandomValue", (-200, 100), data_type="FLOAT")
    L(ng, M(ng, "ADD", gi["Seed"], 17.0, (-400, 50)), rnd.inputs["Seed"])
    r = rnd.outputs["Value"]
    p12 = M(ng, "ADD", gi["Accent 1 Probability"], gi["Accent 2 Probability"], (-200, -50))
    lt1 = M(ng, "LESS_THAN", r, gi["Accent 1 Probability"], (0, 150))
    lt2 = M(ng, "LESS_THAN", r, p12, (0, 50))
    lt3 = M(ng, "LESS_THAN", r, M(ng, "ADD", p12, gi["Flower Probability"], (-200, -150)), (0, -50))
    # 3 = accent1, 2 = accent2, 1 = flower, 0 = normal
    accent = M(ng, "ADD", M(ng, "ADD", lt1, lt2, (150, 100)), lt3, (300, 50))

    def pick(normal, fl, a2, a1, loc):
        # normal + lt3*(fl-normal) + lt2*(a2-fl) + lt1*(a1-a2)
        x, y = loc
        v = M(ng, "ADD", normal, M(ng, "MULTIPLY", lt3, fl - normal, (x, y - 120)), (x + 150, y))
        v = M(ng, "ADD", v, M(ng, "MULTIPLY", lt2, a2 - fl, (x, y - 40)), (x + 300, y))
        return M(ng, "ADD", v, M(ng, "MULTIPLY", lt1, a1 - a2, (x, y + 40)), (x + 450, y))

    sm = pick(1.0, c["flower_scale"], c["accent2_scale"], c["accent1_scale"], (300, 300))
    hm = pick(1.0, c["flower_height"], c["accent2_height"], c["accent1_height"], (300, 450))
    base = N(ng, "FunctionNodeRandomValue", (300, 600), data_type="FLOAT")
    L(ng, M(ng, "SUBTRACT", 1.0, gi["Size Jitter"], (100, 650)), base.inputs["Min"])
    base.inputs["Max"].default_value = 1.0
    L(ng, gi["Seed"], base.inputs["Seed"])
    s_xy = M(ng, "MULTIPLY", base.outputs["Value"], sm, (500, 450))
    scale = XYZ(ng, s_xy, s_xy, M(ng, "MULTIPLY", s_xy, hm, (650, 400)), (800, 450))

    quad_info = N(ng, "GeometryNodeObjectInfo", (600, 800))
    quad_info.inputs["Object"].default_value = quad
    inst = N(ng, "GeometryNodeInstanceOnPoints", (1000, 400))
    L(ng, pts, inst.inputs["Points"])
    L(ng, quad_info.outputs["Geometry"], inst.inputs["Instance"])
    L(ng, rot.outputs[0], inst.inputs["Rotation"])
    L(ng, scale, inst.inputs["Scale"])

    # attributes are evaluated on the points before instancing -> transfer to instances
    def store(geo, name, val, loc):
        sn = N(ng, "GeometryNodeStoreNamedAttribute", loc, data_type="FLOAT", domain="INSTANCE")
        sn.inputs["Name"].default_value = name
        L(ng, geo, sn.inputs["Geometry"])
        L(ng, val, sn.inputs["Value"])
        return sn.outputs[0]

    # capture per-point values so they line up with instance indices
    geo = store(inst.outputs["Instances"], "accent", accent, (1250, 400))
    geo = store(geo, "persp", persp, (1450, 400))
    rcol = N(ng, "FunctionNodeRandomValue", (1450, 150), data_type="FLOAT")
    L(ng, M(ng, "ADD", gi["Seed"], 31.0, (1250, 150)), rcol.inputs["Seed"])
    geo = store(geo, "rand", rcol.outputs["Value"], (1650, 400))   # flower petal colour pick

    join = N(ng, "GeometryNodeJoinGeometry", (2300, 0))
    L(ng, geo, join.inputs[0])
    L(ng, gi["Geometry"], join.inputs[0])
    L(ng, join.outputs[0], out.inputs[0])
    return ng


# ------------------------------------------------------------------ scene
def setup_render(c, scene):
    for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            scene.render.engine = eng
            break
        except TypeError:
            continue
    scene.render.resolution_x, scene.render.resolution_y = c["pixel_res"]
    scene.render.resolution_percentage = 100
    scene.render.filter_size = 0.0
    for attr in ("taa_render_samples", "taa_samples"):
        if hasattr(scene.eevee, attr):
            setattr(scene.eevee, attr, 1)
    scene.view_settings.view_transform = "Standard"


def build(**overrides):
    c = dict(CONFIG, **overrides)
    scene = bpy.context.scene
    for n in ("Ground", "Camera", "Sun", "DemoCharacter"):
        _rm(P + n, bpy.data.objects)

    s = c["ground_size"] / 2
    me = bpy.data.meshes.new(P + "Ground")
    me.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
    ground = bpy.data.objects.new(P + "Ground", me)
    scene.collection.objects.link(ground)
    ground.visible_shadow = False            # grass never casts shadows [1:09]

    chars = bpy.data.collections.get(P + "Characters")
    if chars is None:
        chars = bpy.data.collections.new(P + "Characters")
        scene.collection.children.link(chars)
    if c["make_demo_character"]:
        ch = bpy.data.objects.new(P + "DemoCharacter", None)
        ch.empty_display_type = "SPHERE"
        ch.empty_display_size = 0.3
        chars.objects.link(ch)
        ch.location = (-s * 0.8, 0, 0)
        ch.keyframe_insert("location", frame=1)
        ch.location = (s * 0.8, 0, 0)
        ch.keyframe_insert("location", frame=120)

    if c["make_camera"] or scene.camera is None:
        cd = bpy.data.cameras.new(P + "Camera")
        cd.type = "ORTHO"
        cd.ortho_scale = c["ortho_scale"]
        cam = bpy.data.objects.new(P + "Camera", cd)
        scene.collection.objects.link(cam)
        cam.location = (0, -12, 9)
        cam.rotation_euler = (math.radians(55), 0, 0)
        scene.camera = cam
    cam = scene.camera

    sun = bpy.data.objects.get(P + "Sun")
    if sun is None:
        sd = bpy.data.lights.new(P + "Sun", "SUN")
        sd.energy = 3.0
        sun = bpy.data.objects.new(P + "Sun", sd)
        scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(45), 0, math.radians(30))

    quad = make_quad(c)
    sprite, accent, flower = make_sprites()
    quad.data.materials.append(make_grass_material(c, sun, sprite, accent, flower))
    ground.data.materials.append(make_ground_material(c, sun))

    mod = ground.modifiers.new("StylizedGrass", "NODES")
    mod.node_group = make_node_group(c, quad, chars, cam)

    setup_render(c, scene)
    scene.frame_start, scene.frame_end = 1, 120
    return ground


def _cli():
    """Headless use: blender -b --factory-startup --python build_grass.py -- key=value ...
    Any CONFIG key may be given (Python literals: density=30, grass_color=(0.2,0.4,0.1,1)).
    Extra keys: clear=1 (empty the scene first), render=<path.png>, frame=<n>, blend=<path.blend>."""
    import ast
    import sys
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    kw = {}
    for a in args:
        k, _, v = a.partition("=")
        try:
            kw[k] = ast.literal_eval(v)
        except (ValueError, SyntaxError):
            kw[k] = v
    render, frame, blend = kw.pop("render", None), int(kw.pop("frame", 1)), kw.pop("blend", None)
    if kw.pop("clear", 0):
        for ob in list(bpy.data.objects):
            bpy.data.objects.remove(ob)
    unknown = set(kw) - set(CONFIG)
    if unknown:
        raise SystemExit(f"build_grass: unknown option(s) {sorted(unknown)}")
    build(**kw)
    scene = bpy.context.scene
    scene.frame_set(frame)
    if render:
        scene.render.filepath = render
        bpy.ops.render.render(write_still=True)
    if blend:
        bpy.ops.wm.save_as_mainfile(filepath=blend)


if __name__ == "__main__":
    _cli()
