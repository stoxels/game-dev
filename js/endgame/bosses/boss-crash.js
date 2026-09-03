//------------------------------------------------------------------------
//-------------------BOSS: THE DEMOLITIONIST (boss_crash)---------------------------
//------------------------------------------------------------------------
// Crash-Man homage: sticky bombs on your position, keep moving.
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
    boss_crash: {
        id: 'boss_crash', name: 'The Demolitionist', emoji: '💣',
        baseHP: 1080, baseDamage: 23, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_crash: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'sticky_bombs', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechStickyBombs' },
            { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechStickyBombs(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const k = p >= 3 ? 4 : 3;
    const fuseMs = 1400, blastR = 110;
    const dmgPct = [0, 0.15, 0.18, 0.22][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const c = _egNkPlayerCenter();
    const cx = c ? c.x : window.innerWidth / 2;
    const cy = c ? c.y : window.innerHeight / 2;
    const bombs = [];
    for (let i = 0; i < k; i++) {
        const x = Math.max(40, Math.min(window.innerWidth - 40, cx + (Math.random() * 240 - 120)));
        const y = Math.max(40, Math.min(window.innerHeight - 40, cy + (Math.random() * 240 - 120)));
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-bomb', '💣');
        el.style.transform = 'translate(' + Math.round(x - 22) + 'px,' + Math.round(y - 22) + 'px)';
        bombs.push({ x, y, t: 0, done: false, el });
    }
    _egNkToast('eg_mech_sticky', '💣 The Demolitionist: Sticky Bombs! Keep moving!');
    _egNkLoop(run, (dtS) => {
        let pending = false;
        const pr = _egNkPlayerRect();
        bombs.forEach(b => {
            b.t += dtS * 1000;
            if (!b.done) {
                if (b.t >= fuseMs * 0.6) b.el.classList.add('eg-nk-fuse');
                if (b.t >= fuseMs) {
                    b.done = true;
                    b.el.classList.add('eg-nk-boom');
                    if (pr && _egNkCircleHit(b.x, b.y, blastR, pr, 0)) {
                        const dealt = _egNkHit(dmgPct, 'fire', level);
                        _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
                    }
                } else {
                    pending = true;
                }
            }
            if (b.done) {
                if (b.t >= fuseMs + 450) b.el.style.display = 'none';
                else pending = true;
            }
        });
        return pending;
    });
}
