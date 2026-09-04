//------------------------------------------------------------------------
//-------------------BOSS: THE GRIDLOCK (boss_gridlock)-------------------------
//------------------------------------------------------------------------
// Quick-Man homage: alternating waves of thin laser beams sweep the whole
// screen — full-width horizontals, then full-height verticals. Telegraphs
// show where they will fire; clear the lit lanes before they go live.
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
    boss_gridlock: {
        id: 'boss_gridlock', name: 'The Gridlock', emoji: '📡',
        baseHP: 1020, baseDamage: 23, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_gridlock: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'laser_lattice', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechLaserLattice' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
        ],
    },
});


function _egMechLaserLattice(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const waves = [0, 2, 3, 4][p];
    const warnMs = 900, activeMs = 500, gapMs = 800;
    const thick = 14;
    const dmgPct = [0, 0.12, 0.14, 0.17][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    let axis = Math.random() < 0.5 ? 'h' : 'v';
    const mkWave = () => {
        axis = axis === 'h' ? 'v' : 'h';
        const lines = [];
        for (let i = 0; i < 3; i++) {
            const el = _egNkEl(run, 'div', 'eg-nk-lattice-warn ' + (axis === 'h' ? 'eg-nk-lattice-h' : 'eg-nk-lattice-v'));
            let pos;
            if (axis === 'h') {
                pos = H * (0.2 + 0.3 * i) + (Math.random() * 80 - 40);
                pos = Math.max(30, Math.min(H - 30, pos));
                el.style.top = Math.round(pos - thick / 2) + 'px';
                el.style.height = thick + 'px';
            } else {
                pos = W * (0.2 + 0.3 * i) + (Math.random() * 80 - 40);
                pos = Math.max(30, Math.min(W - 30, pos));
                el.style.left = Math.round(pos - thick / 2) + 'px';
                el.style.width = thick + 'px';
            }
            lines.push({ axis, pos, el, hitDone: false });
        }
        return { lines, t: 0, fired: false };
    };
    let left = waves, wave = null, e = 0;
    _egNkToast('eg_mech_lattice', '📡 The Gridlock: Laser Lattice! Clear the lit lanes!');
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        if (!wave && left > 0) {
            left--;
            wave = mkWave();
            wave.t = 0;
        }
        if (!wave) return false;
        wave.t += dtS * 1000;
        if (!wave.fired && wave.t >= warnMs) {
            wave.fired = true;
            wave.lines.forEach(l => {
                l.el.classList.remove('eg-nk-lattice-warn');
                l.el.classList.add('eg-nk-lattice-hit');
            });
            const pr = _egNkPlayerRect();
            if (pr) {
                const caught = wave.lines.some(l => l.axis === 'h'
                    ? (pr.bottom > l.pos - thick / 2 && pr.top < l.pos + thick / 2)
                    : (pr.right > l.pos - thick / 2 && pr.left < l.pos + thick / 2));
                if (caught) {
                    const dealt = _egNkHit(dmgPct, 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Gridlock', 'Laser Lattice');
                }
            }
        }
        if (wave.t >= warnMs + activeMs + gapMs) {
            wave.lines.forEach(l => l.el.remove());
            wave = null;
        }
        return left > 0 || !!wave;
    });
}
