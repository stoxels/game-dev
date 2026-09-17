//------------------------------------------------------------------------
//-------------------SHARED PUZZLE MECHANICS (PACK 4)---------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Grid/puzzle disruption mechanics extracted from shared-boss-abilities.js
// (2026-09-17): fated_cell, fog_bank, clue_scramble and soul_tithe, plus
// the correct-fill observer that feeds them. Referenced by handler-name
// string like the older shared mechanics (see shared-boss-abilities.js).

import { t } from '../../translation/translations.js';
import { _egBossTierLerp, _egBossTierFactor, _egBossTierNorm, _egUnfillCell, _egNkFrozen, _egNkToast, _egCollectClueSpans } from './shared-boss-abilities.js';
import { _egRenderPanel } from '../encounter.js';
import { _egCellInBounds, _egRecentFills } from '../combat-state.js';

//------------------------------------------------------------------------
//-------------------SHARED PUZZLE MECHANICS (PACK 4)----------------------
//------------------------------------------------------------------------
// Grid/puzzle disruption usable by any boss (handler-name string like the older
// shared mechanics): fated_cell (fill marked cells in time or lose progress),
// fog_bank (wandering fog hides the grid), clue_swap / clue_scramble (clue lines
// exchange/reorder numbers; scramble reverts), soul_tithe (shields until N fills).
//------------------------------------------------------------------------

// ── Fill observer ─────────────────────────────────────────────────────────────
// Called from _egOnCorrectCell on every correct fill. Lets active boss
// mechanics react (resolve fate marks, count tithe progress). No-op unless
// a mechanic is currently listening.
export function _egNotifyCorrectFill(row, col) {
    const key = row + '-' + col;
    if (typeof _egFateMarks !== 'undefined' && _egFateMarks.has(key)) {
        _egResolveFateMark(key, true);
    }
    if (typeof _egMonsters === 'undefined') return;
    globalThis._egMonsters.forEach(m => {
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
// doom clock runs out and the boss's curse fizzles - fail, and it eats your
// 2 most recent fills per missed mark. Unlike Corrupt Cells the mark never
// blocks filling; it is a race, not a lock.

export let _egFateMarks = new Map(); // key:"row-col" → { timer }
export let _egFateChain = null;      // { p, monsterId, budget, resolved, windowMs, spawnTimer } - active relay

// Returns all correct unfilled cells that can host a fate mark.
export function _egBuildFatePool() {
    if (!globalThis.cur || !globalThis.cur.grid) return [];
    const sol = globalThis.cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const pool = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] !== 1) continue;
            if (globalThis.userGrid[r][c] === 1 || globalThis.revealedGrid[r][c]) continue;
            if (_egFateMarks.has(`${r}-${c}`)) continue;
            pool.push([r, c]);
        }
    }
    return pool;
}

// Places the ⏳ mark on a cell and starts its doom clock.
export function _egApplyFateMark(r, c, windowMs) {
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
export function _egRemoveFateMark(key) {
    const data = _egFateMarks.get(key);
    if (data) clearTimeout(data.timer);
    _egFateMarks.delete(key);
    const span = document.getElementById(`eg-fate-${key}`);
    if (span) span.remove();
}

// Spawns one more relay mark on a random legal cell. Returns true when placed.
export function _egFateSpawnOne(windowMs) {
    const pool = _egBuildFatePool();
    if (pool.length === 0) return false;
    const [r, c] = pool[Math.floor(Math.random() * pool.length)];
    _egApplyFateMark(r, c, windowMs);
    return true;
}

// Resolves one mark: filled=true rewards (and advances any active doom relay),
// filled=false (doom clock expired) punishes by unfilling the 2 most recent
// correct fills and collapses any active relay.
export function _egResolveFateMark(key, filled) {
    if (!_egFateMarks.has(key)) return;
    _egRemoveFateMark(key);

    if (filled) {
        const chain = _egFateChain;
        if (chain) {
            clearTimeout(chain.spawnTimer);
            chain.resolved++;
            if (chain.resolved >= chain.budget) {
                _egFateChain = null;
                globalThis.showToast(t('eg_fate_chain_done'), '#4ade80');
                return;
            }
            // The next mark appears shortly - keep the pressure on.
            const left = chain.budget - chain.resolved;
            chain.spawnTimer = setTimeout(() => {
                if (_egFateChain !== chain) return;
                if (chain.monsterId && typeof _egMonsters !== 'undefined'
                    && !globalThis._egMonsters.some(m => m.id === chain.monsterId)) { _egFateChain = null; return; }
                if (_egFateSpawnOne(chain.windowMs)) globalThis.showToast(t('eg_fate_next').replace('{n}', left));
                else _egFateChain = null; // no legal cells left - relay over
            }, 650);
            return;
        }
        globalThis.showToast(t('eg_fate_done'), '#4ade80');
        return;
    }

    globalThis.showToast(t('eg_fate_fail'), '#f87171');
    if (!globalThis.cur || !globalThis.cur.grid || typeof _egUnfillCell !== 'function') return;
    const sol = globalThis.cur.grid;
    const pool = [..._egRecentFills].reverse().filter(([r, c]) =>
        _egCellInBounds(r, c)
        && globalThis.userGrid[r][c] === 1 && !globalThis.revealedGrid[r][c] && sol[r][c] === 1
    );
    pool.slice(0, 2).forEach(([r, c]) => _egUnfillCell(r, c));

    // Expiry also collapses any relay: the chain breaks and twin marks fizzle.
    if (_egFateChain) {
        clearTimeout(_egFateChain.spawnTimer);
        _egFateChain = null;
        Array.from(_egFateMarks.keys()).forEach(k => _egRemoveFateMark(k));
        globalThis.showToast(t('eg_fate_break'), '#f87171');
    }
}

// Removes all pending fate marks and any active relay. Called on boss death.
export function _egClearFateMarks() {
    if (_egFateChain) {
        clearTimeout(_egFateChain.spawnTimer);
        _egFateChain = null;
    }
    Array.from(_egFateMarks.keys()).forEach(k => _egRemoveFateMark(k));
}

// TIER-SCALED Fated Cell knobs - same endpoint pattern as Corrupt Cells.
// The doom-clock window is a duration factor anchored exactly at tier 8
// (6s / 5.5s / 5s unchanged there); relay initial marks and budgets lerp
// between endpoint pairs (tier 8 lands on 1 / 3 and 2 / 4).
export const EG_FATE_WINDOW_F = [1.15, 0.85]; // doom-clock factor [tier1, tier16]
export const EG_FATE_INITIAL_P2 = [1, 2];
export const EG_FATE_BUDGET_P2 = [3, 4];
export const EG_FATE_INITIAL_P3 = [2, 3];
export const EG_FATE_BUDGET_P3 = [3, 5];


// Boss mechanic handler - phase variants:
//   P1 - Fated Cell: one mark, fill it within its doom clock or lose progress.
//   P2 - Doom Relay: marks chain - fill each to spawn the next (budget scaled).
//   P3 - Twin Dooms: marks come in pairs and the relay runs longer.
export function _egMechFatedCell(monster, phase) {
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    if (p >= 2 && _egFateChain) return; // a relay is already running - don't stack

    const pool = _egBuildFatePool();
    if (pool.length === 0) return;

    const norm = _egBossTierNorm(monster);

    if (p === 1) {
        const windowMs = Math.round(6000 * _egBossTierFactor(norm, EG_FATE_WINDOW_F));
        const targets = pool.sort(() => Math.random() - 0.5).slice(0, 1);
        globalThis.showToast(t('eg_mech_fate').replace('{n}', targets.length).replace('{s}', windowMs / 1000));
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
    globalThis.showToast(t(toastKey).replace('{s}', windowMs / 1000));
    const targets = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(initial, pool.length));
    targets.forEach(([r, c]) => _egApplyFateMark(r, c, windowMs));
}


//------------------------------------------------------------------------
//-------------------SHARED MECHANIC: FOG BANK-----------------------------
//------------------------------------------------------------------------
// A wandering fog bank rolls over a random ~4x4 chunk of the grid, hiding
// cells and clues beneath it for several seconds. The puzzle stays fully
// playable underneath (pointer-events pass through) - you just cannot see
// that region. Never stacks with itself.

export let _egFogBanks = []; // [{ el, r0, c0, h, w, driftTimer, expireTimer }] - one or two banks
export let _egFogSeq = 0;

export const EG_FOG_DRIFT_P2_MS = 2600; // P2 - the single bank wanders (tier-8 base)
export const EG_FOG_DRIFT_P3_MS = 3400; // P3 - each twin bank wanders a bit slower

// TIER-SCALED Fog Bank knobs - duration factors anchored exactly at tier 8.
// Low tiers lift the fog sooner and let banks drift slower; high tiers keep
// the region hidden longer and make the banks pace faster.
export const EG_FOG_DURATION_F = [0.85, 1.15]; // fog lifetime factor [tier1, tier16]
export const EG_FOG_DRIFT_F = [1.2, 0.8];      // drift-interval factor [tier1, tier16]

// Positions one fog element over a cell region (r0,c0)-(r0+h-1,c0+w-1).
// Recomputes fresh rects so a drifted bank lands exactly on the new cells.

// Persistent hidden sentinel at the grid container's layout origin - maps
// viewport rects into container coordinates without touching the fog element
// (a style write here would arm the fog's CSS transition and make it glide
// in from (0,0)).
export let _egFogProbe = null;
export function _egFogPlace(el, r0, c0, h, w) {
    const tbl = document.getElementById('ptable');
    const cellA = document.getElementById(`g-${r0}-${c0}`);
    const cellB = document.getElementById(`g-${r0 + h - 1}-${c0 + w - 1}`);
    if (!tbl || !cellA || !cellB) return false;
    const parent = tbl.parentElement;
    if (!parent) return false;

    // Naive viewport-rect deltas (cellRect - parentRect) break whenever an
    // ancestor carries a transform or scroll offset (vertical centering
    // does) - the fog would land at wrong, sometimes offscreen coordinates.
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
export function _egFogPickRegion(exceptBank) {
    if (!globalThis.cur || !globalThis.cur.grid) return null;
    const rows = globalThis.cur.grid.length, cols = globalThis.cur.grid[0].length;
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
    return null; // crowded grid - caller gives up gracefully
}

// Drift tick - the fog bank glides to a new random region.
export function _egFogDrift(bank) {
    const reg = _egFogPickRegion(bank);
    if (!reg || !_egFogPlace(bank.el, reg.r0, reg.c0, reg.h, reg.w)) return;
    bank.r0 = reg.r0; bank.c0 = reg.c0; bank.h = reg.h; bank.w = reg.w;
}

// Spawns one fog bank over a random region with the given drift + lifetime.
export function _egFogSpawnBank(driftMs, durationMs) {
    const tbl = document.getElementById('ptable');
    if (!tbl) return null;
    const parent = tbl.parentElement;
    if (!parent) return null;
    const reg = _egFogPickRegion(null);
    if (!reg) return null;

    const fog = document.createElement('div');
    fog.className = 'eg-fog-bank';
    fog.id = `eg-fog-bank-${++_egFogSeq}`;
    // Layered drifting mist blobs - the fog reads as churning vapor
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
    // - the classic "fog spawns offscreen / slides in from the corner" bug.
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
export function _egFogKillBank(bank) {
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
export function _egRemoveFogBank() {
    _egFogBanks.slice().forEach(b => _egFogKillBank(b));
}

// Boss mechanic handler - phase variants:
//   P1 - Fog Bank: one static bank hides a region for 7s (original).
//   P2 - Drifting Fog: one bank wanders to a new region every ~2.6s.
//   P3 - Twin Banks: two banks wander - a second region is hidden too.
export function _egMechFogBank(monster, phase) {
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
        globalThis.showToast(t(toastKey).replace('{n}', durationMs / 1000));
    }
}


//------------------------------------------------------------------------
//-------------------SHARED MECHANIC: CLUE SCRAMBLE------------------------
//------------------------------------------------------------------------
// Shuffles the numbers inside 2 random clue lines. Nothing is destroyed -
// the same numbers, reordered - and it reverts after a phase-scaled duration.
// Operates on the per-number spans (rn-{row}-{i} / cn-{col}-{i}), swapping
// their text among themselves, so solved-state styling is untouched.

let _egClueScrambleRestoreTimer = null;
let _egClueScrambleReshuffleTimer = null; // P3 - second shuffle mid-effect
// Scramble state lives on globalThis (like _egActiveClueSwap) so the core
// clue-swap mechanic in shared-boss-abilities.js can co-existence-check it.


// Restores scrambled lines to their original number order. Defers while a
// Clue Blackout owns the clue text, same as the Clue Swap restore.
export function _egRestoreClueScramble() {
    clearTimeout(_egClueScrambleReshuffleTimer);
    _egClueScrambleReshuffleTimer = null;
    if (globalThis._egBlackoutActive) {
        _egClueScrambleRestoreTimer = setTimeout(_egRestoreClueScramble, 2000);
        return;
    }
    (globalThis._egActiveClueScramble || []).forEach(line => {
        line.spans.forEach((el, i) => {
            if (el.isConnected) el.textContent = line.orig[i];
        });
    });
    globalThis._egActiveClueScramble = null;
    document.querySelectorAll('.eg-scramble-clue').forEach(el => el.classList.remove('eg-scramble-clue'));
}

// Picks n distinct clue lines (rows + columns), each with ≥ 2 number spans.
export function _egScramblePickLines(rows, cols, n) {
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
export function _egScrambleLineTexts(spans) {
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

// P3 - the numbers re-shuffle mid-effect so they never settle before revert.
export function _egClueScrambleReshuffle() {
    if (!globalThis._egActiveClueScramble || globalThis._egBlackoutActive) return;
    let changed = false;
    globalThis._egActiveClueScramble.forEach(line => {
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
    if (changed) globalThis.showToast(t('eg_scramble_again'));
}

// TIER-SCALED Clue Scramble knobs: line counts lerp between [tier1, tier16]
// pairs (tier 8 lands on 2 / 3 / 3); the scramble duration is a factor
// anchored exactly at tier 8 (8s / 9s / 12s unchanged there) - low tiers
// revert faster, high tiers hold the shuffled clues longer.
export const EG_SCRAMBLE_LINES_P1 = [2, 3];
export const EG_SCRAMBLE_LINES_P23 = [3, 4];
export const EG_SCRAMBLE_DURATION_F = [0.85, 1.15]; // [tier1, tier16]


// Boss mechanic handler - phase variants:
//   P1 - Clue Scramble: shuffles the numbers inside 2 clue lines (original).
//   P2 - Deep Scramble: 3 lines scramble for longer.
//   P3 - Double Scramble: 3 lines, and the numbers re-shuffle mid-effect.
export function _egMechClueScramble(monster, phase) {
    if (globalThis._egBlackoutActive || globalThis._egActiveClueScramble || globalThis._egActiveClueSwap) return; // don't stack
    const rows = (globalThis.cur && globalThis.cur.grid) ? globalThis.cur.grid.length : 0;
    const cols = (globalThis.cur && globalThis.cur.grid && globalThis.cur.grid[0]) ? globalThis.cur.grid[0].length : 0;
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
        if (!_egScrambleLineTexts(spans)) return; // all identical - nothing to do
        spans.forEach(el => el.classList.add('eg-scramble-clue'));
        scrambled.push({ spans, orig });
    });
    if (scrambled.length === 0) return;

    globalThis._egActiveClueScramble = scrambled;
    const toastKey = p >= 3 ? 'eg_mech_scramble_double'
        : (p >= 2 ? 'eg_mech_scramble_deep' : 'eg_mech_scramble');
    globalThis.showToast(t(toastKey).replace('{n}', duration / 1000));

    clearTimeout(_egClueScrambleRestoreTimer);
    clearTimeout(_egClueScrambleReshuffleTimer);
    if (p >= 3) {
        _egClueScrambleReshuffleTimer = setTimeout(_egClueScrambleReshuffle, Math.min(5000, duration / 2));
    }
    _egClueScrambleRestoreTimer = setTimeout(_egRestoreClueScramble, duration);
}

// Full cleanup - restores originals immediately (unless a blackout owns the
// text, in which case the blackout's own restore wins anyway) and clears styling.
export function _egRemoveClueScramble() {
    clearTimeout(_egClueScrambleRestoreTimer);
    _egClueScrambleRestoreTimer = null;
    clearTimeout(_egClueScrambleReshuffleTimer);
    _egClueScrambleReshuffleTimer = null;
    if (globalThis._egActiveClueScramble && !globalThis._egBlackoutActive) {
        globalThis._egActiveClueScramble.forEach(line => {
            line.spans.forEach((el, i) => {
                if (el.isConnected) el.textContent = line.orig[i];
            });
        });
    }
    globalThis._egActiveClueScramble = null;
    document.querySelectorAll('.eg-scramble-clue').forEach(el => el.classList.remove('eg-scramble-clue'));
}


//------------------------------------------------------------------------
//-------------------SHARED MECHANIC: SOUL TITHE---------------------------
//------------------------------------------------------------------------
// The boss raises a damage shield only puzzle progress can break: fill N
// correct cells (3/4/5 by phase), or wait out the 25s failsafe (no soft-lock).
// Progress observed via _egNotifyCorrectFill; mirrors the Aegis Protocol
// pattern (bossImmune + shielded badge) but counts fills instead of kills.

// TIER-SCALED Soul Tithe knobs - [tier1, tier16] endpoint pairs like Corrupt
// Cells (tier 8 lands on 3/4/5). The lapse window is a duration factor
// anchored at tier 8 (8s/6s unchanged there). The 25s failsafe stays fixed.
export const EG_TITHE_NEED_P1 = [3, 4];
export const EG_TITHE_NEED_P2 = [4, 5];
export const EG_TITHE_NEED_P3 = [5, 6];
export const EG_TITHE_DECAY_F = [1.2, 0.8]; // stall window factor [tier1, tier16]


// Arms (or re-arms) the lapsing decay window on an active tithe. P1 has no
// decay - P2+ loses 1 progress when the player stalls for the window.
export function _egTitheArmDecay(monster) {
    const st = monster && monster.soulTithe;
    if (!st || st.p < 2) return;
    clearTimeout(st.decayTimer);
    const ms = st.decayMs || (st.p >= 3 ? 6000 : 8000);
    st.decayTimer = setTimeout(() => {
        if (!monster.soulTithe) return;
        if (monster.soulTithe.have > 0) {
            monster.soulTithe.have--;
            _egNkToast('eg_tithe_decay', '🕯️ The tithe slips - keep filling!', '#f87171');
            if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
        }
        _egTitheArmDecay(monster);
    }, ms);
}

// Removes the shield visuals/state from the boss (shared by break/timeout/teardown).
export function _egTitheDrop(monster) {
    if (!monster.soulTithe) return;
    clearTimeout(monster.soulTithe.timer);
    clearTimeout(monster.soulTithe.decayTimer);
    monster.soulTithe = null;
    monster.bossImmune = false;
    const card = document.getElementById('eg-card-' + monster.id);
    if (card) card.classList.remove('eg-nk-shielded');
}

// Boss mechanic handler - phase variants:
//   P1 - Soul Tithe: fill 3 cells, shield fades after 25s (original).
//   P2 - Lapsing Tithe: fill 4 cells; stall 8s and 1 progress decays.
//   P3 - Demanding Tithe: fill 5; stall 6s decays 1, and a timed-out shield
//        COLLECTS its due - your 2 most recent correct fills are unfilled.
export function _egMechSoulTithe(monster, phase) {
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
            if (globalThis.cur && globalThis.cur.grid && typeof _egUnfillCell === 'function') {
                const sol = globalThis.cur.grid;
                const pool = [..._egRecentFills].reverse().filter(([r, c]) =>
                    _egCellInBounds(r, c)
                    && globalThis.userGrid[r][c] === 1 && !globalThis.revealedGrid[r][c] && sol[r][c] === 1
                );
                pool.slice(0, 2).forEach(([r, c]) => _egUnfillCell(r, c));
            }
            _egNkToast('eg_tithe_collect', '💀 The tithe collects its due - recent fills are lost!', '#f87171');
        } else {
            _egNkToast('eg_tithe_timeout', '💀 The tithe holds... for now. The shield fades.', '#f87171');
        }
        _egTitheDrop(monster);
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e2) {} }
    }, 25000);
}

// Breaks an active tithe early (fill quota met). Called from _egNotifyCorrectFill.
export function _egBreakSoulTithe(monster) {
    if (!monster.soulTithe) return;
    _egTitheDrop(monster);
    _egNkToast('eg_tithe_broken', '💥 Tithe paid - shield broken! Burn the boss!', '#4ade80');
    if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
}

// Per-boss teardown - drops an active tithe silently. Called from _egBossCleanup.
export function _egTitheTeardown(monsterId) {
    if (typeof _egMonsters !== 'undefined') {
        const m = globalThis._egMonsters.find(x => x.id === monsterId);
        if (m && m.soulTithe) _egTitheDrop(m);
    }
    const card = document.getElementById('eg-card-' + monsterId);
    if (card) card.classList.remove('eg-nk-shielded');
}


// Removes the Grid Veil overlay - the single implementation, clearing every
// tint/state class either boss applies so cleanup works regardless of whose
// veil was active. Called by the framework's _egBossCleanup typeof-guard.
export function _egRemoveVeil() {
    if (typeof _egVeilActive !== 'undefined') globalThis._egVeilActive = false;
    const veil = document.getElementById('eg-grid-veil');
    if (veil) {
        veil.classList.remove('eg-blm-veil-tinted', 'eg-bay-veil-tinted', 'eg-blm-veil-open');
        veil.style.removeProperty('--blm-wilt');
        veil.remove();
    }
}
