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
// Open/close: the 'spellbook' keybind (default B) or the close button.
// Escape closes it through the shared modal machinery in main.js.
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
            <div class="modal-title">${t('spellbook_title')}</div>
            <p class="spellbook-hint">${t('spellbook_hint')}</p>
            <div class="spellbook-scroll" id="spellbook-content"></div>
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
    // Lift the hotbar above the modal backdrop so spells can be dragged
    // straight onto it while the book is open (see css/skills.css).
    document.body.classList.add('spellbook-open');
    if (typeof hideHUDTooltip === 'function') hideHUDTooltip();
}

// Closes the spell book and any floating tooltip.
function closeSpellbook() {
    const overlay = document.getElementById('spellbook-overlay');
    if (overlay) overlay.classList.remove('show');
    document.body.classList.remove('spellbook-open');
    if (typeof hideHUDTooltip === 'function') hideHUDTooltip();
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

    return `<div class="spellbook-entry ${usable ? '' : 'is-locked'}"
                 data-skill="${skillId}"
                 onmouseenter="handleSkillTip(event,'${skillId}')"
                 onmousemove="handleSkillTipMove(event)"
                 onmouseleave="handleSkillTipLeave()">
        <span class="spellbook-entry-icon">${def.icon || '✦'}</span>
        <span class="spellbook-entry-info">
            <span class="spellbook-entry-name">${getSkillName(skillId)}</span>
            <span class="spellbook-entry-tags">${tags}</span>
        </span>
        <span class="spellbook-entry-rank">${t('skill_tip_rank')} ${rank}</span>
        ${onBar ? `<span class="spellbook-entry-onbar" title="${t('spellbook_on_bar')}">✓</span>` : ''}
        ${usable ? '' : `<span class="spellbook-entry-lock">🔒</span>`}
    </div>`;
}

// Builds the locked (non-draggable) passive section.
function _buildSpellbookPassivesHTML() {
    const ids = getPlayerPassiveSkillIds();
    if (!ids.length) return '';
    const entries = ids.map((id) => {
        const def = getPassiveSkillDef(id);
        if (!def) return '';
        const name = LANG === 'de' ? (def.nameDE || def.nameEn) : def.nameEn;
        return `<div class="spellbook-entry is-passive"
                     data-passive="${id}"
                     onmouseenter="handleSkillTip(event,'${id}')"
                     onmousemove="handleSkillTipMove(event)"
                     onmouseleave="handleSkillTipLeave()">
            <span class="spellbook-entry-icon">${def.icon}</span>
            <span class="spellbook-entry-info">
                <span class="spellbook-entry-name">${name}</span>
                <span class="spellbook-entry-tags">${t('skill_tip_passive_tag')}</span>
            </span>
            <span class="spellbook-entry-lock">🔒</span>
        </div>`;
    }).join('');
    return `<div class="spellbook-group">
        <div class="spellbook-group-title">${t('spellbook_group_passives')}</div>
        <div class="spellbook-grid">${entries}</div>
    </div>`;
}

// Rebuilds the spell book contents from the player's current class.
function renderSpellbook() {
    const content = document.getElementById('spellbook-content');
    if (!content) return;
    if (typeof STATE === 'undefined' || !STATE || !STATE.playerClass) { content.innerHTML = ''; return; }

    const groups = getPlayerSkillGroups();
    let html = '';
    for (const group of groups) {
        const title = group.labelFallback || t(group.labelKey);
        const entries = group.ids.map(_buildSpellbookEntryHTML).join('');
        html += `<div class="spellbook-group">
            <div class="spellbook-group-title">${title}</div>
            <div class="spellbook-grid">${entries}</div>
        </div>`;
    }

    if (!groups.length) {
        html += `<div class="spellbook-empty">${t('skillbook_no_class')}</div>`;
    }

    html += _buildSpellbookPassivesHTML();
    content.innerHTML = html;

    _initSpellbookDrag(content);
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

    // Passives: pressing them explains why they can't be moved.
    content.querySelectorAll('.spellbook-entry[data-passive]').forEach((el) => {
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
