//------------------------------------------------------------------------
//-------------------BOSS: THE DREADNOUGHT (boss_dreadnought)------------------
//------------------------------------------------------------------------
// Pinnacle broadside: the Dreadnought walks its guns along both flanks —
// alternating port and starboard spreads — while a searchlight tracks you
// and burns whatever it catches. Watch the muzzle sides, kill the light
// by leaving it.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_dreadnought: {
        id: 'boss_dreadnought', name: 'The Dreadnought', emoji: '🛳️',
        baseHP: 1220, baseDamage: 27, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_dreadnought: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.60 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.20 },
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'broadsides', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechBroadsides' },
            { name: 'searchlight', intervalBase: 20000, intervalVariance: 4000, handler: '_egMechSearchlight' },
            { name: 'corrupt_cells', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechBroadsides(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const volleys = [0, 4, 4, 5][p];
    const fanN = 4;
    const volleyGapMs = 1300;
    const speed = [0, 200, 225, 255][p];
    const lifeMs = 6000;
    const dmgPct = [0, 0.06, 0.07, 0.09][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const orbs = [];
    let fired = 0, acc = 0, orbCdUntil = 0, side = 1;
    _egNkToast('eg_mech_dreadnought', '🛳️ The Dreadnought: Broadsides! Watch the muzzle side!');
    _egNkLoop(run, (dtS, now) => {
        if (fired < volleys) {
            acc += dtS * 1000;
            if (acc >= (fired === 0 ? 500 : volleyGapMs)) {
                acc = 0;
                fired++;
                side *= -1; // alternate flanks
                const ox = side > 0 ? W - 60 : 60;
                const oy = 100 + Math.random() * Math.max(60, H - 200);
                const c = _egNkPlayerCenter();
                const base = Math.atan2((c ? c.y : H / 2) - oy, (c ? c.x : W / 2) - ox);
                for (let i = 0; i < fanN; i++) {
                    const a = base + (i - (fanN - 1) / 2) * 0.22;
                    const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-shell', '💣');
                    orbs.push({ x: ox, y: oy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, t: 0, hitDone: false, el });
                }
            }
        }
        const pr = _egNkPlayerRect();
        for (let i = orbs.length - 1; i >= 0; i--) {
            const o = orbs[i];
            o.t += dtS * 1000;
            o.x += o.vx * dtS;
            o.y += o.vy * dtS;
            if (o.t > lifeMs || o.x < -30 || o.x > W + 30 || o.y < -30 || o.y > H + 30) {
                o.el.remove();
                orbs.splice(i, 1);
                continue;
            }
            o.el.style.transform = 'translate(' + Math.round(o.x - 14) + 'px,' + Math.round(o.y - 14) + 'px)';
            if (!o.hitDone && pr && now >= orbCdUntil && _egNkDotHit(o.el, pr, 2)) {
                o.hitDone = true;
                orbCdUntil = now + 500;
                const dealt = _egNkHit(dmgPct, 'fire', level);
                _egNkAbilityHitToast(dealt, 'The Dreadnought', 'Broadsides');
            }
        }
        return fired < volleys || orbs.length > 0;
    });
}

function _egMechSearchlight(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const radius = [0, 110, 100, 90][p];
    const dotPct = [0, 13, 15, 18][p];
    const durMs = 8000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    // The lamp lags a half-second behind you — juke it, don't outrun it.
    const lamp = { x: window.innerWidth / 2, y: 100 };
    const beam = _egNkEl(run, 'div', 'eg-nk-searchlight');
    _egNkToast('eg_mech_searchlight', '🛳️ The Dreadnought: Searchlight! Kill it by leaving it!');
    let e = 0, dotWarnAt = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        if (c) {
            const dx = c.x - lamp.x, dy = c.y - lamp.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const chase = Math.min(d, 200 * dtS);
            lamp.x += (dx / d) * chase;
            lamp.y += (dy / d) * chase;
        }
        beam.style.left = Math.round(lamp.x - radius) + 'px';
        beam.style.top = Math.round(lamp.y - radius) + 'px';
        beam.style.width = radius * 2 + 'px';
        beam.style.height = radius * 2 + 'px';
        if (c && Math.hypot(c.x - lamp.x, c.y - lamp.y) <= radius) {
            _egNkDotTick(run, dotPct, dtS, level, 'fire');
            if (now - dotWarnAt > 2500) {
                dotWarnAt = now;
                _egNkToast('eg_nk_move', '⚠️ Out of the light!', '#f87171');
            }
        } else {
            run.dotAcc = 0;
        }
        return e < durMs;
    });
}
