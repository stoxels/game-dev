// endgame-quiz-buffs.js
//------------------------------------------------------------------------
//-------------------ENDGAME QUIZ REWARD BUFFS-----------------------------
//------------------------------------------------------------------------
// Correctly answering an endgame question (interstitial quiz OR math gate)
// rolls one of three temporary rewards:
//   • +10% damage multiplier per stack, stacks additively (e.g. 3 correct = +30%),
//     each stack lasts 30 minutes (EG_QUIZ_BUFF_DURATION_MS)
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

// Damage per stack — each correct quiz answer adds +10% additively
// (3 stacks = +30%, etc.). Each stack lasts EG_QUIZ_BUFF_DURATION_MS.
const EG_QUIZ_BUFF_DAMAGE_PER_STACK = 0.10;
// Legacy constant — single-stack multiplier, kept for backward compatibility.
const EG_QUIZ_BUFF_DAMAGE_MULT = 1 + EG_QUIZ_BUFF_DAMAGE_PER_STACK;
// Duration of each damage stack (30 minutes).
const EG_QUIZ_BUFF_DURATION_MS = 30 * 60 * 1000;
// Array of expiry timestamps (one entry per active +10% stack).
let _egQuizDmgBuffStacks = [];
// Timestamp until which at least one stack is still active (0 = inactive).
// Derived as max(_egQuizDmgBuffStacks); kept for debug / backward compat.
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

// Removes expired stacks and refreshes the derived _egQuizDmgBuffUntil.
// Returns the number of still-active stacks.
function _egPruneQuizDamageStacks() {
    const now = Date.now();
    if (_egQuizDmgBuffStacks.length) {
        _egQuizDmgBuffStacks = _egQuizDmgBuffStacks.filter(t => t > now);
    }
    _egQuizDmgBuffUntil = _egQuizDmgBuffStacks.length ? Math.max(..._egQuizDmgBuffStacks) : 0;
    return _egQuizDmgBuffStacks.length;
}

// Returns the number of active +10% stacks (pruning expired ones first).
function _egQuizDamageBuffStacks() {
    return _egPruneQuizDamageStacks();
}

// Returns the active damage multiplier (1 when no buff is running).
// Stacks additively: 1 stack = 1.10, 3 stacks = 1.30, etc.
function _egQuizDamageBuffMult() {
    const active = _egPruneQuizDamageStacks();
    if (active === 0) return 1;
    return 1 + active * EG_QUIZ_BUFF_DAMAGE_PER_STACK;
}

// Human-readable duration for toasts / labels (e.g. "30m").
function _egFormatQuizBuffDuration(ms) {
    const mins = Math.round(ms / 60000);
    if (mins >= 60) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}m`;
}

// Schedules the shield visual to re-evaluate at the next stack expiry.
// When the earliest stack expires we prune and either reschedule for the
// next expiry or remove the wings if no stacks remain.
function _egScheduleQuizShieldExpiry() {
    if (_egQuizShieldTimer) {
        clearTimeout(_egQuizShieldTimer);
        _egQuizShieldTimer = null;
    }
    const active = _egPruneQuizDamageStacks();
    if (active === 0) {
        _egRemoveQuizShieldFX(false);
        return;
    }
    const nextExpiry = Math.min(..._egQuizDmgBuffStacks);
    const delay = Math.max(0, nextExpiry - Date.now());
    _egQuizShieldTimer = setTimeout(() => {
        _egQuizShieldTimer = null;
        const remaining = _egPruneQuizDamageStacks();
        if (remaining === 0) {
            _egRemoveQuizShieldFX(false);
        } else {
            // Another stack is still active — keep the shield and wait for the next expiry.
            _egScheduleQuizShieldExpiry();
        }
    }, delay);
}

// Clears any active quiz damage buff and its barrier visual.
function _egResetQuizDamageBuff() {
    _egQuizDmgBuffStacks = [];
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
// Duplicate damage-buff lines from the same interstitial batch are coalesced
// to the final total so two correct answers that both roll damage show only
// a single "+20% damage (x2 stacks)" (or the final xN total later in a chain).
function _egConsumePendingQuizRewardHTML() {
    const _isDmgLine = l => l.includes('⚔️') && l.includes('damage');
    const _coalesce = lines => {
        const dmgLines = lines.filter(_isDmgLine);
        if (dmgLines.length <= 1) return lines;
        const lastDmg = dmgLines[dmgLines.length - 1];
        const nonDmg = lines.filter(l => !_isDmgLine(l));
        // Keep non-damage rewards in original order and append the final
        // damage total at the end (chronologically last reward).
        return [...nonDmg, lastDmg];
    };
    let line = '';
    if (_egPendingQuizRewardLines.length > 0) {
        const coalesced = _coalesce(_egPendingQuizRewardLines);
        line = coalesced.join('<br>');
        _egPendingQuizRewardLines = [];
    } else if (_egPendingQuizRewardLine) {
        // Fallback for legacy single-string value — may already contain <br>
        const parts = _egPendingQuizRewardLine.split('<br>');
        const coalesced = _coalesce(parts);
        line = coalesced.join('<br>');
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
// character sprite, pulsing while at least one damage stack is active.
function _egAddQuizShieldFX(durationMs) {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;

    // Create wings only if they don't already exist — stacking should not
    // flicker the visual. Each new stack just refreshes the expiry scheduler.
    if (!document.querySelector('.eg-quiz-shield-wing')) {
        const left = document.createElement('div');
        left.className = 'eg-quiz-shield-wing eg-quiz-shield-left';
        const right = document.createElement('div');
        right.className = 'eg-quiz-shield-wing eg-quiz-shield-right';
        hud.appendChild(left);
        hud.appendChild(right);
    }

    // (Re)schedule expiry based on the earliest stack's remaining time.
    // durationMs is kept as optional legacy param but the true schedule
    // derives from _egQuizDmgBuffStacks so stacks expire independently.
    if (typeof _egScheduleQuizShieldExpiry === 'function') {
        _egScheduleQuizShieldExpiry();
    } else if (durationMs) {
        if (_egQuizShieldTimer) clearTimeout(_egQuizShieldTimer);
        _egQuizShieldTimer = setTimeout(() => {
            _egQuizShieldTimer = null;
            _egRemoveQuizShieldFX(false);
        }, durationMs);
    }
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

// Helper: grant one stacking +10% damage stack and its visuals/toast.
function _egGrantQuizDamageReward() {
    _egQuizDmgBuffStacks.push(Date.now() + EG_QUIZ_BUFF_DURATION_MS);
    _egPruneQuizDamageStacks();
    const stacks = _egQuizDmgBuffStacks.length;
    const totalPct = Number((stacks * EG_QUIZ_BUFF_DAMAGE_PER_STACK * 100).toFixed(1));
    // Strip trailing .0 so integers display as "30" not "30.0"
    const totalPctLabel = Number.isInteger(totalPct) ? String(Math.round(totalPct)) : String(totalPct);
    const durLabel = _egFormatQuizBuffDuration(EG_QUIZ_BUFF_DURATION_MS);
    if (typeof showToast === 'function') {
        const stackInfo = stacks > 1 ? ` (x${stacks} → +${totalPctLabel}% total)` : '';
        showToast(`⚔️ Scholar's Wrath: +10% damage for ${durLabel}${stackInfo}!`);
    }
    _egAddQuizShieldFX(EG_QUIZ_BUFF_DURATION_MS);

    const label = document.createElement('div');
    label.className = 'eg-damage-number eg-quiz-buff-label';
    label.textContent = stacks > 1 ? `+${totalPctLabel}% DMG (x${stacks})` : '+10% DMG';
    label.style.setProperty('--eg-hit-color', EG_QUIZ_BUFF_COLORS.damage);
    const hud = document.getElementById('player-avatar-wrapper');
    if (hud) {
        label.style.color = EG_QUIZ_BUFF_COLORS.damage;
        hud.appendChild(label);
        setTimeout(() => label.remove(), EG_QUIZ_BUFF_FX_DURATION_MS);
    }

    const dmgLine = stacks > 1
        ? `<span style="color:#ff8a70">⚔️ +${totalPctLabel}% damage</span> <span style="opacity:.6">(x${stacks} stacks)</span>`
        : `<span style="color:#ff8a70">⚔️ +10% damage</span>`;
    // Consolidate multiple damage rewards inside the same interstitial batch:
    // two correct answers that both roll damage should show a single final
    // line (e.g. "+20% damage (x2 stacks)") instead of two lines
    // "+10%" and "+20% (x2)". Later chain segments where stacks already
    // existed similarly collapse to the final total (e.g. x4). Other reward
    // types (heal / mana) are kept as separate lines.
    const _isDmgLine = l => l.includes('⚔️') && l.includes('damage');
    _egPendingQuizRewardLines = _egPendingQuizRewardLines.filter(l => !_isDmgLine(l));
    _egPendingQuizRewardLines.push(dmgLine);
    _egPendingQuizRewardLine = _egPendingQuizRewardLines.join('<br>');
}

// Rolls one of the three quiz rewards and applies it (damage buff, life
// heal or mana restore). Called after a correct ENDGAME question.
// When the player is already at full life / full mana that reward is
// excluded from the roll so no reward is wasted (e.g. full HP → no heal
// offered, full mana → no mana offered, both full → always damage).
function _egApplyQuizRewardBuff() {
    // ── Build eligible pool ──────────────────────────────────────────
    const needsHeal = typeof playerCurrentHP !== 'undefined'
        && typeof playerMaxHP !== 'undefined'
        && playerMaxHP > 0
        && playerCurrentHP < playerMaxHP;
    let needsMana = false;
    // Mana is irrelevant on Blood Magic maps (costs are paid from life)
    const bloodMagic = (typeof _egMapHasBloodMagic === 'function') && _egMapHasBloodMagic();
    if (!bloodMagic && typeof _getPlayerMaxMana === 'function') {
        const maxMana = _getPlayerMaxMana();
        const curMana = (typeof playerCurrentMana !== 'undefined') ? Math.round(playerCurrentMana) : 0;
        needsMana = maxMana > 0 && curMana < maxMana;
    }

    const eligible = ['damage'];
    if (needsHeal) eligible.push('heal');
    if (needsMana) eligible.push('mana');

    const pick = eligible[Math.floor(Math.random() * eligible.length)];

    if (pick === 'damage') {
        _egGrantQuizDamageReward();
    } else if (pick === 'heal') {
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
            // No mana gained (e.g. Blood Magic or reduced gain) — fall back
            // Prefer heal if not at full life, otherwise fall back to damage.
            if (needsHeal) {
                const heal = Math.max(1, Math.round(playerMaxHP * 0.25));
                playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + heal);
                if (typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
                if (typeof showToast === 'function') showToast(`💚 Scholar's Blessing: restored ${heal} HP!`);
                _egShowQuizBuffBurst('heal', `+${heal} HP`);
                const fbLine =
                    `<span style="color:#7fd67f">💚 +${heal} life restored</span>`;
                _egPendingQuizRewardLines.push(fbLine);
                _egPendingQuizRewardLine = _egPendingQuizRewardLines.join('<br>');
            } else {
                // Both resources full — give damage instead of wasting the reward
                _egGrantQuizDamageReward();
            }
        }
    }
}
