import { Audio_Manager } from './audio/audio.js';
import { trackAchStat } from './achievements/achievements.js';
import { areAllWorldLevelsDone, grantClassChangeToken, triggerClassEventIfPending } from './classes/class-ui.js';
import { curMods } from './difficulty-modifiers.js';
import { BOSS_DEFS } from './combat/bosses/boss-framework.js';
import { _canLeaveMap, _cancelChainCountdown, _rollBonusMapLoot, _showLeaveMapTransition } from './combat/encounter-chain.js';
import { _buildChainPool } from './combat/encounter-chain-pool.js';
import { _ensureLoseOverlayEndgameUI } from './combat/encounter-defeat-overlay.js';
import { _stopEncounter } from './combat/encounter.js';
import { _flushRunLootToStash } from './combat/combat-grid-pickups-loot.js';
import { saveHubState } from './hub/hub.js';
import { LEVELING_CONFIG, _awardXP, _calcXpMultiplier, _campaignExpectedLevel, _getPlayerLevel, _getXpForNextLevel, _grantCampaignLevelXP } from './hub/hub-leveling.js';
import { _egPickMapRunSeedGi } from './endgame/endgame-map-launch.js';
import { _egBankUnclaimedMapDrops } from './loot/loot-map-drops.js';
import { _resetQuizDamageBuff } from './combat/combat-quiz-buffs.js';
import { WORLDS } from './levels/level-world-data.js';
import { ALL, WORLD_START_GI, isNexusPointLevel, isNexusWorld } from './levels/levels.js';
import { buildInventoryPanel } from './puzzle-item-inventory/puzzle-item-inventory-panel.js';
import { ITEM_DEFS } from './puzzle-items/item-definitions.js';
import { showItemGainPopup, showToast } from './puzzle-mechanics/toasts-and-popups.js';
import { _incDirect, updateQuestStats } from './inference/inference-stats.js';
import { isGatedLevel } from './quiz-exercise/mathgate.js';
import { _wdSyncSpriteToLevel, showWorldDetail } from './screens/screens-world-levels.js';
import { _maybeShowConvergenceModal, goToLevelSelect } from './screens/screens.js';
import { _hidePlayerAvatar, _hidePlayerAvatarSimple } from './sprite/player_sprite.js';
import { save } from './state.js';
import { stopTimer } from './timer/timer.js';
import { LANG, t } from './translation/translations.js';
import { STATE } from './state.js';
import { cur } from './state.js';

//------------------------------------------------------------------------
//-------------------CAMPAIGN TRIALS--------------------------------------
//------------------------------------------------------------------------
// Leveling Rework: Convergence Trials + Ascension Trials.
//
//   - CONVERGENCE TRIALS are mini-maps (short encounter chains ending in a
//     boss fight, tuned for lower-level players via the campaign monster
//     level). One per campaign world (Trial 1..13 for worlds 1..13); they
//     need NO map item to enter. Intermediate quiz questions come from the
//     trial's own world. Finishing (Complete Map button, relabelled
//     "Finish Trial") grants a passive point + the convergence modal on
//     first clear. The old 33%/66% convergence puzzle levels are regular
//     puzzle levels now (isConvergenceLevel() always returns false).
//   - ASCENSION TRIALS: every ascension level (final level of a world,
//     except the Nexus Point) is entered as a mini-map chain that ends in a
//     boss fight. Finishing marks the ascension level done, grants the
//     Codex of Completion on first clear and runs the normal
//     world-completion class flow.
//
// Both reuse the endgame encounter-chain machinery verbatim: the trial
// stamps a randomly picked seed story level exactly like
// _egLaunchMapFromDevice() does (isMonsterLevel + isMapRunSeed + run
// params + boss list) and launches it via startLevel(). The only
// differences: no map item is consumed, questions are drawn from the
// trial's world, the leave button is relabelled, and completion grants
// trial rewards instead of atlas progress.
//
// Wiring (typeof-guarded so load order never matters):
//   world map nodes  → _launchCampaignTrial(wi) / ascension via startLevel()
//   startLevel()     → _maybeLaunchAscensionTrial() intercepts campaign
//                      ascension levels into _launchAscensionTrial(wi)
//   _tryLeaveMap() → branches to _endCampaignTrial() for trial runs
//   _pickInterstitialWorldNum() → trial world override (patched in
//                      endgame-encounter-chain.js, reads window._campaignTrial)
//   _chainCleanup()→ _cleanupCampaignTrialSeed() (patched call site)
//   leave-map return → window._trialReturnWi branch (patched call site)
//
// Dependencies (all optional at load time, required at run time):
//   js/levels/levels.js, js/state.js, endgame-encounter-chain.js,
//   endgame-map-launch.js (_egPickMapRunSeedGi), hub-leveling.js,
//   js/scoring.js (applyConvergenceReward path), js/classes/class-ui.js
//------------------------------------------------------------------------


// Worlds 0..12 (campaign worlds 1..13) each own one Convergence Trial.
// Trial number = world number (Trial 1 lives in world 1, ...). The Nexus
// World (index 13) has no trial - its finale is the Nexus Point.
export function _trialWorlds() {
    if (typeof WORLDS === 'undefined' || !WORLDS) return [];
    const out = [];
    for (let wi = 0; wi < WORLDS.length; wi++) {
        if (typeof isNexusWorld === 'function' && isNexusWorld(wi)) continue;
        if (!WORLDS[wi] || !WORLDS[wi].data || !WORLDS[wi].data.length) continue;
        out.push(wi);
    }
    return out;
}

// Total number of Convergence Trials (drives the convergence modal "x / n").
export function _trialCount() {
    return _trialWorlds().length;
}

// Trial id for a world index, e.g. 'trial_1'. Stable across saves.
export function _trialIdForWorld(wi) {
    return 'trial_' + (wi + 1);
}

// Display name, e.g. 'Convergence Trial 1'.
export function _trialName(wi) {
    const label = (typeof t === 'function')
        ? t('eg_trial_name').replace('{n}', wi + 1) : null;
    return (label && label !== 'eg_trial_name') ? label : ('Convergence Trial ' + (wi + 1));
}

// Display name for an ascension trial, e.g. 'Ascension Trial - World 3'.
export function _ascensionTrialName(wi) {
    const label = (typeof t === 'function')
        ? t('eg_ascension_trial_name').replace('{n}', wi + 1) : null;
    return (label && label !== 'eg_ascension_trial_name')
        ? label : ('Ascension Trial - World ' + (wi + 1));
}

// Global index of the first level of world `wi` (-1 when unknown).
export function _trialWorldStartGi(wi) {
    if (typeof WORLD_START_GI !== 'undefined' && WORLD_START_GI[wi] != null) return WORLD_START_GI[wi];
    if (typeof ALL === 'undefined') return -1;
    let gi = 0;
    for (let w = 0; w < wi; w++) {
        if (typeof WORLDS === 'undefined' || !WORLDS[w]) return -1;
        gi += WORLDS[w].data.length;
    }
    return gi;
}

// Monster level for trials in world `wi`.
// Uses the campaign's expected character level at the world's midpoint
// (convergence) or final level (ascension) so the chain + boss fight land
// on-level for a player progressing normally - full XP, fair fight.
export function _trialMonsterLevel(wi, atEnd) {
    const world = (typeof WORLDS !== 'undefined' && WORLDS) ? WORLDS[wi] : null;
    const start = _trialWorldStartGi(wi);
    if (world && start >= 0 && typeof _campaignExpectedLevel === 'function') {
        const li = atEnd ? (world.data.length - 1) : Math.floor(world.data.length / 2);
        return Math.max(1, Math.round(_campaignExpectedLevel(start + li)));
    }
    // Fallback: linear spread of the campaign band across trial worlds.
    const end = (typeof LEVELING_CONFIG !== 'undefined' && LEVELING_CONFIG.campaignEndLevel) || 68;
    const n = Math.max(1, _trialCount() || 13);
    const f = atEnd ? ((wi + 1) / n) : ((wi + 0.5) / n);
    return Math.max(1, Math.round(1 + (end - 1) * Math.min(1, Math.max(0, f))));
}

// Deterministic boss pick per world (existing boss fights, reused).
// Convergence and ascension trials in the same world get different bosses.
export function _trialBossId(wi, salt) {
    if (typeof BOSS_DEFS === 'undefined' || !BOSS_DEFS) return null;
    const keys = Object.keys(BOSS_DEFS);
    if (!keys.length) return null;
    // World 1's convergence trial is always The Null (kept explicit so adding
    // bosses to the roster can never reshuffle it).
    if (wi === 0 && !salt && BOSS_DEFS.boss_null) return 'boss_null';
    // Spread neighbouring worlds across the roster (11 is coprime to most
    // roster sizes; modulo keeps it stable even if bosses are added later).
    return keys[Math.abs(wi * 11 + (salt || 0) * 5 + 3) % keys.length];
}

// Chain length grows gently with world index: short trials early (2
// puzzles + 1 question), slightly longer later (3 + 2). Always ends in a
// single boss - the "mini-map" feel.
export function _trialChainParams(wi) {
    const late = wi >= 6;
    const veryLate = wi >= 10;
    return {
        requiredPuzzles: late ? 3 : 2,
        requiredQuestions: late ? 2 : 1,
        totalMonsters: Math.min(14, 6 + wi + (veryLate ? 2 : 0)),
        maxMonsters: wi >= 4 ? 4 : 3,
    };
}

// True while the current run is a campaign trial (convergence or
// ascension). Reads the stamp on the level (survives chain transitions
// via _mapDef) with a window-runtime fallback.
export function _isTrialRun() {
    const stamped = (typeof cur !== 'undefined' && cur && cur.campaignTrial)
        || (typeof _mapDef !== 'undefined' && globalThis._mapDef && globalThis._mapDef.campaignTrial)
        || (typeof window !== 'undefined' && window._campaignTrial);
    return stamped || null;
}

export function _isConvergenceTrialRun() {
    const tr = _isTrialRun();
    return (tr && tr.kind === 'convergence') ? tr : null;
}

export function _isAscensionTrialRun() {
    const tr = _isTrialRun();
    return (tr && tr.kind === 'ascension') ? tr : null;
}

// Trial state guards for new saves / old saves without the arrays.
export function _ensureTrialState() {
    if (typeof STATE === 'undefined' || !STATE) return;
    if (!Array.isArray(STATE.trialsDone)) STATE.trialsDone = [];
    if (!Array.isArray(STATE.ascensionTrialsDone)) STATE.ascensionTrialsDone = [];
}

export function _isTrialDone(wi) {
    _ensureTrialState();
    return STATE.trialsDone.includes(_trialIdForWorld(wi));
}

export function _isAscensionTrialDone(wi) {
    _ensureTrialState();
    return STATE.ascensionTrialsDone.includes('asc_' + (wi + 1));
}

// Trials unlock by clearing the world's two convergence milestone levels
// (the old 33% / 66% rule, see _trialTriggerLevels). World 1 Trial 1
// additionally needs the tutorial finished (matches level 1-1).
export function _isTrialUnlocked(wi) {
    if (typeof STATE === 'undefined' || !STATE) return false;
    if (wi === 0 && !STATE.tutorialDone) return false;
    const start = _trialWorldStartGi(wi);
    if (start < 0 || typeof ALL === 'undefined') return false;
    const triggers = _trialTriggerLevels(wi);
    if (!triggers) return false;
    return triggers.every((li) => STATE.done && STATE.done.includes(start + li));
}

// The two convergence milestone level indices (0-based li inside the world)
// that gate this world's Convergence Trial - the classic 33% / 66% formula
// used by the pre-Leveling-Rework convergence levels (last level excluded).
// Returns null for worlds without a trial (Nexus World / empty data).
export function _trialTriggerLevels(wi) {
    const world = (typeof WORLDS !== 'undefined' && WORLDS) ? WORLDS[wi] : null;
    if (!world || !world.data || world.data.length < 2) return null;
    if (typeof isNexusWorld === 'function' && isNexusWorld(wi)) return null;
    const len = world.data.length;
    const c1 = Math.floor((len - 1) * (1 / 3));
    const c2 = Math.floor((len - 1) * (2 / 3));
    if (c1 === c2) return null;
    return [c1, c2];
}


//------------------------------------------------------------------------
//-------------------LAUNCH------------------------------------------------
//------------------------------------------------------------------------

// ---- pre-launch briefing --------------------------------------------------
// Trials play very differently from the ordinary puzzle levels before them
// (a chain of puzzles + questions ending in a boss), so every launch first
// shows a short briefing. "Begin" starts the run; "Back" returns to the level
// select without launching anything.
function _trialIntroText() {
    const de = LANG === 'de';
    return {
        convergence: de ? 'Konvergenz-Prüfung' : 'Convergence Trial',
        ascension: de ? 'Aufstiegs-Prüfung' : 'Ascension Trial',
        lead: de
            ? 'Das ist KEIN normales Rätsel. Eine Prüfung ist ein kurzer Lauf aus mehreren verbundenen Etappen, der mit einem Bosskampf endet.'
            : 'This is NOT a normal puzzle level. A trial is a short run through several connected stages that ends in a boss fight.',
        puzzles: (n) => (de ? `Löse ${n} Rätsel nacheinander.` : `Solve ${n} puzzles, one after another.`),
        questions: (n) => (de
            ? `Beantworte ${n} Quizfragen zu dieser Welt zwischen den Rätseln.`
            : `Answer ${n} quiz question${n === 1 ? '' : 's'} about this world between the puzzles.`),
        monsters: (max, total, lvl) => (de
            ? `Monster greifen währenddessen an (bis zu ${max} gleichzeitig, insgesamt ${total}, Stufe ${lvl}). Besiege sie mit Projektilen, Zaubern und Nahkampf.`
            : `Monsters attack while you work (up to ${max} at once, ${total} in total, level ${lvl}). Beat them with grid projectiles, spells and melee.`),
        boss: (name) => (de ? `Besiege am Ende den Boss: ${name}.` : `Defeat the boss at the end: ${name}.`),
        finish: de ? 'Danach „Prüfung beenden“ wählen, um die Belohnung zu erhalten.' : 'Then choose "Finish Trial" to claim your reward.',
        rules: (min, mistakes) => (de
            ? `⏱ Zeitlimit ${min} Min · ✖ höchstens ${mistakes} Fehler · stirbst du, endet der Lauf (du kannst es jederzeit erneut versuchen).`
            : `⏱ ${min} min time limit · ✖ at most ${mistakes} mistakes · if you fail the run ends (you can retry any time).`),
        rewardConv: de ? 'Belohnung (erster Abschluss): +1 Talentpunkt und Erfahrung.' : 'Reward (first clear): +1 passive point and XP.',
        rewardAsc: de
            ? 'Belohnung (erster Abschluss): Kodex der Vollendung, Weltabschluss-Boni und Klassenereignis.'
            : 'Reward (first clear): Codex of Completion, world-completion rewards and the class event.',
        begin: de ? 'PRÜFUNG BEGINNEN' : 'BEGIN TRIAL',
        back: de ? 'Zurück' : 'Back',
        monsterless: de ? 'Monsterlos: nur Rätsel und Fragen, kein Boss.' : 'Monsterless: puzzles and questions only, no boss.',
    };
}

function _showTrialIntro(wi, kind, info, onBegin) {
    const old = document.getElementById('trial-intro-modal');
    if (old) old.remove();
    const tx = _trialIntroText();
    const name = kind === 'convergence' ? _trialName(wi) : _ascensionTrialName(wi);
    const steps = [];
    steps.push(`🧩 ${tx.puzzles(info.requiredPuzzles)}`);
    if (info.requiredQuestions > 0) steps.push(`❓ ${tx.questions(info.requiredQuestions)}`);
    if (info.monsterless) {
        steps.push(`🕊 ${tx.monsterless}`);
    } else {
        steps.push(`👹 ${tx.monsters(info.maxMonsters, info.totalMonsters, info.monsterLevel)}`);
        steps.push(`👑 ${tx.boss(info.bossName)}`);
    }
    steps.push(`🏁 ${tx.finish}`);
    const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const el = document.createElement('div');
    el.id = 'trial-intro-modal';
    el.innerHTML = `
<style>
#trial-intro-modal{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(4,2,10,.78);font-family:system-ui,sans-serif}
#trial-intro-modal .ti-card{max-width:560px;width:calc(100vw - 32px);box-sizing:border-box;padding:22px 26px;border-radius:14px;border:2px solid #b8862b;background:linear-gradient(180deg,#1b1030,#0d0818);color:#efe6ff;box-shadow:0 0 40px rgba(255,170,40,.35)}
#trial-intro-modal .ti-kind{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#b9a8d6;text-align:center}
#trial-intro-modal h2{margin:4px 0 12px;font-size:24px;letter-spacing:.06em;text-align:center;color:#ffd98a;text-shadow:0 0 12px rgba(255,160,30,.6)}
#trial-intro-modal p{margin:0 0 12px;font-size:14px;line-height:1.5;color:#e4d8ff}
#trial-intro-modal ol{margin:0 0 12px;padding:0;list-style:none;counter-reset:s}
#trial-intro-modal li{position:relative;margin:0 0 8px;padding:8px 10px 8px 38px;border-radius:8px;background:rgba(255,255,255,.05);font-size:14px;line-height:1.4}
#trial-intro-modal li::before{counter-increment:s;content:counter(s);position:absolute;left:10px;top:50%;transform:translateY(-50%);width:20px;height:20px;border-radius:50%;background:#8a4d0a;color:#fff;font-size:12px;font-weight:800;text-align:center;line-height:20px}
#trial-intro-modal .ti-rules{font-size:13px;color:#cbb8f0}
#trial-intro-modal .ti-reward{font-size:13px;color:#ffe9a8}
#trial-intro-modal .ti-actions{display:flex;gap:10px;justify-content:center;margin-top:14px}
#trial-intro-modal button{font:800 13px/1 system-ui,sans-serif;letter-spacing:.1em;padding:11px 20px;border-radius:8px;cursor:pointer;border:1px solid #b8862b;color:#ffe9b8;background:#3a2410}
#trial-intro-modal button.ti-go{background:linear-gradient(180deg,#d98a1f,#8a4d0a);color:#fff}
#trial-intro-modal button:hover{filter:brightness(1.2)}
</style>
<div class="ti-card" role="dialog" aria-modal="true">
    <div class="ti-kind">${esc(kind === 'convergence' ? tx.convergence : tx.ascension)}</div>
    <h2>⚔ ${esc(name)}</h2>
    <p>${esc(tx.lead)}</p>
    <ol>${steps.map((st) => `<li>${esc(st)}</li>`).join('')}</ol>
    <p class="ti-rules">${esc(tx.rules(Math.round(info.timeLimitSecs / 60), info.maxMistakes))}</p>
    <p class="ti-reward">${esc(kind === 'convergence' ? tx.rewardConv : tx.rewardAsc)}</p>
    <div class="ti-actions">
        <button class="ti-back" id="ti-back">${esc(tx.back)}</button>
        <button class="ti-go" id="ti-go">${esc(tx.begin)}</button>
    </div>
</div>`;
    document.body.appendChild(el);
    const close = () => { const m = document.getElementById('trial-intro-modal'); if (m) m.remove(); };
    document.getElementById('ti-go').addEventListener('click', () => { close(); onBegin(); });
    document.getElementById('ti-back').addEventListener('click', () => {
        close();
        try { goToLevelSelect(); } catch (e) { /* level select optional */ }
    });
}

// Largest puzzle (in cells) a trial may hand out. Trials used to draw from
// every generated size (25 to 450 cells), so a first-world trial could throw
// a 15x30 grid at a new player. The cap grows with the world: world 1 stays
// at 5x10, later worlds open up gradually; ascension trials (end of a world)
// allow one step more.
function _trialMaxCells(wi, kind) {
    const step = Math.max(0, wi) + (kind === 'ascension' ? 1 : 0);
    return Math.min(400, 50 + 50 * step);
}

// Stamps a seed story level with trial run parameters and launches it.
// Mirrors _egLaunchMapFromDevice() minus the map-item consumption.
// Without opts.confirmed the player first sees the trial briefing; the run
// starts from its "Begin" button (which calls back here with confirmed).
export function _launchTrialRun(wi, kind, opts) {
    if (typeof startLevel !== 'function' || typeof ALL === 'undefined' || !ALL.length) return false;
    if (typeof _egPickMapRunSeedGi !== 'function' && typeof _buildChainPool !== 'function') return false;

    const chain = _trialChainParams(wi);
    const monsterLevel = _trialMonsterLevel(wi, kind === 'ascension');
    const bossId = _trialBossId(wi, kind === 'ascension' ? 1 : 0);

    if (!(opts && opts.confirmed)) {
        const bossDef = (typeof BOSS_DEFS !== 'undefined' && BOSS_DEFS && bossId) ? BOSS_DEFS[bossId] : null;
        const isMonsterless = !!(typeof curMods !== 'undefined' && curMods && curMods.monsterless);
        _showTrialIntro(wi, kind, {
            requiredPuzzles: chain.requiredPuzzles,
            requiredQuestions: chain.requiredQuestions,
            maxMonsters: chain.maxMonsters,
            totalMonsters: chain.totalMonsters,
            monsterLevel,
            bossName: (bossDef && (bossDef.name || bossDef.id)) || '???',
            monsterless: isMonsterless,
            timeLimitSecs: 1200,
            maxMistakes: 10,
        }, () => _launchTrialRun(wi, kind, { confirmed: true }));
        return true;
    }
    const trialId = kind === 'convergence' ? _trialIdForWorld(wi) : ('asc_' + (wi + 1));
    // MONSTERLESS: trials stay puzzle chains with question intermissions but
    // run with no monsters and no boss finale.
    const monsterless = !!(typeof curMods !== 'undefined' && curMods && curMods.monsterless);
    const trialBossId = monsterless ? null : bossId;
    const stamp = {
        kind, wi, trialId,
        name: kind === 'convergence' ? _trialName(wi) : _ascensionTrialName(wi),
        monsterLevel,
        // Quiz questions come from the trial's own world (spec).
        quizWorld: wi + 1,
    };

    const baseline = {
        monsterLevel,
        maxMonsters: monsterless ? 0 : chain.maxMonsters,
        totalMonsters: monsterless ? 0 : chain.totalMonsters,
        hasBoss: monsterless ? false : true,
        maxBosses: monsterless ? 0 : 1,
        requiredPuzzles: chain.requiredPuzzles,
        requiredQuestions: chain.requiredQuestions,
        chainTimeLimit: 1200,
        chainMaxMistakes: 10,
        puzzlePool: { generated: true, genMode: 'mixed', genTier: 1, maxCells: _trialMaxCells(wi, kind) },
    };

    let gi = null;
    try {
        gi = _egPickMapRunSeedGi(baseline);
    } catch (e) { gi = null; }
    if (gi === null || gi === undefined) {
        // Fallback: any non-gated story level.
        let pool = [];
        try { pool = _buildChainPool(baseline.puzzlePool || {}); } catch (e) { pool = []; }
        if (typeof isGatedLevel === 'function') pool = pool.filter(l => !isGatedLevel(l.gIdx));
        if (!pool.length) {
            if (typeof showToast === 'function') showToast('No puzzles available for trial.');
            return false;
        }
        gi = pool[Math.floor(Math.random() * pool.length)].gIdx;
    }

    const level = ALL[gi];
    if (!level) return false;

    // Runtime descriptor (restored landing info + trial kind for HUD/labels).
    window._campaignTrial = stamp;
    // Return routing for the leave-map screen (survives _chainCleanup;
    // consumed by the return-button branch).
    window._trialReturnWi = wi;
    window._trialReturnKind = kind;
    window._egIsMapDeviceRun = false;

    level.isMonsterLevel = true;
    level.isMapRunSeed = true;
    window._mapRunSeedGi = gi;
    level.monsterLevel = baseline.monsterLevel;
    level.maxMonsters = baseline.maxMonsters;
    level.totalMonsters = baseline.totalMonsters;
    level.hasBoss = baseline.hasBoss;
    level.maxBosses = baseline.maxBosses;
    // The boss level is PINNED to the trial's monster level. Without an
    // explicit level the spawner rolls one (-2..0 below the base), which made
    // the same trial's boss HP vary by ~50% between attempts and tuning
    // data unreadable. Applies to convergence and ascension trials alike.
    if (trialBossId) level.bosses = [{ id: trialBossId, level: monsterLevel }];
    else delete level.bosses;
    level.requiredPuzzles = baseline.requiredPuzzles;
    level.requiredQuestions = baseline.requiredQuestions;
    level.puzzlePool = baseline.puzzlePool;
    level.chainTimeLimit = baseline.chainTimeLimit;
    level.chainMaxMistakes = baseline.chainMaxMistakes;
    level.campaignTrial = stamp;

    if (typeof _ensureLoseOverlayEndgameUI === 'function') _ensureLoseOverlayEndgameUI();

    window._egMapDeviceLaunching = true;
    try {
        if (typeof showToast === 'function') showToast('⚔ ' + stamp.name);
        if (typeof trackAchStat === 'function') try { trackAchStat('egMapsLaunched', 1); } catch (e) {}
        globalThis.startLevel(gi);
    } finally {
        window._egMapDeviceLaunching = false;
    }
    return true;
}

export function _launchCampaignTrial(wi) {
    return _launchTrialRun(wi, 'convergence');
}

export function _launchAscensionTrial(wi) {
    const world = (typeof WORLDS !== 'undefined' && WORLDS) ? WORLDS[wi] : null;
    if (!world) return false;
    return _launchTrialRun(wi, 'ascension');
}

// startLevel() hook: campaign ascension levels (final level of a world,
// except the Nexus Point) start their ascension trial chain instead of the
// plain puzzle. Returns true when it launched a trial (caller must abort
// the normal start). Never hijacks stamped/chain/suppressed launches.
export function _maybeLaunchAscensionTrial(gi) {
    try {
        if (typeof ALL === 'undefined' || !ALL[gi]) return false;
        const level = ALL[gi];
        if (!level || level.world == null || level.li == null) return false;
        // Already a stamped run (trial/map/boss-test seed, chain puzzle,
        // arena, campaign pack): never re-route.
        if (level.isMapRunSeed || level.isChainedPuzzle || level.isBossArena
            || level.campaignTrial || level.campaignMonsters
            || level.isTestMapSeed || level.isBossTestSeed) return false;
        if (typeof window !== 'undefined' && window
            && (window._egMapDeviceLaunching || window._egIsMapDeviceRun
                || window._isBossTestRun || window._suppressEncounterStart)) return false;
        const wi = level.world - 1;
        const world = (typeof WORLDS !== 'undefined' && WORLDS) ? WORLDS[wi] : null;
        if (!world || !world.data || !world.data.length) return false;
        // Final level of a non-Nexus world = ascension level.
        if (level.li !== world.data.length) return false;
        if (typeof isNexusPointLevel === 'function' && isNexusPointLevel(wi, level.li - 1)) return false;
        return _launchAscensionTrial(wi);
    } catch (e) { return false; }
}


//------------------------------------------------------------------------
//-------------------COMPLETION--------------------------------------------
//------------------------------------------------------------------------

// Convergence Trial first-clear reward: +1 passive point (same pool the
// level-ups feed; the tree itself is wired separately) + convergence modal.
export function _grantConvergenceTrialReward(wi) {
    _ensureTrialState();
    const id = _trialIdForWorld(wi);
    const isFirstClear = !STATE.trialsDone.includes(id);
    if (isFirstClear) {
        STATE.trialsDone.push(id);
        STATE.passiveTreePoints = (STATE.passiveTreePoints || 0) + 1;
        Audio_Manager.playSFX('passive_point_gain');
        if (typeof _incDirect === 'function') try { _incDirect('lifetimePassivePointsObtained', 1); } catch (e) {}
        // Trials are the new convergence milestones - keep the Inference
        // ledger's convergence counter moving (legacy levels no longer feed it).
        if (typeof _incDirect === 'function') try { _incDirect('convergenceLevels', 1); } catch (e) {}
        if (typeof trackAchStat === 'function') try { trackAchStat('egMapsCompleted', 1); } catch (e) {}
        // Reuse the legacy trail so old saves/modals/achievements keep working.
        if (!Array.isArray(STATE.convergenceDone)) STATE.convergenceDone = [];
        window._pendingConvergenceModal = true;
    }
    // Flat completion XP on top of kill XP: one first-clear share of the
    // trial level's requirement (replays: reduced share), tier-banded.
    if (typeof _awardXP === 'function' && typeof _getXpForNextLevel === 'function') {
        try {
            const c = (typeof LEVELING_CONFIG !== 'undefined') ? LEVELING_CONFIG : {};
            const refLevel = Math.max(1, _trialMonsterLevel(wi, false));
            const frac = (c.campaignFirstClearFraction || 0.22) * (isFirstClear ? 1 : (c.campaignReplayFraction || 0.35));
            let mult = 1;
            if (typeof _calcXpMultiplier === 'function' && typeof _getPlayerLevel === 'function') {
                mult = _calcXpMultiplier(_getPlayerLevel(), refLevel);
            }
            _awardXP(Math.max(1, Math.round(_getXpForNextLevel(refLevel) * frac * mult)));
        } catch (e) {}
    }
    if (typeof save === 'function') save();
    return isFirstClear;
}

// Ascension Trial finish: the world's ascension level counts as cleared
// (marks STATE.done so world progress/map view stay correct), grants the
// Codex of Completion on first clear, pays the ascension level's campaign
// XP, and runs the normal world-completion class flow (class select /
// upgrade / ascendency, or the Nexus class-change token).
export function _grantAscensionTrialReward(wi) {
    _ensureTrialState();
    const world = (typeof WORLDS !== 'undefined' && WORLDS) ? WORLDS[wi] : null;
    const key = 'asc_' + (wi + 1);
    const isFirstClear = !STATE.ascensionTrialsDone.includes(key);
    let ascGi = -1;
    if (world) {
        const start = _trialWorldStartGi(wi);
        if (start >= 0) ascGi = start + world.data.length - 1;
    }
    const wasDone = ascGi >= 0 && STATE.done && STATE.done.includes(ascGi);
    if (ascGi >= 0 && !wasDone) {
        STATE.done.push(ascGi);
        if (typeof _wdSyncSpriteToLevel === 'function') try { _wdSyncSpriteToLevel(ascGi); } catch (e) {}
    }
    if (isFirstClear) {
        STATE.ascensionTrialsDone.push(key);
        // Codex of Completion (same artifact as the old ascension clear).
        try {
            if (typeof ITEM_DEFS !== 'undefined' && ITEM_DEFS['artifactComplete']
                && STATE && Array.isArray(STATE.inventory)
                && !(typeof curMods !== 'undefined' && curMods && curMods.ironman)) {
                STATE.inventory.push({
                    defId: 'artifactComplete',
                    uid: 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2),
                });
                if (typeof buildInventoryPanel === 'function') try { buildInventoryPanel(); } catch (e) {}
                if (typeof showItemGainPopup === 'function') try { showItemGainPopup('artifactComplete'); } catch (e) {}
            }
        } catch (e) {}
        if (typeof trackAchStat === 'function') try { trackAchStat('egMapsCompleted', 1); } catch (e) {}
    }
    // Campaign XP for the ascension level itself (first clear / replay).
    if (ascGi >= 0 && typeof _grantCampaignLevelXP === 'function') {
        try {
            const keepCur = (typeof cur !== 'undefined') ? cur : null;
            if (typeof ALL !== 'undefined' && ALL[ascGi]) {
                // _grantCampaignLevelXP guards on `cur`: point it at the
                // ascension level briefly (trial seeds are map seeds, which
                // the guard would reject).
                try { globalThis.cur = ALL[ascGi]; } catch (e) {}
                _grantCampaignLevelXP(ascGi, !wasDone);
                try { globalThis.cur = keepCur; } catch (e) {}
            }
        } catch (e) {}
    }
    // Resistance penalty stage 1 (-30% to all resistances): the trial that
    // opens the ascendency class selection. Only the FIRST clear counts.
    try {
        if (isFirstClear && typeof globalThis._advanceResistPenaltyStage === 'function'
            && STATE.playerClass && !STATE.playerAscendency
            && typeof globalThis.isBaseClassMaxed === 'function' && globalThis.isBaseClassMaxed()) {
            globalThis._advanceResistPenaltyStage(1);
        }
    } catch (e) {}
    // World-completion class flow (mirrors checkWorldCompletion in
    // class-ui.js but for the explicit world - `cur` is a trial seed here).
    try {
        if (world && typeof areAllWorldLevelsDone === 'function' && areAllWorldLevelsDone(wi, world)) {
            if (!STATE.classWorldsCompleted) STATE.classWorldsCompleted = [];
            if (!STATE.classWorldsCompleted.includes(wi)) {
                if (typeof isNexusWorld === 'function' && isNexusWorld(wi)) {
                    if (typeof grantClassChangeToken === 'function') grantClassChangeToken(wi);
                    else { STATE.classWorldsCompleted.push(wi); if (typeof save === 'function') save(); }
                } else {
                    STATE._pendingClassEvent = true;
                    STATE._lastClassWorld = wi;
                    if (typeof save === 'function') save();
                }
            }
        } else if (typeof save === 'function') save();
    } catch (e) { try { if (typeof save === 'function') save(); } catch (e2) {} }
    return isFirstClear;
}

// Trial win path - trimmed sibling of _endMap(): bonus-loot roll, leave
// summary, loot flush, cleanup, then trial rewards + trial return routing.
// No atlas progress, no map completion reward (no map item was consumed).
export function _endCampaignTrial() {
    const tr = _isTrialRun();
    if (!tr) return false;
    if (typeof _encounterActive !== 'undefined' && !globalThis._encounterActive) return false;
    // Same gate as the map flow: objectives (kills / puzzles / questions +
    // boss) must all be done before the trial can be finished.
    if (typeof _canLeaveMap === 'function' && !_canLeaveMap()) {
        if (typeof showToast === 'function') {
            const msg = (typeof t === 'function') ? t('eg_objectives_incomplete') : null;
            showToast((msg && msg !== 'eg_objectives_incomplete') ? msg : 'Objectives incomplete');
        }
        return false;
    }
    if (typeof _cancelChainCountdown === 'function') _cancelChainCountdown();
    if (typeof window.clearActiveRandomWalkers === 'function') window.clearActiveRandomWalkers();

    if (typeof _rollBonusMapLoot === 'function') try { _rollBonusMapLoot(); } catch (e) {}

    if (typeof trackAchStat === 'function') {
        try {
            if (typeof mistakeCount !== 'undefined' && globalThis.mistakeCount === 0) trackAchStat('egMapsFlawless', 1);
        } catch (e) {}
    }

    // Summary FIRST (blocks grid clicks instantly), mirroring _endMap.
    if (typeof _showLeaveMapTransition === 'function') _showLeaveMapTransition(null);
    _retitleLeaveMapTransition(tr);

    if (typeof _flushRunLootToStash === 'function') try { _flushRunLootToStash(); } catch (e) {}
    if (typeof _egBankUnclaimedMapDrops === 'function') try { _egBankUnclaimedMapDrops(); } catch (e) {}
    if (typeof saveHubState === 'function') try { saveHubState(); } catch (e) {}

    // Trial rewards (also saves).
    if (tr.kind === 'convergence') _grantConvergenceTrialReward(tr.wi);
    else _grantAscensionTrialReward(tr.wi);

    if (typeof _stopEncounter === 'function') try { _stopEncounter(); } catch (e) {}
    if (typeof _resetQuizDamageBuff === 'function') try { _resetQuizDamageBuff(); } catch (e) {}
    if (typeof stopTimer === 'function') try { stopTimer(); } catch (e) {}
    if (typeof _hidePlayerAvatarSimple === 'function') try { _hidePlayerAvatarSimple(); } catch (e) {}
    if (typeof _hidePlayerAvatar === 'function') try { _hidePlayerAvatar(); } catch (e) {}
    if (typeof updateQuestStats === 'function') {
        try {
            updateQuestStats('trialComplete', { trialId: tr.trialId, kind: tr.kind, wi: tr.wi });
        } catch (e) {}
    }
    return true;
}

// Swaps the leave-map summary title/return button to trial wording after
// _showLeaveMapTransition() rendered the default map texts.
export function _retitleLeaveMapTransition(tr) {
    try {
        const titleEl = document.querySelector('#sx-leave-map-transition .sx-leave-map-title');
        if (titleEl) {
            const key = tr.kind === 'convergence' ? 'eg_trial_complete_title' : 'eg_ascension_trial_complete_title';
            let label = (typeof t === 'function') ? t(key) : null;
            if (!label || label === key) label = tr.kind === 'convergence' ? 'TRIAL COMPLETE' : 'ASCENSION COMPLETE';
            titleEl.textContent = label + ' - ' + tr.name;
        }
        const btn = document.getElementById('btn-eg-leave-map-return');
        if (btn) {
            let label = (typeof t === 'function') ? t('eg_return_to_world') : null;
            if (!label || label === 'eg_return_to_world') label = 'Return to World Map';
            btn.textContent = label;
        }
    } catch (e) {}
}

// Strips trial stamps off the seed level + clears run state. Called from
// _chainCleanup() (patched call site, typeof-guarded).
// Keeps window._trialReturnWi/_trialReturnKind: the leave-map return
// button consumes them AFTER cleanup already ran.
export function _cleanupCampaignTrialSeed() {
    if (typeof window !== 'undefined' && window._egMapDeviceLaunching) return;
    const seedGi = (typeof window !== 'undefined') ? window._mapRunSeedGi : null;
    const hadTrial = !!(typeof window !== 'undefined' && window._campaignTrial);
    if (typeof window !== 'undefined') window._campaignTrial = null;
    if (seedGi == null) return;
    if (typeof ALL === 'undefined' || !ALL[seedGi]) return;
    const level = ALL[seedGi];
    if (!level || level === (typeof cur !== 'undefined' ? cur : null)) return;
    // Only touch levels that actually carried a trial (map-device seeds are
    // restored by _egCleanupMapRunSeedLevel; chained leftovers by the loop).
    if (!level.campaignTrial && !hadTrial) return;
    delete level.campaignTrial;
}

// Return routing for trial runs: back to the trial's world map. Consumes
// the return flags, then serves the standard post-navigation flows
// (convergence modal → class event), mirroring goToLevelSelect().
// Falls back to false (caller routes normally).
export function _routeTrialReturn() {
    if (typeof window === 'undefined') return false;
    const wi = window._trialReturnWi;
    if (wi == null || wi < 0) return false;
    window._trialReturnWi = null;
    window._trialReturnKind = null;
    window._campaignTrial = null;
    try {
        if (typeof showWorldDetail === 'function') {
            showWorldDetail(wi);
            setTimeout(() => {
                try {
                    if (typeof _maybeShowConvergenceModal === 'function') {
                        _maybeShowConvergenceModal(() => {
                            if (typeof triggerClassEventIfPending === 'function') {
                                try { triggerClassEventIfPending(); } catch (e) {}
                            }
                        });
                    } else if (typeof triggerClassEventIfPending === 'function') {
                        try { triggerClassEventIfPending(); } catch (e) {}
                    }
                } catch (e) {}
            }, 350);
            return true;
        }
    } catch (e) {}
    try {
        if (typeof goToLevelSelect === 'function') { goToLevelSelect(); return true; }
    } catch (e) {}
    return false;
}

// Serves pending post-trial flows after the world screen is visible:
// convergence modal first, then the class event (ascension trials).
export function _servePostTrialFlows() {
    try {
        // The world-detail routing already serves the modal → class-event
        // chain; this is only a backstop for non-standard return paths.
        // Never fire the class event while the convergence modal is up.
        if (typeof triggerClassEventIfPending === 'function'
            && !window._pendingConvergenceModal) {
            setTimeout(() => {
                try {
                    if (!window._pendingConvergenceModal) triggerClassEventIfPending();
                } catch (e) {}
            }, 900);
        }
    } catch (e) {}
}
