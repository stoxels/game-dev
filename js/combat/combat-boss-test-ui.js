//------------------------------------------------------------------------
//-------------------BOSS TEST PRESENTATION--------------------------------
//------------------------------------------------------------------------
// Tooltip construction, card rendering, screen markup, and injected styles.

import { t } from '../translation/translations.js';
import { EG_ART } from '../endgame/endgame-art.js';
import { _egRollMapTier } from '../loot/loot-map-config.js';
import {
    EG_BOSS_TEST_DEFAULT_LEVEL,
    _egbtBossTier,
    _egbtCalcTestHPMultiplier,
    _egbtScaledPreview,
    _egbtTierMonsterLevel,
} from './combat-boss-test-core.js';
import { _egbtGetSpecialPhaseInfo, _egbtTr } from './combat-boss-test-phases.js';

//------------------------------------------------------------------------
//-------------------BOSS TOOLTIP & TEST HP HELPERS-----------------------
//------------------------------------------------------------------------

// Builds a tooltip HTML string for a boss, listing its phases, mechanics,
// and estimated damage at the given level. Uses showGameTooltip from tooltips-hud.js.
export function _egbtBuildBossTooltipHTML(def, level) {
    const preview = _egbtScaledPreview(def, level);
    const mechDef = (typeof EG_BOSS_MECHANICS !== 'undefined') ? globalThis.EG_BOSS_MECHANICS[def.id] : null;
    if (!mechDef) return null;

    const bossIcon = (typeof EG_ART !== 'undefined' && EG_ART.html)
        ? EG_ART.html('monster', def.id, def.emoji || '💀')
        : (def.emoji || '💀');
    let html = `<div style="min-width:280px;">
        <div style="font-size:13px;font-weight:700;color:var(--accent,#c8a84b);margin-bottom:6px;">
            ${bossIcon} ${def.name || def.id}
        </div>
        <div style="font-size:11px;opacity:0.8;margin-bottom:4px;">
            Lv ${level} · ❤️ ${preview.hp.toLocaleString()} · 🗡️ ${preview.dmg} base
        </div>`;

    // Tier line - the boss's atlas tier drives every tier-scaled mechanic
    // (Corrupt Cells caps/rates, Prior Bomb counts/fuse, Probability Shift
    // target counts). Shown for every boss so playtesting numbers are
    // transparent. Unassigned bosses fall back to the tier of their level.
    let tier = (typeof _egbtBossTier === 'function') ? _egbtBossTier(def.id) : 0;
    if (tier <= 0 && typeof _egRollMapTier === 'function') {
        try { tier = _egRollMapTier(level); } catch (e) { tier = 0; }
    }
    if (tier > 0) {
        html += `<div style="font-size:11px;margin-bottom:8px;">
            <span style="color:#f5d98a;font-weight:700;">${t('eg_boss_test_tier').replace('{n}', tier)}</span>
            <span style="opacity:0.6;"> · tier-scaled mechanics use these values</span>
        </div>`;
    }

    // Corruption caps at this tier (only for bosses using corrupt_cells).
    // Mirrors the live fight values: cap = P2 spread ceiling / P3 relentless ceiling.
    if (mechDef.mechanics && mechDef.mechanics.some(m => (m.handler || '').includes('CorruptCells'))) {
        const norm = (typeof _egBossTierNorm === 'function')
            ? (() => { try { return globalThis._egBossTierNorm({ level }); } catch (e) { return 0.5; } })()
            : 0.5;
        const cap2 = (typeof _egCorruptSpreadCap === 'function')
            ? globalThis._egCorruptSpreadCap({ p: 2, norm }) : null;
        const cap3 = (typeof _egCorruptSpreadCap === 'function')
            ? globalThis._egCorruptSpreadCap({ p: 3, norm }) : null;
        if (cap2 != null && cap3 != null) {
            html += `<div style="font-size:11px;margin-bottom:8px;">
                <span style="color:#7fb8ff;">🧫 Corruption cap:</span>
                <span style="color:#f87171;"> P2 ${cap2}</span>
                <span style="opacity:0.6;"> /</span>
                <span style="color:#f87171;">P3 ${cap3}</span>
                <span style="opacity:0.6;"> cells</span>
            </div>`;
        }
    }

    // Phases
    if (mechDef.phases && mechDef.phases.length > 0) {
        html += `<div style="margin-bottom:8px;">`;
        mechDef.phases.forEach((ph, i) => {
            const pct = Math.round(ph.threshold * 100);
            const dmgMult = ph.damageMultiplier || 1.0;
            const phaseDmg = Math.round(preview.dmg * dmgMult);
            const label = i === 0 ? t('eg_boss_test_phase_base') : t('eg_boss_test_phase').replace('{n}', i + 1);
            html += `<div style="font-size:11px;margin:3px 0;">
                <span style="color:var(--accent2,#ccc);">${label}:</span>
                <span style="color:#f87171;"> ≤${pct}% HP</span>
                <span style="color:#7fd67f;"> (×${dmgMult.toFixed(2)} dmg → ~${phaseDmg})</span>
            </div>`;
        });
        html += `</div>`;
    }

    // Special phase mechanics (from onPhaseEnter hooks, etc.)
    const specialPhases = _egbtGetSpecialPhaseInfo(def.id);
    if (specialPhases && specialPhases.length > 0) {
        html += `<div style="margin-bottom:8px;">`;
        specialPhases.forEach(sp => {
            html += `<div style="font-size:11px;margin:3px 0;">
                <span style="color:var(--accent2,#ccc);">${_egbtTr('eg_boss_test_special_phase', 'Special')}:</span>
                <span style="color:#f5d98a;"> ${sp.name}</span>
                <span style="opacity:0.6;"> - ${sp.desc}</span>
            </div>`;
        });
        html += `</div>`;
    }

    // Mechanics
    if (mechDef.mechanics && mechDef.mechanics.length > 0) {
        html += `<div style="border-top:1px solid rgba(200,168,75,0.3);padding-top:8px;">`;
        html += `<div style="font-size:11px;font-weight:700;color:var(--accent,#c8a84b);margin-bottom:6px;">${t('eg_boss_test_mechanics')}</div>`;
        mechDef.mechanics.forEach(m => {
            const interval = m.intervalBase ? `${(m.intervalBase / 1000).toFixed(1)}s` : '-';
            const variance = m.intervalVariance ? `±${(m.intervalVariance / 1000).toFixed(1)}s` : '';
            const phase2 = m.phase2Only ? ` <span style="color:#f5d98a;font-size:10px;">[P2+]</span>` : '';
            const handler = m.handler || '-';
            html += `<div style="font-size:10px;margin:2px 0;font-family:inherit;">
                <span style="color:#7fb8ff;">${m.name || '?'}${phase2}</span>
                <span style="opacity:0.6;"> - every ${interval} ${variance}</span>
                <span style="opacity:0.4;"> → ${handler}</span>
            </div>`;
        });
        html += `</div>`;
    }

    // Soft enrage note
    if (typeof EG_BOSS_SOFT_ENRAGE_DELAY_MS !== 'undefined') {
        const delayMin = globalThis.EG_BOSS_SOFT_ENRAGE_DELAY_MS / 60000;
        const stepPct = Math.round(globalThis.EG_BOSS_SOFT_ENRAGE_DMG_STEP * 100);
        html += `<div style="margin-top:8px;font-size:10px;opacity:0.6;">
            ${t('eg_boss_test_soft_enrage').replace('{delay}', delayMin).replace('{step}', stepPct)}
        </div>`;
    }

    html += `</div>`;
    return html;
}

export function _egbtShowTooltip(cardEl, e) {
    const bossId = cardEl.dataset.bossId;
    const level = Number(cardEl.dataset.bossLevel);
    if (!bossId || !level) return;
    const def = (typeof EG_BOSS_DEFS !== 'undefined') ? globalThis.EG_BOSS_DEFS[bossId] : null;
    if (!def) return;
    const html = _egbtBuildBossTooltipHTML(def, level);
    if (html) globalThis.showGameTooltip(html, e);
}

// Toggles the 500k HP test mode checkbox. Rebinds the card and Fight
// button handlers so the launch carries the boost (or drops it again on
// uncheck). Handlers are real functions, not string attributes, so the
// rebind works identically in every environment.
export function _egbtToggleTestHP(checkbox, bossId, level, hpMult) {
    const card = checkbox.closest('.egbt-boss-card');
    if (!card) return;
    const newHpMult = checkbox.checked ? hpMult : 1;
    card.onclick = (ev) => {
        if (ev.target.closest('button')) return;   // Fight button handles itself
        globalThis._egLaunchBossTest(bossId, level, newHpMult);
    };
    const btn = card.querySelector('.egbt-fight-btn');
    if (btn) {
        btn.onclick = (ev) => {
            ev.stopPropagation();
            globalThis._egLaunchBossTest(bossId, level, newHpMult);
        };
    }
    const statsEl = card.querySelector('.egbt-boss-stats');
    if (statsEl) {
        const def = (typeof EG_BOSS_DEFS !== 'undefined') ? globalThis.EG_BOSS_DEFS[bossId] : null;
        if (def) {
            const p = _egbtScaledPreview(def, level);
            const hp = checkbox.checked ? Math.round(p.hp * hpMult) : p.hp;
            // Test boost only scales HP - damage stays at its normal value.
            statsEl.textContent = `Lv ${level} · ❤️ ${hp} · 🗡️ ${p.dmg}`;
        }
    }
}

//------------------------------------------------------------------------
//-------------------HTML BUILDERS------------------------------------------
//------------------------------------------------------------------------

export function _egbtBossIconHTML(def) {
    // Real boss art when it exists (see images/endgame/monsters/boss_*.jpeg),
    // otherwise the emoji fallback - same helper the arena cards use.
    if (typeof EG_ART !== 'undefined' && EG_ART.html) return EG_ART.html('monster', def.id, def.emoji || '💀');
    return def.emoji || '💀';
}

export function _egbtBuildBossCardHTML(def, level) {
    const preview = _egbtScaledPreview(def, level);
    const hpMult = _egbtCalcTestHPMultiplier(def, level);
    return `
<div class="egbt-boss-card" data-boss-id="${def.id}" data-boss-level="${level}"
     onmouseenter="_egbtShowTooltip(this, event)"
     onmousemove="moveGameTooltip(event)"
     onmouseleave="hideGameTooltip()"
     onclick="_egLaunchBossTest('${def.id}', ${level})">
    <div class="egbt-boss-emoji">${_egbtBossIconHTML(def)}</div>
    <div class="egbt-boss-name">${def.name || def.id}</div>
    <div class="egbt-boss-stats">Lv ${level} · ❤️ ${preview.hp} · 🗡️ ${preview.dmg}</div>
    <div class="egbt-boss-id">${def.id}</div>
    <label class="egbt-test-hp-label"
           onmousedown="event.stopPropagation()"
           onclick="event.stopPropagation();">
        <input type="checkbox" class="egbt-test-hp-checkbox"
               onmousedown="event.stopPropagation()"
               onclick="event.stopPropagation();"
               onchange="_egbtToggleTestHP(this, '${def.id}', ${level}, ${hpMult})">
        <span>${t('eg_boss_test_500k_hp')}</span>
    </label>
    <button class="title-btn egbt-fight-btn"
            onclick="event.stopPropagation(); _egLaunchBossTest('${def.id}', ${level})">
        ${t('eg_boss_test_fight')}
    </button>
</div>`;
}

// Groups boss defs into tier sections (1–16, then unassigned as tier 0),
// honouring the search query. Empty tiers are omitted.
export function _egbtBuildSections() {
    const all = (typeof EG_BOSS_DEFS !== 'undefined') ? Object.values(globalThis.EG_BOSS_DEFS) : [];
    const query = String(window._egBossTestSearch || '').trim().toLowerCase();
    const matches = def => !query
        || String(def.name || '').toLowerCase().includes(query)
        || String(def.id || '').toLowerCase().includes(query);
    const byName = (a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id));

    // Resolve each boss's tier once - the roster scan is O(regions).
    const tierOf = {};
    all.forEach(def => { tierOf[def.id] = _egbtBossTier(def.id); });

    const sections = [];
    for (let tier = 1; tier <= 16; tier++) {
        const defs = all.filter(def => tierOf[def.id] === tier && matches(def)).sort(byName);
        if (defs.length > 0) sections.push({ tier, defs });
    }
    const unassigned = all.filter(def => tierOf[def.id] === 0 && matches(def)).sort(byName);
    if (unassigned.length > 0) sections.push({ tier: 0, defs: unassigned });
    return sections;
}

export function _egbtBuildSectionHTML(section) {
    const level = section.tier > 0 ? _egbtTierMonsterLevel(section.tier) : EG_BOSS_TEST_DEFAULT_LEVEL;
    const title = section.tier > 0
        ? `${t('eg_boss_test_tier').replace('{n}', section.tier)} · ${t('eg_boss_test_tier_level').replace('{lv}', level)}`
        : t('eg_boss_test_unassigned');
    return `
<div class="egbt-tier-section">
    <div class="egbt-tier-header">${title}</div>
    <div class="egbt-boss-grid">${section.defs.map(def => _egbtBuildBossCardHTML(def, level)).join('')}</div>
</div>`;
}

export function _egbtRenderGrid() {
    const container = document.getElementById('egbt-boss-grid');
    if (!container) return;
    const sections = _egbtBuildSections();
    const total = sections.reduce((sum, s) => sum + s.defs.length, 0);
    container.innerHTML = total > 0
        ? sections.map(_egbtBuildSectionHTML).join('')
        : `<div class="egbt-empty">${t('eg_boss_test_no_bosses')}</div>`;
    const count = document.getElementById('egbt-count');
    if (count) count.textContent = t('eg_boss_test_count').replace('{n}', total);
}

export function _egbtBuildFullScreenHTML() {
    return `
<div class="egbt-hub-layout">
    <div class="egbt-topbar">
        <button class="back-btn" onclick="showEndgameNexus()">${t('btn_back')}</button>
        <span class="egbt-topbar-title">${t('eg_boss_test_title')}</span>
        <span class="egbt-count" id="egbt-count"></span>
    </div>
    <div class="egbt-controls">
        <input class="egbt-search" id="egbt-search" type="text"
            placeholder="${t('eg_boss_test_search_placeholder')}"
            oninput="window._egBossTestSearch=this.value;_egbtRenderGrid()">
        <label class="egbt-godmode-label" data-tip-t="eg_boss_test_godmode_hint">
            <input type="checkbox" class="egbt-godmode-checkbox"
                onchange="_egbtToggleGodMode(this)">
            <span>${t('eg_boss_test_godmode')}</span>
        </label>
        <span class="egbt-godmode-badge" id="egbt-godmode-badge"></span>
    </div>
    <div class="egbt-hint">${t('eg_boss_test_hint')}</div>
    <div class="egbt-boss-sections" id="egbt-boss-grid"></div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------STYLES (INJECTED ONCE)---------------------------------
//------------------------------------------------------------------------
// Injected via JS, same pattern as _egtEnsureStyles() in
// endgame-testing-screen.js - avoids needing to touch the main CSS files.

export function _egbtEnsureStyles() {
    if (document.getElementById('egbt-boss-test-style')) return;

    const style = document.createElement('style');
    style.id = 'egbt-boss-test-style';
    style.textContent = `
        .egbt-hub-layout {
            width: 100%; height: 100%; display: flex; flex-direction: column;
            padding: 16px; box-sizing: border-box; font-family: var(--PX, monospace);
            color: var(--accent2, #e8daef); overflow-y: auto;
        }
        .egbt-topbar {
            display: flex; align-items: center; gap: 12px;
            margin-bottom: 12px; flex-wrap: wrap;
        }
        .egbt-topbar-title { font-size: 16px; letter-spacing: 2px; color: var(--accent, #c8a84b); }
        .egbt-count { font-size: 11px; opacity: 0.7; }
        .egbt-controls {
            display: flex; align-items: center; gap: 12px;
            margin-bottom: 8px; flex-wrap: wrap;
        }
        .egbt-search {
            font-family: inherit; font-size: 12px; padding: 7px 10px;
            background: rgba(0,0,0,0.4); color: var(--accent2, #e8daef);
            border: 1px solid var(--border2, #444); border-radius: 4px;
            min-width: 220px;
        }
        .egbt-search:focus { border-color: var(--accent, #c8a84b); outline: none; }
        .egbt-hint { font-size: 10px; opacity: 0.6; margin-bottom: 12px; line-height: 1.5; }
        .egbt-boss-sections { display: flex; flex-direction: column; gap: 18px; }
        .egbt-tier-header {
            font-size: 13px; letter-spacing: 2px; color: var(--accent, #c8a84b);
            border-bottom: 1px solid var(--accent, #c8a84b);
            padding-bottom: 5px; margin-bottom: 10px;
        }
        .egbt-boss-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
            gap: 12px;
        }
        .egbt-boss-card {
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 6px; padding: 12px; cursor: pointer;
            display: flex; flex-direction: column; align-items: center; gap: 5px;
            text-align: center;
            transition: transform 0.15s, box-shadow 0.15s;
        }
        .egbt-boss-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 14px rgba(200, 168, 75, 0.35);
        }
        .egbt-boss-emoji { font-size: 30px; }
        .egbt-boss-emoji img.eg-art-img {
            width: 64px; height: 64px;
            object-fit: cover; border-radius: 8px;
        }
        .egbt-boss-name { font-size: 12px; color: var(--accent, #c8a84b); }
        .egbt-boss-stats { font-size: 10px; opacity: 0.85; }
        .egbt-boss-id { font-size: 9px; opacity: 0.45; word-break: break-all; }
        .egbt-fight-btn { margin-top: 6px; font-size: 10px; padding: 6px 12px; }
        .egbt-test-hp-label {
            display: flex; align-items: center; gap: 4px;
            margin-top: 6px; font-size: 9px; cursor: pointer;
            color: var(--accent2, #ccc); opacity: 0.8;
        }
        .egbt-test-hp-label input[type="checkbox"] {
            width: 12px; height: 12px; accent-color: var(--accent, #c8a84b);
        }
        .egbt-godmode-label {
            display: flex; align-items: center; gap: 4px;
            font-size: 10px; cursor: pointer; color: var(--accent2, #ccc); opacity: 0.85;
        }
        .egbt-godmode-label input[type="checkbox"] {
            width: 12px; height: 12px; accent-color: #4ade80;
        }
        .egbt-godmode-badge {
            font-size: 9px; letter-spacing: 1px; padding: 2px 8px;
            border-radius: 8px; border: 1px solid var(--border2, #444);
            color: var(--accent2, #888); opacity: 0.6;
        }
        .egbt-godmode-badge.egbt-godmode-on {
            color: #4ade80; border-color: rgba(74, 222, 128, 0.6); opacity: 1;
            box-shadow: 0 0 8px rgba(74, 222, 128, 0.35);
        }
        #egbt-godmode-chip {
            position: fixed; top: 10px; right: 12px; z-index: 20000;
            pointer-events: none; font-size: 11px; letter-spacing: 1px;
            padding: 6px 12px; border-radius: 6px;
            background: rgba(6, 40, 22, 0.88); border: 1px solid #4ade80; color: #4ade80;
            box-shadow: 0 0 14px rgba(74, 222, 128, 0.45);
            animation: egbt-godmode-chip-pulse 1.4s ease-in-out infinite alternate;
        }
        @keyframes egbt-godmode-chip-pulse {
            from { box-shadow: 0 0 8px rgba(74, 222, 128, 0.35); }
            to { box-shadow: 0 0 18px rgba(74, 222, 128, 0.7); }
        }
        .egbt-empty { font-size: 12px; opacity: 0.6; grid-column: 1 / -1; text-align: center; padding: 24px; }
        .egbt-topbar .title-btn, .egbt-fight-btn {
            font-family: var(--PX, monospace);
            font-size: 10px;
            letter-spacing: 1px;
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            border: 1px solid var(--border2, #444);
            color: var(--accent2, #ccc);
            padding: 8px 16px;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.12s;
        }
        .egbt-topbar .title-btn:hover, .egbt-fight-btn:hover {
            border-color: var(--accent, #c8a84b);
            color: var(--accent, #c8a84b);
            background: linear-gradient(180deg, rgba(200,168,75,0.12), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            box-shadow: 0 0 10px rgba(200, 168, 75, 0.25);
        }
        .egbt-topbar .title-btn:active, .egbt-fight-btn:active {
            transform: translateY(1px);
            box-shadow: none;
        }
     `;
    document.head.appendChild(style);
}
