//------------------------------------------------------------------------
//-------------------BOSS: THE GOURMET (boss_gourmet)---------------------------
//------------------------------------------------------------------------
// Appetite homage: a great mouth gapes at the screen's edge, inhales for
// four seconds — then spits three stars back at you. Do not stand in front
// of a hungry mouth.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_gourmet: {
        id: 'boss_gourmet', name: 'The Gourmet', emoji: '👄',
        baseHP: 1000, baseDamage: 22, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_gourmet: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'gourmet_gulp', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechGourmetGulp' },
            { name: 'corrupt_cells', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechGourmetGulp(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const inhaleMs = 4000;
    const pullSpeed = [0, 130, 155, 185][p];
    const starSpeed = 260, starR = 12;
    const dmgPct = [0, 0.07, 0.08, 0.10][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const mx = 70, my = window.innerHeight * 0.5;
    const mouth = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-mouth', '👄');
    mouth.style.transform = 'translate(' + Math.round(mx - 30) + 'px,' + Math.round(my - 30) + 'px)';
    _egNkToast('eg_mech_gourmet', '👄 The Gourmet: Gourmet Gulp! Mind the mouth!');
    const stars = [];
    let e = 0, spat = false, orbCdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        if (e < inhaleMs) {
            const c = _egNkPlayerCenter();
            if (c) {
                const dx = mx - c.x, dy = my - c.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                _egNkNudgeAvatar((dx / d) * pullSpeed * dtS, (dy / d) * pullSpeed * dtS);
            }
            return true;
        }
        if (!spat) {
            spat = true;
            mouth.textContent = '😮';
            const c = _egNkPlayerCenter();
            const base = Math.atan2((c ? c.y : my) - my, (c ? c.x : mx) - mx);
            for (let k = -1; k <= 1; k++) {
                const a = base + k * 0.28;
                const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-star', '⭐');
                stars.push({ x: mx, y: my, vx: Math.cos(a) * starSpeed, vy: Math.sin(a) * starSpeed, t: 0, hitDone: false, el });
            }
        }
        const pr = _egNkPlayerRect();
        for (let i = stars.length - 1; i >= 0; i--) {
            const s = stars[i];
            s.t += dtS * 1000;
            s.x += s.vx * dtS;
            s.y += s.vy * dtS;
            if (s.t > 5000 || s.x < -30 || s.x > window.innerWidth + 30 || s.y < -30 || s.y > window.innerHeight + 30) {
                s.el.remove();
                stars.splice(i, 1);
                continue;
            }
            s.el.style.transform = 'translate(' + Math.round(s.x - 14) + 'px,' + Math.round(s.y - 14) + 'px)';
            if (!s.hitDone && pr && now >= orbCdUntil && _egNkCircleHit(s.x, s.y, starR, pr, 2)) {
                s.hitDone = true;
                orbCdUntil = now + 500;
                _egNkHit(dmgPct, null, level);
            }
        }
        return stars.length > 0;
    });
}
