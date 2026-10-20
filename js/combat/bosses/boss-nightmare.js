import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkDotHit, _nkDotTick, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE NIGHTMARE (boss_nightmare)-----------------------
//------------------------------------------------------------------------
// Lights-out hunt: the arena drowns in darkness and something fast starts
// circling. The dark only tickles - the teeth are the thing in the black.
// Listen for the warnings and keep it at arm's length.
//
// Shared mechanics (soul_tithe) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_nightmare: {
        id: 'boss_nightmare', name: 'The Nightmare', emoji: '🌃',
        baseHP: 1100, baseDamage: 24, chargeMax: 11,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_nightmare: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'dark_hunt', intervalBase: 21000, intervalVariance: 5000, handler: '_mechDarkHunt' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_mechSoulTithe' },
        ],
    },
});


// A circling beast hunts in full darkness; closeness warnings are the tell.
// Keep it at range - the dark itself barely scratches.
export function _mechDarkHunt(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const chaseSpeed = [0, 105, 120, 140][p];
    const dmgPct = [0, 0.15, 0.18, 0.22][p];
    const darkDot = [0, 3, 4, 5][p];
    const durMs = 10000;
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    _nkEl(run, 'div', 'eg-nk-darkling');
    const beast = _nkEl(run, 'div', 'eg-nk-dot eg-nk-nightbeast', '👹');
    const b = { x: window.innerWidth * 0.5, y: 80 };
    _nkToast('eg_mech_nightmare', '🌃 The Nightmare: Dark Hunt! Something circles in the black!');
    let e = 0, cdUntil = 0, growlAt = 0;
    _nkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _nkPlayerCenter();
        const pr = _nkPlayerRect();
        if (c) {
            const dx = c.x - b.x, dy = c.y - b.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            // Circles more than it charges: heavy tangential drift.
            const wob = Math.sin(e / 1000 * 1.7) * 0.9;
            const hx = dx / d, hy = dy / d;
            const mx = hx * Math.cos(wob) - hy * Math.sin(wob);
            const my = hx * Math.sin(wob) + hy * Math.cos(wob);
            b.x += mx * chaseSpeed * dtS;
            b.y += my * chaseSpeed * dtS;
            if (d < 220 && now - growlAt > 3000) {
                growlAt = now;
                _nkToast('eg_nk_move', '⚠️ It is close!', '#f87171');
            }
        }
        beast.style.transform = 'translate(' + Math.round(b.x - 22) + 'px,' + Math.round(b.y - 22) + 'px)';
        if (c && now >= cdUntil && _nkDotHit(beast, pr, 0)) {
            cdUntil = now + 900;
            const dealt = _nkHit(dmgPct, 'shadow', level);
            _nkAbilityHitToast(dealt, 'The Nightmare', 'Dark Hunt');
        }
        if (pr) _nkDotTick(run, darkDot, dtS, level, 'shadow');
        return e < durMs;
    });
}
