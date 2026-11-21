"""Headless "Send face keys": writes art/female_face_keys.blend's shape keys to public/models/female_face.json.

  D:/blender/blender.exe -b art/female_face_keys.blend --python tools/blender/tarven_bridge/face_keys_out.py [-- out.json]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import face_keys  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
done = face_keys.write(argv[0] if argv else None)
print("face keys:", done["path"], f"{done['kb']} KB")
for line in done["objects"]:
    print("  ", line)
