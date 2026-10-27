import { cur } from '../state.js';
import { LANG } from '../translation/translations.js';
import { Audio_Manager } from '../audio/audio.js';
import { _damageTargetById } from '../combat/encounter-monster-damage.js';
import { botSpriteGoTo, botSpriteRelease, botSpriteSay } from '../companion-bot/companion-bot-sprite.js';
import { holdCompanionBot } from '../companion-bot/companion-bot.js';
import { BOT_TINTS } from '../companion-bot/companion-bot-profiles.js';
import { COMPANION_CAST } from './companion-scenes.js';

//------------------------------------------------------------------------
//-------------------CO-OP BOSS: STANDING SPOTS----------------------------
//------------------------------------------------------------------------
// The boss of a co-op encounter is one big beast whose shield holds until
// the two heroes stand on two glowing runes at the same time. The friend
// walks to their rune by themselves; the player steps on theirs with a click
// (click again to step off). While both stand there a bar fills; when it is
// full the shield breaks and the boss takes a heavy blow. Then it is open for
// a while and the shield returns. Later encounters ask for several rounds in a
// row (the heroes swap sides each round). The boss itself is an ordinary
// campaign monster, so the normal fight (hits, spells, loot) works on it.

//------------------------------------------------------------------------
// STATE
//------------------------------------------------------------------------

const TICK_MS = 250;
// The player's rune wears the familiar cyan of the player's own marks.
const PLAYER_RUNE_COLOR = '#4fd8ff';

// The running mechanic, or null: { def, level, bossId, friend, timer, mode, nextAt,
// round, spots, playerOn, friendOn, holdStart, spotsUntil, openUntil, onDefeated }.
let _run = null;

//------------------------------------------------------------------------
// LOW-LEVEL HELPERS
//------------------------------------------------------------------------

// Text in the player's language.
const _tr = (en, de) => (LANG === 'de' ? de : en);

// The boss monster of this run, or null once it is gone.
function _boss() {
    return (globalThis._monsters || []).find(m => m.id === _run.bossId && m.currentHP > 0) || null;
}

// Adds the stylesheet for runes and the message strip once.
function _ensureStyles() {
    if (document.getElementById('coop-boss-style')) return;
    const st = document.createElement('style');
    st.id = 'coop-boss-style';
    st.textContent = `
    .coop-rune { position: fixed; z-index: 8000; width: 92px; height: 92px; margin: -46px 0 0 -46px; border-radius: 50%;
        border: 3px dashed var(--rune, #fff); background: radial-gradient(circle, rgba(255,255,255,.18), rgba(255,255,255,.04) 70%);
        color: var(--rune, #fff); font: 700 12px sans-serif; display: flex; align-items: center; justify-content: center;
        text-align: center; pointer-events: none; box-shadow: 0 0 18px var(--rune, #fff); animation: coopRunePulse 1.4s ease-in-out infinite; }
    .coop-rune.mine { pointer-events: auto; cursor: pointer; }
    .coop-rune.lit { border-style: solid; background: radial-gradient(circle, var(--rune, #fff), transparent 75%); color: #000; }
    @keyframes coopRunePulse { 50% { transform: scale(1.08); } }
    #coop-boss-strip { position: fixed; left: 50%; top: 52px; transform: translateX(-50%); z-index: 8100; padding: 6px 14px;
        border-radius: 8px; background: rgba(10,10,25,.85); color: #fff; font: 600 14px sans-serif; border: 1px solid #8f8fff;
        pointer-events: none; text-align: center; }
    #coop-boss-strip .bar { height: 5px; margin-top: 5px; border-radius: 3px; background: #333; overflow: hidden; }
    #coop-boss-strip .bar i { display: block; height: 100%; width: 0; background: #ffd93d; }`;
    document.head.appendChild(st);
}

// Shows a message (and a progress bar when `pct` is given) in a strip at the top; `null` hides it.
function _strip(text, pct) {
    let el = document.getElementById('coop-boss-strip');
    if (text == null) { if (el) el.remove(); return; }
    if (!el) {
        el = document.createElement('div');
        el.id = 'coop-boss-strip';
        document.body.appendChild(el);
    }
    el.textContent = text;
    if (pct != null) {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.innerHTML = `<i style="width:${Math.round(pct * 100)}%"></i>`;
        el.appendChild(bar);
    }
}

// Where the two runes of a round stand (screen pixels, feet level): the player's
// and the friend's. Round 0 puts the player on the left, round 1 swaps sides.
function _spotsFor(round) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const left = { x: w * 0.12, y: h * 0.74 };
    const right = { x: w * 0.88, y: h * 0.74 };
    return round % 2 === 0 ? { player: left, friend: right } : { player: right, friend: left };
}

// Creates one rune at a spot. The player's rune is clickable.
function _makeRune(spot, label, color, mine, onClick) {
    const r = document.createElement('div');
    r.className = 'coop-rune' + (mine ? ' mine' : '');
    r.style.left = spot.x + 'px';
    r.style.top = spot.y + 'px';
    r.style.setProperty('--rune', color);
    r.textContent = label;
    if (mine) r.addEventListener('click', onClick);
    document.body.appendChild(r);
    return r;
}

// Removes both runes and the strip, and lets the friend move freely again.
function _clearSpots() {
    document.querySelectorAll('.coop-rune').forEach(r => r.remove());
    _strip(null);
    holdCompanionBot(false);
    botSpriteRelease();
}

//------------------------------------------------------------------------
// ROUNDS
//------------------------------------------------------------------------

// A line from the friend (speech bubble above their head).
function _friendSays(en, de) {
    botSpriteSay(_tr(en, de), COMPANION_CAST[_run.friend].name, 4200);
}

// Starts a round: shows the two runes and sends the friend to theirs.
function _startRound() {
    const run = _run;
    const spots = _spotsFor(run.round);
    run.spots = spots;
    run.playerOn = false;
    run.friendOn = false;
    run.holdStart = 0;
    run.mode = 'spots';
    run.spotsUntil = Date.now() + run.def.boss.spotWaitMs;
    const me = PLAYER_RUNE_COLOR;
    const friendColor = BOT_TINTS[run.friend];
    run.runes = [
        _makeRune(spots.player, _tr('YOU', 'DU'), me, true, () => {
            run.playerOn = !run.playerOn;
            run.runes[0].classList.toggle('lit', run.playerOn);
            Audio_Manager.playSFX('click');
        }),
        _makeRune(spots.friend, COMPANION_CAST[run.friend].name, friendColor, false),
    ];
    holdCompanionBot(true);
    if (run.round === 0) _friendSays('Stand on the rune with me!', 'Stell dich mit mir auf die Rune!');
    botSpriteGoTo(spots.friend.x, spots.friend.y).then(ok => {
        if (ok && _run === run && run.mode === 'spots') {
            run.friendOn = true;
            run.runes[1].classList.add('lit');
        }
    });
}

// The shield breaks: the boss takes a heavy blow and stays open for a while.
function _breakShield() {
    const run = _run;
    const boss = _boss();
    _clearSpots();
    if (!boss) return;
    boss.bossImmune = false;
    const hit = Math.max(1, Math.round(boss.maxHP * run.def.boss.convergenceShare));
    _damageTargetById(boss.id, hit, {}, { isCompanion: true });
    globalThis.showCombatToast(_tr('Convergence! The shield breaks!', 'Zusammenspiel! Der Schild bricht!'));
    _friendSays('Now! Hit it!', 'Jetzt! Schlag zu!');
    run.mode = 'open';
    run.openUntil = Date.now() + run.def.boss.openMs;
}

// The shield returns and the next round is planned.
function _closeShield() {
    const boss = _boss();
    if (boss) boss.bossImmune = true;
    _run.mode = 'idle';
    _run.round = 0;
    _run.nextAt = Date.now() + _run.def.boss.everyMs;
}

// The round was not finished in time: the runes fade, the shield stays up.
function _failRound() {
    _clearSpots();
    _friendSays('Too slow. We will try again.', 'Zu langsam. Wir versuchen es nochmal.');
    _run.mode = 'idle';
    _run.round = 0;
    _run.nextAt = Date.now() + _run.def.boss.everyMs * 0.6;
}

// One look at the standing spots: counts the hold while both stand, finishes
// the round when the bar is full, fails it when the time is up.
function _watchSpots(now) {
    const run = _run;
    const holdMs = run.def.boss.holdMs;
    if (run.playerOn && run.friendOn) {
        run.holdStart = run.holdStart || now;
        const pct = Math.min(1, (now - run.holdStart) / holdMs);
        _strip(_tr('Hold the runes together!', 'Haltet die Runen gemeinsam!'), pct);
        if (pct >= 1) {
            run.round++;
            if (run.round >= run.def.boss.rounds) _breakShield();
            else { _clearSpots(); _startRound(); _friendSays('Again, on the other side!', 'Nochmal, auf der anderen Seite!'); }
        }
        return;
    }
    run.holdStart = 0;
    _strip(run.friendOn
        ? _tr('Click your rune to stand on it!', 'Klick auf deine Rune, um dich darauf zu stellen!')
        : _tr('Your friend is on the way...', 'Dein Freund ist unterwegs...'));
    if (now > run.spotsUntil) _failRound();
}

// Takes the encounter's one monster as the boss (the pack appears a moment
// after the level starts): names it, raises its shield and schedules the first
// round. Returns false while it has not appeared yet.
function _adoptBoss() {
    const boss = (globalThis._monsters || []).find(m => m.currentHP > 0);
    if (!boss) return false;
    boss.name = _tr(_run.def.boss.bossNameEn, _run.def.boss.bossNameDE);
    boss.bossImmune = true;
    _run.bossId = boss.id;
    _run.nextAt = Date.now() + _run.def.boss.firstMs;
    return true;
}

// Every quarter second: ends the run when the level is over, notices the boss
// falling, and moves the mechanic along.
function _tick() {
    const run = _run;
    if (!run) return;
    const onScreen = !!document.getElementById('screen-game')?.classList.contains('active');
    if (!cur || cur !== run.level || !onScreen) { stopCoopBoss(); return; }
    if (globalThis.dead) { _clearSpots(); return; }
    if (!run.bossId && !_adoptBoss()) return;
    if (!_boss()) {
        const done = run.onDefeated;
        stopCoopBoss();
        if (done) done();
        return;
    }
    const now = Date.now();
    if (run.mode === 'idle' && now >= run.nextAt) _startRound();
    else if (run.mode === 'spots') _watchSpots(now);
    else if (run.mode === 'open' && now >= run.openUntil) _closeShield();
}

//------------------------------------------------------------------------
// ENTRY POINTS
//------------------------------------------------------------------------

// Starts the mechanic on the running co-op level: shields the boss and
// schedules the first round. `onDefeated` is called once when the boss falls.
export function startCoopBoss(def, friend, onDefeated) {
    stopCoopBoss();
    if (!def.boss) return false;
    _ensureStyles();
    _run = {
        def, level: cur, bossId: null, friend, mode: 'idle', round: 0, nextAt: 0,
        onDefeated, timer: setInterval(_tick, TICK_MS),
    };
    return true;
}

// Stops the mechanic and removes everything it put on the screen.
export function stopCoopBoss() {
    if (!_run) return;
    clearInterval(_run.timer);
    _run = null;
    _clearSpots();
}
