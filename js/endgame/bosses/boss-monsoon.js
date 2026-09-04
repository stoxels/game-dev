//------------------------------------------------------------------------
//-------------------BOSS: THE MONSOON (boss_monsoon)---------------------------
//------------------------------------------------------------------------
// Bubble-Man homage: a storm of telegraphed shrapnel drops — some aimed at
// where you stand, some random. Never stop moving.
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
    boss_monsoon: {
        id: 'boss_monsoon', name: 'The Monsoon', emoji: '🌧️',
        baseHP: 1000, baseDamage: 22, chargeMax: 12,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_monsoon: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'shrapnel_rain', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechMonsoonRain' },
            { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechMonsoonRain(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const total = [0, 10, 12, 14][p];
    const emitMs = 2500;
    const warnMs = 800, radius = 26;
    const dmgPct = [0, 0.06, 0.07, 0.09][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const drops = [];
    let emitted = 0, emitAcc = 0, cdUntil = 0;
    _egNkToast('eg_mech_monsoon', '🌧️ The Monsoon: Shrapnel Rain! Keep moving!');
    _egNkLoop(run, (dtS, now) => {
        emitAcc += dtS * 1000;
        const step = emitMs / total;
        while (emitted < total && emitAcc >= step) {
            emitAcc -= step;
            emitted++;
            let x, y;
            if (Math.random() < 0.65) {
                const c = _egNkPlayerCenter();
                x = (c ? c.x : window.innerWidth / 2) + (Math.random() * 240 - 120);
                y = (c ? c.y : window.innerHeight / 2) + (Math.random() * 240 - 120);
            } else {
                x = 40 + Math.random() * Math.max(40, window.innerWidth - 80);
                y = 40 + Math.random() * Math.max(40, window.innerHeight - 80);
            }
            const el = _egNkEl(run, 'div', 'eg-nk-mark');
            el.style.left = Math.round(x - radius) + 'px';
            el.style.top = Math.round(y - radius) + 'px';
            el.style.width = radius * 2 + 'px';
            el.style.height = radius * 2 + 'px';
            drops.push({ x, y, t: 0, struck: false, el });
        }
        const pr = _egNkPlayerRect();
        for (let i = drops.length - 1; i >= 0; i--) {
            const d = drops[i];
            d.t += dtS * 1000;
            if (!d.struck && d.t >= warnMs) {
                d.struck = true;
                d.el.classList.add('eg-nk-mark-hit');
                if (pr && now >= cdUntil && _egNkCircleHit(d.x, d.y, radius, pr, 0)) {
                    cdUntil = now + 400;
                    const dealt = _egNkHit(dmgPct, 'cold', level);
                    _egNkAbilityHitToast(dealt, 'The Monsoon', 'Shrapnel Rain');
                }
            }
            if (d.t >= warnMs + 450) {
                d.el.remove();
                drops.splice(i, 1);
            }
        }
        return emitted < total || drops.length > 0;
    });
}
