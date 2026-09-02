//------------------------------------------------------------------------
//-------------------SHIELD----------------------
//------------------------------------------------------------------------

// shield — activates the damage shield, optionally adding extra charges
// and a cursed-immunity window from passive nodes.
function _useShield(id, def) {
    // Several keystones block shield items entirely
    if (ptHasSkill('keystone_iron_doctrine')) {
        return `${def.icon} ${t('itm_blocked_iron_doctrine')}`;
    }
    if (ptHasSkill('keystone_null_hypothesis')) {
        return `${def.icon} ${t('itm_blocked_null_hypothesis')}`;
    }
    if (ptHasSkill('keystone_asymptotic_mastery')) {
        return `${def.icon} ${t('itm_blocked_asymptotic_mastery')}`;
    }

    shieldActive = true;

    // Passive: Reinforced Ward — each node adds 1 extra absorbed mistake
    const extraCharges = (ptHasSkill('reinforced_ward_1') ? 1 : 0)
        + (ptHasSkill('reinforced_ward_2') ? 1 : 0)
        + (ptHasSkill('reinforced_ward_3') ? 1 : 0);
    // Stored on the window so the mistake handler can consume them
    window._shieldExtraCharges = (window._shieldExtraCharges || 0) + extraCharges;

    // Passive: Cursed Ward — each node grants 5 s of cursed immunity (max 15 s)
    const cursedImmunitySecs = (ptHasSkill('cursed_ward_1') ? 5 : 0)
        + (ptHasSkill('cursed_ward_2') ? 5 : 0)
        + (ptHasSkill('cursed_ward_3') ? 5 : 0);
    if (cursedImmunitySecs > 0) {
        window._cursedImmune = true;
        setTimeout(() => { window._cursedImmune = false; }, cursedImmunitySecs * 1000);
        showToast(t('itm_cursed_warded'));
    }

    playItemEffect(id);
    return `${def.icon} ${t('item_shield_msg')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: spawns the shield overlay div covering the whole grid area.
function _fxMakeShieldOverlay(wrap, r) {
    const shield = document.createElement('div');
    shield.className = 'fx-shield-overlay';
    shield.style.cssText = `
        position:absolute;
        left:${r.left}px; top:${r.top}px;
        width:${r.width}px; height:${r.height}px;
        pointer-events:none; z-index:${FX_Z.above};
        animation:fx-shield-pulse 1.2s ease-out forwards;
    `;
    shield.innerHTML = `<div class="fx-shield-hex">🛡️</div>`;
    wrap.appendChild(shield);
    setTimeout(() => shield.remove(), 1500);
}

// 🛡️ Shield — a golden hexagonal shield briefly overlays the puzzle.
function _fxShield() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const maxSize = Math.max(r.width, r.height) * 0.65;

    _fxMakeShieldOverlay(r.wrap, r);

    // Hex shimmer rings rippling outward
    const overlay = _fxOverlay(r.wrap, 1400);
    for (let i = 0; i < 3; i++) {
        _fxMakeRing(overlay, cx, cy, 'fx-shield-ring', maxSize, i * 0.22, 'fx-shield-ring-expand');
    }

    _fxShieldBorderAdd();

    Audio_Manager.playSFX('shield');
}

// 🛡️💥 Shield Break — Spawns shattering particles at the exact cell location
function playShieldBreakEffect(row, col) {
    const wrap = document.getElementById('puzzle-scaler');
    const cell = document.getElementById(`g-${row}-${col}`);
    if (!wrap || !cell) return;

    const zoom = currentZoom || 1;
    const wRect = wrap.getBoundingClientRect();
    const cRect = cell.getBoundingClientRect();

    // Calculate the logical center coordinates of the targeted cell
    const cx = (cRect.left - wRect.left + cRect.width / 2) / zoom;
    const cy = (cRect.top - wRect.top + cRect.height / 2) / zoom;

    // Create a short-lived canvas overlay container for the particles
    const overlay = _fxOverlay(wrap, 1000);

    // 1. Burst golden and orange shattering shards from the cell epicenter
    _fxSpawnParticles({
        count: 14,
        chars: ['💥', '🔸', '▫️', '·'],
        colors: ['#ffd700', '#ffa500', '#ffffff', '#e0e0e0'],
        sizeMin: 12,
        sizeMax: 18,
        container: overlay,
        startX: cx,
        startY: cy,
        spreadX: 30,
        spreadY: 30,
        duration: 600,
        cssClass: 'fx-particle-generic'
    });

    // 2. Briefly pop a shield icon that vanishes into the shatter effect
    _fxMakeIcon(
        wrap,
        '🛡️',
        cx,
        cy,
        28,
        'animation:fx-icon-pop 0.4s ease-out forwards;',
        400
    );

    _fxShieldBorderRemove();
}
