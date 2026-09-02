//------------------------------------------------------------------------
//-------------------ENDGAME LOOT FILTER----------------------------------
//------------------------------------------------------------------------
// PoE/Last-Epoch style loot filter. The player defines VENDOR rules; any
// equipment drop that matches an enabled rule is auto-vendored the moment
// it is picked up (same effect as Ctrl+click: destroyed for a rolled orb
// shard) and never reaches the stash. Items matching no rule are kept.
//
// Rule semantics:
//   - Within one rule, all set conditions must hold (AND).
//   - Across rules, ANY matching rule vendored the item (OR).
//   - An empty rule list vendored nothing (safe default).
//   - Filter disabled (default) vendored nothing.
//
// Per-rule conditions (all UPPER bounds — vendor rules target trash):
//   slot       — 'any' or a specific slotType
//   baseId     — 'any' or a specific base type id (within that slot)
//   maxIlvl    — item must have itemLevel <= value (0 = off)
//   maxReq     — item must have requirements.level <= value (0 = off)
//   modMode    — 'none'     : no modifier condition
//                'has_t1'   : item has a Tier 1 modifier (optionally of a
//                             specific family) on that slot's mod table
//                'not_has'  : item does NOT have the chosen modifier family
//                             on that slot's mod table
//   maxT1      — item must have at most N Tier 1 modifiers (null = off).
//                Counts T1 mods across ALL families, e.g. 0 = "no T1 mods
//                at all" — the classic "vendor everything unpromising" rule.
//
// Hard exceptions (never vendored, regardless of rules):
//   - starter gear (noSellValue) — nothing to gain, blocks an exploit
//   - unique items, when "keep uniques" is on (default on)
//   - any item when the shard stash is full (mirrors Ctrl+click failure)
//
// Load AFTER endgame-grid-pickups.js (hooks its claim flow) and AFTER
// endgame-equipment-base-items.js / endgame-mod-tables.js (base + mod
// pools for the rule editor). All cross-module references are guarded
// with typeof checks, matching the defensive style of the other modules.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------STATE & PERSISTENCE----------------------------------
//------------------------------------------------------------------------

// Live filter state. Kept in STATE.egLootFilter:
//   { enabled: bool, keepUnique: bool, rules: [rule, ...] }
let _egLootFilter = null;

function _eglfDefaultState() {
    return {
        enabled: false,     // off by default — nothing is vendored until opted in
        keepUnique: true,   // golden items are never auto-vendored
        rules: [],
    };
}

function _eglfNormaliseRule(raw) {
    const r = (raw && typeof raw === 'object') ? raw : {};
    return {
        id: (typeof r.id === 'string' && r.id) ? r.id : `lf_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        enabled: r.enabled !== false,
        slot: (typeof r.slot === 'string' && r.slot) ? r.slot : 'any',
        baseId: (typeof r.baseId === 'string' && r.baseId) ? r.baseId : 'any',
        maxIlvl: (typeof r.maxIlvl === 'number' && r.maxIlvl > 0) ? Math.floor(r.maxIlvl) : (typeof r.minIlvl === 'number' && r.minIlvl > 0 ? Math.floor(r.minIlvl) : 0),
        maxReq: (typeof r.maxReq === 'number' && r.maxReq > 0) ? Math.floor(r.maxReq) : (typeof r.minReq === 'number' && r.minReq > 0 ? Math.floor(r.minReq) : 0),
        modMode: ['none', 'has_t1', 'not_has'].includes(r.modMode) ? r.modMode : 'none',
        modFamily: (typeof r.modFamily === 'string') ? r.modFamily : '',
        maxT1: (typeof r.maxT1 === 'number' && r.maxT1 >= 0) ? Math.min(6, Math.floor(r.maxT1)) : null,
    };
}

function _eglfNormaliseState(raw) {
    const def = _eglfDefaultState();
    if (!raw || typeof raw !== 'object') return def;
    return {
        enabled: raw.enabled === true,
        keepUnique: raw.keepUnique !== false,
        rules: Array.isArray(raw.rules) ? raw.rules.map(_eglfNormaliseRule) : [],
    };
}

function _egLoadLootFilter() {
    if (typeof STATE !== 'undefined' && STATE.egLootFilter) {
        _egLootFilter = _eglfNormaliseState(STATE.egLootFilter);
    } else {
        _egLootFilter = _eglfDefaultState();
    }
    return _egLootFilter;
}

function _egSaveLootFilter() {
    if (typeof STATE !== 'undefined') {
        STATE.egLootFilter = JSON.parse(JSON.stringify(_egLootFilter));
        if (typeof save === 'function') try { save(); } catch (e) {}
    }
    if (typeof egSaveHubState === 'function') try { egSaveHubState(); } catch (e) {}
}

// Load immediately so run-time claims see the persisted filter.
_egLoadLootFilter();


//------------------------------------------------------------------------
//-------------------MATCHER----------------------------------------------
//------------------------------------------------------------------------

// True when the item satisfies one rule's every set condition (AND).
function _eglfRuleMatches(rule, item) {
    // Slot condition.
    if (rule.slot !== 'any' && item.slotType !== rule.slot) return false;

    // Base type condition.
    if (rule.baseId !== 'any' && item.baseId !== rule.baseId) return false;

    // Item level condition (0 = disabled).
    if (rule.maxIlvl > 0 && !(item.itemLevel != null && item.itemLevel <= rule.maxIlvl)) return false;

    // Required character level condition (0 = disabled).
    if (rule.maxReq > 0) {
        const req = (item.requirements && item.requirements.level != null) ? item.requirements.level : null;
        if (!(req != null && req <= rule.maxReq)) return false;
    }

    // Modifier conditions, evaluated against the item's rolled mods.
    const mods = Array.isArray(item.mods) ? item.mods : [];
    // Tier-1 modifier count upper bound (null = off). Counts T1 mods across
    // all families; 0 targets items with no T1 mod at all.
    if (rule.maxT1 != null) {
        const t1Count = mods.filter(m => m.tier === 1).length;
        if (t1Count > rule.maxT1) return false;
    }
    if (rule.modMode === 'has_t1') {
        // Tier 1 modifier present — optionally restricted to one family.
        const hasT1 = mods.some(m =>
            m.tier === 1 && (!rule.modFamily || m.familyId === rule.modFamily));
        if (!hasT1) return false;
    } else if (rule.modMode === 'not_has') {
        // Specific modifier family absent (family required for this mode).
        if (rule.modFamily && mods.some(m => m.familyId === rule.modFamily)) return false;
    }

    return true;
}

// True when the item would be auto-vendored at pickup (matches a rule).
// Hard exceptions live here so every call site agrees.
function _egLootFilterShouldVendor(item) {
    if (!item || item.category !== 'equip') return false;
    if (!_egLootFilter) _egLoadLootFilter();
    if (!_egLootFilter.enabled) return false;
    if (item.noSellValue) return false;                      // starter gear — nothing to gain
    if (_egLootFilter.keepUnique && item.isUnique) return false;
    const rules = _egLootFilter.rules.filter(r => r.enabled);
    if (rules.length === 0) return false;                    // no rules → keep everything
    return rules.some(rule => _eglfRuleMatches(rule, item));
}

// True when the item is KEPT (no rule matches, or hard exception).
function _egLootFilterKeeps(item) {
    return !_egLootFilterShouldVendor(item);
}


//------------------------------------------------------------------------
//-------------------AUTO-VENDOR (PICKUP HOOK)----------------------------
//------------------------------------------------------------------------
// Called from _egCheckLootClaim (endgame-grid-pickups.js) right after a
// successful claim. Returns true when the item was consumed — the caller
// then skips pushing it into _egRunLoot, so it never reaches the stash.
// Mirrors _egSellStashItem (Ctrl+click): unique → Ancient Shard, else a
// rolled shard; shard stash full → item is kept.

function _egLootFilterAutoVendor(item) {
    if (!_egLootFilterShouldVendor(item)) return false;

    // Starter gear is excluded by _egLootFilterShouldVendor, so every item
    // reaching this point has sell value.
    const shardDef = (item.isUnique && typeof EG_SHARD_DEFS !== 'undefined' && EG_SHARD_DEFS.shard_ancient)
        ? EG_SHARD_DEFS.shard_ancient
        : (typeof _egRollShardForItem === 'function' ? _egRollShardForItem(item) : null);

    if (!shardDef) return false; // shard system unavailable — keep the item

    let granted = false;
    try {
        granted = (typeof egAddShard === 'function') ? egAddShard(shardDef.id, 1) : false;
    } catch (e) { granted = false; }

    if (!granted) {
        // Shard stash full — keep the item and tell the player why.
        if (typeof showToast === 'function') {
            showToast(t('eg_loot_filter_shard_full')
                .replace('{name}', item.name || '???'), '#f87171');
        }
        return false;
    }

    // Mirror the granted shard into the run currency tracker so it shows up
    // in the runes & orbs row of the pause screen and the map win/loss
    // summary (same aggregation the Ctrl+click sell chips use). Only during
    // an active run — vendoring happens exclusively inside map runs.
    if (typeof _egRunCurrency !== 'undefined' && Array.isArray(_egRunCurrency)
        && (typeof _egIsActive !== 'function' || _egIsActive())) {
        const existing = _egRunCurrency.find(e => e.id === shardDef.id);
        if (existing) existing.count = (existing.count || 1) + 1;
        else _egRunCurrency.push({
            id: shardDef.id,
            name: shardDef.name,
            icon: shardDef.icon,
            description: shardDef.description,
            count: 1,
        });
    }

    if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
        try { Audio_Manager.playSFX('player_equip_pickup'); } catch (e) {}
    }
    if (typeof showToast === 'function') {
        showToast(t('eg_loot_filter_vendored')
            .replace('{name}', item.name || '???')
            .replace('{icon}', shardDef.icon || '◆')
            .replace('{shard}', shardDef.name || '?'), '#f5d98a');
    }
    if (typeof trackAchStat === 'function') try { trackAchStat('egLootFilterVendored', 1); } catch(e){}
    return true;
}


//------------------------------------------------------------------------
//-------------------RULE EDITOR DATA-------------------------------------
//------------------------------------------------------------------------

// Distinct slot types across all base items, in stable first-seen order.
function _eglfSlotTypes() {
    const out = [];
    if (typeof EG_ALL_BASE_TYPES !== 'undefined') {
        for (const b of EG_ALL_BASE_TYPES) {
            if (b.slotType && !out.includes(b.slotType)) out.push(b.slotType);
        }
    }
    return out;
}

// Base types for one slot ('any' → every base, only used for display).
function _eglfBasesForSlot(slot) {
    if (typeof EG_ALL_BASE_TYPES === 'undefined') return [];
    return EG_ALL_BASE_TYPES.filter(b => slot === 'any' || b.slotType === slot);
}

// Mod families available for one slot, from its EG_SLOT_MOD_TABLE_* entry.
// Returns [{ id, label }] with the localized label when the table has one.
function _eglfModFamiliesForSlot(slot) {
    const out = [];
    if (typeof EG_SLOT_MOD_TABLE_MAP === 'undefined') return out;
    const getter = EG_SLOT_MOD_TABLE_MAP[slot];
    if (!getter) return out;
    let table = null;
    try { table = getter(); } catch (e) { table = null; }
    if (!table) return out;
    const seen = new Set();
    for (const section of ['prefixes', 'suffixes']) {
        const sec = table[section];
        if (!sec) continue;
        for (const familyId of Object.keys(sec)) {
            if (seen.has(familyId)) continue;
            seen.add(familyId);
            const entry = sec[familyId];
            const label = (entry && (LANG === 'de' ? entry.labelDe : entry.label)) || familyId;
            out.push({ id: familyId, label: `${label}` });
        }
    }
    return out;
}

// Every mod family across all slots (used when rule slot = 'any').
function _eglfAllModFamilies() {
    const out = [];
    const seen = new Set();
    for (const slot of _eglfSlotTypes()) {
        for (const fam of _eglfModFamiliesForSlot(slot)) {
            if (!seen.has(fam.id)) { seen.add(fam.id); out.push(fam); }
        }
    }
    return out;
}


//------------------------------------------------------------------------
//-------------------PANEL------------------------------------------------
//------------------------------------------------------------------------
// Modal built once and re-rendered on open, mirroring the mass-sell modal
// in endgame-hub.js. Edits go into a working copy (_eglfWorking); SAVE
// commits it to the live filter + STATE, Cancel discards.

let _eglfWorking = null;

function _eglfEscapeHTML(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function _egInjectLootFilterStyles() {
    if (document.getElementById('eg-loot-filter-styles')) return;
    const style = document.createElement('style');
    style.id = 'eg-loot-filter-styles';
    style.textContent = `
        .eg-lf-modal-bg {
            display: none; position: fixed; inset: 0;
            background: rgba(5,8,14,0.78);
            backdrop-filter: blur(2px);
            z-index: 10001;
            align-items: center; justify-content: center;
        }
        .eg-lf-modal-bg.show { display: flex; }

        /* ── modal shell: fixed header, scrollable body, pinned footer ── */
        .eg-lf-box {
            display: flex; flex-direction: column;
            box-sizing: border-box;
            background: var(--panel, #222630);
            border: 1px solid var(--border2, #656f96);
            border-radius: 8px;
            width: min(620px, 94vw);
            max-height: min(700px, 92vh);
            box-shadow: 0 0 0 1px rgba(0,0,0,0.55),
                        0 0 26px rgba(102,252,241,0.10),
                        0 22px 48px rgba(0,0,0,0.55);
            overflow: hidden;
        }

        /* ── header ── */
        .eg-lf-head {
            display: flex; align-items: center; gap: 10px;
            padding: 11px 14px;
            border-bottom: 1px solid var(--border, #4a5475);
            background: linear-gradient(180deg, rgba(102,252,241,0.07), rgba(102,252,241,0.02));
            flex-shrink: 0;
        }
        .eg-lf-head-icon {
            font-size: 17px; line-height: 1; color: var(--accent, #66fcf1);
            text-shadow: 0 0 8px rgba(102,252,241,0.5);
        }
        .eg-lf-head-title {
            flex: 1; min-width: 0;
            font-family: var(--PX, monospace); font-size: 11px; letter-spacing: 2px;
            color: var(--accent, #66fcf1);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .eg-lf-close {
            width: 24px; height: 24px; flex-shrink: 0;
            font-family: var(--PX, monospace); font-size: 10px; line-height: 1;
            color: var(--accent2, #fff); background: transparent;
            border: 1px solid var(--border2, #656f96); border-radius: 4px;
            cursor: pointer; transition: all 0.12s;
        }
        .eg-lf-close:hover {
            color: #ff6b6b; border-color: rgba(255,107,107,0.6);
            background: rgba(255,107,107,0.12);
        }

        /* ── scrollable body ── */
        .eg-lf-body {
            flex: 1; min-height: 0;
            overflow-y: auto; overflow-x: hidden;
            padding: 12px 14px;
            display: flex; flex-direction: column; gap: 10px;
            scrollbar-width: thin;
            scrollbar-color: var(--border2, #656f96) transparent;
        }
        .eg-lf-body::-webkit-scrollbar { width: 8px; }
        .eg-lf-body::-webkit-scrollbar-track { background: transparent; }
        .eg-lf-body::-webkit-scrollbar-thumb { background: var(--border2, #656f96); border-radius: 4px; }

        /* ── how-it-works ── */
        .eg-lf-how {
            border: 1px solid var(--border, #4a5475);
            border-left: 3px solid var(--accent, #66fcf1);
            border-radius: 4px;
            background: rgba(102,252,241,0.04);
            padding: 8px 10px;
        }
        .eg-lf-how-title {
            font-family: var(--PX, monospace); font-size: 7px; letter-spacing: 2px;
            color: var(--accent, #66fcf1); opacity: 0.9; margin-bottom: 6px;
        }
        .eg-lf-how-li {
            display: flex; gap: 7px; align-items: baseline;
            font-family: var(--F, monospace); font-size: 12.5px; line-height: 1.45;
            color: var(--accent2, #fff); opacity: 0.88;
        }
        .eg-lf-how-li + .eg-lf-how-li { margin-top: 3px; }
        .eg-lf-how-b { color: var(--accent, #66fcf1); flex-shrink: 0; }

        /* ── toggles ── */
        .eg-lf-toggles { display: flex; flex-direction: column; gap: 2px; }
        .eg-lf-toggle {
            display: flex; align-items: center; gap: 9px;
            padding: 5px 8px; border-radius: 3px; cursor: pointer; user-select: none;
            font-family: var(--F, monospace); font-size: 13px; color: var(--accent2, #fff);
            border: 1px solid transparent;
            transition: background 0.12s, border-color 0.12s;
        }
        .eg-lf-toggle:hover { background: rgba(102,252,241,0.05); border-color: var(--border, #4a5475); }
        .eg-lf-toggle-gold span { color: var(--yellow, #f5c518); }
        .eg-lf-check {
            appearance: none; -webkit-appearance: none;
            width: 15px; height: 15px; flex-shrink: 0; margin: 0;
            background: rgba(0,0,0,0.4);
            border: 1px solid var(--border2, #656f96); border-radius: 2px;
            cursor: pointer; position: relative;
            transition: all 0.12s;
        }
        .eg-lf-check:hover { border-color: var(--accent, #66fcf1); }
        .eg-lf-check:checked {
            background: var(--accent, #66fcf1); border-color: var(--accent, #66fcf1);
            box-shadow: 0 0 7px rgba(102,252,241,0.55);
        }
        .eg-lf-check:checked::after {
            content: '✓'; position: absolute; inset: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700; color: #0c1016;
        }

        /* ── section header ── */
        .eg-lf-section-head { display: flex; align-items: center; gap: 8px; }
        .eg-lf-section-title {
            font-family: var(--PX, monospace); font-size: 8px; letter-spacing: 2px;
            color: var(--accent, #66fcf1);
        }
        .eg-lf-section-count {
            font-family: var(--F, monospace); font-size: 12px;
            color: var(--setup-opt-inactive, #8892a3);
        }
        .eg-lf-section-line { flex: 1; height: 1px; background: var(--border, #4a5475); opacity: 0.6; }

        /* ── rules zone (dims while the master filter is off) ── */
        .eg-lf-rules-zone { display: flex; flex-direction: column; gap: 8px; transition: opacity 0.15s; }
        .eg-lf-box.eg-lf-off .eg-lf-rules-zone { opacity: 0.45; }

        .eg-lf-rules { display: flex; flex-direction: column; gap: 8px; }

        /* ── rule card ── */
        .eg-lf-rule {
            border: 1px solid var(--border, #4a5475);
            border-left: 3px solid var(--accent, #66fcf1);
            border-radius: 4px;
            background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.14));
            padding: 9px 10px 10px;
        }
        .eg-lf-rule.eg-lf-rule-off { border-left-color: var(--border2, #656f96); }
        .eg-lf-rule.eg-lf-rule-off .eg-lf-fields,
        .eg-lf-rule.eg-lf-rule-off .eg-lf-rule-title { opacity: 0.55; }
        .eg-lf-rule-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .eg-lf-rule-title {
            font-family: var(--PX, monospace); font-size: 9px; letter-spacing: 1px;
            color: var(--accent, #66fcf1);
        }
        .eg-lf-rule-del {
            margin-left: auto; width: 20px; height: 20px; padding: 0;
            font-family: var(--PX, monospace); font-size: 9px; line-height: 1;
            color: var(--red, #f70808); opacity: 0.75;
            background: transparent; border: 1px solid transparent; border-radius: 3px;
            cursor: pointer; transition: all 0.12s;
        }
        .eg-lf-rule-del:hover {
            opacity: 1; color: #ff6b6b;
            border-color: rgba(255,107,107,0.55); background: rgba(255,107,107,0.12);
        }

        /* ── fields ── */
        .eg-lf-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 9px; }
        .eg-lf-field { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .eg-lf-field > label {
            font-family: var(--PX, monospace); font-size: 7px; letter-spacing: 1px;
            color: var(--setup-opt-inactive, #8892a3); text-transform: uppercase;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .eg-lf-field select, .eg-lf-field input[type="number"] {
            width: 100%; box-sizing: border-box; min-width: 0;
            font-family: var(--F, monospace); font-size: 13px;
            color: var(--accent2, #fff);
            background: rgba(0,0,0,0.35);
            border: 1px solid var(--border, #4a5475); border-radius: 3px;
            padding: 4px 7px;
            transition: border-color 0.12s, box-shadow 0.12s;
        }
        .eg-lf-field input[type="number"] { color: var(--accent, #66fcf1); }
        .eg-lf-field select:focus, .eg-lf-field input[type="number"]:focus {
            outline: none; border-color: var(--accent, #66fcf1);
            box-shadow: 0 0 6px rgba(102,252,241,0.3);
        }
        .eg-lf-field-dim { opacity: 0.4; }
        .eg-lf-zero-hint {
            font-family: var(--F, monospace); font-size: 10px; line-height: 1;
            color: var(--setup-opt-inactive, #8892a3); opacity: 0.85;
        }

        /* ── empty state ── */
        .eg-lf-empty {
            border: 1px dashed var(--border2, #656f96); border-radius: 4px;
            padding: 14px 10px; text-align: center;
            font-family: var(--F, monospace); font-size: 12.5px; line-height: 1.5;
            color: var(--setup-opt-inactive, #8892a3);
        }
        .eg-lf-empty-icon { display: block; font-size: 20px; opacity: 0.5; margin-bottom: 6px; }

        /* ── add button ── */
        .eg-lf-add {
            width: 100%; cursor: pointer;
            font-family: var(--PX, monospace); font-size: 9px; letter-spacing: 2px;
            padding: 9px;
            color: var(--accent, #66fcf1);
            background: rgba(102,252,241,0.03);
            border: 1px dashed var(--border2, #656f96); border-radius: 4px;
            transition: all 0.12s;
        }
        .eg-lf-add:hover {
            border-color: var(--accent, #66fcf1);
            background: rgba(102,252,241,0.08);
            box-shadow: 0 0 10px rgba(102,252,241,0.18);
        }

        /* ── footer (pinned: preview + save/cancel always visible) ── */
        .eg-lf-foot {
            flex-shrink: 0;
            border-top: 1px solid var(--border, #4a5475);
            background: rgba(0,0,0,0.18);
            padding: 9px 14px 12px;
        }
        .eg-lf-preview {
            text-align: center; min-height: 17px; margin-bottom: 8px;
            font-family: var(--F, monospace); font-size: 13px; letter-spacing: 0.5px;
            color: var(--accent2, #fff);
        }
        .eg-lf-n-vendor { color: var(--orange, #ff8c42); }
        .eg-lf-n-keep { color: var(--green, #3ddc84); }
        .eg-lf-btns { display: flex; gap: 10px; justify-content: center; }
        .eg-lf-btn {
            font-family: var(--PX, monospace); font-size: 10px; letter-spacing: 1px;
            padding: 9px 20px; cursor: pointer;
            color: var(--accent2, #fff);
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--border2, #656f96); border-radius: 4px;
            transition: all 0.12s;
        }
        .eg-lf-btn:hover { border-color: var(--accent, #66fcf1); color: var(--accent, #66fcf1); }
        .eg-lf-btn.eg-lf-save {
            color: #0c1016; background: var(--accent, #66fcf1);
            border-color: var(--accent, #66fcf1); font-weight: 700;
        }
        .eg-lf-btn.eg-lf-save:hover { box-shadow: 0 0 12px rgba(102,252,241,0.5); }

        /* ── narrow screens: stack rule fields in one column ── */
        @media (max-width: 620px) {
            .eg-lf-fields { grid-template-columns: 1fr; }
            .eg-lf-body { padding: 10px; }
            .eg-lf-foot { padding: 8px 10px 10px; }
        }
    `;
    document.head.appendChild(style);
}

function _egEnsureLootFilterModal() {
    _egInjectLootFilterStyles();
    let modal = document.getElementById('eg-loot-filter-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'eg-loot-filter-modal';
    modal.className = 'eg-lf-modal-bg';
    modal.innerHTML = `
<div class="eg-lf-box" id="eg-lf-box">
    <div class="eg-lf-head">
        <span class="eg-lf-head-icon">⚗</span>
        <span class="eg-lf-head-title">${t('eg_loot_filter_title')}</span>
        <button class="eg-lf-close" onclick="_eglfCloseModal()"
                title="${t('eg_loot_filter_close')}" aria-label="${t('eg_loot_filter_close')}">✕</button>
    </div>
    <div class="eg-lf-body">
        <div class="eg-lf-how">
            <div class="eg-lf-how-title">${t('eg_loot_filter_how')}</div>
            <div class="eg-lf-how-li"><span class="eg-lf-how-b">▸</span><span>${t('eg_loot_filter_b1')}</span></div>
            <div class="eg-lf-how-li"><span class="eg-lf-how-b">▸</span><span>${t('eg_loot_filter_b2')}</span></div>
            <div class="eg-lf-how-li"><span class="eg-lf-how-b">▸</span><span>${t('eg_loot_filter_b3')}</span></div>
        </div>
        <div class="eg-lf-toggles">
            <label class="eg-lf-toggle">
                <input type="checkbox" id="eg-lf-enabled" class="eg-lf-check">
                <span>${t('eg_loot_filter_enable')}</span>
            </label>
            <label class="eg-lf-toggle eg-lf-toggle-gold">
                <input type="checkbox" id="eg-lf-keep-unique" class="eg-lf-check">
                <span>${t('eg_loot_filter_keep_unique')}</span>
            </label>
        </div>
        <div class="eg-lf-rules-zone" id="eg-lf-rules-zone">
            <div class="eg-lf-section-head">
                <span class="eg-lf-section-title">${t('eg_loot_filter_rules_section')}</span>
                <span class="eg-lf-section-count" id="eg-lf-rules-count"></span>
                <span class="eg-lf-section-line"></span>
            </div>
            <div class="eg-lf-rules" id="eg-lf-rules"></div>
            <button class="eg-lf-add" onclick="_eglfAddRule()">+ ${t('eg_loot_filter_add_rule')}</button>
        </div>
    </div>
    <div class="eg-lf-foot">
        <div class="eg-lf-preview" id="eg-lf-preview"></div>
        <div class="eg-lf-btns">
            <button class="eg-lf-btn eg-lf-save" onclick="_eglfSaveModal()">${t('eg_mass_sell_save')}</button>
            <button class="eg-lf-btn" onclick="_eglfCloseModal()">${t('reset_cancel')}</button>
        </div>
    </div>
</div>`;
    // Clicking the dimmed backdrop closes the modal (but not clicks inside the box).
    modal.addEventListener('click', (e) => { if (e.target === modal) _eglfCloseModal(); });
    document.body.appendChild(modal);
    return modal;
}

function _eglfRuleHTML(rule, idx) {
    const slotOpts = ['<option value="any"' + (rule.slot === 'any' ? ' selected' : '') + '>' + t('eg_loot_filter_any') + '</option>']
        .concat(_eglfSlotTypes().map(s =>
            `<option value="${s}"${rule.slot === s ? ' selected' : ''}>${s}</option>`))
        .join('');
    const bases = _eglfBasesForSlot(rule.slot);
    const baseOpts = ['<option value="any"' + (rule.baseId === 'any' ? ' selected' : '') + '>' + t('eg_loot_filter_any') + '</option>']
        .concat(bases.map(b =>
            `<option value="${_eglfEscapeHTML(b.id)}"${rule.baseId === b.id ? ' selected' : ''}>${_eglfEscapeHTML((LANG === 'de' && b.nameDe) ? b.nameDe : b.name)}</option>`))
        .join('');
    const modModeOpts = [
        ['none', t('eg_loot_filter_mod_none')],
        ['has_t1', t('eg_loot_filter_mod_has_t1')],
        ['not_has', t('eg_loot_filter_mod_not_has')],
    ].map(([v, label]) =>
        `<option value="${v}"${rule.modMode === v ? ' selected' : ''}>${label}</option>`).join('');
    const fams = rule.slot === 'any' ? _eglfAllModFamilies() : _eglfModFamiliesForSlot(rule.slot);
    const famOpts = ['<option value="">' + t('eg_loot_filter_any') + '</option>']
        .concat(fams.map(f =>
            `<option value="${_eglfEscapeHTML(f.id)}"${rule.modFamily === f.id ? ' selected' : ''}>${_eglfEscapeHTML(f.label)}</option>`))
        .join('');

    const modFieldDim = rule.modMode === 'none' ? ' eg-lf-field-dim' : '';
    const maxT1Opts = ['<option value=""' + (rule.maxT1 == null ? ' selected' : '') + '>' + t('eg_loot_filter_any') + '</option>']
        .concat([0, 1, 2, 3, 4, 5, 6].map(n =>
            `<option value="${n}"${rule.maxT1 === n ? ' selected' : ''}>${n}</option>`))
        .join('');
    return `
<div class="eg-lf-rule${rule.enabled ? '' : ' eg-lf-rule-off'}">
    <div class="eg-lf-rule-head">
        <input type="checkbox" class="eg-lf-check" ${rule.enabled ? 'checked' : ''}
               onchange="_eglfSetRule(${idx}, 'enabled', this.checked)" title="${t('eg_loot_filter_rule_enable')}">
        <span class="eg-lf-rule-title">${t('eg_loot_filter_rule')} ${idx + 1}</span>
        <button class="eg-lf-rule-del" onclick="_eglfDelRule(${idx})" title="${t('eg_loot_filter_rule_del')}">✕</button>
    </div>
    <div class="eg-lf-fields">
        <div class="eg-lf-field">
            <label>${t('eg_loot_filter_slot')}</label>
            <select onchange="_eglfSetRule(${idx}, 'slot', this.value)">${slotOpts}</select>
        </div>
        <div class="eg-lf-field">
            <label>${t('eg_loot_filter_base')}</label>
            <select onchange="_eglfSetRule(${idx}, 'baseId', this.value)">${baseOpts}</select>
        </div>
        <div class="eg-lf-field">
            <label>${t('eg_loot_filter_max_ilvl')}</label>
            <input type="number" min="0" max="100" step="1" value="${rule.maxIlvl}"
                   onchange="_eglfSetRule(${idx}, 'maxIlvl', this.value)">
            <span class="eg-lf-zero-hint">${t('eg_loot_filter_zero_off')}</span>
        </div>
        <div class="eg-lf-field">
            <label>${t('eg_loot_filter_max_reqlvl')}</label>
            <input type="number" min="0" max="100" step="1" value="${rule.maxReq}"
                   onchange="_eglfSetRule(${idx}, 'maxReq', this.value)">
            <span class="eg-lf-zero-hint">${t('eg_loot_filter_zero_off')}</span>
        </div>
        <div class="eg-lf-field">
            <label>${t('eg_loot_filter_mod_mode')}</label>
            <select onchange="_eglfSetRule(${idx}, 'modMode', this.value)">${modModeOpts}</select>
        </div>
        <div class="eg-lf-field">
            <label>${t('eg_loot_filter_max_t1')}</label>
            <select onchange="_eglfSetRule(${idx}, 'maxT1', this.value)">${maxT1Opts}</select>
        </div>
        <div class="eg-lf-field${modFieldDim}">
            <label>${t('eg_loot_filter_mod_family')}</label>
            <select onchange="_eglfSetRule(${idx}, 'modFamily', this.value)">${famOpts}</select>
        </div>
    </div>
</div>`;
}

function _eglfRenderRules() {
    const wrap = document.getElementById('eg-lf-rules');
    if (!wrap || !_eglfWorking) return;
    wrap.innerHTML = _eglfWorking.rules.length === 0
        ? `<div class="eg-lf-empty"><span class="eg-lf-empty-icon">🗃</span>${t('eg_loot_filter_no_rules')}</div>`
        : _eglfWorking.rules.map((r, i) => _eglfRuleHTML(r, i)).join('');
}

function _eglfUpdatePreview() {
    const preview = document.getElementById('eg-lf-preview');
    if (!preview || !_eglfWorking) return;
    let keep = 0, vendor = 0;
    if (typeof _egInventory !== 'undefined' && _egInventory) {
        // Evaluate against the working copy without touching live state.
        const live = _egLootFilter;
        _egLootFilter = _eglfWorking;
        try {
            for (let r = 0; r < _egInventory.length; r++) {
                for (let c = 0; c < EG_INV_COLS; c++) {
                    const it = _egInventory[r][c];
                    if (!it || it.category !== 'equip') continue;
                    if (_egLootFilterShouldVendor(it)) vendor++; else keep++;
                }
            }
        } finally {
            _egLootFilter = live;
        }
    }
    preview.innerHTML = t('eg_loot_filter_preview')
        .replace('{vendor}', `<span class="eg-lf-n-vendor">${vendor}</span>`)
        .replace('{keep}', `<span class="eg-lf-n-keep">${keep}</span>`);
}

function _eglfRenderModalContent() {
    if (!_egLootFilter) _egLoadLootFilter();
    _eglfWorking = JSON.parse(JSON.stringify(_egLootFilter));
    const enabled = document.getElementById('eg-lf-enabled');
    const keepUnique = document.getElementById('eg-lf-keep-unique');
    if (enabled) {
        enabled.checked = !!_eglfWorking.enabled;
        enabled.onchange = () => { _eglfWorking.enabled = enabled.checked; _eglfSyncChrome(); _eglfUpdatePreview(); };
    }
    if (keepUnique) {
        keepUnique.checked = !!_eglfWorking.keepUnique;
        keepUnique.onchange = () => { _eglfWorking.keepUnique = keepUnique.checked; _eglfUpdatePreview(); };
    }
    _eglfRenderRules();
    _eglfSyncChrome();
    _eglfUpdatePreview();
}

// Keeps the non-form chrome in sync with the working copy: the rule count
// in the section header and the dimmed rules zone while the filter is off.
function _eglfSyncChrome() {
    if (!_eglfWorking) return;
    const box = document.getElementById('eg-lf-box');
    if (box) box.classList.toggle('eg-lf-off', !_eglfWorking.enabled);
    const count = document.getElementById('eg-lf-rules-count');
    if (count) count.textContent = `· ${_eglfWorking.rules.length}`;
}

// Re-applies the static shell strings on every open so a language switch
// mid-session is picked up (the shell markup itself is built only once).
function _eglfRenderStaticText(modal) {
    const title = modal.querySelector('.eg-lf-head-title');
    if (title) title.textContent = t('eg_loot_filter_title');
    const close = modal.querySelector('.eg-lf-close');
    if (close) {
        close.title = t('eg_loot_filter_close');
        close.setAttribute('aria-label', t('eg_loot_filter_close'));
    }
    const howTitle = modal.querySelector('.eg-lf-how-title');
    if (howTitle) howTitle.textContent = t('eg_loot_filter_how');
    const bullets = ['eg_loot_filter_b1', 'eg_loot_filter_b2', 'eg_loot_filter_b3'];
    modal.querySelectorAll('.eg-lf-how-li > span:last-child').forEach((el, i) => {
        if (bullets[i]) el.textContent = t(bullets[i]);
    });
    const toggleSpans = modal.querySelectorAll('.eg-lf-toggles .eg-lf-toggle > span');
    if (toggleSpans[0]) toggleSpans[0].textContent = t('eg_loot_filter_enable');
    if (toggleSpans[1]) toggleSpans[1].textContent = t('eg_loot_filter_keep_unique');
    const sectionTitle = modal.querySelector('.eg-lf-section-title');
    if (sectionTitle) sectionTitle.textContent = t('eg_loot_filter_rules_section');
    const addBtn = modal.querySelector('.eg-lf-add');
    if (addBtn) addBtn.textContent = `+ ${t('eg_loot_filter_add_rule')}`;
    const saveBtn = modal.querySelector('.eg-lf-btn.eg-lf-save');
    if (saveBtn) saveBtn.textContent = t('eg_mass_sell_save');
    const cancelBtn = modal.querySelector('.eg-lf-foot .eg-lf-btn:not(.eg-lf-save)');
    if (cancelBtn) cancelBtn.textContent = t('reset_cancel');
}

function _egOpenLootFilterModal() {
    if (!_egLootFilter) _egLoadLootFilter();
    const modal = _egEnsureLootFilterModal();
    _eglfRenderStaticText(modal);
    _eglfRenderModalContent();
    modal.classList.add('show');
}

function _eglfCloseModal() {
    const modal = document.getElementById('eg-loot-filter-modal');
    if (modal) modal.classList.remove('show');
    _eglfWorking = null;
}

function _eglfSaveModal() {
    if (!_eglfWorking) return;
    _egLootFilter = _eglfNormaliseState(_eglfWorking);
    _eglfWorking = null;
    _egSaveLootFilter();
    _eglfCloseModal();
    if (typeof showToast === 'function') showToast(t('eg_loot_filter_saved'));
}

// ── Rule editing handlers (called from inline onchange/onclick) ──────
function _eglfSetRule(idx, field, value) {
    if (!_eglfWorking || !_eglfWorking.rules[idx]) return;
    const rule = _eglfWorking.rules[idx];
    if (field === 'enabled') rule.enabled = !!value;
    else if (field === 'maxIlvl' || field === 'maxReq') {
        const n = parseInt(value, 10);
        rule[field] = (isNaN(n) || n < 0) ? 0 : Math.min(100, n);
        _eglfRenderRules(); // show the clamped value back in the input
    } else if (field === 'slot') {
        // Reset dependent selections when the slot changes.
        rule.slot = value || 'any';
        const bases = _eglfBasesForSlot(rule.slot);
        if (rule.baseId !== 'any' && !bases.some(b => b.id === rule.baseId)) rule.baseId = 'any';
        _eglfRenderRules();
    } else if (field === 'modMode') {
        // Re-render so the modifier-family field dims while it is unused.
        rule.modMode = ['none', 'has_t1', 'not_has'].includes(value) ? value : 'none';
        _eglfRenderRules();
    } else if (field === 'maxT1') {
        // '' = off (Any); otherwise an upper bound of 0..6 T1 mods.
        const n = parseInt(value, 10);
        rule.maxT1 = (isNaN(n) || n < 0) ? null : Math.min(6, n);
        _eglfRenderRules(); // show the clamped value back in the select
    } else {
        rule[field] = String(value || '');
    }
    _eglfUpdatePreview();
}

function _eglfAddRule() {
    if (!_eglfWorking) return;
    _eglfWorking.rules.push(_eglfNormaliseRule({ enabled: true }));
    _eglfRenderRules();
    _eglfSyncChrome();
    _eglfUpdatePreview();
}

function _eglfDelRule(idx) {
    if (!_eglfWorking || !_eglfWorking.rules[idx]) return;
    _eglfWorking.rules.splice(idx, 1);
    _eglfRenderRules();
    _eglfSyncChrome();
    _eglfUpdatePreview();
}

// Global Escape handler — closes the loot filter overlay when open.
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const m = document.getElementById('eg-loot-filter-modal');
        if (m && m.classList.contains('show')) {
            _eglfCloseModal();
            e.preventDefault();
            e.stopPropagation();
        }
    }
});


//------------------------------------------------------------------------
//-------------------STASH BUTTON TOOLTIP---------------------------------
//------------------------------------------------------------------------

function _egShowLootFilterTooltip(e) {
    if (!_egLootFilter) _egLoadLootFilter();
    const state = _egLootFilter.enabled
        ? t('eg_loot_filter_state_on').replace('{n}', String(_egLootFilter.rules.filter(r => r.enabled).length))
        : t('eg_loot_filter_state_off');
    const html = `
<div class="eg-tt-frame" style="--tt-border:#c8a84b;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">⚗</div>
        <div class="eg-tt-name" style="color:#f5d98a;">${t('eg_loot_filter_title')}</div>
    </div>
    <div class="eg-tt-section">
        <div class="eg-tt-desc">${state}</div>
    </div>
</div>`;
    showGameTooltip(html, e);
}
