import { curMods } from './difficulty-modifiers.js';
import { _getMaxAllowedMistakes } from './combat/encounter-tick-support.js';
import { _egActiveMapItem } from './endgame/endgame-map-launch.js';
import { _egGetMapRewardBonuses } from './loot/loot-map-mod-rewards.js';
import { _egMapModAffects } from './loot/loot-map-mod-tables.js';
import { _egResolveMapBoss } from './loot/loot-map-implicit-parts.js';
import { _buildMergedModLines } from './combat/combat-player-stats.js';
import { _isActive } from './combat/combat-state.js';
import { lvText } from './levels/levels.js';
import { WORLDS } from './levels/level-world-data.js';
import { getStoryProgress } from './storyline/companion-scenes.js';
import { QUEST_ITEMS } from './storyline/quest-items.js';
import { ptHasSkill } from './probability-tree/probability-tree-state-points.js';
import { _getAsymptoticMasteryReduction, _getPenaltySecondsAtCount } from './penalty.js';
import { RESHUFFLE_GOAL } from './puzzle-item-inventory/puzzle-item-reshuffle.js';
import { rarityColors } from './puzzle-items/item-pool.js';
import { _getLevelSpecialStatus } from './scoring/scoring-core.js';
import { _getGridSizeTier } from './start-level-passives.js';
import { t } from './translation/translations.js';
import { STATE } from './state.js';
import { cur } from './state.js';

// tooltips-hud.js
// Generic floating tooltip engine (visual twin of class-hud.js's tooltip)
// + content builders + wiring for: mistakes, timer, levels-back button,
// level name, and inventory label.


// _wireHoverByRect - tooltip trigger based on manual bounding-box hit
// testing instead of native hover events. Needed for elements that must
// stay pointer-events:none (so they never block clicks on whatever sits
// beneath them, e.g. the puzzle grid under the fixed corner HUD) but
// still need a working hover tooltip.
//
// OCCLUSION GUARD: for triggers that DO receive pointer events (e.g. the
// title screen's CARTOGRAPHERS subtitle), a raw rect hit is not enough - the
// element can sit geometrically under the cursor while being covered by
// an overlay stacked above it (modal backdrops etc.), which used to fire
// tooltips "through" the overlay. Those triggers only count as hovered
// when the topmost element at the cursor is the trigger itself (or a
// descendant). For pointer-events:none triggers the pass-through is the
// whole point, so the plain rect test decides for them.
function _wireHoverByRect(el, builder) {
    if (!el) return;
    let isOver = false;

    document.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        let inside = e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom;

        if (inside && getComputedStyle(el).pointerEvents !== 'none') {
            const topEl = document.elementFromPoint(e.clientX, e.clientY);
            inside = !!topEl && (topEl === el || el.contains(topEl));
        }

        if (inside) {
            if (!isOver) {
                isOver = true;
                showGameTooltip(builder(), e);
            } else {
                moveGameTooltip(e);
            }
        } else if (isOver) {
            isOver = false;
            hideGameTooltip();
        }
    });
}


//------------------------------------------------------------------------
//----------------------------TOOLTIP ENGINE-------------------------------
//------------------------------------------------------------------------

export function getGameTooltip() {
    let tip = document.getElementById('ghud-floating-tip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'ghud-floating-tip';
        tip.style.cssText = `
            position: fixed;
            /* Above every modal backdrop, matching #chud-floating-tip. The
               spell book lifts itself to z-index 10000 while open, so a 10010
               tooltip used to sit UNDER the book's own chrome (scrollbars,
               sticky headers) on the right-hand edge of the frame. */
            z-index: 10050;
            background: linear-gradient(180deg, #25202b, #16131b);
            border: 2px solid #b8913a;
            border-radius: 6px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
            color: #e9e2cf;
            font-family: var(--PX, monospace);
            font-size: 11px;
            line-height: 1.6;
            padding: 8px 12px;
            max-width: 380px;
            pointer-events: none;
            opacity: 0;
            transition: opacity .12s;
            white-space: normal;
        `;
        document.body.appendChild(tip);
    }
    return tip;
}

export function _calcGameTooltipPos(e, w, h) {
    let x = e.clientX + 14;
    let y = e.clientY + 14;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - 10;
    if (y + h > window.innerHeight - 8) y = e.clientY - h - 10;
    // Hard-clamp so the tooltip can never leave the viewport, even when it
    // is taller/wider than the free space around the cursor.
    x = Math.max(8, Math.min(x, window.innerWidth - w - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - h - 8));
    return { x, y };
}

export function showGameTooltip(html, e) {
    const tip = getGameTooltip();
    tip.innerHTML = html;
    tip.style.opacity = '1';
    const { x, y } = _calcGameTooltipPos(e, tip.offsetWidth || 220, tip.offsetHeight || 60);
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
}

export function moveGameTooltip(e) {
    const tip = getGameTooltip();
    if (tip.style.opacity !== '1') return;
    const { x, y } = _calcGameTooltipPos(e, tip.offsetWidth || 220, tip.offsetHeight || 60);
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
}

export function hideGameTooltip() {
    const tip = document.getElementById('ghud-floating-tip');
    if (tip) tip.style.opacity = '0';
}


//------------------------------------------------------------------------
//------------------GENERIC data-tip DELEGATED TOOLTIPS--------------------
//------------------------------------------------------------------------
// Any element carrying `data-tip-t` (a translation key) or `data-tip`
// (ready-made HTML) gets the styled tooltip for free, with no per-element
// wiring and no re-wiring after an innerHTML rebuild.
//
// WHY THIS EXISTS: a native title="" renders the OPERATING SYSTEM popup -
// unthemed, unstyled, force-wrapped, and on a dark canvas often illegible.
// Every hint in the game routes through this one path instead, so there is
// exactly one tooltip look and exactly one place to change it.
//
//   data-tip-t="key"       translation key; {n} is replaced from data-tip-n
//   data-tip="<b>&#8230;</b>"  ready-made HTML (wins). Escape it ONLY when the
//                           attribute is written inline in an HTML string
//                           (the parser decodes the entities back). Code that
//                           calls setAttribute must pass RAW markup - escaping
//                           there stores the entities verbatim and the tooltip
//                           shows literal <b> tags instead of bold text.
//   data-tip-n="3"         the value for {n} in data-tip-t
//
// `data-tip` deliberately takes priority over `data-tip-t` so a caller can
// hand over rich markup (dynamic numbers, an item's own name) where a
// translation key would be a lie.
const _TIP_SELECTOR = '[data-tip-t],[data-tip]';

// Escapes dynamic text before it goes into a data-tip attribute. Quotes are
// required for the attribute itself; &< > are required because the resolver
// feeds the value to innerHTML (a save-slot name is player-typed text).
export function _tipAttr(text) {
    return String(text == null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function _resolveTipHTML(el) {
    const raw = el.getAttribute('data-tip');
    if (raw) return raw;
    const key = el.getAttribute('data-tip-t');
    if (!key || typeof t !== 'function') return '';
    let html = t(key);
    const n = el.getAttribute('data-tip-n');
    if (n != null && n !== '') html = html.replace('{n}', n);
    else html = html.replace(/\s*\(\{n\}\)/, ''); // count unknown → drop the placeholder cleanly
    return html;
}

// The element the generic tooltip is currently describing. Hovering is
// resolved from the live event target on every mousemove rather than from
// mouseenter/mouseleave pairs, so a panel that re-renders itself (the class
// HUD, the essence stash, a loot-filter row) cannot leave a stale tooltip
// floating: the next mouse move resolves to nothing and hides it.
//
// Two details make it coexist with the older bespoke tooltips that also draw
// into this same floating element (hub item chips, skill buttons):
//   • CAPTURE phase - our hide/„show" runs BEFORE the target's own inline
//     onmousemove/onmouseenter handlers, so crossing from a data-tip element
//     to a bespoke-tooltip element never leaves our tip on top of theirs.
//   • we only ever hide a tooltip this engine itself put up. A bespoke
//     tooltip that is already showing is left alone.
let _tipCurrentEl = null;

function _installDelegatedTips() {
    document.addEventListener('mousemove', (e) => {
        const el = (e.target && e.target.closest) ? e.target.closest(_TIP_SELECTOR) : null;
        if (el === _tipCurrentEl) {
            if (el) moveGameTooltip(e);
            return;
        }
        const owned = _tipCurrentEl !== null;
        _tipCurrentEl = el;
        if (!el) { if (owned) hideGameTooltip(); return; }
        const html = _resolveTipHTML(el);
        if (!html) { if (owned) hideGameTooltip(); return; }
        showGameTooltip(html, e);
    }, true);
}


//------------------------------------------------------------------------
//----------------------------CONTENT BUILDERS-----------------------------
//------------------------------------------------------------------------

// Formats a whole number of seconds as "Xm Ys" (e.g. 125 -> "2m 5s").
// Falls back to "0s" for 0/negative input.
function _fmtSecsAsMinSec(totalSecs) {
    const safeSecs = Math.max(0, Math.round(totalSecs));
    const m = Math.floor(safeSecs / 60);
    const s = safeSecs % 60;
    if (m <= 0) return `${s}s`;
    return `${m}m ${s}s`;
}


// 1. Mistakes
function _buildMistakesTooltipHTML() {
    const base = typeof _getPenaltySecondsAtCount === 'function'
        ? _getPenaltySecondsAtCount(globalThis.mistakeCount + 1)
        : 0;
    const reduction = typeof _getAsymptoticMasteryReduction === 'function' ? _getAsymptoticMasteryReduction() : 0;
    const nextPenalty = Math.max(0, base - reduction);

    const isHardcore = typeof curMods !== 'undefined' && !!curMods.hardcore;
    let html = `<strong style="color:#ff5555">${t('cg_tt_mistakes')}</strong>`;
    if (isHardcore) {
        html += `<br><span style="color:#ff5555;font-weight:700;">${t('hc_fail_title') || 'HARDCORE'}</span> - <span style="color:#ff7777;">${t('eg_too_many_mistakes') || '0 mistakes allowed - next mistake ends the run!'}</span>`;
        // When hardcore is active also show the 0-limit explicitly
        html += `<br>${t('cg_tt_total_level')} <b>${globalThis.mistakeCount} / 0</b>`;
    } else {
        html += `<br>${t('cg_tt_total_level')} <b>${globalThis.mistakeCount}</b>`;
    }
    if (typeof absorbedMistakes !== 'undefined' && globalThis.absorbedMistakes > 0) {
        html += `<br>${t('cg_tt_absorbed')} <b>${globalThis.absorbedMistakes}</b>`;
    }
    if (typeof _levelMistakesErased !== 'undefined' && globalThis._levelMistakesErased > 0) {
        html += `<br>${t('cg_tt_erased')} <b>${globalThis._levelMistakesErased}</b>`;
    }
    // Endgame: show remaining vs max when a limit exists (hardcore already shown above)
    if (!isHardcore && typeof _isActive === 'function' && _isActive() && typeof _getMaxAllowedMistakes === 'function') {
        const max = _getMaxAllowedMistakes();
        if (max != null) {
            const remaining = Math.max(0, max - (typeof mistakeCount !== 'undefined' ? globalThis.mistakeCount : 0));
            html += `<br><span style="opacity:.7;">${t('eg_stat_allowed_mistakes') || 'Allowed'}: <b>${max}</b> - ${remaining} ${t('eg_mistakes_warning_1') ? '' : 'remaining'}</span>`;
        }
    }
    html += `<br>${t('cg_tt_next_cost')} <b>−${_fmtSecsAsMinSec(nextPenalty)}</b>`;
    if (reduction > 0) {
        html += `<br><span style="opacity:.6;font-size:.85em">${t('cg_tt_reduction').replace('{n}', reduction)}</span>`;
    }
    html += `<br><span style="opacity:.55;font-size:.85em">${t('cg_tt_class_note')}</span>`;
    return html;
}

// 2. Timer
function _buildTimerTooltipHTML() {
    let html = `<strong style="color:var(--accent,#66fcf1)">${t('cg_tt_timer')}</strong>`;
    html += `<br>${t('cg_tt_time_added')} <b>+${_fmtSecsAsMinSec(globalThis._levelTimeAdded || 0)}</b>`;
    html += `<br>${t('cg_tt_time_lost')} <b>−${_fmtSecsAsMinSec(globalThis._levelTimeLost || 0)}</b>`;
    html += `<br><span style="opacity:.55;font-size:.85em">${t('cg_tt_includes')}</span>`;
    return html;
}

// 3. Levels/back button
function _buildLevelsButtonTooltipHTML() {
    return t('cg_return_levels');
}

// 4. Level name
const _MOD_SHORT = { timetrial: 'tt', hardcore: 'hc', ironman: 'im', classless: 'cl', treeless: 'tl' };

// Builds the mod lines of an active map-device run map, grouped by their
// affects category with the same colors as the map item tooltip:
// monster → orange, player → red, puzzle → blue.
function _buildActiveMapModsHTML(map) {
    const colors = { monster: '#e67e22', player: '#e74c3c', puzzle: '#5b9cf6' };
    let html = '';
    let hasMods = false;
    // Mods sharing the same stat are merged into one combined line, kept
    // grouped by their affects category (and thus color).
    const byColor = new Map();
    (map.mods || []).forEach(mod => {
        const key = _egMapModAffects(mod.familyId) || 'monster';
        if (!byColor.has(key)) byColor.set(key, []);
        byColor.get(key).push(mod);
    });
    const hideTier = !!(map && map.isUnique);
    byColor.forEach((mods, key) => {
        const color = colors[key] || '#e67e22';
        _buildMergedModLines(mods).forEach(entry => {
            hasMods = true;
            const tier = (!hideTier && entry.tierLabel) ? ` <span style="opacity:0.65; font-size:0.85em; border:1px solid rgba(255,255,255,0.18); border-radius:3px; padding:0 3px; margin-left:4px; color:${color};">${entry.tierLabel}</span>` : '';
            html += `<br><span style="color:${color}">${entry.label}${tier}</span>`;
        });
    });
    if (!hasMods && typeof t === 'function') {
        html += `<br><span style="opacity:.6">${t('eg_map_unmodified')}</span>`;
    }
    return html;
}

// Map-only tooltip shown while a map-device run is active and the corner
// HUD displays the launched map's name instead of the seed level's hint.
// Contains ONLY the map identity (rarity-colored) + its rolled modifiers
// + the reward bonuses (xp / quantity / rarity) the run grants.
function _buildMapRunTooltipHTML() {
    const map = (typeof _egActiveMapItem !== 'undefined') ? _egActiveMapItem : null;
    if (!map) return '';
    const rc = (typeof rarityColors === 'function') ? rarityColors(map.rarity) : null;
    let html = `<strong style="color:${rc ? rc.color : '#c8a84b'}">🗺️ ${map.name}</strong>`;
    // Boss status for the active map (baked into implicits, matches the run).
    const imp = map.implicits || null;
    if (imp && imp.hasBoss != null) {
        if (imp.hasBoss && (imp.maxBosses || 0) > 0) {
            // Name the region's specific boss (same lookup the launch uses)
            // when the map fights a single known boss.
            const boss = (imp.maxBosses > 1 || typeof _egResolveMapBoss !== 'function') ? null : _egResolveMapBoss(map);
            const bossLabel = boss
                ? `${boss.emoji} ${boss.name}`
                : (imp.maxBosses > 1 ? t('eg_map_boss_count').replace('{n}', imp.maxBosses) : t('eg_map_has_boss'));
            html += `<br><span style="color:#e74c3c;font-weight:700;">${bossLabel}</span>`;
        } else {
            html += `<br><span style="color:#888;">${t('eg_map_no_boss')}</span>`;
        }
    } else if ((map.mapTier || 1) < 2) {
        html += `<br><span style="color:#888;">${t('eg_map_no_boss')}</span>`;
    }
    html += _buildActiveMapModsHTML(map);

    const rw = (typeof _egGetMapRewardBonuses === 'function') ? _egGetMapRewardBonuses(map) : null;
    if (rw) {
        if (rw.xp > 0) html += `<br><span style="color:#f5d98a">${t('eg_map_reward_xp').replace('{n}', rw.xp)}</span>`;
        if (rw.quantity > 0) html += `<br><span style="color:#f5d98a">${t('eg_map_reward_quantity').replace('{n}', rw.quantity)}</span>`;
        if (rw.quantity > 0) {
            const mdLabel = (t('eg_map_reward_map_drops') !== 'eg_map_reward_map_drops')
                ? t('eg_map_reward_map_drops').replace('{n}', rw.quantity)
                : `+${rw.quantity}% increased Map Drops`;
            html += `<br><span style="color:#f5d98a">${mdLabel}</span>`;
        }
        if (rw.rarity > 0) html += `<br><span style="color:#f5d98a">${t('eg_map_reward_rarity').replace('{n}', rw.rarity)}</span>`;
    }
    return html;
}

// Returns the active campaign trial stamp (convergence / ascension), if the
// current run is one. Mirrors _isTrialRun(): the stamp lives on the level,
// on _mapDef, or on window - whichever survived the last chain transition.
function _activeTrialStamp() {
    if (typeof cur !== 'undefined' && cur && cur.campaignTrial) return cur.campaignTrial;
    if (typeof globalThis !== 'undefined' && globalThis._mapDef && globalThis._mapDef.campaignTrial) {
        return globalThis._mapDef.campaignTrial;
    }
    if (typeof window !== 'undefined' && window._campaignTrial) return window._campaignTrial;
    return null;
}

// Tooltip for a campaign trial run: the trial name, its kind and the chain
// limits. Never the chained puzzle's generated glyph hint, its random
// world number (e.g. "12-0"), or a bonus objective - trials have none.
function _buildTrialRunTooltipHTML(trial) {
    const isAscension = trial && trial.kind === 'ascension';
    const name = (trial && trial.name)
        || t(isAscension ? 'eg_trial_kind_ascension' : 'eg_trial_kind_convergence');
    const kindLabel = t(isAscension ? 'eg_trial_kind_ascension' : 'eg_trial_kind_convergence');
    let html = `<strong>${name}</strong><br><span style="color:${isAscension ? '#c080ff' : '#6dbf40'}">${kindLabel}</span>`;
    const def = (typeof globalThis !== 'undefined' && globalThis._mapDef) || cur;
    const timeLimit = def && def.chainTimeLimit;
    const maxMistakes = def && def.chainMaxMistakes;
    if (timeLimit && maxMistakes) {
        html += `<br>${t('eg_trial_run_rules').replace('{m}', Math.round(timeLimit / 60)).replace('{n}', maxMistakes)}`;
    }
    return html;
}

function _buildLevelNameTooltipHTML() {
    // Endgame map-device run: the corner HUD shows the map's name, so the
    // tooltip shows ONLY the map identity + its rolled launch modifiers.
    if (typeof _egActiveMapItem !== 'undefined' && _egActiveMapItem
        && typeof _egMapModAffects === 'function') {
        return _buildMapRunTooltipHTML();
    }

    // Campaign trial run: the corner HUD shows the trial's name, so the
    // tooltip describes the trial - not the chained puzzle behind it.
    const trial = _activeTrialStamp();
    if (trial) return _buildTrialRunTooltipHTML(trial);

    if (!cur) return '';
    const gi = cur.gIdx;
    const hs = STATE.levelHS[gi];
    const bonusDone = STATE.bonusDone.includes(gi);
    const bonusHintText = lvText(cur, 'bonusHint') || '';

    let html = `<strong>${t('lvl_prefix')} ${cur.world}-${cur.li}</strong>`;
    html += `<br>${t('cg_tt_bonus').replace('{x}', bonusHintText)}`;
    html += `<br>${t('cg_tt_bonus_claimed')} <b style="color:${bonusDone ? '#2ecc71' : '#e74c3c'}">${bonusDone ? t('cg_yes') : t('cg_no')}</b>`;

    if (hs) {
        const mods = Object.keys(hs.mods || {}).filter(m => hs.mods[m]);
        html += `<br>${t('cg_tt_best_diff')} <b>${t('diff_' + hs.diff)}</b>`;
        html += `<br>${t('cg_tt_best_score')} <b>${hs.score}</b>`;
        if (mods.length) {
            html += `<br>${t('cg_tt_mods_used')} <b>${mods.map(m => t('mod_' + _MOD_SHORT[m])).join(', ')}</b>`;
        }
    } else {
        html += `<br><span style="opacity:.6">${t('cg_tt_not_cleared')}</span>`;
    }

    if (STATE.levelMistakes && STATE.levelMistakes[gi] !== undefined) {
        html += `<br>${t('cg_tt_best_mistakes')} <b>${STATE.levelMistakes[gi]}</b>`;
    }

    if (ptHasSkill('grid_awareness')) {
        const tierLabels = { small: 'cg_grid_small', medium: 'cg_grid_medium', large: 'cg_grid_large', massive: 'cg_grid_massive' };
        const tier = _getGridSizeTier(cur.grid.length, cur.grid[0].length);
        html += `<br>${t('cg_tt_grid_class')} <b>${t(tierLabels[tier])}</b>`;
    }

    // Regular last levels are normal levels now (ascension trials live on
    // their own nodes), so only the Nexus Point earns a special tooltip line.
    const { isConvergence, isNexusPoint } = _getLevelSpecialStatus(cur);
    if (isNexusPoint) html += `<br><span style="color:#7fd4ff">${t('scr_nexus_point_badge')}</span>`;
    if (isConvergence) html += `<br><span style="color:#6dbf40">${t('cg_convergence_lvl')}</span>`;

    return html;
}

// 5. Inventory label
function _buildInventoryLabelTooltipHTML() {
    return `<strong>${t('inv_title')}</strong>`
        + `<br>${t('cg_inv_reshuffle_hint')}`
        + `<br>${t('cg_inv_reward_pick').replace('{n}', typeof RESHUFFLE_GOAL !== 'undefined' ? RESHUFFLE_GOAL : 3)}`;
}

// 6. Setup-screen modifier tombstones - shows the same effect text as the
// per-tombstone description that appears underneath a tombstone while it
// is selected (.mod-per-desc), but as a hover tooltip so the effect can
// also be read before activating it. Reads the live sibling span, so a
// language switch is always reflected.
// Setup-screen modifier tooltip: the modifier's name, one plain sentence about what it does, and
// (for the five that change the score) the bonus, read from the tag printed under the tombstone.
const _MOD_TIP_TARGETS = '.setup-opt-mod, .setup-fig';
const _MOD_TIP_KEYS = {
    timetrial: ['mod_tt', 'mod_tip_tt'],
    hardcore: ['mod_hc', 'mod_tip_hc'],
    ironman: ['mod_im', 'mod_tip_im'],
    classless: ['mod_cl', 'mod_tip_cl'],
    treeless: ['mod_tl', 'mod_tip_tl'],
    monsterless: ['mod_ml', 'mod_tip_ml'],
    superTutor: ['mod_super_tutor', 'mod_tip_pro'],
};

function _buildModTombstoneTooltipHTML(btn) {
    const keys = _MOD_TIP_KEYS[btn.dataset.mod];
    if (!keys) return '';
    const tag = btn.parentElement.querySelector(':scope > .mod-score-tag');
    const pct = tag ? /(\d+)%/.exec(tag.textContent) : null;
    const scoreLine = pct ? `<div class="sx-mod-tip-score">${t('mod_tip_score').replace('{n}', pct[1])}</div>` : '';
    return `<div class="sx-mod-tip">`
        + `<div class="sx-mod-tip-title">${t(keys[0])}</div>`
        + `<div class="sx-mod-tip-text">${t(keys[1])}</div>`
        + scoreLine
        + `</div>`;
}

// 7. Title-screen expansion logo - expansion history.
// Current expansion first, then older ones:
// Expansion 2 "Rise of the Beasts" (current), Expansion 1
// "Cartographers of Chance" (characters, cutscenes, world map,
// large visual overhaul), Base Game.
function _buildExpansionHistoryTooltipHTML() {
    return `<div class="sx-exp-tip"><strong class="sx-exp-tip-title" style="color:#d4b8ff">${t('scr_expansion_tooltip_title')}</strong>`
        + `<br><br><span style="color:#c39bd3">• ${t('scr_expansion_2_badge')}: ${t('scr_expansion_2_name')}</span>`
        + `<br><span style="color:#a9a0c6; opacity:.85">&nbsp;&nbsp;${t('scr_expansion_2_note')}</span>`
        + `<br><br><span style="color:#e6d6ff">• ${t('scr_expansion_badge')}: ${t('scr_expansion_1_name')}</span>`
        + `<br><span style="color:#a9a0c6; opacity:.85">&nbsp;&nbsp;${t('scr_expansion_1_note')}</span>`
        + `<br><br><span style="color:#e6d6ff">• ${t('scr_expansion_base')}</span>`
        + `<br><span style="color:#a9a0c6; opacity:.85">&nbsp;&nbsp;${t('scr_expansion_base_note')}</span></div>`;
}


//------------------------------------------------------------------------
//----------------------------WIRING----------------------------------------
//------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    function wire(id, builder) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('mouseenter', (e) => showGameTooltip(builder(), e));
        el.addEventListener('mousemove', moveGameTooltip);
        el.addEventListener('mouseleave', hideGameTooltip);
    }

    wire('mistake-counter', _buildMistakesTooltipHTML);
    wire('timer-val', _buildTimerTooltipHTML);
    wire('btn-hud-levels', _buildLevelsButtonTooltipHTML);
    _wireHoverByRect(document.getElementById('hud-level-name'), _buildLevelNameTooltipHTML);

    // Inventory label is re-created every buildInventoryPanel() call,
    // so use delegated mouseover/mouseout on the static #inv-panel wrapper.
    const invPanel = document.getElementById('inv-panel');
    if (invPanel) {
        invPanel.addEventListener('mouseover', (e) => {
            if (e.target.classList?.contains('inv-panel-label')) {
                showGameTooltip(_buildInventoryLabelTooltipHTML(), e);
            }
        });
        invPanel.addEventListener('mousemove', (e) => {
            if (e.target.classList?.contains('inv-panel-label')) {
                moveGameTooltip(e);
            }
        });
        invPanel.addEventListener('mouseout', (e) => {
            if (e.target.classList?.contains('inv-panel-label')) {
                hideGameTooltip();
            }
        });
    }

    // Every hint that used to be a native title="" is now a data-tip / data-tip-t
    // attribute handled by the one delegated engine below - including the quiz /
    // Math-Gate / Scouts-Primer corner buttons (tutor / explanation / continue /
    // new-q), whose translation key lives in data-tip-t and whose item count
    // lives in data-tip-n. Delegation is what makes this work for the Primer,
    // which is rebuilt and re-appended per question.
    _installDelegatedTips();

    // Title screen expansion logo ("Rise of the Beasts" EN/DE) → expansion-history tooltip.
    // Uses the bounding-box hover engine so the logo stays interactive
    // for the tooltip while still sitting inside the title canvas.
    _wireHoverByRect(document.getElementById('title-expansion-logo'), _buildExpansionHistoryTooltipHTML);

    // Setup-screen modifier tombstones → per-tombstone effect text on hover.
    // Delegated on the static #screen-setup element (the tombstones are
    // never re-created); scoped to the setup screen so the compact
    // tombstones in the retry-setup modal - which have no .mod-per-desc
    // sibling - stay untouched.
    const setupScreen = document.getElementById('screen-setup');
    if (setupScreen) {
        setupScreen.addEventListener('mouseover', (e) => {
            const btn = e.target.closest ? e.target.closest(_MOD_TIP_TARGETS) : null;
            if (!btn) return;
            const html = _buildModTombstoneTooltipHTML(btn);
            if (html) showGameTooltip(html, e);
        });
        setupScreen.addEventListener('mousemove', (e) => {
            // moveGameTooltip no-ops while the tooltip is hidden.
            if (e.target.closest && e.target.closest(_MOD_TIP_TARGETS)) moveGameTooltip(e);
        });
        setupScreen.addEventListener('mouseout', (e) => {
            const btn = e.target.closest ? e.target.closest(_MOD_TIP_TARGETS) : null;
            if (!btn) return;
            const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest(_MOD_TIP_TARGETS) : null;
            if (to !== btn) hideGameTooltip();
        });
    }
});



//------------------------------------------------------------------------
//----------------------------SAVE SLOT TOOLTIP----------------------------
//------------------------------------------------------------------------

function _fmtPlaytime(totalSecs) {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const _SAVE_SLOT_ALL_MODS = ['timetrial', 'hardcore', 'ironman', 'classless', 'treeless'];

// Counts levels whose recorded highscore was set on Hard difficulty
// with every optional modifier active.
function _countHardAllModsClears(levelHS) {
    return Object.values(levelHS || {}).filter(hs =>
        hs && hs.diff === 'hard' && _SAVE_SLOT_ALL_MODS.every(m => hs.mods && hs.mods[m])
    ).length;
}

function _pctOf(part, total) {
    if (!total) return '0%';
    return `${Math.round((part / total) * 100)}%`;
}

// Number of campaign levels (every world, the Nexus included). ALL itself cannot be used for
// this: the combat code appends generated puzzle levels to it while a session runs.
function _campaignLevelCount() {
    return WORLDS.reduce((n, w) => n + w.data.length, 0);
}

// Highest atlas map tier a save has completed, read from the slot's own save.
function _highestCompletedMapTier(egAtlasCompleted) {
    let highestTier = 0;
    const lookup = globalThis.egAtlasNodeById;
    if (typeof lookup === 'function' && egAtlasCompleted) {
        for (const id in egAtlasCompleted) {
            const node = egAtlasCompleted[id] ? lookup(id) : null;
            if (node && node.tier > highestTier) highestTier = node.tier;
        }
    }
    return highestTier;
}

// One "label value" line of the tooltip.
function _statLine(labelKey, value) {
    return `<div class="sx-slot-tip-line">${t(labelKey)} <b>${value}</b></div>`;
}

// A small heading that starts a group of lines.
function _statGroup(labelKey) {
    return `<div class="sx-slot-tip-group">${t(labelKey)}</div>`;
}

// Builds the lifetime-stats tooltip for a save-slot card.
// `summary` comes from getSlotSummary() in state.js. Everything shown belongs to that one
// save (it lives in the slot's own save data or its seen-marks), so deleting the slot resets it.
export function _buildSaveSlotTooltipHTML(summary) {
    const totalLevels = _campaignLevelCount();
    const trialTotal = typeof globalThis._trialCount === 'function' ? globalThis._trialCount() : 0;
    const upgradesAchieved =
        (summary.classPassiveLevel - 1) +
        (summary.classActive1Level - 1) +
        (summary.classActive2Level - 1) +
        (summary.ascendencySkill1Level - 1) +
        (summary.ascendencySkill2Level - 1);
    const story = getStoryProgress(summary.slot, summary.playerCharacter);

    let html = `<div class="sx-slot-tip-title">${t('cg_slot_stats').replace('{n}', summary.slot)}</div>`;
    html += _statLine('cg_stat_playtime', _fmtPlaytime(summary.totalTimePlayedSecs));
    html += _statLine('cg_stat_level', summary.playerLevel);

    html += _statGroup('cg_group_puzzles');
    html += _statLine('cg_stat_revealed', summary.lifetimeTilesRevealed);
    html += _statLine('cg_stat_filled', summary.lifetimeTilesFilled);
    html += _statLine('cg_stat_mistakes', summary.lifetimeMistakesMade);
    html += _statLine('cg_stat_flawless', summary.flawlessLevels);
    html += _statLine('cg_stat_questions', summary.questionsCorrect);
    html += _statLine('cg_stat_items_used', summary.itemsUsedTotal);

    html += _statGroup('cg_group_combat');
    html += _statLine('cg_stat_monsters', summary.monstersSlain);
    html += _statLine('cg_stat_bosses', summary.bossesSlain);
    html += _statLine('cg_stat_abilities', summary.classAbilitiesUsed);
    html += _statLine('cg_stat_upgrades', upgradesAchieved);
    html += _statLine('cg_stat_passive_pts', summary.passivePointsObtained);

    html += _statGroup('cg_group_journey');
    html += _statLine('cg_stat_story', `${story.watched} / ${story.total}`);
    html += _statLine('cg_stat_quest_items', `${summary.questItemsCount} / ${QUEST_ITEMS.length}`);
    html += _statLine('cg_stat_worlds', `${summary.ascensionTrialsDoneCount} / ${trialTotal}`);
    html += _statLine('cg_stat_trials', `${summary.trialsDoneCount || 0} / ${trialTotal}`);
    html += _statLine('cg_stat_inference', summary.questsClaimedCount);
    html += _statLine('cg_stat_max_map_tier', _highestCompletedMapTier(summary.egAtlasCompleted));
    html += _statLine('cg_stat_maps', summary.atlasMapsCompleted);

    html += `<div class="sx-slot-tip-group">${t('cg_completion')}</div>`;
    html += `<div class="sx-slot-tip-line">${t('cg_comp_levels')} <b>${_pctOf(summary.levelsDone, totalLevels)}</b></div>`;
    html += `<div class="sx-slot-tip-line">${t('cg_comp_bonus')} <b>${_pctOf(summary.bonusDone.length, totalLevels)}</b></div>`;
    html += `<div class="sx-slot-tip-line">${t('cg_comp_hard_mods')} <b>${_pctOf(_countHardAllModsClears(summary.levelHS), totalLevels)}</b></div>`;
    return `<div class="sx-slot-tip">${html}</div>`;
}
