//------------------------------------------------------------------------
//-------------------QUEST ITEMS-------------------------------------------
//------------------------------------------------------------------------
// Story items earned by clearing a co-op encounter for the first time (see
// dev/docs/STORYLINE.md section 4f). They are only collected: no use, no sale,
// no loss. The save keeps them as { itemId: { from, at } } in STATE.questItems.
// The Quest tab of the stash shows them (hub/hub-quest-ui.js).

//------------------------------------------------------------------------
// DATA
//------------------------------------------------------------------------

// All quest items, one per co-op encounter. `from` is the encounter that hands
// it over (`fromEn`/`fromDE` are that encounter's name, copied so the hub needs no
// co-op code). Names and texts are the first draft and can be reworded freely.
// `art` (optional) is the picture path; items without it show their emoji `icon`.
export const QUEST_ITEMS = [
    {
        id: 'q_vortex_chart', from: 'coop_w4', fromEn: 'Through the Vortex, Together', fromDE: 'Gemeinsam durch den Strudel', icon: '🗺️',
        art: 'images/items/maps/maps/map_t01.webp',
        nameEn: 'Torn Vortex Chart', nameDE: 'Zerrissene Strudelkarte',
        textEn: 'A Guild chart of the Vortex of Possibilities, redrawn by two hands. The rim is much wider than the chart says: the vortex is gathering, not leaving.',
        textDE: 'Eine Gildenkarte des Strudels der Möglichkeiten, von zwei Händen neu gezeichnet. Der Rand ist viel weiter, als die Karte sagt: der Strudel sammelt sich, er geht nicht fort.',
    },
    {
        id: 'q_grove_notes', from: 'coop_w6', fromEn: 'The Grove Does Not Sing Alone', fromDE: 'Der Hain singt nicht allein', icon: '🎼',
        nameEn: 'The Grove\'s Eight Notes', nameDE: 'Die acht Töne des Hains',
        textEn: 'A page of notes written down from the birds of the Normal Grove. Eight notes, the same order, a pause of exactly six seconds. For three hundred years.',
        textDE: 'Eine Seite mit den Tönen der Vögel im Normalen Hain. Acht Töne, immer dieselbe Reihenfolge, eine Pause von genau sechs Sekunden. Seit dreihundert Jahren.',
    },
    {
        id: 'q_last_bearing', from: 'coop_w8', fromEn: 'Before the Lantern Goes Out', fromDE: 'Bevor die Laterne erlischt', icon: '📓',
        nameEn: 'The Last Bearing', nameDE: 'Die letzte Peilung',
        textEn: 'A page from the last researcher\'s notebook: every bearing of the corruption points to one centre. Someone stamped "stop measuring" across it.',
        textDE: 'Eine Seite aus dem Notizbuch des letzten Forschers: jede Peilung der Verderbnis zeigt auf ein Zentrum. Jemand hat "Messung einstellen" darübergestempelt.',
    },
    {
        id: 'q_survey_rubbing', from: 'coop_w9', fromEn: 'The Whirl at the Delta', fromDE: 'Der Wirbel im Delta', icon: '🪨',
        nameEn: 'Survey Stone Rubbing', nameDE: 'Abrieb des Vermessungssteins',
        textEn: 'A charcoal rubbing of the survey stone in the Delta. The stamp reads "V. Vors". Some names are struck from the register but not from the stones.',
        textDE: 'Ein Kohleabrieb des Vermessungssteins im Delta. Der Stempel lautet "V. Vors". Manche Namen sind aus dem Register gestrichen, aber nicht von den Steinen.',
    },
    {
        id: 'q_verun_page', from: 'coop_w11', fromEn: 'What the Mist Hides', fromDE: 'Was der Nebel verbirgt', icon: '📜',
        nameEn: 'Verun\'s Page', nameDE: 'Veruns Seite',
        textEn: 'A page of the book Verun wrote and nobody believed. The margin says, in a shaking hand: she used my pages, and she smiled when she took them.',
        textDE: 'Eine Seite aus dem Buch, das Verun schrieb und dem niemand glaubte. Am Rand steht in zittriger Schrift: Sie hat meine Seiten benutzt, und sie lächelte, als sie sie nahm.',
    },
    {
        id: 'q_proof_shard', from: 'coop_w13', fromEn: 'The Warden on the Plateau', fromDE: 'Der Wächter auf dem Plateau', icon: '💎',
        nameEn: 'Proof Stone Shard', nameDE: 'Splitter des Beweissteins',
        textEn: 'A shard of the proof stone on the Plateau. It was defaced recently, the cuts are still sharp: someone is still erasing.',
        textDE: 'Ein Splitter des Beweissteins auf dem Plateau. Er wurde erst kürzlich entstellt, die Schnitte sind noch scharf: jemand löscht immer noch.',
    },
];

//------------------------------------------------------------------------
// LOOKUPS
//------------------------------------------------------------------------

// The picture of a quest item as HTML, `size` px high: its art, or the emoji icon
// when it has none yet.
export function questIconHtml(item, size) {
    if (!item.art) return item.icon;
    return `<img src="${item.art}" alt="" draggable="false" style="height:${size}px;width:${size}px;object-fit:contain;vertical-align:middle;">`;
}

// The quest item an encounter hands over, or null.
export function questItemFor(coopId) {
    return QUEST_ITEMS.find(q => q.from === coopId) || null;
}

// True when the item is in the collection (`store` is STATE.questItems).
export function hasQuestItem(store, itemId) {
    return !!(store && store[itemId]);
}

// How many quest items are collected (only known items count).
export function questItemCount(store) {
    return QUEST_ITEMS.filter(q => hasQuestItem(store, q.id)).length;
}

//------------------------------------------------------------------------
// ENTRY POINTS
//------------------------------------------------------------------------

// Puts the item for an encounter into the collection. Returns the item when it
// is new, or null when it was already there (or the encounter gives none).
export function grantQuestItem(store, coopId, now = Date.now()) {
    const item = questItemFor(coopId);
    if (!item || !store || hasQuestItem(store, item.id)) return null;
    store[item.id] = { from: coopId, at: now };
    return item;
}
