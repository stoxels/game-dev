//------------------------------------------------------------------------
// Monster spawning owner: spawn-zone assignment, monster-or-boss
// construction, and live-arrival orchestration. The encounter facade
// re-exports this focused owner for compatibility.
//------------------------------------------------------------------------

import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { EG_MONSTER_ZONES } from './encounter-constants.js';
import { _egPickRoomyZone } from './combat-monster-roam.js';
import { _egRenderPanel } from './encounter.js';
import { EG_MAX_CONCURRENT_MONSTERS, _egBuildMonster } from './combat-monsters.js';
import { _egComputePlayerStats, _egFormatStatValue } from '../endgame/endgame-player-stats.js';
//------------------------------------------------------------------------
//-------------------MONSTER SPAWNING-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Built-in spawn grace period (seconds) every new monster gets before it may
// start charging an attack, so newcomers can read the puzzle first. It is a
// teaching aid that fades out with progress: campaign worlds 1..13 step from
// 12s down to 3s, atlas maps tier 1..5 from 2.5s down to 0.5s, tier 6+ (the
// real endgame) has none. Gear with the Grace Period (first_step) stat adds
// on top, so endgame players can still buy it back. Bosses, the gauntlet
// arena and the tutorial keep their own pacing.
const EG_GRACE_BY_WORLD = [12, 11, 10, 9, 8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3];
const EG_GRACE_BY_MAP_TIER = [2.5, 2, 1.5, 1, 0.5];
function _egBaselineGraceSeconds() {
    try {
        if (globalThis._egGauntletFlag) return 0;
        if (typeof globalThis._tqIsTutorialActive === 'function' && globalThis._tqIsTutorialActive()) return 0;
        const lvl = globalThis.cur;
        if (lvl && lvl.campaignMonsters) {
            const w = Math.max(1, Math.min(EG_GRACE_BY_WORLD.length, Math.round(Number(lvl.world) || 1)));
            return EG_GRACE_BY_WORLD[w - 1];
        }
        const tier = Math.round(Number((globalThis._egActiveMapItem && globalThis._egActiveMapItem.mapTier)
            || (globalThis._egMapDef && globalThis._egMapDef.mapTier)) || 0);
        if (tier >= 1 && tier <= EG_GRACE_BY_MAP_TIER.length) return EG_GRACE_BY_MAP_TIER[tier - 1];
    } catch (e) { /* the grace period is a courtesy, never a blocker */ }
    return 0;
}

// Assigns a spawn zone, spreading monsters so cards never pile up and hide
// each other. Picks among the least-populated zones (random tie-break) so
// concurrent monsters fan out across the available panels instead of
// stacking in one. Tutorial runs always use the bottom dock, clear of the
// Professor's portrait (top-right), so the tutorial monster can never spawn
// on top of him.
export function _egAssignRandomSpawnZone(monster) {
    // The tutorial's parry arena (gauntlet.js) owns its own zones, so the
    // bottom-dock rule must not pull its monsters out of the modal.
    if (typeof _tqIsTutorialActive === 'function' && !globalThis._egParryTutorialForce) {
        try {
            if (globalThis._tqIsTutorialActive()) {
                monster.zoneId = 'eg-monster-panel';
                return;
            }
        } catch (e) {}
    }
    // Free-space layout (combat-monster-roam.js): pick the zone with the most
    // room around the puzzle table. Arena zones and old code paths fall through.
    try {
        const roomy = _egPickRoomyZone(null, null);
        if (roomy) { monster.zoneId = roomy; return; }
    } catch (e) {}
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
    Audio_Manager.playSFX(monster.isBoss ? 'boss_arrive' : monster.isElite ? 'elite_spawn' : 'monster_spawn');
    if (monster.isBoss) {
        globalThis._egBossInit(monster);
    }
}

// Adds a monster to the live encounter.
// Assigns a random spawn zone, auto-targets if no target exists, and notifies the player.
// hpMult: optional multiplier for boss max HP only (e.g., 500k HP test mode);
// damage is left at its normal scaled value.
export function _egSpawnMonster(defId, level, hpMult = 1) {
    // The gauntlet arena is roomier than the campaign panels and fields
    // bigger waves, so it lifts the concurrent-monster cap.
    const cap = globalThis._egGauntletFlag
        ? Math.max(EG_MAX_CONCURRENT_MONSTERS, Number(globalThis._egGauntletMaxConcurrent) || 0)
        : EG_MAX_CONCURRENT_MONSTERS;
    // Bosses are never refused by the concurrent-monster cap: a full pack of
    // leftover campaign monsters used to swallow the trial boss silently
    // (playtest: the world 3 convergence trial showed 0/1 Bosses forever).
    const isBossDef = !!(typeof EG_BOSS_DEFS !== 'undefined' && globalThis.EG_BOSS_DEFS && globalThis.EG_BOSS_DEFS[defId]);
    if (!isBossDef && globalThis._egMonsters.length >= cap) return;

    const monster = _egBuildMonsterOrBoss(defId, level, hpMult);
    if (!monster) return;

    // Gear: first_step - per-monster charge-up grace window after spawning
    const firstStepSec = Math.max(0, (_egComputePlayerStats().firstStepSeconds || 0)
        + (isBossDef ? 0 : _egBaselineGraceSeconds()));
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
