import { t } from '../translation/translations.js';
import { _egApplyAilmentShockAmpOnMonster, _egApplyImpaleToHit, _egApplyIntimidateAmp, _egRollIntimidate, _egRollPlayerHitAilments } from './combat-ailments-core.js';
import { _egFireProjectile, _egGetElementCentre, _egGetProjectileDef } from './combat-class-projectiles.js';
import { EG_ELEMENTS, _egApplyTargetResistances, _egScaleElements } from './combat-calculations-resistances.js';
import { EG_DAMAGE_NUMBER_DURATION_MS } from './encounter-constants.js';
import { _egKillMonster } from './encounter-kills.js';
import { EG_STAGGER_DURATION_MS } from './encounter-lifecycle.js';
import { _egFlashDamageCard, _egFlashImmune, _egShowDamageNumber, _egSpawnHitBurst, _egUpdateBars } from './encounter.js';
import { EG_PLAYER_STATS, _egComputePlayerStats } from '../endgame/endgame-player-stats.js';
import { _egIsActive } from './combat-state.js';

// Player-to-monster damage: target HP/charge/stagger application, elemental
// resistance and ailment hooks, hit visuals, echo/overkill/ricochet procs,
// and the shared floating status-label helper.

// Convenience wrapper - damages the currently selected target.
// Kept for any legacy callers that don't pass an explicit id.
export function _egDamageTarget(amount) {
    _egDamageTargetById(globalThis._egTargetId, amount);
}


//------------------------------------------------------------------------
//-------------------DAMAGE APPLICATION-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies stat changes when a hit lands: reduces HP and pushes back charge.
// Gear: pushback adds extra seconds on top of the base charge pushback;
// gear: stagger rolls a chance to pause the charge timer entirely for 1s.
// Pushback is resisted by high-level monsters (50% at L41, 80% at L90) so
// low-level players cannot permanently stall a T11+ monster by spamming.
export function _egApplyHitToMonster(target, amount) {
    const stats = _egComputePlayerStats();
    target.currentHP = Math.max(0, target.currentHP - amount);
    const basePushback = EG_PLAYER_STATS.chargePushback + (stats.pushbackFlat || 0);
    const lvl = Math.max(1, Number(target.level) || 1);
    // High-level monsters resist pushback: linear 1.5s@L1 -> 0.3s@L90
    const resistFactor = Math.max(0.20, 1 - 0.014 * (lvl - 1)); // 0.44@L41, 0.20@L90
    const totalPushback = basePushback * resistFactor;
    target.currentCharge = Math.max(0, target.currentCharge - totalPushback);

    if (stats.staggerPct > 0 && Math.random() * 100 < stats.staggerPct) {
        target.staggeredUntil = Date.now() + EG_STAGGER_DURATION_MS;
        _egShowStatusLabel(target.id, t('eg_staggered'));
    }
}

// Appends a short floating status label (stagger/snipe/...) to a monster card.
export function _egShowStatusLabel(monsterId, text) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;
    const label = document.createElement('div');
    label.className = 'eg-damage-number eg-status-label';
    label.textContent = text;
    // small random jitter so overlapping labels don't perfectly stack
    label.style.marginLeft = `${(Math.random() * 10 - 5).toFixed(1)}px`;
    card.appendChild(label);
    setTimeout(() => label.remove(), EG_DAMAGE_NUMBER_DURATION_MS);
}

// Returns the dominant elemental key for visual choice, or 'physical' when none.
export function _egGetDominantElement(elements) {
    if (!elements) return 'physical';
    let best = 'physical';
    let bestVal = 0;
    EG_ELEMENTS.forEach(el => {
        const v = elements[el] || 0;
        if (v > bestVal) { bestVal = v; best = el; }
    });
    return bestVal > 0 ? best : 'physical';
}

// Applies incoming player damage to a specific monster by id.
// Handles boss immunity, elemental resistances, stat changes, phase
// transitions, and kill detection.
// Called by the projectile onfinish callback so the impact matches visually.
// `elements` optionally maps each element to the elemental share of `amount`.
// `opts.isEcho` marks the delayed echo instance so echoes can't chain into
// further echoes (they still trigger on-hit effects like leech/ailments).
// `opts.isCharged` marks a drag-paint charged shot (or its ricochet chain)
// so overkill always ricochets as a smaller projectile.
export function _egDamageTargetById(monsterId, amount, elements, opts) {
    if (!_egIsActive()) return;

    const target = globalThis._egMonsters.find(m => m.id === monsterId);
    if (!target) return;

    // Boss immunity window - ignore damage and show the immune flash
    if (target.bossImmune) {
        _egFlashImmune(target.id);
        return;
    }

    const hpBefore = target.currentHP;

    // Intimidate (node 125): melee hits on an intimidated enemy deal more.
    // Applied before resistances so it scales the whole hit.
    amount = _egApplyIntimidateAmp(target, amount, opts);

    // Armour pierce (node 147): per-hit roll to skip the target's physical
    // reduction. Only tagged player hits (melee strikes / primary projectile
    // hits) roll; untagged boss and monster-side damage never does.
    if (opts && (opts.isMelee || opts.isPlayerHit)
        && ((target.resistances && target.resistances.physical) || 0) > 0) {
        const pierce = Math.min(100, Number(_egComputePlayerStats().ignorePhysReductionPct) || 0);
        if (pierce > 0 && Math.random() * 100 < pierce) opts = Object.assign({}, opts, { ignorePhysReduction: true });
    }

    // Elemental resistances reduce only the elemental share of the hit;
    // the physical portion passes through untouched. opts carries source
    // tags (isMelee) read by Spellproof inside.
    amount = _egApplyTargetResistances(amount, target, elements, opts);

    // Ailments: shocked monsters take amplified damage; elemental hits can
    // ignite / chill / freeze / shock the monster (gear ailment chances).
    if (typeof _egApplyAilmentShockAmpOnMonster === 'function') {
        amount = _egApplyAilmentShockAmpOnMonster(target, amount);
    }
    if (typeof _egRollPlayerHitAilments === 'function') {
        _egRollPlayerHitAilments(target, amount, elements);
    }
    // Impale (heavy-weapon batch): any hit on an impaled enemy deals its
    // stored damage on top; a heavy melee hit can impale. Runs after the
    // ailment roll so the extra damage never feeds bleed/ignite sizing.
    if (typeof _egApplyImpaleToHit === 'function') {
        const impaleBefore = target.impale;
        amount = _egApplyImpaleToHit(target, amount, elements, opts);
        if (target.impale && target.impale !== impaleBefore) _egShowStatusLabel(target.id, t('eg_impaled'));
    }

    // Intimidate roll: after the hit's own damage so the hit that
    // intimidates does not benefit from the amp it just caused.
    if (_egRollIntimidate(target, opts)) _egShowStatusLabel(target.id, t('eg_intimidated'));

    _egApplyHitToMonster(target, amount);
    // Pass crit + elemental info so the number can pop with the right colour/size
    const isCrit = !!(opts && opts.isCrit);
    _egShowDamageNumber(target.id, amount, isCrit, elements);
    _egFlashDamageCard(target.id);
    _egSpawnHitBurst(target.id, elements, isCrit);

    // Gear: echo (rings) - chance for the hit to repeat as a delayed
    // second instance of echoDamagePct of its damage
    if (!(opts && opts.isEcho)) _egTryEchoHit(target.id, amount, elements, isCrit);

    // Check for boss phase transition before checking death
    if (target.isBoss) globalThis._egBossCheckPhase(target);

    if (target.currentHP <= 0) {
        // Charged overkill ricochet - always fires a smaller projectile
        // carrying the surplus damage to the next monster (chainable).
        const isChargedHit = !!(opts && opts.isCharged);
        if (isChargedHit) {
            _egTryChargedOverkillRicochet(target, amount, hpBefore, elements, opts);
        } else {
            // Gear: overkill - chance for excess damage to bleed into another monster
            _egTryOverkillSpread(target, amount, hpBefore, isCrit, elements);
        }
        _egKillMonster(target.id);
        return;
    }

    _egUpdateBars();
}

// Gear: overkill - on every killing blow with excess damage, transfers the
// surplus to a random other living monster. overkillPct increases the amount
// transferred; it is not a chance to transfer.
export function _egTryOverkillSpread(dyingTarget, appliedDamage, hpBefore, isCrit, elements) {
    const stats = _egComputePlayerStats();
    const overkillPct = Math.max(0, stats.overkillPct || 0);

    const overkill = (hpBefore != null)
        ? Math.round(appliedDamage - hpBefore)
        : Math.round(appliedDamage - dyingTarget.currentHP); // fallback: currentHP clamped at 0
    if (overkill <= 0) return;

    const others = globalThis._egMonsters.filter(m => m.id !== dyingTarget.id && m.currentHP > 0);
    if (!others.length) return;
    const victim = others[Math.floor(Math.random() * others.length)];
    const transferredDamage = Math.round(overkill * (1 + overkillPct / 100));
    _egDamageTargetById(victim.id, transferredDamage, elements, { isCrit: !!isCrit });
}

// Drag-paint charged overkill ricochet - when a charged projectile overkills
// its target, a smaller projectile flies from the dying monster to the next
// living monster dealing the exact overkill amount. Chains if that hit also
// overkills (always triggers, no gear check required).
export const EG_CHARGED_RICOCHET_SCALE = 0.62;

export const EG_CHARGED_RICOCHET_DURATION_MS = 350;

export function _egTryChargedOverkillRicochet(dyingTarget, appliedDamage, hpBefore, elements, opts) {
    const overkill = Math.round(appliedDamage - (hpBefore != null ? hpBefore : 0));
    if (overkill <= 0) return;

    const others = globalThis._egMonsters.filter(m => m.id !== dyingTarget.id && m.currentHP > 0);
    if (!others.length) return;
    const victim = others[Math.floor(Math.random() * others.length)];

    // Scale element share proportionally so resistances still apply correctly
    let ricochetElements = null;
    if (elements && appliedDamage > 0) {
        const factor = overkill / appliedDamage;
        ricochetElements = _egScaleElements(elements, factor);
        // If finalDamage had bonus, elements were for the pre-bonus damage;
        // factor above already approximates; true scaled share is fine for visuals/resist.
    }

    const sourceCard = document.getElementById(`eg-card-${dyingTarget.id}`);
    const targetCard = document.getElementById(`eg-card-${victim.id}`);
    if (sourceCard && targetCard) {
        const start = _egGetElementCentre(sourceCard);
        const end = _egGetElementCentre(targetCard);
        const projDef = _egGetProjectileDef();
        // Build a smaller visual copy of the class projectile
        const cssExtra = 'eg-proj-ricochet';
        _egFireProjectile(projDef, `${projDef.cssClass} ${cssExtra}`, start, end, EG_CHARGED_RICOCHET_DURATION_MS, 'linear', () => {
            const olabel = t('eg_overkill');
            _egShowStatusLabel(victim.id, olabel !== 'eg_overkill' ? olabel : 'Overkill!');
            _egDamageTargetById(victim.id, overkill, ricochetElements, { isCharged: true, isRicochet: true, isCrit: !!(opts && opts.isCrit) });
        }, null, EG_CHARGED_RICOCHET_SCALE);
    } else {
        // No visual path available - apply damage instantly so it is not lost
        _egDamageTargetById(victim.id, overkill, ricochetElements, { isCharged: true, isRicochet: true, isCrit: !!(opts && opts.isCrit) });
    }
}

// Delay before an echo's second instance lands.
export const EG_ECHO_DELAY_MS = 450;

// Gear: echo (ring suffix) - rolls against echoChancePct and schedules a
// delayed second hit worth echoDamagePct of the original applied damage.
// Echo instances are flagged so they cannot chain into further echoes.
export function _egTryEchoHit(targetId, appliedAmount, elements, isCrit) {
    const stats = _egComputePlayerStats();
    const chance = stats.echoChancePct || 0;
    const dmgPct = stats.echoDamagePct || 0;
    if (chance <= 0 || dmgPct <= 0) return;
    if (!appliedAmount || appliedAmount <= 0) return;
    if (Math.random() * 100 >= chance) return;

    setTimeout(() => {
        if (!_egIsActive()) return;
        const target = globalThis._egMonsters.find(m => m.id === targetId);
        if (!target) return;
        _egShowStatusLabel(targetId, t('eg_echo'));
        _egDamageTargetById(targetId, Math.max(1, Math.round(appliedAmount * dmgPct / 100)), elements, { isEcho: true, isCrit: !!isCrit });
    }, EG_ECHO_DELAY_MS);
}
