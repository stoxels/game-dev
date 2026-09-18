import { Audio_Manager } from '../../audio/audio.js';
import { ptHasSkill } from '../../passive-tree/passive-tree-state-points.js';
import { questStat_timerItemUsed } from '../../quests/quests-stats.js';
import { t } from '../../translation/translations.js';
import { FREEZE_DURATION_MS } from '../freeze/freeze.js';
import { playItemEffect } from '../fx-dispatch.js';
import { addTimeSecs, subtractTimeSecs } from '../../puzzle-mechanics/timer-adjust.js';
import { _calcAddTimeSecs } from '../../puzzle-mechanics/effect-modifiers.js';
import { CHRONOBOLT_X_FRACTIONS, FX_Z, _fxGetPuzzleRect, _fxMakeElement, _fxMakeIcon, _fxOverlay, playFreezeCountdownOverlay } from '../../puzzle-mechanics/fx-helpers.js';

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------

// How long the hourglass/stopwatch overlays stay on screen (ms). The
// chronobolt uses its own slightly longer duration for its flash + bolts.
const FX_DURATION_MS = 1400;

//------------------------------------------------------------------------
//-------------------ITEM LOGIC-------------------------------------------
//------------------------------------------------------------------------

// _useAddTime - the Hourglass / Stopwatch / Chronobolt handler. Adds seconds
// to the timer (amount parsed from the item id, then modified by passives).
// The Gambler's Ruin keystone blocks all timer items outright, so it must be
// checked before anything else. Returns the toast text.
export function _useAddTime(id, def) {
    if (ptHasSkill('keystone_gamblers_ruin')) {
        return `${def.icon} ${t('itm_blocked_gamblers_ruin')}`;
    }

    const secs = _calcAddTimeSecs(parseAddTimeId(id));
    return ptHasSkill('keystone_countdown_crisis') && !window.STOX_FLAGS.goldenClockActive
        ? applyCountdownCrisis(id, def, secs)
        : applyAddTime(id, def, secs);
}

// parseAddTimeId - reads the number out of an item id like "addTime300".
// Falls back to 30s for unknown/legacy ids without a numeric suffix.
function parseAddTimeId(id) {
    return parseInt(id.replace('addTime', '')) || 30;
}

// applyAddTime - the normal branch: adds the seconds, updates the HUD, fires
// the item's visual effect and returns the toast text. Toast shows minutes
// instead of seconds (e.g. 90s -> 1.5min).
function applyAddTime(id, def, secs) {
    questStat_timerItemUsed();
    addTimeSecs(secs);
    playItemEffect(id);
    return `${def.icon} ${t('item_time_added').replace('{n}', secsToMinutes(secs))}`;
}

// applyCountdownCrisis - the inverted branch: the Countdown Crisis keystone
// turns timer items harmful (removes seconds instead of adding them). The
// Golden Clock guarantees the timer can only increase, so the inversion is
// suppressed while it is active. Otherwise identical to applyAddTime.
function applyCountdownCrisis(id, def, secs) {
    questStat_timerItemUsed();
    subtractTimeSecs(secs);
    playItemEffect(id);
    playFreezeCountdownOverlay(FREEZE_DURATION_MS);
    return `${def.icon} ${t('itm_countdown_crisis').replace('{n}', secsToMinutes(secs))}`;
}

// (the timer write itself now lives in timer-adjust.js)

// secsToMinutes - formats seconds as rounded minutes for the toast text
// (e.g. 90 -> 1.5).
function secsToMinutes(secs) {
    return Math.round((secs / 60) * 10) / 10;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// _fxHourglass - ⏳ effect: sand streams downward through the centre.
export function _fxHourglass() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeHourglassIcon(r.wrap, cx, cy);

    const overlay = _fxOverlay(r.wrap, FX_DURATION_MS);
    _fxMakeSandParticles(overlay, cx, cy, 20);

    Audio_Manager.playSFX('hourglass');
}

// _fxMakeHourglassIcon - helper: creates the large hourglass icon with spin
// animation.
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

// _fxMakeSandParticles - helper: spawns sand grain particles falling from the
// hourglass centre.
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

// _fxStopwatch - ⏱️ effect: timer rings ripple outward from centre.
export function _fxStopwatch() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, FX_DURATION_MS);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const maxSize = Math.max(r.width, r.height) * 0.7;

    _fxMakeTimeRings(overlay, cx, cy, 4, maxSize);
    _fxMakeIcon(r.wrap, '⏱️', cx, cy, 42, 'animation:fx-icon-pop 0.6s ease-out forwards;', 900);

    Audio_Manager.playSFX('stopwatch');
}

// _fxMakeTimeRings - helper: spawns `count` time-ring divs rippling outward
// from (cx, cy).
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

// _fxChronobolt - ⚡ effect: lightning bolts crackle across the puzzle grid.
export function _fxChronobolt() {
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

// _fxMakeLightningBolt - helper: creates one lightning bolt div at the given
// horizontal position.
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

// _fxGenerateLightningPath - generates a zigzag SVG lightning path of the
// given height. Returns an HTML string containing the full <svg> element.
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
