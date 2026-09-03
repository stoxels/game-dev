//------------------------------------------------------------------------
//-------------------BOSS: THE CENTIPEDE (boss_centipede)-----------------------
//------------------------------------------------------------------------
// Arcade homage: a segmented centipede winds across the screen, head
// leading, body trailing through every curve. Do not touch any part of it.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_centipede: {
        id: 'boss_centipede', name: 'The Centipede', emoji: '🐛',
        baseHP: 960, baseDamage: 20, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_centipede: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.45 },
            { threshold: 0.30, chargeMax: 7, damageMultiplier: 1.90 },
        ],
        immunityDuration: 2200,
        mechanics: [
            { name: 'centipede_cross', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechCentipedeCross' },
            { name: 'clue_scramble', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechClueScramble' },
        ],
    },
});


function _egMechCentipedeCross(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const segs = [0, 7, 8, 10][p];
    const speed = [0, 150, 175, 205][p];
    const amp = 70, freq = 2.0, segGap = 34;
    const radius = 16;
    const dmgPct = [0, 0.09, 0.11, 0.14][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const baseY = window.innerHeight * (0.3 + Math.random() * 0.4);
    const parts = [];
    for (let i = 0; i < segs; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-seg', i === 0 ? '🐛' : '🟤');
        parts.push({ dist: -i * segGap, cdUntil: 0, el });
    }
    _egNkToast('eg_mech_centipede', '🐛 The Centipede: Centipede Crossing! Mind every segment!');
    let headX = window.innerWidth + 60, e = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        headX -= speed * dtS;
        const pr = _egNkPlayerRect();
        let pending = false;
        parts.forEach(sg => {
            // Each segment trails the head by its gap distance along the path.
            const sx = headX + sg.dist;
            const sy = baseY + Math.sin((e / 1000) * freq + (-sg.dist) / 120) * amp;
            if (sx < -40) return;
            pending = true;
            sg.el.style.transform = 'translate(' + Math.round(sx - 14) + 'px,' + Math.round(sy - 14) + 'px)';
            if (pr && now >= sg.cdUntil && _egNkCircleHit(sx, sy, radius, pr, 0)) {
                sg.cdUntil = now + 800;
                _egNkHit(dmgPct, null, level);
            }
        });
        return pending || headX > -segs * segGap - 60;
    });
}
