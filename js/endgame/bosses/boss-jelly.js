//------------------------------------------------------------------------
//-------------------BOSS: THE JELLY (boss_jelly)-------------------------------
//------------------------------------------------------------------------
// Dragon-Quest homage and first-steps fight: the Jelly telegraphs three
// slow hops toward where you stand. Watch the shadow, leave before it lands.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_jelly: {
        id: 'boss_jelly', name: 'The Jelly', emoji: '🟢',
        baseHP: 880, baseDamage: 20, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_jelly: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.35 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.75 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'jelly_hops', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechJellyHops' },
            { name: 'probability_shift', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechProbabilityShift' },
        ],
    },
});


function _egMechJellyHops(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const hops = [0, 3, 3, 4][p];
    const warnMs = 1000, radius = 70;
    const dmgPct = [0, 0.12, 0.14, 0.18][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    let x = window.innerWidth * 0.5, y = window.innerHeight * 0.3;
    const body = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-jelly', '🟢');
    const queue = [];
    for (let i = 0; i < hops; i++) {
        const mark = _egNkEl(run, 'div', 'eg-nk-mark');
        mark.style.display = 'none';
        mark.style.width = radius * 2 + 'px';
        mark.style.height = radius * 2 + 'px';
        queue.push({ tx: 0, ty: 0, t: -i * 1400, warned: false, done: false, mark });
    }
    body.style.transform = 'translate(' + Math.round(x - 22) + 'px,' + Math.round(y - 22) + 'px)';
    _egNkToast('eg_mech_jelly', '🟢 The Jelly: Jelly Hops! Watch the shadow!');
    _egNkLoop(run, (dtS) => {
        let pending = false;
        queue.forEach(h => {
            if (h.done) return;
            pending = true;
            h.t += dtS * 1000;
            if (h.t < 0) return;
            if (!h.warned) {
                h.warned = true;
                const c = _egNkPlayerCenter();
                h.tx = c ? c.x : window.innerWidth / 2;
                h.ty = c ? c.y : window.innerHeight / 2;
                h.mark.style.display = '';
                h.mark.style.left = Math.round(h.tx - radius) + 'px';
                h.mark.style.top = Math.round(h.ty - radius) + 'px';
            }
            // Hop arc: body flies from its spot to the target over warnMs.
            const f = Math.min(1, h.t / warnMs);
            const bx = x + (h.tx - x) * f;
            const by = y + (h.ty - y) * f - Math.sin(f * Math.PI) * 90;
            body.style.transform = 'translate(' + Math.round(bx - 22) + 'px,' + Math.round(by - 22) + 'px)';
            if (f >= 1) {
                h.done = true;
                x = h.tx;
                y = h.ty;
                h.mark.classList.add('eg-nk-mark-hit');
                setTimeout(() => h.mark.remove(), 400);
                if (_egNkCircleHit(h.tx, h.ty, radius, _egNkPlayerRect(), 0)) {
                    const dealt = _egNkHit(dmgPct, 'cold', level);
                    _egNkAbilityHitToast(dealt, 'The Jelly', 'Jelly Hops');
                }
            }
        });
        return pending;
    });
}
