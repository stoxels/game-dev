// quests-styles.js  —  Injects all Ledger / Quest CSS once on load
//
// No dependencies. Safe to load before the DOM is ready (uses
// document.head.appendChild which works as soon as <head> exists).
//
// If you prefer to keep styles in your main .css file, move the rules
// there and delete this file. Just ensure the selectors listed here are
// present before showQuestLog() is called.
//
// CSS sections inside the injected stylesheet (in order):
//   1. ANIMATIONS
//   2. MODAL CONTAINERS
//   3. LEDGER SUMMARY STRIP
//   4. LEDGER CATEGORY GRID
//   5. LEDGER CATEGORY CARDS
//   6. LEDGER NAVIGATION (back button, category description)
//   7. QUEST / MILESTONE LIST
//   8. QUEST OBJECTIVES
//   9. QUEST REWARDS & CLAIM BUTTON
//  10. TOAST NOTIFICATION

//------------------------------------------------------------------------
//-------------------STYLE INJECTION (MAIN ENTRY POINT)-------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds and appends the <style> tag holding all Ledger/Quest CSS.
// Guarded by the 'quest-styles' id so re-including this script (or
// loading it twice) never double-injects the stylesheet.
(function _injectQuestStyles() {

    if (document.getElementById('quest-styles')) return;

    const style = document.createElement('style');
    style.id = 'quest-styles';
    style.textContent = `

    /*-----------------------------------------------------------------------*/
    /*------------------------------ ANIMATIONS -----------------------------*/
    /*-----------------------------------------------------------------------*/

    /* Shared pulse used by the toolbar badge and the claimable-card dot */
    @keyframes questPulse {
        0%, 100% { opacity: 1;    }
        50%       { opacity: 0.45; }
    }

    /* Shared glow used by claimable cards and claimable quest rows */
    @keyframes questGlow {
        0%, 100% { box-shadow: 0 0 0  0   rgba(243, 156, 18, 0);   }
        50%       { box-shadow: 0 0 8px 2px rgba(243, 156, 18, 0.2); }
    }


    /*-----------------------------------------------------------------------*/
    /*--------------------------- MODAL CONTAINERS --------------------------*/
    /*-----------------------------------------------------------------------*/

    /* Main ledger overview modal */
    .ledger-modal-box {
        width: min(1000px, 96vw);
        max-height: 88vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0;
        padding-bottom: 20px;
    }

    /* Quest log / category drill-down modal */
    .quest-log-box {
        width: min(1000px, 96vw);
        max-height: 86vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0;
        padding-bottom: 16px;
    }


    /*-----------------------------------------------------------------------*/
    /*------------------------- LEDGER SUMMARY STRIP ------------------------*/
    /*-----------------------------------------------------------------------*/

    /* One-liner stats bar shown at the top of the ledger overview */
    .ledger-summary-strip {
        font-family: var(--PX, monospace);
        font-size: 10px;
        color: var(--accent2, #aaa);
        background: rgba(46, 204, 113, 0.06);
        border: 1px solid rgba(46, 204, 113, 0.2);
        padding: 8px 12px;
        margin-bottom: 16px;
        line-height: 1.8;
    }


    /*-----------------------------------------------------------------------*/
    /*------------------------- LEDGER CATEGORY GRID ------------------------*/
    /*-----------------------------------------------------------------------*/

    /* Responsive grid that holds all category cards */
    .ledger-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 8px;
    }


    /*-----------------------------------------------------------------------*/
    /*------------------------- LEDGER CATEGORY CARDS -----------------------*/
    /*-----------------------------------------------------------------------*/

    /* Base card style — clickable, centred content */
    .ledger-card {
        position: relative;
        border: 1px solid var(--border2, #333);
        padding: 12px 10px 10px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        text-align: center;
        transition: border-color 0.18s, background 0.18s;
    }
    .ledger-card:hover {
        border-color: var(--accent, #fff);
        background: rgba(255, 255, 255, 0.03);
    }

    /* State: all milestones in this category are completed */
    .ledger-card-done {
        border-color: #2ecc71;
        opacity: 0.55;
    }

    /* State: at least one milestone is ready to claim */
    .ledger-card-ready {
        border-color: #f39c12;
        background: rgba(243, 156, 18, 0.04);
        animation: questGlow 2s ease-in-out infinite;
    }

    /* Small pulsing dot shown in the top-right corner of claimable cards */
    .ledger-card-dot {
        position: absolute;
        top: 6px;
        right: 7px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #f39c12;
        animation: questPulse 1.2s ease-in-out infinite;
    }

    /* Card sub-elements */
    .ledger-card-icon {
        font-size: 22px;
        line-height: 1;
    }
    .ledger-card-title {
        font-family: var(--PX, monospace);
        font-size: 9px;
        color: var(--accent, #fff);
        letter-spacing: 0.6px;
        line-height: 1.4;
    }
    .ledger-card-sub {
        font-family: var(--PX, monospace);
        font-size: 8px;
        color: var(--accent2, #666);
    }

    /* Thin progress bar at the bottom of each category card */
    .ledger-card-prog-bar {
        width: 100%;
        height: 3px;
        background: var(--border2, #2a2a2a);
        border-radius: 2px;
        overflow: hidden;
        margin-top: 2px;
    }
    .ledger-card-prog-fill {
        height: 100%;
        background: #3498db;
        border-radius: 2px;
        transition: width 0.3s;
    }
    /* Modifier: progress bar turns green when the category is complete */
    .ledger-prog-done {
        background: #2ecc71;
    }

    /* Badge on the toolbar button that shows pending quest count */
    .quest-badge {
        display: inline-block;
        background: #e74c3c;
        color: #fff;
        font-family: var(--PX, monospace);
        font-size: 9px;
        padding: 1px 5px;
        border-radius: 2px;
        margin-left: 4px;
        vertical-align: middle;
        animation: questPulse 1.2s ease-in-out infinite;
    }


    /*-----------------------------------------------------------------------*/
    /*--------- LEDGER NAVIGATION (back button + category description) ------*/
    /*-----------------------------------------------------------------------*/

    /* Back button shown when drilling into a category */
    .ledger-back-btn {
        font-family: var(--PX, monospace);
        font-size: 9px;
        letter-spacing: 1px;
        background: transparent;
        border: 1px solid var(--border2, #333);
        color: var(--accent2, #aaa);
        padding: 6px 12px;
        cursor: pointer;
        align-self: flex-start;
        margin-bottom: 10px;
        transition: border-color 0.15s, color 0.15s;
    }
    .ledger-back-btn:hover {
        border-color: var(--accent, #fff);
        color: var(--accent, #fff);
    }

    /* Italic description blurb shown below the back button */
    .ledger-cat-desc {
        font-family: var(--PX, monospace);
        font-size: 9px;
        font-style: italic;
        color: var(--accent2, #aaa);
        border-left: 2px solid rgba(52, 152, 219, 0.4);
        padding: 6px 10px;
        margin-bottom: 12px;
        line-height: 1.7;
    }


    /*-----------------------------------------------------------------------*/
    /*----------------------- QUEST / MILESTONE LIST ------------------------*/
    /*-----------------------------------------------------------------------*/

    /* Vertical stack that holds all quest rows for a category */
    .quest-list {
        display: flex;
        flex-direction: column;
        gap: 9px;
    }

    /* Individual quest / milestone row */
    .quest-row {
        border: 1px solid var(--border2, #333);
        padding: 12px 13px;
        display: flex;
        flex-direction: column;
        gap: 7px;
    }

    /* State modifiers for quest rows */
    .quest-row.quest-done {
        border-color: #2ecc71;
        opacity: 0.6;
    }
    .quest-row.quest-claimable {
        border-color: #f39c12;
        background: rgba(243, 156, 18, 0.05);
        animation: questGlow 2s ease-in-out infinite;
    }

    /* Header row inside each quest row: title block + status label */
    .quest-row-header {
        display: flex;
        align-items: flex-start;
        gap: 10px;
    }
    .quest-title-block {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .quest-title {
        font-family: var(--PX, monospace);
        font-size: 11px;
        color: var(--accent, #fff);
        letter-spacing: 1px;
    }

    /* Status label — top-right corner of each quest row */
    .quest-status-label {
        font-family: var(--PX, monospace);
        font-size: 9px;
        color: var(--accent2, #aaa);
        white-space: nowrap;
        flex-shrink: 0;
    }
    .quest-claimable .quest-status-label { color: #f39c12; }
    .quest-done      .quest-status-label { color: #2ecc71; }


    /*-----------------------------------------------------------------------*/
    /*--------------------------- QUEST OBJECTIVES --------------------------*/
    /*-----------------------------------------------------------------------*/

    /* Container for all objectives within a single quest row */
    .quest-objectives {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    /* Single objective: label + count on top, progress bar below */
    .quest-obj {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .quest-obj-top {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 6px;
    }
    .quest-obj-label {
        font-family: var(--PX, monospace);
        font-size: 9px;
        color: var(--accent2, #aaa);
    }
    .quest-obj-count {
        font-family: var(--PX, monospace);
        font-size: 8px;
        color: #555;
        white-space: nowrap;
    }

    /* State: objective is fully complete */
    .quest-obj-done .quest-obj-label { color: #2ecc71; }
    .quest-obj-done .quest-obj-count { color: #2ecc71; }

    /* Thin progress bar beneath each objective label */
    .quest-prog-bar {
        height: 3px;
        width: 100%;
        background: var(--border2, #2a2a2a);
        border-radius: 2px;
        overflow: hidden;
    }
    .quest-prog-fill {
        height: 100%;
        background: #3498db;
        border-radius: 2px;
        transition: width 0.3s;
    }
    /* Modifier: progress bar turns green when the objective is complete */
    .quest-prog-done {
        background: #2ecc71;
    }


    /*-----------------------------------------------------------------------*/
    /*-------------------- QUEST REWARDS & CLAIM BUTTON --------------------*/
    /*-----------------------------------------------------------------------*/

    /* Flex row holding the reward chips on the left, claim button on the right */
    .quest-reward-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    /* Reward chip container */
    .quest-rewards {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        flex: 1;
    }

    /* Chip variant: point reward (green) */
    .quest-reward-pt {
        font-family: var(--PX, monospace);
        font-size: 9px;
        color: #2ecc71;
        background: rgba(46, 204, 113, 0.10);
        border: 1px solid rgba(46, 204, 113, 0.28);
        padding: 2px 7px;
    }

    /* Chip variant: item reward (orange) */
    .quest-reward-item {
        font-family: var(--PX, monospace);
        font-size: 9px;
        color: #f39c12;
        background: rgba(243, 156, 18, 0.09);
        border: 1px solid rgba(243, 156, 18, 0.28);
        padding: 2px 7px;
    }

    /* Claim button — shown when the quest is claimable */
    .quest-claim-btn {
        font-family: var(--PX, monospace);
        font-size: 9px;
        letter-spacing: 1px;
        padding: 5px 13px;
        border: 1px solid #f39c12;
        background: rgba(243, 156, 18, 0.10);
        color: #f39c12;
        cursor: pointer;
        flex-shrink: 0;
        transition: background 0.15s;
    }
    .quest-claim-btn:hover {
        background: rgba(243, 156, 18, 0.24);
    }

    /* State: reward already claimed — button turns green and is non-interactive */
    .quest-claimed-btn {
        border-color: #2ecc71;
        background: rgba(46, 204, 113, 0.07);
        color: #2ecc71;
        cursor: default;
    }
    .quest-claimed-btn:hover {
        background: rgba(46, 204, 113, 0.07);
    }


    /*-----------------------------------------------------------------------*/
    /*------------------------- TOAST NOTIFICATION --------------------------*/
    /*-----------------------------------------------------------------------*/



    `;

    document.head.appendChild(style);

})();