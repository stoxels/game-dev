//------------------------------------------------------------------------
//-------------------BOSS: THE CYCLOPS (boss_cyclops)---------------------------
//------------------------------------------------------------------------
// Bullet-eye homage: the great eye opens and fires radial bursts — eight
// slow orbs at a time, four volleys deep. The gaps are wide; the punishment
// for dozing inside one is not.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_cyclops: {
        id: 'boss_cyclops', name: 'The Cyclops', emoji: '👹',
        baseHP: 1080, baseDamage: 24, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_cyclops: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'eye_bursts', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechEyeBursts' },
            { name: 'prior_bomb', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechEyeBursts(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const volleys = [0, 4, 4, 5][p];
    const ways = 8;
    const volleyGapMs = 1400;
    const speed = [0, 120, 140, 165][p];
    const lifeMs = 8000;
    const dmgPct = [0, 0.055, 0.065, 0.08][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const ex = window.innerWidth * 0.5, ey = window.innerHeight * 0.35;
    const eye = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-anchor', '👹');
    eye.style.transform = 'translate(' + Math.round(ex - 26) + 'px,' + Math.round(ey - 26) + 'px)';
    const orbs = [];
    let fired = 0, acc = 0, orbCdUntil = 0, spin = Math.random() * 6.28;
    _egNkToast('eg_mech_cyclops', '👹 The Cyclops: Eye Bursts! Mind the gaps!');
    _egNkLoop(run, (dtS, now) => {
        if (fired < volleys) {
            acc += dtS * 1000;
            if (acc >= (fired === 0 ? 500 : volleyGapMs)) {
                acc = 0;
                fired++;
                spin += 0.39; // rotate the pattern so gaps move each volley
                for (let i = 0; i < ways; i++) {
                    const a = spin + i * Math.PI * 2 / ways;
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
                const dealt = _egNkHit(dmgPct, 'fire', level);
                _egNkAbilityHitToast(dealt, 'The Cyclops', 'Eye Bursts');
            }
        }
        return fired < volleys || orbs.length > 0;
    });
}
