//------------------------------------------------------------------------
//-------------------BOSS: THE NIGHTMARE (boss_nightmare)-----------------------
//------------------------------------------------------------------------
// Lights-out hunt: the arena drowns in darkness and something fast starts
// circling. You can barely see it — but you can hear the toast warnings,
// and the dark itself only tickles. The teeth are the thing in the black.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_nightmare: {
        id: 'boss_nightmare', name: 'The Nightmare', emoji: '🌃',
        baseHP: 1100, baseDamage: 24, chargeMax: 11,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_nightmare: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'dark_hunt', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechDarkHunt' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechSoulTithe' },
        ],
    },
});


function _egMechDarkHunt(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const chaseSpeed = [0, 105, 120, 140][p];
    const radius = 26;
    const dmgPct = [0, 0.15, 0.18, 0.22][p];
    const darkDot = [0, 3, 4, 5][p];
    const durMs = 10000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const dark = _egNkEl(run, 'div', 'eg-nk-darkling');
    const beast = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-nightbeast', '👹');
    const b = { x: window.innerWidth * 0.5, y: 80 };
    _egNkToast('eg_mech_nightmare', '🌃 The Nightmare: Dark Hunt! Something circles in the black!');
    let e = 0, cdUntil = 0, growlAt = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        if (c) {
            const dx = c.x - b.x, dy = c.y - b.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            // Circles more than it charges: heavy tangential drift.
            const wob = Math.sin(e / 1000 * 1.7) * 0.9;
            const hx = dx / d, hy = dy / d;
            const mx = hx * Math.cos(wob) - hy * Math.sin(wob);
            const my = hx * Math.sin(wob) + hy * Math.cos(wob);
            b.x += mx * chaseSpeed * dtS;
            b.y += my * chaseSpeed * dtS;
            if (d < 220 && now - growlAt > 3000) {
                growlAt = now;
                _egNkToast('eg_nk_move', '⚠️ It is close!', '#f87171');
            }
        }
        beast.style.transform = 'translate(' + Math.round(b.x - 22) + 'px,' + Math.round(b.y - 22) + 'px)';
        if (c && now >= cdUntil && _egNkDotHit(beast, pr, 0)) {
            cdUntil = now + 900;
            const dealt = _egNkHit(dmgPct, 'shadow', level);
            _egNkAbilityHitToast(dealt, 'The Nightmare', 'Dark Hunt');
        }
        if (pr) _egNkDotTick(run, darkDot, dtS, level, 'shadow');
        return e < durMs;
    });
}
