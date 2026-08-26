'use strict';

//========================================================================
//=  ENDGAME MAP VENDOR                                                   =
//========================================================================
//=  Sells Tier 1 maps for Gold. Reached from the Nexus of Worlds screen  =
//=  via the 💰 door. Purchased maps are generated fresh per purchase     =
//=  (random region/mods) and banked straight into the Probability Gate   =
//=  map stash (_egMapStash).                                             =
//=                                                                       =
//=  Public API:                                                          =
//=    showEndgameVendor() — creates the screen on first call and         =
//=                          switches to it.                              =
//========================================================================

//------------------------------------------------------------------------
//-------------------CONSTANTS---------------------------------------------
//------------------------------------------------------------------------

// Price of one vendor-bought Tier 1 map, in gold.
const EG_VENDOR_T1_MAP_PRICE = 100;


//------------------------------------------------------------------------
//-------------------HTML ASSEMBLY-----------------------------------------
//------------------------------------------------------------------------

function _egvBuildTopbarHTML() {
    return `
<div class="egn-topbar">
    <button class="title-btn back-btn" onclick="goToPreviousScreen()">${t('btn_back')}</button>
    <span class="egn-topbar-title">${t('eg_vendor_title')}</span>
</div>`;
}

// Assembles the full vendor layout:
// topbar → gold balance → offer card → hint text.
function _egvBuildFullScreenHTML() {
    return `
<div class="egn-hub-layout egv-layout">
    ${_egvBuildTopbarHTML()}
    <div class="egv-body">
        <div class="egv-gold-balance" id="egv-gold-balance"></div>
        <div class="egv-offer-card" id="egv-offer-card">
            <div class="egv-offer-icon">🗺️</div>
            <div class="egv-offer-name">${t('eg_vendor_offer_name')}</div>
            <div class="egv-offer-desc">${t('eg_vendor_offer_desc')}</div>
            <div class="egv-offer-price" id="egv-offer-price"></div>
            <button class="title-btn egv-buy-btn" id="egv-buy-btn"
                    onclick="_egvBuyTierOneMap()">${t('eg_vendor_buy_btn')}</button>
        </div>
        <div class="egv-hint">${t('eg_vendor_hint')}</div>
    </div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------RENDER HELPERS-----------------------------------------
//------------------------------------------------------------------------

function _egvRefreshGoldDisplay() {
    const balanceEl = document.getElementById('egv-gold-balance');
    if (balanceEl) {
        balanceEl.textContent = t('eg_vendor_gold_balance').replace('{n}', egGetGold().toLocaleString());
    }
    const priceEl = document.getElementById('egv-offer-price');
    if (priceEl) {
        priceEl.textContent = t('eg_vendor_price').replace('{n}', EG_VENDOR_T1_MAP_PRICE.toLocaleString());
    }
    // Dim the buy button while the player cannot afford the map.
    const btn = document.getElementById('egv-buy-btn');
    if (btn) btn.classList.toggle('egv-cannot-afford', egGetGold() < EG_VENDOR_T1_MAP_PRICE);
}


//------------------------------------------------------------------------
//-------------------PURCHASE FLOW------------------------------------------
//------------------------------------------------------------------------

// Buys one freshly-rolled Tier 1 map. The map is generated like any other
// drop (rarity + mods rolled from the T1 tables) and placed in the first
// free Probability Gate map stash slot.
function _egvBuyTierOneMap() {
    if (!egSpendGold(EG_VENDOR_T1_MAP_PRICE)) {
        showToast(t('eg_vendor_no_gold').replace('{n}', EG_VENDOR_T1_MAP_PRICE - egGetGold()));
        Audio_Manager.playSFX('player_equip_not_pickup');
        return;
    }

    if (typeof _egLoadHubState === 'function') _egLoadHubState();

    if (!_egMapStashHasFreeSlot()) {
        // Refund so gold is never eaten by a full stash.
        _egAddGold(EG_VENDOR_T1_MAP_PRICE);
        showToast(t('eg_vendor_stash_full'));
        Audio_Manager.playSFX('player_equip_not_pickup');
        return;
    }

    // Tier 1 ≈ monster level 4 (same mapping as _egGenerateMapDrop).
    const map = _egGenerateMapDrop(4, 1);
    _egAddMapToMapStash(map);
    egSaveHubState();

    Audio_Manager.playSFX('player_equip_pickup');
    showToast(t('eg_vendor_bought')
        .replace('{icon}', map.icon || '🗺️')
        .replace('{name}', map.name));

    _egvRefreshGoldDisplay();
}


//------------------------------------------------------------------------
//-------------------STYLES (INJECTED ONCE)---------------------------------
//------------------------------------------------------------------------

function _egvEnsureStyles() {
    // The vendor topbar reuses the Nexus topbar styles.
    if (typeof _egnEnsureStyles === 'function') _egnEnsureStyles();
    if (document.getElementById('egv-vendor-style')) return;

    const style = document.createElement('style');
    style.id = 'egv-vendor-style';
    style.textContent = `
        .egv-body {
            flex-grow: 1; display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 22px;
        }
        .egv-gold-balance {
            font-size: 16px; letter-spacing: 2px; color: #f5d98a;
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 8px; padding: 10px 26px;
        }
        .egv-offer-card {
            width: 320px; min-height: 300px; padding: 28px 24px;
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; gap: 16px; text-align: center;
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 8px;
            box-shadow: 0 0 18px rgba(200, 168, 75, 0.2);
        }
        .egv-offer-icon { font-size: 64px; line-height: 1; }
        .egv-offer-name {
            font-size: 15px; letter-spacing: 2px; color: var(--accent, #c8a84b);
        }
        .egv-offer-desc { font-size: 11px; color: var(--accent2, #ccc); line-height: 1.6; }
        .egv-offer-price {
            font-size: 13px; letter-spacing: 1px; color: #f5d98a;
        }
        .egv-buy-btn {
            font-family: var(--PX, monospace); font-size: 12px; letter-spacing: 2px;
            padding: 12px 30px; cursor: pointer;
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            border: 1px solid var(--accent, #c8a84b); color: var(--accent, #c8a84b);
            transition: all 0.12s;
        }
        .egv-buy-btn:hover {
            box-shadow: 0 0 12px rgba(200, 168, 75, 0.35);
            color: #f5d98a;
        }
        .egv-buy-btn:active { transform: translateY(1px); }
        .egv-buy-btn.egv-cannot-afford {
            opacity: 0.45; border-color: var(--border2, #444); color: var(--accent2, #888);
        }
        .egv-hint {
            font-size: 10px; letter-spacing: 1px; color: rgba(232, 218, 239, 0.55);
            max-width: 420px; text-align: center; line-height: 1.6;
        }
        /* Reuse the Nexus topbar button look for back/buy buttons */
        .egv-layout .egn-topbar { margin-bottom: 0; }
        .egv-layout .egn-topbar .title-btn {
            font-family: var(--PX, monospace); font-size: 10px; letter-spacing: 1px;
            white-space: nowrap;
        }
    `;
    document.head.appendChild(style);
}


//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP----------------------------------------
//------------------------------------------------------------------------

function _egvCreateScreen() {
    _egvEnsureStyles();
    const screen = document.createElement('div');
    screen.id = 'screen-endgame-vendor';
    screen.className = 'screen';
    screen.innerHTML = _egvBuildFullScreenHTML();
    document.body.appendChild(screen);
}

// Entry point — opens the Map Vendor screen.
function showEndgameVendor() {
    if (!document.getElementById('screen-endgame-vendor')) _egvCreateScreen();

    if (typeof switchScreen === 'function') {
        switchScreen('screen-endgame-vendor');
    } else {
        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        document.getElementById('screen-endgame-vendor').style.display = 'block';
    }

    _egvRefreshGoldDisplay();
}
