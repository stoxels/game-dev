//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Monster spawning: spawn-zone assignment, monster-or-boss construction
// from defs and the arrival notification.

import { t } from '../translation/translations.js';
import { EG_MONSTER_ZONES } from './encounter-constants.js';
import { _egRenderPanel } from './endgame-encounter.js';
import { EG_MAX_CONCURRENT_MONSTERS, _egBuildMonster } from './endgame-monsters.js';
import { _egComputePlayerStats, _egFormatStatValue } from './endgame-player-stats.js';



//------------------------------------------------------------------------
//-------------------MONSTER SPAWNING-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Assigns a spawn zone, spreading monsters so cards never pile up and hide
// each other. Picks among the least-populated zones (random tie-break) so
// concurrent monsters fan out across the available panels instead of
// stacking in one. Tutorial runs always use the bottom dock, clear of the
// Professor's portrait (top-right), so the tutorial monster can never spawn
// on top of him.
export function _egAssignRandomSpawnZone(monster) {
    if (typeof _tqIsTutorialActive === 'function') {
        try {
            if (globalThis._tqIsTutorialActive()) {
                monster.zoneId = 'eg-monster-panel';
                return;
            }
        } catch (e) {}
    }
    let zones = EG_MONSTER_ZONES;
    try {
        const counts = {};
        zones.forEach(z => { counts[z] = 0; });
        if (typeof _egMonsters !== 'undefined' && globalThis._egMonsters.length) {
            globalThis._egMonsters.forEach(m => {
                const z = m.zoneId || 'eg-monster-panel';
                if (counts[z] == null) counts[z] = 0;
                counts[z]++;
            });
        }
        const min = Math.min.apply(null, zones.map(z => counts[z] || 0));
        const emptiest = zones.filter(z => (counts[z] || 0) <= min);
        if (emptiest.length) zones = emptiest;
    } catch (e) {}
    monster.zoneId = zones[Math.floor(Math.random() * zones.length)];
}

// Tries to build the monster from normal defs first, then boss defs as fallback.
// Marks the monster as a boss if it was built from EG_BOSS_DEFS.
// hpMult: optional multiplier for boss max HP only (e.g., 500k HP test mode);
// damage is left at its normal scaled value.
export function _egBuildMonsterOrBoss(defId, level, hpMult = 1) {
    let monster = _egBuildMonster(defId, level, hpMult);
    if (!monster) {
        monster = globalThis._egBuildBoss(defId, level, hpMult);
        if (monster) monster.isBoss = true;
    } else if (typeof EG_BOSS_DEFS !== 'undefined' && globalThis.EG_BOSS_DEFS[defId]) {
        monster.isBoss = true;
    } else if (monster.baseId && typeof EG_BOSS_DEFS !== 'undefined' && globalThis.EG_BOSS_DEFS[monster.baseId]) {
        monster.isBoss = true;
    }
    return monster;
}

// Initialises boss logic on arrival. Spawn toasts were removed -
// the monster cards themselves signal that something appeared.
export function _egNotifyMonsterArrival(monster) {
    if (monster.isBoss) {
        globalThis._egBossInit(monster);
    }
}

// Adds a monster to the live encounter.
// Assigns a random spawn zone, auto-targets if no target exists, and notifies the player.
// hpMult: optional multiplier for boss max HP only (e.g., 500k HP test mode);
// damage is left at its normal scaled value.
export function _egSpawnMonster(defId, level, hpMult = 1) {
    if (globalThis._egMonsters.length >= EG_MAX_CONCURRENT_MONSTERS) return;

    const monster = _egBuildMonsterOrBoss(defId, level, hpMult);
    if (!monster) return;

    // Gear: first_step - per-monster charge-up grace window after spawning
    const firstStepSec = _egComputePlayerStats().firstStepSeconds || 0;
    if (firstStepSec > 0) {
        monster.firstStepUntil = Date.now() + firstStepSec * 1000;
        // Show toast once per map when first_step is active
        if (!globalThis._egFirstStepToastShown) {
            globalThis._egFirstStepToastShown = true;
            globalThis.showToast(t('eg_first_step').replace('{n}', _egFormatStatValue(firstStepSec)));
        }
    }

    _egAssignRandomSpawnZone(monster);
    // Spawn stamp: melee sidesteps respect a short grace period after this.
    try { monster._spawnedAt = Date.now(); } catch (e) {}
    globalThis._egMonsters.push(monster);

    if (!globalThis._egTargetId) globalThis._egTargetId = monster.id; // auto-target the first monster to arrive

    _egRenderPanel();
    _egNotifyMonsterArrival(monster);
}
