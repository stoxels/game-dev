//------------------------------------------------------------------------
//-------------------BOSS: THE THWOMP (boss_thwomp)-----------------------------
//------------------------------------------------------------------------
// Mario homage: a crushing slam. A shadow marker stalks your avatar, then
// locks in — half a second later the Thwomp lands there. Be elsewhere.
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
    boss_thwomp: {
        id: 'boss_thwomp', name: 'The Thwomp', emoji: '🪨',
        baseHP: 1120, baseDamage: 25, chargeMax: 13,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_thwomp: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'thwomp_slam', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechThwompSlam' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechSoulTithe' },
            { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechThwompSlam(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const slams = [0, 2, 3, 3][p];
    const followMs = 1200, lockMs = 600;
    const radius = [0, 95, 95, 110][p];
    const dmgPct = [0, 0.24, 0.28, 0.34][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const queue = [];
    for (let i = 0; i < slams; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-mark');
        el.style.display = 'none';
        queue.push({ x: 0, y: 0, t: 0, stage: 'wait', delay: i * 1600, el });
    }
    _egNkToast('eg_mech_thwomp', '🪨 The Thwomp: Crushing Slam! Do NOT be there!');
    _egNkLoop(run, (dtS) => {
        let pending = false;
        queue.forEach(s => {
            if (s.stage === 'done') return;
            pending = true;
            s.t += dtS * 1000;
            if (s.stage === 'wait') {
                if (s.t < s.delay) return;
                s.stage = 'follow';
                s.t = 0;
                s.el.style.display = '';
                s.el.style.width = radius * 2 + 'px';
                s.el.style.height = radius * 2 + 'px';
            } else if (s.stage === 'follow') {
                const c = _egNkPlayerCenter();
                if (c) { s.x = c.x; s.y = c.y; }
                s.el.style.left = Math.round(s.x - radius) + 'px';
                s.el.style.top = Math.round(s.y - radius) + 'px';
                if (s.t >= followMs) { s.stage = 'lock'; s.t = 0; s.el.classList.add('eg-nk-mark-hit'); }
            } else if (s.stage === 'lock') {
                if (s.t >= lockMs) {
                    s.stage = 'done';
                    // Impact flash: falling rock emoji, then clear.
                    const rock = _egNkEl(run, 'div', 'eg-nk-dot', '🪨');
                    rock.style.transform = 'translate(' + Math.round(s.x - 22) + 'px,' + Math.round(s.y - 22) + 'px)';
                    setTimeout(() => rock.remove(), 350);
                    s.el.remove();
                    if (_egNkCircleHit(s.x, s.y, radius, _egNkPlayerRect(), 0)) {
                        const dealt = _egNkHit(dmgPct, null, level);
                        _egNkAbilityHitToast(dealt, 'The Thwomp', 'Crushing Slam');
                    }
                }
            }
        });
        return pending;
    });
}
