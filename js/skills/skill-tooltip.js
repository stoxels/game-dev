import { isEndgameLevel } from '../mouse-button-handlers.js';
import { LANG, t } from '../translation/translations.js';
import { _formatCooldown } from '../classes/class-cooldown-state.js';
import { hideHUDTooltip, moveHUDTooltip, showHUDTooltip } from '../classes/class-hud.js';
import { _bloodMagicActive } from '../classes/class-mana.js';
import { charmRankMeetsPlayerLevel, getCharmRankMinPlayerLevel, getCharmSkillOrbBonusPct, getCharmSlottedRank, isSkillCharmUnlocked } from './skill-charms.js';
import { canAffordSkill, getPassiveSkillDef, getPlayerTraits, getSkillCooldown, getSkillDamage, getSkillDef, getSkillDesc, getSkillLevel, getSkillManaCost, getSkillName, isSkillPassive } from './skill-registry.js';
import { getSkillCastTimeSeconds } from './spell-casttime.js';
import { getUniversalSpellChargeRechargeRemaining, getUniversalSpellCharges, getUniversalSpellDef, getUniversalSpellMovementEstimate, getUniversalSpellSupportEstimate } from './universal-spells.js';
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
export function _skillFormatCooldown(secs) {
    const s = Math.max(0, Math.round(secs || 0));
    if (typeof _formatCooldown === 'function') return _formatCooldown(s);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
}


//------------------------------------------------------------------------
//---------------------------LINE BUILDERS--------------------------------
//------------------------------------------------------------------------

// The coloured type line: "Spell, Reveal, Area".
export function _skillTooltipTags(def) {
    if (!def.tags || !def.tags.length) return '';
    return `<div class="skl-tip-tags">${def.tags.join(', ')}</div>`;
}

// Cost line - becomes red when the player cannot currently pay it, and
// switches to Life under Blood Magic maps.
export function _skillTooltipCost(def) {
    const cost = (typeof getSkillManaCost === 'function') ? getSkillManaCost(def.id) : 0;
    if (!cost) return '';
    const blood = (typeof _bloodMagicActive === 'function') && _bloodMagicActive();
    const label = blood ? t('cls_life') : t('cls_mana');
    const affordable = (typeof canAffordSkill === 'function') ? canAffordSkill(def.id) : true;
    const color = blood ? '#ff7a7a' : '#7fb3ff';
    return `<div class="skl-tip-stat">${t('skill_tip_cost')}: <b style="color:${affordable ? color : '#ff5252'}">${cost} ${label}</b></div>`;
}

// Cooldown line - shows the effective cooldown and, when passive nodes or
// gear reduced it, the base value in parentheses. Charge spells (Blink,
// Dash, …) show their pool instead: charges held, recharge time and - while
// the pool is empty - the wait for the next charge.
export function _skillTooltipCooldown(def) {
    const charges = (typeof getUniversalSpellCharges === 'function')
        ? getUniversalSpellCharges(def.id) : null;
    if (charges) {
        const waiting = charges.current === 0;
        const wait = waiting ? getUniversalSpellChargeRechargeRemaining(def.id) : 0;
        let line = `⚡ ${t('skill_tip_charges')}: <b style="color:#e8b04b">${charges.current} / ${charges.max}</b>`;
        line += ` <span style="opacity:.55">· ${t('skill_tip_recharge').replace('{n}', _skillFormatCooldown(charges.recharge))}</span>`;
        if (waiting && wait > 0) {
            line += `<br><span style="color:#ffb347">⏳ ${t('skill_tip_next_charge').replace('{n}', _skillFormatCooldown(Math.ceil(wait)))}</span>`;
        }
        return `<div class="skl-tip-stat">${line}</div>`;
    }
    const eff = (typeof getSkillCooldown === 'function') ? getSkillCooldown(def.id) : (def.cooldownSeconds || 0);
    const base = def.cooldownSeconds || 0;
    if (!eff && !base) return '';
    let line = `⏱ ${t('skill_tip_cooldown')}: <b style="color:#e8b04b">${_skillFormatCooldown(eff)}</b>`;
    if (base && Math.round(base) !== Math.round(eff)) {
        line += ` <span style="opacity:.55">(${t('skill_tip_base')} ${_skillFormatCooldown(base)})</span>`;
    }
    return `<div class="skl-tip-stat">${line}</div>`;
}

// Cast-time line - instant skills fire on click; timed ones need the button
// held until the cast bar fills (see js/skills/spell-casttime.js).
export function _skillTooltipCastTime(def) {
    if (!def.castTime) return '';
    const isInstant = def.castTime === 'instant';
    let holdHint = '';
    try {
        if (!isInstant && typeof getSkillCastTimeSeconds === 'function'
            && getSkillCastTimeSeconds(def.id) > 0) {
            holdHint = (typeof LANG !== 'undefined' && LANG === 'de') ? ' (halten)' : ' (hold)';
        }
    } catch (e) { /* best-effort */ }
    const value = isInstant
        ? t('skill_tip_instant')
        : `${def.castTime}${holdHint}`;
    return `<div class="skl-tip-stat">${t('skill_tip_cast_time')}: <b style="color:#e6e6e6">${value}</b></div>`;
}

// Damage block - the puzzle-ability equivalent of PoE's "Deals X to Y
// Physical Damage" lines: each revealed cell fires a reveal projectile.
// Universal spells get their own direct-damage wording (see below).
export function _skillTooltipDamage(def) {
    if (typeof getSkillDamage !== 'function') return '';
    const dmg = getSkillDamage(def.id);
    if (!dmg) {
        // The self-cast families carry no damage payload at all - describe
        // exactly what the cast will deliver instead (js/skills/
        // universal-spells.js). Support: the amount at the current charm rank
        // and Life/Absorption pools. Movement: the jump distance at the
        // current rank, plus the live armed-anchor state.
        if (def.slotKind === 'universal') {
            if (typeof getUniversalSpellSupportEstimate === 'function') {
                const sup = getUniversalSpellSupportEstimate(def.id);
                if (sup) return _uspTooltipSupport(sup);
            }
            if (typeof getUniversalSpellMovementEstimate === 'function') {
                const mov = getUniversalSpellMovementEstimate(def.id);
                if (mov) return _uspTooltipMovement(mov);
            }
        }
        return '';
    }
    if (def.slotKind === 'universal') return _uspTooltipDamage(def, dmg);
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

// Direct-damage wording for universal spells: "Deals 24 to 30 Shadow
// damage" plus a behaviour suffix (volley count, AoE, DoT ticks, chain,
// delay) and a total line. Bilingual inline so no translation keys are
// needed for the arsenal.
export function _uspTooltipDamage(def, dmg) {
    const de = (typeof LANG !== 'undefined' && LANG === 'de');
    const spell = (typeof getUniversalSpellDef === 'function') ? getUniversalSpellDef(def.id) : null;
    const elName = { fire: de ? 'Feuer' : 'Fire', cold: de ? 'Kälte' : 'Cold', lightning: de ? 'Blitz' : 'Lightning', shadow: de ? 'Schatten' : 'Shadow', physical: de ? 'physischen' : 'Physical' };
    const el = (spell && elName[spell.element]) || (de ? 'Schaden' : 'Damage');
    const range = dmg.perHitMin === dmg.perHitMax
        ? `${dmg.perHitMin}`
        : `${dmg.perHitMin} to ${dmg.perHitMax}`;
    let suffix = '';
    if (spell) {
        switch (spell.behavior) {
            case 'volley': suffix = de ? ` in ${spell.count} Geschossen` : ` across ${spell.count} missiles`; break;
            case 'nova': suffix = de ? ', jeden Gegner' : ', each enemy'; break;
            case 'ticks':
                suffix = spell.hitsAll
                    ? (de ? `, jeden Gegner, ${spell.ticks + 1} Treffer` : `, each enemy, ${spell.ticks + 1} hits`)
                    : (de ? ` + ${spell.ticks} Ticks` : ` + ${spell.ticks} ticks`);
                break;
            case 'chain': suffix = de ? ', springt abgeschwächt über' : ', leaps weakened across'; break;
            case 'delayed':
                suffix = de ? ' nach kurzer Verzögerung' : ' after a short delay';
                if (spell.hitsAll) suffix += de ? ', jeden Gegner' : ', each enemy';
                break;
            case 'starfall': suffix = de ? ` in ${spell.count} Sternensplittern` : ` across ${spell.count} star shards`; break;
            case 'wild': suffix = de ? ` in ${spell.count} Funken, zufällige Gegner` : ` across ${spell.count} sparks at random enemies`; break;
            default: break;
        }
    }
    const total = dmg.totalMin === dmg.totalMax
        ? `${dmg.totalMin}`
        : `${dmg.totalMin} to ${dmg.totalMax}`;
    const totalLabel = dmg.perTarget
        ? (de ? 'Gesamt (pro Gegner)' : 'Total (per enemy)')
        : (de ? 'Gesamt' : 'Total');
    let html = `<div class="skl-tip-sep"></div>`
        + `<div class="skl-tip-dmg">${de ? 'Verursacht' : 'Deals'} <b>${range}</b> ${el} ${de ? 'schaden' : 'damage'}<span style="opacity:.75">${suffix}</span></div>`;
    if (dmg.count > 1 || dmg.perTarget) {
        html += `<div class="skl-tip-dmg">${totalLabel}: <b>${total}</b> ${de ? 'Schaden' : 'damage'}</div>`;
    }
    return html;
}

// Support-spell wording: the concrete amount the cast will deliver. The line
// is built inside getUniversalSpellSupportEstimate so the numbers shown here
// are the same numbers the cast applies (rank + pools included).
export function _uspTooltipSupport(sup) {
    const de = (typeof LANG !== 'undefined' && LANG === 'de');
    const line = de ? sup.lineDe : sup.lineEn;
    if (!line) return '';
    const warn = sup.noPool ? ' class="skl-tip-warn"' : ' class="skl-tip-dmg"';
    return `<div class="skl-tip-sep"></div><div${warn}>${line}</div>`;
}

// Movement-spell wording: the concrete jump/window the cast will produce, and
// - while a Rift Anchor is armed - what the NEXT cast does instead of what the
// spell does in general. Built inside getUniversalSpellMovementEstimate so the
// numbers cannot drift from the ones the cast applies.
export function _uspTooltipMovement(mov) {
    const de = (typeof LANG !== 'undefined' && LANG === 'de');
    const line = de ? mov.lineDe : mov.lineEn;
    if (!line) return '';
    // An armed anchor is a different spell: highlight it so the player knows the
    // tooltip is describing the recall, not the plant.
    const cls = mov.armed ? ' class="skl-tip-stat" style="color:#7fd9ff"' : ' class="skl-tip-dmg"';
    return `<div class="skl-tip-sep"></div><div${cls}>${line}</div>`;
}

// Charm-orb bonus line, shown only when orbs have been applied to the
// spell's charm (js/skills/skill-charms.js).
export function _skillTooltipCharmBonus(skillId) {
    if (typeof getCharmSkillOrbBonusPct !== 'function') return '';
    const pct = getCharmSkillOrbBonusPct(skillId);
    if (!pct) return '';
    return `<div class="skl-tip-stat">${t('charm_tip_orb_bonus')}: <b style="color:#7fd9ff">+${pct}%</b></div>`;
}

// Scaling line: "Scales with: Spell Damage, Cooldown Recovery".
export function _skillTooltipScaling(def) {
    if (!def.scaling || !def.scaling.length) return '';
    return `<div class="skl-tip-scaling">${t('skill_tip_scales_with')}: <b>${def.scaling.join(', ')}</b></div>`;
}

// Endgame-only warning for Heartbloom.
export function _skillTooltipGating(def) {
    if (!def.endgameOnly) return '';
    const active = (typeof isEndgameLevel === 'function') && isEndgameLevel();
    return active
        ? `<div class="skl-tip-note">${t('skill_tip_endgame_only')}</div>`
        : `<div class="skl-tip-warn">⚠ ${t('skill_tip_endgame_only')}</div>`;
}

// Charm gate note: while the spell's charm sits outside the spell slots the
// spell cannot be cast, so the tooltip spells that out (the spell book's 🔒
// badge is decorative and carries no native title tooltip). A slotted but
// over-level charm names its player-level requirement instead.
export function _skillTooltipCharmLock(skillId) {
    if (typeof isSkillCharmUnlocked !== 'function') return '';
    if (isSkillCharmUnlocked(skillId)) return '';
    try {
        if (typeof getCharmSlottedRank === 'function' && typeof charmRankMeetsPlayerLevel === 'function') {
            const slotted = getCharmSlottedRank(skillId);
            if (slotted && !charmRankMeetsPlayerLevel(slotted)
                && typeof getCharmRankMinPlayerLevel === 'function') {
                const need = getCharmRankMinPlayerLevel(slotted);
                const msg = (typeof t === 'function')
                    ? t('charm_rank_locked_toast').replace('{r}', slotted).replace('{n}', need)
                    : `Rank ${slotted} charm needs player level ${need}`;
                return `<div class="skl-tip-note">🔒 ${msg}</div>`;
            }
        }
    } catch (e) { /* fall through to generic hint */ }
    return `<div class="skl-tip-note">🔒 ${t('charm_locked_hint')}</div>`;
}

// Small footer hint telling the player they can drag the skill.
export function _skillTooltipDragHint() {
    return `<div class="skl-tip-foot">${t('skill_tip_drag_hint')}</div>`;
}


//------------------------------------------------------------------------
//-------------------------PUBLIC BUILDERS--------------------------------
//------------------------------------------------------------------------

// Builds the full tooltip HTML for a castable skill.
export function buildSkillTooltipHTML(skillId) {
    const def = (typeof getSkillDef === 'function') ? getSkillDef(skillId) : null;
    if (!def) return '';

    // While the spell's charm is slotted, the charm's rank is the rank the
    // player actually casts at (js/skills/skill-charms.js).
    const charmRank = (typeof getCharmSlottedRank === 'function') ? getCharmSlottedRank(skillId) : null;
    const rank = charmRank || ((typeof getSkillLevel === 'function') ? getSkillLevel(skillId) : 1);
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
        + _skillTooltipCharmBonus(skillId)
        + _skillTooltipScaling(def)
        + _skillTooltipGating(def)
        + _skillTooltipCharmLock(skillId)
        + _skillTooltipDragHint()
        + `</div>`;
}

// Builds the tooltip HTML for a passive ability (never movable).
export function buildPassiveSkillTooltipHTML(passiveId) {
    const def = (typeof getPassiveSkillDef === 'function') ? getPassiveSkillDef(passiveId) : null;
    if (!def) return '';

    const rank = globalThis.STATE.classPassiveLevel || 1;
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
export function buildTraitTooltipHTML(traitIndex) {
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
export function handleTraitTip(e, traitIndex) {
    if (typeof showHUDTooltip !== 'function') return;
    const html = buildTraitTooltipHTML(Number(traitIndex));
    if (html) showHUDTooltip(html, e);
}


// Shows the tooltip for a castable OR passive skill id.
export function handleSkillTip(e, skillId) {
    if (typeof showHUDTooltip !== 'function') return;
    const html = (typeof isSkillPassive === 'function' && isSkillPassive(skillId))
        ? buildPassiveSkillTooltipHTML(skillId)
        : buildSkillTooltipHTML(skillId);
    if (html) showHUDTooltip(html, e);
}

// Repositions the floating tooltip as the cursor moves.
export function handleSkillTipMove(e) {
    if (typeof moveHUDTooltip === 'function') moveHUDTooltip(e);
}

// Hides the floating tooltip.
export function handleSkillTipLeave() {
    if (typeof hideHUDTooltip === 'function') hideHUDTooltip();
}
