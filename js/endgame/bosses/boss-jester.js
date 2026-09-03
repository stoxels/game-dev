//------------------------------------------------------------------------
//-------------------BOSS: THE JESTER (boss_jester)-----------------------------
//------------------------------------------------------------------------
// Boshy homage: the Jester juggles bouncing orbs that ricochet around the
// screen for several seconds. Dense but fair — every orb is slow enough to
// track, but there is no safe corner.
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
    boss_jester: {
        id: 'boss_jester', name: 'The Jester', emoji: '🤹',
        baseHP: 960, baseDamage: 22, chargeMax: 10,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_jester: {
        phases: [
            { threshold: 1.00, chargeMax: 10, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'bouncing_mayhem', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechJugglerOrbs' },
            { name: 'clue_swap', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechClueSwap' },
        ],
    },
});


function _egMechJugglerOrbs(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = [0, 5, 6, 7][p];
    const speed = [0, 200, 230, 260][p];
    const radius = 12;
    const dmgPct = [0, 0.05, 0.06, 0.08][p];
    const durMs = 9000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const orbs = [];
    for (let i = 0; i < count; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-orb-jester');
        const a = Math.random() * Math.PI * 2;
        const o = {
            x: 60 + Math.random() * Math.max(60, window.innerWidth - 120),
            y: 60 + Math.random() * Math.max(60, window.innerHeight - 120),
            vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
            cdUntil: 0, el,
        };
        orbs.push(o);
    }
    _egNkToast('eg_mech_juggle', '🤹 The Jester: Bouncing Mayhem! Watch every angle!');
    let e = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const pr = _egNkPlayerRect();
        orbs.forEach(o => {
            o.x += o.vx * dtS;
            o.y += o.vy * dtS;
            if (o.x < radius || o.x > window.innerWidth - radius) o.vx *= -1;
            if (o.y < radius || o.y > window.innerHeight - radius) o.vy *= -1;
            o.x = Math.max(radius, Math.min(window.innerWidth - radius, o.x));
            o.y = Math.max(radius, Math.min(window.innerHeight - radius, o.y));
            o.el.style.transform = 'translate(' + Math.round(o.x - 9) + 'px,' + Math.round(o.y - 9) + 'px)';
            if (pr && now >= o.cdUntil && _egNkCircleHit(o.x, o.y, radius, pr, 2)) {
                o.cdUntil = now + 600;
                _egNkHit(dmgPct, 'shadow', level);
            }
        });
        return e < durMs;
    });
}
