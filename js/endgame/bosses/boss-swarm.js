//------------------------------------------------------------------------
//-------------------BOSS: THE SWARM (boss_swarm)--------------------------------
//------------------------------------------------------------------------
// Galaga homage: three divebombers hold formation at the top of the screen,
// then peel off one by one — each telegraphs, then homes in on you. The
// formation always tells you who is next.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (corrupt_cells, probability_shift, prior_bomb,
// frozen_cells, clue_swap, grid_invert, summons, fated_cell, fog_bank,
// clue_scramble, soul_tithe) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_swarm: {
        id: 'boss_swarm', name: 'The Swarm', emoji: '🛸',
        baseHP: 1000, baseDamage: 23, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_swarm: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'divebombers', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechDivebombers' },
            { name: 'clue_scramble', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechClueScramble' },
            { name: 'prior_bomb', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechDivebombers(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const speed = [0, 230, 260, 300][p];
    const warnMs = 600, gapMs = 800;
    const radius = 24;
    const dmgPct = [0, 0.14, 0.16, 0.20][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth;
    const ships = [0.3, 0.5, 0.7].map(fx => {
        const el = _egNkEl(run, 'div', 'eg-nk-dot', '🛸');
        const s = { hx: W * fx, hy: 80, x: W * fx, y: 80, stage: 'hold', t: 0, hitDone: false, el };
        el.style.transform = 'translate(' + Math.round(s.x - 22) + 'px,' + Math.round(s.y - 22) + 'px)';
        return s;
    });
    _egNkToast('eg_mech_dive', '🛸 The Swarm: Divebombers! Watch who peels off!');
    let idx = 0;
    _egNkLoop(run, (dtS) => {
        if (idx >= ships.length) return false;
        const s = ships[idx];
        s.t += dtS * 1000;
        if (s.stage === 'hold') {
            // Gentle formation hover until it is this ship's turn.
            if (idx === 0 || ships[idx - 1].stage === 'gone') {
                if (s.t >= (idx === 0 ? 400 : gapMs)) {
                    s.stage = 'warn';
                    s.t = 0;
                    s.el.classList.add('eg-nk-fuse');
                }
            } else {
                s.t = 0; // wait for the previous ship to finish
            }
        } else if (s.stage === 'warn') {
            if (s.t >= warnMs) {
                s.stage = 'dive';
                s.el.classList.remove('eg-nk-fuse');
            }
        } else if (s.stage === 'dive') {
            const c = _egNkPlayerCenter();
            if (c) {
                const dx = c.x - s.x, dy = c.y - s.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                s.x += (dx / d) * speed * dtS;
                s.y += (dy / d) * speed * dtS;
            } else {
                s.y += speed * dtS;
            }
            s.el.style.transform = 'translate(' + Math.round(s.x - 22) + 'px,' + Math.round(s.y - 22) + 'px)';
            if (!s.hitDone && _egNkCircleHit(s.x, s.y, radius, _egNkPlayerRect(), 0)) {
                s.hitDone = true;
                const dealt = _egNkHit(dmgPct, 'fire', level);
                _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
            }
            if (s.y > window.innerHeight + 60) {
                s.stage = 'gone';
                s.el.remove();
                idx++;
            }
        }
        return true;
    });
}
