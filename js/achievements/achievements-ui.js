//------------------------------------------------------------------------
//----------------------------CONSTANTS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Ordered list of all categories shown in the achievement screen.
// Each entry drives both the section header and the display order.
const ACH_CATEGORIES = [
    { key: 'completion', icon: '🏁', labelEn: 'Completion', labelDE: 'Abschluss' },
    { key: 'difficulty', icon: '🔥', labelEn: 'Difficulty', labelDE: 'Schwierigkeit' },
    { key: 'grid', icon: '🔲', labelEn: 'Grid & Puzzles', labelDE: 'Gitter & Rätsel' },
    { key: 'score', icon: '💰', labelEn: 'Score', labelDE: 'Punkte' },
    { key: 'time', icon: '⏱', labelEn: 'Time & Speed', labelDE: 'Zeit & Geschwindigkeit' },
    { key: 'mistakes', icon: '💥', labelEn: 'Mistakes & Comebacks', labelDE: 'Fehler & Comebacks' },
    { key: 'items', icon: '🎁', labelEn: 'Items & Inventory', labelDE: 'Items & Inventar' },
    { key: 'quiz', icon: '🧠', labelEn: 'Quiz & Exercises', labelDE: 'Quiz & Aufgaben' },
    { key: 'class', icon: '🔮', labelEn: 'Classes & Abilities', labelDE: 'Klassen & Fähigkeiten' },
    { key: 'tree', icon: '🌳', labelEn: 'Probability Tree', labelDE: 'Wahrscheinlichkeitsbaum' },
    { key: 'inference', icon: '🔍', labelEn: 'Inference', labelDE: 'Inferenz' },
];

// Toast queue state
let _achToastQueue = [];   // pending toasts waiting to be shown one at a time
let _achToastBusy = false; // true while a toast is currently visible; prevents overlap



//------------------------------------------------------------------------
//-------------------------LOCALISATION-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _getAchLang — returns 'de' or 'en' based on the global LANG variable.
function _getAchLang() {
    return (typeof LANG !== 'undefined' && LANG === 'de') ? 'de' : 'en';
}

// _pickLang — picks the correct localised string from an object that has
//   both a labelEn and a labelDE (or nameEn/nameDE, descEn/descDE) field.
//   Pass the field prefix ('label', 'name', 'desc') and the lang string.
//   Example: _pickLang(tier, 'label', lang)  →  tier.labelDE or tier.labelEn
function _pickLang(obj, prefix, lang) {
    return lang === 'de' ? obj[`${prefix}DE`] : obj[`${prefix}En`];
}



//------------------------------------------------------------------------
//-------------------------TIER STATE HELPERS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _isTierUnlocked — returns true if the given tier index of a def has been earned.
//   Single source of truth for tier-unlocked checks; used by both the
//   counters and the card renderers below.
function _isTierUnlocked(def, tierIndex) {
    return ACH_STATE.unlocked.includes(`${def.id}__${tierIndex}`);
}

// _getHighestUnlockedTierIndex — returns the index of the highest earned tier,
//   or -1 if no tier has been unlocked yet.
function _getHighestUnlockedTierIndex(def) {
    let highest = -1;
    def.tiers.forEach((_, ti) => {
        if (_isTierUnlocked(def, ti)) highest = ti;
    });
    return highest;
}



//------------------------------------------------------------------------
//----------------------------TOAST QUEUE---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _drainAchToastQueue — shows the next queued toast if none is currently visible.
//   Called after every toast is dismissed and after a new entry is pushed.
function _drainAchToastQueue() {
    if (_achToastBusy || !_achToastQueue.length) return;
    const { def, tier } = _achToastQueue.shift();
    _showAchToast(def, tier);
}

// _buildToastRequirementText — formats the requirement line shown inside the toast
//   (e.g. "Complete levels  Target: 10").
function _buildToastRequirementText(def, tier, lang) {
    const baseDesc = _pickLang(def, 'desc', lang);
    const target = tier.threshold.toLocaleString();
    return lang === 'de'
        ? `${baseDesc} Ziel: ${target}`
        : `${baseDesc} Target: ${target}`;
}

// _buildToastElement — creates and returns the fully populated DOM element for a toast.
function _buildToastElement(def, tier) {
    const lang = _getAchLang();
    const name = _pickLang(def, 'name', lang);
    const tierLabel = _pickLang(tier, 'label', lang);
    const requirementText = _buildToastRequirementText(def, tier, lang);

    const el = document.createElement('div');
    el.id = 'ach-toast';
    el.innerHTML = `
        <div class="ach-toast-inner">
            <span class="ach-toast-icon">${def.icon}</span>
            <div class="ach-toast-text">
                <div class="ach-toast-title">🏆 Achievement Unlocked!</div>
                <div class="ach-toast-name">${name}: <em>${tierLabel}</em></div>
                <div class="ach-toast-requirement">📋 ${requirementText}</div>
            </div>
        </div>`;
    return el;
}

// _dismissAchToast — fades the toast out, removes it from the DOM,
//   then schedules the next queued toast after a brief gap.
function _dismissAchToast(el) {
    el.classList.remove('show');
    setTimeout(() => {
        el.remove();
        _achToastBusy = false;
        setTimeout(_drainAchToastQueue, 300); // brief gap between consecutive toasts
    }, 500); // matches CSS transition-out duration
}

// _showAchToast — renders and animates a single achievement toast.
//   Visible for ~5 s, then fades out over 0.5 s.
function _showAchToast(def, tier) {
    _achToastBusy = true;
    document.getElementById('ach-toast')?.remove(); // safety: remove any leftover

    const el = _buildToastElement(def, tier);
    document.body.appendChild(el);

    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => _dismissAchToast(el), 5000);

    Audio_Manager.playSFX('achievement');
}

// showAchievementToast — public entry point.
//   Enqueues a toast and starts draining the queue if nothing is currently shown.
function showAchievementToast(def, tier) {
    _achToastQueue.push({ def, tier });
    setTimeout(_drainAchToastQueue, 0);
}



//------------------------------------------------------------------------
//------------------ACHIEVEMENT SCREEN — COUNTERS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _countCategoryTiers — total tier count across all defs in one category.
function _countCategoryTiers(defs) {
    return defs.reduce((sum, def) => sum + def.tiers.length, 0);
}

// _countTotalTiers — total number of tier entries across every achievement definition.
function _countTotalTiers() {
    return _countCategoryTiers(ACHIEVEMENT_DEFS);
}

// _countTotalAchievements — total number of achievement definitions (tiers ignored).
function _countTotalAchievements() {
    return ACHIEVEMENT_DEFS.length;
}

// _countFullyUnlockedAchievements — number of defs where every tier has been earned.
function _countFullyUnlockedAchievements() {
    return ACHIEVEMENT_DEFS.filter(def =>
        def.tiers.every((_, ti) => _isTierUnlocked(def, ti))
    ).length;
}

// _countCategoryUnlocked — total unlocked tier count across all defs in one category.
function _countCategoryUnlocked(defs) {
    return defs.reduce((sum, def) =>
        sum + def.tiers.filter((_, ti) => _isTierUnlocked(def, ti)).length
        , 0);
}

// _calcProgressPct — converts an unlocked / total pair into a 0–100 integer.
function _calcProgressPct(unlocked, total) {
    return Math.round((unlocked / total) * 100);
}

// _groupDefsByCategory — groups all achievement definitions by their category key.
//   Returns a plain object: { categoryKey: [def, def, ...], ... }
//   Defs without a category fall into 'meta'.
function _groupDefsByCategory() {
    const grouped = {};
    ACHIEVEMENT_DEFS.forEach(def => {
        const cat = def.category || 'meta';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(def);
    });
    return grouped;
}



//------------------------------------------------------------------------
//------------------ACHIEVEMENT SCREEN — CARD HELPERS---------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _getCardClass — returns the CSS class string for a card based on its earned state.
function _getCardClass(highestUnlocked, isComplete) {
    if (isComplete) return 'ach-card complete';
    if (highestUnlocked >= 0) return 'ach-card partial';
    return 'ach-card locked';
}

// _getEarnedLabel — returns the localised label for the highest earned tier,
//   or an empty string if nothing has been unlocked yet.
function _getEarnedLabel(def, highestUnlocked, lang) {
    if (highestUnlocked < 0) return '';
    return _pickLang(def.tiers[highestUnlocked], 'label', lang);
}

// _buildTierDotsHtml — returns a row of coloured dot spans, one per tier,
//   indicating which tiers are earned vs. still locked.
function _buildTierDotsHtml(def, lang) {
    return def.tiers.map((tier, ti) => {
        const unlocked = _isTierUnlocked(def, ti);
        const tierLabel = _pickLang(tier, 'label', lang);
        const stateClass = unlocked ? 'earned' : 'locked';
        return `<span class="ach-tier-dot ${stateClass}" title="${tierLabel}">●</span>`;
    }).join('');
}

// _buildCardProgressHtml — returns a progress bar pointing toward the next tier,
//   or an empty string if every tier is already earned.
function _buildCardProgressHtml(def, highestUnlocked, currentVal, lang) {
    const nextTierIdx = highestUnlocked + 1;
    const nextTier = def.tiers[nextTierIdx];
    if (!nextTier) return ''; // all tiers complete — no progress bar needed

    const pct = Math.min(100, Math.round((currentVal / nextTier.threshold) * 100));
    const progressLabel = _pickLang(nextTier, 'label', lang);

    return `
        <div class="ach-card-progress">
            <div class="ach-card-progress-bar-outer">
                <div class="ach-card-progress-bar-inner" style="width:${pct}%"></div>
            </div>
            <span class="ach-card-progress-label">
                ${currentVal.toLocaleString()} / ${nextTier.threshold.toLocaleString()} — <em>${progressLabel}</em>
            </span>
        </div>`;
}



//------------------------------------------------------------------------
//------------------ACHIEVEMENT SCREEN — HTML BUILDERS--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _buildProgressBlockHtml — returns the HTML for a single labelled progress bar block.
//   Used twice inside the overall header (once for achievements, once for milestones).
function _buildProgressBlockHtml(label, current, total, pct, extraBarClass = '') {
    return `
        <div class="ach-progress-block">
            <span class="ach-progress-label">${label}</span>
            <span class="ach-progress-text">${current} / ${total} &nbsp;(${pct}%)</span>
            <div class="ach-progress-bar-outer">
                <div class="ach-progress-bar-inner ${extraBarClass}" style="width:${pct}%"></div>
            </div>
        </div>`;
}

// _buildHeaderHtml — renders the overall progress header with two side-by-side bars:
//   left = fully completed achievements, right = total milestone tiers unlocked.
function _buildHeaderHtml(fullAchs, totalAchs, fullPct, unlockedTiers, totalTiers, milestonePct, lang) {
    const achLabel = lang === 'de' ? 'Achievements abgeschlossen' : 'Achievements Completed';
    const mileLabel = lang === 'de' ? 'Achievement Meilensteine' : 'Achievement Milestones';

    const achBlock = _buildProgressBlockHtml(achLabel, fullAchs, totalAchs, fullPct);
    const mileBlock = _buildProgressBlockHtml(mileLabel, unlockedTiers, totalTiers, milestonePct, 'ach-progress-bar-milestones');

    return `
        <div class="ach-header">
            <div class="ach-progress-dual">
                ${achBlock}
                ${mileBlock}
            </div>
        </div>`;
}

// _buildCardHtml — returns the full HTML for a single achievement card,
//   including icon, name, description, tier dots, earned label, and progress bar.
function _buildCardHtml(def, lang) {
    const val = ACH_STATE.stats[def.stat] || 0;
    const name = _pickLang(def, 'name', lang);
    const desc = _pickLang(def, 'desc', lang);
    const highestUnlocked = _getHighestUnlockedTierIndex(def);
    const isComplete = highestUnlocked === def.tiers.length - 1;
    const cardClass = _getCardClass(highestUnlocked, isComplete);
    const earnedLabel = _getEarnedLabel(def, highestUnlocked, lang);
    const dotsHtml = _buildTierDotsHtml(def, lang);
    const progressHtml = _buildCardProgressHtml(def, highestUnlocked, val, lang);

    return `
        <div class="${cardClass}">
            <div class="ach-card-top">
                <span class="ach-card-icon">${def.icon}</span>
                <div class="ach-card-info">
                    <div class="ach-card-name">${name}</div>
                    <div class="ach-card-desc">${desc}</div>
                    ${earnedLabel ? `<div class="ach-card-earned">✓ ${earnedLabel}</div>` : ''}
                </div>
            </div>
            <div class="ach-tier-dots">${dotsHtml}</div>
            ${progressHtml}
        </div>`;
}

// _buildCategoryHtml — returns the HTML for one full category section
//   (header strip + card grid). Returns an empty string if the category is empty.
function _buildCategoryHtml(cat, defs, lang) {
    if (!defs.length) return '';

    const catLabel = _pickLang(cat, 'label', lang);
    const catTotal = _countCategoryTiers(defs);
    const catUnlocked = _countCategoryUnlocked(defs);
    const cardsHtml = defs.map(def => _buildCardHtml(def, lang)).join('');

    return `
        <div class="ach-category">
            <div class="ach-category-header">
                <span class="ach-category-icon">${cat.icon}</span>
                <span class="ach-category-name">${catLabel}</span>
                <span class="ach-category-count">${catUnlocked} / ${catTotal}</span>
            </div>
            <div class="ach-grid">
                ${cardsHtml}
            </div>
        </div>`;
}



//------------------------------------------------------------------------
//------------------ACHIEVEMENT SCREEN — MAIN BUILDERS--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// buildAchievementsScreen — top-level builder.
//   Calculates all progress values, assembles the header and every category
//   section in order, then injects the result into #ach-body.
function buildAchievementsScreen() {
    const body = document.getElementById('ach-body');
    if (!body) return;

    const lang = _getAchLang();

    const totalTiers = _countTotalTiers();
    const unlockedTiers = ACH_STATE.unlocked.length;
    const milestonePct = _calcProgressPct(unlockedTiers, totalTiers);

    const totalAchs = _countTotalAchievements();
    const fullAchs = _countFullyUnlockedAchievements();
    const fullPct = _calcProgressPct(fullAchs, totalAchs);

    const grouped = _groupDefsByCategory();

    let html = _buildHeaderHtml(fullAchs, totalAchs, fullPct, unlockedTiers, totalTiers, milestonePct, lang);
    html += ACH_CATEGORIES
        .map(cat => _buildCategoryHtml(cat, grouped[cat.key] || [], lang))
        .join('');

    body.innerHTML = html;
}

// showAchievements — opens the Achievements overview screen.
//   Rebuilds all cards and progress bars so they always reflect the latest stats.
function showAchievements() {
    buildAchievementsScreen();
    screenHistory.push('screen-title');
    switchScreen('screen-achievements');
}



//------------------------------------------------------------------------
//-----------------------------MODAL--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// showAchResetModal — opens the achievement-reset confirmation modal.
function showAchResetModal() {
    document.getElementById('ach-reset-modal').style.display = 'flex';
}

// hideAchResetModal — closes the achievement-reset confirmation modal.
function hideAchResetModal() {
    document.getElementById('ach-reset-modal').style.display = 'none';
}