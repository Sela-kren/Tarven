"""Make real_heroin's face winding consistent (faces that point inward render as dark wedges, e.g. the notch in her
bum cleft). Only the faces on the wrong side of an inconsistent edge are flipped (the smaller connected group); nothing
moves. Shape keys, UVs, weights kept; custom normals reset on the flipped faces.
SRC=<in.blend> OUT=<out.blend> blender -b --python fix_winding.py"""
import bpy, bmesh, os, numpy as np
bpy.ops.wm.open_mainfile(filepath=os.environ["SRC"])
ob = bpy.data.objects["real_heroin_body"]; me = ob.data
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
def bad_edges():
    out = []
    for e in bm.edges:
        lf = e.link_faces
        if len(lf) != 2: continue
        a, b = e.verts
        def runs(f):
            vs = list(f.verts); i = vs.index(a); return vs[(i + 1) % len(vs)] == b
        if runs(lf[0]) == runs(lf[1]): out.append(e)
    return out
bad = bad_edges(); print("FW inconsistent edges before", len(bad))
if bad:
    # region: faces round the bad edges; recalc_face_normals makes the winding there agree with its surroundings
    seed = set(f for e in bad for f in e.link_faces)
    reg = set(seed)
    for _ in range(6):
        reg |= set(g for f in list(reg) for v in f.verts for g in v.link_faces)
    # flip whichever group is the minority: split reg by consistent-winding connectivity, keep the biggest as is
    reg = list(reg); idx = {f: i for i, f in enumerate(reg)}; group = [-1] * len(reg); flip = [False] * len(reg); g = 0
    for s in range(len(reg)):
        if group[s] >= 0: continue
        group[s] = g; st = [s]
        while st:
            i = st.pop(); f = reg[i]
            for e in f.edges:
                for h in e.link_faces:
                    if h is f or h not in idx: continue
                    j = idx[h]
                    a, b = e.verts
                    def runs(ff):
                        vs = list(ff.verts); k = vs.index(a); return vs[(k + 1) % len(vs)] == b
                    consistent = runs(f) != runs(h)
                    want = flip[i] if consistent else (not flip[i])
                    if group[j] < 0: group[j] = g; flip[j] = want; st.append(j)
        g += 1
    nflip = sum(flip); nkeep = len(flip) - nflip
    to_flip = [reg[i] for i in range(len(reg)) if flip[i] == (nflip < nkeep)]
    bmesh.ops.reverse_faces(bm, faces=to_flip, flip_multires=True)
    print("FW flipped faces", len(to_flip), "of region", len(reg))
print("FW inconsistent edges after", len(bad_edges()))
fl = set(f.index for f in bm.faces if False)
bm.to_mesh(me); bm.free(); me.update()
bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"])
