//------------------------------------------------------------------------
//-------------------BOSS: THE RAZOR (boss_razor)-------------------------------
//------------------------------------------------------------------------
// Metal-Man homage: razor boomerangs fly out at where you stand — and then
// come BACK. Dodge the throw, then dodge the return.
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
    boss_razor: {
        id: 'boss_razor', name: 'The Razor', emoji: '🪃',
        baseHP: 980, baseDamage: 24, chargeMax: 11,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_razor: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'razor_boomerang', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechRazorBoomerang' },
            { name: 'clue_scramble', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechClueScramble' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
        ],
    },
});


function _egMechRazorBoomerang(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = [0, 2, 3, 4][p];
    const outSpeed = 320, backSpeed = 380;
    const radius = 20;
    const dmgPct = [0, 0.13, 0.15, 0.18][p];
    const staggerMs = 800;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const ax = window.innerWidth * 0.85, ay = window.innerHeight * 0.5;
    const anchor = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-anchor', '🪃');
    anchor.style.transform = 'translate(' + Math.round(ax - 26) + 'px,' + Math.round(ay - 26) + 'px)';
    const blades = [];
    for (let i = 0; i < count; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-blade', '🪃');
        el.style.display = 'none';
        blades.push({ x: ax, y: ay, tx: ax, ty: ay, t: -i * staggerMs, leg: 'out', hitOut: false, hitBack: false, el });
    }
    _egNkToast('eg_mech_boomerang', '🪃 The Razor: Razor Boomerangs! Dodge them twice!');
    _egNkLoop(run, (dtS) => {
        let pending = false;
        const pr = _egNkPlayerRect();
        blades.forEach(b => {
            if (b.leg === 'done') return;
            pending = true;
            b.t += dtS * 1000;
            if (b.t < 0) return;
            b.el.style.display = '';
            if (b.leg === 'out' && b.tx === ax && b.ty === ay) {
                // First frame of the throw: snapshot the player's position.
                const c = _egNkPlayerCenter();
                b.tx = c ? c.x : window.innerWidth / 2;
                b.ty = c ? c.y : window.innerHeight / 2;
            }
            const gx = b.leg === 'out' ? b.tx : ax;
            const gy = b.leg === 'out' ? b.ty : ay;
            const spd = b.leg === 'out' ? outSpeed : backSpeed;
            const dx = gx - b.x, dy = gy - b.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const step = Math.min(d, spd * dtS);
            b.x += (dx / d) * step;
            b.y += (dy / d) * step;
            b.el.style.transform = 'translate(' + Math.round(b.x - 22) + 'px,' + Math.round(b.y - 22) + 'px)';
            if (pr && _egNkCircleHit(b.x, b.y, radius, pr, 0)) {
                if (b.leg === 'out' && !b.hitOut) {
                    b.hitOut = true;
                    const dealt = _egNkHit(dmgPct, 'lightning', level);
                    _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
                } else if (b.leg === 'back' && !b.hitBack) {
                    b.hitBack = true;
                    const dealt = _egNkHit(dmgPct, 'lightning', level);
                    _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
                }
            }
            if (d <= 12) {
                if (b.leg === 'out') b.leg = 'back';
                else { b.leg = 'done'; b.el.style.display = 'none'; }
            }
        });
        return pending;
    });
}
