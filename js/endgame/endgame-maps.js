//------------------------------------------------------------------------
//-------------------ENDGAME MAP ITEMS (PoE-STYLE)------------------------
//------------------------------------------------------------------------
// Rollable map items that drop from monsters and are played through the
// Probability Gate map device.
//
//   - Maps roll rarity + modifiers exactly like equipment:
//       common (0 mods), uncommon (max 1 pre / 1 suf),
//       rare (max 3 pre / 3 suf), epic (max 3 pre / 3 suf).
//   - Every mod family belongs to one of three categories (`affects`):
//       'player'  — weakens the player character
//       'monster' — strengthens the monsters
//       'puzzle'  — changes puzzle behaviour
//   - Maps drop on the grid like loot; claiming one inserts it into the
//     map stash (_egMapStash) shown on the Probability Gate screen.
//
// Load AFTER endgame-equipment-generator.js (reuses _egRollRarity,
// _egRollModCounts, _egRollMods, _egBuildItemName, _egPickTier,
// _egBuildModPool, _egPickModFromPool, EG_MOD_CAPS)
// and AFTER endgame-hub-drag-and-drop.js (needs _egMapStash render helpers).
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONFIGURATION----------------------------------------
//------------------------------------------------------------------------

const EG_MAP_DROP_CHANCE_NORMAL = 0.05;  // 5% per normal monster kill
const EG_MAP_DROP_CHANCE_BOSS = 0.40;    // bosses drop maps often

// Map tier is derived from the monster level of the killing blow context.
function _egRollMapTier(monsterLevel) {
    return Math.max(1, Math.min(16, Math.ceil((monsterLevel || 1) / 4)));
}

// Map base names grouped by tier band. The band containing the rolled tier
// is chosen at random from all bands that cover it.
const EG_MAP_BASE_NAMES = [
    { minTier: 1, maxTier: 4, name: 'Gaussian Grasslands', nameDe: 'Gaußsche Graslande' },
    { minTier: 1, maxTier: 4, name: 'Variance Valley', nameDe: 'Varianztal' },
    { minTier: 1, maxTier: 4, name: 'Frequency Fields', nameDe: 'Frequenzfelder' },
    { minTier: 1, maxTier: 4, name: 'Sampling Savanna Depths', nameDe: 'Tiefe Sampling-Savanne' },
    { minTier: 3, maxTier: 8, name: 'Bayesian Bayou', nameDe: 'Bayes-Bucht' },
    { minTier: 3, maxTier: 8, name: 'Markov Marsh', nameDe: 'Markow-Sumpf' },
    { minTier: 3, maxTier: 8, name: 'Regression Rift Annex', nameDe: 'Regressions-Rift Annex' },
    { minTier: 5, maxTier: 12, name: 'Hypothesis Hinterlands', nameDe: 'Hypothesen-Hinterland' },
    { minTier: 5, maxTier: 12, name: 'Stochastic Stronghold', nameDe: 'Stochastische Festung' },
    { minTier: 5, maxTier: 12, name: 'Entropy Excavation', nameDe: 'Entropie-Excavation' },
    { minTier: 9, maxTier: 16, name: 'Null Hypothesis Void Pocket', nameDe: 'Nullhypothesis-Leerenblase' },
    { minTier: 9, maxTier: 16, name: 'Distribution Den Depths', nameDe: 'Tiefen der Verteilungshöhle' },
    { minTier: 11, maxTier: 16, name: 'The Infinite Nexus', nameDe: 'Der Unendliche Nexus' },
    { minTier: 13, maxTier: 16, name: 'Core of Convergence', nameDe: 'Kern der Konvergenz' },
    { minTier: 14, maxTier: 16, name: 'Vortex of Possibilities: Overload', nameDe: 'Wirbel der Möglichkeiten: Überladung' },
];

function _egPickMapBaseName(mapTier) {
    const bands = EG_MAP_BASE_NAMES.filter(b => mapTier >= b.minTier && mapTier <= b.maxTier);
    const band = bands.length > 0
        ? bands[Math.floor(Math.random() * bands.length)]
        : EG_MAP_BASE_NAMES[0];
    return (LANG === 'de') ? band.nameDe : band.name;
}


//------------------------------------------------------------------------
//-------------------MAP MODIFIER TABLES----------------------------------
//------------------------------------------------------------------------
// Same schema as the equipment tables in endgame-mod-tables.js, plus an
// `affects` tag per family: 'player' | 'monster' | 'puzzle'.
// T1 = best/highest roll. 'weight' higher = more common. 'ilvl' gates tiers.

const EG_MAP_MOD_TABLES = {

    prefixes: {

        // ── Monster-strengthening ────────────────────────────────────
        map_monster_life: {
            id: 'map_monster_life', affects: 'monster',
            label: 'Monsters have +#% more Life', labelDe: 'Monster haben +#% mehr Leben',
            tiers: [
                { tier: 1, min: 26, max: 32, weight: 100, ilvl: 60 },
                { tier: 2, min: 18, max: 25, weight: 300, ilvl: 35 },
                { tier: 3, min: 10, max: 17, weight: 700, ilvl: 12 },
                { tier: 4, min: 5, max: 9, weight: 1400, ilvl: 1 },
            ],
        },
        map_monster_damage: {
            id: 'map_monster_damage', affects: 'monster',
            label: 'Monsters deal +#% more Damage', labelDe: 'Monster verursachen +#% mehr Schaden',
            tiers: [
                { tier: 1, min: 24, max: 30, weight: 100, ilvl: 60 },
                { tier: 2, min: 16, max: 23, weight: 300, ilvl: 35 },
                { tier: 3, min: 9, max: 15, weight: 700, ilvl: 12 },
                { tier: 4, min: 4, max: 8, weight: 1400, ilvl: 1 },
            ],
        },
        map_monster_speed: {
            id: 'map_monster_speed', affects: 'monster',
            label: 'Monsters attack #% faster', labelDe: 'Monster greifen #% schneller an',
            tiers: [
                { tier: 1, min: 22, max: 28, weight: 90, ilvl: 55 },
                { tier: 2, min: 14, max: 21, weight: 280, ilvl: 30 },
                { tier: 3, min: 7, max: 13, weight: 650, ilvl: 10 },
                { tier: 4, min: 3, max: 6, weight: 1300, ilvl: 1 },
            ],
        },
        map_extra_monsters: {
            id: 'map_extra_monsters', affects: 'monster',
            label: '+# Monsters in this Map', labelDe: '+# Monster in dieser Karte',
            tiers: [
                { tier: 1, min: 4, max: 5, weight: 80, ilvl: 50 },
                { tier: 2, min: 2, max: 3, weight: 350, ilvl: 20 },
                { tier: 3, min: 1, max: 1, weight: 900, ilvl: 1 },
            ],
        },

        // ── Player-weakening ─────────────────────────────────────────
        map_player_life: {
            id: 'map_player_life', affects: 'player',
            label: '#% reduced maximum Life', labelDe: '#% reduziertes maximales Leben',
            tiers: [
                { tier: 1, min: 18, max: 24, weight: 100, ilvl: 55 },
                { tier: 2, min: 11, max: 17, weight: 320, ilvl: 28 },
                { tier: 3, min: 5, max: 10, weight: 750, ilvl: 8 },
                { tier: 4, min: 2, max: 4, weight: 1400, ilvl: 1 },
            ],
        },
        map_player_damage: {
            id: 'map_player_damage', affects: 'player',
            label: '#% reduced Damage', labelDe: '#% reduzierter Schaden',
            tiers: [
                { tier: 1, min: 16, max: 22, weight: 100, ilvl: 55 },
                { tier: 2, min: 10, max: 15, weight: 320, ilvl: 28 },
                { tier: 3, min: 4, max: 9, weight: 750, ilvl: 8 },
                { tier: 4, min: 2, max: 3, weight: 1400, ilvl: 1 },
            ],
        },
        map_player_defences: {
            id: 'map_player_defences', affects: 'player',
            label: '#% reduced Armour, Evasion and Absorption', labelDe: '#% reduzierte Rüstung, Ausweichen und Absorption',
            tiers: [
                { tier: 1, min: 20, max: 26, weight: 90, ilvl: 50 },
                { tier: 2, min: 12, max: 19, weight: 300, ilvl: 25 },
                { tier: 3, min: 5, max: 11, weight: 700, ilvl: 6 },
                { tier: 4, min: 2, max: 4, weight: 1300, ilvl: 1 },
            ],
        },

        // ── Puzzle behaviour ─────────────────────────────────────────
        map_puzzle_cells: {
            id: 'map_puzzle_cells', affects: 'puzzle',
            label: '#% larger Puzzle Grids', labelDe: '#% größere Rätselgitter',
            tiers: [
                { tier: 1, min: 24, max: 30, weight: 90, ilvl: 45 },
                { tier: 2, min: 14, max: 23, weight: 330, ilvl: 18 },
                { tier: 3, min: 6, max: 13, weight: 800, ilvl: 1 },
            ],
        },
        map_required_puzzles: {
            id: 'map_required_puzzles', affects: 'puzzle',
            label: '+# required Puzzles', labelDe: '+# benötigte Rätsel',
            tiers: [
                { tier: 1, min: 2, max: 3, weight: 120, ilvl: 40 },
                { tier: 2, min: 1, max: 1, weight: 850, ilvl: 1 },
            ],
        },
    },

    suffixes: {

        // ── Monster-strengthening ────────────────────────────────────
        map_monster_resistances: {
            id: 'map_monster_resistances', affects: 'monster',
            label: 'Monsters have +#% to all Resistances', labelDe: 'Monster haben +#% zu allen Widerständen',
            tiers: [
                { tier: 1, min: 26, max: 34, weight: 100, ilvl: 55 },
                { tier: 2, min: 16, max: 25, weight: 320, ilvl: 30 },
                { tier: 3, min: 8, max: 15, weight: 720, ilvl: 8 },
                { tier: 4, min: 3, max: 7, weight: 1350, ilvl: 1 },
            ],
        },
        map_boss_chance: {
            id: 'map_boss_chance', affects: 'monster',
            label: '+#% chance for an additional Boss', labelDe: '+#% Chance auf einen zusätzlichen Boss',
            tiers: [
                { tier: 1, min: 26, max: 35, weight: 110, ilvl: 50 },
                { tier: 2, min: 14, max: 25, weight: 340, ilvl: 22 },
                { tier: 3, min: 5, max: 13, weight: 800, ilvl: 1 },
            ],
        },

        // ── Player-weakening ─────────────────────────────────────────
        map_fewer_mistakes: {
            id: 'map_fewer_mistakes', affects: 'player',
            label: '-# to Allowed Mistake Count', labelDe: '-# zur erlaubten Fehleranzahl',
            tiers: [
                { tier: 1, min: 2, max: 2, weight: 90, ilvl: 50 },
                { tier: 2, min: 1, max: 1, weight: 900, ilvl: 1 },
            ],
        },
        map_less_time: {
            id: 'map_less_time', affects: 'player',
            label: '-# Seconds to the Map Timer', labelDe: '-# Sekunden zum Karten-Timer',
            tiers: [
                { tier: 1, min: 30, max: 45, weight: 100, ilvl: 50 },
                { tier: 2, min: 15, max: 29, weight: 340, ilvl: 22 },
                { tier: 3, min: 5, max: 14, weight: 850, ilvl: 1 },
            ],
        },
        map_mana_penalty: {
            id: 'map_mana_penalty', affects: 'player',
            label: '#% reduced Mana gained', labelDe: '#% reduziertes erhaltenes Mana',
            tiers: [
                { tier: 1, min: 22, max: 30, weight: 100, ilvl: 48 },
                { tier: 2, min: 12, max: 21, weight: 330, ilvl: 20 },
                { tier: 3, min: 5, max: 11, weight: 780, ilvl: 1 },
            ],
        },

        // ── Puzzle behaviour ─────────────────────────────────────────
        map_extra_questions: {
            id: 'map_extra_questions', affects: 'puzzle',
            label: '+# additional Quiz Questions per Puzzle', labelDe: '+# zusätzliche Quizfragen pro Rätsel',
            tiers: [
                { tier: 1, min: 3, max: 4, weight: 110, ilvl: 42 },
                { tier: 2, min: 2, max: 2, weight: 380, ilvl: 16 },
                { tier: 3, min: 1, max: 1, weight: 900, ilvl: 1 },
            ],
        },
        map_blackout_storm: {
            id: 'map_blackout_storm', affects: 'puzzle',
            label: 'Null Hypothesis mechanics strike #% more often', labelDe: 'Nullhypothesen-Mechaniken greifen #% öfter an',
            tiers: [
                { tier: 1, min: 40, max: 55, weight: 100, ilvl: 52 },
                { tier: 2, min: 22, max: 39, weight: 330, ilvl: 24 },
                { tier: 3, min: 10, max: 21, weight: 780, ilvl: 6 },
                { tier: 4, min: 4, max: 9, weight: 1400, ilvl: 1 },
            ],
        },
    },
};

// Resolves the `affects` category of a rolled map mod.
function _egMapModAffects(familyId) {
    const fam = EG_MAP_MOD_TABLES.prefixes[familyId] || EG_MAP_MOD_TABLES.suffixes[familyId];
    return fam ? fam.affects : 'monster';
}


//------------------------------------------------------------------------
//-------------------MAP GENERATOR-----------------------------------------
//------------------------------------------------------------------------

// Rolls a full map item. Rarity and prefix/suffix counts use the exact same
// rollers as equipment so maps behave identically (max 3 pre + 3 suf = 6 mods).
function _egGenerateMapDrop(monsterLevel = 1) {
    monsterLevel = Math.max(1, Math.round(monsterLevel || 1));

    const rarity = _egRollRarity();
    const { prefixCount, suffixCount } = _egRollModCounts(rarity);
    const mods = (prefixCount + suffixCount) > 0
        ? _egRollMods(prefixCount, suffixCount, EG_MAP_MOD_TABLES, monsterLevel, null)
        : [];

    const mapTier = _egRollMapTier(monsterLevel);
    const baseName = _egPickMapBaseName(mapTier);
    const name = _egBuildItemName(baseName, rarity, mods);

    return {
        id: `map_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        baseId: 'atlas_map',
        name,
        baseName,
        icon: '🗺️',

        category: 'map',
        type: 'map',
        rarity,

        mapTier,
        itemLevel: monsterLevel,
        monsterLevel,
        mods,
    };
}

// Rerolls ALL mods of a map at the given rarity/counts (orb support).
function _egRerollMapMods(map, rarity, prefixCount, suffixCount) {
    const mods = _egRollMods(prefixCount, suffixCount, EG_MAP_MOD_TABLES, map.itemLevel || map.monsterLevel || 1, null);
    const name = _egBuildItemName(map.baseName || map.name, rarity, mods);
    return { ...map, rarity, mods, name };
}

// Adds ONE new mod (prefix or suffix, whichever has room) to a map.
function _egAddOneModToMap(map, rarityForCaps) {
    const existing = map.mods || [];
    const chosenFamilyIds = new Set(existing.map(m => m.familyId));
    const prefixCount = existing.filter(m => m.type === 'prefix').length;
    const suffixCount = existing.filter(m => m.type === 'suffix').length;
    const cap = EG_MOD_CAPS[rarityForCaps];

    const sections = [];
    if (prefixCount < cap.maxPre) sections.push({ type: 'prefix', pool: EG_MAP_MOD_TABLES.prefixes });
    if (suffixCount < cap.maxSuf) sections.push({ type: 'suffix', pool: EG_MAP_MOD_TABLES.suffixes });
    if (sections.length === 0) return map;

    const chosen = sections[Math.floor(Math.random() * sections.length)];
    const pool = _egBuildModPool(chosen.pool, map.itemLevel || map.monsterLevel || 1, chosenFamilyIds, null);
    const entry = _egPickModFromPool(pool);
    if (!entry) return map;

    const tier = _egPickTier(entry.tiers);
    const newMod = {
        familyId: entry.familyId,
        type: chosen.type,
        tier: tier.tier,
        rolledStats: _egBuildRolledStats(entry.family, tier),
    };

    return { ...map, mods: [...existing, newMod] };
}


//------------------------------------------------------------------------
//-------------------ORBS APPLIED TO MAPS---------------------------------
//------------------------------------------------------------------------
// Mirrors the orb semantics from endgame-currency.js, but rolls from the
// MAP modifier tables. Looked up by orb id when an orb is used on a map.

const EG_MAP_CURRENCY_RULES = {
    orb_transmutation: {
        canApply(map) { return map.rarity === 'common'; },
        apply(map) {
            const { prefixCount, suffixCount } = _egRollModCounts('uncommon');
            return _egRerollMapMods(map, 'uncommon', prefixCount, suffixCount);
        },
    },
    orb_alteration: {
        canApply(map) { return map.rarity === 'uncommon'; },
        apply(map) {
            const { prefixCount, suffixCount } = _egRollModCounts('uncommon');
            return _egRerollMapMods(map, 'uncommon', prefixCount, suffixCount);
        },
    },
    orb_augmentation: {
        canApply(map) { return map.rarity === 'uncommon' && (map.mods || []).length === 1; },
        apply(map) {
            const updated = _egAddOneModToMap(map, 'uncommon');
            const name = _egBuildItemName(updated.baseName || updated.name, updated.rarity, updated.mods);
            return { ...updated, name };
        },
    },
    orb_regal: {
        canApply(map) { return map.rarity === 'uncommon'; },
        apply(map) {
            const updated = _egAddOneModToMap({ ...map, rarity: 'rare' }, 'rare');
            const name = _egBuildItemName(updated.baseName || updated.name, 'rare', updated.mods);
            return { ...updated, rarity: 'rare', name };
        },
    },
    orb_alchemy: {
        canApply(map) { return map.rarity === 'common'; },
        apply(map) {
            const { prefixCount, suffixCount } = _egRollModCounts('rare');
            return _egRerollMapMods(map, 'rare', prefixCount, suffixCount);
        },
    },
    orb_chaos: {
        canApply(map) { return map.rarity === 'rare'; },
        apply(map) {
            const { prefixCount, suffixCount } = _egRollModCounts('rare');
            return _egRerollMapMods(map, 'rare', prefixCount, suffixCount);
        },
    },
    orb_scouring: {
        canApply(map) { return map.rarity !== 'common'; },
        apply(map) {
            return { ...map, rarity: 'common', mods: [], name: map.baseName || map.name };
        },
    },
    orb_exalted: {
        canApply(map) {
            if (map.rarity !== 'rare' && map.rarity !== 'epic') return false;
            return (map.mods || []).length < EG_MOD_CAPS.epic.maxTotal;
        },
        apply(map) {
            const updated = _egAddOneModToMap({ ...map, rarity: 'epic' }, 'epic');
            const name = _egBuildItemName(updated.baseName || updated.name, 'epic', updated.mods);
            return { ...updated, rarity: 'epic', name };
        },
    },
    orb_ascension: {
        canApply(map) { return map.rarity === 'common'; },
        apply(map) {
            const { prefixCount, suffixCount } = _egRollModCounts('epic');
            return _egRerollMapMods(map, 'epic', prefixCount, suffixCount);
        },
    },
    orb_elevation: {
        canApply(map) { return map.rarity === 'rare'; },
        apply(map) {
            const { prefixCount, suffixCount } = _egRollModCounts('epic');
            return _egRerollMapMods(map, 'epic', prefixCount, suffixCount);
        },
    },
    orb_cataclysm: {
        canApply(map) { return map.rarity === 'epic'; },
        apply(map) {
            const { prefixCount, suffixCount } = _egRollModCounts('epic');
            return _egRerollMapMods(map, 'epic', prefixCount, suffixCount);
        },
    },
    mirror_of_kalandra: {
        canApply() { return true; },
    },
};


//------------------------------------------------------------------------
//-------------------MAP GRID DROPS---------------------------------------
//------------------------------------------------------------------------
// Maps land on the grid when monsters die. Claiming a map drop banks it
// directly into the Probability Gate map stash (_egMapStash).

const _egMapDrops = new Map();          // "row-col" → map item
let _egMapStashFullToastAt = 0;         // throttle for the stash-full toast

// Returns true when the gate screen map stash has at least one free slot.
function _egMapStashHasFreeSlot() {
    for (let r = 0; r < EG_MAP_STASH_ROWS; r++)
        for (let c = 0; c < EG_MAP_STASH_COLS; c++)
            if (!_egMapStash[r][c]) return true;
    return false;
}

// Writes a map into the first free map stash cell. Returns true on success.
function _egAddMapToMapStash(item) {
    for (let r = 0; r < EG_MAP_STASH_ROWS; r++) {
        for (let c = 0; c < EG_MAP_STASH_COLS; c++) {
            if (!_egMapStash[r][c]) {
                _egMapStash[r][c] = item;
                _egRenderMapStashCell(r, c);
                return true;
            }
        }
    }
    return false;
}

// Called by the kill handlers in endgame-encounter.js.
function _egTryDropMap(isBoss, monsterLevel) {
    const chance = isBoss ? EG_MAP_DROP_CHANCE_BOSS : EG_MAP_DROP_CHANCE_NORMAL;
    if (!isBoss && Math.random() > chance) return;

    const map = _egGenerateMapDrop(monsterLevel);
    if (typeof _egSpawnMapDrop === 'function') _egSpawnMapDrop(map);
}

// Places a map drop on an eligible grid cell (mirrors _egSpawnLootDrop).
function _egSpawnMapDrop(map) {
    if (!_egIsActive() || !map) return;
    if (_egMapDrops.size >= 1) return; // one map drop on the board at a time

    const pool = typeof _egBuildPickupEligiblePool === 'function'
        ? _egBuildPickupEligiblePool()
        : [];
    const filtered = pool.filter(([r, c]) =>
        !_egPickups.has(`${r}-${c}`) &&
        !_egLootDrops.has(`${r}-${c}`) &&
        !_egCurrencyDrops.has(`${r}-${c}`) &&
        !_egItemDrops.has(`${r}-${c}`)
    );
    if (filtered.length === 0) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;

    _egMapDrops.set(key, map);

    // Overlay visual — reuses the loot overlay styling with a map tint class.
    const el = document.getElementById(`g-${r}-${c}`);
    if (el) {
        const span = document.createElement('span');
        span.className = 'eg-pickup-overlay eg-pickup-rarity-uncommon eg-loot-overlay eg-mapdrop-overlay';
        span.id = `eg-mapdrop-${r}-${c}`;
        span.textContent = map.icon || '🗺️';
        el.appendChild(span);
    }

    // Auto-expire after the shared loot lifetime.
    const timer = setTimeout(() => {
        if (_egMapDrops.get(key) === map) {
            _egMapDrops.delete(key);
            _egRemoveMapDropOverlay(key);
        }
    }, EG_LOOT_DROP_LIFETIME_MS);
    if (typeof _egPickupTimers !== 'undefined') _egPickupTimers.push(timer);
}

function _egRemoveMapDropOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-mapdrop-${r}-${c}`);
    if (span) span.remove();
}

function _egAnimateMapDropClaim(row, col, item) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = typeof _egGetElementCentre === 'function' ? _egGetElementCentre(el) : { x: 0, y: 0 };
    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater';
    floater.textContent = item.icon || '🗺️';
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// Called from _egCheckAllClaims (mouse-button-handlers.js) and
// _egAutoClaimDropsOnReveal (endgame-grid-pickups.js). Banks the claimed map
// straight into the Probability Gate map stash.
function _egCheckMapDropClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const map = _egMapDrops.get(key);
    if (!map) return false;

    // Map stash full? Keep the drop on the grid so the player can free up
    // space and try again before it expires.
    if (!_egMapStashHasFreeSlot()) {
        if (Date.now() - _egMapStashFullToastAt > 5000) {
            _egMapStashFullToastAt = Date.now();
            showToast(t('eg_map_stash_full'));
        }
        return false;
    }

    _egMapDrops.delete(key);
    _egRemoveMapDropOverlay(key);
    _egAnimateMapDropClaim(row, col, map);

    _egAddMapToMapStash(map);

    Audio_Manager.playSFX('player_equip_pickup');
    showToast(t('eg_map_claimed')
        .replace('{icon}', map.icon || '')
        .replace('{name}', map.name), _egRarityToastColor(map.rarity));
    egSaveHubState();
    return true;
}

// Called from _egDiscardAllDrops (mouse-button-handlers.js).
function _egDiscardMapDrop(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egMapDrops.has(key)) return;
    const map = _egMapDrops.get(key);
    _egMapDrops.delete(key);
    _egRemoveMapDropOverlay(key);
    if (typeof _egAnimatePickupDiscard === 'function') {
        _egAnimatePickupDiscard(row, col, { emoji: map.icon || '🗺️' });
    }
    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Banks any unclaimed map drops still sitting on the grid. Called on puzzle
// transitions (chain mode) so maps never silently vanish between puzzles.
function _egBankUnclaimedMapDrops() {
    if (_egMapDrops.size === 0) return;
    let banked = 0;
    for (const [, map] of Array.from(_egMapDrops.entries())) {
        if (_egAddMapToMapStash(map)) banked++;
    }
    _egMapDrops.clear();
    document.querySelectorAll('[id^="eg-mapdrop-"]').forEach(el => el.remove());
    if (banked > 0) egSaveHubState();
}


//------------------------------------------------------------------------
//-------------------MAP TOOLTIP------------------------------------------
//------------------------------------------------------------------------

// Builds the tooltip body for map items. Mods are grouped by their
// `affects` category with distinct colors:
//   monster → orange, player → red, puzzle → blue.
function _egBuildMapTooltipBodyHTML(item) {
    const RARITY_COLOR_MAP = {
        common: { border: '#7a7a7a', color: '#b0b0b0' },
        uncommon: { border: '#2ecc71', color: '#2ecc71' },
        rare: { border: '#3498db', color: '#3498db' },
        epic: { border: '#9b59b6', color: '#c39bd3' },
    };
    const rarity = item.rarity || 'common';
    const rc = RARITY_COLOR_MAP[rarity] || RARITY_COLOR_MAP.common;

    const groups = { monster: [], player: [], puzzle: [] };
    (item.mods || []).forEach(mod => {
        const affects = _egMapModAffects(mod.familyId);
        (mod.rolledStats || []).forEach(stat => {
            if (stat.label) groups[affects].push(stat.label);
        });
    });

    const sectionHTML = (titleKey, lines, color) => {
        if (lines.length === 0) return '';
        return `
    <div class="eg-tt-section">
        <div class="eg-tt-group-title" style="color:${color};">${t(titleKey)}</div>
        ${lines.map(l => `<div class="eg-tt-mod" style="color:${color};">${l}</div>`).join('')}
    </div>`;
    };

    const noModsHTML = (item.mods || []).length === 0
        ? `<div class="eg-tt-section"><div class="eg-tt-desc">${t('eg_map_unmodified')}</div></div>`
        : '';

    return `
<div class="eg-tt-frame" style="--tt-border:${rc.border};">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">${item.icon || '🗺️'}</div>
        <div class="eg-tt-name" style="color:${rc.color};">${item.name || '???'}</div>
        <div class="eg-tt-rarity-line" style="color:${rc.border};">${t('eg_maps_label')} · ${t('eg_map_tier_tt').replace('{n}', item.mapTier ?? 1)}</div>
    </div>
    <div class="eg-tt-section">
        <div class="eg-tt-implicit">${t('eg_map_monster_level_tt').replace('{n}', item.monsterLevel ?? item.itemLevel ?? 1)}</div>
    </div>
    ${sectionHTML('eg_map_mods_monster', groups.monster, '#e67e22')}
    ${sectionHTML('eg_map_mods_player', groups.player, '#e74c3c')}
    ${sectionHTML('eg_map_mods_puzzle', groups.puzzle, '#5b9cf6')}
    ${noModsHTML}
</div>`;
}


//------------------------------------------------------------------------
//-------------------CSS INJECTION-----------------------------------------
//------------------------------------------------------------------------

(function _egInjectMapStyles() {
    if (document.getElementById('eg-map-item-styles')) return;
    const style = document.createElement('style');
    style.id = 'eg-map-item-styles';
    style.textContent = `
        /* Gate screen: spacing for the runes & orbs row between device and map stash */
        .eg-gate-currency-section { margin-top: 12px; }
        .eg-gate-currency-section .eg-currency-strip { border: 1px solid var(--border); border-radius: 6px; }
        /* Map drops on the puzzle grid get a golden shimmer to stand out */
        .eg-mapdrop-overlay {
            text-shadow: 0 0 6px rgba(245, 217, 138, 0.9), 0 0 12px rgba(245, 217, 138, 0.5);
        }
        /* Group titles inside the map tooltip */
        .eg-tt-group-title { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 2px; }
        .eg-tt-mod { font-size: 0.85rem; padding: 1px 0; }
        /* Map tier badge on item chips */
        .eg-item-ilvl.eg-map-tier-badge { color: #f5d98a; }
    `;
    document.head.appendChild(style);
})();
