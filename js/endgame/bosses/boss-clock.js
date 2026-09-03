//------------------------------------------------------------------------
//-------------------BOSS: THE CLOCK (boss_clock)-------------------------------
//------------------------------------------------------------------------
// Clock-face duel: a single slow hand sweeps the dial. One beam, one
// rhythm — learn to count it and you will never be touched.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_clock: {
        id: 'boss_clock', name: 'The Clock', emoji: '🕐',
        baseHP: 940, baseDamage: 20, chargeMax: 13,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_clock: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.35 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.75 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'clock_hand', intervalBase: 19000, intervalVariance: 5000, handler: '_egMechClockHand' },
            { name: 'probability_shift', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechProbabilityShift' },
        ],
    },
});


function _egMechClockHand(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const omega = [0, 0.35, 0.45, 0.6][p];
    const halfW = 20;
    const dmgPct = [0, 0.12, 0.14, 0.18][p];
    const durMs = 9000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5, cy = window.innerHeight * 0.45;
    const len = Math.hypot(window.innerWidth, window.innerHeight);
    const face = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-anchor', '🕐');
    face.style.transform = 'translate(' + Math.round(cx - 26) + 'px,' + Math.round(cy - 26) + 'px)';
    const hand = _egNkEl(run, 'div', 'eg-nk-beam');
    hand.style.width = Math.round(len) + 'px';
    hand.style.height = halfW * 2 + 'px';
    hand.style.left = Math.round(cx) + 'px';
    hand.style.top = Math.round(cy - halfW) + 'px';
    _egNkToast('eg_mech_clock', '🕐 The Clock: Clock Hand! Count the rhythm!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const a = (e / 1000) * omega;
        hand.style.transform = 'rotate(' + a + 'rad)';
        const pr = _egNkPlayerRect();
        if (pr && now >= cdUntil) {
            const pts = [
                [pr.left + pr.width / 2, pr.top + pr.height / 2],
                [pr.left, pr.top], [pr.right, pr.top],
                [pr.left, pr.bottom], [pr.right, pr.bottom],
            ];
            const bx = cx + Math.cos(a) * len, by = cy + Math.sin(a) * len;
            for (const pt of pts) {
                if (_egInfernoPtSegDist(pt[0], pt[1], cx, cy, bx, by) < halfW + 6) {
                    cdUntil = now + 1000;
                    const dealt = _egNkHit(dmgPct, 'lightning', level);
                    _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
                    break;
                }
            }
        }
        return e < durMs;
    });
}
