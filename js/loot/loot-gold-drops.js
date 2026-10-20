import { _getElementCentre } from '../combat/combat-class-projectiles.js';
import { LOOT_DROP_LIFETIME_MS, _buildPickupEligiblePool, _cancelTrackedExpiry, _cellHasAnyDrop, _scheduleTrackedExpiry, _startDropExpireCountdown } from '../combat/combat-grid-pickups.js';
import { _egMapLootQuantityMult } from '../endgame/endgame-map-launch.js';
import { _isActive } from '../combat/combat-state.js';
import { GAME_ART } from '../combat/combat-art.js';
import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _addGold } from './loot-gold.js';

//------------------------------------------------------------------------
//-------------------GOLD COIN DROPS---------------------------------------
//------------------------------------------------------------------------
// Gold coins are their own loot bucket: a kill rolls "gold" next to
// equipment / currency / charms (see _rollKillDropBucket), bosses always
// drop one, and the amount grows with the monster's level so the campaign
// pays out more the deeper you go. Claiming works like every other grid
// drop: fill the cell and the coin is banked straight into the balance.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------

// Bucket weight in the one-drop-per-kill roll (equipment 0.35, currency 0.25,
// charms 0.03, ...): a deliberately rare ~8% of drops.
export const GOLD_DROP_CHANCE_NORMAL = 0.07;
export const GOLD_DROP_CHANCE_BOSS = 1.00;    // bosses always drop gold

// Hard cap: how many gold coins may sit on the board at the same time.
const GOLD_DROP_MAX_ON_BOARD = 2;

// Coin value = BASE + PER_LEVEL x monster level (+-20% variance). Campaign
// monsters run from level 1 to ~68, so a coin grows from ~6 to ~110 gold.
const GOLD_BASE = 4;
const GOLD_PER_LEVEL = 1.6;

// Boss coins multiply the rolled amount by this factor.
const GOLD_BOSS_AMOUNT_MULT = 5;

// Live gold coins on the board, keyed by "row-col" to { amount }.
export const _goldDrops = new Map();
// The grid's drop-collision check (combat-grid-pickups.js) reads the map
// through the global so the two modules need not import each other.
try { Object.defineProperty(globalThis, '_goldDrops', { get() { return _goldDrops; }, configurable: true }); } catch (e) {}

//------------------------------------------------------------------------
//-------------------AMOUNT ROLLING---------------------------------------
//------------------------------------------------------------------------

// Rolls one coin's worth of gold from the monster level, the active map's
// loot quantity bonus, and whether the source was a boss.
export function _rollGoldAmount(isBoss, monsterLevel) {
    const level = Math.max(1, Number(monsterLevel) || 1);
    let amount = (GOLD_BASE + GOLD_PER_LEVEL * level) * (0.8 + Math.random() * 0.4);

    if (typeof _egMapLootQuantityMult === 'function') {
        amount *= _egMapLootQuantityMult();
    }

    if (isBoss) amount *= GOLD_BOSS_AMOUNT_MULT;

    return Math.max(1, Math.round(amount));
}

// Chance-driven coin drop after a kill (bosses always drop). `force` skips
// the chance roll (the kill handler already picked gold as this creature's
// one drop). Returns true when a coin landed on the board.
export function _tryDropGold(isBoss, monsterLevel, force = false) {
    if (!_isActive()) return false;
    const chance = isBoss ? GOLD_DROP_CHANCE_BOSS : GOLD_DROP_CHANCE_NORMAL;
    if (!force && Math.random() > chance) return false;
    return _spawnGoldDrop(_rollGoldAmount(isBoss, monsterLevel));
}

//------------------------------------------------------------------------
//-------------------COIN OVERLAYS--------------------------------------
//------------------------------------------------------------------------

// Draws the coin art on a grid cell.
function _renderGoldDropOverlay(row, col, drop) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const span = document.createElement('span');
    span.className = `sx-pickup-overlay sx-pickup-rarity-legendary sx-gold-drop-overlay`;
    span.id = `sx-gold-drop-${row}-${col}`;
    // Gold coin art (images/items/, id 'gold') when available, else emoji.
    GAME_ART.fillElement(span, 'item', 'gold', '🪙');
    el.appendChild(span);
}

// Takes the coin art off a grid cell.
function _removeGoldDropOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`sx-gold-drop-${r}-${c}`);
    if (span) span.remove();
}

// Floats a spinning coin over the cell that was just claimed.
export function _animateGoldDropClaim(row, col, drop) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = typeof _getElementCentre === 'function' ? _getElementCentre(el) : { x: 0, y: 0 };
    const floater = document.createElement('div');
    floater.className = 'sx-pickup-floater';
    GAME_ART.fillElement(floater, 'item', 'gold', '🪙');
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

//------------------------------------------------------------------------
//-------------------COIN PLACEMENT---------------------------------------
//------------------------------------------------------------------------

// Places one gold coin on an eligible grid cell (mirrors _spawnCurrencyDrop).
export function _spawnGoldDrop(amount) {
    if (!_isActive() || !(amount > 0)) return false;
    if (_goldDrops.size >= GOLD_DROP_MAX_ON_BOARD) return false;

    const pool = typeof _buildPickupEligiblePool === 'function'
        ? _buildPickupEligiblePool()
        : [];
    const filtered = typeof _cellHasAnyDrop === 'function'
        ? pool.filter(([r, c]) => !_cellHasAnyDrop(r, c))
        : pool;
    if (filtered.length === 0) return false;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;
    const drop = { amount };

    _goldDrops.set(key, drop);
    _renderGoldDropOverlay(r, c, drop);

    const lifetimeMs = LOOT_DROP_LIFETIME_MS;
    if (typeof _scheduleTrackedExpiry === 'function') {
        _scheduleTrackedExpiry(_goldDrops, key, drop, lifetimeMs, `sx-gold-drop-${r}-${c}`, _removeGoldDropOverlay);
    } else {
        const timer = setTimeout(() => {
            if (_goldDrops.get(key) === drop) {
                _goldDrops.delete(key);
                _removeGoldDropOverlay(key);
            }
        }, lifetimeMs);
        if (typeof _pickupTimers !== 'undefined') globalThis._pickupTimers.push(timer);
        if (typeof _startDropExpireCountdown === 'function') {
            _startDropExpireCountdown(`sx-gold-drop-${r}-${c}`, lifetimeMs);
        }
    }
    return true;
}

//------------------------------------------------------------------------
//-------------------CLAIM & DISCARD---------------------------------------
//------------------------------------------------------------------------

// Banks the coin on a cell into the gold balance. Called from the shared
// claim router (mouse-button-handlers.js) when the cell is filled correctly.
export function _checkGoldDropClaim(row, col) {
    if (!_isActive()) return false;
    const key = `${row}-${col}`;
    const drop = _goldDrops.get(key);
    if (!drop) return false;

    if (typeof _cancelTrackedExpiry === 'function') _cancelTrackedExpiry(_goldDrops, key, drop);
    _goldDrops.delete(key);
    _removeGoldDropOverlay(key);
    _animateGoldDropClaim(row, col, drop);

    _addGold(drop.amount);
    globalThis.showToast(t('eg_gold_claimed').replace('{n}', drop.amount), '#f5d98a');
    Audio_Manager.playSFX('pickup_currency', 'player_equip_pickup');
    return true;
}

// A wrongly filled cell destroys the coin sitting on it.
export function _discardGoldDrop(row, col) {
    if (!_isActive()) return;
    const key = `${row}-${col}`;
    const drop = _goldDrops.get(key);
    if (!drop) return;
    if (typeof _cancelTrackedExpiry === 'function') _cancelTrackedExpiry(_goldDrops, key, drop);
    _goldDrops.delete(key);
    _removeGoldDropOverlay(key);
    if (typeof globalThis._animatePickupDiscard === 'function') {
        globalThis._animatePickupDiscard(row, col, { emoji: '🪙', artId: 'gold' });
    }
    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Clears every coin still on the board.
export function _stopGoldDrops() {
    if (typeof _cancelTrackedExpiry === 'function') {
        Array.from(_goldDrops.entries()).forEach(([key, drop]) => _cancelTrackedExpiry(_goldDrops, key, drop));
    }
    _goldDrops.forEach((drop, key) => _removeGoldDropOverlay(key));
    _goldDrops.clear();
}

// Coins are not carried into the next level (they would only be a few seconds
// old); kept so the shared drop code keeps calling the same names.
export function _replaceCarriedGoldDrops(drops) {}
