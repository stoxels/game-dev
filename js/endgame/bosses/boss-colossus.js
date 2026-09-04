//------------------------------------------------------------------------
//-------------------BOSS: THE COLOSSUS (boss_colossus)-------------------------
//------------------------------------------------------------------------
// PoE slam homage: the Colossus stomps, sending out an expanding double
// shockwave. The bands themselves are lethal — stand in the gap between
// the rings as they roll past.
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
    boss_colossus: {
        id: 'boss_colossus', name: 'The Colossus', emoji: '🗿',
        baseHP: 1140, baseDamage: 24, chargeMax: 13,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_colossus: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'seismic_slam', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechSeismicSlam' },
            { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechSeismicSlam(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const expandMs = [0, 2400, 2200, 2000][p];
    const bandHalf = 26;
    const dmgPct = [0, 0.22, 0.26, 0.32][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5 + (Math.random() * 200 - 100);
    const cy = window.innerHeight * 0.42;
    const rMax = Math.max(window.innerWidth, window.innerHeight) * 0.75;
    const anchor = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-anchor', '🗿');
    anchor.style.transform = 'translate(' + Math.round(cx - 26) + 'px,' + Math.round(cy - 26) + 'px)';
    // Two rings, second delayed so a safe annulus travels between them.
    const rings = [0, 1].map(i => {
        const el = _egNkEl(run, 'div', 'eg-nk-ring');
        el.style.display = 'none';
        return { delay: i * 700, r: 40, done: false, el };
    });
    _egNkToast('eg_mech_quake', '🗿 The Colossus: Seismic Slam! Stand between the rings!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        const dist = c ? Math.hypot(c.x - cx, c.y - cy) : 9999;
        let pending = false;
        rings.forEach(rg => {
            if (e < rg.delay) { pending = true; return; }
            const t = (e - rg.delay) / expandMs;
            if (t >= 1) {
                rg.el.style.display = 'none';
                rg.done = true;
                return;
            }
            pending = true;
            rg.r = 40 + (rMax - 40) * t;
            const r = Math.round(rg.r);
            rg.el.style.display = '';
            rg.el.style.left = Math.round(cx - r) + 'px';
            rg.el.style.top = Math.round(cy - r) + 'px';
            rg.el.style.width = r * 2 + 'px';
            rg.el.style.height = r * 2 + 'px';
            if (c && now >= cdUntil && Math.abs(dist - rg.r) < bandHalf) {
                cdUntil = now + 1200;
                const dealt = _egNkHit(dmgPct, null, level);
                _egNkAbilityHitToast(dealt, 'The Colossus', 'Seismic Slam');
            }
        });
        return pending;
    });
}
