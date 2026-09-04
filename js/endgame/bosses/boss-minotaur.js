//------------------------------------------------------------------------
//-------------------BOSS: THE MINOTAUR (boss_minotaur)-------------------------
//------------------------------------------------------------------------
// Bull-rush homage: the Minotaur lowers its head, a dust line marks your
// height — then it charges clean across the screen. Vertical movement is
// life; the horns do not miss twice.
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
    boss_minotaur: {
        id: 'boss_minotaur', name: 'The Minotaur', emoji: '🐂',
        baseHP: 1140, baseDamage: 25, chargeMax: 13,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_minotaur: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'bull_rush', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechBullRush' },
            { name: 'fog_bank', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechFogBank' },
            { name: 'prior_bomb', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechBullRush(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const rushes = [0, 2, 3, 4][p];
    const warnMs = 1000, dashSpeed = 900, gapMs = 700;
    const bandH = 90;
    const dmgPct = [0, 0.24, 0.28, 0.34][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    let idx = 0, stage = 'idle', t = 0, dir = 1, ry = 0;
    let lineEl = null, bullEl = null, bx = 0, hitDone = false;
    const clearRushEls = () => {
        if (lineEl) { lineEl.remove(); lineEl = null; }
        if (bullEl) { bullEl.remove(); bullEl = null; }
    };
    _egNkToast('eg_mech_rush', '🐂 The Minotaur: Bull Rush! Clear the dust line!');
    _egNkLoop(run, (dtS) => {
        if (idx >= rushes) { clearRushEls(); return false; }
        t += dtS * 1000;
        if (stage === 'idle') {
            const c = _egNkPlayerCenter();
            ry = Math.max(bandH / 2 + 20, Math.min(window.innerHeight - bandH / 2 - 20,
                c ? c.y : window.innerHeight / 2));
            dir = idx % 2 === 0 ? 1 : -1; // alternate sides
            lineEl = _egNkEl(run, 'div', 'eg-nk-band');
            lineEl.style.top = Math.round(ry - bandH / 2) + 'px';
            lineEl.style.height = bandH + 'px';
            stage = 'warn';
            t = 0;
            hitDone = false;
        } else if (stage === 'warn') {
            if (t >= warnMs) {
                stage = 'dash';
                t = 0;
                if (lineEl) {
                    lineEl.classList.add('eg-nk-band-hit');
                    _egNkSlamShatter(lineEl, run); // hooves tear the ground as the rush starts
                }
                bx = dir > 0 ? -90 : window.innerWidth + 90;
                bullEl = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-charger', dir > 0 ? '🐂' : '🐂');
            }
        } else if (stage === 'dash') {
            bx += dir * dashSpeed * dtS;
            if (bullEl) {
                bullEl.style.transform = 'translate(' + Math.round(bx - 35) + 'px,' + Math.round(ry - 35) + 'px)';
                if (dir < 0) bullEl.style.scale = '-1 1';
            }
            if (!hitDone) {
                const pr = _egNkPlayerRect();
                if (pr && pr.right > bx - 35 && pr.left < bx + 35
                    && pr.bottom > ry - bandH / 2 && pr.top < ry + bandH / 2) {
                    hitDone = true;
                    const dealt = _egNkHit(dmgPct, null, level);
                    _egNkAbilityHitToast(dealt, 'The Minotaur', 'Bull Rush');
                }
            }
            const done = dir > 0 ? bx > window.innerWidth + 90 : bx < -90;
            if (done) {
                clearRushEls();
                stage = 'gap';
                t = 0;
            }
        } else if (stage === 'gap') {
            if (t >= gapMs) {
                stage = 'idle';
                t = 0;
                idx++;
            }
        }
        return true;
    });
}
