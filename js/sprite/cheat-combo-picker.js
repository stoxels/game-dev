//------------------------------------------------------------------------
//-------------------CHEAT: CHARACTER LAB----------------------------------
//------------------------------------------------------------------------
// Dev cheat for testing every character / class / ascendency combination
// (3 characters x 10 variants = 30) and their sprite animations without
// playing through class selection.
//
// Entry point: the "CHARACTER LAB" button on the dev mode-select screen.
// The modal lists all 30 combos grouped by character; each combo shows its
// menu portrait (images/sprites/<Char>_<variant>.webp — exists for every
// combo) and applies instantly on click:
//   1. stamps STATE (playerCharacter + playerClass/playerAscendency and
//      the same skill-level fields the real confirm*Selection() fns set,
//      so class HUDs and abilities resolve cleanly),
//   2. refreshes the sprite-animation discovery cache for the combo,
//   3. shows a LIVE animated preview in the modal (walk loop + arrow
//      buttons to drive all four directions + stop) plus the menu
//      portrait for reference.
//
// Persisting the combo is opt-in via "SAVE INTO CURRENT SLOT" so testers
// can experiment freely without dirtying their save. Cheats never grant
// achievements or quest stats (the real confirm*Selection() flows do).
// Menu-only characters never get class buttons — mirrors the setup flow.
//------------------------------------------------------------------------

'use strict';

// Character roster for the lab (same ids the rest of the game uses).
const _CHAR_LAB_CHARS = ['stox', 'trix', 'syla'];

// The 10 sprite variants in display order: no class, base classes, ascendencies.
const _CHAR_LAB_VARIANTS = [
    'noclass',
    'statistician', 'mathmagician', 'probabilist',
    'outlier', 'actuary', 'recursionist', 'markovian', 'bayesian', 'random_walker',
];

// Display names + emoji (label only — defs stay the single source of truth
// for behaviour; the lab just needs stable pretty labels).
const _CHAR_LAB_LABELS = {
    stox: 'Stox', trix: 'Trix', syla: 'Syla',
    noclass: 'No Class',
    statistician: 'Statistician', mathmagician: 'Mathmagician', probabilist: 'Probabilist',
    outlier: 'Outlier', actuary: 'Actuary', recursionist: 'Recursionist',
    markovian: 'Markovian', bayesian: 'Bayesian', random_walker: 'Random Walker',
};
const _CHAR_LAB_ICONS = {
    noclass: '🧍', statistician: '📊', mathmagician: '🪄', probabilist: '🎯',
    outlier: '📈', actuary: '📉', recursionist: '🔁',
    markovian: '🔗', bayesian: '🛡️', random_walker: '🎲',
};

// Which variants belong to which base class (drives the "requires class X"
// hint and the auto-parenting when applying an ascendency).
function _charLabParentOf(variant) {
    for (const base of (typeof CLASS_LIST !== 'undefined' ? CLASS_LIST : [])) {
        if ((typeof ASCENDENCY_LIST !== 'undefined') && (ASCENDENCY_LIST[base] || []).indexOf(variant) !== -1) return base;
    }
    return null;
}

// Menu portrait for a combo (all 30 exist on disk).
function _charLabPortraitSrc(charId, variant) {
    const cap = charId.charAt(0).toUpperCase() + charId.slice(1);
    return `images/sprites/${cap}_${variant}.webp`;
}

// Is this combo's directional walk art present on disk (already discovered)?
// Used for the little art-coverage badge on each combo card — the whole
// point of the lab is spotting which combos still need art.
function _charLabArtState(charId, variant) {
    if (typeof _animHasDirectionalWalkSync !== 'function') return '';
    for (const d of (typeof ANIM_DIRECTIONS !== 'undefined' ? ANIM_DIRECTIONS : [])) {
        if (_animHasDirectionalWalkSync(charId, variant, d)) return 'full';
    }
    return 'missing';
}


//------------------------------------------------------------------------
//-------------------MODAL-------------------------------------------------
//------------------------------------------------------------------------

function showCharLab() {
    if (!document.getElementById('charlab-modal')) return;
    _charLabRenderGrid();
    _charLabRenderPreview();
    showModal('charlab-modal');
    // Warm art discovery for ALL 30 combos so the ◉/○ badges reflect the
    // disk truth instead of "what has been played so far". Fire-and-forget:
    // each combo probes idle/walk per direction (cheap local files).
    if (typeof _animWarmCacheFor === 'function') {
        for (const c of _CHAR_LAB_CHARS) for (const v of _CHAR_LAB_VARIANTS) _animWarmCacheFor(c, v);
    }
    // Art discovery is async — refresh the badges as the cache fills.
    setTimeout(_charLabRefreshBadges, 1200);
    setTimeout(_charLabRefreshBadges, 3000);
    setTimeout(_charLabRefreshBadges, 6000);
}

function closeCharLab() {
    hideModal('charlab-modal');
    _charLabStopPreview();
}

// Updates the ◉/○ art badges in place (no grid rebuild — keeps scroll).
function _charLabRefreshBadges() {
    document.querySelectorAll('.cl-combo').forEach(b => {
        const badge = b.querySelector('.cl-art');
        if (!badge) return;
        const full = _charLabArtState(b.dataset.char, b.dataset.variant) === 'full';
        badge.className = 'cl-art ' + (full ? 'cl-art-ok' : 'cl-art-missing');
        badge.textContent = full ? '◉' : '○';
        badge.title = full ? 'Directional walk art found' : 'No directional walk art (omni fallback)';
    });
}

// One click-to-apply card per combo, grouped by character.
function _charLabRenderGrid() {
    const grid = document.getElementById('charlab-grid');
    if (!grid) return;
    let html = '';
    for (const charId of _CHAR_LAB_CHARS) {
        html += `<div class="cl-char-row"><div class="cl-char-name">${_CHAR_LAB_LABELS[charId]}</div><div class="cl-combo-row">`;
        for (const variant of _CHAR_LAB_VARIANTS) {
            const parent = _charLabParentOf(variant);
            const art = _charLabArtState(charId, variant);
            const artBadge = art === 'full'
                ? '<span class="cl-art cl-art-ok" title="Directional walk art found">◉</span>'
                : '<span class="cl-art cl-art-missing" title="No directional walk art (omni fallback)">○</span>';
            const lockedTitle = parent ? ` title="${_CHAR_LAB_LABELS[parent]} ascendency"` : '';
            html += `
                <button class="cl-combo" data-char="${charId}" data-variant="${variant}"${lockedTitle}
                        onclick="_charLabApply('${charId}','${variant}')">
                    <img src="${_charLabPortraitSrc(charId, variant)}" alt="" loading="lazy">
                    <span class="cl-combo-label">${_CHAR_LAB_ICONS[variant] || ''} ${_CHAR_LAB_LABELS[variant]}</span>
                    ${artBadge}
                </button>`;
        }
        html += '</div></div>';
    }
    grid.innerHTML = html;
}


//------------------------------------------------------------------------
//-------------------APPLY-------------------------------------------------
//------------------------------------------------------------------------

// Applies a combo to STATE exactly like the real selection flows do
// (same skill-level fields confirmClassSelection/confirmAscendencySelection
// set), refreshes the animation cache, and updates the live preview.
// Never persists — "SAVE INTO CURRENT SLOT" does that explicitly.
function _charLabApply(charId, variant) {
    if (!STATE) return;
    STATE.playerCharacter = charId;

    const parent = _charLabParentOf(variant);
    if (variant === 'noclass') {
        STATE.playerClass = null;
        STATE.playerAscendency = null;
    } else if (parent) {
        // Ascendency: keep the parent base class selected too.
        STATE.playerClass = parent;
        STATE.playerAscendency = variant;
    } else {
        STATE.playerClass = variant;
        STATE.playerAscendency = null;
    }

    // The same rank-1 fields the real selection flows initialise.
    STATE.classPassiveLevel = 1;
    STATE.classActive1Level = 1;
    STATE.classActive2Level = 1;
    STATE.classActiveLevel = 1;
    STATE.classActiveChoice = 'active1';
    STATE.ascendencySkill1Level = 1;
    STATE.ascendencySkill2Level = 1;

    // Re-discover animation art for the new combo (drops stale cache).
    if (typeof _animRefreshCacheFor === 'function') _animRefreshCacheFor(charId, variant);

    if (typeof buildClassHUD === 'function') { try { buildClassHUD(); } catch (e) { /* menus: HUD absent */ } }

    _charLabRenderPreview();
    setTimeout(_charLabRefreshBadges, 400);
    const label = `${_CHAR_LAB_LABELS[charId]} · ${_CHAR_LAB_LABELS[variant]}`;
    if (typeof showToast === 'function') showToast(`🧪 ${label}`);
}

// Opt-in persistence: writes the currently previewed combo into the save.
function _charLabSaveCurrent() {
    if (!STATE || !STATE.playerCharacter) return;
    if (typeof save === 'function') save();
    if (typeof showToast === 'function') showToast('💾 Saved current slot');
}


//------------------------------------------------------------------------
//-------------------LIVE PREVIEW------------------------------------------
//------------------------------------------------------------------------

// Drives a real walk loop (the same _playAvatarWalkAnimation the game uses)
// on a dedicated preview <img> so testers see actual in-game animation.
const _charLabPreview = { dir: 'down', walking: false, keepAlive: null };

function _charLabRenderPreview() {
    const img = document.getElementById('charlab-preview-img');
    const portrait = document.getElementById('charlab-preview-portrait');
    const label = document.getElementById('charlab-preview-label');
    if (!img || !STATE || !STATE.playerCharacter) return;

    const charId = STATE.playerCharacter;
    const variant = STATE.playerAscendency || STATE.playerClass || 'noclass';
    _charLabPreview.char = charId;
    _charLabPreview.variant = variant;

    if (portrait) portrait.src = _charLabPortraitSrc(charId, variant);
    if (label) label.textContent = `${_CHAR_LAB_LABELS[charId]} · ${_CHAR_LAB_LABELS[variant]}`;

    // Gameplay-default first frame: the move-down art (with the safe
    // onerror chain back to the portrait for combos without art).
    if (typeof _animSetDefaultDownImage === 'function') {
        _animSetDefaultDownImage(img);
    } else {
        img.src = _charLabPortraitSrc(charId, variant);
    }

    // Highlight the applied combo card.
    document.querySelectorAll('.cl-combo').forEach(b => {
        b.classList.toggle('cl-active',
            b.dataset.char === charId && b.dataset.variant === variant);
    });

    if (_charLabPreview.walking) _charLabStartWalk();
}

function _charLabStartWalk() {
    _charLabPreview.walking = true;
    const img = document.getElementById('charlab-preview-img');
    if (!img) return;
    if (typeof _playAvatarWalkAnimation === 'function') {
        _playAvatarWalkAnimation('charlab-preview-img', _charLabPreview.dir);
    }
    // The game's walk loop auto-returns to idle after ~180ms without
    // movement — keep re-arming it so the preview walks continuously.
    if (!_charLabPreview.keepAlive) {
        _charLabPreview.keepAlive = setInterval(() => {
            if (!_charLabPreview.walking) return;
            if (typeof _playAvatarWalkAnimation === 'function') {
                _playAvatarWalkAnimation('charlab-preview-img', _charLabPreview.dir);
            }
        }, 150);
    }
    const badge = document.getElementById('charlab-preview-state');
    if (badge) badge.textContent = `walking ${_charLabPreview.dir}`;
}

function _charLabStopPreview() {
    _charLabPreview.walking = false;
    if (_charLabPreview.keepAlive) {
        clearInterval(_charLabPreview.keepAlive);
        _charLabPreview.keepAlive = null;
    }
    if (typeof _stopAvatarWalkAnimation === 'function') _stopAvatarWalkAnimation();
    const badge = document.getElementById('charlab-preview-state');
    if (badge) badge.textContent = 'idle (move-down)';
}

function _charLabWalkDir(dir) {
    _charLabPreview.dir = dir;
    _charLabStartWalk();
}
