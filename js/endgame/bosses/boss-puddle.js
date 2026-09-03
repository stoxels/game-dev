//------------------------------------------------------------------------
//-------------------BOSS: THE PUDDLE (boss_puddle)-----------------------------
//------------------------------------------------------------------------
// Lazy-rain fight: three puddles wander the screen at a stroll. Step in
// one and it soaks you — nothing dramatic, just a steady drip while you
// solve. Watch your feet.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_puddle: {
        id: 'boss_puddle', name: 'The Puddle', emoji: '💧',
        baseHP: 920, baseDamage: 18, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_puddle: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.35 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.75 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'wander_puddles', intervalBase: 19000, intervalVariance: 5000, handler: '_egMechWanderPuddles' },
            { name: 'fated_cell', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechFatedCell' },
        ],
    },
});


function _egMechWanderPuddles(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const speed = [0, 45, 55, 70][p];
    const radius = 70;
    const dotPct = [0, 7, 8, 10][p];
    const durMs = 10000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const puddles = [];
    for (let i = 0; i < 3; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-puddle');
        el.style.width = radius * 2 + 'px';
        el.style.height = radius * 2 + 'px';
        const z = {
            x: 100 + Math.random() * Math.max(100, window.innerWidth - 200),
            y: 100 + Math.random() * Math.max(100, window.innerHeight - 200),
            a: Math.random() * Math.PI * 2,
            el,
        };
        puddles.push(z);
    }
    _egNkToast('eg_mech_puddle', '💧 The Puddle: Wander Puddles! Watch your feet!');
    let e = 0, dotWarnAt = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        puddles.forEach((z, i) => {
            // Lazy random walk, bouncing off the screen edges.
            if (Math.random() < dtS * 0.8) z.a += (Math.random() - 0.5) * 2.2;
            z.x += Math.cos(z.a) * speed * dtS;
            z.y += Math.sin(z.a) * speed * dtS;
            if (z.x < radius || z.x > window.innerWidth - radius) z.a = Math.PI - z.a;
            if (z.y < radius || z.y > window.innerHeight - radius) z.a = -z.a;
            z.x = Math.max(radius, Math.min(window.innerWidth - radius, z.x));
            z.y = Math.max(radius, Math.min(window.innerHeight - radius, z.y));
            z.el.style.transform = 'translate(' + Math.round(z.x - radius) + 'px,' + Math.round(z.y - radius) + 'px)';
        });
        const pr = _egNkPlayerRect();
        if (pr) {
            const inside = puddles.some(z => _egNkCircleHit(z.x, z.y, radius, pr, 0));
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
