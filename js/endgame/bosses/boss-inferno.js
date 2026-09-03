//------------------------------------------------------------------------
//-------------------BOSS: THE INFERNO (boss_inferno)---------------------------
//------------------------------------------------------------------------
// Fire-Man homage: a carousel of flame beams rotates around a screen-center
// anchor. Track the rotation and stay between the beams.
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
    boss_inferno: {
        id: 'boss_inferno', name: 'The Inferno', emoji: '🌋',
        baseHP: 1080, baseDamage: 24, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_inferno: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'flame_carousel', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechInfernoBlaze' },
            { name: 'prior_bomb', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
        ],
    },
});


// Distance from point (px,py) to segment (ax,ay)-(bx,by).
function _egInfernoPtSegDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const f = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    return Math.hypot(px - (ax + dx * f), py - (ay + dy * f));
}

function _egMechInfernoBlaze(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const nBeams = [0, 2, 3, 4][p];
    const omega = [0, 0.55, 0.75, 0.95][p]; // rad/s
    const halfW = 22;
    const dmgPct = [0, 0.13, 0.16, 0.20][p];
    const durMs = 8000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.45;
    const len = Math.hypot(window.innerWidth, window.innerHeight);
    const anchor = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-anchor', '🌋');
    anchor.style.transform = 'translate(' + Math.round(cx - 26) + 'px,' + Math.round(cy - 26) + 'px)';
    const beams = [];
    for (let i = 0; i < nBeams; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-beam eg-nk-beam-fire');
        el.style.width = Math.round(len) + 'px';
        el.style.height = halfW * 2 + 'px';
        el.style.left = Math.round(cx) + 'px';
        el.style.top = Math.round(cy - halfW) + 'px';
        beams.push({ off: i * Math.PI * 2 / nBeams, el });
    }
    _egNkToast('eg_mech_inferno', '🌋 The Inferno: Flame Carousel! Stay between the beams!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const pr = _egNkPlayerRect();
        const pts = pr ? [
            [pr.left + pr.width / 2, pr.top + pr.height / 2],
            [pr.left, pr.top], [pr.right, pr.top],
            [pr.left, pr.bottom], [pr.right, pr.bottom],
        ] : null;
        beams.forEach(b => {
            const a = b.off + (e / 1000) * omega;
            b.el.style.transform = 'rotate(' + a + 'rad)';
            if (pts && now >= cdUntil) {
                const bx = cx + Math.cos(a) * len, by = cy + Math.sin(a) * len;
                for (const pt of pts) {
                    if (_egInfernoPtSegDist(pt[0], pt[1], cx, cy, bx, by) < halfW + 6) {
                        cdUntil = now + 1000;
                        const dealt = _egNkHit(dmgPct, 'fire', level);
                        _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
                        break;
                    }
                }
            }
        });
        return e < durMs;
    });
}
