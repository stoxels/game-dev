import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkDodgeBusy, _nkDotTick, _nkEl, _nkFrozen, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE EXARCH (boss_exarch)---------------------------
//------------------------------------------------------------------------
// Constricting-ring homage: a safe circle shrinks around you while the
// outside burns. Stay inside and keep ahead of the closing wall.
//
// Shared mechanics (prior_bomb) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_exarch: {
        id: 'boss_exarch', name: 'The Exarch', emoji: '🔥',
        baseHP: 1100, baseDamage: 24, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_exarch: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'constriction', intervalBase: 23000, intervalVariance: 5000, handler: '_mechConstriction' },
            { name: 'prior_bomb', intervalBase: 17000, intervalVariance: 4000, handler: '_mechPriorBomb' },
        ],
    },
});


// A safe ring shrinks over time; standing outside it burns.
// Drift inward early so the closing wall never catches you.
export function _mechConstriction(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const r0 = 560, r1 = [0, 170, 155, 140][p];
    const dotPct = [0, 10, 12, 14][p];
    const durMs = 9000;
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const c0 = _nkPlayerCenter();
    const cx = c0 ? Math.max(r1 + 20, Math.min(window.innerWidth - r1 - 20, c0.x)) : window.innerWidth / 2;
    const cy = c0 ? Math.max(r1 + 60, Math.min(window.innerHeight - r1 - 20, c0.y)) : window.innerHeight / 2;
    const ring = _nkEl(run, 'div', 'eg-nk-ring');
    _nkEl(run, 'div', 'eg-nk-tint');
    _nkToast('eg_mech_constrict', '🔥 The Exarch: Constriction! Stay inside the ring!');
    let e = 0, dotWarnAt = 0;
    _nkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const f = Math.min(1, e / durMs);
        const r = Math.round(r0 + (r1 - r0) * f);
        ring.style.left = Math.round(cx - r) + 'px';
        ring.style.top = Math.round(cy - r) + 'px';
        ring.style.width = r * 2 + 'px';
        ring.style.height = r * 2 + 'px';
        const c = _nkPlayerCenter();
        if (c) {
            const d = Math.hypot(c.x - cx, c.y - cy);
            if (d > r) {
                _nkDotTick(run, dotPct, dtS, level, 'fire');
                if (now - dotWarnAt > 2500) {
                    dotWarnAt = now;
                    _nkToast('eg_nk_move', '⚠️ Move!', '#fb923c');
                }
            } else {
                run.dotAcc = 0;
            }
        }
        return e < durMs + 600;
    });
}
