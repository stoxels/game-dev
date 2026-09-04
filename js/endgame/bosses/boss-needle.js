//------------------------------------------------------------------------
//-------------------BOSS: THE NEEDLE (boss_needle)---------------------------
//------------------------------------------------------------------------
// IWBTG homage: full-height spike gates with a single gap.
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
    boss_needle: {
        id: 'boss_needle', name: 'The Needle', emoji: '📌',
        baseHP: 1000, baseDamage: 24, chargeMax: 11,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_needle: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.20 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'needle_gates', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechNeedleGates' },
            { name: 'prior_bomb', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechNeedleGates(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const gapH = [0, 220, 185, 155][p];
    const speed = [0, 150, 185, 225][p];
    const dmgPct = [0, 0.22, 0.26, 0.32][p];
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const gates = [
        { x: W + 60, baseY: H * 0.35, cdUntil: 0, top: null, bot: null },
        { x: W + 60 + W * 0.6, baseY: H * 0.65, cdUntil: 0, top: null, bot: null },
    ];
    gates.forEach(g => {
        g.top = _egNkEl(run, 'div', 'eg-nk-gate-seg');
        g.bot = _egNkEl(run, 'div', 'eg-nk-gate-seg');
    });
    _egNkToast('eg_mech_gates', '📌 The Needle: Spike Gates! Thread the gap!');
    let e = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        let pending = false;
        const pr = _egNkPlayerRect();
        gates.forEach((g, gi) => {
            g.x -= speed * dtS;
            if (g.x < -80) {
                g.top.style.display = 'none';
                g.bot.style.display = 'none';
                return;
            }
            pending = true;
            const gapY = Math.max(gapH / 2 + 20, Math.min(H - gapH / 2 - 20,
                g.baseY + Math.sin(e / 1000 * 1.8 + gi * 2.1) * 70));
            const w = 34;
            const topH = Math.max(0, gapY - gapH / 2);
            const botY = gapY + gapH / 2;
            g.top.style.display = '';
            g.top.style.left = Math.round(g.x - w / 2) + 'px';
            g.top.style.top = '0px';
            g.top.style.width = w + 'px';
            g.top.style.height = Math.round(topH) + 'px';
            g.bot.style.display = '';
            g.bot.style.left = Math.round(g.x - w / 2) + 'px';
            g.bot.style.top = Math.round(botY) + 'px';
            g.bot.style.width = w + 'px';
            g.bot.style.height = Math.round(Math.max(0, H - botY)) + 'px';
            if (pr && now >= g.cdUntil) {
                const bar = { left: g.x - w / 2, right: g.x + w / 2 };
                const hitTop = pr.right > bar.left && pr.left < bar.right && pr.top < topH;
                const hitBot = pr.right > bar.left && pr.left < bar.right && pr.bottom > botY;
                if (hitTop || hitBot) {
                    g.cdUntil = now + 1000;
                    const dealt = _egNkHit(dmgPct, null, level);
                    _egNkAbilityHitToast(dealt, 'The Needle', 'Spike Gates');
                }
            }
        });
        return pending;
    });
}
