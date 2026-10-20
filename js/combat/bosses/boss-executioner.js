import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkDotHit, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerRect, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE EXECUTIONER (boss_executioner)-------------------
//------------------------------------------------------------------------
// Pendulum homage: a great axe swings across the lower arena on a slow,
// terrible arc. The blade is death; the rhythm is mercy. Time your
// crossings to the top of its swing.
//
// Shared mechanics (prior_bomb) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_executioner: {
        id: 'boss_executioner', name: 'The Executioner', emoji: '🪓',
        baseHP: 1100, baseDamage: 25, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_executioner: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'axe_pendulum', intervalBase: 21000, intervalVariance: 5000, handler: '_mechAxePendulum' },
            { name: 'prior_bomb', intervalBase: 19000, intervalVariance: 4000, handler: '_mechPriorBomb' },
        ],
    },
});


// A giant axe sweeps a fixed pendulum arc; the blade burns on contact.
// Cross the lower arena only while the blade swings far away.
export function _mechAxePendulum(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const periodMs = [0, 2600, 2200, 1800][p];
    const swing = 1.1; // radians either side of straight down
    const dmgPct = [0, 0.24, 0.28, 0.34][p];
    const durMs = 10000;
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const px = window.innerWidth * 0.5, py = 40;
    const armLen = window.innerHeight * 0.62;
    const pivot = _nkEl(run, 'div', 'eg-nk-dot', '⛓️');
    pivot.style.transform = 'translate(' + Math.round(px - 22) + 'px,' + Math.round(py - 22) + 'px)';
    const arm = _nkEl(run, 'div', 'eg-nk-pendulum-arm');
    arm.style.width = '6px';
    arm.style.height = Math.round(armLen) + 'px';
    arm.style.left = Math.round(px - 3) + 'px';
    arm.style.top = Math.round(py) + 'px';
    const blade = _nkEl(run, 'div', 'eg-nk-dot eg-nk-pendulum', '🪓');
    _nkToast('eg_mech_executioner', '🪓 The Executioner: Axe Pendulum! Time the swing!');
    let e = 0, cdUntil = 0;
    _nkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        // Pendulum angle: sinusoidal sweep, fastest at the bottom.
        const a = Math.sin((e / periodMs) * Math.PI * 2) * swing;
        arm.style.transform = 'rotate(' + a + 'rad)';
        arm.style.transformOrigin = '50% 0%';
        const bx = px + Math.sin(a) * armLen;
        const by = py + Math.cos(a) * armLen;
        blade.style.transform = 'translate(' + Math.round(bx - 30) + 'px,' + Math.round(by - 30) + 'px) rotate(' + (a * 2) + 'rad)';
        if (now >= cdUntil && _nkDotHit(blade, _nkPlayerRect(), 0)) {
            cdUntil = now + 1000;
            const dealt = _nkHit(dmgPct, null, level);
            _nkAbilityHitToast(dealt, 'The Executioner', 'Axe Pendulum');
        }
        return e < durMs;
    });
}
