//------------------------------------------------------------------------
//-------------------BOSS: THE BUMPER (boss_bumper)-----------------------------
//------------------------------------------------------------------------
// Fall-Guys homage: three bumpers sit in the arena. Touch one and it
// flings you across the screen — hilarious until it flings you into the
// next bumper. Plan your routes, bounce with intent.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_bumper: {
        id: 'boss_bumper', name: 'The Bumper', emoji: '🎪',
        baseHP: 950, baseDamage: 20, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_bumper: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.45 },
            { threshold: 0.30, chargeMax: 7, damageMultiplier: 1.90 },
        ],
        immunityDuration: 2200,
        mechanics: [
            { name: 'bumper_party', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechBumperParty' },
            { name: 'fog_bank', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechFogBank' },
        ],
    },
});


function _egMechBumperParty(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const radius = 46;
    const fling = [0, 320, 380, 460][p];
    const dmgPct = [0, 0.07, 0.08, 0.10][p];
    const durMs = 10000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const spots = [
        { x: window.innerWidth * 0.3, y: window.innerHeight * 0.35 },
        { x: window.innerWidth * 0.7, y: window.innerHeight * 0.35 },
        { x: window.innerWidth * 0.5, y: window.innerHeight * 0.7 },
    ];
    const bumpers = spots.map(s => {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-bumper', '🎪');
        el.style.transform = 'translate(' + Math.round(s.x - 30) + 'px,' + Math.round(s.y - 30) + 'px)';
        return { ...s, cdUntil: 0, el };
    });
    _egNkToast('eg_mech_bumper', '🎪 The Bumper: Bumper Party! Bounce with intent!');
    let e = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        bumpers.forEach(b => {
            // Cheerful idle pulse is handled by CSS; hitbox stays put.
            if (c && now >= b.cdUntil && _egNkDotHit(b.el, _egNkPlayerRect(), 0)) {
                b.cdUntil = now + 900;
                const dx = c.x - b.x, dy = c.y - b.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                _egNkNudgeAvatar((dx / d) * fling * dtS * 10, (dy / d) * fling * dtS * 10);
                b.el.classList.add('eg-nk-boom');
                setTimeout(() => b.el.classList.remove('eg-nk-boom'), 300);
                const dealt = _egNkHit(dmgPct, null, level);
                _egNkAbilityHitToast(dealt, 'The Bumper', 'Bumper Party');
            }
        });
        return e < durMs;
    });
}
