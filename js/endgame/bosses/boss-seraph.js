//------------------------------------------------------------------------
//-------------------BOSS: THE SERAPH (boss_seraph)-----------------------------
//------------------------------------------------------------------------
// Pinnacle judgment: pillars of light strike at random across the arena —
// no pattern, no mercy, only the half-second flicker — while radiant fans
// close every escape you plan. Pray in motion.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_seraph: {
        id: 'boss_seraph', name: 'The Seraph', emoji: '😇',
        baseHP: 1180, baseDamage: 26, chargeMax: 10,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_seraph: {
        phases: [
            { threshold: 1.00, chargeMax: 10, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 7, damageMultiplier: 1.65 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.30 },
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'judgment_pillars', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechJudgmentPillars' },
            { name: 'radiant_fans', intervalBase: 20000, intervalVariance: 4000, handler: '_egMechRadiantFans' },
            { name: 'fated_cell', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechFatedCell' },
        ],
    },
});


function _egMechJudgmentPillars(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const strikes = [0, 7, 9, 11][p];
    const width = 46;
    const warnMs = 800, activeMs = 500, staggerMs = 260;
    const dmgPct = [0, 0.12, 0.14, 0.17][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth;
    const pillars = [];
    for (let i = 0; i < strikes; i++) {
        const x = 50 + Math.random() * Math.max(50, W - 100);
        const warnEl = _egNkEl(run, 'div', 'eg-nk-pillar-warn eg-nk-pillar-holy');
        warnEl.style.display = 'none';
        const pilEl = _egNkEl(run, 'div', 'eg-nk-pillar eg-nk-pillar-holy');
        pilEl.style.display = 'none';
        pillars.push({ x, t: -i * staggerMs, stage: 'warn', hitDone: false, warnEl, pilEl });
    }
    _egNkToast('eg_mech_seraph', '😇 The Seraph: Judgment Pillars! No pattern — only the flicker!');
    _egNkLoop(run, (dtS) => {
        let allDone = true;
        const pr = _egNkPlayerRect();
        pillars.forEach(pl => {
            if (pl.stage === 'done') return;
            allDone = false;
            pl.t += dtS * 1000;
            if (pl.t < 0) return;
            if (pl.stage === 'warn') {
                pl.warnEl.style.display = '';
                pl.warnEl.style.left = Math.round(pl.x - width / 2) + 'px';
                pl.warnEl.style.width = width + 'px';
                if (pl.t >= warnMs) {
                    pl.stage = 'active';
                    pl.warnEl.style.display = 'none';
                    pl.pilEl.style.display = '';
                    pl.pilEl.style.left = Math.round(pl.x - width / 2) + 'px';
                    pl.pilEl.style.width = width + 'px';
                }
            } else {
                if (!pl.hitDone && pr
                    && pr.right > pl.x - width / 2 && pr.left < pl.x + width / 2) {
                    pl.hitDone = true;
                    const dealt = _egNkHit(dmgPct, 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Seraph', 'Judgment Pillars');
                }
                if (pl.t >= warnMs + activeMs) {
                    pl.stage = 'done';
                    pl.pilEl.style.display = 'none';
                }
            }
        });
        return !allDone;
    });
}

function _egMechRadiantFans(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const volleys = [0, 3, 4, 5][p];
    const fanN = 7, fanSpread = 0.5;
    const volleyGapMs = 1000;
    const speed = [0, 150, 170, 195][p];
    const lifeMs = 7000;
    const dmgPct = [0, 0.05, 0.06, 0.075][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const ex = window.innerWidth * 0.5, ey = 80;
    const orbs = [];
    let fired = 0, acc = 0, orbCdUntil = 0;
    _egNkToast('eg_mech_radiant', '😇 The Seraph: Radiant Fans! Seven petals, no gaps kept!');
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
                    const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-orb-spirit');
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
                orbCdUntil = now + 450;
                const dealt = _egNkHit(dmgPct, 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Seraph', 'Radiant Fans');
            }
        }
        return fired < volleys || orbs.length > 0;
    });
}
