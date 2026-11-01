import { _getPlayerMaxMana, gainMana } from '../classes/class-mana.js';
import { _egMapHasBloodMagic } from '../endgame/endgame-map-launch.js';
import { _lifeGain } from '../hub/hub-leveling.js';

// combat-quiz-buffs.js
//------------------------------------------------------------------------
//-------------------QUIZ REWARD BUFFS-------------------------------------
//------------------------------------------------------------------------
// Correctly answering a question (interstitial quiz OR math gate) in a
// campaign trial or endgame map rolls ONE random temporary reward:
//   • heal all missing life            • restore all missing mana
//   • +2% damage per stack             • +5% to all resistances per stack
//   • +5% melee charge-up speed        • +5% cast speed
//   • +3% movement speed
// Timed rewards stack additively and each stack lasts 30 minutes
// (QUIZ_BUFF_DURATION_MS); they are wiped when the trial / map ends.
// The damage buff also shows a red aura ring around the character sprite.
// Every reward fires a toast and is summarised, together with everything
// still active, on the next chain-countdown transition screen.
//
// Consumed by:
//   • quiz.js (_resolveQuizAnswer → _applyQuizRewardBuff)
//   • mathgate.js (mgHandleCorrectAnswer → _applyQuizRewardBuff)
//   • combat-calculations.js (_quizDamageBuffMult)
//   • combat-player-stats.js (_quizRewardStatBonuses)
//   • encounter-chain.js (_chainCleanup → _resetQuizDamageBuff,
//     _buildChainBonusGainHTML → _consumePendingQuizRewardHTML)
//------------------------------------------------------------------------
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------REWARD CATALOG AND STATE-----------------------------
//------------------------------------------------------------------------

// Damage per stack - each correct quiz answer adds +2% additively.
const QUIZ_BUFF_DAMAGE_PER_STACK = 0.02;
// Single-stack multiplier, kept as an export for debug / backward compat.
export const QUIZ_BUFF_DAMAGE_MULT = 1 + QUIZ_BUFF_DAMAGE_PER_STACK;
// Duration of each timed stack (30 minutes).
const QUIZ_BUFF_DURATION_MS = 30 * 60 * 1000;

// Everything a correct answer can give. "per" is the size of one stack in
// percent for timed rewards; heal / mana are instant and have no stacks.
const QUIZ_REWARDS = {
    heal:   { icon: '💚', name: 'Life restored',          color: '#7fd67f', burst: '#4caf50', instant: true },
    mana:   { icon: '🔮', name: 'Mana restored',          color: '#7fb8ff', burst: '#4fc3f7', instant: true },
    damage: { icon: '⚔️', name: 'Increased damage',       color: '#ff8a70', burst: '#ff5533', per: 2 },
    resist: { icon: '🛡️', name: 'All resistances',        color: '#d6b3ff', burst: '#b07cff', per: 5 },
    charge: { icon: '⚡', name: 'Melee charge-up speed',  color: '#ffd76a', burst: '#ffc233', per: 5 },
    cast:   { icon: '✨', name: 'Cast speed',             color: '#8fe6ff', burst: '#5fd0ff', per: 5 },
    move:   { icon: '👟', name: 'Movement speed',         color: '#9df0b4', burst: '#5fe08a', per: 3 },
};
const QUIZ_TIMED_TYPES = ['damage', 'resist', 'charge', 'cast', 'move'];

// Expiry timestamps, one entry per live stack of each timed reward.
const _quizStacks = { damage: [], resist: [], charge: [], cast: [], move: [] };
// Timestamp until which at least one damage stack is still active (0 = inactive).
export let _quizDmgBuffUntil = 0;

// Timeout handle for the damage aura's expiry.
let _quizShieldTimer = null;

// Rewards granted since the last chain countdown: { type, amount } entries,
// consumed together by _buildChainBonusGainHTML (map_extra_questions can
// grant several per interstitial).
let _pendingQuizRewards = [];

// Removes expired stacks of one reward type and returns how many are left.
function _pruneQuizStacks(type) {
    const now = Date.now();
    const list = _quizStacks[type];
    if (list.length) _quizStacks[type] = list.filter(t => t > now);
    if (type === 'damage') {
        _quizDmgBuffUntil = _quizStacks.damage.length ? Math.max(..._quizStacks.damage) : 0;
    }
    return _quizStacks[type].length;
}

function _pruneQuizDamageStacks() {
    return _pruneQuizStacks('damage');
}

// Returns the number of active damage stacks (pruning expired ones first).
export function _quizDamageBuffStacks() {
    return _pruneQuizDamageStacks();
}

// Returns the active damage multiplier (1 when no buff is running).
// Stacks additively: 1 stack = 1.02, 5 stacks = 1.10, etc.
export function _quizDamageBuffMult() {
    const active = _pruneQuizDamageStacks();
    if (active === 0) return 1;
    return 1 + active * QUIZ_BUFF_DAMAGE_PER_STACK;
}

// Total percentage the live stacks give for each non-damage reward, read
// by _computePlayerStats and added on top of the character's own stats.
export function _quizRewardStatBonuses() {
    const pct = type => _pruneQuizStacks(type) * QUIZ_REWARDS[type].per;
    return { resist: pct('resist'), charge: pct('charge'), cast: pct('cast'), move: pct('move') };
}

// Human-readable duration for toasts / labels (e.g. "30m").
function _formatQuizBuffDuration(ms) {
    const mins = Math.round(ms / 60000);
    if (mins >= 60) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}m`;
}

// Clears every quiz reward and the damage aura, plus any reward lines that
// were never shown (e.g. run aborted before the countdown screen).
export function _resetQuizDamageBuff() {
    QUIZ_TIMED_TYPES.forEach(type => { _quizStacks[type] = []; });
    _quizDmgBuffUntil = 0;
    if (_quizShieldTimer) {
        clearTimeout(_quizShieldTimer);
        _quizShieldTimer = null;
    }
    _removeQuizShieldFX(true);
    _pendingQuizRewards = [];
}


//------------------------------------------------------------------------
//-------------------COUNTDOWN SCREEN PANEL-------------------------------
//------------------------------------------------------------------------

// Text for one amount of a reward: "+120 life", "+6%", ...
function _quizRewardValueText(type, amount) {
    if (type === 'heal') return `+${amount}`;
    if (type === 'mana') return `+${amount}`;
    return `+${Number(amount.toFixed(1))}%`;
}

// One line of the panel: icon, name, value and an optional "xN" stack tag.
function _quizRewardRowHTML(type, amount, stacks, isNew) {
    const def = QUIZ_REWARDS[type];
    const tag = stacks > 1 ? `<span class="sx-cc-rw-stack">x${stacks}</span>` : '';
    return `<div class="sx-cc-rw-row${isNew ? ' sx-cc-rw-new' : ''}" style="--rw:${def.color}">`
        + `<span class="sx-cc-rw-ico">${def.icon}</span>`
        + `<span class="sx-cc-rw-name">${def.name}</span>`
        + `${tag}<span class="sx-cc-rw-val">${_quizRewardValueText(type, amount)}</span></div>`;
}

// What the last question(s) gave, merged per type (two heals show once with
// the summed amount, two stacks of the same buff show as "x2").
function _quizPendingRowsHTML() {
    const merged = {};
    _pendingQuizRewards.forEach(r => {
        const m = merged[r.type] || (merged[r.type] = { amount: 0, count: 0 });
        m.amount += r.amount;
        m.count += 1;
    });
    return Object.keys(merged).map(type => {
        const m = merged[type];
        return _quizRewardRowHTML(type, m.amount, QUIZ_REWARDS[type].instant ? 1 : m.count, true);
    }).join('');
}

// Everything timed that is still running, with its combined value.
function _quizActiveRowsHTML() {
    return QUIZ_TIMED_TYPES.map(type => {
        const stacks = _pruneQuizStacks(type);
        return stacks ? _quizRewardRowHTML(type, stacks * QUIZ_REWARDS[type].per, stacks, false) : '';
    }).join('');
}

// Returns and clears the reward panel for the countdown transition screen:
// a "just earned" list plus an "active until the run ends" list. Empty
// string when nothing was earned since the last countdown.
export function _consumePendingQuizRewardHTML() {
    if (!_pendingQuizRewards.length) return '';
    const earned = _quizPendingRowsHTML();
    const active = _quizActiveRowsHTML();
    _pendingQuizRewards = [];
    return `<div class="sx-cc-rw-title">Scholar's Rewards</div>`
        + `<div class="sx-cc-rw-head">Just earned</div>${earned}`
        + (active ? `<div class="sx-cc-rw-head">Active until this run ends</div>${active}` : '');
}


//------------------------------------------------------------------------
//-------------------VISUAL EFFECTS---------------------------------------
//------------------------------------------------------------------------

const QUIZ_BUFF_SPARK_COUNT = 12;
const QUIZ_BUFF_FX_DURATION_MS = 900;
const QUIZ_SHIELD_FADE_MS = 400;

// Stacks at which the aura reaches full intensity (2% each, so 20 = +40%).
const QUIZ_AURA_FULL_STACKS = 20;

// Sets the aura's intensity (0..1) from the number of live damage stacks.
function _syncQuizAuraIntensity() {
    const stacks = _pruneQuizDamageStacks();
    const qi = Math.min(1, Math.max(0, stacks / QUIZ_AURA_FULL_STACKS));
    document.querySelectorAll('.sx-quiz-aura').forEach(el => {
        el.style.setProperty('--qi', qi.toFixed(3));
        el.dataset.stacks = String(stacks);
    });
}

// Schedules the aura to re-evaluate at the next damage stack expiry; once
// no stacks remain the aura fades out.
function _scheduleQuizShieldExpiry() {
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
    const nextExpiry = Math.min(..._quizStacks.damage);
    const delay = Math.max(0, nextExpiry - Date.now());
    _quizShieldTimer = setTimeout(() => {
        _quizShieldTimer = null;
        _scheduleQuizShieldExpiry();
    }, delay);
}

// Adds the damage-buff aura: a red ring around the character sprite that
// pulses while at least one damage stack is active and scales with stacks.
function _addQuizShieldFX() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;

    // Create the aura only once - stacking should not flicker the visual.
    if (!document.querySelector('.sx-quiz-aura')) {
        const aura = document.createElement('div');
        aura.className = 'sx-quiz-shield-wing sx-quiz-aura';
        hud.appendChild(aura);
    }
    _syncQuizAuraIntensity();
    _scheduleQuizShieldExpiry();
}

// Removes the aura - immediately, or after a short fade-out.
function _removeQuizShieldFX(immediate) {
    const wings = document.querySelectorAll('.sx-quiz-shield-wing');
    if (!wings.length) return;

    if (immediate) {
        wings.forEach(w => w.remove());
        return;
    }
    wings.forEach(w => w.classList.add('sx-quiz-shield-out'));
    setTimeout(() => wings.forEach(w => w.remove()), QUIZ_SHIELD_FADE_MS);
}

// Spark burst + floating label anchored to the player HUD, in the colour of
// the reward. Heal / mana also flash their bar briefly.
function _showQuizBuffBurst(type, labelText) {
    const hud = document.getElementById('player-avatar-wrapper');
    const color = QUIZ_REWARDS[type].burst;

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

    const barEl = (type === 'heal')
        ? document.getElementById('avatar-hp-fill')
        : (type === 'mana') ? document.getElementById('chud-mana-fill') : null;
    if (barEl) {
        barEl.style.boxShadow = `0 0 12px ${color}`;
        setTimeout(() => { barEl.style.boxShadow = ''; }, 800);
    }
}


//------------------------------------------------------------------------
//-------------------GRANTING A REWARD------------------------------------
//------------------------------------------------------------------------

// Adds one stack of a timed reward (30 min), then toasts and bursts it.
function _grantQuizTimedReward(type) {
    // DEV_EFFECT_TIME_SCALE (dev testing harness, see js/dev/dev-testing.js):
    // ×1 = exact shipped behaviour (30 min stacks are unobservable in tests).
    const scale = (typeof window !== 'undefined' && window.DEV_EFFECT_TIME_SCALE > 0 && window.DEV_EFFECT_TIME_SCALE !== 1)
        ? window.DEV_EFFECT_TIME_SCALE : 1;
    const durationMs = QUIZ_BUFF_DURATION_MS * scale;
    _quizStacks[type].push(Date.now() + durationMs);
    const stacks = _pruneQuizStacks(type);
    const def = QUIZ_REWARDS[type];
    const total = stacks * def.per;
    const stackInfo = stacks > 1 ? ` (x${stacks} → +${total}% total)` : '';
    globalThis.showToast(`${def.icon} Scholar's Reward: +${def.per}% ${def.name.toLowerCase()} for ${_formatQuizBuffDuration(durationMs)}${stackInfo}!`);
    if (type === 'damage') _addQuizShieldFX();
    _showQuizBuffBurst(type, stacks > 1 ? `+${total}% (x${stacks})` : `+${def.per}%`);
    _pendingQuizRewards.push({ type, amount: def.per });
}

// Heals every point of missing life. Returns false when nothing was healed
// (e.g. life can only come from leech), so the caller can roll something else.
function _grantQuizHeal() {
    const missing = Math.round(globalThis.playerMaxHP - globalThis.playerCurrentHP);
    const heal = Math.min(missing, Math.round(_lifeGain(missing)));
    if (heal <= 0) return false;
    globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + heal);
    globalThis._renderPlayerHealth();
    globalThis.showToast(`💚 Scholar's Blessing: restored ${heal} HP!`);
    _showQuizBuffBurst('heal', `+${heal} HP`);
    _pendingQuizRewards.push({ type: 'heal', amount: heal });
    return true;
}

// Refills every point of missing mana. Returns false when nothing was gained.
function _grantQuizMana() {
    const gained = gainMana(_getPlayerMaxMana() - Math.round(globalThis.playerCurrentMana));
    if (gained <= 0) return false;
    globalThis.showToast(`🔮 Scholar's Insight: restored ${gained} mana!`);
    _showQuizBuffBurst('mana', `+${gained} Mana`);
    _pendingQuizRewards.push({ type: 'mana', amount: gained });
    return true;
}

// Which rewards can be rolled right now: the five timed ones always, heal
// only while hurt, mana only while below max (never on Blood Magic maps,
// where costs are paid from life).
function _eligibleQuizRewards() {
    const eligible = [...QUIZ_TIMED_TYPES];
    if (globalThis.playerMaxHP > 0 && globalThis.playerCurrentHP < globalThis.playerMaxHP) eligible.push('heal');
    if (!_egMapHasBloodMagic()) {
        const maxMana = _getPlayerMaxMana();
        if (maxMana > 0 && Math.round(globalThis.playerCurrentMana) < maxMana) eligible.push('mana');
    }
    return eligible;
}

// Rolls one reward at random and applies it. Called after a correct
// question. If the instant reward turns out to do nothing, a damage stack
// is given instead so no answer is wasted.
export function _applyQuizRewardBuff() {
    const eligible = _eligibleQuizRewards();
    const pick = eligible[Math.floor(Math.random() * eligible.length)];

    if (pick === 'heal' && _grantQuizHeal()) return;
    if (pick === 'mana' && _grantQuizMana()) return;
    _grantQuizTimedReward(QUIZ_REWARDS[pick].instant ? 'damage' : pick);
}
