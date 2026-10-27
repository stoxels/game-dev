import { LANG } from '../translation/translations.js';
import { COMPANION_CAST, COMPANION_LOOKS } from './companion-scenes.js';
import { TRUST_LEVEL_POINTS } from './companion-trust.js';
import { BOT_TINTS } from '../companion-bot/companion-bot-profiles.js';

//------------------------------------------------------------------------
//-------------------TRUST GAIN CARD---------------------------------------
//------------------------------------------------------------------------
// The block the co-op result screen shows after a first clear: the friend's
// face, their trust level and a bar that fills from the old points to the
// new ones. When the points cross a level, the bar fills up, the level
// number ticks up with a "Level up!" flash and the bar carries on from empty.

//------------------------------------------------------------------------
// LOW-LEVEL HELPERS
//------------------------------------------------------------------------

// Text in the player's language.
const _tr = (en, de) => (LANG === 'de' ? de : en);

// Trust level (0 to 5) a number of points reaches.
function _levelAt(points) {
    return TRUST_LEVEL_POINTS.filter(need => points >= need).length;
}

// How full the bar is (0..100) for a number of points inside its own level.
function _percentAt(points) {
    const level = _levelAt(points);
    if (level >= TRUST_LEVEL_POINTS.length) return 100;
    const from = level === 0 ? 0 : TRUST_LEVEL_POINTS[level - 1];
    return Math.round((points - from) / (TRUST_LEVEL_POINTS[level] - from) * 100);
}

//------------------------------------------------------------------------
// ANIMATION
//------------------------------------------------------------------------

// Runs the fill: to the end of the old level first when a level was gained,
// then (after the level-up flash) from empty to the new fill.
function _animate(card, fromPoints, toPoints) {
    const bar = card.querySelector('.tg-bar i');
    const levelEl = card.querySelector('.tg-level');
    const flash = card.querySelector('.tg-flash');
    const toLevel = _levelAt(toPoints);
    const step = (ms, fn) => setTimeout(() => { if (card.isConnected) fn(); }, ms);
    bar.style.width = _percentAt(fromPoints) + '%';
    if (toLevel === _levelAt(fromPoints)) {
        step(500, () => { bar.style.width = _percentAt(toPoints) + '%'; });
        return;
    }
    step(500, () => { bar.style.width = '100%'; });
    step(1700, () => {
        levelEl.textContent = _tr(`Level ${toLevel}`, `Stufe ${toLevel}`);
        flash.style.opacity = '1';
        bar.style.transition = 'none';
        bar.style.width = '0%';
    });
    step(1800, () => {
        bar.style.transition = '';
        bar.style.width = _percentAt(toPoints) + '%';
    });
}

//------------------------------------------------------------------------
// ENTRY POINT
//------------------------------------------------------------------------

// Builds the card for a first co-op clear with `friendId`: trust went from
// `fromPoints` to `toPoints`. The fill starts as soon as the card is on screen.
export function buildTrustGainCard(friendId, fromPoints, toPoints) {
    const name = COMPANION_CAST[friendId].name;
    const color = BOT_TINTS[friendId];
    const cap = friendId.charAt(0).toUpperCase() + friendId.slice(1);
    const look = COMPANION_LOOKS[friendId].base;
    const level = _levelAt(fromPoints);
    const card = document.createElement('div');
    card.style.cssText = `margin: 14px 0 6px; display: flex; align-items: center; gap: 12px; text-align: left; --c: ${color};`;
    card.innerHTML = `
        <img src="animations/${cap}/idle/${look}/down/${cap}_${look}_idle_down_1.webp" alt="" draggable="false" style="width:64px;height:64px;object-fit:contain;flex:none;">
        <div style="flex:1;min-width:0;">
            <div style="color:${color};font-weight:700;">${_tr(`Trust with ${name}`, `Vertrauen zu ${name}`)}
                <span class="tg-level" style="opacity:.85;font-weight:400;margin-left:8px;">${_tr(`Level ${level}`, `Stufe ${level}`)}</span>
                <span class="tg-flash" style="opacity:0;transition:opacity .4s;color:#ffd93d;margin-left:8px;">${_tr('Level up!', 'Stufe gestiegen!')}</span>
            </div>
            <div class="tg-bar" style="height:10px;background:#2a2a48;border-radius:5px;margin:6px 0 2px;overflow:hidden;">
                <i style="display:block;height:100%;width:0%;background:${color};transition:width 1.1s ease-out;"></i>
            </div>
            <div style="opacity:.75;font-size:12px;">${_tr(`+${toPoints - fromPoints} trust points (${toPoints} in all)`, `+${toPoints - fromPoints} Vertrauenspunkte (insgesamt ${toPoints})`)}</div>
        </div>`;
    // The fill waits a beat so the player sees the bar before it moves.
    setTimeout(() => _animate(card, fromPoints, toPoints), 50);
    return card;
}
