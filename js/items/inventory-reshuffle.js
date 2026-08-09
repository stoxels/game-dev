//------------------------------------------------------------------------
//----------------------------CONSTANTS & STATE---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

let reshuffleCount = 0;             // tracks discarded items toward the reshuffle goal
const RESHUFFLE_GOAL = 5;           // discards needed to trigger the reshuffle reward modal
const RESHUFFLE_PICK_COUNT = 3;     // how many item choices are offered in the modal
const RESHUFFLE_MAX_ATTEMPTS = 50;  // max loop iterations when picking distinct reward items




//------------------------------------------------------------------------
//-------------------COUNTER BADGE SYNCHRONIZATION-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Updates the reshuffle progress badge shown in the UI (e.g. "♻ 3/5").
// Called by buildInventoryPanel() and whenever reshuffleCount changes.
function updateReshuffleCounter() {
    const el = document.getElementById('reshuffle-counter');
    if (el) el.textContent = `♻ ${reshuffleCount}/${RESHUFFLE_GOAL}`;
}




//------------------------------------------------------------------------
//-------------------ITEM DISCARD HELPERS---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Removes the item with the given uid from inventory.
// Returns the item definition, or null if the uid was not found.
function removeItemFromInventory(uid) {
    const idx = STATE.inventory.findIndex(i => i.uid === uid);
    if (idx < 0) return null;
    const def = ITEM_DEFS[STATE.inventory[idx].defId];
    STATE.inventory.splice(idx, 1);
    return def;
}

// Checks if the reshuffle goal has been reached after an increment.
// If so, resets the counter and opens the reward modal after a short delay
// so the discard toast has time to render before the modal appears.
function checkReshuffleGoalReached() {
    if (reshuffleCount < RESHUFFLE_GOAL) return;
    reshuffleCount = 0;
    updateReshuffleCounter();
    setTimeout(() => openReshuffleModal(), 300);
}




//------------------------------------------------------------------------
//-------------------RESHUFFLE MODAL HELPERS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Picks RESHUFFLE_PICK_COUNT distinct random item definitions for the reward modal.
// Uses the existing weighted pool (with artifact chance) via pickLuckyItem().
// Returns an array of item definition objects.
function pickReshuffleRewardItems() {
    const picks = [];
    const usedIds = new Set();
    let attempts = 0;

    while (picks.length < RESHUFFLE_PICK_COUNT && attempts < RESHUFFLE_MAX_ATTEMPTS) {
        attempts++;
        const id = pickLuckyItem();
        if (id && ITEM_DEFS[id] && !usedIds.has(id)) {
            usedIds.add(id);
            picks.push(ITEM_DEFS[id]);
        }
    }

    return picks;
}

// Builds the HTML string for a single reward card shown in the reshuffle modal.
function buildReshuffleCardHtml(def) {
    return `
        <div class="rshuffle-card" data-id="${def.id}">
            <div class="rshuffle-card-icon">${def.icon}</div>
            <div class="rshuffle-card-name" style="color:${rarityColors(def.rarity).color}">${itemName(def)}</div>
            <div class="rshuffle-card-desc">${itemDesc(def)}</div>
        </div>`;
}

// Builds and returns the reshuffle modal DOM element, populated with the given item picks.
function buildReshuffleModalElement(picks) {
    const cardsHtml = picks.map(buildReshuffleCardHtml).join('');

    const modal = document.createElement('div');
    modal.id = 'rshuffle-modal';
    modal.innerHTML = `
        <div id="rshuffle-box">
            <div id="rshuffle-title">♻ Reshuffle Reward</div>
            <div id="rshuffle-subtitle">${RESHUFFLE_GOAL} items sacrificed — choose your reward:</div>
            <div id="rshuffle-cards">${cardsHtml}</div>
        </div>`;

    return modal;
}

// Adds the chosen item to the player's inventory, saves, refreshes the UI, and closes the modal.
function applyReshuffleChoice(chosenId, modal) {
    const chosenDef = ITEM_DEFS[chosenId];

    STATE.inventory.push({
        uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        defId: chosenId
    });

    save();
    buildInventoryPanel();
    showToast(`${chosenDef.icon} ${itemName(chosenDef)} added to your inventory!`);
    modal.remove();
}

// Attaches a click handler to each reward card in the modal.
function attachReshuffleCardHandlers(modal) {
    modal.querySelectorAll('.rshuffle-card').forEach(card => {
        card.addEventListener('click', () => applyReshuffleChoice(card.dataset.id, modal));
    });
}




//------------------------------------------------------------------------
//----------------------------RESHUFFLE MODAL-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Opens the reshuffle reward modal, offering the player a choice of random items.
// Called automatically when the discard count reaches RESHUFFLE_GOAL.
function openReshuffleModal() {
    const picks = pickReshuffleRewardItems();
    const modal = buildReshuffleModalElement(picks);
    document.body.appendChild(modal);
    attachReshuffleCardHandlers(modal);
}




//------------------------------------------------------------------------
//----------------------------ITEM DISCARD (RIGHT-CLICK)------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Called on right-click of an inventory slot.
// Removes the item, increments the reshuffle counter, updates the UI,
// then checks if the reshuffle goal has been reached.
// NOTE: reshuffleCount is incremented BEFORE buildInventoryPanel() and
// the toast so that both the badge and the toast display the same updated value.
function reshuffleRightClickItem(uid) {
    const def = removeItemFromInventory(uid);
    if (!def) return;

    reshuffleCount++;               // increment first — badge and toast both read this value
    trackAchStat('itemsSold');
    save();
    buildInventoryPanel();          // calls updateReshuffleCounter() internally
    showToast(`${def.icon} Tossed into the reshuffle pile… (${reshuffleCount}/${RESHUFFLE_GOAL})`);

    checkReshuffleGoalReached();    // resets counter and opens modal if goal is met
}