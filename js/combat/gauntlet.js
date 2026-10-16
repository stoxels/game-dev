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
import { _egAddGold } from '../loot/loot-gold.js';
import { _egPlayerTakeDamage } from './encounter-damage.js';
import { _egAilmentsCleanup } from './combat-ailments.js';
import { _egHazardsCleanup } from './combat-hazards-lifecycle.js';
import { _egStopPickupSpawner } from './combat-grid-pickups-spawner.js';
import { EG_CAMPAIGN_MONSTER_CONFIG, _egBuildCampaignMonsterList, _egEarlyEaseBlend } from './encounter-campaign-spawns.js';
import { EG_MONSTER_ZONES } from './encounter-constants.js';
import { _egCancelSpawnTimers, _egStartTickLoop } from './encounter-lifecycle.js';
import { _egSpawnMonster } from './encounter-monster-spawning.js';
import { _egRenderPanel } from './encounter.js';

//------------------------------------------------------------------------
//-------------------TUNING-----------------------------------------------
//------------------------------------------------------------------------

export const EG_GAUNTLET_CONFIG = {
    minMonsters: 12,
    maxMonsters: 18,
    monstersBase: 12,         // total monsters = base + level * perLevel
    monstersPerLevel: 0.3,
    maxConcurrent: 9,         // alive at once in the arena (campaign cap is 6)
    waveCount: 3,
    hitsToKillBase: 7,        // monster HP = avg player hit * (base + level * perLevel)
    hitsToKillPerLevel: 0.12,
    waveSpawnStaggerMs: 450,
    waveBreakMs: 1400,
    startHealPct: 0.5,        // life is topped up to at least this share on entry
    startManaPct: 0.6,
    resultBannerMs: 1700,
    // Melee purpose: warded monsters resist spells, phased monsters resist
    // melee, so both attack kinds are needed. Both are HEAVY resistance, not
    // immunity - a pure melee or pure magic build can still grind them down.
    // Wave 1 stays plain.
    wardedSpellReductionPct: 65,
    phasedMeleeReductionPct: 65,
    traitChanceWave2: 0.34,
    traitChanceWave3: 0.55,
    pushbackMult: 0.25,          // share of the normal charge pushback a hit applies in the arena
    pushbackPerSecMax: 0.25,     // hard cap: seconds of attack bar one monster can lose per real second
    manaPerMeleePct: 0.03,       // (unused) strikes no longer refund mana
    manaPerChargePct: 0.04,      // extra at full charge
    comboWindowMs: 2500,         // melee within this long of a spell hit combos
    comboMult: 1.6,
    comboManaPct: 0.04,
    // Difficulty tiers: pick one on the intro card. Higher tiers pay more gold.
    tiers: {
        normal: { countMult: 1,   hpMult: 1.1,  dmgMult: 1.15, gold: 1 },
        hard:   { countMult: 1.3, hpMult: 1.5,  dmgMult: 1.55, gold: 1.6 },
        brutal: { countMult: 1.7, hpMult: 1.8,  dmgMult: 1.7, gold: 2.6 },
    },
    maxMonstersCap: 24,
    // Early-game ease (playtest: world 1-4 gauntlet was "impossible" on a
    // new character). Applies at low monster levels and fades out linearly
    // with the campaign's early-ease window (EG_CAMPAIGN_MONSTER_CONFIG.
    // earlyEaseLevels), so later gauntlets are unchanged.
    earlyCountMult: 0.35,        // monster-count multiplier at monster level 1
    earlyMinMonsters: 4,         // never fewer than this
    earlyConcurrent: 2,          // alive at once at monster level 1 (-> maxConcurrent)
    earlyDamageMult: 0.4,        // extra damage multiplier at monster level 1
    earlyHitsMult: 0.7,          // monster HP (hits to kill) multiplier at level 1
    // Early HP budget (playtest: a level-2 character deals ~36 per Fireball
    // and ~4 melee DPS, with mana for only ~4 casts, yet monsters had ~150
    // HP each - the arena's total HP was far beyond what could be dealt).
    // At low levels the arena's TOTAL monster HP is capped to what the
    // character can realistically deal: a few spell casts plus sustained
    // melee over a short fight. Fades out like the other early eases.
    earlyManaPerKillPct: 0.25,   // share of max mana refunded per kill at monster level 1
    earlySpellCasts: 4,
    earlyMeleeIntervalSec: 4,
    earlyFightSec: 40,
    earlyChampionHpMult: 1.8,    // final-wave champion HP multiplier at level 1
    traitFreeBelowLevel: 6,      // no warded / phased monsters below this level
    // Monster HP follows the player's real power hit (best of projectile,
    // 60% of a charged melee strike and 60% of a spell cast) so spell and
    // melee builds are not facing projectile-sized HP pools.
    powerHitShare: 0.6,
    // Raw monster hit is at least this share of max life (before tier).
    damageHpShare: 0.11,
    goldBase: 30,
    goldPerLevel: 4,
    challengeGoldShare: 0.25,       // extra gold per side challenge, as a share of base
    // Arena modifiers (one random per gauntlet).
    lavaPools: 3,
    lavaRadiusPx: 64,
    lavaTickMs: 700,
    lavaDamageMult: 0.7,
    lavaDriftPxPerSec: 38,          // pools slowly roam the arena (they used to sit still)            // of the campaign monster damage per tick
    shrinkMs: 70000,
    shrinkMinFactor: 0.58,
    shrineRadiusPx: 58,
    shrineHealPct: 0.03,            // of max life per tick
    shrineManaPct: 0.02,
    shrineTickMs: 600,
    shrineMoveMs: 15000,
    // Final-wave champion (mini-boss).
    championHpMult: 3,
    championDmgMult: 1.35,
    // Side challenges.
    swiftBaseMs: 45000,
    swiftPerMonsterMs: 12000,
    bruiserStrikes: 10,
};

// Parry tutorial (tutorial quest, final lesson): a stripped-down arena with
// three unkillable monsters in three different spots. The player only has to
// parry a few attacks by holding the parry key - no kills, no waves, no gold.
export const EG_PARRY_TUTORIAL_CONFIG = {
    targetParries: 5,
    monsterCount: 3,
    zoneIndexes: [1, 5, 7],   // top-centre, bottom-left, bottom-right arena spots
    monsterId: 'rat',
    monsterHp: 10000000,      // effectively unkillable - the lesson is not about killing
    monsterDamage: 3,         // unparried hits only nibble
    keepHpPct: 0.5,           // life is never allowed below this share
    resultBannerMs: 1500,
};

const _g = {
    parryMode: false,
    parries: 0,
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
    tier: 'normal',
    modifier: null,   // 'lava' | 'shrink' | 'shrine'
    hazards: [],      // { x, y } arena-local centres of lava pools / the shrine
    startedAt: 0,
    lastHp: 0,
    damaged: false,
    meleeStrikes: 0,
    lavaAt: 0,
    shrineAt: 0,
    shrineMovedAt: 0,
    traitsThisWave: {},
    totalMonsters: 0,
    championMade: false,
    modPoll: null,
};

//------------------------------------------------------------------------
//-------------------PUBLIC QUERIES---------------------------------------
//------------------------------------------------------------------------

export function _egGauntletActive() {
    return _g.active;
}

// Melee hooks read by encounter-melee-impact.js. Active only inside an arena.
// pre(): damage multiplier (spell-then-melee combo). post(): mana refund.
function _installMeleeHooks() {
    globalThis._egGauntletMeleeHooks = {
        pre(targetId) {
            if (!_g.fighting) return 1;
            const m = (globalThis._egMonsters || []).find(x => x.id === targetId);
            if (!m || !m._lastSpellHitAt) return 1;
            if (Date.now() - m._lastSpellHitAt > EG_GAUNTLET_CONFIG.comboWindowMs) return 1;
            m._lastSpellHitAt = 0;
            return EG_GAUNTLET_CONFIG.comboMult;
        },
        post(targetId, chargePct, wasCombo) {
            if (!_g.fighting) return;
            // Strikes no longer refund mana: mana comes from the character's
            // own regen (gear / passives), same as everywhere else.
            _g.meleeStrikes++;
            void chargePct; void wasCombo;
        },
    };
    // Inside an arena, hits push a monster's attack bar back far less, so
    // spamming melee cannot lock every monster out of attacking.
    // On top of the per-hit scale there is a hard budget per monster per
    // second: tapping E (a weak hit still pushed back a full amount) or
    // standing in an aura (a tick every second on every monster) can then
    // slow an attack bar but never freeze it.
    globalThis._egGauntletPushback = (target, amount) => {
        if (!_g.fighting) return amount;
        const cfg = EG_GAUNTLET_CONFIG;
        const now = Date.now();
        if (!target._gaPbAt || now - target._gaPbAt >= 1000) { target._gaPbAt = now; target._gaPbSpent = 0; }
        const room = Math.max(0, cfg.pushbackPerSecMax - (target._gaPbSpent || 0));
        const give = Math.min(amount * cfg.pushbackMult, room);
        target._gaPbSpent = (target._gaPbSpent || 0) + give;
        return give;
    };
}
_installMeleeHooks();

// True while a real Gauntlet fight is running (not the parry training and not
// the briefing / between-wave moments). Gauntlet-only spells gate on this.
export function _egGauntletFighting() {
    return !!(_g.active && _g.fighting && !_g.parryMode && _g.overlay);
}

// Gauntlet-only spell support: conjures `count` temporary reveal cells on the
// arena floor and fires the normal reveal-projectile volley from them (the
// arena has no puzzle grid, so reveal builds have nothing to reveal here).
// The cells are plain decoration - they never touch the puzzle grid and are
// gone right after the volley. Returns how many cells were created.
const _SUMMON_CELL_PX = 44;
export function _egGauntletSummonRevealCells(count) {
    if (!_egGauntletFighting()) return 0;
    const n = Math.max(1, Math.min(10, Math.round(Number(count) || 1)));
    const arena = _g.overlay;
    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const padX = 40;
    const top = _CARD_BAND_PX + 20;
    const stamp = Date.now();
    const cells = [];
    const placed = [];
    for (let i = 0; i < n; i++) {
        // Rejection-sample a spot that does not overlap an earlier cell.
        let x = 0;
        let y = 0;
        for (let tries = 0; tries < 12; tries++) {
            x = padX + Math.random() * Math.max(1, w - padX * 2 - _SUMMON_CELL_PX);
            y = top + Math.random() * Math.max(1, h - top - 40 - _SUMMON_CELL_PX);
            if (!placed.some(p => Math.abs(p.x - x) < _SUMMON_CELL_PX + 6 && Math.abs(p.y - y) < _SUMMON_CELL_PX + 6)) break;
        }
        placed.push({ x, y });
        const el = document.createElement('div');
        el.id = `ga-summon-cell-${stamp}-${i}`;
        el.className = 'ga-summon-cell';
        el.style.left = `${Math.round(x)}px`;
        el.style.top = `${Math.round(y)}px`;
        el.style.animationDelay = `${i * 40}ms`;
        arena.appendChild(el);
        cells.push(el);
    }
    // Let the cells materialise, then shoot from them and fade them out.
    setTimeout(() => {
        const live = cells.filter(c => c.isConnected).map(c => c.id);
        if (live.length && typeof globalThis._egOnProgrammaticReveal === 'function') {
            globalThis._egOnProgrammaticReveal(live, 'ability');
        }
        cells.forEach(c => c.classList.add('ga-summon-fire'));
        setTimeout(() => cells.forEach(c => c.remove()), 700);
    }, 420);
    return n;
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

// Typical damage of one player action: the larger of an average projectile
// hit, a share of a full-charge melee strike and a share of a spell cast
// (sampled / estimated from the character sheet).
function _avgHit() {
    let sum = 0;
    const n = 6;
    for (let i = 0; i < n; i++) {
        try { sum += Number(_egCalcPlayerDamage()) || 0; } catch (e) { /* sample failed */ }
    }
    const proj = Math.max(5, sum / n);
    let best = proj;
    try {
        const st = _egComputePlayerStats() || {};
        const mid = (a, b) => ((Number(a) || 0) + (Number(b) || 0)) / 2;
        const melee = (mid(st.meleePhysMin, st.meleePhysMax)
            + mid(st.meleeFireMin, st.meleeFireMax) + mid(st.meleeColdMin, st.meleeColdMax)
            + mid(st.meleeLightningMin, st.meleeLightningMax) + mid(st.meleeShadowMin, st.meleeShadowMax))
            * (1 + (Number(st.meleePhysIncPct) || 0) / 100);
        const spell = ((Number(st.spellDamageFlat) || 0) + 22 * (function(){const lv=Number(typeof globalThis._egGetPlayerLevel==='function'?globalThis._egGetPlayerLevel():0)||1;return lv<=50?1:Math.pow(25,Math.min(1,(lv-50)/40));})()) * (1 + (Number(st.spellDamageIncPct) || 0) / 100);
        const share = EG_GAUNTLET_CONFIG.powerHitShare;
        best = Math.max(best, melee * share, spell * share);
    } catch (e) { /* stats optional */ }
    return Math.max(5, best);
}

// HP each monster may have so the whole gauntlet stays within what the
// character can really deal: a few spell casts plus sustained melee.
function _earlyHpBudgetEach() {
    const cfg = EG_GAUNTLET_CONFIG;
    try {
        const st = _egComputePlayerStats() || {};
        const mid = (a, b) => ((Number(a) || 0) + (Number(b) || 0)) / 2;
        const melee = (mid(st.meleePhysMin, st.meleePhysMax)
            + mid(st.meleeFireMin, st.meleeFireMax) + mid(st.meleeColdMin, st.meleeColdMax)
            + mid(st.meleeLightningMin, st.meleeLightningMax) + mid(st.meleeShadowMin, st.meleeShadowMax))
            * (1 + (Number(st.meleePhysIncPct) || 0) / 100);
        const spell = ((Number(st.spellDamageFlat) || 0) + 22 * (function(){const lv=Number(typeof globalThis._egGetPlayerLevel==='function'?globalThis._egGetPlayerLevel():0)||1;return lv<=50?1:Math.pow(25,Math.min(1,(lv-50)/40));})()) * (1 + (Number(st.spellDamageIncPct) || 0) / 100);
        const spellPool = (_g.totalMonsters > 0 ? spell : 0) * cfg.earlySpellCasts;
        const meleePool = Math.max(5, melee) / cfg.earlyMeleeIntervalSec * cfg.earlyFightSec;
        const total = Math.max(1, _g.totalMonsters || 1);
        return (spellPool + meleePool) / total;
    } catch (e) { return 0; }
}

function _tierCfg() {
    return EG_GAUNTLET_CONFIG.tiers[_g.tier] || EG_GAUNTLET_CONFIG.tiers.normal;
}

function _planWaves(level) {
    const cfg = EG_GAUNTLET_CONFIG;
    const early = _egEarlyEaseBlend(level);
    let base = Math.max(cfg.minMonsters, Math.min(cfg.maxMonsters,
        Math.round(cfg.monstersBase + level * cfg.monstersPerLevel)));
    if (early > 0) {
        base = Math.max(cfg.earlyMinMonsters, Math.round(base * (1 - (1 - cfg.earlyCountMult) * early)));
    }
    const total = Math.min(cfg.maxMonstersCap, Math.round(base * _tierCfg().countMult));
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

// Top margin of the walkable floor. The sprite may walk the whole arena up to
// the frame (monster cards simply render behind it).
const _CARD_BAND_PX = 8;

function _layout() {
    if (!_g.overlay) return;
    const r = _arenaRect();
    _g.overlay.style.left = `${r.left}px`;
    _g.overlay.style.top = `${r.top}px`;
    _g.overlay.style.width = `${r.width}px`;
    _g.overlay.style.height = `${r.height}px`;
    // The sprite cannot leave the arena (honoured by _setAvatarPos).
    if (_g.fighting) {
        let b = {
            left: r.left + 6,
            right: r.left + r.width - 6,
            top: r.top + _CARD_BAND_PX,
            bottom: r.top + r.height - 6,
        };
        if (_g.modifier === 'shrink') {
            const cfg = EG_GAUNTLET_CONFIG;
            const k = Math.min(1, (Date.now() - _g.startedAt) / cfg.shrinkMs);
            const f = 1 - (1 - cfg.shrinkMinFactor) * k;
            const cx = (b.left + b.right) / 2;
            const cy = (b.top + b.bottom) / 2;
            const hw = (b.right - b.left) / 2 * f;
            const hh = (b.bottom - b.top) / 2 * f;
            b = { left: cx - hw, right: cx + hw, top: cy - hh, bottom: cy + hh };
            const safe = document.getElementById('ga-safe');
            if (safe) {
                safe.style.left = `${b.left - r.left}px`;
                safe.style.top = `${b.top - r.top}px`;
                safe.style.width = `${b.right - b.left}px`;
                safe.style.height = `${b.bottom - b.top}px`;
            }
        }
        // The avatar wrapper also holds the HP / mana bars above the sprite;
        // the bounds apply to the whole wrapper, so shift them by the bar
        // height so the VISIBLE sprite is what meets the arena border.
        const wrap = document.getElementById('player-avatar-wrapper');
        const img = document.getElementById('avatar-sprite-img');
        if (wrap && img) {
            const wr = wrap.getBoundingClientRect();
            const ir = img.getBoundingClientRect();
            if (ir.height > 0) {
                const topInset = Math.max(0, ir.top - wr.top);
                const bottomInset = Math.max(0, wr.bottom - ir.bottom);
                b = { ...b, top: b.top - topInset, bottom: b.bottom + bottomInset };
            }
        }
        globalThis._egAvatarBounds = b;
    }
}

// ---- arena modifiers ------------------------------------------------------

const _MODIFIERS = ['lava', 'shrink', 'shrine'];

function _modInfo(id) {
    return {
        lava:   { icon: '🌋', en: 'Drifting lava pools burn you - keep clear of them', de: 'Wandernde Lavapfützen verbrennen dich - meide sie' },
        shrink: { icon: '🕳', en: 'The floor shrinks as time passes', de: 'Der Boden schrumpft mit der Zeit' },
        shrine: { icon: '✨', en: 'A healing shrine moves around - stand in it to recover', de: 'Ein Heilschrein wandert umher - steh darin, um dich zu erholen' },
    }[id];
}

function _randomFloorSpot(r, avoidCentre) {
    for (let i = 0; i < 12; i++) {
        const x = r.width * (0.1 + Math.random() * 0.8);
        const y = _CARD_BAND_PX + 30 + Math.random() * Math.max(10, r.height - _CARD_BAND_PX - 80);
        const dx = x - r.width / 2;
        const dy = y - (_CARD_BAND_PX + (r.height - _CARD_BAND_PX) / 2);
        if (!avoidCentre || Math.hypot(dx, dy) > 130) return { x, y };
    }
    return { x: r.width * 0.2, y: _CARD_BAND_PX + 60 };
}

function _setupModifier() {
    const cfg = EG_GAUNTLET_CONFIG;
    const r = _arenaRect();
    _g.hazards = [];
    if (!_g.overlay || !_g.modifier) return;
    if (_g.modifier === 'lava') {
        for (let i = 0; i < cfg.lavaPools; i++) {
            const pos = _randomFloorSpot(r, true);
            const el = document.createElement('div');
            el.className = 'ga-lava';
            el.style.cssText = `left:${pos.x - cfg.lavaRadiusPx}px;top:${pos.y - cfg.lavaRadiusPx}px;width:${cfg.lavaRadiusPx * 2}px;height:${cfg.lavaRadiusPx * 2}px`;
            _g.overlay.appendChild(el);
            const ang = Math.random() * Math.PI * 2;
            _g.hazards.push({
                x: pos.x, y: pos.y, el,
                vx: Math.cos(ang) * cfg.lavaDriftPxPerSec,
                vy: Math.sin(ang) * cfg.lavaDriftPxPerSec,
            });
        }
        _g.lavaMovedAt = Date.now();
    } else if (_g.modifier === 'shrink') {
        const safe = document.createElement('div');
        safe.id = 'ga-safe';
        safe.className = 'ga-safe';
        _g.overlay.appendChild(safe);
    } else if (_g.modifier === 'shrine') {
        const pos = _randomFloorSpot(r, false);
        const el = document.createElement('div');
        el.className = 'ga-shrine';
        el.style.cssText = `left:${pos.x - cfg.shrineRadiusPx}px;top:${pos.y - cfg.shrineRadiusPx}px;width:${cfg.shrineRadiusPx * 2}px;height:${cfg.shrineRadiusPx * 2}px`;
        _g.overlay.appendChild(el);
        _g.hazards.push({ x: pos.x, y: pos.y, el });
        _g.shrineMovedAt = Date.now();
    }
}

function _playerCentreLocal() {
    const a = document.getElementById('player-avatar-wrapper');
    const r = _arenaRect();
    if (!a) return null;
    const b = a.getBoundingClientRect();
    // Lower part of the sprite is what stands on the floor.
    return { x: b.left + b.width / 2 - r.left, y: b.top + b.height * 0.7 - r.top };
}

function _modifierTick() {
    if (!_g.modifier || !_g.fighting) return;
    const cfg = EG_GAUNTLET_CONFIG;
    const now = Date.now();
    const pc = _playerCentreLocal();
    if (!pc) return;
    if (_g.modifier === 'lava') {
        // Pools drift and bounce off the arena edge.
        const dt = Math.min(0.5, Math.max(0, (now - (_g.lavaMovedAt || now)) / 1000));
        _g.lavaMovedAt = now;
        if (dt > 0) {
            const r = _arenaRect();
            const rad = cfg.lavaRadiusPx;
            const minX = rad + 6, maxX = r.width - rad - 6;
            const minY = rad + 40, maxY = r.height - rad - 6;
            _g.hazards.forEach(h => {
                if (!h.vx && !h.vy) return;
                h.x += h.vx * dt;
                h.y += h.vy * dt;
                if (h.x < minX) { h.x = minX; h.vx = Math.abs(h.vx); }
                if (h.x > maxX) { h.x = maxX; h.vx = -Math.abs(h.vx); }
                if (h.y < minY) { h.y = minY; h.vy = Math.abs(h.vy); }
                if (h.y > maxY) { h.y = maxY; h.vy = -Math.abs(h.vy); }
                h.el.style.left = `${h.x - rad}px`;
                h.el.style.top = `${h.y - rad}px`;
            });
        }
        const inLava = _g.hazards.some(h => Math.hypot(h.x - pc.x, h.y - pc.y) <= cfg.lavaRadiusPx);
        if (inLava && now - _g.lavaAt >= cfg.lavaTickMs) {
            _g.lavaAt = now;
            const raw = Math.max(1, Math.round((Number(cur.campaignMonsterDamage) || 5) * cfg.lavaDamageMult));
            _egPlayerTakeDamage(raw, true, 'fire', Number(cur.monsterLevel) || 1, { isEnvironment: true });
        }
    } else if (_g.modifier === 'shrine') {
        const h = _g.hazards[0];
        if (!h) return;
        if (now - _g.shrineMovedAt >= cfg.shrineMoveMs) {
            const pos = _randomFloorSpot(_arenaRect(), false);
            h.x = pos.x; h.y = pos.y; _g.shrineMovedAt = now;
            h.el.style.left = `${pos.x - cfg.shrineRadiusPx}px`;
            h.el.style.top = `${pos.y - cfg.shrineRadiusPx}px`;
        }
        const inside = Math.hypot(h.x - pc.x, h.y - pc.y) <= cfg.shrineRadiusPx;
        h.el.classList.toggle('ga-shrine-active', inside);
        if (inside && now - _g.shrineAt >= cfg.shrineTickMs) {
            _g.shrineAt = now;
            const maxHP = Number(globalThis.playerMaxHP) || 0;
            if (maxHP > 0 && globalThis.playerCurrentHP > 0) {
                globalThis.playerCurrentHP = Math.min(maxHP, globalThis.playerCurrentHP + Math.max(1, Math.round(maxHP * cfg.shrineHealPct)));
                if (typeof globalThis._renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
            }
            if (typeof globalThis.gainMana === 'function') {
                globalThis.gainMana(Math.max(1, Math.round((Number(globalThis.playerMaxMana) || 0) * cfg.shrineManaPct)));
            }
        }
    }
}

// Monster cards are scattered over eight spots across the whole arena
// (positions in gauntlet.css); spawns pick the emptiest spot at random.
const _ZONE_IDS = Array.from({ length: 8 }, (_, i) => `ga-zone-${i}`);

function _buildOverlay() {
    const old = document.getElementById('gauntlet-arena');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'gauntlet-arena';
    el.className = 'gauntlet-arena';
    el.innerHTML = `
        <div class="ga-floor"></div>
        <div class="ga-header">
            <span class="ga-title">${_g.parryMode ? `🛡 ${_tr('PARRY TRAINING', 'PARADE-TRAINING')}` : `⚔ ${_tr('GAUNTLET', 'GAUNTLET')}`}</span>
            <span class="ga-wave" id="ga-wave"></span>
            <span class="ga-left" id="ga-left"></span>
        </div>
        ${_ZONE_IDS.map((id, i) => `<div class="ga-zone ga-zone-${i}" id="${id}"></div>`).join('')}
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
    if (_g.parryMode) {
        const cfgP = EG_PARRY_TUTORIAL_CONFIG;
        if (w) w.textContent = '';
        if (l) l.textContent = `${_tr('Parries', 'Paraden')}: ${Math.min(_g.parries, cfgP.targetParries)}/${cfgP.targetParries}`;
        return;
    }
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
    _g.tier = 'normal';
    _g.modifier = _MODIFIERS[Math.floor(Math.random() * _MODIFIERS.length)];
    _g.meleeStrikes = 0;
    _g.damaged = false;
    _g.waves = _planWaves(lvl);
    _g.totalMonsters = _g.waves.reduce((sum, n) => sum + n, 0);

    _buildOverlay();
    document.body.classList.add('gauntlet-open');
    _hud();
    _renderIntro(lvl);
}

// Entry point for the tutorial's parry lesson. Same arena shell as a gauntlet
// but with no intro card, waves, modifiers or rewards. onDone(success) fires
// once the five parries are in (or the arena is aborted).
export function startParryTutorial(onDone) {
    if (_g.active || !cur) { if (typeof onDone === 'function') onDone(false); return; }
    _g.active = true;
    _g.parryMode = true;
    _g.parries = 0;
    _g.onDone = onDone;
    _g.level = cur;
    _g.wave = 0;
    _g.pending = 0;
    _g.waves = [];
    _g.timers = [];
    _g.modifier = null;
    _g.hazards = [];
    _g.pre = {
        hp: globalThis.playerCurrentHP,
        mana: globalThis.playerCurrentMana,
        hpTarget: cur.campaignMonsterHp,
        dmgTarget: cur.campaignMonsterDamage,
    };
    stopTimer();
    _egCancelSpawnTimers();
    try { _egStopPickupSpawner(); } catch (e) { /* spawner optional */ }
    globalThis._egMonsters = [];
    globalThis._egTargetId = null;
    _egRenderPanel();

    _buildOverlay();
    document.body.classList.add('gauntlet-open');
    _beginParry();
}

function _beginParry() {
    const cfg = EG_PARRY_TUTORIAL_CONFIG;
    _setCenter('');
    const maxHP = Number(globalThis.playerMaxHP) || 0;
    if (maxHP > 0) globalThis.playerCurrentHP = Math.max(globalThis.playerCurrentHP, Math.round(maxHP * 0.8));
    cur.campaignMonsterHp = cfg.monsterHp;
    cur.campaignMonsterDamage = cfg.monsterDamage;
    cur.monsterLevel = 1;
    cur.gauntlet = true;
    globalThis._egGauntletFlag = true;
    globalThis._egGauntletMaxConcurrent = cfg.monsterCount;
    // Held parry always lands here, and every parry is counted.
    globalThis._egParryTutorialForce = true;
    globalThis._egOnPlayerParry = () => {
        if (!_g.parryMode || !_g.fighting) return;
        _g.parries++;
        _hud();
    };

    // Cards render in three fixed arena spots.
    _g.zones = EG_MONSTER_ZONES.slice();
    EG_MONSTER_ZONES.length = 0;
    cfg.zoneIndexes.forEach(i => EG_MONSTER_ZONES.push(_ZONE_IDS[i]));
    _g.fighting = true;

    const avatar = document.getElementById('player-avatar-wrapper');
    _layout();
    if (avatar) {
        const r = _arenaRect();
        const w = avatar.offsetWidth || 128;
        const h = avatar.offsetHeight || 190;
        avatar.style.display = 'flex';
        _setAvatarPos(avatar, r.left + r.width / 2 - w / 2, r.top + _CARD_BAND_PX + (r.height - _CARD_BAND_PX) / 2 - h / 2);
    }

    _g.startedAt = Date.now();
    _g.lastHp = Number(globalThis.playerCurrentHP) || 0;
    globalThis.dead = false;
    _egStartTickLoop();
    _hud();
    _parryTopUp(true);
    _g.poll = setInterval(_tick, 300);
}

// Keeps exactly monsterCount monsters standing (they are not meant to die).
function _parryTopUp(staggered) {
    const cfg = EG_PARRY_TUTORIAL_CONFIG;
    const missing = cfg.monsterCount - _alive() - _g.pending;
    for (let i = 0; i < missing; i++) {
        _g.pending++;
        _later(() => {
            _g.pending = Math.max(0, _g.pending - 1);
            if (!_g.active || !_g.parryMode) return;
            const before = new Set((globalThis._egMonsters || []).map(m => m.id));
            _egSpawnMonster(cfg.monsterId, 1);
            (globalThis._egMonsters || []).forEach(m => { if (!before.has(m.id)) m.noLoot = true; });
        }, staggered ? 400 + i * 600 : 200);
    }
}

function _parryTick() {
    const cfg = EG_PARRY_TUTORIAL_CONFIG;
    // Training can never kill the player: life is held above a floor.
    const maxHP = Number(globalThis.playerMaxHP) || 0;
    const floor = Math.round(maxHP * cfg.keepHpPct);
    if (maxHP > 0 && globalThis.playerCurrentHP < floor) {
        globalThis.playerCurrentHP = floor;
        if (typeof globalThis._renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
    }
    if (_g.parries >= cfg.targetParries) { _finish(true); return; }
    _parryTopUp(false);
}

function _goldFor(lvl, challengesMet) {
    const cfg = EG_GAUNTLET_CONFIG;
    const base = cfg.goldBase + cfg.goldPerLevel * lvl;
    return Math.round(base * _tierCfg().gold * (1 + cfg.challengeGoldShare * challengesMet));
}

function _renderIntro(lvl) {
    const mod = _modInfo(_g.modifier);
    const tierBtn = (id, label) =>
        `<button class="ga-btn ga-tier${_g.tier === id ? ' ga-tier-on' : ''}" data-tier="${id}">${label}</button>`;
    const total = _g.waves.reduce((sum, n) => sum + n, 0);
    _setCenter(`
        <div class="ga-card">
            <div class="ga-card-title">⚔ ${_tr('Gauntlet', 'Gauntlet')}</div>
            <p>${_tr('Defeat every monster to claim the bonus.', 'Besiege jedes Monster, um den Bonus zu erhalten.')}</p>
            <p class="ga-sub">🛡 ${_tr('Warded: use melee', 'Geschützt: Nahkampf nutzen')} · 👻 ${_tr('Phased: use spells', 'Phasend: Zauber nutzen')} · ${_tr('Spell then melee = combo damage', 'Zauber, dann Nahkampf = Kombo-Schaden')}</p>
            <p class="ga-sub ga-mod">${mod.icon} ${_tr(mod.en, mod.de)}</p>
            <p class="ga-sub">👑 ${_tr('A champion leads the final wave', 'Ein Champion führt die letzte Welle an')}</p>
            <div class="ga-tiers">
                ${tierBtn('normal', _tr('Normal', 'Normal'))}
                ${tierBtn('hard', _tr('Hard', 'Schwer'))}
                ${tierBtn('brutal', _tr('Brutal', 'Brutal'))}
            </div>
            <p class="ga-sub">${_g.waves.length} ${_tr('waves', 'Wellen')} · ${total} ${_tr('monsters', 'Monster')} · 💰 ${_goldFor(lvl, 0)}+ ${_tr('gold', 'Gold')} · ${_tr('Dying only forfeits the bonus', 'Sterben verwirft nur den Bonus')}</p>
            <p class="ga-sub">${_tr('Side goals', 'Nebenziele')}: ${_tr('Untouched', 'Unberührt')} · ${_tr('Swift', 'Flink')} · ${_tr('Bruiser (10+ melee hits)', 'Haudegen (10+ Nahkampftreffer)')}</p>
            <div class="ga-actions">
                <button class="ga-btn ga-go" id="ga-go">${_tr('ENTER', 'BETRETEN')}</button>
                <button class="ga-btn ga-skip" id="ga-skip">${_tr('Skip', 'Überspringen')}</button>
            </div>
        </div>`, 'ga-intro');
    const go = document.getElementById('ga-go');
    const skip = document.getElementById('ga-skip');
    if (go) go.addEventListener('click', _begin);
    if (skip) skip.addEventListener('click', () => _finish(false, 'skipped'));
    document.querySelectorAll('.ga-tier').forEach(b => b.addEventListener('click', () => {
        _g.tier = b.dataset.tier;
        _g.waves = _planWaves(lvl);
        _g.totalMonsters = _g.waves.reduce((sum, n) => sum + n, 0);
        _renderIntro(lvl);
        _hud();
    }));
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
    const early = _egEarlyEaseBlend(lvl);
    const hits = (cfg.hitsToKillBase + cfg.hitsToKillPerLevel * lvl) * (1 - (1 - cfg.earlyHitsMult) * early);
    const tier = _tierCfg();
    let hpEach = Math.round(_avgHit() * hits * tier.hpMult);
    if (early > 0) {
        const budgetEach = _earlyHpBudgetEach() * tier.hpMult;
        if (budgetEach > 0 && budgetEach < hpEach) hpEach = Math.round(hpEach - (hpEach - budgetEach) * early);
    }
    cur.campaignMonsterHp = Math.max(EG_CAMPAIGN_MONSTER_CONFIG.minHp, hpEach);
    const curveDamage = EG_CAMPAIGN_MONSTER_CONFIG.damageBase + EG_CAMPAIGN_MONSTER_CONFIG.damagePerLevel * lvl;
    const floorDamage = Math.min(curveDamage * 3, (Number(globalThis.playerMaxHP) || 0) * cfg.damageHpShare);
    const easeDmg = 1 - (1 - cfg.earlyDamageMult) * early;
    cur.campaignMonsterDamage = Math.max(1, Math.round(Math.max(curveDamage, floorDamage) * tier.dmgMult * easeDmg));
    cur.monsterLevel = lvl;
    cur.gauntlet = true;
    globalThis._egGauntletFlag = true;
    globalThis._egGauntletMaxConcurrent = Math.max(1, Math.round(
        cfg.maxConcurrent - (cfg.maxConcurrent - cfg.earlyConcurrent) * early));

    // The arena owns the monster cards: they render in its own zone, so they
    // are visible above the sealed grid instead of behind it.
    _g.zones = EG_MONSTER_ZONES.slice();
    EG_MONSTER_ZONES.length = 0;
    _ZONE_IDS.forEach(z => EG_MONSTER_ZONES.push(z));
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

    _g.startedAt = Date.now();
    _g.lastHp = Number(globalThis.playerCurrentHP) || 0;
    _g.lastAlive = null;
    _setupModifier();

    globalThis.dead = false;
    _egStartTickLoop();
    Audio_Manager.playSFX('boss_arrive');
    _spawnNextWave();
    _g.poll = setInterval(_tick, 300);
    _g.modPoll = setInterval(_modifierTick, 200);
}

// Wave 2+ monsters may roll a counter-trait. At most one warded and one
// phased monster per wave keeps every wave winnable with mixed tools.
function _applyTrait(m) {
    const cfg = EG_GAUNTLET_CONFIG;
    if ((Number(cur && cur.monsterLevel) || 1) < cfg.traitFreeBelowLevel) return;
    const chance = _g.wave >= 3 ? cfg.traitChanceWave3 : (_g.wave === 2 ? cfg.traitChanceWave2 : 0);
    if (!(chance > 0) || m.isBoss || Math.random() >= chance) return;
    const taken = _g.traitsThisWave || (_g.traitsThisWave = {});
    const options = ['warded', 'phased'].filter(t => taken[`${_g.wave}:${t}`] === undefined);
    if (!options.length) return;
    const trait = options[Math.floor(Math.random() * options.length)];
    taken[`${_g.wave}:${trait}`] = m.id;
    m.gauntletTrait = trait;
    if (trait === 'warded') m.spellproofPct = cfg.wardedSpellReductionPct;
    else m.meleeproofPct = cfg.phasedMeleeReductionPct;
    try { _egRenderPanel(); } catch (e) { /* panel optional */ }
}

// Final-wave mini-boss: a much tougher elite with a crown. Not a framework
// boss, so it uses the normal attack / monster-spell loop (elites cast more).
function _makeChampion(m) {
    const cfg = EG_GAUNTLET_CONFIG;
    m.gauntletTrait = 'champion';
    m.isElite = true;
    const earlyChamp = _egEarlyEaseBlend(Number(cur && cur.monsterLevel) || 1);
    const champMult = cfg.championHpMult - (cfg.championHpMult - cfg.earlyChampionHpMult) * earlyChamp;
    m.maxHP = Math.round(m.maxHP * champMult);
    m.currentHP = m.maxHP;
    m.damageValue = Math.round((Number(m.damageValue) || 1) * cfg.championDmgMult);
    m.artScale = Math.max(Number(m.artScale) || 1, 1.35);
    if (m.name) m.name = `👑 ${m.name}`;
    try { _egRenderPanel(); } catch (e) { /* panel optional */ }
}

function _spawnNextWave() {
    if (!_g.active) return;
    const count = _g.waves[_g.wave];
    if (!count) return;
    _g.wave++;
    _g.traitsThisWave = {};
    if (_g.wave === 1) _g.championMade = false;
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
            (globalThis._egMonsters || []).forEach(m => {
                if (before.has(m.id)) return;
                m.noLoot = true;
                if (_g.wave >= _g.waves.length && !_g.championMade) {
                    _g.championMade = true;
                    _makeChampion(m);
                } else {
                    _applyTrait(m);
                }
            });
            _hud();
        }, 500 + i * EG_GAUNTLET_CONFIG.waveSpawnStaggerMs);
    });
    _hud();
}

// The arena is a fixed overlay; full screens (character sheet on B, tree,
// atlas) must sit above it, so it is hidden while one of them is shown.
function _syncArenaVisibility() {
    if (!_g.overlay) return;
    let blocked = false;
    for (const id of ['screen-endgame-hub', 'screen-passive-tree', 'screen-endgame-atlas']) {
        const el = document.getElementById(id);
        if (el && el.style.display && el.style.display !== 'none') { blocked = true; break; }
        if (el && el.classList.contains('active')) { blocked = true; break; }
    }
    _g.overlay.style.visibility = blocked ? 'hidden' : '';
}

function _tick() {
    if (!_g.active) return;
    _syncArenaVisibility();
    // The player left the level / the encounter was torn down: abort quietly.
    if (cur !== _g.level || !_egIsActive()) { _finish(false, 'aborted'); return; }
    if (globalThis.playerCurrentHP <= 0 && !_g.parryMode) { _finish(false, 'defeat'); return; }
    _layout();
    _hud();
    if (_g.parryMode) { _parryTick(); return; }
    const hp = Number(globalThis.playerCurrentHP) || 0;
    if (hp < _g.lastHp - 0.5) _g.damaged = true;
    _g.lastHp = hp;
    // Early-game mana refund: with a ~4-cast pool the character otherwise
    // runs dry mid-fight and is left with a ~4 DPS sword (playtest). Each
    // kill gives mana back; fades out with the other early eases.
    const aliveNow = _alive();
    if (_g.lastAlive != null && aliveNow < _g.lastAlive) {
        const early = _egEarlyEaseBlend(Number(cur && cur.monsterLevel) || 1);
        const maxMana = Number(globalThis.playerMaxMana) || 0;
        if (early > 0 && maxMana > 0) {
            const gain = maxMana * EG_GAUNTLET_CONFIG.earlyManaPerKillPct * early * (_g.lastAlive - aliveNow);
            globalThis.playerCurrentMana = Math.min(maxMana, (Number(globalThis.playerCurrentMana) || 0) + gain);
            try { updateClassHUDManaBar(); } catch (e) { /* HUD optional */ }
        }
    }
    _g.lastAlive = aliveNow;
    if (_g.pending > 0 || aliveNow > 0) return;
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
    if (_g.modPoll) { clearInterval(_g.modPoll); _g.modPoll = null; }
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

    if (reason === 'aborted') {
        _g.parryMode = false;
        globalThis._egParryTutorialForce = false;
        globalThis._egOnPlayerParry = null;
        finish(false);
        return;
    }
    if (reason === 'skipped') { finish(false); return; }

    Audio_Manager.playSFX(success ? 'win' : 'lose');
    let winHtml = '';
    if (success && _g.parryMode) {
        winHtml = `<div class="ga-banner ga-win">🛡 ${_tr('PARRY MASTERED!', 'PARADE GEMEISTERT!')}</div>`;
    } else if (success) {
        const cfg = EG_GAUNTLET_CONFIG;
        const elapsedMs = Date.now() - _g.startedAt;
        const goals = [
            { ok: !_g.damaged, label: _tr('Untouched', 'Unberührt') },
            { ok: elapsedMs <= cfg.swiftBaseMs + cfg.swiftPerMonsterMs * _g.totalMonsters, label: _tr('Swift', 'Flink') },
            { ok: _g.meleeStrikes >= cfg.bruiserStrikes, label: _tr('Bruiser', 'Haudegen') },
        ];
        const metCount = goals.filter(x => x.ok).length;
        const lvlNow = Math.max(1, Number(cur && cur.monsterLevel) || 1);
        const gold = _goldFor(lvlNow, metCount);
        try { _egAddGold(gold); } catch (e) { /* gold optional */ }
        winHtml = `<div class="ga-banner ga-win">⚔ ${_tr('GAUNTLET CLEARED!', 'GAUNTLET GEMEISTERT!')}</div>
            <div class="ga-goals">${goals.map(x => `<span class="${x.ok ? 'ga-goal-ok' : 'ga-goal-no'}">${x.ok ? '✔' : '✖'} ${x.label}</span>`).join('')}
            <span class="ga-gold">💰 +${gold} ${_tr('gold', 'Gold')}</span></div>`;
    }
    _setCenter(success
        ? winHtml
        : `<div class="ga-banner ga-lose">${_tr('Gauntlet failed - bonus lost', 'Gauntlet gescheitert - Bonus verloren')}</div>`,
    'ga-flash ga-result');
    const wasParry = _g.parryMode;
    _g.parryMode = false;
    globalThis._egParryTutorialForce = false;
    globalThis._egOnPlayerParry = null;
    setTimeout(() => finish(success), wasParry ? EG_PARRY_TUTORIAL_CONFIG.resultBannerMs
        : (success ? EG_GAUNTLET_CONFIG.resultBannerMs + 1200 : EG_GAUNTLET_CONFIG.resultBannerMs));
}
