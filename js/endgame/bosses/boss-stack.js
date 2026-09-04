//------------------------------------------------------------------------
//-------------------BOSS: THE STACK (boss_stack)--------------------------------
//------------------------------------------------------------------------
// Tetris homage: rows of blocks rain from the top, each with a single gap
// column. Park under the gap and let the row thunder past — the stack does
// not care about anything in its way.
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
    boss_stack: {
        id: 'boss_stack', name: 'The Stack', emoji: '🧩',
        baseHP: 1080, baseDamage: 22, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_stack: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'block_fall', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechBlockFall' },
            { name: 'fog_bank', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechFogBank' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
        ],
    },
});


function _egMechBlockFall(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const rows = [0, 2, 3, 4][p];
    const speed = [0, 160, 190, 230][p];
    const cell = 46, gapW = 150;
    const dmgPct = [0, 0.16, 0.20, 0.24][p];
    const staggerMs = 1500;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const mkRow = () => {
        const gx = 60 + Math.random() * Math.max(60, W - gapW - 120);
        const blocks = [];
        for (let x = 0; x < W; x += cell) {
            // Skip blocks overlapping the gap column.
            if (x + cell > gx && x < gx + gapW) continue;
            const el = _egNkEl(run, 'div', 'eg-nk-tetblock');
            el.style.width = (cell - 3) + 'px';
            el.style.height = (cell - 3) + 'px';
            blocks.push({ x, el });
        }
        return { y: -cell - 10, blocks, gapX: gx, done: false };
    };
    const falling = [];
    for (let i = 0; i < rows; i++) falling.push({ row: null, at: i * staggerMs });
    _egNkToast('eg_mech_blocks', '🧩 The Stack: Block Fall! Park under the gap!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        let pending = false;
        const pr = _egNkPlayerRect();
        falling.forEach(slot => {
            if (slot.row) {
                const r = slot.row;
                if (r.done) return;
                pending = true;
                r.y += speed * dtS;
                if (r.y > H + 60) {
                    r.done = true;
                    r.blocks.forEach(b => b.el.remove());
                    return;
                }
                r.blocks.forEach(b => {
                    b.el.style.transform = 'translate(' + Math.round(b.x + 1) + 'px,' + Math.round(r.y) + 'px)';
                });
                if (pr && now >= cdUntil) {
                    const hit = r.blocks.some(b =>
                        pr.right > b.x && pr.left < b.x + cell && pr.bottom > r.y && pr.top < r.y + cell);
                    if (hit) {
                        cdUntil = now + 800;
                        const dealt = _egNkHit(dmgPct, null, level);
                        _egNkAbilityHitToast(dealt, 'The Stack', 'Block Fall');
                    }
                }
                return;
            }
            if (e >= slot.at) slot.row = mkRow();
            pending = true;
        });
        return pending;
    });
}
