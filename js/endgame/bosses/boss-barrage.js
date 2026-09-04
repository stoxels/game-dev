//------------------------------------------------------------------------
//-------------------BOSS: THE BARRAGE (boss_barrage)---------------------------
//------------------------------------------------------------------------
// Boshy homage: bullet-hell apple spiral, slow but dense.
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
    boss_barrage: {
        id: 'boss_barrage', name: 'The Barrage', emoji: '🍎',
        baseHP: 1000, baseDamage: 22, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_barrage: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'apple_spiral', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechAppleSpiral' },
            { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechAppleSpiral(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const total = p >= 3 ? 32 : 26;
    const emitMs = 3000;
    const speed = [0, 120, 140, 165][p];
    const lifeMs = 9000;
    const dmgPct = [0, 0.055, 0.065, 0.08][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const ex = window.innerWidth * 0.8, ey = window.innerHeight * 0.5;
    const anchor = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-anchor', '🍎');
    anchor.style.transform = 'translate(' + Math.round(ex - 26) + 'px,' + Math.round(ey - 26) + 'px)';
    const orbs = [];
    let emitted = 0, emitAcc = 0, e = 0, orbCdUntil = 0;
    _egNkToast('eg_mech_barrage', '🍎 The Barrage: Apple Spiral! Thread the storm!');
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        emitAcc += dtS * 1000;
        const step = emitMs / total;
        while (emitted < total && emitAcc >= step) {
            emitAcc -= step;
            const a = emitted * 2.4 + e / 1000 * 1.5;
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
            o.x += o.vx * dtS + Math.cos(e / 1000 * 3 + o.seed) * 18 * dtS;
            o.y += o.vy * dtS;
            if (o.t > lifeMs || o.x < -30 || o.x > window.innerWidth + 30 || o.y < -30 || o.y > window.innerHeight + 30) {
                o.el.remove();
                orbs.splice(i, 1);
                continue;
            }
            o.el.style.transform = 'translate(' + Math.round(o.x - 9) + 'px,' + Math.round(o.y - 9) + 'px)';
            if (!o.hitDone && pr && now >= orbCdUntil) {
                // Hit test against the orb's ACTUAL rendered box instead of an
                // idealized point-circle: the collision then matches what the
                // player sees, so an orb that visibly touches the sprite always
                // registers (and any CSS motion can't skew the hitbox).
                const fr = o.el.getBoundingClientRect();
                if (fr.width > 0 && _egNkRectsOverlap(
                    { left: fr.left - 2, right: fr.right + 2, top: fr.top - 2, bottom: fr.bottom + 2 },
                    pr
                )) {
                    o.hitDone = true;
                    orbCdUntil = now + 500;
                    const dealt = _egNkHit(dmgPct, 'fire', level);
                    _egNkAbilityHitToast(dealt, 'The Barrage', 'Apple Spiral');
                }
            }
        }
        return emitted < total || orbs.length > 0;
    });
}
