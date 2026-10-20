// Player attacks (Player -> Monster): the correct-cell entry point, on-hit
// gear procs, projectile animation, and projectile impact procs. Defensive
// mitigation lives in encounter-player-mitigation.js. tutorial-quest.js
// patches _onCorrectCell through the write-through accessor.

// Phase 4 split: write-through globalThis accessors. The facade and sibling
// split modules rebind these through globalThis.<name> assignment
// (imported module bindings are read-only views) - the established
// step-9/step-10 pattern.
try { Object.defineProperty(globalThis, '_onCorrectCell', { get() { return _onCorrectCell; }, set(v) { _onCorrectCell = v; }, configurable: true }); } catch (e) {}

import { Audio_Manager } from '../audio/audio.js';
import { gainMana, spendMana } from '../classes/class-mana.js';
import { t } from '../translation/translations.js';
import { _getTarget, _rollPlayerMiss, _updateChargedProjectileVisual } from './encounter-charged-shot.js';
import { _playerTakeDamage } from './encounter-damage.js';
import { _damageTargetById, _showStatusLabel } from './encounter-monster-damage.js';
import { _fireProjectile, _getElementCentre, _getElementRestCentre, _getProjectileDef } from './combat-class-projectiles.js';
import { _calcPlayerDamage, _lastHitElements, _lastHitWasCrit } from './combat-calculations.js';
import { DAMAGE_ELEMENTS, _scaleElements, _secondaryDamage } from './combat-calculations-resistances.js';
import { _restartFlashClass } from './encounter.js';
import { _egGetActiveMapModValue, _egMapPlayerProjectileMult } from '../endgame/endgame-map-launch.js';
import { _computePlayerStats } from './combat-player-stats.js';
import { _dragChargeElements, _isActive, _recentFills } from './combat-state.js';

// Player projectiles fly at half their old speed (2x the class def's flight
// time) before "% increased Projectile Speed" is applied - see
// _animatePlayerProjectile.
const PLAYER_PROJECTILE_BASE_SLOWDOWN = 2;

// Life of the chance-based burst on a projectile hit (node 20110); the
// amount is part of that node's tooltip text.
const PROJECTILE_HIT_LIFE_BURST = 300;


//------------------------------------------------------------------------
//-------------------PLAYER ATTACKS (Player → Monster)--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Pushes a correctly filled cell into the recent-fills circular buffer.
// Used by the Prior Bomb mechanic to undo recent player progress.
export function _trackRecentFill(row, col) {
    _recentFills.push([row, col]);
    if (_recentFills.length > globalThis.RECENT_FILLS_CAPACITY) _recentFills.shift();
}

// Entry point called from mouse-button-handlers.js on every correct cell fill.
// Charged shot system: instead of firing one projectile per painted cell, each
// correct fill rolls its damage and stacks it into a single charging
// projectile anchored on the stroke's first cell. The shot is released with
// the combined damage when the player stops painting (_releaseChargedShot).
function _onCorrectCell(row, col) {
    // Block recovery no longer fumbles attacks - reveals always fire even
    // while recovering (recovery only suppresses the next block).
    if (!_isActive()) return;

    if (row !== undefined && col !== undefined) _trackRecentFill(row, col);

    // Boss puzzle mechanics hook (Fated Cell, Soul Tithe): lets active boss
    // mechanics observe correct fills. No-op unless a mechanic is listening.
    if (row !== undefined && col !== undefined && typeof _notifyCorrectFill === 'function') {
        try { globalThis._notifyCorrectFill(row, col); } catch (e) {}
    }

    // Projectile map mod: "% reduced Projectile Damage" scales correct-fill shots.
    const projMult = (typeof _egMapPlayerProjectileMult === 'function') ? _egMapPlayerProjectileMult() : 1;
    const damage = Math.max(1, Math.round(_calcPlayerDamage() * projMult));
    DAMAGE_ELEMENTS.forEach(el => {
        _dragChargeElements[el] += _lastHitElements ? (_lastHitElements[el] || 0) : 0;
    });
    if (typeof _lastHitWasCrit !== 'undefined' && _lastHitWasCrit) globalThis._dragChargeWasCrit = true;

    // Anchor the charging projectile on the stroke's first painted cell
    if (globalThis._dragChargeStacks === 0 && row !== undefined && col !== undefined) {
        globalThis._dragChargeRow = row;
        globalThis._dragChargeCol = col;
    }
    globalThis._dragChargeDamage += damage;
    globalThis._dragChargeStacks++;
    _updateChargedProjectileVisual();

    // Gear: arcane surge streak + channel stacks grow per correct cell
    _tickCorrectCellGearProcs();
}


//------------------------------------------------------------------------
//-------------------ARCANE GEAR PROCS (correct cells)--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Correct-fill driven gear modifiers:
//   arcane_surge - after # consecutive correct cells without a mistake the
//                  sigil grants a burst of mana; the streak resets on any
//                  real mistake (_onMistake).
//   channel      - each consecutive correct cell adds a stack worth flat
//                  bonus damage; released on the next player hit or
//                  automatically when the max-stack cap is reached.

// Called from breakFillStreaksOnMistake() (mouse-button-handlers.js) on any
// real (unabsorbed) mistake - breaks both correct-cell streak mechanics.
export function _onMistake() {
    globalThis._arcaneSurgeStreak = 0;
    globalThis._channelStacks = 0;

    // mistake_heal (tree): a mistake restores some Life.
    const mistakeHeal = Number(_computePlayerStats().mistakeHeal) || 0;
    if (mistakeHeal > 0 && globalThis.playerCurrentHP > 0 && globalThis.playerCurrentHP < globalThis.playerMaxHP) {
        const gain = globalThis._lifeGain ? globalThis._lifeGain(mistakeHeal) : mistakeHeal;
        globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + gain);
        if (typeof globalThis._renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
    }

    // damage_on_mistake (tree): the next Attack deals more damage.
    if ((Number(_computePlayerStats().damageOnMistakePct) || 0) > 0 && globalThis.LEVEL_FLAGS) {
        globalThis.LEVEL_FLAGS.damageOnMistakePending = true;
    }

    // Active map run: mistakes burn a share of maximum Life.
    if (typeof _isActive === 'function' && _isActive()
        && typeof _egGetActiveMapModValue === 'function') {
        const pct = _egGetActiveMapModValue('map_mistake_damage');
        if (pct > 0) {
            const maxHP = (typeof playerMaxHP !== 'undefined' && globalThis.playerMaxHP > 0) ? globalThis.playerMaxHP : 100;
            const dealt = _playerTakeDamage(Math.max(1, Math.round(maxHP * pct / 100)), true);
            if (dealt > 0) globalThis.showCombatToast(`✖️ ${t('eg_mm_toast_mistake_pain') || 'Painful mistake!'} (-${dealt})`);
        }
    }
}

// Advances the per-correct-cell gear streaks. Called from _onCorrectCell.
export function _tickCorrectCellGearProcs() {
    const stats = _computePlayerStats();

    // Arcane Surge: mana burst at the required streak length
    if (stats.arcaneSurgeStreak > 0 && stats.arcaneSurgeMana > 0) {
        globalThis._arcaneSurgeStreak++;
        if (globalThis._arcaneSurgeStreak >= stats.arcaneSurgeStreak) {
            globalThis._arcaneSurgeStreak = 0;
            const gained = gainMana(stats.arcaneSurgeMana);
            if (gained > 0) globalThis.showCombatToast(t('eg_arcane_surge').replace('{n}', Math.round(gained)));
        }
    }

    // Channel: gain a stack, auto-releasing once the cap is reached
    if (stats.channelDamagePerStack > 0 && stats.channelMaxStacks > 0) {
        globalThis._channelStacks++;
        if (globalThis._channelStacks >= stats.channelMaxStacks) _releaseChannelAtMax();
    }
}

// Auto-release: dumps all accumulated channel stacks onto the current target.
export function _releaseChannelAtMax() {
    const stats = _computePlayerStats();
    const dmg = Math.round(globalThis._channelStacks * stats.channelDamagePerStack);
    globalThis._channelStacks = 0;
    const target = typeof _getTarget === 'function' ? _getTarget() : null;
    if (target && dmg > 0) {
        _showStatusLabel(target.id, t('eg_channel'));
        _damageTargetById(target.id, dmg, null, { isPlayerFlat: true });
    }
}

// Consumes the on-hit gear bonuses (channel stacks + mana-to-damage) and
// returns their combined flat damage. Called once per player hit - from
// _resolveProjectileImpact (projectile channel) and
// _applyPlayerMeleeImpact (melee channel).
export function _consumeOnHitGearBonus() {
    const stats = _computePlayerStats();
    let bonus = 0;

    // Channel: spend accumulated stacks
    if (globalThis._channelStacks > 0 && stats.channelDamagePerStack > 0) {
        bonus += globalThis._channelStacks * stats.channelDamagePerStack;
        globalThis._channelStacks = 0;
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


// Launches a projectile from the clicked cell toward the targeted monster card.
// If the target card is not visible (e.g. not yet rendered), damage is applied
// instantly so no hits are silently lost.
// `elements` optionally carries the per-element damage share of `amount` so
// monster resistances can be applied at impact.
// `opts.isCharged` marks a drag-paint charged shot so overkill can ricochet.
export function _animatePlayerProjectile(damage, targetId, row, col, sourceElOverride, startScale, elements, opts) {
    // Explicit source element first (reveal-triggered shots), then the cell
    // element, falling back to the HUD if missing
    let sourceEl = sourceElOverride
        || ((row !== undefined && col !== undefined)
            ? document.getElementById(`g-${row}-${col}`)
            : null);

    if (!sourceEl) {
        sourceEl = document.getElementById('class-hud-drag-handle');
    }

    const targetCard = targetId ? document.getElementById(`sx-card-${targetId}`) : null;

    if (!sourceEl || !targetCard) {
        // No visual target - apply damage instantly without animation
        if (damage != null) _resolveProjectileImpact(damage, targetId, elements, opts);
        return;
    }

    const start = _getElementCentre(sourceEl);
    const end = _getElementRestCentre(targetCard);
    // Optional explicit visual: callers like the tutorial Fireball pass
    // opts.projDef so their shot doesn't fall back to the generic/reveal
    // projectile look (see _tqCastFireball in tutorial-quest.js).
    const projDef = (opts && opts.projDef) ? opts.projDef : _getProjectileDef();

    // Pass the whole def: code-built visuals orient themselves onto the
    // flight vector inside _fireProjectile (they're drawn tip-forward),
    // so every shot always points at the targeted creature.
    // Flight time: every player projectile base-travels at half speed
    // (PLAYER_PROJECTILE_BASE_SLOWDOWN) so "% increased Projectile Speed"
    // from the passive tree is worth picking up; the bonus divides the time.
    const flightStats = _computePlayerStats();
    // Point Blank keystone: up to +N% damage at the start of the flight, scaling down
    // to -N% as the projectile travels farther (distance relative to the screen width).
    const pointBlank = Number(flightStats.pointBlankPct) || 0;
    if (pointBlank > 0 && damage != null) {
        const dist = Math.hypot(end.x - start.x, end.y - start.y);
        const ref = Math.max(300, 0.7 * (Number(globalThis.innerWidth) || 1200));
        const pbMult = 1 + (pointBlank / 100) * (1 - 2 * Math.min(1, dist / ref));
        damage = Math.max(1, Math.round(damage * pbMult));
        elements = _scaleElements(elements, pbMult);
    }
    const speedPct = Math.max(0, flightStats.projectileSpeedPct || 0);
    const flightMs = Math.max(60, Math.round(projDef.duration * PLAYER_PROJECTILE_BASE_SLOWDOWN / (1 + speedPct / 100)));
    _fireProjectile(projDef, projDef.cssClass, start, end, flightMs, projDef.easing, () => {
        _resolveProjectileImpact(damage, targetId, elements, opts);
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
export function _resolveProjectileImpact(damage, targetId, elements, opts) {
    // Arrow Dancing: a projectile cannot hit the same enemy as the previous one; it
    // picks another living enemy when there is one.
    if ((Number(_computePlayerStats().noRepeatTarget) || 0) > 0) {
        if (globalThis._lastProjectileTargetId === targetId) {
            const others = (globalThis._monsters || []).filter(m => m.id !== targetId && m.currentHP > 0);
            if (others.length) targetId = others[Math.floor(Math.random() * others.length)].id;
        }
        globalThis._lastProjectileTargetId = targetId;
    }
    const target = globalThis._monsters.find(m => m.id === targetId);

    // Every projectile landing here is a player MAGIC/ranged source -
    // Spellproof monsters resist these (melee strikes are exempt).
    opts = Object.assign({}, opts, { isPlayerSpell: true });

    // Accuracy: projectiles can miss (no snipe/splash/chain/pierce on a miss)
    // Drag-painting bonus: longer drags reduce miss chance (threshold-based)
    if (_rollPlayerMiss(targetId, opts)) return;
    Audio_Manager.playSFX('projectile_impact');

    // Passive tree: Mana on every projectile that connects (not on a miss).
    const manaOnHit = Number(_computePlayerStats().manaOnProjectileHitPct) || 0;
    if (manaOnHit > 0) gainMana(manaOnHit);

    // Passive tree: Life on every projectile that connects - a flat amount,
    // plus a chance for a large burst (PROJECTILE_HIT_LIFE_BURST).
    {
        const hitStats = _computePlayerStats();
        let lifeGain = (Number(hitStats.lifeOnProjectileHit) || 0) + (Number(hitStats.lifeOnAttackHit) || 0);
        const burstChance = Number(hitStats.lifeBurstOnProjectileHitChancePct) || 0;
        if (burstChance > 0 && Math.random() * 100 < burstChance) lifeGain += PROJECTILE_HIT_LIFE_BURST;
        if (lifeGain > 0 && globalThis.playerCurrentHP > 0 && globalThis.playerCurrentHP < globalThis.playerMaxHP) {
            globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + (globalThis._lifeGain ? globalThis._lifeGain(lifeGain) : (lifeGain)));
            if (typeof globalThis._renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
        }
    }

    // Gear: channel stacks + mana-to-damage are consumed by this hit
    let finalDamage = damage + _consumeOnHitGearBonus();

    // Snipe: isolated target (no zone-mates) takes amplified projectile damage
    if (target) {
        const snipePct = _computePlayerStats().snipePct || 0;
        const isIsolated = !globalThis._monsters.some(m => m.id !== targetId && m.zoneId === target.zoneId);
        if (snipePct > 0 && isIsolated) {
            finalDamage = Math.round(finalDamage * (1 + snipePct / 100));
            _showStatusLabel(targetId, t('eg_snipe'));
        }
    }

    const damageOpts = Object.assign({}, opts, { isPlayerHit: true });
    // Preserve charged flag and proportional element share for overkill calc
    if (elements && damage !== finalDamage && damage > 0) {
        // Scale elements to match the post-bonus finalDamage for resistance
        // handling inside _damageTargetById (it rescales internally, so
        // we keep the same shape but note the ratio for ricochet later).
        damageOpts._chargedElementsFactor = finalDamage / damage;
    }
    _damageTargetById(targetId, finalDamage, elements, damageOpts);

    if (!target) return;

    const secStats = _computePlayerStats();
    const secCrit = { isCrit: !!(opts && opts.isCrit) };
    // Picks up to `count` distinct living victims (not in `skip`), random order.
    const pickVictims = (count, skip, pool) => {
        const cand = pool.filter(m => !skip.has(m.id));
        const out = [];
        while (out.length < count && cand.length) out.push(cand.splice(Math.floor(Math.random() * cand.length), 1)[0]);
        return out;
    };
    const hitSet = new Set([targetId]);

    // Splash: hits all OTHER monsters sharing the target's spawn location
    const splashPct = secStats.splashPct || 0;
    if (splashPct > 0 && Math.random() * 100 < splashPct) {
        globalThis._monsters.filter(m => m.id !== targetId && m.zoneId === target.zoneId).forEach(m => {
            const card = document.getElementById(`sx-card-${m.id}`);
            if (card) _restartFlashClass(card, 'sx-flash-damage');
            _damageTargetById(m.id, _secondaryDamage(finalDamage, 'splash', secStats), elements, secCrit);
        });
    }

    // Chain: bounces to an additional monster in a different spawn location, then
    // (tree: chain count) on to further ones, each bounce weaker than the last.
    const chainPct = (secStats.chainPct || 0) + (secStats.chainChanceTreePct || 0);
    if (chainPct > 0 && Math.random() * 100 < chainPct) {
        const bounces = 1 + Math.max(0, Math.floor(secStats.chainCountExtra || 0));
        let fromZone = target.zoneId;
        for (let b = 0; b < bounces; b++) {
            let victim = pickVictims(1, hitSet, globalThis._monsters.filter(m => m.zoneId !== fromZone))[0]
                || pickVictims(1, hitSet, globalThis._monsters)[0];
            if (!victim) break;
            hitSet.add(victim.id);
            fromZone = victim.zoneId;
            _damageTargetById(victim.id, _secondaryDamage(finalDamage, 'chain', secStats, b), elements, secCrit);
        }
    }

    // Pierce: punches through to additional monsters anywhere on the field
    // (one extra target, plus the tree's additional targets).
    const piercePct = (secStats.piercePct || 0) + (secStats.pierceChanceTreePct || 0);
    if (piercePct > 0 && Math.random() * 100 < piercePct) {
        const targets = 1 + Math.max(0, Math.floor(secStats.pierceTargetsExtra || 0));
        pickVictims(targets, hitSet, globalThis._monsters).forEach((victim) => {
            hitSet.add(victim.id);
            _damageTargetById(victim.id, _secondaryDamage(finalDamage, 'pierce', secStats), elements, secCrit);
        });
    }

    // Fork (tree only): the hit forks to 2 other enemies, 3 with the extra-fork chance.
    const forkPct = secStats.forkChancePct || 0;
    if (forkPct > 0 && Math.random() * 100 < forkPct) {
        let forks = 2;
        if ((secStats.forkExtraChancePct || 0) > 0 && Math.random() * 100 < secStats.forkExtraChancePct) forks += 1;
        pickVictims(forks, hitSet, globalThis._monsters).forEach((victim) => {
            hitSet.add(victim.id);
            const card = document.getElementById(`sx-card-${victim.id}`);
            if (card) _restartFlashClass(card, 'sx-flash-damage');
            _damageTargetById(victim.id, _secondaryDamage(finalDamage, 'fork', secStats), elements, secCrit);
        });
    }
}
