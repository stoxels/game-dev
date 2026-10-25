//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Monster attacks (Monster -> Player): attack resolution, projectile and
// melee animations, polymorph routing, dodge and grounded mitigation. Player-facing
// feedback and block-lockout presentation live in encounter-monster-attack-feedback.js.

import { Audio_Manager } from '../audio/audio.js';
import { MELEE_ANIM_DURATION_MS, MONSTER_PROJ_DURATION_MS } from './encounter-constants.js';
import { _playerTakeDamage } from './encounter-damage.js';
import { _damageTargetById } from './encounter-monster-damage.js';
import { _applyGroundedReduction } from './encounter-player-mitigation.js';
import { _applyPlayerHitFeedback, _applyPlayerMissFeedback } from './encounter-monster-attack-feedback.js';
import { _getPolymorphVictim, _isPolymorphActive } from './combat-ailments-core.js';
import { _maybePuzzleAttack } from './combat-ailments-puzzle.js';
import { _fireProjectile, _getElementCentre } from './combat-class-projectiles.js';
import { _egApplyMonsterHitMods, _egRollMonsterCritMult } from '../endgame/endgame-map-launch.js';
import { _computePlayerStats } from './combat-player-stats.js';
import { _isActive } from './combat-state.js';
import { _maybeCastMonsterSpell } from './monster-spells.js';

// Flashes the monster's card to signal it is attacking.
export function _flashMonsterAttackCard(monster) {
    const card = document.getElementById(`sx-card-${monster.id}`);
    Audio_Manager.playSFX('monster_charge_windup');
    if (!card) return;
    card.classList.remove('sx-flash-attack');
    void card.offsetWidth; // force reflow so the CSS animation restarts
    card.classList.add('sx-flash-attack');
}

// Resolves whether this attack should be melee or ranged.
// 'both' type randomly picks one each time the monster swings.
export function _resolveAttackType(monster) {
    const type = monster.attackType || 'ranged';
    if (type === 'both') return Math.random() < 0.5 ? 'melee' : 'ranged';
    return type;
}

// Fires the monster's attack: flashes the card and dispatches the correct animation.
// Small chance the attack instead flies to the CENTRE OF THE GRID and inflicts
// a puzzle ailment based on the monster's element (see endgame-ailments.js).
export function _fireMonsterAttack(monster) {
    // World 1's convergence trial: The Null has no regular attack. He only
    // shoots the player when a Prior Bomb detonates undefused (see
    // _priorBombExplode in bosses/shared-boss-abilities.js).
    if (_isNullWorld1Trial(monster)) return;
    _flashMonsterAttackCard(monster);
    if (typeof _maybePuzzleAttack === 'function' && _maybePuzzleAttack(monster)) return;
    // The Sprout: his charge-bar attack IS the set-piece - a thorned vine
    // tendril telegraphs across the screen through the player, then whips
    // (boss-sprout.js). No generic projectile/melee on top.
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_sprout')
        && typeof _sproutVineLunge === 'function') {
        globalThis._sproutVineLunge(monster);
        return;
    }
    // The Dancer: the mirror ball flashes, then unleashes 3 expanding
    // lightning rings - dodge the rings, dance the gaps (boss-dancer.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_dancer')
        && typeof _dancerPirouette === 'function') {
        globalThis._dancerPirouette(monster);
        return;
    }
    // The Creeper: the attack bar sends its mother leaping onto your spot -
    // marked circle, landing, hiss, then boom (boss-creeper.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_creeper')
        && typeof _crpPounce === 'function') {
        globalThis._crpPounce(monster);
        return;
    }
    // The Gale: a wind lance lane telegraphs, then a compressed air bolt
    // blasts across it, flinging anyone hit (boss-gale.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_gale')
        && typeof _galeCycloneLance === 'function') {
        globalThis._galeCycloneLance(monster);
        return;
    }
    // The Gambler: a 6-chamber cylinder ticks down over the player, then
    // the hammer falls - 5/6 blank, 1/6 heavy shadow hit (boss-gambler.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_gambler')
        && typeof _gamblerRoulette === 'function') {
        globalThis._gamblerRoulette(monster);
        return;
    }
    // The Gourmet: the maw locks on, then inhales hard - fight the suction
    // or be swallowed for heavy damage (boss-gourmet.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_gourmet')
        && typeof _gourmetDevour === 'function') {
        globalThis._gourmetDevour(monster);
        return;
    }
    // The Lodestone: a chain line telegraphs from the stone, then reels
    // anyone caught into the clamp radius (boss-lodestone.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_lodestone')
        && typeof _lodestoneLeash === 'function') {
        globalThis._lodestoneLeash(monster);
        return;
    }
    // The Stack: gray garbage rows flood up from the bottom - stay high or
    // be flung off the rising edge (boss-stack.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_stack')
        && typeof _stackGarbage === 'function') {
        globalThis._stackGarbage(monster);
        return;
    }
    // The Tactician: the four board edges slam inward as castle walls -
    // get inside the shrinking ring before they meet (boss-tactician.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_tactician')
        && typeof _tacticianCheckmate === 'function') {
        globalThis._tacticianCheckmate(monster);
        return;
    }
    // The Bumper: a giant carnival bumper slams onto a telegraphed target
    // ring at the player, flinging anyone inside (boss-bumper.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_bumper')
        && typeof _bumperSlam === 'function') {
        globalThis._bumperSlam(monster);
        return;
    }
    // The Centipede: the whole colony stampedes across a telegraphed lane
    // through the player's row (boss-centipede.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_centipede')
        && typeof _centStampede === 'function') {
        globalThis._centStampede(monster);
        return;
    }
    // The Striker: a curved free kick - dotted arc telegraph, cone wall,
    // the ball bends around it onto the marked spot (boss-striker.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_striker')
        && typeof _strkFreeKick === 'function') {
        globalThis._strkFreeKick(monster);
        return;
    }
    // The Thwomp: a shadow marker stalks and locks, then the whole block
    // crashes down on the mark with a huge shockwave (boss-thwomp.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_thwomp')
        && typeof _thwompGrandSlam === 'function') {
        globalThis._thwompGrandSlam(monster);
        return;
    }
    // The Coil: a hood-shadow lane telegraphs, then the maw strikes across
    // it in one lightning lash (boss-coil.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_coil')
        && typeof _coilCobraStrike === 'function') {
        globalThis._coilCobraStrike(monster);
        return;
    }
    // Regular monsters may cast an elemental / support spell instead of the
    // plain melee or projectile swing (monster-spells.js; bosses excluded).
    if (_maybeCastMonsterSpell(monster)) return;
    const attackType = _resolveAttackType(monster);
    if (attackType === 'melee') {
        _animateMonsterMelee(monster);
    } else {
        _animateMonsterProjectile(monster);
    }
}

// True for The Null inside the world 1 convergence trial (endgame maps keep
// his normal attacks).
function _isNullWorld1Trial(monster) {
    if (!monster || !monster.isBoss || typeof monster.id !== 'string' || !monster.id.startsWith('boss_null')) return false;
    const tr = typeof globalThis._isConvergenceTrialRun === 'function' ? globalThis._isConvergenceTrialRun() : null;
    return !!(tr && tr.wi === 0);
}

// Launches a projectile from the monster's card to the player HUD.
// Damage and feedback are applied when the projectile arrives.
// `dmgMult` scales this one shot (the Null's undefused-bomb strike).
// While the player is POLYMORPHED, the projectile is confused and flies at
// another monster instead (friendly fire). With no other monster alive the
// attack lands on the player as usual.
export function _animateMonsterProjectile(monster, dmgMult = 1) {
    const sourceCard = document.getElementById(`sx-card-${monster.id}`);
    const targetHud = document.getElementById('player-avatar-wrapper');
    if (!sourceCard || !targetHud) return;

    // Polymorph: redirect at another monster
    let polymorphVictim = null;
    if (typeof _isPolymorphActive === 'function' && _isPolymorphActive()
        && typeof _getPolymorphVictim === 'function') {
        polymorphVictim = _getPolymorphVictim(monster.id);
    }

    const start = _getElementCentre(sourceCard);
    const end = polymorphVictim
        ? _getElementCentre(document.getElementById(`sx-card-${polymorphVictim.id}`) || targetHud)
        : _getElementCentre(targetHud);

    Audio_Manager.playSFX('monster_projectile_launch');
    _fireProjectile(monster.emoji, 'sx-proj-monster', start, end, MONSTER_PROJ_DURATION_MS, 'ease-in', () => {
        Audio_Manager.playSFX('monster_projectile_hit');
        if (polymorphVictim) {
            // Confused attack hits the other monster - no player mitigation
            globalThis.showCombatToast(`🌀 ${monster.name || 'The monster'} hit ${polymorphVictim.name} instead!`);
            _damageTargetById(polymorphVictim.id, monster.damageValue);
            return;
        }
        // Gear: preemptive_dodge - auto-dodge each monster's opening attack
        if (_rollPreemptiveDodge(monster)) return;
        // Map mod: monsters may deal double damage (crit)
        const monsterCritMult = (typeof _egRollMonsterCritMult === 'function' ? _egRollMonsterCritMult(monster) : 1);
        const isMonsterCrit = monsterCritMult > 1;
        const critDmg = monster.damageValue * monsterCritMult * dmgMult;
        const dealt = _playerTakeDamage(critDmg, false, monster.element, monster.level, { attacker: monster, isProjectile: true });
        if (dealt > 0) {
            _applyPlayerHitFeedback(dealt, isMonsterCrit, monster.element);
            if (typeof _egApplyMonsterHitMods === 'function') _egApplyMonsterHitMods(monster);
        }
    });
}

// Triggers damage and hit feedback at the melee impact moment.
// Only fires if the encounter is still active and the monster is still alive.
// While POLYMORPHED the confused swing lands on another monster instead.
export function _applyMeleeImpact(monster) {
    if (!_isActive() || !globalThis._monsters.some(m => m.id === monster.id)) return;

    if (typeof _isPolymorphActive === 'function' && _isPolymorphActive()
        && typeof _getPolymorphVictim === 'function') {
        const victim = _getPolymorphVictim(monster.id);
        if (victim) {
            globalThis.showCombatToast(`🌀 ${monster.name || 'The monster'} struck ${victim.name} instead!`);
            _damageTargetById(victim.id, monster.damageValue);
            return;
        }
    }

    // Gear: preemptive_dodge - auto-dodge each monster's opening attack
    if (_rollPreemptiveDodge(monster)) return;

    // Gear: grounded - chance to brace against the charge and reduce its damage
    let chargeDamage = _applyGroundedReduction(monster.damageValue);

    // Map mod: monsters may deal double damage (crit)
    const meleeCritMult = (typeof _egRollMonsterCritMult === 'function' ? _egRollMonsterCritMult(monster) : 1);
    const isMeleeCrit = meleeCritMult > 1;
    chargeDamage *= meleeCritMult;

    const dealt = _playerTakeDamage(chargeDamage, false, monster.element, monster.level, { attacker: monster, isProjectile: false });
    if (dealt > 0) {
        _applyPlayerHitFeedback(dealt, isMeleeCrit, monster.element);
        if (typeof _egApplyMonsterHitMods === 'function') _egApplyMonsterHitMods(monster);
    }
}

// Gear: preemptive_dodge (boots suffix) - the first attack each monster
// directs at the player this encounter has a chance to be automatically
// dodged. Resets per-monster, not per-map.
export function _rollPreemptiveDodge(monster) {
    if (!monster) return false;
    const isFirstAttack = !monster.hasStruckPlayer;
    monster.hasStruckPlayer = true;
    if (!isFirstAttack) return false;

    const stats = _computePlayerStats();
    const pct = stats.preemptiveDodgePct || 0;
    if (pct <= 0 || Math.random() * 100 >= pct) return false;

    _applyPlayerMissFeedback();
    return true;
}

// Physically lunges the monster card toward the player HUD and snaps back.
// Damage triggers at the animation midpoint (impact apex).
// While POLYMORPHED the lunge visually chases the confused-attack victim.
export function _animateMonsterMelee(monster) {
    const sourceCard = document.getElementById(`sx-card-${monster.id}`);
    const targetHud = document.getElementById('player-avatar-wrapper');
    if (!sourceCard || !targetHud) return;

    // Polymorph: lunge toward the victim monster instead of the player
    let polymorphVictim = null;
    if (typeof _isPolymorphActive === 'function' && _isPolymorphActive()
        && typeof _getPolymorphVictim === 'function') {
        polymorphVictim = _getPolymorphVictim(monster.id);
    }
    const meleeTargetEl = polymorphVictim
        ? (document.getElementById(`sx-card-${polymorphVictim.id}`) || targetHud)
        : targetHud;

    const start = _getElementCentre(sourceCard);
    const end = _getElementCentre(meleeTargetEl);
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    Audio_Manager.playSFX('monster_melee_lunge');
    // Ensure the lunging card renders on top of everything else during flight
    sourceCard.style.zIndex = '999';

    const anim = sourceCard.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(1.15)` }, // apex/impact
        { transform: 'translate(0px, 0px) scale(1)' }
    ], { duration: MELEE_ANIM_DURATION_MS, easing: 'ease-in-out' });

    // Flag the lunge so player projectiles aim at the card's resting spot
    // (see _getElementRestCentre) instead of its fast mid-dash position.
    sourceCard.dataset.egLunging = '1';
    anim.onfinish = () => {
        sourceCard.style.zIndex = '';
        delete sourceCard.dataset.egLunging;
    };
    anim.oncancel = anim.onfinish;

    // Damage fires at the animation midpoint so it matches the visual impact
    setTimeout(() => _applyMeleeImpact(monster), MELEE_ANIM_DURATION_MS / 2);
}
