//------------------------------------------------------------------------
//-------------------BOSS: THE EXECUTIONER (boss_executioner)-------------------
//------------------------------------------------------------------------
// Pendulum homage: a great axe swings across the lower arena on a slow,
// terrible arc. The blade is death; the rhythm is mercy. Time your
// crossings to the top of its swing.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_executioner: {
        id: 'boss_executioner', name: 'The Executioner', emoji: '🪓',
        baseHP: 1100, baseDamage: 25, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_executioner: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'axe_pendulum', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechAxePendulum' },
            { name: 'prior_bomb', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechAxePendulum(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const periodMs = [0, 2600, 2200, 1800][p];
    const swing = 1.1; // radians either side of straight down
    const bladeR = 34;
    const dmgPct = [0, 0.24, 0.28, 0.34][p];
    const durMs = 10000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const px = window.innerWidth * 0.5, py = 40;
    const armLen = window.innerHeight * 0.62;
    const pivot = _egNkEl(run, 'div', 'eg-nk-dot', '⛓️');
    pivot.style.transform = 'translate(' + Math.round(px - 22) + 'px,' + Math.round(py - 22) + 'px)';
    const arm = _egNkEl(run, 'div', 'eg-nk-pendulum-arm');
    arm.style.width = '6px';
    arm.style.height = Math.round(armLen) + 'px';
    arm.style.left = Math.round(px - 3) + 'px';
    arm.style.top = Math.round(py) + 'px';
    const blade = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-pendulum', '🪓');
    _egNkToast('eg_mech_executioner', '🪓 The Executioner: Axe Pendulum! Time the swing!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        // Pendulum angle: sinusoidal sweep, fastest at the bottom.
        const a = Math.sin((e / periodMs) * Math.PI * 2) * swing;
        arm.style.transform = 'rotate(' + a + 'rad)';
        arm.style.transformOrigin = '50% 0%';
        const bx = px + Math.sin(a) * armLen;
        const by = py + Math.cos(a) * armLen;
        blade.style.transform = 'translate(' + Math.round(bx - 30) + 'px,' + Math.round(by - 30) + 'px) rotate(' + (a * 2) + 'rad)';
        if (now >= cdUntil && _egNkCircleHit(bx, by, bladeR, _egNkPlayerRect(), 0)) {
            cdUntil = now + 1000;
            const dealt = _egNkHit(dmgPct, null, level);
            _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
        }
        return e < durMs;
    });
}
