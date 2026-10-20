import { BOSS_DEFS } from './boss-framework.js';
import { Audio_Manager } from '../../audio/audio.js';
import { renderCell, updClues } from '../../grid.js';
import { t } from '../../translation/translations.js';
import { _updateObjectivesHUD } from '../encounter-chain.js';
import { _playerTakeDamage, _spawnMonster } from '../encounter.js';
import { _applyPlayerHitFeedback } from '../encounter-monster-attack-feedback.js';
import { _animateMonsterProjectile } from '../encounter-monster-attacks.js';
import { _hzPlayerHitbox, _hzPlayerRect, _hzPlayerSpriteRect } from '../combat-hazards.js';
import { EG_MAP_TIER_MONSTER_LEVELS, EG_MAX_MAP_TIER, _egRollMapTier } from '../../loot/loot-map-config.js';
import { MAX_CONCURRENT_MONSTERS } from '../combat-monsters.js';
import { _activeBlasts, _bossCorrupted, _bossFrozen, _cellInBounds, _isActive, _recentFills } from '../combat-state.js';
import { cur } from '../../state.js';

//------------------------------------------------------------------------
//-------------------SHARED BOSS ABILITIES--------------------------------
//------------------------------------------------------------------------
// Mechanics used by TWO OR MORE bosses live here so they are defined once;
// per-boss-only abilities live in the boss's own file. Boss files reference
// these by handler-name string, e.g. { name: 'corrupt_cells',
// handler: '_mechCorruptCells', ... }. Family layout:
//   shared (here) - corrupt_cells, probability_shift, prior_bomb (+ summon
//     helpers), clue_swap, frozen_cells, grid_invert + the shared engines
//     (screen-blast, _nk dodge kit).
//   shared-puzzle-mechanics.js - fated_cell, fog_bank, clue_scramble, soul_tithe.
//
// PHASE VARIANTS - every shared ability evolves per boss phase (P1/P2/P3)
// instead of only scaling counts; initial counts, caps and rates additionally
// scale with the boss's atlas tier (1-16). Variants per ability:
//   corrupt_cells     P1 static · P2 spreads to neighbours (telegraphed) ·
//                     P3 never expires
//   probability_shift P1 erases · P2 relocates marks · P3 relocates + erases
//   prior_bomb        P1 instant · P2 fused telegraph · P3 cascade wave
//   frozen_cells      P1 static locks · P2 creeping frost (one child
//                     generation, telegraphed) · P3 glacial drift (faster, longer)
//   fated_cell        P1 single mark · P2 doom relay (marks chain) ·
//                     P3 twin dooms (each fill respawns one)
//   fog_bank          P1 static · P2 drifting fog · P3 twin wandering banks
//   soul_tithe        P1 fixed quota · P2 lapsing (decays on stall) ·
//                     P3 demanding (decay + timeout collects fills)
//   clue_swap         P1 pair swap · P2 triple shift · P3 double cross
//   clue_scramble     P1 2 lines · P2 3 lines · P3 3 lines, re-shuffled midway
// Corrupt Cells spread cadence: P1 static + expire · P2 a corrupted cell
// infects one adjacent correct cell per tick (cell still expires) · P3 never
// expires and spreads faster - keep dispelling or the grid drowns.
//
// Caps and spread intervals are TIER-SCALED: [0] = tier-1 endpoint (gentle),
// [1] = tier-16 endpoint (brutal), lerped linearly; tier ~8 lands on the
// pre-scaling values (spread interval P2 ~5.1s / P3 ~4.2s, cap P2 = 6 / P3 = 8).

//------------------------------------------------------------------------

// ── Corrupt cell expiry time ───────────────────────────────────────────────
export const CORRUPT_CELL_LIFETIME_MS = 15000; // ms before corruption auto-expires (P1/P2 only)
// Brutus's arena keeps corruption on the grid LONGER (30s) so his corrupted
// cells linger as an ongoing hazard - they also chain his ground slams, so a
// fuller field means more slams in a row. P3 (never expires) is unchanged.
export const BRUTUS_CORRUPT_LIFETIME_MS = 30000;
// The Snail keeps corruption on the grid for a full minute: banishing the
// doom snail requires crashing it into a corrupted cell, and a 15 s cell
// evaporates long before the slow snail can ever reach it.
export const SNAIL_CORRUPT_LIFETIME_MS = 60000;

export const CORRUPT_SPREAD_INTERVAL_P2 = [6500, 3500]; // ms between spread attempts
export const CORRUPT_SPREAD_INTERVAL_P3 = [5500, 2800];
export const CORRUPT_SPREAD_CAP_P2 = [4, 8];           // max simultaneous corruptions
export const CORRUPT_SPREAD_CAP_P3 = [5, 11];

// Warning time between the ghost telegraph appearing on a target cell and the
// corruption actually landing there - spreads are always telegraphed so the
// relentless phase stays readable.
export const CORRUPT_TELEGRAPH_MS = 1000;

// Initial cast count per phase - also TIER-SCALED. Each pair is the endpoint
// at tier 1 (gentle) vs tier 16 (brutal); the old flat behaviour sat around
// tier ~8 (P1 2 · P2 3 · P3 4). Casts are clamped to the phase's spread cap
// so a high-tier opener can never exceed the simultaneous ceiling.
export const CORRUPT_CAST_P1 = [1, 3]; // P1 - static, no spread
export const CORRUPT_CAST_P2 = [2, 4]; // P2 - spreading
export const CORRUPT_CAST_P3 = [3, 5]; // P3 - relentless


// ── Tier-scaling endpoint pairs ───────────────────────────────────────────────
// Prior Bomb + Probability Shift follow the same [tier1, tier16] lerp pattern
// as Corrupt Cells: each pair is the gentle (tier 1) vs brutal (tier 16)
// endpoint, and the pre-scaling behaviour lands around tier ~8.

// Prior Bomb - target counts per phase:
//   P1–P3 all arm visible bombs; P3 adds a delayed cascade bomb after the
//   first wave.
export const PRIOR_BOMB_COUNT_P1 = [1, 2];
export const PRIOR_BOMB_COUNT_P2 = [1, 3];
export const PRIOR_BOMB_COUNT_P3 = [2, 4];
// Countdown between the 💣 arming and its detonation - this whole window is
// the counterplay: run your sprite onto a bomb to pause its fuse and start
// defusing (stand still for PRIOR_BOMB_DEFUSE_MS to disarm it). Gentle
// 15s → brutal 10s (was ~1.2s with no counterplay).
export const PRIOR_BOMB_FUSE_RANGE = [15000, 10000]; // ms, [tier1, tier16]
export const PRIOR_BOMB_DEFUSE_MS = 3000;       // standing time on a bomb to defuse it
export const PRIOR_BOMB_STAND_PAD_PX = 10;      // overlap forgiveness around the bomb cell
export const PRIOR_BOMB_TICK_MS = 100;          // fuse + defuse driver resolution
export const PRIOR_BOMB_CASCADE_DELAY_MS = 3500; // P3: second-wave bomb arms this long after the first

// Probability Shift - mark target counts per phase:
//   P1 erased · P2 relocated · P3 relocated + erased
export const SHIFT_ERASE_P1 = [1, 3];
export const SHIFT_RELOCATE_P2 = [2, 4];
export const SHIFT_RELOCATE_P3 = [3, 5];
export const SHIFT_ERASE_P3 = [1, 2];


// Linear interpolation helper for the [tier1, tier16] endpoint ranges above.
// Shared by every tier-scaled mechanic (Corrupt Cells, Prior Bomb,
// Probability Shift).
export function _bossTierLerp(range, norm) {
    return range[0] + (range[1] - range[0]) * Math.max(0, Math.min(1, norm));
}


// Duration multiplier for tier-scaled TIMING, anchored at tier 8 (factor 1.0,
// pre-scaling duration unchanged there). range = [tier1, tier16 factor];
// callers pick the direction so tier 1 is easy and tier 16 is brutal.
export function _bossTierFactor(norm, range) {
    if (norm == null || !isFinite(norm)) return 1;
    const anchor = 7 / 15; // tier 8 - where the pre-scaling timing was tuned
    norm = Math.max(0, Math.min(1, Number(norm) || 0));
    if (norm <= anchor) return range[0] + (1 - range[0]) * (norm / anchor);
    return 1 + (range[1] - 1) * ((norm - anchor) / (1 - anchor));
}


// Resolves a boss's atlas tier (1–16) into a 0…1 difficulty weight.
// Reuses _egRollMapTier (endgame-maps.js) when available; falls back to the
// shared tier-level ladder otherwise. Unknown levels default to mid-tier so
// the mechanic never swings to an extreme by accident.
export function _bossTierNorm(monster) {
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
export function _corruptSpreadIntervalMs(cfg) {
    const range = cfg.p >= 3 ? CORRUPT_SPREAD_INTERVAL_P3 : CORRUPT_SPREAD_INTERVAL_P2;
    return Math.max(1500, Math.round(_bossTierLerp(range, cfg.norm)));
}


// Spread cap for a corruption field, given its cfg.
export function _corruptSpreadCap(cfg) {
    const range = cfg.p >= 3 ? CORRUPT_SPREAD_CAP_P3 : CORRUPT_SPREAD_CAP_P2;
    return Math.max(1, Math.round(_bossTierLerp(range, cfg.norm)));
}


// Builds the per-cast rule set carried by every corruption of one cast:
//   p    - boss phase (1-3): drives expiry + base behaviour
//   norm - tier difficulty weight (0 tier 1 ... 1 tier 16): caps + rates
// Newly spread cells inherit the same cfg, so one field follows one rule set.
export function _corruptConfig(monster, phase) {
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const isBrutus = !!(monster && (monster.id === 'boss_brutus' || monster.baseId === 'boss_brutus'));
    const isSnail = !!(monster && (monster.id === 'boss_snail' || monster.baseId === 'boss_snail'));
    return {
        p,
        norm: _bossTierNorm(monster),
        lifetimeMs: isBrutus ? BRUTUS_CORRUPT_LIFETIME_MS
            : (isSnail ? SNAIL_CORRUPT_LIFETIME_MS : CORRUPT_CELL_LIFETIME_MS),
    };
}


// Returns all grid cells that are valid targets for the Corrupt Cells mechanic.
// Targets BOTH correct cells (sol=1, blockable until filled) and incorrect
// cells (sol=0, blockable until ✕-marked) that the player hasn't finished yet.
export function _buildCorruptibleCellPool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const pool = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (_bossCorrupted.has(`${r}-${c}`)) continue; // already corrupted
            if (sol[r][c] === 1) {
                // correct cell - blockable while still unfilled/unrevealed
                if (globalThis.userGrid[r][c] === 1 || globalThis.revealedGrid[r][c]) continue; // already filled
            } else if (sol[r][c] === 0) {
                // incorrect cell - blockable while not yet ✕-marked
                if (globalThis.userGrid[r][c] === 2) continue; // already marked
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
export function _corruptPickNeighbor(r, c) {
    if (!cur || !cur.grid) return null;
    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const cands = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        if (sol[nr][nc] === 1) {
            if (globalThis.userGrid[nr][nc] === 1 || globalThis.revealedGrid[nr][nc]) continue; // correct cell already filled
        } else if (sol[nr][nc] === 0) {
            if (globalThis.userGrid[nr][nc] === 2) continue; // incorrect cell already ✕-marked
        } else {
            continue; // grid only holds 0/1
        }
        if (_bossCorrupted.has(`${nr}-${nc}`)) continue;
        if (document.getElementById(`sx-corrupt-tel-${nr}-${nc}`)) continue; // already telegraphed
        cands.push([nr, nc]);
    }
    if (cands.length === 0) return null;
    return cands[Math.floor(Math.random() * cands.length)];
}


// Shows the ghosted ☣️ on the chosen target and schedules the corruption to
// land there after the telegraph window. Stored on the source cell's entry so
// dispelling or expiring the source cancels the pending spread with it.
export function _corruptTelegraphSpread(key, data, tr, tc) {
    const el = document.getElementById(`g-${tr}-${tc}`);
    if (!el) return;

    const tel = document.createElement('span');
    tel.className = 'sx-corrupt-telegraph';
    tel.id = `sx-corrupt-tel-${tr}-${tc}`;
    tel.textContent = '☣️';
    el.appendChild(tel);

    data.pending = {
        tr, tc,
        landTimer: setTimeout(() => _corruptSpreadLand(key), CORRUPT_TELEGRAPH_MS),
    };
}


// Lands a telegraphed spread. Re-validates everything before corrupting so a
// mid-telegraph refill, arena transition or cap change can never corrupt the
// wrong cell. If the spread fizzles, the source's next attempt picks a fresh
// target.
export function _corruptSpreadLand(key) {
    const data = _bossCorrupted.get(key);
    if (!data || !data.pending) return;
    const { tr, tc } = data.pending;
    data.pending = null;
    const tel = document.getElementById(`sx-corrupt-tel-${tr}-${tc}`);
    if (tel) tel.remove();

    if (!_bossCorrupted.has(key)) return;          // source dispelled mid-telegraph
    if (!cur || !cur.grid) return;
    if (tr >= cur.grid.length || tc >= cur.grid[0].length) return; // grid swapped
    const sol = cur.grid;
    if (sol[tr][tc] === 1) {
        if (globalThis.userGrid[tr][tc] === 1 || globalThis.revealedGrid[tr][tc]) return;    // correct target filled meanwhile
    } else if (sol[tr][tc] === 0) {
        if (globalThis.userGrid[tr][tc] === 2) return;                            // incorrect target ✕-marked meanwhile
    } else {
        return;                                                        // grid swapped to a new shape
    }
    if (_bossCorrupted.size >= _corruptSpreadCap(data.cfg)) return; // cap during window

    _applyCellCorruption(tr, tc, data.cfg);
}


// Spread tick for one corrupted cell: tries to infect a neighbour and
// reschedules itself while the cell stays corrupted. When the global cap is
// reached it just waits - dispelling cells re-opens the floodgates.
export function _corruptSpreadTick(key) {
    const data = _bossCorrupted.get(key);
    if (!data) return;

    if (_bossCorrupted.size < _corruptSpreadCap(data.cfg)) {
        const [r, c] = key.split('-').map(Number);
        const neighbor = _corruptPickNeighbor(r, c);
        if (neighbor) _corruptTelegraphSpread(key, data, neighbor[0], neighbor[1]);
    }

    if (_bossCorrupted.has(key)) {
        data.spreadTimer = setTimeout(() => _corruptSpreadTick(key), _corruptSpreadIntervalMs(data.cfg));
    }
}


// Places the ☣️ corruption overlay on a cell and registers its expiry timer.
// cfg drives the variants (see _corruptConfig): p = phase (P1 static+expire,
// P2 expire+spread, P3 never expires), norm = tier weight. Spread children
// inherit the cfg, so a whole field follows one rule set.
export function _applyCellCorruption(r, c, cfg) {
    const key = `${r}-${c}`;
    const el = document.getElementById(`g-${r}-${c}`);
    if (!el || _bossCorrupted.has(key)) return;

    const p = cfg.p;
    const overlay = document.createElement('span');
    overlay.className = 'sx-corrupt-overlay';
    overlay.id = `sx-corrupt-${r}-${c}`;
    overlay.textContent = '☣️';
    el.appendChild(overlay);

    const data = { timer: null, spreadTimer: null, pending: null, cfg };
    // P3 corruption is permanent until dispelled - "relentless"
    if (p < 3) {
        data.timer = setTimeout(() => _removeCellCorruption(key),
            cfg.lifetimeMs || CORRUPT_CELL_LIFETIME_MS);
    }
    // P2+ corruptions spread to neighbours on a tier-scaled timer
    if (p >= 2) {
        data.spreadTimer = setTimeout(() => _corruptSpreadTick(key), _corruptSpreadIntervalMs(cfg));
    }
    _bossCorrupted.set(key, data);
}


// Removes the corruption overlay from the DOM and clears its state entry -
// including any pending telegraphed spread (its ghost overlay is removed so
// no orphan telegraph can outlive its source).
export function _removeCellCorruption(key) {
    const data = _bossCorrupted.get(key);
    if (data) {
        clearTimeout(data.timer);
        clearTimeout(data.spreadTimer);
        if (data.pending) {
            clearTimeout(data.pending.landTimer);
            const tel = document.getElementById(`sx-corrupt-tel-${data.pending.tr}-${data.pending.tc}`);
            if (tel) tel.remove();
            data.pending = null;
        }
    }
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`sx-corrupt-${r}-${c}`);
    if (span) span.remove();
    _bossCorrupted.delete(key);
}


// Removes all currently active corrupted cells.
// Called on boss death or encounter stop to avoid leaving orphaned overlays.
export function _clearAllCorruptedCells() {
    Array.from(_bossCorrupted.keys()).forEach(key => _removeCellCorruption(key));
}


// Returns true if the cell at (row, col) currently has an active corruption overlay.
// Called from mouse-button-handlers.js before allowing a cell fill.
export function _isCellCorrupted(row, col) {
    return _bossCorrupted.has(`${row}-${col}`);
}


// Dispels the corruption on a cell when the player clicks it.
// Returns true if the cell was corrupted (caller should block the normal fill action
// and require a second click to actually fill).
export function _dispelCorruption(row, col) {
    const key = `${row}-${col}`;
    if (!_bossCorrupted.has(key)) return false;

    clearTimeout(_bossCorrupted.get(key).timer);
    _removeCellCorruption(key);
    globalThis.showCombatToast(t('eg_corruption_dispelled'));
    return true;
}


// Boss mechanic handler - called by the boss mechanic scheduler. Tier-scaled
// counts, caps + spread rates; P1 static cells (auto-expire, dispel to fill,
// 1-3 by tier), P2 cells that SPREAD to neighbours, P3 cells that never expire
// and spread faster (tier 1 manageable, tier 16 drowns the grid).
export function _mechCorruptCells(monster, phase) {
    const pool = _buildCorruptibleCellPool();
    if (pool.length === 0) return;

    const cfg = _corruptConfig(monster, phase);
    const castRange = cfg.p >= 3 ? CORRUPT_CAST_P3
        : (cfg.p >= 2 ? CORRUPT_CAST_P2 : CORRUPT_CAST_P1);
    let count = Math.max(1, Math.round(_bossTierLerp(castRange, cfg.norm)));
    // Never open above the phase's simultaneous corruption ceiling.
    if (cfg.p >= 2) count = Math.min(count, _corruptSpreadCap(cfg));
    const targets = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));

    const toastKey = cfg.p >= 3 ? 'eg_mech_corrupt_rage'
        : (cfg.p >= 2 ? 'eg_mech_corrupt_spread' : 'eg_mech_corrupt_cells');
    globalThis.showCombatToast(t(toastKey).replace('{n}', targets.length));
    targets.forEach(([r, c]) => _applyCellCorruption(r, c, cfg));
}


// Returns all cells the player has correctly marked as ✕ (userGrid=2, sol=0).
export function _buildProbabilityShiftPool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const pool = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (sol[r][c] === 0 && globalThis.userGrid[r][c] === 2 && !globalThis.wrongGrid[r][c])
                pool.push([r, c]);
    return pool;
}


// Returns empty (sol=0) cells that a shifted mark can land on: unmarked,
// not already wrong-marked, and never the source cells being relocated.
export function _buildMarkDestinations(excludeKeys) {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const dests = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] !== 0) continue;
            if (globalThis.userGrid[r][c] !== 0) continue;
            if (globalThis.wrongGrid[r][c]) continue;
            if (excludeKeys && excludeKeys.has(`${r}-${c}`)) continue;
            dests.push([r, c]);
        }
    }
    return dests;
}


// Flight time for the relocated ✕ to travel from its old cell to the new one.
export const SHIFT_FLY_MS = 1500;

// Active shift flyers (fixed-position ✕ nodes) so boss death / encounter
// stop can remove mid-flight orphans. See _clearShiftGlows.
export let _shiftFlyNodes = [];


// Ease in-out cubic for the shift flight - slow lift-off, fast cruise,
// soft landing so the eye can track the ✕ across the grid.
export function _shiftFlyEase(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}


// Spawns one flying ✕ from cell (sr,sc) to (dr,dc) over SHIFT_FLY_MS; the
// destination rect is re-read per frame so scroll/zoom mid-flight still lands
// right. onLanded fires exactly once (also when a cell is missing - state
// commits without the visual).
export function _shiftSpawnFlyer(sr, sc, dr, dc, onLanded) {
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
    node.className = 'sx-shift-fly';
    node.textContent = '✕';
    node.style.width = `${size}px`;
    node.style.height = `${size}px`;
    node.style.fontSize = `${Math.round(size * 0.62)}px`;
    node.style.left = `${startX - size / 2}px`;
    node.style.top = `${startY - size / 2}px`;
    document.body.appendChild(node);
    _shiftFlyNodes.push(node);

    const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const step = (now) => {
        // Cancelled mid-flight (cleanup removed the node) - still commit
        // the destination state so no mark stays visually missing.
        if (!node.isConnected) {
            const idx = _shiftFlyNodes.indexOf(node);
            if (idx !== -1) _shiftFlyNodes.splice(idx, 1);
            finish();
            return;
        }
        const tRaw = Math.max(0, Math.min(1, ((now || t0) - t0) / SHIFT_FLY_MS));
        const t = _shiftFlyEase(tRaw);

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
            const idx = _shiftFlyNodes.indexOf(node);
            if (idx !== -1) _shiftFlyNodes.splice(idx, 1);
            finish();
            return;
        }
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}


// Moves each target mark to a different empty cell. The ✕ stays on the board
// (the emptiness just "shifts" elsewhere) so no information is destroyed.
// Visual: old ✕ vanishes, a floating ✕ flies over SHIFT_FLY_MS, the new
// mark lands with a golden glow. userGrid commits instantly (a mid-flight
// click can never double-mark the destination) - only the reveal waits.
export function _relocateMarks(targets) {
    const excludeKeys = new Set(targets.map(([r, c]) => `${r}-${c}`));
    const dests = _buildMarkDestinations(excludeKeys).sort(() => Math.random() - 0.5);

    targets.forEach(([r, c], i) => {
        const d = dests[i];
        if (!d) return; // ran out of legal destinations
        const [dr, dc] = d;
        // Commit state at once; render the source cleared now, the
        // destination only once its flyer lands (see below).
        globalThis.userGrid[r][c] = 0;
        renderCell(r, c);
        globalThis.userGrid[dr][dc] = 2;

        _shiftSpawnFlyer(r, c, dr, dc, () => {
            // The player may have clicked the destination mid-flight -
            // never stomp their newer input, just make the DOM match it.
            renderCell(dr, dc);
            if (globalThis.userGrid[dr][dc] !== 2) return;
            const el = document.getElementById(`g-${dr}-${dc}`);
            if (el) {
                el.classList.add('sx-shift-moved');
                setTimeout(() => el.classList.remove('sx-shift-moved'), 1600);
            }
        });
    });
}


// Boss mechanic handler - phase variants (target counts TIER-SCALED):
//   P1 - Probability Shift: erases marks (2 at tier 8, 1–3 across tiers).
//   P2 - Relocation: moves marks to other empty cells (info preserved).
//   P3 - Quantum Shift: relocates marks AND erases 1–2 outright.
export function _mechProbabilityShift(monster, phase) {
    const pool = _buildProbabilityShiftPool();
    if (pool.length === 0) return;

    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const norm = _bossTierNorm(monster);
    const shuffled = pool.sort(() => Math.random() - 0.5);

    if (p === 1) {
        const n = Math.max(1, Math.round(_bossTierLerp(SHIFT_ERASE_P1, norm)));
        const targets = shuffled.slice(0, Math.min(n, shuffled.length));
        globalThis.showCombatToast(t('eg_mech_probability_shift').replace('{n}', targets.length));
        targets.forEach(([r, c]) => {
            globalThis.userGrid[r][c] = 0;
            renderCell(r, c);
        });
        return;
    }

    if (p === 2) {
        const n = Math.max(1, Math.round(_bossTierLerp(SHIFT_RELOCATE_P2, norm)));
        const targets = shuffled.slice(0, Math.min(n, shuffled.length));
        globalThis.showCombatToast(t('eg_mech_shift_relocate').replace('{n}', targets.length));
        _relocateMarks(targets);
        return;
    }

    // P3: erase N, relocate M after them
    const eraseN = Math.max(1, Math.round(_bossTierLerp(SHIFT_ERASE_P3, norm)));
    const relocateN = Math.max(1, Math.round(_bossTierLerp(SHIFT_RELOCATE_P3, norm)));
    const erase = shuffled.slice(0, Math.min(eraseN, shuffled.length));
    const relocate = shuffled.slice(erase.length, erase.length + relocateN);
    globalThis.showCombatToast(t('eg_mech_shift_quantum').replace('{n}', relocate.length));
    erase.forEach(([r, c]) => {
        globalThis.userGrid[r][c] = 0;
        renderCell(r, c);
    });
    _relocateMarks(relocate);
}


// Removes any lingering "moved mark" glow (used defensively if a grid is
// rebuilt mid-animation). Also removes in-flight ✕ flyers so no orphan can
// outlive its grid - their onLanded callbacks still commit state safely via
// renderCell, but the node check in the flight loop stops the animation.
export function _clearShiftGlows() {
    document.querySelectorAll('.sx-shift-moved').forEach(el => el.classList.remove('sx-shift-moved'));
    if (Array.isArray(_shiftFlyNodes)) {
        _shiftFlyNodes.forEach(n => { try { n.remove(); } catch (e) { /* ignore */ } });
        _shiftFlyNodes = [];
    }
    document.querySelectorAll('.sx-shift-fly').forEach(el => el.remove());
}


// Removes a specific [row, col] entry from the recent-fills tracker.
export function _removeFromRecentFills(row, col) {
    const idx = _recentFills.findIndex(([fr, fc]) => fr === row && fc === col);
    if (idx !== -1) _recentFills.splice(idx, 1);
}


// Plays the burst visual on a cell unfilled by Prior Bomb.
export function _flashPriorBombCell(row, col) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    el.classList.add('sx-prior-bomb-flash');
    setTimeout(() => el.classList.remove('sx-prior-bomb-flash'), 600);
}


// One Prior Bomb detonation at the bomb's cell centre: Demolitionist boom +
// purple tint + whole-screen shake so the payoff is FELT. Purely visual (the
// unfill stays in the caller); runs on an orphan layer that outlives the nk
// run and self-removes (same pattern as _crashBoom's orphan branch).
export function _priorBombBoom(x, y, radius) {
    const R = Math.max(12, radius);

    let layer = document.createElement('div');
    layer.className = 'sx-crash-burst';
    layer.style.left = Math.round(x - R) + 'px';
    layer.style.top = Math.round(y - R) + 'px';
    layer.style.width = (R * 2) + 'px';
    layer.style.height = (R * 2) + 'px';
    document.body.appendChild(layer);

    const core = document.createElement('div');
    core.className = 'sx-crash-core';
    layer.appendChild(core);
    const ring = document.createElement('div');
    ring.className = 'sx-crash-ring';
    layer.appendChild(ring);
    for (let i = 0; i < 7; i++) {
        const s = document.createElement('div');
        s.className = 'sx-crash-spark';
        const ang = Math.random() * Math.PI * 2;
        const dist = R * (0.35 + Math.random() * 0.8);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist) + 'px');
        s.style.animationDelay = Math.round(Math.random() * 90) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, 900);

    // The blast is felt as well as seen - same subtle shake language the
    // screen-blast impact uses (class exists on <body>, restart-clean).
    const shakeBody = document.body;
    shakeBody.classList.remove('sx-screen-shake');
    void shakeBody.offsetWidth;
    shakeBody.classList.add('sx-screen-shake');
    setTimeout(() => shakeBody.classList.remove('sx-screen-shake'), 550);

    if (typeof Audio_Manager !== 'undefined' && Audio_Manager && typeof Audio_Manager.playSFX === 'function') {
        try { Audio_Manager.playSFX('boss_explosion', 'drifterExplosion'); } catch (e) {}
    }
}


// Detonation FX + purple tint on the cell itself. Fired from
// _priorBombExplode BEFORE the cell is unfilled so the tint sits on the
// still-filled cell and visibly pops as it is cleared.
export function _priorBombDetonationFX(b) {
    const cellEl = b.cellEl && b.cellEl.isConnected ? b.cellEl
        : document.getElementById(`g-${b.r}-${b.c}`);
    if (cellEl) {
        cellEl.classList.add('sx-pb-detonated');
        setTimeout(() => cellEl.classList.remove('sx-pb-detonated'), 900);
        const r = cellEl.getBoundingClientRect();
        if (r.width && r.height) {
            _priorBombBoom(r.left + r.width / 2, r.top + r.height / 2, Math.max(34, r.width * 1.15));
            return;
        }
    }
    // Cell not measurable (mid-rebuild) - still detonate audibly/shakily.
    _priorBombBoom(window.innerWidth / 2, window.innerHeight / 2, 40);
}


// Unfills a single cell and removes it from the recent-fills tracker.
export function _unfillCell(row, col) {
    globalThis.userGrid[row][col] = 0;
    _removeFromRecentFills(row, col);
    renderCell(row, col);
    updClues(row, col);
    _flashPriorBombCell(row, col);
}


// Boss mechanic handler - deliberately SUMMONS reinforcements: the one spawn
// path left open inside the boss arena (natural respawns are suppressed - see
// _shouldSuppressRespawn). 2 minions in P3 (else 1) at the boss's level,
// capped by the global monster cap; slain minions pay normal XP/loot.
export const SUMMON_POOL = ['slime', 'ghost', 'rat', 'bat', 'bee'];


export function _mechSummonAdds(monster, phase) {
    if (typeof _spawnMonster !== 'function') return;
    const count = phase >= 3 ? 2 : 1;
    const level = Math.max(1, Math.round(monster.level || 1));
    const name = monster.name || monster.baseId || '?';

    let summoned = 0;
    for (let i = 0; i < count; i++) {
        if (typeof _monsters !== 'undefined' && globalThis._monsters.length >= MAX_CONCURRENT_MONSTERS) break;
        const defId = SUMMON_POOL[Math.floor(Math.random() * SUMMON_POOL.length)];
        _spawnMonster(defId, level);
        summoned++;
    }
    if (summoned > 0) {
        Audio_Manager.playSFX('boss_summon');
        globalThis.showCombatToast(t('eg_boss_summon').replace('{name}', name).replace('{n}', summoned), '#f87171');
        if (typeof _updateObjectivesHUD === 'function') _updateObjectivesHUD();
    }
}


// Returns the most-recently-filled correct cells eligible for Prior Bomb.
export function _priorBombPool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    return [..._recentFills].reverse().filter(([r, c]) =>
        _cellInBounds(r, c)
        && globalThis.userGrid[r][c] === 1 && !globalThis.revealedGrid[r][c] && sol[r][c] === 1
    );
}


// ── Prior Bomb: countdown bombs with a defuse counterplay ────────────────────
// A LIVE countdown above the 💣; standing on the bomb pauses the fuse - hold
// for PRIOR_BOMB_DEFUSE_MS to disarm it with no grid effect. State in
// _priorBombs, driven by one shared 100 ms pause-aware interval.

export let _priorBombs = [];           // { r, c, cellEl, fuseEl, remainMs, defuseAcc, monsterId, resolved }
export let _priorBombTimer = null;
export let _priorBombDefusingActive = false;   // player standing on an armed bomb right now
export let _priorBombChargePauseShown = false; // dedupes the charge-bar pause style toggles


// True while the player is actively defusing a Prior Bomb (standing on it,
// fuse paused). Defusing still costs time the player could spend positioning
// for a charged strike.
export function _priorBombDefusing() {
    return _priorBombDefusingActive;
}


// Keeps the DEFUSING label in sync with defusing. NOTE: unlike the old
// auto-attack era, defusing no longer pauses the melee charge bar, so this
// intentionally touches only the label - the bar's paused styling is owned
// centrally by _updatePlayerChargeBar.
export function _syncDefuseChargePause(active) {
    _priorBombDefusingActive = !!active;
    if (!!active === _priorBombChargePauseShown) return;
    _priorBombChargePauseShown = !!active;
    _syncDefuseLabel(!!active);
}


// 'DEFUSING' hint label on the player sprite while standing on a bomb - the
// same visual language as the hold-parry PARRYING label (#sx-hold-pause-label),
// but in defuse green and driven by the bomb tick instead of the parry key.
// Touches the DOM only on real state changes (caller dedupes transitions).
export function _syncDefuseLabel(show) {
    const hud = document.getElementById('player-avatar-wrapper');
    if (hud) {
        let lbl = document.getElementById('sx-defuse-label');
        if (show) {
            if (!lbl) {
                lbl = document.createElement('div');
                lbl.id = 'sx-defuse-label';
                hud.appendChild(lbl);
            }
            const raw = (typeof t === 'function') ? t('eg_defusing') : '';
            lbl.textContent = (raw && raw !== 'eg_defusing') ? raw : 'DEFUSING';
            lbl.style.display = '';
        } else if (lbl) {
            lbl.remove();
        }
    } else if (!show) {
        // No avatar yet - make sure a stray label elsewhere is cleaned up.
        const stray = document.getElementById('sx-defuse-label');
        if (stray) stray.remove();
    }
}


// True while the player sprite overlaps the bomb's cell (with forgiveness).
export function _priorBombStanding(b, pr) {
    if (!pr || !b.cellEl || !b.cellEl.isConnected) return false;
    const r = b.cellEl.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const p = PRIOR_BOMB_STAND_PAD_PX;
    return _nkRectsOverlap(
        { left: r.left - p, right: r.right + p, top: r.top - p, bottom: r.bottom + p },
        pr
    );
}


// Arms a single bomb on a cell: countdown label above the 💣 icon, then a
// shared driver (see _priorBombTick) counts it down / defuses it.
export function _priorBombArmCell(r, c, monsterId, fuseMs) {
    const cellEl = document.getElementById(`g-${r}-${c}`);
    if (!cellEl || !cellEl.isConnected) return;
    if (cellEl.querySelector('.sx-prior-bomb-fuse')) return; // never double-arm

    const fuseEl = document.createElement('span');
    fuseEl.className = 'sx-prior-bomb-fuse';
    fuseEl.id = `sx-pb-fuse-${r}-${c}`;
    fuseEl.innerHTML =
        '<span class="sx-pb-cd">' + Math.max(1, Math.ceil(fuseMs / 1000)) + '</span>' +
        '<span class="sx-pb-icon">💣</span>' +
        '<span class="sx-pb-defuse"><i></i></span>';
    cellEl.appendChild(fuseEl);

    _priorBombs.push({
        r, c, cellEl, fuseEl,
        monsterId: monsterId || null,
        remainMs: Math.max(1, fuseMs),
        defuseAcc: 0,
        resolved: false,
    });

    if (!_priorBombTimer) {
        _priorBombTimer = setInterval(_priorBombTick, PRIOR_BOMB_TICK_MS);
    }
}


// World 1 convergence trial: The Null has no regular projectiles, instead an
// undefused bomb makes him shoot the player once, hard. Other bosses and the
// endgame are untouched.
const NULL_BOMB_STRIKE_MULT = 3;
function _nullBombStrike(b) {
    if (!b || !b.monsterId) return;
    const boss = (globalThis._monsters || []).find(m => m.id === b.monsterId);
    if (!boss || !boss.isBoss || typeof boss.id !== 'string' || !boss.id.startsWith('boss_null')) return;
    const tr = typeof globalThis._isConvergenceTrialRun === 'function' ? globalThis._isConvergenceTrialRun() : null;
    if (!tr || tr.wi !== 0) return;
    _animateMonsterProjectile(boss, NULL_BOMB_STRIKE_MULT);
}


// Detonation: explosion FX fire at the cell, THEN the fill is removed.
// Re-validated so an arena transition or mid-fuse refill can never corrupt
// the new grid; a ghosted cell (grid rebuilt, cell still present) still pops
// visually - the FX read from the DOM cell when possible.
export function _priorBombExplode(b) {
    _priorBombDetonationFX(b);
    if (b.fuseEl) b.fuseEl.remove();
    _nullBombStrike(b);
    if (!cur || !cur.grid) return;
    if (b.r >= cur.grid.length || b.c >= cur.grid[0].length) return;
    if (globalThis.userGrid[b.r][b.c] !== 1 || globalThis.revealedGrid[b.r][b.c] || cur.grid[b.r][b.c] !== 1) return;
    _unfillCell(b.r, b.c);
}


// Disarmed: green flash on the cell - the fill survives untouched.
export function _priorBombDefuse(b) {
    if (b.fuseEl) b.fuseEl.remove();
    const cellEl = document.getElementById(`g-${b.r}-${b.c}`);
    if (cellEl) {
        cellEl.classList.add('sx-pb-defused');
        setTimeout(() => cellEl.classList.remove('sx-pb-defused'), 1000);
    }
}


// Shared 100 ms driver for every armed bomb:
//   • player standing on the bomb → fuse paused, defuse accumulates;
//   • otherwise → fuse ticks down to detonation.
// Freezes under pause/death; vanishes silently on boss death / teardown.
export function _priorBombTick() {
    if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;
    if (typeof dead !== 'undefined' && globalThis.dead) return;
    if (typeof _isActive === 'function' && !_isActive()) {
        _clearPriorBombFuses();
        return;
    }

    const pr = typeof _nkPlayerRect === 'function' ? _nkPlayerRect() : null;
    const dt = PRIOR_BOMB_TICK_MS;

    for (const b of _priorBombs) {
        if (b.resolved) continue;

        // Boss died or the grid moved on → the bomb just vanishes (old behaviour).
        if ((b.monsterId && typeof _monsters !== 'undefined'
                && !globalThis._monsters.some(m => m.id === b.monsterId))
            || !b.cellEl || !b.cellEl.isConnected) {
            if (b.fuseEl) b.fuseEl.remove();
            b.resolved = true;
            continue;
        }

        const standing = _priorBombStanding(b, pr);

        if (standing) {
            // Defusing: the explosion timer is PAUSED - accumulate stand time.
            b.defuseAcc += dt;
            b.fuseEl.classList.add('sx-pb-defusing');
            const bar = b.fuseEl.querySelector('.sx-pb-defuse');
            if (bar) bar.style.display = 'block';
            const fill = bar ? bar.querySelector('i') : null;
            if (fill) {
                fill.style.width = Math.min(100, (b.defuseAcc / PRIOR_BOMB_DEFUSE_MS) * 100) + '%';
            }
            if (b.defuseAcc >= PRIOR_BOMB_DEFUSE_MS) {
                _priorBombDefuse(b);
                b.resolved = true;
                continue;
            }
        } else {
            b.fuseEl.classList.remove('sx-pb-defusing');
            b.remainMs -= dt;
            if (b.remainMs <= 0) {
                _priorBombExplode(b);
                b.resolved = true;
                continue;
            }
        }

        // Live countdown above the icon.
        const cd = b.fuseEl.querySelector('.sx-pb-cd');
        if (cd) {
            cd.textContent = Math.max(1, Math.ceil(b.remainMs / 1000));
            cd.classList.toggle('sx-pb-critical', b.remainMs <= 3000);
        }
    }

    _priorBombs = _priorBombs.filter(b => !b.resolved);

    // Defusing = the player is still standing on a bomb that survived this
    // tick. Re-checking AFTER the filter releases the charge pause cleanly
    // when the very last bomb is defused mid-stand (otherwise the interval
    // below would stop with the pause latch stuck on forever).
    let stillDefusing = false;
    for (const b of _priorBombs) {
        if (_priorBombStanding(b, pr)) { stillDefusing = true; break; }
    }
    _syncDefuseChargePause(stillDefusing);

    if (_priorBombs.length === 0 && _priorBombTimer) {
        clearInterval(_priorBombTimer);
        _priorBombTimer = null;
    }
}


// Removes any armed-but-undetonated bomb fuses (encounter stop / cleanup).
export function _clearPriorBombFuses() {
    if (_priorBombTimer) {
        clearInterval(_priorBombTimer);
        _priorBombTimer = null;
    }
    _priorBombs.forEach(b => { if (b.fuseEl) b.fuseEl.remove(); });
    _priorBombs = [];
    document.querySelectorAll('.sx-prior-bomb-fuse').forEach(el => el.remove());
    _syncDefuseChargePause(false);
}


// Boss mechanic handler - every phase arms visible, defusable bombs (counts
// and fuse timing TIER-SCALED like Corrupt Cells):
//   P1 - Prior Bomb: {n} bombs on the most recent correct fills.
//   P2 - Fused Bomb: {n} bombs (snappier window at high tier).
//   P3 - Cascade Bomb: {n} bombs, then a delayed second bomb arms on the
//        freshest fill ~PRIOR_BOMB_CASCADE_DELAY_MS later.
//
// Standing on any bomb for PRIOR_BOMB_DEFUSE_MS defuses it.
export function _mechPriorBomb(monster, phase) {
    const pool = _priorBombPool();
    if (pool.length === 0) return;

    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const norm = _bossTierNorm(monster);
    const countRange = p >= 3 ? PRIOR_BOMB_COUNT_P3
        : (p >= 2 ? PRIOR_BOMB_COUNT_P2 : PRIOR_BOMB_COUNT_P1);
    const count = Math.max(1, Math.round(_bossTierLerp(countRange, norm)));
    const fuseMs = Math.max(5000, Math.round(_bossTierLerp(PRIOR_BOMB_FUSE_RANGE, norm)));
    const targets = pool.slice(0, Math.min(count, pool.length));
    const mid = monster ? monster.id : null;

    globalThis.showCombatToast(t(p >= 3 ? 'eg_mech_prior_bomb_cascade'
        : (p >= 2 ? 'eg_mech_prior_bomb_fuse' : 'eg_mech_prior_bomb')).replace('{n}', targets.length));
    targets.forEach(([r, c]) => _priorBombArmCell(r, c, mid, fuseMs));

    // P3 keeps the pressure on: a delayed second bomb on the freshest fill.
    if (p >= 3) {
        setTimeout(() => {
            if (mid && typeof _monsters !== 'undefined'
                && !globalThis._monsters.some(m => m.id === mid)) return; // boss dead
            const pool2 = _priorBombPool();
            if (pool2.length === 0) return;
            _priorBombArmCell(pool2[0][0], pool2[0][1], mid, fuseMs);
        }, PRIOR_BOMB_CASCADE_DELAY_MS);
    }
}


// Collects the per-number clue spans of one line ('r', idx) or ('c', idx).
// Filters by exact id pattern so row 1 never catches row 11's spans.
export function _collectClueSpans(kind, idx) {
    const prefix = kind === 'r' ? `rn-${idx}-` : `cn-${idx}-`;
    const re = kind === 'r'
        ? new RegExp(`^rn-${idx}-\\d+$`)
        : new RegExp(`^cn-${idx}-\\d+$`);
    return Array.from(document.querySelectorAll('[id^="' + prefix + '"]'))
        .filter(el => re.test(el.id));
}


// ── Clue Swap state ──────────────────────────────────────────────────────────
// Active swap = { groups: [ { rows, spans:[[...]], orig:[[...]] } ] }; each
// group cycles its rows' clue numbers one step (pair A↔B, triple A←B←C←A).
// Clue numbers live as per-number spans (rn-{row}-{i} / cn-{col}-{i}), which
// the swap operates on directly.

// Picks `n` distinct rows with clue spans, preferring rows of equal clue
// length so positional exchanges read as clean full swaps. Returns null when
// the puzzle cannot supply enough rows.
export function _swapPickRows(rowCount, n) {
    const buckets = {};
    for (let r = 0; r < rowCount; r++) {
        const s = _collectClueSpans('r', r).filter(el => el.isConnected);
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
export function _swapRowGroup(rows) {
    const spans = [], orig = [];
    rows.forEach(r => {
        const s = _collectClueSpans('r', r).filter(el => el.isConnected);
        spans.push(s);
        orig.push(s.map(el => el.textContent));
    });
    return { rows, spans, orig };
}


// Applies one swap group's rotation from its snapshots. Number i of row k
// receives number i of the row one step ahead in the cycle; when the supplier
// is shorter, the remainder keeps its own value (unequal clue lengths always
// restore exactly because every original text is snapshotted).
export function _swapApplyGroup(group) {
    const n = group.rows.length;
    group.spans.forEach((spans, k) => {
        const src = group.orig[(k + 1) % n];
        spans.forEach((el, i) => {
            const v = i < src.length ? src[i] : group.orig[k][i];
            if (v !== undefined) {
                el.textContent = v;
                el.classList.add('sx-swap-clue');
            }
        });
    });
}


// Restores every active swap group to its original clue order. Defers while a
// Clue Blackout is active so the blackout's own text snapshot/restore isn't
// fought over.
export function _restoreClueSwap() {
    if (globalThis._blackoutActive) {
        // Blackout in progress - retry shortly until it clears.
        globalThis._clueSwapRestoreTimer = setTimeout(_restoreClueSwap, 2000);
        return;
    }
    if (!globalThis._activeClueSwap) return;
    globalThis._activeClueSwap.groups.forEach(g => {
        g.spans.forEach((spans, k) => {
            spans.forEach((el, i) => {
                if (el.isConnected && g.orig[k][i] !== undefined) el.textContent = g.orig[k][i];
            });
        });
    });
    globalThis._activeClueSwap = null;
    document.querySelectorAll('.sx-swap-clue').forEach(el => el.classList.remove('sx-swap-clue'));
}


// TIER-SCALED Clue Swap timing - a duration factor anchored exactly at tier 8
// (8s / 10s / 12s unchanged there). Swapped clues read wrong, so a LONGER
// effect is harsher: low tiers restore fast, high tiers hold longer.
export const SWAP_DURATION_F = [0.85, 1.15]; // [tier1, tier16]


// Boss mechanic handler - phase variants over ROW clues:
//   P1 - Clue Swap: two rows exchange their clue numbers (original behaviour -
//        now actually swaps, operating on the real per-number spans).
//   P2 - Triple Shift: three rows' clues rotate one step.
//   P3 - Double Cross: two independent row pairs swap at once.
export function _mechClueSwap(monster, phase) {
    if (globalThis._blackoutActive || globalThis._activeClueScramble) return; // don't fight over clue text
    const rows = (cur && cur.grid) ? cur.grid.length : 0;
    if (rows < 2) return;

    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const swapNorm = _bossTierNorm(monster);
    let groups = [];
    if (p === 1) {
        const pick = _swapPickRows(rows, 2);
        if (pick) groups.push(_swapRowGroup(pick));
    } else if (p === 2) {
        const pick = _swapPickRows(rows, 3);
        if (pick) groups.push(_swapRowGroup(pick));
    } else {
        const pick = _swapPickRows(rows, 4);
        if (pick) {
            groups.push(_swapRowGroup([pick[0], pick[1]]));
            groups.push(_swapRowGroup([pick[2], pick[3]]));
        }
    }
    if (!groups.length) return;

    groups.forEach(g => _swapApplyGroup(g));

    const duration = Math.round((p === 1 ? 8000 : (p === 2 ? 10000 : 12000))
        * _bossTierFactor(swapNorm, SWAP_DURATION_F));
    const toastKey = p === 1 ? 'eg_mech_clue_swap'
        : (p === 2 ? 'eg_mech_clue_swap_triple' : 'eg_mech_clue_swap_double');
    globalThis.showCombatToast(t(toastKey).replace('{n}', duration / 1000));

    clearTimeout(globalThis._clueSwapRestoreTimer);
    globalThis._activeClueSwap = { groups };
    globalThis._clueSwapRestoreTimer = setTimeout(_restoreClueSwap, duration);
}


// Full cleanup - undoes any active swap immediately if one is pending.
// Called from _bossCleanup on boss death / encounter stop.
export function _removeClueSwap() {
    clearTimeout(globalThis._clueSwapRestoreTimer);
    globalThis._clueSwapRestoreTimer = null;
    if (globalThis._activeClueSwap) _restoreClueSwap();
}


// ── Frozen cell thaw time ────────────────────────────────────────────────────
export const FROZEN_CELL_LIFETIME_MS = 9000;    // P1/P2 thaw time (tier-8 base)
export const FROZEN_CELL_LIFETIME_P3_MS = 12000; // P3 - the deep freeze lasts longer
export const FROZEN_CREEP_DELAY_MS = 4500;     // P2 - when each initial freeze spawns its creeping child
export const FROZEN_CREEP_DELAY_P3_MS = 4000;  // P3 - the ice creeps faster
export const FROZEN_TELEGRAPH_MS = 1000;       // warning between the ghost ❄️ and the creep landing

// TIER-SCALED knobs - [tier1, tier16] endpoint pairs like Corrupt Cells
// (tier 8 lands on the pre-scaling values: 2/3/4 casts, 6/8 caps). Thaw time
// and creep delay are duration factors anchored at tier 8: low tiers thaw
// faster and creep slower; high tiers hold the freeze longer and creep sooner.
export const FROZEN_CAST_P1 = [1, 3]; // P1 static locks
export const FROZEN_CAST_P2 = [2, 4]; // P2 initial locks
export const FROZEN_CAST_P3 = [3, 5]; // P3 initial locks
// Max simultaneous frozen cells. Creep is single-generation (children never
// re-creep) so caps stay at initial count + children, and the field always
// thaws out completely afterwards.
export const FROZEN_CAP_P2 = [5, 7]; // 3 initial + up to 3 children at tier 8
export const FROZEN_CAP_P3 = [7, 9]; // 4 initial + up to 4 children at tier 8
export const FROZEN_LIFE_F = [0.85, 1.15];  // thaw-time factor [tier1, tier16]
export const FROZEN_CREEP_F = [1.2, 0.8];   // creep-delay factor [tier1, tier16]


// Resolved cast count for one phase at a given tier weight.
export function _frozenCastCount(p, norm) {
    const range = p >= 3 ? FROZEN_CAST_P3 : (p >= 2 ? FROZEN_CAST_P2 : FROZEN_CAST_P1);
    return Math.max(1, Math.round(_bossTierLerp(range, norm)));
}


// Resolved thaw time (ms) for one phase at a given tier weight.
export function _frozenLifeMs(p, norm) {
    const base = p >= 3 ? FROZEN_CELL_LIFETIME_P3_MS : FROZEN_CELL_LIFETIME_MS;
    return Math.max(2000, Math.round(base * _bossTierFactor(norm, FROZEN_LIFE_F)));
}


// Resolved creep delay (ms) - when an initial freeze spawns its child.
export function _frozenCreepDelayMs(p, norm) {
    const base = p >= 3 ? FROZEN_CREEP_DELAY_P3_MS : FROZEN_CREEP_DELAY_MS;
    return Math.max(800, Math.round(base * _bossTierFactor(norm, FROZEN_CREEP_F)));
}


// Returns all grid cells that are valid freeze targets - BOTH correct cells
// (sol=1, lockable until filled) and incorrect cells (sol=0, lockable until
// ✕-marked) that the player hasn't finished yet. Cells already frozen or
// corrupted are skipped.
export function _buildFreezableCellPool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const pool = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (_bossFrozen.has(`${r}-${c}`)) continue; // already frozen
            if (_bossCorrupted.has(`${r}-${c}`)) continue; // already corrupted
            if (sol[r][c] === 1) {
                // correct cell - lockable while still unfilled/unrevealed
                if (globalThis.userGrid[r][c] === 1 || globalThis.revealedGrid[r][c]) continue; // already filled
            } else if (sol[r][c] === 0) {
                // incorrect cell - lockable while not yet ✕-marked
                if (globalThis.userGrid[r][c] === 2) continue; // already marked
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
// re-creeps), norm: tier weight 0..1 } - children inherit the source's cfg.
//
// P1 - plain static freeze. P2+ - initial freezes each spawn one telegraphed
// "creeping frost" child mid-life (see _frozenCreepTick): the lock count can
// double while it lasts, but always fully thaws afterwards.
export function _applyCellFreeze(r, c, cfg) {
    const key = `${r}-${c}`;
    const el = document.getElementById(`g-${r}-${c}`);
    if (!el || _bossFrozen.has(key)) return;

    const p = (cfg && cfg.p) ? Math.max(1, Math.min(3, cfg.p)) : 1;
    const isChild = !!(cfg && cfg.child);
    const norm = (cfg && cfg.norm != null) ? cfg.norm : 0.5;
    const overlay = document.createElement('span');
    overlay.className = 'sx-freeze-overlay';
    overlay.id = `sx-freeze-${r}-${c}`;
    overlay.textContent = '❄️';
    el.appendChild(overlay);

    const data = {
        thawTimer: null, creepTimer: null, pending: null,
        cfg: { p, child: isChild, norm },
    };
    data.thawTimer = setTimeout(() => _removeCellFreeze(key), _frozenLifeMs(p, norm));
    if (p >= 2 && !isChild) {
        data.creepTimer = setTimeout(() => _frozenCreepTick(key), _frozenCreepDelayMs(p, norm));
    }
    _bossFrozen.set(key, data);
}


// Picks a random 4-neighbour of a frozen cell that can legally freeze next
// (correct or incorrect, unsolved, not already frozen, and not already
// marked as a pending creep target). Returns null when no neighbour
// qualifies.
export function _frozenPickNeighbor(r, c) {
    if (!cur || !cur.grid) return null;
    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const cands = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        if (sol[nr][nc] === 1) {
            if (globalThis.userGrid[nr][nc] === 1 || globalThis.revealedGrid[nr][nc]) continue; // correct cell already filled
        } else if (sol[nr][nc] === 0) {
            if (globalThis.userGrid[nr][nc] === 2) continue; // incorrect cell already ✕-marked
        } else {
            continue; // grid only holds 0/1
        }
        if (_bossFrozen.has(`${nr}-${nc}`)) continue;
        if (document.getElementById(`sx-freeze-tel-${nr}-${nc}`)) continue; // already telegraphed
        cands.push([nr, nc]);
    }
    if (!cands.length) return null;
    return cands[Math.floor(Math.random() * cands.length)];
}


// Cap of concurrent frozen cells for one phase at the field's tier weight.
export function _frozenCap(data) {
    const range = (data && data.cfg && data.cfg.p >= 3) ? FROZEN_CAP_P3 : FROZEN_CAP_P2;
    const norm = (data && data.cfg) ? data.cfg.norm : 0.5;
    return Math.max(1, Math.round(_bossTierLerp(range, norm)));
}


// Shows the ghosted ❄ on the target and lands the creep after the warning.
// Stored on the source entry so thawing the source cancels the pending creep.
export function _frozenTelegraphCreep(key, data, tr, tc) {
    const el = document.getElementById(`g-${tr}-${tc}`);
    if (!el) return;

    const tel = document.createElement('span');
    tel.className = 'sx-freeze-telegraph';
    tel.id = `sx-freeze-tel-${tr}-${tc}`;
    tel.textContent = '❄️';
    el.appendChild(tel);

    data.pending = {
        tr, tc,
        landTimer: setTimeout(() => _frozenCreepLand(key), FROZEN_TELEGRAPH_MS),
    };
}


// Lands a telegraphed creep. Re-validates everything (source still frozen,
// cap not exceeded, target still legal) so a mid-telegraph thaw, refill or
// grid swap can never freeze the wrong cell.
export function _frozenCreepLand(key) {
    const data = _bossFrozen.get(key);
    if (!data || !data.pending) return;
    const { tr, tc } = data.pending;
    data.pending = null;
    const tel = document.getElementById(`sx-freeze-tel-${tr}-${tc}`);
    if (tel) tel.remove();

    if (!_bossFrozen.has(key)) return;          // source thawed mid-telegraph
    if (!cur || !cur.grid) return;
    if (tr >= cur.grid.length || tc >= cur.grid[0].length) return; // grid swapped
    if (_bossFrozen.size >= _frozenCap(data)) return;          // cap reached meanwhile
    const sol = cur.grid;
    if (sol[tr][tc] === 1) {
        if (globalThis.userGrid[tr][tc] === 1 || globalThis.revealedGrid[tr][tc]) return;    // correct target filled meanwhile
    } else if (sol[tr][tc] === 0) {
        if (globalThis.userGrid[tr][tc] === 2) return;                            // incorrect target ✕-marked meanwhile
    } else {
        return;                                                        // grid swapped to a new shape
    }
    if (_bossFrozen.has(`${tr}-${tc}`)) return;

    _applyCellFreeze(tr, tc, { p: data.cfg.p, child: true, norm: data.cfg.norm });
    if (typeof showCombatToast === 'function') globalThis.showCombatToast(t('eg_frozen_spread'));
}


// One creep attempt from a frozen source: telegraphs a child when under the
// cap. Single-generation - the child never creeps again, so the field always
// thaws out completely.
export function _frozenCreepTick(key) {
    const data = _bossFrozen.get(key);
    if (!data) return;
    if (_bossFrozen.size < _frozenCap(data)) {
        const [r, c] = key.split('-').map(Number);
        const neighbor = _frozenPickNeighbor(r, c);
        if (neighbor) _frozenTelegraphCreep(key, data, neighbor[0], neighbor[1]);
    }
}


// Removes the freeze overlay from the DOM and clears its state entry -
// including any pending telegraphed creep (its ghost is removed too, so no
// orphan telegraph can outlive its source).
export function _removeCellFreeze(key) {
    const data = _bossFrozen.get(key);
    if (data) {
        clearTimeout(data.thawTimer);
        clearTimeout(data.creepTimer);
        if (data.pending) {
            clearTimeout(data.pending.landTimer);
            const tel = document.getElementById(`sx-freeze-tel-${data.pending.tr}-${data.pending.tc}`);
            if (tel) tel.remove();
            data.pending = null;
        }
    }
    const span = document.getElementById(`sx-freeze-${key}`);
    if (span) span.remove();
    _bossFrozen.delete(key);
}


// Removes all currently frozen cells. Called on boss death / encounter stop.
export function _clearAllFrozenCells() {
    Array.from(_bossFrozen.keys()).forEach(key => _removeCellFreeze(key));
}


// Returns true if the cell at (row, col) is currently frozen.
// Called from mouse-button-handlers.js before allowing a cell fill.
export function _isCellFrozen(row, col) {
    return _bossFrozen.has(`${row}-${col}`);
}


// Boss mechanic handler - phase variants (counts/caps/thaw/creep TIER-SCALED,
// anchored at tier 8):
//   P1 - Frozen Cells: static locks that thaw on their own (original).
//   P2 - Creeping Frost: each initial freeze spawns ONE telegraphed child on
//        a neighbour mid-life (field caps out, all auto-thaw).
//   P3 - Glacial Drift: locks last longer and creep faster.
export function _mechFrozenCells(monster, phase) {
    const pool = _buildFreezableCellPool();
    if (pool.length === 0) return;

    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const norm = _bossTierNorm(monster);
    const count = _frozenCastCount(p, norm);
    const targets = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));

    const toastKey = p >= 3 ? 'eg_mech_frozen_drift'
        : (p >= 2 ? 'eg_mech_frozen_creep' : 'eg_mech_frozen_cells');
    globalThis.showCombatToast(t(toastKey).replace('{n}', targets.length));
    targets.forEach(([r, c]) => _applyCellFreeze(r, c, { p, child: false, norm }));
}


// Removes the invert filter from the puzzle table and clears its timer.
export function _removeGridInvert() {
    clearTimeout(globalThis._gridInvertTimer);
    globalThis._gridInvertTimer = null;
    const tbl = document.getElementById('ptable');
    if (tbl) tbl.classList.remove('sx-grid-invert');
}


// Boss mechanic handler - applies the Inversion Field for a phase-scaled duration.
export function _mechGridInvert(monster, phase) {
    if (globalThis._gridInvertTimer) return; // already active
    const tbl = document.getElementById('ptable');
    if (!tbl) return;

    tbl.classList.add('sx-grid-invert');

    const duration = phase >= 3 ? 9000 : 6000;
    Audio_Manager.playSFX('grid_invert');
    globalThis.showCombatToast(t('eg_mech_grid_invert').replace('{n}', duration / 1000));
    globalThis._gridInvertTimer = setTimeout(_removeGridInvert, duration);
}


export const BLAST_WARN_MS = 1500;


export const BLAST_ACTIVE_MS = 5000;


export const BLAST_DAMAGE_PCT = 0.30;


// Readability/fairness knobs for the shared screen-blast engine. Every boss
// that drives it through _runScreenBlast gets the same timeline language:
//   1. the countdown ticks through the WARNING phase (seconds until the blast
//      goes live) and resets at the impact flash to count the hold window;
//   2. the last BLAST_LASTCALL_MS of the hold window turn the countdown
//      red and set the zone border flashing - the resolve is imminent;
//      the WARNING, HOLD and LAST-CALL windows are TIER-SCALED
//      (BLAST_TIER_*_F): low-tier bosses give more time to react,
//      high-tier ones stay brutal - tier 8 is the anchor (factor 1.0);
//   3. shrinking zones (Heat Death / Overfit Bloom) reach their final radius
//      at BLAST_SHRINK_SETTLE of the window and HOLD it, so what the player
//      sees for the final seconds is exactly what the resolve check uses;
//   4. a bottom status line mirrors the crush-walls label idiom: GET INSIDE /
//      IN THE ZONE / LAST-CHECK, plus ✓/✗ resolve flashes.
export const BLAST_LASTCALL_MS = 1500; // anchor last-call window (tier 8)
export const BLAST_SHRINK_SETTLE = 0.85;
export const BLAST_TRANSITION_FLASH_MS = 160;
export const BLAST_CHARGE_MS = 550; // ghost destination charges up right before the jump

// Screen-blast timeline scaling - same [tier1, tier16] endpoint pattern as the
// corruption caps. Each pair is the DURATION MULTIPLIER at tier 1 (gentle:
// more warning / longer hold / longer last call) vs tier 16 (brutal: all of
// them shorter). Tier 8 (norm = 7/15) is the anchor where the factor is
// exactly 1.0, so the pre-scaling timing is unchanged for mid-tier bosses.
export const BLAST_TIER_WARN_F = [1.22, 0.75];     // warning window
export const BLAST_TIER_HOLD_F = [1.21, 0.76];     // hold (active) window
export const BLAST_TIER_LASTCALL_F = [1.26, 0.70]; // last-call urgency window

// Tier factor for one blast knob: exactly 1 at the tier-8 anchor, >1 on
// gentle tiers, <1 on brutal tiers. Callers without a boss (no opts.tierNorm)
// get factor 1 - the engine keeps its exact current timing outside boss
// fights.
export function _blastTierFactor(norm, range) {
    return _bossTierFactor(norm, range);
}


// The older per-boss nk dodge engines (band slams, storms, shrapnel, chase
// orbs, etc.) share ONE difficulty curve through _nkNewRun: their internal
// clock runs on _bossTierFactor(norm, NK_TIER_FACTOR) - the same
// [tier1, tier16] timing-multiplier family as the blast warning window.
// Tier 8 is the anchor (factor 1.0, pre-scaling timing untouched). DoT
// damage is counter-scaled in _nkDotTick so only TIMING moves, never DPS.
export const NK_TIER_FACTOR = [1.22, 0.75];


// Failed-dodge DAMAGE companion to the timing curve above: the %maxHP hit
// (and DoT %/s) of a failed nk dodge is gentler at low tier and harsher at
// high tier, keeping the timing curve company. Tier 8 is the anchor (×1.0)
// - pre-scaling damage unchanged for mid-tier bosses. Endpoints: tier 1
// deals 85% of the tuned percent, tier 16 deals 120%.
export const NK_DAMAGE_TIER = [0.85, 1.20];


// Tier damage multiplier for a failed-dodge hit/DoT, resolved from the boss
// level the callers already pass in (the same source _nkNewRun uses for
// the timing factor). Unknown/zero levels → factor 1 (unchanged).
// Failing a telegraphed, avoidable mechanic must hurt: every boss-ability hit
// (point hits, DoT ticks and blast circles) is multiplied by this, but one
// hit is never boosted past NK_FAIL_HIT_CAP of max life (a boss that
// already hits that hard keeps its own value).
export const NK_FAIL_MULT = 2.0;
export const NK_FAIL_HIT_CAP = 0.65;
export function _nkBoostFailedDodge(raw, maxHp) {
    const boosted = raw * NK_FAIL_MULT;
    return Math.min(boosted, Math.max(raw, (Number(maxHp) || 0) * NK_FAIL_HIT_CAP));
}

export function _nkTierDamageFactor(level) {
    if (!level || !(level > 0)) return 1;
    return _bossTierFactor(_bossTierNorm({ level }), NK_DAMAGE_TIER);
}


// Picks a screen position for a zone, biased away from edges so the circle
// is always fully visible and reachable.
export function _blastPickPos(radius) {
    const margin = radius + 40;
    const x = margin + Math.random() * Math.max(1, window.innerWidth - margin * 2);
    const y = margin + Math.random() * Math.max(1, window.innerHeight - margin * 2);
    return { x, y };
}


// Returns true if the player character sprite is inside the safe zone.
// Entropy's Heat Bloom (and all generic blasts) are dodge mechanics where the
// player must move their draggable avatar sprite - not the class HUD - into
// the circle. Uses the tight sprite image rect (hazard-style) with tolerance.
export function _blastHudInZone(zone) {
    const rect = _blastGetPlayerRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return false;
    const closestX = Math.max(rect.left, Math.min(zone.x, rect.right));
    const closestY = Math.max(rect.top, Math.min(zone.y, rect.bottom));
    const dx = closestX - zone.x;
    const dy = closestY - zone.y;
    const tolerance = 8; // visual border + glow forgiveness
    return Math.sqrt(dx * dx + dy * dy) <= zone.radius + tolerance;
}


// Tight hitbox derived from the visible avatar sprite image, not the wrapper.
// Mirrors the hazard system's _hzPlayerRect logic: the wrapper is taller than
// the artwork (HP/charge bars), so using its bounds misaligns collision.
// Falls back to HUD only if no avatar is present (non-endgame screen).
export function _blastGetPlayerRect() {
    // Reuse the hazard helper if it is already loaded for exact parity
    if (typeof _hzPlayerRect === 'function') {
        const hr = _hzPlayerRect();
        if (hr && hr.width && hr.height) return hr;
    }
    if (typeof _hzPlayerSpriteRect === 'function') {
        const sr = _hzPlayerSpriteRect();
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


// DOM helpers - each blast gets uniquely suffixed elements.
export function _blastGetOverlay(id) {
    let el = document.getElementById(`sx-blast-overlay-${id}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `sx-blast-overlay-${id}`;
        document.body.appendChild(el);
    }
    return el;
}


export function _blastPositionCircle(el, zone) {
    el.style.left = zone.x + 'px';
    el.style.top = zone.y + 'px';
    el.style.width = (zone.radius * 2) + 'px';
    el.style.height = (zone.radius * 2) + 'px';
    el.style.marginLeft = (-zone.radius) + 'px';
    el.style.marginTop = (-zone.radius) + 'px';
}


export function _blastGetCircle(id, idx, zone) {
    let el = document.getElementById(`sx-blast-circle-${id}-${idx}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `sx-blast-circle-${id}-${idx}`;
        document.body.appendChild(el);
    }
    _blastPositionCircle(el, zone);
    return el;
}


export function _blastGetCountdownLabel(id, zone) {
    let el = document.getElementById(`sx-blast-countdown-${id}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `sx-blast-countdown-${id}`;
        document.body.appendChild(el);
    }
    // Mirror the real circle's position so the number sits centred inside it
    el.style.left = zone.x + 'px';
    el.style.top = zone.y + 'px';
    return el;
}


export function _blastGetGhost(id, pos, radius) {
    let el = document.getElementById(`sx-blast-ghost-${id}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `sx-blast-ghost-${id}`;
        document.body.appendChild(el);
    }
    _blastPositionCircle(el, { x: pos.x, y: pos.y, radius });
    return el;
}


// Bottom-centre status line for one blast (mirrors the crush-walls label).
// Lives for the blast's duration; hidden unless the engine paints it.
export function _blastGetStatus(id) {
    let el = document.getElementById(`sx-blast-status-${id}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `sx-blast-status-${id}`;
        el.className = 'sx-blast-status sx-blast-status-hidden';
        el.textContent = '';
        document.body.appendChild(el);
    }
    return el;
}


// Removes every element and timer belonging to one blast.
export function _blastTeardown(id) {
    const state = _activeBlasts.get(id);
    if (state) {
        state.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
        if (state.poll) clearInterval(state.poll);
        _activeBlasts.delete(id);
    }
    [
        `sx-blast-overlay-${id}`, `sx-blast-countdown-${id}`, `sx-blast-ghost-${id}`,
        `sx-blast-status-${id}`,
        `sx-blast-circle-${id}-0`, `sx-blast-circle-${id}-1`, `sx-blast-circle-${id}-2`,
    ].forEach(elId => { const el = document.getElementById(elId); if (el) el.remove(); });
}


// Tears down ALL active blasts. Called from _bossCleanup on boss death /
// encounter stop so no overlay can outlive its boss.
export function _blastTeardownAll() {
    Array.from(_activeBlasts.keys()).forEach(id => _blastTeardown(id));
}


// Runs one full blast sequence with the given options (see block comment).
// Timeline language (shared by every caller):
//   WARNING  - circles + ghost appear; the in-zone countdown ticks DOWN to the
//              live moment so the player knows exactly when the blast starts.
//   IMPACT   - a bright flash marks the warning → active switch, then the
//              blackout holds and the countdown resets to the hold window.
//   HOLD     - stand in the real zone until resolve. Shrinking zones settle at
//              their final radius at 85% of the window, the last 1.5s flash the
//              zone/countdown red (LAST CALL), and a bottom status line says
//              whether you are inside or must move.
//   RESOLVE  - ✓/✗ flash on the zone + status line, brief pause, teardown.
export function _runScreenBlast(opts) {
    // Never stack two blasts - the last thing the player needs is two
    // overlapping blackout screens fighting over the same dodge.
    if (_activeBlasts.size > 0) return;

    // Module era: _blastSeq is owned by endgame-state.js (live globalThis
    // accessor); a bare ++ would illegally reassign the entry's import
    // binding and fail the build. globalThis routes through the accessor.
    const id = ++globalThis._blastSeq;
    const state = { timers: [], poll: null, t0: Date.now(), live: false, activeAt: null };
    _activeBlasts.set(id, state);

    // Tier-scaled timeline: the boss's atlas tier (opts.tierNorm, 0–1)
    // multiplies the warning, hold and last-call windows. No tierNorm
    // (non-boss callers) → factor 1 → exact current timing.
    const tierF = {
        warn: _blastTierFactor(opts.tierNorm, BLAST_TIER_WARN_F),
        hold: _blastTierFactor(opts.tierNorm, BLAST_TIER_HOLD_F),
        last: _blastTierFactor(opts.tierNorm, BLAST_TIER_LASTCALL_F),
    };
    const warnMs = Math.max(600, Math.round((opts.warnMs != null ? opts.warnMs : BLAST_WARN_MS) * tierF.warn));
    const activeMs = Math.max(1200, Math.round((opts.activeMs != null ? opts.activeMs : BLAST_ACTIVE_MS) * tierF.hold));
    const lastcallMs = Math.max(700, Math.round(BLAST_LASTCALL_MS * tierF.last));
    // Rewrite Fate's mid-window jump keeps its proportional spot inside the
    // (possibly scaled) hold window - relocate at 55% stays 55%.
    const relocateAtMs = opts.relocateAtMs != null
        ? Math.max(0, Math.round(opts.relocateAtMs * tierF.hold)) : null;
    const damagePct = opts.damagePct != null ? opts.damagePct : BLAST_DAMAGE_PCT;
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

    // Bottom status line - painted by the poll/resolve; hidden until then.
    const statusEl = _blastGetStatus(id);
    const statusCache = { mode: 'idle', arg: null };
    const paintStatus = (mode, arg) => {
        if (statusCache.mode === mode && statusCache.arg === arg) return;
        statusCache.mode = mode;
        statusCache.arg = arg;
        let text = '';
        let cls = 'sx-blast-status-hidden';
        if (mode === 'in') { text = t('eg_blast_inside'); cls = 'sx-blast-status-ok'; }
        else if (mode === 'out') { text = t('eg_blast_get_inside'); cls = 'sx-blast-status-warn'; }
        else if (mode === 'final') { text = t('eg_blast_lastcall'); cls = 'sx-blast-status-danger'; }
        else if (mode === 'ok') { text = t('eg_blast_dodged'); cls = 'sx-blast-status-ok'; }
        else if (mode === 'hit') { text = t('eg_blast_hit').replace('{n}', arg); cls = 'sx-blast-status-danger'; }
        statusEl.textContent = text;
        statusEl.className = 'sx-blast-status ' + cls;
    };

    // ── Warning phase: red tint fades in, all candidate zones appear ────────
    const overlay = _blastGetOverlay(id);
    overlay.className = 'sx-blast-overlay sx-blast-warning';
    if (opts.accent) overlay.style.setProperty('--blast-accent', accent);

    zones.forEach((z, i) => {
        const circle = _blastGetCircle(id, i, z);
        circle.className = 'sx-blast-circle' + (i === realIndex ? '' : ' sx-blast-fake');
        // Prior Collapse tell: the REAL zone sparkles throughout the warning
        // so the choice is always readable - never a coin flip.
        if (opts.revealFakeAtActive && i === realIndex) circle.classList.add('sx-blast-true');
        circle.style.setProperty('--blast-accent', accent);
    });

    let ghostEl = null;
    if (opts.ghost) {
        ghostEl = _blastGetGhost(id, opts.ghost, startRadius);
        ghostEl.className = 'sx-blast-ghost';
        ghostEl.style.setProperty('--blast-accent', accent);
    }

    const label = _blastGetCountdownLabel(id, real);
    label.className = 'sx-blast-countdown';
    label.style.setProperty('--blast-accent', accent);
    label.textContent = Math.max(1, Math.ceil(warnMs / 1000)); // counts down to impact

    if (opts.toastKey && typeof showCombatToast === 'function') globalThis.showCombatToast(t(opts.toastKey));

    // ── 100ms driver: warning countdown, then hold-window state ─────────────
    state.poll = setInterval(() => {
        if (!state.live) {
            // Warning countdown - seconds until the blast goes live.
            const remWarn = Math.max(0, Math.ceil((warnMs - (Date.now() - state.t0)) / 1000));
            const lbl = document.getElementById(`sx-blast-countdown-${id}`);
            if (lbl) lbl.textContent = remWarn;
            return;
        }

        const elActive = Date.now() - state.activeAt;
        const progress = Math.min(1, elActive / activeMs);

        // Shrinking blooms (Heat Death / Overfit Bloom): reach the final radius
        // at BLAST_SHRINK_SETTLE of the window and HOLD it - the resolve
        // check then matches exactly what the player sees for the last seconds.
        if (shrinkTo != null) {
            const settle = Math.min(1, progress / BLAST_SHRINK_SETTLE);
            real.radius = Math.round(startRadius + (shrinkTo - startRadius) * settle);
            _blastPositionCircle(_blastGetCircle(id, realIndex, real), real);
        }

        const remainingMs = Math.max(0, activeMs - elActive);
        const lbl = document.getElementById(`sx-blast-countdown-${id}`);
        if (lbl) {
            lbl.textContent = Math.ceil(remainingMs / 1000);
            lbl.classList.toggle('sx-blast-urgent', remainingMs <= lastcallMs);
        }

        const inZone = _blastHudInZone(real);
        const circle = document.getElementById(`sx-blast-circle-${id}-${realIndex}`);
        if (circle && !circle.classList.contains('sx-blast-collapsed')) {
            circle.classList.toggle('sx-blast-safe', inZone);
            circle.classList.toggle('sx-blast-lastcall', !inZone && remainingMs <= lastcallMs);
        }

        // Rewrite Fate: the destination ghost charges up right before the jump,
        // so the move never lands without warning.
        if (relocateAtMs != null && ghostEl) {
            const untilJump = relocateAtMs - elActive;
            ghostEl.classList.toggle('sx-blast-ghost-charge',
                untilJump > 0 && untilJump <= BLAST_CHARGE_MS);
        }

        if (remainingMs <= lastcallMs) paintStatus(inZone ? 'in' : 'final');
        else paintStatus(inZone ? 'in' : 'out');
    }, 100);

    // ── Active phase: impact flash, blackout, hold window starts ────────────
    schedule(() => {
        state.live = true;
        state.activeAt = Date.now();

        // Bright impact flash marks the exact warning → active boundary.
        overlay.classList.remove('sx-blast-warning');
        overlay.classList.add('sx-blast-impact');

        // The blast going live is felt as well as seen: a subtle whole-screen
        // shake rides the impact flash.
        const shakeBody = document.body;
        shakeBody.classList.remove('sx-screen-shake');
        void shakeBody.offsetWidth; // restart if a shake is still running
        shakeBody.classList.add('sx-screen-shake');
        schedule(() => shakeBody.classList.remove('sx-screen-shake'), 550);

        schedule(() => {
            overlay.classList.remove('sx-blast-impact');
            overlay.classList.add('sx-blast-active');
        }, BLAST_TRANSITION_FLASH_MS);

        // Prior Collapse: the fake zones visibly collapse the instant the
        // blast hits - by then the player has had the whole warning to note
        // which zone carried the tell.
        if (opts.revealFakeAtActive) {
            zones.forEach((z, i) => {
                if (i === realIndex) return;
                const c = document.getElementById(`sx-blast-circle-${id}-${i}`);
                if (c) {
                    c.classList.add('sx-blast-collapsed');
                    schedule(() => c.remove(), 500);
                }
            });
        }

        // Countdown now counts the hold window (it counted the warning down).
        const lbl = document.getElementById(`sx-blast-countdown-${id}`);
        if (lbl) lbl.textContent = Math.ceil(activeMs / 1000);

        // Rewrite Fate: mid-window jump to the pre-shown ghost position.
        if (relocateAtMs != null && ghostEl) {
            schedule(() => {
                real = { x: opts.ghost.x, y: opts.ghost.y, radius: real.radius };
                const circle = _blastGetCircle(id, realIndex, real);
                circle.classList.add('sx-blast-jump');
                schedule(() => circle.classList.remove('sx-blast-jump'), 400);
                const l2 = document.getElementById(`sx-blast-countdown-${id}`);
                if (l2) { l2.style.left = real.x + 'px'; l2.style.top = real.y + 'px'; }
                if (ghostEl) ghostEl.remove();
            }, relocateAtMs);
        }

        // ── Resolve: check position, apply damage, tear down ────────────────
        schedule(() => {
            if (state.poll) { clearInterval(state.poll); state.poll = null; }
            if (shrinkTo != null) {
                real.radius = shrinkTo;
                _blastPositionCircle(_blastGetCircle(id, realIndex, real), real);
            }

            const survived = _blastHudInZone(real);
            const circle = document.getElementById(`sx-blast-circle-${id}-${realIndex}`);
            if (circle) circle.classList.add(survived ? 'sx-blast-survived' : 'sx-blast-hit');

            if (!survived) {
                // Percentage of max HP - survivable even at full health, but it
                // stings enough that ignoring the mechanic loses fights.
                const damage = Math.round(_nkBoostFailedDodge(globalThis.playerMaxHP * damagePct, globalThis.playerMaxHP));
                const shielded = _nkShieldUp();
                const dealt = typeof _playerTakeDamage === 'function'
                    ? _playerTakeDamage(damage, true, null, null, { isBossAbility: true }) : 0;
                _nkLastHitAbsorbed = shielded && dealt <= 0;
                if (dealt > 0 && typeof _applyPlayerHitFeedback === 'function') {
                    _applyPlayerHitFeedback(dealt);
                }
                // Named, localized feedback toast: damage when the hit landed,
                // a shield-absorbed toast when the absorption shield ate it
                // whole - never a misleading "hit for 0". Callers pass their
                // boss/ability names.
                if (dealt > 0 || _nkLastHitAbsorbed) {
                    _nkAbilityHitToast(dealt, opts.bossName || null, opts.abilityName || null);
                    if (dealt > 0) paintStatus('hit', dealt);
                }
            } else {
                globalThis.showCombatToast(t('eg_blast_dodged'), '#4ade80');
                paintStatus('ok');
            }

            // Brief resolve pause so the outcome flash is readable
            schedule(() => _blastTeardown(id), 500);
        }, activeMs);
    }, warnMs);
}


export const _nkRuns = new Map(); // runId → { bossId, dodge, raf, timers, els, dotAcc }


export let _nkSeq = 0;


// True while any dodge run, crush corridor or screen blast is active.
export function _nkDodgeBusy() {
    if (typeof window._crushState !== 'undefined' && window._crushState) return true;
    if (typeof _activeBlasts !== 'undefined' && _activeBlasts.size > 0) return true;
    for (const r of _nkRuns.values()) if (r.dodge && !r.passive) return true;
    return false;
}


export function _nkNewRun(bossId, isDodge) {
    const id = ++_nkSeq;
    const run = { id, bossId: bossId || null, dodge: !!isDodge, raf: 0, timers: [], els: [], dotAcc: 0 };
    // Tier scaling for DODGE runs: the run's internal clock advances on a
    // scaled dtS (see _nkLoop), so every per-boss nk hazard - slam bands,
    // storms, shrapnel, chase orbs, weather watchers (Puddle), garden
    // watchers (Sprout) - shares the screen-blast difficulty curve.
    // Non-dodge runs (shields, summons, buff enrage) keep real-time timing.
    // PERSISTENT WATCHERS (Puddle/Sprout/Bumper/Marksman gauntlet-watcher):
    // they want the tier clock but must NOT count as an active set-piece -
    // a forever-alive dodge run would trip _nkDodgeBusy() and permanently
    // block scheduled mechanics (sproutlings, fog bank) and other bosses'
    // set-pieces. They set run.passive = true right after creation; the
    // tierFactor lookup below runs on the same tick either way.
    run.tierFactor = 1;
    if (run.dodge && bossId && typeof _monsters !== 'undefined') {
        try {
            const m = globalThis._monsters.find(x => x && x.id === bossId);
            if (m) run.tierFactor = _bossTierFactor(_bossTierNorm(m), NK_TIER_FACTOR);
        } catch (e) {}
    }
    _nkRuns.set(id, run);
    return run;
}


export function _nkEl(run, tag, cls, text) {
    const el = document.createElement(tag || 'div');
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    document.body.appendChild(el);
    run.els.push(el);
    return el;
}


export function _nkKillRun(run) {
    if (!run) return;
    if (run.raf) cancelAnimationFrame(run.raf);
    run.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    run.els.forEach(el => { try { el.remove(); } catch (e) {} });
    // Optional per-run teardown (e.g. restoring a boss sprite that a
    // mechanic translated) - fired on EVERY kill path, including boss death
    // and encounter stop, so callers can never leak a mid-animation state.
    if (typeof run.onKill === 'function') {
        try { run.onKill(); } catch (e) {}
    }
    _nkRuns.delete(run.id);
}


// Cancels only runs owned by one boss - add deaths must never nuke the
// boss's own active mechanic. Called from _bossCleanup.
export function _nkTeardownBoss(bossId) {
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === bossId) _nkKillRun(r);
    });
    document.querySelectorAll('.sx-nk-shielded').forEach(el => el.classList.remove('sx-nk-shielded'));
}


export function _nkTeardownAll() {
    Array.from(_nkRuns.values()).forEach(_nkKillRun);
    document.querySelectorAll('.sx-nk-shielded').forEach(el => el.classList.remove('sx-nk-shielded'));
}


// Pause / encounter / death guard - loops freeze instead of advancing.
export function _nkFrozen() {
    if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return true;
    if (typeof _isActive === 'function' && !_isActive()) return true;
    if (typeof dead !== 'undefined' && globalThis.dead) return true;
    return false;
}


export function _nkBossAlive(bossId) {
    if (!bossId || typeof _monsters === 'undefined') return true;
    return !!globalThis._monsters.find(m => m.id === bossId);
}


// Pause-safe rAF driver. tick(dtS, now) returns true to continue.
// Boss death ends the run silently (visuals vanish with their owner).
export function _nkLoop(run, tick) {
    let last = performance.now();
    const step = (now) => {
        if (!_nkRuns.has(run.id)) return;
        if (!_nkBossAlive(run.bossId)) { _nkKillRun(run); return; }
        if (_nkFrozen()) {
            last = now;
            run.raf = requestAnimationFrame(step);
            return;
        }
        const rawDt = Math.max(0, Math.min(0.05, (now - last) / 1000));
        last = now;
        // Dodge runs advance on the tier-scaled clock: factor >1 makes the
        // internal clock run SLOWER than real time, so the fixed warn/duration
        // thresholds are reached later in real ms - gentle tiers get more time.
        // factor <1 runs it faster - brutal tiers get less. Non-dodge runs
        // (shields, summons) always use real time.
        const dtS = (run.dodge && run.tierFactor && run.tierFactor !== 1)
            ? rawDt / run.tierFactor : rawDt;
        let cont = true;
        try { cont = tick(dtS, now); } catch (e) { console.warn('nk loop tick error:', e); cont = false; }
        if (cont && _nkRuns.has(run.id)) run.raf = requestAnimationFrame(step);
        else _nkKillRun(run);
    };
    run.raf = requestAnimationFrame(step);
}


export function _nkPlayerRect() {
    if (typeof _blastGetPlayerRect === 'function') {
        const r = _blastGetPlayerRect();
        if (r && (r.width || r.height)) return r;
    }
    if (typeof _hzPlayerHitbox === 'function') {
        const r = _hzPlayerHitbox();
        if (r) return r;
    }
    return null;
}


export function _nkPlayerCenter() {
    const r = _nkPlayerRect();
    if (!r) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}


export function _nkMaxHP() {
    return (typeof playerMaxHP !== 'undefined' && globalThis.playerMaxHP > 0) ? globalThis.playerMaxHP : 100;
}


export function _nkCircleHit(x, y, r, pr, pad) {
    if (!pr) return false;
    const p = pad || 0;
    const cx = Math.max(pr.left, Math.min(x, pr.right));
    const cy = Math.max(pr.top, Math.min(y, pr.bottom));
    const dx = cx - x, dy = cy - y;
    return Math.sqrt(dx * dx + dy * dy) <= r + p;
}


export function _nkRectsOverlap(a, b) {
    return !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}


// Rendered-box hit test for small translated projectile dots (embers, orbs,
// saws, wisps, ...): collision uses the dot's ACTUAL painted box (+2px
// forgiveness) rather than an idealized circle, so visible contact always
// registers and CSS motion can't skew the hitbox.
export function _nkDotHit(el, pr, pad) {
    if (!el || !pr) return false;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const p = (pad == null) ? 2 : pad;
    return _nkRectsOverlap(
        { left: r.left - p, right: r.right + p, top: r.top - p, bottom: r.bottom + p },
        pr
    );
}


// True while the absorption shield has charge left. Checked BEFORE a boss-
// ability hit is applied so a fully-absorbed hit (dealt 0 because the shield
// ate everything) can be told apart from other zero-damage cases (godmode,
// inactive encounter) after the fact.
export function _nkShieldUp() {
    return typeof _playerAbsorptionCurrent !== 'undefined' && globalThis._playerAbsorptionCurrent > 0;
}


// Set by _nkHit and the screen-blast engine right after applying damage:
// true when that hit was fully eaten by the absorption shield. Consumed by
// _nkAbilityHitToast in the same synchronous frame, so it can never leak
// into a later toast.
export let _nkLastHitAbsorbed = false;


// Direct %maxHP hit through the normal intake (resists apply). The percent
// itself is tier-scaled (_nkTierDamageFactor) so failed dodges sting less
// on gentle bosses and harder on brutal ones - the damage companion to the
// NK_TIER_FACTOR timing curve.
export function _nkHit(pct, element, level) {
    const shielded = _nkShieldUp();
    const dmg = Math.max(1, Math.round(_nkBoostFailedDodge(_nkMaxHP() * pct * _nkTierDamageFactor(level), _nkMaxHP())));
    const dealt = (typeof _playerTakeDamage === 'function')
        ? _playerTakeDamage(dmg, true, element || null, level || 1, { isBossAbility: true }) : 0;
    _nkLastHitAbsorbed = shielded && dealt <= 0;
    if (dealt > 0 && typeof _applyPlayerHitFeedback === 'function') {
        try { _applyPlayerHitFeedback(dealt); } catch (e) {}
    }
    return dealt;
}


// Distance from point (px,py) to segment (ax,ay)-(bx,by).
// Shared since the Tier 7 Colossus rework (was _infernoPtSegDist in
// boss-inferno.js; also used by Clock, Guardian, Kraken, Oblivion and the
// Colossus rework's rock chutes).
export function _ptSegDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const f = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    return Math.hypot(px - (ax + dx * f), py - (ay + dy * f));
}


// DoT chunking: accumulates fractional damage, applies whole-HP ticks.
export function _nkDotTick(run, pctPerSec, dtS, level, element) {
    // dtS arrives already clock-scaled from _nkLoop (real / tierFactor);
    // multiply it back out so the DoT's DPS is independent of the TIMING
    // curve. The percent-per-second itself is tier-scaled (same damage
    // companion as _nkHit) - so only the damage knob moves here, never
    // the clock.
    const realDt = dtS * ((run && run.tierFactor) || 1);
    const dmgF = _nkTierDamageFactor(level);
    run.dotAcc = (run.dotAcc || 0) + (_nkMaxHP() * pctPerSec * dmgF * NK_FAIL_MULT / 100) * realDt;
    const unit = Math.max(1, _nkMaxHP() * 0.01);
    if (run.dotAcc >= unit) {
        const tick = Math.floor(run.dotAcc);
        run.dotAcc -= tick;
        if (typeof _playerTakeDamage === 'function') {
            _playerTakeDamage(tick, true, element || null, level || 1, { isBossAbility: true });
        }
    }
}


// Failed-dodge feedback toast for a NAMED boss ability, decided by damage:
//   dealt > 0 → silent (damage taken is never shown in the combat toast)
//   dealt == 0 + absorption flag (from _nkHit / the blast engine) →
//     "🛡️ absorbed by your shield!" - never a misleading "hit for 0".
//   dealt == 0 without absorption (godmode, inactive encounter) → silent.
// bossName may be null; abilityName reads after it. Element bosses use the
// canonical damage-number palette; elementless ones (Brutus, The Minotaur, ...)
// get a fixed signature color from NK_BOSS_SIGNATURE_COLORS.
export const NK_ELEMENT_TOAST_COLORS = {
    fire: '#ff3b1f', cold: '#6ecbff', lightning: '#ffe536', shadow: '#c084ff',
};
export const NK_BOSS_SIGNATURE_COLORS = {
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
export function _nkBossToastColor(bossName) {
    if (bossName && NK_BOSS_SIGNATURE_COLORS[bossName]) {
        return NK_BOSS_SIGNATURE_COLORS[bossName];
    }
    if (bossName && typeof BOSS_DEFS !== 'undefined') {
        for (const key in BOSS_DEFS) {
            const d = BOSS_DEFS[key];
            if (d && d.name === bossName && d.element
                && NK_ELEMENT_TOAST_COLORS[d.element]) {
                return NK_ELEMENT_TOAST_COLORS[d.element];
            }
        }
    }
    return '#f87171'; // classic damage red
}

// eg_ability_hit / eg_ability_absorbed templates ({ability} / {n}); falls
// back to the English literal when t() is unavailable. The absorbed flag is
// consumed here so it can never leak into a later toast.
// quiet = skip the on-screen toast (for repeating contact hits that would
// spam it); the dev fight log and the absorbed-flag reset still happen.
export function _nkAbilityHitToast(dealt, bossName, abilityName, quiet) {
    // Dev fight log: names the hit that _playerTakeDamage just recorded.
    if (typeof globalThis.__fightLogAbility === 'function') globalThis.__fightLogAbility(dealt, bossName, abilityName);
    const ability = (bossName ? bossName + '’s ' : '') + abilityName;
    const absorbed = _nkLastHitAbsorbed;
    _nkLastHitAbsorbed = false;
    if (quiet) return;
    // Damage taken is never shown in the combat toast (the floating hit number on
    // the avatar already covers it); only the shield-absorbed outcome is toasted.
    if (dealt > 0) return;
    if (absorbed) {
        let msg = '🛡️ ' + ability + ' absorbed by your shield!';
        try {
            const raw = t('eg_ability_absorbed');
            if (raw && raw !== 'eg_ability_absorbed' && raw.indexOf('{ability}') !== -1) {
                msg = raw.replace('{ability}', ability);
            }
        } catch (e) {}
        // Shield feedback stays uniform blue - the color codes the outcome,
        // not the boss, so an absorbed hit is recognizable on its own.
        if (typeof showCombatToast === 'function') globalThis.showCombatToast(msg, '#7dd3fc');
    }
}


export function _nkToast(key, fallback, color) {
    let msg = fallback;
    try {
        const raw = t(key);
        if (raw && raw !== key) msg = raw;
    } catch (e) {}
    // Translated templates may carry a {n} placeholder (e.g. eg_blast_hit:
    // "hits you for {n} HP!"). The per-boss nk engines bake the value into
    // the fallback string instead of passing it separately - pull the first
    // number out of the fallback and substitute it, so the LOCALIZED text
    // keeps the damage number (previously the raw "{n}" leaked into the
    // toast on every failed dodge). Keys without placeholders are untouched.
    if (msg.indexOf('{n}') !== -1) {
        const m = String(fallback).match(/-?\d+(?:\.\d+)?/);
        if (m) msg = msg.replace('{n}', m[0]);
    }
    if (typeof showCombatToast === 'function') return globalThis.showCombatToast(msg, color);
}


//------------------------------------------------------------------------
//-------------------SHARED GROUND-SHATTER BURST (BAND MECHANICS)----------
//------------------------------------------------------------------------
// Band-slam eruption (Brutus ground slam, Juggernaut/Minotaur bull rushes):
// jagged fissures + rock shards + dust burst from the struck band. The burst
// is a body-level overlay (pointer-events: none, tracked on the run's element
// list) so pieces keep animating after the band flash fades; encounter cleanup
// removes them with the run. CSS in bosses2.css (.sx-slam-* rules).


// Random-walk fissures across the band: 2–3 main cracks running left → right
// plus short branch cracks hanging off their interior vertices. Returns SVG
// path strings with a `core` flag (main cracks draw brighter/thicker).
export function _nkSlamPaths(w, h) {
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
export function _nkSlamShatter(band, run) {
    const rect = band.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const w = rect.width, h = rect.height;

    const burst = document.createElement('div');
    burst.className = 'sx-slam-burst';
    burst.style.left = Math.round(rect.left) + 'px';
    burst.style.top = Math.round(rect.top) + 'px';
    burst.style.width = Math.round(w) + 'px';
    burst.style.height = Math.round(h) + 'px';
    document.body.appendChild(burst);
    if (run && run.els) run.els.push(burst);

    // Fissures - drawn in quickly, then the whole svg fades with the burst.
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'sx-slam-cracks');
    svg.setAttribute('viewBox', '0 0 ' + Math.max(10, Math.round(w)) + ' ' + Math.max(10, Math.round(h)));
    burst.appendChild(svg);
    let delay = 0;
    _nkSlamPaths(w, h).forEach(c => {
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', c.d);
        path.setAttribute('pathLength', '1');
        path.classList.add('sx-slam-crack');
        if (c.core) path.classList.add('sx-slam-crack-core');
        path.style.animationDelay = delay.toFixed(2) + 's';
        delay += 0.03 + Math.random() * 0.04;
        svg.appendChild(path);
    });

    // Rock shards - burst up out of the struck ground, drift, fall back.
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
        sh.className = 'sx-slam-shard';
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
        du.className = 'sx-slam-dust';
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
export function _nkNudgeAvatar(dx, dy) {
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
        try { globalThis._setAvatarPos(el, l, tp); } catch (e) {}
    } else {
        el.style.left = Math.max(0, Math.min(window.innerWidth - 40, l)) + 'px';
        el.style.top = Math.max(0, Math.min(window.innerHeight - 40, tp)) + 'px';
    }
}


// Animated knockback: like _nkNudgeAvatar but the avatar's PIXELS glide
// (compositor-driven CSS ease-out slide on left/top + tumble wobble) instead
// of teleporting, with an impact burst at the contact point.
//   dx, dy     - fling impulse in px (same as the nudge)
//   srcX, srcY - optional contact point for the burst
export let _flingSeq = 0;
export function _nkFlingAvatar(dx, dy, srcX, srcY) {
    const el = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (!el) return;
    const w = el.offsetWidth || 72, h = el.offsetHeight || 90;
    let x0 = parseFloat(el.style.left);
    let y0 = parseFloat(el.style.top);
    const midGlide = !!el.dataset.egFlingActive;
    // The melee lunge (and the crit shake) animate the wrapper's TRANSFORM
    // via WAAPI without touching style.left/top, so the inline position is
    // stale while the sprite is visually displaced (e.g. mid auto-attack
    // lunge at a boss). A fling landing in that window must anchor on the
    // RENDERED rect and end the lunge - otherwise the sprite snaps back to
    // its pre-lunge spot and the wobble + lunge fight over the transform.
    let lungeAnim = null;
    if (el.getAnimations) {
        try {
            lungeAnim = el.getAnimations().find(a => {
                if (typeof CSSAnimation !== 'undefined' && a instanceof globalThis.CSSAnimation) return false;
                try {
                    const kfs = (a.effect && a.effect.getKeyframes) ? a.effect.getKeyframes() : [];
                    return kfs.some(k => k && k.transform !== undefined);
                } catch (e) { return false; }
            }) || null;
        } catch (e) { lungeAnim = null; }
    }
    if (midGlide || lungeAnim || !isFinite(x0) || !isFinite(y0)) {
        // Mid-glide: style.left already holds the glide TARGET (not where
        // the sprite is) - sample the rendered rect instead so chained
        // flings blend from the sprite's actual position. Missing inline
        // position (fresh spawn / companion return cleared it): anchor on
        // the rect too - falling back to (0,0) flung the avatar at the
        // top-left corner, which read as a random teleport. The rect is
        // sampled while the lunge is still live so it includes the lunge's
        // transform displacement.
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (midGlide || lungeAnim || !isFinite(x0)) x0 = cx - w / 2;
        if (midGlide || lungeAnim || !isFinite(y0)) y0 = cy - h / 2;
        el.style.left = x0 + 'px';
        el.style.top = y0 + 'px';
    }
    if (lungeAnim) {
        // finish() (not cancel()) so the lunge's onfinish still restores
        // the zIndex it raised; its end state is identity, so nothing
        // visual jumps - the wobble + glide take over from the rect anchor.
        try { lungeAnim.finish(); } catch (e) { try { lungeAnim.cancel(); } catch (e2) {} }
    }
    const x1 = Math.max(4, Math.min(window.innerWidth - w - 4, x0 + dx));
    const y1 = Math.max(4, Math.min(window.innerHeight - h - 4, y0 + dy));
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const bx = (srcX != null) ? srcX : x0 + w / 2 - dx * 0.4;
    const by = (srcY != null) ? srcY : y0 + h / 2 - dy * 0.4;
    _flingBurst(bx, by, Math.atan2(dy, dx));
    if (dist < 6) return; // nothing worth tweening
    const seq = ++_flingSeq;
    const dur = Math.max(300, Math.min(430, 260 + dist * 0.5));
    // Tumble wobble on the wrapper (its transform is otherwise unused) -
    // direction-signed via a CSS var so left/right flings tilt oppositely.
    el.style.setProperty('--sx-fling-spin', dx >= 0 ? '1' : '-1');
    el.style.setProperty('--sx-fling-tilt', Math.min(10, 4 + dist / 22).toFixed(1) + 'deg');
    el.classList.add('sx-flinging');
    // Tell the WASD ticker a glide owns the position (it must not reseed
    // from style.left - that's the TARGET - or it snaps the sprite there).
    el.dataset.egFlingActive = '1';
    // Force a style flush so the transition sees the old position first.
    void el.offsetWidth;
    el.style.transition = 'left ' + dur + 'ms cubic-bezier(0.16, 0.75, 0.3, 1), top ' + dur + 'ms cubic-bezier(0.16, 0.75, 0.3, 1)';
    el.style.left = x1 + 'px';
    el.style.top = y1 + 'px';
    // Cleanup after the glide: strip the tween styling. The WASD ticker
    // reseeds its float accumulator from the rendered position on its own
    // (divergence check), so control resumes seamlessly wherever the fling
    // ended up - no snap-back if the player fought the knockback.
    setTimeout(() => {
        if (seq !== _flingSeq) return; // superseded by a newer fling
        try {
            el.style.transition = '';
            el.classList.remove('sx-flinging');
            delete el.dataset.egFlingActive;
            el.style.removeProperty('--sx-fling-spin');
            el.style.removeProperty('--sx-fling-tilt');
            el.dataset.avatarFx = el.style.left;
            el.dataset.avatarFy = el.style.top;
        } catch (e) {}
    }, dur + 60);
}


// Small impact punctuation for a fling: sparks + an expanding ring at (x, y).
// Self-removing after ~0.5s; no run tracking needed.
export function _flingBurst(x, y, angle) {
    try {
        const ring = document.createElement('div');
        ring.className = 'sx-fling-ring';
        ring.style.left = x + 'px';
        ring.style.top = y + 'px';
        document.body.appendChild(ring);
        setTimeout(() => ring.remove(), 500);
        for (let i = 0; i < 6; i++) {
            const s = document.createElement('div');
            s.className = 'sx-fling-spark';
            s.style.left = x + 'px';
            s.style.top = y + 'px';
            const a = angle + (Math.random() - 0.5) * 2.2;
            const d = 26 + Math.random() * 30;
            s.style.setProperty('--sx-spark-x', (Math.cos(a) * d).toFixed(0) + 'px');
            s.style.setProperty('--sx-spark-y', (Math.sin(a) * d).toFixed(0) + 'px');
            document.body.appendChild(s);
            setTimeout(() => s.remove(), 520);
        }
    } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------SHARED FINALE: WAVES OF SAFE / DANGER ZONES-----------
//------------------------------------------------------------------------
// A compact, always-avoidable ≤10% finale for the smaller trial bosses
// (Warden, Cyclops, Weaver, Executioner, Dreadnought, Zenith, Exarch,
// Arbiter). The boss is immune while it runs; a banner at the top names it
// and says what to do. Each wave counts down on screen, then strikes:
//   'shelter' - ONE green circle opens within walking reach (never on you):
//               everything outside it is hit.
//   'avoid'   - red circles land on your spot (+ extra ones): be outside.
// Damage goes through _nkHit (flash + number). Waves always leave at
// least the countdown minus ~0.7s reaction to walk (320 px/s avatar).
// Per-boss look: cfg.cls is added to the banner and zones (CSS colour
// variable --nk-fin), and the finale fires at most once per boss.
const NK_FIN_SAFE_R = 115;    // px green shelter radius
const NK_FIN_DANGER_R = 135;  // px red strike radius
const NK_FIN_GAP_MS = 900;    // pause between waves

// Starts a passive HP watcher: at ≤10% the finale (cfg) begins once.
export function _nkWatchFinale(monster, cfg) {
    if (!monster || monster._nkFinaleWatch) return;
    monster._nkFinaleWatch = true;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (monster._nkFinaleDone) return false;
        if (monster.currentHP > 0 && monster.currentHP <= monster.maxHP * 0.10 && !monster.bossImmune) {
            _nkFinaleWaves(monster, cfg);
            return false;
        }
        return true;
    });
}

// Runs the finale. cfg: { name (boss display name), title, hint, cls,
// element, waves: [{ kind: 'shelter'|'avoid', ms, dmg, extra, label }] }
export function _nkFinaleWaves(monster, cfg) {
    if (!monster || monster._nkFinaleDone) return;
    monster._nkFinaleDone = true;
    // The finale owns the arena: stop this boss's other active mechanics.
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id && !r.passive) { try { _nkKillRun(r); } catch (e) {} }
    });
    const level = monster.level || 1;
    const run = _nkNewRun(monster.id, false);
    run.passive = true;
    monster.bossImmune = true;
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.add('sx-nk-shielded');
    run.onKill = () => {
        try { monster.bossImmune = false; } catch (e) {}
        if (wrap) wrap.classList.remove('sx-nk-shielded');
    };
    const banner = _nkEl(run, 'div', 'sx-nk-fin-banner ' + (cfg.cls || ''));
    banner.innerHTML = '<div class="sx-nk-fin-title"></div><div class="sx-nk-fin-hint"></div>';
    banner.querySelector('.sx-nk-fin-title').textContent = cfg.title;
    const hintEl = banner.querySelector('.sx-nk-fin-hint');
    hintEl.textContent = cfg.hint;
    _nkToast(cfg.toastKey || 'eg_nk_finale', cfg.title + ' - ' + cfg.hint, cfg.color);

    const W = () => window.innerWidth, H = () => window.innerHeight;
    const clamp = (x, y, r) => ({
        x: Math.max(r + 20, Math.min(W() - r - 20, x)),
        // keep clear of the inventory bar along the bottom edge
        y: Math.max(r + 20, Math.min(H() - r - 70, y)),
    });
    const pcNow = () => _nkPlayerCenter() || { x: W() / 2, y: H() / 2 };
    const waves = cfg.waves || [];
    let wi = 0, stage = 'gap', t = 0, zones = [], countEls = [], wave = null;

    _nkLoop(run, (dtS) => {
        if (!_nkBossAlive(monster.id)) return false;
        t += dtS * 1000;
        if (stage === 'gap') {
            if (t < NK_FIN_GAP_MS) return true;
            if (wi >= waves.length) return false;      // done → onKill releases immunity
            wave = waves[wi++];
            t = 0; stage = 'count';
            const pc = pcNow();
            zones = [];
            if (wave.kind === 'shelter') {
                // 170-360 px away: a short walk, never where you already stand.
                const a = Math.random() * Math.PI * 2, d = 170 + Math.random() * 190;
                const c = clamp(pc.x + Math.cos(a) * d, pc.y + Math.sin(a) * d, NK_FIN_SAFE_R);
                zones.push({ ...c, r: NK_FIN_SAFE_R, safe: true });
            } else {
                const c = clamp(pc.x, pc.y, NK_FIN_DANGER_R);
                zones.push({ ...c, r: NK_FIN_DANGER_R, safe: false });
                for (let i = 0; i < (wave.extra || 0); i++) {
                    zones.push({ ...clamp(Math.random() * W(), Math.random() * H(), NK_FIN_DANGER_R), r: NK_FIN_DANGER_R, safe: false });
                }
            }
            countEls = zones.map(z => {
                const el = _nkEl(run, 'div', 'sx-nk-fin-zone ' + (z.safe ? 'sx-nk-fin-safe ' : 'sx-nk-fin-danger ') + (cfg.cls || ''));
                el.style.left = Math.round(z.x - z.r) + 'px';
                el.style.top = Math.round(z.y - z.r) + 'px';
                el.style.width = el.style.height = (z.r * 2) + 'px';
                el.innerHTML = '<span class="sx-nk-fin-count"></span>';
                z.el = el;
                return el.querySelector('.sx-nk-fin-count');
            });
            hintEl.textContent = (wave.kind === 'shelter' ? 'Get INTO the green circle!' : 'Get OUT of the red circles!')
                + '  (' + wi + '/' + waves.length + ')';
            return true;
        }
        if (stage === 'count') {
            const left = wave.ms - t;
            countEls.forEach(c => { if (c) c.textContent = left > 0 ? String(Math.ceil(left / 1000)) : ''; });
            if (left > 0) return true;
            const pc = pcNow();
            const hit = wave.kind === 'shelter'
                ? !zones.some(z => Math.hypot(pc.x - z.x, pc.y - z.y) < z.r)
                : zones.some(z => Math.hypot(pc.x - z.x, pc.y - z.y) < z.r);
            zones.forEach(z => z.el.classList.add('sx-nk-fin-strike'));
            if (hit) {
                const dealt = _nkHit(wave.dmg, cfg.element || null, level);
                _nkAbilityHitToast(dealt, cfg.name, wave.label || cfg.title);
            }
            const old = zones.map(z => z.el);
            setTimeout(() => old.forEach(el => { try { el.remove(); } catch (e) {} }), 600);
            stage = 'gap'; t = 0;
        }
        return true;
    });
}
