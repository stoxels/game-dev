import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkDodgeBusy, _nkDotHit, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerRect, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE BELT (boss_belt)---------------------------------
//------------------------------------------------------------------------
// Asteroid-belt homage: three great rocks tumble through the arena, each
// splitting into two fast shards. Kill the clock, not the rocks:
// everything fades, but not before it multiplies.
//
// Shared mechanics (fated_cell) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_belt: {
        id: 'boss_belt', name: 'The Belt', emoji: '☄️',
        baseHP: 1080, baseDamage: 24, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_belt: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'splitter_rocks', intervalBase: 21000, intervalVariance: 5000, handler: '_mechSplitterRocks' },
            { name: 'fated_cell', intervalBase: 20000, intervalVariance: 5000, handler: '_mechFatedCell' },
        ],
    },
});


// Slow bouncing rocks that each split into two fast shards mid-flight.
// Dodge the big ones early; the shards fade on their own soon after.
export function _mechSplitterRocks(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const bigSpeed = [0, 70, 85, 100][p];
    const shardSpeed = [0, 190, 220, 250][p];
    const splitMs = [0, 3200, 2800, 2400][p];
    const shardLifeMs = 4000;
    const bigDmg = [0, 0.13, 0.15, 0.18][p];
    const shardDmg = [0, 0.07, 0.08, 0.10][p];
    const durMs = 11000;
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const rocks = [];
    for (let i = 0; i < 3; i++) {
        const el = _nkEl(run, 'div', 'eg-nk-dot eg-nk-rock', '☄️');
        const a = Math.random() * Math.PI * 2;
        rocks.push({
            big: true, split: false,
            x: 100 + Math.random() * Math.max(100, window.innerWidth - 200),
            y: 100 + Math.random() * Math.max(100, window.innerHeight - 200),
            vx: Math.cos(a) * bigSpeed, vy: Math.sin(a) * bigSpeed,
            t: 0, life: durMs, cdUntil: 0, el,
        });
    }
    _nkToast('eg_mech_belt', '☄️ The Belt: Splitter Rocks! They multiply!');
    let e = 0;
    const radiusOf = (r) => r.big ? 30 : 14;
    _nkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const pr = _nkPlayerRect();
        for (let i = rocks.length - 1; i >= 0; i--) {
            const r = rocks[i];
            r.t += dtS * 1000;
            r.life -= dtS * 1000;
            r.x += r.vx * dtS;
            r.y += r.vy * dtS;
            const rr = radiusOf(r);
            if (r.x < rr || r.x > window.innerWidth - rr) r.vx *= -1;
            if (r.y < rr || r.y > window.innerHeight - rr) r.vy *= -1;
            r.x = Math.max(rr, Math.min(window.innerWidth - rr, r.x));
            r.y = Math.max(rr, Math.min(window.innerHeight - rr, r.y));
            r.el.style.transform = 'translate(' + Math.round(r.x - rr) + 'px,' + Math.round(r.y - rr) + 'px)';
            if (r.big && !r.split && r.t >= splitMs) {
                r.split = true;
                for (let k = 0; k < 2; k++) {
                    const el = _nkEl(run, 'div', 'eg-nk-dot eg-nk-rock-shard', '🪨');
                    const a = Math.random() * Math.PI * 2;
                    rocks.push({
                        big: false, x: r.x, y: r.y,
                        vx: Math.cos(a) * shardSpeed, vy: Math.sin(a) * shardSpeed,
                        t: 0, life: Math.min(shardLifeMs, durMs - e), cdUntil: 0, el,
                    });
                }
            }
            if (pr && now >= r.cdUntil && _nkDotHit(r.el, pr, 0)) {
                r.cdUntil = now + 800;
                _nkHit(r.big ? bigDmg : shardDmg, null, level);
            }
            if (r.life <= 0) {
                r.el.remove();
                rocks.splice(i, 1);
            }
        }
        return e < durMs || rocks.length > 0;
    });
}
