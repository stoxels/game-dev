//------------------------------------------------------------------------
//-------------------BOSS: THE SIREN (boss_siren)---------------------------
//------------------------------------------------------------------------
// PoE Merveil homage: sweeping beam from an anchor, track the angle.
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
    boss_siren: {
        id: 'boss_siren', name: 'The Siren', emoji: '🌀',
        baseHP: 1000, baseDamage: 23, chargeMax: 11,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_siren: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'wail_beam', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechWailBeam' },
            { name: 'frozen_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechFrozenCells' },
        ],
    },
});


function _egMechWailBeam(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const warnMs = 1200, sweepMs = [0, 3400, 3000, 2600][p];
    const halfW = 20;
    const dmgPct = [0, 0.14, 0.16, 0.19][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const ax = window.innerWidth * 0.84, ay = window.innerHeight * 0.45;
    const len = Math.hypot(window.innerWidth, window.innerHeight);
    const a0 = -0.65, a1 = 0.65;
    const beam = _egNkEl(run, 'div', 'eg-nk-beam');
    beam.style.width = Math.round(len) + 'px';
    beam.style.height = halfW * 2 + 'px';
    beam.style.left = Math.round(ax) + 'px';
    beam.style.top = Math.round(ay - halfW) + 'px';
    _egNkToast('eg_mech_beam', '🌀 The Siren: Wail Beam! Track the beam!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const ang = e < warnMs ? a0 : a0 + (a1 - a0) * Math.min(1, (e - warnMs) / sweepMs);
        beam.style.transform = 'rotate(' + ang + 'rad)';
        beam.classList.toggle('eg-nk-beam-warn', e < warnMs);
        if (e >= warnMs) {
            const pr = _egNkPlayerRect();
            if (pr && now >= cdUntil && _egNkBeamHit(ax, ay, ang, len, halfW, pr, 6)) {
                cdUntil = now + 1000;
                const dealt = _egNkHit(dmgPct, 'cold', level);
                _egNkAbilityHitToast(dealt, 'The Siren', 'Wail Beam');
            }
        }
        return e < warnMs + sweepMs + 400;
    });
}


function _egNkBeamHit(ax, ay, ang, len, halfW, pr, pad) {
    const pts = [
        [pr.left + pr.width / 2, pr.top + pr.height / 2],
        [pr.left, pr.top], [pr.right, pr.top],
        [pr.left, pr.bottom], [pr.right, pr.bottom],
    ];
    const c = Math.cos(ang), s = Math.sin(ang);
    for (const pt of pts) {
        const dx = pt[0] - ax, dy = pt[1] - ay;
        const al = dx * c + dy * s;
        const pe = -dx * s + dy * c;
        if (al > -20 && al < len && Math.abs(pe) < halfW + (pad || 0)) return true;
    }
    return false;
}
