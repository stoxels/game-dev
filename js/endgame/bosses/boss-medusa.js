//------------------------------------------------------------------------
//-------------------BOSS: THE MEDUSA (boss_medusa)-----------------------------
//------------------------------------------------------------------------
// Castlevania homage: serpent heads slither in from the right edge, riding
// sine waves across the screen. They never aim — but they cover the lanes.
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
    boss_medusa: {
        id: 'boss_medusa', name: 'The Medusa', emoji: '🪼',
        baseHP: 1000, baseDamage: 22, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_medusa: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'serpent_waves', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechSerpentWaves' },
            { name: 'fog_bank', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechFogBank' },
            { name: 'prior_bomb', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechSerpentWaves(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = [0, 4, 5, 6][p];
    const speed = [0, 140, 160, 185][p];
    const amp = 60, freq = 2.2;
    const radius = 22;
    const dmgPct = [0, 0.12, 0.14, 0.17][p];
    const staggerMs = 700;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const heads = [];
    for (let i = 0; i < count; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-serpent', '🐲');
        el.style.display = 'none';
        heads.push({
            x: 0, baseY: 80 + Math.random() * Math.max(80, window.innerHeight - 160),
            seed: Math.random() * 6.28, t: -i * staggerMs,
            cdUntil: 0, el,
        });
    }
    _egNkToast('eg_mech_serpents', '🪼 The Medusa: Serpent Waves! Mind the lanes!');
    let e = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        let pending = false;
        const pr = _egNkPlayerRect();
        heads.forEach(hd => {
            hd.t += dtS * 1000;
            if (hd.t < 0) { pending = true; return; }
            if (hd.x === 0) hd.x = window.innerWidth + 40;
            hd.x -= speed * dtS;
            const y = hd.baseY + Math.sin(e / 1000 * freq + hd.seed) * amp;
            if (hd.x < -60) {
                hd.el.style.display = 'none';
                return;
            }
            pending = true;
            hd.el.style.display = '';
            hd.el.style.transform = 'translate(' + Math.round(hd.x - 22) + 'px,' + Math.round(y - 22) + 'px)';
            if (pr && now >= hd.cdUntil && _egNkDotHit(hd.el, pr, 0)) {
                hd.cdUntil = now + 700;
                const dealt = _egNkHit(dmgPct, null, level);
                _egNkAbilityHitToast(dealt, 'The Medusa', 'Serpent Waves');
            }
        });
        return pending;
    });
}
