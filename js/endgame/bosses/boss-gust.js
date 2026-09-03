//------------------------------------------------------------------------
//-------------------BOSS: THE GUST (boss_gust)---------------------------------
//------------------------------------------------------------------------
// Wind-lane fight: three horizontal lanes blow in alternating directions
// while the top and bottom edges smoulder. Ride the wind — but never let
// it park you in the fire.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_gust: {
        id: 'boss_gust', name: 'The Gust', emoji: '🍃',
        baseHP: 920, baseDamage: 19, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_gust: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.35 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.75 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'gust_lanes', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechGustLanes' },
            { name: 'corrupt_cells', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechGustLanes(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const push = [0, 80, 100, 125][p];
    const edgeDot = [0, 8, 10, 12][p];
    const edgeH = 90;
    const durMs = 8000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const H = window.innerHeight;
    const lanes = [0.3, 0.55, 0.8].map((fy, i) => {
        const el = _egNkEl(run, 'div', 'eg-nk-gustlane');
        const y = H * fy;
        el.style.top = Math.round(y - 40) + 'px';
        el.style.height = '80px';
        el.textContent = i % 2 === 0 ? '🍃🍃🍃 →' : '← 🍃🍃🍃';
        return { y, dir: i % 2 === 0 ? 1 : -1, el };
    });
    const topEdge = _egNkEl(run, 'div', 'eg-nk-edge-burn eg-nk-edge-top');
    topEdge.textContent = '🔥';
    const botEdge = _egNkEl(run, 'div', 'eg-nk-edge-burn eg-nk-edge-bottom');
    botEdge.textContent = '🔥';
    _egNkToast('eg_mech_gust', '🍃 The Gust: Gust Lanes! Ride the wind, avoid the edges!');
    let e = 0, dotWarnAt = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const pr = _egNkPlayerRect();
        if (pr) {
            const cy = pr.top + pr.height / 2;
            lanes.forEach(l => {
                if (Math.abs(cy - l.y) < 40) _egNkNudgeAvatar(l.dir * push * dtS, 0);
            });
            const nearEdge = pr.top < edgeH || pr.bottom > window.innerHeight - edgeH;
            if (nearEdge) {
                _egNkDotTick(run, edgeDot, dtS, level, 'fire');
                if (now - dotWarnAt > 2500) {
                    dotWarnAt = now;
                    _egNkToast('eg_nk_move', '⚠️ The edges burn!', '#fb923c');
                }
            } else {
                run.dotAcc = 0;
            }
        }
        return e < durMs;
    });
}
