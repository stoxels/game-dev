//------------------------------------------------------------------------
//-------------------BOSS: THE SPROUT (boss_sprout)-----------------------------
//------------------------------------------------------------------------
// Pikmin homage: six tiny sproutlings toddle after you. Each barely
// scratches — but they spread out, cut off corners, and never tire.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_sprout: {
        id: 'boss_sprout', name: 'The Sprout', emoji: '🌱',
        baseHP: 900, baseDamage: 18, chargeMax: 13,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_sprout: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.35 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.75 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'sproutlings', intervalBase: 19000, intervalVariance: 5000, handler: '_egMechSproutlings' },
            { name: 'prior_bomb', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechSproutlings(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = [0, 6, 7, 8][p];
    const speed = [0, 55, 65, 78][p];
    const radius = 12;
    const dmgPct = [0, 0.035, 0.04, 0.05][p];
    const durMs = 10000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const minis = [];
    for (let i = 0; i < count; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-sprout', '🌱');
        const m = {
            // Fan out from the bottom corners so they flank you.
            x: i % 2 === 0 ? 50 : window.innerWidth - 50,
            y: window.innerHeight - 60 - i * 30,
            wob: Math.random() * 6.28, cdUntil: 0, el,
        };
        minis.push(m);
    }
    _egNkToast('eg_mech_sprout', '🌱 The Sprout: Sproutlings! They just want a hug!');
    let e = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        minis.forEach(m => {
            if (c) {
                const dx = c.x - m.x, dy = c.y - m.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                m.x += (dx / d) * speed * dtS + Math.cos(e / 1000 * 3 + m.wob) * 12 * dtS;
                m.y += (dy / d) * speed * dtS;
            }
            m.el.style.transform = 'translate(' + Math.round(m.x - 14) + 'px,' + Math.round(m.y - 14) + 'px)';
            if (pr && now >= m.cdUntil && _egNkDotHit(m.el, pr, 2)) {
                m.cdUntil = now + 700;
                _egNkHit(dmgPct, null, level);
            }
        });
        return e < durMs;
    });
}
