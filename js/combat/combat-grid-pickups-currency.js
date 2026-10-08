import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { EG_ART } from '../endgame/endgame-art.js';
import { _egGetElementCentre } from './combat-class-projectiles.js';
import { egAddCurrency } from '../endgame/endgame-hub-drag-and-drop.js';
import { egAddEssence } from '../loot/loot-essences-stash.js';
import {
    EG_CURRENCY_DROP_MAX_ON_BOARD,
    EG_LOOT_DROP_LIFETIME_MS,
    _egAnimatePickupDiscard,
    _egBuildPickupEligiblePool,
    _egCancelTrackedExpiry,
    _egCellHasAnyDrop,
    _egRarityToastColor,
    _egScheduleTrackedExpiry,
} from './combat-grid-pickups.js';
import { _egCurrencyDrops, _egIsActive } from './combat-state.js';

// Same idea as loot drops (above), but for currency orbs. Orbs land on
// the grid and must be claimed by filling the correct cell - they no
// longer go straight into the currency strip on kill.

export function _egRenderCurrencyDropOverlay(row, col, def) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const span = document.createElement('span');
    span.className = `eg-pickup-overlay eg-pickup-rarity-currency eg-currency-drop-overlay`;
    span.id = `eg-currency-drop-${row}-${col}`;
    // Orb/essence art (images/items/, keyed by def id) when available,
    // else the emoji fallback - same pattern as the loot overlay above.
    EG_ART.fillElement(span, 'item', def && def.id, (def && def.icon) || '💰');
    el.appendChild(span);
}

export function _egRemoveCurrencyDropOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-currency-drop-${r}-${c}`);
    if (span) span.remove();
}

export function _egAnimateCurrencyDropClaim(row, col, def) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = _egGetElementCentre(el);
    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater';
    EG_ART.fillElement(floater, 'item', def && def.id, (def && def.icon) || '💰');
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// Called by _egTryDropCurrency() in endgame-currency.js instead of
// adding the orb straight to the stash.
export function _egSpawnCurrencyDrop(def) {
    if (!_egIsActive() || !def) return;
    if (_egCurrencyDrops.size >= EG_CURRENCY_DROP_MAX_ON_BOARD) return;

    const pool = _egBuildPickupEligiblePool();
    const filtered = pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c));
    if (filtered.length === 0) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;

    _egCurrencyDrops.set(key, def);
    _egRenderCurrencyDropOverlay(r, c, def);

    _egScheduleTrackedExpiry(_egCurrencyDrops, key, def, EG_LOOT_DROP_LIFETIME_MS, `eg-currency-drop-${r}-${c}`, _egRemoveCurrencyDropOverlay);
}

// Tracks a claimed currency drop for the leave-map summary screen.
// Aggregates by currency id so stacks show one chip with a count.
export function _egTrackRunCurrency(def) {
    const existing = globalThis._egRunCurrency.find(e => e.id === def.id);
    if (existing) existing.count++;
    else globalThis._egRunCurrency.push({ id: def.id, name: def.name, icon: def.icon, description: def.description, count: 1 });
}

// Tracks a claimed essence drop for the leave-map summary screen.
// Aggregates by essence id so stacks show one chip with a count.
export function _egTrackRunEssence(def) {
    const existing = globalThis._egRunEssences.find(e => e.id === def.id);
    if (existing) existing.count++;
    else globalThis._egRunEssences.push({ id: def.id, name: def.name, icon: def.icon, description: def.description, count: 1 });
}


// Called on correct-cell-fill (mirrors _egCheckLootClaim). Adds the orb
// to the currency stash via egAddCurrency() and returns true if claimed.
export function _egCheckCurrencyDropClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const def = _egCurrencyDrops.get(key);
    if (!def) return false;

    _egCancelTrackedExpiry(_egCurrencyDrops, key, def);
    _egCurrencyDrops.delete(key);
    _egRemoveCurrencyDropOverlay(key);
    _egAnimateCurrencyDropClaim(row, col, def);

    // Essences are claimed through the same drop pipeline but stack in the
    // essence tab instead of the runes & orbs strip.
    const isEssence = def.category === 'essence';
    const added = isEssence
        ? egAddEssence(def.id, 1, {
            name: def.name,
            icon: def.icon,
            rarity: 'essence',
            category: 'essence',
            description: def.description,
        })
        : egAddCurrency(def.id, 1, {
            name: def.name,
            icon: def.icon,
            rarity: 'currency',
            category: 'currency',
            description: def.description,
        });

    if (isEssence) {
        _egTrackRunEssence(def);
    } else {
        _egTrackRunCurrency(def);
    }

    if (added) globalThis.showToast(t('eg_currency_acquired')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name), _egRarityToastColor('currency'));
    Audio_Manager.playSFX('player_equip_pickup');
    return true;
}

// Called on wrong-action-on-cell (mirrors _egDiscardLootDrop).
export function _egDiscardCurrencyDrop(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egCurrencyDrops.has(key)) return;
    const def = _egCurrencyDrops.get(key);
    _egCancelTrackedExpiry(_egCurrencyDrops, key, def);
    _egCurrencyDrops.delete(key);
    _egRemoveCurrencyDropOverlay(key);
    _egAnimatePickupDiscard(row, col, { emoji: def.icon || '💰', id: def.id });

    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Clears all active currency drops (called by _egStopPickupSpawner).
export function _egStopCurrencyDrops() {
    Array.from(_egCurrencyDrops.entries()).forEach(([key, def]) => _egCancelTrackedExpiry(_egCurrencyDrops, key, def));
    _egCurrencyDrops.forEach((def, key) => _egRemoveCurrencyDropOverlay(key));
    _egCurrencyDrops.clear();
}

// Carries an unclaimed currency drop into the next chained puzzle
// (mirrors _egReplaceCarriedLootDrops).
export function _egReplaceCarriedCurrencyDrops(defs) {
    if (!defs || defs.length === 0) return;

    defs.forEach(def => {
        if (_egCurrencyDrops.size >= EG_CURRENCY_DROP_MAX_ON_BOARD) return;

        const pool = _egBuildPickupEligiblePool();
        const filtered = pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c));
        if (filtered.length === 0) return;

        const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
        const key = `${r}-${c}`;

        _egCurrencyDrops.set(key, def);
        _egRenderCurrencyDropOverlay(r, c, def);

        _egScheduleTrackedExpiry(_egCurrencyDrops, key, def, EG_LOOT_DROP_LIFETIME_MS, `eg-currency-drop-${r}-${c}`, _egRemoveCurrencyDropOverlay);
    });
}
