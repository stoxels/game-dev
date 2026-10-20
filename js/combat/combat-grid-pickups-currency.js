import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { GAME_ART } from './combat-art.js';
import { _getElementCentre } from './combat-class-projectiles.js';
import { addCurrency } from '../hub/hub-drag-and-drop.js';
import { addEssence } from '../loot/loot-essences-stash.js';
import {
    CURRENCY_DROP_MAX_ON_BOARD,
    LOOT_DROP_LIFETIME_MS,
    _animatePickupDiscard,
    _buildPickupEligiblePool,
    _cancelTrackedExpiry,
    _cellHasAnyDrop,
    _rarityToastColor,
    _scheduleTrackedExpiry,
} from './combat-grid-pickups.js';
import { _currencyDrops, _isActive } from './combat-state.js';

// Same idea as loot drops (above), but for currency orbs. Orbs land on
// the grid and must be claimed by filling the correct cell - they no
// longer go straight into the currency strip on kill.

export function _renderCurrencyDropOverlay(row, col, def) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const span = document.createElement('span');
    span.className = `sx-pickup-overlay sx-pickup-rarity-currency sx-currency-drop-overlay`;
    span.id = `sx-currency-drop-${row}-${col}`;
    // Orb/essence art (images/items/, keyed by def id) when available,
    // else the emoji fallback - same pattern as the loot overlay above.
    GAME_ART.fillElement(span, 'item', def && def.id, (def && def.icon) || '💰');
    el.appendChild(span);
}

export function _removeCurrencyDropOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`sx-currency-drop-${r}-${c}`);
    if (span) span.remove();
}

export function _animateCurrencyDropClaim(row, col, def) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = _getElementCentre(el);
    const floater = document.createElement('div');
    floater.className = 'sx-pickup-floater';
    GAME_ART.fillElement(floater, 'item', def && def.id, (def && def.icon) || '💰');
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// Called by _tryDropCurrency() in endgame-currency.js instead of
// adding the orb straight to the stash.
export function _spawnCurrencyDrop(def) {
    if (!_isActive() || !def) return;
    if (_currencyDrops.size >= CURRENCY_DROP_MAX_ON_BOARD) return;

    const pool = _buildPickupEligiblePool();
    const filtered = pool.filter(([r, c]) => !_cellHasAnyDrop(r, c));
    if (filtered.length === 0) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;

    _currencyDrops.set(key, def);
    _renderCurrencyDropOverlay(r, c, def);

    _scheduleTrackedExpiry(_currencyDrops, key, def, LOOT_DROP_LIFETIME_MS, `sx-currency-drop-${r}-${c}`, _removeCurrencyDropOverlay);
}

// Tracks a claimed currency drop for the leave-map summary screen.
// Aggregates by currency id so stacks show one chip with a count.
export function _trackRunCurrency(def) {
    const existing = globalThis._runCurrency.find(e => e.id === def.id);
    if (existing) existing.count++;
    else globalThis._runCurrency.push({ id: def.id, name: def.name, icon: def.icon, description: def.description, count: 1 });
}

// Tracks a claimed essence drop for the leave-map summary screen.
// Aggregates by essence id so stacks show one chip with a count.
export function _trackRunEssence(def) {
    const existing = globalThis._runEssences.find(e => e.id === def.id);
    if (existing) existing.count++;
    else globalThis._runEssences.push({ id: def.id, name: def.name, icon: def.icon, description: def.description, count: 1 });
}


// Called on correct-cell-fill (mirrors _checkLootClaim). Adds the orb
// to the currency stash via addCurrency() and returns true if claimed.
export function _checkCurrencyDropClaim(row, col) {
    if (!_isActive()) return false;
    const key = `${row}-${col}`;
    const def = _currencyDrops.get(key);
    if (!def) return false;

    _cancelTrackedExpiry(_currencyDrops, key, def);
    _currencyDrops.delete(key);
    _removeCurrencyDropOverlay(key);
    _animateCurrencyDropClaim(row, col, def);

    // Essences are claimed through the same drop pipeline but stack in the
    // essence tab instead of the runes & orbs strip.
    const isEssence = def.category === 'essence';
    const added = isEssence
        ? addEssence(def.id, 1, {
            name: def.name,
            icon: def.icon,
            rarity: 'essence',
            category: 'essence',
            description: def.description,
        })
        : addCurrency(def.id, 1, {
            name: def.name,
            icon: def.icon,
            rarity: 'currency',
            category: 'currency',
            description: def.description,
        });

    if (isEssence) {
        _trackRunEssence(def);
    } else {
        _trackRunCurrency(def);
    }

    if (added) globalThis.showToast(t('eg_currency_acquired')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name), _rarityToastColor('currency'));
    Audio_Manager.playSFX(isEssence ? 'pickup_essence' : 'pickup_currency', 'player_equip_pickup');
    return true;
}

// Called on wrong-action-on-cell (mirrors _discardLootDrop).
export function _discardCurrencyDrop(row, col) {
    if (!_isActive()) return;
    const key = `${row}-${col}`;
    if (!_currencyDrops.has(key)) return;
    const def = _currencyDrops.get(key);
    _cancelTrackedExpiry(_currencyDrops, key, def);
    _currencyDrops.delete(key);
    _removeCurrencyDropOverlay(key);
    _animatePickupDiscard(row, col, { emoji: def.icon || '💰', id: def.id });

    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Clears all active currency drops (called by _stopPickupSpawner).
export function _stopCurrencyDrops() {
    Array.from(_currencyDrops.entries()).forEach(([key, def]) => _cancelTrackedExpiry(_currencyDrops, key, def));
    _currencyDrops.forEach((def, key) => _removeCurrencyDropOverlay(key));
    _currencyDrops.clear();
}

// Carries an unclaimed currency drop into the next chained puzzle
// (mirrors _replaceCarriedLootDrops).
export function _replaceCarriedCurrencyDrops(defs) {
    if (!defs || defs.length === 0) return;

    defs.forEach(def => {
        if (_currencyDrops.size >= CURRENCY_DROP_MAX_ON_BOARD) return;

        const pool = _buildPickupEligiblePool();
        const filtered = pool.filter(([r, c]) => !_cellHasAnyDrop(r, c));
        if (filtered.length === 0) return;

        const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
        const key = `${r}-${c}`;

        _currencyDrops.set(key, def);
        _renderCurrencyDropOverlay(r, c, def);

        _scheduleTrackedExpiry(_currencyDrops, key, def, LOOT_DROP_LIFETIME_MS, `sx-currency-drop-${r}-${c}`, _removeCurrencyDropOverlay);
    });
}
