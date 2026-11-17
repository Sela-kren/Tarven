"""
The reference heroines: which models are measured, their short keys, and which measurements each one may vote on.

Shared by every refkit script (plain Python, no Blender). Add a new ref here, then run run_all.sh.
"""
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REF_DIR = os.path.join(ROOT, "ref")                      # gitignored: the ripped models live here only
CACHE = os.path.join(REF_DIR, "_measure")                 # gitignored: raw measurement JSON
SPECS = os.path.join(ROOT, "tools", "blender", "heroine", "ref_specs")   # committed: numbers only

ANKLE = 0.045    # barefoot ankle-joint height as a share of stature (heels are taken out with this)

# folder in ref/  ->  (short key, python module name)
REFS = {
    "black-widow-marvel-rivals": ("BW", "black_widow"),
    "emma-frost-marvel-rivals": ("Emma", "emma_frost"),
    "invisible-woman-azure-shade": ("IW-az", "iw_azure"),
    "invisible-woman-mcu": ("IW-mcu", "iw_mcu"),
    "invisible-woman-riann-landau-the-debater": ("IW-deb", "iw_debater"),
    "luna-snow-cool-summer": ("Luna", "luna_snow"),
    "phoenix-viridian-vogue": ("Phoe", "phoenix"),
    "psylocke-vengeance": ("Psy", "psylocke"),
    "rogue-marvel-rivals": ("Rogue", "rogue"),
}
# Dropped: invisible-women-marvel-rivals (Malice GLB) imports at another scale (2.68 m, joints offset).

# Girths, widths and depths only count where the ref's suit is tight (no jacket, belt, cape, skirt or boot over
# that part); clothes would make her bulky. Everything not listed here (heights, joints, lengths) uses every ref.
TIGHT = {
    "bust_girth": ["BW", "Emma", "IW-mcu", "Luna", "Psy"],
    "bust_depth": ["BW", "Emma", "IW-mcu", "Luna", "Psy"],
    "underbust_girth": ["BW", "Emma", "IW-az", "IW-mcu", "Luna", "Phoe"],
    "waist_girth": ["BW", "IW-az", "IW-mcu", "Luna", "Phoe"],
    "waist_width": ["BW", "IW-az", "IW-mcu", "Luna", "Phoe"],
    "waist_depth": ["BW", "IW-az", "IW-mcu", "Luna", "Phoe"],
    # Luna's hip slice catches something worn round her hips (it reads 1.19 of stature): out
    "hip_girth": ["BW", "IW-az", "IW-mcu", "IW-deb"],
    "hip_width": ["BW", "IW-az", "IW-mcu", "IW-deb"],
    "hip_depth": ["BW", "IW-az", "IW-mcu", "IW-deb"],
    "hip_fullest": ["BW", "IW-az", "IW-mcu", "IW-deb"],
    # heights found from the surface follow the same pools as their girths
    "nipple": ["BW", "Emma", "IW-mcu", "Luna", "Psy"],
    "underbust": ["BW", "Emma", "IW-az", "IW-mcu", "Luna", "Phoe"],
    "waist": ["BW", "IW-az", "IW-mcu", "Luna", "Phoe"],
    "thigh_girth": ["BW", "IW-az", "IW-mcu", "IW-deb", "Luna"],
    # lower leg: boots and heels spoil most refs here (Black Widow's ankle reads wider than her calf); only the
    # near-barefoot Invisible Woman suits, plus Psylocke above the boot
    "knee_girth": ["IW-az", "IW-mcu", "Psy"],
    "calf_girth": ["IW-az", "IW-mcu", "Psy"],
    "ankle_girth": ["IW-az", "IW-mcu"],
    "foot_length": ["IW-az", "IW-mcu"],
    "neck_girth": ["Emma", "IW-az", "IW-mcu", "Luna", "Phoe", "Psy"],
    "upperarm_girth": ["BW", "IW-az", "IW-mcu", "Luna", "Phoe", "Psy"],
    "forearm_girth": ["BW", "IW-az", "IW-mcu", "Luna", "Phoe", "Psy"],
    "wrist_girth": ["BW", "IW-az", "IW-mcu", "Luna", "Phoe", "Psy"],
    "crotch": ["BW", "Emma", "IW-az", "IW-mcu", "IW-deb", "Luna", "Psy", "Rogue"],   # Phoenix's coat hides it
}
# The side/front silhouette (every 1% of height) only from refs tight over that band of height.
PROFILE_BANDS = {
    "BW": (0.46, 0.90), "IW-az": (0.46, 0.90), "IW-mcu": (0.46, 0.90), "Luna": (0.46, 0.90),
    "Emma": (0.62, 0.90), "Psy": (0.62, 0.90),
}


def key_of(folder):
    return REFS[folder][0]


def tight_for(key):
    """The measurement names this ref may vote on (heights and lengths: all; sizes: only where tight)."""
    return sorted(m for m, pool in TIGHT.items() if key in pool)
