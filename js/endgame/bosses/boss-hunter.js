//------------------------------------------------------------------------
//-------------------BOSS: THE HUNTER (boss_hunter)-----------------------------
//------------------------------------------------------------------------
// Ambush-predator homage: three seekers sleep in the arena, harmless as
// stones — until you come close. Then they ignite, scream inward, and burn
// out. Feed them distance and they starve.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_hunter: {
        id: 'boss_hunter', name: 'The Hunter', emoji: '🏹',
        baseHP: 1060, baseDamage: 24, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_hunter: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'dormant_seekers', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechDormantSeekers' },
            { name: 'fog_bank', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechFogBank' },
        ],
    },
});


function _egMechDormantSeekers(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const wakeRange = 260;
    const igniteMs = 500, chaseMs = [0, 2800, 3200, 3600][p];
    const chaseSpeed = [0, 190, 220, 255][p];
    const radius = 22;
    const dmgPct = [0, 0.15, 0.18, 0.22][p];
    const durMs = 12000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const seekers = [0.25, 0.5, 0.75].map(fx => {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-seeker', '🏹');
        const s = {
            x: window.innerWidth * fx,
            y: window.innerHeight * (0.3 + Math.random() * 0.4),
            stage: 'sleep', t: 0, el,
        };
        el.style.transform = 'translate(' + Math.round(s.x - 22) + 'px,' + Math.round(s.y - 22) + 'px)';
        return s;
    });
    _egNkToast('eg_mech_hunter', '🏹 The Hunter: Dormant Seekers! Feed them distance!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        seekers.forEach(s => {
            const d = c ? Math.hypot(c.x - s.x, c.y - s.y) : 9999;
            if (s.stage === 'sleep') {
                s.el.style.opacity = '0.45';
                if (d < wakeRange) {
                    s.stage = 'ignite';
                    s.t = 0;
                    s.el.style.opacity = '';
                    s.el.classList.add('eg-nk-fuse');
                }
            } else if (s.stage === 'ignite') {
                s.t += dtS * 1000;
                if (s.t >= igniteMs) {
                    s.stage = 'chase';
                    s.t = 0;
                    s.el.classList.remove('eg-nk-fuse');
                }
            } else if (s.stage === 'chase') {
                s.t += dtS * 1000;
                if (c) {
                    const dx = c.x - s.x, dy = c.y - s.y;
                    const dd = Math.sqrt(dx * dx + dy * dy) || 1;
                    s.x += (dx / dd) * chaseSpeed * dtS;
                    s.y += (dy / dd) * chaseSpeed * dtS;
                }
                s.el.style.transform = 'translate(' + Math.round(s.x - 22) + 'px,' + Math.round(s.y - 22) + 'px)';
                if (pr && now >= cdUntil && _egNkCircleHit(s.x, s.y, radius, pr, 0)) {
                    cdUntil = now + 800;
                    const dealt = _egNkHit(dmgPct, 'shadow', level);
                    _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
                }
                if (s.t >= chaseMs) {
                    s.stage = 'spent';
                    s.el.style.opacity = '0.25';
                }
            }
        });
        return e < durMs;
    });
}
