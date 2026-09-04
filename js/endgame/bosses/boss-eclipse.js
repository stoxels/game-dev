//------------------------------------------------------------------------
//-------------------BOSS: THE ECLIPSE (boss_eclipse)---------------------------
//------------------------------------------------------------------------
// Umbral-dash homage: the Eclipse dissolves at the screen's edge and
// reappears mid-dash — straight at you, from any angle, four times over.
// There is no lane to memorize. There is only the tell, and moving.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_eclipse: {
        id: 'boss_eclipse', name: 'The Eclipse', emoji: '🌒',
        baseHP: 1100, baseDamage: 25, chargeMax: 11,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_eclipse: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'umbral_dashes', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechUmbralDashes' },
            { name: 'fated_cell', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechFatedCell' },
        ],
    },
});


function _egMechUmbralDashes(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const dashes = [0, 3, 4, 4][p];
    const warnMs = 900, dashSpeed = 950;
    const dmgPct = [0, 0.22, 0.26, 0.32][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    _egNkToast('eg_mech_eclipse', '🌒 The Eclipse: Umbral Dashes! Only the tell, and moving!');
    let idx = 0, stage = 'idle', t = 0, dashHit = false;
    let sx = 0, sy = 0, tx = 0, ty = 0, dx = 0, dy = 0, dist = 1;
    let shade = null, lineEl = null;
    _egNkLoop(run, (dtS) => {
        if (idx >= dashes) {
            if (shade) { shade.remove(); shade = null; }
            if (lineEl) { lineEl.remove(); lineEl = null; }
            return false;
        }
        t += dtS * 1000;
        if (stage === 'idle') {
            // Spawn at a random screen edge, aimed at the player's live position.
            dashHit = false;
            const c = _egNkPlayerCenter();
            tx = c ? c.x : window.innerWidth / 2;
            ty = c ? c.y : window.innerHeight / 2;
            const edge = Math.floor(Math.random() * 4);
            const m = 70;
            sx = edge === 0 ? -m : edge === 1 ? window.innerWidth + m : Math.random() * window.innerWidth;
            sy = edge === 2 ? -m : edge === 3 ? window.innerHeight + m : Math.random() * window.innerHeight;
            if (edge < 2) sy = Math.max(40, Math.min(window.innerHeight - 40, ty + (Math.random() * 200 - 100)));
            else sx = Math.max(40, Math.min(window.innerWidth - 40, tx + (Math.random() * 200 - 100)));
            dx = tx - sx;
            dy = ty - sy;
            dist = Math.sqrt(dx * dx + dy * dy) || 1;
            shade = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-shade', '🌒');
            shade.style.transform = 'translate(' + Math.round(sx - 26) + 'px,' + Math.round(sy - 26) + 'px)';
            // Thin warning line from spawn toward the target.
            lineEl = _egNkEl(run, 'div', 'eg-nk-dashline');
            const ang = Math.atan2(dy, dx);
            lineEl.style.width = Math.round(dist) + 'px';
            lineEl.style.left = Math.round(sx) + 'px';
            lineEl.style.top = Math.round(sy) + 'px';
            lineEl.style.transform = 'rotate(' + ang + 'rad)';
            stage = 'warn';
            t = 0;
        } else if (stage === 'warn') {
            if (t >= warnMs) {
                stage = 'dash';
                t = 0;
                if (lineEl) { lineEl.remove(); lineEl = null; }
            }
        } else if (stage === 'dash') {
            const step = Math.min(dist, dashSpeed * dtS);
            // Advance along the locked line.
            const ux = dx / dist, uy = dy / dist;
            sx += ux * step;
            sy += uy * step;
            dist -= step;
            if (shade) shade.style.transform = 'translate(' + Math.round(sx - 26) + 'px,' + Math.round(sy - 26) + 'px)';
            const pr = _egNkPlayerRect();
            if (pr && !dashHit && _egNkDotHit(shade, pr, 0)) {
                dashHit = true;
                const dealt = _egNkHit(dmgPct, 'shadow', level);
                _egNkAbilityHitToast(dealt, 'The Eclipse', 'Umbral Dashes');
            }
            if (dist <= 1) {
                if (shade) { shade.remove(); shade = null; }
                stage = 'idle';
                t = -500; // breath between dashes
                idx++;
            }
        }
        return true;
    });
}
