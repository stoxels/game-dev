//------------------------------------------------------------------------
//-------------------BOSS: THE ZENITH (boss_zenith)-----------------------------
//------------------------------------------------------------------------
// The final throne: Royal Decrees — alternating freeze/move trials, three
// in a row, no mercy between them — beneath a triple crown of fast rings.
// Everything the atlas taught you, at once, at its fastest. Good luck.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_zenith: {
        id: 'boss_zenith', name: 'The Zenith', emoji: '👑',
        baseHP: 1250, baseDamage: 28, chargeMax: 10,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_zenith: {
        phases: [
            { threshold: 1.00, chargeMax: 10, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 7, damageMultiplier: 1.65 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.30 },
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'royal_decree', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechRoyalDecree' },
            { name: 'crown_rings', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechCrownRings' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechSoulTithe' },
        ],
    },
});


function _egMechRoyalDecree(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const waves = [0, 3, 3, 4][p];
    const warnMs = 900, activeMs = 2200, gapMs = 500;
    const moveTol = 22, stillTol = 40;
    const dmgPct = [0, 0.17, 0.20, 0.25][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    let left = waves, stage = 'idle', t = 0, blue = true;
    let tint = null, label = null, judged = false, ax = 0, ay = 0, waveNo = 0;
    const clearEls = () => {
        if (tint) { tint.remove(); tint = null; }
        if (label) { label.remove(); label = null; }
    };
    _egNkToast('eg_mech_zenith', '👑 The Zenith: Royal Decree! Obey — instantly!');
    _egNkLoop(run, (dtS) => {
        if (stage === 'idle') {
            if (left <= 0) { clearEls(); return false; }
            left--;
            waveNo++;
            blue = waveNo % 2 === 1; // strict alternation: freeze, move, freeze...
            stage = 'warn';
            t = 0;
            judged = false;
            tint = _egNkEl(run, 'div', blue ? 'eg-nk-trial-blue' : 'eg-nk-trial-orange');
            label = _egNkEl(run, 'div', 'eg-nk-trial-label', blue ? '💙 FREEZE!' : '🧡 MOVE!');
            return true;
        }
        t += dtS * 1000;
        if (stage === 'warn' && t >= warnMs) {
            stage = 'active';
            t = 0;
            const c = _egNkPlayerCenter();
            ax = c ? c.x : 0;
            ay = c ? c.y : 0;
        } else if (stage === 'active') {
            const c = _egNkPlayerCenter();
            if (c && !judged) {
                const moved = Math.hypot(c.x - ax, c.y - ay);
                if (blue && moved > moveTol) {
                    judged = true;
                    const dealt = _egNkHit(dmgPct, null, level);
                    _egNkAbilityHitToast(dealt, 'The Zenith', 'Royal Decree');
                } else if (!blue && t >= activeMs && moved < stillTol) {
                    judged = true;
                    const dealt = _egNkHit(dmgPct, null, level);
                    _egNkAbilityHitToast(dealt, 'The Zenith', 'Royal Decree');
                }
            }
            if (t >= activeMs + gapMs) {
                clearEls();
                stage = 'idle';
                t = 0;
            }
        }
        return true;
    });
}

function _egMechCrownRings(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const expandMs = [0, 1700, 1500, 1300][p];
    const bandHalf = 24;
    const dmgPct = [0, 0.22, 0.26, 0.32][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.42;
    const rMax = Math.max(window.innerWidth, window.innerHeight) * 0.7;
    const crown = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-anchor', '👑');
    crown.style.transform = 'translate(' + Math.round(cx - 26) + 'px,' + Math.round(cy - 26) + 'px)';
    const rings = [0, 1, 2].map(i => {
        const el = _egNkEl(run, 'div', 'eg-nk-ring eg-nk-ring-crown');
        el.style.display = 'none';
        return { delay: i * 450, r: 40, el };
    });
    _egNkToast('eg_mech_crown', '👑 The Zenith: Crown Rings! Three heartbeats!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        const dist = c ? Math.hypot(c.x - cx, c.y - cy) : 9999;
        let pending = false;
        rings.forEach(rg => {
            if (e < rg.delay) { pending = true; return; }
            const t = (e - rg.delay) / expandMs;
            if (t >= 1) {
                rg.el.style.display = 'none';
                return;
            }
            pending = true;
            rg.r = 40 + (rMax - 40) * t;
            const r = Math.round(rg.r);
            rg.el.style.display = '';
            rg.el.style.left = Math.round(cx - r) + 'px';
            rg.el.style.top = Math.round(cy - r) + 'px';
            rg.el.style.width = r * 2 + 'px';
            rg.el.style.height = r * 2 + 'px';
            if (c && now >= cdUntil && Math.abs(dist - rg.r) < bandHalf) {
                cdUntil = now + 900;
                const dealt = _egNkHit(dmgPct, null, level);
                _egNkAbilityHitToast(dealt, 'The Zenith', 'Crown Rings');
            }
        });
        return pending;
    });
}
