//------------------------------------------------------------------------
//-------------------SCOUT'S PRIMER — USE HANDLER----------------------
//------------------------------------------------------------------------

// scoutPrimer — marks the next puzzle start so a reveal fires immediately.
function _useScoutPrimer(id, def) {
    STATE.primerPending = true;
    save();
    playItemEffect(id);
    return `📜 ${t('item_primer_activated')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: spawns the 8 compass-direction arrows that shoot outward.
function _fxMakePrimerArrows(container, cx, cy, r) {
    const arrows = ['▲', '▶', '▼', '◀', '◥', '◤', '◣', '◢'];
    arrows.forEach((ch, i) => {
        const angle = (i / arrows.length) * Math.PI * 2;
        const a = document.createElement('div');
        a.className = 'fx-primer-arrow';
        a.textContent = ch;
        a.style.cssText = `
            position:absolute; left:${cx}px; top:${cy}px;
            font-size:22px; color:#ffd700;
            text-shadow:0 0 8px #ffd700;
            animation:fx-primer-shoot 0.8s ease-out ${i * 0.08}s forwards;
            --dx:${Math.cos(angle) * r.width * 0.55}px;
            --dy:${Math.sin(angle) * r.height * 0.55}px;
        `;
        container.appendChild(a);
    });
}

// 📜 Scout's Primer — golden compass-points radiate outward.
function _fxScoutPrimer() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakePrimerArrows(overlay, cx, cy, r);
    _fxMakeIcon(r.wrap, '📜', cx, cy, 52, 'animation:fx-icon-pop 0.6s ease-out forwards;', 1100);

    Audio_Manager.playSFX('scouts_primer');
}
