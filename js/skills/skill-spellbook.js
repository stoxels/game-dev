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
// be dragged — the registry's setHotbarSlot() rejects them as well.
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
            <div class="spellbook-header">
                <span class="spellbook-header-icon">📖</span>
                <div class="spellbook-header-text">
                    <div class="modal-title spellbook-title">${t('spellbook_title')}</div>
                    <p class="spellbook-hint">${t('spellbook_hint')}</p>
                </div>
            </div>
            <div class="spellbook-scroll" id="spellbook-content"></div>
            <div class="spellbook-footer" id="spellbook-footer"></div>
        </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#btn-spellbook-close')
        .addEventListener('click', closeSpellbook);
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

// Opens the spell book (rendering fresh contents).
function openSpellbook() {
    if (typeof STATE === 'undefined' || !STATE || !STATE.playerClass) {
        if (typeof showToast === 'function') showToast(t('skillbook_no_class'));
        return;
    }
    const overlay = _ensureSpellbookOverlay();
    renderSpellbook();
    overlay.classList.add('show');
    // If the book was opened from the pause menu (or via P while paused),
    // tuck the pause overlay away while the book is up. The game STAYS
    // paused (_gamePaused untouched, timer stopped) — closeSpellbook()
    // brings the pause menu back. This keeps the book fully interactable
    // without depending on overlay z-index battles.
    const pauseEl = document.getElementById('pause-overlay');
    if (pauseEl && pauseEl.classList.contains('show')) pauseEl.classList.remove('show');
    // Lift the hotbar above the modal backdrop (and out of the game screen's
    // stacking context) so spells can be dragged straight onto it while the
    // book is open (see setHotbarAboveModal + css/skills.css).
    document.body.classList.add('spellbook-open');
    if (typeof setHotbarAboveModal === 'function') setHotbarAboveModal(true);
    if (typeof hideHUDTooltip === 'function') hideHUDTooltip();
}

// Closes the spell book and any floating tooltip.
function closeSpellbook() {
    const overlay = document.getElementById('spellbook-overlay');
    if (overlay) overlay.classList.remove('show');
    document.body.classList.remove('spellbook-open');
    if (typeof setHotbarAboveModal === 'function') setHotbarAboveModal(false);
    if (typeof hideHUDTooltip === 'function') hideHUDTooltip();
    // If the book was opened while paused (pause overlay tucked away by
    // openSpellbook()), bring the pause menu back — the game is still
    // paused, so the player lands back on the pause screen.
    try {
        if (typeof _gamePaused !== 'undefined' && _gamePaused) {
            const pauseEl = document.getElementById('pause-overlay');
            if (pauseEl && !pauseEl.classList.contains('show')) pauseEl.classList.add('show');
        }
    } catch { /* _gamePaused unavailable — nothing to restore */ }
}

// Toggles the spell book.
function toggleSpellbook() {
    if (isSpellbookOpen()) closeSpellbook();
    else openSpellbook();
}


//------------------------------------------------------------------------
//---------------------------RENDERING------------------------------------
//------------------------------------------------------------------------

// Builds the HTML for one spell entry (drag source + hover tooltip).
function _buildSpellbookEntryHTML(skillId) {
    const def = getSkillDef(skillId);
    if (!def) return '';
    const rank = getSkillLevel(skillId);
    const onBar = (typeof isSkillOnHotbar === 'function') && isSkillOnHotbar(skillId);
    const usable = (typeof isSkillUsableNow === 'function') ? isSkillUsableNow(skillId) : true;
    const tags = (def.tags || []).join(' · ');
    const image = getSkillImage(skillId);
    const icon = image
        ? `<img class="spellbook-entry-img" src="${image}" alt="${getSkillName(skillId)}" draggable="false">`
        : `<span class="spellbook-entry-icon">${def.icon || '✦'}</span>`;

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
        ${onBar ? `<span class="spellbook-entry-onbar" title="${t('spellbook_on_bar')}">✓</span>` : ''}
        ${usable ? '' : `<span class="spellbook-entry-lock">🔒</span>`}
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

    // Character traits — indexed tooltip, never draggable.
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
    return `<div class="spellbook-group">
        <div class="spellbook-group-title">${t('spellbook_group_passives')}</div>
        <div class="spellbook-grid">${entries.join('')}</div>
    </div>`;
}

// Rebuilds the spell book contents from the player's current class.
function renderSpellbook() {
    const content = document.getElementById('spellbook-content');
    if (!content) return;
    if (typeof STATE === 'undefined' || !STATE || !STATE.playerClass) { content.innerHTML = ''; return; }

    const groups = getPlayerSkillGroups();
    const GROUP_ICONS = { spellbook_group_class: '🎓', spellbook_group_ascendency: '🌟', spellbook_group_endgame: '💚' };
    let html = '';
    for (const group of groups) {
        const title = group.labelFallback || t(group.labelKey);
        const icon = GROUP_ICONS[group.labelKey] || '✦';
        const entries = group.ids.map(_buildSpellbookEntryHTML).join('');
        html += `<div class="spellbook-group">
            <div class="spellbook-group-title"><span class="spellbook-group-icon">${icon}</span>${title}</div>
            <div class="spellbook-grid">${entries}</div>
        </div>`;
    }

    if (!groups.length) {
        html += `<div class="spellbook-empty">${t('skillbook_no_class')}</div>`;
    }

    html += _buildSpellbookPassivesHTML();
    content.innerHTML = html;

    _initSpellbookDrag(content);

    // Footer: how full the hotbar currently is, so the player can see at a
    // glance whether there is room left for the spell they are eyeing.
    const footer = document.getElementById('spellbook-footer');
    if (footer) {
        const slots = Array.isArray(STATE.skillHotbar) ? STATE.skillHotbar : [];
        const used = slots.filter(Boolean).length;
        const total = (typeof SKILL_HOTBAR_SIZE === 'number') ? SKILL_HOTBAR_SIZE : 10;
        footer.innerHTML = `<span class="spellbook-footer-label">${t('spellbook_hotbar_used')}</span>
            <span class="spellbook-footer-value">${used} / ${total}</span>`;
    }
}

// Wires pointerdown drag + double-click quick-assign on the entries.
function _initSpellbookDrag(content) {
    content.querySelectorAll('.spellbook-entry[data-skill]').forEach((el) => {
        const skillId = el.getAttribute('data-skill');
        el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
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
