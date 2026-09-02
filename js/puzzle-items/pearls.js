//------------------------------------------------------------------------
//-------------------PEARLS — OF HASTE / OF SWIFTNESS / GRAND PEARL----------------------
//------------------------------------------------------------------------

// Helper: resets a single cooldown slot to 1 s remaining.
function _resetCooldownSlot(slot) {
    const cd = cooldownState[slot];
    if (cd.interval) {
        clearInterval(cd.interval);
        cd.interval = null;
    }
    cd.remaining = 1;
    startSlotCooldown(slot, 1);
}

// pearlOfHaste — resets the cooldown of active skill slot 1.
function _usePearlOfHaste(id, def) {
    if (!STATE.playerClass) return `${def.icon} ${t('itm_no_class')}`;
    _resetCooldownSlot('active1');
    playItemEffect(id);
    return `${def.icon} ${t('itm_cooldown_s1')}`;
}

// pearlOfSwiftness — resets the cooldown of active skill slot 2.
function _usePearlOfSwiftness(id, def) {
    if (!STATE.playerClass) return `${def.icon} ${t('itm_no_class')}`;
    _resetCooldownSlot('active2');
    playItemEffect(id);
    return `${def.icon} ${t('itm_cooldown_s2')}`;
}

// grandPearl — resets the cooldowns of both active skill slots.
function _useGrandPearl(id, def) {
    if (!STATE.playerClass) return `${def.icon} ${t('itm_no_class')}`;
    _resetCooldownSlot('active1');
    _resetCooldownSlot('active2');
    playItemEffect(id);
    return `${def.icon} ${t('itm_cooldown_both')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: spawns the stacked iridescent rings for pearl effects.
// `color` is a CSS hex color; ring border + glow inherit it.
function _fxMakePearlRings(container, cx, cy, color, maxSize) {
    for (let i = 0; i < 5; i++) {
        const ring = document.createElement('div');
        ring.className = 'fx-shield-ring'; // reuse shield-ring CSS geometry
        ring.style.cssText = `
            position:absolute; left:${cx}px; top:${cy}px;
            transform:translate(-50%,-50%) scale(0);
            border-color:${color};
            box-shadow:0 0 8px ${color};
            animation:fx-shield-ring-expand 0.9s ease-out ${i * 0.14}s forwards;
            --ring-max:${maxSize}px;
        `;
        container.appendChild(ring);
    }
}

// 🔵🟣⚪ Pearl effects — iridescent ripple burst.
// `color` drives ring tint and emoji selection via PEARL_VARIANTS.
function _fxPearl(color) {
    const variant = PEARL_VARIANTS[color];
    if (!variant) return;

    Audio_Manager.playSFX(variant.sfx);

    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1400);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const maxSize = Math.max(r.width, r.height) * 0.7;

    _fxMakePearlRings(overlay, cx, cy, color, maxSize);
    _fxMakeIcon(r.wrap, variant.emoji, cx, cy, 64,
        'animation:fx-icon-pop 0.6s ease-out forwards;', 1000);
}
