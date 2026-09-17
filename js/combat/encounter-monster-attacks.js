//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Monster attacks (Monster -> Player): attack resolution, projectile and
// melee animations, dodge/miss/block feedback, block-lockout overlay and
// the lose-control overlay.

import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { EG_MELEE_ANIM_DURATION_MS, EG_MONSTER_PROJ_DURATION_MS, EG_PLAYER_DAMAGE_NUMBER_DURATION_MS, EG_PLAYER_HIT_FLASH_MS } from './encounter-constants.js';
import { _egDamageTargetById, _egPlayerTakeDamage } from './encounter-damage.js';
import { _egFlashMonsterAttackCard } from './encounter-lifecycle.js';
import { _egApplyGroundedReduction } from './encounter-player-attacks.js';
import { _egEnsurePlayerStatusBar, _egGetPolymorphVictim, _egIsPolymorphActive, _egMaybePuzzleAttack } from './combat-ailments.js';
import { _egFireProjectile, _egGetElementCentre } from './combat-class-projectiles.js';
import { _egApplyMonsterHitMods, _egRollMonsterCritMult } from '../endgame/endgame-map-launch.js';
import { _egComputePlayerStats } from '../endgame/endgame-player-stats.js';
import { _egIsActive } from './combat-state.js';


// Resolves whether this attack should be melee or ranged.
// 'both' type randomly picks one each time the monster swings.
export function _egResolveAttackType(monster) {
    const type = monster.attackType || 'ranged';
    if (type === 'both') return Math.random() < 0.5 ? 'melee' : 'ranged';
    return type;
}

// Fires the monster's attack: flashes the card and dispatches the correct animation.
// Small chance the attack instead flies to the CENTRE OF THE GRID and inflicts
// a puzzle ailment based on the monster's element (see endgame-ailments.js).
export function _egFireMonsterAttack(monster) {
    _egFlashMonsterAttackCard(monster);
    if (typeof _egMaybePuzzleAttack === 'function' && _egMaybePuzzleAttack(monster)) return;
    // The Sprout: his charge-bar attack IS the set-piece - a thorned vine
    // tendril telegraphs across the screen through the player, then whips
    // (boss-sprout.js). No generic projectile/melee on top.
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_sprout')
        && typeof _egSproutVineLunge === 'function') {
        globalThis._egSproutVineLunge(monster);
        return;
    }
    // The Dancer: the mirror ball flashes, then unleashes 3 expanding
    // lightning rings - dodge the rings, dance the gaps (boss-dancer.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_dancer')
        && typeof _egDancerPirouette === 'function') {
        globalThis._egDancerPirouette(monster);
        return;
    }
    // The Gale: a wind lance lane telegraphs, then a compressed air bolt
    // blasts across it, flinging anyone hit (boss-gale.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_gale')
        && typeof _egGaleCycloneLance === 'function') {
        globalThis._egGaleCycloneLance(monster);
        return;
    }
    // The Gambler: a 6-chamber cylinder ticks down over the player, then
    // the hammer falls - 5/6 blank, 1/6 heavy shadow hit (boss-gambler.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_gambler')
        && typeof _egGamblerRoulette === 'function') {
        globalThis._egGamblerRoulette(monster);
        return;
    }
    // The Gourmet: the maw locks on, then inhales hard - fight the suction
    // or be swallowed for heavy damage (boss-gourmet.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_gourmet')
        && typeof _egGourmetDevour === 'function') {
        globalThis._egGourmetDevour(monster);
        return;
    }
    // The Lodestone: a chain line telegraphs from the stone, then reels
    // anyone caught into the clamp radius (boss-lodestone.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_lodestone')
        && typeof _egLodestoneLeash === 'function') {
        globalThis._egLodestoneLeash(monster);
        return;
    }
    // The Stack: gray garbage rows flood up from the bottom - stay high or
    // be flung off the rising edge (boss-stack.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_stack')
        && typeof _egStackGarbage === 'function') {
        globalThis._egStackGarbage(monster);
        return;
    }
    // The Tactician: the four board edges slam inward as castle walls -
    // get inside the shrinking ring before they meet (boss-tactician.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_tactician')
        && typeof _egTacticianCheckmate === 'function') {
        globalThis._egTacticianCheckmate(monster);
        return;
    }
    // The Bumper: a giant carnival bumper slams onto a telegraphed target
    // ring at the player, flinging anyone inside (boss-bumper.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_bumper')
        && typeof _egBumperSlam === 'function') {
        globalThis._egBumperSlam(monster);
        return;
    }
    // The Centipede: the whole colony stampedes across a telegraphed lane
    // through the player's row (boss-centipede.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_centipede')
        && typeof _egCentStampede === 'function') {
        globalThis._egCentStampede(monster);
        return;
    }
    // The Striker: a curved free kick - dotted arc telegraph, cone wall,
    // the ball bends around it onto the marked spot (boss-striker.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_striker')
        && typeof _egStrkFreeKick === 'function') {
        globalThis._egStrkFreeKick(monster);
        return;
    }
    // The Thwomp: a shadow marker stalks and locks, then the whole block
    // crashes down on the mark with a huge shockwave (boss-thwomp.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_thwomp')
        && typeof _egThwompGrandSlam === 'function') {
        globalThis._egThwompGrandSlam(monster);
        return;
    }
    // The Coil: a hood-shadow lane telegraphs, then the maw strikes across
    // it in one lightning lash (boss-coil.js).
    if (monster && monster.isBoss && typeof monster.id === 'string' && monster.id.startsWith('boss_coil')
        && typeof _egCoilCobraStrike === 'function') {
        globalThis._egCoilCobraStrike(monster);
        return;
    }
    const attackType = _egResolveAttackType(monster);
    if (attackType === 'melee') {
        _egAnimateMonsterMelee(monster);
    } else {
        _egAnimateMonsterProjectile(monster);
    }
}


export function _egApplyPlayerMissFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    label.textContent = t('eg_miss');
    hud.appendChild(label);
    setTimeout(() => label.remove(), EG_PLAYER_DAMAGE_NUMBER_DURATION_MS);
}

// Floating "Blocked!" label on the player HUD after a successful block.
export function _egApplyPlayerBlockFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    label.textContent = t('eg_blocked');
    hud.appendChild(label);
    setTimeout(() => label.remove(), EG_PLAYER_DAMAGE_NUMBER_DURATION_MS);
}

// Floating "recovering" label for block-recovery feedback (retained for
// external callers - attacks no longer fizzle while recovering).
export function _egApplyPlayerBlockLockoutFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    label.textContent = t('eg_block_lockout');
    hud.appendChild(label);
    setTimeout(() => label.remove(), EG_PLAYER_DAMAGE_NUMBER_DURATION_MS);
}

// ── Lose-control overlay (WoW "lose of control" style) ──────────────────
// Status chip with live countdown shown while the player cannot block
// again because of a recent block. Purely visual: pointer-events none.

// Interval handle driving the countdown text update.
export let _egBlockLockoutOverlayTimer = null;

// Shows (or refreshs) the lockout chip in the player status bar for `durationMs`.
export function _egShowBlockLockoutOverlay(durationMs) {
    const bar = (typeof _egEnsurePlayerStatusBar === 'function')
        ? _egEnsurePlayerStatusBar()
        : document.body;

    let chip = document.getElementById('eg-block-lockout-overlay');
    if (!chip) {
        chip = document.createElement('div');
        chip.id = 'eg-block-lockout-overlay';
        chip.className = 'eg-status-chip eg-status-chip-lockout';
        chip.innerHTML = `
            <div class="eg-lockout-icon">🛡️</div>
            <div class="eg-lockout-countdown" id="eg-lockout-countdown">0.0</div>
            <div class="eg-lockout-label">${t('eg_block_lockout')}</div>`;
        bar.appendChild(chip);
    }

    const countdownEl = document.getElementById('eg-lockout-countdown');
    if (countdownEl) countdownEl.textContent = (durationMs / 1000).toFixed(1);

    // Restart the update loop so an overlapping block extends cleanly.
    if (_egBlockLockoutOverlayTimer) clearInterval(_egBlockLockoutOverlayTimer);
    _egBlockLockoutOverlayTimer = setInterval(() => {
        const remaining = globalThis._egPlayerBlockLockoutUntil - Date.now();
        if (remaining <= 0 || !_egIsActive()) {
            _egHideBlockLockoutOverlay();
            return;
        }
        const el = document.getElementById('eg-lockout-countdown');
        if (el) el.textContent = (remaining / 1000).toFixed(1);
    }, 100);
}

// Removes the lockout chip and stops its countdown loop.
export function _egHideBlockLockoutOverlay() {
    if (_egBlockLockoutOverlayTimer) {
        clearInterval(_egBlockLockoutOverlayTimer);
        _egBlockLockoutOverlayTimer = null;
    }
    const chip = document.getElementById('eg-block-lockout-overlay');
    if (chip) chip.remove();
}

// Applies hit feedback to the player HUD: floating damage number + squish + red glow.
export function _egApplyPlayerHitFeedback(damageValue, isCrit, element) {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;

    // Floating damage label - crits & elemental hits get extra pop
    const dmgLabel = document.createElement('div');
    let cls = 'eg-player-damage';
    if (isCrit) cls += ' eg-dmg-crit';
    if (element) {
        const map = { fire: 'eg-dmg-fire', cold: 'eg-dmg-cold', lightning: 'eg-dmg-lightning', shadow: 'eg-dmg-shadow' };
        if (map[element]) cls += ' ' + map[element];
    }
    dmgLabel.className = cls;
    dmgLabel.textContent = `-${damageValue}`;
    // slight random horizontal jitter so stacked hits don't perfectly overlap
    dmgLabel.style.marginLeft = `${(Math.random() * 18 - 9).toFixed(1)}px`;
    hud.appendChild(dmgLabel);
    setTimeout(() => dmgLabel.remove(), EG_PLAYER_DAMAGE_NUMBER_DURATION_MS);

    // Squish + red-glow flash - crits shake harder
    if (isCrit) {
        hud.style.transform = 'scale(0.92)';
        hud.style.boxShadow = 'inset 0 0 22px rgba(255,40,40,0.95), 0 0 22px rgba(255,0,0,0.95)';
        if (hud.animate) {
            hud.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-6px)' },
                { transform: 'translateX(6px)' },
                { transform: 'translateX(-4px)' },
                { transform: 'translateX(0)' }
            ], { duration: 180, easing: 'ease-out' });
        }
    } else {
        hud.style.transform = 'scale(0.95)';
        hud.style.boxShadow = 'inset 0 0 15px rgba(255,0,0,0.8), 0 0 15px rgba(255,0,0,0.8)';
    }
    setTimeout(() => { hud.style.transform = ''; hud.style.boxShadow = ''; }, isCrit ? 220 : EG_PLAYER_HIT_FLASH_MS);

    Audio_Manager.playSFX('player_damage_taken');
}

// Launches a projectile from the monster's card to the player HUD.
// Damage and feedback are applied when the projectile arrives.
// While the player is POLYMORPHED, the projectile is confused and flies at
// another monster instead (friendly fire). With no other monster alive the
// attack lands on the player as usual.
export function _egAnimateMonsterProjectile(monster) {
    const sourceCard = document.getElementById(`eg-card-${monster.id}`);
    const targetHud = document.getElementById('player-avatar-wrapper');
    if (!sourceCard || !targetHud) return;

    // Polymorph: redirect at another monster
    let polymorphVictim = null;
    if (typeof _egIsPolymorphActive === 'function' && _egIsPolymorphActive()
        && typeof _egGetPolymorphVictim === 'function') {
        polymorphVictim = _egGetPolymorphVictim(monster.id);
    }

    const start = _egGetElementCentre(sourceCard);
    const end = polymorphVictim
        ? _egGetElementCentre(document.getElementById(`eg-card-${polymorphVictim.id}`) || targetHud)
        : _egGetElementCentre(targetHud);

    _egFireProjectile(monster.emoji, 'eg-proj-monster', start, end, EG_MONSTER_PROJ_DURATION_MS, 'ease-in', () => {
        if (polymorphVictim) {
            // Confused attack hits the other monster - no player mitigation
            globalThis.showToast(`🌀 ${monster.name || 'The monster'} hit ${polymorphVictim.name} instead!`);
            _egDamageTargetById(polymorphVictim.id, monster.damageValue);
            return;
        }
        // Gear: preemptive_dodge - auto-dodge each monster's opening attack
        if (_egRollPreemptiveDodge(monster)) return;
        // Map mod: monsters may deal double damage (crit)
        const monsterCritMult = (typeof _egRollMonsterCritMult === 'function' ? _egRollMonsterCritMult(monster) : 1);
        const isMonsterCrit = monsterCritMult > 1;
        const critDmg = monster.damageValue * monsterCritMult;
        const dealt = _egPlayerTakeDamage(critDmg, false, monster.element, monster.level, { attacker: monster, isProjectile: true });
        if (dealt > 0) {
            _egApplyPlayerHitFeedback(dealt, isMonsterCrit, monster.element);
            if (typeof _egApplyMonsterHitMods === 'function') _egApplyMonsterHitMods(monster);
        }
    });
}

// Triggers damage and hit feedback at the melee impact moment.
// Only fires if the encounter is still active and the monster is still alive.
// While POLYMORPHED the confused swing lands on another monster instead.
export function _egApplyMeleeImpact(monster) {
    if (!_egIsActive() || !globalThis._egMonsters.some(m => m.id === monster.id)) return;

    if (typeof _egIsPolymorphActive === 'function' && _egIsPolymorphActive()
        && typeof _egGetPolymorphVictim === 'function') {
        const victim = _egGetPolymorphVictim(monster.id);
        if (victim) {
            globalThis.showToast(`🌀 ${monster.name || 'The monster'} struck ${victim.name} instead!`);
            _egDamageTargetById(victim.id, monster.damageValue);
            return;
        }
    }

    // Gear: preemptive_dodge - auto-dodge each monster's opening attack
    if (_egRollPreemptiveDodge(monster)) return;

    // Gear: grounded - chance to brace against the charge and reduce its damage
    let chargeDamage = _egApplyGroundedReduction(monster.damageValue);

    // Map mod: monsters may deal double damage (crit)
    const meleeCritMult = (typeof _egRollMonsterCritMult === 'function' ? _egRollMonsterCritMult(monster) : 1);
    const isMeleeCrit = meleeCritMult > 1;
    chargeDamage *= meleeCritMult;

    const dealt = _egPlayerTakeDamage(chargeDamage, false, monster.element, monster.level, { attacker: monster, isProjectile: false });
    if (dealt > 0) {
        _egApplyPlayerHitFeedback(dealt, isMeleeCrit, monster.element);
        if (typeof _egApplyMonsterHitMods === 'function') _egApplyMonsterHitMods(monster);
    }
}

// Gear: preemptive_dodge (boots suffix) - the first attack each monster
// directs at the player this encounter has a chance to be automatically
// dodged. Resets per-monster, not per-map.
export function _egRollPreemptiveDodge(monster) {
    if (!monster) return false;
    const isFirstAttack = !monster.hasStruckPlayer;
    monster.hasStruckPlayer = true;
    if (!isFirstAttack) return false;

    const stats = _egComputePlayerStats();
    const pct = stats.preemptiveDodgePct || 0;
    if (pct <= 0 || Math.random() * 100 >= pct) return false;

    globalThis.showToast(t('eg_dodged'));
    _egApplyPlayerMissFeedback();
    return true;
}

// Physically lunges the monster card toward the player HUD and snaps back.
// Damage triggers at the animation midpoint (impact apex).
// While POLYMORPHED the lunge visually chases the confused-attack victim.
export function _egAnimateMonsterMelee(monster) {
    const sourceCard = document.getElementById(`eg-card-${monster.id}`);
    const targetHud = document.getElementById('player-avatar-wrapper');
    if (!sourceCard || !targetHud) return;

    // Polymorph: lunge toward the victim monster instead of the player
    let polymorphVictim = null;
    if (typeof _egIsPolymorphActive === 'function' && _egIsPolymorphActive()
        && typeof _egGetPolymorphVictim === 'function') {
        polymorphVictim = _egGetPolymorphVictim(monster.id);
    }
    const meleeTargetEl = polymorphVictim
        ? (document.getElementById(`eg-card-${polymorphVictim.id}`) || targetHud)
        : targetHud;

    const start = _egGetElementCentre(sourceCard);
    const end = _egGetElementCentre(meleeTargetEl);
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Ensure the lunging card renders on top of everything else during flight
    sourceCard.style.zIndex = '999';

    const anim = sourceCard.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(1.15)` }, // apex/impact
        { transform: 'translate(0px, 0px) scale(1)' }
    ], { duration: EG_MELEE_ANIM_DURATION_MS, easing: 'ease-in-out' });

    anim.onfinish = () => { sourceCard.style.zIndex = ''; };

    // Damage fires at the animation midpoint so it matches the visual impact
    setTimeout(() => _egApplyMeleeImpact(monster), EG_MELEE_ANIM_DURATION_MS / 2);
}
