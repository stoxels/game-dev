//------------------------------------------------------------------------
//-------------------BOSS: THE KRAKEN (boss_kraken)-----------------------------
//------------------------------------------------------------------------
// Deep-sea homage: two great tentacle arms sweep around a central maw —
// slow, thick, and impossible to outrun forever. Slip between the arms'
// rhythm like a tide-pool dancer.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_kraken: {
        id: 'boss_kraken', name: 'The Kraken', emoji: '🦑',
        baseHP: 1100, baseDamage: 24, chargeMax: 12,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_kraken: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'tentacle_sweep', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechTentacleSweep' },
            { name: 'fog_bank', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechFogBank' },
        ],
    },
});


function _egMechTentacleSweep(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const arms = [0, 2, 2, 3][p];
    const omega = [0, 0.5, 0.62, 0.78][p];
    const armLen = Math.min(window.innerWidth, window.innerHeight) * 0.42;
    const armHalf = 30;
    const dmgPct = [0, 0.18, 0.22, 0.27][p];
    const durMs = 9000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5, cy = window.innerHeight * 0.45;
    const maw = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-anchor', '🦑');
    maw.style.transform = 'translate(' + Math.round(cx - 26) + 'px,' + Math.round(cy - 26) + 'px)';
    const tentacles = [];
    for (let i = 0; i < arms; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-arm');
        el.style.width = Math.round(armLen) + 'px';
        el.style.height = armHalf * 2 + 'px';
        el.style.left = Math.round(cx) + 'px';
        el.style.top = Math.round(cy - armHalf) + 'px';
        tentacles.push({ off: i * Math.PI * 2 / arms, el });
    }
    _egNkToast('eg_mech_kraken', '🦑 The Kraken: Tentacle Sweep! Mind the arms!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const pr = _egNkPlayerRect();
        const pts = pr ? [
            [pr.left + pr.width / 2, pr.top + pr.height / 2],
            [pr.left, pr.top], [pr.right, pr.top],
            [pr.left, pr.bottom], [pr.right, pr.bottom],
        ] : null;
        tentacles.forEach(tm => {
            const a = tm.off + (e / 1000) * omega;
            tm.el.style.transform = 'rotate(' + a + 'rad)';
            if (pts && now >= cdUntil) {
                const bx = cx + Math.cos(a) * armLen, by = cy + Math.sin(a) * armLen;
                for (const pt of pts) {
                    if (_egInfernoPtSegDist(pt[0], pt[1], cx, cy, bx, by) < armHalf + 6) {
                        cdUntil = now + 1000;
                        const dealt = _egNkHit(dmgPct, 'cold', level);
                        _egNkAbilityHitToast(dealt, 'The Kraken', 'Tentacle Sweep');
                        break;
                    }
                }
            }
        });
        return e < durMs;
    });
}
