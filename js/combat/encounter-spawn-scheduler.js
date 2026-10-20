//------------------------------------------------------------------------
// Encounter spawn-scheduler owner: respawn suppression, replacement spawns,
// and staggered opening-wave delivery.
//------------------------------------------------------------------------

import { INITIAL_SPAWN_STAGGER_BASE_MS, RESPAWN_DELAY_MIN_MS, RESPAWN_DELAY_RANGE_MS, _getRespawnDelayMs } from './encounter-constants.js';
import { _spawnMonster } from './encounter-monster-spawning.js';
import { _getEncounterBaseLevel, _rollMonsterLevel } from './encounter-spawn-rules.js';
import { MAX_CONCURRENT_MONSTERS } from './combat-monsters.js';
import { MONSTER_DEFS } from './combat-monsters-data.js';
import { _isActive, _isCampaignRun } from './combat-state.js';

export let INITIAL_SPAWN_STAGGER_STEP_MS = 200;

//------------------------------------------------------------------------
//-------------------RESPAWN SCHEDULER------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if a respawn should be suppressed right now.
// Checks boss phase, boss presence, and the concurrent cap. NOTE: the kill
// objective deliberately does NOT stop respawns - monsters keep flowing
// until the player enters the boss arena (extra kills are extra XP/loot;
// the leveling curve absorbs the higher per-map kill counts). Inside the
// boss arena no natural spawns happen at all - adds only appear when a
// boss ability purposefully summons them (_mechSummonAdds).
export function _shouldSuppressRespawn() {
    if (!_isActive()) return true;

    // MONSTERLESS: nothing may ever repopulate the field.
    if (typeof globalThis.isMonsterless === 'function' && globalThis.isMonsterless()) return true;

    // Campaign levels spawn one fixed pack and never respawn - the pack is
    // budgeted against the puzzle's damage economy (see
    // _prepareCampaignEncounter) so kill XP and loot stay bounded.
    if (typeof _isCampaignRun === 'function' && _isCampaignRun()) return true;

    // Boss arena chain: no regular monsters interfere with the duel -
    // except when a boss ability summons them (direct _spawnMonster calls
    // from mechanic handlers bypass this gate by design).
    if (typeof _bossPhaseActive !== 'undefined' && globalThis._bossPhaseActive) return true;

    // Suppress if a boss is already on the field
    if (globalThis._monsters.some(m => m.isBoss)) return true;

    // Suppress if already at the concurrent cap
    if (globalThis._monsters.length >= MAX_CONCURRENT_MONSTERS) return true;

    return false;
}

// Picks a random non-boss def and spawns it at the current encounter's base level.
export function _respawnRandomMonster() {
    const baseLevel = _getEncounterBaseLevel();
    const allNonBoss = Object.values(MONSTER_DEFS);
    if (allNonBoss.length === 0) return;

    const def = allNonBoss[Math.floor(Math.random() * allNonBoss.length)];
    _spawnMonster(def.id, _rollMonsterLevel(baseLevel));
}

// Schedules a single replacement monster to spawn after a short random delay.
// Called whenever a normal monster dies and the kill gate is not yet reached.
export function _scheduleRespawn() {
    const resp = (typeof _getRespawnDelayMs === 'function') ? _getRespawnDelayMs(_getEncounterBaseLevel()) : { min: RESPAWN_DELAY_MIN_MS, range: RESPAWN_DELAY_RANGE_MS };
    const delay = resp.min + Math.random() * resp.range;
    const t = setTimeout(() => {
        if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) {
            // Paused - retry after pause without consuming the spawn slot
            _scheduleRespawn();
            return;
        }
        if (_shouldSuppressRespawn()) return;
        _respawnRandomMonster();
    }, delay);
    globalThis._spawnTimers.push(t); // tracked so it gets cancelled on encounter stop
}


//------------------------------------------------------------------------
//-------------------SPAWN STAGGER SCHEDULER------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Calculates a staggered delay for a single spawn entry in the initial wave.
// The first 2-3 monsters appear almost immediately at high tiers; the rest are spaced 2-6s apart.
export function _calcSpawnDelay(index, immediateCount, cumulativeDelay) {
    if (index < immediateCount) {
        // Tiny stagger so the first batch doesn't all land simultaneously
        return { delay: INITIAL_SPAWN_STAGGER_BASE_MS + index * INITIAL_SPAWN_STAGGER_STEP_MS, cumulative: cumulativeDelay };
    }
    const resp = (typeof _getRespawnDelayMs === 'function') ? _getRespawnDelayMs(_getEncounterBaseLevel()) : { min: RESPAWN_DELAY_MIN_MS, range: RESPAWN_DELAY_RANGE_MS };
    const extra = resp.min + Math.random() * resp.range;
    const newCumulative = cumulativeDelay + extra;
    return { delay: newCumulative, cumulative: newCumulative };
}

// Queues all monsters in spawnList with staggered appearance delays.
// The first 2-3 entries appear almost immediately at high tiers; the rest ramp up gradually.
export function _scheduleMonsterSpawns(spawnList) {
    if (spawnList.length === 0) return;

    const lvl = _getEncounterBaseLevel();
    const immediateBase = lvl >= 60 ? 2 : lvl >= 30 ? 2 : 1;
    const immediateCount = Math.min(spawnList.length, immediateBase + Math.floor(Math.random() * 2)); // 2-3 at high, 1-2 at low
    let cumulativeDelay = 0;

    spawnList.forEach((entry, i) => {
        const result = _calcSpawnDelay(i, immediateCount, cumulativeDelay);
        cumulativeDelay = result.cumulative;

        const t = setTimeout(() => {
            if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) {
                // Paused - delay the spawn until the game resumes
                const retry = setInterval(() => {
                    if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;
                    clearInterval(retry);
                    if (_isActive()) _spawnMonster(entry.id, entry.level || 1);
                }, 200);
                return;
            }
            if (_isActive()) _spawnMonster(entry.id, entry.level || 1);
        }, result.delay);
        globalThis._spawnTimers.push(t);
    });
}
