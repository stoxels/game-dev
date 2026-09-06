//------------------------------------------------------------------------
//-------------------SHARED BOSS ABILITIES--------------------------------
//------------------------------------------------------------------------
// Mechanics used by TWO OR MORE bosses live here so they are defined once.
// Rule of thumb:
//   shared (here) — corrupt_cells, probability_shift, prior_bomb (+ summon
//     helpers), clue_swap, frozen_cells, grid_invert, plus the shared engines
//     (generic screen-blast engine, _egNk dodge kit).
//   per-boss file — everything only ONE boss uses.
//
// Boss files reference these by handler-name string, e.g.
//   { name: 'corrupt_cells', handler: '_egMechCorruptCells', ... }
//
// PHASE VARIANTS — every shared ability evolves per boss phase instead of
// only scaling counts:
//   corrupt_cells     P1 static · P2 spreads to neighbours · P3 never expires
//                     (every spread is telegraphed ~1s before it lands; the
//                     initial cast count, spread caps and rates all scale
//                     with the boss's tier 1–16)
//   probability_shift P1 erases · P2 relocates marks · P3 relocates + erases
//                     (target counts scale with the boss's tier 1–16)
//   prior_bomb        P1 instant · P2 fused telegraph · P3 cascade wave
//                     (counts AND fuse timing scale with tier 1–16)
//   frozen_cells      P1 static locks · P2 creeping frost (telegraphed,
//                     single-generation children) · P3 glacial drift (faster,
//                     longer)
//   fated_cell        P1 single mark · P2 doom relay (marks chain) ·
//                     P3 twin dooms (two marks, each fill respawns one)
//   fog_bank          P1 static · P2 drifting fog · P3 twin wandering banks
//   soul_tithe        P1 fixed quota · P2 lapsing (progress decays when you
//                     stall) · P3 demanding (decay + timeout collects fills)
//   clue_swap         P1 pair swap · P2 triple shift · P3 double cross
//   clue_scramble     P1 2 lines · P2 3 lines · P3 3 lines, re-shuffled midway
//------------------------------------------------------------------------

// ── Corrupt cell expiry time ─────────────────────────────────────────────────
const EG_CORRUPT_CELL_LIFETIME_MS = 15000; // ms before corruption auto-expires (P1/P2 only)
// Brutus's arena keeps corruption on the grid LONGER (30s) so his corrupted
// cells linger as an ongoing hazard — they also chain his ground slams, so a
// fuller field means more slams in a row. P3 (never expires) is unchanged.
const EG_BRUTUS_CORRUPT_LIFETIME_MS = 30000;
// The Snail keeps corruption on the grid for a full minute: banishing the
// doom snail requires crashing it into a corrupted cell, and a 15 s cell
// evaporates long before the slow snail can ever reach it.
const EG_SNAIL_CORRUPT_LIFETIME_MS = 60000;

// Spread cadence for the Corrupt Cells phase variants:
//   P1 — static: corruptions just sit and expire (original behaviour)
//   P2 — spreading: a corrupted cell infects one adjacent correct cell on a
//        timer (the cell still expires after its 15s lifetime)
//   P3 — relentless: corruptions never expire on their own and spread faster
//        — the player MUST keep dispelling or the grid drowns
//
// Caps and spread intervals are TIER-SCALED. Each pair is the endpoint value
// at tier 1 (gentle) vs tier 16 (brutal), lerped linearly by boss tier — the
// pre-scaling behaviour sits around mid-tier (tier ~8):
//   [0] = tier 1   [1] = tier 16
//     spread interval  P2 ≈ 5.1s · P3 ≈ 4.2s at tier 8
//     spread cap       P2 = 6    · P3 = 8       at tier 8
const EG_CORRUPT_SPREAD_INTERVAL_P2 = [6500, 3500]; // ms between spread attempts
const EG_CORRUPT_SPREAD_INTERVAL_P3 = [5500, 2800];
const EG_CORRUPT_SPREAD_CAP_P2 = [4, 8];           // max simultaneous corruptions
const EG_CORRUPT_SPREAD_CAP_P3 = [5, 11];

// Warning time between the ghost telegraph appearing on a target cell and the
// corruption actually landing there — spreads are always telegraphed so the
// relentless phase stays readable.
const EG_CORRUPT_TELEGRAPH_MS = 1000;

// Initial cast count per phase — also TIER-SCALED. Each pair is the endpoint
// at tier 1 (gentle) vs tier 16 (brutal); the old flat behaviour sat around
// tier ~8 (P1 2 · P2 3 · P3 4). Casts are clamped to the phase's spread cap
// so a high-tier opener can never exceed the simultaneous ceiling.
const EG_CORRUPT_CAST_P1 = [1, 3]; // P1 — static, no spread
const EG_CORRUPT_CAST_P2 = [2, 4]; // P2 — spreading
const EG_CORRUPT_CAST_P3 = [3, 5]; // P3 — relentless


// ── Tier-scaling endpoint pairs ───────────────────────────────────────────────
// Prior Bomb + Probability Shift follow the same [tier1, tier16] lerp pattern
// as Corrupt Cells: each pair is the gentle (tier 1) vs brutal (tier 16)
// endpoint, and the pre-scaling behaviour lands around tier ~8.

// Prior Bomb — target counts per phase:
//   P1–P3 all arm visible bombs; P3 adds a delayed cascade bomb after the
//   first wave.
const EG_PRIOR_BOMB_COUNT_P1 = [1, 2];
const EG_PRIOR_BOMB_COUNT_P2 = [1, 3];
const EG_PRIOR_BOMB_COUNT_P3 = [2, 4];
// Countdown between the 💣 arming and its detonation — this whole window is
// the counterplay: run your sprite onto a bomb to pause its fuse and start
// defusing (stand still for EG_PRIOR_BOMB_DEFUSE_MS to disarm it). Gentle
// 15s → brutal 10s (was ~1.2s with no counterplay).
const EG_PRIOR_BOMB_FUSE_RANGE = [15000, 10000]; // ms, [tier1, tier16]
const EG_PRIOR_BOMB_DEFUSE_MS = 3000;       // standing time on a bomb to defuse it
const EG_PRIOR_BOMB_STAND_PAD_PX = 10;      // overlap forgiveness around the bomb cell
const EG_PRIOR_BOMB_TICK_MS = 100;          // fuse + defuse driver resolution
const EG_PRIOR_BOMB_CASCADE_DELAY_MS = 3500; // P3: second-wave bomb arms this long after the first

// Probability Shift — mark target counts per phase:
//   P1 erased · P2 relocated · P3 relocated + erased
const EG_SHIFT_ERASE_P1 = [1, 3];
const EG_SHIFT_RELOCATE_P2 = [2, 4];
const EG_SHIFT_RELOCATE_P3 = [3, 5];
const EG_SHIFT_ERASE_P3 = [1, 2];


// Linear interpolation helper for the [tier1, tier16] endpoint ranges above.
// Shared by every tier-scaled mechanic (Corrupt Cells, Prior Bomb,
// Probability Shift).
function _egBossTierLerp(range, norm) {
    return range[0] + (range[1] - range[0]) * Math.max(0, Math.min(1, norm));
}


// Duration multiplier for tier-scaled TIMING, anchored exactly at tier 8
// (norm = 7/15 → factor 1.0, so the pre-scaling duration is unchanged there).
// range = [tier1 factor, tier16 factor]; use >1 for "more time at low tier"
// knobs and <1 for knobs where a short value means gentle (callers pick the
// direction that makes tier 1 easy and tier 16 brutal).
function _egBossTierFactor(norm, range) {
    if (norm == null || !isFinite(norm)) return 1;
    const anchor = 7 / 15; // tier 8 — where the pre-scaling timing was tuned
    norm = Math.max(0, Math.min(1, Number(norm) || 0));
    if (norm <= anchor) return range[0] + (1 - range[0]) * (norm / anchor);
    return 1 + (range[1] - 1) * ((norm - anchor) / (1 - anchor));
}


// Resolves a boss's atlas tier (1–16) into a 0…1 difficulty weight.
// Reuses _egRollMapTier (endgame-maps.js) when available; falls back to the
// shared tier-level ladder otherwise. Unknown levels default to mid-tier so
// the mechanic never swings to an extreme by accident.
function _egBossTierNorm(monster) {
    const lvl = (monster && monster.level) ? Math.max(1, Math.round(monster.level)) : 0;
    let tier = 0;
    if (lvl > 0 && typeof _egRollMapTier === 'function') {
        try { tier = _egRollMapTier(lvl); } catch (e) { tier = 0; }
    }
    if (tier <= 0 && lvl > 0) {
        const ladder = (typeof EG_MAP_TIER_MONSTER_LEVELS !== 'undefined'
            && EG_MAP_TIER_MONSTER_LEVELS.length) ? EG_MAP_TIER_MONSTER_LEVELS : null;
        if (ladder) {
            for (let i = 0; i < ladder.length; i++) if (lvl >= ladder[i]) tier = i + 1;
        }
    }
    if (tier <= 0) return 0.5;
    const maxTier = (typeof EG_MAX_MAP_TIER !== 'undefined') ? EG_MAX_MAP_TIER : 16;
    return Math.max(0, Math.min(1, (tier - 1) / Math.max(1, maxTier - 1)));
}


// Spread interval (ms) for one corruption's next attempt, given its cfg.
function _egCorruptSpreadIntervalMs(cfg) {
    const range = cfg.p >= 3 ? EG_CORRUPT_SPREAD_INTERVAL_P3 : EG_CORRUPT_SPREAD_INTERVAL_P2;
    return Math.max(1500, Math.round(_egBossTierLerp(range, cfg.norm)));
}


// Spread cap for a corruption field, given its cfg.
function _egCorruptSpreadCap(cfg) {
    const range = cfg.p >= 3 ? EG_CORRUPT_SPREAD_CAP_P3 : EG_CORRUPT_SPREAD_CAP_P2;
    return Math.max(1, Math.round(_egBossTierLerp(range, cfg.norm)));
}


// Builds the per-cast rule set carried by every corruption of one cast:
//   p    — boss phase (1–3): drives expiry + base behaviour
//   norm — tier difficulty weight (0 tier 1 … 1 tier 16): drives caps + rates
// Newly spread cells inherit the same cfg, so a whole field follows one rule
// set even as the fight's phase advances between casts.
function _egCorruptConfig(monster, phase) {
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const isBrutus = !!(monster && (monster.id === 'boss_brutus' || monster.baseId === 'boss_brutus'));
    const isSnail = !!(monster && (monster.id === 'boss_snail' || monster.baseId === 'boss_snail'));
    return {
        p,
        norm: _egBossTierNorm(monster),
        lifetimeMs: isBrutus ? EG_BRUTUS_CORRUPT_LIFETIME_MS
            : (isSnail ? EG_SNAIL_CORRUPT_LIFETIME_MS : EG_CORRUPT_CELL_LIFETIME_MS),
    };
}


// Returns all grid cells that are valid targets for the Corrupt Cells mechanic.
// Targets BOTH correct cells (sol=1, blockable until filled) and incorrect
// cells (sol=0, blockable until ✕-marked) that the player hasn't finished yet.
function _egBuildCorruptibleCellPool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const pool = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (_egBossCorrupted.has(`${r}-${c}`)) continue; // already corrupted
            if (sol[r][c] === 1) {
                // correct cell — blockable while still unfilled/unrevealed
                if (userGrid[r][c] === 1 || revealedGrid[r][c]) continue; // already filled
            } else if (sol[r][c] === 0) {
                // incorrect cell — blockable while not yet ✕-marked
                if (userGrid[r][c] === 2) continue; // already marked
            } else {
                continue; // grid only holds 0/1 in practice
            }
            pool.push([r, c]);
        }
    }
    return pool;
}


// Picks a random 4-neighbour of a corrupted cell that can legally become
// corrupted (correct or incorrect, unsolved, not already corrupted, and not
// already marked as a pending spread target). Returns null when no neighbour
// qualifies.
function _egCorruptPickNeighbor(r, c) {
    if (!cur || !cur.grid) return null;
    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const cands = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        if (sol[nr][nc] === 1) {
            if (userGrid[nr][nc] === 1 || revealedGrid[nr][nc]) continue; // correct cell already filled
        } else if (sol[nr][nc] === 0) {
            if (userGrid[nr][nc] === 2) continue; // incorrect cell already ✕-marked
        } else {
            continue; // grid only holds 0/1
        }
        if (_egBossCorrupted.has(`${nr}-${nc}`)) continue;
        if (document.getElementById(`eg-corrupt-tel-${nr}-${nc}`)) continue; // already telegraphed
        cands.push([nr, nc]);
    }
    if (cands.length === 0) return null;
    return cands[Math.floor(Math.random() * cands.length)];
}


// Shows the ghosted ☣️ on the chosen target and schedules the corruption to
// land there after the telegraph window. Stored on the source cell's entry so
// dispelling or expiring the source cancels the pending spread with it.
function _egCorruptTelegraphSpread(key, data, tr, tc) {
    const el = document.getElementById(`g-${tr}-${tc}`);
    if (!el) return;

    const tel = document.createElement('span');
    tel.className = 'eg-corrupt-telegraph';
    tel.id = `eg-corrupt-tel-${tr}-${tc}`;
    tel.textContent = '☣️';
    el.appendChild(tel);

    data.pending = {
        tr, tc,
        landTimer: setTimeout(() => _egCorruptSpreadLand(key), EG_CORRUPT_TELEGRAPH_MS),
    };
}


// Lands a telegraphed spread. Re-validates everything before corrupting so a
// mid-telegraph refill, arena transition or cap change can never corrupt the
// wrong cell. If the spread fizzles, the source's next attempt picks a fresh
// target.
function _egCorruptSpreadLand(key) {
    const data = _egBossCorrupted.get(key);
    if (!data || !data.pending) return;
    const { tr, tc } = data.pending;
    data.pending = null;
    const tel = document.getElementById(`eg-corrupt-tel-${tr}-${tc}`);
    if (tel) tel.remove();

    if (!_egBossCorrupted.has(key)) return;          // source dispelled mid-telegraph
    if (!cur || !cur.grid) return;
    if (tr >= cur.grid.length || tc >= cur.grid[0].length) return; // grid swapped
    const sol = cur.grid;
    if (sol[tr][tc] === 1) {
        if (userGrid[tr][tc] === 1 || revealedGrid[tr][tc]) return;    // correct target filled meanwhile
    } else if (sol[tr][tc] === 0) {
        if (userGrid[tr][tc] === 2) return;                            // incorrect target ✕-marked meanwhile
    } else {
        return;                                                        // grid swapped to a new shape
    }
    if (_egBossCorrupted.size >= _egCorruptSpreadCap(data.cfg)) return; // cap during window

    _egApplyCellCorruption(tr, tc, data.cfg);
}


// Spread tick for one corrupted cell: tries to infect a neighbour and
// reschedules itself while the cell stays corrupted. When the global cap is
// reached it just waits — dispelling cells re-opens the floodgates.
function _egCorruptSpreadTick(key) {
    const data = _egBossCorrupted.get(key);
    if (!data) return;

    if (_egBossCorrupted.size < _egCorruptSpreadCap(data.cfg)) {
        const [r, c] = key.split('-').map(Number);
        const neighbor = _egCorruptPickNeighbor(r, c);
        if (neighbor) _egCorruptTelegraphSpread(key, data, neighbor[0], neighbor[1]);
    }

    if (_egBossCorrupted.has(key)) {
        data.spreadTimer = setTimeout(() => _egCorruptSpreadTick(key), _egCorruptSpreadIntervalMs(data.cfg));
    }
}


// Places the ☣️ corruption overlay on a cell and registers its expiry timer.
// cfg drives the variants (see _egCorruptConfig): p = phase (P1 static+expire,
// P2 expire+spread, P3 never expires) and norm = tier weight for how fast the
// field spreads and how large it may grow. Newly spread cells inherit the same
// cfg so the whole field follows one rule set.
function _egApplyCellCorruption(r, c, cfg) {
    const key = `${r}-${c}`;
    const el = document.getElementById(`g-${r}-${c}`);
    if (!el || _egBossCorrupted.has(key)) return;

    const p = cfg.p;
    const overlay = document.createElement('span');
    overlay.className = 'eg-corrupt-overlay';
    overlay.id = `eg-corrupt-${r}-${c}`;
    overlay.textContent = '☣️';
    el.appendChild(overlay);

    const data = { timer: null, spreadTimer: null, pending: null, cfg };
    // P3 corruption is permanent until dispelled — "relentless"
    if (p < 3) {
        data.timer = setTimeout(() => _egRemoveCellCorruption(key),
            cfg.lifetimeMs || EG_CORRUPT_CELL_LIFETIME_MS);
    }
    // P2+ corruptions spread to neighbours on a tier-scaled timer
    if (p >= 2) {
        data.spreadTimer = setTimeout(() => _egCorruptSpreadTick(key), _egCorruptSpreadIntervalMs(cfg));
    }
    _egBossCorrupted.set(key, data);
}


// Removes the corruption overlay from the DOM and clears its state entry —
// including any pending telegraphed spread (its ghost overlay is removed so
// no orphan telegraph can outlive its source).
function _egRemoveCellCorruption(key) {
    const data = _egBossCorrupted.get(key);
    if (data) {
        clearTimeout(data.timer);
        clearTimeout(data.spreadTimer);
        if (data.pending) {
            clearTimeout(data.pending.landTimer);
            const tel = document.getElementById(`eg-corrupt-tel-${data.pending.tr}-${data.pending.tc}`);
            if (tel) tel.remove();
            data.pending = null;
        }
    }
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-corrupt-${r}-${c}`);
    if (span) span.remove();
    _egBossCorrupted.delete(key);
}


// Removes all currently active corrupted cells.
// Called on boss death or encounter stop to avoid leaving orphaned overlays.
function _egClearAllCorruptedCells() {
    Array.from(_egBossCorrupted.keys()).forEach(key => _egRemoveCellCorruption(key));
}


// Returns true if the cell at (row, col) currently has an active corruption overlay.
// Called from mouse-button-handlers.js before allowing a cell fill.
function _egIsCellCorrupted(row, col) {
    return _egBossCorrupted.has(`${row}-${col}`);
}


// Dispels the corruption on a cell when the player clicks it.
// Returns true if the cell was corrupted (caller should block the normal fill action
// and require a second click to actually fill).
function _egDispelCorruption(row, col) {
    const key = `${row}-${col}`;
    if (!_egBossCorrupted.has(key)) return false;

    clearTimeout(_egBossCorrupted.get(key).timer);
    _egRemoveCellCorruption(key);
    showToast(t('eg_corruption_dispelled'));
    return true;
}


// Boss mechanic handler — called by the boss mechanic scheduler.
// Phase variants (counts), with tier-scaled cast counts, caps + spread rates:
//   P1 — Corrupts static cells (auto-expire, must be dispelled to fill);
//        1–3 by tier.
//   P2 — Corrupts cells that SPREAD to neighbours (count, cap + rate by tier).
//   P3 — Corrupts cells that never expire and spread faster (count, cap + rate
//        by tier) — tier 1 stays manageable, tier 16 drowns the grid.
function _egMechCorruptCells(monster, phase) {
    const pool = _egBuildCorruptibleCellPool();
    if (pool.length === 0) return;

    const cfg = _egCorruptConfig(monster, phase);
    const castRange = cfg.p >= 3 ? EG_CORRUPT_CAST_P3
        : (cfg.p >= 2 ? EG_CORRUPT_CAST_P2 : EG_CORRUPT_CAST_P1);
    let count = Math.max(1, Math.round(_egBossTierLerp(castRange, cfg.norm)));
    // Never open above the phase's simultaneous corruption ceiling.
    if (cfg.p >= 2) count = Math.min(count, _egCorruptSpreadCap(cfg));
    const targets = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));

    const toastKey = cfg.p >= 3 ? 'eg_mech_corrupt_rage'
        : (cfg.p >= 2 ? 'eg_mech_corrupt_spread' : 'eg_mech_corrupt_cells');
    showToast(t(toastKey).replace('{n}', targets.length));
    targets.forEach(([r, c]) => _egApplyCellCorruption(r, c, cfg));
}


// Returns all cells the player has correctly marked as ✕ (userGrid=2, sol=0).
function _egBuildProbabilityShiftPool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const pool = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (sol[r][c] === 0 && userGrid[r][c] === 2 && !wrongGrid[r][c])
                pool.push([r, c]);
    return pool;
}


// Returns empty (sol=0) cells that a shifted mark can land on: unmarked,
// not already wrong-marked, and never the source cells being relocated.
function _egBuildMarkDestinations(excludeKeys) {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const dests = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] !== 0) continue;
            if (userGrid[r][c] !== 0) continue;
            if (wrongGrid[r][c]) continue;
            if (excludeKeys && excludeKeys.has(`${r}-${c}`)) continue;
            dests.push([r, c]);
        }
    }
    return dests;
}


// Flight time for the relocated ✕ to travel from its old cell to the new one.
const EG_SHIFT_FLY_MS = 1500;

// Active shift flyers (fixed-position ✕ nodes) so boss death / encounter
// stop can remove mid-flight orphans. See _egClearShiftGlows.
let _egShiftFlyNodes = [];


// Ease in-out cubic for the shift flight — slow lift-off, fast cruise,
// soft landing so the eye can track the ✕ across the grid.
function _egShiftFlyEase(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}


// Spawns one flying ✕ from the center of (sr, sc) to the center of (dr, dc)
// over EG_SHIFT_FLY_MS. The destination rect is re-read every frame so a
// scroll / zoom mid-flight still lands on the right cell. onLanded fires
// exactly once (also when either cell is missing — no visual, just the
// state commit).
function _egShiftSpawnFlyer(sr, sc, dr, dc, onLanded) {
    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        if (typeof onLanded === 'function') {
            try { onLanded(); } catch (e) { /* never break the flight loop */ }
        }
    };

    const srcEl = document.getElementById(`g-${sr}-${sc}`);
    const dstEl0 = document.getElementById(`g-${dr}-${dc}`);
    if (!srcEl || !dstEl0) {
        finish();
        return;
    }

    const s = srcEl.getBoundingClientRect();
    if (!s.width && !s.height) {
        finish();
        return;
    }
    const size = Math.max(10, s.width);
    const startX = s.left + s.width / 2;
    const startY = s.top + s.height / 2;

    const node = document.createElement('div');
    node.className = 'eg-shift-fly';
    node.textContent = '✕';
    node.style.width = `${size}px`;
    node.style.height = `${size}px`;
    node.style.fontSize = `${Math.round(size * 0.62)}px`;
    node.style.left = `${startX - size / 2}px`;
    node.style.top = `${startY - size / 2}px`;
    document.body.appendChild(node);
    _egShiftFlyNodes.push(node);

    const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const step = (now) => {
        // Cancelled mid-flight (cleanup removed the node) — still commit
        // the destination state so no mark stays visually missing.
        if (!node.isConnected) {
            const idx = _egShiftFlyNodes.indexOf(node);
            if (idx !== -1) _egShiftFlyNodes.splice(idx, 1);
            finish();
            return;
        }
        const tRaw = Math.max(0, Math.min(1, ((now || t0) - t0) / EG_SHIFT_FLY_MS));
        const t = _egShiftFlyEase(tRaw);

        // Live destination so scrolling / rescaling mid-flight still lands.
        const dstEl = document.getElementById(`g-${dr}-${dc}`);
        let endX = startX, endY = startY;
        if (dstEl) {
            const d = dstEl.getBoundingClientRect();
            if (d.width || d.height) {
                endX = d.left + d.width / 2;
                endY = d.top + d.height / 2;
            }
        }

        const dx = endX - startX;
        const dy = endY - startY;
        // Gentle arc lifting off the grid so crossing paths stay readable.
        const dist = Math.sqrt(dx * dx + dy * dy);
        const lift = Math.min(46, 14 + dist * 0.12) * Math.sin(Math.PI * tRaw);
        const x = dx * t;
        const y = dy * t - lift;
        node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        // Slight pop: grow a touch mid-flight, settle on landing.
        const scale = 1 + 0.25 * Math.sin(Math.PI * tRaw);
        node.style.transform += ` scale(${scale.toFixed(3)})`;

        if (tRaw >= 1) {
            node.remove();
            const idx = _egShiftFlyNodes.indexOf(node);
            if (idx !== -1) _egShiftFlyNodes.splice(idx, 1);
            finish();
            return;
        }
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}


// Moves each target mark to a different empty cell. The ✕ stays on the board
// (the emptiness just "shifts" elsewhere) so no information is destroyed —
// the player has to hunt the marks down again.
//
// Visual: the old ✕ vanishes immediately and a floating ✕ flies from the old
// cell to the new one over EG_SHIFT_FLY_MS, then the new mark lands with a
// brief golden glow. Game state (userGrid) commits instantly so a click
// mid-flight can never double-mark the destination; only the reveal is
// delayed until the flyer lands.
function _egRelocateMarks(targets) {
    const excludeKeys = new Set(targets.map(([r, c]) => `${r}-${c}`));
    const dests = _egBuildMarkDestinations(excludeKeys).sort(() => Math.random() - 0.5);

    targets.forEach(([r, c], i) => {
        const d = dests[i];
        if (!d) return; // ran out of legal destinations
        const [dr, dc] = d;
        // Commit state at once; render the source cleared now, the
        // destination only once its flyer lands (see below).
        userGrid[r][c] = 0;
        renderCell(r, c);
        userGrid[dr][dc] = 2;

        _egShiftSpawnFlyer(r, c, dr, dc, () => {
            // The player may have clicked the destination mid-flight —
            // never stomp their newer input, just make the DOM match it.
            renderCell(dr, dc);
            if (userGrid[dr][dc] !== 2) return;
            const el = document.getElementById(`g-${dr}-${dc}`);
            if (el) {
                el.classList.add('eg-shift-moved');
                setTimeout(() => el.classList.remove('eg-shift-moved'), 1600);
            }
        });
    });
}


// Boss mechanic handler — phase variants (target counts TIER-SCALED):
//   P1 — Probability Shift: erases marks (2 at tier 8, 1–3 across tiers).
//   P2 — Relocation: moves marks to other empty cells (info preserved).
//   P3 — Quantum Shift: relocates marks AND erases 1–2 outright.
function _egMechProbabilityShift(monster, phase) {
    const pool = _egBuildProbabilityShiftPool();
    if (pool.length === 0) return;

    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const norm = _egBossTierNorm(monster);
    const shuffled = pool.sort(() => Math.random() - 0.5);

    if (p === 1) {
        const n = Math.max(1, Math.round(_egBossTierLerp(EG_SHIFT_ERASE_P1, norm)));
        const targets = shuffled.slice(0, Math.min(n, shuffled.length));
        showToast(t('eg_mech_probability_shift').replace('{n}', targets.length));
        targets.forEach(([r, c]) => {
            userGrid[r][c] = 0;
            renderCell(r, c);
        });
        return;
    }

    if (p === 2) {
        const n = Math.max(1, Math.round(_egBossTierLerp(EG_SHIFT_RELOCATE_P2, norm)));
        const targets = shuffled.slice(0, Math.min(n, shuffled.length));
        showToast(t('eg_mech_shift_relocate').replace('{n}', targets.length));
        _egRelocateMarks(targets);
        return;
    }

    // P3: erase N, relocate M after them
    const eraseN = Math.max(1, Math.round(_egBossTierLerp(EG_SHIFT_ERASE_P3, norm)));
    const relocateN = Math.max(1, Math.round(_egBossTierLerp(EG_SHIFT_RELOCATE_P3, norm)));
    const erase = shuffled.slice(0, Math.min(eraseN, shuffled.length));
    const relocate = shuffled.slice(erase.length, erase.length + relocateN);
    showToast(t('eg_mech_shift_quantum').replace('{n}', relocate.length));
    erase.forEach(([r, c]) => {
        userGrid[r][c] = 0;
        renderCell(r, c);
    });
    _egRelocateMarks(relocate);
}


// Removes any lingering "moved mark" glow (used defensively if a grid is
// rebuilt mid-animation). Also removes in-flight ✕ flyers so no orphan can
// outlive its grid — their onLanded callbacks still commit state safely via
// renderCell, but the node check in the flight loop stops the animation.
function _egClearShiftGlows() {
    document.querySelectorAll('.eg-shift-moved').forEach(el => el.classList.remove('eg-shift-moved'));
    if (Array.isArray(_egShiftFlyNodes)) {
        _egShiftFlyNodes.forEach(n => { try { n.remove(); } catch (e) { /* ignore */ } });
        _egShiftFlyNodes = [];
    }
    document.querySelectorAll('.eg-shift-fly').forEach(el => el.remove());
}


// Removes a specific [row, col] entry from the recent-fills tracker.
function _egRemoveFromRecentFills(row, col) {
    const idx = _egRecentFills.findIndex(([fr, fc]) => fr === row && fc === col);
    if (idx !== -1) _egRecentFills.splice(idx, 1);
}


// Plays the burst visual on a cell unfilled by Prior Bomb.
function _egFlashPriorBombCell(row, col) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    el.classList.add('eg-prior-bomb-flash');
    setTimeout(() => el.classList.remove('eg-prior-bomb-flash'), 600);
}


// One Prior Bomb detonation, at the bomb's cell centre: the Demolitionist's
// boom (fireball core + expanding shockwave ring + ember sparks, sized to the
// blast disc), plus a purple-purple tint left on the detonated cell and a
// subtle whole-screen shake so the countdown payoff is FELT. Purely visual —
// the mechanic's own effect (unfilling the cell) stays in the caller.
// Orphan layer: the effect outlives any nk run and self-removes (same
// pattern as _egCrashBoom's orphan branch).
function _egPriorBombBoom(x, y, radius) {
    const R = Math.max(12, radius);

    let layer = document.createElement('div');
    layer.className = 'eg-crash-burst';
    layer.style.left = Math.round(x - R) + 'px';
    layer.style.top = Math.round(y - R) + 'px';
    layer.style.width = (R * 2) + 'px';
    layer.style.height = (R * 2) + 'px';
    document.body.appendChild(layer);

    const core = document.createElement('div');
    core.className = 'eg-crash-core';
    layer.appendChild(core);
    const ring = document.createElement('div');
    ring.className = 'eg-crash-ring';
    layer.appendChild(ring);
    for (let i = 0; i < 7; i++) {
        const s = document.createElement('div');
        s.className = 'eg-crash-spark';
        const ang = Math.random() * Math.PI * 2;
        const dist = R * (0.35 + Math.random() * 0.8);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist) + 'px');
        s.style.animationDelay = Math.round(Math.random() * 90) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, 900);

    // The blast is felt as well as seen — same subtle shake language the
    // screen-blast impact uses (class exists on <body>, restart-clean).
    const shakeBody = document.body;
    shakeBody.classList.remove('eg-screen-shake');
    void shakeBody.offsetWidth;
    shakeBody.classList.add('eg-screen-shake');
    setTimeout(() => shakeBody.classList.remove('eg-screen-shake'), 550);

    if (typeof Audio_Manager !== 'undefined' && Audio_Manager && typeof Audio_Manager.playSFX === 'function') {
        try { Audio_Manager.playSFX('drifterExplosion'); } catch (e) {}
    }
}


// Detonation FX + purple tint on the cell itself. Fired from
// _egPriorBombExplode BEFORE the cell is unfilled so the tint sits on the
// still-filled cell and visibly pops as it is cleared.
function _egPriorBombDetonationFX(b) {
    const cellEl = b.cellEl && b.cellEl.isConnected ? b.cellEl
        : document.getElementById(`g-${b.r}-${b.c}`);
    if (cellEl) {
        cellEl.classList.add('eg-pb-detonated');
        setTimeout(() => cellEl.classList.remove('eg-pb-detonated'), 900);
        const r = cellEl.getBoundingClientRect();
        if (r.width && r.height) {
            _egPriorBombBoom(r.left + r.width / 2, r.top + r.height / 2, Math.max(34, r.width * 1.15));
            return;
        }
    }
    // Cell not measurable (mid-rebuild) — still detonate audibly/shakily.
    _egPriorBombBoom(window.innerWidth / 2, window.innerHeight / 2, 40);
}


// Unfills a single cell and removes it from the recent-fills tracker.
function _egUnfillCell(row, col) {
    userGrid[row][col] = 0;
    _egRemoveFromRecentFills(row, col);
    renderCell(row, col);
    updClues(row, col);
    _egFlashPriorBombCell(row, col);
}


// Boss mechanic handler — deliberately SUMMONS monster reinforcements into
// the arena. This is the one spawn path that stays open inside the boss
// arena (natural respawns are suppressed there — see _egShouldSuppressRespawn
// in endgame-encounter.js): the spawn here is a purposeful boss ability, not
// ambient repopulation. Summons 2 minions in phase 3, 1 otherwise, at the
// boss's own level, capped by the global concurrent-monster cap. Slain
// minions pay out normal XP/loot on top of the boss reward.
const EG_SUMMON_POOL = ['slime', 'ghost', 'rat', 'bat', 'bee'];


function _egMechSummonAdds(monster, phase) {
    if (typeof _egSpawnMonster !== 'function') return;
    const count = phase >= 3 ? 2 : 1;
    const level = Math.max(1, Math.round(monster.level || 1));
    const name = monster.name || monster.baseId || '?';

    let summoned = 0;
    for (let i = 0; i < count; i++) {
        if (typeof _egMonsters !== 'undefined' && _egMonsters.length >= EG_MAX_CONCURRENT_MONSTERS) break;
        const defId = EG_SUMMON_POOL[Math.floor(Math.random() * EG_SUMMON_POOL.length)];
        _egSpawnMonster(defId, level);
        summoned++;
    }
    if (summoned > 0) {
        showToast(t('eg_boss_summon').replace('{name}', name).replace('{n}', summoned), '#f87171');
        if (typeof _egUpdateObjectivesHUD === 'function') _egUpdateObjectivesHUD();
    }
}


// Returns the most-recently-filled correct cells eligible for Prior Bomb.
function _egPriorBombPool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    return [..._egRecentFills].reverse().filter(([r, c]) =>
        userGrid[r][c] === 1 && !revealedGrid[r][c] && sol[r][c] === 1
    );
}


// ── Prior Bomb: countdown bombs with a defuse counterplay ────────────────────
// Armed bombs show a LIVE countdown above the 💣 and remove a correct fill if
// they detonate. Every bomb is now outplayable: park the player sprite on the
// bomb to PAUSE its fuse and start defusing — hold the position for
// EG_PRIOR_BOMB_DEFUSE_MS and the bomb is disarmed with no effect on the grid.
// State lives in _egPriorBombs, driven by one shared 100 ms interval that is
// pause-aware (fuses freeze while the game is paused).

let _egPriorBombs = [];           // { r, c, cellEl, fuseEl, remainMs, defuseAcc, monsterId, resolved }
let _egPriorBombTimer = null;
let _egPriorBombDefusingActive = false;   // player standing on an armed bomb right now
let _egPriorBombChargePauseShown = false; // dedupes the charge-bar pause style toggles


// True while the player is actively defusing a Prior Bomb (standing on it with
// its fuse paused). _egTickPlayer reads this to freeze the player's auto-attack
// charge bar — the same pause as the Hold-E parry, but WITHOUT the parry
// behaviour: defusing simply costs the player their DPS while they stand there.
function _egPriorBombDefusing() {
    return _egPriorBombDefusingActive;
}


// Keeps the player charge bar's paused style in sync with defusing (same visual
// language as the Hold-E charge pause). Touches the DOM only on real changes.
function _egSyncDefuseChargePause(active) {
    _egPriorBombDefusingActive = !!active;
    if (!!active === _egPriorBombChargePauseShown) return;
    _egPriorBombChargePauseShown = !!active;
    const bar = document.getElementById('avatar-charge-fill');
    if (bar) bar.classList.toggle('eg-charge-paused', !!active);
    const alt = document.getElementById('eg-player-charge-bar');
    if (alt) alt.classList.toggle('eg-charge-paused', !!active);
    _egSyncDefuseLabel(!!active);
}


// 'DEFUSING' hint label on the player sprite while standing on a bomb — the
// same visual language as the Hold-E PARRYING label (#eg-hold-pause-label),
// but in defuse green and driven by the bomb tick instead of the parry key.
// Touches the DOM only on real state changes (caller dedupes transitions).
function _egSyncDefuseLabel(show) {
    const hud = document.getElementById('player-avatar-wrapper');
    if (hud) {
        let lbl = document.getElementById('eg-defuse-label');
        if (show) {
            if (!lbl) {
                lbl = document.createElement('div');
                lbl.id = 'eg-defuse-label';
                hud.appendChild(lbl);
            }
            const raw = (typeof t === 'function') ? t('eg_defusing') : '';
            lbl.textContent = (raw && raw !== 'eg_defusing') ? raw : 'DEFUSING';
            lbl.style.display = '';
        } else if (lbl) {
            lbl.remove();
        }
    } else if (!show) {
        // No avatar yet — make sure a stray label elsewhere is cleaned up.
        const stray = document.getElementById('eg-defuse-label');
        if (stray) stray.remove();
    }
}


// True while the player sprite overlaps the bomb's cell (with forgiveness).
function _egPriorBombStanding(b, pr) {
    if (!pr || !b.cellEl || !b.cellEl.isConnected) return false;
    const r = b.cellEl.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const p = EG_PRIOR_BOMB_STAND_PAD_PX;
    return _egNkRectsOverlap(
        { left: r.left - p, right: r.right + p, top: r.top - p, bottom: r.bottom + p },
        pr
    );
}


// Arms a single bomb on a cell: countdown label above the 💣 icon, then a
// shared driver (see _egPriorBombTick) counts it down / defuses it.
function _egPriorBombArmCell(r, c, monsterId, fuseMs) {
    const cellEl = document.getElementById(`g-${r}-${c}`);
    if (!cellEl || !cellEl.isConnected) return;
    if (cellEl.querySelector('.eg-prior-bomb-fuse')) return; // never double-arm

    const fuseEl = document.createElement('span');
    fuseEl.className = 'eg-prior-bomb-fuse';
    fuseEl.id = `eg-pb-fuse-${r}-${c}`;
    fuseEl.innerHTML =
        '<span class="eg-pb-cd">' + Math.max(1, Math.ceil(fuseMs / 1000)) + '</span>' +
        '<span class="eg-pb-icon">💣</span>' +
        '<span class="eg-pb-defuse"><i></i></span>';
    cellEl.appendChild(fuseEl);

    _egPriorBombs.push({
        r, c, cellEl, fuseEl,
        monsterId: monsterId || null,
        remainMs: Math.max(1, fuseMs),
        defuseAcc: 0,
        resolved: false,
    });

    if (!_egPriorBombTimer) {
        _egPriorBombTimer = setInterval(_egPriorBombTick, EG_PRIOR_BOMB_TICK_MS);
    }
}


// Detonation: the fuse pays off — explosion FX (boom + screen shake + SFX)
// fire at the cell, THEN the fill is removed. Re-validated so an arena
// transition or a refill mid-fuse can never corrupt the new grid (original
// behaviour). A ghosted cell (grid rebuilt but cell still present) still
// pops visually — the FX read from the DOM cell when possible.
function _egPriorBombExplode(b) {
    _egPriorBombDetonationFX(b);
    if (b.fuseEl) b.fuseEl.remove();
    if (!cur || !cur.grid) return;
    if (b.r >= cur.grid.length || b.c >= cur.grid[0].length) return;
    if (userGrid[b.r][b.c] !== 1 || revealedGrid[b.r][b.c] || cur.grid[b.r][b.c] !== 1) return;
    _egUnfillCell(b.r, b.c);
}


// Disarmed: green flash on the cell — the fill survives untouched.
function _egPriorBombDefuse(b) {
    if (b.fuseEl) b.fuseEl.remove();
    const cellEl = document.getElementById(`g-${b.r}-${b.c}`);
    if (cellEl) {
        cellEl.classList.add('eg-pb-defused');
        setTimeout(() => cellEl.classList.remove('eg-pb-defused'), 1000);
    }
}


// Shared 100 ms driver for every armed bomb:
//   • player standing on the bomb → fuse paused, defuse accumulates;
//   • otherwise → fuse ticks down to detonation.
// Freezes under pause/death and vanishes silently when the boss dies or the
// grid is torn down.
function _egPriorBombTick() {
    if (typeof _gamePaused !== 'undefined' && _gamePaused) return;
    if (typeof dead !== 'undefined' && dead) return;
    if (typeof _egIsActive === 'function' && !_egIsActive()) {
        _egClearPriorBombFuses();
        return;
    }

    const pr = typeof _egNkPlayerRect === 'function' ? _egNkPlayerRect() : null;
    const dt = EG_PRIOR_BOMB_TICK_MS;

    for (const b of _egPriorBombs) {
        if (b.resolved) continue;

        // Boss died or the grid moved on → the bomb just vanishes (old behaviour).
        if ((b.monsterId && typeof _egMonsters !== 'undefined'
                && !_egMonsters.some(m => m.id === b.monsterId))
            || !b.cellEl || !b.cellEl.isConnected) {
            if (b.fuseEl) b.fuseEl.remove();
            b.resolved = true;
            continue;
        }

        const standing = _egPriorBombStanding(b, pr);

        if (standing) {
            // Defusing: the explosion timer is PAUSED — accumulate stand time.
            b.defuseAcc += dt;
            b.fuseEl.classList.add('eg-pb-defusing');
            const bar = b.fuseEl.querySelector('.eg-pb-defuse');
            if (bar) bar.style.display = 'block';
            const fill = bar ? bar.querySelector('i') : null;
            if (fill) {
                fill.style.width = Math.min(100, (b.defuseAcc / EG_PRIOR_BOMB_DEFUSE_MS) * 100) + '%';
            }
            if (b.defuseAcc >= EG_PRIOR_BOMB_DEFUSE_MS) {
                _egPriorBombDefuse(b);
                b.resolved = true;
                continue;
            }
        } else {
            b.fuseEl.classList.remove('eg-pb-defusing');
            b.remainMs -= dt;
            if (b.remainMs <= 0) {
                _egPriorBombExplode(b);
                b.resolved = true;
                continue;
            }
        }

        // Live countdown above the icon.
        const cd = b.fuseEl.querySelector('.eg-pb-cd');
        if (cd) {
            cd.textContent = Math.max(1, Math.ceil(b.remainMs / 1000));
            cd.classList.toggle('eg-pb-critical', b.remainMs <= 3000);
        }
    }

    _egPriorBombs = _egPriorBombs.filter(b => !b.resolved);

    // Defusing = the player is still standing on a bomb that survived this
    // tick. Re-checking AFTER the filter releases the charge pause cleanly
    // when the very last bomb is defused mid-stand (otherwise the interval
    // below would stop with the pause latch stuck on forever).
    let stillDefusing = false;
    for (const b of _egPriorBombs) {
        if (_egPriorBombStanding(b, pr)) { stillDefusing = true; break; }
    }
    _egSyncDefuseChargePause(stillDefusing);

    if (_egPriorBombs.length === 0 && _egPriorBombTimer) {
        clearInterval(_egPriorBombTimer);
        _egPriorBombTimer = null;
    }
}


// Removes any armed-but-undetonated bomb fuses (encounter stop / cleanup).
function _egClearPriorBombFuses() {
    if (_egPriorBombTimer) {
        clearInterval(_egPriorBombTimer);
        _egPriorBombTimer = null;
    }
    _egPriorBombs.forEach(b => { if (b.fuseEl) b.fuseEl.remove(); });
    _egPriorBombs = [];
    document.querySelectorAll('.eg-prior-bomb-fuse').forEach(el => el.remove());
    _egSyncDefuseChargePause(false);
}


// Boss mechanic handler — EVERY phase now arms visible, defusable bombs
// (counts AND fuse timing stay TIER-SCALED like Corrupt Cells):
//   P1 — Prior Bomb: {n} bombs on the most recent correct fills.
//   P2 — Fused Bomb: {n} bombs (snappier window at high tier).
//   P3 — Cascade Bomb: {n} bombs, then a delayed second bomb arms on the
//        freshest fill ~EG_PRIOR_BOMB_CASCADE_DELAY_MS later.
// Each bomb shows its countdown above the icon; standing on it for
// EG_PRIOR_BOMB_DEFUSE_MS defuses it (fuse paused while defusing).
function _egMechPriorBomb(monster, phase) {
    const pool = _egPriorBombPool();
    if (pool.length === 0) return;

    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const norm = _egBossTierNorm(monster);
    const countRange = p >= 3 ? EG_PRIOR_BOMB_COUNT_P3
        : (p >= 2 ? EG_PRIOR_BOMB_COUNT_P2 : EG_PRIOR_BOMB_COUNT_P1);
    const count = Math.max(1, Math.round(_egBossTierLerp(countRange, norm)));
    const fuseMs = Math.max(5000, Math.round(_egBossTierLerp(EG_PRIOR_BOMB_FUSE_RANGE, norm)));
    const targets = pool.slice(0, Math.min(count, pool.length));
    const mid = monster ? monster.id : null;

    showToast(t(p >= 3 ? 'eg_mech_prior_bomb_cascade'
        : (p >= 2 ? 'eg_mech_prior_bomb_fuse' : 'eg_mech_prior_bomb')).replace('{n}', targets.length));
    targets.forEach(([r, c]) => _egPriorBombArmCell(r, c, mid, fuseMs));

    // P3 keeps the pressure on: a delayed second bomb on the freshest fill.
    if (p >= 3) {
        setTimeout(() => {
            if (mid && typeof _egMonsters !== 'undefined'
                && !_egMonsters.some(m => m.id === mid)) return; // boss dead
            const pool2 = _egPriorBombPool();
            if (pool2.length === 0) return;
            _egPriorBombArmCell(pool2[0][0], pool2[0][1], mid, fuseMs);
        }, EG_PRIOR_BOMB_CASCADE_DELAY_MS);
    }
}


// ── Clue Swap state ──────────────────────────────────────────────────────────
// Active swap = { groups: [ { rows, spans:[[...]], orig:[[...]] } ] }. Each
// group cycles its rows' clue numbers one step (pair A↔B, triple A←B←C←A).
// Clue numbers live as per-number spans (rn-{row}-{i} / cn-{col}-{i}), so the
// swap operates on those spans — a row's whole clue is spread across them.

// Picks `n` distinct rows with clue spans, preferring rows of equal clue
// length so positional exchanges read as clean full swaps. Returns null when
// the puzzle cannot supply enough rows.
function _egSwapPickRows(rowCount, n) {
    const buckets = {};
    for (let r = 0; r < rowCount; r++) {
        const s = _egCollectClueSpans('r', r).filter(el => el.isConnected);
        if (!s.length) continue;
        (buckets[s.length] = buckets[s.length] || []).push(r);
    }
    const lens = Object.keys(buckets).map(Number).sort(() => Math.random() - 0.5);
    for (const len of lens) {
        const b = buckets[len];
        if (b.length >= n) return b.sort(() => Math.random() - 0.5).slice(0, n);
    }
    const all = Object.values(buckets).flat().sort(() => Math.random() - 0.5);
    return all.length >= n ? all.slice(0, n) : null;
}


// Snapshots the per-number clue spans of one row in visual order.
function _egSwapRowGroup(rows) {
    const spans = [], orig = [];
    rows.forEach(r => {
        const s = _egCollectClueSpans('r', r).filter(el => el.isConnected);
        spans.push(s);
        orig.push(s.map(el => el.textContent));
    });
    return { rows, spans, orig };
}


// Applies one swap group's rotation from its snapshots. Number i of row k
// receives number i of the row one step ahead in the cycle; when the supplier
// is shorter, the remainder keeps its own value (unequal clue lengths always
// restore exactly because every original text is snapshotted).
function _egSwapApplyGroup(group) {
    const n = group.rows.length;
    group.spans.forEach((spans, k) => {
        const src = group.orig[(k + 1) % n];
        spans.forEach((el, i) => {
            const v = i < src.length ? src[i] : group.orig[k][i];
            if (v !== undefined) {
                el.textContent = v;
                el.classList.add('eg-swap-clue');
            }
        });
    });
}


// Restores every active swap group to its original clue order. Defers while a
// Clue Blackout is active so the blackout's own text snapshot/restore isn't
// fought over.
function _egRestoreClueSwap() {
    if (_egBlackoutActive) {
        // Blackout in progress — retry shortly until it clears.
        _egClueSwapRestoreTimer = setTimeout(_egRestoreClueSwap, 2000);
        return;
    }
    if (!_egActiveClueSwap) return;
    _egActiveClueSwap.groups.forEach(g => {
        g.spans.forEach((spans, k) => {
            spans.forEach((el, i) => {
                if (el.isConnected && g.orig[k][i] !== undefined) el.textContent = g.orig[k][i];
            });
        });
    });
    _egActiveClueSwap = null;
    document.querySelectorAll('.eg-swap-clue').forEach(el => el.classList.remove('eg-swap-clue'));
}


// TIER-SCALED Clue Swap timing — a duration factor anchored exactly at tier 8
// (8s / 10s / 12s unchanged there). Swapped clues read wrong, so a LONGER
// effect is harsher: low tiers restore fast, high tiers hold longer.
const EG_SWAP_DURATION_F = [0.85, 1.15]; // [tier1, tier16]


// Boss mechanic handler — phase variants over ROW clues:
//   P1 — Clue Swap: two rows exchange their clue numbers (original behaviour —
//        now actually swaps, operating on the real per-number spans).
//   P2 — Triple Shift: three rows' clues rotate one step.
//   P3 — Double Cross: two independent row pairs swap at once.
function _egMechClueSwap(monster, phase) {
    if (_egBlackoutActive || _egActiveClueScramble) return; // don't fight over clue text
    const rows = (cur && cur.grid) ? cur.grid.length : 0;
    if (rows < 2) return;

    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const swapNorm = _egBossTierNorm(monster);
    let groups = [];
    if (p === 1) {
        const pick = _egSwapPickRows(rows, 2);
        if (pick) groups.push(_egSwapRowGroup(pick));
    } else if (p === 2) {
        const pick = _egSwapPickRows(rows, 3);
        if (pick) groups.push(_egSwapRowGroup(pick));
    } else {
        const pick = _egSwapPickRows(rows, 4);
        if (pick) {
            groups.push(_egSwapRowGroup([pick[0], pick[1]]));
            groups.push(_egSwapRowGroup([pick[2], pick[3]]));
        }
    }
    if (!groups.length) return;

    groups.forEach(g => _egSwapApplyGroup(g));

    const duration = Math.round((p === 1 ? 8000 : (p === 2 ? 10000 : 12000))
        * _egBossTierFactor(swapNorm, EG_SWAP_DURATION_F));
    const toastKey = p === 1 ? 'eg_mech_clue_swap'
        : (p === 2 ? 'eg_mech_clue_swap_triple' : 'eg_mech_clue_swap_double');
    showToast(t(toastKey).replace('{n}', duration / 1000));

    clearTimeout(_egClueSwapRestoreTimer);
    _egActiveClueSwap = { groups };
    _egClueSwapRestoreTimer = setTimeout(_egRestoreClueSwap, duration);
}


// Full cleanup — undoes any active swap immediately if one is pending.
// Called from _egBossCleanup on boss death / encounter stop.
function _egRemoveClueSwap() {
    clearTimeout(_egClueSwapRestoreTimer);
    _egClueSwapRestoreTimer = null;
    if (_egActiveClueSwap) _egRestoreClueSwap();
}


// ── Frozen cell thaw time ────────────────────────────────────────────────────
const EG_FROZEN_CELL_LIFETIME_MS = 9000;    // P1/P2 thaw time (tier-8 base)
const EG_FROZEN_CELL_LIFETIME_P3_MS = 12000; // P3 — the deep freeze lasts longer
const EG_FROZEN_CREEP_DELAY_MS = 4500;     // P2 — when each initial freeze spawns its creeping child
const EG_FROZEN_CREEP_DELAY_P3_MS = 4000;  // P3 — the ice creeps faster
const EG_FROZEN_TELEGRAPH_MS = 1000;       // warning between the ghost ❄️ and the creep landing

// TIER-SCALED knobs — same [tier1, tier16] endpoint pattern as Corrupt Cells.
// Cast counts and field caps lerp between endpoint pairs (tier 8 lands on the
// pre-scaling values: 2 / 3 / 4 casts, 6 / 8 caps); thaw time and creep delay
// are duration factors anchored exactly at tier 8. Low tiers thaw faster and
// creep slower, high tiers hold the deep freeze longer and creep sooner.
const EG_FROZEN_CAST_P1 = [1, 3]; // P1 static locks
const EG_FROZEN_CAST_P2 = [2, 4]; // P2 initial locks
const EG_FROZEN_CAST_P3 = [3, 5]; // P3 initial locks
// Max simultaneous frozen cells. Creep is single-generation (children never
// re-creep) so caps stay at initial count + children, and the field always
// thaws out completely afterwards.
const EG_FROZEN_CAP_P2 = [5, 7]; // 3 initial + up to 3 children at tier 8
const EG_FROZEN_CAP_P3 = [7, 9]; // 4 initial + up to 4 children at tier 8
const EG_FROZEN_LIFE_F = [0.85, 1.15];  // thaw-time factor [tier1, tier16]
const EG_FROZEN_CREEP_F = [1.2, 0.8];   // creep-delay factor [tier1, tier16]


// Resolved cast count for one phase at a given tier weight.
function _egFrozenCastCount(p, norm) {
    const range = p >= 3 ? EG_FROZEN_CAST_P3 : (p >= 2 ? EG_FROZEN_CAST_P2 : EG_FROZEN_CAST_P1);
    return Math.max(1, Math.round(_egBossTierLerp(range, norm)));
}


// Resolved thaw time (ms) for one phase at a given tier weight.
function _egFrozenLifeMs(p, norm) {
    const base = p >= 3 ? EG_FROZEN_CELL_LIFETIME_P3_MS : EG_FROZEN_CELL_LIFETIME_MS;
    return Math.max(2000, Math.round(base * _egBossTierFactor(norm, EG_FROZEN_LIFE_F)));
}


// Resolved creep delay (ms) — when an initial freeze spawns its child.
function _egFrozenCreepDelayMs(p, norm) {
    const base = p >= 3 ? EG_FROZEN_CREEP_DELAY_P3_MS : EG_FROZEN_CREEP_DELAY_MS;
    return Math.max(800, Math.round(base * _egBossTierFactor(norm, EG_FROZEN_CREEP_F)));
}


// Returns all grid cells that are valid freeze targets — BOTH correct cells
// (sol=1, lockable until filled) and incorrect cells (sol=0, lockable until
// ✕-marked) that the player hasn't finished yet. Cells already frozen or
// corrupted are skipped.
function _egBuildFreezableCellPool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const pool = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (_egBossFrozen.has(`${r}-${c}`)) continue; // already frozen
            if (_egBossCorrupted.has(`${r}-${c}`)) continue; // already corrupted
            if (sol[r][c] === 1) {
                // correct cell — lockable while still unfilled/unrevealed
                if (userGrid[r][c] === 1 || revealedGrid[r][c]) continue; // already filled
            } else if (sol[r][c] === 0) {
                // incorrect cell — lockable while not yet ✕-marked
                if (userGrid[r][c] === 2) continue; // already marked
            } else {
                continue; // grid only holds 0/1 in practice
            }
            pool.push([r, c]);
        }
    }
    return pool;
}


// Places the ❄ freeze overlay on a cell and registers its thaw timer.
// cfg = { p: boss phase (1-3), child: true for a creeping child (never
// re-creeps), norm: tier weight 0..1 } — children inherit the source's cfg so
// one whole field follows the same rule set.
// P1 — plain static freeze. P2+ — initial freezes each spawn one telegraphed
// "creeping frost" child mid-life (see _egFrozenCreepTick), so the lock count
// can double while it lasts but always fully thaws afterwards.
function _egApplyCellFreeze(r, c, cfg) {
    const key = `${r}-${c}`;
    const el = document.getElementById(`g-${r}-${c}`);
    if (!el || _egBossFrozen.has(key)) return;

    const p = (cfg && cfg.p) ? Math.max(1, Math.min(3, cfg.p)) : 1;
    const isChild = !!(cfg && cfg.child);
    const norm = (cfg && cfg.norm != null) ? cfg.norm : 0.5;
    const overlay = document.createElement('span');
    overlay.className = 'eg-freeze-overlay';
    overlay.id = `eg-freeze-${r}-${c}`;
    overlay.textContent = '❄️';
    el.appendChild(overlay);

    const data = {
        thawTimer: null, creepTimer: null, pending: null,
        cfg: { p, child: isChild, norm },
    };
    data.thawTimer = setTimeout(() => _egRemoveCellFreeze(key), _egFrozenLifeMs(p, norm));
    if (p >= 2 && !isChild) {
        data.creepTimer = setTimeout(() => _egFrozenCreepTick(key), _egFrozenCreepDelayMs(p, norm));
    }
    _egBossFrozen.set(key, data);
}


// Picks a random 4-neighbour of a frozen cell that can legally freeze next
// (correct or incorrect, unsolved, not already frozen, and not already
// marked as a pending creep target). Returns null when no neighbour
// qualifies.
function _egFrozenPickNeighbor(r, c) {
    if (!cur || !cur.grid) return null;
    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const cands = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        if (sol[nr][nc] === 1) {
            if (userGrid[nr][nc] === 1 || revealedGrid[nr][nc]) continue; // correct cell already filled
        } else if (sol[nr][nc] === 0) {
            if (userGrid[nr][nc] === 2) continue; // incorrect cell already ✕-marked
        } else {
            continue; // grid only holds 0/1
        }
        if (_egBossFrozen.has(`${nr}-${nc}`)) continue;
        if (document.getElementById(`eg-freeze-tel-${nr}-${nc}`)) continue; // already telegraphed
        cands.push([nr, nc]);
    }
    if (!cands.length) return null;
    return cands[Math.floor(Math.random() * cands.length)];
}


// Cap of concurrent frozen cells for one phase at the field's tier weight.
function _egFrozenCap(data) {
    const range = (data && data.cfg && data.cfg.p >= 3) ? EG_FROZEN_CAP_P3 : EG_FROZEN_CAP_P2;
    const norm = (data && data.cfg) ? data.cfg.norm : 0.5;
    return Math.max(1, Math.round(_egBossTierLerp(range, norm)));
}


// Shows the ghosted ❄ on the target and lands the creep after the warning.
// Stored on the source entry so thawing the source cancels the pending creep.
function _egFrozenTelegraphCreep(key, data, tr, tc) {
    const el = document.getElementById(`g-${tr}-${tc}`);
    if (!el) return;

    const tel = document.createElement('span');
    tel.className = 'eg-freeze-telegraph';
    tel.id = `eg-freeze-tel-${tr}-${tc}`;
    tel.textContent = '❄️';
    el.appendChild(tel);

    data.pending = {
        tr, tc,
        landTimer: setTimeout(() => _egFrozenCreepLand(key), EG_FROZEN_TELEGRAPH_MS),
    };
}


// Lands a telegraphed creep. Re-validates everything (source still frozen,
// cap not exceeded, target still legal) so a mid-telegraph thaw, refill or
// grid swap can never freeze the wrong cell.
function _egFrozenCreepLand(key) {
    const data = _egBossFrozen.get(key);
    if (!data || !data.pending) return;
    const { tr, tc } = data.pending;
    data.pending = null;
    const tel = document.getElementById(`eg-freeze-tel-${tr}-${tc}`);
    if (tel) tel.remove();

    if (!_egBossFrozen.has(key)) return;          // source thawed mid-telegraph
    if (!cur || !cur.grid) return;
    if (tr >= cur.grid.length || tc >= cur.grid[0].length) return; // grid swapped
    if (_egBossFrozen.size >= _egFrozenCap(data)) return;          // cap reached meanwhile
    const sol = cur.grid;
    if (sol[tr][tc] === 1) {
        if (userGrid[tr][tc] === 1 || revealedGrid[tr][tc]) return;    // correct target filled meanwhile
    } else if (sol[tr][tc] === 0) {
        if (userGrid[tr][tc] === 2) return;                            // incorrect target ✕-marked meanwhile
    } else {
        return;                                                        // grid swapped to a new shape
    }
    if (_egBossFrozen.has(`${tr}-${tc}`)) return;

    _egApplyCellFreeze(tr, tc, { p: data.cfg.p, child: true, norm: data.cfg.norm });
    if (typeof showToast === 'function') showToast(t('eg_frozen_spread'));
}


// One creep attempt from a frozen source: telegraphs a child when under the
// cap. Single-generation — the child never creeps again, so the field always
// thaws out completely.
function _egFrozenCreepTick(key) {
    const data = _egBossFrozen.get(key);
    if (!data) return;
    if (_egBossFrozen.size < _egFrozenCap(data)) {
        const [r, c] = key.split('-').map(Number);
        const neighbor = _egFrozenPickNeighbor(r, c);
        if (neighbor) _egFrozenTelegraphCreep(key, data, neighbor[0], neighbor[1]);
    }
}


// Removes the freeze overlay from the DOM and clears its state entry —
// including any pending telegraphed creep (its ghost is removed too, so no
// orphan telegraph can outlive its source).
function _egRemoveCellFreeze(key) {
    const data = _egBossFrozen.get(key);
    if (data) {
        clearTimeout(data.thawTimer);
        clearTimeout(data.creepTimer);
        if (data.pending) {
            clearTimeout(data.pending.landTimer);
            const tel = document.getElementById(`eg-freeze-tel-${data.pending.tr}-${data.pending.tc}`);
            if (tel) tel.remove();
            data.pending = null;
        }
    }
    const span = document.getElementById(`eg-freeze-${key}`);
    if (span) span.remove();
    _egBossFrozen.delete(key);
}


// Removes all currently frozen cells. Called on boss death / encounter stop.
function _egClearAllFrozenCells() {
    Array.from(_egBossFrozen.keys()).forEach(key => _egRemoveCellFreeze(key));
}


// Returns true if the cell at (row, col) is currently frozen.
// Called from mouse-button-handlers.js before allowing a cell fill.
function _egIsCellFrozen(row, col) {
    return _egBossFrozen.has(`${row}-${col}`);
}


// Boss mechanic handler — phase variants (counts/caps/thaw/creep all scaled
// by the boss's atlas tier, anchored at tier 8 on the pre-scaling values):
//   P1 — Frozen Cells: static locks that thaw on their own (original).
//   P2 — Creeping Frost: each initial freeze spawns ONE telegraphed child on
//        a neighbour mid-life (field caps out, all auto-thaw).
//   P3 — Glacial Drift: locks last longer and creep faster.
function _egMechFrozenCells(monster, phase) {
    const pool = _egBuildFreezableCellPool();
    if (pool.length === 0) return;

    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const norm = _egBossTierNorm(monster);
    const count = _egFrozenCastCount(p, norm);
    const targets = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));

    const toastKey = p >= 3 ? 'eg_mech_frozen_drift'
        : (p >= 2 ? 'eg_mech_frozen_creep' : 'eg_mech_frozen_cells');
    showToast(t(toastKey).replace('{n}', targets.length));
    targets.forEach(([r, c]) => _egApplyCellFreeze(r, c, { p, child: false, norm }));
}


// Removes the invert filter from the puzzle table and clears its timer.
function _egRemoveGridInvert() {
    clearTimeout(_egGridInvertTimer);
    _egGridInvertTimer = null;
    const tbl = document.getElementById('ptable');
    if (tbl) tbl.classList.remove('eg-grid-invert');
}


// Boss mechanic handler — applies the Inversion Field for a phase-scaled duration.
function _egMechGridInvert(monster, phase) {
    if (_egGridInvertTimer) return; // already active
    const tbl = document.getElementById('ptable');
    if (!tbl) return;

    tbl.classList.add('eg-grid-invert');

    const duration = phase >= 3 ? 9000 : 6000;
    showToast(t('eg_mech_grid_invert').replace('{n}', duration / 1000));
    _egGridInvertTimer = setTimeout(_egRemoveGridInvert, duration);
}


const EG_BLAST_WARN_MS = 1500;


const EG_BLAST_ACTIVE_MS = 5000;


const EG_BLAST_DAMAGE_PCT = 0.30;


// Readability/fairness knobs for the shared screen-blast engine. Every boss
// that drives it through _egRunScreenBlast gets the same timeline language:
//   1. the countdown ticks through the WARNING phase (seconds until the blast
//      goes live) and resets at the impact flash to count the hold window;
//   2. the last EG_BLAST_LASTCALL_MS of the hold window turn the countdown
//      red and set the zone border flashing — the resolve is imminent;
//      the WARNING, HOLD and LAST-CALL windows are TIER-SCALED
//      (EG_BLAST_TIER_*_F): low-tier bosses give more time to react,
//      high-tier ones stay brutal — tier 8 is the anchor (factor 1.0);
//   3. shrinking zones (Heat Death / Overfit Bloom) reach their final radius
//      at EG_BLAST_SHRINK_SETTLE of the window and HOLD it, so what the player
//      sees for the final seconds is exactly what the resolve check uses;
//   4. a bottom status line mirrors the crush-walls label idiom: GET INSIDE /
//      IN THE ZONE / LAST-CHECK, plus ✓/✗ resolve flashes.
const EG_BLAST_LASTCALL_MS = 1500; // anchor last-call window (tier 8)
const EG_BLAST_SHRINK_SETTLE = 0.85;
const EG_BLAST_TRANSITION_FLASH_MS = 160;
const EG_BLAST_CHARGE_MS = 550; // ghost destination charges up right before the jump

// Screen-blast timeline scaling — same [tier1, tier16] endpoint pattern as the
// corruption caps. Each pair is the DURATION MULTIPLIER at tier 1 (gentle:
// more warning / longer hold / longer last call) vs tier 16 (brutal: all of
// them shorter). Tier 8 (norm = 7/15) is the anchor where the factor is
// exactly 1.0, so the pre-scaling timing is unchanged for mid-tier bosses.
const EG_BLAST_TIER_WARN_F = [1.22, 0.75];     // warning window
const EG_BLAST_TIER_HOLD_F = [1.21, 0.76];     // hold (active) window
const EG_BLAST_TIER_LASTCALL_F = [1.26, 0.70]; // last-call urgency window

// Tier factor for one blast knob: exactly 1 at the tier-8 anchor, >1 on
// gentle tiers, <1 on brutal tiers. Callers without a boss (no opts.tierNorm)
// get factor 1 — the engine keeps its exact current timing outside boss
// fights.
function _egBlastTierFactor(norm, range) {
    return _egBossTierFactor(norm, range);
}


// The older per-boss nk dodge engines (band slams, storms, shrapnel, chase
// orbs, etc.) share ONE difficulty curve through _egNkNewRun: their internal
// clock runs on _egBossTierFactor(norm, EG_NK_TIER_FACTOR) — the same
// [tier1, tier16] timing-multiplier family as the blast warning window.
// Tier 8 is the anchor (factor 1.0, pre-scaling timing untouched). DoT
// damage is counter-scaled in _egNkDotTick so only TIMING moves, never DPS.
const EG_NK_TIER_FACTOR = [1.22, 0.75];


// Failed-dodge DAMAGE companion to the timing curve above: the %maxHP hit
// (and DoT %/s) of a failed nk dodge is gentler at low tier and harsher at
// high tier, keeping the timing curve company. Tier 8 is the anchor (×1.0)
// — pre-scaling damage unchanged for mid-tier bosses. Endpoints: tier 1
// deals 85% of the tuned percent, tier 16 deals 120%.
const EG_NK_DAMAGE_TIER = [0.85, 1.20];


// Tier damage multiplier for a failed-dodge hit/DoT, resolved from the boss
// level the callers already pass in (the same source _egNkNewRun uses for
// the timing factor). Unknown/zero levels → factor 1 (unchanged).
function _egNkTierDamageFactor(level) {
    if (!level || !(level > 0)) return 1;
    return _egBossTierFactor(_egBossTierNorm({ level }), EG_NK_DAMAGE_TIER);
}


// Picks a screen position for a zone, biased away from edges so the circle
// is always fully visible and reachable.
function _egBlastPickPos(radius) {
    const margin = radius + 40;
    const x = margin + Math.random() * Math.max(1, window.innerWidth - margin * 2);
    const y = margin + Math.random() * Math.max(1, window.innerHeight - margin * 2);
    return { x, y };
}


// Returns true if the player character sprite is inside the safe zone.
// Entropy's Heat Bloom (and all generic blasts) are dodge mechanics where the
// player must move their draggable avatar sprite — not the class HUD — into
// the circle. Uses the tight sprite image rect (hazard-style) with tolerance.
function _egBlastHudInZone(zone) {
    const rect = _egBlastGetPlayerRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return false;
    const closestX = Math.max(rect.left, Math.min(zone.x, rect.right));
    const closestY = Math.max(rect.top, Math.min(zone.y, rect.bottom));
    const dx = closestX - zone.x;
    const dy = closestY - zone.y;
    const tolerance = 8; // visual border + glow forgiveness
    return Math.sqrt(dx * dx + dy * dy) <= zone.radius + tolerance;
}


// Tight hitbox derived from the visible avatar sprite image, not the wrapper.
// Mirrors the hazard system's _egHzPlayerRect logic: the wrapper is taller than
// the artwork (HP/charge bars), so using its bounds misaligns collision.
// Falls back to HUD only if no avatar is present (non-endgame screen).
function _egBlastGetPlayerRect() {
    // Reuse the hazard helper if it is already loaded for exact parity
    if (typeof _egHzPlayerRect === 'function') {
        const hr = _egHzPlayerRect();
        if (hr && hr.width && hr.height) return hr;
    }
    if (typeof _egHzPlayerSpriteRect === 'function') {
        const sr = _egHzPlayerSpriteRect();
        if (sr && sr.width && sr.height) return sr;
    }
    let img = document.getElementById('avatar-sprite-img');
    let r = img ? img.getBoundingClientRect() : null;
    if (!r || (!r.width && !r.height)) {
        img = document.getElementById('avatar-sprite-img-simple');
        r = img ? img.getBoundingClientRect() : null;
    }
    if (r && r.width && r.height) return r;
    const el = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (el) {
        const wr = el.getBoundingClientRect();
        if (wr.width || wr.height) {
            // Crop the HP/charge bar area at the top for the endgame wrapper
            if (el.id === 'player-avatar-wrapper') {
                const barH = wr.height * 0.38;
                const insetX = Math.min(16, wr.width * 0.18);
                const insetY = Math.min(12, (wr.height - barH) * 0.14);
                const left = wr.left + insetX;
                const right = wr.right - insetX;
                const top = wr.top + barH + insetY;
                const bottom = wr.bottom - Math.min(8, (wr.height - barH) * 0.08);
                if (right > left && bottom > top) {
                    return { left, right, top, bottom, width: right - left, height: bottom - top };
                }
            }
            return wr;
        }
    }
    // Last resort: HUD (keeps Void Surge functional on screens without avatar)
    const hud = document.getElementById('class-hud-drag-handle')
        || document.getElementById('class-hud-panel');
    if (!hud) return null;
    return hud.getBoundingClientRect();
}


// DOM helpers — each blast gets uniquely suffixed elements.
function _egBlastGetOverlay(id) {
    let el = document.getElementById(`eg-blast-overlay-${id}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `eg-blast-overlay-${id}`;
        document.body.appendChild(el);
    }
    return el;
}


function _egBlastPositionCircle(el, zone) {
    el.style.left = zone.x + 'px';
    el.style.top = zone.y + 'px';
    el.style.width = (zone.radius * 2) + 'px';
    el.style.height = (zone.radius * 2) + 'px';
    el.style.marginLeft = (-zone.radius) + 'px';
    el.style.marginTop = (-zone.radius) + 'px';
}


function _egBlastGetCircle(id, idx, zone) {
    let el = document.getElementById(`eg-blast-circle-${id}-${idx}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `eg-blast-circle-${id}-${idx}`;
        document.body.appendChild(el);
    }
    _egBlastPositionCircle(el, zone);
    return el;
}


function _egBlastGetCountdownLabel(id, zone) {
    let el = document.getElementById(`eg-blast-countdown-${id}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `eg-blast-countdown-${id}`;
        document.body.appendChild(el);
    }
    // Mirror the real circle's position so the number sits centred inside it
    el.style.left = zone.x + 'px';
    el.style.top = zone.y + 'px';
    return el;
}


function _egBlastGetGhost(id, pos, radius) {
    let el = document.getElementById(`eg-blast-ghost-${id}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `eg-blast-ghost-${id}`;
        document.body.appendChild(el);
    }
    _egBlastPositionCircle(el, { x: pos.x, y: pos.y, radius });
    return el;
}


// Bottom-centre status line for one blast (mirrors the crush-walls label).
// Lives for the blast's duration; hidden unless the engine paints it.
function _egBlastGetStatus(id) {
    let el = document.getElementById(`eg-blast-status-${id}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `eg-blast-status-${id}`;
        el.className = 'eg-blast-status eg-blast-status-hidden';
        el.textContent = '';
        document.body.appendChild(el);
    }
    return el;
}


// Removes every element and timer belonging to one blast.
function _egBlastTeardown(id) {
    const state = _egActiveBlasts.get(id);
    if (state) {
        state.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
        if (state.poll) clearInterval(state.poll);
        _egActiveBlasts.delete(id);
    }
    [
        `eg-blast-overlay-${id}`, `eg-blast-countdown-${id}`, `eg-blast-ghost-${id}`,
        `eg-blast-status-${id}`,
        `eg-blast-circle-${id}-0`, `eg-blast-circle-${id}-1`, `eg-blast-circle-${id}-2`,
    ].forEach(elId => { const el = document.getElementById(elId); if (el) el.remove(); });
}


// Tears down ALL active blasts. Called from _egBossCleanup on boss death /
// encounter stop so no overlay can outlive its boss.
function _egBlastTeardownAll() {
    Array.from(_egActiveBlasts.keys()).forEach(id => _egBlastTeardown(id));
}


// Runs one full blast sequence with the given options (see block comment).
// Timeline language (shared by every caller):
//   WARNING  — circles + ghost appear; the in-zone countdown ticks DOWN to the
//              live moment so the player knows exactly when the blast starts.
//   IMPACT   — a bright flash marks the warning → active switch, then the
//              blackout holds and the countdown resets to the hold window.
//   HOLD     — stand in the real zone until resolve. Shrinking zones settle at
//              their final radius at 85% of the window, the last 1.5s flash the
//              zone/countdown red (LAST CALL), and a bottom status line says
//              whether you are inside or must move.
//   RESOLVE  — ✓/✗ flash on the zone + status line, brief pause, teardown.
function _egRunScreenBlast(opts) {
    // Never stack two blasts — the last thing the player needs is two
    // overlapping blackout screens fighting over the same dodge.
    if (_egActiveBlasts.size > 0) return;

    const id = ++_egBlastSeq;
    const state = { timers: [], poll: null, t0: Date.now(), live: false, activeAt: null };
    _egActiveBlasts.set(id, state);

    // Tier-scaled timeline: the boss's atlas tier (opts.tierNorm, 0–1)
    // multiplies the warning, hold and last-call windows. No tierNorm
    // (non-boss callers) → factor 1 → exact current timing.
    const tierF = {
        warn: _egBlastTierFactor(opts.tierNorm, EG_BLAST_TIER_WARN_F),
        hold: _egBlastTierFactor(opts.tierNorm, EG_BLAST_TIER_HOLD_F),
        last: _egBlastTierFactor(opts.tierNorm, EG_BLAST_TIER_LASTCALL_F),
    };
    const warnMs = Math.max(600, Math.round((opts.warnMs != null ? opts.warnMs : EG_BLAST_WARN_MS) * tierF.warn));
    const activeMs = Math.max(1200, Math.round((opts.activeMs != null ? opts.activeMs : EG_BLAST_ACTIVE_MS) * tierF.hold));
    const lastcallMs = Math.max(700, Math.round(EG_BLAST_LASTCALL_MS * tierF.last));
    // Rewrite Fate's mid-window jump keeps its proportional spot inside the
    // (possibly scaled) hold window — relocate at 55% stays 55%.
    const relocateAtMs = opts.relocateAtMs != null
        ? Math.max(0, Math.round(opts.relocateAtMs * tierF.hold)) : null;
    const damagePct = opts.damagePct != null ? opts.damagePct : EG_BLAST_DAMAGE_PCT;
    const realIndex = opts.realIndex != null ? opts.realIndex : 0;
    const accent = opts.accent || '#ffd93c';

    const zones = opts.zones.map(z => ({ ...z }));
    let real = zones[realIndex];
    const startRadius = real.radius;
    const shrinkTo = opts.shrinkToRadius != null ? opts.shrinkToRadius : null;

    const schedule = (fn, ms) => {
        const t = setTimeout(fn, ms);
        state.timers.push(t);
    };

    // Bottom status line — painted by the poll/resolve; hidden until then.
    const statusEl = _egBlastGetStatus(id);
    const statusCache = { mode: 'idle', arg: null };
    const paintStatus = (mode, arg) => {
        if (statusCache.mode === mode && statusCache.arg === arg) return;
        statusCache.mode = mode;
        statusCache.arg = arg;
        let text = '';
        let cls = 'eg-blast-status-hidden';
        if (mode === 'in') { text = t('eg_blast_inside'); cls = 'eg-blast-status-ok'; }
        else if (mode === 'out') { text = t('eg_blast_get_inside'); cls = 'eg-blast-status-warn'; }
        else if (mode === 'final') { text = t('eg_blast_lastcall'); cls = 'eg-blast-status-danger'; }
        else if (mode === 'ok') { text = t('eg_blast_dodged'); cls = 'eg-blast-status-ok'; }
        else if (mode === 'hit') { text = t('eg_blast_hit').replace('{n}', arg); cls = 'eg-blast-status-danger'; }
        statusEl.textContent = text;
        statusEl.className = 'eg-blast-status ' + cls;
    };

    // ── Warning phase: red tint fades in, all candidate zones appear ────────
    const overlay = _egBlastGetOverlay(id);
    overlay.className = 'eg-blast-overlay eg-blast-warning';
    if (opts.accent) overlay.style.setProperty('--blast-accent', accent);

    zones.forEach((z, i) => {
        const circle = _egBlastGetCircle(id, i, z);
        circle.className = 'eg-blast-circle' + (i === realIndex ? '' : ' eg-blast-fake');
        // Prior Collapse tell: the REAL zone sparkles throughout the warning
        // so the choice is always readable — never a coin flip.
        if (opts.revealFakeAtActive && i === realIndex) circle.classList.add('eg-blast-true');
        circle.style.setProperty('--blast-accent', accent);
    });

    let ghostEl = null;
    if (opts.ghost) {
        ghostEl = _egBlastGetGhost(id, opts.ghost, startRadius);
        ghostEl.className = 'eg-blast-ghost';
        ghostEl.style.setProperty('--blast-accent', accent);
    }

    const label = _egBlastGetCountdownLabel(id, real);
    label.className = 'eg-blast-countdown';
    label.style.setProperty('--blast-accent', accent);
    label.textContent = Math.max(1, Math.ceil(warnMs / 1000)); // counts down to impact

    if (opts.toastKey && typeof showToast === 'function') showToast(t(opts.toastKey));

    // ── 100ms driver: warning countdown, then hold-window state ─────────────
    state.poll = setInterval(() => {
        if (!state.live) {
            // Warning countdown — seconds until the blast goes live.
            const remWarn = Math.max(0, Math.ceil((warnMs - (Date.now() - state.t0)) / 1000));
            const lbl = document.getElementById(`eg-blast-countdown-${id}`);
            if (lbl) lbl.textContent = remWarn;
            return;
        }

        const elActive = Date.now() - state.activeAt;
        const progress = Math.min(1, elActive / activeMs);

        // Shrinking blooms (Heat Death / Overfit Bloom): reach the final radius
        // at EG_BLAST_SHRINK_SETTLE of the window and HOLD it — the resolve
        // check then matches exactly what the player sees for the last seconds.
        if (shrinkTo != null) {
            const settle = Math.min(1, progress / EG_BLAST_SHRINK_SETTLE);
            real.radius = Math.round(startRadius + (shrinkTo - startRadius) * settle);
            _egBlastPositionCircle(_egBlastGetCircle(id, realIndex, real), real);
        }

        const remainingMs = Math.max(0, activeMs - elActive);
        const lbl = document.getElementById(`eg-blast-countdown-${id}`);
        if (lbl) {
            lbl.textContent = Math.ceil(remainingMs / 1000);
            lbl.classList.toggle('eg-blast-urgent', remainingMs <= lastcallMs);
        }

        const inZone = _egBlastHudInZone(real);
        const circle = document.getElementById(`eg-blast-circle-${id}-${realIndex}`);
        if (circle && !circle.classList.contains('eg-blast-collapsed')) {
            circle.classList.toggle('eg-blast-safe', inZone);
            circle.classList.toggle('eg-blast-lastcall', !inZone && remainingMs <= lastcallMs);
        }

        // Rewrite Fate: the destination ghost charges up right before the jump,
        // so the move never lands without warning.
        if (relocateAtMs != null && ghostEl) {
            const untilJump = relocateAtMs - elActive;
            ghostEl.classList.toggle('eg-blast-ghost-charge',
                untilJump > 0 && untilJump <= EG_BLAST_CHARGE_MS);
        }

        if (remainingMs <= lastcallMs) paintStatus(inZone ? 'in' : 'final');
        else paintStatus(inZone ? 'in' : 'out');
    }, 100);

    // ── Active phase: impact flash, blackout, hold window starts ────────────
    schedule(() => {
        state.live = true;
        state.activeAt = Date.now();

        // Bright impact flash marks the exact warning → active boundary.
        overlay.classList.remove('eg-blast-warning');
        overlay.classList.add('eg-blast-impact');

        // The blast going live is felt as well as seen: a subtle whole-screen
        // shake rides the impact flash.
        const shakeBody = document.body;
        shakeBody.classList.remove('eg-screen-shake');
        void shakeBody.offsetWidth; // restart if a shake is still running
        shakeBody.classList.add('eg-screen-shake');
        schedule(() => shakeBody.classList.remove('eg-screen-shake'), 550);

        schedule(() => {
            overlay.classList.remove('eg-blast-impact');
            overlay.classList.add('eg-blast-active');
        }, EG_BLAST_TRANSITION_FLASH_MS);

        // Prior Collapse: the fake zones visibly collapse the instant the
        // blast hits — by then the player has had the whole warning to note
        // which zone carried the tell.
        if (opts.revealFakeAtActive) {
            zones.forEach((z, i) => {
                if (i === realIndex) return;
                const c = document.getElementById(`eg-blast-circle-${id}-${i}`);
                if (c) {
                    c.classList.add('eg-blast-collapsed');
                    schedule(() => c.remove(), 500);
                }
            });
        }

        // Countdown now counts the hold window (it counted the warning down).
        const lbl = document.getElementById(`eg-blast-countdown-${id}`);
        if (lbl) lbl.textContent = Math.ceil(activeMs / 1000);

        // Rewrite Fate: mid-window jump to the pre-shown ghost position.
        if (relocateAtMs != null && ghostEl) {
            schedule(() => {
                real = { x: opts.ghost.x, y: opts.ghost.y, radius: real.radius };
                const circle = _egBlastGetCircle(id, realIndex, real);
                circle.classList.add('eg-blast-jump');
                schedule(() => circle.classList.remove('eg-blast-jump'), 400);
                const l2 = document.getElementById(`eg-blast-countdown-${id}`);
                if (l2) { l2.style.left = real.x + 'px'; l2.style.top = real.y + 'px'; }
                if (ghostEl) ghostEl.remove();
            }, relocateAtMs);
        }

        // ── Resolve: check position, apply damage, tear down ────────────────
        schedule(() => {
            if (state.poll) { clearInterval(state.poll); state.poll = null; }
            if (shrinkTo != null) {
                real.radius = shrinkTo;
                _egBlastPositionCircle(_egBlastGetCircle(id, realIndex, real), real);
            }

            const survived = _egBlastHudInZone(real);
            const circle = document.getElementById(`eg-blast-circle-${id}-${realIndex}`);
            if (circle) circle.classList.add(survived ? 'eg-blast-survived' : 'eg-blast-hit');

            if (!survived) {
                // Percentage of max HP — survivable even at full health, but it
                // stings enough that ignoring the mechanic loses fights.
                const damage = Math.round(playerMaxHP * damagePct);
                const shielded = _egNkShieldUp();
                const dealt = typeof _egPlayerTakeDamage === 'function'
                    ? _egPlayerTakeDamage(damage, true, null, null, { isBossAbility: true }) : 0;
                _egNkLastHitAbsorbed = shielded && dealt <= 0;
                if (dealt > 0 && typeof _egApplyPlayerHitFeedback === 'function') {
                    _egApplyPlayerHitFeedback(dealt);
                }
                // Named, localized feedback toast: damage when the hit landed,
                // a shield-absorbed toast when the absorption shield ate it
                // whole — never a misleading "hit for 0". Callers pass their
                // boss/ability names.
                if (dealt > 0 || _egNkLastHitAbsorbed) {
                    _egNkAbilityHitToast(dealt, opts.bossName || null, opts.abilityName || null);
                    if (dealt > 0) paintStatus('hit', dealt);
                }
            } else {
                showToast(t('eg_blast_dodged'), '#4ade80');
                paintStatus('ok');
            }

            // Brief resolve pause so the outcome flash is readable
            schedule(() => _egBlastTeardown(id), 500);
        }, activeMs);
    }, warnMs);
}


const _egNkRuns = new Map(); // runId → { bossId, dodge, raf, timers, els, dotAcc }


let _egNkSeq = 0;


// True while any dodge run, crush corridor or screen blast is active.
function _egNkDodgeBusy() {
    if (typeof _egCrushState !== 'undefined' && _egCrushState) return true;
    if (typeof _egActiveBlasts !== 'undefined' && _egActiveBlasts.size > 0) return true;
    for (const r of _egNkRuns.values()) if (r.dodge && !r.passive) return true;
    return false;
}


function _egNkNewRun(bossId, isDodge) {
    const id = ++_egNkSeq;
    const run = { id, bossId: bossId || null, dodge: !!isDodge, raf: 0, timers: [], els: [], dotAcc: 0 };
    // Tier scaling for DODGE runs: the run's internal clock advances on a
    // scaled dtS (see _egNkLoop), so every per-boss nk hazard — slam bands,
    // storms, shrapnel, chase orbs, weather watchers (Puddle), garden
    // watchers (Sprout) — shares the screen-blast difficulty curve.
    // Non-dodge runs (shields, summons, buff enrage) keep real-time timing.
    // PERSISTENT WATCHERS (Puddle/Sprout/Bumper/Marksman gauntlet-watcher):
    // they want the tier clock but must NOT count as an active set-piece —
    // a forever-alive dodge run would trip _egNkDodgeBusy() and permanently
    // block scheduled mechanics (sproutlings, fog bank) and other bosses'
    // set-pieces. They set run.passive = true right after creation; the
    // tierFactor lookup below runs on the same tick either way.
    run.tierFactor = 1;
    if (run.dodge && bossId && typeof _egMonsters !== 'undefined') {
        try {
            const m = _egMonsters.find(x => x && x.id === bossId);
            if (m) run.tierFactor = _egBossTierFactor(_egBossTierNorm(m), EG_NK_TIER_FACTOR);
        } catch (e) {}
    }
    _egNkRuns.set(id, run);
    return run;
}


function _egNkEl(run, tag, cls, text) {
    const el = document.createElement(tag || 'div');
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    document.body.appendChild(el);
    run.els.push(el);
    return el;
}


function _egNkKillRun(run) {
    if (!run) return;
    if (run.raf) cancelAnimationFrame(run.raf);
    run.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    run.els.forEach(el => { try { el.remove(); } catch (e) {} });
    // Optional per-run teardown (e.g. restoring a boss sprite that a
    // mechanic translated) — fired on EVERY kill path, including boss death
    // and encounter stop, so callers can never leak a mid-animation state.
    if (typeof run.onKill === 'function') {
        try { run.onKill(); } catch (e) {}
    }
    _egNkRuns.delete(run.id);
}


// Cancels only runs owned by one boss — add deaths must never nuke the
// boss's own active mechanic. Called from _egBossCleanup.
function _egNkTeardownBoss(bossId) {
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === bossId) _egNkKillRun(r);
    });
    document.querySelectorAll('.eg-nk-shielded').forEach(el => el.classList.remove('eg-nk-shielded'));
}


function _egNkTeardownAll() {
    Array.from(_egNkRuns.values()).forEach(_egNkKillRun);
    document.querySelectorAll('.eg-nk-shielded').forEach(el => el.classList.remove('eg-nk-shielded'));
}


// Pause / encounter / death guard — loops freeze instead of advancing.
function _egNkFrozen() {
    if (typeof _gamePaused !== 'undefined' && _gamePaused) return true;
    if (typeof _egIsActive === 'function' && !_egIsActive()) return true;
    if (typeof dead !== 'undefined' && dead) return true;
    return false;
}


function _egNkBossAlive(bossId) {
    if (!bossId || typeof _egMonsters === 'undefined') return true;
    return !!_egMonsters.find(m => m.id === bossId);
}


// Pause-safe rAF driver. tick(dtS, now) returns true to continue.
// Boss death ends the run silently (visuals vanish with their owner).
function _egNkLoop(run, tick) {
    let last = performance.now();
    const step = (now) => {
        if (!_egNkRuns.has(run.id)) return;
        if (!_egNkBossAlive(run.bossId)) { _egNkKillRun(run); return; }
        if (_egNkFrozen()) {
            last = now;
            run.raf = requestAnimationFrame(step);
            return;
        }
        const rawDt = Math.max(0, Math.min(0.05, (now - last) / 1000));
        last = now;
        // Dodge runs advance on the tier-scaled clock: factor >1 makes the
        // internal clock run SLOWER than real time, so the fixed warn/duration
        // thresholds are reached later in real ms — gentle tiers get more time.
        // factor <1 runs it faster — brutal tiers get less. Non-dodge runs
        // (shields, summons) always use real time.
        const dtS = (run.dodge && run.tierFactor && run.tierFactor !== 1)
            ? rawDt / run.tierFactor : rawDt;
        let cont = true;
        try { cont = tick(dtS, now); } catch (e) { console.warn('nk loop tick error:', e); cont = false; }
        if (cont && _egNkRuns.has(run.id)) run.raf = requestAnimationFrame(step);
        else _egNkKillRun(run);
    };
    run.raf = requestAnimationFrame(step);
}


function _egNkPlayerRect() {
    if (typeof _egBlastGetPlayerRect === 'function') {
        const r = _egBlastGetPlayerRect();
        if (r && (r.width || r.height)) return r;
    }
    if (typeof _egHzPlayerHitbox === 'function') {
        const r = _egHzPlayerHitbox();
        if (r) return r;
    }
    return null;
}


function _egNkPlayerCenter() {
    const r = _egNkPlayerRect();
    if (!r) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}


function _egNkMaxHP() {
    return (typeof playerMaxHP !== 'undefined' && playerMaxHP > 0) ? playerMaxHP : 100;
}


function _egNkCircleHit(x, y, r, pr, pad) {
    if (!pr) return false;
    const p = pad || 0;
    const cx = Math.max(pr.left, Math.min(x, pr.right));
    const cy = Math.max(pr.top, Math.min(y, pr.bottom));
    const dx = cx - x, dy = cy - y;
    return Math.sqrt(dx * dx + dy * dy) <= r + p;
}


function _egNkRectsOverlap(a, b) {
    return !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}


// Rendered-box hit test for small translated projectile dots (embers, orbs,
// saws, wisps, ...). Collision uses the dot's ACTUAL painted box (+2px
// forgiveness) instead of an idealized circle around its logical x/y, so a
// projectile that visibly touches the player always registers and any CSS
// motion (wiggle/spin animations, transitions) can't skew the hitbox.
// The Ember Drift / Firefly / Barrage bosses were converted first; every
// translate-positioned dot boss shares this helper now.
function _egNkDotHit(el, pr, pad) {
    if (!el || !pr) return false;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const p = (pad == null) ? 2 : pad;
    return _egNkRectsOverlap(
        { left: r.left - p, right: r.right + p, top: r.top - p, bottom: r.bottom + p },
        pr
    );
}


// True while the absorption shield has charge left. Checked BEFORE a boss-
// ability hit is applied so a fully-absorbed hit (dealt 0 because the shield
// ate everything) can be told apart from other zero-damage cases (godmode,
// inactive encounter) after the fact.
function _egNkShieldUp() {
    return typeof _egPlayerAbsorptionCurrent !== 'undefined' && _egPlayerAbsorptionCurrent > 0;
}


// Set by _egNkHit and the screen-blast engine right after applying damage:
// true when that hit was fully eaten by the absorption shield. Consumed by
// _egNkAbilityHitToast in the same synchronous frame, so it can never leak
// into a later toast.
let _egNkLastHitAbsorbed = false;


// Direct %maxHP hit through the normal intake (resists apply). The percent
// itself is tier-scaled (_egNkTierDamageFactor) so failed dodges sting less
// on gentle bosses and harder on brutal ones — the damage companion to the
// EG_NK_TIER_FACTOR timing curve.
function _egNkHit(pct, element, level) {
    const shielded = _egNkShieldUp();
    const dmg = Math.max(1, Math.round(_egNkMaxHP() * pct * _egNkTierDamageFactor(level)));
    const dealt = (typeof _egPlayerTakeDamage === 'function')
        ? _egPlayerTakeDamage(dmg, true, element || null, level || 1, { isBossAbility: true }) : 0;
    _egNkLastHitAbsorbed = shielded && dealt <= 0;
    if (dealt > 0 && typeof _egApplyPlayerHitFeedback === 'function') {
        try { _egApplyPlayerHitFeedback(dealt); } catch (e) {}
    }
    return dealt;
}


// DoT chunking: accumulates fractional damage, applies whole-HP ticks.
function _egNkDotTick(run, pctPerSec, dtS, level, element) {
    // dtS arrives already clock-scaled from _egNkLoop (real / tierFactor);
    // multiply it back out so the DoT's DPS is independent of the TIMING
    // curve. The percent-per-second itself is tier-scaled (same damage
    // companion as _egNkHit) — so only the damage knob moves here, never
    // the clock.
    const realDt = dtS * ((run && run.tierFactor) || 1);
    const dmgF = _egNkTierDamageFactor(level);
    run.dotAcc = (run.dotAcc || 0) + (_egNkMaxHP() * pctPerSec * dmgF / 100) * realDt;
    const unit = Math.max(1, _egNkMaxHP() * 0.01);
    if (run.dotAcc >= unit) {
        const tick = Math.floor(run.dotAcc);
        run.dotAcc -= tick;
        if (typeof _egPlayerTakeDamage === 'function') {
            _egPlayerTakeDamage(tick, true, element || null, level || 1, { isBossAbility: true });
        }
    }
}


// Failed-dodge feedback toast for a NAMED boss ability, decided by how much
// damage actually landed:
//   dealt > 0            → "💥 The Minotaur’s Bull Rush hits you for 24 damage!"
//   dealt == 0 and the absorption shield ate the whole hit (flag set by
//     _egNkHit / the screen-blast engine) → "🛡️ The Minotaur’s Bull Rush
//     absorbed by your shield!" — shielded hits stay acknowledged instead of
//     vanishing, and a misleading "hit for 0" is never shown.
//   dealt == 0 without absorption (godmode, inactive encounter) → silent.
// bossName may be null; abilityName reads after it. Localized through the
// Boss damage-toast COLORS — stacked arenas must read at a glance. Bosses
// with an element use the game's canonical damage-number element palette
// (fire/cold/lightning/shadow), so e.g. the cold-element Siren toasts cyan.
// Elementless bosses (element: null — Brutus, The Minotaur, …) have nothing
// to key on, so each gets a fixed signature color instead (Brutus = red).
const EG_NK_ELEMENT_TOAST_COLORS = {
    fire: '#ff3b1f', cold: '#6ecbff', lightning: '#ffe536', shadow: '#c084ff',
};
const EG_NK_BOSS_SIGNATURE_COLORS = {
    // Elementless bosses get distinct signature colors (themed where obvious).
    Brutus: '#f87171',
    'The Architect': '#e5e7eb',
    'The Barricade': '#fb923c',
    'The Belt': '#14b8a6',
    'The Bumper': '#f472b6',
    'The Buzzsaw': '#94a3b8',
    'The Centipede': '#a3e635',
    'The Colossus': '#d6d3d1',
    'The Duelist': '#3b82f6',
    'The Executioner': '#57534e',
    'The Gourmet': '#fb7185',
    'The Juggernaut': '#be123c',
    'The Medusa': '#d946ef',
    'The Minotaur': '#b45309',
    'The Needle': '#2563eb',
    'The Snail': '#f59e0b',
    'The Sprout': '#22c55e',
    'The Stack': '#818cf8',
    'The Striker': '#10b981',
    'The Tactician': '#6b7280',
    'The Thwomp': '#78716c',
    'The Warlord': '#78350f',
    'The Zenith': '#fbbf24',
};

// Resolves a boss display name to its toast color: signature color for
// elementless bosses, else the def's element color, else classic damage red.
function _egNkBossToastColor(bossName) {
    if (bossName && EG_NK_BOSS_SIGNATURE_COLORS[bossName]) {
        return EG_NK_BOSS_SIGNATURE_COLORS[bossName];
    }
    if (bossName && typeof EG_BOSS_DEFS !== 'undefined') {
        for (const key in EG_BOSS_DEFS) {
            const d = EG_BOSS_DEFS[key];
            if (d && d.name === bossName && d.element
                && EG_NK_ELEMENT_TOAST_COLORS[d.element]) {
                return EG_NK_ELEMENT_TOAST_COLORS[d.element];
            }
        }
    }
    return '#f87171'; // classic damage red
}

// eg_ability_hit / eg_ability_absorbed templates ({ability} / {n}); falls
// back to the English literal when t() is unavailable. The absorbed flag is
// consumed here so it can never leak into a later toast.
function _egNkAbilityHitToast(dealt, bossName, abilityName) {
    const ability = (bossName ? bossName + '’s ' : '') + abilityName;
    const absorbed = _egNkLastHitAbsorbed;
    _egNkLastHitAbsorbed = false;
    if (dealt > 0) {
        let msg = '💥 ' + ability + ' hits you for ' + dealt + ' damage!';
        try {
            const raw = t('eg_ability_hit');
            if (raw && raw !== 'eg_ability_hit' && raw.indexOf('{ability}') !== -1) {
                msg = raw.replace('{ability}', ability).replace('{n}', dealt);
            }
        } catch (e) {}
        if (typeof showToast === 'function') {
            // Text + left stripe tinted by the BOSS's color (element or
            // signature) so overlapping arenas read at a glance.
            const color = _egNkBossToastColor(bossName);
            const el = showToast(msg, color);
            if (el) el.style.borderLeft = '3px solid ' + color;
        }
    } else if (absorbed) {
        let msg = '🛡️ ' + ability + ' absorbed by your shield!';
        try {
            const raw = t('eg_ability_absorbed');
            if (raw && raw !== 'eg_ability_absorbed' && raw.indexOf('{ability}') !== -1) {
                msg = raw.replace('{ability}', ability);
            }
        } catch (e) {}
        // Shield feedback stays uniform blue — the color codes the outcome,
        // not the boss, so an absorbed hit is recognizable on its own.
        if (typeof showToast === 'function') showToast(msg, '#7dd3fc');
    }
}


function _egNkToast(key, fallback, color) {
    let msg = fallback;
    try {
        const raw = t(key);
        if (raw && raw !== key) msg = raw;
    } catch (e) {}
    // Translated templates may carry a {n} placeholder (e.g. eg_blast_hit:
    // "hits you for {n} HP!"). The per-boss nk engines bake the value into
    // the fallback string instead of passing it separately — pull the first
    // number out of the fallback and substitute it, so the LOCALIZED text
    // keeps the damage number (previously the raw "{n}" leaked into the
    // toast on every failed dodge). Keys without placeholders are untouched.
    if (msg.indexOf('{n}') !== -1) {
        const m = String(fallback).match(/-?\d+(?:\.\d+)?/);
        if (m) msg = msg.replace('{n}', m[0]);
    }
    if (typeof showToast === 'function') return showToast(msg, color);
}


//------------------------------------------------------------------------
//-------------------SHARED GROUND-SHATTER BURST (BAND MECHANICS)----------
//------------------------------------------------------------------------
// When a band-style dodge mechanic's telegraph resolves (Brutus ground
// slam, Juggernaut/Minotaur bull rushes), the struck band erupts: jagged
// fissures crack across the whole band width while rock shards and dust
// burst out of the ground. The burst is a body-level overlay (pointer-
// events: none and tracked on the run's element list) so the pieces keep
// animating after the band's red flash fades, and encounter cleanup removes
// them with the run. CSS lives in bosses2.css (.eg-slam-* rules).


// Random-walk fissures across the band: 2–3 main cracks running left → right
// plus short branch cracks hanging off their interior vertices. Returns SVG
// path strings with a `core` flag (main cracks draw brighter/thicker).
function _egNkSlamPaths(w, h) {
    const paths = [];
    const fissures = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < fissures; i++) {
        const verts = [];
        let x = w * 0.02, y = h * (0.30 + Math.random() * 0.40);
        verts.push({ x, y });
        while (x < w * 0.94) {
            x += w * (0.05 + Math.random() * 0.08);
            y += (Math.random() - 0.5) * h * 0.42;
            y = Math.max(h * 0.06, Math.min(h * 0.94, y));
            verts.push({ x, y });
        }
        const d = 'M' + verts[0].x.toFixed(1) + ' ' + verts[0].y.toFixed(1)
            + verts.slice(1).map(v => ' L' + v.x.toFixed(1) + ' ' + v.y.toFixed(1)).join('');
        paths.push({ d, core: true });

        // Short branch cracks off 1–3 interior vertices of this fissure.
        const branches = 1 + Math.floor(Math.random() * 3);
        for (let b = 0; b < branches; b++) {
            const s = verts[1 + Math.floor(Math.random() * Math.max(1, verts.length - 2))];
            let bx = s.x, by = s.y;
            let bd = 'M' + bx.toFixed(1) + ' ' + by.toFixed(1);
            const segs = 2 + Math.floor(Math.random() * 2);
            for (let k = 0; k < segs; k++) {
                bx += (Math.random() - 0.5) * w * 0.10;
                by += (Math.random() - 0.5) * h * 0.5;
                bx = Math.max(w * 0.02, Math.min(w * 0.98, bx));
                by = Math.max(h * 0.04, Math.min(h * 0.96, by));
                bd += ' L' + bx.toFixed(1) + ' ' + by.toFixed(1);
            }
            paths.push({ d: bd, core: false });
        }
    }
    return paths;
}


// Builds and launches one impact burst across the band's struck area.
function _egNkSlamShatter(band, run) {
    const rect = band.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const w = rect.width, h = rect.height;

    const burst = document.createElement('div');
    burst.className = 'eg-slam-burst';
    burst.style.left = Math.round(rect.left) + 'px';
    burst.style.top = Math.round(rect.top) + 'px';
    burst.style.width = Math.round(w) + 'px';
    burst.style.height = Math.round(h) + 'px';
    document.body.appendChild(burst);
    if (run && run.els) run.els.push(burst);

    // Fissures — drawn in quickly, then the whole svg fades with the burst.
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'eg-slam-cracks');
    svg.setAttribute('viewBox', '0 0 ' + Math.max(10, Math.round(w)) + ' ' + Math.max(10, Math.round(h)));
    burst.appendChild(svg);
    let delay = 0;
    _egNkSlamPaths(w, h).forEach(c => {
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', c.d);
        path.setAttribute('pathLength', '1');
        path.classList.add('eg-slam-crack');
        if (c.core) path.classList.add('eg-slam-crack-core');
        path.style.animationDelay = delay.toFixed(2) + 's';
        delay += 0.03 + Math.random() * 0.04;
        svg.appendChild(path);
    });

    // Rock shards — burst up out of the struck ground, drift, fall back.
    const shards = 14 + Math.floor(Math.random() * 6);
    for (let i = 0; i < shards; i++) {
        const size = 5 + Math.random() * 7;
        const x = w * (0.03 + Math.random() * 0.94);
        const y = h * (0.45 + Math.random() * 0.45);
        const dx = (Math.random() - 0.5) * w * 0.14;
        const up = h * (0.35 + Math.random() * 0.6);
        const land = 6 + Math.random() * 12;
        const rot = (Math.random() < 0.5 ? -1 : 1) * (140 + Math.random() * 220);
        const dur = 0.7 + Math.random() * 0.5;

        const sh = document.createElement('div');
        sh.className = 'eg-slam-shard';
        sh.style.left = Math.round(x) + 'px';
        sh.style.top = Math.round(y) + 'px';
        sh.style.width = size.toFixed(1) + 'px';
        sh.style.height = (size * (0.6 + Math.random() * 0.6)).toFixed(1) + 'px';
        sh.style.setProperty('--dxa', (dx * 0.55).toFixed(1) + 'px');
        sh.style.setProperty('--dxb', (dx * 1.15).toFixed(1) + 'px');
        sh.style.setProperty('--up', (-up).toFixed(1) + 'px');
        sh.style.setProperty('--land', land.toFixed(1) + 'px');
        sh.style.setProperty('--rot', rot.toFixed(0) + 'deg');
        sh.style.setProperty('--dur', dur.toFixed(2) + 's');
        sh.style.animationDelay = (Math.random() * 0.08).toFixed(2) + 's';
        burst.appendChild(sh);
    }

    // Dust clouds kicked up along the crack line.
    const puffs = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < puffs; i++) {
        const size = 36 + Math.random() * 46;
        const x = w * ((i + 0.5 + (Math.random() - 0.5) * 0.8) / puffs);
        const y = h * (0.4 + Math.random() * 0.5);
        const du = document.createElement('div');
        du.className = 'eg-slam-dust';
        du.style.left = Math.round(x) + 'px';
        du.style.top = Math.round(y) + 'px';
        du.style.width = size.toFixed(0) + 'px';
        du.style.height = size.toFixed(0) + 'px';
        du.style.setProperty('--rise', (-(18 + Math.random() * 30)).toFixed(1) + 'px');
        du.style.setProperty('--sc', (1.7 + Math.random() * 1.3).toFixed(2));
        du.style.setProperty('--dur', (0.8 + Math.random() * 0.5).toFixed(2) + 's');
        du.style.animationDelay = (Math.random() * 0.18).toFixed(2) + 's';
        burst.appendChild(du);
    }

    // Remove the burst after everything has played out (early removal is
    // handled by the run kill when the boss dies / the encounter stops).
    setTimeout(() => { try { burst.remove(); } catch (e) {} }, 1800);
}


// Gently displaces the avatar (polarity field). Composes with WASD
// movement, which reads the same style offsets every frame.
function _egNkNudgeAvatar(dx, dy) {
    const el = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (!el) return;
    let l = parseInt(el.style.left);
    let tp = parseInt(el.style.top);
    if (!isFinite(l) || !isFinite(tp)) {
        // Never write the inline position? Anchor on the rendered rect
        // instead of (0,0) so the nudge doesn't teleport the avatar to
        // the top-left corner.
        const r = el.getBoundingClientRect();
        if (!isFinite(l)) l = r.left;
        if (!isFinite(tp)) tp = r.top;
        el.style.left = l + 'px';
        el.style.top = tp + 'px';
    }
    l += dx;
    tp += dy;
    if (typeof _setAvatarPos === 'function') {
        try { _setAvatarPos(el, l, tp); } catch (e) {}
    } else {
        el.style.left = Math.max(0, Math.min(window.innerWidth - 40, l)) + 'px';
        el.style.top = Math.max(0, Math.min(window.innerHeight - 40, tp)) + 'px';
    }
}


// Animated knockback: same contract as _egNkNudgeAvatar but the avatar's
// PIXELS glide to the new spot instead of teleporting — a decaying ease-out
// slide done with a CSS transition on left/top (compositor-driven, so it
// animates smoothly and never fights the game's rAF loops) plus a tumble
// wobble keyframe on the wrapper. Also pops an impact burst at the contact
// point so the bump itself reads on screen.
//   dx, dy          — fling impulse in px (same as the nudge)
//   srcX, srcY      — optional contact point for the burst (default:
//                     between the avatar and its landing spot)
let _egFlingSeq = 0;
function _egNkFlingAvatar(dx, dy, srcX, srcY) {
    const el = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (!el) return;
    const w = el.offsetWidth || 72, h = el.offsetHeight || 90;
    let x0 = parseFloat(el.style.left);
    let y0 = parseFloat(el.style.top);
    const midGlide = !!el.dataset.egFlingActive;
    if (midGlide || !isFinite(x0) || !isFinite(y0)) {
        // Mid-glide: style.left already holds the glide TARGET (not where
        // the sprite is) — sample the rendered rect instead so chained
        // flings blend from the sprite's actual position. Missing inline
        // position (fresh spawn / companion return cleared it): anchor on
        // the rect too — falling back to (0,0) flung the avatar at the
        // top-left corner, which read as a random teleport.
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (midGlide || !isFinite(x0)) x0 = cx - w / 2;
        if (midGlide || !isFinite(y0)) y0 = cy - h / 2;
        el.style.left = x0 + 'px';
        el.style.top = y0 + 'px';
    }
    const x1 = Math.max(4, Math.min(window.innerWidth - w - 4, x0 + dx));
    const y1 = Math.max(4, Math.min(window.innerHeight - h - 4, y0 + dy));
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const bx = (srcX != null) ? srcX : x0 + w / 2 - dx * 0.4;
    const by = (srcY != null) ? srcY : y0 + h / 2 - dy * 0.4;
    _egFlingBurst(bx, by, Math.atan2(dy, dx));
    if (dist < 6) return; // nothing worth tweening
    const seq = ++_egFlingSeq;
    const dur = Math.max(300, Math.min(430, 260 + dist * 0.5));
    // Tumble wobble on the wrapper (its transform is otherwise unused) —
    // direction-signed via a CSS var so left/right flings tilt oppositely.
    el.style.setProperty('--eg-fling-spin', dx >= 0 ? '1' : '-1');
    el.style.setProperty('--eg-fling-tilt', Math.min(10, 4 + dist / 22).toFixed(1) + 'deg');
    el.classList.add('eg-flinging');
    // Tell the WASD ticker a glide owns the position (it must not reseed
    // from style.left — that's the TARGET — or it snaps the sprite there).
    el.dataset.egFlingActive = '1';
    // Force a style flush so the transition sees the old position first.
    void el.offsetWidth;
    el.style.transition = 'left ' + dur + 'ms cubic-bezier(0.16, 0.75, 0.3, 1), top ' + dur + 'ms cubic-bezier(0.16, 0.75, 0.3, 1)';
    el.style.left = x1 + 'px';
    el.style.top = y1 + 'px';
    // Cleanup after the glide: strip the tween styling. The WASD ticker
    // reseeds its float accumulator from the rendered position on its own
    // (divergence check), so control resumes seamlessly wherever the fling
    // ended up — no snap-back if the player fought the knockback.
    setTimeout(() => {
        if (seq !== _egFlingSeq) return; // superseded by a newer fling
        try {
            el.style.transition = '';
            el.classList.remove('eg-flinging');
            delete el.dataset.egFlingActive;
            el.style.removeProperty('--eg-fling-spin');
            el.style.removeProperty('--eg-fling-tilt');
            el.dataset.avatarFx = el.style.left;
            el.dataset.avatarFy = el.style.top;
        } catch (e) {}
    }, dur + 60);
}


// Small impact punctuation for a fling: sparks + an expanding ring at (x, y).
// Self-removing after ~0.5s; no run tracking needed.
function _egFlingBurst(x, y, angle) {
    try {
        const ring = document.createElement('div');
        ring.className = 'eg-fling-ring';
        ring.style.left = x + 'px';
        ring.style.top = y + 'px';
        document.body.appendChild(ring);
        setTimeout(() => ring.remove(), 500);
        for (let i = 0; i < 6; i++) {
            const s = document.createElement('div');
            s.className = 'eg-fling-spark';
            s.style.left = x + 'px';
            s.style.top = y + 'px';
            const a = angle + (Math.random() - 0.5) * 2.2;
            const d = 26 + Math.random() * 30;
            s.style.setProperty('--eg-spark-x', (Math.cos(a) * d).toFixed(0) + 'px');
            s.style.setProperty('--eg-spark-y', (Math.sin(a) * d).toFixed(0) + 'px');
            document.body.appendChild(s);
            setTimeout(() => s.remove(), 520);
        }
    } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------SHARED PUZZLE MECHANICS (PACK 4)----------------------
//------------------------------------------------------------------------
// Grid/puzzle disruption usable by any boss (referenced by handler-name
// string like the older shared mechanics above):
//   fated_cell    — fill the marked cell(s) in time or lose recent progress
//   fog_bank      — a wandering fog bank hides a chunk of the grid
//   clue_swap     — row clues exchange numbers (per-phase: pair / triple
//                   cycle / double pair)
//   clue_scramble — shuffles the numbers inside clue lines (reverts)
//   soul_tithe    — boss shields until the player fills N correct cells
//
// fated_cell and soul_tithe observe correct fills through
// _egNotifyCorrectFill(), which endgame-encounter.js calls from the central
// _egOnCorrectCell() fill path. Each ability's per-phase variants are
// summarised in the file-top PHASE VARIANTS comment.
//------------------------------------------------------------------------

// ── Fill observer ─────────────────────────────────────────────────────────────
// Called from _egOnCorrectCell on every correct fill. Lets active boss
// mechanics react (resolve fate marks, count tithe progress). No-op unless
// a mechanic is currently listening.
function _egNotifyCorrectFill(row, col) {
    const key = row + '-' + col;
    if (typeof _egFateMarks !== 'undefined' && _egFateMarks.has(key)) {
        _egResolveFateMark(key, true);
    }
    if (typeof _egMonsters === 'undefined') return;
    _egMonsters.forEach(m => {
        if (m.soulTithe && m.soulTithe.active) {
            m.soulTithe.have++;
            if (m.soulTithe.have >= m.soulTithe.need) {
                _egBreakSoulTithe(m);
            } else {
                // Every fresh fill re-arms the lapse window (P2+ decay).
                if (typeof _egTitheArmDecay === 'function') _egTitheArmDecay(m);
                if (typeof _egRenderPanel === 'function') {
                    try { _egRenderPanel(); } catch (e) {}
                }
            }
        }
    });
}


//------------------------------------------------------------------------
//-------------------SHARED MECHANIC: FATED CELL---------------------------
//------------------------------------------------------------------------
// Marks 1 (phase 3: 2) correct unfilled cell(s) with ⏳. Fill each before its
// doom clock runs out and the boss's curse fizzles — fail, and it eats your
// 2 most recent fills per missed mark. Unlike Corrupt Cells the mark never
// blocks filling; it is a race, not a lock.

let _egFateMarks = new Map(); // key:"row-col" → { timer }
let _egFateChain = null;      // { p, monsterId, budget, resolved, windowMs, spawnTimer } — active relay

// Returns all correct unfilled cells that can host a fate mark.
function _egBuildFatePool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const pool = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] !== 1) continue;
            if (userGrid[r][c] === 1 || revealedGrid[r][c]) continue;
            if (_egFateMarks.has(`${r}-${c}`)) continue;
            pool.push([r, c]);
        }
    }
    return pool;
}

// Places the ⏳ mark on a cell and starts its doom clock.
function _egApplyFateMark(r, c, windowMs) {
    const key = r + '-' + c;
    if (_egFateMarks.has(key)) return;
    const el = document.getElementById(`g-${r}-${c}`);
    if (!el) return;

    const overlay = document.createElement('span');
    overlay.className = 'eg-fate-overlay';
    overlay.id = `eg-fate-${r}-${c}`;
    overlay.textContent = '⏳';
    el.appendChild(overlay);

    const timer = setTimeout(() => _egResolveFateMark(key, false), windowMs);
    _egFateMarks.set(key, { timer });
}

// Removes the mark overlay and clears its doom clock.
function _egRemoveFateMark(key) {
    const data = _egFateMarks.get(key);
    if (data) clearTimeout(data.timer);
    _egFateMarks.delete(key);
    const span = document.getElementById(`eg-fate-${key}`);
    if (span) span.remove();
}

// Spawns one more relay mark on a random legal cell. Returns true when placed.
function _egFateSpawnOne(windowMs) {
    const pool = _egBuildFatePool();
    if (pool.length === 0) return false;
    const [r, c] = pool[Math.floor(Math.random() * pool.length)];
    _egApplyFateMark(r, c, windowMs);
    return true;
}

// Resolves one mark: filled=true rewards (and advances any active doom relay),
// filled=false (doom clock expired) punishes by unfilling the 2 most recent
// correct fills and collapses any active relay.
function _egResolveFateMark(key, filled) {
    if (!_egFateMarks.has(key)) return;
    _egRemoveFateMark(key);

    if (filled) {
        const chain = _egFateChain;
        if (chain) {
            clearTimeout(chain.spawnTimer);
            chain.resolved++;
            if (chain.resolved >= chain.budget) {
                _egFateChain = null;
                showToast(t('eg_fate_chain_done'), '#4ade80');
                return;
            }
            // The next mark appears shortly — keep the pressure on.
            const left = chain.budget - chain.resolved;
            chain.spawnTimer = setTimeout(() => {
                if (_egFateChain !== chain) return;
                if (chain.monsterId && typeof _egMonsters !== 'undefined'
                    && !_egMonsters.some(m => m.id === chain.monsterId)) { _egFateChain = null; return; }
                if (_egFateSpawnOne(chain.windowMs)) showToast(t('eg_fate_next').replace('{n}', left));
                else _egFateChain = null; // no legal cells left — relay over
            }, 650);
            return;
        }
        showToast(t('eg_fate_done'), '#4ade80');
        return;
    }

    showToast(t('eg_fate_fail'), '#f87171');
    if (!cur || !cur.grid || typeof _egUnfillCell !== 'function') return;
    const sol = cur.grid;
    const pool = [..._egRecentFills].reverse().filter(([r, c]) =>
        userGrid[r][c] === 1 && !revealedGrid[r][c] && sol[r][c] === 1
    );
    pool.slice(0, 2).forEach(([r, c]) => _egUnfillCell(r, c));

    // Expiry also collapses any relay: the chain breaks and twin marks fizzle.
    if (_egFateChain) {
        clearTimeout(_egFateChain.spawnTimer);
        _egFateChain = null;
        Array.from(_egFateMarks.keys()).forEach(k => _egRemoveFateMark(k));
        showToast(t('eg_fate_break'), '#f87171');
    }
}

// Removes all pending fate marks and any active relay. Called on boss death.
function _egClearFateMarks() {
    if (_egFateChain) {
        clearTimeout(_egFateChain.spawnTimer);
        _egFateChain = null;
    }
    Array.from(_egFateMarks.keys()).forEach(k => _egRemoveFateMark(k));
}

// TIER-SCALED Fated Cell knobs — same endpoint pattern as Corrupt Cells.
// The doom-clock window is a duration factor anchored exactly at tier 8
// (6s / 5.5s / 5s unchanged there); relay initial marks and budgets lerp
// between endpoint pairs (tier 8 lands on 1 / 3 and 2 / 4).
const EG_FATE_WINDOW_F = [1.15, 0.85]; // doom-clock factor [tier1, tier16]
const EG_FATE_INITIAL_P2 = [1, 2];
const EG_FATE_BUDGET_P2 = [3, 4];
const EG_FATE_INITIAL_P3 = [2, 3];
const EG_FATE_BUDGET_P3 = [3, 5];


// Boss mechanic handler — phase variants:
//   P1 — Fated Cell: one mark, fill it within its doom clock or lose progress.
//   P2 — Doom Relay: marks chain — fill each to spawn the next (budget scaled).
//   P3 — Twin Dooms: marks come in pairs and the relay runs longer.
function _egMechFatedCell(monster, phase) {
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    if (p >= 2 && _egFateChain) return; // a relay is already running — don't stack

    const pool = _egBuildFatePool();
    if (pool.length === 0) return;

    const norm = _egBossTierNorm(monster);

    if (p === 1) {
        const windowMs = Math.round(6000 * _egBossTierFactor(norm, EG_FATE_WINDOW_F));
        const targets = pool.sort(() => Math.random() - 0.5).slice(0, 1);
        showToast(t('eg_mech_fate').replace('{n}', targets.length).replace('{s}', windowMs / 1000));
        targets.forEach(([r, c]) => _egApplyFateMark(r, c, windowMs));
        return;
    }

    // P2/P3 relay setup
    const windowMs = Math.round((p >= 3 ? 5000 : 5500) * _egBossTierFactor(norm, EG_FATE_WINDOW_F));
    const initial = Math.round(_egBossTierLerp(p >= 3 ? EG_FATE_INITIAL_P3 : EG_FATE_INITIAL_P2, norm));
    const budget = Math.round(_egBossTierLerp(p >= 3 ? EG_FATE_BUDGET_P3 : EG_FATE_BUDGET_P2, norm));
    _egFateChain = {
        p, monsterId: monster ? monster.id : null,
        budget, resolved: 0, windowMs, spawnTimer: null,
    };
    const toastKey = p >= 3 ? 'eg_mech_fate_twins' : 'eg_mech_fate_chain';
    showToast(t(toastKey).replace('{s}', windowMs / 1000));
    const targets = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(initial, pool.length));
    targets.forEach(([r, c]) => _egApplyFateMark(r, c, windowMs));
}


//------------------------------------------------------------------------
//-------------------SHARED MECHANIC: FOG BANK-----------------------------
//------------------------------------------------------------------------
// A wandering fog bank rolls over a random ~4x4 chunk of the grid, hiding
// cells and clues beneath it for several seconds. The puzzle stays fully
// playable underneath (pointer-events pass through) — you just cannot see
// that region. Never stacks with itself.

let _egFogBanks = []; // [{ el, r0, c0, h, w, driftTimer, expireTimer }] — one or two banks
let _egFogSeq = 0;

const EG_FOG_DRIFT_P2_MS = 2600; // P2 — the single bank wanders (tier-8 base)
const EG_FOG_DRIFT_P3_MS = 3400; // P3 — each twin bank wanders a bit slower

// TIER-SCALED Fog Bank knobs — duration factors anchored exactly at tier 8.
// Low tiers lift the fog sooner and let banks drift slower; high tiers keep
// the region hidden longer and make the banks pace faster.
const EG_FOG_DURATION_F = [0.85, 1.15]; // fog lifetime factor [tier1, tier16]
const EG_FOG_DRIFT_F = [1.2, 0.8];      // drift-interval factor [tier1, tier16]

// Positions one fog element over a cell region (r0,c0)-(r0+h-1,c0+w-1).
// Recomputes fresh rects so a drifted bank lands exactly on the new cells.
// Persistent hidden sentinel at the grid container's layout origin — lets
// us map viewport rects into the container's local coordinate space without
// mutating the fog element (a style write + forced flush here would arm the
// fog's CSS transition and make it glide in from (0,0)).
let _egFogProbe = null;
function _egFogPlace(el, r0, c0, h, w) {
    const tbl = document.getElementById('ptable');
    const cellA = document.getElementById(`g-${r0}-${c0}`);
    const cellB = document.getElementById(`g-${r0 + h - 1}-${c0 + w - 1}`);
    if (!tbl || !cellA || !cellB) return false;
    const parent = tbl.parentElement;
    if (!parent) return false;

    // Naive viewport-rect deltas (cellRect - parentRect) break whenever an
    // ancestor carries a transform or scroll offset (vertical centering
    // does) — the fog would land at wrong, sometimes offscreen coordinates.
    // Instead, map the target cells through a zero-size sentinel parked at
    // the parent's layout origin, dividing out any ancestor scale.
    if (!_egFogProbe || !_egFogProbe.isConnected || _egFogProbe.parentElement !== parent) {
        _egFogProbe = document.createElement('div');
        _egFogProbe.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;margin:0;padding:0;border:0;pointer-events:none;visibility:hidden;';
        parent.appendChild(_egFogProbe);
    }
    const probe = _egFogProbe.getBoundingClientRect();
    const ra = cellA.getBoundingClientRect();
    const rb = cellB.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const scaleX = (parent.offsetWidth > 0 && parentRect.width > 0) ? (parentRect.width / parent.offsetWidth) : 1;
    const scaleY = (parent.offsetHeight > 0 && parentRect.height > 0) ? (parentRect.height / parent.offsetHeight) : 1;
    const left = (ra.left - probe.left) / (scaleX || 1);
    const top = (ra.top - probe.top) / (scaleY || 1);
    const width = (rb.right - ra.left) / (scaleX || 1);
    const height = (rb.bottom - ra.top) / (scaleY || 1);
    // Containment clamp: the bank always sits over the grid container,
    // never hanging off an edge even if the grid is smaller than expected.
    const maxL = Math.max(0, parent.offsetWidth - width - 1);
    const maxT = Math.max(0, parent.offsetHeight - height - 1);
    el.style.left = Math.max(0, Math.min(maxL, left)) + 'px';
    el.style.top = Math.max(0, Math.min(maxT, top)) + 'px';
    el.style.width = width + 'px';
    el.style.height = height + 'px';
    return true;
}

// Picks a random fog region that does not overlap any of the other active
// banks (so twin banks never stack into one black blob).
function _egFogPickRegion(exceptBank) {
    if (!cur || !cur.grid) return null;
    const rows = cur.grid.length, cols = cur.grid[0].length;
    const w = Math.min(4, cols), h = Math.min(4, rows);
    const others = _egFogBanks.filter(b => b !== exceptBank);
    for (let attempt = 0; attempt < 14; attempt++) {
        const r0 = Math.floor(Math.random() * (rows - h + 1));
        const c0 = Math.floor(Math.random() * (cols - w + 1));
        const overlap = others.some(b =>
            r0 < b.r0 + b.h && r0 + h > b.r0 && c0 < b.c0 + b.w && c0 + w > b.c0
        );
        if (!overlap) return { r0, c0, h, w };
    }
    return null; // crowded grid — caller gives up gracefully
}

// Drift tick — the fog bank glides to a new random region.
function _egFogDrift(bank) {
    const reg = _egFogPickRegion(bank);
    if (!reg || !_egFogPlace(bank.el, reg.r0, reg.c0, reg.h, reg.w)) return;
    bank.r0 = reg.r0; bank.c0 = reg.c0; bank.h = reg.h; bank.w = reg.w;
}

// Spawns one fog bank over a random region with the given drift + lifetime.
function _egFogSpawnBank(driftMs, durationMs) {
    const tbl = document.getElementById('ptable');
    if (!tbl) return null;
    const parent = tbl.parentElement;
    if (!parent) return null;
    const reg = _egFogPickRegion(null);
    if (!reg) return null;

    const fog = document.createElement('div');
    fog.className = 'eg-fog-bank';
    fog.id = `eg-fog-bank-${++_egFogSeq}`;
    // Layered drifting mist blobs — the fog reads as churning vapor
    // instead of a flat grey box. Positions are staggered per blob.
    ['', 'm2', 'm3'].forEach((cls, i) => {
        const m = document.createElement('div');
        m.className = ('eg-fog-mist ' + cls).trim();
        m.textContent = '🌫️';
        m.style.left = (14 + i * 27) + '%';
        m.style.top = (20 + ((i * 31) % 44)) + '%';
        fog.appendChild(m);
    });
    parent.style.position = 'relative';
    parent.appendChild(fog);

    const bank = { el: fog, r0: reg.r0, c0: reg.c0, h: reg.h, w: reg.w, driftTimer: null, expireTimer: null };
    // First placement must be instant: a fresh element has no left/top yet,
    // so the stylesheet's glide transition would animate it in from (0,0)
    // — the classic "fog spawns offscreen / slides in from the corner" bug.
    // Suppress the transition for this one write, then restore it so the
    // P2/P3 drift glides keep their smooth movement.
    fog.style.transition = 'none';
    _egFogPlace(fog, reg.r0, reg.c0, reg.h, reg.w);
    void fog.offsetWidth; // flush so the suppressed write commits
    fog.style.transition = '';
    if (driftMs > 0) bank.driftTimer = setInterval(() => _egFogDrift(bank), driftMs);
    bank.expireTimer = setTimeout(() => _egFogKillBank(bank), durationMs);
    _egFogBanks.push(bank);
    return bank;
}

// Removes a single bank and its timers (with a dissolve fade-out).
function _egFogKillBank(bank) {
    if (bank.dead) return;
    bank.dead = true;
    clearInterval(bank.driftTimer);
    clearTimeout(bank.expireTimer);
    if (bank.el && bank.el.isConnected) {
        const el = bank.el;
        el.classList.add('eg-fog-out');
        setTimeout(() => { try { el.remove(); } catch (e) {} }, 480);
    }
    const idx = _egFogBanks.indexOf(bank);
    if (idx !== -1) _egFogBanks.splice(idx, 1);
}

// Removes every fog bank and its timers. Called on boss death / encounter stop.
function _egRemoveFogBank() {
    _egFogBanks.slice().forEach(b => _egFogKillBank(b));
}

// Boss mechanic handler — phase variants:
//   P1 — Fog Bank: one static bank hides a region for 7s (original).
//   P2 — Drifting Fog: one bank wanders to a new region every ~2.6s.
//   P3 — Twin Banks: two banks wander — a second region is hidden too.
function _egMechFogBank(monster, phase) {
    if (_egFogBanks.length > 0) return; // already fogged
    const p = Math.max(1, Math.min(3, Number(phase) || 1));

    const norm = _egBossTierNorm(monster);
    const durF = _egBossTierFactor(norm, EG_FOG_DURATION_F);
    const driftF = _egBossTierFactor(norm, EG_FOG_DRIFT_F);
    let durationMs, driftMs, bankCount, toastKey;
    if (p === 1) {
        durationMs = Math.round(7000 * durF); driftMs = 0; bankCount = 1; toastKey = 'eg_mech_fog';
    } else if (p === 2) {
        durationMs = Math.round(9000 * durF); driftMs = Math.round(EG_FOG_DRIFT_P2_MS * driftF);
        bankCount = 1; toastKey = 'eg_mech_fog_drift';
    } else {
        durationMs = Math.round(10000 * durF); driftMs = Math.round(EG_FOG_DRIFT_P3_MS * driftF);
        bankCount = 2; toastKey = 'eg_mech_fog_twins';
    }

    let spawned = 0;
    for (let i = 0; i < bankCount; i++) {
        if (_egFogSpawnBank(driftMs, durationMs)) spawned++;
    }
    if (spawned > 0) {
        showToast(t(toastKey).replace('{n}', durationMs / 1000));
    }
}


//------------------------------------------------------------------------
//-------------------SHARED MECHANIC: CLUE SCRAMBLE------------------------
//------------------------------------------------------------------------
// Shuffles the order of the numbers inside 2 random clue lines (rows and/or
// columns). No information is destroyed — the same numbers, just reordered —
// and everything reverts after a phase-scaled duration. Clue number spans
// are per-number elements (rn-{row}-{i} / cn-{col}-{i}); the scramble swaps
// their text among themselves, so solved-state styling is untouched.

let _egClueScrambleRestoreTimer = null;
let _egClueScrambleReshuffleTimer = null; // P3 — second shuffle mid-effect
let _egActiveClueScramble = null; // [{ spans:[el...], orig:[text...] }]

// Collects the per-number clue spans of one line ('r', idx) or ('c', idx).
// Filters by exact id pattern so row 1 never catches row 11's spans.
function _egCollectClueSpans(kind, idx) {
    const prefix = kind === 'r' ? `rn-${idx}-` : `cn-${idx}-`;
    const re = kind === 'r'
        ? new RegExp(`^rn-${idx}-\\d+$`)
        : new RegExp(`^cn-${idx}-\\d+$`);
    return Array.from(document.querySelectorAll('[id^="' + prefix + '"]'))
        .filter(el => re.test(el.id));
}

// Restores scrambled lines to their original number order. Defers while a
// Clue Blackout owns the clue text, same as the Clue Swap restore.
function _egRestoreClueScramble() {
    clearTimeout(_egClueScrambleReshuffleTimer);
    _egClueScrambleReshuffleTimer = null;
    if (_egBlackoutActive) {
        _egClueScrambleRestoreTimer = setTimeout(_egRestoreClueScramble, 2000);
        return;
    }
    (_egActiveClueScramble || []).forEach(line => {
        line.spans.forEach((el, i) => {
            if (el.isConnected) el.textContent = line.orig[i];
        });
    });
    _egActiveClueScramble = null;
    document.querySelectorAll('.eg-scramble-clue').forEach(el => el.classList.remove('eg-scramble-clue'));
}

// Picks n distinct clue lines (rows + columns), each with ≥ 2 number spans.
function _egScramblePickLines(rows, cols, n) {
    const total = rows + cols;
    const picks = [];
    let guard = 0;
    while (picks.length < n && guard++ < total * 6) {
        const k = Math.floor(Math.random() * total);
        const line = k < rows ? { kind: 'r', idx: k } : { kind: 'c', idx: k - rows };
        if (picks.some(q => q.kind === line.kind && q.idx === line.idx)) continue;
        const spans = _egCollectClueSpans(line.kind, line.idx).filter(el => el.isConnected);
        if (spans.length < 2) continue;
        picks.push(line);
    }
    return picks;
}

// Shuffles one line's span texts in place (Fisher-Yates, insisting on a
// visibly changed order). Returns true when the order actually changed.
function _egScrambleLineTexts(spans) {
    const cur = spans.map(el => el.textContent);
    let order = cur.slice(), tries = 0;
    do {
        order = cur.slice();
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }
        tries++;
    } while (order.join('|') === cur.join('|') && tries < 10);
    if (order.join('|') === cur.join('|')) return false;
    spans.forEach((el, i) => { el.textContent = order[i]; });
    return true;
}

// P3 — the numbers re-shuffle mid-effect so they never settle before revert.
function _egClueScrambleReshuffle() {
    if (!_egActiveClueScramble || _egBlackoutActive) return;
    let changed = false;
    _egActiveClueScramble.forEach(line => {
        const spans = line.spans.filter(el => el.isConnected);
        if (spans.length < 2) return;
        if (_egScrambleLineTexts(spans)) {
            changed = true;
            spans.forEach(el => {
                el.classList.add('eg-scramble-shake');
                setTimeout(() => el.classList.remove('eg-scramble-shake'), 650);
            });
        }
    });
    if (changed) showToast(t('eg_scramble_again'));
}

// TIER-SCALED Clue Scramble knobs: line counts lerp between [tier1, tier16]
// pairs (tier 8 lands on 2 / 3 / 3); the scramble duration is a factor
// anchored exactly at tier 8 (8s / 9s / 12s unchanged there) — low tiers
// revert faster, high tiers hold the shuffled clues longer.
const EG_SCRAMBLE_LINES_P1 = [2, 3];
const EG_SCRAMBLE_LINES_P23 = [3, 4];
const EG_SCRAMBLE_DURATION_F = [0.85, 1.15]; // [tier1, tier16]


// Boss mechanic handler — phase variants:
//   P1 — Clue Scramble: shuffles the numbers inside 2 clue lines (original).
//   P2 — Deep Scramble: 3 lines scramble for longer.
//   P3 — Double Scramble: 3 lines, and the numbers re-shuffle mid-effect.
function _egMechClueScramble(monster, phase) {
    if (_egBlackoutActive || _egActiveClueScramble || _egActiveClueSwap) return; // don't stack
    const rows = (cur && cur.grid) ? cur.grid.length : 0;
    const cols = (cur && cur.grid && cur.grid[0]) ? cur.grid[0].length : 0;
    if (!rows || !cols) return;

    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const norm = _egBossTierNorm(monster);
    const lineCount = Math.max(2, Math.round(_egBossTierLerp(
        p >= 2 ? EG_SCRAMBLE_LINES_P23 : EG_SCRAMBLE_LINES_P1, norm)));
    const duration = Math.round((p >= 3 ? 12000 : (p >= 2 ? 9000 : 8000))
        * _egBossTierFactor(norm, EG_SCRAMBLE_DURATION_F));
    const picks = _egScramblePickLines(rows, cols, lineCount);
    if (picks.length < lineCount) return;

    const scrambled = [];
    picks.forEach(line => {
        const spans = _egCollectClueSpans(line.kind, line.idx).filter(el => el.isConnected);
        if (spans.length < 2) return;
        const orig = spans.map(el => el.textContent);
        if (!_egScrambleLineTexts(spans)) return; // all identical — nothing to do
        spans.forEach(el => el.classList.add('eg-scramble-clue'));
        scrambled.push({ spans, orig });
    });
    if (scrambled.length === 0) return;

    _egActiveClueScramble = scrambled;
    const toastKey = p >= 3 ? 'eg_mech_scramble_double'
        : (p >= 2 ? 'eg_mech_scramble_deep' : 'eg_mech_scramble');
    showToast(t(toastKey).replace('{n}', duration / 1000));

    clearTimeout(_egClueScrambleRestoreTimer);
    clearTimeout(_egClueScrambleReshuffleTimer);
    if (p >= 3) {
        _egClueScrambleReshuffleTimer = setTimeout(_egClueScrambleReshuffle, Math.min(5000, duration / 2));
    }
    _egClueScrambleRestoreTimer = setTimeout(_egRestoreClueScramble, duration);
}

// Full cleanup — restores originals immediately (unless a blackout owns the
// text, in which case the blackout's own restore wins anyway) and clears styling.
function _egRemoveClueScramble() {
    clearTimeout(_egClueScrambleRestoreTimer);
    _egClueScrambleRestoreTimer = null;
    clearTimeout(_egClueScrambleReshuffleTimer);
    _egClueScrambleReshuffleTimer = null;
    if (_egActiveClueScramble && !_egBlackoutActive) {
        _egActiveClueScramble.forEach(line => {
            line.spans.forEach((el, i) => {
                if (el.isConnected) el.textContent = line.orig[i];
            });
        });
    }
    _egActiveClueScramble = null;
    document.querySelectorAll('.eg-scramble-clue').forEach(el => el.classList.remove('eg-scramble-clue'));
}


//------------------------------------------------------------------------
//-------------------SHARED MECHANIC: SOUL TITHE---------------------------
//------------------------------------------------------------------------
// The boss raises a damage shield that only yields to puzzle progress: fill
// N correct cells (3/4/5 by phase) to break it. Failsafe: the shield decays
// after 25s so it can never soft-lock the fight. Progress is observed via
// _egNotifyCorrectFill. Mirrors the Aegis Protocol pattern (bossImmune +
// shielded card badge) but counts fills instead of add kills.

// TIER-SCALED Soul Tithe knobs — same endpoint pattern as Corrupt Cells.
// Quotas lerp between [tier1, tier16] pairs (tier 8 lands on 3 / 4 / 5);
// the lapse window is a duration factor anchored exactly at tier 8 (8s / 6s
// unchanged there) — brutal tiers stall faster, gentle tiers stall longer.
// The 25s shield failsafe is intentionally fixed so a boss can never soft-lock.
const EG_TITHE_NEED_P1 = [3, 4];
const EG_TITHE_NEED_P2 = [4, 5];
const EG_TITHE_NEED_P3 = [5, 6];
const EG_TITHE_DECAY_F = [1.2, 0.8]; // stall window factor [tier1, tier16]


// Arms (or re-arms) the lapsing decay window on an active tithe. P1 has no
// decay — P2+ loses 1 progress when the player stalls for the window.
function _egTitheArmDecay(monster) {
    const st = monster && monster.soulTithe;
    if (!st || st.p < 2) return;
    clearTimeout(st.decayTimer);
    const ms = st.decayMs || (st.p >= 3 ? 6000 : 8000);
    st.decayTimer = setTimeout(() => {
        if (!monster.soulTithe) return;
        if (monster.soulTithe.have > 0) {
            monster.soulTithe.have--;
            _egNkToast('eg_tithe_decay', '🕯️ The tithe slips — keep filling!', '#f87171');
            if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
        }
        _egTitheArmDecay(monster);
    }, ms);
}

// Removes the shield visuals/state from the boss (shared by break/timeout/teardown).
function _egTitheDrop(monster) {
    if (!monster.soulTithe) return;
    clearTimeout(monster.soulTithe.timer);
    clearTimeout(monster.soulTithe.decayTimer);
    monster.soulTithe = null;
    monster.bossImmune = false;
    const card = document.getElementById('eg-card-' + monster.id);
    if (card) card.classList.remove('eg-nk-shielded');
}

// Boss mechanic handler — phase variants:
//   P1 — Soul Tithe: fill 3 cells, shield fades after 25s (original).
//   P2 — Lapsing Tithe: fill 4 cells; stall 8s and 1 progress decays.
//   P3 — Demanding Tithe: fill 5 cells; stall 6s and 1 progress decays, and if
//        the shield times out the boss COLLECTS its due — your 2 most recent
//        correct fills are unfilled.
function _egMechSoulTithe(monster, phase) {
    if (!monster || monster.soulTithe || monster.aegisUp || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const norm = _egBossTierNorm(monster);
    const need = Math.max(1, Math.round(_egBossTierLerp(
        [EG_TITHE_NEED_P1, EG_TITHE_NEED_P2, EG_TITHE_NEED_P3][p - 1], norm)));
    const decayMs = Math.round((p >= 3 ? 6000 : 8000)
        * _egBossTierFactor(norm, EG_TITHE_DECAY_F));

    monster.soulTithe = {
        active: true, need, have: 0, timer: null, decayTimer: null,
        p, collect: p >= 3, decayMs,
    };
    monster.bossImmune = true;
    const card = document.getElementById('eg-card-' + monster.id);
    if (card) card.classList.add('eg-nk-shielded');
    const toastKey = p >= 3 ? 'eg_mech_tithe_debt'
        : (p >= 2 ? 'eg_mech_tithe_lapse' : 'eg_mech_tithe');
    _egNkToast(toastKey, `💀 Soul Tithe! Fill ${need} correct cells to break the shield!`);
    if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }

    _egTitheArmDecay(monster);
    monster.soulTithe.timer = setTimeout(() => {
        const st = monster.soulTithe;
        if (!st) return;
        if (st.collect) {
            // Debt-collect reprisal (P3): unfill the 2 most recent fills.
            if (cur && cur.grid && typeof _egUnfillCell === 'function') {
                const sol = cur.grid;
                const pool = [..._egRecentFills].reverse().filter(([r, c]) =>
                    userGrid[r][c] === 1 && !revealedGrid[r][c] && sol[r][c] === 1
                );
                pool.slice(0, 2).forEach(([r, c]) => _egUnfillCell(r, c));
            }
            _egNkToast('eg_tithe_collect', '💀 The tithe collects its due — recent fills are lost!', '#f87171');
        } else {
            _egNkToast('eg_tithe_timeout', '💀 The tithe holds... for now. The shield fades.', '#f87171');
        }
        _egTitheDrop(monster);
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e2) {} }
    }, 25000);
}

// Breaks an active tithe early (fill quota met). Called from _egNotifyCorrectFill.
function _egBreakSoulTithe(monster) {
    if (!monster.soulTithe) return;
    _egTitheDrop(monster);
    _egNkToast('eg_tithe_broken', '💥 Tithe paid — shield broken! Burn the boss!', '#4ade80');
    if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
}

// Per-boss teardown — drops an active tithe silently. Called from _egBossCleanup.
function _egTitheTeardown(monsterId) {
    if (typeof _egMonsters !== 'undefined') {
        const m = _egMonsters.find(x => x.id === monsterId);
        if (m && m.soulTithe) _egTitheDrop(m);
    }
    const card = document.getElementById('eg-card-' + monsterId);
    if (card) card.classList.remove('eg-nk-shielded');
}
