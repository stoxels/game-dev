import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { _uspBuildSupportStatusIconsHTML, _uspSupportStatusSignature } from '../skills/universal-spells.js';
import { cancelHoldCast, isHoldCasting } from '../skills/spell-casttime.js';
import { _egMaybeShowAbsorptionBroken } from './encounter-overlays.js';
import { _egGameOver, _egKillMonster, _egPlayerTakeDamage, _egShowDamageNumber } from './encounter.js';
import { _egGetActiveMapModValue, _egHasActiveMapMod } from '../endgame/endgame-map-launch.js';
import { _egComputePlayerStats } from '../endgame/endgame-player-stats.js';
import { _egIsActive } from './combat-state.js';
import { EG_CRUSH_DURATION_S, _egAilmentDamageMult } from './combat-calculations-resistances.js';
import { _egGainEnduranceCharge, _egGainPowerCharge, _egAddGroundFireAcc, _egGroundFireAcc, _egPlayerStatuses, _egPuzzleEffects, _egPlayerStatusBarTicker, _egReplacePuzzleEffects, _egSetPlayerStatusBarTicker } from './combat-ailments-state.js';

//------------------------------------------------------------------------
//-------------------ELEMENTAL AILMENTS SYSTEM----------------------------
//------------------------------------------------------------------------
// Central runtime system for elemental status effects (ailments).
//
// Combat side:
//   ignite      (fire)      – damage over time; on the player it drains the
//                             absorption shield first, then HP.
//   chill       (cold)      – attack charge bar fills at 50% speed.
//   frozen      (cold)      – legacy player status; cold now uses chill.
//   shocked     (lightning) – target takes +25% damage from all hits.
//   shadow      (shadow)    – cloud/blind effect; reduces hit chance while inside.
//   shadowburn  (shadow)    – legacy damage-over-time status for compatibility.
//
// Puzzle side (applied when a monster shoots the grid centre instead of the
// player - see EG_PUZZLE_ATTACK_CHANCE_PCT):
//   fire      → lava cells: wrong clicks count as 2 mistakes / double penalty
//   cold      → ice cells:  clicks may slip onto a random adjacent cell
//   lightning → shocked cursor: revealing cells may strip ✕ marks nearby
//   shadow    → blackout: one row/column clue line is hidden for a while
//
// Arcane uses confusion: manual correct reveals can rarely hurt the player.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-------------------TUNING CONSTANTS------------------------------------
//------------------------------------------------------------------------

const EG_AIL_TICK_INTERVAL_S = 1.0;     // DoT tick every second
const EG_AIL_IGNITE_DURATION_S = 5;
const EG_AIL_IGNITE_DMG_SHARE = 0.15;   // dps = share of the triggering hit
// Innate on-hit ailment of signature spells (spell id -> ailment + chance %).
const EG_SPELL_INNATE_AILMENT = {
    usp_fireball: { key: 'ignite', pct: 25 },
    usp_ball_lightning: { key: 'shocked', pct: 25 },
};
// Bleed mirrors ignite one-to-one: a physical damage-over-time status with
// the same base duration and damage share. Like cold hits innately chill,
// physical hits innately bleed (see _egRollPlayerHitAilments and
// _egRollMonsterHitAilment) - the tithe tree nodes scale both durations.
const EG_AIL_BLEED_DURATION_S = 5;
const EG_AIL_BLEED_DMG_SHARE = 0.15;    // dps = share of the triggering hit
const EG_PHYS_INNATE_BLEED_CHANCE_PCT = 10;   // physical hits bleed even w/o mods
// Poison is the SHADOW damage-over-time status (PoE's chaos poison). It has
// no innate chance: only the passive tree's poisonChanceAttackPct causes it,
// and it deals a share of the hit's SHADOW damage, so a hit with no shadow
// share can never poison. Monsters can poison the player too: a monster hit
// that carries shadow damage rolls poison on the player (see
// _egRollMonsterHitAilment); it burns straight from HP like Shadow Burn.
const EG_AIL_POISON_DURATION_S = 5;
const EG_AIL_POISON_DMG_SHARE = 0.15;    // dps = share of the hit's shadow damage
const EG_AIL_BLEED_MOVING_MULT = 3;     // bleed on the player: +200% while moving

// True while any movement key is held (same signal the boss mechanics use).
function _egIsAvatarMoving() {
    const st = globalThis._avatarMoveState;
    return !!(st && st.held && st.held.size > 0);
}
const EG_AIL_CHILL_DURATION_S = 8;
const EG_AIL_CHARGE_SLOW_MULT = 0.5;    // chilled attack bar fills at 50%
const EG_AIL_FROZEN_DURATION_S = 0;     // player freeze removed; retained for compatibility
const EG_AIL_SHOCK_DURATION_S = 5;
const EG_AIL_SHOCK_AMP_PCT = 25;        // +damage taken while shocked
const EG_AIL_SHADOWBURN_DURATION_S = 4;
const EG_AIL_SHADOWBURN_DMG_SHARE = 0.2;
const EG_AIL_POLYMORPH_DURATION_S = 6;  // legacy conversion status
const EG_AIL_SHADOW_DURATION_S = 6;
const EG_AIL_BLIND_HIT_CHANCE = 0.7;
const EG_AIL_CONFUSION_DURATION_S = 6;
const EG_AIL_BLIND_DURATION_S = 4;           // monster blinded by the player's hits
const EG_AIL_CONFUSION_SELF_HIT_CHANCE = 0.08;
const EG_AIL_PLAYER_FIRE_DROP_INTERVAL_MS = 1000;
const EG_AIL_PLAYER_GROUND_DURATION_MS = 5000;
const EG_AIL_PLAYER_FIRE_GROUND_DMG_PCT = 8;   // % of playerMaxHP per second while standing in burning ground (fire resistance mitigates)
const EG_AIL_PLAYER_FIRE_GROUND_TICK_S = 1.0;
const EG_AIL_PLAYER_FIRE_RADIUS_PX = 41;       // matches .eg-player-ground-fire 82px circle
const EG_AIL_PLAYER_SHADOW_RADIUS_PX = 55;     // approximate radius for shadow cloud (150x85 ellipse)

const EG_MONSTER_AILMENT_CHANCE_PCT = 15;     // monster hit → player ailment
const EG_COLD_INNATE_CHILL_CHANCE_PCT = 10;   // cold hits chill even w/o mods
const EG_AIL_MIN_DOT_DAMAGE = 2;              // floor for DoT ticks

// Puzzle-side tuning
const EG_PUZZLE_ATTACK_CHANCE_PCT = 5;        // monster attack → grid instead of player
const EG_PUZZLE_EFFECT_DURATION_MS = 10000;
const EG_PUZZLE_HAZARD_CELLS = 6;             // lava / ice patch size
const EG_ICE_SLIP_CHANCE = 0.4;               // click slips to a neighbour
const EG_SHOCK_MARK_STRIP_CHANCE = 0.35;      // per reveal, strips a random ✕ anywhere

const EG_AILMENT_ICONS = {
    ignite: '🔥',
    bleed: '🩸',
    poison: '☠️',
    chill: '❄️',
    frozen: '🧊',
    shocked: '⚡',
    shadowburn: '🌑',
    shadow: '☁️',
    polymorph: '🌀',
    confused: '❓',
    blind: '🕶️',
    stunned: '💫',
};

// The display name of an ailment. Only shadowburn needs the mapping (it is
// one word in the data and two on screen); everything else title-cases.
// Tooltip text for a player status chip: the name, plus what makes it special.
function _egPlayerAilmentTip(key) {
    const st = _egPlayerStatuses[key];
    const lvl = st && st.srcLevel ? ` (Lv ${st.srcLevel})` : '';
    if (key === 'bleed') return `${_egAilmentLabel(key)}${lvl} - deals x${EG_AIL_BLEED_MOVING_MULT} damage while you move`;
    return `${_egAilmentLabel(key)}${lvl}`;
}

function _egAilmentLabel(key) {
    if (key === 'shadowburn') return 'Shadow Burn';
    return String(key || '').charAt(0).toUpperCase() + String(key || '').slice(1);
}

//------------------------------------------------------------------------
//-------------------RUNTIME STATE---------------------------------------
//------------------------------------------------------------------------



//------------------------------------------------------------------------
//-------------------GENERIC STATUS HELPERS------------------------------
//------------------------------------------------------------------------

function _egHasStatus(statusMap, key) {
    const st = statusMap[key];
    return !!(st && st.until > Date.now());
}

function _egApplyStatusToMap(statusMap, key, durationS, dps) {
    // DEV_EFFECT_TIME_SCALE (dev testing harness, see js/dev/dev-testing.js):
    // ×1 = exact shipped behaviour. Scaled centrally so every ailment
    // (player + monster) becomes observable in tests at once.
    const scale = (typeof window !== 'undefined' && window.DEV_EFFECT_TIME_SCALE > 0 && window.DEV_EFFECT_TIME_SCALE !== 1)
        ? window.DEV_EFFECT_TIME_SCALE : 1;
    statusMap[key] = {
        until: Date.now() + durationS * scale * 1000,
        totalMs: durationS * scale * 1000,   // banner bar fill reference
        dps: dps || 0,
        acc: (statusMap[key] && statusMap[key].until > Date.now()) ? (statusMap[key].acc || 0) : 0,
    };
}

// Applies an ailment to a monster (or refreshes an existing one).
function _egApplyMonsterAilment(monster, key, dps) {
    if (!monster) return;
    // Active map run: monsters may avoid ailments entirely (PoE purity).
    if ((monster.avoidAilmentPct || 0) > 0 && Math.random() * 100 < monster.avoidAilmentPct) return;
    if (!monster.statuses) monster.statuses = {};
    let durationS = ({
        ignite: EG_AIL_IGNITE_DURATION_S,
        bleed: EG_AIL_BLEED_DURATION_S,
        poison: EG_AIL_POISON_DURATION_S,
        chill: EG_AIL_CHILL_DURATION_S,
        frozen: EG_AIL_FROZEN_DURATION_S,
        shocked: EG_AIL_SHOCK_DURATION_S,
        shadowburn: EG_AIL_SHADOWBURN_DURATION_S,
        shadow: EG_AIL_SHADOW_DURATION_S,
        polymorph: EG_AIL_POLYMORPH_DURATION_S,
        confused: EG_AIL_CONFUSION_DURATION_S,
        blind: EG_AIL_BLIND_DURATION_S,
    })[key];
    if (!durationS) return;
    // Passive tree: per-ailment duration for YOUR ailments on enemies
    // (tithe batch, e.g. reworked nodes 30252/30253). Only ignite and bleed
    // have tree channels; every other ailment keeps its base duration.
    let bleedSpeedPct = 0;
    if (key === 'ignite' || key === 'bleed' || key === 'poison') {
        let pct = 0;
        try {
            const ps = (typeof _egComputePlayerStats === 'function') ? _egComputePlayerStats() : {};
            pct = Number(key === 'ignite' ? ps.igniteDurationPct : key === 'poison' ? ps.poisonDurationPct : ps.bleedDurationPct) || 0;
            bleedSpeedPct = Math.max(0, (key === 'bleed' ? Number(ps.bleedSpeedPct) || 0 : 0)
                + (Number(ps.dotFasterPct) || 0) + (key === 'ignite' ? Number(ps.igniteFasterPct) || 0 : 0));
        } catch (e) { pct = 0; }
        if (pct > 0) durationS = durationS * (1 + pct / 100);
    }
    // Phase C-1: Shock / Chill / Freeze / Blind durations (tree lines).
    if (key === 'shocked' || key === 'chill' || key === 'frozen' || key === 'blind') {
        try {
            const px = _egComputePlayerStats();
            const extra = key === 'shocked' ? px.shockDurationPct : key === 'chill' ? px.chillDurationPct
                : key === 'frozen' ? (Number(px.chillDurationPct) || 0) + (Number(px.freezeDurationPct) || 0) : px.blindDurationPct;
            if ((Number(extra) || 0) > 0) durationS *= 1 + extra / 100;
        } catch (e) { /* base duration */ }
    }
    if (key === 'shocked') globalThis._egLastShockAt = Date.now();
    // "More Damage" multipliers (nodes 30355/95 ignite, 30306/30309 bleed):
    // scale the stored damage-per-second once, when the ailment is applied.
    if (dps > 0 && (key === 'ignite' || key === 'bleed' || key === 'poison')) {
        try {
            dps = dps * _egAilmentDamageMult(key, _egComputePlayerStats());
        } catch (e) { /* stats unavailable - base damage */ }
    }
    // Bleed speed (nodes 30283/251): the same number of ticks of the same
    // size, just faster - total damage is unchanged, the duration shrinks.
    // The 0.1s slack keeps the final tick from racing the expiry.
    const speedMult = 1 + bleedSpeedPct / 100;
    if (speedMult > 1) durationS = durationS / speedMult + 0.1;
    // Crimson Dance: Bleeding deals less damage but stacks up to N times on one enemy
    // (every stack adds its damage per second; the duration refreshes).
    let bleedStacks = 1;
    if (key === 'bleed') {
        try {
            const bs = _egComputePlayerStats();
            const less = Math.min(95, Math.max(0, Number(bs.bleedLessPct) || 0));
            if (less > 0) dps *= 1 - less / 100;
            const stackMax = Math.floor(Number(bs.bleedStackMax) || 0);
            const ex = monster.statuses.bleed;
            if (stackMax > 1 && ex && ex.until > Date.now()) {
                const c = ex.stacks || 1;
                if (c < stackMax) { dps = (ex.dps || 0) + dps; bleedStacks = c + 1; }
                else { dps = ex.dps || dps; bleedStacks = c; }
            }
        } catch (e) { /* base bleed */ }
    }
    // New application only: refreshes of the same ailment stay silent.
    const wasActive = _egHasStatus(monster.statuses, key);
    _egApplyStatusToMap(monster.statuses, key, durationS, dps);
    if (!wasActive) {
        if (key === 'frozen') Audio_Manager.playSFX('monster_frozen');
        else if (key === 'blind') Audio_Manager.playSFX('monster_blinded');
        else if (key === 'confused') Audio_Manager.playSFX('monster_confused');
    }
    if (key === 'bleed' && monster.statuses.bleed) monster.statuses.bleed.stacks = bleedStacks;
    if (speedMult > 1) monster.statuses[key].tickS = EG_AIL_TICK_INTERVAL_S / speedMult;
    // No application blip on the monster side: elemental hits re-roll and
    // refresh ailments on every strike, so a per-hit cue (ignite especially)
    // reads as noise during fast auto-attacks. The per-second DoT tick and
    // status icons still carry the feedback. (Monster → player applications
    // in _egApplyPlayerAilment below keep their warning cue.)
}

// Freezes EVERY living monster for durationS seconds (Frozen Assets: Absolute
// Zero). A frozen monster's attack charge bar stops (see
// _egGetMonsterChargeMultiplier). Monsters that avoid ailments may resist it.
function _egFreezeAllMonsters(durationS) {
    const list = globalThis._egMonsters || [];
    let froze = false;
    for (const m of list) {
        if (!m || !(m.currentHP > 0)) continue;
        if ((m.avoidAilmentPct || 0) > 0 && Math.random() * 100 < m.avoidAilmentPct) continue;
        if (!m.statuses) m.statuses = {};
        _egApplyStatusToMap(m.statuses, 'frozen', durationS, 0);
        froze = true;
    }
    if (froze) Audio_Manager.playSFX('monster_frozen');
}

// Applies an ailment to the player (or refreshes an existing one).
//------------------------------------------------------------------------
//-------------------PLAYER STUN------------------------------------------
//------------------------------------------------------------------------
// A heavy hit (>= EG_AIL_STUN_MIN_RATIO of max Life after mitigation) can stun
// the hero; effects can also force a stun (opts.stun on the damage call or
// _egStunPlayer directly). Stunned: the melee charge bar and holds are
// interrupted and spells cannot be cast for EG_AIL_STUN_DURATION_S. Stun
// avoidance (stunAvoidPct) can negate it, and "Stun and Block Recovery"
// (blockRecoveryPct) shortens it. A short immunity prevents stun-locking.
const EG_AIL_STUN_DURATION_S = 1.0;
const EG_AIL_STUN_IMMUNE_MS = 1500;
const EG_AIL_STUN_MIN_RATIO = 0.08;
const EG_AIL_STUN_CHANCE_PER_LIFE_PCT = 2;
const EG_AIL_STUN_MAX_CHANCE_PCT = 60;
let _egStunImmuneUntil = 0;

// Pure: stun chance (%) of a hit that took `lost` of `maxHP` Life.
function _egStunChanceFromHit(lost, maxHP) {
    if (!(maxHP > 0) || !(lost > 0)) return 0;
    const ratio = lost / maxHP;
    if (ratio < EG_AIL_STUN_MIN_RATIO) return 0;
    return Math.min(EG_AIL_STUN_MAX_CHANCE_PCT, ratio * 100 * EG_AIL_STUN_CHANCE_PER_LIFE_PCT);
}

function _egStunPlayer(durationS = EG_AIL_STUN_DURATION_S) {
    if (!_egIsActive()) return false;
    // Unwavering Stance: cannot be Stunned.
    try { if ((Number(_egComputePlayerStats().cannotBeStunned) || 0) > 0) return false; } catch (e) { /* not immune */ }
    const now = Date.now();
    if (_egPlayerHasAilment('stunned') || now < _egStunImmuneUntil) return false;
    let st = {};
    try { st = _egComputePlayerStats(); } catch (e) { st = {}; }
    const avoid = Math.min(90, Math.max(0, Number(st.stunAvoidPct) || 0));
    if (avoid > 0 && Math.random() * 100 < avoid) return false;
    const recovery = 1 + Math.max(0, Number(st.blockRecoveryPct) || 0) / 100;
    const d = Math.max(0.3, durationS / recovery);
    _egStunImmuneUntil = now + d * 1000 + EG_AIL_STUN_IMMUNE_MS;
    _egApplyStatusToMap(_egPlayerStatuses, 'stunned', d);
    _egStartPlayerStatusBarTicker();
    // Interrupt: the charge bar restarts and a running hold-cast is lost.
    globalThis._egPlayerCurrentCharge = 0;
    globalThis._egPlayerCurrentCharge2 = 0;
    globalThis._egPlayerStunnedUntil = now + d * 1000;
    try { if (typeof isHoldCasting === 'function' && isHoldCasting()) cancelHoldCast(); } catch (e) { /* best-effort */ }
    Audio_Manager.playSFX('ail_stun');
    return true;
}

// Called after a hit's Life damage lands: rolls the damage-based stun.
function _egRollPlayerStunFromHit(lost) {
    const chance = _egStunChanceFromHit(lost, globalThis.playerMaxHP);
    if (chance > 0 && Math.random() * 100 < chance) _egStunPlayer();
}

// Level of the monster whose hit is being resolved right now (set around
// _egRollMonsterHitAilment). Hazards and boss mechanics that apply ailments
// outside a monster hit fall back to the encounter's monster level.
let _egAilSrcLevel = 0;
function _egAilmentSourceLevel() {
    if (_egAilSrcLevel > 0) return _egAilSrcLevel;
    try {
        if (typeof globalThis._egGetEncounterBaseLevel === 'function') return Math.max(1, Number(globalThis._egGetEncounterBaseLevel()) || 1);
    } catch (e) { /* fall through */ }
    return 1;
}

// Cleansing: removes the listed ailments from the player when the monster
// that inflicted them was at most `maxLevel`. Higher-level ailments stay
// (and are reported as blocked). `dryRun` only reports.
// Returns { removed: [keys], blocked: [{ key, level }] }.
export function _egCleansePlayerAilments(keys, maxLevel, dryRun) {
    const now = Date.now();
    const removed = [];
    const blocked = [];
    (keys || []).forEach(key => {
        const st = _egPlayerStatuses[key];
        if (!st || !(st.until > now)) return;
        const lvl = Number(st.srcLevel) || 1;
        if (lvl <= maxLevel) removed.push(key);
        else blocked.push({ key, level: lvl });
    });
    if (!dryRun) removed.forEach(key => { _egPlayerStatuses[key].until = now - 1; });
    return { removed, blocked };
}

function _egApplyPlayerAilment(key, dps) {
    // Shadow Inoculation: immune to Shadow damage, so shadow-type ailments never land.
    if (key === 'shadow' || key === 'shadowburn' || key === 'poison') {
        try { if ((Number(_egComputePlayerStats().shadowImmune) || 0) > 0) return; } catch (e) { /* not immune */ }
    }
    const durationS = ({
        ignite: EG_AIL_IGNITE_DURATION_S,
        bleed: EG_AIL_BLEED_DURATION_S,
        poison: EG_AIL_POISON_DURATION_S,
        chill: EG_AIL_CHILL_DURATION_S,
        frozen: EG_AIL_FROZEN_DURATION_S,
        shocked: EG_AIL_SHOCK_DURATION_S,
        shadowburn: EG_AIL_SHADOWBURN_DURATION_S,
        shadow: EG_AIL_SHADOW_DURATION_S,
        polymorph: EG_AIL_POLYMORPH_DURATION_S,
        confused: EG_AIL_CONFUSION_DURATION_S,
    })[key];
    if (!durationS) return;
    // Active map run: "Ailments on you last #% longer".
    let scaled = durationS;
    if (typeof _egGetActiveMapModValue === 'function') {
        const longerPct = _egGetActiveMapModValue('map_longer_ailments');
        if (longerPct > 0) scaled = durationS * (1 + Math.min(100, longerPct) / 100);
    }
    const playerStats = typeof _egComputePlayerStats === 'function' ? _egComputePlayerStats() : {};
    const durationPct = Math.max(0, playerStats.ailmentDurationPct || 0);
    if (durationPct > 0) scaled *= 1 + durationPct / 100;
    // Tree: reduced ailment duration on you (all / ignite / freeze).
    const takenRed = (Number(playerStats.ailmentDurationTakenPct) || 0)
        + (key === 'ignite' ? Number(playerStats.igniteDurationTakenPct) || 0 : 0)
        + (key === 'frozen' ? Number(playerStats.freezeDurationTakenPct) || 0 : 0);
    if (takenRed > 0) scaled *= Math.max(0.1, 1 - Math.min(90, takenRed) / 100);
    // Remember the inflicting monster's level (a refresh can only raise it
    // while the ailment is still running), so cleansing spells can compare.
    const prevSt = _egPlayerStatuses[key];
    const prevLevel = (prevSt && prevSt.until > Date.now()) ? (Number(prevSt.srcLevel) || 0) : 0;
    _egApplyStatusToMap(_egPlayerStatuses, key, scaled, dps);
    _egPlayerStatuses[key].srcLevel = Math.max(prevLevel, _egAilmentSourceLevel());
    const ailSfx = ({ ignite: 'ail_ignite', bleed: 'ail_bleed', poison: 'ail_poison', chill: 'ail_chill',
        frozen: 'ail_freeze', shocked: 'ail_shock', shadowburn: 'ail_shadowburn', shadow: 'ail_shadow',
        polymorph: 'ail_polymorph', confused: 'ail_confuse' })[key];
    if (ailSfx) Audio_Manager.playSFX(ailSfx);
    _egStartPlayerStatusBarTicker();
    if (key === 'ignite') _egStartPlayerFireDrops();
    if (key === 'shadow') _egStartPlayerShadowClouds();
}


//------------------------------------------------------------------------
//-------------------PLAYER STATUS BAR (above inventory)------------------
//------------------------------------------------------------------------
// Shared bar above the inventory strip. Shows a chip per active player
// ailment (icon + live countdown); the block-recovery chip is appended by
// endgame-encounter.js into the same bar.
//------------------------------------------------------------------------

// 100 ms ticker that refreshes ailment chip countdowns.

// Creates (or returns) the shared player status bar container.
function _egEnsurePlayerStatusBar() {
    let bar = document.getElementById('eg-player-status-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'eg-player-status-bar';
        document.body.appendChild(bar);
    }
    return bar;
}

function _egStartPlayerStatusBarTicker() {
    if (_egPlayerStatusBarTicker) return;
    _egSetPlayerStatusBarTicker(setInterval(_egRenderPlayerAilmentChips, 100));
    _egRenderPlayerAilmentChips();
}

// Syncs the ailment chips with _egPlayerStatuses; stops itself when empty.
function _egRenderPlayerAilmentChips() {
    if (!_egIsActive()) { _egStopPlayerStatusBarTicker(); return; }
    _egSyncAilmentBanners();

    const bar = document.getElementById('eg-player-status-bar');
    if (!bar) {
        if (!Object.keys(_egPlayerStatuses).length) { _egStopPlayerStatusBarTicker(); return; }
        _egEnsurePlayerStatusBar();
        return;
    }

    const now = Date.now();
    let anyActive = false;
    for (const key of Object.keys(_egPlayerStatuses)) {
        const st = _egPlayerStatuses[key];
        const remainingMs = st.until - now;
        let chip = document.getElementById(`eg-status-ail-${key}`);

        if (remainingMs <= 0) {
            if (chip) chip.remove();
            continue;
        }
        anyActive = true;

        if (!chip) {
            chip = document.createElement('div');
            chip.id = `eg-status-ail-${key}`;
            chip.className = `eg-status-chip eg-status-chip-${key}`;
            chip.setAttribute('data-tip', globalThis._tipAttr(_egPlayerAilmentTip(key)));
            chip.innerHTML = `
                <div class="eg-lockout-icon">${EG_AILMENT_ICONS[key] || ''}</div>
                <div class="eg-lockout-countdown"></div>`;
            bar.appendChild(chip);
        }
        const cd = chip.querySelector('.eg-lockout-countdown');
        if (cd) cd.textContent = `${Math.ceil(remainingMs / 1000)}`;
    }

    if (!anyActive && !document.getElementById('eg-block-lockout-overlay')) {
        _egStopPlayerStatusBarTicker();
    }
}

function _egStopPlayerStatusBarTicker() {
    if (_egPlayerStatusBarTicker) {
        clearInterval(_egPlayerStatusBarTicker);
        _egSetPlayerStatusBarTicker(null);
    }
    const bar = document.getElementById('eg-player-status-bar');
    if (bar) bar.remove();
    const banners = document.getElementById('eg-ail-banners');
    if (banners) banners.remove();
    _egSyncPlayerSpriteFx([]);
}

// True while the player is polymorphed: monsters attack each other and the
// player's charged reveal shots hit themself.
function _egIsPolymorphActive() {
    if (!_egIsActive()) return false;
    return _egPlayerHasAilment('polymorph');
}

// Picks a random OTHER living monster for polymorph friendly fire.
// Returns the monster object or null when alone (then attacks land normally).
function _egGetPolymorphVictim(attackerId) {
    const others = globalThis._egMonsters.filter(m => m.id !== attackerId && m.currentHP > 0);
    if (others.length === 0) return null;
    return others[Math.floor(Math.random() * others.length)];
}

function _egPlayerHasAilment(key) {
    return _egHasStatus(_egPlayerStatuses, key);
}

// Charge-bar rate multiplier for the PLAYER (chill/frozen).
function _egGetPlayerChargeMultiplier() {
    if (!_egIsActive()) return 1;
    if (_egPlayerHasAilment('frozen') || _egPlayerHasAilment('stunned')) return 0;
    // Active map run: a permanent icy aura chills the player.
    if (typeof _egHasActiveMapMod === 'function' && _egHasActiveMapMod('map_chilling_aura')) {
        return EG_AIL_CHARGE_SLOW_MULT;
    }
    if (_egPlayerHasAilment('chill')) {
        let red = 0;
        try { const ps = _egComputePlayerStats(); red = (Number(ps.chillEffectTakenPct) || 0) + (Number(ps.chillShockTakenPct) || 0); } catch (e) { red = 0; }
        return 1 - (1 - EG_AIL_CHARGE_SLOW_MULT) * Math.max(0, 1 - Math.min(90, red) / 100);
    }
    return 1;
}

// Charge-bar rate multiplier for a MONSTER (chill/frozen, plus Brutus's
// sacrificial-feed haste: every zombie a ground slam devours stacks a
// charge-up REDUCTION on Brutus for 15s, making his attack bar fill faster).
function _egGetMonsterChargeMultiplier(m) {
    let mult = 1;
    if (!m || !m.statuses) {
        // no statuses - fall through so the feed haste below still applies
    } else if (_egHasStatus(m.statuses, 'frozen')) {
        mult = 0;
    } else if (_egHasStatus(m.statuses, 'chill')) {
        // Passive tree "increased Effect of Chill": a stronger slow on enemies.
        let eff = 0;
        try { const ps = _egComputePlayerStats(); eff = Math.max(0, (Number(ps.chillEffectIncPct) || 0) + (Number(ps.ailmentEffectTreePct) || 0)); } catch (e) { eff = 0; }
        mult = Math.max(0.1, 1 - (1 - EG_AIL_CHARGE_SLOW_MULT) * (1 + eff / 100));
    }
    if (mult > 0 && typeof _egBossFeedChargeMult === 'function') {
        const feed = globalThis._egBossFeedChargeMult(m);
        if (feed > 0) mult *= feed;
    }
    return mult;
}

// +shock damage-taken amplification for a MONSTER target.
function _egApplyAilmentShockAmpOnMonster(target, amount) {
    if (!target || !target.statuses || !_egHasStatus(target.statuses, 'shocked')) return amount;
    let eff = 0;
    try { const ps = _egComputePlayerStats(); eff = (Number(ps.shockEffectPct) || 0) + (Number(ps.ailmentEffectTreePct) || 0); } catch (e) { eff = 0; }
    return amount * (1 + EG_AIL_SHOCK_AMP_PCT * (1 + Math.max(0, eff) / 100) / 100);
}

// +shock damage-taken amplification for the PLAYER.
function _egPlayerHitChanceMultiplier() {
    return _egPlayerHasAilment('shadow') && _egIsPlayerInsideCloud() ? EG_AIL_BLIND_HIT_CHANCE : 1;
}

function _egApplyPlayerShockAmp(amount) {
    if (!_egIsActive()) return amount;
    if (!_egPlayerHasAilment('shocked')) return amount;
    let red = 0;
    try { const ps = _egComputePlayerStats(); red = (Number(ps.shockEffectTakenPct) || 0) + (Number(ps.chillShockTakenPct) || 0); } catch (e) { red = 0; }
    return amount * (1 + EG_AIL_SHOCK_AMP_PCT * Math.max(0, 1 - Math.min(90, red) / 100) / 100);
}


//------------------------------------------------------------------------
//-------------------IMPALE (HEAVY WEAPONS)-------------------------------
//------------------------------------------------------------------------
// Heavy-weapon batch (reworked nodes 30268 / 240 / 8). A melee hit made
// with a Heavy (two-handed) weapon can impale the enemy: the impale stores
// EG_IMPALE_STORE_SHARE of that hit's physical damage. While it lasts, EVERY
// hit on the enemy deals the stored amount again as extra physical damage
// and uses up one of EG_IMPALE_MAX_HITS charges; it also ends after
// EG_IMPALE_DURATION_S seconds. One impale per enemy - a new one replaces
// the old (its charges and timer restart). Impale is not an ailment: it is
// never blocked by ailment avoidance and has no status chip, only the
// "Impaled!" label the caller shows when a new one lands.
const EG_IMPALE_DURATION_S = 8;
const EG_IMPALE_MAX_HITS = 5;
const EG_IMPALE_STORE_SHARE = 0.10;

// Called from _egDamageTargetById once the hit's final amount is known
// (after resistances / shock amplification). Returns the amount to apply:
// the hit itself plus any stored impale damage it triggers. The impale a hit
// inflicts stores the hit's own damage, never the extra it just triggered,
// and a hit can't trigger the impale it creates.
// Bitter Frost: a chilled target takes extra Cold damage equal to the Chill effect
// (the % slow of its attack bar, scaled by the chill-effect lines).
function _egChilledColdTakenMult(target, stats, coldShare) {
    if (!target || !target.statuses || !_egHasStatus(target.statuses, 'chill')) return 1;
    const eff = Math.max(0, (Number(stats.chillEffectIncPct) || 0) + (Number(stats.ailmentEffectTreePct) || 0));
    const slowPct = Math.min(90, (1 - EG_AIL_CHARGE_SLOW_MULT) * 100 * (1 + eff / 100));
    return 1 + (slowPct / 100) * coldShare;
}

function _egApplyImpaleToHit(target, amount, elements, opts) {
    if (!target || !(amount > 0)) return amount;
    const now = Date.now();
    let out = amount;
    if (target.impale && (target.impale.until <= now || target.impale.hits <= 0)) target.impale = null;
    if (target.impale) {
        out += target.impale.stored;
        target.impale.hits -= 1;
        if (target.impale.hits <= 0) target.impale = null;
    }

    if (!(opts && opts.isMelee)) return out;
    const stats = _egComputePlayerStats();
    if (!stats.isHeavyWeaponEquipped) return out;
    const chancePct = Math.min(100, Number(stats.impaleChanceHeavyPct) || 0);
    if (!(chancePct > 0) || Math.random() * 100 >= chancePct) return out;
    // The Impaler: a freshly impaled enemy cannot be impaled again for a few seconds.
    if ((Number(target.impaleLockUntil) || 0) > now) return out;

    // Physical share = whatever the elemental shares leave over (same rule
    // the innate bleed roll below uses).
    const el = elements || {};
    const physical = Math.max(0, amount - (el.fire || 0) - (el.cold || 0) - (el.lightning || 0) - (el.shadow || 0));
    if (!(physical > 0)) return out;

    const effectPct = (Number(stats.impaleEffectHeavyPct) || 0)
        + (target.impale ? 0 : (Number(stats.impaleEffectFreshPct) || 0));
    const durationPct = Math.max(0, Number(stats.impaleDurationPct) || 0);
    const impaleExtra = Math.max(0, Math.floor(Number(stats.impaleExtra) || 0));
    target.impale = {
        stored: Math.max(1, Math.round(physical * EG_IMPALE_STORE_SHARE * (1 + effectPct / 100))),
        hits: EG_IMPALE_MAX_HITS + impaleExtra,
        until: now + EG_IMPALE_DURATION_S * (1 + durationPct / 100) * 1000,
    };
    const lockS = Math.max(0, Number(stats.impaleLockout) || 0);
    if (lockS > 0) target.impaleLockUntil = now + lockS * 1000;
    // The Impaler: the impale also lands on the other enemies in the same area.
    if ((Number(stats.impaleSpread) || 0) > 0 && Array.isArray(globalThis._egMonsters)) {
        globalThis._egMonsters.forEach((m) => {
            if (!m || m === target || m.id === target.id || m.currentHP <= 0 || m.zoneId !== target.zoneId) return;
            if ((Number(m.impaleLockUntil) || 0) > now) return;
            m.impale = Object.assign({}, target.impale);
            if (lockS > 0) m.impaleLockUntil = now + lockS * 1000;
        });
    }
    return out;
}

// Intimidate (node 125): a melee hit may intimidate the enemy for
// EG_INTIMIDATE_DURATION_S seconds; while it lasts, melee hits against it
// deal intimidateMeleeAmpPct % more damage (the node's second line).
export const EG_INTIMIDATE_DURATION_S = 10;

// Amplifies a melee hit on an intimidated enemy. Non-melee and
// un-intimidated hits pass through unchanged.
export function _egApplyIntimidateAmp(target, amount, opts) {
    if (!target || !(opts && opts.isMelee) || !(amount > 0)) return amount;
    if (!(target.intimidatedUntil > Date.now())) return amount;
    const ampPct = Math.max(0, Number(_egComputePlayerStats().intimidateMeleeAmpPct) || 0);
    return amount * (1 + ampPct / 100);
}

// Crush (notable 331): a melee strike that lands on an enemy which was at
// full Life crushes it for EG_CRUSH_DURATION_S seconds. While crushed the
// enemy's physical Damage reduction is lowered (_egApplyTargetResistances).
// Returns true when the enemy was (re)crushed by this hit.
export function _egRollCrush(target, opts, wasFullLife) {
    if (!target || !(opts && opts.isMelee) || !wasFullLife || target.currentHP <= 0) return false;
    const pct = Math.max(0, Number(_egComputePlayerStats().crushPhysReductionPct) || 0);
    if (!(pct > 0)) return false;
    const scale = (typeof window !== 'undefined' && window.DEV_EFFECT_TIME_SCALE > 0) ? window.DEV_EFFECT_TIME_SCALE : 1;
    target.crushedUntil = Date.now() + EG_CRUSH_DURATION_S * scale * 1000;
    target.crushPhysRedPct = pct;
    return true;
}

// Rolls the intimidate chance for one melee hit; returns true when the enemy
// was (re)intimidated by it.
export function _egRollIntimidate(target, opts) {
    if (!target || !(opts && opts.isMelee) || target.currentHP <= 0) return false;
    const chance = Math.min(100, Number(_egComputePlayerStats().intimidateChanceMeleePct) || 0);
    if (!(chance > 0) || Math.random() * 100 >= chance) return false;
    const scale = (typeof window !== 'undefined' && window.DEV_EFFECT_TIME_SCALE > 0) ? window.DEV_EFFECT_TIME_SCALE : 1;
    target.intimidatedUntil = Date.now() + EG_INTIMIDATE_DURATION_S * scale * 1000;
    return true;
}

//------------------------------------------------------------------------
//-------------------AILMENT APPLICATION (COMBAT)------------------------
//------------------------------------------------------------------------
// Player → Monster: rolled from gear ailment chances when a hit carries the
// matching element. Called from _egDamageTargetById AFTER resistances, so
// `amount` is the actual damage dealt and `elements` the per-element share.
//------------------------------------------------------------------------

function _egRollPlayerHitAilments(target, amount, elements, opts) {
    if (!_egIsActive() || !target || target.currentHP <= 0) return;
    const stats = _egComputePlayerStats();
    // Ailments inflicted by a critical hit deal more damage over time.
    // Perfect Agony: only Critical Strikes inflict ailments, and their DoT multiplier is
    // the Critical Strike multiplier.
    if ((Number(stats.nonCritNoAilments) || 0) > 0 && !(opts && opts.isCrit)) return;
    const critDotMult = (opts && opts.isCrit)
        ? ((Number(stats.dotMultiEqualsCrit) || 0) > 0
            ? 1.5 + Math.max(0, Number(stats.critMultiplierPct) || 0) / 100
            : 1 + Math.max(0, Number(stats.critDotMultiPct) || 0) / 100)
        : 1;
    const _achPreHas = {};
    if (target.statuses) { for (const k in target.statuses) if (target.statuses[k] && target.statuses[k].until > Date.now()) _achPreHas[k]=true; }

    const fireShare = elements ? (elements.fire || 0) : 0;
    const coldShare = elements ? (elements.cold || 0) : 0;
    const lightningShare = elements ? (elements.lightning || 0) : 0;
    const shadowShare = elements ? (elements.shadow || 0) : 0;
    // Physical share: whatever the elemental shares leave over. Like cold
    // hits innately chill, physical hits innately bleed - this is what the
    // tithe duration nodes scale (30252/30253), and what 20036 wards against.
    const physShare = Math.max(0, amount - fireShare - coldShare - lightningShare - shadowShare);
    if (physShare > 0 && Math.random() * 100 < EG_PHYS_INNATE_BLEED_CHANCE_PCT) {
        _egApplyMonsterAilment(target, 'bleed', Math.max(EG_AIL_MIN_DOT_DAMAGE, amount * EG_AIL_BLEED_DMG_SHARE) * critDotMult);
    }
    // Tree bleed chances (bleed batch): melee attacks and attacks in general
    // (melee + primary projectile hits; spells never). The bleed deals a
    // share of the hit's PHYSICAL damage, so a hit with no physical share
    // cannot cause it.
    const isMeleeHit = !!(opts && opts.isMelee);
    const isAttackHit = isMeleeHit || !!(opts && opts.isPlayerHit);
    const treeBleedPct = (isMeleeHit ? (stats.bleedChanceMeleePct || 0) : 0)
        + (isAttackHit ? (stats.bleedChanceAttackPct || 0) : 0);
    if (physShare > 0 && treeBleedPct > 0 && Math.random() * 100 < Math.min(100, treeBleedPct)) {
        _egApplyMonsterAilment(target, 'bleed', Math.max(EG_AIL_MIN_DOT_DAMAGE, physShare * EG_AIL_BLEED_DMG_SHARE) * critDotMult);
    }

    // Phase B hooks: Power charge on crit, Endurance charge on melee crit,
    // Blind on attack hits and the dagger poison lines.
    if (opts && opts.isCrit) {
        const powerCritPct = Math.min(100, Number(stats.powerOnCritPct) || 0);
        if (powerCritPct > 0 && Math.random() * 100 < powerCritPct) _egGainPowerCharge(stats.powerChargesMax, stats.powerDurationPct);
        const endCritPct = Math.min(100, Number(stats.enduranceOnMeleeCritPct) || 0);
        if (isMeleeHit && endCritPct > 0 && Math.random() * 100 < endCritPct) _egGainEnduranceCharge(stats.enduranceChargesMax, stats.enduranceDurationPct);
    }
    if (isAttackHit && (Number(stats.blindPct) || 0) > 0 && Math.random() * 100 < Math.min(100, stats.blindPct)) {
        _egApplyMonsterAilment(target, 'blind');
        if (target.statuses && target.statuses.blind) target.statuses.blind.effectPct = Math.max(0, Number(stats.blindEffectIncPct) || 0);
    }
    if (opts && opts.isPlayerSpell && (Number(stats.poisonChanceSpellPct) || 0) > 0
        && Math.random() * 100 < Math.min(100, stats.poisonChanceSpellPct)) {
        _egApplyMonsterAilment(target, 'poison', Math.max(EG_AIL_MIN_DOT_DAMAGE, amount * EG_AIL_POISON_DMG_SHARE) * critDotMult);
    }
    if (isAttackHit && stats.isDaggerEquipped) {
        const critPoison = !!(opts && opts.isCrit) && (Number(stats.daggerCritPoisons) || 0) > 0;
        const daggerPoisonPct = Math.min(100, Number(stats.poisonChanceDaggerPct) || 0);
        if (critPoison || (daggerPoisonPct > 0 && Math.random() * 100 < daggerPoisonPct)) {
            _egApplyMonsterAilment(target, 'poison', Math.max(EG_AIL_MIN_DOT_DAMAGE, amount * EG_AIL_POISON_DMG_SHARE) * critDotMult);
        }
    }

    // Poison (shadow DoT): attack hits only (melee + primary projectile), and
    // only when the hit actually carries shadow damage.
    if (shadowShare > 0 && isAttackHit && (stats.poisonChanceAttackPct || 0) > 0
        && Math.random() * 100 < Math.min(100, stats.poisonChanceAttackPct)) {
        _egApplyMonsterAilment(target, 'poison', Math.max(EG_AIL_MIN_DOT_DAMAGE, shadowShare * EG_AIL_POISON_DMG_SHARE) * critDotMult);
    }

    if (fireShare > 0 && stats.ignitePct > 0 && Math.random() * 100 < stats.ignitePct) {
        _egApplyMonsterAilment(target, 'ignite', Math.max(EG_AIL_MIN_DOT_DAMAGE, amount * EG_AIL_IGNITE_DMG_SHARE) * critDotMult);
    }
    if (coldShare > 0) {
        if (stats.freezePct > 0 && Math.random() * 100 < stats.freezePct) {
            _egApplyMonsterAilment(target, 'chill');
        } else if (Math.random() * 100 < EG_COLD_INNATE_CHILL_CHANCE_PCT) {
            _egApplyMonsterAilment(target, 'chill');
        }
    }
    if (lightningShare > 0 && stats.shockPct > 0 && Math.random() * 100 < stats.shockPct) {
        _egApplyMonsterAilment(target, 'shocked');
    }
    // Signature spells carry an innate ailment chance of their own (stacks
    // with gear/tree chances; each roll is independent).
    const spellInnate = (opts && opts.spellId) ? EG_SPELL_INNATE_AILMENT[opts.spellId] : null;
    if (spellInnate && Math.random() * 100 < spellInnate.pct) {
        if (spellInnate.key === 'ignite') {
            _egApplyMonsterAilment(target, 'ignite', Math.max(EG_AIL_MIN_DOT_DAMAGE, amount * EG_AIL_IGNITE_DMG_SHARE) * critDotMult);
        } else {
            _egApplyMonsterAilment(target, spellInnate.key);
        }
    }
    // Endgame achievement - count newly inflicted ailments on this hit
    if (typeof trackAchStat === 'function') try {
        let _newAil = 0;
        if (target.statuses) for (const k in target.statuses) if (target.statuses[k] && target.statuses[k].until > Date.now() && !_achPreHas[k]) _newAil++;
        if (_newAil>0) trackAchStat('egAilmentsInflicted', _newAil);
    } catch(e){}
}

//------------------------------------------------------------------------
// Monster → Player: rolled from the monster's attack element whenever an
// attack actually deals damage. Called from _egPlayerTakeDamage.
//------------------------------------------------------------------------

// Returns true when the incoming ailment was avoided by the casting-avoidance
// stat. No active cast, no stat or no charge = false (the ailment lands).
function _egTryAvoidAilmentWhileCasting() {
    let chance = 0;
    try { chance = Number(_egComputePlayerStats().castingAilmentAvoidPct) || 0; } catch (e) { return false; }
    if (!(chance > 0)) return false;
    if (typeof isHoldCasting !== 'function') return false;
    try { if (!isHoldCasting()) return false; } catch (e) { return false; }
    return Math.random() * 100 < chance;
}

// Passive-tree "% chance to avoid being Bled / Poisoned" (bleedAvoidPct,
// poisonAvoidPct). Rolled after the base ailment chance, so it can only
// ever remove an ailment. Returns true when the incoming ailment is avoided.
function _egTryAvoidPlayerAilmentStat(statName) {
    let chance = 0;
    try { chance = Number(_egComputePlayerStats()[statName]) || 0; } catch (e) { return false; }
    return chance > 0 && Math.random() * 100 < Math.min(100, chance);
}

// Attacker-aware retaliation ward (reworked node 20036 Retaliation Ward):
// a bleeding attacker cannot bleed you, a burning attacker cannot ignite
// you. Reads the attacker's live statuses, so an expired bleed/ignite stops
// protecting it - and you. Returns true when the incoming ailment is warded.
function _egTryRetaliationWard(element, attacker) {
    let stats = null;
    try { stats = _egComputePlayerStats(); } catch (e) { return false; }
    if (!stats || !attacker || !attacker.statuses) return false;
    let warded = false;
    if (element === 'fire') {
        warded = (Number(stats.retaliationWardIgnite) || 0) > 0 && _egHasStatus(attacker.statuses, 'ignite');
    } else if (!element) {
        warded = (Number(stats.retaliationWardBleed) || 0) > 0 && _egHasStatus(attacker.statuses, 'bleed');
    }
    if (warded) Audio_Manager.playSFX('retaliation_ward');
    return warded;
}

function _egRollMonsterHitAilment(element, dealt, attacker) {
    // Applications below happen synchronously; the level is cleared right after.
    _egAilSrcLevel = Number(attacker && attacker.level) || 0;
    Promise.resolve().then(() => { _egAilSrcLevel = 0; });
    if (!_egIsActive() || !(dealt > 0)) return;
    // Physical hits (no element) can only bleed, and only from a real
    // attacker - self-inflicted physical damage never bleeds you.
    if (!element) {
        if (!attacker) return;
        if (_egTryRetaliationWard(null, attacker)) return;
        if (Math.random() * 100 < EG_MONSTER_AILMENT_CHANCE_PCT && !_egTryAvoidPlayerAilmentStat('bleedAvoidPct')) {
            _egApplyPlayerAilment('bleed', Math.max(EG_AIL_MIN_DOT_DAMAGE, dealt * EG_AIL_BLEED_DMG_SHARE));
        }
        return;
    }
    // Active map run: "Monster Hits have +#% chance to inflict Ailments".
    const ailChance = EG_MONSTER_AILMENT_CHANCE_PCT +
        ((typeof _egGetActiveMapModValue === 'function')
            ? _egGetActiveMapModValue('map_monster_ailments') : 0);

    // Poison: a shadow hit may also poison the player (a shadow DoT sized
    // from the hit). Its own roll, independent of the Shadow cloud below;
    // the casting-avoidance and the tree's poison avoidance can remove it.
    if (element === 'shadow' && Math.random() * 100 < ailChance
        && !_egTryAvoidAilmentWhileCasting() && !_egTryAvoidPlayerAilmentStat('poisonAvoidPct')) {
        _egApplyPlayerAilment('poison', Math.max(EG_AIL_MIN_DOT_DAMAGE, dealt * EG_AIL_POISON_DMG_SHARE));
    }

    if (Math.random() * 100 >= ailChance) return;

    // Passive-tree "Avoid Ailments while Casting": while the player holds a
    // hotbar button on a cast-time spell, the incoming ailment is avoided
    // outright. Rolled after the base chance so it can only ever remove an
    // ailment, never add one.
    if (_egTryAvoidAilmentWhileCasting()) return;

    if (_egTryRetaliationWard(element, attacker)) return;

    switch (element) {
        case 'fire':
            if (_egTryAvoidPlayerAilmentStat('igniteAvoidPct') || _egTryAvoidPlayerAilmentStat('elementalAilmentAvoidPct')) break;
            _egApplyPlayerAilment('ignite', Math.max(EG_AIL_MIN_DOT_DAMAGE, dealt * EG_AIL_IGNITE_DMG_SHARE));
            break;
        case 'cold':
            if (_egTryAvoidPlayerAilmentStat('chillAvoidPct') || _egTryAvoidPlayerAilmentStat('elementalAilmentAvoidPct')) break;
            _egApplyPlayerAilment('chill');
            break;
        case 'lightning':
            if (_egTryAvoidPlayerAilmentStat('shockAvoidPct') || _egTryAvoidPlayerAilmentStat('elementalAilmentAvoidPct')) break;
            _egApplyPlayerAilment('shocked');
            break;
        case 'shadow':
            _egApplyPlayerAilment('shadow');
            break;
    }
}


//------------------------------------------------------------------------
//-------------------DoT DAMAGE DEALT TO THE PLAYER----------------------
//------------------------------------------------------------------------
// Ignite drains the absorption shield FIRST, then HP.
// Shadow Burn ignores the shield entirely and burns straight from HP.
//------------------------------------------------------------------------

function _egDealPlayerDotDamage(rawAmount, ignoreShield, dotKeys) {
    if (typeof dead !== 'undefined' && globalThis.dead) return;
    // Shadow Inoculation: with Life 1 every damage over time (shadow burn included)
    // must go through Absorption first.
    try { if ((Number(_egComputePlayerStats().lifeBecomesOne) || 0) > 0) ignoreShield = false; } catch (e) { /* default */ }

    let amount = rawAmount;

    // Active map run: "#% increased Damage over Time taken".
    if (typeof _egGetActiveMapModValue === 'function') {
        const dotPct = _egGetActiveMapModValue('map_increased_dot');
        if (dotPct > 0) amount *= (1 + dotPct / 100);
    }

    if (!ignoreShield && globalThis._egPlayerAbsorptionCurrent > 0) {
        const prevAbs = globalThis._egPlayerAbsorptionCurrent;
        const absorbed = Math.min(globalThis._egPlayerAbsorptionCurrent, amount);
        globalThis._egPlayerAbsorptionCurrent -= absorbed;
        amount -= absorbed;
        if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('player_shield_damage_taken');
        if (typeof _egMaybeShowAbsorptionBroken === 'function') _egMaybeShowAbsorptionBroken(prevAbs, globalThis._egPlayerAbsorptionCurrent);
    }

    amount = Math.round(Math.max(0, amount));

    // Floating DoT number on the player HUD (no squish/SFX spam)
    const hud = document.getElementById('player-avatar-wrapper');
    if (hud && amount > 0) {
        const label = document.createElement('div');
        label.className = 'eg-player-damage eg-dot-damage';
        label.textContent = `-${amount}`;
        hud.appendChild(label);
        setTimeout(() => label.remove(), 1500);
    }

    if (amount <= 0) {
        if (typeof dead !== 'undefined' && globalThis.dead) return;
        if (typeof _egIsActive === 'function' && !_egIsActive()) return;
        if (typeof _renderPlayerAvatar === 'function') globalThis._renderPlayerAvatar();
        return;
    }

    globalThis.playerCurrentHP = Math.max(0, globalThis.playerCurrentHP - amount);
    // Dev fight log (js/dev/dev-testing.js): HP lost to ailment DoT.
    if (typeof globalThis.__fightLogDot === 'function') globalThis.__fightLogDot(amount, dotKeys || 'dot');
    if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
    if (globalThis.playerCurrentHP <= 0 && typeof _egGameOver === 'function') _egGameOver();
}


//------------------------------------------------------------------------
//-------------------AILMENTS TICK (called at 10Hz)----------------------
//------------------------------------------------------------------------

function _egExpireFromMap(statusMap, now) {
    Object.keys(statusMap).forEach(key => {
        if (statusMap[key].until <= now) delete statusMap[key];
    });
}

function _egTickAilments() {
    if (!_egIsActive()) return;
    const now = Date.now();
    const deltaS = 0.1; // 10Hz tick

    // --- Player statuses ---
    _egExpireFromMap(_egPlayerStatuses, now);
    let playerDot = 0;
    let playerIgnoresShield = false;
    const playerDotKeys = [];
    Object.keys(_egPlayerStatuses).forEach(key => {
        const st = _egPlayerStatuses[key];
        if (!(st.dps > 0)) return;
        st.acc = (st.acc || 0) + deltaS;
        if (st.acc >= EG_AIL_TICK_INTERVAL_S) {
            st.acc -= EG_AIL_TICK_INTERVAL_S;
            playerDotKeys.push(key);
            // Bleeding hurts far more while you move: +200% damage.
            const moveMult = (key === 'bleed' && _egIsAvatarMoving()) ? EG_AIL_BLEED_MOVING_MULT : 1;
            playerDot += Math.max(EG_AIL_MIN_DOT_DAMAGE, Math.round(st.dps * moveMult));
            if (key === 'shadowburn' || key === 'poison') playerIgnoresShield = true;
        }
    });
    if (playerDot > 0) {
        Audio_Manager.playSFX('ail_dot_tick');
        _egDealPlayerDotDamage(playerDot, playerIgnoresShield, playerDotKeys.join('+'));
    }

    // --- Ground-fire damage: standing in burning ground burns the player ---
    // Uses radius-aware overlap check so edge contact counts as burning.
    _egAddGroundFireAcc(deltaS);
    if (_egGroundFireAcc >= EG_AIL_PLAYER_FIRE_GROUND_TICK_S) {
        _egAddGroundFireAcc(-EG_AIL_PLAYER_FIRE_GROUND_TICK_S);
        if (_egIsPlayerInsideFire()) {
            const maxHP = (typeof playerMaxHP !== 'undefined' && globalThis.playerMaxHP > 0) ? globalThis.playerMaxHP : 100;
            const rawAmount = Math.max(EG_AIL_MIN_DOT_DAMAGE, Math.round(maxHP * EG_AIL_PLAYER_FIRE_GROUND_DMG_PCT / 100));
            if (typeof _egPlayerTakeDamage === 'function') {
                _egPlayerTakeDamage(rawAmount, true, 'fire');
            } else {
                _egDealPlayerDotDamage(rawAmount, false);
            }
        }
    }

    // --- Monster statuses ---
    const deadIds = [];
    globalThis._egMonsters.forEach(m => {
        if (!m.statuses) return;
        _egExpireFromMap(m.statuses, now);

        let dotTotal = 0;
        Object.keys(m.statuses).forEach(key => {
            const st = m.statuses[key];
            if (!(st.dps > 0)) return;
            st.acc = (st.acc || 0) + deltaS;
            const tickS = st.tickS || EG_AIL_TICK_INTERVAL_S;
            if (st.acc >= tickS) {
                st.acc -= tickS;
                dotTotal += Math.max(EG_AIL_MIN_DOT_DAMAGE, Math.round(st.dps));
            }
        });

        if (dotTotal > 0) {
            m.currentHP = Math.max(0, m.currentHP - dotTotal);
            if (typeof _egShowDamageNumber === 'function') _egShowDamageNumber(m.id, dotTotal, false, { fire: 0, cold: 0, lightning: 0, shadow: dotTotal });
            if (m.currentHP <= 0) deadIds.push(m.id);
        }
    });

    // Kill DoT victims after iteration (loot/xp pipeline runs normally)
    deadIds.forEach(id => {
        if (typeof _egBossCheckPhase === 'function') {
            const target = globalThis._egMonsters.find(mm => mm.id === id);
            if (target && target.isBoss) globalThis._egBossCheckPhase(target);
        }
        if (typeof _egKillMonster === 'function') _egKillMonster(id);
    });
}


//------------------------------------------------------------------------
//-------------------STATUS ICON UI--------------------------------------
//------------------------------------------------------------------------

// Builds "🔥5 ❄️3" style signature so icons only rebuild when they change.
function _egStatusSignature(statusMap) {
    const now = Date.now();
    return Object.keys(statusMap)
        .filter(key => statusMap[key].until > now)
        .sort()
        .map(key => `${key}:${Math.ceil((statusMap[key].until - now) / 1000)}`)
        .join(',');
}

function _egBuildStatusIconsHTML(statusMap) {
    const now = Date.now();
    return Object.keys(statusMap)
        .filter(key => statusMap[key].until > now)
        .map(key => {
            // Crimson Dance stacks: show the stack count on the bleed chip.
            const stacks = (key === 'bleed' && statusMap[key].stacks > 1) ? `×${statusMap[key].stacks} ` : '';
            return `<span class="eg-status-icon st-${key}" data-tip="${globalThis._tipAttr(_egAilmentLabel(key))}">${EG_AILMENT_ICONS[key] || '?'}${stacks}${Math.ceil((statusMap[key].until - now) / 1000)}</span>`;
        })
        .join('');
}

// Ailment key -> card class driving the big on-monster effect (CSS:
// .eg-ail-* in css/endgame/monsters.css). Flames, lightning, frost... so the
// state reads at a glance without hunting for the small status chip.
const EG_AILMENT_CARD_FX = {
    ignite: 'eg-ail-ignite', shocked: 'eg-ail-shocked', chill: 'eg-ail-chill',
    frozen: 'eg-ail-frozen', shadowburn: 'eg-ail-shadowburn', poison: 'eg-ail-poison',
    polymorph: 'eg-ail-polymorph', bleed: 'eg-bleeding',
};
const EG_AILMENT_FX_HTML =
    '<i class="eg-fx-flame f1">🔥</i><i class="eg-fx-flame f2">🔥</i><i class="eg-fx-flame f3">🔥</i>'
    + '<i class="eg-fx-flame f4">🔥</i><i class="eg-fx-flame f5">🔥</i>'
    + '<i class="eg-fx-zap z1">⚡</i><i class="eg-fx-zap z2">⚡</i><i class="eg-fx-zap z3">⚡</i><i class="eg-fx-zap z4">⚡</i>'
    + '<i class="eg-fx-frost r1">❄</i><i class="eg-fx-frost r2">❄</i><i class="eg-fx-frost r3">❄</i>'
    + '<i class="eg-fx-wisp w1"></i><i class="eg-fx-wisp w2"></i><i class="eg-fx-wisp w3"></i>';

// Per-monster icon strip - cheap DOM update driven by _egUpdateMonsterBars.
function _egRenderMonsterStatusStrip(m) {
    if (!m || !m.statuses) return;
    const strip = document.getElementById(`eg-status-${m.id}`);
    if (!strip) return;
    const sig = _egStatusSignature(m.statuses);
    if (strip.dataset.sig === sig) return;
    strip.dataset.sig = sig;
    strip.innerHTML = _egBuildStatusIconsHTML(m.statuses);
    const card = document.getElementById(`eg-card-${m.id}`);
    if (card) {
        const now = Date.now();
        Object.keys(EG_AILMENT_CARD_FX).forEach(key => {
            const st = m.statuses[key];
            card.classList.toggle(EG_AILMENT_CARD_FX[key], !!(st && st.until > now));
        });
        // Overlay for the animated flames/sparks/frost, parked inside the art
        // frame so it follows the monster's size (flames sit on its bottom edge).
        const wrap = card.querySelector('.eg-emoji-wrapper');
        if (wrap && !wrap.querySelector(':scope > .eg-ail-fx')) {
            const fx = document.createElement('div');
            fx.className = 'eg-ail-fx';
            fx.innerHTML = EG_AILMENT_FX_HTML;
            wrap.appendChild(fx);
        }
    }
}

// Player icon strip above the avatar - created lazily, refreshed per tick.
function _egRefreshPlayerStatusIcons() {
    if (!_egIsActive()) return;
    let strip = document.getElementById('eg-player-status-strip');
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    if (!strip) {
        strip = document.createElement('div');
        strip.id = 'eg-player-status-strip';
        strip.className = 'eg-status-strip eg-player-status-strip';
        hud.appendChild(strip);
    }
    // Support-spell buffs (js/skills/universal-spells.js) share this strip:
    // they are player statuses too, and reusing it keeps them inside the
    // existing per-tick DOM patch instead of adding a second ticker.
    const supportSig = (typeof _uspSupportStatusSignature === 'function') ? _uspSupportStatusSignature() : '';
    const supportHtml = (typeof _uspBuildSupportStatusIconsHTML === 'function') ? _uspBuildSupportStatusIconsHTML() : '';
    const sig = supportSig;
    if (strip.dataset.sig === sig) return;
    strip.dataset.sig = sig;
    // Timed ailments are shown as big banners above the sprite instead
    // (_egSyncAilmentBanners); the strip only carries support-spell buffs.
    strip.innerHTML = supportHtml;
}

// Big readable ailment banners above the player sprite. One banner per active
// timed ailment, stacked upward (soonest-ending nearest the sprite), each with
// a bar that drains right-to-left as the effect runs out. Driven by the
// 100 ms status ticker; layout/animation is pure CSS (.eg-ail-banner*).
const EG_AIL_BANNER_TEXT = {
    ignite: 'BURNING', bleed: 'BLEEDING', poison: 'POISONED', chill: 'CHILLED',
    frozen: 'FROZEN', shocked: 'SHOCKED', shadowburn: 'SHADOW BURN', shadow: 'BLINDED',
    polymorph: 'POLYMORPHED', confused: 'CONFUSED', blind: 'BLINDED', stunned: 'STUNNED',
};
const EG_AIL_BANNER_MAX = 4;          // more than this collapse into a "+N" chip
const EG_AIL_BANNER_STEP_PX = 40;     // banner height + gap (keep in sync with CSS)

function _egSyncAilmentBanners() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    let box = document.getElementById('eg-ail-banners');
    if (!box) {
        box = document.createElement('div');
        box.id = 'eg-ail-banners';
        hud.appendChild(box);
    }
    const now = Date.now();
    const live = Object.keys(_egPlayerStatuses)
        .filter(key => EG_AIL_BANNER_TEXT[key] && _egPlayerStatuses[key].until > now)
        .sort((a, b) => _egPlayerStatuses[a].until - _egPlayerStatuses[b].until);
    _egSyncPlayerSpriteFx(live);
    const shown = live.slice(0, EG_AIL_BANNER_MAX);
    const hidden = live.length - shown.length;

    // Retire banners whose ailment ended (fade out, then remove).
    box.querySelectorAll('.eg-ail-banner:not(.leaving)').forEach(el => {
        if (shown.includes(el.dataset.key)) return;
        el.classList.add('leaving');
        setTimeout(() => el.remove(), 320);
    });

    shown.forEach((key, idx) => {
        const st = _egPlayerStatuses[key];
        let el = box.querySelector(`.eg-ail-banner[data-key="${key}"]:not(.leaving)`);
        if (!el) {
            el = document.createElement('div');
            el.className = `eg-ail-banner eg-ail-banner-${key}`;
            el.dataset.key = key;
            el.innerHTML = '<div class="eg-ail-banner-bar"></div>'
                + `<div class="eg-ail-banner-text"><span class="eg-ail-banner-icon">${EG_AILMENT_ICONS[key] || ''}</span><span class="eg-ail-banner-label"></span>${key === 'bleed' ? `<span class="eg-ail-banner-sub">x${EG_AIL_BLEED_MOVING_MULT} MOVING</span>` : ''}</div>`;
            box.appendChild(el);
        }
        el.style.transform = `translateY(${-idx * EG_AIL_BANNER_STEP_PX}px)`;
        const remaining = st.until - now;
        const total = Math.max(st.totalMs || 0, remaining, 1);
        el.firstChild.style.width = `${Math.max(0, Math.min(100, remaining / total * 100)).toFixed(1)}%`;
        const stacks = st.stacks > 1 ? ` ×${st.stacks}` : '';
        // Bleed: pulse while the hero moves (the x3 damage is live).
        if (key === 'bleed') el.classList.toggle('eg-ail-moving', _egIsAvatarMoving());
        const label = el.querySelector('.eg-ail-banner-label');
        const text = EG_AIL_BANNER_TEXT[key] + stacks;
        if (label.textContent !== text) label.textContent = text;
    });

    let more = box.querySelector('.eg-ail-banner-more');
    if (hidden > 0) {
        if (!more) {
            more = document.createElement('div');
            more.className = 'eg-ail-banner-more';
            box.appendChild(more);
        }
        more.textContent = `+${hidden}`;
        more.style.transform = `translateY(${-shown.length * EG_AIL_BANNER_STEP_PX}px)`;
    } else if (more) {
        more.remove();
    }
}

// On-sprite ailment visuals: the same flames / sparks / frost / wisps the
// monsters get, on a fixed layer that follows the hero sprite (rAF while any
// effect is live), plus a colour tint on the sprite itself (.eg-spr-<key>).
const EG_PLAYER_FX_KEYS = {
    ignite: 'eg-ail-ignite', shocked: 'eg-ail-shocked', chill: 'eg-ail-chill', frozen: 'eg-ail-frozen',
    shadowburn: 'eg-ail-shadowburn', poison: 'eg-ail-poison', polymorph: 'eg-ail-polymorph',
    bleed: 'eg-bleeding', stunned: 'eg-ail-stunned',
};
let _egPlayerFxLayer = null;
let _egPlayerFxRaf = null;
let _egPlayerFxActive = [];

function _egPlayerSpriteImgs() {
    return ['avatar-sprite-img', 'avatar-sprite-img-simple'].map(id => document.getElementById(id)).filter(Boolean);
}

function _egPlayerFxFrame() {
    _egPlayerFxRaf = null;
    const layer = _egPlayerFxLayer;
    if (!layer || !_egPlayerFxActive.length) return;
    const img = _egPlayerSpriteImgs().find(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    if (img) {
        const r = img.getBoundingClientRect();
        layer.style.display = 'block';
        layer.style.left = r.left + 'px';
        layer.style.top = r.top + 'px';
        layer.style.width = r.width + 'px';
        layer.style.height = r.height + 'px';
    } else {
        layer.style.display = 'none';
    }
    _egPlayerFxRaf = requestAnimationFrame(_egPlayerFxFrame);
}

function _egSyncPlayerSpriteFx(liveKeys) {
    const keys = liveKeys.filter(k => EG_PLAYER_FX_KEYS[k]);
    const sig = keys.join(',');
    if (sig === _egPlayerFxActive.join(',')) return;
    _egPlayerFxActive = keys;
    _egPlayerSpriteImgs().forEach(img => {
        Object.keys(EG_PLAYER_FX_KEYS).forEach(k => img.classList.toggle('eg-spr-' + k, keys.includes(k)));
    });
    if (!keys.length) {
        if (_egPlayerFxLayer) { _egPlayerFxLayer.remove(); _egPlayerFxLayer = null; }
        return;
    }
    if (!_egPlayerFxLayer) {
        const layer = document.createElement('div');
        layer.id = 'eg-player-ail-fx';
        layer.className = 'eg-player-ail-fx';
        layer.innerHTML = '<div class="eg-ail-fx">' + EG_AILMENT_FX_HTML + '<i class="eg-fx-star s1">✦</i><i class="eg-fx-star s2">✦</i><i class="eg-fx-star s3">✦</i></div>';
        document.body.appendChild(layer);
        _egPlayerFxLayer = layer;
    }
    Object.keys(EG_PLAYER_FX_KEYS).forEach(k => _egPlayerFxLayer.classList.toggle(EG_PLAYER_FX_KEYS[k], keys.includes(k)));
    if (!_egPlayerFxRaf) _egPlayerFxRaf = requestAnimationFrame(_egPlayerFxFrame);
}

function _egGetPlayerRectForAilment() {
    const el = document.getElementById('player-avatar-wrapper');
    return el ? el.getBoundingClientRect() : null;
}
function _egCircleOverlapsRect(cx, cy, radius, rect) {
    const closestX = Math.max(rect.left, Math.min(cx, rect.right));
    const closestY = Math.max(rect.top, Math.min(cy, rect.bottom));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= radius * radius;
}
function _egIsPlayerInsideFire() {
    const r = _egGetPlayerRectForAilment();
    if (!r) return false;
    return _egPuzzleEffects.some(e => e.type === 'playerfire' &&
        _egCircleOverlapsRect(e.x, e.y, EG_AIL_PLAYER_FIRE_RADIUS_PX, r));
}
function _egIsPlayerInsideCloud() {
    const r = _egGetPlayerRectForAilment();
    if (!r) return false;
    return _egPuzzleEffects.some(e => {
        if (e.type === 'playerfire') return _egCircleOverlapsRect(e.x, e.y, EG_AIL_PLAYER_FIRE_RADIUS_PX, r);
        if (e.type === 'playershadow') return _egCircleOverlapsRect(e.x, e.y, EG_AIL_PLAYER_SHADOW_RADIUS_PX, r);
        return false;
    });
}
function _egDropPlayerGround(type) {
    const r = _egGetPlayerRectForAilment();
    if (!r) return;
    const el = document.createElement('div');
    el.className = `eg-player-ground eg-player-ground-${type}`;
    el.style.left = `${r.left + r.width / 2}px`;
    el.style.top = `${r.top + r.height / 2}px`;
    document.body.appendChild(el);
    const effect = { type: type === 'fire' ? 'playerfire' : 'playershadow', x: r.left + r.width / 2, y: r.top + r.height / 2, el };
    _egPuzzleEffects.push(effect);
    Audio_Manager.playSFX(type === 'fire' ? 'hz_ground_fire_burn' : 'hz_shadow_cloud');
    setTimeout(() => { el.remove(); _egReplacePuzzleEffects(_egPuzzleEffects.filter(e => e !== effect)); }, EG_AIL_PLAYER_GROUND_DURATION_MS);
}
function _egStartPlayerFireDrops() {
    _egDropPlayerGround('fire');
    setTimeout(() => { if (_egPlayerHasAilment('ignite')) _egStartPlayerFireDrops(); }, EG_AIL_PLAYER_FIRE_DROP_INTERVAL_MS);
}
function _egStartPlayerShadowClouds() {
    _egDropPlayerGround('shadow');
    setTimeout(() => { if (_egPlayerHasAilment('shadow')) _egStartPlayerShadowClouds(); }, EG_AIL_PLAYER_FIRE_DROP_INTERVAL_MS);
}

//------------------------------------------------------------------------
//-------------------CORE PUBLIC SURFACE-------------------------------
//------------------------------------------------------------------------

export {
    _egApplyMonsterAilment,
    _egFreezeAllMonsters,
    EG_AIL_IGNITE_DMG_SHARE,
    EG_AIL_BLEED_DURATION_S,
    EG_AIL_BLEED_DMG_SHARE,
    EG_PHYS_INNATE_BLEED_CHANCE_PCT,
    EG_AIL_MIN_DOT_DAMAGE,
    EG_PUZZLE_ATTACK_CHANCE_PCT,
    EG_PUZZLE_EFFECT_DURATION_MS,
    EG_PUZZLE_HAZARD_CELLS,
    EG_ICE_SLIP_CHANCE,
    EG_SHOCK_MARK_STRIP_CHANCE,
    _egApplyPlayerAilment,
    _egStunPlayer,
    _egStunChanceFromHit,
    _egRollPlayerStunFromHit,
    EG_AIL_STUN_DURATION_S,
    _egEnsurePlayerStatusBar,
    _egIsPolymorphActive,
    _egGetPolymorphVictim,
    _egPlayerHasAilment,
    _egGetPlayerChargeMultiplier,
    _egGetMonsterChargeMultiplier,
    _egApplyAilmentShockAmpOnMonster,
    _egApplyPlayerShockAmp,
    _egRollPlayerHitAilments,
    _egApplyImpaleToHit,
    _egChilledColdTakenMult,
    _egRollMonsterHitAilment,
    _egTickAilments,
    _egRenderMonsterStatusStrip,
    _egRefreshPlayerStatusIcons,
    _egStopPlayerStatusBarTicker,
    _egGetPlayerRectForAilment,
    _egCircleOverlapsRect,
    _egIsPlayerInsideFire,
    _egIsPlayerInsideCloud,
    _egDropPlayerGround,
    _egStartPlayerFireDrops,
    _egStartPlayerShadowClouds,
};
