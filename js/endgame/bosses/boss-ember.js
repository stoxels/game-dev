//------------------------------------------------------------------------
//-------------------BOSS: THE EMBER (boss_ember)-------------------------------
//------------------------------------------------------------------------
// First-steps fight: slow embers drift straight down with generous
// telegraphs. Teaches "watch the warnings, keep drifting".
// Every ember that touches the player ignites them — it IS a flame, and
// the boss itself shrugs off fire damage at the 75% resistance cap.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_ember: {
        id: 'boss_ember', name: 'The Ember', emoji: '🔥',
        baseHP: 850, baseDamage: 18, chargeMax: 14,
        // A living flame: fire sits at the hard resistance cap (75%), so
        // fire skills deal only a quarter of their damage to it.
        element: 'fire', resistances: { fire: 75, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_ember: {
        phases: [
            { threshold: 1.00, chargeMax: 14, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.30 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.70 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'ember_drift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechEmberDrift' },
            { name: 'prior_bomb', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechEmberDrift(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = [0, 6, 8, 10][p];
    const speed = [0, 90, 110, 135][p];
    // %maxHP per contact. Tuned after the hit-detection fix: every visible
    // flame contact now lands AND ignites, so per-hit damage sits lower than
    // the old miss-heavy values — a caught (standing-in-lane) player loses
    // roughly a quarter of their HP per wave, a drifting player ~nothing.
    const dmgPct = [0, 0.04, 0.05, 0.06][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const embers = [];
    for (let i = 0; i < count; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-ember', '🔥');
        el.style.display = 'none';
        embers.push({
            x: 40 + Math.random() * Math.max(40, window.innerWidth - 80),
            y: -30 - i * (120 + Math.random() * 120),
            cdUntil: 0, el,
        });
    }
    _egNkToast('eg_mech_ember', '🔥 The Ember: Ember Drift! Drift between the embers!');
    _egNkLoop(run, (dtS, now) => {
        let pending = false;
        const pr = _egNkPlayerRect();
        embers.forEach(o => {
            if (o.y > window.innerHeight + 40) return;
            pending = true;
            o.y += speed * dtS;
            o.el.style.display = '';
            o.el.style.transform = 'translate(' + Math.round(o.x - 14) + 'px,' + Math.round(o.y - 14) + 'px)';
            if (pr && now >= o.cdUntil) {
                // Hit test against the flame's ACTUAL rendered box instead of
                // an idealized point-circle: the collision then matches what
                // the player sees, so a flame that visibly touches the sprite
                // always registers (and the CSS wiggle can't skew the hitbox).
                const fr = o.el.getBoundingClientRect();
                if (fr.width > 0 && _egNkRectsOverlap(
                    { left: fr.left - 2, right: fr.right + 2, top: fr.top - 2, bottom: fr.bottom + 2 },
                    pr
                )) {
                    o.cdUntil = now + 800;
                    const dealt = _egNkHit(dmgPct, 'fire', level);
                    _egNkAbilityHitToast(dealt, 'The Ember', 'Ember Drift');
                    // A living flame burns on contact: guaranteed ignite (fire
                    // DoT) at the standard ignite share of the triggering hit.
                    const igniteDps = Math.max(EG_AIL_MIN_DOT_DAMAGE,
                        Math.max(1, Math.round(_egNkMaxHP() * dmgPct * _egNkTierDamageFactor(level)))
                        * EG_AIL_IGNITE_DMG_SHARE);
                    _egApplyPlayerAilment('ignite', igniteDps);
                }
            }
        });
        return pending;
    });
}
