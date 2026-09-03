//------------------------------------------------------------------------
//-------------------BOSS: THE MAZE (boss_maze)---------------------------------
//------------------------------------------------------------------------
// Arcade-ghost homage: a gang of four, each with its own personality —
// one chases you, one ambushes where you are heading, one flanks sideways,
// one just wanders hungrily. Learn all four or be surrounded.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_maze: {
        id: 'boss_maze', name: 'The Maze', emoji: '👻',
        baseHP: 1040, baseDamage: 23, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_maze: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'ghost_gang', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechGhostGang' },
            { name: 'prior_bomb', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechGhostGang(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const radius = 24;
    const dmgPct = [0, 0.11, 0.13, 0.16][p];
    const durMs = 11000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const defs = [
        { emoji: '👻', cls: 'eg-nk-ghost-red', speed: [0, 78, 92, 110][p], brain: 'chase' },
        { emoji: '👻', cls: 'eg-nk-ghost-pink', speed: [0, 72, 86, 102][p], brain: 'ambush' },
        { emoji: '👻', cls: 'eg-nk-ghost-cyan', speed: [0, 75, 89, 106][p], brain: 'flank' },
        { emoji: '👻', cls: 'eg-nk-ghost-orange', speed: [0, 60, 72, 88][p], brain: 'wander' },
    ];
    const gang = defs.map((d, i) => {
        const el = _egNkEl(run, 'div', 'eg-nk-dot ' + d.cls, d.emoji);
        const g = {
            ...d,
            x: window.innerWidth * (0.2 + 0.2 * i),
            y: 70,
            wx: Math.random() * 6.28, wy: Math.random() * 6.28,
            cdUntil: 0, el,
        };
        return g;
    });
    _egNkToast('eg_mech_maze', '👻 The Maze: Ghost Gang! Each one hunts differently!');
    let e = 0, px = 0, py = 0, pvx = 0, pvy = 0, hasPrev = false;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        if (c) {
            if (hasPrev && dtS > 0) {
                pvx = (c.x - px) / dtS;
                pvy = (c.y - py) / dtS;
            }
            px = c.x;
            py = c.y;
            hasPrev = true;
        }
        gang.forEach(g => {
            let tx = null, ty = null;
            if (g.brain === 'chase' && c) {
                tx = c.x;
                ty = c.y;
            } else if (g.brain === 'ambush' && c) {
                // Targets where you are heading, 0.8s ahead.
                tx = c.x + pvx * 0.8;
                ty = c.y + pvy * 0.8;
            } else if (g.brain === 'flank' && c) {
                // Circles to your side: aim 140px perpendicular to your motion.
                const mx = hasPrev ? pvx : 0, my = hasPrev ? pvy : -1;
                const ml = Math.sqrt(mx * mx + my * my) || 1;
                tx = c.x + (-my / ml) * 140;
                ty = c.y + (mx / ml) * 140;
            } else if (g.brain === 'wander') {
                g.wx += dtS * 1.7;
                g.wy += dtS * 2.3;
                tx = g.x + Math.cos(g.wx) * 120 + (c ? (c.x - g.x) * 0.15 : 0);
                ty = g.y + Math.sin(g.wy) * 120 + (c ? (c.y - g.y) * 0.15 : 0);
            }
            if (tx != null) {
                const dx = tx - g.x, dy = ty - g.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                g.x += (dx / d) * g.speed * dtS;
                g.y += (dy / d) * g.speed * dtS;
            }
            g.el.style.transform = 'translate(' + Math.round(g.x - 22) + 'px,' + Math.round(g.y - 22) + 'px)';
            if (pr && now >= g.cdUntil && _egNkCircleHit(g.x, g.y, radius, pr, 0)) {
                g.cdUntil = now + 800;
                _egNkHit(dmgPct, 'shadow', level);
            }
        });
        return e < durMs;
    });
}
