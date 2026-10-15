import { _egGetElementCentre } from '../combat/combat-class-projectiles.js';
import { EG_LOOT_DROP_LIFETIME_MS, _egBuildPickupEligiblePool, _egCancelTrackedExpiry, _egCellHasAnyDrop, _egScheduleTrackedExpiry, _egStartDropExpireCountdown } from '../combat/combat-grid-pickups.js';
import { _egMapLootQuantityMult } from '../endgame/endgame-map-launch.js';
import { _egIsActive } from '../combat/combat-state.js';
import { EG_ART } from '../endgame/endgame-art.js';
import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _egAddGold } from './loot-gold.js';

//------------------------------------------------------------------------
//-------------------GOLD COIN DROPS---------------------------------------
//------------------------------------------------------------------------
// Gold coins are their own loot bucket: a kill rolls "gold" next to
// equipment / currency / charms (see _egRollKillDropBucket), bosses always
// drop one, and the amount grows with the monster's level so the campaign
// pays out more the deeper you go. Claiming works like every other grid
// drop: fill the cell and the coin is banked straight into the balance.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------

// Bucket weight in the one-drop-per-kill roll (equipment 0.35, currency 0.25,
// charms 0.03, ...): a deliberately rare ~8% of drops.
export const EG_GOLD_DROP_CHANCE_NORMAL = 0.07;
export const EG_GOLD_DROP_CHANCE_BOSS = 1.00;    // bosses always drop gold

// Hard cap: how many gold coins may sit on the board at the same time.
const EG_GOLD_DROP_MAX_ON_BOARD = 2;

// Coin value = BASE + PER_LEVEL x monster level (+-20% variance). Campaign
// monsters run from level 1 to ~68, so a coin grows from ~6 to ~110 gold.
const EG_GOLD_BASE = 4;
const EG_GOLD_PER_LEVEL = 1.6;

// Boss coins multiply the rolled amount by this factor.
const EG_GOLD_BOSS_AMOUNT_MULT = 5;

// Live gold coins on the board, keyed by "row-col" to { amount }.
export const _egGoldDrops = new Map();
// The grid's drop-collision check (combat-grid-pickups.js) reads the map
// through the global so the two modules need not import each other.
try { Object.defineProperty(globalThis, '_egGoldDrops', { get() { return _egGoldDrops; }, configurable: true }); } catch (e) {}

//------------------------------------------------------------------------
//-------------------AMOUNT ROLLING---------------------------------------
//------------------------------------------------------------------------

// Rolls one coin's worth of gold from the monster level, the active map's
// loot quantity bonus, and whether the source was a boss.
export function _egRollGoldAmount(isBoss, monsterLevel) {
    const level = Math.max(1, Number(monsterLevel) || 1);
    let amount = (EG_GOLD_BASE + EG_GOLD_PER_LEVEL * level) * (0.8 + Math.random() * 0.4);

    if (typeof _egMapLootQuantityMult === 'function') {
        amount *= _egMapLootQuantityMult();
    }

    if (isBoss) amount *= EG_GOLD_BOSS_AMOUNT_MULT;

    return Math.max(1, Math.round(amount));
}

// Chance-driven coin drop after a kill (bosses always drop). `force` skips
// the chance roll (the kill handler already picked gold as this creature's
// one drop). Returns true when a coin landed on the board.
export function _egTryDropGold(isBoss, monsterLevel, force = false) {
    if (!_egIsActive()) return false;
    const chance = isBoss ? EG_GOLD_DROP_CHANCE_BOSS : EG_GOLD_DROP_CHANCE_NORMAL;
    if (!force && Math.random() > chance) return false;
    return _egSpawnGoldDrop(_egRollGoldAmount(isBoss, monsterLevel));
}

//------------------------------------------------------------------------
//-------------------COIN OVERLAYS--------------------------------------
//------------------------------------------------------------------------

// Draws the coin art on a grid cell.
function _egRenderGoldDropOverlay(row, col, drop) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const span = document.createElement('span');
    span.className = `eg-pickup-overlay eg-pickup-rarity-legendary eg-gold-drop-overlay`;
    span.id = `eg-gold-drop-${row}-${col}`;
    // Gold coin art (images/items/, id 'gold') when available, else emoji.
    EG_ART.fillElement(span, 'item', 'gold', '🪙');
    el.appendChild(span);
}

// Takes the coin art off a grid cell.
function _egRemoveGoldDropOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-gold-drop-${r}-${c}`);
    if (span) span.remove();
}

// Floats a spinning coin over the cell that was just claimed.
export function _egAnimateGoldDropClaim(row, col, drop) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = typeof _egGetElementCentre === 'function' ? _egGetElementCentre(el) : { x: 0, y: 0 };
    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater';
    EG_ART.fillElement(floater, 'item', 'gold', '🪙');
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

//------------------------------------------------------------------------
//-------------------COIN PLACEMENT---------------------------------------
//------------------------------------------------------------------------

// Places one gold coin on an eligible grid cell (mirrors _egSpawnCurrencyDrop).
export function _egSpawnGoldDrop(amount) {
    if (!_egIsActive() || !(amount > 0)) return false;
    if (_egGoldDrops.size >= EG_GOLD_DROP_MAX_ON_BOARD) return false;

    const pool = typeof _egBuildPickupEligiblePool === 'function'
        ? _egBuildPickupEligiblePool()
        : [];
    const filtered = typeof _egCellHasAnyDrop === 'function'
        ? pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c))
        : pool;
    if (filtered.length === 0) return false;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;
    const drop = { amount };

    _egGoldDrops.set(key, drop);
    _egRenderGoldDropOverlay(r, c, drop);

    const lifetimeMs = EG_LOOT_DROP_LIFETIME_MS;
    if (typeof _egScheduleTrackedExpiry === 'function') {
        _egScheduleTrackedExpiry(_egGoldDrops, key, drop, lifetimeMs, `eg-gold-drop-${r}-${c}`, _egRemoveGoldDropOverlay);
    } else {
        const timer = setTimeout(() => {
            if (_egGoldDrops.get(key) === drop) {
                _egGoldDrops.delete(key);
                _egRemoveGoldDropOverlay(key);
            }
        }, lifetimeMs);
        if (typeof _egPickupTimers !== 'undefined') globalThis._egPickupTimers.push(timer);
        if (typeof _egStartDropExpireCountdown === 'function') {
            _egStartDropExpireCountdown(`eg-gold-drop-${r}-${c}`, lifetimeMs);
        }
    }
    return true;
}

//------------------------------------------------------------------------
//-------------------CLAIM & DISCARD---------------------------------------
//------------------------------------------------------------------------

// Banks the coin on a cell into the gold balance. Called from the shared
// claim router (mouse-button-handlers.js) when the cell is filled correctly.
export function _egCheckGoldDropClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const drop = _egGoldDrops.get(key);
    if (!drop) return false;

    if (typeof _egCancelTrackedExpiry === 'function') _egCancelTrackedExpiry(_egGoldDrops, key, drop);
    _egGoldDrops.delete(key);
    _egRemoveGoldDropOverlay(key);
    _egAnimateGoldDropClaim(row, col, drop);

    _egAddGold(drop.amount);
    globalThis.showToast(t('eg_gold_claimed').replace('{n}', drop.amount), '#f5d98a');
    Audio_Manager.playSFX('pickup_currency', 'player_equip_pickup');
    return true;
}

// A wrongly filled cell destroys the coin sitting on it.
export function _egDiscardGoldDrop(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    const drop = _egGoldDrops.get(key);
    if (!drop) return;
    if (typeof _egCancelTrackedExpiry === 'function') _egCancelTrackedExpiry(_egGoldDrops, key, drop);
    _egGoldDrops.delete(key);
    _egRemoveGoldDropOverlay(key);
    if (typeof globalThis._egAnimatePickupDiscard === 'function') {
        globalThis._egAnimatePickupDiscard(row, col, { emoji: '🪙', artId: 'gold' });
    }
    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Clears every coin still on the board.
export function _egStopGoldDrops() {
    if (typeof _egCancelTrackedExpiry === 'function') {
        Array.from(_egGoldDrops.entries()).forEach(([key, drop]) => _egCancelTrackedExpiry(_egGoldDrops, key, drop));
    }
    _egGoldDrops.forEach((drop, key) => _egRemoveGoldDropOverlay(key));
    _egGoldDrops.clear();
}

// Coins are not carried into the next level (they would only be a few seconds
// old); kept so the shared drop code keeps calling the same names.
export function _egReplaceCarriedGoldDrops(drops) {}
