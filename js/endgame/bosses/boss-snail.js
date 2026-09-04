//------------------------------------------------------------------------
//-------------------BOSS: THE SNAIL (boss_snail)-------------------------------
//------------------------------------------------------------------------
// First-steps fight: a single, VERY slow homing snail. It cannot be
// outrun forever — but it can barely catch you either. Teaches kiting:
// keep moving in wide arcs and never corner yourself.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_snail: {
        id: 'boss_snail', name: 'The Snail', emoji: '🐌',
        baseHP: 900, baseDamage: 19, chargeMax: 14,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_snail: {
        phases: [
            { threshold: 1.00, chargeMax: 14, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.30 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.70 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'doom_snail', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechDoomSnail' },
            { name: 'corrupt_cells', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechDoomSnail(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const speed = [0, 42, 52, 64][p];
    const radius = 34;
    const dmgPct = [0, 0.26, 0.30, 0.36][p];
    const durMs = 12000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-snail', '🐌');
    const s = { x: 60, y: window.innerHeight - 120, el };
    el.style.transform = 'translate(' + Math.round(s.x - 30) + 'px,' + Math.round(s.y - 30) + 'px)';
    _egNkToast('eg_mech_snail', '🐌 The Snail: Doom Snail! It is slow. It is patient. Keep moving!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        if (c) {
            const dx = c.x - s.x, dy = c.y - s.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            s.x += (dx / d) * speed * dtS;
            s.y += (dy / d) * speed * dtS;
        }
        s.el.style.transform = 'translate(' + Math.round(s.x - 30) + 'px,' + Math.round(s.y - 30) + 'px)';
        if (c && now >= cdUntil && _egNkDotHit(s.el, _egNkPlayerRect(), 0)) {
            cdUntil = now + 1500;
            const dealt = _egNkHit(dmgPct, null, level);
            _egNkAbilityHitToast(dealt, 'The Snail', 'Doom Snail');
        }
        return e < durMs;
    });
}
