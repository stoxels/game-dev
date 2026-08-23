//------------------------------------------------------------------------
//--------------------CONSTANTS-------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Maps internal modifier keys to their short display labels (used in tags)
const MOD_LABELS = {
    timetrial: 'TT',
    hardcore: 'HC',
    ironman: 'IM',
    classless: 'CL',
    treeless: 'TR',
};

// Maps internal modifier keys to their CSS class names (used for tag coloring)
const MOD_CLASSES = {
    timetrial: 'tt',
    hardcore: 'hc',
    ironman: 'im',
    classless: 'cl',
    treeless: 'tl',
};

// Maps internal modifier keys to their i18n translation keys (used in tooltips)
const MOD_I18N_KEYS = {
    timetrial: 'mod_tt',
    hardcore: 'mod_hc',
    ironman: 'mod_im',
    classless: 'mod_cl',
    treeless: 'mod_tl',
};

// Maps bonus types to their display icons (used on level cards)
const BONUS_ICONS = {
    nomiss: '✨',
    fast: '⚡',
    noitem: '🎒',
    quiz: '🧠',
    combo: '🔥',
    lowmiss: '🎯',
    noitem_nomiss: '🎒✨',
    noitem_fast: '🎒⚡',
};

// Ordered difficulty tiers used for star counts and tooltip suggestions
const DIFF_TIERS = ['easy', 'normal', 'hard'];

// All modifier keys in the order they should appear
const ALL_MODS = ['timetrial', 'hardcore', 'ironman', 'classless', 'treeless'];

// Star character constants used in getStars()
const STAR_FILLED = '⭐';
const STAR_EMPTY = '☆';
const STAR_MOD = '★';

// Convergence points are placed at 33% and 66% of a world's levels
const CONVERGENCE_FRACTION_1 = 1 / 3;
const CONVERGENCE_FRACTION_2 = 2 / 3;


//------------------------------------------------------------------------
//--------------------TOP BAR---------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Builds the HTML for a single modifier tag span.
function buildModTagSpan(modKey, labelMap, classMap) {
    const cls = classMap[modKey] || 'diff';
    const label = labelMap[modKey] || modKey.toUpperCase();
    return `<span class="mod-tag ${cls}">${label}</span>`;
}

// Renders the active modifier tags (TT / HC / IM / etc.) and the current difficulty
// tag into the #ls-mods element in the top bar.
function renderLSTopBar() {
    const modEl = document.getElementById('ls-mods');
    const active = Object.keys(curMods).filter(m => curMods[m]);

    modEl.innerHTML =
        active.map(m => buildModTagSpan(m, MOD_LABELS, MOD_CLASSES)).join(' ') +
        ` <span class="mod-tag diff">${t('diff_' + curDiff)}</span>`;
}


// Builds the "points to next unlock code" hint string.
// Returns a trophy message if all codes are already unlocked.
function buildNextCodeStr() {
    const nextCode = WORLD_CODES.find(wc => STATE.totalScore < wc.threshold);
    if (!nextCode) return `🏆 ${t('ls_all_codes')}`;

    const title = LANG === 'de' ? nextCode.titleDE : nextCode.titleEn;
    return `${nextCode.threshold - STATE.totalScore} ${t('ls_to_next')}`;
}

// Renders the total score and the "points to next unlock code" hint into the top bar.
function renderLSScoreRow() {
    document.getElementById('ls-score').textContent = STATE.totalScore;

    const ptsNextEl = document.getElementById('ls-pts-next');
    if (ptsNextEl) ptsNextEl.textContent = buildNextCodeStr();
}


// Applies active-class styling to the class status element when a class is selected.
// Uses ascendency colors if one is active, otherwise falls back to base class colors.
function applyClassStatusActiveStyle(classEl, def, asc) {
    if (asc) {
        const baseName = LANG === 'de' ? def.nameDE : def.nameEn;
        const ascName = LANG === 'de' ? asc.nameDE : asc.nameEn;
        classEl.innerHTML = `${def.icon} ${baseName}<br>${asc.icon} ${ascName}`;
        classEl.style.border = '1px solid ' + asc.color;
        classEl.style.color = asc.colorLight;
    } else {
        classEl.innerHTML = def.icon + ' ' + (LANG === 'de' ? def.nameDE : def.nameEn);
        classEl.style.border = '1px solid ' + def.color;
        classEl.style.color = def.colorLight;
    }

    classEl.style.padding = '3px 8px';
    classEl.style.cursor = 'help';
    classEl.onmouseenter = (e) => showLsClassTooltip(e);
    classEl.onmousemove = (e) => moveLsClassTooltip(e);
    classEl.onmouseleave = () => hideLsClassTooltip();
}

// Resets the class status element to its empty/no-class state.
function applyClassStatusEmptyStyle(classEl) {
    classEl.textContent = t('scr_no_class');
    classEl.style.border = '';
    classEl.style.padding = '';
    classEl.style.color = '';
    classEl.style.opacity = '1';
    classEl.style.cursor = '';
    classEl.onmouseenter = null;
    classEl.onmousemove = null;
    classEl.onmouseleave = null;
}

// Renders the player's current class (or a prompt to pick one) in #ls-class-status.
function renderLSClassStatus() {
    const classEl = document.getElementById('ls-class-status');
    if (!classEl) return;

    if (STATE.playerClass) {
        const def = CLASS_DEFS[STATE.playerClass];
        const asc = STATE.playerAscendency ? ASCENDENCY_DEFS[STATE.playerAscendency] : null;
        applyClassStatusActiveStyle(classEl, def, asc);
    } else {
        applyClassStatusEmptyStyle(classEl);
    }
}


// Updates the Probability Tree button highlight based on available points.
// Shows a golden border and a yellow point count to the right of the label
// when the player has unspent points to spend.
function renderLSPassiveTreeButton() {
    const treePoints = STATE.passiveTreePoints || 0;
    const ptBtn = document.getElementById('btn-go-passive-tree');
    if (!ptBtn) return;

    const hasPoints = treePoints > 0;
    const golden = '#ffd700';

    // Golden glowing border when there are unspent points
    ptBtn.style.border = hasPoints ? `2px solid ${golden}` : '';
    ptBtn.style.boxShadow = hasPoints ? `0 0 8px ${golden}88` : '';

    // Yellow point count appended to the right of the label.
    // Appended as a sibling of the translated label span so the i18n
    // re-render can never wipe it.
    let countEl = document.getElementById('ptb-point-count');
    if (!countEl) {
        countEl = document.createElement('span');
        countEl.id = 'ptb-point-count';
        ptBtn.appendChild(countEl);
    }
    countEl.textContent = hasPoints ? ` (${treePoints})` : '';
    countEl.style.color = hasPoints ? golden : 'inherit';
    countEl.style.fontWeight = hasPoints ? 'bold' : 'normal';
}


//------------------------------------------------------------------------
//--------------------WORLD BLOCKS----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Creates the world-block wrapper div (world label heading + empty level grid container).
function buildWorldBlock(w, wi) {
    const block = document.createElement('div');
    block.className = 'world-block';
    const worldLabel = LANG === 'de' && w.labelDE ? w.labelDE : w.label;
    block.innerHTML = `
        <div class="world-label">${worldLabel}</div>
        <div class="level-grid" id="wg${wi}"></div>`;
    return block;
}

// Clears #ls-body and rebuilds all world blocks and their level card grids.
function renderLSWorlds() {
    const body = document.getElementById('ls-body');
    body.innerHTML = '';

    ensureLSTooltipStyles();
    const tip = ensureLSTooltip();

    WORLDS.forEach((w, wi) => {
        const block = buildWorldBlock(w, wi);
        body.appendChild(block);

        const grid = block.querySelector('#wg' + wi);
        w.data.forEach((p, li) => {
            const card = buildLevelCard(p, li, wi, w, tip);
            grid.appendChild(card);
        });

        // Inject the special Endgame Hub card at the front of World 13 (index 12)

     
        if (wi === 22) {
            const hubCard = buildEndgameHubCard(w, wi, tip);
            grid.prepend(hubCard);
        }
        

    });
}


//------------------------------------------------------------------------
//--------------------LEVEL SELECT ENTRY POINT----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Main entry point — renders all parts of the level select screen.
// Call this whenever the level select needs to be (re)built from scratch.
function renderLevelSelect() {

    // --- MAP VIEW REDIRECT GATEWAY HOOK ---
    if (STATE && STATE.mapViewEnabled) {
        // If a world detail screen was active, go back to that world directly
        // rather than dropping the player at the overworld map every time.
        if (typeof _wdCurrentWi !== 'undefined' && _wdCurrentWi !== null
            && typeof showWorldDetail === 'function') {
            showWorldDetail(_wdCurrentWi);
            return;
        }
        if (typeof showMapView === 'function') {
            showMapView();
            return;
        }
    }

    if (typeof _updateToggleBtnLabels === 'function') _updateToggleBtnLabels();
    renderLSTopBar();
    renderLSScoreRow();
    renderLSClassStatus();
    renderLSPassiveTreeButton();
    renderLSWorlds();
    buildQuestLogButton();
    renderLSCharacterAvatar();
}


// Run toggle state check initializer hook
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initMapViewToggle === 'function') {
        initMapViewToggle();
    }
});


//------------------------------------------------------------------------
//--------------------LEVEL CARD STATE HELPERS----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Returns true if the level at index li is a convergence reward point.
// Convergence points sit at roughly the 33% and 66% marks of a world's levels.
function isLevelConvergence(li, w, isLastInWorld) {
    if (w.data.length <= 2 || isLastInWorld) return false;
    const c1 = Math.floor((w.data.length - 1) * CONVERGENCE_FRACTION_1);
    const c2 = Math.floor((w.data.length - 1) * CONVERGENCE_FRACTION_2);
    return li === c1 || li === c2;
}

// Returns true if the player has beaten this level on Hard with all modifiers active.
// This represents the theoretical maximum completion state for a level.
function isMaxCleared(gi) {
    const hs = STATE.levelHS[gi];
    if (!hs) return false;
    return hs.diff === 'hard' &&
        hs.mods &&
        hs.mods.timetrial &&
        hs.mods.hardcore &&
        hs.mods.ironman &&
        hs.mods.classless &&
        hs.mods.treeless;
}

// Returns a star string based on the difficulty and modifiers of the best run.
// Stars 1–3 reflect difficulty tier; each active modifier appends a bonus star (★).
function getStars(gi) {
    const hs = STATE.levelHS[gi];
    if (!hs) return '';

    const diffIndex = DIFF_TIERS.indexOf(hs.diff || 'easy');
    const starCount = Math.max(1, diffIndex + 1); // easy=1, normal=2, hard=3

    const modCount = hs.mods ? Object.values(hs.mods).filter(Boolean).length : 0;
    const modStars = STAR_MOD.repeat(modCount);

    return STAR_FILLED.repeat(starCount) + STAR_EMPTY.repeat(3 - starCount) + (modStars ? ' ' + modStars : '');
}


//------------------------------------------------------------------------
//--------------------LEVEL CARD BUILDERS---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Builds the CSS class string for a level card based on its current state.
function buildLevelCardClass({ isUnlocked, isDone, isMathGated, isLastInWorld, isConvergenceLevel, w, gi }) {
    return 'level-card' +
        (isUnlocked ? '' : ' locked') +
        (isDone ? ' done' : '') +
        (isMathGated && isUnlocked ? ' math-gated' : '') +
        (isLastInWorld && w.data.length > 1 ? ' ascension' : '') +
        (isConvergenceLevel ? ' convergence' : '') +
        (isMaxCleared(gi) ? ' max-cleared' : '');
}

// Returns the high-score div HTML, or empty string if no score exists yet.
function buildHSHtml(hs) {
    return hs ? `<div class="lc-hs">${t('ls_hs_best')}: ${hs.score}</div>` : '';
}

// Returns the bonus objective div — either a "claimed" badge or the objective hint text.
function buildBonusHtml(p, gi, isUnlocked) {
    if (!isUnlocked) return `<div class="lc-bonus">???</div>`;

    const bIcon = BONUS_ICONS[p.bonusType || 'nomiss'] || '🎯';

    if (STATE.bonusDone.includes(gi)) {
        return `<div class="lc-bonus" style="color:var(--green);opacity:0.7;">✓ ${bIcon} ${t('ls_bonus_claimed')}</div>`;
    }

    return `<div class="lc-bonus">${bIcon} ${lvText(p, 'bonusHint') || t('ls_complete_level')}</div>`;
}

// Returns the modifier-tag row HTML for the mods used in the player's best run.
// Returns empty string if no score or no mods were active.
function buildModTagsHtml(hs) {
    if (!hs || !hs.mods) return '';

    const activeMods = Object.keys(hs.mods).filter(m => hs.mods[m]);
    if (!activeMods.length) return '';

    const modTagsHtml = activeMods.map(m =>
        `<span class="lc-mod-tag ${MOD_CLASSES[m] || 'diff'}">${MOD_LABELS[m] || m.slice(0, 2).toUpperCase()}</span>`
    ).join('');

    const diffLabel = t('diff_' + (hs.diff || 'normal')).slice(0, 1);

    return `<div class="lc-mods">${modTagsHtml}<span class="lc-mod-tag diff">${diffLabel}</span></div>`;
}

// Returns the grid size string "rows×cols", falling back to the world's default size.
function buildGridSizeStr(p, w) {
    return p.grid
        ? `${p.grid.length}×${p.grid[0].length}`
        : (w.size ? `${w.size}×${w.size}` : '?');
}

// Returns the ASCENSION badge HTML for the final level of a world.
// Only shown when the world has more than one level.
function buildAscensionBadge(isLastInWorld, w) {
    if (!isLastInWorld || w.data.length <= 1) return '';
    return `<div class="lc-ascension-badge">${t('scr_ascension_badge')}</div>`;
}

// Returns the CONVERGENCE badge HTML, with a checkmark if the reward is already claimed.
function buildConvergenceBadge(isConvergenceLevel, gi) {
    if (!isConvergenceLevel) return '';

    const claimed = STATE.convergenceDone && STATE.convergenceDone.includes(gi);
    const label = t(claimed ? 'scr_convergence_claimed' : 'scr_convergence_badge');

    return `<div class="lc-convergence-badge">${label}</div>`;
}

// Assembles the full inner HTML for a level card.
function buildLevelCardHTML({ p, li, wi, w, gi, isUnlocked, isDone, hs, isLastInWorld, isConvergenceLevel }) {
    const stars = isDone ? getStars(gi) : '';
    const hsHtml = buildHSHtml(hs);
    const bonusHtml = buildBonusHtml(p, gi, isUnlocked);
    const modTagsHtml = buildModTagsHtml(hs);
    const gridSizeStr = buildGridSizeStr(p, w);
    const ascensionBadge = buildAscensionBadge(isLastInWorld, w);
    const convergenceBadge = buildConvergenceBadge(isConvergenceLevel, gi);
    const maxBadge = isMaxCleared(gi) ? `<div class="lc-max-badge">👑</div>` : '';
    const hintText = isUnlocked ? lvText(p, 'hint') : '???';

    return `
        <div class="lc-num">${wi + 1}-${li + 1}</div>
        <div class="lc-hint">${hintText}</div>
        <div class="lc-sz">${gridSizeStr}</div>
        ${maxBadge}${ascensionBadge}${convergenceBadge}${bonusHtml}${hsHtml}${modTagsHtml}
        <div class="lc-stars">${stars}</div>`;
}

// Attaches click and tooltip mouse events to an unlocked level card.
function attachLevelCardEvents(card, gi, isDone, isMathGated, tip) {
    card.addEventListener('click', () => startLevel(gi));

    // Decide what tip text to show based on completion state
    const tipText = isDone ? getTooltipHint(gi)
        : isMathGated ? t('ls_locked_hint')
            : t('ls_no_score');

    card.addEventListener('mouseenter', () => {
        tip.textContent = tipText;
        tip.classList.add('show');
    });
    card.addEventListener('mousemove', e => {
        tip.style.left = (e.clientX + 14) + 'px';
        tip.style.top = Math.min(e.clientY + 14, window.innerHeight - 80) + 'px';
    });
    card.addEventListener('mouseleave', () => tip.classList.remove('show'));
}

// Builds and returns a fully constructed level card element.
// Resolves all state flags, builds the DOM element, and attaches events if unlocked.
function buildLevelCard(p, li, wi, w, tip) {
    const gi = WORLD_START_GI[wi] + li;
    const isUnlocked = li === 0 ? STATE.tutorialDone : STATE.done.includes(gi - 1);
    const isDone = STATE.done.includes(gi);
    const hs = STATE.levelHS[gi];
    const isMathGated = isGatedLevel(gi) && !isMathGatePassed(gi);
    const isLastInWorld = li === w.data.length - 1;
    const isConvergenceLevel = isLevelConvergence(li, w, isLastInWorld);

    const card = document.createElement('div');
    card.className = buildLevelCardClass({ isUnlocked, isDone, isMathGated, isLastInWorld, isConvergenceLevel, w, gi });
    card.innerHTML = buildLevelCardHTML({ p, li, wi, w, gi, isUnlocked, isDone, hs, isLastInWorld, isConvergenceLevel });

    if (isUnlocked) {
        attachLevelCardEvents(card, gi, isDone, isMathGated, tip);
    }

    return card;
}



//------------------------------------------------------------------------
//--------------------ENDGAME HUB CARD BUILDER----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Dynamically constructs the special Endgame Hub level-card entry.
// Unlocks automatically when the final standard level of World 13 is completed.



function buildEndgameHubCard(w, wi, tip) {
    const hubCard = document.createElement('div');

    // Calculate if ALL ascension levels are done
    const allAscensionsDone = WORLDS.every((world, index) => {
        const finalLevelGi = WORLD_START_GI[index] + (world.data.length - 1);
        return STATE.done.includes(finalLevelGi);
    });

    // The Hub is unlocked if all ascensions are done
    //const isHubUnlocked = allAscensionsDone;
    const isHubUnlocked = true;                     // only for testing purposes, remove before release TODO


    hubCard.className = 'level-card endgame-hub-card' + (isHubUnlocked ? '' : ' locked');

    hubCard.innerHTML = `
        <div class="eg-hub-card-icon">🌌</div>
        <div class="eg-hub-card-title">${t('scr_nexus_of_worlds')}</div>
        <div class="eg-hub-card-sub">ENDGAME</div>
    `;

    // Tooltip and Routing events
    if (isHubUnlocked) {
        hubCard.addEventListener('click', () => {
            tip.classList.remove('show');
            /*
            showBeat('nexus_opens', {
                onComplete: () => {
                    if (typeof showEndgameHub === 'function') {
                        showEndgameHub();
                        initEndgameHubDnD({ seedTestItems: true });
                    }
                }
            });
            */
        });

        hubCard.addEventListener('mouseenter', () => {
            tip.textContent = t('scr_enter_nexus');
            tip.classList.add('show');
        });
    } else {
        hubCard.addEventListener('mouseenter', () => {
            tip.textContent = t('scr_nexus_locked');
            tip.classList.add('show');
        });
    }

    // Shared floating alignment trackers
    hubCard.addEventListener('mousemove', e => {
        tip.style.left = (e.clientX + 14) + 'px';
        tip.style.top = Math.min(e.clientY + 14, window.innerHeight - 80) + 'px';
    });

    hubCard.addEventListener('mouseleave', () => tip.classList.remove('show'));

    return hubCard;
}










//------------------------------------------------------------------------
//--------------------CARD TOOLTIP HINT BUILDER---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Returns modifiers the player hasn't yet used in their best run for a given level.
function getUnusedMods(hs) {
    const usedMods = hs.mods ? Object.keys(hs.mods).filter(m => hs.mods[m]) : [];
    return ALL_MODS.filter(m => !usedMods.includes(m));
}

// Returns a suggestion string if the player can still try a harder difficulty.
// Returns null if already on the hardest tier.
function getDiffSuggestion(hs) {
    const currentDiffIdx = DIFF_TIERS.indexOf(hs.diff || 'easy');
    if (currentDiffIdx >= DIFF_TIERS.length - 1) return null;

    const nextDiff = t('diff_' + DIFF_TIERS[currentDiffIdx + 1]);
    return t('ls_tip_harder').replace('{diff}', nextDiff);
}

// Returns a suggestion string listing modifiers the player hasn't tried yet.
// Returns null if all modifiers have been used.
function getModSuggestion(hs) {
    const unusedMods = getUnusedMods(hs);
    if (!unusedMods.length) return null;

    const modNames = unusedMods.map(m => t(MOD_I18N_KEYS[m]));
    const key = modNames.length > 1 ? 'ls_tip_mods_plural' : 'ls_tip_mods';
    return t(key).replace('{mods}', modNames.join(' / '));
}

// Builds a suggestion string for the level card tooltip.
// Looks at the player's best run and suggests higher difficulty, unused modifiers, 
// or performance optimizations (time/mistakes).
function getTooltipHint(gi) {
    const hs = STATE.levelHS[gi];
    if (!hs) return t('ls_no_score');

    const suggestions = [
        getDiffSuggestion(hs),
        getModSuggestion(hs),
    ].filter(Boolean);

    if (!suggestions.length) return '💡 ' + (t('ls_tip_optimize') || 'Clear faster & make fewer mistakes');
    return '💡 ' + suggestions.join(' · ');
}


//------------------------------------------------------------------------
//--------------------TOOLTIP DOM SETUP-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Injects the tooltip and items-hint CSS rules once into the document head.
// Safe to call multiple times — skips injection if the style tag already exists.
function ensureLSTooltipStyles() {
    if (document.getElementById('ls-tooltip-style')) return;

    const style = document.createElement('style');
    style.id = 'ls-tooltip-style';
    style.textContent = `
        .lc-tooltip {
            position: fixed; z-index: 9999; background: #1a1a2e;
            border: 1px solid var(--accent); color: var(--accent2);
            font-family: var(--PX); font-size: 10px; padding: 8px 12px;
            max-width: 280px; line-height: 1.6; pointer-events: none;
            opacity: 0; transition: opacity 0.15s;
            border-left: 3px solid var(--purple);
        }
        .lc-tooltip.show { opacity: 1; }
        .lc-items-hint {
            font-family: var(--PX); font-size: 9px;
            color: var(--orange); margin-top: 4px; opacity: 0.9;
        }
    `;
    document.head.appendChild(style);
}

// Returns the shared floating tooltip element, creating it if it doesn't exist yet.
function ensureLSTooltip() {
    let tip = document.getElementById('lc-tip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'lc-tip';
        tip.className = 'lc-tooltip';
        document.body.appendChild(tip);
    }
    return tip;
}