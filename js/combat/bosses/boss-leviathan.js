import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkDodgeBusy, _nkDotHit, _nkDotTick, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerRect, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE LEVIATHAN (boss_leviathan)-----------------------
//------------------------------------------------------------------------
// Rising-tide homage: a burning tide sweeps up the screen while wreckage
// rains from above. Outrun the water, dodge the debris, do not stop.
//
// Shared mechanics (corrupt_cells) live in shared-boss-abilities.js and
// are referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_leviathan: {
        id: 'boss_leviathan', name: 'The Leviathan', emoji: '🐋',
        baseHP: 1120, baseDamage: 25, chargeMax: 12,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_leviathan: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'rising_tide', intervalBase: 21000, intervalVariance: 5000, handler: '_mechRisingTide' },
            { name: 'corrupt_cells', intervalBase: 19000, intervalVariance: 4000, handler: '_mechCorruptCells' },
        ],
    },
});


// A burning tide rises from below while debris falls from above.
// Climb past the waterline and sidestep the falling wreckage.
export function _mechRisingTide(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const tideSpeed = [0, 90, 110, 135][p];
    const tideDot = [0, 12, 14, 17][p];
    const debrisN = [0, 5, 7, 9][p];
    const debrisSpeed = 260;
    const debrisDmg = [0, 0.07, 0.08, 0.10][p];
    const durMs = 9000;
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const H = window.innerHeight;
    const tide = _nkEl(run, 'div', 'eg-nk-tide');
    tide.textContent = '🌊🌊🌊';
    let tideY = H + 40; // waterline rises from below
    const debris = [];
    for (let i = 0; i < debrisN; i++) {
        const el = _nkEl(run, 'div', 'eg-nk-dot eg-nk-debris', '🪵');
        el.style.display = 'none';
        debris.push({
            x: 40 + Math.random() * Math.max(40, window.innerWidth - 80),
            y: -40 - i * (200 + Math.random() * 200),
            cdUntil: 0, el,
        });
    }
    _nkToast('eg_mech_leviathan', '🐋 The Leviathan: Rising Tide! Outrun the water!');
    let e = 0, dotWarnAt = 0, orbCdUntil = 0;
    _nkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        tideY -= tideSpeed * dtS;
        tide.style.top = Math.round(tideY) + 'px';
        const pr = _nkPlayerRect();
        if (pr) {
            if (pr.bottom > tideY + 20) {
                _nkDotTick(run, tideDot, dtS, level, 'cold');
                if (now - dotWarnAt > 2500) {
                    dotWarnAt = now;
                    _nkToast('eg_nk_move', '⚠️ The tide burns!', '#7dd3fc');
                }
            } else {
                run.dotAcc = 0;
            }
        }
        let debrisPending = false;
        debris.forEach(d => {
            if (d.y > H + 40) return;
            debrisPending = true;
            d.y += debrisSpeed * dtS;
            d.el.style.display = '';
            d.el.style.transform = 'translate(' + Math.round(d.x - 14) + 'px,' + Math.round(d.y - 14) + 'px)';
            if (pr && now >= d.cdUntil && now >= orbCdUntil && _nkDotHit(d.el, pr, 0)) {
                d.cdUntil = now + 800;
                orbCdUntil = now + 400;
                _nkHit(debrisDmg, null, level);
            }
        });
        return (e < durMs && tideY > -60) || debrisPending;
    });
}
