//------------------------------------------------------------------------
//-------------------BOSS: THE PHANTOM (boss_phantom)---------------------------
//------------------------------------------------------------------------
// Vent-assassin homage: three vents breathe on the arena floor. The Phantom
// telegraphs at the vent nearest you — then steps out and slashes. Never
// linger beside a breathing vent.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_phantom: {
        id: 'boss_phantom', name: 'The Phantom', emoji: '👻',
        baseHP: 1040, baseDamage: 24, chargeMax: 11,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_phantom: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'vent_ambush', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechVentAmbush' },
            { name: 'fog_bank', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechFogBank' },
        ],
    },
});


function _egMechVentAmbush(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const strikes = [0, 3, 4, 5][p];
    const warnMs = 800, slashR = 90;
    const dmgPct = [0, 0.18, 0.22, 0.27][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const vents = [0.25, 0.5, 0.75].map(fx => {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-vent', '🕳️');
        const v = { x: window.innerWidth * fx, y: window.innerHeight * 0.75, el };
        el.style.transform = 'translate(' + Math.round(v.x - 22) + 'px,' + Math.round(v.y - 22) + 'px)';
        return v;
    });
    _egNkToast('eg_mech_phantom', '👻 The Phantom: Vent Ambush! Never linger by a vent!');
    let idx = 0, stage = 'pick', t = 0, vent = null, mark = null;
    _egNkLoop(run, (dtS) => {
        if (idx >= strikes) return false;
        t += dtS * 1000;
        if (stage === 'pick') {
            // Strike from the vent nearest the player — always personal.
            const c = _egNkPlayerCenter();
            vent = vents[0];
            if (c) {
                vent = vents.slice().sort((a, b) =>
                    Math.hypot(c.x - a.x, c.y - a.y) - Math.hypot(c.x - b.x, c.y - b.y))[0];
            }
            vent.el.classList.add('eg-nk-fuse');
            mark = _egNkEl(run, 'div', 'eg-nk-mark');
            mark.style.left = Math.round(vent.x - slashR) + 'px';
            mark.style.top = Math.round(vent.y - slashR) + 'px';
            mark.style.width = slashR * 2 + 'px';
            mark.style.height = slashR * 2 + 'px';
            stage = 'warn';
            t = 0;
        } else if (stage === 'warn') {
            if (t >= warnMs) {
                stage = 'slash';
                t = 0;
                vent.el.classList.remove('eg-nk-fuse');
                const ghost = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-assassin', '👻');
                ghost.style.transform = 'translate(' + Math.round(vent.x - 22) + 'px,' + Math.round(vent.y - 22) + 'px)';
                setTimeout(() => ghost.remove(), 450);
                if (mark) {
                    mark.classList.add('eg-nk-mark-hit');
                    setTimeout(() => { if (mark) { mark.remove(); mark = null; } }, 400);
                }
                if (_egNkCircleHit(vent.x, vent.y, slashR, _egNkPlayerRect(), 0)) {
                    const dealt = _egNkHit(dmgPct, 'shadow', level);
                    _egNkAbilityHitToast(dealt, 'The Phantom', 'Vent Ambush');
                }
            }
        } else if (stage === 'slash') {
            if (t >= 700) {
                stage = 'pick';
                t = 0;
                idx++;
            }
        }
        return true;
    });
}
