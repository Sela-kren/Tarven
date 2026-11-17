"""
Build the heroine from scratch: her signed distance field (heroine/sdf.py) meshed with OpenVDB.

blender -b --factory-startup --python tools/blender/build_heroine.py -- <out dir> [voxel mm] [arm angle]

Writes <out dir>/heroine.blend and heroine.glb. Only the form for now (no rig, UVs or textures yet).
"""
import bpy, sys, os, time, math
import numpy as np
import openvdb

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "heroine"))
import sdf  # noqa: E402

T0 = time.time()


def tick(msg):
    print(f"[{time.time() - T0:6.1f}s] {msg}", flush=True)


args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = args[0] if args else os.path.abspath("heroine_out")
VOX = (float(args[1]) if len(args) > 1 else 2.0) / 1000.0
ARM = float(args[2]) if len(args) > 2 else 41.5
os.makedirs(OUT, exist_ok=True)

body, groups, J = sdf.build(arm_angle=ARM)
lo, hi = body.bounds()
lo[0] = -hi[0]                            # both sides (the field is symmetric)
lo -= 0.01
hi += 0.01
lo[2] = max(lo[2], -0.01)
BLOCK = 16
BAND = 3 * VOX
dims = np.ceil((hi - lo) / VOX).astype(int)
nb = np.ceil(dims / BLOCK).astype(int)
tick(f"box {np.round(lo, 3)} .. {np.round(hi, 3)}, {nb.prod()} blocks of {BLOCK}^3 at {VOX * 1000:.1f} mm")

# --- coarse: the distance at every block centre says which blocks hold the surface
bs = BLOCK * VOX
idx = np.stack(np.meshgrid(*[np.arange(n) for n in nb], indexing="ij"), axis=-1).reshape(-1, 3)
centres = lo + (idx + 0.5) * bs
d0 = np.empty(len(centres))
for i in range(0, len(centres), 20000):
    c = centres[i:i + 20000]
    q = c.copy(); q[:, 0] = np.abs(q[:, 0])
    d0[i:i + 20000] = body.eval(q, q.min(0) - bs, q.max(0) + bs)
reach = bs * 0.87 + BAND + 0.02           # the field is only roughly metric: a generous margin
surface = np.abs(d0) < reach
inside = d0 <= -reach
tick(f"surface blocks {surface.sum()}, inside {inside.sum()}")

grid = openvdb.FloatGrid(background=BAND)
grid.transform = openvdb.createLinearTransform(voxelSize=VOX)
grid.gridClass = openvdb.GridClass.LEVEL_SET
# group surface blocks into chunks so the tree is culled per chunk
CH = 4
chunk_of = idx // CH
order = np.lexsort((chunk_of[:, 2], chunk_of[:, 1], chunk_of[:, 0]))
sel = order[surface[order]]
keys = chunk_of[sel]
splits = np.flatnonzero(np.any(np.diff(keys, axis=0) != 0, axis=1)) + 1
local = np.stack(np.meshgrid(*[np.arange(BLOCK)] * 3, indexing="ij"), axis=-1).reshape(-1, 3)
done = 0
for group in np.split(sel, splits):
    pts = (lo + (idx[group][:, None, :] * BLOCK + local[None, :, :] + 0.5) * VOX).reshape(-1, 3)
    q = pts.copy(); q[:, 0] = np.abs(q[:, 0])
    d = np.clip(body.eval(q, q.min(0), q.max(0)), -BAND, BAND).astype(np.float32)
    d = d.reshape(len(group), BLOCK, BLOCK, BLOCK)
    for gi, b in enumerate(group):
        grid.copyFromArray(np.ascontiguousarray(d[gi]), ijk=tuple(int(v) for v in idx[b] * BLOCK))
    done += len(group)
for b in np.flatnonzero(inside):
    o = idx[b] * BLOCK
    grid.fill(tuple(int(v) for v in o), tuple(int(v) for v in o + BLOCK - 1), -BAND, True)
tick(f"field done ({done} blocks)")

points, quads = grid.convertToQuads(isovalue=0.0)
points = points.astype(np.float64) + lo
tick(f"meshed {len(points)} verts {len(quads)} quads")

# --- into Blender
bpy.ops.wm.read_factory_settings(use_empty=True)
me = bpy.data.meshes.new("Heroine")
me.vertices.add(len(points))
me.vertices.foreach_set("co", points.ravel())
me.loops.add(len(quads) * 4)
me.loops.foreach_set("vertex_index", quads.astype(np.int32).ravel())
me.polygons.add(len(quads))
me.polygons.foreach_set("loop_start", np.arange(0, len(quads) * 4, 4, dtype=np.int32))
me.update(calc_edges=True)
ob = bpy.data.objects.new("Heroine", me)
bpy.context.scene.collection.objects.link(ob)
bpy.context.view_layer.objects.active = ob
ob.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.remove_doubles(threshold=VOX * 0.05)
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode="OBJECT")
for p in me.polygons:
    p.use_smooth = True
tick(f"mesh {len(me.vertices)} verts {len(me.polygons)} faces")

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "heroine.blend"))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "heroine.glb"), use_selection=False, export_apply=True)
tick("saved")
