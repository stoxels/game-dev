//------------------------------------------------------------------------
//------------------------CONSTANTS---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Item sets used for passive-tree weight boosting, defined here so they
// are not recreated on every pickRandomItem() call.
const REVEAL_ITEM_IDS = new Set(['reveal1', 'reveal2', 'reveal3', 'reveal4']);
const MARK_ITEM_IDS = new Set(['markWrong2', 'markWrong4', 'markWrong6', 'markWrong8']);
const TUTOR_ITEM_IDS = new Set(['mistakeEraser', 'mistakeEraser4', 'mistakeEraser6', 'mistakeEraserAll']);
const SHIELD_ITEM_IDS = new Set(['shield']);
const UTILITY_ITEM_IDS = new Set(['freeze', 'shield', 'mistakeEraser', 'mistakeEraser4', 'mistakeEraser6', 'mistakeEraserAll', 'scoutPrimer']);

// Items that are only added to the drop pool when a specific passive node is unlocked.
// Weight 3 is intentionally higher than typical base weights to make them noticeable drops.
const NODE_LOCKED_ITEMS = [
    { id: 'pearlOfHaste', node: 'pearl_of_haste' },
    { id: 'pearlOfSwiftness', node: 'pearl_of_swiftness' },
    { id: 'grandPearl', node: 'grand_pearl' },
    { id: 'theWitch', node: 'keystone_the_witch' },
    { id: 'goldenClock', node: 'keystone_golden_clock' },
    { id: 'shadowSeal', node: 'keystone_shadow_seal' },
];

// Maps common item IDs to their uncommon upgrade target (used by Common Refinement).
const COMMON_REFINEMENT_UPGRADES = {
    'reveal1': 'reveal2',
    'markWrong2': 'markWrong4',
    'addTime60': 'addTime300',
};

// Rarities that are considered "high value" for Apex Collector keystone checks.
const APEX_COLLECTOR_VALID_RARITIES = new Set(['epic', 'legendary', 'artifact', 'cursed']);

// Color definitions per rarity tier, used for item UI rendering.
const RARITY_COLOR_MAP = {
    common: { border: '#7a7a7a', color: '#b0b0b0' },
    uncommon: { border: '#2ecc71', color: '#2ecc71' },
    rare: { border: '#3498db', color: '#3498db' },
    epic: { border: '#9b59b6', color: '#c39bd3' },
    legendary: { border: '#f39c12', color: '#f5b642' },
    cursed: { border: '#e74c3c', color: '#e74c3c' },
    artifact: { border: '#f1c40f', color: '#f1c40f' },
};

// Passive-tree node -> boost amount tables, keyed by the category they affect.
// Consumed by _calcWeightBoosts() via _sumSkillBoosts(). Kept as data here so
// adding/tuning a tier doesn't require touching function bodies.
const WEIGHT_BOOST_NODES = {
    quality: [['quality_loot_1', 0.10], ['quality_loot_2', 0.10], ['quality_loot_3', 0.10]],
    cursed: [['cursed_attraction_1', 0.05], ['cursed_attraction_2', 0.05], ['cursed_attraction_3', 0.10]],
    reveal: [['seeker_of_light_1', 0.15], ['seeker_of_light_2', 0.15], ['seeker_of_light_3', 0.20]],
    mark: [['error_collector_1', 0.15], ['error_collector_2', 0.15], ['error_collector_3', 0.20]],
    tutor: [['mentors_following_1', 0.15], ['mentors_following_2', 0.15], ['mentors_following_3', 0.20]],
    shield: [['wardens_stockpile_1', 0.15], ['wardens_stockpile_2', 0.15], ['wardens_stockpile_3', 0.20]],
    utility: [['utility_hoarder_1', 0.15], ['utility_hoarder_2', 0.15], ['utility_hoarder_3', 0.20]],
};

// Common Refinement node -> upgrade-chance amount table. Same shape as
// WEIGHT_BOOST_NODES so it can go through the same _sumSkillBoosts() helper.
const COMMON_REFINEMENT_NODES = [
    ['common_refinement_1', 0.05],
    ['common_refinement_2', 0.05],
    ['common_refinement_3', 0.10],
];


//------------------------------------------------------------------------
//------------------------TRANSLATION HELPERS-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the localised display name for an item definition.
function itemName(def) {
    return LANG === 'de' ? def.nameDE : def.nameEn;
}

// Returns the localised description for an item definition.
function itemDesc(def) {
    return LANG === 'de' ? def.descDE : def.descEn;
}


//------------------------------------------------------------------------
//------------------------RARITY HELPERS----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns border and text color for a given rarity string.
// Falls back to CSS variables if the rarity is unknown.
function rarityColors(rarity) {
    return RARITY_COLOR_MAP[rarity] || { border: 'var(--border2)', color: 'var(--accent2)' };
}

// Returns true if the given rarity qualifies under Apex Collector rules
// (i.e. the item would not be suppressed).
function isApexValidRarity(rarity) {
    return APEX_COLLECTOR_VALID_RARITIES.has(rarity);
}


//------------------------------------------------------------------------
//--------------------ITEM POOL BUILDING----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the base item pool from ITEM_DEFS, excluding items with weight <= 0.
function _buildBaseItemPool() {
    return Object.values(ITEM_DEFS).filter(d => d.weight > 0);
}

// Appends node-locked items to the pool if their corresponding passive node is unlocked.
// These items are injected with a fixed weight of 3.
function _injectNodeLockedItems(pool) {
    NODE_LOCKED_ITEMS.forEach(({ id, node }) => {
        if (ptHasSkill(node) && ITEM_DEFS[id]) {
            pool.push({ ...ITEM_DEFS[id], weight: 3 });
        }
    });
}

// Sums the boost amount for every [node, amount] pair whose node is unlocked.
// Shared by weight-boost calculation and Common Refinement's upgrade chance.
function _sumSkillBoosts(nodeAmountPairs) {
    return nodeAmountPairs.reduce((total, [node, amount]) => total + (ptHasSkill(node) ? amount : 0), 0);
}

// Calculates all passive-tree weight boost multipliers in one place.
// Each returned value is an additive fraction (e.g. 0.20 = +20%).
function _calcWeightBoosts() {
    const boosts = {};
    for (const category in WEIGHT_BOOST_NODES) {
        boosts[category] = _sumSkillBoosts(WEIGHT_BOOST_NODES[category]);
    }
    return boosts;
}

// Applies all passive-tree weight boosts to a single item entry.
// Returns a new object with the adjusted weight; does not mutate the original.
function _applyWeightBoosts(itemDef, boosts) {
    let w = itemDef.weight;
    const r = itemDef.rarity;

    if ((r === 'epic' || r === 'legendary') && boosts.quality) w *= (1 + boosts.quality);
    if (r === 'cursed' && boosts.cursed) w *= (1 + boosts.cursed);
    if (REVEAL_ITEM_IDS.has(itemDef.id) && boosts.reveal) w *= (1 + boosts.reveal);
    if (MARK_ITEM_IDS.has(itemDef.id) && boosts.mark) w *= (1 + boosts.mark);
    if (TUTOR_ITEM_IDS.has(itemDef.id) && boosts.tutor) w *= (1 + boosts.tutor);
    if (SHIELD_ITEM_IDS.has(itemDef.id) && boosts.shield) w *= (1 + boosts.shield);
    if (UTILITY_ITEM_IDS.has(itemDef.id) && boosts.utility) w *= (1 + boosts.utility);

    return { ...itemDef, weight: w };
}

// Builds the fully adjusted drop pool: base items + node-locked items,
// with all passive-tree weight boosts applied.
function _buildAdjustedItemPool() {
    const pool = _buildBaseItemPool();
    _injectNodeLockedItems(pool);
    const boosts = _calcWeightBoosts();
    return pool.map(d => _applyWeightBoosts(d, boosts));
}


//------------------------------------------------------------------------
//--------------------ITEM SELECTION & POST-PROCESSING-------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Attempts to upgrade a common item to its uncommon variant (Common Refinement node).
// Returns the upgraded item ID if the roll succeeds, or the original ID otherwise.
function _tryApplyCommonRefinement(itemDef) {
    const upgradeChance = _sumSkillBoosts(COMMON_REFINEMENT_NODES);

    if (upgradeChance > 0 && Math.random() < upgradeChance) {
        const upgradeTarget = COMMON_REFINEMENT_UPGRADES[itemDef.id];
        if (upgradeTarget) return upgradeTarget;
    }
    return itemDef.id;
}

// Checks whether an item passes the Apex Collector keystone filter.
// Apex Collector suppresses drops below epic/legendary/artifact/cursed rarity.
// Returns true if the item should be kept, false if it should be suppressed.
function _passesApexCollectorFilter(itemDef) {
    if (!ptHasSkill('keystone_apex_collector')) return true;
    return isApexValidRarity(itemDef.rarity);
}

// Performs a weighted random roll over the adjusted pool and returns the item ID.
// Returns null if Apex Collector suppresses the result.
function _rollWeightedItem(adjustedPool) {
    const total = adjustedPool.reduce((sum, d) => sum + d.weight, 0);
    let roll = Math.random() * total;

    for (const d of adjustedPool) {
        roll -= d.weight;
        if (roll <= 0) {
            if (!_passesApexCollectorFilter(d)) return null;
            if (d.rarity === 'common') return _tryApplyCommonRefinement(d);
            return d.id;
        }
    }

    // Fallback to last entry in case of floating-point rounding
    const fallback = adjustedPool[adjustedPool.length - 1];
    if (!_passesApexCollectorFilter(fallback)) return null;
    return fallback.id;
}


//------------------------------------------------------------------------
//------------------------ITEM PICK ENTRY POINTS--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Standard item drop: builds the pool, applies all boosts, then rolls.
// Returns an item ID string, or null if Apex Collector suppresses the result.
function pickRandomItem() {
    const adjustedPool = _buildAdjustedItemPool();
    return _rollWeightedItem(adjustedPool);
}

// Lucky item drop (e.g. from bonus chests): same as pickRandomItem but with
// a small flat chance to force-drop an artifact when Apex Collector is active.
function pickLuckyItem() {
    if (ptHasSkill('keystone_apex_collector') && Math.random() < 0.03) return 'artifactComplete';
    return pickRandomItem();
}