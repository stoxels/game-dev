import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _egGetMonsterChargeMultiplier, _egGetPlayerChargeMultiplier, _egRefreshPlayerStatusIcons, _egTickAilments } from './combat-ailments-core.js';
import { _egMaybeShowLowHealthWarning } from './encounter-overlays.js';
import { EG_MELEE_OVERCHARGE_RATIO, _egFireMonsterAttack, _egMeleeTierForCharge, _egOverchargeRateForTier, _egUpdateBars } from './encounter.js';
import { _egHazardsTick } from './combat-hazards-lifecycle.js';
import { _egGetActiveMapModValue } from '../endgame/endgame-map-launch.js';
import { _egGetPlayerAttackInterval, _egGetPlayerAttackIntervalForHand } from '../endgame/endgame-player-stats.js';
import { _egIsDualWielding } from '../loot/loot-requirements.js';
import { _egIsActive } from './combat-state.js';
import { _egUpdateMeleeMarker } from './combat-weapon-swing-config.js';
import { _egCheckMistakeLimit, _egTickLifeRegen } from './encounter-tick-support.js';

//  endgame-encounter-tick.js
//  COMBAT TICK LOOP - extracted 2026-09-10 from endgame-encounter.js
//  (tick loop, player/monster charge ticking, charge-pause gates,
//  hold-parry pause, mistakes-limit logic, life regen, pause/resume).
//  Loads AFTER endgame-encounter.js (its load-time code only touches
//  window and its own definitions; runtime calls cross freely).
//
// Encounter tick-loop owner: monster and player charge, melee feedback,
// and the 10Hz encounter orchestration loop.

// Advances a single monster's charge bar by one tick (0.1s at 10Hz).
// Fires the monster's attack when the charge bar fills completely.
export function _egTickMonster(m) {
    // Brutus's sacrificial zombies never attack - they only shamble into the
    // ground-slam band; their movement is driven by the roaming tick in
    // boss-brutus.js, so skip charge/attack entirely.
    if (m.isSacrificialZombie) return;

    // Active map run: monster regeneration - heals #% of max life per second.
    if (m.regenPctMaxLife > 0 && m.maxHP > 0 && m.currentHP > 0
        && m.currentHP < m.maxHP) {
        m.regenAcc = (m.regenAcc || 0) + 0.1;
        if (m.regenAcc >= 1) {
            const heal = Math.max(1, Math.round(m.maxHP * m.regenPctMaxLife / 100));
            m.currentHP = Math.min(m.maxHP, m.currentHP + heal);
            m.regenAcc = 0;
        }
    }

    // Active map run: bosses enrage below 30% life - one-time damage boost.
    if (m.isBoss && !m.enraged && m.maxHP > 0 && m.damageValue > 0
        && m.currentHP > 0 && m.currentHP <= m.maxHP * 0.3) {
        const enragePct = (typeof _egGetActiveMapModValue === 'function')
            ? _egGetActiveMapModValue('map_boss_enrage') : 0;
        if (enragePct > 0) {
            m.enraged = true;
            m.damageValue = Math.round(m.damageValue * (1 + enragePct / 100));
            if (m.bossBaseDamage != null) {
                m.bossBaseDamage = Math.round(m.bossBaseDamage * (1 + enragePct / 100));
            }
            globalThis.showCombatToast(`😡 ${t('eg_mm_toast_enrage') || 'The Boss is enraged!'}`);
            // Card visual (a re-render picks it up from m.enraged as well).
            const rageCard = document.getElementById(`eg-card-${m.id}`);
            const rageWrap = rageCard ? rageCard.querySelector('.eg-emoji-wrapper') : null;
            if (rageWrap) rageWrap.classList.add('eg-boss-enraged');
        }
    }

    // Active map run: wounded desperation - non-boss monsters below 25%
    // life fight harder (one-time damage boost).
    if (!m.isBoss && !m.desperationTriggered && m.desperationPct > 0
        && m.maxHP > 0 && m.damageValue > 0
        && m.currentHP > 0 && m.currentHP <= m.maxHP * 0.25) {
        m.desperationTriggered = true;
        m.damageValue = Math.round(m.damageValue * (1 + m.desperationPct / 100));
    }

    // Gear: stagger - the charge timer is paused for a short window after a hit
    if (m.staggeredUntil && Date.now() < m.staggeredUntil) return;
    // Gear: first_step - monsters don't charge-up their attacks for the first X seconds after spawning
    if (m.firstStepUntil && Date.now() < m.firstStepUntil) return;
    // The Marksman's Arrow Gauntlet: the boss's own attack charge freezes -
    // the bow volley IS his attack while the gauntlet holds the arena
    // (boss-marksman.js).
    if (m.isBoss && typeof _egMarksGauntletChargePaused === 'function' && globalThis._egMarksGauntletChargePaused()) return;
    // Ailments: frozen monsters don't charge, chilled ones charge at 50%
    const chargeMult = (typeof _egGetMonsterChargeMultiplier === 'function') ? _egGetMonsterChargeMultiplier(m) : 1;
    m.currentCharge += 0.1 * chargeMult;
    if (m.currentCharge >= m.chargeMax) {
        m.currentCharge = 0;
        _egFireMonsterAttack(m);
    }
}

// The charge pool is stored in SECONDS, so when the full-charge time changes
// (equipping/unequipping a speed item, buffs) the stored amount must be
// rescaled or the bar jumps: a full 100% bar on a slow 20s interval would
// become 400% once the interval drops to 5s. Keeps the bar's % constant.
let _egLastChargeMax = 0;
function _egSyncChargeToInterval(max) {
    if (_egLastChargeMax > 0 && max > 0 && Math.abs(max - _egLastChargeMax) > 1e-6) {
        globalThis._egPlayerCurrentCharge = (globalThis._egPlayerCurrentCharge || 0) * (max / _egLastChargeMax);
    }
    _egLastChargeMax = max;
}

// Current charge % (0..5) of the manual melee bar. 1 = fully charged and
// ready for a full-damage strike; above 1 the strike OVERCHARGES through
// the weapon-art tiers (2 = dash, 3 = sky leap, 4 = nova, 5 = grand nova -
// see EG_MELEE_OVERCHARGE_* in encounter-melee-arts.js).
// Returns 0 outside encounters with no max.
export function _egGetPlayerChargePct() {
    if (_egDualOn()) return Math.max(_egGetHandChargePct(1), _egGetHandChargePct(2));
    return _egGetHandChargePct(1);
}

// DUAL-WIELD: two one-handed weapons run two independent charge bars (hand 1
// = main hand, hand 2 = off-hand), each on its own weapon's charge time.
// One attack key strikes with whichever bar is fuller (_egGetLeadHand); the
// other keeps charging untouched.
function _egDualOn() {
    try { return typeof _egIsDualWielding === 'function' && !!_egIsDualWielding(); } catch (e) { return false; }
}

let _egLastChargeMax2 = 0;
function _egHandMax(hand) {
    if (_egDualOn()) {
        const m = _egGetPlayerAttackIntervalForHand(hand);
        return m > 0 ? m : 0;
    }
    return (typeof _egGetPlayerAttackInterval === 'function') ? _egGetPlayerAttackInterval() : 0;
}

// Charge % (0..5) of one hand's bar. Hand 2 is only meaningful while dual-wielding.
export function _egGetHandChargePct(hand) {
    const max = _egHandMax(hand === 2 ? 2 : 1);
    if (!max || max <= 0) return 0;
    const cap = (typeof EG_MELEE_OVERCHARGE_RATIO === 'number') ? EG_MELEE_OVERCHARGE_RATIO : 1;
    if (hand === 2) {
        if (_egLastChargeMax2 > 0 && Math.abs(max - _egLastChargeMax2) > 1e-6) {
            globalThis._egPlayerCurrentCharge2 = (globalThis._egPlayerCurrentCharge2 || 0) * (max / _egLastChargeMax2);
        }
        _egLastChargeMax2 = max;
        return Math.min(cap, Math.max(0, (globalThis._egPlayerCurrentCharge2 || 0) / max));
    }
    _egSyncChargeToInterval(max);
    return Math.min(cap, Math.max(0, globalThis._egPlayerCurrentCharge / max));
}

// The hand a strike would use right now: the fuller bar (ties go to hand 1).
export function _egGetLeadHand() {
    if (!_egDualOn()) return 1;
    return _egGetHandChargePct(2) > _egGetHandChargePct(1) + 1e-9 ? 2 : 1;
}

// Spends the current charge and returns the consumed % (0..1). Manual
// melee strikes (E) call this at key-press time; the strike then deals
// that share of full damage (linear, Secret-of-Mana-style). Dual-wielding
// spends only the leading hand's bar (the hand is left in _egStrikeHand).
export function _egConsumePlayerCharge() {
    const hand = _egGetLeadHand();
    const pct = _egGetHandChargePct(hand);
    if (hand === 2) globalThis._egPlayerCurrentCharge2 = 0;
    else globalThis._egPlayerCurrentCharge = 0;
    globalThis._egStrikeHand = hand;
    return pct;
}

// True while melee charging is paused: holding the parry key, or frozen
// solid. Chilled only slows charging (see _egGetPlayerChargeMultiplier).
export function _egIsPlayerChargePaused() {
    if (typeof _egHoldEPauseActive !== 'undefined' && globalThis._egHoldEPauseActive) return true;
    if (typeof _egGetPlayerChargeMultiplier === 'function' && _egGetPlayerChargeMultiplier() === 0) return true;
    return false;
}

// Advances the player's melee charge bar (Secret-of-Mana-style). The bar
// refills ON ITS OWN toward 100% - tapping E spends whatever charge is
// ready (weak poke right after a strike, full hit when the bar is full),
// while HOLDING the attack key past full OVERCHARGES through the
// weapon-art tiers (see combat-weapon-swing.js): the release strike spends
// the whole bar. The full-charge time comes from the equipped weapon (see
// _egGetPlayerAttackInterval).
// OVERCHARGE: past 100% the held bar keeps filling up to
// EG_MELEE_OVERCHARGE_RATIO (500%) - a strike released in a tier band
// deals proportionally more damage (200% = 2x hit, 500% = 5x) AND
// unleashes that tier's weapon art (dash / sky leap / nova / grand nova).
// NOTE: boss set-piece charge pauses were removed with the manual system -
// the bar is a charge-up, not free DPS, so finales no longer freeze it.
// Only the parry hold and ailments (frozen/chill) still gate charging.
export function _egTickPlayer() {
    // Hold-parry pause: while the parry key (R by default) is held during an
    // endgame encounter, freeze the player's own melee charge bar.
    if (typeof _egHoldEPauseActive !== 'undefined' && globalThis._egHoldEPauseActive) {
        if (typeof _egIsActive === 'function' && _egIsActive()) return;
        // If not in an active encounter, fall through (no effect outside endgame)
    }
    // Ailments: frozen stops the charge bar entirely, chilled slows it to
    // half speed (see _egGetPlayerChargeMultiplier in endgame-ailments.js).
    const chargeMult = (typeof _egGetPlayerChargeMultiplier === 'function') ? _egGetPlayerChargeMultiplier() : 1;
    if (chargeMult <= 0) return;
    const dual = _egDualOn();
    const max1 = _egHandMax(1);
    if (!max1 || max1 <= 0) return;
    _egGetHandChargePct(1); // keeps the stored charge in step with the full-charge time
    const overchargeCap = (typeof EG_MELEE_OVERCHARGE_RATIO === 'number') ? EG_MELEE_OVERCHARGE_RATIO : 1;
    const holding = !!globalThis._egMeleeHoldActive;
    // Only the leading hand follows a held key into overcharge.
    const lead = dual ? _egGetLeadHand() : 1;
    const advance = (key, max, isHeld) => {
        if (!isHeld) {
            // SoM auto-charge: no held key, no overcharge - refill toward 100%
            // and wait there until the player taps (quick hit) or holds (arts).
            if ((globalThis[key] || 0) < max) {
                globalThis[key] = Math.min(max, (globalThis[key] || 0) + 0.1 * chargeMult); // Ticks at 10Hz
            }
            return;
        }
        // Holding: charge (from wherever the bar stands) past full into
        // OVERCHARGE, up to the cap, and hold there until released. Each
        // crossed milestone slows the climb (see
        // EG_MELEE_OVERCHARGE_RATE_PER_TIER) - the 500% grand nova takes
        // patience, like a Secret-of-Mana weapon level.
        let bandRate = 1;
        try {
            bandRate = _egOverchargeRateForTier(
                _egMeleeTierForCharge(Math.min((globalThis[key] || 0) / max, overchargeCap)));
        } catch (e) { bandRate = 1; }
        globalThis[key] = Math.min(max * overchargeCap, (globalThis[key] || 0) + 0.1 * chargeMult * bandRate); // Ticks at 10Hz
    };
    advance('_egPlayerCurrentCharge', max1, holding && lead === 1);
    if (dual) {
        const max2 = _egHandMax(2);
        if (max2 > 0) {
            _egGetHandChargePct(2);
            advance('_egPlayerCurrentCharge2', max2, holding && lead === 2);
        }
    } else {
        globalThis._egPlayerCurrentCharge2 = 0;
    }
    // Charge-level feedback: crossing 100% / 200% / 300% / 400% / 500%
    // plays a rising tick so auto-ready and each overcharge tier feels
    // like charging up.
    try {
        const pct = _egGetPlayerChargePct();
        const level = pct >= overchargeCap - 0.001 ? 5 : pct >= 4 ? 4 : pct >= 3 ? 3 : pct >= 2 ? 2 : pct >= 1 ? 1 : 0;
        if (level > (globalThis._egMeleeChargeLevel || 0)) {
            globalThis._egMeleeChargeLevel = level;
            if (typeof Audio_Manager !== 'undefined' && Audio_Manager && typeof Audio_Manager.playSFX === 'function') {
                // 100% = ready ping; 200%+ = overcharge tier-up. The hum
                // loop runs while holding past full (stopped on release).
                Audio_Manager.playSFX(level === 1 ? 'charge_ready' : 'charge_tier_up', 'drifterLevelUp');
                if (level >= 2 && globalThis._egMeleeHoldActive) Audio_Manager.playSFX('charge_loop');
            }
        }
    } catch (e) {}
}

// ── Hold-parry charge pause - freeze own melee charge bar while held ───────
export function _egSetHoldEPauseVisual(isPaused) {
    const bar = document.getElementById('avatar-charge-fill');
    if (bar) bar.classList.toggle('eg-charge-paused', !!isPaused);
    const alt = document.getElementById('eg-player-charge-bar');
    if (alt) alt.classList.toggle('eg-charge-paused', !!isPaused);
    const bar2 = document.getElementById('avatar-charge2-fill');
    if (bar2) bar2.classList.toggle('eg-charge-paused', !!isPaused);
    // Sprite feedback - show "CHARGE PAUSED" directly on the avatar while the parry key is held
    const hud = document.getElementById('player-avatar-wrapper');
    if (hud) {
        let lbl = document.getElementById('eg-hold-pause-label');
        if (isPaused) {
            if (!lbl) {
                lbl = document.createElement('div');
                lbl.id = 'eg-hold-pause-label';
                hud.appendChild(lbl);
            }
            const raw = (typeof t === 'function') ? (t('eg_hold_paused') || t('eg_parrying')) : '';
            const txt = raw && raw !== 'eg_hold_paused' && raw !== 'eg_parrying' ? raw : 'PARRYING';
            lbl.textContent = txt || 'PARRYING';
            lbl.style.display = '';
        } else if (lbl) {
            lbl.remove();
        }
    } else if (!isPaused) {
        // No avatar yet - ensure stray label elsewhere is cleaned up
        const stray = document.getElementById('eg-hold-pause-label');
        if (stray) stray.remove();
    }
}

export function _initEgHoldEPauseHotkey() {
    // Parry key is configurable (js/keybinds.js, action 'eg-parry', R by
    // default). keydown starts the parry window, keyup ends it.
    const isParryKey = (e) => {
        if (typeof keybindMatches === 'function') return globalThis.keybindMatches(e, 'eg-parry');
        return e.key && e.key.toLowerCase() === 'r';
    };
    document.addEventListener('keydown', (e) => {
        if (!e || !isParryKey(e)) return;
        if (e.repeat) return;
        // The Snail: pressing the parry key drops a held broom (it respawns outside the grid).
        if (typeof _egSnailDropBroom === 'function') {
            try { globalThis._egSnailDropBroom(); } catch (err) {}
        }
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (document.querySelector('.modal-bg.show')) return;
        if (typeof _egIsActive === 'function' && !_egIsActive()) return;
        if (typeof _egHoldEPauseActive !== 'undefined' && globalThis._egHoldEPauseActive) return;
        globalThis._egHoldEPauseActive = true;
        _egSetHoldEPauseVisual(true);
    });
    document.addEventListener('keyup', (e) => {
        if (!e || !isParryKey(e)) return;
        if (typeof _egHoldEPauseActive !== 'undefined' && !globalThis._egHoldEPauseActive) {
            _egSetHoldEPauseVisual(false);
            return;
        }
        globalThis._egHoldEPauseActive = false;
        _egSetHoldEPauseVisual(false);
    });
    window.addEventListener('blur', () => {
        if (typeof _egHoldEPauseActive !== 'undefined' && globalThis._egHoldEPauseActive) {
            globalThis._egHoldEPauseActive = false;
            _egSetHoldEPauseVisual(false);
        }
    });
    // Also clear on encounter stop / visibility loss
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && typeof _egHoldEPauseActive !== 'undefined' && globalThis._egHoldEPauseActive) {
            globalThis._egHoldEPauseActive = false;
            _egSetHoldEPauseVisual(false);
        }
    });
}
_initEgHoldEPauseHotkey();

// ── Monster-card hover tooltip viewport clamp ──────────────────────────
// The compact card tooltip is CSS-positioned BELOW the emoji (top: 125%).
// Cards spawned into bottom-docked panels (eg-monster-panel, eg-panel-bottom)
// or the lower part of the right-side stack can push that tooltip past the
// bottom of the screen. On hover we measure the tooltip and, when it would
// clip the viewport, flip it above the card via .eg-tip-flip.
export const EG_CARD_TOOLTIP_VIEW_MARGIN = 6;
document.addEventListener('mouseover', (e) => {
    const emoji = e.target && e.target.closest ? e.target.closest('.eg-emoji-wrapper') : null;
    if (!emoji) return;
    // Cards are static while hovered - evaluate once per rendered card.
    if (emoji.dataset.egTipClamped) return;
    emoji.dataset.egTipClamped = '1';

    const tip = emoji.querySelector('.eg-monster-compact-tooltip');
    if (!tip) return;

    // Let the CSS :hover rule show the tooltip, then measure its real box.
    requestAnimationFrame(() => {
        if (!tip.isConnected) return;
        const rect = tip.getBoundingClientRect();
        tip.classList.toggle('eg-tip-flip',
            rect.bottom > window.innerHeight - EG_CARD_TOOLTIP_VIEW_MARGIN);
    });
});

// Renders the visual width of the player's charge bar (manual melee charge:
// fills toward 100% and holds until spent by an E strike). Also owns the
// bar's paused/ready styling centrally so leftover per-boss 'eg-charge-paused'
// toggles from the removed set-piece freeze era can't desync the visual:
// paused reflects ONLY the live pause state (parry hold / frozen).
export function _egUpdatePlayerChargeBar() {
    const dual = _egDualOn();
    const paused = _egIsPlayerChargePaused();
    const lead = dual ? _egGetLeadHand() : 1;
    // One readout per hand (hand 2 only exists while dual-wielding). Overcharge
    // milestone look: each weapon-art tier restyles the bar + readout a step
    // further (see eg-charge-tier1..4 in monsters.css).
    const paint = (hand, barIds, labelId) => {
        const pct = _egGetHandChargePct(hand);
        const overcharged = pct > 1.001;
        const ready = pct >= 1 && !paused;
        let tier = 0;
        try { tier = (typeof _egMeleeTierForCharge === 'function') ? _egMeleeTierForCharge(pct) : 0; }
        catch (e) { tier = 0; }
        barIds.forEach(id => {
            const bar = document.getElementById(id);
            if (!bar) return;
            // Visual fill caps at 100% - overcharge reads via the glow + label.
            bar.style.width = Math.min(100, pct * 100) + '%';
            bar.classList.toggle('eg-charge-paused', paused);
            bar.classList.toggle('eg-charge-ready', ready);
            bar.classList.toggle('eg-charge-overcharged', overcharged);
            for (let i = 1; i <= 4; i++) bar.classList.toggle('eg-charge-tier' + i, tier === i);
        });
        // % readout next to the avatar's charge bar (pops at 100% - see CSS).
        const label = document.getElementById(labelId);
        if (label) {
            label.textContent = `${Math.floor(pct * 100)}%`;
            label.classList.toggle('eg-charge-ready', ready);
            label.classList.toggle('eg-charge-overcharged', overcharged);
            for (let i = 1; i <= 4; i++) label.classList.toggle('eg-charge-tier' + i, tier === i);
        }
    };
    paint(1, ['eg-player-charge-bar', 'avatar-charge-fill'], 'avatar-charge-text');
    // Second bar + the small hand numbers: only while dual-wielding. The
    // number of the hand that would strike next is highlighted.
    const row2 = document.getElementById('avatar-charge2-row');
    if (row2) row2.style.display = dual ? 'flex' : 'none';
    ['avatar-charge-hand1', 'avatar-charge-hand2'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = dual ? '' : 'none';
        el.classList.toggle('eg-hand-next', dual && lead === i + 1);
    });
    if (dual) paint(2, ['avatar-charge2-fill'], 'avatar-charge2-text');
    // Rooted-while-charging indicator: synced here centrally (10Hz) so
    // hold-begin, hold-cancel and strike-release can never desync it.
    try { _egSyncMeleeRootedVisual(!!globalThis._egMeleeHoldActive); } catch (e) {}
}

// Delay before the rooted warning appears: quick taps must never flash
// it - only a committed hold earns the ring + tag. Pure - unit-tested.
export const EG_MELEE_ROOTED_INDICATOR_DELAY_MS = 2000;

// Rooted indicator for a charged melee hold: the avatar wears a warning
// ring + VULNERABLE tag while the attack key is held (no movement, no
// evasion/block, amplified damage taken - see _egPlayerTakeDamage). The
// indicator only appears once the hold is committed (held longer than
// EG_MELEE_ROOTED_INDICATOR_DELAY_MS) - taps are too short to ever show
// it. Best-effort; never throws.
function _egSyncMeleeRootedVisual(rooted) {
    if (typeof document === 'undefined') return;
    let show = !!rooted;
    if (show) {
        // Taps must not flash the warning: compare against the hold-start
        // stamp written by _egMeleeBeginHold (missing/zero stamp = show
        // immediately - fail visible, never fail silent).
        try {
            const since = (typeof _egMeleeHoldStartAt !== 'undefined')
                ? globalThis._egMeleeHoldStartAt : 0;
            if (since) show = (Date.now() - since) >= EG_MELEE_ROOTED_INDICATOR_DELAY_MS;
        } catch (e) {}
    }
    const avatar = document.getElementById('player-avatar-wrapper');
    if (avatar) avatar.classList.toggle('eg-melee-rooted', show);
    let lbl = document.getElementById('eg-melee-rooted-label');
    if (show) {
        if (avatar && !lbl) {
            lbl = document.createElement('div');
            lbl.id = 'eg-melee-rooted-label';
            avatar.appendChild(lbl);
        }
        if (lbl) {
            let txt = '';
            try { txt = (typeof t === 'function') ? t('eg_melee_rooted') : ''; } catch (e) {}
            lbl.textContent = (txt && txt !== 'eg_melee_rooted') ? txt : '⛓ VULNERABLE!';
            lbl.style.display = '';
        }
    } else if (lbl) {
        lbl.remove();
    }
}


// Runs at 10Hz. Advances every monster's charge bar and fires their attack
// when the bar fills. Also calls _egBossTick for per-tick boss logic.
export function _egTickLoop() {
    if (!_egIsActive()) return;
    if (typeof dead !== 'undefined' && globalThis.dead) return;
    if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;

    _egCheckMistakeLimit();
    _egUpdateMeleeMarker();
    _egMaybeShowLowHealthWarning();

    globalThis._egBossTick();
    if (typeof _egTickAilments === 'function') _egTickAilments();
    if (typeof _egHazardsTick === 'function') _egHazardsTick();
    globalThis._egMonsters.forEach(_egTickMonster);

    // Gear: lifeRegen - heals the player once per second
    globalThis._egHealSilent = true;
    try { _egTickLifeRegen(); } finally { globalThis._egHealSilent = false; }

    // Player mechanics
    _egTickPlayer();
    // Keep the manual melee charge bar (width + paused/ready styling) live.
    if (typeof _egUpdatePlayerChargeBar === 'function') _egUpdatePlayerChargeBar();
    if (typeof _egRefreshPlayerStatusIcons === 'function') _egRefreshPlayerStatusIcons();
    // Don't resurrect the sprite after defeat - the tick may have set
    // dead = true mid-iteration (DoT / hazard kill).
    if (typeof dead !== 'undefined' && globalThis.dead) return;
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    globalThis._renderPlayerAvatar();
    //_renderPlayerCharge();

    _egUpdateBars();
}
