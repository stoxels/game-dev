//------------------------------------------------------------------------
//-------------------BOSS: THE AEGIS (boss_aegis)---------------------------
//------------------------------------------------------------------------
// Immunity shield + guards: kill the guards to break it (40s failsafe).
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
    boss_aegis: {
        id: 'boss_aegis', name: 'The Aegis', emoji: '🛡️',
        baseHP: 1150, baseDamage: 20, chargeMax: 14,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_aegis: {
        phases: [
            { threshold: 1.00, chargeMax: 14, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.45 },
            { threshold: 0.30, chargeMax: 7, damageMultiplier: 1.90 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'aegis_protocol', intervalBase: 24000, intervalVariance: 5000, handler: '_egMechAegisProtocol' },
            { name: 'prior_bomb', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechAegisProtocol(monster, phase) {
    if (!monster || monster.aegisUp || _egNkFrozen()) return;
    if (typeof _egSpawnMonster !== 'function') return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = p >= 3 ? 3 : 2;
    const level = Math.max(1, Math.round(monster.level || 1));
    const pool = ['slime', 'ghost', 'rat', 'bat', 'bee'];
    const cap = (typeof EG_MAX_CONCURRENT_MONSTERS !== 'undefined') ? EG_MAX_CONCURRENT_MONSTERS : 6;
    const before = (typeof _egMonsters !== 'undefined') ? _egMonsters.length : 0;
    let made = 0;
    for (let i = 0; i < count; i++) {
        if (typeof _egMonsters !== 'undefined' && _egMonsters.length >= cap) break;
        _egSpawnMonster(pool[Math.floor(Math.random() * pool.length)], level);
        made++;
    }
    const fresh = (typeof _egMonsters !== 'undefined')
        ? _egMonsters.slice(before).filter(m => !m.isBoss) : [];
    fresh.forEach(a => { a.aegisOf = monster.id; });
    if (fresh.length === 0) return;

    monster.aegisUp = true;
    monster.bossImmune = true;
    const card = document.getElementById('eg-card-' + monster.id);
    if (card) card.classList.add('eg-nk-shielded');
    _egNkToast('eg_mech_aegis', '🛡️ The Aegis: Aegis Protocol! Kill the guards to break the shield!', '#7dd3fc');
    if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }

    const run = _egNkNewRun(monster.id, false);
    let e = 0;
    _egNkLoop(run, (dtS) => {
        e += dtS * 1000;
        const boss = (typeof _egMonsters !== 'undefined')
            ? _egMonsters.find(m => m.id === monster.id) : null;
        if (!boss) return false;
        const alive = (typeof _egMonsters !== 'undefined')
            && _egMonsters.some(m => m.aegisOf === monster.id && m.currentHP > 0);
        if (!alive || e > 40000) {
            boss.aegisUp = false;
            boss.bossImmune = false;
            const c2 = document.getElementById('eg-card-' + monster.id);
            if (c2) c2.classList.remove('eg-nk-shielded');
            _egNkToast('eg_mech_aegis_down', '🛡️ Aegis shield down — burn the boss!', '#4ade80');
            if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e2) {} }
            return false;
        }
        return true;
    });
}
