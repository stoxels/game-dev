import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { _uspBuildSupportStatusIconsHTML, _uspSupportStatusSignature } from '../skills/universal-spells.js';
import { isHoldCasting } from '../skills/spell-casttime.js';
import { _egMaybeShowAbsorptionBroken } from './encounter-overlays.js';
import { _egGameOver, _egKillMonster, _egPlayerTakeDamage, _egShowDamageNumber } from './encounter.js';
import { _egGetActiveMapModValue, _egHasActiveMapMod } from '../endgame/endgame-map-launch.js';
import { _egComputePlayerStats } from '../endgame/endgame-player-stats.js';
import { _egIsActive } from './combat-state.js';
import { _egAddGroundFireAcc, _egGroundFireAcc, _egPlayerStatuses, _egPuzzleEffects, _egPlayerStatusBarTicker, _egReplacePuzzleEffects, _egSetPlayerStatusBarTicker } from './combat-ailments-state.js';

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
// Bleed mirrors ignite one-to-one: a physical damage-over-time status with
// the same base duration and damage share. Like cold hits innately chill,
// physical hits innately bleed (see _egRollPlayerHitAilments and
// _egRollMonsterHitAilment) - the tithe tree nodes scale both durations.
const EG_AIL_BLEED_DURATION_S = 5;
const EG_AIL_BLEED_DMG_SHARE = 0.15;    // dps = share of the triggering hit
const EG_PHYS_INNATE_BLEED_CHANCE_PCT = 10;   // physical hits bleed even w/o mods
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
    chill: '❄️',
    frozen: '🧊',
    shocked: '⚡',
    shadowburn: '🌑',
    shadow: '☁️',
    polymorph: '🌀',
    confused: '❓',
};

// The display name of an ailment. Only shadowburn needs the mapping (it is
// one word in the data and two on screen); everything else title-cases.
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
        chill: EG_AIL_CHILL_DURATION_S,
        frozen: EG_AIL_FROZEN_DURATION_S,
        shocked: EG_AIL_SHOCK_DURATION_S,
        shadowburn: EG_AIL_SHADOWBURN_DURATION_S,
        shadow: EG_AIL_SHADOW_DURATION_S,
        polymorph: EG_AIL_POLYMORPH_DURATION_S,
        confused: EG_AIL_CONFUSION_DURATION_S,
    })[key];
    if (!durationS) return;
    // Passive tree: per-ailment duration for YOUR ailments on enemies
    // (tithe batch, e.g. reworked nodes 30252/30253). Only ignite and bleed
    // have tree channels; every other ailment keeps its base duration.
    if (key === 'ignite' || key === 'bleed') {
        let pct = 0;
        try {
            const ps = (typeof _egComputePlayerStats === 'function') ? _egComputePlayerStats() : {};
            pct = Number(key === 'ignite' ? ps.igniteDurationPct : ps.bleedDurationPct) || 0;
        } catch (e) { pct = 0; }
        if (pct > 0) durationS = durationS * (1 + pct / 100);
    }
    _egApplyStatusToMap(monster.statuses, key, durationS, dps);
    // No application blip on the monster side: elemental hits re-roll and
    // refresh ailments on every strike, so a per-hit cue (ignite especially)
    // reads as noise during fast auto-attacks. The per-second DoT tick and
    // status icons still carry the feedback. (Monster → player applications
    // in _egApplyPlayerAilment below keep their warning cue.)
}

// Applies an ailment to the player (or refreshes an existing one).
function _egApplyPlayerAilment(key, dps) {
    const durationS = ({
        ignite: EG_AIL_IGNITE_DURATION_S,
        bleed: EG_AIL_BLEED_DURATION_S,
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
    _egApplyStatusToMap(_egPlayerStatuses, key, scaled, dps);
    _egStartPlayerStatusBarTicker();
    _egShowPlayerAilmentOverlay(key);
    if (key === 'ignite') _egStartPlayerFireDrops();
    if (key === 'shadow') _egStartPlayerShadowClouds();
    globalThis.showToast(`${EG_AILMENT_ICONS[key] || ''} ${key === 'shadowburn' ? 'Shadow Burn' : key === 'polymorph' ? 'Polymorph - the encounter turns chaotic!' : key.charAt(0).toUpperCase() + key.slice(1)}!`);
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
            chip.setAttribute('data-tip', globalThis._tipAttr(_egAilmentLabel(key)));
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
    if (_egPlayerHasAilment('frozen')) return 0;
    // Active map run: a permanent icy aura chills the player.
    if (typeof _egHasActiveMapMod === 'function' && _egHasActiveMapMod('map_chilling_aura')) {
        return EG_AIL_CHARGE_SLOW_MULT;
    }
    if (_egPlayerHasAilment('chill')) return EG_AIL_CHARGE_SLOW_MULT;
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
        mult = EG_AIL_CHARGE_SLOW_MULT;
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
    return amount * (1 + EG_AIL_SHOCK_AMP_PCT / 100);
}

// +shock damage-taken amplification for the PLAYER.
function _egPlayerHitChanceMultiplier() {
    return _egPlayerHasAilment('shadow') && _egIsPlayerInsideCloud() ? EG_AIL_BLIND_HIT_CHANCE : 1;
}

function _egApplyPlayerShockAmp(amount) {
    if (!_egIsActive()) return amount;
    if (!_egPlayerHasAilment('shocked')) return amount;
    return amount * (1 + EG_AIL_SHOCK_AMP_PCT / 100);
}


//------------------------------------------------------------------------
//-------------------AILMENT APPLICATION (COMBAT)------------------------
//------------------------------------------------------------------------
// Player → Monster: rolled from gear ailment chances when a hit carries the
// matching element. Called from _egDamageTargetById AFTER resistances, so
// `amount` is the actual damage dealt and `elements` the per-element share.
//------------------------------------------------------------------------

function _egRollPlayerHitAilments(target, amount, elements) {
    if (!_egIsActive() || !target || target.currentHP <= 0) return;
    const stats = _egComputePlayerStats();
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
        _egApplyMonsterAilment(target, 'bleed', Math.max(EG_AIL_MIN_DOT_DAMAGE, amount * EG_AIL_BLEED_DMG_SHARE));
    }

    if (fireShare > 0 && stats.ignitePct > 0 && Math.random() * 100 < stats.ignitePct) {
        _egApplyMonsterAilment(target, 'ignite', Math.max(EG_AIL_MIN_DOT_DAMAGE, amount * EG_AIL_IGNITE_DMG_SHARE));
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

// Attacker-aware retaliation ward (reworked node 20036 Tithe of Strength):
// a bleeding attacker cannot bleed you, a burning attacker cannot ignite
// you. Reads the attacker's live statuses, so an expired bleed/ignite stops
// protecting it - and you. Returns true when the incoming ailment is warded.
function _egTryRetaliationWard(element, attacker) {
    let ward = 0;
    try { ward = Number(_egComputePlayerStats().retaliationWard) || 0; } catch (e) { return false; }
    if (!(ward > 0)) return false;
    if (!attacker || !attacker.statuses) return false;
    if (element === 'fire') return _egHasStatus(attacker.statuses, 'ignite');
    if (!element) return _egHasStatus(attacker.statuses, 'bleed');
    return false;
}

function _egRollMonsterHitAilment(element, dealt, attacker) {
    if (!_egIsActive() || !(dealt > 0)) return;
    // Physical hits (no element) can only bleed, and only from a real
    // attacker - self-inflicted physical damage never bleeds you.
    if (!element) {
        if (!attacker) return;
        if (_egTryRetaliationWard(null, attacker)) return;
        if (Math.random() * 100 < EG_MONSTER_AILMENT_CHANCE_PCT) {
            _egApplyPlayerAilment('bleed', Math.max(EG_AIL_MIN_DOT_DAMAGE, dealt * EG_AIL_BLEED_DMG_SHARE));
        }
        return;
    }
    // Active map run: "Monster Hits have +#% chance to inflict Ailments".
    const ailChance = EG_MONSTER_AILMENT_CHANCE_PCT +
        ((typeof _egGetActiveMapModValue === 'function')
            ? _egGetActiveMapModValue('map_monster_ailments') : 0);
    if (Math.random() * 100 >= ailChance) return;

    // Passive-tree "Avoid Ailments while Casting": while the player holds a
    // hotbar button on a cast-time spell, the incoming ailment is avoided
    // outright. Rolled after the base chance so it can only ever remove an
    // ailment, never add one.
    if (_egTryAvoidAilmentWhileCasting()) return;

    if (_egTryRetaliationWard(element, attacker)) return;

    switch (element) {
        case 'fire':
            _egApplyPlayerAilment('ignite', Math.max(EG_AIL_MIN_DOT_DAMAGE, dealt * EG_AIL_IGNITE_DMG_SHARE));
            break;
        case 'cold':
            _egApplyPlayerAilment('chill');
            break;
        case 'lightning':
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

function _egDealPlayerDotDamage(rawAmount, ignoreShield) {
    if (typeof dead !== 'undefined' && globalThis.dead) return;

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
    Object.keys(_egPlayerStatuses).forEach(key => {
        const st = _egPlayerStatuses[key];
        if (!(st.dps > 0)) return;
        st.acc = (st.acc || 0) + deltaS;
        if (st.acc >= EG_AIL_TICK_INTERVAL_S) {
            st.acc -= EG_AIL_TICK_INTERVAL_S;
            playerDot += Math.max(EG_AIL_MIN_DOT_DAMAGE, Math.round(st.dps));
            if (key === 'shadowburn') playerIgnoresShield = true;
        }
    });
    if (playerDot > 0) {
        _egDealPlayerDotDamage(playerDot, playerIgnoresShield);
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
            if (st.acc >= EG_AIL_TICK_INTERVAL_S) {
                st.acc -= EG_AIL_TICK_INTERVAL_S;
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
        .map(key => `<span class="eg-status-icon st-${key}" data-tip="${globalThis._tipAttr(_egAilmentLabel(key))}">${EG_AILMENT_ICONS[key] || '?'}${Math.ceil((statusMap[key].until - now) / 1000)}</span>`)
        .join('');
}

// Per-monster icon strip - cheap DOM update driven by _egUpdateMonsterBars.
function _egRenderMonsterStatusStrip(m) {
    if (!m || !m.statuses) return;
    const strip = document.getElementById(`eg-status-${m.id}`);
    if (!strip) return;
    const sig = _egStatusSignature(m.statuses);
    if (strip.dataset.sig === sig) return;
    strip.dataset.sig = sig;
    strip.innerHTML = _egBuildStatusIconsHTML(m.statuses);
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
    const sig = `${_egStatusSignature(_egPlayerStatuses)}|${supportSig}`;
    if (strip.dataset.sig === sig) return;
    strip.dataset.sig = sig;
    strip.innerHTML = supportHtml + _egBuildStatusIconsHTML(_egPlayerStatuses);
}

function _egShowPlayerAilmentOverlay(key) {
    const text = { ignite: 'BURNING', chill: 'CHILLED', shocked: 'SHOCKED', shadow: 'BLINDED', confused: 'CONFUSED' }[key];
    if (!text) return;
    const old = document.getElementById('eg-player-ailment-overlay');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'eg-player-ailment-overlay';
    el.className = `eg-player-ailment-overlay eg-player-ailment-${key}`;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => { if (el.isConnected) el.remove(); }, 1800);
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
    _egEnsurePlayerStatusBar,
    _egIsPolymorphActive,
    _egGetPolymorphVictim,
    _egPlayerHasAilment,
    _egGetPlayerChargeMultiplier,
    _egGetMonsterChargeMultiplier,
    _egApplyAilmentShockAmpOnMonster,
    _egApplyPlayerShockAmp,
    _egRollPlayerHitAilments,
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
