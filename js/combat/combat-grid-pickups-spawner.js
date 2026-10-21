import { Audio_Manager } from '../audio/audio.js';
import { _charmStopDrops } from '../skills/skill-charms.js';
import { _getMapRequirements } from './encounter-chain.js';
import { _stopGoldDrops } from '../loot/loot-gold-drops.js';
import { _egGetActiveMapModValue } from '../endgame/endgame-map-launch.js';
import { _egStopMapDrops } from '../loot/loot-map-drops.js';
import {
    PICKUP_CRITICAL_HP_RATIO,
    PICKUP_DEFS,
    PICKUP_MAX_ON_BOARD,
    PICKUP_SPAWN_INTERVAL_MAX,
    PICKUP_SPAWN_INTERVAL_MIN,
    _animatePickupClaim,
    _animatePickupDiscard,
    _buildPickupEligiblePool,
    _cancelTrackedExpiry,
    _cellHasAnyDrop,
    _pickRandomPickup,
    _removePickupOverlay,
    _renderPickupOverlay,
    _schedulePickupExpiry,
} from './combat-grid-pickups.js';
import { _isActive, _pickupSpawnerInfo, _pickups } from './combat-state.js';
import { _stopLootDrops } from './combat-grid-pickups-loot.js';
import { _stopCurrencyDrops } from './combat-grid-pickups-currency.js';
import { _stopItemDrops } from './combat-grid-pickups-items.js';

try { Object.defineProperty(globalThis, '_checkPickupClaim', { get() { return _checkPickupClaim; }, set(v) { _checkPickupClaim = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_spawnPickup', { get() { return _spawnPickup; }, set(v) { _spawnPickup = v; }, configurable: true }); } catch (e) {}

// Pause / resume for all grid drops (pickups, loot, currency, items, gold, maps).
// Called from _onPause / _onResume in endgame-encounter.js.
export function _pauseGridDrops() {
    const now = Date.now();
    // Pause pickup spawner
    if (globalThis._pickupSpawnTimer && _pickupSpawnerInfo.expiresAt) {
        const remaining = Math.max(0, _pickupSpawnerInfo.expiresAt - now);
        clearTimeout(globalThis._pickupSpawnTimer);
        const ti = globalThis._pickupTimers.indexOf(globalThis._pickupSpawnTimer);
        if (ti !== -1) globalThis._pickupTimers.splice(ti, 1);
        _pickupSpawnerInfo.remaining = remaining;
        globalThis._pickupSpawnTimer = null;
        _pickupSpawnerInfo.timer = null;
    }
    // Pause each drop expiry timer
    globalThis._dropExpiryEntries.forEach(entry => {
        if (entry.timer) {
            clearTimeout(entry.timer);
            const ti = globalThis._pickupTimers.indexOf(entry.timer);
            if (ti !== -1) globalThis._pickupTimers.splice(ti, 1);
            entry.remaining = Math.max(0, entry.expiresAt - now);
            entry.timer = null;
        }
    });
    // Pause countdown badges
    globalThis._expireCountdownEntries.forEach(cd => {
        if (cd.timeout) { clearTimeout(cd.timeout); cd.timeout = null; }
        if (cd.interval) { clearInterval(cd.interval); cd.interval = null; }
        // remaining until the warning badge should appear, and remaining until expiry
        cd.delayRemaining = Math.max(0, cd.delayExpiresAt - now);
        cd.expiryRemaining = Math.max(0, cd.expiresAt - now);
    });
}

// After a pause, restarts the pickup spawner and re-arms the expiry timers
// with the time they had left.
export function _resumeGridDrops() {
    const now = Date.now();
    // Resume pickup spawner
    if (_pickupSpawnerInfo.remaining != null) {
        const remaining = _pickupSpawnerInfo.remaining;
        _pickupSpawnerInfo.remaining = null;
        _pickupSpawnerInfo.expiresAt = now + remaining;
        const timer = setTimeout(() => {
            _pickupSpawnerInfo.timer = null;
            _pickupSpawnerInfo.expiresAt = 0;
            if (_isActive()) {
                _spawnPickup();
                _scheduleNextPickupSpawn();
            }
        }, remaining);
        globalThis._pickupSpawnTimer = timer;
        _pickupSpawnerInfo.timer = timer;
        globalThis._pickupTimers.push(timer);
    }
    // Resume each drop expiry timer
    globalThis._dropExpiryEntries.forEach(entry => {
        if (entry.remaining != null && entry.timer == null) {
            const remaining = entry.remaining;
            entry.remaining = null;
            entry.expiresAt = now + remaining;
            const timer = setTimeout(() => {
                const idx = globalThis._dropExpiryEntries.findIndex(e => e === entry);
                if (idx !== -1) globalThis._dropExpiryEntries.splice(idx, 1);
                if (entry.map.get(entry.key) === entry.value) {
                    entry.map.delete(entry.key);
                    entry.removeOverlayFn(entry.key);
                }
            }, remaining);
            entry.timer = timer;
            globalThis._pickupTimers.push(timer);
        }
    });
    // Resume countdown badges
    globalThis._expireCountdownEntries.forEach(cd => {
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
export function _scheduleNextPickupSpawn() {
    if (typeof globalThis.isMonsterless === 'function' && globalThis.isMonsterless()) return;
    const delay = PICKUP_SPAWN_INTERVAL_MIN
        + Math.random() * (PICKUP_SPAWN_INTERVAL_MAX - PICKUP_SPAWN_INTERVAL_MIN);

    globalThis._pickupSpawnTimer = setTimeout(() => {
        _pickupSpawnerInfo.timer = null;
        _pickupSpawnerInfo.expiresAt = 0;
        if (_isActive()) {
            _spawnPickup();
            _scheduleNextPickupSpawn();
        }
    }, delay);
    _pickupSpawnerInfo.timer = globalThis._pickupSpawnTimer;
    _pickupSpawnerInfo.expiresAt = Date.now() + delay;
    // keep legacy timer array in sync for bulk cleanup on stop
    if (globalThis._pickupTimers.indexOf(globalThis._pickupSpawnTimer) === -1) globalThis._pickupTimers.push(globalThis._pickupSpawnTimer);
}

// Attempts to place one pickup on a random eligible grid tile.
// Does nothing if the board is already at max pickups or no eligible cells exist.
function _spawnPickup() {
    // MONSTERLESS: no health/mana/cooldown/mistake pickups on the grid.
    if (typeof globalThis.isMonsterless === 'function' && globalThis.isMonsterless()) return;
    // Stop spawning hearts once all monsters have been defeated
    const req = _getMapRequirements();
    if (req.totalMonsters > 0 && globalThis._chainKillCount >= req.totalMonsters) return;

    // Active map run: "#% fewer Pickups appear on the Grid".
    if (typeof _egGetActiveMapModValue === 'function') {
        const scarcity = _egGetActiveMapModValue('map_fewer_pickups');
        if (scarcity > 0 && Math.random() * 100 < scarcity) return;
    }

    if (_pickups.size >= PICKUP_MAX_ON_BOARD) return;

    const pool = _buildPickupEligiblePool();
    const filtered = pool.filter(([r, c]) => !_cellHasAnyDrop(r, c));
    if (filtered.length === 0) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    let def;
    const hpRatio = (typeof playerMaxHP === 'number' && globalThis.playerMaxHP > 0)
        ? globalThis.playerCurrentHP / globalThis.playerMaxHP : 1;
    if (hpRatio <= PICKUP_CRITICAL_HP_RATIO) {
        // While critically injured, guarantee that the next pickup attempt is
        // a heart so bad RNG cannot leave the character without a way to heal.
        const heartRoll = Math.random() * 100;
        def = heartRoll < 60 ? PICKUP_DEFS.heart_small
            : (heartRoll < 90 ? PICKUP_DEFS.heart_medium : PICKUP_DEFS.heart_large);
    } else {
        def = _pickRandomPickup();
    }
    const key = `${r}-${c}`;

    _pickups.set(key, def);
    _renderPickupOverlay(r, c, def);
    _schedulePickupExpiry(key, def);
}

// Places a healing heart on a random eligible grid cell - used when a
// sacrificial zombie add is killed by the player. Unlike the ambient
// spawner this is a direct on-kill reward, so it may sit on the board next
// to the ambient pickup (total capped at one extra). Returns true when a
// heart was placed. `opts.ignoreCap` (boss health-threshold hearts) skips the
// on-board cap; the cell rules still apply.
export function _dropHeartPickup(opts) {
    if (typeof globalThis.isMonsterless === 'function' && globalThis.isMonsterless()) return false;
    if (!_isActive()) return false;
    if (typeof _pickups === 'undefined' || typeof PICKUP_DEFS === 'undefined') return false;
    if (!(opts && opts.ignoreCap) && _pickups.size >= PICKUP_MAX_ON_BOARD + 1) return false;
    if (typeof _buildPickupEligiblePool !== 'function') return false;

    const pool = _buildPickupEligiblePool();
    const free = pool.filter(([r, c]) => !_cellHasAnyDrop(r, c));
    if (free.length === 0) return false;

    const [r, c] = free[Math.floor(Math.random() * free.length)];
    // Small hearts are the common drop; medium the rarer, bigger heal.
    const def = Math.random() < 0.65 ? PICKUP_DEFS.heart_small : PICKUP_DEFS.heart_medium;
    const key = `${r}-${c}`;

    _pickups.set(key, def);
    if (typeof _renderPickupOverlay === 'function') _renderPickupOverlay(r, c, def);
    if (typeof _schedulePickupExpiry === 'function') _schedulePickupExpiry(key, def);
    return true;
}


// Starts the recurring pickup spawn loop.
export function _startPickupSpawner() {
    if (typeof globalThis.isMonsterless === 'function' && globalThis.isMonsterless()) return;
    _scheduleNextPickupSpawn();
}

// Cancels all pickup timers and clears every pickup from the board.
// Called on encounter stop or level exit.
export function _stopPickupSpawner() {
    if (globalThis._pickupSpawnTimer) {
        clearTimeout(globalThis._pickupSpawnTimer);
        globalThis._pickupSpawnTimer = null;
    }
    _pickupSpawnerInfo.timer = null;
    _pickupSpawnerInfo.expiresAt = 0;
    _pickupSpawnerInfo.remaining = null;
    globalThis._pickupTimers.forEach(t => clearTimeout(t));
    globalThis._pickupTimers = [];
    // also clear pause-aware tracking and countdowns
    globalThis._dropExpiryEntries.forEach(e => { if (e.timer) clearTimeout(e.timer); });
    globalThis._dropExpiryEntries = [];
    globalThis._expireCountdownEntries.forEach(cd => { if (cd.timeout) clearTimeout(cd.timeout); if (cd.interval) clearInterval(cd.interval); });
    globalThis._expireCountdownEntries = [];

    _pickups.forEach((def, key) => _removePickupOverlay(key));
    _pickups.clear();

    if (typeof _stopLootDrops === 'function') _stopLootDrops();
    if (typeof _stopCurrencyDrops === 'function') _stopCurrencyDrops();
    if (typeof _stopItemDrops === 'function') _stopItemDrops();
    if (typeof _stopGoldDrops === 'function') _stopGoldDrops();
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
export function _checkPickupClaim(row, col) {
    if (!_isActive()) return false;
    const key = `${row}-${col}`;
    const def = _pickups.get(key);
    if (!def) return false;

    _cancelTrackedExpiry(_pickups, key, def);
    _pickups.delete(key);
    _removePickupOverlay(key);
    _animatePickupClaim(row, col, def);
    def.onPickup(row, col);

    Audio_Manager.playSFX('player_equip_pickup');

    return true;
}





// Called when the player makes the WRONG action on a cell that has a pickup.
// (correct cell + right-click, or wrong cell + left-click)
// Silently discards the pickup - no reward, no animation.
export function _discardPickup(row, col) {
    if (!_isActive()) return;
    const key = `${row}-${col}`;
    if (!_pickups.has(key)) return;
    const def = _pickups.get(key);   // capture def before deleting
    _cancelTrackedExpiry(_pickups, key, def);
    _pickups.delete(key);
    _removePickupOverlay(key);
    _animatePickupDiscard(row, col, def);

    Audio_Manager.playSFX('heart_destroyed');
}
