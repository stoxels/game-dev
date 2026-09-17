//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Player attacks (Player -> Monster) and gear procs: the correct-cell
// entry point, arcane on-hit procs, defensive procs (parry/deflect/fate
// negation) and projectile impact procs. tutorial-quest.js patches
// _egOnCorrectCell through the write-through accessor.

// Phase 4 split: write-through globalThis accessors. The facade and sibling
// split modules rebind these through globalThis.<name> assignment
// (imported module bindings are read-only views) - the established
// step-9/step-10 pattern.
try { Object.defineProperty(globalThis, '_egOnCorrectCell', { get() { return _egOnCorrectCell; }, set(v) { _egOnCorrectCell = v; }, configurable: true }); } catch (e) {}

import { gainMana, spendMana } from '../classes/class-mana.js';
import { t } from '../translation/translations.js';
import { _egGetTarget, _egRollPlayerMiss, _egUpdateChargedProjectileVisual } from './encounter-charged-shot.js';
import { EG_DEFLECT_BASE_DMG_PCT, EG_DEFLECT_BASE_PCT, EG_PARRY_BASE_PCT } from './encounter-constants.js';
import { _egDamageTargetById, _egPlayerTakeDamage, _egShowStatusLabel } from './encounter-damage.js';
import { _egApplyPlayerMissFeedback } from './encounter-monster-attacks.js';
import { _egFireProjectile, _egGetElementCentre, _egGetProjectileDef } from './combat-class-projectiles.js';
import { EG_ELEMENTS, _egCalcPlayerDamage, _egLastHitElements, _egLastHitWasCrit } from './combat-calculations.js';
import { _egRestartFlashClass } from './encounter.js';
import { _egGetActiveMapModValue, _egMapPlayerProjectileMult } from '../endgame/endgame-map-launch.js';
import { EG_DUAL_WIELD_PARRY_PCT, _egComputePlayerStats, _egScheduleAbsorptionRegen } from '../endgame/endgame-player-stats.js';
import { _egIsDualWielding } from '../loot/loot-requirements.js';
import { _egDragChargeElements, _egIsActive, _egRecentFills } from './combat-state.js';



//------------------------------------------------------------------------
//-------------------PLAYER ATTACKS (Player → Monster)--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Pushes a correctly filled cell into the recent-fills circular buffer.
// Used by the Prior Bomb mechanic to undo recent player progress.
export function _egTrackRecentFill(row, col) {
    _egRecentFills.push([row, col]);
    if (_egRecentFills.length > globalThis.EG_RECENT_FILLS_CAPACITY) _egRecentFills.shift();
}

// Entry point called from mouse-button-handlers.js on every correct cell fill.
// Charged shot system: instead of firing one projectile per painted cell, each
// correct fill rolls its damage and stacks it into a single charging
// projectile anchored on the stroke's first cell. The shot is released with
// the combined damage when the player stops painting (_egReleaseChargedShot).
function _egOnCorrectCell(row, col) {
    // Block recovery no longer fumbles attacks - reveals always fire even
    // while recovering (recovery only suppresses the next block).
    if (!_egIsActive()) return;

    if (row !== undefined && col !== undefined) _egTrackRecentFill(row, col);

    // Boss puzzle mechanics hook (Fated Cell, Soul Tithe): lets active boss
    // mechanics observe correct fills. No-op unless a mechanic is listening.
    if (row !== undefined && col !== undefined && typeof _egNotifyCorrectFill === 'function') {
        try { globalThis._egNotifyCorrectFill(row, col); } catch (e) {}
    }

    // Projectile map mod: "% reduced Projectile Damage" scales correct-fill shots.
    const projMult = (typeof _egMapPlayerProjectileMult === 'function') ? _egMapPlayerProjectileMult() : 1;
    const damage = Math.max(1, Math.round(_egCalcPlayerDamage() * projMult));
    EG_ELEMENTS.forEach(el => {
        _egDragChargeElements[el] += _egLastHitElements ? (_egLastHitElements[el] || 0) : 0;
    });
    if (typeof _egLastHitWasCrit !== 'undefined' && _egLastHitWasCrit) globalThis._egDragChargeWasCrit = true;

    // Anchor the charging projectile on the stroke's first painted cell
    if (globalThis._egDragChargeStacks === 0 && row !== undefined && col !== undefined) {
        globalThis._egDragChargeRow = row;
        globalThis._egDragChargeCol = col;
    }
    globalThis._egDragChargeDamage += damage;
    globalThis._egDragChargeStacks++;
    _egUpdateChargedProjectileVisual();

    // Gear: arcane surge streak + channel stacks grow per correct cell
    _egTickCorrectCellGearProcs();
}


//------------------------------------------------------------------------
//-------------------ARCANE GEAR PROCS (correct cells)--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Correct-fill driven gear modifiers:
//   arcane_surge - after # consecutive correct cells without a mistake the
//                  sigil grants a burst of mana; the streak resets on any
//                  real mistake (_egOnMistake).
//   channel      - each consecutive correct cell adds a stack worth flat
//                  bonus damage; released on the next player hit or
//                  automatically when the max-stack cap is reached.

// Delay before an echo's second instance lands (see _egTryEchoHit).
export const EG_ECHO_DELAY_MS = 450;

// Called from breakFillStreaksOnMistake() (mouse-button-handlers.js) on any
// real (unabsorbed) mistake - breaks both correct-cell streak mechanics.
export function _egOnMistake() {
    globalThis._egArcaneSurgeStreak = 0;
    globalThis._egChannelStacks = 0;

    // Active map run: mistakes burn a share of maximum Life.
    if (typeof _egIsActive === 'function' && _egIsActive()
        && typeof _egGetActiveMapModValue === 'function') {
        const pct = _egGetActiveMapModValue('map_mistake_damage');
        if (pct > 0) {
            const maxHP = (typeof playerMaxHP !== 'undefined' && globalThis.playerMaxHP > 0) ? globalThis.playerMaxHP : 100;
            const dealt = _egPlayerTakeDamage(Math.max(1, Math.round(maxHP * pct / 100)), true);
            if (dealt > 0) globalThis.showToast(`✖️ ${t('eg_mm_toast_mistake_pain') || 'Painful mistake!'} (-${dealt})`);
        }
    }
}

// Advances the per-correct-cell gear streaks. Called from _egOnCorrectCell.
export function _egTickCorrectCellGearProcs() {
    const stats = _egComputePlayerStats();

    // Arcane Surge: mana burst at the required streak length
    if (stats.arcaneSurgeStreak > 0 && stats.arcaneSurgeMana > 0) {
        globalThis._egArcaneSurgeStreak++;
        if (globalThis._egArcaneSurgeStreak >= stats.arcaneSurgeStreak) {
            globalThis._egArcaneSurgeStreak = 0;
            const gained = gainMana(stats.arcaneSurgeMana);
            if (gained > 0) globalThis.showToast(t('eg_arcane_surge').replace('{n}', Math.round(gained)));
        }
    }

    // Channel: gain a stack, auto-releasing once the cap is reached
    if (stats.channelDamagePerStack > 0 && stats.channelMaxStacks > 0) {
        globalThis._egChannelStacks++;
        if (globalThis._egChannelStacks >= stats.channelMaxStacks) _egReleaseChannelAtMax();
    }
}

// Auto-release: dumps all accumulated channel stacks onto the current target.
export function _egReleaseChannelAtMax() {
    const stats = _egComputePlayerStats();
    const dmg = Math.round(globalThis._egChannelStacks * stats.channelDamagePerStack);
    globalThis._egChannelStacks = 0;
    const target = typeof _egGetTarget === 'function' ? _egGetTarget() : null;
    if (target && dmg > 0) {
        _egShowStatusLabel(target.id, t('eg_channel'));
        _egDamageTargetById(target.id, dmg);
    }
}

// Consumes the on-hit gear bonuses (channel stacks + mana-to-damage) and
// returns their combined flat damage. Called once per player hit - from
// _egResolveProjectileImpact (projectile channel) and
// _egApplyPlayerMeleeImpact (melee channel).
export function _egConsumeOnHitGearBonus() {
    const stats = _egComputePlayerStats();
    let bonus = 0;

    // Channel: spend accumulated stacks
    if (globalThis._egChannelStacks > 0 && stats.channelDamagePerStack > 0) {
        bonus += globalThis._egChannelStacks * stats.channelDamagePerStack;
        globalThis._egChannelStacks = 0;
    }

    // Mana to Damage: convert a % of CURRENT mana into flat bonus damage,
    // consuming that mana.
    const pct = Math.min(100, stats.manaToDamagePct || 0);
    if (pct > 0 && globalThis.playerCurrentMana > 0 && typeof spendMana === 'function') {
        const converted = Math.floor(globalThis.playerCurrentMana * pct / 100);
        if (converted > 0 && spendMana(converted)) bonus += converted;
    }

    return Math.round(bonus);
}


//------------------------------------------------------------------------
//-------------------DEFENSIVE GEAR PROCS---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Gear: fate (talisman suffix) - pure-luck chance to negate ANY incoming hit
// entirely, including spells and charge attacks. Returns true when negated.
export function _egRollFateNegation(stats) {
    const pct = stats.fatePct || 0;
    if (pct <= 0 || Math.random() * 100 >= pct) return false;
    globalThis.showToast(t('eg_fate'));
    _egApplyPlayerMissFeedback();
    _egScheduleAbsorptionRegen();
    return true;
}

// Gear: grounded (boots prefix) - on a monster CHARGE hit, rolls against
// groundedChancePct and reduces the hit by groundedReductionPct on proc.
// Ranged (projectile) attacks are not charges and pass through untouched.
export function _egApplyGroundedReduction(rawDamage) {
    const stats = _egComputePlayerStats();
    const chance = stats.groundedChancePct || 0;
    const reduction = Math.min(100, stats.groundedReductionPct || 0);
    if (chance <= 0 || reduction <= 0) return rawDamage;
    if (Math.random() * 100 >= chance) return rawDamage;
    globalThis.showToast(t('eg_grounded'));
    return rawDamage * (1 - reduction / 100);
}

// ── Hold-Parry & Deflect ─────────────────────────────────────────────
// While holding the parry key (R by default) the player pauses their own charge bar and can parry
// incoming monster projectile and charge (melee) attacks. Hazards and boss
// spells (isSpell=true) are never parryable. Baseline 50% + gear parry.
// On a successful projectile parry there is a 5% + gear deflect chance to
// redirect the shot to another monster for 30% + gear deflect damage.
export function _egApplyPlayerParryFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    const txt = (typeof t === 'function') ? t('eg_parried') : 'Parried!';
    label.textContent = (txt && txt !== 'eg_parried') ? txt : 'Parried!';
    hud.appendChild(label);
    setTimeout(() => label.remove(), 1050);
}
export function _egApplyPlayerDeflectFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    const txt = (typeof t === 'function') ? t('eg_deflected') : 'Deflected!';
    label.textContent = (txt && txt !== 'eg_deflected') ? txt : 'Deflected!';
    hud.appendChild(label);
    setTimeout(() => label.remove(), 1050);
}
export function _egGetParryChancePct() {
    const base = (typeof EG_PARRY_BASE_PCT !== 'undefined' ? EG_PARRY_BASE_PCT : 50);
    const gear = (_egComputePlayerStats().parryChancePct || 0);
    return base + gear;
}
// Dual-wield parry (PoE-style): two 1H weapons grant a base chance to parry
// WITHOUT holding the parry key (gear parry adds on top). Successful projectile parries
// roll deflect exactly like held parries.
export function _egGetDualWieldParryChancePct() {
    const base = (typeof EG_DUAL_WIELD_PARRY_PCT !== 'undefined' ? EG_DUAL_WIELD_PARRY_PCT : 15);
    let gear = 0;
    try { gear = (_egComputePlayerStats().parryChancePct || 0); } catch (e) {}
    return base + gear;
}
export function _egIsDualWieldParryActive() {
    try {
        if (typeof _egIsDualWielding === 'function') return _egIsDualWielding();
    } catch (e) {}
    return false;
}
export function _egGetDeflectChancePct() {
    const base = (typeof EG_DEFLECT_BASE_PCT !== 'undefined' ? EG_DEFLECT_BASE_PCT : 5);
    const gear = (_egComputePlayerStats().deflectChancePct || 0);
    return base + gear;
}
export function _egGetDeflectDamagePct() {
    const base = (typeof EG_DEFLECT_BASE_DMG_PCT !== 'undefined' ? EG_DEFLECT_BASE_DMG_PCT : 30);
    const gear = (_egComputePlayerStats().deflectDamagePct || 0);
    return base + gear;
}
export function _egRollParry(attacker, isProjectile) {
    // Hold-parry, or dual-wield auto-parry (two 1H weapons, no key needed)
    const holding = (typeof _egHoldEPauseActive !== 'undefined' && globalThis._egHoldEPauseActive);
    const dualWield = (typeof _egIsDualWieldParryActive === 'function' && _egIsDualWieldParryActive());
    if (!holding && !dualWield) return false;
    if (typeof _egIsActive === 'function' && !_egIsActive()) return false;
    // Hazards and boss spells are not parryable - they flow through isSpell=true,
    // but we also guard here for callers that bypass takeDamage.
    const chance = holding
        ? _egGetParryChancePct()
        : (typeof _egGetDualWieldParryChancePct === 'function' ? _egGetDualWieldParryChancePct() : 15);
    if (chance <= 0) return false;
    if (Math.random() * 100 >= chance) return false;
    globalThis.showToast((typeof t === 'function' ? t('eg_parried') : 'Parried!'));
    _egApplyPlayerParryFeedback();
    _egScheduleAbsorptionRegen();
    return true;
}
export function _egTryDeflectProjectile(attacker, isProjectile) {
    if (!isProjectile) return false;
    if (!attacker) return false;
    const others = globalThis._egMonsters.filter(m => m.id !== attacker.id && m.currentHP > 0);
    if (others.length === 0) return false;
    const chance = _egGetDeflectChancePct();
    if (chance <= 0 || Math.random() * 100 >= chance) return false;
    const dmgPct = _egGetDeflectDamagePct();
    const deflectDamage = Math.max(1, Math.round((attacker.damageValue || 0) * dmgPct / 100));
    const victim = others[Math.floor(Math.random() * others.length)];
    // Visual: fire a quick projectile from player/avatar to the victim
    const playerEl = document.getElementById('player-avatar-wrapper') || document.getElementById('player-avatar-simple');
    const targetCard = document.getElementById(`eg-card-${victim.id}`);
    if (playerEl && targetCard && typeof _egFireProjectile === 'function') {
        const start = _egGetElementCentre(playerEl);
        const end = _egGetElementCentre(targetCard);
        const projDef = (typeof _egGetProjectileDef === 'function') ? _egGetProjectileDef() : { emoji: '↩️', cssClass: 'eg-proj-player', duration: 300, easing: 'linear' };
        _egFireProjectile(projDef, projDef.cssClass, start, end, 320, 'linear', () => {
            const toastKey = (typeof t === 'function' ? t('eg_deflected') : 'Deflected!');
            globalThis.showToast(toastKey !== 'eg_deflected' ? toastKey : `↩️ Deflected to ${victim.name || 'another monster'}!`);
            _egDamageTargetById(victim.id, deflectDamage);
        });
    } else {
        _egDamageTargetById(victim.id, deflectDamage);
        globalThis.showToast((typeof t === 'function' ? t('eg_deflected') : 'Deflected!'));
    }
    _egApplyPlayerDeflectFeedback();
    return true;
}


// Launches a projectile from the clicked cell toward the targeted monster card.
// If the target card is not visible (e.g. not yet rendered), damage is applied
// instantly so no hits are silently lost.
// `elements` optionally carries the per-element damage share of `amount` so
// monster resistances can be applied at impact.
// `opts.isCharged` marks a drag-paint charged shot so overkill can ricochet.
export function _egAnimatePlayerProjectile(damage, targetId, row, col, sourceElOverride, startScale, elements, opts) {
    // Explicit source element first (reveal-triggered shots), then the cell
    // element, falling back to the HUD if missing
    let sourceEl = sourceElOverride
        || ((row !== undefined && col !== undefined)
            ? document.getElementById(`g-${row}-${col}`)
            : null);

    if (!sourceEl) {
        sourceEl = document.getElementById('class-hud-drag-handle');
    }

    const targetCard = targetId ? document.getElementById(`eg-card-${targetId}`) : null;

    if (!sourceEl || !targetCard) {
        // No visual target - apply damage instantly without animation
        if (damage != null) _egResolveProjectileImpact(damage, targetId, elements, opts);
        return;
    }

    const start = _egGetElementCentre(sourceEl);
    const end = _egGetElementCentre(targetCard);
    // Optional explicit visual: callers like the tutorial Fireball pass
    // opts.projDef so their shot doesn't fall back to the generic/reveal
    // projectile look (see _tqCastFireball in tutorial-quest.js).
    const projDef = (opts && opts.projDef) ? opts.projDef : _egGetProjectileDef();

    // Pass the whole def: code-built visuals orient themselves onto the
    // flight vector inside _egFireProjectile (they're drawn tip-forward),
    // so every shot always points at the targeted creature.
    _egFireProjectile(projDef, projDef.cssClass, start, end, projDef.duration, projDef.easing, () => {
        _egResolveProjectileImpact(damage, targetId, elements, opts);
    }, null, startScale);
}


//------------------------------------------------------------------------
//-------------------PROJECTILE IMPACT GEAR PROCS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Ranged-channel gear modifiers that resolve when a projectile lands:
//   snipe   - bonus damage vs monsters alone in their spawn location
//   splash  - chance to hit every other monster in the target's zone
//   chain   - chance to bounce to one monster in a DIFFERENT spawn location
//   pierce  - chance to punch through and hit one additional monster anywhere
export function _egResolveProjectileImpact(damage, targetId, elements, opts) {
    const target = globalThis._egMonsters.find(m => m.id === targetId);

    // Every projectile landing here is a player MAGIC/ranged source -
    // Spellproof monsters resist these (melee strikes are exempt).
    opts = Object.assign({}, opts, { isPlayerSpell: true });

    // Accuracy: projectiles can miss (no snipe/splash/chain/pierce on a miss)
    // Drag-painting bonus: longer drags reduce miss chance (threshold-based)
    if (_egRollPlayerMiss(targetId, opts)) return;

    // Gear: channel stacks + mana-to-damage are consumed by this hit
    let finalDamage = damage + _egConsumeOnHitGearBonus();

    // Snipe: isolated target (no zone-mates) takes amplified projectile damage
    if (target) {
        const snipePct = _egComputePlayerStats().snipePct || 0;
        const isIsolated = !globalThis._egMonsters.some(m => m.id !== targetId && m.zoneId === target.zoneId);
        if (snipePct > 0 && isIsolated) {
            finalDamage = Math.round(finalDamage * (1 + snipePct / 100));
            _egShowStatusLabel(targetId, t('eg_snipe'));
        }
    }

    const damageOpts = Object.assign({}, opts);
    // Preserve charged flag and proportional element share for overkill calc
    if (elements && damage !== finalDamage && damage > 0) {
        // Scale elements to match the post-bonus finalDamage for resistance
        // handling inside _egDamageTargetById (it rescales internally, so
        // we keep the same shape but note the ratio for ricochet later).
        damageOpts._chargedElementsFactor = finalDamage / damage;
    }
    _egDamageTargetById(targetId, finalDamage, elements, damageOpts);

    if (!target) return;

    // Splash: hits all OTHER monsters sharing the target's spawn location
    const splashPct = _egComputePlayerStats().splashPct || 0;
    if (splashPct > 0 && Math.random() * 100 < splashPct) {
        globalThis._egMonsters.filter(m => m.id !== targetId && m.zoneId === target.zoneId).forEach(m => {
            const card = document.getElementById(`eg-card-${m.id}`);
            if (card) _egRestartFlashClass(card, 'eg-flash-damage');
            _egDamageTargetById(m.id, finalDamage, elements, { isCrit: !!(opts && opts.isCrit) });
        });
    }

    // Chain: bounces to one additional monster in a different spawn location
    const chainPct = _egComputePlayerStats().chainPct || 0;
    if (chainPct > 0 && Math.random() * 100 < chainPct) {
        const others = globalThis._egMonsters.filter(m => m.id !== targetId && m.zoneId !== target.zoneId);
        if (others.length) {
            const victim = others[Math.floor(Math.random() * others.length)];
            _egDamageTargetById(victim.id, finalDamage, elements, { isCrit: !!(opts && opts.isCrit) });
        }
    }

    // Pierce: punches through to one additional monster anywhere on the field
    // (does not chain further - only one extra target per shot)
    const piercePct = _egComputePlayerStats().piercePct || 0;
    if (piercePct > 0 && Math.random() * 100 < piercePct) {
        const others = globalThis._egMonsters.filter(m => m.id !== targetId);
        if (others.length) {
            const victim = others[Math.floor(Math.random() * others.length)];
            _egDamageTargetById(victim.id, finalDamage, elements, { isCrit: !!(opts && opts.isCrit) });
        }
    }
}
