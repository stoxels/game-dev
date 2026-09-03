//------------------------------------------------------------------------
//-------------------BOSS: THE OVERFITTER (boss_overfitter)---------------------------
//------------------------------------------------------------------------
// ML theme: punishes predictable patterns; model drift + shrinking bloom.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (corrupt_cells, probability_shift, prior_bomb,
// frozen_cells, clue_swap, grid_invert, summons) live in
// shared-boss-abilities.js and are referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_overfitter: {
        id: 'boss_overfitter', name: 'The Overfitter', emoji: '📈',
        baseHP: 1050, baseDamage: 23, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_overfitter — "The Model That Learned Too Much"
    // Punishes predictable solving patterns without making the puzzle unsolvable.
    // Phase 1: destabilises recent progress; phase 2 adds visual model drift;
    // phase 3 combines both with a shrinking safe zone.
    boss_overfitter: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.0 }, // Phase 1 — PATTERN RECOGNITION
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 }, // Phase 2 — MODEL DRIFT
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.15 }, // Phase 3 — OVERFIT
        ],
        immunityDuration: 2800,
        mechanics: [
            { name: 'pattern_break', intervalBase: 13000, intervalVariance: 3000, handler: '_egMechPatternBreak' },
            { name: 'model_drift', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechModelDrift', phase2Only: true },
            { name: 'frozen_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechFrozenCells', phase2Only: true },
            { name: 'overfit_bloom', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechOverfitBloom', phase2Only: true },
        ],
    },
});


//------------------------------------------------------------------------
//-------------------BOSS MECHANIC: OVERFITTER PATTERN BREAK-------------
//------------------------------------------------------------------------
// Removes a small amount of recent correct progress. Unlike Prior Bomb,
// this targets a repeated row/column pattern when possible, telegraphing the
// boss's adaptive behaviour while remaining recoverable.
function _egMechPatternBreak(monster, phase) {
    if (!cur || !cur.grid || typeof userGrid === 'undefined') return;
    const sol = cur.grid;
    const recent = [..._egRecentFills].reverse().filter(([r, c]) =>
        userGrid[r][c] === 1 && !revealedGrid[r][c] && sol[r][c] === 1
    );
    if (recent.length === 0) return;

    const counts = new Map();
    recent.forEach(([r, c]) => {
        const key = `r${r}`;
        counts.set(key, (counts.get(key) || 0) + 1);
        const colKey = `c${c}`;
        counts.set(colKey, (counts.get(colKey) || 0) + 1);
    });
    const strongestEntry = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const strongest = strongestEntry ? strongestEntry[0] : null;
    const pool = strongest && strongest[0] === 'r'
        ? recent.filter(([r]) => `r${r}` === strongest)
        : strongest ? recent.filter(([, c]) => `c${c}` === strongest) : recent;
    const count = phase >= 3 ? 2 : 1;
    const targets = pool.slice(0, Math.min(count, pool.length));

    showToast(t('eg_mech_pattern_break').replace('{n}', targets.length));
    targets.forEach(([r, c]) => _egUnfillCell(r, c));
}


//------------------------------------------------------------------------
//-------------------BOSS MECHANIC: MODEL DRIFT----------------------------
//------------------------------------------------------------------------
// Temporarily shifts one clue pair, then restores it. This is deliberately
// short-lived and visually announced so the player can adapt rather than
// being forced into permanent misinformation.
function _egMechModelDrift(monster, phase) {
    const rows = cur && cur.grid ? cur.grid.length : 0;
    const cols = cur && cur.grid && cur.grid[0] ? cur.grid[0].length : 0;
    if (!rows || !cols || _egBlackoutActive) return;

    const useRow = Math.random() < 0.5;
    const index = Math.floor(Math.random() * (useRow ? rows : cols));
    const prefix = useRow ? 'rn-' : 'cn-';
    const el = document.getElementById(`${prefix}${index}`);
    if (!el) return;

    const original = el.textContent;
    el.textContent = '?';
    el.classList.add('eg-overfitter-drift-clue');
    const duration = phase >= 3 ? 7000 : 5000;
    showToast(t('eg_mech_model_drift').replace('{n}', duration / 1000));
    setTimeout(() => {
        if (el.isConnected) {
            el.textContent = original;
            el.classList.remove('eg-overfitter-drift-clue');
        }
    }, duration);
}


//------------------------------------------------------------------------
//-------------------BOSS MECHANIC: OVERFIT BLOOM--------------------------
//------------------------------------------------------------------------
// Phase 2+ dodge check: the safe zone contracts, representing the boss
// narrowing its model until only a precise answer remains.
function _egMechOverfitBloom(monster, phase) {
    const radius = phase >= 3 ? 92 : 110;
    const activeMs = phase >= 3 ? 4200 : 5000;
    const first = _egBlastPickPos(radius);
    _egRunScreenBlast({
        toastKey: 'eg_mech_overfit_bloom',
        accent: '#d946ef',
        activeMs,
        damagePct: phase >= 3 ? 0.34 : 0.28,
        zones: [{ ...first, radius }],
        shrinkToRadius: phase >= 3 ? 58 : 72,
    });
}
