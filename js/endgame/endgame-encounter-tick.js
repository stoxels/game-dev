//------------------------------------------------------------------------
// PHASE 3 (endgame step): converted to a real ES module. Do not add new
// bare cross-file references - import explicitly or use globalThis.X for
// names still living in the concatenated body. See MIGRATION.md.
//------------------------------------------------------------------------
import { t } from '../translation/translations.js';
import { _egGetMonsterChargeMultiplier, _egGetPlayerChargeMultiplier, _egPlayerStatuses, _egPuzzleEffects, _egRefreshPlayerStatusIcons, _egTickAilments } from './endgame-ailments.js';
import { _egEndMapDefeated } from './endgame-encounter-chain.js';
import { _egMaybeShowLowHealthWarning, _egMaybeShowMistakesWarning } from './endgame-encounter-overlays.js';
import { EG_LIFE_REGEN_INTERVAL_MS, EG_MELEE_OVERCHARGE_RATIO, _egFireMonsterAttack, _egUpdateBars } from './endgame-encounter.js';
import { _egPauseGridDrops, _egResumeGridDrops } from './endgame-grid-pickups.js';
import { _egHazardsTick } from './endgame-hazards.js';
import { _egGetActiveMapModValue, _egHasActiveMapMod } from './endgame-map-launch.js';
import { _egComputePlayerStats, _egGetPlayerAttackInterval } from './endgame-player-stats.js';
import { _egIsActive } from './endgame-state.js';

//------------------------------------------------------------------------
// Phase 3 step 7: live globalThis accessors for externally-mutated state.
// (derived from write-site audit by dev/scratch/convert-endgame.mjs)
//------------------------------------------------------------------------
try { Object.defineProperty(globalThis, '_egLastMistakesRemaining', { get() { return _egLastMistakesRemaining; }, set(v) { _egLastMistakesRemaining = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egLastMistakesWarningShown', { get() { return _egLastMistakesWarningShown; }, set(v) { _egLastMistakesWarningShown = v; }, configurable: true }); } catch (e) {}

//  endgame-encounter-tick.js
//  COMBAT TICK LOOP - extracted 2026-09-10 from endgame-encounter.js
//  (tick loop, player/monster charge ticking, charge-pause gates,
//  hold-parry pause, mistakes-limit logic, life regen, pause/resume).
//  Loads AFTER endgame-encounter.js (its load-time code only touches
//  window and its own definitions; runtime calls cross freely).
//
//------------------------------------------------------------------------
//-------------------COMBAT TICK LOOP-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

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
            globalThis.showToast(`😡 ${t('eg_mm_toast_enrage') || 'The Boss is enraged!'}`);
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

// Current charge % (0..2) of the manual melee bar. 1 = fully charged and
// ready for a full-damage strike; above 1 the strike OVERCHARGES (deals
// proportionally more damage, see EG_MELEE_OVERCHARGE_* in endgame-encounter.js).
// Returns 0 outside encounters with no max.
export function _egGetPlayerChargePct() {
    if (typeof _egGetPlayerAttackInterval !== 'function') return 0;
    const max = _egGetPlayerAttackInterval();
    if (!max || max <= 0) return 0;
    const cap = (typeof EG_MELEE_OVERCHARGE_RATIO === 'number') ? EG_MELEE_OVERCHARGE_RATIO : 1;
    return Math.min(cap, Math.max(0, globalThis._egPlayerCurrentCharge / max));
}

// Spends the current charge and returns the consumed % (0..1). Manual
// melee strikes (E) call this at key-press time; the strike then deals
// that share of full damage (linear, Secret-of-Mana-style).
export function _egConsumePlayerCharge() {
    const pct = _egGetPlayerChargePct();
    globalThis._egPlayerCurrentCharge = 0;
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
// charges over time up to 100% and STAYS full until spent by a manual
// melee strike (E) - there are no automatic attacks. The full-charge time
// comes from the equipped weapon (see _egGetPlayerAttackInterval).
// OVERCHARGE: past 100% the bar keeps filling up to EG_MELEE_OVERCHARGE_RATIO
// (200%) - a strike released above the cap deals proportionally more damage
// (150% charge = 1.5x hit, 200% = 2x). Rewards patience over spam-tapping.
// NOTE: boss set-piece charge pauses were removed with the manual system -
// the bar is a charge-up, not free DPS, so finales no longer freeze it and
// the sprite never lunges on its own. Only the parry hold and ailments
// (frozen/chill) still gate charging.
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
    const max = (typeof _egGetPlayerAttackInterval === 'function') ? _egGetPlayerAttackInterval() : 0;
    if (!max || max <= 0) return;
    // Charge past full into OVERCHARGE (up to EG_MELEE_OVERCHARGE_RATIO) and
    // hold there until a manual strike spends it.
    const overchargeCap = (typeof EG_MELEE_OVERCHARGE_RATIO === 'number') ? EG_MELEE_OVERCHARGE_RATIO : 1;
    globalThis._egPlayerCurrentCharge = Math.min(max * overchargeCap, globalThis._egPlayerCurrentCharge + 0.1 * chargeMult); // Ticks at 10Hz
}

// ── Hold-parry charge pause - freeze own melee charge bar while held ───────
export function _egSetHoldEPauseVisual(isPaused) {
    const bar = document.getElementById('avatar-charge-fill');
    if (bar) bar.classList.toggle('eg-charge-paused', !!isPaused);
    const alt = document.getElementById('eg-player-charge-bar');
    if (alt) alt.classList.toggle('eg-charge-paused', !!isPaused);
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
    const pct = _egGetPlayerChargePct();
    const overcharged = pct > 1.001;
    const paused = _egIsPlayerChargePaused();
    const ready = pct >= 1 && !paused;
    ['eg-player-charge-bar', 'avatar-charge-fill'].forEach(id => {
        const bar = document.getElementById(id);
        if (!bar) return;
        // Visual fill caps at 100% - overcharge reads via the glow + label.
        bar.style.width = Math.min(100, pct * 100) + '%';
        bar.classList.toggle('eg-charge-paused', paused);
        bar.classList.toggle('eg-charge-ready', ready);
        bar.classList.toggle('eg-charge-overcharged', overcharged);
    });
    // % readout next to the avatar's charge bar (pops at 100% - see CSS).
    const label = document.getElementById('avatar-charge-text');
    if (label) {
        label.textContent = `${Math.floor(pct * 100)}%`;
        label.classList.toggle('eg-charge-ready', ready);
        label.classList.toggle('eg-charge-overcharged', overcharged);
    }
}


export function _egGetMaxAllowedMistakes() {
    // Hardcore: no mistake is allowed - overrides map limit and gear bonuses
    if (typeof curMods !== 'undefined' && globalThis.curMods.hardcore) return 0;
    const def = globalThis._egMapDef || globalThis.cur;
    if (!def || def.egMaxMistakes == null) return null;
    const gearBonus = (typeof _egComputePlayerStats === 'function')
        ? (_egComputePlayerStats().mistakeCount || 0) : 0;
    return def.egMaxMistakes + gearBonus;
}

export function _egCheckMistakeLimit() {
    const max = _egGetMaxAllowedMistakes();
    if (max == null) return;
    // Low-mistakes overlay - fires when only 3/2/1/0 remain (deduped inside)
    if (typeof _egMaybeShowMistakesWarning === 'function') _egMaybeShowMistakesWarning();
    if (typeof mistakeCount !== 'undefined' && globalThis.mistakeCount > max) {
        // Central defeat handler - the player keeps the loot collected so far.
        _egEndMapDefeated(t('eg_map_failed'), t('eg_too_many_mistakes'));
    }
}

// ── Mistakes-remaining warning (center-grid overlay) ─────────────────────
// Tracks the last remaining value so repeated HUD refreshes without a
// count change do not re-fire the banner, and increases (eraser) do not
// re-trigger a low-mistakes warning.
let _egLastMistakesWarningShown = null;
let _egLastMistakesRemaining = null;

export function _egGetMistakesRemaining() {
    const max = _egGetMaxAllowedMistakes();
    if (max == null) return null;
    const curCount = (typeof mistakeCount !== 'undefined') ? globalThis.mistakeCount : 0;
    return max - curCount;
}

// Fallback when timer.js hasn't defined it (e.g. isolated test harness):
// center-grid banners replace each other instead of stacking.
if (typeof _egClearCenterGridBanners !== 'function') {
    var _egClearCenterGridBanners = function (exceptId) {
        var ids = [
            'eg-low-time-warning-banner',
            'eg-mistakes-warning-banner',
            'eg-low-health-warning-banner',
            'eg-absorption-broken-banner',
            'eg-clock-call-banner',
            'eg-boss-arena-available-banner',
            'eg-map-cleared-banner'
        ];
        for (var i = 0; i < ids.length; i++) {
            if (ids[i] === exceptId) continue;
            const banner = document.getElementById(ids[i]);
            if (banner) banner.remove();
        }
    };
}


// Gear: lifeRegen - heals the player for lifeRegen HP once per second
// while an encounter is running. No-ops at full HP or when dead.
export let _egLastLifeRegenAt = 0;
export function _egTickLifeRegen() {
    const now = Date.now();
    if (now - _egLastLifeRegenAt < EG_LIFE_REGEN_INTERVAL_MS) return;
    _egLastLifeRegenAt = now;

    const regen = _egComputePlayerStats().lifeRegen || 0;
    if (regen <= 0 || globalThis.playerCurrentHP <= 0 || globalThis.playerCurrentHP >= globalThis.playerMaxHP) return;

    // Active map run: No Life Regeneration - gear regen is disabled.
    if (typeof _egHasActiveMapMod === 'function' && _egHasActiveMapMod('map_no_regeneration')) return;

    globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + regen);
    if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
}

// Runs at 10Hz. Advances every monster's charge bar and fires their attack
// when the bar fills. Also calls _egBossTick for per-tick boss logic.
export function _egTickLoop() {
    if (!_egIsActive()) return;
    if (typeof dead !== 'undefined' && globalThis.dead) return;
    if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;

    _egCheckMistakeLimit(); 
    _egMaybeShowLowHealthWarning();

    globalThis._egBossTick();
    if (typeof _egTickAilments === 'function') _egTickAilments();
    if (typeof _egHazardsTick === 'function') _egHazardsTick();
    globalThis._egMonsters.forEach(_egTickMonster);

    // Gear: lifeRegen - heals the player once per second
    _egTickLifeRegen();

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

// ── Pause handling for endgame encounters ────────────────────────────────
// While the game is paused (Escape) the tick loop already early-returns,
// freezing charge bars, soft-enrage via _egBossTick, hazards and ailments.
// Date.now()-based expiries (boss spawn time, ailments, lockouts, etc.)
// would otherwise keep advancing wall-clock time while paused, so we shift
// them forward by the paused duration on resume.
export let _egPauseStartedAt = 0;
export function _egOnPause() {
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    _egPauseStartedAt = Date.now();
    if (typeof _egPauseGridDrops === 'function') {
        try { _egPauseGridDrops(); } catch (e) {}
    }
}
export function _egOnResume() {
    if (!_egPauseStartedAt) return;
    const delta = Date.now() - _egPauseStartedAt;
    _egPauseStartedAt = 0;
    if (delta <= 0) {
        if (typeof _egResumeGridDrops === 'function') {
            try { _egResumeGridDrops(); } catch (e) {}
        }
        return;
    }
    globalThis._egMonsters.forEach(m => {
        if (m.bossSpawnTime) m.bossSpawnTime += delta;
        if (m.staggeredUntil) m.staggeredUntil += delta;
        if (m.statuses) Object.values(m.statuses).forEach(st => { if (st.until) st.until += delta; });
    });
    if (typeof window._egEncounterStartAt !== 'undefined' && window._egEncounterStartAt) window._egEncounterStartAt += delta;
    if (typeof _egPlayerBlockLockoutUntil !== 'undefined' && globalThis._egPlayerBlockLockoutUntil) globalThis._egPlayerBlockLockoutUntil += delta;
    if (typeof _egLastLifeRegenAt !== 'undefined' && _egLastLifeRegenAt) _egLastLifeRegenAt += delta;
    if (typeof _egPlayerStatuses !== 'undefined' && _egPlayerStatuses) {
        Object.values(_egPlayerStatuses).forEach(st => { if (st.until) st.until += delta; });
    }
    if (typeof _egPuzzleEffects !== 'undefined' && Array.isArray(_egPuzzleEffects)) {
        _egPuzzleEffects.forEach(e => { if (e.until) e.until += delta; });
    }
    if (typeof _egResumeGridDrops === 'function') {
        try { _egResumeGridDrops(); } catch (e) {}
    }
}
