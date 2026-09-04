//------------------------------------------------------------------------
//-------------------BOSS: THE GUARDIAN (boss_guardian)-------------------------
//------------------------------------------------------------------------
// Ancient-machine homage: it paints a lock-on beam that tracks you —
// slowly, inevitably. When the lock completes, the beam FIRES. Break the
// tracking by forcing it to turn faster than it can.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_guardian: {
        id: 'boss_guardian', name: 'The Guardian', emoji: '🛰️',
        baseHP: 1080, baseDamage: 24, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_guardian: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'lock_on', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechLockOn' },
            { name: 'clue_scramble', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechClueScramble' },
        ],
    },
});


function _egMechLockOn(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const locks = [0, 2, 2, 3][p];
    const chargeMs = [0, 2600, 2300, 2000][p];
    const trackRate = [0, 1.6, 2.0, 2.5][p]; // rad/s the lock can turn
    const halfW = 18;
    const dmgPct = [0, 0.22, 0.26, 0.32][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const ax = window.innerWidth * 0.85, ay = window.innerHeight * 0.25;
    const len = Math.hypot(window.innerWidth, window.innerHeight);
    const eye = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-anchor', '🛰️');
    eye.style.transform = 'translate(' + Math.round(ax - 26) + 'px,' + Math.round(ay - 26) + 'px)';
    _egNkToast('eg_mech_guardian', '🛰️ The Guardian: Lock-On! Out-turn the beam!');
    let idx = 0, stage = 'idle', t = 0, ang = 0;
    let beam = null;
    _egNkLoop(run, (dtS) => {
        if (idx >= locks) {
            if (beam) { beam.remove(); beam = null; }
            return false;
        }
        t += dtS * 1000;
        const c = _egNkPlayerCenter();
        if (stage === 'idle') {
            stage = 'charge';
            t = 0;
            ang = c ? Math.atan2(c.y - ay, c.x - ax) : Math.PI;
            beam = _egNkEl(run, 'div', 'eg-nk-beam eg-nk-beam-warn eg-nk-lockline');
            beam.style.width = Math.round(len) + 'px';
            beam.style.height = halfW * 2 + 'px';
            beam.style.left = Math.round(ax) + 'px';
            beam.style.top = Math.round(ay - halfW) + 'px';
        } else if (stage === 'charge') {
            if (c) {
                const want = Math.atan2(c.y - ay, c.x - ax);
                let diff = want - ang;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                const maxTurn = trackRate * dtS;
                ang += Math.max(-maxTurn, Math.min(maxTurn, diff));
            }
            if (beam) beam.style.transform = 'rotate(' + ang + 'rad)';
            if (t >= chargeMs) {
                stage = 'fire';
                t = 0;
                if (beam) {
                    beam.classList.remove('eg-nk-beam-warn');
                    beam.classList.add('eg-nk-beam-fire');
                }
                // Snapshot judgment along the fired line.
                const pr = _egNkPlayerRect();
                if (pr) {
                    const bx = ax + Math.cos(ang) * len, by = ay + Math.sin(ang) * len;
                    const pts = [
                        [pr.left + pr.width / 2, pr.top + pr.height / 2],
                        [pr.left, pr.top], [pr.right, pr.top],
                        [pr.left, pr.bottom], [pr.right, pr.bottom],
                    ];
                    for (const pt of pts) {
                        if (_egInfernoPtSegDist(pt[0], pt[1], ax, ay, bx, by) < halfW + 6) {
                            const dealt = _egNkHit(dmgPct, 'lightning', level);
                            _egNkAbilityHitToast(dealt, 'The Guardian', 'Lock-On');
                            break;
                        }
                    }
                }
            }
        } else if (stage === 'fire') {
            if (t >= 600) {
                if (beam) { beam.remove(); beam = null; }
                stage = 'idle';
                t = 0;
                idx++;
            }
        }
        return true;
    });
}
