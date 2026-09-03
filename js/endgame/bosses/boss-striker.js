//------------------------------------------------------------------------
//-------------------BOSS: THE STRIKER (boss_striker)---------------------------
//------------------------------------------------------------------------
// Rocket-League homage: ONE giant ball, bouncing around the arena. It is
// slow enough to read, big enough to fear — and every touch sends you
// flying. Respect the ball.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_striker: {
        id: 'boss_striker', name: 'The Striker', emoji: '⚽',
        baseHP: 980, baseDamage: 21, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_striker: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.45 },
            { threshold: 0.30, chargeMax: 7, damageMultiplier: 1.90 },
        ],
        immunityDuration: 2200,
        mechanics: [
            { name: 'striker_ball', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechStrikerBall' },
            { name: 'prior_bomb', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechStrikerBall(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const speed = [0, 170, 200, 235][p];
    const radius = 55;
    const dmgPct = [0, 0.11, 0.13, 0.16][p];
    const durMs = 10000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-ball', '⚽');
    const a0 = Math.random() * Math.PI * 2;
    const b = {
        x: window.innerWidth / 2, y: window.innerHeight / 2,
        vx: Math.cos(a0) * speed, vy: Math.sin(a0) * speed,
        el,
    };
    _egNkToast('eg_mech_striker', '⚽ The Striker: Striker Ball! Respect the ball!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        b.x += b.vx * dtS;
        b.y += b.vy * dtS;
        if (b.x < radius || b.x > window.innerWidth - radius) b.vx *= -1;
        if (b.y < radius || b.y > window.innerHeight - radius) b.vy *= -1;
        b.x = Math.max(radius, Math.min(window.innerWidth - radius, b.x));
        b.y = Math.max(radius, Math.min(window.innerHeight - radius, b.y));
        b.el.style.transform = 'translate(' + Math.round(b.x - radius) + 'px,' + Math.round(b.y - radius) + 'px)';
        const c = _egNkPlayerCenter();
        if (c && now >= cdUntil && _egNkCircleHit(b.x, b.y, radius, _egNkPlayerRect(), 0)) {
            cdUntil = now + 1000;
            const dx = c.x - b.x, dy = c.y - b.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            _egNkNudgeAvatar((dx / d) * 220 * dtS * 10, (dy / d) * 220 * dtS * 10);
            const dealt = _egNkHit(dmgPct, null, level);
            _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
        }
        return e < durMs;
    });
}
