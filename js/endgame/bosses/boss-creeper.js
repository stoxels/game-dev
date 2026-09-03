//------------------------------------------------------------------------
//-------------------BOSS: THE CREEPER (boss_creeper)---------------------------
//------------------------------------------------------------------------
// Green-thing homage: two creepers stalk you with burning fuses. Crowd one
// and its fuse climbs — back off and it cools. Juggle both fuses or eat a
// double detonation.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_creeper: {
        id: 'boss_creeper', name: 'The Creeper', emoji: '💥',
        baseHP: 1020, baseDamage: 23, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_creeper: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'creeper_stalk', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechCreeperStalk' },
            { name: 'fog_bank', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechFogBank' },
        ],
    },
});


function _egMechCreeperStalk(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const speed = [0, 75, 88, 105][p];
    const fuseRange = 120, blastR = 150;
    const heatRate = [0, 0.45, 0.55, 0.7][p]; // fuse units per second inside range
    const coolRate = 0.35;
    const dmgPct = [0, 0.22, 0.26, 0.32][p];
    const durMs = 12000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const pair = [0, 1].map(i => {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-creeper', '💥');
        const s = {
            x: i === 0 ? 70 : window.innerWidth - 70,
            y: 100 + Math.random() * Math.max(100, window.innerHeight - 200),
            fuse: 0, blown: false, el,
        };
        return s;
    });
    _egNkToast('eg_mech_creeper', '💥 The Creeper: Creeper Stalk! Mind both fuses!');
    let e = 0;
    _egNkLoop(run, (dtS) => {
        e += dtS * 1000;
        let pending = e < durMs;
        const c = _egNkPlayerCenter();
        pair.forEach(s => {
            if (s.blown) return;
            pending = true;
            if (c) {
                const dx = c.x - s.x, dy = c.y - s.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                s.x += (dx / d) * speed * dtS;
                s.y += (dy / d) * speed * dtS;
                s.fuse += (d < fuseRange ? heatRate : -coolRate) * dtS;
                s.fuse = Math.max(0, Math.min(1, s.fuse));
            }
            s.el.style.transform = 'translate(' + Math.round(s.x - 22) + 'px,' + Math.round(s.y - 22) + 'px)';
            s.el.classList.toggle('eg-nk-fuse', s.fuse > 0.35);
            if (s.fuse >= 1) {
                s.blown = true;
                s.el.classList.add('eg-nk-boom');
                setTimeout(() => s.el.remove(), 450);
                if (_egNkCircleHit(s.x, s.y, blastR, _egNkPlayerRect(), 0)) {
                    const dealt = _egNkHit(dmgPct, 'fire', level);
                    _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
                }
            }
        });
        return pending;
    });
}
