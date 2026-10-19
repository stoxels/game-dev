import { isEndgameLevel } from '../mouse-button-handlers.js';
import { LANG, t } from '../translation/translations.js';
import { _formatCooldown } from '../classes/class-cooldown-state.js';
import { hideHUDTooltip, moveHUDTooltip, showHUDTooltip } from '../classes/class-hud.js';
import { _bloodMagicActive } from '../classes/class-mana.js';
import { CHARM_ORB_DAMAGE_PCT, charmRankMeetsPlayerLevel, getCharmArtForSkill, getCharmByKey, getCharmRankMinPlayerLevel, getCharmSkillOrbBonusPct, getCharmSlottedRank, isSkillCharmUnlocked, withPreviewCastRank } from './skill-charms.js';
import { canAffordSkill, getPassiveSkillDef, getPlayerTraits, getSkillCooldown, getSkillDamage, getSkillDef, getSkillDesc, getSkillLevel, getSkillManaCost, getSkillName, isSkillPassive } from './skill-registry.js';
import { getSkillCastTimeSeconds } from './spell-casttime.js';
import { getUniversalSpellCastKind, getUniversalSpellChargeRechargeRemaining, getUniversalSpellCharges, getUniversalSpellDef, getUniversalSpellMovementEstimate, getUniversalSpellSupportEstimate } from './universal-spells.js';
import { STATE } from '../state.js';

//------------------------------------------------------------------------
//-------------------CROSS-MODULE CONSTRAINT------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Consumers reach this file through the globalThis bridge on purpose: the
// hotbar and charm inventory wire these handlers into generated HTML as
// inline onmouseenter/onmousemove/onmouseleave attributes, which resolve at
// event time off the bridge (and skill-charms.js cannot import this file
// back without closing a cycle). The manifest surface below is exactly the
// consumed surface: handleSkillTip / handleSkillTipMove / handleSkillTipLeave.

//------------------------------------------------------------------------
//-------------------SKILL TOOLTIP (ARPG STYLE)-------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the hover tooltip shared by the spell book and the hotbar.
//
// Layout mirrors the genre's charm tooltip:
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
//
// The floating element itself is owned by class-hud.js (getHUDTooltip /
// showHUDTooltip), so both tooltips share one visual + positioning system.

// Formats a cooldown in seconds for the tooltip (m:ss, or "12s").
function _skillFormatCooldown(secs) {
    return _formatCooldown(Math.max(0, Math.round(secs || 0)));
}

//------------------------------------------------------------------------
//---------------------------LINE BUILDERS--------------------------------
//------------------------------------------------------------------------

// The coloured type line: "Spell, Reveal, Area".
function _skillTooltipTags(def) {
    if (!def.tags || !def.tags.length) return '';
    return `<div class="skl-tip-tags">${def.tags.join(', ')}</div>`;
}

// Cost line - becomes red when the player cannot currently pay it, and
// switches to Life under Blood Magic maps. `preview` (shop / rank preview)
// never shows the unaffordable red: nothing is being cast there, so the
// current mana pool is irrelevant and the cost keeps its normal colour.
function _skillTooltipCost(def, preview) {
    const cost = getSkillManaCost(def.id);
    if (!cost) return '';
    const blood = _bloodMagicActive();
    const label = blood ? t('cls_life') : t('cls_mana');
    const affordable = preview || canAffordSkill(def.id);
    const color = blood ? '#ff7a7a' : '#7fb3ff';
    // Channels and auras drain continuously: their cost is per second.
    let per = '';
    try {
        const kind = def.slotKind === 'universal' ? getUniversalSpellCastKind(def.id) : null;
        if (kind === 'channel' || kind === 'toggle') per = ' / s';
    } catch (e) { /* plain cost */ }
    return `<div class="skl-tip-stat">${t('skill_tip_cost')}: <b style="color:${affordable ? color : '#ff5252'}">${cost} ${label}${per}</b></div>`;
}

// Cooldown line - shows the effective cooldown and, when passive nodes or
// gear reduced it, the base value in parentheses. Charge spells (Blink,
// Dash, …) show their pool instead: charges held, recharge time and - while
// the pool is empty - the wait for the next charge.
function _skillTooltipCooldown(def) {
    const charges = getUniversalSpellCharges(def.id);
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
    const eff = getSkillCooldown(def.id);
    const base = def.cooldownSeconds || 0;
    if (!eff && !base) return '';
    let line = `⏱ ${t('skill_tip_cooldown')}: <b style="color:#e8b04b">${_skillFormatCooldown(eff)}</b>`;
    if (base && Math.round(base) !== Math.round(eff)) {
        line += ` <span style="opacity:.55">(${t('skill_tip_base')} ${_skillFormatCooldown(base)})</span>`;
    }
    return `<div class="skl-tip-stat">${line}</div>`;
}

// How a universal spell is aimed once the key is tapped (spell pass 1). Hold
// spells say it in their cast-time value instead ("1.2s (hold)").
const SKILL_CAST_KIND_HINT = {
    instant: { en: 'on target', de: 'aufs Ziel' },
    self: { en: 'on you', de: 'auf dich' },
    move: { en: 'to cursor', de: 'zum Cursor' },
    ground: { en: 'aim & click', de: 'zielen & klicken' },
    melee: { en: 'melee swing', de: 'Nahkampf-Schlag' },
    channel: { en: 'hold to channel', de: 'halten zum Kanalisieren' },
    charge: { en: 'release to fire', de: 'loslassen zum Schießen' },
    toggle: { en: 'tap: on / off', de: 'Tippen: an / aus' },
};

// Cast-time line - instant skills fire on click; timed ones need the button
// held until the cast bar fills (see js/skills/spell-casttime.js).
function _skillTooltipCastTime(def) {
    if (!def.castTime) return '';
    const isInstant = def.castTime === 'instant';
    let holdHint = '';
    let value = t('skill_tip_instant');
    if (isInstant && def.slotKind === 'universal') {
        const hint = SKILL_CAST_KIND_HINT[getUniversalSpellCastKind(def.id)];
        if (hint) value = `${value} · ${LANG === 'de' ? hint.de : hint.en}`;
    }
    if (!isInstant) {
        let effective = 0;
        try { effective = getSkillCastTimeSeconds(def.id); } catch (e) {}
        if (effective > 0) {
            holdHint = LANG === 'de' ? ' (halten)' : ' (hold)';
            const rounded = Math.round(effective * 100) / 100;
            const formatted = Number.isInteger(rounded * 10) ? rounded.toFixed(1) : String(rounded);
            value = `${formatted}s${holdHint}`;
        } else {
            value = `${def.castTime}`;
        }
    }
    // Melee spells can be instant OR carry a cast time: the hint rides along either way.
    if (!isInstant && def.slotKind === 'universal' && getUniversalSpellCastKind(def.id) === 'melee') {
        const mh = SKILL_CAST_KIND_HINT.melee;
        value = `${value} · ${LANG === 'de' ? mh.de : mh.en}`;
    }
    // Sustained kinds say how they are used instead of a cast time.
    if (def.slotKind === 'universal') {
        const kind = getUniversalSpellCastKind(def.id);
        const sh = SKILL_CAST_KIND_HINT[kind];
        if (sh && (kind === 'channel' || kind === 'toggle')) value = LANG === 'de' ? sh.de : sh.en;
        else if (sh && kind === 'charge') value = `${value.replace(holdHint, '')} · ${LANG === 'de' ? sh.de : sh.en}`;
    }
    return `<div class="skl-tip-stat">${t('skill_tip_cast_time')}: <b style="color:#e6e6e6">${value}</b></div>`;
}

// Damage block - the puzzle-ability equivalent of the genre's "Deals X to Y
// Physical Damage" lines: each revealed cell fires a reveal projectile.
// Universal spells get their own direct-damage wording (see below).
function _skillTooltipDamage(def) {
    const dmg = getSkillDamage(def.id);
    if (!dmg) {
        // The self-cast families carry no damage payload at all - describe
        // exactly what the cast will deliver instead (js/skills/
        // universal-spells.js). Support: the amount at the current charm rank
        // and Life/Absorption pools. Movement: the jump distance at the
        // current rank, plus the live armed-anchor state.
        if (def.slotKind === 'universal') {
            const sup = getUniversalSpellSupportEstimate(def.id);
            if (sup) return _uspTooltipSupport(sup);
            const mov = getUniversalSpellMovementEstimate(def.id);
            if (mov) return _uspTooltipMovement(mov);
        }
        return '';
    }
    if (def.slotKind === 'universal') {
        let html = _uspTooltipDamage(def, dmg);
        // Damaging movement spells (Leap Strike) also say how far they jump.
        const mov = getUniversalSpellMovementEstimate(def.id);
        if (mov) html += _uspTooltipMovement(mov);
        return html;
    }
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
function _uspTooltipDamage(def, dmg) {
    const de = LANG === 'de';
    const spell = getUniversalSpellDef(def.id);
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
        if (spell.castKind === 'channel') {
            const ts = spell.channel.tickSeconds;
            suffix = de ? ` pro Treffer (alle ${ts}s)` : ` per tick (every ${ts}s)`;
        } else if (spell.castKind === 'toggle') {
            suffix = de ? ', jeden Gegner in Reichweite, jede Sekunde' : ', each enemy in range, every second';
        } else if (spell.castKind === 'charge') {
            const lo = Math.round(spell.charge.minPower * 100);
            const hi = Math.round(spell.charge.maxPower * 100);
            suffix = de ? ` (${lo}% schneller Schuss bis ${hi}% voll aufgeladen)` : ` (${lo}% quick shot up to ${hi}% fully charged)`;
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
    if (dmg.weaponSwing) {
        html += `<div class="skl-tip-dmg" style="opacity:.8">${de ? 'Enthält einen vollen Schlag deiner Nahkampfwaffe.' : 'Includes a full swing of your melee weapon.'}</div>`;
    }
    return html;
}

// Support-spell wording: the concrete amount the cast will deliver. The line
// is built inside getUniversalSpellSupportEstimate so the numbers shown here
// are the same numbers the cast applies (rank + pools included).
function _uspTooltipSupport(sup) {
    const de = LANG === 'de';
    const line = de ? sup.lineDe : sup.lineEn;
    if (!line) return '';
    const warn = sup.noPool ? ' class="skl-tip-warn"' : ' class="skl-tip-dmg"';
    return `<div class="skl-tip-sep"></div><div${warn}>${line}</div>`;
}

// Movement-spell wording: the concrete jump/window the cast will produce, and
// - while a Rift Anchor is armed - what the NEXT cast does instead of what the
// spell does in general. Built inside getUniversalSpellMovementEstimate so the
// numbers cannot drift from the ones the cast applies.
function _uspTooltipMovement(mov) {
    const de = LANG === 'de';
    const line = de ? mov.lineDe : mov.lineEn;
    if (!line) return '';
    // An armed anchor is a different spell: highlight it so the player knows the
    // tooltip is describing the recall, not the plant.
    const cls = mov.armed ? ' class="skl-tip-stat" style="color:#7fd9ff"' : ' class="skl-tip-dmg"';
    return `<div class="skl-tip-sep"></div><div${cls}>${line}</div>`;
}

// Charm-orb bonus line, shown only when orbs have been applied to the
// spell's charm (js/skills/skill-charms.js).
function _skillTooltipCharmBonus(skillId) {
    const pct = getCharmSkillOrbBonusPct(skillId);
    if (!pct) return '';
    return `<div class="skl-tip-stat">${t('charm_tip_orb_bonus')}: <b style="color:#7fd9ff">+${pct}%</b></div>`;
}

// Endgame-only warning for Heartbloom.
function _skillTooltipGating(def) {
    if (!def.endgameOnly) return '';
    const active = isEndgameLevel();
    return active
        ? `<div class="skl-tip-note">${t('skill_tip_endgame_only')}</div>`
        : `<div class="skl-tip-warn">⚠ ${t('skill_tip_endgame_only')}</div>`;
}

// Charm gate note: while the spell's charm sits outside the spell slots the
// spell cannot be cast, so the tooltip spells that out (the spell book's 🔒
// badge is decorative and carries no native title tooltip). A slotted but
// over-level charm names its player-level requirement instead.
function _skillTooltipCharmLock(skillId) {
    if (isSkillCharmUnlocked(skillId)) return '';
    try {
        const slotted = getCharmSlottedRank(skillId);
        if (slotted && !charmRankMeetsPlayerLevel(slotted)) {
            const need = getCharmRankMinPlayerLevel(slotted);
            return `<div class="skl-tip-note">🔒 ${t('charm_rank_locked_toast').replace('{r}', slotted).replace('{n}', need)}</div>`;
        }
    } catch (e) { /* fall through to generic hint */ }
    return `<div class="skl-tip-note">🔒 ${t('charm_locked_hint')}</div>`;
}

//------------------------------------------------------------------------
//-------------------------PUBLIC BUILDERS--------------------------------
//------------------------------------------------------------------------

// Title row: the charm's own art (the same image the spell slot, hotbar and
// drop show) next to the name. Falls back to the plain name when the skill
// has no mapped art.
function _skillTooltipTitle(skillId, rank) {
    let art = null;
    try { art = getCharmArtForSkill(skillId, rank); } catch (e) { art = null; }
    const img = art ? `<img class="skl-tip-art" src="${art}" alt="" draggable="false">` : '';
    return `<div class="skl-tip-title">${img}${getSkillName(skillId)}</div>`;
}

// Extra lines when the tooltip is for a charm sitting in the charm LIST (not
// yet / not necessarily slotted): the level it needs and its orb bonus.
// Together with the spell's own stats this is the ONE spell tooltip - there
// is no separate charm tooltip any more.
function _skillTooltipCharmInfo(charm) {
    if (!charm) return '';
    const usable = charmRankMeetsPlayerLevel(charm.rank);
    const need = getCharmRankMinPlayerLevel(charm.rank);
    const reqColor = usable ? '#2ecc71' : '#e06c55';
    let html = `<div class="skl-tip-stat">${t('charm_tip_req_player')}: <b style="color:${reqColor}">${need}</b></div>`;
    if (!usable) html += `<div class="skl-tip-note" style="color:#e06c55">${t('charm_tip_locked_level')}</div>`;
    const bonus = (charm.orbs || 0) * CHARM_ORB_DAMAGE_PCT;
    if (bonus > 0) {
        html += `<div class="skl-tip-stat">${t('charm_tip_orb_bonus')}: <b style="color:#7fd9ff">+${bonus}%</b></div>`;
    }
    return html;
}

// Builds the full tooltip HTML for a castable skill. `charmKey` (optional)
// is the charm the pointer is over in the charm list: the tooltip then shows
// THAT charm's rank and requirements instead of the slotted one.
function buildSkillTooltipHTML(skillId, charmKey) {
    const hoveredCharm = charmKey ? getCharmByKey(charmKey) : null;
    // Hovering a charm of another rank than the slotted / trained one: build
    // the WHOLE tooltip (description, damage, cost) at that charm's rank.
    if (hoveredCharm && hoveredCharm.skillId === skillId) {
        return withPreviewCastRank(skillId, hoveredCharm.rank, () => _buildSkillTooltipHTML(skillId, charmKey));
    }
    return _buildSkillTooltipHTML(skillId, charmKey);
}

function _buildSkillTooltipHTML(skillId, charmKey, previewRank) {
    const def = getSkillDef(skillId);
    if (!def) return '';

    const hovered = charmKey ? getCharmByKey(charmKey) : null;
    // While the spell's charm is slotted, the charm's rank is the rank the
    // player actually casts at (js/skills/skill-charms.js).
    const charmRank = hovered ? hovered.rank : getCharmSlottedRank(skillId);
    const rank = previewRank || charmRank || getSkillLevel(skillId);
    const desc = getSkillDesc(skillId);

    return `<div class="skl-tip">`
        + _skillTooltipTitle(skillId, rank)
        + _skillTooltipTags(def)
        + `<div class="skl-tip-stat">${t('skill_tip_rank')}: <b style="color:#f1c40f">${rank}</b></div>`
        + _skillTooltipCost(def, !!previewRank)
        + _skillTooltipCastTime(def)
        + _skillTooltipCooldown(def)
        + _skillTooltipCharmInfo(hovered)
        + `<div class="skl-tip-sep"></div>`
        + `<div class="skl-tip-desc">${desc}</div>`
        + _skillTooltipDamage(def)
        + (hovered || previewRank ? '' : _skillTooltipCharmBonus(skillId))
        + _skillTooltipGating(def)
        + (hovered || previewRank ? '' : _skillTooltipCharmLock(skillId))
        + `</div>`;
}

// Builds the tooltip HTML for a passive ability (never movable).
function buildPassiveSkillTooltipHTML(passiveId) {
    const def = getPassiveSkillDef(passiveId);
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

// ⚠ SUSPECTED DEAD CODE (flagged per R3 rulebook, not removed): nothing
// wires buildTraitTooltipHTML/handleTraitTip any more - the old right-side
// spell list that rendered trait rows is gone (see skill-spellbook.js:
// "Passives and traits ... live outside the book"), and no other caller
// exists in js/, main.js, or index.html. Verify with the graph + grep before
// removing.

// Builds the tooltip HTML for one of the character's innate traits.
// Traits are always-on (never placed on the hotbar), so they reuse the
// passive tooltip look but are tagged as a character trait.
function buildTraitTooltipHTML(traitIndex) {
    const traits = getPlayerTraits();
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
// eslint-disable-next-line no-unused-vars -- flagged dead, kept deliberately
function handleTraitTip(e, traitIndex) {
    const html = buildTraitTooltipHTML(Number(traitIndex));
    if (html) showHUDTooltip(html, e);
}

// Shows the tooltip for a castable OR passive skill id.
export function handleSkillTip(e, skillId, charmKey) {
    const html = isSkillPassive(skillId)
        ? buildPassiveSkillTooltipHTML(skillId)
        : buildSkillTooltipHTML(skillId, charmKey);
    if (html) showHUDTooltip(html, e);
}

// Shows the tooltip for a skill AT a given rank, owned or not (the Cartographer's
// charm shop previews ranks the player has not bought yet).
export function handleSkillTipRank(e, skillId, rank) {
    const r = Math.max(1, Math.round(Number(rank) || 1));
    const html = withPreviewCastRank(skillId, r, () => _buildSkillTooltipHTML(skillId, null, r));
    if (html) showHUDTooltip(html, e);
}

// Repositions the floating tooltip as the cursor moves.
export function handleSkillTipMove(e) {
    moveHUDTooltip(e);
}

// Hides the floating tooltip.
export function handleSkillTipLeave() {
    hideHUDTooltip();
}
