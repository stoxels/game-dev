//------------------------------------------------------------------------
//-------------------ADD TIME — HOURGLASS / STOPWATCH / CHRONOBOLT----------------------
//------------------------------------------------------------------------

// addTime30 / addTime60 / addTime180 — adds seconds to the timer.
function _useAddTime(id, def) {
    if (ptHasSkill('keystone_gamblers_ruin')) {
        return `${def.icon} ${t('itm_blocked_gamblers_ruin')}`;
    }

    const baseSecs = parseInt(id.replace('addTime', '')) || 30;
    const secs = _calcAddTimeSecs(baseSecs);
    // Toast shows minutes instead of seconds (e.g. 90s -> 1.5min)
    const mins = Math.round((secs / 60) * 10) / 10;

    // Countdown Crisis inverts timer items — but the Golden Clock guarantees
    // the timer can only increase, so the inversion is suppressed while it
    // is active.
    if (ptHasSkill('keystone_countdown_crisis') && !window._goldenClockActive) {
        questStat_timerItemUsed();
        const before = timerSecs;
        timerSecs = Math.max(0, timerSecs - secs);
        _trackTimerDelta(before, timerSecs);
    updTimer();
    playItemEffect(id);
    if (typeof playFreezeCountdownOverlay === 'function') playFreezeCountdownOverlay(FREEZE_DURATION_MS);
        return `${def.icon} ${t('itm_countdown_crisis').replace('{n}', mins)}`;
    }

    questStat_timerItemUsed();
    const before = timerSecs;
    timerSecs += secs;
    _trackTimerDelta(before, timerSecs);
    updTimer();
    playItemEffect(id);
    return `${def.icon} ${t('item_time_added').replace('{n}', mins)}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: creates the large hourglass icon with spin animation.
function _fxMakeHourglassIcon(wrap, cx, cy) {
    const hg = document.createElement('div');
    hg.className = 'fx-hourglass-icon';
    hg.textContent = '⏳';
    hg.style.cssText = `
        position:absolute;
        left:${cx}px; top:${cy}px;
        transform:translate(-50%,-50%);
        font-size:56px; pointer-events:none; z-index:${FX_Z.high};
        animation:fx-hourglass-spin 1s ease-in-out forwards;
    `;
    wrap.appendChild(hg);
    setTimeout(() => hg.remove(), 1600);
}

// Helper: spawns sand grain particles falling from the hourglass center.
function _fxMakeSandParticles(container, cx, cy, count) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const grain = document.createElement('div');
            grain.className = 'fx-sand-grain';
            grain.style.cssText = `
                position:absolute;
                left:${cx + (Math.random() - 0.5) * 16}px;
                top:${cy - 20}px;
                --fall-dist:${40 + Math.random() * 30}px;
            `;
            container.appendChild(grain);
        }, i * 55);
    }
}

// ⏳ Hourglass — sand streams downward through the centre.
function _fxHourglass() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeHourglassIcon(r.wrap, cx, cy);

    const overlay = _fxOverlay(r.wrap, 1400);
    _fxMakeSandParticles(overlay, cx, cy, 20);

    Audio_Manager.playSFX('hourglass');
}

// Helper: spawns `count` time-ring divs rippling outward from (cx, cy).
function _fxMakeTimeRings(container, cx, cy, count, maxSize) {
    for (let i = 0; i < count; i++) {
        const ring = document.createElement('div');
        ring.className = 'fx-time-ring';
        ring.style.cssText = `
            position:absolute;
            left:${cx}px; top:${cy}px;
            transform:translate(-50%,-50%) scale(0);
            animation:fx-time-ring-expand 0.85s ease-out ${i * 0.2}s forwards;
            --ring-max:${maxSize}px;
        `;
        container.appendChild(ring);
    }
}

// ⏱️ Stopwatch — timer rings ripple outward from centre.
function _fxStopwatch() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1400);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const maxSize = Math.max(r.width, r.height) * 0.7;

    _fxMakeTimeRings(overlay, cx, cy, 4, maxSize);
    _fxMakeIcon(r.wrap, '⏱️', cx, cy, 42, 'animation:fx-icon-pop 0.6s ease-out forwards;', 900);

    Audio_Manager.playSFX('stopwatch');
}

// Generates a zigzag SVG lightning path of the given height.
// Returns an HTML string containing the full <svg> element.
function _fxGenerateLightningPath(height) {
    const segs = 8;
    const segH = height / segs;
    let d = 'M 0 0';
    for (let i = 1; i <= segs; i++) {
        d += ` L ${(Math.random() - 0.5) * 28} ${segH * i}`;
    }
    return `
        <svg width="60" height="${height}"
             style="overflow:visible; position:absolute; left:-30px; top:0;">
            <path d="${d}" stroke="#ffe066" stroke-width="3" fill="none"
                  filter="url(#glow)" opacity="0.95"/>
            <path d="${d}" stroke="#fff"   stroke-width="1.5" fill="none" opacity="0.8"/>
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
        </svg>`;
}

// Helper: creates one lightning bolt div at the given horizontal position.
function _fxMakeLightningBolt(container, r, xFraction) {
    const bolt = document.createElement('div');
    bolt.className = 'fx-lightning-bolt';
    bolt.style.cssText = `
        position:absolute;
        left:${r.left + r.width * xFraction}px;
        top:${r.top}px;
        --bolt-height:${r.height}px;
        animation:fx-bolt-strike 0.35s steps(3) forwards;
    `;
    bolt.innerHTML = _fxGenerateLightningPath(r.height);
    container.appendChild(bolt);
}

// ⚡ Chronobolt — lightning bolts crackle across the puzzle grid.
function _fxChronobolt() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600, `z-index:${FX_Z.top};`);

    // Full-grid white flash that fades out
    _fxMakeElement(overlay, 'position:absolute;inset:0;', 'fx-chronobolt-flash');

    // Three staggered lightning bolts striking from the top edge
    CHRONOBOLT_X_FRACTIONS.forEach((xFrac, i) => {
        setTimeout(() => _fxMakeLightningBolt(overlay, r, xFrac), i * 180);
    });

    // Large ⚡ icon that flashes at the centre
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    _fxMakeIcon(r.wrap, '⚡', cx, cy, 72, `z-index:${FX_Z.supreme}; animation:fx-bolt-icon 0.5s ease-out forwards;`, 800);

    Audio_Manager.playSFX('chronobolt');
}
