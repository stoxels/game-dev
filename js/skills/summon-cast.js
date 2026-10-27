import { STATE, cur, save } from '../state.js';
import { LANG } from '../translation/translations.js';
import { showToast } from '../puzzle-mechanics/toasts-and-popups.js';
import { summonCompanionBot } from '../companion-bot/companion-bot.js';
import { getAffinityLevel } from '../storyline/companion-affinity.js';
import { COMPANION_CAST } from '../storyline/companion-scenes.js';
import { grantCharm } from './skill-charms.js';
import { SUMMON_HEROES, TETHER_STONE_COST, TETHER_STONE_DROP_CHANCE, summonSpellId } from './summon-spells.js';

//------------------------------------------------------------------------
//-------------------SUMMON CASTING----------------------------------------
//------------------------------------------------------------------------
// What happens when a Summon charm is cast, how the Tether Stones that pay
// for it are earned, and how the charms are handed to the player. The three
// definitions are in summon-spells.js; the helper that actually plays the
// friend on the grid is js/companion-bot/companion-bot.js.

//------------------------------------------------------------------------
// LOW-LEVEL HELPERS
//------------------------------------------------------------------------

// One line in the player's language.
function _say(en, de) {
    return LANG === 'de' ? de : en;
}

// How many Tether Stones the player holds.
export function getTetherStones() {
    return Math.max(0, Math.floor(Number(STATE && STATE.tetherStones) || 0));
}

// True once the player owns any Summon charm (Tether Stones only start to drop then).
function _ownsSummonCharm() {
    const inv = (STATE && STATE.charmInventory) || [];
    return inv.some(c => c && SUMMON_HEROES.some(h => c.skillId === summonSpellId(h)));
}

// The affinity level (1-5) between the player's hero and `heroId`, as shown to the
// player. A summon always helps at least like level 1, even before any affinity is earned.
export function summonAffinityLevel(heroId) {
    return Math.max(1, getAffinityLevel((STATE && STATE.companionAffinity) || {}, STATE && STATE.playerCharacter, heroId));
}

//------------------------------------------------------------------------
// ENTRY POINTS
//------------------------------------------------------------------------

// Casts a Summon charm: calls the friend onto the running level when the
// level allows it, nobody is here yet and the player can pay the Tether
// Stones. A refused cast costs nothing and says why. Returns true if cast.
export function castSummonSpell(spell) {
    const hero = spell.summonHero;
    const name = COMPANION_CAST[hero].name;
    if (hero === STATE.playerCharacter) {
        showToast(_say(`You cannot summon yourself.`, 'Du kannst dich nicht selbst beschwören.'), '#ff8a65');
        return false;
    }
    if (!cur || globalThis.dead) return false;
    if (cur._summonUsed) {
        showToast(_say(`A friend already came to this puzzle.`, 'In diesem Rätsel war schon ein Freund da.'), '#ff8a65');
        return false;
    }
    if (getTetherStones() < TETHER_STONE_COST) {
        showToast(_say(`${name} needs ${TETHER_STONE_COST} Tether Stones (you have ${getTetherStones()}).`,
            `${name} braucht ${TETHER_STONE_COST} Bindungssteine (du hast ${getTetherStones()}).`), '#ff8a65');
        return false;
    }
    if (!summonCompanionBot(hero)) return false;
    STATE.tetherStones = getTetherStones() - TETHER_STONE_COST;
    cur._summonUsed = true;
    save();
    showToast(_say(`${name} joins you! (Affinity ${summonAffinityLevel(hero)})`, `${name} schließt sich dir an! (Verbundenheit ${summonAffinityLevel(hero)})`), '#7fe0b0');
    return true;
}

// Hands the player the Summon charm for a friend (rank 1, owned for good).
// Called when a co-op clear unlocks a friend. Returns false for the player's
// own hero (nobody summons themselves) or an unknown hero.
export function grantSummonCharm(heroId) {
    if (!SUMMON_HEROES.includes(heroId) || heroId === STATE.playerCharacter) return false;
    const { duplicate } = grantCharm(summonSpellId(heroId), 1);
    if (!duplicate) {
        showToast(_say(`New charm: Summon ${COMPANION_CAST[heroId].name}`, `Neues Amulett: Beschwöre ${COMPANION_CAST[heroId].name}`), '#7fe0b0');
    }
    return !duplicate;
}

// Rolls a Tether Stone drop for a killed monster. Nothing drops until the
// player owns a Summon charm. A boss always drops one. Returns true on a drop.
export function rollTetherStoneDrop(isBoss) {
    if (!_ownsSummonCharm()) return false;
    if (!isBoss && Math.random() >= TETHER_STONE_DROP_CHANCE) return false;
    STATE.tetherStones = getTetherStones() + 1;
    save();
    showToast(_say('Tether Stone found!', 'Bindungsstein gefunden!'), '#ffd93d');
    return true;
}
