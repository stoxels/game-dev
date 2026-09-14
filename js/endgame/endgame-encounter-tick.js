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
function _egTickMonster(m) {
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
            showToast(`😡 ${t('eg_mm_toast_enrage') || 'The Boss is enraged!'}`);
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
    if (m.isBoss && typeof _egMarksGauntletChargePaused === 'function' && _egMarksGauntletChargePaused()) return;
    // Ailments: frozen monsters don't charge, chilled ones charge at 50%
    const chargeMult = (typeof _egGetMonsterChargeMultiplier === 'function') ? _egGetMonsterChargeMultiplier(m) : 1;
    m.currentCharge += 0.1 * chargeMult;
    if (m.currentCharge >= m.chargeMax) {
        m.currentCharge = 0;
        _egFireMonsterAttack(m);
    }
}

// Current charge % (0..1) of the manual melee bar. 1 = fully charged and
// ready for a full-damage strike. Returns 0 outside encounters with no max.
function _egGetPlayerChargePct() {
    if (typeof _egGetPlayerAttackInterval !== 'function') return 0;
    const max = _egGetPlayerAttackInterval();
    if (!max || max <= 0) return 0;
    return Math.min(1, Math.max(0, _egPlayerCurrentCharge / max));
}

// Spends the current charge and returns the consumed % (0..1). Manual
// melee strikes (E) call this at key-press time; the strike then deals
// that share of full damage (linear, Secret-of-Mana-style).
function _egConsumePlayerCharge() {
    const pct = _egGetPlayerChargePct();
    _egPlayerCurrentCharge = 0;
    return pct;
}

// True while melee charging is paused: holding the parry key, or frozen
// solid. Chilled only slows charging (see _egGetPlayerChargeMultiplier).
function _egIsPlayerChargePaused() {
    if (typeof _egHoldEPauseActive !== 'undefined' && _egHoldEPauseActive) return true;
    if (typeof _egGetPlayerChargeMultiplier === 'function' && _egGetPlayerChargeMultiplier() === 0) return true;
    return false;
}

// Advances the player's melee charge bar (Secret-of-Mana-style). The bar
// charges over time up to 100% and STAYS full until spent by a manual
// melee strike (E) - there are no automatic attacks. The full-charge time
// comes from the equipped weapon (see _egGetPlayerAttackInterval).
// NOTE: boss set-piece charge pauses were removed with the manual system -
// the bar is a charge-up, not free DPS, so finales no longer freeze it and
// the sprite never lunges on its own. Only the parry hold and ailments
// (frozen/chill) still gate charging.
function _egTickPlayer() {
    // Hold-parry pause: while the parry key (R by default) is held during an
    // endgame encounter, freeze the player's own melee charge bar.
    if (typeof _egHoldEPauseActive !== 'undefined' && _egHoldEPauseActive) {
        if (typeof _egIsActive === 'function' && _egIsActive()) return;
        // If not in an active encounter, fall through (no effect outside endgame)
    }
    // Ailments: frozen stops the charge bar entirely, chilled slows it to
    // half speed (see _egGetPlayerChargeMultiplier in endgame-ailments.js).
    const chargeMult = (typeof _egGetPlayerChargeMultiplier === 'function') ? _egGetPlayerChargeMultiplier() : 1;
    if (chargeMult <= 0) return;
    const max = (typeof _egGetPlayerAttackInterval === 'function') ? _egGetPlayerAttackInterval() : 0;
    if (!max || max <= 0) return;
    // Charge up to full and hold there until a manual strike spends it.
    _egPlayerCurrentCharge = Math.min(max, _egPlayerCurrentCharge + 0.1 * chargeMult); // Ticks at 10Hz
}

// ── Hold-parry charge pause - freeze own melee charge bar while held ───────
function _egSetHoldEPauseVisual(isPaused) {
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

function _initEgHoldEPauseHotkey() {
    // Parry key is configurable (js/keybinds.js, action 'eg-parry', R by
    // default). keydown starts the parry window, keyup ends it.
    const isParryKey = (e) => {
        if (typeof keybindMatches === 'function') return keybindMatches(e, 'eg-parry');
        return e.key && e.key.toLowerCase() === 'r';
    };
    document.addEventListener('keydown', (e) => {
        if (!e || !isParryKey(e)) return;
        if (e.repeat) return;
        // The Snail: pressing the parry key drops a held broom (it respawns outside the grid).
        if (typeof _egSnailDropBroom === 'function') {
            try { _egSnailDropBroom(); } catch (err) {}
        }
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (document.querySelector('.modal-bg.show')) return;
        if (typeof _egIsActive === 'function' && !_egIsActive()) return;
        if (typeof _egHoldEPauseActive !== 'undefined' && _egHoldEPauseActive) return;
        _egHoldEPauseActive = true;
        _egSetHoldEPauseVisual(true);
    });
    document.addEventListener('keyup', (e) => {
        if (!e || !isParryKey(e)) return;
        if (typeof _egHoldEPauseActive !== 'undefined' && !_egHoldEPauseActive) {
            _egSetHoldEPauseVisual(false);
            return;
        }
        _egHoldEPauseActive = false;
        _egSetHoldEPauseVisual(false);
    });
    window.addEventListener('blur', () => {
        if (typeof _egHoldEPauseActive !== 'undefined' && _egHoldEPauseActive) {
            _egHoldEPauseActive = false;
            _egSetHoldEPauseVisual(false);
        }
    });
    // Also clear on encounter stop / visibility loss
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && typeof _egHoldEPauseActive !== 'undefined' && _egHoldEPauseActive) {
            _egHoldEPauseActive = false;
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
const EG_CARD_TOOLTIP_VIEW_MARGIN = 6;
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
function _egUpdatePlayerChargeBar() {
    const pct = _egGetPlayerChargePct() * 100;
    const paused = _egIsPlayerChargePaused();
    const ready = pct >= 100 && !paused;
    ['eg-player-charge-bar', 'avatar-charge-fill'].forEach(id => {
        const bar = document.getElementById(id);
        if (!bar) return;
        bar.style.width = pct + '%';
        bar.classList.toggle('eg-charge-paused', paused);
        bar.classList.toggle('eg-charge-ready', ready);
    });
    // % readout next to the avatar's charge bar (pops at 100% - see CSS).
    const label = document.getElementById('avatar-charge-text');
    if (label) {
        label.textContent = `${Math.floor(pct)}%`;
        label.classList.toggle('eg-charge-ready', ready);
    }
}


function _egGetMaxAllowedMistakes() {
    // Hardcore: no mistake is allowed - overrides map limit and gear bonuses
    if (typeof curMods !== 'undefined' && curMods.hardcore) return 0;
    const def = _egMapDef || cur;
    if (!def || def.egMaxMistakes == null) return null;
    const gearBonus = (typeof _egComputePlayerStats === 'function')
        ? (_egComputePlayerStats().mistakeCount || 0) : 0;
    return def.egMaxMistakes + gearBonus;
}

function _egCheckMistakeLimit() {
    const max = _egGetMaxAllowedMistakes();
    if (max == null) return;
    // Low-mistakes overlay - fires when only 3/2/1/0 remain (deduped inside)
    if (typeof _egMaybeShowMistakesWarning === 'function') _egMaybeShowMistakesWarning();
    if (typeof mistakeCount !== 'undefined' && mistakeCount > max) {
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

function _egGetMistakesRemaining() {
    const max = _egGetMaxAllowedMistakes();
    if (max == null) return null;
    const curCount = (typeof mistakeCount !== 'undefined') ? mistakeCount : 0;
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
let _egLastLifeRegenAt = 0;
function _egTickLifeRegen() {
    const now = Date.now();
    if (now - _egLastLifeRegenAt < EG_LIFE_REGEN_INTERVAL_MS) return;
    _egLastLifeRegenAt = now;

    const regen = _egComputePlayerStats().lifeRegen || 0;
    if (regen <= 0 || playerCurrentHP <= 0 || playerCurrentHP >= playerMaxHP) return;

    // Active map run: No Life Regeneration - gear regen is disabled.
    if (typeof _egHasActiveMapMod === 'function' && _egHasActiveMapMod('map_no_regeneration')) return;

    playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + regen);
    if (typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
}

// Runs at 10Hz. Advances every monster's charge bar and fires their attack
// when the bar fills. Also calls _egBossTick for per-tick boss logic.
function _egTickLoop() {
    if (!_egIsActive()) return;
    if (typeof dead !== 'undefined' && dead) return;
    if (typeof _gamePaused !== 'undefined' && _gamePaused) return;

    _egCheckMistakeLimit(); 
    _egMaybeShowLowHealthWarning();

    _egBossTick();
    if (typeof _egTickAilments === 'function') _egTickAilments();
    if (typeof _egHazardsTick === 'function') _egHazardsTick();
    _egMonsters.forEach(_egTickMonster);

    // Gear: lifeRegen - heals the player once per second
    _egTickLifeRegen();

    // Player mechanics
    _egTickPlayer();
    // Keep the manual melee charge bar (width + paused/ready styling) live.
    if (typeof _egUpdatePlayerChargeBar === 'function') _egUpdatePlayerChargeBar();
    if (typeof _egRefreshPlayerStatusIcons === 'function') _egRefreshPlayerStatusIcons();
    // Don't resurrect the sprite after defeat - the tick may have set
    // dead = true mid-iteration (DoT / hazard kill).
    if (typeof dead !== 'undefined' && dead) return;
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    _renderPlayerAvatar();
    //_renderPlayerCharge();

    _egUpdateBars();
}

// ── Pause handling for endgame encounters ────────────────────────────────
// While the game is paused (Escape) the tick loop already early-returns,
// freezing charge bars, soft-enrage via _egBossTick, hazards and ailments.
// Date.now()-based expiries (boss spawn time, ailments, lockouts, etc.)
// would otherwise keep advancing wall-clock time while paused, so we shift
// them forward by the paused duration on resume.
let _egPauseStartedAt = 0;
function _egOnPause() {
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    _egPauseStartedAt = Date.now();
    if (typeof _egPauseGridDrops === 'function') {
        try { _egPauseGridDrops(); } catch (e) {}
    }
}
function _egOnResume() {
    if (!_egPauseStartedAt) return;
    const delta = Date.now() - _egPauseStartedAt;
    _egPauseStartedAt = 0;
    if (delta <= 0) {
        if (typeof _egResumeGridDrops === 'function') {
            try { _egResumeGridDrops(); } catch (e) {}
        }
        return;
    }
    _egMonsters.forEach(m => {
        if (m.bossSpawnTime) m.bossSpawnTime += delta;
        if (m.staggeredUntil) m.staggeredUntil += delta;
        if (m.statuses) Object.values(m.statuses).forEach(st => { if (st.until) st.until += delta; });
    });
    if (typeof _egEncounterStartAt !== 'undefined' && _egEncounterStartAt) _egEncounterStartAt += delta;
    if (typeof _egPlayerBlockLockoutUntil !== 'undefined' && _egPlayerBlockLockoutUntil) _egPlayerBlockLockoutUntil += delta;
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
