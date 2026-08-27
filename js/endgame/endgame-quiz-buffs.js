// endgame-quiz-buffs.js
//------------------------------------------------------------------------
//-------------------ENDGAME QUIZ REWARD BUFFS-----------------------------
//------------------------------------------------------------------------
// Correctly answering an endgame question (interstitial quiz OR math gate)
// rolls one of three temporary rewards:
//   • +10% damage multiplier (lasts EG_QUIZ_BUFF_DURATION_MS)
//   • heal for 25% of max life
//   • restore 25% of max mana
// The damage buff shows a WeakAuras-style barrier (two glowing red wings
// flanking the character sprite) while active. Every reward fires a toast
// and is summarised on the next chain-countdown transition screen.
//
// Consumed by:
//   • quiz.js (_resolveQuizAnswer → _egApplyQuizRewardBuff)
//   • mathgate.js (mgHandleCorrectAnswer → _egApplyQuizRewardBuff)
//   • endgame-combat-calculations.js (_egQuizDamageBuffMult)
//   • endgame-encounter-chain.js (_egChainCleanup → _egResetQuizDamageBuff,
//     _egBuildChainBonusGainHTML → _egConsumePendingQuizRewardHTML)
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Temporary damage multiplier while a quiz damage buff is active.
const EG_QUIZ_BUFF_DAMAGE_MULT = 1.10;
// Duration of the temporary damage multiplier.
const EG_QUIZ_BUFF_DURATION_MS = 30000;
// Timestamp until which the damage buff applies (0 = inactive).
let _egQuizDmgBuffUntil = 0;

// Timeout handle for the barrier visual's expiry.
let _egQuizShieldTimer = null;

// Summary lines of every reward granted since the last chain countdown.
// Each correctly answered interstitial question pushes one entry; all are
// joined and consumed together by _egBuildChainBonusGainHTML. This fixes
// the map_extra_questions mod (+# additional Quiz Questions per Puzzle)
// which previously overwrote a single string and only the last reward was shown.
let _egPendingQuizRewardLines = [];
// Legacy alias — kept for backward compatibility / debug inspection.
let _egPendingQuizRewardLine = '';

// Returns the active damage multiplier (1 when no buff is running).
function _egQuizDamageBuffMult() {
    return (Date.now() < _egQuizDmgBuffUntil) ? EG_QUIZ_BUFF_DAMAGE_MULT : 1;
}

// Clears any active quiz damage buff and its barrier visual.
function _egResetQuizDamageBuff() {
    _egQuizDmgBuffUntil = 0;
    if (_egQuizShieldTimer) {
        clearTimeout(_egQuizShieldTimer);
        _egQuizShieldTimer = null;
    }
    _egRemoveQuizShieldFX(true);
    // Also clear any pending reward lines that were never displayed
    // (e.g. run aborted before the countdown screen).
    _egPendingQuizRewardLines = [];
    _egPendingQuizRewardLine = '';
}

// Returns and clears the summary lines for the countdown transition screen.
// Joins all accumulated lines with a line-break so multi-question interstitials
// (map_extra_questions) display every reward, not just the last one.
function _egConsumePendingQuizRewardHTML() {
    let line = '';
    if (_egPendingQuizRewardLines.length > 0) {
        line = _egPendingQuizRewardLines.join('<br>');
        _egPendingQuizRewardLines = [];
    } else if (_egPendingQuizRewardLine) {
        // Fallback for legacy single-string value
        line = _egPendingQuizRewardLine;
    }
    _egPendingQuizRewardLine = '';
    return line;
}


//------------------------------------------------------------------------
//-------------------VISUAL EFFECTS---------------------------------------
//------------------------------------------------------------------------

// Spark burst colours per reward type (heal / mana bursts).
const EG_QUIZ_BUFF_COLORS = {
    damage: '#ff5533',
    heal: '#4caf50',
    mana: '#4fc3f7',
};

const EG_QUIZ_BUFF_SPARK_COUNT = 12;
const EG_QUIZ_BUFF_FX_DURATION_MS = 900;
const EG_QUIZ_SHIELD_FADE_MS = 400;

// Adds the WeakAuras-style barrier: two glowing red wings flanking the
// character sprite, pulsing for the buff duration, then fading out.
function _egAddQuizShieldFX(durationMs) {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;

    // Remove leftovers before re-adding
    _egRemoveQuizShieldFX(true);

    const left = document.createElement('div');
    left.className = 'eg-quiz-shield-wing eg-quiz-shield-left';
    const right = document.createElement('div');
    right.className = 'eg-quiz-shield-wing eg-quiz-shield-right';

    hud.appendChild(left);
    hud.appendChild(right);

    // Expire with the buff: fade out, then remove from the DOM
    if (_egQuizShieldTimer) clearTimeout(_egQuizShieldTimer);
    _egQuizShieldTimer = setTimeout(() => {
        _egQuizShieldTimer = null;
        _egRemoveQuizShieldFX(false);
    }, durationMs);
}

// Removes the barrier wings — immediately, or after a short fade-out.
function _egRemoveQuizShieldFX(immediate) {
    const wings = document.querySelectorAll('.eg-quiz-shield-wing');
    if (!wings.length) return;

    if (immediate) {
        wings.forEach(w => w.remove());
        return;
    }
    wings.forEach(w => w.classList.add('eg-quiz-shield-out'));
    setTimeout(() => wings.forEach(w => w.remove()), EG_QUIZ_SHIELD_FADE_MS);
}

// Spark burst + floating label anchored to the player HUD. Used for the
// heal / mana rewards; the damage buff uses the barrier wings instead.
function _egShowQuizBuffBurst(type, labelText) {
    const hud = document.getElementById('player-avatar-wrapper');
    const color = EG_QUIZ_BUFF_COLORS[type] || '#ffffff';

    if (!hud) return;

    const rect = hud.getBoundingClientRect();
    const burst = document.createElement('div');
    burst.className = 'eg-hit-burst';
    burst.style.left = `${rect.left + rect.width / 2}px`;
    burst.style.top = `${rect.top + rect.height / 2}px`;

    const ring = document.createElement('div');
    ring.className = 'eg-hit-ring';
    ring.style.setProperty('--eg-hit-color', color);
    burst.appendChild(ring);

    for (let i = 0; i < EG_QUIZ_BUFF_SPARK_COUNT; i++) {
        const spark = document.createElement('div');
        spark.className = 'eg-hit-spark';
        const angle = (Math.PI * 2 * i) / EG_QUIZ_BUFF_SPARK_COUNT + Math.random() * 0.5;
        const dist = 30 + Math.random() * 25;
        spark.style.setProperty('--eg-hit-color', color);
        spark.style.setProperty('--spark-dx', `${(Math.cos(angle) * dist).toFixed(1)}px`);
        spark.style.setProperty('--spark-dy', `${(Math.sin(angle) * dist).toFixed(1)}px`);
        burst.appendChild(spark);
    }

    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), EG_QUIZ_BUFF_FX_DURATION_MS);

    // Floating reward label above the HUD
    const float = document.createElement('div');
    float.className = 'eg-damage-number eg-quiz-buff-label';
    float.textContent = labelText;
    float.style.setProperty('--eg-hit-color', color);
    hud.appendChild(float);
    setTimeout(() => float.remove(), EG_QUIZ_BUFF_FX_DURATION_MS);

    // Brief glow pulse on the matching bar
    const barEl = (type === 'heal')
        ? document.getElementById('avatar-hp-fill')
        : (type === 'mana') ? document.getElementById('chud-mana-fill') : null;
    if (barEl) {
        barEl.style.boxShadow = `0 0 12px ${color}`;
        setTimeout(() => { barEl.style.boxShadow = ''; }, 800);
    }
}


//------------------------------------------------------------------------
//-------------------REWARD ROLL-------------------------------------------
//------------------------------------------------------------------------

// Rolls one of the three quiz rewards and applies it (damage buff, life
// heal or mana restore). Called after a correct ENDGAME question.
function _egApplyQuizRewardBuff() {
    const roll = Math.random();

    if (roll < 0.34) {
        // ── Damage buff ──────────────────────────────────────────────────
        _egQuizDmgBuffUntil = Date.now() + EG_QUIZ_BUFF_DURATION_MS;
        if (typeof showToast === 'function') {
            showToast(`⚔️ Scholar's Wrath: +10% damage for ${EG_QUIZ_BUFF_DURATION_MS / 1000}s!`);
        }
        _egAddQuizShieldFX(EG_QUIZ_BUFF_DURATION_MS);

        const label = document.createElement('div');
        label.className = 'eg-damage-number eg-quiz-buff-label';
        label.textContent = '+10% DMG';
        label.style.setProperty('--eg-hit-color', EG_QUIZ_BUFF_COLORS.damage);
        const hud = document.getElementById('player-avatar-wrapper');
        if (hud) {
            label.style.color = EG_QUIZ_BUFF_COLORS.damage;
            hud.appendChild(label);
            setTimeout(() => label.remove(), EG_QUIZ_BUFF_FX_DURATION_MS);
        }

        const dmgLine =
            `<span style="color:#ff8a70">⚔️ +10% damage</span> <span style="opacity:.6">(${EG_QUIZ_BUFF_DURATION_MS / 1000}s)</span>`;
        _egPendingQuizRewardLines.push(dmgLine);
        _egPendingQuizRewardLine = _egPendingQuizRewardLines.join('<br>');
    } else if (roll < 0.67) {
        // ── Life heal ────────────────────────────────────────────────────
        const heal = Math.max(1, Math.round(playerMaxHP * 0.25));
        playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + heal);
        if (typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
        if (typeof showToast === 'function') showToast(`💚 Scholar's Blessing: restored ${heal} HP!`);
        _egShowQuizBuffBurst('heal', `+${heal} HP`);
        const healLine =
            `<span style="color:#7fd67f">💚 +${heal} life restored</span>`;
        _egPendingQuizRewardLines.push(healLine);
        _egPendingQuizRewardLine = _egPendingQuizRewardLines.join('<br>');
    } else {
        // ── Mana restore ─────────────────────────────────────────────────
        const gain = Math.max(1, Math.round(_getPlayerMaxMana() * 0.25));
        const gained = (typeof gainMana === 'function') ? gainMana(gain) : 0;
        if (gained > 0) {
            if (typeof showToast === 'function') showToast(`🔮 Scholar's Insight: restored ${gained} mana!`);
            _egShowQuizBuffBurst('mana', `+${gained} Mana`);
            const manaLine =
                `<span style="color:#7fb8ff">🔮 +${gained} mana restored</span>`;
            _egPendingQuizRewardLines.push(manaLine);
            _egPendingQuizRewardLine = _egPendingQuizRewardLines.join('<br>');
        } else {
            // No mana pool available (e.g. Blood Magic maps) — fall back to heal
            const heal = Math.max(1, Math.round(playerMaxHP * 0.25));
            playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + heal);
            if (typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
            if (typeof showToast === 'function') showToast(`💚 Scholar's Blessing: restored ${heal} HP!`);
            _egShowQuizBuffBurst('heal', `+${heal} HP`);
            const fbLine =
                `<span style="color:#7fd67f">💚 +${heal} life restored</span>`;
            _egPendingQuizRewardLines.push(fbLine);
            _egPendingQuizRewardLine = _egPendingQuizRewardLines.join('<br>');
        }
    }
}
