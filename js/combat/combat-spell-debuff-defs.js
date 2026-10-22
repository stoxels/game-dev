import { LANG } from '../translation/translations.js';

//------------------------------------------------------------------------
//-------------------SPELL DEBUFFS & COMBO TABLE (DATA)-------------------
//------------------------------------------------------------------------
// Data for the spell combo system: the new enemy debuffs spells can apply,
// which spells apply or react to them, and the text shown on tooltips and
// status chips. The rules that use this data live in combat-spell-combos.js.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------

// Every debuff a spell can put on an enemy. They live in monster.statuses next
// to the old ailments, so the status chips and expiry work for them unchanged.
//   icon      chip symbol            durationS   how long it lasts
//   stackMax  stacking debuffs only  (frostbite / static fill up, then pop)
export const SPELL_DEBUFFS = {
    brittle: {
        icon: '🧊', durationS: 8,
        nameEn: 'Brittle', nameDE: 'Spröde',
        tipEn: 'The next physical or lightning hit shatters it for +40% damage.',
        tipDE: 'Der nächste physische oder Blitz-Treffer zerschmettert es für +40% Schaden.',
    },
    conductive: {
        icon: '🔌', durationS: 6,
        nameEn: 'Conductive', nameDE: 'Leitend',
        tipEn: 'Every hit arcs 25% of its damage to another enemy.',
        tipDE: 'Jeder Treffer springt mit 25% Schaden auf einen anderen Gegner über.',
    },
    withered: {
        icon: '🥀', durationS: 8,
        nameEn: 'Withered', nameDE: 'Verdorrt',
        tipEn: 'Takes +20% shadow damage and deals 20% less damage. Spreads when it dies.',
        tipDE: 'Erleidet +20% Schattenschaden und verursacht 20% weniger Schaden. Breitet sich beim Tod aus.',
    },
    exposed: {
        icon: '🎯', durationS: 8,
        nameEn: 'Exposed', nameDE: 'Entblößt',
        tipEn: 'Physical damage reduction is lowered by 25%.',
        tipDE: 'Physische Schadensreduktion ist um 25% gesenkt.',
    },
    marked: {
        icon: '📍', durationS: 10,
        nameEn: 'Marked', nameDE: 'Markiert',
        tipEn: 'The next hit from a DIFFERENT spell deals +30% damage.',
        tipDE: 'Der nächste Treffer eines ANDEREN Zaubers verursacht +30% Schaden.',
    },
    doomed: {
        icon: '⏳', durationS: 6,
        nameEn: 'Doomed', nameDE: 'Verdammt',
        tipEn: 'Stores 40% of the spell damage it takes and releases it as shadow damage when the timer ends (or onto a neighbour if it dies first).',
        tipDE: 'Speichert 40% des erlittenen Zauberschadens und setzt ihn als Schattenschaden frei, wenn die Zeit abläuft (oder auf einen Nachbarn, wenn er vorher stirbt).',
    },
    soaked: {
        icon: '💧', durationS: 8,
        nameEn: 'Soaked', nameDE: 'Durchnässt',
        tipEn: 'Cold and lightning deal +15% damage and chill / shock more easily. A fire hit evaporates it for +20% fire damage.',
        tipDE: 'Kälte und Blitz verursachen +15% Schaden und kühlen / schocken leichter. Ein Feuertreffer verdampft es für +20% Feuerschaden.',
    },
    frostbite: {
        icon: '🥶', durationS: 8, stackMax: 3,
        nameEn: 'Frostbite', nameDE: 'Erfrierung',
        tipEn: 'Builds with cold spells. At 3 stacks the enemy freezes solid for 2 seconds.',
        tipDE: 'Baut sich mit Kälte-Zaubern auf. Bei 3 Stapeln friert der Gegner 2 Sekunden lang ein.',
    },
    static: {
        icon: '🌩️', durationS: 8, stackMax: 3,
        nameEn: 'Static', nameDE: 'Statisch',
        tipEn: 'Builds with lightning spells. At 3 stacks the enemy is stunned.',
        tipDE: 'Baut sich mit Blitz-Zaubern auf. Bei 3 Stapeln wird der Gegner betäubt.',
    },
};

// Combo tuning (the numbers behind the tooltips above and the reactions below).
export const COMBO_TUNING = {
    brittleShatterPct: 40,
    conductiveArcPct: 25,
    conductiveArcGapMs: 500,
    witheredShadowTakenPct: 20,
    witheredDamageLessPct: 20,
    exposedPhysReductionPct: 25,
    markedBonusPct: 30,
    doomedStoreShare: 0.4,
    soakedColdLightningPct: 15,
    soakedChanceBonusPct: 30,
    soakedSteamPct: 20,
    frostbiteFreezeS: 2,
    frostbiteFreezeLockMs: 5000,
    staticStunLockMs: 4000,
    reactionMinShare: 0.3,
    meltPct: 35,
    thermalShockPct: 25,
    superconductPct: 10,
    superconductExposedS: 6,
    overloadShare: 0.4,
    overloadGapMs: 1500,
    perStatusStepPct: 10,
    perStatusMax: 5,
};

// The element reactions the engine knows (and which spell elements trigger them), for the tooltip.
export const COMBO_REACTIONS = [
    { key: 'melt', elements: ['fire'], en: 'Melt: fire on a chilled / brittle / frostbitten enemy +35%, thaws it.', de: 'Schmelzen: Feuer auf einen verkühlten / spröden / erfrorenen Gegner +35%, taut ihn auf.' },
    { key: 'thermal', elements: ['cold'], en: 'Thermal Shock: cold on a burning enemy +25%, puts the fire out.', de: 'Temperaturschock: Kälte auf einen brennenden Gegner +25%, löscht das Feuer.' },
    { key: 'superconduct', elements: ['lightning'], en: 'Superconduct: lightning on a chilled enemy +10% and Exposed.', de: 'Supraleitung: Blitz auf einen verkühlten Gegner +10% und Entblößt.' },
    { key: 'overload', elements: ['fire', 'lightning'], en: 'Overload: fire on shocked (or lightning on burning) enemies blasts the others for 40%.', de: 'Überlast: Feuer auf geschockte (oder Blitz auf brennende) Gegner sprengt die anderen für 40%.' },
];

//------------------------------------------------------------------------
//-------------------PER-SPELL COMBO TABLE--------------------------------
//------------------------------------------------------------------------
// spell id -> what the spell does with enemy debuffs:
//   applies   [{ key, pct }]   chance (%) per hit to put the debuff on the target
//   consumes  [{ key, pct, remove }]   +pct% damage against an enemy that has the
//                              debuff; remove: true uses it up (a detonation)
//   perStatus  +10% per different debuff on the target (max 5 debuffs)
//   spreadOnCrit  a critical hit copies the target's damage-over-time debuffs to
//                  a neighbouring enemy
// Debuff keys are the ones in SPELL_DEBUFFS plus the old ailments (ignite,
// chill, shocked, poison, bleed ...).

const _a = (key, pct) => ({ key, pct });
const _c = (key, pct, remove) => ({ key, pct, remove: !!remove });

export const SPELL_COMBOS = {
    // ── Fire ──
    usp_flamestrike: { applies: [_a('ignite', 30)] },
    usp_meteor: { consumes: [_c('ignite', 50, true)] },
    usp_rain_of_fire: { applies: [_a('ignite', 20)] },
    usp_holy_fire: { applies: [_a('marked', 50)] },
    usp_flameblast: { consumes: [_c('ignite', 60, true)] },
    usp_incinerate: { applies: [_a('ignite', 40)] },
    usp_explosive_shot: { applies: [_a('ignite', 40)], spreadOnCrit: true },
    // ── Cold ──
    usp_frostbolt: { applies: [_a('frostbite', 60)] },
    usp_blizzard: { applies: [_a('soaked', 40), _a('frostbite', 40)] },
    usp_cone_of_cold: { applies: [_a('frostbite', 50)] },
    usp_ice_lance: { consumes: [_c('chill', 60), _c('frozen', 80)] },
    usp_freezing_pulse: { applies: [_a('brittle', 35)] },
    usp_ice_spear: { applies: [_a('brittle', 40), _a('frostbite', 40)] },
    usp_vortex: { applies: [_a('soaked', 50)] },
    usp_cold_snap: { applies: [_a('brittle', 60)], consumes: [_c('frostbite', 50)] },
    // ── Lightning ──
    usp_lightning_bolt: { applies: [_a('static', 50)] },
    usp_chain_lightning: { applies: [_a('conductive', 35)] },
    usp_wrath: { applies: [_a('static', 40)] },
    usp_smite: { applies: [_a('marked', 50)] },
    usp_spark: { applies: [_a('static', 40)] },
    usp_arc: { applies: [_a('conductive', 30)] },
    usp_storm_call: { applies: [_a('soaked', 50), _a('conductive', 30)] },
    usp_ball_lightning: { applies: [_a('conductive', 40)] },
    usp_crackling_lance: { applies: [_a('static', 50)], consumes: [_c('soaked', 40)] },
    usp_orb_of_storms: { applies: [_a('conductive', 35)] },
    usp_discharge: { consumes: [_c('shocked', 60, true), _c('static', 40, true)] },
    // ── Shadow & arcane ──
    usp_shadow_bolt: { applies: [_a('withered', 30)] },
    usp_corruption: { applies: [_a('withered', 50), _a('doomed', 50)] },
    usp_shadow_word_pain: { applies: [_a('doomed', 60)] },
    usp_chaos_bolt: { applies: [_a('marked', 40)] },
    usp_consecration: { applies: [_a('withered', 35)] },
    usp_contagion: { applies: [_a('withered', 60)], spreadOnCrit: true },
    usp_bane: { applies: [_a('doomed', 70)] },
    usp_soulrend: { applies: [_a('withered', 50)] },
    usp_blight: { applies: [_a('withered', 40)], spreadOnCrit: true },
    usp_arcane_missiles: { applies: [_a('marked', 25)] },
    usp_arcane_explosion: { applies: [_a('marked', 30)] },
    usp_arcane_blast: { applies: [_a('marked', 60)] },
    usp_disintegrate: { perStatus: true },
    usp_starfall: { applies: [_a('marked', 35)] },
    // ── Blade ──
    usp_heroic_strike: { applies: [_a('exposed', 25)] },
    usp_mortal_strike: { applies: [_a('exposed', 40)] },
    usp_rend: { applies: [_a('exposed', 30)] },
    usp_execute: { perStatus: true },
    usp_cleave: { applies: [_a('exposed', 20)] },
    usp_crushing_blow: { applies: [_a('exposed', 50)] },
    usp_blade_flurry: { applies: [_a('marked', 20)] },
    usp_seismic_slam: { applies: [_a('exposed', 30)] },
    usp_exsanguinate: { consumes: [_c('bleed', 60, true)] },
    usp_reap: { perStatus: true },
    usp_ethereal_knives: { applies: [_a('exposed', 15)] },
    usp_bladefall: { applies: [_a('exposed', 30)] },
    usp_blade_blast: { applies: [_a('exposed', 30)] },
    // ── Arrows ──
    usp_aimed_shot: { applies: [_a('marked', 60)] },
    usp_multi_shot: { applies: [_a('exposed', 20)] },
    usp_barrage: { applies: [_a('exposed', 20)] },
    usp_arrow_volley: { applies: [_a('exposed', 25)] },
    usp_serpent_sting: { applies: [_a('conductive', 40)] },
};

//------------------------------------------------------------------------
//-------------------TEXT HELPERS-----------------------------------------
//------------------------------------------------------------------------

// Name of an old ailment or new debuff key in the current language (ailments
// keep their plain English label, like the rest of the status chips).
export function comboStatusName(key) {
    const def = SPELL_DEBUFFS[key];
    if (def) return LANG === 'de' ? def.nameDE : def.nameEn;
    const old = { ignite: 'Ignite', chill: 'Chill', frozen: 'Frozen', shocked: 'Shock', poison: 'Poison', bleed: 'Bleed' };
    return old[key] || key;
}

// Tooltip text of a status chip: new debuffs explain themselves, others fall
// back to their name.
export function comboStatusTip(key) {
    const def = SPELL_DEBUFFS[key];
    if (!def) return '';
    return `${comboStatusName(key)}: ${LANG === 'de' ? def.tipDE : def.tipEn}`;
}

// What the old ailments do, in one line each (the new debuffs carry their own text).
const OLD_STATUS_INFO = {
    ignite: { en: 'burns for damage over time (5s)', de: 'brennt und erleidet Schaden über Zeit (5 s)' },
    chill: { en: 'its attack bar fills 50% slower (8s)', de: 'seine Angriffsleiste füllt sich 50% langsamer (8 s)' },
    frozen: { en: 'its attack bar is stopped', de: 'seine Angriffsleiste steht still' },
    shocked: { en: 'takes +25% damage from every hit (5s)', de: 'erleidet +25% Schaden von jedem Treffer (5 s)' },
    poison: { en: 'takes shadow damage over time (5s)', de: 'erleidet Schattenschaden über Zeit (5 s)' },
    bleed: { en: 'takes physical damage over time (5s)', de: 'erleidet physischen Schaden über Zeit (5 s)' },
};

// "Name (8s): what it does" for any status key, name in bold.
function _statusExplained(key) {
    const de = LANG === 'de';
    const def = SPELL_DEBUFFS[key];
    if (def) return `<b>${comboStatusName(key)}</b> (${def.durationS}${de ? ' s' : 's'}): ${de ? def.tipDE : def.tipEn}`;
    const old = OLD_STATUS_INFO[key];
    return `<b>${comboStatusName(key)}</b>: ${old ? (de ? old.de : old.en) : ''}`;
}

// The tooltip's combo block for one spell as sections of ready-to-show lines:
// debuffs it applies, bonus damage against debuffs, and the element reactions
// its damage type can trigger. Empty when there is nothing to say.
export function getSpellComboSections(spellId, element) {
    const de = LANG === 'de';
    const row = SPELL_COMBOS[spellId] || {};
    const sections = [];
    if (row.applies && row.applies.length) {
        sections.push({
            title: de ? 'Wendet Debuffs an' : 'Applies debuffs',
            rows: row.applies.map((a) => `${a.pct}% ${de ? 'Chance' : 'chance'}: ${_statusExplained(a.key)}`),
        });
    }
    const bonus = [];
    (row.consumes || []).forEach((c) => {
        const used = c.remove ? (de ? ' - wird verbraucht' : ' - used up') : '';
        bonus.push(`+${c.pct}% ${de ? 'Schaden gegen' : 'damage vs'} ${_statusExplained(c.key)}${used}`);
    });
    if (row.perStatus) {
        bonus.push(de ? `+${COMBO_TUNING.perStatusStepPct}% Schaden pro verschiedenem Debuff auf dem Ziel (max. ${COMBO_TUNING.perStatusMax})` : `+${COMBO_TUNING.perStatusStepPct}% damage for each different debuff on the target (max ${COMBO_TUNING.perStatusMax})`);
    }
    if (row.spreadOnCrit) {
        bonus.push(de ? 'Kritische Treffer kopieren Brand, Gift und Blutung (halbe Stärke) auf einen Nachbarn' : 'Critical hits copy burn, poison and bleed (half strength) to a neighbouring enemy');
    }
    if (bonus.length) sections.push({ title: de ? 'Bonus' : 'Bonus', rows: bonus });
    const reactions = COMBO_REACTIONS.filter((r) => r.elements.includes(element));
    if (reactions.length) {
        sections.push({ title: de ? 'Elementreaktionen' : 'Element reactions', rows: reactions.map((r) => (de ? r.de : r.en)) });
    }
    return sections;
}
