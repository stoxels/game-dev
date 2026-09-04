//------------------------------------------------------------------------
//-------------------BOSS: THE DYNAMO (boss_dynamo)---------------------------
//------------------------------------------------------------------------
// Spark-Mandrill homage: sequential lightning pillars, stand in the gaps.
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
    boss_dynamo: {
        id: 'boss_dynamo', name: 'The Dynamo', emoji: '⚡',
        baseHP: 980, baseDamage: 24, chargeMax: 11,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_dynamo: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'spark_pillars', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechSparkPillars' },
            { name: 'prior_bomb', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechSparkPillars(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const n = p >= 3 ? 7 : 5;
    const width = 46;
    const warnMs = 1000, activeMs = 700, staggerMs = 350;
    const dmgPct = [0, 0.13, 0.16, 0.20][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth;
    const pillars = [];
    for (let i = 0; i < n; i++) {
        const x = 60 + (W - 120) * (n === 1 ? 0.5 : i / (n - 1)) + (Math.random() * 80 - 40);
        const warnEl = _egNkEl(run, 'div', 'eg-nk-pillar-warn');
        warnEl.style.display = 'none';
        const pilEl = _egNkEl(run, 'div', 'eg-nk-pillar');
        pilEl.style.display = 'none';
        pillars.push({ x: Math.max(30, Math.min(W - 30, x)), t: -i * staggerMs, stage: 'warn', hitDone: false, warnEl, pilEl });
    }
    _egNkToast('eg_mech_pillars', '⚡ The Dynamo: Spark Pillars! Watch the warnings!');
    _egNkLoop(run, (dtS) => {
        let allDone = true;
        const pr = _egNkPlayerRect();
        pillars.forEach(pl => {
            if (pl.stage === 'done') return;
            allDone = false;
            pl.t += dtS * 1000;
            if (pl.t < 0) return;
            if (pl.stage === 'warn') {
                pl.warnEl.style.display = '';
                pl.warnEl.style.left = Math.round(pl.x - width / 2) + 'px';
                pl.warnEl.style.width = width + 'px';
                if (pl.t >= warnMs) {
                    pl.stage = 'active';
                    pl.warnEl.style.display = 'none';
                    pl.pilEl.style.display = '';
                    pl.pilEl.style.left = Math.round(pl.x - width / 2) + 'px';
                    pl.pilEl.style.width = width + 'px';
                }
            } else {
                if (!pl.hitDone && pr
                    && pr.right > pl.x - width / 2 && pr.left < pl.x + width / 2) {
                    pl.hitDone = true;
                    const dealt = _egNkHit(dmgPct, 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Dynamo', 'Spark Pillars');
                }
                if (pl.t >= warnMs + activeMs) {
                    pl.stage = 'done';
                    pl.pilEl.style.display = 'none';
                }
            }
        });
        return !allDone;
    });
}
