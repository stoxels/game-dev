//------------------------------------------------------------------------
//-------------------BOSS: THE COIL (boss_coil)---------------------------
//------------------------------------------------------------------------
// Snake-Man homage: slow homing snakes that fuse and detonate.
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
    boss_coil: {
        id: 'boss_coil', name: 'The Coil', emoji: '🐍',
        baseHP: 1020, baseDamage: 23, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_coil: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'seeker_snakes', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechSeekerSnakes' },
            { name: 'frozen_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechFrozenCells', phase2Only: true },
        ],
    },
});


function _egMechSeekerSnakes(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = p >= 3 ? 3 : 2;
    const speed = [0, 48, 58, 70][p];
    const triggerR = 75, fuseMs = 800, blastR = 100;
    const dmgPct = [0, 0.14, 0.17, 0.21][p];
    const lifeMs = 16000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const snakes = [];
    for (let i = 0; i < count; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-snake', '🐍');
        const s = {
            x: window.innerWidth + 40 + i * 90,
            y: 80 + Math.random() * Math.max(80, window.innerHeight - 160),
            t: 0, life: lifeMs, state: 'hunt', el,
        };
        el.style.transform = 'translate(' + Math.round(s.x - 22) + 'px,' + Math.round(s.y - 22) + 'px)';
        snakes.push(s);
    }
    _egNkToast('eg_mech_snakes', '🐍 The Coil: Seeker Snakes! They follow you!');
    _egNkLoop(run, (dtS) => {
        let pending = false;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        snakes.forEach(s => {
            if (s.state === 'dead') {
                s.deadT = (s.deadT || 0) + dtS * 1000;
                if (s.deadT < 450) pending = true;
                else s.el.style.display = 'none';
                return;
            }
            pending = true;
            s.life -= dtS * 1000;
            if (s.state === 'hunt') {
                if (c) {
                    const dx = c.x - s.x, dy = c.y - s.y;
                    const d = Math.sqrt(dx * dx + dy * dy) || 1;
                    s.x += (dx / d) * speed * dtS;
                    s.y += (dy / d) * speed * dtS;
                }
                s.el.style.transform = 'translate(' + Math.round(s.x - 22) + 'px,' + Math.round(s.y - 22) + 'px)';
                const dist = c ? Math.sqrt((c.x - s.x) * (c.x - s.x) + (c.y - s.y) * (c.y - s.y)) : 9999;
                if (dist < triggerR || s.life <= 0) {
                    s.state = 'fuse';
                    s.t = 0;
                    s.el.classList.add('eg-nk-fuse');
                }
            } else if (s.state === 'fuse') {
                s.t += dtS * 1000;
                if (s.t >= fuseMs) {
                    s.state = 'dead';
                    s.deadT = 0;
                    s.el.classList.add('eg-nk-boom');
                    if (pr && _egNkCircleHit(s.x, s.y, blastR, pr, 0)) {
                        const dealt = _egNkHit(dmgPct, 'shadow', level);
                        _egNkAbilityHitToast(dealt, 'The Coil', 'Seeker Snakes');
                    }
                }
            }
        });
        return pending;
    });
}
