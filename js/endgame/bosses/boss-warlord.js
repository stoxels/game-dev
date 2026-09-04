//------------------------------------------------------------------------
//-------------------BOSS: THE WARLORD (boss_warlord)---------------------------
//------------------------------------------------------------------------
// Pinnacle commander: calls its guard to raise a shield you must break by
// killing them — while triple shockwave rings roll the arena on a tight
// fuse. Two wars at once: the guards, and the ground.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_warlord: {
        id: 'boss_warlord', name: 'The Warlord', emoji: '🗡️',
        baseHP: 1200, baseDamage: 26, chargeMax: 11,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_warlord: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.60 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.20 },
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'guard_call', intervalBase: 20000, intervalVariance: 4000, handler: '_egMechGuardCall' },
            { name: 'triple_rings', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechTripleRings' },
            { name: 'soul_tithe', intervalBase: 24000, intervalVariance: 5000, handler: '_egMechSoulTithe' },
        ],
    },
});


function _egMechGuardCall(monster, phase) {
    if (!monster || monster.warlordGuard || _egNkFrozen()) return;
    if (typeof _egSpawnMonster !== 'function') return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = [0, 2, 3, 3][p];
    const level = Math.max(1, Math.round(monster.level || 1));
    const pool = ['slime', 'ghost', 'rat', 'bat', 'bee'];
    const cap = (typeof EG_MAX_CONCURRENT_MONSTERS !== 'undefined') ? EG_MAX_CONCURRENT_MONSTERS : 6;
    const before = (typeof _egMonsters !== 'undefined') ? _egMonsters.length : 0;
    for (let i = 0; i < count; i++) {
        if (typeof _egMonsters !== 'undefined' && _egMonsters.length >= cap) break;
        _egSpawnMonster(pool[Math.floor(Math.random() * pool.length)], level);
    }
    const fresh = (typeof _egMonsters !== 'undefined')
        ? _egMonsters.slice(before).filter(m => !m.isBoss) : [];
    if (fresh.length === 0) return;

    monster.warlordGuard = true;
    monster.bossImmune = true;
    fresh.forEach(a => { a.warlordOf = monster.id; });
    const card = document.getElementById('eg-card-' + monster.id);
    if (card) card.classList.add('eg-nk-shielded');
    _egNkToast('eg_mech_warlord', '🗡️ The Warlord: Guard Call! Break the guard to break the boss!');
    if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }

    const run = _egNkNewRun(monster.id, false);
    let e = 0;
    _egNkLoop(run, (dtS) => {
        e += dtS * 1000;
        const boss = (typeof _egMonsters !== 'undefined')
            ? _egMonsters.find(m => m.id === monster.id) : null;
        if (!boss) return false;
        const alive = (typeof _egMonsters !== 'undefined')
            && _egMonsters.some(m => m.warlordOf === monster.id && m.currentHP > 0);
        if (!alive || e > 30000) {
            boss.warlordGuard = false;
            boss.bossImmune = false;
            const c2 = document.getElementById('eg-card-' + monster.id);
            if (c2) c2.classList.remove('eg-nk-shielded');
            _egNkToast('eg_tithe_broken', '🗡️ Guard broken — burn the Warlord!', '#4ade80');
            if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e2) {} }
            return false;
        }
        return true;
    });
}

function _egMechTripleRings(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const expandMs = [0, 2000, 1800, 1600][p];
    const bandHalf = 24;
    const dmgPct = [0, 0.20, 0.24, 0.30][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5 + (Math.random() * 160 - 80);
    const cy = window.innerHeight * 0.42;
    const rMax = Math.max(window.innerWidth, window.innerHeight) * 0.7;
    const rings = [0, 1, 2].map(i => {
        const el = _egNkEl(run, 'div', 'eg-nk-ring');
        el.style.display = 'none';
        return { delay: i * 550, r: 40, el };
    });
    _egNkToast('eg_mech_rings', '🗡️ The Warlord: Triple Rings! Three gaps, three heartbeats!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        const dist = c ? Math.hypot(c.x - cx, c.y - cy) : 9999;
        let pending = false;
        rings.forEach(rg => {
            if (e < rg.delay) { pending = true; return; }
            const t = (e - rg.delay) / expandMs;
            if (t >= 1) {
                rg.el.style.display = 'none';
                return;
            }
            pending = true;
            rg.r = 40 + (rMax - 40) * t;
            const r = Math.round(rg.r);
            rg.el.style.display = '';
            rg.el.style.left = Math.round(cx - r) + 'px';
            rg.el.style.top = Math.round(cy - r) + 'px';
            rg.el.style.width = r * 2 + 'px';
            rg.el.style.height = r * 2 + 'px';
            if (c && now >= cdUntil && Math.abs(dist - rg.r) < bandHalf) {
                cdUntil = now + 1000;
                const dealt = _egNkHit(dmgPct, null, level);
                _egNkAbilityHitToast(dealt, 'The Warlord', 'Triple Rings');
            }
        });
        return pending;
    });
}
