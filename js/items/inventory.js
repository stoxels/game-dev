//------------------------------------------------------------------------
//-------------------INVENTORY CONSTANTS----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const RARITY_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'cursed', 'artifact'];
const HOARDER_THRESHOLD = 10;
const TOAST_DISPLAY_DURATION_MS = 2500;
const TOAST_FADE_OUT_DURATION_MS = 300;


//------------------------------------------------------------------------
//-------------------TOAST STATE------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const toastQueue = [];
let isToastShowing = false;
let currentToastMsg = null;


//------------------------------------------------------------------------
//-------------------INVENTORY ACHIEVEMENT HELPERS------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if the player is currently holding at least one item of every rarity tier
function _hasAllRarityTiers() {
    const raritiesPresent = new Set(
        STATE.inventory
            .map(item => ITEM_DEFS[item.defId]?.rarity)
            .filter(Boolean)
    );
    return RARITY_TIERS.every(r => raritiesPresent.has(r));
}

// Checks and tracks the hoarder achievement (reaching max inventory size)
// Only fires once per level, guarded by _maxInventoryTrackedThisLevel
function _checkHoarderAchievement() {
    if (window._maxInventoryTrackedThisLevel) return;
    if (STATE.inventory.length < HOARDER_THRESHOLD) return;

    window._maxInventoryTrackedThisLevel = true;
    trackAchStat('maxInventoryReached');
}

// Checks and tracks the collector achievement (holding every rarity simultaneously)
// Only fires once per level, guarded by _collectorTrackedThisLevel
function _checkCollectorAchievement() {
    if (window._collectorTrackedThisLevel) return;
    if (!_hasAllRarityTiers()) return;

    window._collectorTrackedThisLevel = true;
    trackAchStat('collectorAllRarities');
}


//------------------------------------------------------------------------
//-------------------INVENTORY ACHIEVEMENT TRACKING-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Called after every inventory change to check whether any
// inventory-related achievements have been unlocked this level
function checkInventoryAchievements() {
    _checkHoarderAchievement();
    _checkCollectorAchievement();
}


//------------------------------------------------------------------------
//-------------------TOAST NOTIFICATION HELPERS---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Determines whether a given message should be suppressed to avoid duplicates.
// Suppresses if the same message is currently on screen, or is already last in queue.
function _isToastDuplicate(msg) {
    if (isToastShowing && currentToastMsg === msg) return true;
    if (toastQueue.length > 0 && toastQueue[toastQueue.length - 1] === msg) return true;
    return false;
}

// Hides the toast element and schedules the next message in the queue
function _onToastHidden() {
    setTimeout(_processToastQueue, TOAST_FADE_OUT_DURATION_MS);
}

// Displays the next message from the queue, then hides it after the display duration
function _showNextToast(msg) {
    currentToastMsg = msg;

    const el = document.getElementById('item-toast');
    el.textContent = msg;
    el.classList.add('show');

    setTimeout(() => {
        el.classList.remove('show');
        _onToastHidden();
    }, TOAST_DISPLAY_DURATION_MS);
}


//------------------------------------------------------------------------
//-------------------TOAST NOTIFICATION SYSTEM---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Pulls the next message off the queue and displays it.
// If the queue is empty, marks the toast system as idle.
function _processToastQueue() {
    if (toastQueue.length === 0) {
        isToastShowing = false;
        currentToastMsg = null;
        return;
    }

    isToastShowing = true;
    _showNextToast(toastQueue.shift());
}

// Queues a toast notification message. Duplicate messages are suppressed.
// If no toast is currently showing, begins processing immediately.
function showToast(msg) {
    if (_isToastDuplicate(msg)) return;

    toastQueue.push(msg);

    if (!isToastShowing) {
        _processToastQueue();
    }
}

// Clears all pending and active toasts. Called on level reset or scene transitions.
function resetToastQueue() {
    toastQueue.length = 0;
    isToastShowing = false;
    currentToastMsg = null;

    const el = document.getElementById('item-toast');
    if (el) el.classList.remove('show');
}