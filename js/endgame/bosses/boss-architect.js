//------------------------------------------------------------------------
//-------------------BOSS: THE ARCHITECT (boss_architect)-----------------------
//------------------------------------------------------------------------
// Platforming homage without jumping: four safe platforms hover over a sea
// of burning ground. Every few seconds one platform sinks and a new one
// rises elsewhere — telegraphed, so keep an exit route in mind.
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
    boss_architect: {
        id: 'boss_architect', name: 'The Architect', emoji: '🏛️',
        baseHP: 1100, baseDamage: 22, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_architect: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'sinking_platforms', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechRisingPlats' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
        ],
    },
});


function _egArchitectSpotTaken(spots, x, y, w, h) {
    return spots.some(s =>
        x < s.x + s.w + 60 && x + w + 60 > s.x && y < s.y + s.h + 60 && y + h + 60 > s.y);
}

function _egArchitectNewSpot(spots, w, h) {
    for (let tries = 0; tries < 40; tries++) {
        const x = 40 + Math.random() * Math.max(40, window.innerWidth - w - 80);
        const y = 80 + Math.random() * Math.max(40, window.innerHeight - h - 160);
        if (!_egArchitectSpotTaken(spots, x, y, w, h)) return { x, y };
    }
    return {
        x: 40 + Math.random() * Math.max(40, window.innerWidth - w - 80),
        y: 80 + Math.random() * Math.max(40, window.innerHeight - h - 160),
    };
}

function _egMechRisingPlats(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const dotPct = [0, 9, 11, 13][p];
    const swapMs = [0, 3000, 2600, 2200][p];
    const sinkWarnMs = 800;
    const durMs = 11000;
    const PW = 190, PH = 130;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const plats = [];
    const spawnPlat = () => {
        const spot = _egArchitectNewSpot(plats.filter(q => q.state === 'safe'), PW, PH);
        const el = _egNkEl(run, 'div', 'eg-nk-plat');
        el.style.left = Math.round(spot.x) + 'px';
        el.style.top = Math.round(spot.y) + 'px';
        el.style.width = PW + 'px';
        el.style.height = PH + 'px';
        const q = { ...spot, w: PW, h: PH, state: 'safe', t: 0, el };
        plats.push(q);
        return q;
    };
    for (let i = 0; i < 4; i++) spawnPlat();
    _egNkToast('eg_mech_platforms', '🏛️ The Architect: Sinking Platforms! Stay on solid ground!');
    let e = 0, swapAcc = 0, dotWarnAt = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        swapAcc += dtS * 1000;
        if (swapAcc >= swapMs) {
            swapAcc = 0;
            const safe = plats.filter(q => q.state === 'safe');
            if (safe.length > 1) {
                const victim = safe[Math.floor(Math.random() * safe.length)];
                victim.state = 'sinking';
                victim.t = 0;
                victim.el.classList.add('eg-nk-plat-sink');
            }
        }
        // Advance sinking platforms, spawn replacements.
        for (let i = plats.length - 1; i >= 0; i--) {
            const q = plats[i];
            if (q.state === 'sinking') {
                q.t += dtS * 1000;
                if (q.t >= sinkWarnMs) {
                    q.el.remove();
                    plats.splice(i, 1);
                    spawnPlat();
                }
            }
        }
        const pr = _egNkPlayerRect();
        if (pr) {
            const onPlat = plats.some(q => q.state === 'safe' && _egNkRectsOverlap(
                { left: q.x, right: q.x + q.w, top: q.y, bottom: q.y + q.h }, pr));
            if (!onPlat) {
                _egNkDotTick(run, dotPct, dtS, level, 'fire');
                if (now - dotWarnAt > 2500) {
                    dotWarnAt = now;
                    _egNkToast('eg_nk_move', '⚠️ Get on a platform!', '#fb923c');
                }
            } else {
                run.dotAcc = 0;
            }
        }
        return e < durMs;
    });
}
