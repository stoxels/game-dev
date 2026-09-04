//------------------------------------------------------------------------
//-------------------BOSS: THE BARRICADE (boss_barricade)-----------------------
//------------------------------------------------------------------------
// Bullet-wall homage: walls of shot sweep down the screen, each with one
// gap — and the gap drifts sideways as it falls. Start moving early and
// track it all the way down.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_barricade: {
        id: 'boss_barricade', name: 'The Barricade', emoji: '🚧',
        baseHP: 1060, baseDamage: 24, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_barricade: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'bullet_walls', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechBulletWalls' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechSoulTithe' },
        ],
    },
});


function _egMechBulletWalls(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const walls = [0, 2, 3, 3][p];
    const fallSpeed = [0, 150, 180, 215][p];
    const driftSpeed = [0, 60, 80, 105][p];
    const cell = 40, gapW = 170;
    const dmgPct = [0, 0.15, 0.18, 0.22][p];
    const staggerMs = 2200;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const queue = [];
    for (let i = 0; i < walls; i++) {
        queue.push({ y: 0, t: -i * staggerMs, gapX: 0, drift: 0, blocks: [], fired: false });
    }
    const buildWall = (q) => {
        q.gapX = 80 + Math.random() * Math.max(60, W - gapW - 160);
        q.drift = (Math.random() < 0.5 ? -1 : 1) * driftSpeed;
        q.y = -cell - 10;
        for (let x = 0; x < W; x += cell) {
            if (x + cell > q.gapX && x < q.gapX + gapW) continue;
            const el = _egNkEl(run, 'div', 'eg-nk-tetblock eg-nk-wallshot');
            el.style.width = (cell - 3) + 'px';
            el.style.height = (cell - 3) + 'px';
            q.blocks.push({ x, el });
        }
        q.fired = true;
    };
    _egNkToast('eg_mech_barricade', '🚧 The Barricade: Bullet Walls! Track the gap!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        let pending = false;
        const pr = _egNkPlayerRect();
        queue.forEach(q => {
            if (!q.fired) {
                pending = true;
                q.t += dtS * 1000;
                if (q.t >= 0) buildWall(q);
                return;
            }
            if (q.y > H + 60) {
                q.blocks.forEach(b => b.el.remove());
                q.blocks = [];
                return;
            }
            pending = true;
            q.y += fallSpeed * dtS;
            q.gapX += q.drift * dtS;
            if (q.gapX < 40 || q.gapX > W - gapW - 40) q.drift *= -1;
            q.gapX = Math.max(40, Math.min(W - gapW - 40, q.gapX));
            // Blocks ride the wall; the gap slides sideways through them.
            q.blocks.forEach(b => {
                b.el.style.transform = 'translate(' + Math.round(b.x + 1) + 'px,' + Math.round(q.y) + 'px)';
            });
            if (pr && now >= cdUntil) {
                const inGap = pr.right > q.gapX && pr.left < q.gapX + gapW;
                const inBand = pr.bottom > q.y && pr.top < q.y + cell;
                if (inBand && !inGap) {
                    cdUntil = now + 800;
                    const dealt = _egNkHit(dmgPct, null, level);
                    _egNkAbilityHitToast(dealt, 'The Barricade', 'Bullet Walls');
                }
            }
        });
        return pending;
    });
}
