//------------------------------------------------------------------------
//-------------------BOSS: THE SHAPER (boss_shaper)-----------------------------
//------------------------------------------------------------------------
// Shaper homage: the arena itself turns hostile. Chilling domains appear and
// linger — standing inside drains you. Recasts pile on until the floor is
// almost all winter; keep track of what is fresh and what is fading.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (corrupt_cells, probability_shift, prior_bomb,
// frozen_cells, clue_swap, grid_invert, summons, fated_cell, fog_bank,
// clue_scramble, soul_tithe) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_shaper: {
        id: 'boss_shaper', name: 'The Shaper', emoji: '❄️',
        baseHP: 1060, baseDamage: 22, chargeMax: 12,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_shaper: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'frozen_domains', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechFrozenDomains' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechSoulTithe' },
            { name: 'frozen_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechFrozenCells' },
        ],
    },
});


// Active domains across casts (visuals belong to their own runs and vanish
// with them; entries expire by timestamp). Capped so recasts cannot pave
// the whole screen.
let _egShaperDomains = []; // { x, y, radius, until }

function _egMechFrozenDomains(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const radius = 95;
    const dotPct = [0, 9, 11, 13][p];
    const durMs = 8000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const now0 = performance.now();
    _egShaperDomains = _egShaperDomains.filter(z => z.until > now0);
    const room = Math.max(0, 5 - _egShaperDomains.length);
    const fresh = [];
    const c0 = _egNkPlayerCenter();
    const seeds = [
        c0 ? { x: c0.x, y: c0.y } : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        { x: 120 + Math.random() * Math.max(60, window.innerWidth - 240), y: 120 + Math.random() * Math.max(60, window.innerHeight - 240) },
        { x: 120 + Math.random() * Math.max(60, window.innerWidth - 240), y: 120 + Math.random() * Math.max(60, window.innerHeight - 240) },
    ];
    seeds.slice(0, Math.min(3, room)).forEach(s => {
        if (_egShaperDomains.some(z => Math.hypot(z.x - s.x, z.y - s.y) < radius * 2)) return;
        const el = _egNkEl(run, 'div', 'eg-nk-domain');
        el.style.width = radius * 2 + 'px';
        el.style.height = radius * 2 + 'px';
        el.style.transform = 'translate(' + Math.round(s.x - radius) + 'px,' + Math.round(s.y - radius) + 'px)';
        const zone = { x: s.x, y: s.y, radius, until: now0 + durMs, el };
        _egShaperDomains.push(zone);
        fresh.push(zone);
    });
    if (fresh.length === 0) { _egNkKillRun(run); return; }
    _egNkToast('eg_mech_domains', '❄️ The Shaper: Frozen Domains! The floor is winter!');
    let e = 0, dotWarnAt = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        _egShaperDomains = _egShaperDomains.filter(z => z.until > now);
        const pr = _egNkPlayerRect();
        if (pr) {
            const inside = _egShaperDomains.some(z => _egNkCircleHit(z.x, z.y, z.radius, pr, 0));
            if (inside) {
                _egNkDotTick(run, dotPct, dtS, level, 'cold');
                if (now - dotWarnAt > 3000) {
                    dotWarnAt = now;
                    _egNkToast('eg_nk_move', '⚠️ Move!', '#7dd3fc');
                }
            } else {
                run.dotAcc = 0;
            }
        }
        return e < durMs;
    });
}
