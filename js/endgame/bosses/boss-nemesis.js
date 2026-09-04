//------------------------------------------------------------------------
//-------------------BOSS: THE NEMESIS (boss_nemesis)---------------------------
//------------------------------------------------------------------------
// Pinnacle hunter: a dense storm spiral to drown in, interleaved with
// aimed reaper fans that punish every pause. There is no rest here —
// only gaps, and they move.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_nemesis: {
        id: 'boss_nemesis', name: 'The Nemesis', emoji: '💀',
        baseHP: 1200, baseDamage: 26, chargeMax: 11,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_nemesis: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.60 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.20 },
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'spiral_storm', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechSpiralStorm' },
            { name: 'reaper_fans', intervalBase: 20000, intervalVariance: 4000, handler: '_egMechReaperFans' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechSoulTithe' },
        ],
    },
});


function _egMechSpiralStorm(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const total = [0, 32, 38, 46][p];
    const emitMs = 2600;
    const speed = [0, 150, 170, 195][p];
    const lifeMs = 8000;
    const dmgPct = [0, 0.05, 0.06, 0.075][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const ex = window.innerWidth * 0.5, ey = window.innerHeight * 0.4;
    const anchor = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-anchor', '💀');
    anchor.style.transform = 'translate(' + Math.round(ex - 26) + 'px,' + Math.round(ey - 26) + 'px)';
    const orbs = [];
    let emitted = 0, emitAcc = 0, e = 0, orbCdUntil = 0;
    _egNkToast('eg_mech_nemesis', '💀 The Nemesis: Spiral Storm! There is no rest!');
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        emitAcc += dtS * 1000;
        const step = emitMs / total;
        while (emitted < total && emitAcc >= step) {
            emitAcc -= step;
            const a = emitted * 2.4 + e / 1000 * 2.2;
            const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-orb');
            orbs.push({
                x: ex, y: ey,
                vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
                seed: Math.random() * 6.28, t: 0, hitDone: false, el,
            });
            emitted++;
        }
        const pr = _egNkPlayerRect();
        for (let i = orbs.length - 1; i >= 0; i--) {
            const o = orbs[i];
            o.t += dtS * 1000;
            o.x += o.vx * dtS + Math.cos(e / 1000 * 3 + o.seed) * 22 * dtS;
            o.y += o.vy * dtS;
            if (o.t > lifeMs || o.x < -30 || o.x > window.innerWidth + 30 || o.y < -30 || o.y > window.innerHeight + 30) {
                o.el.remove();
                orbs.splice(i, 1);
                continue;
            }
            o.el.style.transform = 'translate(' + Math.round(o.x - 9) + 'px,' + Math.round(o.y - 9) + 'px)';
            if (!o.hitDone && pr && now >= orbCdUntil && _egNkDotHit(o.el, pr, 2)) {
                o.hitDone = true;
                orbCdUntil = now + 450;
                const dealt = _egNkHit(dmgPct, 'shadow', level);
                _egNkAbilityHitToast(dealt, 'The Nemesis', 'Spiral Storm');
            }
        }
        return emitted < total || orbs.length > 0;
    });
}

function _egMechReaperFans(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const volleys = [0, 3, 4, 4][p];
    const fanN = 5, fanSpread = 0.4;
    const volleyGapMs = 1100;
    const speed = [0, 170, 190, 215][p];
    const lifeMs = 7000;
    const dmgPct = [0, 0.055, 0.065, 0.08][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const ex = window.innerWidth * 0.5, ey = 80;
    const orbs = [];
    let fired = 0, acc = 0, orbCdUntil = 0;
    _egNkToast('eg_mech_reaper', '💀 The Nemesis: Reaper Fans! Pausing is death!');
    _egNkLoop(run, (dtS, now) => {
        if (fired < volleys) {
            acc += dtS * 1000;
            if (acc >= (fired === 0 ? 400 : volleyGapMs)) {
                acc = 0;
                fired++;
                const c = _egNkPlayerCenter();
                const base = Math.atan2((c ? c.y : 300) - ey, (c ? c.x : ex) - ex);
                for (let i = 0; i < fanN; i++) {
                    const a = base + (i - (fanN - 1) / 2) * (fanSpread * 2 / (fanN - 1));
                    const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-orb');
                    orbs.push({ x: ex, y: ey, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, t: 0, hitDone: false, el });
                }
            }
        }
        const pr = _egNkPlayerRect();
        for (let i = orbs.length - 1; i >= 0; i--) {
            const o = orbs[i];
            o.t += dtS * 1000;
            o.x += o.vx * dtS;
            o.y += o.vy * dtS;
            if (o.t > lifeMs || o.x < -30 || o.x > window.innerWidth + 30 || o.y < -30 || o.y > window.innerHeight + 30) {
                o.el.remove();
                orbs.splice(i, 1);
                continue;
            }
            o.el.style.transform = 'translate(' + Math.round(o.x - 9) + 'px,' + Math.round(o.y - 9) + 'px)';
            if (!o.hitDone && pr && now >= orbCdUntil && _egNkDotHit(o.el, pr, 2)) {
                o.hitDone = true;
                orbCdUntil = now + 500;
                const dealt = _egNkHit(dmgPct, 'shadow', level);
                _egNkAbilityHitToast(dealt, 'The Nemesis', 'Reaper Fans');
            }
        }
        return fired < volleys || orbs.length > 0;
    });
}
