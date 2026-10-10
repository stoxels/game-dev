//----------------------------------------------------------------------
//--------------------ESSENCE FAMILY NAMES (EN / DE)--------------------
//----------------------------------------------------------------------

// How a modifier family is written for the player. The curated table
// inside the display function is the source of truth; anything it
// misses falls back to a title-cased family id, hybrids joined by " + ".

import { LANG } from '../translation/translations.js';
import { EG_SLOT_MOD_TABLE_MAP } from './loot-equipment-mod-tables.js';


// Helper: humanized fallback name when translation key missing
export function _egEssenceFallbackName(familyId) {
    const disp = (typeof _egEssenceFamilyDisplayName === 'function')
        ? _egEssenceFamilyDisplayName(familyId) : familyId;
    return 'Essence of ' + disp;
}
export function _egEssenceFallbackNameDe(familyId) {
    const disp = (typeof _egEssenceFamilyDisplayName === 'function')
        ? _egEssenceFamilyDisplayName(familyId) : familyId;
    return 'Essenz der ' + disp;
}


//----------------------------------------------------------------------
//----------------------------DISPLAY NAMES-----------------------------
//----------------------------------------------------------------------

// Human-readable family display (EN/DE). Prefer the mod's own label stripped of
// placeholders, fall back to a title-cased familyId.  Hybrid families are
// joined with " + ".
export function _egEssenceFamilyDisplayName(familyId) {
    let raw = null;
    let rawDe = null;
    // This runs at module-eval time (the def build calls it) while the
    // slot table may still be initializing inside an import cycle, where a
    // read of the imported binding THROWS instead of reporting 'undefined'.
    // Treat an uninitialized table exactly like an absent one and fall back
    // to the curated names below; at runtime the table is ready and the
    // enriched lookup applies.
    let modTableMap = null;
    try { modTableMap = EG_SLOT_MOD_TABLE_MAP; } catch (e) { modTableMap = null; }
    if (modTableMap) {
        for (const getter of Object.values(modTableMap)) {
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
                // Guard: a real affix label is a short title ("Precision Damage",
                // "+# to Life"), never a full sentence. Some families' mod-table
                // entries store a mechanic *description* instead of a label
                // (e.g. "Each correct cell grants a stack of..."), which used to
                // get used here verbatim and overflow the tooltip. If the cleaned
                // text is too long or reads like a sentence, skip it and fall
                // through to the curated short name below instead.
                const looksLikeSentence = joined.includes('.') || joined.split(' ').length > 5;
                if (joined && joined.toLowerCase() !== 'adds to' && joined.length > 2
                    && joined.length <= 40 && !looksLikeSentence) return joined;
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
        cold_resist: 'Kältewiderstand', lightning_resist: 'Blitzwiderstand',
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
        cold_resist: 'Cold Resistance', lightning_resist: 'Lightning Resistance',
        shadow_resist: 'Shadow Resistance', movement_speed: 'Movement Speed',
        time_added: 'Time Added', mistake_count: 'Allowed Mistakes', mistake_not_count: 'Uncounted Mistakes', focus: 'Focus',
        reveal_hint: 'Hint Chance', chance_for_new_question: 'New Question Chance',
    };
    if (enMap[familyId]) return enMap[familyId];
    if (familyId === 'inc_health') {
        const isDe = (typeof LANG !== 'undefined' && LANG === 'de');
        return isDe ? 'Erhöhtes Leben' : 'Increased Health';
    }
    // Essence-specific thematic names - more flavourful than raw mod labels
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
        healing_power: { en: 'Healing Light', de: 'Heiliges Licht' },
        inc_healing_power: { en: 'Grace', de: 'Gnade' },
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
