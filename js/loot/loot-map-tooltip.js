import { t } from '../translation/translations.js';
import { EG_ART } from '../endgame/endgame-art.js';
import { _egAtlasResolveNodeForMap, egAtlasIsCompleted, egAtlasNodeById, egAtlasNodeName, egAtlasTierDifficulty } from '../endgame/endgame-atlas.js';
import { EG_MAP_BASE_BOSS_CHANCE } from '../endgame/endgame-map-launch.js';
import { _egBuildMergedModLines } from '../endgame/endgame-player-stats.js';
import { _egMapModAffects } from './loot-map-mod-tables.js';
import { _egGetMapGoldRewardRange, _egGetMapRewardBonuses } from './loot-map-mod-rewards.js';
import { _egGetCompletionRewardDef } from './loot-map-completion-reward.js';
import { _egResolveMapBoss } from './loot-map-implicit-parts.js';
import { _egRollMapImplicits } from './loot-map-implicits.js';

//----------------------------------------------------------------------
//-----------------------------MAP TOOLTIP------------------------------
//----------------------------------------------------------------------

// The map tooltip body and the stylesheet it needs. Grouped because the
// CSS is inert without the markup and was previously a separate section
// of the same file for no reason.

//-------------------MAP TOOLTIP------------------------------------------
//------------------------------------------------------------------------

// Builds the tooltip body for map items. Mods are grouped by their
// `affects` category with distinct colors:
//   monster → orange, player → red, puzzle → blue.
export function _egBuildMapTooltipBodyHTML(item) {
    const RARITY_COLOR_MAP = {
        common: { border: '#7a7a7a', color: '#b0b0b0' },
        uncommon: { border: '#2ecc71', color: '#2ecc71' },
        rare: { border: '#3498db', color: '#3498db' },
        epic: { border: '#9b59b6', color: '#c39bd3' },
    };
    const rarity = item.rarity || 'common';
    const rc = RARITY_COLOR_MAP[rarity] || RARITY_COLOR_MAP.common;

    const groups = { monster: [], player: [], puzzle: [] };
    const groupMods = { monster: [], player: [], puzzle: [] };
    (item.mods || []).forEach(mod => {
        const affects = _egMapModAffects(mod.familyId);
        if (!groupMods[affects]) groupMods[affects] = [];
        groupMods[affects].push(mod);
    });
    Object.keys(groupMods).forEach(affects => {
        // Mods sharing the same stat are merged into one combined line.
        groups[affects] = _egBuildMergedModLines(groupMods[affects]);
    });

    const hideTier = !!item.isUnique;
    const sectionHTML = (titleKey, entries, color) => {
        if (entries.length === 0) return '';
        return `
    <div class="eg-tt-section">
        <div class="eg-tt-group-title" style="color:${color};">${t(titleKey)}</div>
        ${entries.map(e => {
            const tierBadge = hideTier ? '' : `<span class="eg-tt-mod-tier">${e.tierLabel || ''}</span>`;
            return `<div class="eg-tt-mod" style="color:${color};"><span class="eg-tt-mod-label">${e.label}</span>${tierBadge}</div>`;
        }).join('')}
    </div>`;
    };

    const noModsHTML = (item.mods || []).length === 0
        ? `<div class="eg-tt-section"><div class="eg-tt-desc">${t('eg_map_unmodified')}</div></div>`
        : '';

    // ── Implicit values ──────────────────────────────────────────────
    const imp = item.implicits || _egRollMapImplicits(item);
    const fmtDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const implicitLines = [
        t('eg_map_implicit_puzzles').replace('{n}', imp.puzzles),
        t('eg_map_implicit_questions').replace('{n}', imp.questions),
        t('eg_map_implicit_mistakes').replace('{n}', imp.mistakes),
        t('eg_map_implicit_duration').replace('{time}', fmtDuration(imp.durationSeconds)),
        t('eg_map_monster_level_tt').replace('{n}', item.monsterLevel ?? item.itemLevel ?? 1),
    ];

    if (imp.sizeMix) {
        implicitLines.push(t('eg_map_implicit_sizemix')
            .replace('{s}', imp.sizeMix.small || 0)
            .replace('{m}', imp.sizeMix.medium || 0)
            .replace('{l}', imp.sizeMix.large || 0)
            .replace('{x}', imp.sizeMix.massive || 0));
    }

    // ── Boss encounter line (baked into implicits) ───────────────────────
    const bossHas = imp.hasBoss;
    const bossCount = imp.maxBosses || 0;
    if (bossHas && bossCount > 0) {
        // Name the region's specific boss (fixed per atlas region, see
        // EG_ATLAS_REGION_BOSSES) instead of a generic encounter label.
        // Multi-boss maps have no single identity, so they keep the count.
        const boss = bossCount > 1 ? null : _egResolveMapBoss(item);
        const bossIcon = boss
            ? ((typeof EG_ART !== 'undefined' && EG_ART.html) ? EG_ART.html('monster', boss.id, boss.emoji) : boss.emoji)
            : null;
        const bossLabel = boss
            ? `${bossIcon} ${boss.name}`
            : (bossCount > 1
                ? t('eg_map_boss_count').replace('{n}', bossCount)
                : t('eg_map_has_boss'));
        implicitLines.push(`<span style="color:#e74c3c;font-weight:700;">${bossLabel}</span>`);
    } else if (bossHas === false) {
        implicitLines.push(`<span style="color:#888;">${t('eg_map_no_boss')}</span>`);
    } else {
        // Legacy map without boss implicits: fall back to tier heuristic
        const legacyHasBoss = (item.mapTier || 1) >= 2;
        // Without baked status we show the probabilistic hint rather than a definitive Yes.
        if (!legacyHasBoss) {
            implicitLines.push(`<span style="color:#888;">${t('eg_map_no_boss')}</span>`);
        } else {
            // For legacy maps tier 2+ we cannot know definitively; show that a boss *may* appear.
            // Prefer the definitive label if the global base chance is available.
            implicitLines.push(`<span style="color:#e74c3c;font-weight:700;">${t('eg_map_has_boss')}</span><span style="color:#888; font-size:0.85em;"> (${(typeof EG_MAP_BASE_BOSS_CHANCE !== 'undefined' ? EG_MAP_BASE_BOSS_CHANCE : 50)}%)</span>`);
        }
    }

    // ── Reward bonuses (from mods) + completion reward ───────────────
    const rw = _egGetMapRewardBonuses(item);
    const rewardLines = [];
    if (imp.completionReward) {
        const crDef = _egGetCompletionRewardDef(imp.completionReward.id);
        if (crDef) {
            rewardLines.push(t('eg_map_completion_reward')
                .replace('{icon}', crDef.icon || '💰')
                .replace('{n}', imp.completionReward.count)
                .replace('{name}', crDef.name));
        }
    }
    // Gold completion reward (innate, not from mods)
    const goldRange = _egGetMapGoldRewardRange(item);
    if (goldRange.avg > 0) {
        rewardLines.push(t('eg_map_gold_reward_tooltip')
            .replace('{min}', goldRange.min.toLocaleString())
            .replace('{max}', goldRange.max.toLocaleString())
            .replace('{avg}', goldRange.avg.toLocaleString()));
    }
    if (rw.xp > 0) rewardLines.push(t('eg_map_reward_xp').replace('{n}', rw.xp));
    if (rw.quantity > 0) rewardLines.push(t('eg_map_reward_quantity').replace('{n}', rw.quantity));
    if (rw.quantity > 0) {
        const mapDropLabel = (typeof t === 'function' && t('eg_map_reward_map_drops') !== 'eg_map_reward_map_drops')
            ? t('eg_map_reward_map_drops').replace('{n}', rw.quantity)
            : `+${rw.quantity}% increased Map Drops`;
        rewardLines.push(mapDropLabel);
    }
    if (rw.rarity > 0) rewardLines.push(t('eg_map_reward_rarity').replace('{n}', rw.rarity));
    const rewardsHTML = rewardLines.length === 0 ? '' : `
    <div class="eg-tt-section">
        <div class="eg-tt-group-title" style="color:#f5d98a;">${t('eg_map_reward_title')}</div>
        ${rewardLines.map(l => `<div class="eg-tt-mod" style="color:#f5d98a;">${l}</div>`).join('')}
    </div>`;

    // ── Atlas completion status ────────────────────────────────────────
    let atlasStatusHTML = '';
    try {
        let atlasNode = null;
        if (item.atlasNodeId && typeof egAtlasNodeById === 'function') {
            atlasNode = egAtlasNodeById(item.atlasNodeId);
        }
        if (!atlasNode && typeof _egAtlasResolveNodeForMap === 'function') {
            atlasNode = _egAtlasResolveNodeForMap(item);
        }
        if (atlasNode && typeof egAtlasIsCompleted === 'function') {
            const completed = egAtlasIsCompleted(atlasNode.id);
            const color = completed ? '#f5d98a' : '#aaa';
            const label = completed ? t('eg_map_atlas_completed') : t('eg_map_atlas_not_completed');
            const regionName = (typeof egAtlasNodeName === 'function') ? egAtlasNodeName(atlasNode) : atlasNode.name;
            // Required difficulty (region tier band → easy / normal / hard).
            // When the currently selected game difficulty doesn't match and
            // the region is not completed yet, warn in red - such a run
            // would not count as an atlas clear.
            const reqDiff = atlasNode.difficulty
                || (typeof egAtlasTierDifficulty === 'function' ? egAtlasTierDifficulty(atlasNode.tier) : 'normal');
            const diffColors = { easy: '#2ecc71', normal: '#3498db', hard: '#c39bd3' };
            const diffLineHTML = `<div class="eg-tt-desc" style="color:${diffColors[reqDiff] || '#f5d98a'}; font-size:0.85em;">⚖️ ${t('eg_map_atlas_requires_diff').replace('{d}', t('diff_' + reqDiff))}</div>`;
            let mismatchHTML = '';
            if (!completed) {
                const runDiff = (typeof curDiff !== 'undefined' && globalThis.curDiff) ? globalThis.curDiff : 'normal';
                if (runDiff !== reqDiff) {
                    mismatchHTML = `<div class="eg-tt-desc" style="color:#e74c3c; font-size:0.85em;">${t('eg_map_atlas_diff_mismatch').replace('{d}', t('diff_' + runDiff))}</div>`;
                }
            }
            atlasStatusHTML = `
    <div class="eg-tt-section" style="border-left:2px solid ${color}; padding-left:8px;">
        <div class="eg-tt-mod" style="color:${color}; font-weight:700;">${label}</div>
        <div class="eg-tt-desc" style="color:#ccc; font-size:0.85em;">${regionName} · ${t('eg_map_tier_tt').replace('{n}', atlasNode.tier)}</div>
        ${diffLineHTML}
        ${mismatchHTML}
    </div>`;
        }
    } catch (e) { /* ignore tooltip atlas errors */ }

    return `
<div class="eg-tt-frame eg-map-frame" style="--tt-border:${rc.border};">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">${EG_ART.html('item', EG_ART.artIdForItem(item), item.icon || '🗺️')}</div>
        <div class="eg-tt-name" style="color:${rc.color};">${item.name || '???'}</div>
        ${(item.baseName && item.baseName !== item.name)
            ? `<div class="eg-tt-basename" style="opacity:.7;">${item.baseName}</div>` : ''}
        <div class="eg-tt-rarity-line" style="color:${rc.border};">${t('eg_maps_label')} · ${t('eg_map_tier_tt').replace('{n}', item.mapTier ?? 1)}</div>
    </div>
    ${atlasStatusHTML}
    <div class="eg-tt-section">
        <div class="eg-tt-group-title" style="color:#f5d98a;">${t('eg_map_implicits_title')}</div>
        ${implicitLines.map(l => `<div class="eg-tt-implicit">${l}</div>`).join('')}
    </div>
    ${rewardsHTML}
    ${sectionHTML('eg_map_mods_monster', groups.monster, '#e67e22')}
    ${sectionHTML('eg_map_mods_player', groups.player, '#e74c3c')}
    ${sectionHTML('eg_map_mods_puzzle', groups.puzzle, '#5b9cf6')}
    ${noModsHTML}
</div>`;
}


//------------------------------------------------------------------------
//-------------------CSS INJECTION-----------------------------------------
//------------------------------------------------------------------------

(function _egInjectMapStyles() {
    if (document.getElementById('eg-map-item-styles')) return;
    const style = document.createElement('style');
    style.id = 'eg-map-item-styles';
    style.textContent = `
        /* Gate screen: spacing for the runes & orbs row between device and map stash */
        .eg-gate-currency-section { margin-top: 12px; }
        .eg-gate-currency-section .eg-currency-strip { border: 1px solid var(--border); border-radius: 6px; }
        /* Map drops on the puzzle grid get a golden shimmer to stand out */
        .eg-mapdrop-overlay {
            text-shadow: 0 0 6px rgba(245, 217, 138, 0.9), 0 0 12px rgba(245, 217, 138, 0.5);
        }
        /* Group titles inside the map tooltip */
        .eg-tt-group-title { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 2px; }
        .eg-tt-mod { font-size: 0.85rem; padding: 1px 0; }
        /* Map tier badge on item chips */
        .eg-item-ilvl.eg-map-tier-badge { color: #f5d98a; }
    `;
    document.head.appendChild(style);
})();

