//------------------------------------------------------------------------
//-------------------BOSS: THE VELOCITY (boss_velocity)-------------------------
//------------------------------------------------------------------------
// Speedway homage: four full-width lanes blow in alternating directions —
// hard — while the rails top and bottom burn. There is no standing still
// here, only choosing which way to slide.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_velocity: {
        id: 'boss_velocity', name: 'The Velocity', emoji: '🏎️',
        baseHP: 1060, baseDamage: 24, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_velocity: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'speed_lanes', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechSpeedLanes' },
            { name: 'corrupt_cells', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechSpeedLanes(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const push = [0, 170, 210, 260][p];
    const edgeDot = [0, 10, 12, 15][p];
    const edgeH = 80, laneH = 110;
    const durMs = 9000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const H = window.innerHeight;
    const lanes = [0.22, 0.41, 0.60, 0.79].map((fy, i) => {
        const el = _egNkEl(run, 'div', 'eg-nk-speedlane');
        el.style.top = Math.round(H * fy - laneH / 2) + 'px';
        el.style.height = laneH + 'px';
        const dir = i % 2 === 0 ? 1 : -1;
        el.textContent = dir > 0 ? '➡️➡️➡️' : '⬅️⬅️⬅️';
        return { y: H * fy, dir, el };
    });
    const topEdge = _egNkEl(run, 'div', 'eg-nk-edge-burn eg-nk-edge-top');
    topEdge.textContent = '🔥';
    const botEdge = _egNkEl(run, 'div', 'eg-nk-edge-burn eg-nk-edge-bottom');
    botEdge.textContent = '🔥';
    _egNkToast('eg_mech_velocity', '🏎️ The Velocity: Speed Lanes! Choose your slide!');
    let e = 0, dotWarnAt = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const pr = _egNkPlayerRect();
        if (pr) {
            const cy = pr.top + pr.height / 2;
            lanes.forEach(l => {
                if (Math.abs(cy - l.y) < laneH / 2) _egNkNudgeAvatar(l.dir * push * dtS, 0);
            });
            const nearEdge = pr.top < edgeH || pr.bottom > window.innerHeight - edgeH;
            if (nearEdge) {
                _egNkDotTick(run, edgeDot, dtS, level, 'fire');
                if (now - dotWarnAt > 2500) {
                    dotWarnAt = now;
                    _egNkToast('eg_nk_move', '⚠️ The rails burn!', '#fb923c');
                }
            } else {
                run.dotAcc = 0;
            }
        }
        return e < durMs;
    });
}
