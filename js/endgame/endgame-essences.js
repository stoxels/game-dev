//------------------------------------------------------------------------
//-------------------ENDGAME ESSENCES (PoE-STYLE)-------------------------
//------------------------------------------------------------------------
// Defines essences that drop from monsters, stack in the essence tab
// (right of the character sheet, above the stash), and can be applied to
// ANY equipment item regardless of rarity via right-click-then-left-click
// ("use mode", same interaction as currency orbs).
//
// Essence semantics (NEW — per-modifier v2):
//   One essence per individual modifier family (92 total). The target
//   item is stripped of ALL its modifiers and re-forged into an EPIC
//   item with exactly ONE guaranteed modifier (the essence's specific
//   family) plus 3-5 additional random modifiers (4-6 total), rolled
//   according to the normal prefix/suffix rules (epic caps, ilvl gating,
//   no duplicate families, base-stat-gated local defenses).
//   The guaranteed tier is rolled from the tiers eligible at the item's
//   level — low ilvl can only reach low tiers.
//   If the target base cannot roll that family at all (wrong slotType or
//   missing local defense stat) the essence cannot be used and an error
//   is shown / essence is not consumed.
//
// Load AFTER endgame-equipment-generator.js (needs _egGetModTable,
// _egEligibleTiers, _egPickTier, _egBuildRolledStats, _egBuildModPool,
// _egPickModFromPool, _egFamilyAllowedOnBase, EG_MOD_CAPS),
// AFTER endgame-hub.js + endgame-hub-drag-and-drop.js (stash state,
// render helpers, chip builder) and AFTER endgame-currency.js (its
// document-level use-mode listeners must register first so orb mode and
// essence mode cannot be active at once).
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------

// Essence stash dimensions — fixed PoE-style tab with pre-assigned slots
// (mirrors the Orbs & Shards currency tab). Every essence id has a
// dedicated cell; hovering an empty cell still shows its essence tooltip.
// 12 rows × 8 cols = 96 cells → 92 modifier essences + 4 decorative empties
// (plus 7 legacy group-essences kept for save compat → 13 rows = 104 cells).
const EG_ESSENCE_ROWS = 13;
const EG_ESSENCE_COLS = 8;

// Essence filter state
let _egEssenceFilterSlotType = 'all'; // 'all' or a slotType like 'shield', 'weapon', etc.

// Essence stash: 2D grid of stacked essence items (null = empty cell)
let _egEssenceStash = Array.from({ length: EG_ESSENCE_ROWS }, () => Array(EG_ESSENCE_COLS).fill(null));


//------------------------------------------------------------------------
//-------------------PER-MODIFIER ESSENCE REGISTRY-------------------------
//------------------------------------------------------------------------

// Complete list of individual modifier families — one essence per family.
const _EG_ESSENCE_FAMILIES = [
    'absorption_on_kill','absorption_regen_rate','accuracy','agility','arcane_resistance','arcane_surge',
    'attack_speed','block_chance','block_recovery','chain','chance_for_new_question','chance_to_blind',
    'chance_to_convert','chance_to_freeze','chance_to_ignite','chance_to_shock','channel','cleave',
    'cold_damage','cold_resist','crit_chance','crit_multiplier','deflect','deflect_damage','dodge','echo',
    'faster_absorption_regen_start','fate','fire_damage','fire_resist','first_step','flat_absorption',
    'flat_armour','flat_evasion','flat_health','flat_mana','flat_physical_damage','focus','grounded',
    'heart_heal','hybrid_armour_absorption','hybrid_armour_evasion','hybrid_evasion_absorption','hybrid_evasion_armour',
    'hybrid_life_absorption','hybrid_life_armour','hybrid_life_evasion','hybrid_mana_absorption','hybrid_mana_armour',
    'hybrid_mana_evasion','inc_absorption','inc_armour','inc_evasion','inc_heart_heal','inc_mana_heal',
    'inc_physical_damage','inc_spell_damage','intelligence','life_leech','life_on_kill','life_regen',
    'lightning_damage','lightning_resist','mana_heal','mana_on_kill','mana_on_mistake','mana_regen',
    'mana_to_damage','mistake_count','mistake_not_count','movement_speed','multishot','overkill','parry',
    'pierce','precision_damage','precision_regen','preemptive_dodge','pushback','reveal_hint','shadow_damage',
    'shadow_resist','shield_bash','snipe','spell_block_chance','spell_damage','spell_dodge','splash_damage',
    'stagger','strength','time_added','warding',
];

// Legacy group essences kept for save compatibility (no longer drop)
const _EG_LEGACY_ESSENCE_IDS = [
    'essence_vitality','essence_might','essence_sorcery','essence_swiftness',
    'essence_fortress','essence_elements','essence_puzzle',
];

// Visual variety — cycle through a set of emojis so 92 essences don't all look identical.
// Kept intentionally diverse (hearts, elements, combat, jewelry) but deterministic.
const _EG_ESSENCE_ICON_CYCLE = [
    '💚','💙','❤️','🧡','💛','💜','🤍','🔴','🟠','🟡','🟢','🔵','🟣','⚪','⚫','🟤',
    '🔥','❄️','⚡','🌑','✨','⭐','💫','🌟','💠','🔷','🔶','🌀','🧩','⚔️','🛡️','🏹',
    '🎯','🔮','🧪','💎','👑','💍','🧥','🥋','🦾','🧤','🔗','👖','👢','📿','🪬','🧬',
    '☄️','🌌','🌸','🏺','🙏','💀','🧠','⚙️','🔧','🪞','🍀','🎲','🎰','🃏','🀄','🧿',
    '👁️','🫀','🗡️','🏆','🌙','☀️','🌈','🍃','🌿','🪶','🦾','🦿','🧱','🏰','⚗️','🧲',
    '🔬','📚','🎭','🎨','🎼','🎵','🎶','🔔','📯','⚓','🧭','🗺️'
];

// Fixed assignment: essence id → {r,c}. Mirrors the Orbs & Shards tab.
const EG_ESSENCE_SLOT_MAP = {};
(function _egBuildEssenceSlotMap() {
    let idx = 0;
    for (const fam of _EG_ESSENCE_FAMILIES) {
        const id = 'essence_' + fam;
        const r = Math.floor(idx / EG_ESSENCE_COLS);
        const c = idx % EG_ESSENCE_COLS;
        EG_ESSENCE_SLOT_MAP[id] = { r, c };
        idx++;
    }
    for (const legId of _EG_LEGACY_ESSENCE_IDS) {
        const r = Math.floor(idx / EG_ESSENCE_COLS);
        const c = idx % EG_ESSENCE_COLS;
        EG_ESSENCE_SLOT_MAP[legId] = { r, c };
        idx++;
    }
})();
const EG_ESSENCE_SLOT_REVERSE = (() => {
    const m = {};
    for (const [id, pos] of Object.entries(EG_ESSENCE_SLOT_MAP)) m[`${pos.r}-${pos.c}`] = id;
    return m;
})();
function _egEssenceSlotForId(id) { return EG_ESSENCE_SLOT_MAP[id] || null; }
function _egEssenceIdForSlot(r, c) { return EG_ESSENCE_SLOT_REVERSE[`${r}-${c}`] || null; }
function _egEssenceDefForId(id) {
    if (typeof EG_ESSENCE_DEFS !== 'undefined' && EG_ESSENCE_DEFS[id]) return EG_ESSENCE_DEFS[id];
    return null;
}


// Resolves the guaranteed family for a stash item/def robustly. Never trust
// only the object's own fields — legacy or partially-constructed stash items
// (e.g. built from a stripped-down drop "def") can be missing
// guaranteedFamily/guaranteedFamilies even though the canonical
// EG_ESSENCE_DEFS entry for the same id has them. Falling back to the
// canonical def by id prevents such items from silently bypassing the
// slot-type filter.
function _egEssenceResolveFamilyId(itemOrDef) {
    if (!itemOrDef) return null;
    let familyId = itemOrDef.guaranteedFamily
        || (itemOrDef.guaranteedFamilies && itemOrDef.guaranteedFamilies[0]);
    if (familyId) return familyId;
    const canonical = itemOrDef.id ? _egEssenceDefForId(itemOrDef.id) : null;
    if (canonical) {
        familyId = canonical.guaranteedFamily
            || (canonical.guaranteedFamilies && canonical.guaranteedFamilies[0]);
    }
    return familyId || null;
}

// Helper: humanized fallback name when translation key missing
function _egEssenceFallbackName(familyId) {
    const disp = (typeof _egEssenceFamilyDisplayName === 'function')
        ? _egEssenceFamilyDisplayName(familyId) : familyId;
    return 'Essence of ' + disp;
}
function _egEssenceFallbackNameDe(familyId) {
    const disp = (typeof _egEssenceFamilyDisplayName === 'function')
        ? _egEssenceFamilyDisplayName(familyId) : familyId;
    return 'Essenz der ' + disp;
}
function _egEssenceCompatibleSlotTypes(familyId) {
    if (typeof EG_SLOT_MOD_TABLE_MAP === 'undefined') return [];
    const slots = [];
    for (const [slotType, getter] of Object.entries(EG_SLOT_MOD_TABLE_MAP)) {
        let tbl = null;
        try { tbl = getter(); } catch (e) { continue; }
        if (!tbl) continue;
        if ((tbl.prefixes && tbl.prefixes[familyId]) || (tbl.suffixes && tbl.suffixes[familyId])) {
            slots.push(slotType);
        }
    }
    return slots;
}
function _egEssenceCanApplyToItem(familyId, item) {
    const modTable = _egGetModTable(item);
    if (!modTable) return false;
    const hasFamily = (modTable.prefixes && modTable.prefixes[familyId]) || (modTable.suffixes && modTable.suffixes[familyId]);
    if (!hasFamily) return false;
    if (!_egFamilyAllowedOnBase(familyId, item.defenses)) return false;
    // also need at least one eligible tier at itemLevel
    const sections = [modTable.prefixes||{}, modTable.suffixes||{}];
    for (const sec of sections) {
        const fam = sec[familyId];
        if (!fam) continue;
        const tiers = _egEligibleTiers(fam, item.itemLevel || 1);
        if (tiers && tiers.length > 0) return true;
    }
    return false;
}


//------------------------------------------------------------------------
//-------------------ESSENCE FILTER HELPERS------------------------------
//------------------------------------------------------------------------

// Returns all slot types that have at least one essence compatible with them
function _egGetEssenceFilterSlotTypes() {
    const slotTypes = new Set();
    for (const familyId of _EG_ESSENCE_FAMILIES) {
        const slots = _egEssenceCompatibleSlotTypes(familyId);
        for (const slot of slots) {
            if (_egEssenceCanApplyToSlotType(familyId, slot)) {
                slotTypes.add(slot);
            }
        }
    }
    return Array.from(slotTypes).sort();
}

// Checks if an essence (by familyId) is compatible with the current filter
function _egEssenceMatchesFilter(familyId) {
    if (_egEssenceFilterSlotType === 'all') return true;
    const result = _egEssenceCanApplyToSlotType(familyId, _egEssenceFilterSlotType);
    console.log(`[ESS FILTER] _egEssenceMatchesFilter(${familyId}, ${_egEssenceFilterSlotType}) = ${result}`);
    return result;
}

// More thorough check: verifies the essence family can actually roll on at least one base of the filtered slot type
// (considers defense gating and ilvl eligibility, not just mod table presence)
function _egEssenceCanApplyToSlotType(familyId, slotType) {
    if (typeof EG_SLOT_MOD_TABLE_MAP === 'undefined') {
        console.warn('[ESS FILTER] EG_SLOT_MOD_TABLE_MAP undefined');
        return false;
    }
    const getter = EG_SLOT_MOD_TABLE_MAP[slotType];
    if (!getter) {
        console.warn(`[ESS FILTER] No getter for slotType: ${slotType}`);
        return false;
    }
    let modTable = null;
    try { modTable = getter(); } catch (e) { 
        console.warn(`[ESS FILTER] Error getting mod table for ${slotType}:`, e);
        return false; 
    }
    if (!modTable) {
        console.warn(`[ESS FILTER] modTable is null/undefined for ${slotType}`);
        return false;
    }

    const hasFamily = (modTable.prefixes && modTable.prefixes[familyId]) || (modTable.suffixes && modTable.suffixes[familyId]);
    if (!hasFamily) {
        console.log(`[ESS FILTER] Family ${familyId} not in mod table for ${slotType}`);
        return false;
    }

    if (typeof EG_ALL_BASE_TYPES === 'undefined') {
        console.warn('[ESS FILTER] EG_ALL_BASE_TYPES undefined, returning true');
        return true;
    }

    for (const base of EG_ALL_BASE_TYPES) {
        if (base.slotType !== slotType) continue;
        const defenses = base.defenses || {};
        if (!_egFamilyAllowedOnBase(familyId, defenses)) continue;
        const sections = [modTable.prefixes || {}, modTable.suffixes || {}];
        for (const sec of sections) {
            const fam = sec[familyId];
            if (!fam) continue;
            const tiers = _egEligibleTiers(fam, base.minLevel || 1);
            if (tiers && tiers.length > 0) return true;
        }
    }
    return false;
}

// Sets the essence filter and re-renders the essence tab
function _egSetEssenceFilter(slotType) {
    console.log(`[ESS FILTER] Setting filter to: ${slotType}`);
    _egEssenceFilterSlotType = slotType;
    _egRenderEssenceStash();
    // Update the dropdown to reflect the current selection
    const select = document.getElementById('eg-essence-filter-select');
    if (select) select.value = slotType;
}


//------------------------------------------------------------------------
//-------------------ESSENCE CRAFTING LOGIC-------------------------------
//------------------------------------------------------------------------

// Rolls the GUARANTEED modifier for an essence application.
// Now single-family: looks for the family in either prefix or suffix section,
// checks defense gating and ilvl eligibility, and rolls a random eligible tier.
function _egRollGuaranteedMod(modTable, preferredFamilies, itemLevel, defenses) {
    const families = Array.isArray(preferredFamilies) ? preferredFamilies : [preferredFamilies];
    const sections = [
        { type: 'prefix', pool: modTable.prefixes || {} },
        { type: 'suffix', pool: modTable.suffixes || {} },
    ];
    for (const familyId of families) {
        for (const sec of sections) {
            const family = sec.pool[familyId];
            if (!family) continue;
            if (!_egFamilyAllowedOnBase(familyId, defenses)) continue;
            const tiers = _egEligibleTiers(family, itemLevel);
            if (!tiers || tiers.length === 0) continue;
            const tier = _egPickTier(tiers);
            if (!tier) continue;
            return {
                familyId,
                type: sec.type,
                tier: tier.tier,
                rolledStats: _egBuildRolledStats(family, tier),
            };
        }
    }
    return null;
}

// Core essence re-forge. Returns the new EPIC item, or null when the item
// has no usable mod table or the guaranteed family cannot roll on this base.
function _egApplyEssenceCraft(item, def) {
    const modTable = _egGetModTable(item);
    if (!modTable) return null;
    // Epic caps per spec
    const cap = EG_MOD_CAPS.epic;
    const itemLevel = item.itemLevel || 1;
    const mods = [];
    const chosenFamilyIds = new Set();
    const families = def.guaranteedFamilies || (def.guaranteedFamily ? [def.guaranteedFamily] : []);
    // 1 guaranteed modifier — must succeed or the craft is incompatible
    let preCount = 0;
    let sufCount = 0;
    const guaranteed = _egRollGuaranteedMod(modTable, families, itemLevel, item.defenses);
    if (!guaranteed) return null;
    mods.push(guaranteed);
    chosenFamilyIds.add(guaranteed.familyId);
    if (guaranteed.type === 'prefix') preCount++; else sufCount++;

    // 3-5 additional random modifiers → 4-6 total (epic: 5-6 range but allow 4 when pool limited)
    let extra = 3 + Math.floor(Math.random() * 3); // 3..5
    const maxExtra = Math.min(
        cap.maxTotal - mods.length,
        (cap.maxPre - preCount) + (cap.maxSuf - sufCount)
    );
    extra = Math.min(extra, maxExtra);
    extra = Math.max(0, extra);

    for (let i = 0; i < extra; i++) {
        const options = [];
        if (preCount < cap.maxPre) {
            const pool = _egBuildModPool(modTable.prefixes || {}, itemLevel, chosenFamilyIds, item.defenses);
            if (pool.length > 0) options.push({ type: 'prefix', pool });
        }
        if (sufCount < cap.maxSuf) {
            const pool = _egBuildModPool(modTable.suffixes || {}, itemLevel, chosenFamilyIds, item.defenses);
            if (pool.length > 0) options.push({ type: 'suffix', pool });
        }
        if (options.length === 0) break;
        const sec = options[Math.floor(Math.random() * options.length)];
        const entry = _egPickModFromPool(sec.pool);
        if (!entry) break;
        const tier = _egPickTier(entry.tiers);
        if (!tier) break;
        chosenFamilyIds.add(entry.familyId);
        if (sec.type === 'prefix') preCount++; else sufCount++;
        mods.push({
            familyId: entry.familyId,
            type: sec.type,
            tier: tier.tier,
            rolledStats: _egBuildRolledStats(entry.family, tier),
        });
    }

    // Ensure at least 4 mods for epic feel when pool allowed — if we ended <4 try to fill
    // (spec: 4-6) — already 1+3 =4 minimum, so okay.

    const name = _egBuildItemName(item.baseName || item.name, 'epic', mods);
    return { ...item, rarity: 'epic', mods, name };
}


//------------------------------------------------------------------------
//-------------------ESSENCE DEFINITIONS----------------------------------
//------------------------------------------------------------------------

const EG_ESSENCE_DEFS = {};

// Generate per-modifier essences
(function _egBuildPerModEssences() {
    _EG_ESSENCE_FAMILIES.forEach((familyId, idx) => {
        const id = 'essence_' + familyId;
        const icon = _EG_ESSENCE_ICON_CYCLE[idx % _EG_ESSENCE_ICON_CYCLE.length];
        const tNameKey = 'eg_essence_' + familyId;
        const tDescKey = 'eg_essence_' + familyId + '_desc';
        let name = null, desc = null;
        try { const tr = t(tNameKey); if (tr && tr !== tNameKey) name = tr; } catch(e) {}
        try { const tr = t(tDescKey); if (tr && tr !== tDescKey) desc = tr; } catch(e) {}
        if (!name) {
            const disp = (typeof _egEssenceFamilyDisplayName === 'function') ? _egEssenceFamilyDisplayName(familyId) : familyId;
            name = (typeof LANG !== 'undefined' && LANG === 'de') ? ('Essenz der ' + disp) : ('Essence of ' + disp);
        }
        if (!desc) {
            const disp = (typeof _egEssenceFamilyDisplayName === 'function') ? _egEssenceFamilyDisplayName(familyId) : familyId;
            const isDe = (typeof LANG !== 'undefined' && LANG === 'de');
            if (isDe) {
                desc = `Schmiedet einen Gegenstand beliebiger Seltenheit in einen epischen Gegenstand um (4–6 Modifikatoren) mit garantiertem Modifikator: ${disp}. Funktioniert nur auf Basen, die diesen Mod haben können. Tier hängt vom Itemlevel ab. Alle vorhandenen Modifikatoren gehen verloren.`;
            } else {
                desc = `Re-forges any item of any rarity into an epic item (4–6 modifiers) with a guaranteed ${disp} modifier. Only works on bases that can roll this modifier. Tier depends on item level. All existing modifiers are lost.`;
            }
        }
        EG_ESSENCE_DEFS[id] = {
            id,
            name,
            icon,
            description: desc,
            category: 'essence',
            rarity: 'essence',
            guaranteedFamily: familyId,
            guaranteedFamilies: [familyId],
        };
    });
    // Legacy group essences — kept for save compat (no longer in drop table)
    const legacyMap = {
        essence_vitality: { families: ['flat_health','hybrid_life_evasion','hybrid_life_armour','hybrid_life_absorption','life_regen','life_on_kill','heart_heal'], icon: '💚' },
        essence_might: { families: ['inc_physical_damage','flat_physical_damage','crit_multiplier','crit_chance','precision_damage','strength','flat_health'], icon: '🔴' },
        essence_sorcery: { families: ['spell_damage','inc_spell_damage','flat_mana','intelligence','mana_regen','arcane_surge'], icon: '🔮' },
        essence_swiftness: { families: ['attack_speed','flat_evasion','inc_evasion','dodge','agility','hybrid_evasion_absorption'], icon: '🟢' },
        essence_fortress: { families: ['flat_armour','inc_armour','flat_absorption','inc_absorption','hybrid_armour_evasion','hybrid_armour_absorption','block_chance','flat_health'], icon: '🟡' },
        essence_elements: { families: ['fire_damage','cold_damage','lightning_damage','shadow_damage','fire_resist','cold_resist','lightning_resist','arcane_resistance','shadow_resist'], icon: '🌀' },
        essence_puzzle: { families: ['time_added','mistake_count','mistake_not_count','focus','reveal_hint','chance_for_new_question'], icon: '🧩' },
    };
    for (const [legId, cfg] of Object.entries(legacyMap)) {
        if (EG_ESSENCE_DEFS[legId]) continue;
        let n=null,d=null;
        try { const tr=t(legId); if(tr&&tr!==legId) n=tr; }catch(e){}
        try { const tr=t(legId+'_desc'); if(tr&&tr!==legId+'_desc') d=tr; }catch(e){}
        EG_ESSENCE_DEFS[legId] = {
            id: legId,
            name: n || legId,
            icon: cfg.icon,
            description: d || '',
            category: 'essence',
            rarity: 'essence',
            guaranteedFamilies: cfg.families,
        };
    }
})();

// Keep reference for legacy t-keys (already populated above)
// Note: egAddEssence fixed-slot logic below handles both new and legacy ids.


//------------------------------------------------------------------------
//-------------------ESSENCE TOOLTIP HELPERS (PoE-STYLE)------------------
//------------------------------------------------------------------------
// Human-readable family display (EN/DE). Prefer the mod's own label stripped of
// placeholders, fall back to a title-cased familyId.  Hybrid families are
// joined with " + ".
function _egEssenceFamilyDisplayName(familyId) {
    let raw = null;
    let rawDe = null;
    if (typeof EG_SLOT_MOD_TABLE_MAP !== 'undefined') {
        for (const getter of Object.values(EG_SLOT_MOD_TABLE_MAP)) {
            let tbl = null;
            try { tbl = getter(); } catch (e) { continue; }
            if (!tbl) continue;
            const f = (tbl.prefixes && tbl.prefixes[familyId]) || (tbl.suffixes && tbl.suffixes[familyId]);
            if (f) { raw = f.label || null; rawDe = f.labelDe || null; break; }
        }
    }
    const labelSrc = (typeof LANG !== 'undefined' && LANG === 'de' && rawDe) ? rawDe : raw;
    if (labelSrc) {
        const isAdds = labelSrc.includes('Adds #') || labelSrc.includes('Fügt') || labelSrc.includes('Adds');
        if (!isAdds) {
            const lines = labelSrc.split('\n');
            const cleaned = lines.map(line => {
                let c = line.replace(/[#@]/g, '').trim();
                c = c.replace(/^\+\s*/, '').trim();
                c = c.replace(/^to\s+/i, '').trim();
                c = c.replace(/^zu\s+/i, '').trim();
                c = c.replace(/\s+/g, ' ').trim();
                return c;
            }).filter(Boolean);
            if (cleaned.length > 0) {
                const joined = cleaned.join(' + ');
                if (joined && joined.toLowerCase() !== 'adds to' && joined.length > 2) return joined;
            }
        }
    }
    const deMap = {
        flat_health: 'Maximales Leben', hybrid_life_armour: 'Leben + Rüstung', hybrid_life_evasion: 'Leben + Ausweichen',
        hybrid_life_absorption: 'Leben + Absorption', life_regen: 'Lebensregeneration', life_on_kill: 'Leben bei Kill',
        heart_heal: 'Herzheilung', inc_physical_damage: 'Erhöhter physischer Schaden', flat_physical_damage: 'Physischer Schaden',
        crit_multiplier: 'Kritischer Schaden', crit_chance: 'Kritische Trefferchance', precision_damage: 'Präzisionsschaden',
        strength: 'Stärke', flat_mana: 'Maximales Mana', spell_damage: 'Zauberschaden', inc_spell_damage: 'Erhöhter Zauberschaden',
        intelligence: 'Intelligenz', mana_regen: 'Manaregeneration', arcane_surge: 'Arkanwoge', attack_speed: 'Angriffstempo',
        flat_evasion: 'Ausweichen', inc_evasion: 'Erhöhtes Ausweichen', dodge: 'Ausweichen', agility: 'Beweglichkeit',
        hybrid_evasion_absorption: 'Ausweichen + Absorption', flat_armour: 'Rüstung', inc_armour: 'Erhöhte Rüstung',
        flat_absorption: 'Absorption', inc_absorption: 'Erhöhte Absorption', hybrid_armour_evasion: 'Rüstung + Ausweichen',
        hybrid_armour_absorption: 'Rüstung + Absorption', block_chance: 'Blockchance', fire_damage: 'Feuerschaden',
        cold_damage: 'Kälteschaden', lightning_damage: 'Blitzschaden', shadow_damage: 'Schattenschaden', fire_resist: 'Feuerwiderstand',
        cold_resist: 'Kältewiderstand', lightning_resist: 'Blitzwiderstand', arcane_resistance: 'Arkanwiderstand',
        shadow_resist: 'Schattenwiderstand', movement_speed: 'Bewegungsgeschwindigkeit',
        time_added: 'Zusätzliche Zeit', mistake_count: 'Erlaubte Fehler', mistake_not_count: 'Fehlerfreiheit', focus: 'Fokus',
        reveal_hint: 'Hinweischance', chance_for_new_question: 'Neue Frage',
        parry: 'Parade', deflect: 'Umlenkung', deflect_damage: 'Vergeltungsschaden', first_step: 'Erster Schritt', grounded: 'Standfestigkeit',
        warding: 'Abwehr', accuracy: 'Genauigkeit'
    };
    if (typeof LANG !== 'undefined' && LANG === 'de' && deMap[familyId]) return deMap[familyId];
    const enMap = {
        flat_health: 'Maximum Health', hybrid_life_armour: 'Life + Armour', hybrid_life_evasion: 'Life + Evasion',
        hybrid_life_absorption: 'Life + Absorption', life_regen: 'Life Regeneration', life_on_kill: 'Life on Kill',
        heart_heal: 'Heart Heal', inc_physical_damage: 'Increased Physical Damage', flat_physical_damage: 'Physical Damage',
        crit_multiplier: 'Critical Strike Multiplier', crit_chance: 'Critical Strike Chance', precision_damage: 'Precision Damage',
        strength: 'Strength', flat_mana: 'Maximum Mana', spell_damage: 'Spell Damage', inc_spell_damage: 'Increased Spell Damage',
        intelligence: 'Intelligence', mana_regen: 'Mana Regeneration', arcane_surge: 'Arcane Surge', attack_speed: 'Attack Speed',
        flat_evasion: 'Evasion', inc_evasion: 'Increased Evasion', dodge: 'Dodge', agility: 'Agility',
        hybrid_evasion_absorption: 'Evasion + Absorption', flat_armour: 'Armour', inc_armour: 'Increased Armour',
        flat_absorption: 'Absorption', inc_absorption: 'Increased Absorption', hybrid_armour_evasion: 'Armour + Evasion',
        hybrid_armour_absorption: 'Armour + Absorption', block_chance: 'Block Chance', fire_damage: 'Fire Damage',
        cold_damage: 'Cold Damage', lightning_damage: 'Lightning Damage', shadow_damage: 'Shadow Damage', fire_resist: 'Fire Resistance',
        cold_resist: 'Cold Resistance', lightning_resist: 'Lightning Resistance', arcane_resistance: 'Arcane Resistance',
        shadow_resist: 'Shadow Resistance', movement_speed: 'Movement Speed',
        time_added: 'Time Added', mistake_count: 'Allowed Mistakes', mistake_not_count: 'Uncounted Mistakes', focus: 'Focus',
        reveal_hint: 'Hint Chance', chance_for_new_question: 'New Question Chance',
    };
    if (enMap[familyId]) return enMap[familyId];
    // Essence-specific thematic names — more flavourful than raw mod labels
    const essenceNameMap = {
        // Life & Mana hybrids
        hybrid_life_armour: { en: 'Vitality', de: 'Vitalität' },
        hybrid_life_evasion: { en: 'Agility', de: 'Beweglichkeit' },
        hybrid_life_absorption: { en: 'Endurance', de: 'Ausdauer' },
        hybrid_mana_armour: { en: 'Arcane Ward', de: 'Arkaner Schutz' },
        hybrid_mana_evasion: { en: 'Elusive Mind', de: 'Entschwundener Geist' },
        hybrid_mana_absorption: { en: 'Mana Barrier', de: 'Manabarriere' },
        // Defence hybrids
        hybrid_armour_evasion: { en: 'Fortification', de: 'Befestigung' },
        hybrid_armour_absorption: { en: 'Bastion', de: 'Bastion' },
        hybrid_evasion_absorption: { en: 'Evasion', de: 'Ausweichen' },
        hybrid_evasion_armour: { en: 'Fortification', de: 'Befestigung' },
        // Basic stats
        flat_health: { en: 'Life', de: 'Leben' },
        flat_mana: { en: 'Mana', de: 'Mana' },
        flat_armour: { en: 'Armour', de: 'Rüstung' },
        flat_evasion: { en: 'Evasion', de: 'Ausweichen' },
        flat_absorption: { en: 'Absorption', de: 'Absorption' },
        inc_armour: { en: 'Reinforced Armour', de: 'Verstärkte Rüstung' },
        inc_evasion: { en: 'Heightened Evasion', de: 'Gesteigertes Ausweichen' },
        inc_absorption: { en: 'Enhanced Absorption', de: 'Verbesserte Absorption' },
        // Attributes
        strength: { en: 'Strength', de: 'Stärke' },
        agility: { en: 'Agility', de: 'Beweglichkeit' },
        intelligence: { en: 'Intelligence', de: 'Intelligenz' },
        // Offense
        flat_physical_damage: { en: 'Physical Damage', de: 'Physischer Schaden' },
        inc_physical_damage: { en: 'Brutality', de: 'Brutalität' },
        crit_chance: { en: 'Critical Strike', de: 'Kritischer Treffer' },
        crit_multiplier: { en: 'Deadly Strikes', de: 'Tödliche Schläge' },
        attack_speed: { en: 'Haste', de: 'Eile' },
        spell_damage: { en: 'Spell Power', de: 'Zaubermacht' },
        inc_spell_damage: { en: 'Sorcery', de: 'Zauberei' },
        fire_damage: { en: 'Fire', de: 'Feuer' },
        cold_damage: { en: 'Cold', de: 'Kälte' },
        lightning_damage: { en: 'Lightning', de: 'Blitz' },
        shadow_damage: { en: 'Shadow', de: 'Schatten' },
        // Elemental resistances
        fire_resist: { en: 'Fire Resistance', de: 'Feuerwiderstand' },
        cold_resist: { en: 'Cold Resistance', de: 'Kältewiderstand' },
        lightning_resist: { en: 'Lightning Resistance', de: 'Blitzwiderstand' },
        shadow_resist: { en: 'Shadow Resistance', de: 'Schattenwiderstand' },
        arcane_resistance: { en: 'Arcane Resistance', de: 'Arkanwiderstand' },
        // Regeneration & recovery
        life_regen: { en: 'Life Regeneration', de: 'Lebensregeneration' },
        mana_regen: { en: 'Mana Regeneration', de: 'Manaregeneration' },
        life_leech: { en: 'Life Leech', de: 'Lebensraub' },
        life_on_kill: { en: 'Life on Kill', de: 'Leben bei Kill' },
        mana_on_kill: { en: 'Mana on Kill', de: 'Mana bei Kill' },
        mana_on_mistake: { en: 'Mana on Mistake', de: 'Mana bei Fehler' },
        absorption_on_kill: { en: 'Absorption on Kill', de: 'Absorption bei Kill' },
        absorption_regen_rate: { en: 'Absorption Recovery', de: 'Absorptionserholung' },
        faster_absorption_regen_start: { en: 'Quick Recovery', de: 'Schnelle Erholung' },
        heart_heal: { en: 'Heart Healing', de: 'Herzheilung' },
        inc_heart_heal: { en: 'Enhanced Heart Healing', de: 'Verbesserte Herzheilung' },
        mana_heal: { en: 'Mana Healing', de: 'Manaheilung' },
        inc_mana_heal: { en: 'Enhanced Mana Healing', de: 'Verbesserte Manaheilung' },
        // Utility / Puzzle
        movement_speed: { en: 'Swiftness', de: 'Schnelligkeit' },
        time_added: { en: 'Time', de: 'Zeit' },
        mistake_count: { en: 'Mistake Allowance', de: 'Fehlertoleranz' },
        mistake_not_count: { en: 'Precision', de: 'Präzision' },
        focus: { en: 'Focus', de: 'Fokus' },
        reveal_hint: { en: 'Revelation', de: 'Offenbarung' },
        chance_for_new_question: { en: 'Second Chance', de: 'Zweite Chance' },
        // Status effects
        chance_to_ignite: { en: 'Ignite', de: 'Entzünden' },
        chance_to_freeze: { en: 'Freeze', de: 'Einfrieren' },
        chance_to_shock: { en: 'Shock', de: 'Schock' },
        chance_to_blind: { en: 'Blind', de: 'Blenden' },
        chance_to_convert: { en: 'Conversion', de: 'Umwandlung' },
        // Weapon mechanics
        accuracy: { en: 'Accuracy', de: 'Genauigkeit' },
        pierce: { en: 'Pierce', de: 'Durchschlag' },
        cleave: { en: 'Cleave', de: 'Flächenschlag' },
        splash_damage: { en: 'Splash', de: 'Flächenschaden' },
        chain: { en: 'Chain', de: 'Kette' },
        channel: { en: 'Channel', de: 'Kanalisieren' },
        multishot: { en: 'Multishot', de: 'Mehrfachschuss' },
        mana_to_damage: { en: 'Mind over Matter', de: 'Geist über Materie' },
        arcane_surge: { en: 'Arcane Surge', de: 'Arkanwoge' },
        overkill: { en: 'Overkill', de: 'Overkill' },
        pushback: { en: 'Knockback', de: 'Rückstoß' },
        stagger: { en: 'Stagger', de: 'Taumeln' },
        // Defence mechanics
        block_chance: { en: 'Block', de: 'Blocken' },
        spell_block_chance: { en: 'Spell Block', de: 'Zauberblock' },
        block_recovery: { en: 'Block Recovery', de: 'Blockerholung' },
        dodge: { en: 'Dodge', de: 'Ausweichen' },
        spell_dodge: { en: 'Spell Dodge', de: 'Zauberausweichen' },
        preemptive_dodge: { en: 'Foresight', de: 'Vorahnung' },
        parry: { en: 'Parry', de: 'Parade' },
        deflect: { en: 'Deflect', de: 'Ablenken' },
        deflect_damage: { en: 'Retribution', de: 'Vergeltung' },
        first_step: { en: 'First Step', de: 'Erster Schritt' },
        grounded: { en: 'Grounded', de: 'Standfestigkeit' },
        warding: { en: 'Warding', de: 'Abwehr' },
        // Other
        fate: { en: 'Fate', de: 'Schicksal' },
        echo: { en: 'Echo', de: 'Echo' },
        precision_damage: { en: 'Precision', de: 'Präzision' },
        precision_regen: { en: 'Steady Regeneration', de: 'Stetige Regeneration' },
        snipe: { en: 'Snipe', de: 'Scharfschütze' },
        shield_bash: { en: 'Shield Bash', de: 'Schildstoß' },
    };
    const isDe = (typeof LANG !== 'undefined' && LANG === 'de');
    if (essenceNameMap[familyId]) return essenceNameMap[familyId][isDe ? 'de' : 'en'];
    const parts = familyId.split('_').filter(p => p !== 'flat' && p !== 'inc' && p !== 'hybrid');
    const titled = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1));
    const prefix = familyId.startsWith('inc_') ? (LANG === 'de' ? 'Erhöhte ' : 'Increased ') : '';
    if (familyId.startsWith('hybrid_')) return titled.join(' + ');
    return prefix + titled.join(' ');
}

// Builds the inner HTML for the essence tooltip's "Guaranteed" section.
// NEW per-modifier version: single mod name + list of compatible base types.
function _egBuildEssenceDetailHTML(def) {
    if (!def) return '';
    const families = def.guaranteedFamilies || (def.guaranteedFamily ? [def.guaranteedFamily] : []);
    if (!families.length) return '';
    // For per-modifier essences, there is exactly one family; legacy may have many — show first.
    const familyId = families[0];
    const modName = _egEssenceFamilyDisplayName(familyId);
    const slotTypes = _egEssenceCompatibleSlotTypes(familyId);
    const slotLabel = (slotType) => {
        const key = 'eg_slot_' + slotType;
        try { const tr = t(key); if (tr && tr !== key) return tr; } catch (e) {}
        return slotType.charAt(0).toUpperCase() + slotType.slice(1);
    };
    const isDe = (typeof LANG !== 'undefined' && LANG === 'de');
    let html = '<div class="eg-tt-section eg-tt-essence-detail">';
    const titleMod = isDe ? 'Garantierter Modifikator:' : 'Guaranteed modifier:';
    html += `<div class="eg-tt-essence-title">${titleMod}</div>`;
    html += `<div class="eg-tt-essence-line"><span class="eg-tt-essence-mod" style="font-size:0.92rem;">${modName}</span></div>`;

    const titleSlots = isDe ? 'Funktioniert auf:' : 'Works on:';
    if (slotTypes.length > 0) {
        const slotsStr = slotTypes.map(slotLabel).join(', ');
        html += `<div class="eg-tt-essence-title" style="margin-top:6px;">${titleSlots}</div>`;
        html += `<div class="eg-tt-essence-line"><span class="eg-tt-essence-slots">${slotsStr}</span></div>`;
    } else {
        const noneStr = isDe ? 'Keine kompatiblen Basen gefunden' : 'No compatible bases found';
        html += `<div class="eg-tt-essence-line"><span class="eg-tt-essence-slots" style="color:#e74c3c;">${noneStr}</span></div>`;
    }

    // For legacy multi-family essences, also list the other families as fallback options
    if (families.length > 1) {
        const others = families.slice(1).map(fid => _egEssenceFamilyDisplayName(fid)).join(', ');
        const otherTitle = isDe ? 'Weitere garantierte Optionen (erste zutreffende):' : 'Other guaranteed options (first applicable):';
        html += `<div class="eg-tt-essence-note" style="margin-top:4px; opacity:0.8;">${otherTitle} ${others}</div>`;
    }
    html += '</div>';
    return html;
}


//------------------------------------------------------------------------
//-------------------ESSENCE DROPS FROM MONSTERS---------------------------
//------------------------------------------------------------------------

// One entry per modifier family — equal weight so every targeted essence is
// equally likely to drop (rarity differentiation via map tier/loot quantity).
const EG_ESSENCE_DROP_TABLE = _EG_ESSENCE_FAMILIES.map(fid => ({ id: 'essence_' + fid, weight: 100 }));

const EG_ESSENCE_DROP_CHANCE_NORMAL = 0.06; // 6% per normal kill
const EG_ESSENCE_DROP_CHANCE_BOSS = 0.45;   // bosses often reward one

function _egRollEssenceDef() {
    const total = EG_ESSENCE_DROP_TABLE.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    for (const entry of EG_ESSENCE_DROP_TABLE) {
        roll -= entry.weight;
        if (roll <= 0) return EG_ESSENCE_DEFS[entry.id];
    }
    return EG_ESSENCE_DEFS[EG_ESSENCE_DROP_TABLE[0].id];
}

// Called on monster death (see endgame-encounter.js). Essences land on the
// grid as pickup drops and are claimed like currency orbs.
function _egTryDropEssence(isBoss) {
    const baseChance = isBoss ? EG_ESSENCE_DROP_CHANCE_BOSS : EG_ESSENCE_DROP_CHANCE_NORMAL;
    const qtyMult = (typeof _egMapLootQuantityMult === 'function') ? _egMapLootQuantityMult() : 1;
    const chance = Math.min(1, baseChance * qtyMult);
    if (Math.random() > chance) return;
    const def = _egRollEssenceDef();
    if (!def) return;
    if (typeof _egSpawnCurrencyDrop === 'function') {
        _egSpawnCurrencyDrop(def);
    }
}


//------------------------------------------------------------------------
//-------------------ESSENCE STASH PUBLIC API-----------------------------
//------------------------------------------------------------------------

// Adds `amount` of an essence type to the essence tab fixed slot.
// Stacks merge on the pre-assigned cell; returns true on success.
function egAddEssence(id, amount = 1, def = null) {
    const pos = _egEssenceSlotForId(id);
    if (!pos) {
        console.warn(`[ESSENCE] egAddEssence: no fixed slot for "${id}".`);
        return false;
    }
    const r = pos.r, c = pos.c;
    if (!_egEssenceStash[r]) _egEssenceStash[r] = Array(EG_ESSENCE_COLS).fill(null);
    const cell = _egEssenceStash[r][c];
    const resolvedDef = def || EG_ESSENCE_DEFS[id] || _egEssenceDefForId(id);
    if (cell && cell.id === id) {
        cell.count = (cell.count || 1) + amount;
        _egRenderEssenceCell(r, c);
        return true;
    }
    if (cell && cell.id !== id) {
        console.warn(`[ESSENCE] egAddEssence: slot [${r},${c}] occupied by different id "${cell.id}" (tried to add "${id}")`);
        return false;
    }
    if (!resolvedDef) {
        console.warn(`[ESSENCE] egAddEssence: no def for "${id}".`);
        return false;
    }
    _egEssenceStash[r][c] = { ...resolvedDef, id, count: amount };
    if (!_egEssenceStash[r][c].category) _egEssenceStash[r][c].category = 'essence';
    if (!_egEssenceStash[r][c].rarity) _egEssenceStash[r][c].rarity = 'essence';
    _egRenderEssenceCell(r, c);
    return true;
}


//------------------------------------------------------------------------
//-------------------RENDER: ESSENCE TAB----------------------------------
//------------------------------------------------------------------------

// Builds a single essence tab cell div (drop target) with empty-slot hover preview.
function _egBuildEssenceCellHTML(row, col) {
    return `
<div class="eg-inv-cell eg-essence-cell"
     id="eg-essence-cell-${row}-${col}"
     data-row="${row}" data-col="${col}"
     data-eg-dropzone="essence"
     onmouseenter="_egOnEssenceCellEnter(${row}, ${col}, event)"
     onmousemove="_egOnEssenceCellMove(event)"
     onmouseleave="_egOnEssenceCellLeave()"
     ondragover="egDragOver(event)"
     ondrop="egDropOnEssence(event, ${row}, ${col})"
     ondragleave="egDragLeave(event)">
</div>`;
}

// Assembles the essence tab panel: label + the essence cell grid.
function _egBuildEssenceTabHTML() {
    let cellsHTML = '';
    for (let r = 0; r < EG_ESSENCE_ROWS; r++) {
        for (let c = 0; c < EG_ESSENCE_COLS; c++) {
            cellsHTML += _egBuildEssenceCellHTML(r, c);
        }
    }
    // Build filter dropdown options
    const slotTypes = _egGetEssenceFilterSlotTypes();
    const slotLabel = (st) => {
        const key = 'eg_slot_' + st;
        try { const tr = t(key); if (tr && tr !== key) return tr; } catch (e) {}
        return st.charAt(0).toUpperCase() + st.slice(1);
    };
    let filterOptions = `<option value="all">${t('eg_essence_filter_all') || 'All'}</option>`;
    for (const st of slotTypes) {
        const selected = _egEssenceFilterSlotType === st ? ' selected' : '';
        filterOptions += `<option value="${st}"${selected}>${slotLabel(st)}</option>`;
    }

    return `
<div class="eg-panel eg-panel-essence">
    <div class="eg-panel-label">
        ${t('eg_essences_tab')}
        <select id="eg-essence-filter-select" class="eg-essence-filter-select" onchange="_egSetEssenceFilter(this.value)" title="${t('eg_essence_filter_title') || 'Filter essences by item type'}">
            ${filterOptions}
        </select>
    </div>
    <div class="eg-essence-grid" id="eg-essence-grid"
         style="grid-template-columns: repeat(${EG_ESSENCE_COLS}, 1fr);">
        ${cellsHTML}
    </div>
</div>`;
}

// Empty-slot hover preview — mirrors Orbs & Shards behavior.
function _egOnEssenceCellEnter(row, col, e) {
    const stash = (typeof _egEssenceStash !== 'undefined') ? _egEssenceStash : null;
    const item = stash && stash[row] ? stash[row][col] : null;
    if (item) return; // occupied → chip's own onmouseenter handles tooltip
    const assignedId = _egEssenceIdForSlot(row, col);
    if (!assignedId) return; // decorative empty cell
    const def = _egEssenceDefForId(assignedId);
    if (!def) return;
    // Build tooltip from def (reuse currency/essence style)
    const ttName = def.name || assignedId;
    const ttIcon = def.icon || '🧬';
    const ttDesc = def.description || '';
    // heal missing category for display
    const fakeItem = { ...def, count: 0, category: 'essence', rarity: 'essence' };
    let essenceDetailHTML = '';
    try { essenceDetailHTML = _egBuildEssenceDetailHTML(def); } catch (err) { essenceDetailHTML = ''; }
    const html = `
<div class="eg-tt-frame" style="--tt-border:#b59248;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon" style="opacity:0.55;">${ttIcon}</div>
        <div class="eg-tt-name" style="color:#f5d98a; opacity:0.9;">${ttName}</div>
        <div class="eg-tt-rarity-line" style="color:#b59248;">${t('eg_rarity_essence')} — ${t('eg_empty_slot_hint') || 'Empty slot'}</div>
    </div>
    <div class="eg-tt-section"><div class="eg-tt-desc" style="opacity:0.85;">${ttDesc}</div></div>
    ${essenceDetailHTML}
</div>`;
    if (typeof showGameTooltip === 'function') showGameTooltip(html, e);
}
function _egOnEssenceCellMove(e) {
    const cell = e.currentTarget || (e.target.closest && e.target.closest('.eg-essence-cell'));
    if (!cell) return;
    const r = +cell.dataset.row, c = +cell.dataset.col;
    const stash = (typeof _egEssenceStash !== 'undefined') ? _egEssenceStash : null;
    const item = stash && stash[r] ? stash[r][c] : null;
    if (item) return;
    if (_egEssenceIdForSlot(r,c) && typeof moveGameTooltip === 'function') moveGameTooltip(e);
}
function _egOnEssenceCellLeave() {
    if (typeof hideGameTooltip === 'function') hideGameTooltip();
}

// Re-renders a single cell in the essence tab grid (fixed-slot with placeholder).
function _egRenderEssenceCell(row, col) {
    if (!_egEssenceStash[row]) return;
    const cell = document.getElementById(`eg-essence-cell-${row}-${col}`);
    if (!cell) return;
    const item = _egEssenceStash[row][col];
    const assignedId = _egEssenceIdForSlot(row, col);
    const def = assignedId ? _egEssenceDefForId(assignedId) : null;

    // Check filter compatibility
    let matchesFilter = true;
    if (!item && assignedId && def) {
        const familyId = _egEssenceResolveFamilyId(def);
        if (familyId && !_egEssenceMatchesFilter(familyId)) {
            matchesFilter = false;
        }
    } else if (item) {
        const familyId = _egEssenceResolveFamilyId(item);
        if (familyId && !_egEssenceMatchesFilter(familyId)) {
            matchesFilter = false;
        }
    }

    cell.classList.toggle('eg-essence-filtered-out', !matchesFilter);
    cell.style.pointerEvents = matchesFilter ? '' : 'none';

    // Hide filtered-out items completely (don't render chip)
    if (!matchesFilter) {
        cell.innerHTML = '';
        cell.classList.add('eg-essence-assigned-empty');
        cell.removeAttribute('data-empty-icon');
        cell.removeAttribute('title');
        return;
    }

    if (item) {
        cell.innerHTML = _dndBuildCurrencyChipHTML(item);
        cell.classList.remove('eg-essence-assigned-empty');
        cell.removeAttribute('data-empty-icon');
        cell.removeAttribute('title');
    } else if (assignedId && def) {
        cell.innerHTML = '';
        cell.classList.add('eg-essence-assigned-empty');
        if (def.icon) cell.setAttribute('data-empty-icon', def.icon);
        cell.title = def.name || assignedId;
    } else {
        cell.innerHTML = '';
        cell.classList.remove('eg-essence-assigned-empty');
        cell.removeAttribute('data-empty-icon');
        cell.removeAttribute('title');
    }
}

// Re-renders the entire essence tab grid.
function _egRenderEssenceStash() {
    for (let r = 0; r < EG_ESSENCE_ROWS; r++) {
        for (let c = 0; c < EG_ESSENCE_COLS; c++) {
            _egRenderEssenceCell(r, c);
        }
    }
}


//------------------------------------------------------------------------
//-------------------ESSENCE "USE MODE"-----------------------------------
//-------------------(right-click essence, left-click item)----------------
//------------------------------------------------------------------------

let _egPendingEssenceUse = null; // { defId, sourceRow, sourceCol }

function _egStartEssenceUse(def, row, col, chipEl) {
    if (typeof _egPendingCurrencyUse !== 'undefined' && _egPendingCurrencyUse) {
        _egCancelCurrencyUse(true);
    }
    _egPendingEssenceUse = { defId: def.id, sourceRow: row, sourceCol: col };
    document.querySelectorAll('.eg-item-chip').forEach(el => el.classList.remove('eg-currency-selected'));
    if (chipEl) chipEl.classList.add('eg-currency-selected');
    document.body.classList.add('eg-currency-use-active');
    showToast(t('eg_currency_selected')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name));
}

function _egCancelEssenceUse(silent) {
    if (!_egPendingEssenceUse) return;
    _egPendingEssenceUse = null;
    document.querySelectorAll('.eg-item-chip').forEach(el => el.classList.remove('eg-currency-selected'));
    document.body.classList.remove('eg-currency-use-active');
    if (!silent) showToast(t('eg_currency_cancelled'));
}

function _egRefreshEssenceUseHighlight() {
    if (!_egPendingEssenceUse) return;
    const { sourceRow, sourceCol } = _egPendingEssenceUse;
    document.querySelectorAll('.eg-item-chip').forEach(el => el.classList.remove('eg-currency-selected'));
    const chip = document.querySelector(
        `.eg-essence-cell[data-row="${sourceRow}"][data-col="${sourceCol}"] .eg-item-chip`);
    if (chip) {
        chip.classList.add('eg-currency-selected');
        document.body.classList.add('eg-currency-use-active');
    } else {
        _egCancelEssenceUse(true);
    }
}

function _egApplyEssenceToItem(item, applyFn, chipEl, keepActive) {
    if (!_egPendingEssenceUse) return;
    const { sourceRow, sourceCol, defId } = _egPendingEssenceUse;
    const def = EG_ESSENCE_DEFS[defId];
    const stack = _egEssenceStash[sourceRow][sourceCol];

    if (!def || !stack || stack.id !== defId) {
        _egCancelEssenceUse(true);
        return;
    }

    if (!item || item.category !== 'equip' || item.isUnique) {
        const msg = t('eg_currency_cannot_use').replace('{name}', def.name);
        showToast(msg);
        if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'error' });
        if (chipEl) {
            chipEl.classList.add('eg-slot-reject');
            setTimeout(() => chipEl.classList.remove('eg-slot-reject'), 600);
        }
        _egCancelEssenceUse(true);
        return;
    }

    // Compatibility check — does this base support the guaranteed family?
    const famList = def.guaranteedFamilies || (def.guaranteedFamily ? [def.guaranteedFamily] : []);
    const famForCheck = famList[0];
    if (famForCheck && !_egEssenceCanApplyToItem(famForCheck, item)) {
        const modName = _egEssenceFamilyDisplayName(famForCheck);
        const slotTypes = _egEssenceCompatibleSlotTypes(famForCheck);
        const slotLabel = (st) => { try{ const tr=t('eg_slot_'+st); if(tr&&tr!=='eg_slot_'+st) return tr; }catch(e){} return st; };
        const slotsStr = slotTypes.length ? slotTypes.map(slotLabel).join(', ') : (typeof LANG!=='undefined'&&LANG==='de'?'keine':'none');
        const isDe = (typeof LANG !== 'undefined' && LANG === 'de');
        let msg = '';
        if (isDe) {
            msg = `⚠️ ${def.name} kann nicht auf ${item.name || item.baseName || '?'} angewendet werden — ${modName} kann nicht auf ${slotLabel(item.slotType)}-Gegenständen rollen. Funktioniert nur auf: ${slotsStr}.`;
        } else {
            msg = `⚠️ ${def.name} cannot be used on ${item.name || item.baseName || '?'} — ${modName} cannot roll on ${slotLabel(item.slotType)} items. Only works on: ${slotsStr}.`;
        }
        showToast(msg);
        if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'error', duration: 5000 });
        if (chipEl) {
            chipEl.classList.add('eg-slot-reject');
            setTimeout(() => chipEl.classList.remove('eg-slot-reject'), 600);
        }
        _egCancelEssenceUse(true);
        return;
    }

    const newItem = _egApplyEssenceCraft(item, def);
    if (!newItem) {
        // Fallback — should already be caught by compatibility check, but keep generic message
        const modName = _egEssenceFamilyDisplayName(famForCheck);
        const isDe = (typeof LANG !== 'undefined' && LANG === 'de');
        const msg = isDe
            ? `⚠️ ${def.name} kann nicht auf ${item.name || '?'} angewendet werden — ${modName} ist auf dieser Basis nicht verfügbar.`
            : `⚠️ ${def.name} cannot be used on ${item.name || '?'} — ${modName} is not available on this base.`;
        showToast(msg);
        if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'error' });
        if (chipEl) {
            chipEl.classList.add('eg-slot-reject');
            setTimeout(() => chipEl.classList.remove('eg-slot-reject'), 600);
        }
        _egCancelEssenceUse(true);
        return;
    }
    applyFn(newItem);

    stack.count = (stack.count || 1) - 1;
    if (stack.count <= 0) _egEssenceStash[sourceRow][sourceCol] = null;
    _egRenderEssenceCell(sourceRow, sourceCol);

    if (keepActive && stack.count > 0) {
        _egRefreshEssenceUseHighlight();
        showToast(t('eg_currency_applied').replace('{name}', def.name));
        if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
        egSaveHubState();
        return;
    }

    _egCancelEssenceUse(true);
    showToast(t('eg_currency_applied').replace('{name}', def.name));
    if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
    egSaveHubState();
}

// Right-click on an essence chip: start or cancel "use mode".
document.addEventListener('contextmenu', function (e) {
    const chip = e.target.closest('.eg-item-chip');
    const essenceCell = chip ? chip.closest('.eg-essence-cell') : null;

    if (_egPendingEssenceUse) {
        if (!chip || !essenceCell) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        _egClearTooltip();
        const pr = +essenceCell.dataset.row, pc = +essenceCell.dataset.col;
        if (_egPendingEssenceUse.sourceRow === pr && _egPendingEssenceUse.sourceCol === pc) {
            _egCancelEssenceUse();
        } else {
            const item = _egEssenceStash[pr][pc];
            if (item && item.category) {
                _egStartEssenceUse(EG_ESSENCE_DEFS[item.id] || item, pr, pc, chip);
            }
        }
        return;
    }

    if (!chip || (typeof _dndChipScreenEl === 'function' ? !_dndChipScreenEl(chip) : !chip.closest('#screen-endgame-hub'))) return;
    if (!essenceCell) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const r = +essenceCell.dataset.row, c = +essenceCell.dataset.col;
    const item = _egEssenceStash[r][c];
    if (!item || !item.category) return;

    _egStartEssenceUse(EG_ESSENCE_DEFS[item.id] || item, r, c, chip);
}, true);

// Left-click while an essence is selected: apply it to the clicked equip
// item, or cancel if the click isn't a valid target.
document.addEventListener('mousedown', function (e) {
    if (!_egPendingEssenceUse) return;
    if (typeof _egPendingCurrencyUse !== 'undefined' && _egPendingCurrencyUse) return;
    if (e.button !== 0) return;

    const chip = e.target.closest('.eg-item-chip');
    const onManagedScreen = !!chip && (typeof _dndChipScreenEl === 'function'
        ? !!_dndChipScreenEl(chip)
        : !!chip.closest('#screen-endgame-hub'));
    if (!onManagedScreen) {
        _egCancelEssenceUse();
        return;
    }

    if (chip.closest('.eg-essence-cell')) {
        _egCancelEssenceUse();
        return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();

    const invCell = chip.closest('.eg-inv-cell:not(.eg-currency-cell):not(.eg-map-stash-cell):not(.eg-essence-cell)');
    const equipSlot = chip.closest('.eg-equip-slot');

    let targetItem = null, applyFn = null;
    if (invCell) {
        const r = +invCell.dataset.row, c = +invCell.dataset.col;
        targetItem = _egInventory[r][c];
        applyFn = (newItem) => { _egInventory[r][c] = newItem; _egRenderInventoryCell(r, c); };
    } else if (equipSlot) {
        const slotId = equipSlot.dataset.slotId;
        targetItem = _egEquipped[slotId] || null;
        applyFn = (newItem) => {
            _egEquipped[slotId] = newItem;
            _egRenderEquipSlot(slotId);
            _egRenderInventory();
            _egRenderEquipSlots();
        };
    } else {
        _egCancelEssenceUse();
        return;
    }

    if (!targetItem) {
        const msg = t('eg_no_item_target');
        showToast(msg);
        if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'error' });
        _egCancelEssenceUse(true);
        return;
    }

    _egApplyEssenceToItem(targetItem, applyFn, chip, e.shiftKey);
}, true);

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && _egPendingEssenceUse && !(typeof _egPendingCurrencyUse !== 'undefined' && _egPendingCurrencyUse)) {
        _egCancelEssenceUse();
    }
});


//------------------------------------------------------------------------
//-------------------CSS INJECTION-----------------------------------------
//------------------------------------------------------------------------

(function _egInjectEssenceStyles() {
    if (document.getElementById('eg-essence-styles')) return;
    const style = document.createElement('style');
    style.id = 'eg-essence-styles';
    style.textContent = `
        /* Essence tab cells highlight while a drag hovers them */
        .eg-essence-cell.eg-dragover {
            outline: 2px solid #a0a0ff;
            background: rgba(100, 100, 255, 0.18);
        }
        /* Essence icon glow */
        .eg-item-chip.eg-rarity-essence .eg-item-chip-icon {
            filter: drop-shadow(0 0 4px #b06ae0);
        }
        /* PoE-style essence detail in tooltip */
        .eg-tt-essence-detail { padding-top: 6px; }
        .eg-tt-essence-title { color: #b59248; font-weight: 700; font-size: 0.82rem; margin-bottom: 5px; letter-spacing: 0.02em; }
        .eg-tt-essence-line { display: flex; gap: 6px; flex-wrap: wrap; font-size: 0.78rem; line-height: 1.45; padding: 3px 0; border-bottom: 1px solid rgba(181,146,72,0.08); }
        .eg-tt-essence-line:last-of-type { border-bottom: none; }
        .eg-tt-essence-slots { color: #9aa0b8; flex: 1 1 55%; min-width: 140px; white-space: normal; word-break: break-word; }
        .eg-tt-essence-mod { color: #f5d98a; font-weight: 600; white-space: normal; flex: 0 0 auto; word-break: break-word; overflow-wrap: anywhere; }
        .eg-tt-essence-mod.eg-tt-essence-random { color: #ccc; font-style: italic; font-weight: 400; }
        .eg-tt-essence-note { color: #7a7a8a; font-size: 0.70rem; line-height: 1.35; margin-top: 6px; font-style: italic; opacity: 0.9; }
        /* Empty assigned essence slot placeholder (mirrors currency) */
        .eg-essence-cell.eg-essence-assigned-empty {
            border: 1px dashed rgba(176,106,224,0.35);
            background: rgba(176,106,224,0.06);
            position: relative;
        }
        .eg-essence-cell.eg-essence-assigned-empty::after {
            content: attr(data-empty-icon);
            position: absolute;
            left: 50%; top: 50%;
            transform: translate(-50%,-50%);
            font-size: 1.1rem;
            opacity: 0.22;
            pointer-events: none;
        }
        .eg-essence-grid { gap: 4px; }
        .eg-essence-cell { position: relative; min-height: 38px; }
        .eg-panel-essence .eg-essence-grid { max-height: 560px; overflow-y: auto; padding-right: 4px; }
        .eg-panel-essence .eg-essence-grid::-webkit-scrollbar { width: 6px; }
        .eg-panel-essence .eg-essence-grid::-webkit-scrollbar-thumb { background: rgba(176,106,224,0.35); border-radius: 3px; }
        /* Essence filter dropdown */
        .eg-panel-label { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .eg-essence-filter-select {
            font-family: var(--PX);
            font-size: 12px;
            letter-spacing: 1px;
            padding: 2px 6px;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--accent);
            cursor: pointer;
            min-width: 100px;
        }
        .eg-essence-filter-select:hover { border-color: var(--accent2); }
        .eg-essence-filter-select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 4px rgba(102,252,241,0.3); }
        /* Filtered-out essence cells (dimmed when filter is active) */
        .eg-essence-cell.eg-essence-filtered-out {
            opacity: 0.2;
        }
        .eg-essence-cell.eg-essence-filtered-out.eg-essence-assigned-empty {
            border-color: rgba(176,106,224,0.1);
            background: rgba(176,106,224,0.02);
        }
        .eg-essence-cell.eg-essence-filtered-out .eg-item-chip {
            opacity: 0.3;
            filter: grayscale(1);
        }
    `;
    document.head.appendChild(style);
})();
