//------------------------------------------------------------------------
//-------------------SUMMON SPELLS (DATA)----------------------------------
//------------------------------------------------------------------------
// The three Summon charms: each calls one of the heroes onto the grid as a
// companion bot (js/companion-bot/). Not sold in any shop and not dropped as
// charms: they are handed over by co-op clears (see summon-cast.js). A hero
// cannot summon themselves, so each player only ever uses two of the three.

// Tether Stones one summon costs, and the chance a normal kill drops one
// (bosses always drop their share, see summon-cast.js).
export const TETHER_STONE_COST = 3;
export const TETHER_STONE_DROP_CHANCE = 0.08;

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
            + `Costs ${TETHER_STONE_COST} Tether Stones, once per puzzle. The higher your affinity, the stronger the help.`,
        descDE: `Ruft ${nameDE.replace('Beschwöre ', '')} für den Rest dieses Rätsels (oder der Karte) aufs Gitter. `
            + `${nameDE.replace('Beschwöre ', '')} hilft mit Hinweisen, Füllungen und Markierungen und bekämpft die Monster. `
            + `Kostet ${TETHER_STONE_COST} Bindungssteine, einmal pro Rätsel. Je stärker eure Verbundenheit, desto stärker die Hilfe.`,
        sfx: 'classSelected',
    };
}

export const SUMMON_SPELL_DEFS = [
    _summonDef('stox', 'Summon Stox', 'Beschwöre Stox', '📐'),
    _summonDef('trix', 'Summon Trix', 'Beschwöre Trix', '🔮'),
    _summonDef('syla', 'Summon Syla', 'Beschwöre Syla', '🍃'),
];
