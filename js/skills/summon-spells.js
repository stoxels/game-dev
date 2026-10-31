//------------------------------------------------------------------------
//-------------------SUMMON SPELLS (DATA)----------------------------------
//------------------------------------------------------------------------
// The three Summon charms: each calls one of the heroes onto the grid as a
// companion bot (js/companion-bot/). Not sold in any shop and not dropped as
// charms: they are handed over by co-op clears (see summon-cast.js). A hero
// cannot summon themselves, so each player only ever uses two of the three.

// Tether Stones one summon costs at affinity level 1..5 (index 0 = level 1):
// a closer bond is a stronger helper, so it costs more. And the chance a
// normal kill drops one - rare on purpose, a summon should feel special
// (bosses always drop their share, see summon-cast.js).
export const TETHER_STONE_COSTS = [3, 4, 6, 8, 10];
export const TETHER_STONE_DROP_CHANCE = 0.025;

// Stones a summon costs at the given affinity level (1-5).
export function tetherStoneCost(affinityLevel) {
    const i = Math.min(TETHER_STONE_COSTS.length - 1, Math.max(0, (Number(affinityLevel) || 1) - 1));
    return TETHER_STONE_COSTS[i];
}

// The heroes that can be summoned and the charm id of each.
export const SUMMON_HEROES = ['stox', 'trix', 'syla'];

// Skill id of the Summon charm for a hero, e.g. 'usp_summon_syla'.
export function summonSpellId(heroId) {
    return `usp_summon_${heroId}`;
}

// One definition per hero, in the shape of a universal spell (so the hotbar,
// tooltip and charm book treat it like any other spell). `behavior: 'summon'`
// makes the cast path call the companion instead of dealing damage.
function _summonDef(heroId, nameEn, nameDE, icon) {
    return {
        id: summonSpellId(heroId), icon, theme: 'holy', element: 'fire', damageKind: 'holy',
        behavior: 'summon', summonHero: heroId, selfCast: true, manaCost: 0, cooldownSeconds: 0,
        tags: ['Spell', 'Summon'], scalingTags: ['spell', 'summon'],
        nameEn, nameDE,
        descEn: `Calls ${nameEn.replace('Summon ', '')} onto the grid for the rest of this puzzle (or map). `
            + `${nameEn.replace('Summon ', '')} helps with hints, fills and marks and fights the monsters. `
            + `Costs ${TETHER_STONE_COSTS[0]} Tether Stones at affinity 1, up to ${TETHER_STONE_COSTS[4]} at affinity 5, once per puzzle. The higher your affinity, the stronger the help - and the higher the cost.`,
        descDE: `Ruft ${nameDE.replace('Beschwöre ', '')} für den Rest dieses Rätsels (oder der Karte) aufs Gitter. `
            + `${nameDE.replace('Beschwöre ', '')} hilft mit Hinweisen, Füllungen und Markierungen und bekämpft die Monster. `
            + `Kostet ${TETHER_STONE_COSTS[0]} Bindungssteine bei Verbundenheit 1, bis zu ${TETHER_STONE_COSTS[4]} bei Verbundenheit 5, einmal pro Rätsel. Je stärker eure Verbundenheit, desto stärker die Hilfe - und desto höher die Kosten.`,
        sfx: 'classSelected',
    };
}

export const SUMMON_SPELL_DEFS = [
    _summonDef('stox', 'Summon Stox', 'Beschwöre Stox', '📐'),
    _summonDef('trix', 'Summon Trix', 'Beschwöre Trix', '🔮'),
    _summonDef('syla', 'Summon Syla', 'Beschwöre Syla', '🍃'),
];
