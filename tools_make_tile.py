from PIL import Image
import numpy as np

SRC = 'images/Level_Select_Topbar/topbar-stone-background.webp'
DST = 'images/Level_Select_Topbar/topbar-stone-tile2.webp'

src = Image.open(SRC).convert('RGBA')
a = np.array(src).astype(np.float32)
H, W = a.shape[:2]
alpha = a[..., 3]

# 1. Opaque core of the source art (transparent vignette margins).
rows_opaque = (alpha > 12).mean(axis=1)
ys = np.where(rows_opaque > 0.85)[0]
cols_in_core = (alpha[ys.min():ys.max() + 1] > 12).mean(axis=0)
xs = np.where(cols_in_core > 0.85)[0]

# 2. Most detailed 140px band inside the opaque core
crop_h = 140
margin = 6
lum = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]) * (alpha / 255.0)
best = None
for y0 in range(ys.min() + margin, ys.max() - margin - crop_h + 1):
    band = lum[y0:y0 + crop_h, xs.min():xs.max() + 1]
    score = band.mean() + band.std()
    if best is None or score > best[1]:
        best = (y0, score)
y0 = best[0]
band = a[y0:y0 + crop_h, :, :]
col_solid = (band[..., 3] > 200).mean(axis=0)
solid = np.where(col_solid > 0.98)[0]
bx0, bx1 = int(solid.min()), int(solid.max()) + 1
T = band[:, bx0:bx1, :3]  # RGB only, fully opaque, width N
N = T.shape[1]
print('band y0', y0, '| solid width', N)

# 3. Natural-match search: window T[d:d+L] whose seam pair
#    (last column vs first column) already matches, preferring QUIET stone
#    (no cracks) in the 8 columns flanking the seam, so nothing has to be
#    morphed and no crack gets cut off at the boundary.
colcol = T  # (140, N, 3)
g = np.abs(np.diff(T, axis=1)).mean(axis=(0, 2))  # per-column crack energy, len N-1
quiet = np.convolve(g, np.ones(8) / 8, mode='same')  # smoothed local activity

bestv = None
for L in range(430, 581, 2):
    for d in range(0, N - L + 1):
        pair = np.abs(T[:, d + L - 1, :] - T[:, d, :]).mean()
        act = quiet[max(0, d - 4):d + 4].mean() + quiet[max(0, d + L - 5):d + L - 1].mean()
        total = pair + 1.2 * act
        if bestv is None or total < bestv[0]:
            bestv = (total, d, L, pair)
total, d, L, pair = bestv
print('chosen d', d, 'L', L, '| natural pair err', round(float(pair), 2), '| score', round(float(total), 2))

Nt = T[:, d:d + L, :].copy()

# 4. Micro-correction only: decay the seam-pair residual over the last 8
#    columns so the final column EQUALS the first (pixel-perfect wrap).
#    With a natural match the residual is tiny -> no visible shear.
wcorr = 8
delta = T[:, d, :] - Nt[:, L - 1, :]  # what the last column must become
for j in range(wcorr):
    wgt = (wcorr - j) / wcorr  # 1.0 at the very last column, decaying left
    Nt[:, L - 1 - j, :] += delta * wgt

# 5. Verify: seam jump vs interior; streak metric in the correction zone
T3 = np.concatenate([Nt, Nt, Nt], axis=1)
diffs = np.abs(T3[:, 1:, :] - T3[:, :-1, :]).mean(axis=(0, 2))
seams = [L - 1, 2 * L - 1]
interior = np.delete(diffs, seams)
gx = diffs  # per-column-transition energy across the 3x tiling
corr_zone = gx[L - 8:L]  # transitions inside the corrected zone of tile 2
print('seam jumps:', [round(float(diffs[p]), 2) for p in seams],
      '| interior mean', round(float(interior.mean()), 2),
      '| interior max', round(float(interior.max()), 2))
print('correction-zone transitions:', [round(float(v), 1) for v in corr_zone])
# Streak check: per-ROW horizontal energy in last 30 cols vs whole tile
row_energy_edge = np.abs(np.diff(Nt[:, -30:, :], axis=1)).mean()
row_energy_all = np.abs(np.diff(Nt, axis=1)).mean()
print('row-hf edge zone %.2f vs whole %.2f' % (row_energy_edge, row_energy_all))

out = np.dstack([Nt, np.full((crop_h, L), 255.0)]).astype(np.uint8)
Image.fromarray(out, 'RGBA').save(DST, lossless=True)
import os
print('saved', DST, os.path.getsize(DST), 'bytes', out.shape[1], 'x', out.shape[0])
