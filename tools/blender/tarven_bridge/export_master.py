"""Headless "Send to game": exports the master .blend to the game's female.glb (or another path).

  D:/blender/blender.exe -b art/female_master.blend --python tools/blender/tarven_bridge/export_master.py [-- out.glb]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
print("sent:", core.export_master(argv[0] if argv else None))
