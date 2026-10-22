import { LANG } from '../translation/translations.js';

//------------------------------------------------------------------------
//-------------------SPELL DEBUFFS & COMBO TABLE (DATA)-------------------
//------------------------------------------------------------------------
// Data for the spell combo system: the numbers, the new enemy debuffs spells
// can apply, which spells apply or react to them, and the plain-language text
// shown on tooltips and status chips. The rules that use this data live in
// combat-spell-combos.js. Every number in a text is read from COMBO_TUNING,
// so a retune changes the tooltips too.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------

// Combo tuning (the numbers behind the debuff and reaction texts).
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
const T = COMBO_TUNING;

// Every debuff a spell can put on an enemy. They live in monster.statuses next
// to the old ailments, so the status chips and expiry work for them unchanged.
//   icon      chip symbol            durationS   how long it lasts
//   stackMax  stacking debuffs only  (frostbite / static fill up, then pop)
//   adjEn/adjDE  how the enemy is described: "against ... enemies"
//   tipEn/tipDE  what the debuff does, as whole sentences
export const SPELL_DEBUFFS = {
    brittle: {
        icon: '🧊', durationS: 8,
        nameEn: 'Brittle', nameDE: 'Spröde', adjEn: 'brittle', adjDE: 'spröde',
        tipEn: `A Brittle enemy shatters on the next physical or lightning hit and takes ${T.brittleShatterPct}% extra damage. Shattering uses the debuff up.`,
        tipDE: `Ein spröder Gegner zerschellt beim nächsten physischen oder Blitz-Treffer und erleidet ${T.brittleShatterPct}% zusätzlichen Schaden. Das Zerschellen verbraucht den Debuff.`,
    },
    conductive: {
        icon: '🔌', durationS: 6,
        nameEn: 'Conductive', nameDE: 'Leitend', adjEn: 'conductive', adjDE: 'leitende',
        tipEn: `A Conductive enemy passes damage on: every hit sends ${T.conductiveArcPct}% of its damage as lightning to another enemy, at most twice a second.`,
        tipDE: `Ein leitender Gegner gibt Schaden weiter: Jeder Treffer schickt ${T.conductiveArcPct}% seines Schadens als Blitz auf einen anderen Gegner, höchstens zweimal pro Sekunde.`,
    },
    withered: {
        icon: '🥀', durationS: 8,
        nameEn: 'Withered', nameDE: 'Verdorrt', adjEn: 'withered', adjDE: 'verdorrte',
        tipEn: `A Withered enemy takes ${T.witheredShadowTakenPct}% more shadow damage and hits you ${T.witheredDamageLessPct}% weaker. If it dies, Withered jumps to another enemy.`,
        tipDE: `Ein verdorrter Gegner erleidet ${T.witheredShadowTakenPct}% mehr Schattenschaden und trifft dich ${T.witheredDamageLessPct}% schwächer. Stirbt er, springt Verdorrt auf einen anderen Gegner über.`,
    },
    exposed: {
        icon: '🎯', durationS: 8,
        nameEn: 'Exposed', nameDE: 'Entblößt', adjEn: 'exposed', adjDE: 'entblößte',
        tipEn: `An Exposed enemy has lost its protection: its physical damage reduction is ${T.exposedPhysReductionPct}% lower.`,
        tipDE: `Ein entblößter Gegner hat seinen Schutz verloren: Seine physische Schadensreduktion ist um ${T.exposedPhysReductionPct}% gesenkt.`,
    },
    marked: {
        icon: '📍', durationS: 10,
        nameEn: 'Marked', nameDE: 'Markiert', adjEn: 'marked', adjDE: 'markierte',
        tipEn: `The next hit from a different spell deals ${T.markedBonusPct}% extra damage to a Marked enemy. The mark is then used up.`,
        tipDE: `Der nächste Treffer eines anderen Zaubers verursacht bei einem markierten Gegner ${T.markedBonusPct}% zusätzlichen Schaden. Danach ist die Markierung verbraucht.`,
    },
    doomed: {
        icon: '⏳', durationS: 6,
        nameEn: 'Doomed', nameDE: 'Verdammt', adjEn: 'doomed', adjDE: 'verdammte',
        tipEn: `A Doomed enemy stores ${Math.round(T.doomedStoreShare * 100)}% of the spell damage it takes. When the timer runs out, all of it is released as shadow damage. If the enemy dies first, the stored damage hits another enemy instead.`,
        tipDE: `Ein verdammter Gegner speichert ${Math.round(T.doomedStoreShare * 100)}% des erlittenen Zauberschadens. Läuft die Zeit ab, wird alles als Schattenschaden freigesetzt. Stirbt der Gegner vorher, trifft der gespeicherte Schaden stattdessen einen anderen Gegner.`,
    },
    soaked: {
        icon: '💧', durationS: 8,
        nameEn: 'Soaked', nameDE: 'Durchnässt', adjEn: 'soaked', adjDE: 'durchnässte',
        tipEn: `A Soaked enemy takes ${T.soakedColdLightningPct}% more cold and lightning damage and is easier to chill or shock. A fire hit evaporates the water for ${T.soakedSteamPct}% extra fire damage.`,
        tipDE: `Ein durchnässter Gegner erleidet ${T.soakedColdLightningPct}% mehr Kälte- und Blitzschaden und lässt sich leichter verkühlen oder schocken. Ein Feuertreffer verdampft das Wasser für ${T.soakedSteamPct}% zusätzlichen Feuerschaden.`,
    },
    frostbite: {
        icon: '🥶', durationS: 8, stackMax: 3,
        nameEn: 'Frostbite', nameDE: 'Erfrierung', adjEn: 'frostbitten', adjDE: 'erfrorene',
        tipEn: `Every cold hit adds one stack of Frostbite. At 3 stacks the enemy freezes solid for ${T.frostbiteFreezeS} seconds and cannot attack.`,
        tipDE: `Jeder Kälte-Treffer fügt einen Stapel Erfrierung hinzu. Bei 3 Stapeln friert der Gegner ${T.frostbiteFreezeS} Sekunden lang ein und kann nicht angreifen.`,
    },
    static: {
        icon: '🌩️', durationS: 8, stackMax: 3,
        nameEn: 'Static', nameDE: 'Statisch', adjEn: 'charged', adjDE: 'aufgeladene',
        tipEn: 'Every lightning hit adds one stack of Static. At 3 stacks the enemy is stunned for a moment.',
        tipDE: 'Jeder Blitz-Treffer fügt einen Stapel Statik hinzu. Bei 3 Stapeln wird der Gegner kurz betäubt.',
    },
};

// The element reactions the engine knows. `elements` are the spell elements that
// can trigger them; a text can differ per element (Overload works both ways).
export const COMBO_REACTIONS = [
    {
        key: 'melt', elements: ['fire'],
        en: `<b>Melt</b>: fire hitting a chilled, brittle or frostbitten enemy deals ${T.meltPct}% extra damage and ends the cold effects.`,
        de: `<b>Schmelzen</b>: Feuer auf einen verkühlten, spröden oder erfrorenen Gegner verursacht ${T.meltPct}% zusätzlichen Schaden und beendet die Kälte-Effekte.`,
    },
    {
        key: 'thermal', elements: ['cold'],
        en: `<b>Thermal Shock</b>: cold hitting a burning enemy deals ${T.thermalShockPct}% extra damage and puts the fire out.`,
        de: `<b>Temperaturschock</b>: Kälte auf einen brennenden Gegner verursacht ${T.thermalShockPct}% zusätzlichen Schaden und löscht das Feuer.`,
    },
    {
        key: 'superconduct', elements: ['lightning'],
        en: `<b>Superconduct</b>: lightning hitting a chilled enemy deals ${T.superconductPct}% extra damage, ends the chill and leaves the enemy Exposed for ${T.superconductExposedS} seconds.`,
        de: `<b>Supraleitung</b>: Blitz auf einen verkühlten Gegner verursacht ${T.superconductPct}% zusätzlichen Schaden, beendet die Kälte und macht den Gegner ${T.superconductExposedS} Sekunden lang entblößt.`,
    },
    {
        key: 'overload', elements: ['fire', 'lightning'],
        en: {
            fire: `<b>Overload</b>: fire hitting a shocked enemy ends the shock and blasts every other enemy for ${Math.round(T.overloadShare * 100)}% of the damage.`,
            lightning: `<b>Overload</b>: lightning hitting a burning enemy puts out the fire and blasts every other enemy for ${Math.round(T.overloadShare * 100)}% of the damage.`,
        },
        de: {
            fire: `<b>Überlast</b>: Feuer auf einen geschockten Gegner beendet den Schock und sprengt alle anderen Gegner mit ${Math.round(T.overloadShare * 100)}% des Schadens.`,
            lightning: `<b>Überlast</b>: Blitz auf einen brennenden Gegner löscht das Feuer und sprengt alle anderen Gegner mit ${Math.round(T.overloadShare * 100)}% des Schadens.`,
        },
    },
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

// The old ailments, in both languages: name, how long they last and what they do.
const OLD_STATUS_INFO = {
    ignite: {
        nameEn: 'Ignite', nameDE: 'Brand', adjEn: 'burning', adjDE: 'brennende', durationS: 5,
        en: 'A burning enemy takes damage every second.',
        de: 'Ein brennender Gegner erleidet jede Sekunde Schaden.',
    },
    chill: {
        nameEn: 'Chill', nameDE: 'Verkühlung', adjEn: 'chilled', adjDE: 'verkühlte', durationS: 8,
        en: 'A chilled enemy fills its attack bar 50% slower.',
        de: 'Ein verkühlter Gegner füllt seine Angriffsleiste 50% langsamer.',
    },
    frozen: {
        nameEn: 'Frozen', nameDE: 'Eingefroren', adjEn: 'frozen', adjDE: 'eingefrorene', durationS: 0,
        en: 'A frozen enemy cannot attack.',
        de: 'Ein eingefrorener Gegner kann nicht angreifen.',
    },
    shocked: {
        nameEn: 'Shock', nameDE: 'Schock', adjEn: 'shocked', adjDE: 'geschockte', durationS: 5,
        en: 'A shocked enemy takes 25% more damage from every hit.',
        de: 'Ein geschockter Gegner erleidet 25% mehr Schaden von jedem Treffer.',
    },
    poison: {
        nameEn: 'Poison', nameDE: 'Gift', adjEn: 'poisoned', adjDE: 'vergiftete', durationS: 5,
        en: 'A poisoned enemy takes damage every second.',
        de: 'Ein vergifteter Gegner erleidet jede Sekunde Schaden.',
    },
    bleed: {
        nameEn: 'Bleed', nameDE: 'Blutung', adjEn: 'bleeding', adjDE: 'blutende', durationS: 5,
        en: 'A bleeding enemy takes damage every second.',
        de: 'Ein blutender Gegner erleidet jede Sekunde Schaden.',
    },
};

// Any status in one record: name, adjective, duration and the sentence that
// says what it does (spell debuffs and old ailments alike).
function _statusRecord(key) {
    const de = LANG === 'de';
    const def = SPELL_DEBUFFS[key];
    if (def) return { name: de ? def.nameDE : def.nameEn, adj: de ? def.adjDE : def.adjEn, durationS: def.durationS, what: de ? def.tipDE : def.tipEn };
    const old = OLD_STATUS_INFO[key];
    if (old) return { name: de ? old.nameDE : old.nameEn, adj: de ? old.adjDE : old.adjEn, durationS: old.durationS, what: de ? old.de : old.en };
    return { name: key, adj: key, durationS: 0, what: '' };
}

// Name of an old ailment or new debuff key in the current language.
export function comboStatusName(key) {
    return _statusRecord(key).name;
}

// Tooltip text of a status chip on an enemy: its name and what it does.
export function comboStatusTip(key) {
    const rec = _statusRecord(key);
    return SPELL_DEBUFFS[key] ? `${rec.name}: ${rec.what}` : '';
}

// "for 8 seconds" / "für 8 Sekunden" (empty when the status has no timer).
function _forSeconds(seconds) {
    if (!(seconds > 0)) return '';
    return LANG === 'de' ? `für ${seconds} Sekunden ` : ` for ${seconds} seconds`;
}

// One "applies" row: the chance to afflict the target, then what the debuff does.
function _appliesRow(entry) {
    const rec = _statusRecord(entry.key);
    const de = LANG === 'de';
    const text = de
        ? `${entry.pct}% Chance pro Treffer, das Ziel ${_forSeconds(rec.durationS)}mit <b>${rec.name}</b> zu belegen.`
        : `Each hit has a ${entry.pct}% chance to afflict the target with <b>${rec.name}</b>${_forSeconds(rec.durationS)}.`;
    return { text, note: rec.what };
}

// One "bonus damage" row for a spell that hits harder against a debuff.
function _consumesRow(entry) {
    const rec = _statusRecord(entry.key);
    const de = LANG === 'de';
    const text = de
        ? `Verursacht ${entry.pct}% mehr Schaden gegen ${rec.adj} Gegner${entry.remove ? ' und verbraucht den Effekt' : ''}.`
        : `Deals ${entry.pct}% more damage to ${rec.adj} enemies${entry.remove ? ' and uses the effect up' : ''}.`;
    return { text, note: rec.what };
}

// The tooltip's combo block for one spell as sections of rows ({ text, note }):
// debuffs it applies, bonus damage against debuffs, and the element reactions
// its damage type can trigger. Empty when there is nothing to say.
export function getSpellComboSections(spellId, element) {
    const de = LANG === 'de';
    const row = SPELL_COMBOS[spellId] || {};
    const sections = [];
    if (row.applies && row.applies.length) {
        sections.push({ title: de ? 'Wirkung beim Treffer' : 'On hit', rows: row.applies.map(_appliesRow) });
    }
    const bonus = (row.consumes || []).map(_consumesRow);
    if (row.perStatus) {
        const max = T.perStatusStepPct * T.perStatusMax;
        bonus.push({
            text: de
                ? `Verursacht ${T.perStatusStepPct}% mehr Schaden für jeden verschiedenen Debuff auf dem Gegner, bis zu ${max}%.`
                : `Deals ${T.perStatusStepPct}% more damage for every different debuff on the enemy, up to ${max}%.`,
        });
    }
    if (row.spreadOnCrit) {
        bonus.push({
            text: de
                ? 'Bei einem kritischen Treffer breiten sich Brand, Gift und Blutung des Ziels mit halber Stärke auf einen anderen Gegner aus.'
                : 'On a critical hit, burning, poison and bleeding on the target also spread to another enemy at half strength.',
        });
    }
    if (bonus.length) sections.push({ title: de ? 'Bonusschaden' : 'Bonus damage', rows: bonus });
    const reactions = COMBO_REACTIONS.filter((r) => r.elements.includes(element));
    if (reactions.length) {
        const label = { fire: ['Fire', 'Feuer'], cold: ['Cold', 'Kälte'], lightning: ['Lightning', 'Blitz'] }[element];
        sections.push({
            title: de ? `Reaktionen (${label[1]})` : `${label[0]} reactions`,
            note: de
                ? 'Eine Reaktion passiert, wenn der Schaden dieses Zaubers auf einen Gegner trifft, der bereits den passenden Effekt hat.'
                : 'A reaction happens when this spell\'s damage hits an enemy that already has the matching effect.',
            rows: reactions.map((r) => {
                const text = de ? r.de : r.en;
                return { text: typeof text === 'string' ? text : text[element] };
            }),
        });
    }
    return sections;
}
