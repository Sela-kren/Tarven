"""Raise the user's masked area straight up in Z by LIFT (m) times the mask, the mask's edge softened first (diffused
over the mesh) so there is no step. Shape keys move with it. Mask kept. Headless OUT=<path>."""
import bpy, os
import numpy as np
LIFT = float(os.environ.get("LIFT", 0.0045)); SOFT = int(os.environ.get("SOFT", 25))
b = bpy.data.objects["Female_Body"]; me = b.data
att = me.attributes[".sculpt_mask"]
n = len(me.vertices)
m = np.array([d.value for d in att.data])
ev = np.zeros(len(me.edges) * 2, dtype=np.int64); me.edges.foreach_get("vertices", ev); ev = ev.reshape(-1, 2)
deg = np.bincount(ev.ravel(), minlength=n).astype(float)
w = m.copy()
for _ in range(SOFT):
    acc = np.zeros(n); np.add.at(acc, ev[:, 0], w[ev[:, 1]]); np.add.at(acc, ev[:, 1], w[ev[:, 0]])
    w = 0.5 * w + 0.5 * acc / np.maximum(deg, 1)
w = np.maximum(w, m * 0.0)   # soft edge both ways (spreads a little outside too)
co = np.zeros(n * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
co[:, 2] += LIFT * w
me.vertices.foreach_set("co", co.ravel())
if me.shape_keys:
    for kb in me.shape_keys.key_blocks:
        k = np.zeros(n * 3); kb.data.foreach_get("co", k); k = k.reshape(-1, 3); k[:, 2] += LIFT * w
        kb.data.foreach_set("co", k.ravel())
me.update()
print("LIFT moved", int((w > 0.01).sum()), "max mm", round(LIFT * w.max() * 1000, 2))
if os.environ.get("OUT"):
    bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"], compress=True)
