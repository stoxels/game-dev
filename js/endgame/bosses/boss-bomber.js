//------------------------------------------------------------------------
//-------------------BOSS: THE BOMBER (boss_bomber)-----------------------------
//------------------------------------------------------------------------
// Blast-zone homage: the Bomber plants crosses of fire — long telegraphed
// arms, then detonation. Safety lives in the four quadrant gaps between
// the arms. Think in plus-signs.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_bomber: {
        id: 'boss_bomber', name: 'The Bomber', emoji: '💣',
        baseHP: 1020, baseDamage: 23, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_bomber: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'cross_blasts', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechCrossBlasts' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechSoulTithe' },
        ],
    },
});


function _egMechCrossBlasts(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const crosses = [0, 2, 2, 3][p];
    const warnMs = 1100, armLen = 190, armHalf = 26;
    const dmgPct = [0, 0.17, 0.20, 0.24][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const queue = [];
    for (let i = 0; i < crosses; i++) {
        const c = _egNkPlayerCenter();
        const x = c ? c.x : window.innerWidth / 2;
        const y = c ? c.y : window.innerHeight / 2;
        const h = _egNkEl(run, 'div', 'eg-nk-lattice-warn eg-nk-lattice-h');
        const v = _egNkEl(run, 'div', 'eg-nk-lattice-warn eg-nk-lattice-v');
        h.style.display = 'none';
        v.style.display = 'none';
        queue.push({ x, y, t: -i * 1700, fired: false, h, v });
    }
    _egNkToast('eg_mech_bomber', '💣 The Bomber: Cross Blasts! Think in plus-signs!');
    _egNkLoop(run, (dtS) => {
        let pending = false;
        const pr = _egNkPlayerRect();
        queue.forEach(q => {
            if (q.fired) return;
            pending = true;
            q.t += dtS * 1000;
            if (q.t < 0) return;
            // Telegraph: short cross arms around the target point.
            q.h.style.display = '';
            q.v.style.display = '';
            q.h.style.left = Math.round(q.x - armLen) + 'px';
            q.h.style.width = armLen * 2 + 'px';
            q.h.style.top = Math.round(q.y - armHalf) + 'px';
            q.h.style.height = armHalf * 2 + 'px';
            q.v.style.top = Math.round(q.y - armLen) + 'px';
            q.v.style.height = armLen * 2 + 'px';
            q.v.style.left = Math.round(q.x - armHalf) + 'px';
            q.v.style.width = armHalf * 2 + 'px';
            if (q.t >= warnMs) {
                q.fired = true;
                q.h.classList.remove('eg-nk-lattice-warn');
                q.h.classList.add('eg-nk-lattice-hit');
                q.v.classList.remove('eg-nk-lattice-warn');
                q.v.classList.add('eg-nk-lattice-hit');
                setTimeout(() => { q.h.remove(); q.v.remove(); }, 450);
                if (pr) {
                    const inH = pr.bottom > q.y - armHalf && pr.top < q.y + armHalf
                        && pr.right > q.x - armLen && pr.left < q.x + armLen;
                    const inV = pr.right > q.x - armHalf && pr.left < q.x + armHalf
                        && pr.bottom > q.y - armLen && pr.top < q.y + armLen;
                    if (inH || inV) {
                        const dealt = _egNkHit(dmgPct, 'fire', level);
                        _egNkAbilityHitToast(dealt, 'The Bomber', 'Cross Blasts');
                    }
                }
            }
        });
        return pending;
    });
}
