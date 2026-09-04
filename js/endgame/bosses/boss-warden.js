//------------------------------------------------------------------------
//-------------------BOSS: THE WARDEN (boss_warden)-----------------------------
//------------------------------------------------------------------------
// Totem homage: three storm totems pulse in sequence, each blast telegraphed
// by the totem itself. The order cycles, so you can dance ahead of the
// pulses once you learn the rhythm.
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
    boss_warden: {
        id: 'boss_warden', name: 'The Warden', emoji: '🗼',
        baseHP: 1040, baseDamage: 23, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_warden: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'pulse_totems', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechTotemPulse' },
            { name: 'frozen_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechFrozenCells' },
        ],
    },
});


function _egMechTotemPulse(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const rounds = [0, 2, 2, 3][p];
    const warnMs = 700, expandMs = 500, gapMs = 600;
    const blastR = 150;
    const dmgPct = [0, 0.11, 0.13, 0.16][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const spots = [
        { x: W * 0.25, y: H * 0.35 },
        { x: W * 0.75, y: H * 0.35 },
        { x: W * 0.50, y: H * 0.75 },
    ];
    const totems = spots.map(s => {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-totem', '🗼');
        el.style.transform = 'translate(' + Math.round(s.x - 26) + 'px,' + Math.round(s.y - 26) + 'px)';
        return { ...s, el };
    });
    _egNkToast('eg_mech_totems', '🗼 The Warden: Pulse Totems! Move between pulses!');
    const order = [];
    for (let r = 0; r < rounds; r++) for (let i = 0; i < 3; i++) order.push(i);
    let idx = 0, stage = 'idle', t = 0, ringEl = null, hitDone = false;
    _egNkLoop(run, (dtS) => {
        if (idx >= order.length) return false;
        const tot = totems[order[idx]];
        t += dtS * 1000;
        if (stage === 'idle') {
            stage = 'warn';
            t = 0;
            hitDone = false;
            tot.el.classList.add('eg-nk-fuse');
        } else if (stage === 'warn') {
            if (t >= warnMs) {
                stage = 'blast';
                t = 0;
                tot.el.classList.remove('eg-nk-fuse');
                ringEl = _egNkEl(run, 'div', 'eg-nk-ring');
            }
        } else if (stage === 'blast') {
            const f = Math.min(1, t / expandMs);
            const r = Math.max(1, Math.round(blastR * f));
            if (ringEl) {
                ringEl.style.left = Math.round(tot.x - r) + 'px';
                ringEl.style.top = Math.round(tot.y - r) + 'px';
                ringEl.style.width = r * 2 + 'px';
                ringEl.style.height = r * 2 + 'px';
            }
            if (!hitDone && f >= 1) {
                hitDone = true;
                const c = _egNkPlayerCenter();
                if (c && Math.hypot(c.x - tot.x, c.y - tot.y) <= blastR) {
                    const dealt = _egNkHit(dmgPct, 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Warden', 'Pulse Totems');
                }
            }
            if (t >= expandMs + gapMs) {
                if (ringEl) { ringEl.remove(); ringEl = null; }
                stage = 'idle';
                t = 0;
                idx++;
            }
        }
        return true;
    });
}
