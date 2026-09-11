//  endgame-encounter-tick.js
//  COMBAT TICK LOOP — extracted 2026-09-10 from endgame-encounter.js
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
    // Brutus's sacrificial zombies never attack — they only shamble into the
    // ground-slam band; their movement is driven by the roaming tick in
    // boss-brutus.js, so skip charge/attack entirely.
    if (m.isSacrificialZombie) return;

    // Active map run: monster regeneration — heals #% of max life per second.
    if (m.regenPctMaxLife > 0 && m.maxHP > 0 && m.currentHP > 0
        && m.currentHP < m.maxHP) {
        m.regenAcc = (m.regenAcc || 0) + 0.1;
        if (m.regenAcc >= 1) {
            const heal = Math.max(1, Math.round(m.maxHP * m.regenPctMaxLife / 100));
            m.currentHP = Math.min(m.maxHP, m.currentHP + heal);
            m.regenAcc = 0;
        }
    }

    // Active map run: bosses enrage below 30% life — one-time damage boost.
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

    // Active map run: wounded desperation — non-boss monsters below 25%
    // life fight harder (one-time damage boost).
    if (!m.isBoss && !m.desperationTriggered && m.desperationPct > 0
        && m.maxHP > 0 && m.damageValue > 0
        && m.currentHP > 0 && m.currentHP <= m.maxHP * 0.25) {
        m.desperationTriggered = true;
        m.damageValue = Math.round(m.damageValue * (1 + m.desperationPct / 100));
    }

    // Gear: stagger — the charge timer is paused for a short window after a hit
    if (m.staggeredUntil && Date.now() < m.staggeredUntil) return;
    // Gear: first_step — monsters don't charge-up their attacks for the first X seconds after spawning
    if (m.firstStepUntil && Date.now() < m.firstStepUntil) return;
    // The Marksman's Arrow Gauntlet: the boss's own attack charge freezes —
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

// Freeze-gates for the player auto-attack charge bar: an ordered list of
// global predicate function names. A gate "holds" when its predicate
// returns true AND an endgame encounter is active — during set-pieces the
// bar must not charge (dodge/read set-pieces are not free DPS time). The
// Clock's time-freeze (a window flag) and the Firefly's trial (a window
// function) stay as explicit checks after the loop — all gates are
// independent predicates, so order between them has no observable effect.
// New bosses add one entry here instead of another if-block in
// _egTickPlayer. Names are validated at load (all boss files load before
// this file), see the warn loop below.
const EG_PLAYER_CHARGE_PAUSE_GATES = [
    // The Snail's Snailgeddon: while the ≤20% finisher runs (countdown
    // AND the closing ring) the bar stays frozen (boss-snail.js).
    '_egSnailgeddonActive',
    // The Demolitionist's Bomb Maze: while the ≤25% finisher runs
    // (countdown AND the chase) the bar stays frozen
    // (boss-demolitionist.js).
    '_egCrashMazeActive',
    // The Bomber's TOTAL CARPET: while the ≤10% finale runs (countdown
    // AND the detonation waves) the bar stays frozen (boss-bomber.js).
    '_egBomberFinalActive',
    // The Creeper's SSSS…BOOM: while the ≤10% finale runs (countdown AND
    // the mega blast) the bar stays frozen (boss-creeper.js).
    '_egCrpFinalActive',
    // The Aegis's LAST BASTION: while the ≤10% finale runs (the beam
    // sweep AND the vanguard) the bar stays frozen (boss-aegis.js).
    '_egAgFinalActive',
    // The Needle's FINAL STITCH: while the ≤10% finale runs (the stabs
    // AND the last stitch) the bar stays frozen (boss-needle.js).
    '_egNdFinalActive',
    // The Monsoon's GREAT FLOOD: while the ≤10% finale runs (the surges
    // AND the break) the bar stays frozen (boss-monsoon.js).
    '_egMnFinalActive',
    // The Maze's GAME OVER: while the ≤10% finale runs (convergence slams
    // AND the chomp) the bar stays frozen (boss-maze.js).
    '_egMzFinalActive',
    // The Medusa's THE STARE: while the ≤10% finale runs (statue beats
    // AND the gaze sweep) the bar stays frozen (boss-medusa.js).
    '_egMdFinalActive',
    // The Encore's CURTAIN CALL: while the ≤10% finale runs
    // (musical-chairs spotlight AND the ovation) the bar stays frozen
    // (boss-encore.js).
    '_egEnFinalActive',
    // The Buzzsaw's FINAL CUT: while the ≤10% finale runs (walls closing
    // AND the crosscut) the bar stays frozen (boss-buzz.js).
    '_egBzFinalActive',
    // The Snail's broom: while held, sweeping is a DPS trade-off — the
    // bar stays frozen (boss-snail.js).
    '_egSnailBroomHeld',
    // Grand Prior defuse pause: while the player stands on an armed bomb
    // the bar freezes — defusing is a DPS trade-off, not a defensive tool
    // (shared-boss-abilities.js, _egPriorBombDefusing).
    '_egPriorBombDefusing',
    // The Gust's wind lanes: while the player rides a lane the bar stays
    // frozen — a dodge set-piece (boss-gust.js).
    '_egGustChargePaused',
    // The Marksman's Arrow Gauntlet: countdown + arrow waves are a dodge
    // set-piece — the bar is paused for the whole gauntlet
    // (boss-marksman.js).
    '_egMarksGauntletChargePaused',
    // The Striker's scoring set-pieces (Kick-Off Challenge / Hat-Trick):
    // while the player runs, charges and kicks the match ball the bar
    // stays frozen — scoring IS the attack during the challenge
    // (boss-striker.js).
    '_egStrkScoringActive',
    // The Gridlock's SYSTEM LOCKDOWN: while the wire-grid finale runs the
    // bar stays frozen (boss-gridlock.js).
    '_egGlFinalActive',
    // The Jester's GRAND FINALE: while the full-house show runs the bar
    // stays frozen (boss-jester.js).
    '_egJsFinalActive',
    // The Shaper's SHAPED WINTER: while the monolith finale runs the bar
    // stays frozen — core-shattering IS the attack (boss-shaper.js).
    '_egShpFinalActive',
    // The Siren's DEADLY ARIA: while the bubble-song finale runs the bar
    // stays frozen (boss-siren.js).
    '_egSireFinalActive',
    // The Swarm's SWARM SINGULARITY: while the drone-ball finale runs the
    // bar stays frozen (boss-swarm.js).
    '_egSwFinalActive',
    // The Colossus' TITAN'S FALL: while the seal-climbing finale runs the
    // bar stays frozen (boss-colossus.js).
    '_egColoFinalActive',
    // Bayes' THEOMERE'S GAMBIT: the belief set-piece owns the board — no
    // free auto-attack charging while Bayes bets everything (boss-bayes.js).
    '_egBayFinalActive',
    // Entropy's THE LAST DEGREE: shard-gathering IS the set-piece — no
    // free auto-attack charging while absolute zero approaches
    // (boss-entropy.js).
    '_egEntrFinalActive',
    // Laplace's THE CLOSED TIMELINE: the learnable loop owns the arena —
    // no free auto-attack charging while the Demon replays your fate
    // (boss-laplace.js).
    '_egLapFinalActive',
    // The Inferno's SUPERVOLCANIC WINTER: lure-and-dodge IS the set-piece
    // — no free auto-attack charging while the arena is frozen over
    // (boss-inferno.js).
    '_egInfVFinalActive',
    // The Null's PROOF BY CONTRADICTION: the white-out proof owns the
    // arena — no free auto-attack charging while the hypothesis is tested
    // (boss-null.js).
    '_egNulFinalActive',
    // The Barrage's FINAL BOMBARDMENT: reading the volleys and racing to
    // the safe tile IS the set-piece (boss-barrage.js).
    '_egBarFinalActive',
    // The Bloom's FULMINATION: carving scars to open the ONE TRUE GAP is
    // the set-piece (boss-bloom.js).
    '_egBlmFinalActive',
    // The Minotaur's WARDEN'S LABYRINTH: stone-breaking IS the set-piece
    // (boss-minotaur.js).
    '_egMntFinalActive',
    // The Overfitter's FINAL EPOCH: reading the heat-map of your own fight
    // history IS the set-piece (boss-overfitter.js).
    '_egOvrFinalActive',
    // The Razor's A THOUSAND EDGES: walking the reversing spoke clock IS
    // the set-piece (boss-razor.js).
    '_egRzrFinalActive',
    // The Shrine Maiden's THOUSAND ARMS: reading the knocks IS the
    // set-piece (boss-shrine.js).
    '_egShrFinalActive',
    // The Stormcaller's PERFECT STORM: dodging your own charge IS the
    // set-piece (boss-sirus.js).
    '_egSirFinalActive',
    // The Vise's FULL CLAMP: reading the compression IS the set-piece
    // (boss-vise.js).
    '_egVisFinalActive',
];

// Boot-time validation: every gate name must resolve to a global function
// (all boss files load before this file). A typo'd name would otherwise
// silently disable the freeze for that boss's set-piece.
EG_PLAYER_CHARGE_PAUSE_GATES.forEach(function (name) {
    if (typeof window[name] !== 'function') {
        console.warn('[boss-framework] charge-pause gate missing:', name);
    }
});


// Advances the player's charge bar. Fires the player attack when full.
// The bar's max comes from the equipped weapon (see _egGetPlayerAttackInterval).
function _egTickPlayer() {
    // Hold-parry pause: while the parry key (R by default) is held during an
    // endgame encounter, freeze the player's own auto-attack charge bar.
    // Used to manually time melee strikes.
    if (typeof _egHoldEPauseActive !== 'undefined' && _egHoldEPauseActive) {
        if (typeof _egIsActive === 'function' && _egIsActive()) return;
        // If not in an active encounter, fall through (no effect outside endgame)
    }
    // Grand Prior defuse pause: while the player stands on an armed bomb the
    // charge bar freezes the same way (see _egPriorBombDefusing in
    // shared-boss-abilities.js) — but with none of the parry behaviour:
    // defusing is a DPS trade-off, not a defensive tool.
    // The Snail's broom: while held, the auto-attack charge bar is frozen
    // the same way (sweeping is a DPS trade-off — see boss-snail.js).
    // Snailgeddon freeze: while the ≤20% Snail finisher runs (countdown
    // AND the closing ring) the auto-attack charge bar stays frozen — it
    // is a dodge-and-run set-piece, not free damage time (boss-snail.js).
    // Freeze-gates: set-piece predicates, registry-driven (see
    // EG_PLAYER_CHARGE_PAUSE_GATES above). Each gate holds only while an
    // endgame encounter is active.
    for (let i = 0; i < EG_PLAYER_CHARGE_PAUSE_GATES.length; i++) {
        const gate = window[EG_PLAYER_CHARGE_PAUSE_GATES[i]];
        if (typeof gate === 'function' && gate()
            && typeof _egIsActive === 'function' && _egIsActive()) return;
    }
    // The Clock's Time Freeze: the auto-attack charge bar is frozen for the
    // whole 30s window — a time-stop is not free DPS time (class abilities
    // and E-releases still work). boss-clock.js.
    if (typeof window !== 'undefined' && window._egClockTimeFreezeActive) {
        if (typeof _egIsActive === 'function' && _egIsActive()) return;
    }
    // The Firefly's formation trials: the auto-attack charge bar stays
    // frozen while the swarm repositions — a coordination set-piece, not
    // auto-attack time (boss-firefly.js).
    if (typeof window !== 'undefined' && typeof window._egFireflyTrialActive === 'function' && window._egFireflyTrialActive()) {
        if (typeof _egIsActive === 'function' && _egIsActive()) return;
    }
    // Ailments: frozen stops the auto-attack bar entirely (movement
    // prevention will hook into the same ailment once movement exists),
    // chilled slows it to half speed.
    const chargeMult = (typeof _egGetPlayerChargeMultiplier === 'function') ? _egGetPlayerChargeMultiplier() : 1;
    _egPlayerCurrentCharge += 0.1 * chargeMult; // Ticks at 10Hz[cite: 1]

    if (_egPlayerCurrentCharge >= _egGetPlayerAttackInterval()) {
        _egPlayerCurrentCharge = 0; // Reset charge

        // Only fire if there is an active target selected
        if (_egTargetId) {
            _egAnimatePlayerMelee(_egTargetId);
        }
    }
}

// ── Hold-parry charge pause — freeze own auto-attack bar while held ───────
function _egSetHoldEPauseVisual(isPaused) {
    const bar = document.getElementById('avatar-charge-fill');
    if (bar) bar.classList.toggle('eg-charge-paused', !!isPaused);
    const alt = document.getElementById('eg-player-charge-bar');
    if (alt) alt.classList.toggle('eg-charge-paused', !!isPaused);
    // Sprite feedback — show "CHARGE PAUSED" directly on the avatar while the parry key is held
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
        // No avatar yet — ensure stray label elsewhere is cleaned up
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
    // Cards are static while hovered — evaluate once per rendered card.
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

// Renders the visual width of the player's charge bar.
function _egUpdatePlayerChargeBar() {
    const playerChargeBar = document.getElementById('eg-player-charge-bar');
    if (playerChargeBar) {
        const chargePct = Math.min(100, Math.max(0, (_egPlayerCurrentCharge / _egGetPlayerAttackInterval()) * 100));
        playerChargeBar.style.width = chargePct + '%';
    }
}


function _egGetMaxAllowedMistakes() {
    // Hardcore: no mistake is allowed — overrides map limit and gear bonuses
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
    // Low-mistakes overlay — fires when only 3/2/1/0 remain (deduped inside)
    if (typeof _egMaybeShowMistakesWarning === 'function') _egMaybeShowMistakesWarning();
    if (typeof mistakeCount !== 'undefined' && mistakeCount > max) {
        // Central defeat handler — the player keeps the loot collected so far.
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


// Gear: lifeRegen — heals the player for lifeRegen HP once per second
// while an encounter is running. No-ops at full HP or when dead.
let _egLastLifeRegenAt = 0;
function _egTickLifeRegen() {
    const now = Date.now();
    if (now - _egLastLifeRegenAt < EG_LIFE_REGEN_INTERVAL_MS) return;
    _egLastLifeRegenAt = now;

    const regen = _egComputePlayerStats().lifeRegen || 0;
    if (regen <= 0 || playerCurrentHP <= 0 || playerCurrentHP >= playerMaxHP) return;

    // Active map run: No Life Regeneration — gear regen is disabled.
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

    // Gear: lifeRegen — heals the player once per second
    _egTickLifeRegen();

    // Player mechanics
    _egTickPlayer();
    if (typeof _egRefreshPlayerStatusIcons === 'function') _egRefreshPlayerStatusIcons();
    // Don't resurrect the sprite after defeat — the tick may have set
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
