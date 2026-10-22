import { LANG } from '../translation/translations.js';
import { getStatusRecord } from '../combat/combat-spell-debuff-defs.js';

//------------------------------------------------------------------------
//-------------------CLASS SKILLS vs MONSTERS (DATA & TEXT)---------------
//------------------------------------------------------------------------
// What each class skill does to monsters, and the tooltip sentences written
// from that table. Kept free of combat imports so the tooltips can use it
// without pulling the combat engine into their import chain. The rules that
// carry the effects out live in class-monster-effects.js.
//------------------------------------------------------------------------

// Seconds a staggered monster stands still (kept equal to STAGGER_DURATION_MS in
// encounter-lifecycle.js - a test pins that).
export const CLASS_STAGGER_SECONDS = 2.5;

// Skill key ("<class or ascendency>_<slot>", the same key the banter uses) ->
//   who      'target' = the targeted monster plus (rank - 1) random others,
//            'all'    = every monster on screen
//   apply    debuffs to put on them ({ key, stacks? }); chill and poison are
//            the older ailments
//   stagger  pause their attack bars for a moment
//   rewind   share of an attack bar pushed back per rank [rank 1, 2, 3]
export const CLASS_SKILL_MONSTER_EFFECTS = {
    mathmagician_active1: { who: 'target', apply: [{ key: 'marked' }] },
    mathmagician_active2: { who: 'all', apply: [{ key: 'chill' }, { key: 'brittle' }] },
    statistician_active1: { who: 'target', apply: [{ key: 'exposed' }] },
    statistician_active2: { who: 'target', stagger: true },
    probabilist_active1: { who: 'target', apply: [{ key: 'poison' }] },
    probabilist_active2: { who: 'all', apply: [{ key: 'soaked' }] },
    outlier_active1: { who: 'target', apply: [{ key: 'doomed' }] },
    outlier_active2: { who: 'all', apply: [{ key: 'static', stacks: 2 }] },
    actuary_active1: { who: 'target', apply: [{ key: 'marked' }] },
    actuary_active2: { who: 'all', apply: [{ key: 'chill' }] },
    recursionist_active1: { who: 'target', apply: [{ key: 'withered' }] },
    recursionist_active2: { who: 'target', apply: [{ key: 'poison' }] },
    markovian_active1: { who: 'all', rewind: [0.25, 0.35, 0.5] },
    markovian_active2: { who: 'all', apply: [{ key: 'conductive' }] },
    bayesian_active1: { who: 'target', apply: [{ key: 'exposed' }] },
    bayesian_active2: { who: 'target', apply: [{ key: 'marked' }] },
    random_walker_active1: { who: 'all', apply: [{ key: 'static' }] },
    random_walker_active2: { who: 'all', apply: [{ key: 'soaked' }] },
};

//------------------------------------------------------------------------
//-------------------TOOLTIP TEXT-----------------------------------------
//------------------------------------------------------------------------

// Who the skill reaches, as a phrase that fits after "Also afflicts ...".
function _whoPhrase(who, rank) {
    const de = LANG === 'de';
    if (who === 'all') return de ? 'alle Monster auf dem Bildschirm' : 'every monster on screen';
    const extra = Math.max(0, rank - 1);
    if (!extra) return de ? 'das anvisierte Monster' : 'the targeted monster';
    return de
        ? `das anvisierte Monster und ${extra} weitere${extra === 1 ? 's' : ''} zufällige${extra === 1 ? 's' : ''} Monster`
        : `the targeted monster and ${extra} other random monster${extra === 1 ? '' : 's'}`;
}

// "for 8 seconds" / "für 8 Sekunden" (empty for no timer).
function _forSeconds(seconds) {
    if (!(seconds > 0)) return '';
    return LANG === 'de' ? ` für ${seconds} Sekunden` : ` for ${seconds} seconds`;
}

// The tooltip block rows ({ text, note }) describing what a class skill does to
// monsters at a given rank. Empty for skills without such effects.
export function getClassSkillMonsterRows(skillKey, rank) {
    const row = CLASS_SKILL_MONSTER_EFFECTS[skillKey];
    if (!row) return [];
    const de = LANG === 'de';
    const r = Math.max(1, Math.min(3, Number(rank) || 1));
    const who = _whoPhrase(row.who, r);
    const rows = (row.apply || []).map((entry) => {
        const rec = getStatusRecord(entry.key);
        const text = de
            ? `Belegt außerdem ${who}${_forSeconds(rec.durationS)} mit <b>${rec.name}</b>.`
            : `Also afflicts ${who} with <b>${rec.name}</b>${_forSeconds(rec.durationS)}.`;
        return { text, note: rec.what };
    });
    if (row.stagger) {
        const secs = CLASS_STAGGER_SECONDS;
        rows.push({
            text: de ? `Betäubt außerdem ${who} für ${secs} Sekunden.` : `Also staggers ${who} for ${secs} seconds.`,
            note: de ? 'Ein betäubter Gegner füllt seine Angriffsleiste in dieser Zeit nicht.' : 'A staggered monster does not fill its attack bar meanwhile.',
        });
    }
    if (row.rewind) {
        const pct = Math.round(row.rewind[r - 1] * 100);
        rows.push({
            text: de
                ? `Wirft außerdem die Angriffsleiste von ${who} um ${pct}% zurück.`
                : `Also pushes back the attack bar of ${who} by ${pct}%.`,
        });
    }
    return rows;
}
