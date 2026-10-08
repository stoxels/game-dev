import { Audio_Manager } from '../audio/audio.js';
import { _charmStopDrops } from '../skills/skill-charms.js';
import { _egGetMapRequirements } from './encounter-chain.js';
import { _egStopGoldDrops } from '../loot/loot-gold-drops.js';
import { _egGetActiveMapModValue } from '../endgame/endgame-map-launch.js';
import { _egStopMapDrops } from '../loot/loot-map-drops.js';
import {
    EG_PICKUP_CRITICAL_HP_RATIO,
    EG_PICKUP_DEFS,
    EG_PICKUP_MAX_ON_BOARD,
    EG_PICKUP_SPAWN_INTERVAL_MAX,
    EG_PICKUP_SPAWN_INTERVAL_MIN,
    _egAnimatePickupClaim,
    _egAnimatePickupDiscard,
    _egBuildPickupEligiblePool,
    _egCancelTrackedExpiry,
    _egCellHasAnyDrop,
    _egPickRandomPickup,
    _egRemovePickupOverlay,
    _egRenderPickupOverlay,
    _egSchedulePickupExpiry,
} from './combat-grid-pickups.js';
import { _egIsActive, _egPickupSpawnerInfo, _egPickups } from './combat-state.js';
import { _egStopLootDrops } from './combat-grid-pickups-loot.js';
import { _egStopCurrencyDrops } from './combat-grid-pickups-currency.js';
import { _egStopItemDrops } from './combat-grid-pickups-items.js';

try { Object.defineProperty(globalThis, '_egCheckPickupClaim', { get() { return _egCheckPickupClaim; }, set(v) { _egCheckPickupClaim = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egSpawnPickup', { get() { return _egSpawnPickup; }, set(v) { _egSpawnPickup = v; }, configurable: true }); } catch (e) {}

// Pause / resume for all grid drops (pickups, loot, currency, items, gold, maps).
// Called from _egOnPause / _egOnResume in endgame-encounter.js.
export function _egPauseGridDrops() {
    const now = Date.now();
    // Pause pickup spawner
    if (globalThis._egPickupSpawnTimer && _egPickupSpawnerInfo.expiresAt) {
        const remaining = Math.max(0, _egPickupSpawnerInfo.expiresAt - now);
        clearTimeout(globalThis._egPickupSpawnTimer);
        const ti = globalThis._egPickupTimers.indexOf(globalThis._egPickupSpawnTimer);
        if (ti !== -1) globalThis._egPickupTimers.splice(ti, 1);
        _egPickupSpawnerInfo.remaining = remaining;
        globalThis._egPickupSpawnTimer = null;
        _egPickupSpawnerInfo.timer = null;
    }
    // Pause each drop expiry timer
    globalThis._egDropExpiryEntries.forEach(entry => {
        if (entry.timer) {
            clearTimeout(entry.timer);
            const ti = globalThis._egPickupTimers.indexOf(entry.timer);
            if (ti !== -1) globalThis._egPickupTimers.splice(ti, 1);
            entry.remaining = Math.max(0, entry.expiresAt - now);
            entry.timer = null;
        }
    });
    // Pause countdown badges
    globalThis._egExpireCountdownEntries.forEach(cd => {
        if (cd.timeout) { clearTimeout(cd.timeout); cd.timeout = null; }
        if (cd.interval) { clearInterval(cd.interval); cd.interval = null; }
        // remaining until the warning badge should appear, and remaining until expiry
        cd.delayRemaining = Math.max(0, cd.delayExpiresAt - now);
        cd.expiryRemaining = Math.max(0, cd.expiresAt - now);
    });
}

export function _egResumeGridDrops() {
    const now = Date.now();
    // Resume pickup spawner
    if (_egPickupSpawnerInfo.remaining != null) {
        const remaining = _egPickupSpawnerInfo.remaining;
        _egPickupSpawnerInfo.remaining = null;
        _egPickupSpawnerInfo.expiresAt = now + remaining;
        const timer = setTimeout(() => {
            _egPickupSpawnerInfo.timer = null;
            _egPickupSpawnerInfo.expiresAt = 0;
            if (_egIsActive()) {
                _egSpawnPickup();
                _egScheduleNextPickupSpawn();
            }
        }, remaining);
        globalThis._egPickupSpawnTimer = timer;
        _egPickupSpawnerInfo.timer = timer;
        globalThis._egPickupTimers.push(timer);
    }
    // Resume each drop expiry timer
    globalThis._egDropExpiryEntries.forEach(entry => {
        if (entry.remaining != null && entry.timer == null) {
            const remaining = entry.remaining;
            entry.remaining = null;
            entry.expiresAt = now + remaining;
            const timer = setTimeout(() => {
                const idx = globalThis._egDropExpiryEntries.findIndex(e => e === entry);
                if (idx !== -1) globalThis._egDropExpiryEntries.splice(idx, 1);
                if (entry.map.get(entry.key) === entry.value) {
                    entry.map.delete(entry.key);
                    entry.removeOverlayFn(entry.key);
                }
            }, remaining);
            entry.timer = timer;
            globalThis._egPickupTimers.push(timer);
        }
    });
    // Resume countdown badges
    globalThis._egExpireCountdownEntries.forEach(cd => {
        // shift startedAt / expiresAt so tick math stays correct
        const elapsedBeforePause = cd.lifetimeMs - cd.expiryRemaining;
        cd.startedAt = now - elapsedBeforePause;
        cd.expiresAt = now + cd.expiryRemaining;
        cd.delayExpiresAt = now + cd.delayRemaining;
        const tick = cd.tick;
        const startInterval = () => {
            tick();
            cd.interval = setInterval(tick, 250);
        };
        if (cd.delayRemaining <= 0) {
            // warning period already started before pause - start ticking immediately
            startInterval();
        } else {
            cd.timeout = setTimeout(() => {
                cd.timeout = null;
                startInterval();
            }, cd.delayRemaining);
        }
    });
}

// Schedules the next pickup spawn attempt with a random delay in the configured range.
// Recursively reschedules itself so pickups continue to appear throughout the encounter.
// MONSTERLESS runs never start the loop: no hearts, mana, cooldown or eraser drops.
export function _egScheduleNextPickupSpawn() {
    if (typeof globalThis.isMonsterless === 'function' && globalThis.isMonsterless()) return;
    const delay = EG_PICKUP_SPAWN_INTERVAL_MIN
        + Math.random() * (EG_PICKUP_SPAWN_INTERVAL_MAX - EG_PICKUP_SPAWN_INTERVAL_MIN);

    globalThis._egPickupSpawnTimer = setTimeout(() => {
        _egPickupSpawnerInfo.timer = null;
        _egPickupSpawnerInfo.expiresAt = 0;
        if (_egIsActive()) {
            _egSpawnPickup();
            _egScheduleNextPickupSpawn();
        }
    }, delay);
    _egPickupSpawnerInfo.timer = globalThis._egPickupSpawnTimer;
    _egPickupSpawnerInfo.expiresAt = Date.now() + delay;
    // keep legacy timer array in sync for bulk cleanup on stop
    if (globalThis._egPickupTimers.indexOf(globalThis._egPickupSpawnTimer) === -1) globalThis._egPickupTimers.push(globalThis._egPickupSpawnTimer);
}

// Attempts to place one pickup on a random eligible grid tile.
// Does nothing if the board is already at max pickups or no eligible cells exist.
function _egSpawnPickup() {
    // MONSTERLESS: no health/mana/cooldown/mistake pickups on the grid.
    if (typeof globalThis.isMonsterless === 'function' && globalThis.isMonsterless()) return;
    // Stop spawning hearts once all monsters have been defeated
    const req = _egGetMapRequirements();
    if (req.totalMonsters > 0 && globalThis._egChainKillCount >= req.totalMonsters) return;

    // Active map run: "#% fewer Pickups appear on the Grid".
    if (typeof _egGetActiveMapModValue === 'function') {
        const scarcity = _egGetActiveMapModValue('map_fewer_pickups');
        if (scarcity > 0 && Math.random() * 100 < scarcity) return;
    }

    if (_egPickups.size >= EG_PICKUP_MAX_ON_BOARD) return;

    const pool = _egBuildPickupEligiblePool();
    const filtered = pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c));
    if (filtered.length === 0) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    let def;
    const hpRatio = (typeof playerMaxHP === 'number' && globalThis.playerMaxHP > 0)
        ? globalThis.playerCurrentHP / globalThis.playerMaxHP : 1;
    if (hpRatio <= EG_PICKUP_CRITICAL_HP_RATIO) {
        // While critically injured, guarantee that the next pickup attempt is
        // a heart so bad RNG cannot leave the character without a way to heal.
        const heartRoll = Math.random() * 100;
        def = heartRoll < 60 ? EG_PICKUP_DEFS.heart_small
            : (heartRoll < 90 ? EG_PICKUP_DEFS.heart_medium : EG_PICKUP_DEFS.heart_large);
    } else {
        def = _egPickRandomPickup();
    }
    const key = `${r}-${c}`;

    _egPickups.set(key, def);
    _egRenderPickupOverlay(r, c, def);
    _egSchedulePickupExpiry(key, def);
}

// Places a healing heart on a random eligible grid cell - used when a
// sacrificial zombie add is killed by the player. Unlike the ambient
// spawner this is a direct on-kill reward, so it may sit on the board next
// to the ambient pickup (total capped at one extra). Returns true when a
// heart was placed.
export function _egDropHeartPickup() {
    if (typeof globalThis.isMonsterless === 'function' && globalThis.isMonsterless()) return false;
    if (!_egIsActive()) return false;
    if (typeof _egPickups === 'undefined' || typeof EG_PICKUP_DEFS === 'undefined') return false;
    if (_egPickups.size >= EG_PICKUP_MAX_ON_BOARD + 1) return false;
    if (typeof _egBuildPickupEligiblePool !== 'function') return false;

    const pool = _egBuildPickupEligiblePool();
    const free = pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c));
    if (free.length === 0) return false;

    const [r, c] = free[Math.floor(Math.random() * free.length)];
    // Small hearts are the common drop; medium the rarer, bigger heal.
    const def = Math.random() < 0.65 ? EG_PICKUP_DEFS.heart_small : EG_PICKUP_DEFS.heart_medium;
    const key = `${r}-${c}`;

    _egPickups.set(key, def);
    if (typeof _egRenderPickupOverlay === 'function') _egRenderPickupOverlay(r, c, def);
    if (typeof _egSchedulePickupExpiry === 'function') _egSchedulePickupExpiry(key, def);
    return true;
}


// Starts the recurring pickup spawn loop.
export function _egStartPickupSpawner() {
    if (typeof globalThis.isMonsterless === 'function' && globalThis.isMonsterless()) return;
    _egScheduleNextPickupSpawn();
}

// Cancels all pickup timers and clears every pickup from the board.
// Called on encounter stop or level exit.
export function _egStopPickupSpawner() {
    if (globalThis._egPickupSpawnTimer) {
        clearTimeout(globalThis._egPickupSpawnTimer);
        globalThis._egPickupSpawnTimer = null;
    }
    _egPickupSpawnerInfo.timer = null;
    _egPickupSpawnerInfo.expiresAt = 0;
    _egPickupSpawnerInfo.remaining = null;
    globalThis._egPickupTimers.forEach(t => clearTimeout(t));
    globalThis._egPickupTimers = [];
    // also clear pause-aware tracking and countdowns
    globalThis._egDropExpiryEntries.forEach(e => { if (e.timer) clearTimeout(e.timer); });
    globalThis._egDropExpiryEntries = [];
    globalThis._egExpireCountdownEntries.forEach(cd => { if (cd.timeout) clearTimeout(cd.timeout); if (cd.interval) clearInterval(cd.interval); });
    globalThis._egExpireCountdownEntries = [];

    _egPickups.forEach((def, key) => _egRemovePickupOverlay(key));
    _egPickups.clear();

    if (typeof _egStopLootDrops === 'function') _egStopLootDrops();
    if (typeof _egStopCurrencyDrops === 'function') _egStopCurrencyDrops();
    if (typeof _egStopItemDrops === 'function') _egStopItemDrops();
    if (typeof _egStopGoldDrops === 'function') _egStopGoldDrops();
    if (typeof _egStopMapDrops === 'function') _egStopMapDrops();
    if (typeof _charmStopDrops === 'function') _charmStopDrops();
}






//------------------------------------------------------------------------
//-------------------PICKUP INTERACTION-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Called when the player makes the CORRECT action on a cell.
// (correct cell + left-click fill, or wrong cell + right-click mark)
// If a pickup sits on that cell, claims it and triggers its onPickup effect.
// Returns true if a pickup was present and claimed.
export function _egCheckPickupClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const def = _egPickups.get(key);
    if (!def) return false;

    _egCancelTrackedExpiry(_egPickups, key, def);
    _egPickups.delete(key);
    _egRemovePickupOverlay(key);
    _egAnimatePickupClaim(row, col, def);
    def.onPickup(row, col);

    Audio_Manager.playSFX('player_equip_pickup');

    return true;
}





// Called when the player makes the WRONG action on a cell that has a pickup.
// (correct cell + right-click, or wrong cell + left-click)
// Silently discards the pickup - no reward, no animation.
export function _egDiscardPickup(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egPickups.has(key)) return;
    const def = _egPickups.get(key);   // capture def before deleting
    _egCancelTrackedExpiry(_egPickups, key, def);
    _egPickups.delete(key);
    _egRemovePickupOverlay(key);
    _egAnimatePickupDiscard(row, col, def);

    Audio_Manager.playSFX('heart_destroyed');
}
