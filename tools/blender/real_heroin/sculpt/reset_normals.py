"""Reset real_heroin's stored custom normals round the crotch (within RADIUS mm of the vulva or anus, posed) so the
shading follows the shape again; stale custom normals there draw fake creases. Nothing moves.
SRC=<in.blend> OUT=<out.blend> [RN_RADIUS=80] blender -b --python reset_normals.py"""
import bpy, numpy as np, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vulva_frame import *
R = float(os.environ.get("RN_RADIUS", "80")) / 1000
bpy.ops.wm.open_mainfile(filepath=os.environ["SRC"])
ob = bpy.data.objects["real_heroin_body"]; me = ob.data; M = mesh_arrays(me); n = len(me.vertices)
Pw = evaluated(ob)
def vm(nm):
    m = np.zeros(n, bool)
    for fi in np.where(M["fm"] == M["mats"].index(nm))[0]: m[M["faces"][fi]] = True
    return m
cA = Pw[vm("T_anus")].mean(0); cV = Pw[vm("T_labia")].mean(0)
reg = (np.linalg.norm(Pw - cV, axis=1) < R) | (np.linalg.norm(Pw - cA, axis=1) < R)
lv = np.zeros(len(me.loops), int); me.loops.foreach_get("vertex_index", lv)
cn = np.zeros(len(me.loops) * 3); me.corner_normals.foreach_get("vector", cn); cn = cn.reshape(-1, 3)
cn[reg[lv]] = 0; me.normals_split_custom_set(cn.tolist()); me.update()
print("RN reset corners", int(reg[lv].sum()), "of", len(lv))
bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"])
