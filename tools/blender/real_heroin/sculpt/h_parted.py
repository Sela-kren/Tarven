# height on top of her smoothed lips (DELTA=0): front half one closed slit; back half the outer lips stand apart and
# the inner lips show between them, with the opening between the inner lips.
def h_new(s, t):
    a = abs(s)
    o = sm((t - E("O_BACK", -0.004)) / 0.008) * (1 - sm((t - E("O_FULL1", 0.022)) / E("O_CLOSE", 0.016)))
    ends = sm((t - E("T_END", -0.007)) / 0.004)
    # closed slit
    closed = -E("SLIT_D", 0.0026) * g(a, 0.0012)
    # parted: a valley between the outer lips (gap half width G), its walls rounded
    G = 0.0014 + E("GAP", 0.0034) * o
    valley = -E("VDEPTH", 0.0030) * (1 - sm((a - G) / 0.0024))
    mo = 0.0008 + E("MO", 0.0014) * o
    mino = E("MINO", 0.0021) * g(a - mo, 0.0008 + 0.0003 * o)
    vest = -E("VEST", 0.0010) * g(a, 0.0006)
    parted = valley + mino + vest
    return ends * (closed * (1 - o) + parted * o)
