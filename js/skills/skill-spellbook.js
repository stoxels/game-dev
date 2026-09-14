// skill-spellbook.js
//------------------------------------------------------------------------
//-----------------------------SPELL BOOK---------------------------------
//------------------------------------------------------------------------
// Overlay listing every spell the player can actually use, grouped into
// class actives, ascendency actives and the universal Heartbloom endgame
// skill. The contents are driven entirely by getPlayerSkillGroups()
// (skill-registry.js), so a future spell appears here automatically once it
// is registered against the player's class/ascendency.
//
// Spells are drag sources: holding the pointer on an entry and dropping it
// on a hotbar slot assigns it (see skill-hotbar.js). Passives (Variance
// Shield, Momentum, …) are listed in their own locked section and can never
// be dragged - the registry's setHotbarSlot() rejects them as well.
//
// Open/close: the 'spellbook' keybind (default P), the pause-menu button,
// or the close button. Escape closes it through the shared modal machinery
// in main.js. When opened while paused, the pause overlay is tucked away
// (game stays paused) and restored on close.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//---------------------------DOM CONTAINER--------------------------------
//------------------------------------------------------------------------

// Returns the spell book overlay, creating it on first use.
function _ensureSpellbookOverlay() {
    let overlay = document.getElementById('spellbook-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'spellbook-overlay';
    overlay.className = 'modal-bg spellbook-bg';
    overlay.innerHTML = `
        <div class="modal-box spellbook-box">
            <button class="modal-close" id="btn-spellbook-close">${t('reset_close')}</button>
            <div class="spellbook-plaque">
                <span class="spellbook-plaque-text">${t('spellbook_title')}</span>
            </div>
            <div class="spellbook-frame-body">
                <p class="spellbook-hint">${t('spellbook_hint')}</p>
                <div class="spellbook-body">
                    <aside class="spellbook-charms-panel sb-panel" id="spellbook-charms"></aside>
                    <div class="spellbook-slots-panel sb-panel" id="spellbook-slots"></div>
                    <div class="spellbook-scroll sb-panel" id="spellbook-content"></div>
                </div>
                <div class="spellbook-footer" id="spellbook-footer"></div>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#btn-spellbook-close')
        .addEventListener('click', closeSpellbook);
    // Charm drag & drop / shift-click interactions (js/skills/skill-charms.js).
    if (typeof initCharmPanelInteractions === 'function') initCharmPanelInteractions(overlay);
    // Clicking the dimmed backdrop (but not the box) closes the book.
    overlay.addEventListener('pointerdown', (e) => {
        if (e.target === overlay) closeSpellbook();
    });

    return overlay;
}


//------------------------------------------------------------------------
//-----------------------------STATE--------------------------------------
//------------------------------------------------------------------------

// True while the spell book overlay is visible.
function isSpellbookOpen() {
    return !!document.getElementById('spellbook-overlay')?.classList.contains('show');
}

// True while the book itself is the reason the game is paused, so closing it
// can hand control back (see openSpellbook / closeSpellbook).
let _spellbookAutoPaused = false;

// True when the book was opened from the pause menu, so closing it brings the
// pause menu back. A SILENT engine pause (tutorial lesson, chain interstitial)
// must not pop the pause screen open when the book closes.
let _spellbookOpenedFromPauseMenu = false;

// Opens the spell book (rendering fresh contents).
function openSpellbook() {
    // Pre-class characters cast universal charm spells (found in the world),
    // so the book opens for them too - it then shows the slotted universals
    // plus the charm inventory/slots panel. Class/ascendency sections are
    // simply empty until a class is chosen. (The tutorial's puzzle 3 used to
    // be the only classless exception - Fireball before any class.)
    if (typeof STATE === 'undefined' || !STATE) return;
    const tqActive = (typeof _tqIsTutorialActive === 'function') && _tqIsTutorialActive();
    const overlay = _ensureSpellbookOverlay();
    renderSpellbook();
    overlay.classList.add('show');
    // Opening the book pauses the game (spec) - but only when a level is
    // actually on screen. On the overworld screens (map view, world detail,
    // level select) there is nothing to pause, and running the pause dance
    // there would be actively harmful: closeSpellbook() → unpauseGame() →
    // resumeTimer() → startTimer() would spin up the puzzle countdown while
    // the player is standing on the map. It also keeps the pause overlay
    // from flickering over the map.
    const inLiveLevel = (typeof _isGameScreenActive === 'function') ? _isGameScreenActive() : true;
    // If the player was ALREADY paused (opened from the pause menu, or the
    // tutorial's silent pause), that pause is left alone and closing restores
    // the previous state.
    if (!tqActive && inLiveLevel) {
        const pauseElNow = document.getElementById('pause-overlay');
        const pauseMenuShown = !!(pauseElNow && pauseElNow.classList.contains('show'));
        const wasPaused = (typeof _gamePaused !== 'undefined') && _gamePaused === true;
        if (!wasPaused && typeof pauseGame === 'function') {
            try { pauseGame(); } catch (e) { /* pause is best-effort */ }
        }
        _spellbookAutoPaused = !wasPaused && (typeof _gamePaused !== 'undefined') && _gamePaused === true;
        _spellbookOpenedFromPauseMenu = wasPaused && pauseMenuShown;
    } else {
        // The tutorial owns its own silent pause - never touch it here. Same
        // for the overworld: no level, no pause to take and hand back.
        _spellbookAutoPaused = false;
        _spellbookOpenedFromPauseMenu = false;
    }
    // If the book was opened from the pause menu (or via P while paused),
    // tuck the pause overlay away while the book is up. The game STAYS
    // paused (_gamePaused untouched, timer stopped) - closeSpellbook()
    // brings the pause menu back. This keeps the book fully interactable
    // without depending on overlay z-index battles.
    const pauseEl = document.getElementById('pause-overlay');
    if (pauseEl && pauseEl.classList.contains('show')) pauseEl.classList.remove('show');
    // Lift the hotbar above the modal backdrop (and out of the game screen's
    // stacking context) so spells can be dragged straight onto it while the
    // book is open (see setHotbarAboveModal + css/skills.css).
    document.body.classList.add('spellbook-open');
    // Tutorial: also lift the Professor + his pointer line above the book so
    // the assignment stays visible while dragging (css/tutorial.css).
    document.body.classList.add('tq-spellbook-open');
    if (typeof setHotbarAboveModal === 'function') setHotbarAboveModal(true);
    // Re-render the bar now that it has left the game screen's stacking
    // context: on the overworld screens it was hidden by the previous render
    // and has to come back as a drag target.
    _refreshHotbarForSpellbook();
    if (typeof hideHUDTooltip === 'function') hideHUDTooltip();
}

// Re-evaluates the hotbar's visibility for the book's open/closed state.
// Safe to call anywhere: renderSkillHotbar() no-ops when the bar should be
// hidden and the host element does not exist yet.
function _refreshHotbarForSpellbook() {
    if (typeof renderSkillHotbar !== 'function') return;
    try { renderSkillHotbar(); } catch (e) { /* bar is best-effort */ }
}

// Closes the spell book and any floating tooltip.
function closeSpellbook() {
    const overlay = document.getElementById('spellbook-overlay');
    if (overlay) overlay.classList.remove('show');
    document.body.classList.remove('spellbook-open');
    document.body.classList.remove('tq-spellbook-open');
    if (typeof setHotbarAboveModal === 'function') setHotbarAboveModal(false);
    // Back home (or hidden again when the book was opened off the game
    // screen and the player has nothing to cast at yet).
    _refreshHotbarForSpellbook();
    if (typeof hideHUDTooltip === 'function') hideHUDTooltip();
    // If the book itself paused the game, hand control right back.
    if (_spellbookAutoPaused) {
        _spellbookAutoPaused = false;
        _spellbookOpenedFromPauseMenu = false;
        if (typeof unpauseGame === 'function') { try { unpauseGame(); } catch (e) { /* best-effort */ } }
        return;
    }
    // Otherwise: if the book was opened FROM the pause menu, bring the pause
    // overlay back so the player lands on the pause screen. A silent engine
    // pause (tutorial lesson, chain interstitial) leaves the UI untouched.
    const restorePauseMenu = _spellbookOpenedFromPauseMenu;
    _spellbookOpenedFromPauseMenu = false;
    try {
        if (restorePauseMenu && typeof _gamePaused !== 'undefined' && _gamePaused) {
            const pauseEl = document.getElementById('pause-overlay');
            if (pauseEl && !pauseEl.classList.contains('show')) pauseEl.classList.add('show');
        }
    } catch { /* _gamePaused unavailable - nothing to restore */ }
}

// Toggles the spell book.
function toggleSpellbook() {
    if (isSpellbookOpen()) closeSpellbook();
    else openSpellbook();
}


//------------------------------------------------------------------------
//---------------------------RENDERING------------------------------------
//------------------------------------------------------------------------

// Carved stone section header, shared by every panel in the book: the spell
// slots row, each spell group and the charm panel. Art: the same carved
// banner the achievements screen carves its category titles onto, sliced so
// the bevelled ends keep their proportions at any width (see css/skills.css).
function buildSpellbookHeadHTML(title, sub) {
    return `<div class="sb-head">`
        + `<div class="sb-head-bar">`
        + `<span class="sb-head-title">${title}</span>`
        + `</div>`
        + (sub ? `<div class="sb-head-sub">${sub}</div>` : '')
        + `</div>`;
}

// Builds the HTML for one spell entry (drag source + hover tooltip).
function _buildSpellbookEntryHTML(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return '';
    // A spell is only unlocked while its charm sits in one of the spell
    // slots (see js/skills/skill-charms.js). While locked it shows the rank
    // of the stored skill, once unlocked the rank of the slotted charm.
    const charmRank = (typeof getCharmSlottedRank === 'function') ? getCharmSlottedRank(skillId) : null;
    const rank = charmRank || getSkillLevel(skillId);
    const onBar = (typeof isSkillOnHotbar === 'function') && isSkillOnHotbar(skillId);
    const charmLocked = (typeof isSkillCharmUnlocked === 'function') && !isSkillCharmUnlocked(skillId);
    const usable = charmLocked ? false
        : ((typeof isSkillUsableNow === 'function') ? isSkillUsableNow(skillId) : true);
    const tags = (def.tags || []).join(' · ');
    const image = getSkillImage(skillId);
    const icon = image
        ? `<img class="spellbook-entry-img" src="${image}" alt="${getSkillName(skillId)}" draggable="false">`
        : `<span class="spellbook-entry-icon">${def.icon || '✦'}</span>`;
    // The ✓ / 🔒 badges are decorative: they use aria-label (never a native
    // `title`, which would pop the browser's own tooltip on top of ours).
    // The lock reason is spelled out in the entry's custom tooltip.
    const lockLabel = charmLocked ? t('charm_locked_hint') : '';

    return `<div class="spellbook-entry ${usable ? '' : 'is-locked'}"
                 data-skill="${skillId}"
                 onmouseenter="handleSkillTip(event,'${skillId}')"
                 onmousemove="handleSkillTipMove(event)"
                 onmouseleave="handleSkillTipLeave()">
        ${icon}
        <span class="spellbook-entry-info">
            <span class="spellbook-entry-name">${getSkillName(skillId)}</span>
            <span class="spellbook-entry-tags">${tags}</span>
        </span>
        <span class="spellbook-entry-rank">${t('skill_tip_rank')} ${rank}</span>
        ${onBar ? `<span class="spellbook-entry-onbar" aria-label="${t('spellbook_on_bar')}">✓</span>` : ''}
        ${usable ? '' : `<span class="spellbook-entry-lock"${lockLabel ? ` aria-label="${lockLabel}"` : ''}>🔒</span>`}
    </div>`;
}

// Builds the locked (non-draggable) passive section: the class passive plus
// the character's innate traits, which are always-on abilities and therefore
// also live on this side of the book.
function _buildSpellbookPassivesHTML() {
    const entries = [];

    for (const id of getPlayerPassiveSkillIds()) {
        const def = getPassiveSkillDef(id);
        if (!def) continue;
        const name = LANG === 'de' ? (def.nameDE || def.nameEn) : def.nameEn;
        const image = (typeof getPassiveSkillImage === 'function') ? getPassiveSkillImage(id) : null;
        const icon = image
            ? `<img class="spellbook-entry-img" src="${image}" alt="${name}" draggable="false">`
            : `<span class="spellbook-entry-icon">${def.icon}</span>`;
        entries.push(`<div class="spellbook-entry is-passive"
                     data-passive="${id}"
                     onmouseenter="handleSkillTip(event,'${id}')"
                     onmousemove="handleSkillTipMove(event)"
                     onmouseleave="handleSkillTipLeave()">
            ${icon}
            <span class="spellbook-entry-info">
                <span class="spellbook-entry-name">${name}</span>
                <span class="spellbook-entry-tags">${t('skill_tip_passive_tag')}</span>
            </span>
            <span class="spellbook-entry-lock">🔒</span>
        </div>`);
    }

    // Character traits - indexed tooltip, never draggable.
    const traits = (typeof getPlayerTraits === 'function') ? getPlayerTraits() : [];
    traits.forEach((trait, index) => {
        const name = LANG === 'de' ? (trait.nameDE || trait.nameEn) : trait.nameEn;
        entries.push(`<div class="spellbook-entry is-passive is-trait"
                     data-trait="${index}"
                     onmouseenter="handleTraitTip(event,${index})"
                     onmousemove="handleSkillTipMove(event)"
                     onmouseleave="handleSkillTipLeave()">
            <span class="spellbook-entry-icon">${trait.icon || '★'}</span>
            <span class="spellbook-entry-info">
                <span class="spellbook-entry-name">${name}</span>
                <span class="spellbook-entry-tags">${t('skill_tip_trait_tag')}</span>
            </span>
            <span class="spellbook-entry-lock">🔒</span>
        </div>`);
    });

    if (!entries.length) return '';
    // Same carved header bar as the spell groups - a legacy text-only title
    // here made the passives block look like it belonged to a different menu.
    const title = t('spellbook_group_passives');
    return `<div class="spellbook-group">
        ${(typeof buildSpellbookHeadHTML === 'function') ? buildSpellbookHeadHTML(title) : `<div class="spellbook-group-title">${title}</div>`}
        <div class="spellbook-grid">${entries.join('')}</div>
    </div>`;
}

// SCHOOL CURATION - the equipped list is organised so a full loadout reads
// as a curated set rather than a flat list. Ownership stays first (class →
// ascendency → heartbloom, tinted with the class colour), then the utility
// families (support, movement), then the offensive spells regrouped by their
// magic school (FIRE, FROST, …) with every spell section sorted by rank,
// descending. Each entry's left accent bar and its section's underline carry
// the section colour, so the set is readable at a glance.
//
// SPELLBOOK_SCHOOL_ORDER doubles as the display order of the school sections
// (elemental first, physical last). Themes are read defensively:
// universal-spells.js loads after the registry in some load orders.
const SPELLBOOK_SCHOOL_ORDER = ['fire', 'frost', 'lightning', 'nature', 'holy', 'shadow', 'arcane', 'physical'];

// Display colour per school (element keys double as engine resist keys; the
// CSS consumes them through the --sb-accent custom property).
const SPELLBOOK_SCHOOL_COLORS = {
    fire: '#ff7a45', frost: '#6fc7e8', lightning: '#ffe14d', nature: '#7fd97f',
    holy: '#ffd76b', shadow: '#b07fe8', arcane: '#c39bd3', physical: '#d8c8a8',
};

// Bilingual section titles for the school bars. Like the universal-spells
// group titles (_uspGroupTitle & co.) these are resolved directly so no
// translation keys are required.
function _sbSchoolTitle(school) {
    const EN = { fire: 'Fire', frost: 'Frost', lightning: 'Lightning', nature: 'Nature', holy: 'Holy', shadow: 'Shadow', arcane: 'Arcane', physical: 'Physical' };
    const DE = { fire: 'Feuer', frost: 'Frost', lightning: 'Blitz', nature: 'Natur', holy: 'Heilig', shadow: 'Schatten', arcane: 'Arkan', physical: 'Physisch' };
    return (typeof LANG !== 'undefined' && LANG === 'de') ? (DE[school] || school) : (EN[school] || school);
}

// The offensive school of a universal spell id, or null when the spell is
// not an offensive universal (support / movement live in their own sections;
// class / ascendency / heartbloom keep their ownership groups).
function _sbSpellSchool(skillId) {
    if (typeof UNIVERSAL_SPELL_MAP === 'undefined' || !UNIVERSAL_SPELL_MAP[skillId]) return null;
    const spell = UNIVERSAL_SPELL_MAP[skillId];
    if (typeof isUniversalSupportSpell === 'function' && isUniversalSupportSpell(spell)) return null;
    if (typeof isUniversalMovementSpell === 'function' && isUniversalMovementSpell(spell)) return null;
    if (SPELLBOOK_SCHOOL_ORDER.indexOf(spell.theme) !== -1) return spell.theme;
    // Blade / arrow arts are physical weapon schools, not arcane.
    return (spell.theme === 'blade' || spell.theme === 'arrow') ? 'physical' : 'arcane';
}

// Display rank of an entry for sorting: the slotted charm's rank (what the
// player actually casts) or, before a charm is slotted, the trained rank.
function _sbSortRank(skillId) {
    const charmRank = (typeof getCharmSlottedRank === 'function') ? getCharmSlottedRank(skillId) : null;
    return charmRank || getSkillLevel(skillId) || 1;
}

// One curated section: carved bar + entry grid, accent-coloured via the
// --sb-accent custom property (see css/skills.css).
function _spellbookGroupHTML(title, ids, accent) {
    const entries = ids.map(_buildSpellbookEntryHTML).join('');
    const style = accent ? ` style="--sb-accent:${accent}"` : '';
    return `<div class="spellbook-group"${style}>`
        + ((typeof buildSpellbookHeadHTML === 'function')
            ? buildSpellbookHeadHTML(title)
            : `<div class="spellbook-group-title">${title}</div>`)
        + `<div class="spellbook-grid">${entries}</div>`
        + `</div>`;
}

// Rebuilds the spell book contents from the player's current class
// (or, pre-class, from their slotted universal charms).
function renderSpellbook() {
    const content = document.getElementById('spellbook-content');
    if (!content) return;
    if (typeof STATE === 'undefined' || !STATE) { content.innerHTML = ''; return; }

    // Only EQUIPPED spells are listed: a spell appears here exactly while its
    // charm sits in one of the 10 spell slots (js/skills/skill-charms.js).
    // The full arsenal (100+ universal spells) is never dumped into the book -
    // it lives in the charm inventory until the player slots it.
    const equipped = (typeof isSkillCharmSlotted === 'function') ? isSkillCharmSlotted : () => true;
    const groups = getPlayerSkillGroups()
        .map((group) => ({ ...group, ids: (group.ids || []).filter(equipped) }))
        .filter((group) => group.ids.length);

    // Split the equipped loadout: ownership sections keep their identity,
    // universal spells are re-bucketed into support / movement / offensive
    // schools. Every spell bucket is sorted by rank, descending.
    const byRankDesc = (a, b) => _sbSortRank(b) - _sbSortRank(a);
    const offense = {};
    const supportIds = [];
    const movementIds = [];
    const ownership = [];
    for (const group of groups) {
        if (group.labelKey === 'spellbook_group_support') supportIds.push(...group.ids);
        else if (group.labelKey === 'spellbook_group_movement') movementIds.push(...group.ids);
        else if (group.labelKey === 'spellbook_group_universal') {
            for (const id of group.ids) {
                const school = _sbSpellSchool(id) || 'arcane';
                (offense[school] = offense[school] || []).push(id);
            }
        } else ownership.push(group);
    }
    supportIds.sort(byRankDesc);
    movementIds.sort(byRankDesc);
    for (const school of Object.keys(offense)) offense[school].sort(byRankDesc);

    let html = '';
    for (const group of ownership) {
        group.ids.sort(byRankDesc); // rank-descending inside every section
        let accent = '';
        if (group.labelKey === 'spellbook_group_class' && typeof CLASS_DEFS !== 'undefined' && CLASS_DEFS[STATE.playerClass]) {
            accent = CLASS_DEFS[STATE.playerClass].color || '';
        } else if (group.labelKey === 'spellbook_group_ascendency' && typeof ASCENDENCY_DEFS !== 'undefined' && ASCENDENCY_DEFS[STATE.playerAscendency]) {
            accent = ASCENDENCY_DEFS[STATE.playerAscendency].color || '';
        } else if (group.labelKey === 'spellbook_group_endgame') {
            accent = '#66fcf1'; // heartbloom - the endgame cyan
        }
        html += _spellbookGroupHTML(group.labelFallback || t(group.labelKey), group.ids, accent);
    }
    if (supportIds.length) {
        html += _spellbookGroupHTML(
            (typeof _uspSupportGroupTitle === 'function') ? _uspSupportGroupTitle() : 'Support Spells',
            supportIds, '#7fded4');
    }
    if (movementIds.length) {
        html += _spellbookGroupHTML(
            (typeof _uspMovementGroupTitle === 'function') ? _uspMovementGroupTitle() : 'Movement Spells',
            movementIds, '#66fcf1');
    }
    for (const school of SPELLBOOK_SCHOOL_ORDER) {
        if (!offense[school] || !offense[school].length) continue;
        html += _spellbookGroupHTML(_sbSchoolTitle(school), offense[school], SPELLBOOK_SCHOOL_COLORS[school]);
    }

    if (!html) {
        html = `<div class="spellbook-empty">${t('spellbook_empty_unslotted')}</div>`;
    }

    html += _buildSpellbookPassivesHTML();
    content.innerHTML = html;

    _initSpellbookDrag(content);

    // Spell slot grid + charm inventory / currency (skill-charms.js).
    if (typeof renderSpellbookCharmPanel === 'function') renderSpellbookCharmPanel();

    // Footer: how full the hotbar and the spell slots currently are, so the
    // player can see at a glance whether there is room left.
    const footer = document.getElementById('spellbook-footer');
    if (footer) {
        const slots = Array.isArray(STATE.skillHotbar) ? STATE.skillHotbar : [];
        const used = slots.filter(Boolean).length;
        const total = (typeof SKILL_HOTBAR_SIZE === 'number') ? SKILL_HOTBAR_SIZE : 10;
        const charmSlots = Array.isArray(STATE.charmSlots) ? STATE.charmSlots : [];
        const charmUsed = charmSlots.filter(Boolean).length;
        const charmTotal = (typeof CHARM_SLOT_COUNT === 'number') ? CHARM_SLOT_COUNT : 10;
        // Left: the spell slots the charms go into. Right: how full the
        // hotbar is. Each label travels with its own value as one group.
        footer.innerHTML = `<span class="spellbook-footer-group">`
            + `<span class="spellbook-footer-label">${t('charm_slots_title')}</span>`
            + `<span class="spellbook-footer-value">${charmUsed} / ${charmTotal}</span>`
            + `</span>`
            + `<span class="spellbook-footer-group">`
            + `<span class="spellbook-footer-label">${t('spellbook_hotbar_used')}</span>`
            + `<span class="spellbook-footer-value">${used} / ${total}</span>`
            + `</span>`;
    }
}

// Wires pointerdown drag + double-click quick-assign on the entries.
function _initSpellbookDrag(content) {
    content.querySelectorAll('.spellbook-entry[data-skill]').forEach((el) => {
        const skillId = el.getAttribute('data-skill');
        el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (typeof isSkillCharmUnlocked === 'function' && !isSkillCharmUnlocked(skillId)) {
                if (typeof showToast === 'function') showToast(t('charm_locked_toast'), '#ff6b9d');
                return;
            }
            if (typeof startSkillDrag === 'function') startSkillDrag(skillId, e, null);
        });
        el.addEventListener('dblclick', () => _quickAssignSkill(skillId));
    });

    // Passives / traits: pressing them explains why they can't be moved.
    content.querySelectorAll('.spellbook-entry[data-passive], .spellbook-entry[data-trait]').forEach((el) => {
        el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (typeof showToast === 'function') showToast(t('skill_passive_not_movable'));
        });
    });
}

// Double-click convenience: drop the spell into the first free hotbar slot,
// or the first slot when the bar is full.
function _quickAssignSkill(skillId) {
    if (typeof isSkillCharmUnlocked === 'function' && !isSkillCharmUnlocked(skillId)) {
        if (typeof showToast === 'function') showToast(t('charm_locked_toast'), '#ff6b9d');
        return;
    }
    if (typeof isSkillMovable === 'function' && !isSkillMovable(skillId)) {
        if (typeof showToast === 'function') showToast(t('skill_passive_not_movable'));
        return;
    }
    ensureSkillHotbar();
    let index = STATE.skillHotbar.indexOf(null);
    if (index === -1) index = 0;
    setHotbarSlot(index, skillId);
    renderSpellbook();
    renderSkillHotbar();
}
