//------------------------------------------------------------------------
//----------------------------CONSTANTS & STATE---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const RARITY_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'cursed', 'artifact'];
const HOARDER_THRESHOLD = 10;

const TOAST_DISPLAY_DURATION_MS = 8000;
const TOAST_MAX_VISIBLE = 6; // oldest gets force-removed beyond this

const activeToasts = []; // { msg, el, removing, timeoutId }


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
//-------------------TOAST STACK SYSTEM------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Suppresses a message if it's already visible in the stack.
function _isToastDuplicate(msg) {
    return activeToasts.some(t => t.msg === msg);
}

// Removes a single toast: plays its fade-out, then deletes the element
// and its entry once the animation finishes.
function _removeToast(entry) {
    if (entry.removing) return;
    entry.removing = true;
    clearTimeout(entry.timeoutId);

    entry.el.classList.add('toast-out');
    entry.el.addEventListener('animationend', () => {
        entry.el.remove();
        const idx = activeToasts.indexOf(entry);
        if (idx !== -1) activeToasts.splice(idx, 1);
    }, { once: true });
}

// Adds a new message to the bottom of the stack. It fades in independently
// and fades out on its own timer, without affecting other visible messages.
function showToast(msg) {
    if (_isToastDuplicate(msg)) return;

    const container = document.getElementById('toast-stack');
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'toast-msg';
    el.textContent = msg;
    container.appendChild(el);

    const entry = { msg, el, removing: false, timeoutId: null };
    activeToasts.push(entry);

    // Cap how many messages can pile up — trim the oldest first.
    if (activeToasts.length > TOAST_MAX_VISIBLE) {
        _removeToast(activeToasts[0]);
    }

    entry.timeoutId = setTimeout(() => _removeToast(entry), TOAST_DISPLAY_DURATION_MS);
}

// Clears every visible/pending toast immediately. Called on level reset or scene transitions.
function resetToastQueue() {
    activeToasts.forEach(t => {
        clearTimeout(t.timeoutId);
        t.el.remove();
    });
    activeToasts.length = 0;

    const container = document.getElementById('toast-stack');
    if (container) container.innerHTML = '';
}