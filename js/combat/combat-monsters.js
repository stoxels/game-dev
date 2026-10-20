import { MONSTER_DEFS } from './combat-monsters-data.js';
import { GAME_ART } from './combat-art.js';
import { CAMPAIGN_MONSTER_CONFIG, _earlyEaseBlend } from './encounter-campaign-spawns.js';
import { _egApplyMapModsToMonster } from '../endgame/endgame-map-launch.js';
import { _isCampaignRun } from './combat-state.js';
import { cur } from '../state.js';

//------------------------------------------------------------------------
//-------------------CONSTANTS & DATA DEFINITIONS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Monster level scaling 
// Applied per level above 1. 
const LEVEL_HP_SCALE = 0.28; // +28% HP per level above 1 - tuned for T1-easy / T16-spongy curve (see _getTierBalance)
const LEVEL_DAMAGE_SCALE = 0.26; // +26% damage per level above 1 - raised from 0.12 so high tiers stay threatening even with on-level gear; T1 eased via tier balance

// Hard cap on how many monsters (including bosses) can be alive simultaneously.
// New spawns are silently dropped until a slot opens.
export const MAX_CONCURRENT_MONSTERS = 6;

// Tier-aware balance curve: T1 is easy (no gear), mid tiers ramp to normal,
// high tiers become explicitly dangerous/spongy when undergeared.
// Returns { hp, dmg, charge } multipliers for the given monster level.
// Smooth lerp so tier transitions feel continuous, not stepped.
// Anchors tuned so adequate gear (ilvl≈mlvl) feels: T1 easy (TTD~140s, TTK~6),
// T4 forgiving, T7-8 normal (TTD~60s, TTK~4), T13 challenging, T16 hard but doable (~40s).
// Lacking gear (-12 ilvl, -5 lvl) then feels 2-3x harder and 1.8-2x spongy.
function _getTierBalance(lvl) {
    const l = Math.max(1, Number(lvl) || 1);
    // dmg: peaks at mid (T7-8) then plateaus so T16 adequate stays ~40s not 28s
    const dmgAnchors = [[1,0.62],[3,0.70],[14,0.95],[30,1.30],[36,1.35],[50,1.30],[64,1.20],[78,1.22],[90,1.18]];
    const hpAnchors  = [[1,0.60],[3,0.73],[14,0.91],[30,0.98],[36,1.03],[50,1.08],[64,1.17],[78,1.17],[90,1.16]];
    const chargeAnchors = [[1,1.18],[14,1.10],[30,1.00],[50,0.92],[71,0.88],[90,0.85]];
    function lerp(anchors, x) {
        if (x <= anchors[0][0]) return anchors[0][1];
        if (x >= anchors[anchors.length-1][0]) return anchors[anchors.length-1][1];
        for (let i=0;i<anchors.length-1;i++) {
            const [x0,y0]=anchors[i], [x1,y1]=anchors[i+1];
            if (x>=x0 && x<=x1) {
                const t=(x-x0)/(x1-x0);
                return y0 + (y1-y0)*t;
            }
        }
        return anchors[anchors.length-1][1];
    }
    // High-level HP explosion (balance pass): gear and spells now reach 10-60k per main
    // action at L90, so trash climbs geometrically from T1 (L68, unchanged) to about
    // 12x at T16 (L90): median trash ~2.8k -> ~34k. Bosses have their own curve.
    const lateT = Math.max(0, Math.min(1, (l - 68) / 22));
    return {
        hp: lerp(hpAnchors, l) * Math.pow(12, lateT),
        dmg: lerp(dmgAnchors, l),
        charge: lerp(chargeAnchors, l)
    };
}



//------------------------------------------------------------------------
//-------------------MONSTER FACTORY--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// SUSPECTED DEAD: retained legacy roam-speed data; no current caller.
// Lore-accurate roam speeds (px/s) for the perimeter patrol in
// endgame-monster-roam.js. Small vermin scurry, medium beasts lope, heavy
// brutes lumber. Bosses never roam (they hold their ground as set-pieces).
const MONSTER_ROAM_SPEEDS = {
    // Scurrers - tiny, fast vermin
    rat: 90, bat: 88, bee: 92, mosquito: 95, ant: 85, moth: 86,
    spider: 82, ladybug: 75, frog: 78, beetle: 62, owl: 70,
    // Lopers - medium beasts / floaters
    slime: 50, ghost: 58, crab: 48, snake: 60, skull: 55,
    scorpion: 52, eye: 45, crystal: 40, gorilla: 50, lion: 65,
    tiger: 68, werewolf: 68, vampire: 60, ufo: 55, genie: 50,
    alien: 45, cyclone: 60, unicorn: 62, dragon: 45, demon: 42,
    crocodile: 38, wizard: 35, pumpkin: 32,
    // Lumberers - heavy brutes / siege bodies
    golem: 26, golem_iron: 22, ogre: 28, troll: 30, rhino: 30,
    bison: 28, zombie: 32, oni: 30, skull_lord: 38, starspawn: 40,
    moon: 22, meteor: 24, brain: 18, volcano: 16
};

// SUSPECTED DEAD: retained legacy roam-speed helper; no current caller.
// Returns the lore-accurate roam speed (px/s) for a monster, with ±12%
// per-spawn jitter so packs of the same species don't march in lockstep.
// Unknown ids fall back to a bulk heuristic: tankier (high baseHP) = slower.
function _roamSpeedFor(monster) {
    const base = monster && (monster.baseId || monster.id);
    // Direct lookup on the full base id (e.g. 'golem_iron', 'rat').
    let speed = (typeof base === 'string' && MONSTER_ROAM_SPEEDS[base]) || null;
    if (speed == null) {
        const hp = (monster && monster.maxHP) || 60;
        speed = Math.max(18, Math.min(90, 70 - hp * 0.22));
    }
    return speed * (0.88 + Math.random() * 0.24);
}

// Returns the scaled stats for a monster at the given level.
// Accepts either a string id (looks up MONSTER_DEFS) or a def object directly.
// hpMult: optional multiplier for boss max HP only (e.g., 500k HP test mode);
// damage is left at its normal scaled value.
// Campaign trials (convergence / ascension) run on the atlas HP curve, which
// assumes projectile-sized hits. A character whose real power is a charged
// melee strike or a spell cast then deletes every monster in one or two
// hits. The trial HP is therefore floored on the player's best action - the
// larger of an average projectile hit and 60% of a charged melee strike /
// spell cast (same share the gauntlet uses) - times a small hit count that
// grows with monster level. Only ever raises HP; never touches bosses.
const TRIAL_POWER_HIT_SHARE = 0.6;
const TRIAL_HITS_BASE = 4;
const TRIAL_HITS_PER_LEVEL = 0.08;

function _trialPowerHit() {
    let best = 5;
    try {
        let sum = 0;
        const n = 4;
        for (let i = 0; i < n; i++) sum += Number(globalThis._calcPlayerDamage()) || 0;
        best = Math.max(best, sum / n);
    } catch (e) { /* sample failed */ }
    try {
        const st = globalThis._computePlayerStats() || {};
        const mid = (a, b) => ((Number(a) || 0) + (Number(b) || 0)) / 2;
        const melee = (mid(st.meleePhysMin, st.meleePhysMax)
            + mid(st.meleeFireMin, st.meleeFireMax) + mid(st.meleeColdMin, st.meleeColdMax)
            + mid(st.meleeLightningMin, st.meleeLightningMax) + mid(st.meleeShadowMin, st.meleeShadowMax))
            * (1 + (Number(st.meleePhysIncPct) || 0) / 100);
        const spell = ((Number(st.spellDamageFlat) || 0) + 22 * (function(){const lv=Number(typeof globalThis._getPlayerLevel==='function'?globalThis._getPlayerLevel():0)||1;return lv<=50?1:Math.pow(75,Math.min(1,(lv-50)/40));})()) * (1 + (Number(st.spellDamageIncPct) || 0) / 100);
        best = Math.max(best, melee * TRIAL_POWER_HIT_SHARE, spell * TRIAL_POWER_HIT_SHARE);
    } catch (e) { /* stats optional */ }
    return best;
}

export function _buildMonster(defOrId, level = 1, hpMult = 1) {
    const def = (typeof defOrId === 'string') ? MONSTER_DEFS[defOrId] : defOrId;

    // FIX: If it's not a standard monster, check if it's a boss and route to the boss factory
    if (!def && typeof defOrId === 'string' && typeof BOSS_DEFS !== 'undefined' && globalThis.BOSS_DEFS[defOrId]) {
        const boss = globalThis._buildBoss(defOrId, level, hpMult);
        if (boss) boss.isBoss = true;
        return boss;
    }

    if (!def) { console.warn('Unknown monster id:', defOrId); return null; }

    const lvl = Math.max(1, level);

    // Campaign monsters use the campaign's own budget instead of the
    // atlas tier curve: their HP is set from the current level's damage
    // economy (cur.campaignMonsterHp, see _prepareCampaignEncounter) and
    // their damage is a flat, threatening value (cur.campaignMonsterDamage),
    // tuned so a starter-geared player must respect the pack but can still
    // clear it before the puzzle auto-completes and their drops are lost.
    const isCampaign = (typeof _isCampaignRun === 'function') && _isCampaignRun();

    let maxHP, damage, scaledCharge;
    if (isCampaign) {
        const hpTarget = (cur && cur.campaignMonsterHp > 0) ? cur.campaignMonsterHp : def.baseHP;
        const dmgTarget = (cur && cur.campaignMonsterDamage > 0) ? cur.campaignMonsterDamage : 6;
        // ±15% spread so a pack doesn't feel flat; never below a few hits.
        maxHP = Math.max(10, Math.round(hpTarget * (0.85 + Math.random() * 0.30) * hpMult));
        damage = Math.max(1, Math.round(dmgTarget * (0.85 + Math.random() * 0.30)));
        const chargeMult = (typeof CAMPAIGN_MONSTER_CONFIG !== 'undefined' && CAMPAIGN_MONSTER_CONFIG.chargeMult)
            ? CAMPAIGN_MONSTER_CONFIG.chargeMult : 1.15;
        // Early-game ease: the first monster levels wind up a little slower.
        let easeCharge = 1;
        try {
            if (CAMPAIGN_MONSTER_CONFIG.earlyChargeSlow > 1) {
                easeCharge = 1 + (CAMPAIGN_MONSTER_CONFIG.earlyChargeSlow - 1) * _earlyEaseBlend(lvl);
            }
        } catch (e) { easeCharge = 1; }
        scaledCharge = Math.max(4, def.chargeMax * chargeMult * easeCharge);
    } else {
        // Tier-aware balance: T1 is forgiving (no gear yet), difficulty ramps
        // smoothly so adequate gear feels normal, lacking feels spongy/dangerous,
        // outgearing feels easy. Multipliers are smooth, not stepped, to avoid
        // abrupt walls between tiers.
        const tierBalance = _getTierBalance(lvl);
        const hpScale = (1 + LEVEL_HP_SCALE * (lvl - 1)) * tierBalance.hp;
        const dmgScale = (1 + LEVEL_DAMAGE_SCALE * (lvl - 1)) * tierBalance.dmg;

        maxHP = Math.round(def.baseHP * hpScale);
        damage = Math.round(def.baseDamage * dmgScale);
        if (cur && cur.campaignTrial) {
            const hits = TRIAL_HITS_BASE + TRIAL_HITS_PER_LEVEL * lvl;
            maxHP = Math.max(maxHP, Math.round(_trialPowerHit() * hits * hpMult));
        }

        // Charge bar scales down with level so high-level monsters attack faster.
        // ~62% faster at L90 (0.38x), ~28% faster at L41 (0.72x), clamped to 2.2s minimum.
        // Tier balance also makes T1 slower (+18%) and T14+ faster (-7%). Together this
        // prevents absorption from fully outregenerating 200 dmg hits at L41.
        const levelChargeMult = Math.max(0.35, 1 - 0.007 * (lvl - 1)) * tierBalance.charge;
        scaledCharge = Math.max(2.2, def.chargeMax * levelChargeMult);
    }

    const monster = {
        id: `${def.id}_${++globalThis._monsterSpawnCounter}`,
        baseId: def.id, // unsuffixed def id - used for GAME_ART image lookups
        // Fixed at spawn so re-renders keep the same image. Holds either the
        // base id or one of its "<base>_<n>" variants (see GAME_ART.randomVariant).
        artId: (typeof GAME_ART !== 'undefined' && GAME_ART.randomVariant)
            ? GAME_ART.randomVariant('monster', def.id)
            : def.id,
        // Uniform random display scale (0.9–1.35) so spawns of the same
        // type vary in size. Uniform - never stretches the sprite.
        artScale: Math.round((0.9 + Math.random() * 0.45) * 100) / 100,
        name: def.name,
        emoji: def.emoji,
        level: lvl,
        maxHP,
        currentHP: maxHP,
        chargeMax: scaledCharge,
        currentCharge: 0,
        damageValue: damage,
        attackType: def.attackType || 'ranged', // Added fallback tracking
        element: def.element || null,
        resistances: def.resistances || null
    };

    // Active map run: apply the rolled monster-strengthening mods.
    if (typeof _egApplyMapModsToMonster === 'function') _egApplyMapModsToMonster(monster);

    return monster;
}