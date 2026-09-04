//------------------------------------------------------------------------
//-------------------BOSS: THE MARKSMAN (boss_marksman)---------------------------
//------------------------------------------------------------------------
// Aimed strikes land where you stand — never stand still.
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
    boss_marksman: {
        id: 'boss_marksman', name: 'The Marksman', emoji: '🎯',
        baseHP: 960, baseDamage: 24, chargeMax: 10,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_marksman: {
        phases: [
            { threshold: 1.00, chargeMax: 10, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'marked_strikes', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechMarkedStrikes' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
        ],
    },
});


function _egMechMarkedStrikes(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const shots = p >= 3 ? 6 : 4;
    const intervalMs = 1500, warnMs = 900, radius = 70;
    const dmgPct = [0, 0.10, 0.12, 0.15][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const marks = [];
    let left = shots, nextAt = 0, e = 0;
    _egNkToast('eg_mech_marks', '🎯 The Marksman: Marked Strikes! Never stand still!');
    _egNkLoop(run, (dtS) => {
        e += dtS * 1000;
        if (left > 0 && e >= nextAt) {
            nextAt = e + intervalMs;
            left--;
            const c = _egNkPlayerCenter();
            const x = c ? c.x : window.innerWidth / 2;
            const y = c ? c.y : window.innerHeight / 2;
            const el = _egNkEl(run, 'div', 'eg-nk-mark');
            el.style.left = Math.round(x - radius) + 'px';
            el.style.top = Math.round(y - radius) + 'px';
            el.style.width = radius * 2 + 'px';
            el.style.height = radius * 2 + 'px';
            marks.push({ x, y, t: 0, struck: false, el });
        }
        const pr = _egNkPlayerRect();
        for (let i = marks.length - 1; i >= 0; i--) {
            const m = marks[i];
            m.t += dtS * 1000;
            if (!m.struck && m.t >= warnMs) {
                m.struck = true;
                m.el.classList.add('eg-nk-mark-hit');
                if (pr && _egNkCircleHit(m.x, m.y, radius, pr, 0)) {
                    const dealt = _egNkHit(dmgPct, 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Marksman', 'Marked Strikes');
                }
            }
            if (m.t >= warnMs + 450) {
                m.el.remove();
                marks.splice(i, 1);
            }
        }
        return left > 0 || marks.length > 0;
    });
}
