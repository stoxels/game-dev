//------------------------------------------------------------------------
//-------------------BOSS: THE SHRINE MAIDEN (boss_shrine)----------------------
//------------------------------------------------------------------------
// Danmaku homage: the Shrine Maiden fans aimed spirit spreads at you —
// five-way volleys, slow enough to thread, relentless enough to punish
// standing still. Read the anchor, slip between the petals.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (corrupt_cells, probability_shift, prior_bomb,
// frozen_cells, clue_swap, grid_invert, summons, fated_cell, fog_bank,
// clue_scramble, soul_tithe) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_shrine: {
        id: 'boss_shrine', name: 'The Shrine Maiden', emoji: '⛩️',
        baseHP: 980, baseDamage: 22, chargeMax: 11,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_shrine: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'spirit_fans', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechSpiritFans' },
            { name: 'fated_cell', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechFatedCell' },
            { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechSpiritFans(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const volleys = 3, fanN = 5, fanSpread = 0.35;
    const volleyGapMs = 1200;
    const speed = [0, 130, 145, 160][p];
    const lifeMs = 8000;
    const dmgPct = [0, 0.05, 0.06, 0.08][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const ex = window.innerWidth * 0.5, ey = 90;
    const anchor = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-anchor', '⛩️');
    anchor.style.transform = 'translate(' + Math.round(ex - 26) + 'px,' + Math.round(ey - 26) + 'px)';
    const orbs = [];
    let fired = 0, gapAcc = 0, orbCdUntil = 0;
    _egNkToast('eg_mech_fans', '⛩️ The Shrine Maiden: Spirit Fans! Thread the petals!');
    _egNkLoop(run, (dtS, now) => {
        if (fired < volleys) {
            gapAcc += dtS * 1000;
            if (gapAcc >= (fired === 0 ? 400 : volleyGapMs)) {
                gapAcc = 0;
                fired++;
                const c = _egNkPlayerCenter();
                const base = Math.atan2((c ? c.y : window.innerHeight / 2) - ey,
                    (c ? c.x : window.innerWidth / 2) - ex);
                for (let i = 0; i < fanN; i++) {
                    const a = base + (i - (fanN - 1) / 2) * (fanSpread * 2 / (fanN - 1));
                    const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-orb-spirit');
                    orbs.push({
                        x: ex, y: ey,
                        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
                        t: 0, hitDone: false, el,
                    });
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
                orbCdUntil = now + 600;
                const dealt = _egNkHit(dmgPct, 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Shrine Maiden', 'Spirit Fans');
            }
        }
        return fired < volleys || orbs.length > 0;
    });
}
