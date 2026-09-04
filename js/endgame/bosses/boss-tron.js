//------------------------------------------------------------------------
//-------------------BOSS: THE TRON (boss_tron)---------------------------------
//------------------------------------------------------------------------
// Light-cycle homage: a rider burns across the arena at full speed,
// turning on a dime and walling its trail behind it. The trail is death —
// herd the rider into loops that leave you room.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_tron: {
        id: 'boss_tron', name: 'The Tron', emoji: '🏍️',
        baseHP: 1060, baseDamage: 24, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_tron: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'light_cycle', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechLightCycle' },
            { name: 'corrupt_cells', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechLightCycle(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const speed = [0, 260, 300, 350][p];
    const segLen = 26, maxSegs = 44;
    const hitW = 16;
    const dmgPct = [0, 0.18, 0.22, 0.27][p];
    const durMs = 12000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const bike = {
        x: window.innerWidth * 0.2, y: window.innerHeight * 0.3,
        dir: 0, turnIn: 900,
        el: _egNkEl(run, 'div', 'eg-nk-dot eg-nk-bike', '🏍️'),
    };
    const trail = []; // { x, y, el }
    const laySegment = () => {
        const el = _egNkEl(run, 'div', 'eg-nk-trail');
        el.style.transform = 'translate(' + Math.round(bike.x - 8) + 'px,' + Math.round(bike.y - 8) + 'px)';
        trail.push({ x: bike.x, y: bike.y, el });
        if (trail.length > maxSegs) {
            const old = trail.shift();
            old.el.remove();
        }
    };
    _egNkToast('eg_mech_tron', '🏍️ The Tron: Light Cycle! The trail is death!');
    let e = 0, cdUntil = 0, acc = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        // Steer toward open space: turn before walls, randomly otherwise.
        bike.turnIn -= dtS * 1000;
        const nx = bike.x + dirs[bike.dir][0] * speed * 0.5;
        const ny = bike.y + dirs[bike.dir][1] * speed * 0.5;
        if (bike.turnIn <= 0 || nx < 60 || nx > window.innerWidth - 60 || ny < 60 || ny > window.innerHeight - 60) {
            bike.dir = (bike.dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
            bike.turnIn = 700 + Math.random() * 900;
        }
        bike.x += dirs[bike.dir][0] * speed * dtS;
        bike.y += dirs[bike.dir][1] * speed * dtS;
        bike.x = Math.max(20, Math.min(window.innerWidth - 20, bike.x));
        bike.y = Math.max(20, Math.min(window.innerHeight - 20, bike.y));
        bike.el.style.transform = 'translate(' + Math.round(bike.x - 22) + 'px,' + Math.round(bike.y - 22) + 'px)';
        acc += speed * dtS;
        if (acc >= segLen) {
            acc = 0;
            laySegment();
        }
        const pr = _egNkPlayerRect();
        if (pr && now >= cdUntil) {
            const c = _egNkPlayerCenter();
            let hit = c && Math.hypot(c.x - bike.x, c.y - bike.y) < 30;
            if (!hit) {
                for (const s of trail) {
                    if (Math.abs(pr.left + pr.width / 2 - s.x) < hitW + pr.width / 2
                        && Math.abs(pr.top + pr.height / 2 - s.y) < hitW + pr.height / 2) {
                        hit = true;
                        break;
                    }
                }
            }
            if (hit) {
                cdUntil = now + 1000;
                const dealt = _egNkHit(dmgPct, 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Tron', 'Light Cycle');
            }
        }
        return e < durMs;
    });
}
