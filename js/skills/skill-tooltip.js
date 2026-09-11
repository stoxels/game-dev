// skill-tooltip.js
//------------------------------------------------------------------------
//-------------------SKILL TOOLTIP (PATH-OF-EXILE STYLE)------------------
//------------------------------------------------------------------------
// Builds the hover tooltip shared by the spell book and the hotbar.
//
// Layout mirrors Path of Exile's gem tooltip:
//
//   Arcane Reveal                ← title
//   Spell, Reveal, Area          ← type tags
//   Rank: 2
//   Cost: 50 Mana
//   Cast Time: Instant
//   Cooldown: 5m
//   Effectiveness of Added Damage: 30%
//   ------------------------------
//   <mechanics description>
//   Deals 8 to 12 Damage per revealed cell (up to 5 cells)
//   Total: 40 to 60 Damage
//   Scales with: Spell Damage, Area of Effect
//
// The floating element itself is owned by class-hud.js (getHUDTooltip /
// showHUDTooltip), so both tooltips share one visual + positioning system.
//------------------------------------------------------------------------


// Formats a cooldown in seconds for the tooltip (m:ss, or "12s").
function _skillFormatCooldown(secs) {
    const s = Math.max(0, Math.round(secs || 0));
    if (typeof _formatCooldown === 'function') return _formatCooldown(s);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
}


//------------------------------------------------------------------------
//---------------------------LINE BUILDERS--------------------------------
//------------------------------------------------------------------------

// The coloured type line: "Spell, Reveal, Area".
function _skillTooltipTags(def) {
    if (!def.tags || !def.tags.length) return '';
    return `<div class="skl-tip-tags">${def.tags.join(', ')}</div>`;
}

// Cost line — becomes red when the player cannot currently pay it, and
// switches to Life under Blood Magic maps.
function _skillTooltipCost(def) {
    const cost = (typeof getSkillManaCost === 'function') ? getSkillManaCost(def.id) : 0;
    if (!cost) return '';
    const blood = (typeof _bloodMagicActive === 'function') && _bloodMagicActive();
    const label = blood ? t('cls_life') : t('cls_mana');
    const affordable = (typeof canAffordSkill === 'function') ? canAffordSkill(def.id) : true;
    const color = blood ? '#ff7a7a' : '#7fb3ff';
    return `<div class="skl-tip-stat">${t('skill_tip_cost')}: <b style="color:${affordable ? color : '#ff5252'}">${cost} ${label}</b></div>`;
}

// Cooldown line — shows the effective cooldown and, when passive nodes or
// gear reduced it, the base value in parentheses.
function _skillTooltipCooldown(def) {
    const eff = (typeof getSkillCooldown === 'function') ? getSkillCooldown(def.id) : (def.cooldownSeconds || 0);
    const base = def.cooldownSeconds || 0;
    if (!eff && !base) return '';
    let line = `⏱ ${t('skill_tip_cooldown')}: <b style="color:#e8b04b">${_skillFormatCooldown(eff)}</b>`;
    if (base && Math.round(base) !== Math.round(eff)) {
        line += ` <span style="opacity:.55">(${t('skill_tip_base')} ${_skillFormatCooldown(base)})</span>`;
    }
    return `<div class="skl-tip-stat">${line}</div>`;
}

// Cast-time line — every current skill is instant, but future channeled /
// cast-time spells are supported by SKILL_META.castTime.
function _skillTooltipCastTime(def) {
    if (!def.castTime) return '';
    const isInstant = def.castTime === 'instant';
    const value = isInstant
        ? t('skill_tip_instant')
        : `${def.castTime}`;
    return `<div class="skl-tip-stat">${t('skill_tip_cast_time')}: <b style="color:#e6e6e6">${value}</b></div>`;
}

// Damage block — the puzzle-ability equivalent of PoE's "Deals X to Y
// Physical Damage" lines: each revealed cell fires a reveal projectile.
function _skillTooltipDamage(def) {
    if (typeof getSkillDamage !== 'function') return '';
    const dmg = getSkillDamage(def.id);
    if (!dmg) return '';
    const range = dmg.perHitMin === dmg.perHitMax
        ? `${dmg.perHitMin}`
        : `${dmg.perHitMin} to ${dmg.perHitMax}`;
    const total = dmg.totalMin === dmg.totalMax
        ? `${dmg.totalMin}`
        : `${dmg.totalMin} to ${dmg.totalMax}`;
    return `<div class="skl-tip-sep"></div>`
        + `<div class="skl-tip-dmg">${t('skill_tip_deals')} <b>${range}</b> ${t('skill_tip_damage_per_cell')} `
        + `<span style="opacity:.75">(${t('skill_tip_up_to').replace('{n}', dmg.count)})</span></div>`
        + `<div class="skl-tip-dmg">${t('skill_tip_total')}: <b>${total}</b> ${t('skill_tip_damage')}</div>`;
}

// Scaling line: "Scales with: Spell Damage, Cooldown Recovery".
function _skillTooltipScaling(def) {
    if (!def.scaling || !def.scaling.length) return '';
    return `<div class="skl-tip-scaling">${t('skill_tip_scales_with')}: <b>${def.scaling.join(', ')}</b></div>`;
}

// Endgame-only warning for Heartbloom.
function _skillTooltipGating(def) {
    if (!def.endgameOnly) return '';
    const active = (typeof isEndgameLevel === 'function') && isEndgameLevel();
    return active
        ? `<div class="skl-tip-note">${t('skill_tip_endgame_only')}</div>`
        : `<div class="skl-tip-warn">⚠ ${t('skill_tip_endgame_only')}</div>`;
}

// Small footer hint telling the player they can drag the skill.
function _skillTooltipDragHint() {
    return `<div class="skl-tip-foot">${t('skill_tip_drag_hint')}</div>`;
}


//------------------------------------------------------------------------
//-------------------------PUBLIC BUILDERS--------------------------------
//------------------------------------------------------------------------

// Builds the full tooltip HTML for a castable skill.
function buildSkillTooltipHTML(skillId) {
    const def = (typeof getSkillDef === 'function') ? getSkillDef(skillId) : null;
    if (!def) return '';

    const rank = (typeof getSkillLevel === 'function') ? getSkillLevel(skillId) : 1;
    const desc = (typeof getSkillDesc === 'function') ? getSkillDesc(skillId) : '';

    return `<div class="skl-tip">`
        + `<div class="skl-tip-title">${getSkillName(skillId)}</div>`
        + _skillTooltipTags(def)
        + `<div class="skl-tip-stat">${t('skill_tip_rank')}: <b style="color:#f1c40f">${rank}</b></div>`
        + _skillTooltipCost(def)
        + _skillTooltipCastTime(def)
        + _skillTooltipCooldown(def)
        + `<div class="skl-tip-sep"></div>`
        + `<div class="skl-tip-desc">${desc}</div>`
        + _skillTooltipDamage(def)
        + _skillTooltipScaling(def)
        + _skillTooltipGating(def)
        + _skillTooltipDragHint()
        + `</div>`;
}

// Builds the tooltip HTML for a passive ability (never movable).
function buildPassiveSkillTooltipHTML(passiveId) {
    const def = (typeof getPassiveSkillDef === 'function') ? getPassiveSkillDef(passiveId) : null;
    if (!def) return '';

    const rank = STATE.classPassiveLevel || 1;
    const data = def.levels && (def.levels[Math.min(rank, def.levels.length) - 1] || def.levels[0]);
    const name = LANG === 'de' ? (def.nameDE || def.nameEn) : def.nameEn;
    const desc = data ? (LANG === 'de' ? data.descDE : data.descEn) : '';

    return `<div class="skl-tip">`
        + `<div class="skl-tip-title" style="color:#f39c12">${name}</div>`
        + `<div class="skl-tip-tags">${t('skill_tip_passive_tag')}</div>`
        + `<div class="skl-tip-stat">${t('skill_tip_rank')}: <b style="color:#f1c40f">${rank}</b></div>`
        + `<div class="skl-tip-sep"></div>`
        + `<div class="skl-tip-desc">${desc}</div>`
        + `<div class="skl-tip-note">${t('skill_tip_passive_locked')}</div>`
        + `</div>`;
}


// Builds the tooltip HTML for one of the character's innate traits.
// Traits are always-on (never placed on the hotbar), so they reuse the
// passive tooltip look but are tagged as a character trait.
function buildTraitTooltipHTML(traitIndex) {
    const traits = (typeof getPlayerTraits === 'function') ? getPlayerTraits() : [];
    const trait = traits[traitIndex];
    if (!trait) return '';

    const name = LANG === 'de' ? (trait.nameDE || trait.nameEn) : trait.nameEn;
    const desc = LANG === 'de' ? (trait.descDE || trait.descEn) : trait.descEn;

    return `<div class="skl-tip">`
        + `<div class="skl-tip-title" style="color:#7fe0ff">${trait.icon || '★'} ${name}</div>`
        + `<div class="skl-tip-tags">${t('skill_tip_trait_tag')}</div>`
        + `<div class="skl-tip-sep"></div>`
        + `<div class="skl-tip-desc">${desc}</div>`
        + `<div class="skl-tip-note">${t('skill_tip_trait_locked')}</div>`
        + `</div>`;
}


//------------------------------------------------------------------------
//-------------------------EVENT HANDLERS---------------------------------
//------------------------------------------------------------------------
// Inline onmouseenter/onmousemove/onmouseleave hooks, mirroring the class
// HUD's handleHUDTip so both systems behave identically.
//------------------------------------------------------------------------

// Shows the tooltip for a character trait (by index into getPlayerTraits()).
function handleTraitTip(e, traitIndex) {
    if (typeof showHUDTooltip !== 'function') return;
    const html = buildTraitTooltipHTML(Number(traitIndex));
    if (html) showHUDTooltip(html, e);
}


// Shows the tooltip for a castable OR passive skill id.
function handleSkillTip(e, skillId) {
    if (typeof showHUDTooltip !== 'function') return;
    const html = (typeof isSkillPassive === 'function' && isSkillPassive(skillId))
        ? buildPassiveSkillTooltipHTML(skillId)
        : buildSkillTooltipHTML(skillId);
    if (html) showHUDTooltip(html, e);
}

// Repositions the floating tooltip as the cursor moves.
function handleSkillTipMove(e) {
    if (typeof moveHUDTooltip === 'function') moveHUDTooltip(e);
}

// Hides the floating tooltip.
function handleSkillTipLeave() {
    if (typeof hideHUDTooltip === 'function') hideHUDTooltip();
}
