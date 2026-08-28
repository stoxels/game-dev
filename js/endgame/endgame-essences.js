//------------------------------------------------------------------------
//-------------------ENDGAME ESSENCES (PoE-STYLE)-------------------------
//------------------------------------------------------------------------
// Defines essences that drop from monsters, stack in the essence tab
// (right of the character sheet, above the stash), and can be applied to
// ANY equipment item regardless of rarity via right-click-then-left-click
// ("use mode", same interaction as currency orbs).
//
// Essence semantics:
//   The target item is stripped of ALL its modifiers and re-forged into a
//   RARE item with exactly ONE guaranteed modifier (specific to each
//   essence) plus 1-3 additional random modifiers, rolled according to the
//   normal prefix/suffix rules (rare caps, ilvl gating, no duplicate
//   families, base-stat-gated local defenses).
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

// Essence stash dimensions (essence tab grid)
const EG_ESSENCE_ROWS = 6;
const EG_ESSENCE_COLS = 8;

// Essence stash: 2D grid of stacked essence items (null = empty cell)
let _egEssenceStash = Array.from({ length: EG_ESSENCE_ROWS }, () => Array(EG_ESSENCE_COLS).fill(null));


//------------------------------------------------------------------------
//-------------------ESSENCE CRAFTING LOGIC-------------------------------
//------------------------------------------------------------------------

// Rolls the GUARANTEED modifier for an essence application.
// Walks the essence's preferred family list in order and picks the first
// family that exists on this item's mod table (prefix OR suffix section),
// has tiers eligible at the item's level, and passes the base-stat gate.
// Falls back to a normal weighted roll from any eligible section when none
// of the preferred families fit (e.g. offense-only essences on armour).
function _egRollGuaranteedMod(modTable, preferredFamilies, itemLevel, defenses) {
    const sections = [
        { type: 'prefix', pool: modTable.prefixes || {} },
        { type: 'suffix', pool: modTable.suffixes || {} },
    ];

    for (const familyId of preferredFamilies) {
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

    // Fallback — guarantee SOMETHING by rolling from all eligible sections.
    for (const sec of sections) {
        const pool = _egBuildModPool(sec.pool, itemLevel, new Set(), defenses);
        const entry = _egPickModFromPool(pool);
        if (!entry) continue;
        const tier = _egPickTier(entry.tiers);
        if (!tier) continue;
        return {
            familyId: entry.familyId,
            type: sec.type,
            tier: tier.tier,
            rolledStats: _egBuildRolledStats(entry.family, tier),
        };
    }
    return null;
}

// Core essence re-forge. Returns the new rare item, or null when the item
// has no usable mod table.
function _egApplyEssenceCraft(item, def) {
    const modTable = _egGetModTable(item);
    if (!modTable) return null;

    const cap = EG_MOD_CAPS.rare;
    const itemLevel = item.itemLevel || 1;
    const mods = [];
    const chosenFamilyIds = new Set();

    // 1 guaranteed modifier
    let preCount = 0;
    let sufCount = 0;
    const guaranteed = _egRollGuaranteedMod(modTable, def.guaranteedFamilies, itemLevel, item.defenses);
    if (!guaranteed) return null;
    mods.push(guaranteed);
    chosenFamilyIds.add(guaranteed.familyId);
    if (guaranteed.type === 'prefix') preCount++; else sufCount++;

    // 2-3 additional random modifiers, clamped to the rare mod caps
    // (rare items must always end up with at least 3 modifiers)
    let extra = 2 + Math.floor(Math.random() * 2); // 2..3
    const maxExtra = Math.min(
        cap.maxTotal - mods.length,
        (cap.maxPre - preCount) + (cap.maxSuf - sufCount)
    );
    extra = Math.min(extra, maxExtra);

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

    const name = _egBuildItemName(item.baseName || item.name, 'rare', mods);
    return { ...item, rarity: 'rare', mods, name };
}


//------------------------------------------------------------------------
//-------------------ESSENCE DEFINITIONS----------------------------------
//------------------------------------------------------------------------

const EG_ESSENCE_DEFS = {

    essence_vitality: {
        id: 'essence_vitality',
        name: t('eg_essence_vitality'),
        icon: '💚',
        description: t('eg_essence_vitality_desc'),
        category: 'essence',
        rarity: 'essence',
        guaranteedFamilies: [
            'flat_health',
            'hybrid_life_evasion', 'hybrid_life_armour', 'hybrid_life_absorption',
            'life_regen', 'life_on_kill', 'heart_heal',
        ],
    },

    essence_might: {
        id: 'essence_might',
        name: t('eg_essence_might'),
        icon: '🔴',
        description: t('eg_essence_might_desc'),
        category: 'essence',
        rarity: 'essence',
        guaranteedFamilies: [
            'inc_physical_damage', 'flat_physical_damage', 'crit_multiplier',
            'crit_chance', 'precision_damage', 'strength', 'flat_health',
        ],
    },

    essence_sorcery: {
        id: 'essence_sorcery',
        name: t('eg_essence_sorcery'),
        icon: '🔮',
        description: t('eg_essence_sorcery_desc'),
        category: 'essence',
        rarity: 'essence',
        guaranteedFamilies: [
            'spell_damage', 'inc_spell_damage', 'flat_mana',
            'intelligence', 'mana_regen', 'arcane_surge',
        ],
    },

    essence_swiftness: {
        id: 'essence_swiftness',
        name: t('eg_essence_swiftness'),
        icon: '🟢',
        description: t('eg_essence_swiftness_desc'),
        category: 'essence',
        rarity: 'essence',
        guaranteedFamilies: [
            'attack_speed', 'flat_evasion', 'inc_evasion',
            'dodge', 'agility', 'hybrid_evasion_absorption',
        ],
    },

    essence_fortress: {
        id: 'essence_fortress',
        name: t('eg_essence_fortress'),
        icon: '🟡',
        description: t('eg_essence_fortress_desc'),
        category: 'essence',
        rarity: 'essence',
        guaranteedFamilies: [
            'flat_armour', 'inc_armour', 'flat_absorption', 'inc_absorption',
            'hybrid_armour_evasion', 'hybrid_armour_absorption',
            'block_chance', 'flat_health',
        ],
    },

    essence_elements: {
        id: 'essence_elements',
        name: t('eg_essence_elements'),
        icon: '🌀',
        description: t('eg_essence_elements_desc'),
        category: 'essence',
        rarity: 'essence',
        guaranteedFamilies: [
            'fire_damage', 'cold_damage', 'lightning_damage', 'shadow_damage',
            'fire_resist', 'cold_resist', 'lightning_resist',
            'arcane_resistance', 'shadow_resist',
        ],
    },

    essence_puzzle: {
        id: 'essence_puzzle',
        name: t('eg_essence_puzzle'),
        icon: '🧩',
        description: t('eg_essence_puzzle_desc'),
        category: 'essence',
        rarity: 'essence',
        guaranteedFamilies: [
            'time_added', 'mistake_count', 'mistake_not_count', 'focus',
            'reveal_hint', 'chance_for_new_question',
        ],
    },
};


//------------------------------------------------------------------------
//-------------------ESSENCE TOOLTIP HELPERS (PoE-STYLE)------------------
//------------------------------------------------------------------------
// Builds a PoE-style breakdown: for each essence, which item class gets which
// guaranteed stat. Groups slotTypes by their first applicable guaranteed family
// so the tooltip says e.g.:
//   "Helm, Chest, Gloves, Boots, ...: Maximum Health"
//   "Weapons: Physical Damage"
// and groups slots with no specific guarantee under "Other: Random modifier".

// Human-readable family display (EN/DE). Prefer the mod's own label stripped of
// placeholders, fall back to a title-cased familyId.  Hybrid families are
// joined with " + ".
function _egEssenceFamilyDisplayName(familyId) {
    // Try to resolve the family definition from any mod table to reuse its label.
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
        // Elemental "Adds # to @ ..." prefixes are better shown as concise
        // "Fire Damage" etc. — detect and fall through to familyId humanize.
        const isAdds = labelSrc.includes('Adds #') || labelSrc.includes('Fügt') || labelSrc.includes('Adds');
        if (!isAdds) {
            const lines = labelSrc.split('\n');
            const cleaned = lines.map(line => {
                let c = line.replace(/[#@]/g, '').trim();
                c = c.replace(/^\+\s*/, '').trim();
                // strip leading "to " leftover from "+# to X"
                c = c.replace(/^to\s+/i, '').trim();
                c = c.replace(/^zu\s+/i, '').trim();
                c = c.replace(/\s+/g, ' ').trim();
                // also strip stray leading "to " after the plus removal for DE "zu "
                return c;
            }).filter(Boolean);
            if (cleaned.length > 0) {
                // Join hybrid lines with " + "
                // e.g. "+# to Maximum Health\n+@ to Armour" -> "Maximum Health + Armour"
                const joined = cleaned.join(' + ');
                // Remove empty artefacts like "Adds to" leftover
                if (joined && joined.toLowerCase() !== 'adds to' && joined.length > 2) return joined;
            }
        }
    }
    // Fallback: humanize the familyId itself.
    // hybrid_life_armour -> "Life + Armour", flat_health -> "Health", inc_armour -> "Increased Armour"
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
        shadow_resist: 'Schattenwiderstand',
        time_added: 'Zusätzliche Zeit', mistake_count: 'Erlaubte Fehler', mistake_not_count: 'Fehlerfreiheit', focus: 'Fokus',
        reveal_hint: 'Hinweischance', chance_for_new_question: 'Neue Frage',
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
        shadow_resist: 'Shadow Resistance',
        time_added: 'Time Added', mistake_count: 'Allowed Mistakes', mistake_not_count: 'Uncounted Mistakes', focus: 'Focus',
        reveal_hint: 'Hint Chance', chance_for_new_question: 'New Question Chance',
    };
    if (enMap[familyId]) return enMap[familyId];
    // Generic title-case fallback with "+" for hybrids
    const parts = familyId.split('_').filter(p => p !== 'flat' && p !== 'inc' && p !== 'hybrid');
    const titled = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1));
    const prefix = familyId.startsWith('inc_') ? (LANG === 'de' ? 'Erhöhte ' : 'Increased ') : '';
    if (familyId.startsWith('hybrid_')) return titled.join(' + ');
    return prefix + titled.join(' ');
}

// Builds the inner HTML for the essence tooltip's "Guaranteed by item class" section.
// Grouped by the resolved guaranteed family per slotType.
function _egBuildEssenceDetailHTML(def) {
    if (!def || !def.guaranteedFamilies || !def.guaranteedFamilies.length) return '';
    if (typeof EG_SLOT_MOD_TABLE_MAP === 'undefined') return '';

    const grouped = new Map(); // familyId -> slotType[]
    const noneSlots = [];

    for (const [slotType, getter] of Object.entries(EG_SLOT_MOD_TABLE_MAP)) {
        let tbl = null;
        try { tbl = getter(); } catch (e) { continue; }
        if (!tbl) continue;
        let found = null;
        for (const fam of def.guaranteedFamilies) {
            if ((tbl.prefixes && tbl.prefixes[fam]) || (tbl.suffixes && tbl.suffixes[fam])) {
                found = fam;
                break;
            }
        }
        if (found) {
            if (!grouped.has(found)) grouped.set(found, []);
            grouped.get(found).push(slotType);
        } else {
            noneSlots.push(slotType);
        }
    }

    const slotLabel = (slotType) => {
        const key = 'eg_slot_' + slotType;
        try { const tr = t(key); if (tr && tr !== key) return tr; } catch (e) {}
        return slotType.charAt(0).toUpperCase() + slotType.slice(1);
    };

    let html = '<div class="eg-tt-section eg-tt-essence-detail">';
    const titleKey = 'eg_essence_guaranteed_title';
    let title = 'Guaranteed modifier by item class:';
    try { const tr = t(titleKey); if (tr && tr !== titleKey) title = tr; } catch (e) {}
    html += `<div class="eg-tt-essence-title">${title}</div>`;

    for (const [familyId, slotTypes] of grouped.entries()) {
        const modName = _egEssenceFamilyDisplayName(familyId);
        const slotsStr = slotTypes.map(slotLabel).join(', ');
        html += `<div class="eg-tt-essence-line"><span class="eg-tt-essence-slots">${slotsStr}:</span> <span class="eg-tt-essence-mod">${modName}</span></div>`;
    }
    if (noneSlots.length > 0) {
        const otherLabel = (typeof LANG !== 'undefined' && LANG === 'de') ? 'Sonstige' : 'Other';
        const randomLabel = (typeof LANG !== 'undefined' && LANG === 'de') ? 'Zufälliger Modifikator' : 'Random modifier';
        const slotsStr = noneSlots.map(slotLabel).join(', ');
        html += `<div class="eg-tt-essence-line"><span class="eg-tt-essence-slots">${slotsStr}:</span> <span class="eg-tt-essence-mod eg-tt-essence-random">${randomLabel}</span></div>`;
    }

    // Footnote: explain fallback & defense gating
    const noteKey = 'eg_essence_guaranteed_note';
    let note = 'First applicable from the essence\u2019s list is guaranteed. If none applies, a random modifier is guaranteed. Local-defense hybrids require matching base defenses.';
    try { const tr = t(noteKey); if (tr && tr !== noteKey) note = tr; } catch (e) {}
    html += `<div class="eg-tt-essence-note">${note}</div>`;
    html += '</div>';
    return html;
}


//------------------------------------------------------------------------
//-------------------ESSENCE DROPS FROM MONSTERS---------------------------
//------------------------------------------------------------------------

const EG_ESSENCE_DROP_TABLE = [
    { id: 'essence_vitality', weight: 100 },
    { id: 'essence_fortress', weight: 90 },
    { id: 'essence_swiftness', weight: 85 },
    { id: 'essence_might', weight: 80 },
    { id: 'essence_sorcery', weight: 80 },
    { id: 'essence_elements', weight: 65 },
    { id: 'essence_puzzle', weight: 90 },
];

const EG_ESSENCE_DROP_CHANCE_NORMAL = 0.06; // 6% per normal kill
const EG_ESSENCE_DROP_CHANCE_BOSS = 0.45;   // bosses often reward one

function _egRollEssenceDef() {
    const total = EG_ESSENCE_DROP_TABLE.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    for (const entry of EG_ESSENCE_DROP_TABLE) {
        roll -= entry.weight;
        if (roll <= 0) return EG_ESSENCE_DEFS[entry.id];
    }
    return EG_ESSENCE_DEFS.essence_vitality;
}

// Called on monster death (see endgame-encounter.js). Essences land on the
// grid as pickup drops and are claimed like currency orbs.
function _egTryDropEssence(isBoss) {
    const baseChance = isBoss ? EG_ESSENCE_DROP_CHANCE_BOSS : EG_ESSENCE_DROP_CHANCE_NORMAL;
    // Active map's loot quantity bonus scales the drop chance up.
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

// Adds `amount` of an essence type to the essence tab grid.
// Finds an existing cell with the same id and increments its count; places
// a new stack in the first free cell otherwise. Returns true on success.
function egAddEssence(id, amount = 1, def = null) {
    for (let r = 0; r < EG_ESSENCE_ROWS; r++) {
        for (let c = 0; c < EG_ESSENCE_COLS; c++) {
            const cell = _egEssenceStash[r][c];
            if (cell && cell.id === id) {
                cell.count = (cell.count || 1) + amount;
                _egRenderEssenceCell(r, c);
                return true;
            }
        }
    }

    if (!def) {
        console.warn(`[ESSENCE] egAddEssence: no existing stack for "${id}" and no def supplied.`);
        return false;
    }

    for (let r = 0; r < EG_ESSENCE_ROWS; r++) {
        for (let c = 0; c < EG_ESSENCE_COLS; c++) {
            if (!_egEssenceStash[r][c]) {
                _egEssenceStash[r][c] = { ...def, id, count: amount };
                _egRenderEssenceCell(r, c);
                return true;
            }
        }
    }

    console.warn(`[ESSENCE] egAddEssence: essence tab is full, could not add "${id}".`);
    return false;
}


//------------------------------------------------------------------------
//-------------------RENDER: ESSENCE TAB----------------------------------
//------------------------------------------------------------------------

// Builds a single essence tab cell div (drop target).
function _egBuildEssenceCellHTML(row, col) {
    return `
<div class="eg-inv-cell eg-essence-cell"
     id="eg-essence-cell-${row}-${col}"
     data-row="${row}" data-col="${col}"
     data-eg-dropzone="essence"
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
    return `
<div class="eg-panel eg-panel-essence">
    <div class="eg-panel-label">${t('eg_essences_tab')}</div>
    <div class="eg-essence-grid" id="eg-essence-grid"
         style="grid-template-columns: repeat(${EG_ESSENCE_COLS}, 1fr);">
        ${cellsHTML}
    </div>
</div>`;
}

// Re-renders a single cell in the essence tab grid.
function _egRenderEssenceCell(row, col) {
    if (!_egEssenceStash[row]) return; // defensive: grid not initialised/normalised
    const cell = document.getElementById(`eg-essence-cell-${row}-${col}`);
    if (!cell) return;
    const item = _egEssenceStash[row][col];
    // _dndBuildCurrencyChipHTML renders any stacked item with its count badge.
    cell.innerHTML = item ? _dndBuildCurrencyChipHTML(item) : '';
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
    // Only one use-mode at a time — cancel a pending orb first.
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

// Keeps use-mode active after an application (shift-click chaining).
// The source cell may have been re-rendered — re-acquire the chip element.
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

    // Essences work on ANY equipment item regardless of rarity — but not on
    // maps or other non-equip items. Uniques are fixed by design and can
    // never be re-rolled.
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

    const newItem = _egApplyEssenceCraft(item, def);
    if (!newItem) {
        const msg = t('eg_currency_cannot_use').replace('{name}', def.name);
        showToast(msg);
        if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'error' });
        _egCancelEssenceUse(true);
        return;
    }
    applyFn(newItem);

    // Consume one essence from the stack.
    stack.count = (stack.count || 1) - 1;
    if (stack.count <= 0) _egEssenceStash[sourceRow][sourceCol] = null;
    _egRenderEssenceCell(sourceRow, sourceCol);

    // Shift-click chaining: keep the essence selected so further shift-clicks
    // re-use it on the next target until the stack runs out.
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
// Registered early (script load time, capture phase) so it fires before the
// DnD file's contextmenu handler and stops it from also processing the click.
document.addEventListener('contextmenu', function (e) {
    const chip = e.target.closest('.eg-item-chip');
    const essenceCell = chip ? chip.closest('.eg-essence-cell') : null;

    // While an essence is selected: right-clicking the selected essence
    // cancels use-mode; right-clicking another essence switches selection.
    if (_egPendingEssenceUse) {
        if (!chip || !essenceCell) return; // not an essence — let other handlers deal with it
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
    if (!essenceCell) return; // not an essence — let other handlers deal with it

    e.preventDefault();
    e.stopImmediatePropagation();

    const r = +essenceCell.dataset.row, c = +essenceCell.dataset.col;
    const item = _egEssenceStash[r][c];
    if (!item || !item.category) return;

    _egStartEssenceUse(EG_ESSENCE_DEFS[item.id] || item, r, c, chip);
}, true);

// Left-click while an essence is selected: apply it to the clicked equip
// item, or cancel if the click isn't a valid target. Registered early so it
// pre-empts the DnD file's drag-pickup mousedown listener.
document.addEventListener('mousedown', function (e) {
    if (!_egPendingEssenceUse) return;
    if (typeof _egPendingCurrencyUse !== 'undefined' && _egPendingCurrencyUse) return; // orb mode wins
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
        _egCancelEssenceUse(); // clicking any essence cancels use-mode
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
            // Re-forged mods change attribute totals, which can flip the
            // requirement-blocked (red) state of other items.
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

// Escape cancels a pending essence use too (after the orb handler).
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
        .eg-tt-essence-mod { color: #f5d98a; font-weight: 600; white-space: nowrap; flex: 0 0 auto; }
        .eg-tt-essence-mod.eg-tt-essence-random { color: #ccc; font-style: italic; font-weight: 400; }
        .eg-tt-essence-note { color: #7a7a8a; font-size: 0.70rem; line-height: 1.35; margin-top: 6px; font-style: italic; opacity: 0.9; }
    `;
    document.head.appendChild(style);
})();
