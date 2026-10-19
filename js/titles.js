import { Audio_Manager } from './audio/audio.js';
import { ptGenerateNodeDesc } from './probability-tree/pt-effects.js';
import { STATE, save } from './state.js';
import { LANG, t } from './translation/translations.js';

//------------------------------------------------------------------------
//-------------------TITLES (titles.js)-----------------------------------
//------------------------------------------------------------------------
// Score milestones that award a Title. A title is shown in front of the
// character's name, and every title EARNED (not only the equipped one) adds
// its small permanent stat bonus. Bonuses are passive-tree effect specs
// ("key:value", see pt-effects.js), so they ride the same stat channels and
// get both-language tooltip text for free.

//------------------------------------------------------------------------
//-------------------TITLE TABLE-------------------------------------------
//------------------------------------------------------------------------

// score: Score needed. en/de: the name shown in front of the character.
// effects: pt-effects specs granted for as long as the title is owned.
const _title = (score, id, en, de, effects) => ({ score, id, en, de, effects });

export const TITLE_DEFS = Object.freeze([
    _title(150, 'coin_flipper', 'Coin Flipper', 'Münzwerfer', ['life_flat:5']),
    _title(500, 'dice_roller', 'Dice Roller', 'Würfelwerfer', ['accuracy_flat:10']),
    _title(1000, 'sample_taker', 'Sample Taker', 'Stichprobenzieher', ['mana_flat:5']),
    _title(2000, 'tally_keeper', 'Tally Keeper', 'Strichlistenführer', ['armour_flat:10']),
    _title(3500, 'average_seeker', 'Average Seeker', 'Mittelwertsucher', ['timer_start_secs:2']),
    _title(5500, 'pattern_spotter', 'Pattern Spotter', 'Mustererkenner', ['int_flat:2']),
    _title(8000, 'odds_reader', 'Odds Reader', 'Chancenleser', ['item_drop:3']),
    _title(11000, 'variance_tamer', 'Variance Tamer', 'Varianzbändiger', ['life_regen_flat:1']),
    _title(15000, 'probability_adept', 'Probability Adept', 'Wahrscheinlichkeitsadept', ['damage_inc_pct:2']),
    _title(20000, 'bell_curve_walker', 'Bell Curve Walker', 'Glockenkurvenwanderer', ['health_inc_pct:2']),
    _title(26000, 'confidence_keeper', 'Confidence Keeper', 'Konfidenzwächter', ['all_elemental_resist:2']),
    _title(33000, 'distribution_scholar', 'Distribution Scholar', 'Verteilungsgelehrter', ['agi_flat:2']),
    _title(41000, 'regression_rider', 'Regression Rider', 'Regressionsreiter', ['evasion_flat:15']),
    _title(50000, 'hypothesis_tester', 'Hypothesis Tester', 'Hypothesentester', ['crit_chance_flat:1']),
    _title(60000, 'markov_wanderer', 'Markov Wanderer', 'Markow-Wanderer', ['movement_speed_pct:2']),
    _title(72000, 'monte_carlo_veteran', 'Monte Carlo Veteran', 'Monte-Carlo-Veteran', ['attack_speed_pct:2']),
    _title(85000, 'limit_keeper', 'Limit Keeper', 'Grenzwert-Hüter', ['cast_speed_pct:2']),
    _title(100000, 'entropy_tamer', 'Entropy Tamer', 'Entropiebändiger', ['mana_regen_inc_pct:5']),
    _title(120000, 'bayesian_sage', 'Bayesian Sage', 'Bayes-Weiser', ['crit_multi_flat:5']),
    _title(145000, 'master_of_odds', 'Master of Odds', 'Meister der Chancen', ['life_flat:15']),
    _title(170000, 'sigma_walker', 'Sigma Walker', 'Sigma-Wanderer', ['armour_inc_pct:3']),
    _title(200000, 'chaos_theorist', 'Chaos Theorist', 'Chaostheoretiker', ['elemental_damage_inc_pct:3']),
    _title(235000, 'grand_statistician', 'Grand Statistician', 'Großstatistiker', ['all_elemental_resist:3']),
    _title(275000, 'stochastic_sovereign', 'Stochastic Sovereign', 'Stochastischer Souverän', ['damage_inc_pct:3', 'health_inc_pct:2']),
]);

//------------------------------------------------------------------------
//-------------------LOOKUPS-----------------------------------------------
//------------------------------------------------------------------------

// The player's current Score as a safe number.
function _score() {
    const n = Number(STATE && STATE.totalScore);
    return Number.isFinite(n) ? n : 0;
}

// Localised name of one title.
export function getTitleName(def) {
    if (!def) return '';
    return LANG === 'de' ? def.de : def.en;
}

// Every title a given Score has earned, lowest first.
export function getEarnedTitlesForScore(score) {
    return TITLE_DEFS.filter(def => score >= def.score);
}

// The title shown in front of a name: the equipped one when it is earned,
// otherwise the highest earned title. Works for a live STATE or a save summary.
export function getTitleForScore(score, chosenId) {
    const earned = getEarnedTitlesForScore(score);
    const chosen = chosenId ? earned.find(def => def.id === chosenId) : null;
    return chosen || earned[earned.length - 1] || null;
}

// The title the live player shows right now (null before the first title).
export function getActiveTitle() {
    return getTitleForScore(_score(), STATE && STATE.activeTitle);
}

// "Title Name" for the live player, '' before the first title.
export function getActiveTitleName() {
    return getTitleName(getActiveTitle());
}

// Puts the active title in front of a name: "Dice Roller STOX".
export function withTitle(name) {
    const title = getActiveTitleName();
    return title ? `${title} ${name}` : name;
}

// The next title still to earn, or null when every title is owned.
export function getNextTitle() {
    const score = _score();
    return TITLE_DEFS.find(def => score < def.score) || null;
}

// Top-bar hint, e.g. "430 Score to next title". Trophy line when all are owned.
export function titleProgressText() {
    const next = getNextTitle();
    if (!next) return `🏆 ${t('ls_all_titles')}`;
    return t('ls_next_title').replace('{n}', Math.max(0, next.score - _score()).toLocaleString());
}

//------------------------------------------------------------------------
//-------------------STAT BONUSES------------------------------------------
//------------------------------------------------------------------------

let _specCacheCount = -1;
let _specCache = [];

// Effect specs of every earned title. Read by the stat aggregation in
// endgame-leveling.js, so it is cached until a new title is earned.
export function getTitleEffectSpecs() {
    const earned = getEarnedTitlesForScore(_score());
    if (earned.length !== _specCacheCount) {
        _specCacheCount = earned.length;
        _specCache = earned.flatMap(def => def.effects);
    }
    return _specCache;
}

// Localised stat lines of one title ("+5 to maximum Life").
export function getTitleStatLines(def) {
    return ptGenerateNodeDesc({ effects: def.effects }, LANG).split('\n').filter(Boolean);
}

//------------------------------------------------------------------------
//-------------------MODAL SHELLS------------------------------------------
//------------------------------------------------------------------------

// Builds (once) a stone-framed modal that reuses the Moodle-code modal art.
function _ensureModal(id, titleKey) {
    let modal = document.getElementById(id);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal-bg safe-center';
    modal.innerHTML = `
        <div class="modal-box pw-box titles-box">
            <button class="modal-close" data-close>${t('reset_close')}</button>
            <div class="modal-title" data-title-key="${titleKey}">${t(titleKey)}</div>
            <div class="pw-scroll" data-body></div>
        </div>`;
    modal.addEventListener('click', e => {
        if (e.target === modal || e.target.closest('[data-close]')) _closeModal(modal);
    });
    document.body.appendChild(modal);
    return modal;
}

function _closeModal(modal) {
    if (modal.classList.contains('show')) Audio_Manager.playSFX('modal_close');
    modal.classList.remove('show');
}

function _openModal(modal, titleKey, bodyHtml) {
    modal.querySelector('[data-title-key]').textContent = t(titleKey);
    modal.querySelector('[data-close]').textContent = t('reset_close');
    modal.querySelector('[data-body]').innerHTML = bodyHtml;
    if (!modal.classList.contains('show')) Audio_Manager.playSFX('modal_open');
    modal.classList.add('show');
}

//------------------------------------------------------------------------
//-------------------TITLES LIST-------------------------------------------
//------------------------------------------------------------------------

// One row of the titles list: name, stats, and an Equip button when earned.
function _buildTitleRow(def, activeId) {
    const earned = _score() >= def.score;
    const stats = getTitleStatLines(def).map(l => `<div class="tt-stat">${l}</div>`).join('');
    const state = !earned
        ? `<span class="tt-lock">🔒 ${t('titles_locked_at').replace('{n}', def.score.toLocaleString())}</span>`
        : def.id === activeId
            ? `<span class="tt-equipped">✓ ${t('titles_equipped')}</span>`
            : `<button class="tt-equip" data-equip="${def.id}">${t('titles_equip')}</button>`;
    return `<div class="tt-row${earned ? ' earned' : ''}${def.id === activeId ? ' active' : ''}">
        <div class="tt-main"><div class="tt-name">${getTitleName(def)}</div>${stats}</div>
        <div class="tt-state">${state}</div>
    </div>`;
}

// Opens (or refreshes) the list of all titles. Clicking Equip changes the
// title shown in front of the character name.
export function showTitlesModal() {
    const modal = _ensureModal('titles-modal', 'titles_modal_title');
    const active = getActiveTitle();
    const earnedCount = getEarnedTitlesForScore(_score()).length;
    const head = `<div class="tt-head">
        <div>${t('titles_score_now').replace('{n}', _score().toLocaleString())} · ${titleProgressText()}</div>
        <div class="tt-sub">${t('titles_count').replace('{c}', earnedCount).replace('{n}', TITLE_DEFS.length)}</div>
        <button class="tt-auto${STATE.activeTitle ? '' : ' on'}" data-equip="">${t('titles_auto')}</button>
    </div>`;
    _openModal(modal, 'titles_modal_title', head + TITLE_DEFS.map(def => _buildTitleRow(def, active && active.id)).join(''));
    modal.querySelectorAll('[data-equip]').forEach(btn => btn.addEventListener('click', () => {
        STATE.activeTitle = btn.dataset.equip || null;
        save();
        showTitlesModal();
        if (typeof globalThis.renderLSCharacterAvatar === 'function') globalThis.renderLSCharacterAvatar();
    }));
}

//------------------------------------------------------------------------
//-------------------UNLOCK CEREMONY---------------------------------------
//------------------------------------------------------------------------

// Records every newly earned title (so it is celebrated once) and shows the
// ceremony. Safe to call often: it does nothing when no title is new.
export function checkTitleUnlocks() {
    if (typeof document === 'undefined' || !STATE) return [];
    if (!Array.isArray(STATE.titlesSeen)) STATE.titlesSeen = [];
    const fresh = getEarnedTitlesForScore(_score()).filter(def => !STATE.titlesSeen.includes(def.id));
    if (!fresh.length) return [];
    fresh.forEach(def => STATE.titlesSeen.push(def.id));
    save();
    showTitleCeremony(fresh);
    return fresh;
}

// The ceremony: the highest new title in big glowing letters with its
// bonuses, plus a short list when several unlocked at once.
function showTitleCeremony(fresh) {
    const top = fresh[fresh.length - 1];
    const modal = _ensureModal('title-ceremony', 'titles_ceremony_head');
    const headKey = fresh.length > 1 ? 'titles_ceremony_head_many' : 'titles_ceremony_head';
    const stats = fresh.flatMap(getTitleStatLines).map(l => `<div class="tt-stat">${l}</div>`).join('');
    const others = fresh.length > 1
        ? `<div class="tt-also">${fresh.slice(0, -1).map(getTitleName).join(' · ')}</div>` : '';
    const body = `<div class="tt-ceremony">
        <div class="tt-burst">✦</div>
        <div class="tt-big">${getTitleName(top)}</div>
        ${others}
        <div class="tt-bonus-head">${t('titles_ceremony_stats')}</div>
        ${stats}
        <div class="tt-buttons">
            <button class="tt-equip" data-ceremony="equip">${t('titles_ceremony_equip')}</button>
            <button class="tt-equip" data-ceremony="list">${t('titles_ceremony_view')}</button>
        </div>
    </div>`;
    _openModal(modal, headKey, body);
    Audio_Manager.playSFX('achievement');
    modal.querySelectorAll('[data-ceremony]').forEach(btn => btn.addEventListener('click', () => {
        if (btn.dataset.ceremony === 'equip') STATE.activeTitle = top.id;
        save();
        _closeModal(modal);
        if (typeof globalThis.renderLSCharacterAvatar === 'function') globalThis.renderLSCharacterAvatar();
        if (btn.dataset.ceremony === 'list') showTitlesModal();
    }));
}

// Clicking the score banner of any map / level screen opens the titles list.
if (typeof document !== 'undefined') {
    document.addEventListener('click', e => {
        if (e.target.closest && e.target.closest('#ls-score, #ls-pts-next, .mv-ribbon-combined')) showTitlesModal();
    });
}
