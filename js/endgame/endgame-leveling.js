//------------------------------------------------------------------------
//-------------------ENDGAME CHARACTER LEVELING---------------------------
//------------------------------------------------------------------------
// Experience & attribute-point system for the endgame:
//   - Monsters grant XP on kill, scaled by their level and by a
//     Path-of-Exile-style multiplier: full XP only while the monster is
//     within a safe level range of the character; beyond that range
//     (too high OR too low) XP falls off exponentially.
//   - Each level grants +1 attribute point spendable on Strength /
//     Agility / Intelligence via the attribute window (✦ button in the
//     Nexus topbar or the level chip on the character panel).
//   - Attribute points can be refunded. A refund is verified against the
//     live equipment loadout first — it is blocked while any equipped
//     item would violate its stat requirements afterwards.
//
// Wiring notes:
//   - _egSyncBaseAttributes() keeps EG_PLAYER_BASE_ATTRIBUTES
//     (endgame-requirements.js) in sync with STATE.playerLevel and the
//     allocated attribute points. That single sync automatically enables
//     item LEVEL requirements everywhere (equip gate, tooltips) and feeds
//     allocated points into _egComputePlayerStats() side-effects
//     (Str -> life/armour, Agi -> accuracy/evasion, Int -> mana/spell dmg).
//   - Kill integration lives in _egKillMonster() (endgame-encounter.js),
//     which calls _egGrantMonsterXP(monsterLevel, isBoss).
//
// Dependencies (must be loaded before this file):
//   js/state.js             — STATE, save()
//   endgame-player-stats.js  — _egGetAllEquippedItems()
//   endgame-requirements.js — EG_PLAYER_BASE_ATTRIBUTES,
//                             _egSumAttributeBonuses(),
//                             _egFindUnmetRequirements(),
//                             _egGetUnmetRequirementsText()
//
// Entry points:
//   _egGrantMonsterXP(mLevel, isBoss)      → called on every monster kill
//   _egGetPlayerLevel() / _egGetPlayerXP() → current progression
//   _egGetXpForNextLevel(level)            → XP needed to leave `level`
//   _egCalcXpMultiplier(playerLvl, mLvl)   → PoE-style range multiplier
//   _egAllocateAttribute('str'|'agi'|'int')→ spend one point
//   _egRefundAttribute('str'|'agi'|'int')  → verify & refund one point
//   _egCanRefundAttribute(attr)            → refund legality check
//   _egOpenAttributeWindow()               → open the attribute window
//   _egRenderLevelHUD()                    → refresh badge + inline chip
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONSTANTS--------------------------------------------
//------------------------------------------------------------------------

const EG_LEVELING_CONFIG = {
    startLevel: 1,
    maxLevel: 100,

    // XP curve: xpToLeave(level) = xpBase * level^xpExp + xpLinear * level.
    // Tuned so early levels take a handful of kills and the curve steepens
    // smoothly towards the level cap.
    xpBase: 90,
    xpExp: 1.75,
    xpLinear: 60,

    // Base XP per kill: xpPerKillBase + xpPerKillGrowth * mLevel^xpPerKillExp.
    xpPerKillBase: 18,
    xpPerKillGrowth: 12,
    xpPerKillExp: 1.55,
    bossXpMultiplier: 4,

    // PoE-style safe range: monsters up to
    //   (safeRangeBelowBase + floor(playerLevel / safeRangeBelowLevelsPer))
    // levels BELOW the character give full XP; monsters up to
    // safeRangeAbove levels above do too. Outside the band the multiplier
    // decays as ratio^penaltyExponent (never below minMultiplier).
    safeRangeBelowBase: 3,
    safeRangeBelowLevelsPer: 16,
    safeRangeAbove: 3,
    penaltyExponent: 6,
    minMultiplier: 0.01,
};

// Pristine copy of the base attribute pool from endgame-requirements.js,
// captured before this file mutates the object with allocated points.
const _EG_ATTR_ORIGINAL_BASE = {
    str: EG_PLAYER_BASE_ATTRIBUTES.str,
    agi: EG_PLAYER_BASE_ATTRIBUTES.agi,
    int: EG_PLAYER_BASE_ATTRIBUTES.int,
};

const EG_LEVELING_ATTRS = [
    { key: 'str', icon: '💪', nameKey: 'eg_stat_strength' },
    { key: 'agi', icon: '🏃', nameKey: 'eg_stat_agility' },
    { key: 'int', icon: '🧠', nameKey: 'eg_stat_intelligence' },
];


//------------------------------------------------------------------------
//-------------------PROGRESSION STATE------------------------------------
//------------------------------------------------------------------------

function _egGetPlayerLevel() {
    return (typeof STATE !== 'undefined' && STATE && STATE.playerLevel) || EG_LEVELING_CONFIG.startLevel;
}

function _egGetPlayerXP() {
    return (typeof STATE !== 'undefined' && STATE && STATE.playerXP) || 0;
}

function _egGetUnspentPoints() {
    return (typeof STATE !== 'undefined' && STATE && STATE.egAttrPoints) || 0;
}

function _egGetAllocatedAttributes() {
    if (typeof STATE === 'undefined' || !STATE || !STATE.egAttrAllocated) {
        return { str: 0, agi: 0, int: 0 };
    }
    return STATE.egAttrAllocated;
}

// XP required to advance FROM `level` to `level + 1`.
function _egGetXpForNextLevel(level) {
    const c = EG_LEVELING_CONFIG;
    return Math.floor(c.xpBase * Math.pow(level, c.xpExp) + c.xpLinear * level);
}

// Pushes the live player level / allocated attributes into the shared base
// attributes object so requirement checks and stats aggregation pick them up.
function _egSyncBaseAttributes() {
    if (!EG_PLAYER_BASE_ATTRIBUTES) return;
    const alloc = _egGetAllocatedAttributes();
    EG_PLAYER_BASE_ATTRIBUTES.level = _egGetPlayerLevel();
    EG_PLAYER_BASE_ATTRIBUTES.str = _EG_ATTR_ORIGINAL_BASE.str + (alloc.str || 0);
    EG_PLAYER_BASE_ATTRIBUTES.agi = _EG_ATTR_ORIGINAL_BASE.agi + (alloc.agi || 0);
    EG_PLAYER_BASE_ATTRIBUTES.int = _EG_ATTR_ORIGINAL_BASE.int + (alloc.int || 0);
}


//------------------------------------------------------------------------
//-------------------XP GAIN----------------------------------------------
//------------------------------------------------------------------------

// Path-of-Exile-style experience multiplier based on the gap between the
// character's level and the monster's level:
//   - Monster inside the safe band → 100% XP.
//   - Monster too far BELOW → ((mLvl + 5) / (safeEdge + 5))^6 (PoE formula).
//   - Monster too far ABOVE → mirrored decay against its overhang edge.
// Returns a value clamped to [minMultiplier, 1].
function _egCalcXpMultiplier(playerLevel, monsterLevel) {
    const c = EG_LEVELING_CONFIG;
    const lowSafe = c.safeRangeBelowBase + Math.floor(playerLevel / c.safeRangeBelowLevelsPer);
    const highSafe = c.safeRangeAbove;

    if (monsterLevel <= playerLevel + highSafe && monsterLevel >= playerLevel - lowSafe) {
        return 1;
    }

    let mult;
    if (monsterLevel < playerLevel - lowSafe) {
        const ref = Math.max(0, playerLevel - lowSafe);
        mult = Math.pow((monsterLevel + 5) / (ref + 5), c.penaltyExponent);
    } else {
        const ref = monsterLevel - highSafe;
        mult = Math.pow((playerLevel + 5) / (ref + 5), c.penaltyExponent);
    }
    return Math.max(c.minMultiplier, Math.min(1, mult));
}

// Awards XP for killing one monster of `monsterLevel`, handles multi-level
// ups (+1 attribute point each), plays the level-up effect and persists.
function _egGrantMonsterXP(monsterLevel, isBoss) {
    if (typeof STATE === 'undefined' || !STATE) return;

    const playerLevel = _egGetPlayerLevel();
    if (playerLevel >= EG_LEVELING_CONFIG.maxLevel) {
        // Level cap reached — no more XP accumulates.
        if (STATE.playerXP !== 0) { STATE.playerXP = 0; egSaveLevelingState(); }
        return;
    }

    const mLvl = Math.max(1, Number(monsterLevel) || 1);
    const c = EG_LEVELING_CONFIG;
    let xp = c.xpPerKillBase + c.xpPerKillGrowth * Math.pow(mLvl, c.xpPerKillExp);
    if (isBoss) xp *= c.bossXpMultiplier;
    xp = Math.max(1, Math.round(xp * _egCalcXpMultiplier(playerLevel, mLvl)));

    STATE.playerXP = _egGetPlayerXP() + xp;

    let levelsGained = 0;
    while (_egGetPlayerLevel() < c.maxLevel
        && STATE.playerXP >= _egGetXpForNextLevel(_egGetPlayerLevel())) {
        STATE.playerXP -= _egGetXpForNextLevel(_egGetPlayerLevel());
        STATE.playerLevel++;
        STATE.egAttrPoints = (STATE.egAttrPoints || 0) + 1;
        levelsGained++;
    }
    if (_egGetPlayerLevel() >= c.maxLevel) STATE.playerXP = 0;

    egSaveLevelingState();
    _egRenderLevelHUD();

    if (levelsGained > 0) {
        _egPlayLevelUpEffect(_egGetPlayerLevel());
        if (typeof showToast === 'function') {
            showToast(t('eg_lvl_levelup_toast').replace('{n}', _egGetPlayerLevel()), '#f5b642');
        }
        if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
    }
}


//------------------------------------------------------------------------
//-------------------LEVEL-UP EFFECT--------------------------------------
//------------------------------------------------------------------------

// Full-screen gold flash + expanding "LEVEL UP!" banner. Pure CSS animation,
// element removes itself after the effect finishes. Safe mid-combat (the
// overlay ignores pointer events).
function _egPlayLevelUpEffect(newLevel) {
    const el = document.createElement('div');
    el.className = 'eg-levelup-fx';
    el.innerHTML = `
<div class="eg-levelup-banner">
    <div class="eg-levelup-title">${t('eg_lvl_banner')}</div>
    <div class="eg-levelup-sub">${t('eg_lvl_levelup_sub').replace('{n}', newLevel)}</div>
</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
}


//------------------------------------------------------------------------
//-------------------ATTRIBUTE ALLOCATION & REFUND------------------------
//------------------------------------------------------------------------

// Spends one unspent point on `attr` ('str' | 'agi' | 'int').
function _egAllocateAttribute(attr) {
    if (!(attr in _EG_ATTR_ORIGINAL_BASE)) return false;
    if (_egGetUnspentPoints() <= 0) {
        if (typeof showToast === 'function') showToast(t('eg_lvl_no_points'), '#e74c3c');
        return false;
    }

    STATE.egAttrPoints--;
    STATE.egAttrAllocated[attr] = (STATE.egAttrAllocated[attr] || 0) + 1;
    _egSyncBaseAttributes();
    egSaveLevelingState();

    if (typeof showToast === 'function') {
        const name = t(EG_LEVELING_ATTRS.find(a => a.key === attr).nameKey);
        showToast(t('eg_lvl_alloc_done').replace('{attr}', name), '#2ecc71');
    }

    _egRenderLevelHUD();
    if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
    const modal = document.getElementById('eg-attr-modal');
    if (modal && modal.classList.contains('show')) _egRenderAttrWindow();
    return true;
}

// Evaluates the equipped loadout with `attr` temporarily reduced by one
// point and returns the resulting unmet requirements. The real base value
// is always restored, even when the check throws.
function _egSimulateRefundUnmet(attr) {
    if (!(attr in _EG_ATTR_ORIGINAL_BASE)) return [];
    if (typeof _egFindUnmetRequirements !== 'function'
        || typeof _egGetAllEquippedItems !== 'function') return [];

    const saved = EG_PLAYER_BASE_ATTRIBUTES[attr];
    EG_PLAYER_BASE_ATTRIBUTES[attr] = saved - 1;
    try {
        return _egFindUnmetRequirements(_egGetAllEquippedItems());
    } finally {
        EG_PLAYER_BASE_ATTRIBUTES[attr] = saved;
    }
}

// True when removing one point of `attr` is legal:
//   - at least one allocated point exists on that attribute, AND
//   - the equipped gear stays fully valid afterwards (no NEW unmet
//     requirements compared to the current state — same grandfather rule
//     the equip gate uses).
function _egCanRefundAttribute(attr) {
    if ((_egGetAllocatedAttributes()[attr] || 0) <= 0) return false;
    if (typeof _egFindUnmetRequirements !== 'function') return true;
    const before = _egFindUnmetRequirements(_egGetAllEquippedItems());
    const after = _egSimulateRefundUnmet(attr);
    return after.length <= before.length;
}

// Verified refund: returns one spent point to the unspent pool unless the
// equipped gear depends on the attribute (blocked with an explanatory toast).
function _egRefundAttribute(attr) {
    if (!(attr in _EG_ATTR_ORIGINAL_BASE)) return false;

    if (!_egCanRefundAttribute(attr)) {
        if (typeof showToast === 'function') {
            const missing = _egSimulateRefundUnmet(attr);
            const list = typeof _egGetUnmetRequirementsText === 'function'
                ? _egGetUnmetRequirementsText(missing)
                : '';
            showToast(t('eg_lvl_refund_blocked').replace('{list}', list || '?'), '#e74c3c');
        }
        return false;
    }

    STATE.egAttrAllocated[attr] = (STATE.egAttrAllocated[attr] || 0) - 1;
    STATE.egAttrPoints = (STATE.egAttrPoints || 0) + 1;
    _egSyncBaseAttributes();
    egSaveLevelingState();

    if (typeof showToast === 'function') {
        const name = t(EG_LEVELING_ATTRS.find(a => a.key === attr).nameKey);
        showToast(t('eg_lvl_refund_done').replace('{attr}', name), '#2ecc71');
    }

    _egRenderLevelHUD();
    if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
    const attrModal = document.getElementById('eg-attr-modal');
    if (attrModal && attrModal.classList.contains('show')) _egRenderAttrWindow();
    return true;
}


//------------------------------------------------------------------------
//-------------------PERSISTENCE------------------------------------------
//------------------------------------------------------------------------

function egSaveLevelingState() {
    if (typeof save === 'function') save();
}

// Reads leveling fields from STATE (with defaults for legacy saves) and
// applies them to the shared base attributes object.
function _egLoadLevelingState() {
    if (typeof STATE === 'undefined' || !STATE) return;
    if (!STATE.playerLevel) STATE.playerLevel = EG_LEVELING_CONFIG.startLevel;
    if (!STATE.playerXP) STATE.playerXP = 0;
    if (!STATE.egAttrPoints) STATE.egAttrPoints = 0;
    if (!STATE.egAttrAllocated) STATE.egAttrAllocated = { str: 0, agi: 0, int: 0 };
    _egSyncBaseAttributes();
}


//------------------------------------------------------------------------
//-------------------HUD (BADGE + INLINE CHIP)-----------------------------
//------------------------------------------------------------------------

// Refreshes the ✦ topbar badge and the small level chip on the character
// panel label. Both elements are optional — this no-ops outside the hub.
function _egRenderLevelHUD() {
    const pts = _egGetUnspentPoints();
    const lvl = _egGetPlayerLevel();
    const xp = _egGetPlayerXP();
    const need = _egGetXpForNextLevel(lvl);
    const pct = lvl >= EG_LEVELING_CONFIG.maxLevel ? 100 : Math.min(100, (xp / need) * 100);

    const badge = document.getElementById('eg-level-badge');
    if (badge) {
        badge.textContent = pts > 99 ? '99+' : String(pts);
        badge.style.display = pts > 0 ? 'flex' : 'none';
    }

    const chip = document.getElementById('eg-char-level-inline');
    if (chip) {
        const ptsHtml = pts > 0
            ? `<span class="eg-lvl-chip-points">✦${pts > 99 ? '99+' : pts}</span>`
            : '';
        chip.innerHTML = `
<span class="eg-lvl-chip" onclick="_egOpenAttributeWindow()">
    <span class="eg-lvl-chip-lvl">${t('eg_lvl_short').replace('{n}', lvl)}</span>
    <span class="eg-lvl-chip-bar"><span class="eg-lvl-chip-bar-fill" style="width:${pct}%"></span></span>
    ${ptsHtml}
</span>`;
    }
}


//------------------------------------------------------------------------
//-------------------TOPBAR BUTTON TOOLTIP--------------------------------
//------------------------------------------------------------------------

// Hover tooltip for the ✦ LEVEL topbar button, built on the shared game
// tooltip engine (tooltips-hud.js) instead of the native browser title.
function _egBuildLevelBtnTooltipHTML() {
    const lvl = _egGetPlayerLevel();
    const xp = _egGetPlayerXP();
    const pts = _egGetUnspentPoints();
    const atMax = lvl >= EG_LEVELING_CONFIG.maxLevel;
    const xpLine = atMax
        ? t('eg_lvl_max_level')
        : t('eg_lvl_xp_progress')
            .replace('{cur}', xp.toLocaleString())
            .replace('{need}', _egGetXpForNextLevel(lvl).toLocaleString());

    return `
<div class="eg-tt-frame" style="--tt-border:#c8a84b;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">✦</div>
        <div class="eg-tt-name" style="color:#f5d98a;">${t('eg_lvl_window_title')}</div>
    </div>
    <div class="eg-tt-section">
        <div class="eg-tt-mod">${t('eg_lvl_short').replace('{n}', lvl)} · ${xpLine}</div>
        <div class="eg-tt-mod">${pts > 0
            ? t('eg_lvl_points_available').replace('{n}', pts)
            : t('eg_lvl_no_points')}</div>
    </div>
</div>`;
}

function _egShowLevelBtnTooltip(e) {
    if (typeof showGameTooltip === 'function') showGameTooltip(_egBuildLevelBtnTooltipHTML(), e);
}


//------------------------------------------------------------------------
//-------------------ATTRIBUTE WINDOW-------------------------------------
//------------------------------------------------------------------------

// Lazily creates the modal shell (once), mirroring the item-delete modal.
function _egEnsureAttrModal() {
    if (document.getElementById('eg-attr-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'eg-attr-modal';
    modal.className = 'eg-delete-modal-bg';
    modal.innerHTML = `<div class="eg-attr-box" id="eg-attr-box"></div>`;
    document.body.appendChild(modal);
    _egInjectLevelingStyles();
}

function _egOpenAttributeWindow() {
    _egEnsureAttrModal();
    _egRenderAttrWindow();
    document.getElementById('eg-attr-modal').classList.add('show');
}

function _egCloseAttributeWindow() {
    const modal = document.getElementById('eg-attr-modal');
    if (modal) modal.classList.remove('show');
}

// Rebuilds the window body from current state. Called on every open and
// after each allocate/refund so values stay live.
function _egRenderAttrWindow() {
    const box = document.getElementById('eg-attr-box');
    if (!box) return;

    const lvl = _egGetPlayerLevel();
    const xp = _egGetPlayerXP();
    const atMax = lvl >= EG_LEVELING_CONFIG.maxLevel;
    const need = _egGetXpForNextLevel(lvl);
    const pct = atMax ? 100 : Math.min(100, (xp / need) * 100);
    const pts = _egGetUnspentPoints();

    const gearBonus = (typeof _egSumAttributeBonuses === 'function')
        ? _egSumAttributeBonuses(typeof _egGetAllEquippedItems === 'function' ? _egGetAllEquippedItems() : [])
        : { str: 0, agi: 0, int: 0 };

    const xpHTML = atMax
        ? `<div class="eg-attr-xp-text">${t('eg_lvl_max_level')}</div>`
        : `<div class="eg-attr-xp-text">${t('eg_lvl_xp_progress')
            .replace('{cur}', xp.toLocaleString())
            .replace('{need}', need.toLocaleString())}</div>`;

    const rowsHTML = EG_LEVELING_ATTRS.map(a => {
        const alloc = _egGetAllocatedAttributes()[a.key] || 0;
        const baseTotal = _EG_ATTR_ORIGINAL_BASE[a.key] + alloc;
        const total = baseTotal + (gearBonus[a.key] || 0);

        const canAdd = pts > 0;
        const canRemove = _egCanRefundAttribute(a.key);

        // Explain WHY removal is blocked (gear verification feedback).
        let removeTitle = t('eg_lvl_refund');
        if ((alloc || 0) <= 0) {
            removeTitle = t('eg_lvl_no_points');
        } else if (!canRemove) {
            const list = typeof _egGetUnmetRequirementsText === 'function'
                ? _egGetUnmetRequirementsText(_egSimulateRefundUnmet(a.key))
                : '';
            removeTitle = t('eg_lvl_refund_blocked_title').replace('{list}', list || '?');
        }

        return `
<div class="eg-attr-row">
    <span class="eg-attr-row-icon">${a.icon}</span>
    <div class="eg-attr-row-info">
        <div class="eg-attr-row-name">${t(a.nameKey)}</div>
        <div class="eg-attr-row-detail">${baseTotal}${(gearBonus[a.key] || 0) > 0
            ? ` <small>+ ${t('eg_lvl_gear_bonus').replace('{n}', gearBonus[a.key])}</small>` : ''}</div>
    </div>
    <div class="eg-attr-row-value">${total}</div>
    <button class="eg-attr-btn eg-attr-btn-add" ${canAdd ? '' : 'disabled'}
         onclick="_egAllocateAttribute('${a.key}')">+</button>
    <button class="eg-attr-btn eg-attr-btn-remove" ${canRemove ? '' : 'disabled'}
         title="${removeTitle}"
         onclick="_egRefundAttribute('${a.key}')">−</button>
</div>`;
    }).join('');

    box.innerHTML = `
<div class="eg-attr-title">${t('eg_lvl_window_title')}</div>
<div class="eg-attr-level-line">
    <span class="eg-attr-level-num">${t('eg_lvl_short').replace('{n}', lvl)}</span>
    <div class="eg-attr-xp-wrap">
        <div class="eg-attr-xp-bar"><div class="eg-attr-xp-fill" style="width:${pct}%"></div></div>
        ${xpHTML}
    </div>
</div>
<div class="eg-attr-points ${pts > 0 ? 'has-points' : ''}">${pts > 0
        ? t('eg_lvl_points_available').replace('{n}', pts)
        : t('eg_lvl_no_points')}</div>
<div class="eg-attr-rows">${rowsHTML}</div>
<div class="eg-attr-hint">${t('eg_lvl_hint')}</div>
<div class="eg-delete-modal-btns">
    <button class="eg-delete-modal-btn eg-delete-modal-cancel"
         onclick="_egCloseAttributeWindow()">${t('reset_cancel')}</button>
</div>`;
}


//------------------------------------------------------------------------
//-------------------STYLES------------------------------------------------
//------------------------------------------------------------------------

// Injects all leveling UI styles once (badge, inline chip, window, effects).
function _egInjectLevelingStyles() {
    if (document.getElementById('eg-leveling-styles')) return;
    const style = document.createElement('style');
    style.id = 'eg-leveling-styles';
    style.textContent = `
/* ── Topbar button + unspent-point badge ── */
.eg-level-btn { position: relative; color: #f5d98a; font-size: 14px; }
.eg-level-badge {
    display: none;
    position: absolute;
    top: -6px; right: -6px;
    min-width: 15px; height: 15px;
    padding: 0 3px;
    align-items: center; justify-content: center;
    background: #c8a84b;
    border: 1px solid #7a6526;
    border-radius: 8px;
    color: #1a1408;
    font-size: 9px;
    font-weight: 700;
    line-height: 1;
}

/* ── Inline level chip on the character panel ── */
.eg-char-label-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
#eg-char-level-inline { cursor: pointer; }
.eg-lvl-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #c8a84b;
}
.eg-lvl-chip:hover .eg-lvl-chip-lvl { text-shadow: 0 0 6px rgba(245,217,138,.8); }
.eg-lvl-chip-lvl { letter-spacing: .5px; }
.eg-lvl-chip-bar {
    width: 64px; height: 6px;
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(200,168,75,.45);
    border-radius: 3px;
    overflow: hidden;
}
.eg-lvl-chip-bar-fill { display: block; height: 100%; background: linear-gradient(90deg,#8a6d2b,#f5d98a); }
.eg-lvl-chip-points {
    background: #c8a84b;
    color: #1a1408;
    border-radius: 8px;
    padding: 0 5px;
    font-weight: 700;
    animation: eg-lvl-pulse 1.6s ease-in-out infinite;
}
@keyframes eg-lvl-pulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.35); }
}

/* ── Attribute window ── */
.eg-attr-box {
    background: #12121e;
    border: 2px solid #c8a84b;
    border-radius: 8px;
    padding: 18px 22px;
    width: 420px;
    max-width: 94vw;
    max-height: 90vh;
    overflow-y: auto;
    color: #ddd;
    font-family: var(--PX, monospace);
}
.eg-attr-title {
    text-align: center;
    color: #f5d98a;
    letter-spacing: 2px;
    font-weight: 700;
    margin-bottom: 12px;
}
.eg-attr-level-line {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
}
.eg-attr-level-num { color: #fff; font-size: 16px; font-weight: 700; white-space: nowrap; }
.eg-attr-xp-wrap { flex: 1; }
.eg-attr-xp-bar {
    height: 10px;
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(200,168,75,.5);
    border-radius: 5px;
    overflow: hidden;
}
.eg-attr-xp-fill { display: block; height: 100%; background: linear-gradient(90deg,#8a6d2b,#f5d98a); transition: width .25s; }
.eg-attr-xp-text { margin-top: 4px; font-size: 10px; opacity: .75; text-align: right; }
.eg-attr-points { text-align: center; font-size: 12px; margin-bottom: 12px; opacity: .85; }
.eg-attr-points.has-points { color: #f5b642; font-weight: 700; }
.eg-attr-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.eg-attr-row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 6px;
    padding: 8px 10px;
}
.eg-attr-row-icon { font-size: 18px; }
.eg-attr-row-info { flex: 1; min-width: 0; }
.eg-attr-row-name { font-size: 13px; font-weight: 700; }
.eg-attr-row-detail { font-size: 10px; opacity: .65; }
.eg-attr-row-value { font-size: 16px; font-weight: 700; color: #66fcf1; min-width: 34px; text-align: right; }
.eg-attr-btn {
    width: 26px; height: 26px;
    border-radius: 4px;
    border: 1px solid #555;
    background: #2a2a3e;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    line-height: 1;
    padding: 0;
}
.eg-attr-btn-add:not(:disabled) { border-color: #2ecc71; color: #2ecc71; }
.eg-attr-btn-add:not(:disabled):hover { background: #2ecc71; color: #10241a; }
.eg-attr-btn-remove:not(:disabled) { border-color: #c8a84b; color: #f5d98a; }
.eg-attr-btn-remove:not(:disabled):hover { background: #c8a84b; color: #1a1408; }
.eg-attr-btn:disabled { opacity: .3; cursor: not-allowed; }
.eg-attr-hint { font-size: 10px; opacity: .55; text-align: center; margin-bottom: 12px; }

/* ── Level-up effect ── */
.eg-levelup-fx {
    position: fixed;
    inset: 0;
    z-index: 10050;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, rgba(245,185,66,.28) 0%, rgba(245,185,66,.08) 35%, transparent 65%);
    animation: eg-lvl-flash 2.8s ease-out forwards;
}
@keyframes eg-lvl-flash {
    0% { opacity: 0; }
    12% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
}
.eg-levelup-banner { text-align: center; animation: eg-lvl-pop 2.8s ease-out forwards; }
@keyframes eg-lvl-pop {
    0% { transform: scale(.4); opacity: 0; }
    15% { transform: scale(1.15); opacity: 1; }
    25% { transform: scale(1); }
    80% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1.05) translateY(-14px); opacity: 0; }
}
.eg-levelup-title {
    font-family: var(--PX, monospace);
    font-size: 44px;
    font-weight: 700;
    letter-spacing: 4px;
    color: #f5d98a;
    text-shadow: 0 0 18px rgba(245,185,66,.9), 0 0 40px rgba(245,185,66,.5), 0 2px 0 #6b5316;
}
.eg-levelup-sub {
    margin-top: 6px;
    font-family: var(--PX, monospace);
    font-size: 15px;
    letter-spacing: 2px;
    color: #fff;
    text-shadow: 0 0 10px rgba(245,185,66,.8);
}
`;
    document.head.appendChild(style);
}


//------------------------------------------------------------------------
//-------------------BOOTSTRAP--------------------------------------------
//------------------------------------------------------------------------

// Loads saved progression immediately (same pattern as _egLoadHubState in
// endgame-hub.js) so level requirements are enforced without visiting the hub.
_egLoadLevelingState();
_egInjectLevelingStyles();
