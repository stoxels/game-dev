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
    { key: 'endgame', icon: '⚔️', labelEn: 'Endgame', labelDE: 'Endgame' },
];



//------------------------------------------------------------------------
//------------------CATEGORY OVERVIEW — ASSETS & STATE--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// ACH_CATEGORY_ASSETS — per-category card artwork and accent glow colour,
// keyed by ACH_CATEGORIES key. The colours mirror the glow tones of the
// category-overview reference art. Categories without an entry fall back
// to the default glow colour in the card builder.
const ACH_CATEGORY_ASSETS = {
    completion: { img: 'images/Achievement_Screen/Achievements_Category_Completion.png',       glow: '#7ef29a' },
    difficulty: { img: 'images/Achievement_Screen/Achievements_Category_Difficulty.png',       glow: '#ff6464' },
    grid:       { img: 'images/Achievement_Screen/Achievements_Category_GridPuzzles.png',      glow: '#5ad8ff' },
    score:      { img: 'images/Achievement_Screen/Achievements_Category_Score.png',            glow: '#c07bff' },
    time:       { img: 'images/Achievement_Screen/Achievements_Category_TimeSpeed.png',        glow: '#5ad8ff' },
    mistakes:   { img: 'images/Achievement_Screen/Achievements_category_MistakesComeback.png', glow: '#c07bff' },
    items:      { img: 'images/Achievement_Screen/Achievements_Category_ItemsInventory.png',   glow: '#5ad8ff' },
    quiz:       { img: 'images/Achievement_Screen/Achievements_Category_QuizExcercises.png',   glow: '#5ad8ff' },
    class:      { img: 'images/Achievement_Screen/Achievements_Category_ClassesAbilities.png', glow: '#7ef29a' },
    tree:       { img: 'images/Achievement_Screen/Achievements_Category_ProbabilityTree.png',  glow: '#7ef29a' },
    inference:  { img: 'images/Achievement_Screen/Achievements_Category_Inference.png',        glow: '#ffc857' },
    endgame:    { img: 'images/Achievement_Screen/Achievements_Category_Endgame.png',          glow: '#c07bff' },
};

// Which view is currently rendered inside #ach-body:
//   'overview' → the category card grid
//   'category' → the achievements of one specific category
let _achView = 'overview';
let _achCurrentCategory = null;

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
    return `${baseDesc} ${t('qa_target')} ${target}`;
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
                <div class="ach-toast-title">🏆 ${t('qa_achievement_unlocked')}</div>
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
    const achLabel = t('qa_ach_completed');
    const mileLabel = t('qa_ach_milestones');

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
//   Renders whichever view is currently active: the category overview grid
//   (default) or the achievement list of one specific category.
//   Calculates all progress values, assembles the header and every category
//   section in order, then injects the result into #ach-body.
function buildAchievementsScreen() {
    const body = document.getElementById('ach-body');
    if (!body) return;

    const lang = _getAchLang();
    const fixed = document.getElementById('ach-overview-fixed');
    // The RESET ALL ACHIEVEMENTS button only makes sense on the overview —
    // hide it while a specific category's achievements are shown.
    const footer = document.querySelector('#achievements-modal .ach-frame-footer');
    if (footer) footer.style.display = (_achView === 'category') ? 'none' : '';

    if (_achView === 'category' && _achCurrentCategory) {
        if (fixed) fixed.innerHTML = ''; // the detail banner renders inside the scroll body
        body.innerHTML = _buildCategoryDetailHtml(_achCurrentCategory, lang);
        _setAchTopbarTitle(_achCurrentCategory, lang);
    } else {
        // Overview: the totals banner + caption live in the fixed header;
        // only the category grid scrolls in .ach-body.
        if (fixed) fixed.innerHTML = _buildOverviewFixedHeaderHtml(lang);
        body.innerHTML = _buildCategoryGridHtml(lang);
        _setAchTopbarTitle(null, lang);
    }
}

// _setAchTopbarTitle — swaps the modal's title plaque between the static
//   "ACHIEVEMENTS" (overview) and the active category's name (detail view).
function _setAchTopbarTitle(catKey, lang) {
    const titleEl = document.getElementById('ach-frame-title');
    if (!titleEl) return;
    if (catKey) {
        const cat = ACH_CATEGORIES.find(c => c.key === catKey);
        titleEl.textContent = cat ? _pickLang(cat, 'label', lang).toUpperCase() : t('scr_achievements');
        titleEl.removeAttribute('data-t'); // keep language switches from resetting it
        titleEl.classList.add('ach-frame-title-category'); // long names wrap/shrink
    } else {
        titleEl.textContent = t('scr_achievements');
        titleEl.setAttribute('data-t', 'scr_achievements');
        titleEl.classList.remove('ach-frame-title-category');
    }
}

// showAchievements — opens the Achievements modal.
//   Resets to the category grid, then rebuilds all cards and progress bars
//   so they always reflect the latest stats.
function showAchievements() {
    _achView = 'overview';
    _achCurrentCategory = null;
    buildAchievementsScreen();
    showModal('achievements-modal');
}

// openAchCategory — shows all achievements of one category inside the
//   achievements screen (the per-category detail view).
function openAchCategory(catKey) {
    _achView = 'category';
    _achCurrentCategory = catKey;
    buildAchievementsScreen();
    document.getElementById('ach-body')?.scrollTo(0, 0);
}

// backToAchCategories — returns from a category detail view to the overview.
function backToAchCategories() {
    _achView = 'overview';
    _achCurrentCategory = null;
    buildAchievementsScreen();
    document.getElementById('ach-body')?.scrollTo(0, 0);
}

// Click delegation for the dynamically-rendered achievement body:
//   - category cards on the overview open their detail view
//   - the detail view's back button returns to the overview
//   - keyboard activation (Enter / Space) mirrors a click on focused cards
// Delegated on document so it survives innerHTML rebuilds of #ach-body.
document.addEventListener('click', (e) => {
    const backBtn = e.target.closest('#btn-ach-cat-back');
    if (backBtn) {
        e.preventDefault();
        backToAchCategories();
        return;
    }
    const card = e.target.closest('.ach-cat-card');
    if (card && card.dataset.cat) {
        openAchCategory(card.dataset.cat);
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest?.('.ach-cat-card');
    if (card && card.dataset.cat) {
        e.preventDefault();
        openAchCategory(card.dataset.cat);
    }
});



//------------------------------------------------------------------------
//-------------------CATEGORY OVERVIEW — HTML BUILDER---------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _buildOverviewFixedHeaderHtml — the non-scrolling header of the overview:
//   the carved grand-totals banner and the "CATEGORY OVERVIEW" caption.
function _buildOverviewFixedHeaderHtml(lang) {
    // Grand totals across every category
    const totalTiers = _countTotalTiers();
    const unlockedTiers = ACH_STATE.unlocked.length;
    const pct = _calcProgressPct(unlockedTiers, totalTiers);

    return `
        <div class="ach-total-banner">
            <span class="ach-total-banner-label"><span class="ach-total-banner-label-text">${t('scr_ach_total_milestones')}</span></span>
            <span class="ach-total-banner-value">${unlockedTiers.toLocaleString()} / ${totalTiers.toLocaleString()}</span>
            <span class="ach-total-banner-pct">${pct}%</span>
            <div class="ach-total-banner-bar">
                <div class="ach-total-banner-bar-inner" style="width:${pct}%"></div>
            </div>
        </div>
        <div class="ach-overview-caption">${t('scr_ach_category_overview')}</div>`;
}

// _buildCategoryGridHtml — the scrolling part of the overview: a responsive
//   grid of clickable category cards. Each card shows the category artwork
//   on its carved panel frame, the two progress counters, and a bar.
function _buildCategoryGridHtml(lang) {
    const grouped = _groupDefsByCategory();

    const cardsHtml = ACH_CATEGORIES
        .filter(cat => (grouped[cat.key] || []).length) // skip empty categories
        .map(cat => _buildCategoryCardHtml(cat, grouped[cat.key] || [], lang))
        .join('');

    return `<div class="ach-cat-grid">${cardsHtml}</div>`;
}

// _buildCategoryCardHtml — one clickable category tile on the overview grid.
function _buildCategoryCardHtml(cat, defs, lang) {
    const catLabel = _pickLang(cat, 'label', lang);
    const totalAchs = defs.length;
    const unlockedAchs = defs.filter(def =>
        def.tiers.every((_, ti) => _isTierUnlocked(def, ti))
    ).length;
    const totalTiers = _countCategoryTiers(defs);
    const unlockedTiers = _countCategoryUnlocked(defs);
    const pct = _calcProgressPct(unlockedTiers, totalTiers);
    const asset = ACH_CATEGORY_ASSETS[cat.key] || {};
    const isComplete = unlockedTiers >= totalTiers;
    // Fully-completed categories burn gold instead of their normal glow
    const glow = isComplete ? 'var(--yellow)' : (asset.glow || 'var(--accent)');
    const bodyStyle = asset.img ? ` style="background-image:url('${asset.img}')"` : '';

    return `
        <div class="ach-cat-card ${isComplete ? 'complete' : ''}"
             role="button" tabindex="0" data-cat="${cat.key}"
             style="--cat-glow: ${glow}">
            <div class="ach-cat-card-banner">
                <img class="ach-cat-card-banner-img" src="images/Achievement_Screen/Achievements_Category_Header.png" alt="">
                <span class="ach-cat-card-title">${catLabel}</span>
            </div>
            <div class="ach-cat-card-body"${bodyStyle}>
                <div class="ach-cat-card-rows">
                    <div class="ach-cat-card-row">
                        <span class="ach-cat-card-row-label">${t('qa_ach_completed')}:</span>
                        <span class="ach-cat-card-row-value">${unlockedAchs} / ${totalAchs}</span>
                    </div>
                    <div class="ach-cat-card-row">
                        <span class="ach-cat-card-row-label">${t('qa_ach_milestones')}:</span>
                        <span class="ach-cat-card-row-value">${unlockedTiers} / ${totalTiers}</span>
                    </div>
                </div>
            </div>
            <div class="ach-cat-card-footer">
                <div class="ach-cat-card-bar-outer">
                    <div class="ach-cat-card-bar-inner" style="width:${pct}%"></div>
                </div>
                <span class="ach-cat-card-pct">${pct}% ${t('scr_ach_pct_complete')}</span>
            </div>
        </div>`;
}

// _buildCategoryDetailHtml — detail view for one category.
//   A single topbar row (back button — category art — progress numbers with
//   the completion bar underneath), followed by every achievement card of
//   that category. The category name itself lives on the modal's title
//   plaque, so no second title row is rendered here.
function _buildCategoryDetailHtml(catKey, lang) {
    const cat = ACH_CATEGORIES.find(c => c.key === catKey);
    if (!cat) return '';

    const defs = _groupDefsByCategory()[catKey] || [];
    const catLabel = _pickLang(cat, 'label', lang);
    const totalTiers = _countCategoryTiers(defs);
    const unlockedTiers = _countCategoryUnlocked(defs);
    const pct = _calcProgressPct(unlockedTiers, totalTiers);
    const cardsHtml = defs.map(def => _buildCardHtml(def, lang)).join('');
    const asset = ACH_CATEGORY_ASSETS[catKey] || {};
    const glow = asset.glow || 'var(--accent)';

    return `
        <div class="ach-cat-detail" style="--cat-glow: ${glow}">
            <div class="ach-cat-detail-topbar">
                <button class="ach-cat-back-btn" id="btn-ach-cat-back">${t('btn_back')}</button>
                <span class="ach-cat-detail-count">${unlockedTiers} / ${totalTiers} — ${pct}%</span>
            </div>
            <div class="ach-cat-detail-bar-outer">
                <div class="ach-cat-detail-bar-inner" style="width:${pct}%"></div>
            </div>
            <div class="ach-grid">${cardsHtml}</div>
        </div>`;
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