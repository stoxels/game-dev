import { _getPlayerMaxMana, gainMana } from '../classes/class-mana.js';
import { _egMapHasBloodMagic } from './endgame-map-launch.js';

// endgame-quiz-buffs.js
//------------------------------------------------------------------------
//-------------------ENDGAME QUIZ REWARD BUFFS-----------------------------
//------------------------------------------------------------------------
// Correctly answering an endgame question (interstitial quiz OR math gate)
// rolls one of three temporary rewards:
//   • +10% damage multiplier per stack, stacks additively (e.g. 3 correct = +30%),
//     each stack lasts 30 minutes (QUIZ_BUFF_DURATION_MS)
//   • heal for 25% of max life
//   • restore 25% of max mana
// The damage buff shows a red aura ring around the character sprite while
// active; it grows brighter and wider with every stack. Every reward fires a toast
// and is summarised on the next chain-countdown transition screen.
//
// Consumed by:
//   • quiz.js (_resolveQuizAnswer → _applyQuizRewardBuff)
//   • mathgate.js (mgHandleCorrectAnswer → _applyQuizRewardBuff)
//   • endgame-combat-calculations.js (_quizDamageBuffMult)
//   • endgame-encounter-chain.js (_chainCleanup → _resetQuizDamageBuff,
//     _buildChainBonusGainHTML → _consumePendingQuizRewardHTML)
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Damage per stack - each correct quiz answer adds +10% additively
// (3 stacks = +30%, etc.). Each stack lasts QUIZ_BUFF_DURATION_MS.
export const QUIZ_BUFF_DAMAGE_PER_STACK = 0.10;
// Legacy constant - single-stack multiplier, kept for backward compatibility.
export const QUIZ_BUFF_DAMAGE_MULT = 1 + QUIZ_BUFF_DAMAGE_PER_STACK;
// Duration of each damage stack (30 minutes).
export const QUIZ_BUFF_DURATION_MS = 30 * 60 * 1000;
// Array of expiry timestamps (one entry per active +10% stack).
export let _quizDmgBuffStacks = [];
// Timestamp until which at least one stack is still active (0 = inactive).
// Derived as max(_quizDmgBuffStacks); kept for debug / backward compat.
export let _quizDmgBuffUntil = 0;

// Timeout handle for the barrier visual's expiry.
export let _quizShieldTimer = null;

// Summary lines of every reward granted since the last chain countdown.
// Each correctly answered interstitial question pushes one entry; all are
// joined and consumed together by _buildChainBonusGainHTML. This fixes
// the map_extra_questions mod (+# additional Quiz Questions per Puzzle)
// which previously overwrote a single string and only the last reward was shown.
export let _pendingQuizRewardLines = [];
// Legacy alias - kept for backward compatibility / debug inspection.
export let _pendingQuizRewardLine = '';

// Removes expired stacks and refreshes the derived _quizDmgBuffUntil.
// Returns the number of still-active stacks.
export function _pruneQuizDamageStacks() {
    const now = Date.now();
    if (_quizDmgBuffStacks.length) {
        _quizDmgBuffStacks = _quizDmgBuffStacks.filter(t => t > now);
    }
    _quizDmgBuffUntil = _quizDmgBuffStacks.length ? Math.max(..._quizDmgBuffStacks) : 0;
    return _quizDmgBuffStacks.length;
}

// Returns the number of active +10% stacks (pruning expired ones first).
export function _quizDamageBuffStacks() {
    return _pruneQuizDamageStacks();
}

// Returns the active damage multiplier (1 when no buff is running).
// Stacks additively: 1 stack = 1.10, 3 stacks = 1.30, etc.
export function _quizDamageBuffMult() {
    const active = _pruneQuizDamageStacks();
    if (active === 0) return 1;
    return 1 + active * QUIZ_BUFF_DAMAGE_PER_STACK;
}

// Human-readable duration for toasts / labels (e.g. "30m").
export function _formatQuizBuffDuration(ms) {
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
export function _scheduleQuizShieldExpiry() {
    if (_quizShieldTimer) {
        clearTimeout(_quizShieldTimer);
        _quizShieldTimer = null;
    }
    const active = _pruneQuizDamageStacks();
    if (active === 0) {
        _removeQuizShieldFX(false);
        return;
    }
    _syncQuizAuraIntensity();
    const nextExpiry = Math.min(..._quizDmgBuffStacks);
    const delay = Math.max(0, nextExpiry - Date.now());
    _quizShieldTimer = setTimeout(() => {
        _quizShieldTimer = null;
        const remaining = _pruneQuizDamageStacks();
        if (remaining === 0) {
            _removeQuizShieldFX(false);
        } else {
            // Another stack is still active - keep the shield and wait for the next expiry.
            _scheduleQuizShieldExpiry();
        }
    }, delay);
}

// Clears any active quiz damage buff and its barrier visual.
export function _resetQuizDamageBuff() {
    _quizDmgBuffStacks = [];
    _quizDmgBuffUntil = 0;
    if (_quizShieldTimer) {
        clearTimeout(_quizShieldTimer);
        _quizShieldTimer = null;
    }
    _removeQuizShieldFX(true);
    // Also clear any pending reward lines that were never displayed
    // (e.g. run aborted before the countdown screen).
    _pendingQuizRewardLines = [];
    _pendingQuizRewardLine = '';
}

// Returns and clears the summary lines for the countdown transition screen.
// Joins all accumulated lines with a line-break so multi-question interstitials
// (map_extra_questions) display every reward, not just the last one.
// Duplicate damage-buff lines from the same interstitial batch are coalesced
// to the final total so two correct answers that both roll damage show only
// a single "+20% damage (x2 stacks)" (or the final xN total later in a chain).
export function _consumePendingQuizRewardHTML() {
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
    if (_pendingQuizRewardLines.length > 0) {
        const coalesced = _coalesce(_pendingQuizRewardLines);
        line = coalesced.join('<br>');
        _pendingQuizRewardLines = [];
    } else if (_pendingQuizRewardLine) {
        // Fallback for legacy single-string value - may already contain <br>
        const parts = _pendingQuizRewardLine.split('<br>');
        const coalesced = _coalesce(parts);
        line = coalesced.join('<br>');
    }
    _pendingQuizRewardLine = '';
    return line;
}


//------------------------------------------------------------------------
//-------------------VISUAL EFFECTS---------------------------------------
//------------------------------------------------------------------------

// Spark burst colours per reward type (heal / mana bursts).
export const QUIZ_BUFF_COLORS = {
    damage: '#ff5533',
    heal: '#4caf50',
    mana: '#4fc3f7',
};

export const QUIZ_BUFF_SPARK_COUNT = 12;
export const QUIZ_BUFF_FX_DURATION_MS = 900;
export const QUIZ_SHIELD_FADE_MS = 400;

// Stacks at which the aura reaches full intensity.
const QUIZ_AURA_FULL_STACKS = 8;

// Sets the aura's intensity (0..1) from the number of live damage stacks.
function _syncQuizAuraIntensity() {
    const stacks = _pruneQuizDamageStacks();
    const qi = Math.min(1, Math.max(0, stacks / QUIZ_AURA_FULL_STACKS));
    document.querySelectorAll('.sx-quiz-aura').forEach(el => {
        el.style.setProperty('--qi', qi.toFixed(3));
        el.dataset.stacks = String(stacks);
    });
}

// Adds the damage-buff aura: a red ring around the character sprite that
// pulses while at least one damage stack is active and scales with stacks.
export function _addQuizShieldFX(durationMs) {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;

    // Create the aura only if it doesn't already exist - stacking should not
    // flicker the visual. Each new stack just updates intensity + the expiry
    // scheduler.
    if (!document.querySelector('.sx-quiz-aura')) {
        const aura = document.createElement('div');
        aura.className = 'sx-quiz-shield-wing sx-quiz-aura';
        hud.appendChild(aura);
    }
    _syncQuizAuraIntensity();

    // (Re)schedule expiry based on the earliest stack's remaining time.
    // durationMs is kept as optional legacy param but the true schedule
    // derives from _quizDmgBuffStacks so stacks expire independently.
    if (typeof _scheduleQuizShieldExpiry === 'function') {
        _scheduleQuizShieldExpiry();
    } else if (durationMs) {
        if (_quizShieldTimer) clearTimeout(_quizShieldTimer);
        _quizShieldTimer = setTimeout(() => {
            _quizShieldTimer = null;
            _removeQuizShieldFX(false);
        }, durationMs);
    }
}

// Removes the aura - immediately, or after a short fade-out.
export function _removeQuizShieldFX(immediate) {
    const wings = document.querySelectorAll('.sx-quiz-shield-wing');
    if (!wings.length) return;

    if (immediate) {
        wings.forEach(w => w.remove());
        return;
    }
    wings.forEach(w => w.classList.add('sx-quiz-shield-out'));
    setTimeout(() => wings.forEach(w => w.remove()), QUIZ_SHIELD_FADE_MS);
}

// Spark burst + floating label anchored to the player HUD. Used for the
// heal / mana rewards; the damage buff uses the barrier wings instead.
export function _showQuizBuffBurst(type, labelText) {
    const hud = document.getElementById('player-avatar-wrapper');
    const color = QUIZ_BUFF_COLORS[type] || '#ffffff';

    if (!hud) return;

    const rect = hud.getBoundingClientRect();
    const burst = document.createElement('div');
    burst.className = 'sx-hit-burst';
    burst.style.left = `${rect.left + rect.width / 2}px`;
    burst.style.top = `${rect.top + rect.height / 2}px`;

    const ring = document.createElement('div');
    ring.className = 'sx-hit-ring';
    ring.style.setProperty('--sx-hit-color', color);
    burst.appendChild(ring);

    for (let i = 0; i < QUIZ_BUFF_SPARK_COUNT; i++) {
        const spark = document.createElement('div');
        spark.className = 'sx-hit-spark';
        const angle = (Math.PI * 2 * i) / QUIZ_BUFF_SPARK_COUNT + Math.random() * 0.5;
        const dist = 30 + Math.random() * 25;
        spark.style.setProperty('--sx-hit-color', color);
        spark.style.setProperty('--spark-dx', `${(Math.cos(angle) * dist).toFixed(1)}px`);
        spark.style.setProperty('--spark-dy', `${(Math.sin(angle) * dist).toFixed(1)}px`);
        burst.appendChild(spark);
    }

    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), QUIZ_BUFF_FX_DURATION_MS);

    // Floating reward label above the HUD
    const float = document.createElement('div');
    float.className = 'sx-damage-number sx-quiz-buff-label';
    float.textContent = labelText;
    float.style.setProperty('--sx-hit-color', color);
    hud.appendChild(float);
    setTimeout(() => float.remove(), QUIZ_BUFF_FX_DURATION_MS);

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
export function _grantQuizDamageReward() {
    // DEV_EFFECT_TIME_SCALE (dev testing harness, see js/dev/dev-testing.js):
    // ×1 = exact shipped behaviour (30 min stacks are unobservable in tests).
    const scale = (typeof window !== 'undefined' && window.DEV_EFFECT_TIME_SCALE > 0 && window.DEV_EFFECT_TIME_SCALE !== 1)
        ? window.DEV_EFFECT_TIME_SCALE : 1;
    const durationMs = QUIZ_BUFF_DURATION_MS * scale;
    _quizDmgBuffStacks.push(Date.now() + durationMs);
    _pruneQuizDamageStacks();
    const stacks = _quizDmgBuffStacks.length;
    const totalPct = Number((stacks * QUIZ_BUFF_DAMAGE_PER_STACK * 100).toFixed(1));
    // Strip trailing .0 so integers display as "30" not "30.0"
    const totalPctLabel = Number.isInteger(totalPct) ? String(Math.round(totalPct)) : String(totalPct);
    const durLabel = _formatQuizBuffDuration(durationMs);
    if (typeof showToast === 'function') {
        const stackInfo = stacks > 1 ? ` (x${stacks} → +${totalPctLabel}% total)` : '';
        globalThis.showToast(`⚔️ Scholar's Wrath: +10% damage for ${durLabel}${stackInfo}!`);
    }
    _addQuizShieldFX(durationMs);

    const label = document.createElement('div');
    label.className = 'sx-damage-number sx-quiz-buff-label';
    label.textContent = stacks > 1 ? `+${totalPctLabel}% DMG (x${stacks})` : '+10% DMG';
    label.style.setProperty('--sx-hit-color', QUIZ_BUFF_COLORS.damage);
    const hud = document.getElementById('player-avatar-wrapper');
    if (hud) {
        label.style.color = QUIZ_BUFF_COLORS.damage;
        hud.appendChild(label);
        setTimeout(() => label.remove(), QUIZ_BUFF_FX_DURATION_MS);
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
    _pendingQuizRewardLines = _pendingQuizRewardLines.filter(l => !_isDmgLine(l));
    _pendingQuizRewardLines.push(dmgLine);
    _pendingQuizRewardLine = _pendingQuizRewardLines.join('<br>');
}

// Rolls one of the three quiz rewards and applies it (damage buff, life
// heal or mana restore). Called after a correct ENDGAME question.
// When the player is already at full life / full mana that reward is
// excluded from the roll so no reward is wasted (e.g. full HP → no heal
// offered, full mana → no mana offered, both full → always damage).
export function _applyQuizRewardBuff() {
    // ── Build eligible pool ──────────────────────────────────────────
    const needsHeal = typeof playerCurrentHP !== 'undefined'
        && typeof playerMaxHP !== 'undefined'
        && globalThis.playerMaxHP > 0
        && globalThis.playerCurrentHP < globalThis.playerMaxHP;
    let needsMana = false;
    // Mana is irrelevant on Blood Magic maps (costs are paid from life)
    const bloodMagic = (typeof _egMapHasBloodMagic === 'function') && _egMapHasBloodMagic();
    if (!bloodMagic && typeof _getPlayerMaxMana === 'function') {
        const maxMana = _getPlayerMaxMana();
        const curMana = (typeof playerCurrentMana !== 'undefined') ? Math.round(globalThis.playerCurrentMana) : 0;
        needsMana = maxMana > 0 && curMana < maxMana;
    }

    const eligible = ['damage'];
    if (needsHeal) eligible.push('heal');
    if (needsMana) eligible.push('mana');

    const pick = eligible[Math.floor(Math.random() * eligible.length)];

    if (pick === 'damage') {
        _grantQuizDamageReward();
    } else if (pick === 'heal') {
        // ── Life heal ────────────────────────────────────────────────────
        const heal = Math.max(1, Math.round(globalThis.playerMaxHP * 0.25));
        globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + (globalThis._lifeGain ? globalThis._lifeGain(heal) : (heal)));
        if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
        if (typeof showToast === 'function') globalThis.showToast(`💚 Scholar's Blessing: restored ${heal} HP!`);
        _showQuizBuffBurst('heal', `+${heal} HP`);
        const healLine =
            `<span style="color:#7fd67f">💚 +${heal} life restored</span>`;
        _pendingQuizRewardLines.push(healLine);
        _pendingQuizRewardLine = _pendingQuizRewardLines.join('<br>');
    } else {
        // ── Mana restore ─────────────────────────────────────────────────
        const gain = Math.max(1, Math.round(_getPlayerMaxMana() * 0.25));
        const gained = (typeof gainMana === 'function') ? gainMana(gain) : 0;
        if (gained > 0) {
            if (typeof showToast === 'function') globalThis.showToast(`🔮 Scholar's Insight: restored ${gained} mana!`);
            _showQuizBuffBurst('mana', `+${gained} Mana`);
            const manaLine =
                `<span style="color:#7fb8ff">🔮 +${gained} mana restored</span>`;
            _pendingQuizRewardLines.push(manaLine);
            _pendingQuizRewardLine = _pendingQuizRewardLines.join('<br>');
        } else {
            // No mana gained (e.g. Blood Magic or reduced gain) - fall back
            // Prefer heal if not at full life, otherwise fall back to damage.
            if (needsHeal) {
                const heal = Math.max(1, Math.round(globalThis.playerMaxHP * 0.25));
                globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + (globalThis._lifeGain ? globalThis._lifeGain(heal) : (heal)));
                if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
                if (typeof showToast === 'function') globalThis.showToast(`💚 Scholar's Blessing: restored ${heal} HP!`);
                _showQuizBuffBurst('heal', `+${heal} HP`);
                const fbLine =
                    `<span style="color:#7fd67f">💚 +${heal} life restored</span>`;
                _pendingQuizRewardLines.push(fbLine);
                _pendingQuizRewardLine = _pendingQuizRewardLines.join('<br>');
            } else {
                // Both resources full - give damage instead of wasting the reward
                _grantQuizDamageReward();
            }
        }
    }
}
