//------------------------------------------------------------------------
//-------------------BOSS: THE FIREFLY (boss_firefly)---------------------------
//------------------------------------------------------------------------
// Dusk-garden fight: four fireflies drift after you with loose, lazy
// curiosity. Each sting is tiny — the lesson is simply to never stand
// still for long.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_firefly: {
        id: 'boss_firefly', name: 'The Firefly', emoji: '✨',
        baseHP: 880, baseDamage: 19, chargeMax: 13,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_firefly: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.35 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.75 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'firefly_drift', intervalBase: 18000, intervalVariance: 5000, handler: '_egMechFireflyDrift' },
            { name: 'corrupt_cells', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechFireflyDrift(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = [0, 4, 5, 6][p];
    const speed = [0, 70, 85, 105][p];
    const radius = 12;
    const dmgPct = [0, 0.04, 0.05, 0.06][p];
    const durMs = 9000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const flies = [];
    for (let i = 0; i < count; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-firefly', '✨');
        flies.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            wob: Math.random() * 6.28, cdUntil: 0, el,
        });
    }
    _egNkToast('eg_mech_firefly', '✨ The Firefly: Firefly Drift! Never stand still for long!');
    let e = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        flies.forEach(f => {
            if (c) {
                const dx = c.x - f.x, dy = c.y - f.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                f.x += (dx / d) * speed * dtS + Math.cos(e / 1000 * 4 + f.wob) * 26 * dtS;
                f.y += (dy / d) * speed * dtS + Math.sin(e / 1000 * 3.1 + f.wob) * 26 * dtS;
            }
            f.el.style.transform = 'translate(' + Math.round(f.x - 12) + 'px,' + Math.round(f.y - 12) + 'px)';
            if (pr && now >= f.cdUntil && _egNkCircleHit(f.x, f.y, radius, pr, 2)) {
                f.cdUntil = now + 700;
                _egNkHit(dmgPct, 'lightning', level);
            }
        });
        return e < durMs;
    });
}
