//------------------------------------------------------------------------
// GAUNTLET ARENA
//
// Bonus objective type 'gauntlet' (levels are chosen in
// js/levels/gauntlet-levels.js). After the puzzle is solved an arena opens
// OVER the grid: the sprite fights waves of monsters using spells and melee
// only - the grid is covered, so no puzzle projectiles exist. Clearing every
// wave meets the bonus; dying only forfeits the bonus (the level itself is
// already complete). The arena reuses the normal encounter loop: monster
// cards, spells, melee, ailments and monster spells all work unchanged.
//
// Entry: scoring.js -> startGauntlet(onDone). The win overlay is rendered
// only once onDone(success) fires, so rewards reflect the result.
//------------------------------------------------------------------------

import { LANG } from '../translation/translations.js';
import { cur } from '../state.js';
import { stopTimer } from '../timer/timer.js';
import { Audio_Manager } from '../audio/audio.js';
import { updateClassHUDManaBar } from '../classes/class-mana.js';
import { _renderPlayerAvatar, _setAvatarPos } from '../sprite/player_sprite.js';
import { _egCampaignMonsterLevel } from '../endgame/endgame-leveling.js';
import { _egComputePlayerStats } from '../endgame/endgame-player-stats.js';
import { _uspClearSupportBuffs } from '../skills/universal-spells.js';
import { _egIsActive } from './combat-state.js';
import { _egCalcPlayerDamage } from './combat-calculations.js';
import { _egAilmentsCleanup } from './combat-ailments.js';
import { _egHazardsCleanup } from './combat-hazards-lifecycle.js';
import { _egStopPickupSpawner } from './combat-grid-pickups-spawner.js';
import { EG_CAMPAIGN_MONSTER_CONFIG, _egBuildCampaignMonsterList } from './encounter-campaign-spawns.js';
import { EG_MONSTER_ZONES } from './encounter-constants.js';
import { _egCancelSpawnTimers, _egStartTickLoop } from './encounter-lifecycle.js';
import { _egSpawnMonster } from './encounter-monster-spawning.js';
import { _egRenderPanel } from './encounter.js';

//------------------------------------------------------------------------
//-------------------TUNING-----------------------------------------------
//------------------------------------------------------------------------

export const EG_GAUNTLET_CONFIG = {
    minMonsters: 4,
    maxMonsters: 9,
    monstersBase: 3.5,        // total monsters = base + level * perLevel
    monstersPerLevel: 0.1,
    waveCount: 3,
    hitsToKillBase: 7,        // monster HP = avg player hit * (base + level * perLevel)
    hitsToKillPerLevel: 0.12,
    waveSpawnStaggerMs: 450,
    waveBreakMs: 1400,
    startHealPct: 0.5,        // life is topped up to at least this share on entry
    startManaPct: 0.6,
    resultBannerMs: 1700,
};

const _g = {
    active: false,
    level: null,
    waves: [],
    wave: 0,
    pending: 0,       // spawn timers not yet fired
    breakUntil: 0,
    poll: null,
    timers: [],
    onDone: null,
    pre: null,
    overlay: null,
    resizeFn: null,
    fighting: false,
    zones: null,      // original EG_MONSTER_ZONES while the arena owns the cards
};

//------------------------------------------------------------------------
//-------------------PUBLIC QUERIES---------------------------------------
//------------------------------------------------------------------------

export function _egGauntletActive() {
    return _g.active;
}

// True when the current level's gauntlet bonus can actually be played
// (monsterless runs have no beasts, so the bonus cannot be earned there).
export function _egGauntletPlayable() {
    if (!cur || cur.bonusType !== 'gauntlet') return false;
    if (typeof globalThis.isMonsterless === 'function' && globalThis.isMonsterless()) return false;
    return !!(cur.isMonsterLevel && _egIsActive());
}

//------------------------------------------------------------------------
//-------------------HELPERS----------------------------------------------
//------------------------------------------------------------------------

function _tr(en, de) {
    return LANG === 'de' ? de : en;
}

function _later(fn, ms) {
    const id = setTimeout(() => {
        _g.timers = _g.timers.filter(x => x !== id);
        fn();
    }, ms);
    _g.timers.push(id);
    return id;
}

function _alive() {
    return (globalThis._egMonsters || []).filter(m => m.currentHP > 0).length;
}

// Average damage of one normal player hit (sampled; the roll is random).
function _avgHit() {
    let sum = 0;
    const n = 6;
    for (let i = 0; i < n; i++) {
        try { sum += Number(_egCalcPlayerDamage()) || 0; } catch (e) { /* sample failed */ }
    }
    return Math.max(5, sum / n);
}

function _planWaves(level) {
    const cfg = EG_GAUNTLET_CONFIG;
    const total = Math.max(cfg.minMonsters, Math.min(cfg.maxMonsters,
        Math.round(cfg.monstersBase + level * cfg.monstersPerLevel)));
    const waves = [];
    let left = total;
    for (let w = 0; w < cfg.waveCount; w++) {
        const share = Math.ceil(left / (cfg.waveCount - w));
        waves.push(share);
        left -= share;
    }
    return waves.filter(n => n > 0);
}

//------------------------------------------------------------------------
//-------------------OVERLAY----------------------------------------------
//------------------------------------------------------------------------

// The arena is a large centred modal - independent of the puzzle grid.
function _arenaRect() {
    const w = Math.min(window.innerWidth - 32, 1180);
    const h = Math.min(window.innerHeight - 110, 760);
    return {
        left: Math.round((window.innerWidth - w) / 2),
        top: Math.max(8, Math.round((window.innerHeight - h) / 2) - 24),
        width: w,
        height: h,
    };
}

// Height of the strip at the top of the arena that holds the monster cards;
// the sprite may only walk below it.
const _CARD_BAND_PX = 205;

function _layout() {
    if (!_g.overlay) return;
    const r = _arenaRect();
    _g.overlay.style.left = `${r.left}px`;
    _g.overlay.style.top = `${r.top}px`;
    _g.overlay.style.width = `${r.width}px`;
    _g.overlay.style.height = `${r.height}px`;
    // The sprite cannot leave the arena (honoured by _setAvatarPos).
    if (_g.fighting) {
        globalThis._egAvatarBounds = {
            left: r.left + 6,
            right: r.left + r.width - 6,
            top: r.top + _CARD_BAND_PX,
            bottom: r.top + r.height - 6,
        };
    }
}

function _buildOverlay() {
    const old = document.getElementById('gauntlet-arena');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'gauntlet-arena';
    el.className = 'gauntlet-arena';
    el.innerHTML = `
        <div class="ga-floor"></div>
        <div class="ga-header">
            <span class="ga-title">⚔ ${_tr('GAUNTLET', 'GAUNTLET')}</span>
            <span class="ga-wave" id="ga-wave"></span>
            <span class="ga-left" id="ga-left"></span>
        </div>
        <div class="ga-monsters" id="ga-monster-zone"></div>
        <div class="ga-center" id="ga-center"></div>`;
    // Inside #game-main so the monster zone panels (same stacking context)
    // can be lifted above the arena.
    (document.getElementById('game-main') || document.body).appendChild(el);
    _g.overlay = el;
    _layout();
    if (!_g.resizeFn) {
        _g.resizeFn = () => _layout();
        window.addEventListener('resize', _g.resizeFn);
    }
    return el;
}

function _setCenter(html, cls) {
    const c = document.getElementById('ga-center');
    if (!c) return;
    c.className = `ga-center ${cls || ''}`;
    c.innerHTML = html;
}

function _hud() {
    const w = document.getElementById('ga-wave');
    const l = document.getElementById('ga-left');
    if (w) w.textContent = `${_tr('Wave', 'Welle')} ${Math.min(_g.wave, _g.waves.length)}/${_g.waves.length}`;
    if (l) {
        const left = _alive() + _g.pending + _g.waves.slice(_g.wave).reduce((s, n) => s + n, 0);
        l.textContent = `${_tr('Monsters left', 'Monster übrig')}: ${left}`;
    }
}

//------------------------------------------------------------------------
//-------------------FLOW-------------------------------------------------
//------------------------------------------------------------------------

// Entry point from the win flow. onDone(success) fires once the arena has
// closed (including skip, defeat and abort).
export function startGauntlet(onDone) {
    if (_g.active || !_egGauntletPlayable()) { onDone(false); return; }
    _g.active = true;
    _g.onDone = onDone;
    _g.level = cur;
    _g.wave = 0;
    _g.pending = 0;
    _g.timers = [];
    _g.pre = {
        hp: globalThis.playerCurrentHP,
        mana: globalThis.playerCurrentMana,
        hpTarget: cur.campaignMonsterHp,
        dmgTarget: cur.campaignMonsterDamage,
    };

    // The puzzle is over: freeze its clock and sweep the puzzle pack away.
    stopTimer();
    _egCancelSpawnTimers();
    try { _egStopPickupSpawner(); } catch (e) { /* spawner optional */ }
    globalThis._egMonsters = [];
    globalThis._egTargetId = null;
    _egRenderPanel();

    const lvl = Math.max(1, Number(_egCampaignMonsterLevel(cur.gIdx)) || 1);
    _g.waves = _planWaves(lvl);

    _buildOverlay();
    document.body.classList.add('gauntlet-open');
    _hud();
    _setCenter(`
        <div class="ga-card">
            <div class="ga-card-title">⚔ ${_tr('Gauntlet', 'Gauntlet')}</div>
            <p>${_tr('Defeat every monster to claim the bonus.', 'Besiege jedes Monster, um den Bonus zu erhalten.')}</p>
            <p class="ga-sub">${_g.waves.length} ${_tr('waves', 'Wellen')} · ${_g.waves.reduce((s, n) => s + n, 0)} ${_tr('monsters', 'Monster')} · ${_tr('Dying only forfeits the bonus', 'Sterben verwirft nur den Bonus')}</p>
            <div class="ga-actions">
                <button class="ga-btn ga-go" id="ga-go">${_tr('ENTER', 'BETRETEN')}</button>
                <button class="ga-btn ga-skip" id="ga-skip">${_tr('Skip', 'Überspringen')}</button>
            </div>
        </div>`, 'ga-intro');
    const go = document.getElementById('ga-go');
    const skip = document.getElementById('ga-skip');
    if (go) go.addEventListener('click', _begin);
    if (skip) skip.addEventListener('click', () => _finish(false, 'skipped'));
}

function _begin() {
    if (!_g.active) return;
    const cfg = EG_GAUNTLET_CONFIG;
    _setCenter('');

    // Fighting form: life / mana topped up, absorption refilled.
    const maxHP = Number(globalThis.playerMaxHP) || 0;
    if (maxHP > 0) {
        globalThis.playerCurrentHP = Math.max(globalThis.playerCurrentHP, Math.round(maxHP * cfg.startHealPct));
    }
    const maxMana = Number(globalThis.playerMaxMana) || 0;
    if (maxMana > 0) {
        globalThis.playerCurrentMana = Math.max(globalThis.playerCurrentMana || 0, Math.round(maxMana * cfg.startManaPct));
        try { updateClassHUDManaBar(); } catch (e) { /* HUD optional */ }
    }
    try { globalThis._egPlayerAbsorptionCurrent = _egComputePlayerStats().absorption; } catch (e) { /* stats optional */ }

    // Monster budget: HP from the player's own hit strength, damage from
    // the campaign curve, so the fight scales with both world and gear.
    const lvl = Math.max(1, Number(_egCampaignMonsterLevel(cur.gIdx)) || 1);
    const hits = cfg.hitsToKillBase + cfg.hitsToKillPerLevel * lvl;
    cur.campaignMonsterHp = Math.max(EG_CAMPAIGN_MONSTER_CONFIG.minHp, Math.round(_avgHit() * hits));
    cur.campaignMonsterDamage = Math.max(1, Math.round(
        EG_CAMPAIGN_MONSTER_CONFIG.damageBase + EG_CAMPAIGN_MONSTER_CONFIG.damagePerLevel * lvl));
    cur.monsterLevel = lvl;
    cur.gauntlet = true;
    globalThis._egGauntletFlag = true;

    // The arena owns the monster cards: they render in its own zone, so they
    // are visible above the sealed grid instead of behind it.
    _g.zones = EG_MONSTER_ZONES.slice();
    EG_MONSTER_ZONES.length = 0;
    EG_MONSTER_ZONES.push('ga-monster-zone');
    _g.fighting = true;

    // Bring the sprite into the arena and keep it there.
    const avatar = document.getElementById('player-avatar-wrapper');
    _layout();
    if (avatar) {
        const r = _arenaRect();
        const w = avatar.offsetWidth || 128;
        const h = avatar.offsetHeight || 190;
        avatar.style.display = 'flex';
        _setAvatarPos(avatar, r.left + r.width / 2 - w / 2, r.top + _CARD_BAND_PX + (r.height - _CARD_BAND_PX) / 2 - h / 2);
    }

    globalThis.dead = false;
    _egStartTickLoop();
    Audio_Manager.playSFX('boss_arrive');
    _spawnNextWave();
    _g.poll = setInterval(_tick, 300);
}

function _spawnNextWave() {
    if (!_g.active) return;
    const count = _g.waves[_g.wave];
    if (!count) return;
    _g.wave++;
    const lvl = Math.max(1, Number(cur.monsterLevel) || 1);
    const list = _egBuildCampaignMonsterList(count, lvl);
    _g.pending = list.length;
    _setCenter(`<div class="ga-banner">${_tr('WAVE', 'WELLE')} ${_g.wave}</div>`, 'ga-flash');
    _later(() => _setCenter(''), 1300);
    list.forEach((entry, i) => {
        _later(() => {
            _g.pending = Math.max(0, _g.pending - 1);
            if (!_g.active) return;
            const before = new Set((globalThis._egMonsters || []).map(m => m.id));
            _egSpawnMonster(entry.id, entry.level || lvl);
            // Arena kills pay XP but never litter the sealed grid with drops.
            (globalThis._egMonsters || []).forEach(m => { if (!before.has(m.id)) m.noLoot = true; });
            _hud();
        }, 500 + i * EG_GAUNTLET_CONFIG.waveSpawnStaggerMs);
    });
    _hud();
}

function _tick() {
    if (!_g.active) return;
    // The player left the level / the encounter was torn down: abort quietly.
    if (cur !== _g.level || !_egIsActive()) { _finish(false, 'aborted'); return; }
    if (globalThis.playerCurrentHP <= 0) { _finish(false, 'defeat'); return; }
    _layout();
    _hud();
    if (_g.pending > 0 || _alive() > 0) return;
    if (_g.wave >= _g.waves.length) { _finish(true); return; }
    const now = Date.now();
    if (!_g.breakUntil) {
        _g.breakUntil = now + EG_GAUNTLET_CONFIG.waveBreakMs;
        _setCenter(`<div class="ga-banner ga-cleared">${_tr('Wave cleared', 'Welle besiegt')}</div>`, 'ga-flash');
        return;
    }
    if (now >= _g.breakUntil) {
        _g.breakUntil = 0;
        _spawnNextWave();
    }
}

// Called by _egGameOver when the player's HP hits zero mid-gauntlet.
export function _egGauntletOnDefeat() {
    if (!_g.active) return false;
    _finish(false, 'defeat');
    return true;
}

// Ends the arena. reason: undefined (cleared) | 'defeat' | 'skipped' | 'aborted'.
function _finish(success, reason) {
    if (!_g.active) return;
    const wasFighting = !!_g.poll;
    _g.active = false;
    if (_g.poll) { clearInterval(_g.poll); _g.poll = null; }
    _g.timers.forEach(clearTimeout);
    _g.timers = [];

    // Give the monster zones and free movement back.
    _g.fighting = false;
    globalThis._egAvatarBounds = null;
    if (_g.zones) {
        EG_MONSTER_ZONES.length = 0;
        _g.zones.forEach(z => EG_MONSTER_ZONES.push(z));
        _g.zones = null;
    }

    // Field cleanup (the encounter itself is torn down by normal navigation).
    _egCancelSpawnTimers();
    globalThis._egMonsters = [];
    globalThis._egTargetId = null;
    try { _egAilmentsCleanup(); } catch (e) { /* cleanup is best-effort */ }
    try { _egHazardsCleanup(); } catch (e) { /* cleanup is best-effort */ }
    try { _uspClearSupportBuffs(); } catch (e) { /* cleanup is best-effort */ }
    try { _egRenderPanel(); } catch (e) { /* panel optional */ }

    if (cur) {
        cur.gauntlet = false;
        if (_g.pre) {
            if (_g.pre.hpTarget === undefined) delete cur.campaignMonsterHp; else cur.campaignMonsterHp = _g.pre.hpTarget;
            if (_g.pre.dmgTarget === undefined) delete cur.campaignMonsterDamage; else cur.campaignMonsterDamage = _g.pre.dmgTarget;
        }
    }
    globalThis._egGauntletFlag = false;
    globalThis.dead = true;

    // A lost gauntlet leaves the player as they were before it started.
    if (!success && wasFighting && _g.pre) {
        globalThis.playerCurrentHP = Math.max(1, Number(_g.pre.hp) || 1);
        if (typeof globalThis._renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
    }

    // The win flow hides the sprite once the puzzle is over; do the same here.
    try { _renderPlayerAvatar(); } catch (e) { /* avatar optional */ }

    const finish = (ok) => {
        if (_g.resizeFn) { window.removeEventListener('resize', _g.resizeFn); _g.resizeFn = null; }
        if (_g.overlay) { _g.overlay.remove(); _g.overlay = null; }
        document.body.classList.remove('gauntlet-open');
        const done = _g.onDone;
        _g.onDone = null;
        _g.pre = null;
        if (typeof done === 'function') done(ok);
    };

    if (reason === 'aborted') { finish(false); return; }
    if (reason === 'skipped') { finish(false); return; }

    Audio_Manager.playSFX(success ? 'win' : 'lose');
    _setCenter(success
        ? `<div class="ga-banner ga-win">⚔ ${_tr('GAUNTLET CLEARED!', 'GAUNTLET GEMEISTERT!')}</div>`
        : `<div class="ga-banner ga-lose">${_tr('Gauntlet failed - bonus lost', 'Gauntlet gescheitert - Bonus verloren')}</div>`,
    'ga-flash ga-result');
    setTimeout(() => finish(success), EG_GAUNTLET_CONFIG.resultBannerMs);
}
