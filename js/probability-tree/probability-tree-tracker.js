import { isCombatLevel } from '../mouse-button-handlers.js';
import { t } from '../translation/translations.js';
import { _getBayesianBonus } from './probability-tree-special-nodes-logic.js';
import { ptHasSkill } from './probability-tree-state-points.js';
import { cur } from '../state.js';
import { STORAGE_KEY_POS, _clamp, PANEL_MIN_WIDTH, PANEL_MIN_HEIGHT, _toPercent, _formatSeconds, PANEL_DEFAULT_BOTTOM_OFFSET, PANEL_DEFAULT_LEFT, _state, INTERVAL_RANDOM_WALK, _getPoissonInterval, INTERVAL_TIMED_STASIS, INTERVAL_LOLN } from './probability-tree-tracker-state.js';
import { _getActiveRows } from './probability-tree-tracker-rows.js';
// probability-tree-tracker.js
// Passive Tree Effect Tracker Panel
// Shows live countdowns, fill counters, stacked bonuses, and summaries
// for all active passive-tree effects during gameplay.
// Rendered as a floating, draggable panel - position is persisted in localStorage.

'use strict';

export const PassiveTracker = (() => {

    // Reference to the root panel DOM element. Null when panel is not built.
    let _panel = null;

    // Whether the panel body is currently expanded (true) or collapsed (false).
    let _visible = true;

    //------------------------------------------------------------------------
    //-------------------POSITION PERSISTENCE---------------------------------
    //------------------------------------------------------------------------

    // Saves the panel's current pixel position to localStorage.
    function _savePosition(x, y) {
        try {
            localStorage.setItem(STORAGE_KEY_POS, JSON.stringify({ x, y }));
        } catch (_) { /* storage unavailable - silently ignore */ }
    }

    // Loads the saved position from localStorage and clamps it to the current
    // viewport. Returns null if no position was saved or parsing fails.
    function _loadPosition() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_POS);
            if (!raw) return null;
            const p = JSON.parse(raw);
            return {
                x: _clamp(p.x, 0, window.innerWidth - PANEL_MIN_WIDTH),
                y: _clamp(p.y, 0, window.innerHeight - PANEL_MIN_HEIGHT),
            };
        } catch (_) {
            return null;
        }
    }

    //------------------------------------------------------------------------
    //-------------------DRAG BEHAVIOUR---------------------------------------
    //------------------------------------------------------------------------

    // Calculates the clamped new top-left position while dragging, keeping the
    // panel fully within the viewport.
    function _clampDragPosition(mouseX, mouseY, offsetX, offsetY, panelWidth, panelHeight) {
        return {
            x: _clamp(mouseX - offsetX, 0, window.innerWidth - panelWidth),
            y: _clamp(mouseY - offsetY, 0, window.innerHeight - panelHeight),
        };
    }

    // Attaches mousedown / mousemove / mouseup listeners to make the given
    // panel element draggable by its header bar.
    // Position is saved to localStorage whenever a drag ends.
    function _makeDraggable(panelEl) {
        let isDragging = false;
        let mouseOffsetX = 0;
        let mouseOffsetY = 0;

        const header = panelEl.querySelector('.pt-tracker-header');
        header.style.cursor = 'grab';

        header.addEventListener('mousedown', e => {
            // Ignore clicks on the collapse button so it doesn't initiate a drag.
            if (e.target.closest('.pt-tracker-collapse')) return;

            isDragging = true;
            const rect = panelEl.getBoundingClientRect();
            mouseOffsetX = e.clientX - rect.left;
            mouseOffsetY = e.clientY - rect.top;
            header.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', e => {
            if (!isDragging) return;
            const pos = _clampDragPosition(
                e.clientX, e.clientY,
                mouseOffsetX, mouseOffsetY,
                panelEl.offsetWidth, panelEl.offsetHeight
            );
            panelEl.style.left = pos.x + 'px';
            panelEl.style.top = pos.y + 'px';
            panelEl.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            header.style.cursor = 'grab';
            _savePosition(parseFloat(panelEl.style.left), parseFloat(panelEl.style.top));
        });
    }

    //------------------------------------------------------------------------
    //-------------------TOOLTIP HELPERS--------------------------------------
    //------------------------------------------------------------------------

    // Positions the floating tooltip element next to the hovered row.
    // Prefers placing the tooltip to the right; flips left if it would clip.
    function _positionTooltip(tipEl, anchorEl) {
        const anchorRect = anchorEl.getBoundingClientRect();

        // Reset first so offsetWidth/Height are accurate before repositioning.
        tipEl.style.left = '0px';
        tipEl.style.top = '0px';

        const tipW = tipEl.offsetWidth || 260;
        const tipH = tipEl.offsetHeight || 80;

        let left = anchorRect.right + 10;
        let top = anchorRect.top + anchorRect.height / 2 - tipH / 2;

        // Flip to the left side of the panel if the tooltip would overflow the right edge.
        if (left + tipW > window.innerWidth - 8) left = anchorRect.left - tipW - 10;

        // Clamp vertically so the tooltip never goes off screen.
        top = _clamp(top, 6, window.innerHeight - tipH - 6);

        tipEl.style.left = `${left}px`;
        tipEl.style.top = `${top}px`;
    }

    // Ensures the singleton tooltip element exists in the DOM.
    // Creates it the first time this is called.
    function _ensureTooltipElement() {
        let tip = document.getElementById('pt-tracker-tooltip');
        if (!tip) {
            tip = document.createElement('div');
            tip.id = 'pt-tracker-tooltip';
            tip.className = 'pt-tracker-tooltip';
            document.body.appendChild(tip);
        }
        return tip;
    }

    // Attaches hover listeners to the panel that show / hide / reposition
    // the tooltip when the user mouses over a tracker row.
    function _bindTooltipListeners() {
        if (!_panel) return;
        const tipEl = document.getElementById('pt-tracker-tooltip');
        if (!tipEl) return;

        // Show tooltip when entering any row inside the panel.
        _panel.addEventListener('mouseenter', e => {
            const rowEl = e.target.closest('.pt-tracker-row');
            if (!rowEl) return;

            const rowDef = _getActiveRows().find(r => r.id === rowEl.dataset.id);
            if (!rowDef) return;

            tipEl.innerHTML = `
                <div class="pt-tip-title">${rowDef.icon} ${rowDef.label}</div>
                <div class="pt-tip-body">${rowDef.tooltip}</div>
            `;
            tipEl.classList.add('visible');
            _positionTooltip(tipEl, rowEl);
        }, true);

        // Reposition while the mouse moves within the panel.
        _panel.addEventListener('mousemove', e => {
            const rowEl = e.target.closest('.pt-tracker-row');
            if (rowEl && tipEl.classList.contains('visible')) {
                _positionTooltip(tipEl, rowEl);
            }
        }, true);

        // Hide tooltip when the mouse leaves the panel entirely.
        _panel.addEventListener('mouseleave', () => {
            tipEl.classList.remove('visible');
        }, true);
    }

    //------------------------------------------------------------------------
    //-------------------ROW BUILDERS (DOM)-----------------------------------
    //------------------------------------------------------------------------

    // Builds and returns a bar widget (progress bar + text label) used by
    // both countdown and fill_counter row types.
    // barModifierClass: optional extra CSS class added to the bar element.
    function _buildBarWidget(color, barModifierClass) {
        const barWrap = document.createElement('div');
        barWrap.className = 'pt-tracker-bar-wrap';

        const bar = document.createElement('div');
        bar.className = 'pt-tracker-bar' + (barModifierClass ? ' ' + barModifierClass : '');
        bar.style.setProperty('--bar-color', color || '#6dbf40');

        const fill = document.createElement('div');
        fill.className = 'pt-tracker-bar-fill';

        const label = document.createElement('span');
        label.className = 'pt-tracker-bar-label';

        bar.appendChild(fill);
        barWrap.appendChild(bar);
        barWrap.appendChild(label);

        return barWrap;
    }

    // Builds the DOM for a countdown-style row (depleting bar + time label).
    function _buildCountdownRowContent(rowEl, rowDef) {
        const barWrap = _buildBarWidget(rowDef.color);
        const fill = barWrap.querySelector('.pt-tracker-bar-fill');
        const label = barWrap.querySelector('.pt-tracker-bar-label');

        // Countdown bars deplete from full toward empty, so invert the ratio.
        const pct = _toPercent(rowDef.max - rowDef.current, rowDef.max);
        fill.style.width = `${pct}%`;
        label.textContent = _formatSeconds(rowDef.current);

        rowEl.appendChild(barWrap);
    }

    // Builds the DOM for a fill_counter-style row (filling bar + count label).
    function _buildFillCounterRowContent(rowEl, rowDef) {
        const barWrap = _buildBarWidget(rowDef.color, 'pt-tracker-bar--fills');
        const fill = barWrap.querySelector('.pt-tracker-bar-fill');
        const label = barWrap.querySelector('.pt-tracker-bar-label');

        fill.style.width = `${_toPercent(rowDef.current, rowDef.max)}%`;
        label.textContent = rowDef.showCount
            ? `${rowDef.current}`
            : `${rowDef.current}/${rowDef.max}`;

        rowEl.appendChild(barWrap);
    }

    // Builds the DOM for a stacked_bonus-style row (plain colored value text).
    function _buildStackedBonusRowContent(rowEl, rowDef) {
        const valueEl = document.createElement('span');
        valueEl.className = 'pt-tracker-value';
        valueEl.style.color = rowDef.color || '#d4b870';
        valueEl.textContent = `${rowDef.current}${rowDef.unit || ''}`;
        rowEl.appendChild(valueEl);
    }

    // Builds the DOM for a summary-style row (colored dot indicator, no bar).
    function _buildSummaryRowContent(rowEl, rowDef) {
        const dotEl = document.createElement('span');
        dotEl.className = 'pt-tracker-dot';
        dotEl.style.background = rowDef.color || '#6dbf40';

        // The dot is inserted before the icon so it appears at the far left.
        const iconEl = rowEl.querySelector('.pt-tracker-icon');
        rowEl.insertBefore(dotEl, iconEl);
    }

    // Constructs a complete row element from a row definition object.
    // Each row type gets its own content layout appended after the icon and label.
    function _buildRowElement(rowDef) {
        const rowEl = document.createElement('div');
        rowEl.className = 'pt-tracker-row';
        rowEl.dataset.id = rowDef.id;
        if (rowDef.warn) rowEl.classList.add('pt-tracker-row--warn');

        const iconEl = document.createElement('span');
        iconEl.className = 'pt-tracker-icon';
        iconEl.textContent = rowDef.icon;

        const labelEl = document.createElement('span');
        labelEl.className = 'pt-tracker-label';
        labelEl.textContent = rowDef.label;

        rowEl.appendChild(iconEl);
        rowEl.appendChild(labelEl);

        switch (rowDef.type) {
            case 'countdown': _buildCountdownRowContent(rowEl, rowDef); break;
            case 'fill_counter': _buildFillCounterRowContent(rowEl, rowDef); break;
            case 'stacked_bonus': _buildStackedBonusRowContent(rowEl, rowDef); break;
            case 'summary': _buildSummaryRowContent(rowEl, rowDef); break;
        }

        return rowEl;
    }

    //------------------------------------------------------------------------
    //-------------------PANEL BUILDER----------------------------------------
    //------------------------------------------------------------------------

    // Creates the header DOM element including the collapse button and its
    // click handler that toggles the panel body visibility.
    function _buildPanelHeader() {
        const header = document.createElement('div');
        header.className = 'pt-tracker-header';
        header.innerHTML = `
            <span class="pt-tracker-title">${t('pt_tracker_title')}</span>
            <button class="pt-tracker-collapse" data-tip-t="pt_tracker_toggle" aria-label="${t('pt_tracker_toggle')}">−</button>
        `;

        header.querySelector('.pt-tracker-collapse').addEventListener('click', () => {
            _visible = !_visible;
            const bodyEl = _panel.querySelector('.pt-tracker-body');
            const collapseBtn = header.querySelector('.pt-tracker-collapse');
            bodyEl.style.display = _visible ? '' : 'none';
            collapseBtn.textContent = _visible ? '−' : '+';
            _panel.classList.toggle('pt-tracker-collapsed', !_visible);
        });

        return header;
    }

    // Applies the panel's initial position: restores saved position if available,
    // otherwise falls back to the default bottom-left location.
    function _applyInitialPanelPosition(panelEl) {
        const savedPos = _loadPosition();
        if (savedPos) {
            panelEl.style.left = savedPos.x + 'px';
            panelEl.style.top = savedPos.y + 'px';
            panelEl.style.bottom = 'auto';
        } else {
            const defaultTop = Math.max(20, window.innerHeight - PANEL_DEFAULT_BOTTOM_OFFSET);
            panelEl.style.left = PANEL_DEFAULT_LEFT + 'px';
            panelEl.style.top = defaultTop + 'px';
            panelEl.style.bottom = 'auto';
        }
    }

    // Inserts the finished panel into the game DOM.
    // Prefers '.game-main', falls back to document.body.
    function _attachPanelToDOM(panelEl) {
        const gameMain = document.querySelector('.game-main');
        if (gameMain) {
            gameMain.appendChild(panelEl);
        } else {
            document.body.appendChild(panelEl);
        }
    }

    // Returns true when the passive tracker should be hidden because the
    // player is on an endgame map and the hide-passive setting is enabled.
    function _shouldHideForEndgame() {
        try {
            if (typeof globalThis.SETTINGS === 'undefined' || !globalThis.SETTINGS.hidePassiveTrackerInEndgame) return false;
            if (typeof globalThis._isActive === 'function' && globalThis._isActive()) return true;
            if (typeof isCombatLevel === 'function' && isCombatLevel()) return true;
            if (typeof cur !== 'undefined' && cur && cur.isMonsterLevel) return true;
            return false;
        } catch (_) { return false; }
    }

    // Main panel assembly function.
    // Tears down any existing panel, gathers all active row definitions,
    // then builds header + body + rows and inserts the result into the game.
    function _buildPanel() {
        // Hide during endgame if the setting is enabled
        if (_shouldHideForEndgame()) {
            const existingHide = document.getElementById('pt-tracker-panel');
            if (existingHide) existingHide.remove();
            _panel = null;
            return;
        }
        // Remove any previously built panel before rebuilding.
        const existing = document.getElementById('pt-tracker-panel');
        if (existing) existing.remove();

        const rows = _getActiveRows();
        if (rows.length === 0) return;  // Nothing to show - skip building.

        _panel = document.createElement('div');
        _panel.id = 'pt-tracker-panel';
        _panel.className = 'pt-tracker-panel';

        const header = _buildPanelHeader();
        _panel.appendChild(header);

        const body = document.createElement('div');
        body.className = 'pt-tracker-body';
        rows.forEach(rowDef => body.appendChild(_buildRowElement(rowDef)));
        _panel.appendChild(body);

        _applyInitialPanelPosition(_panel);
        _makeDraggable(_panel);

        _ensureTooltipElement();
        _attachPanelToDOM(_panel);
        _bindTooltipListeners();
    }

    //------------------------------------------------------------------------
    //-------------------UPDATE: LIVE ROW REFRESH-----------------------------
    //------------------------------------------------------------------------

    // Updates the bar fill width and label for a countdown or fill_counter row
    // without rebuilding the entire DOM element.
    function _updateBarRow(rowEl, rowDef) {
        const fillEl = rowEl.querySelector('.pt-tracker-bar-fill');
        const labelEl = rowEl.querySelector('.pt-tracker-bar-label');

        if (rowDef.type === 'countdown') {
            const pct = _toPercent(rowDef.max - rowDef.current, rowDef.max);
            if (fillEl) fillEl.style.width = `${pct}%`;
            if (labelEl) labelEl.textContent = _formatSeconds(rowDef.current);

        } else if (rowDef.type === 'fill_counter') {
            const pct = _toPercent(rowDef.current, rowDef.max);
            if (fillEl) fillEl.style.width = `${pct}%`;
            if (labelEl) {
                labelEl.textContent = rowDef.showCount
                    ? `${rowDef.current}`
                    : `${rowDef.current}/${rowDef.max}`;
            }
        }
    }

    // Updates the text value displayed for a stacked_bonus row.
    function _updateStackedBonusRow(rowEl, rowDef) {
        const valueEl = rowEl.querySelector('.pt-tracker-value');
        if (valueEl) valueEl.textContent = `${rowDef.current}${rowDef.unit || ''}`;
    }

    // Handles the special dynamic colour and warn-state for the Overfitting
    // keystone, which flips its appearance based on its current phase.
    function _updateOverfittingRow(rowEl, rowDef) {
        const labelEl = rowEl.querySelector('.pt-tracker-label');
        const dotEl = rowEl.querySelector('.pt-tracker-dot');

        if (labelEl) {
            labelEl.textContent = rowDef.label;
            labelEl.style.color = rowDef.color;
        }
        if (dotEl) dotEl.style.background = rowDef.color;

        rowEl.classList.toggle('pt-tracker-row--warn', !!rowDef.warn);
    }

    // Dispatches a single row's live data to the correct per-type update helper.
    function _updateSingleRow(rowEl, rowDef) {
        switch (rowDef.type) {
            case 'countdown':
            case 'fill_counter':
                _updateBarRow(rowEl, rowDef);
                break;
            case 'stacked_bonus':
                _updateStackedBonusRow(rowEl, rowDef);
                break;
        }

        // Overfitting gets extra treatment on top of its base type update
        // because its color and warn class can change at runtime.
        if (rowDef.id === 'overfitting') {
            _updateOverfittingRow(rowEl, rowDef);
        }
    }

    // Refreshes every visible row with the latest values from _state.
    // Called every second from onTimerTick() and after every game event.
    function _updatePanel() {
        if (_shouldHideForEndgame()) {
            if (_panel) destroy();
            return;
        }
        if (!_panel) return;
        _getActiveRows().forEach(rowDef => {
            const rowEl = _panel.querySelector(`.pt-tracker-row[data-id="${rowDef.id}"]`);
            if (rowEl) _updateSingleRow(rowEl, rowDef);
        });
    }

    // Re-evaluates whether the panel should be visible and builds/destroys accordingly.
    // Called when the hide-passive setting changes or when entering/leaving endgame.
    function refreshVisibility() {
        if (_shouldHideForEndgame()) {
            if (_panel) destroy();
            return;
        }
        // If setting disabled and we have rows but no panel, rebuild.
        if (!_panel && _getActiveRows().length > 0) {
            _buildPanel();
        }
    }

    //------------------------------------------------------------------------
    //-------------------FLASH EFFECT-----------------------------------------
    //------------------------------------------------------------------------

    // Briefly flashes a row to signal that it just triggered.
    // The CSS class pt-tracker-row--flash handles the actual animation.
    function _flashRow(rowId) {
        if (!_panel) return;
        const rowEl = _panel.querySelector(`.pt-tracker-row[data-id="${rowId}"]`);
        if (!rowEl) return;

        // Remove the class first, force a reflow, then re-add to restart the animation.
        rowEl.classList.remove('pt-tracker-row--flash');
        void rowEl.offsetWidth;
        rowEl.classList.add('pt-tracker-row--flash');
        setTimeout(() => rowEl.classList.remove('pt-tracker-row--flash'), 1000);
    }

    //------------------------------------------------------------------------
    //-------------------TIMER TICK: COUNTDOWN UPDATES-----------------------
    //------------------------------------------------------------------------

    // Decrements a single countdown timer by 1 second. When it reaches 0 it
    // resets to its full interval and fires a flash on the corresponding row.
    function _tickCountdown(stateKey, resetInterval, rowId) {
        _state[stateKey] = Math.max(0, _state[stateKey] - 1);
        if (_state[stateKey] === 0) {
            _state[stateKey] = resetInterval;
            _flashRow(rowId);
        }
    }

    // Advances all active countdown timers by one second.
    // Called once per second from onTimerTick().
    function _tickAllCountdowns() {
        if (ptHasSkill('keystone_random_walk')) {
            _tickCountdown('randomWalkTimer', INTERVAL_RANDOM_WALK, 'random_walk');
        }
        if (ptHasSkill('poisson_process_1')) {
            _tickCountdown('poissonTimer', _getPoissonInterval(), 'poisson');
        }
        if (ptHasSkill('timed_stasis_1')) {
            _tickCountdown('timedStasisTimer', INTERVAL_TIMED_STASIS, 'timed_stasis');
        }
        if (ptHasSkill('keystone_law_of_large_numbers')) {
            _tickCountdown('lawOfLargeNumbersTimer', INTERVAL_LOLN, 'loln');
        }
    }

    // Pulls live values from game-side globals / functions into _state so the
    // panel always reflects the most current data.
    function _syncExternalState() {
        // Bayesian bonus is owned by the game module; read it via its getter.
        if (typeof _getBayesianBonus === 'function') {
            _state.bayesianBonus = Math.round(_getBayesianBonus() * 100);
        }
        // Asymptotic line count is stored as a window global by the game.
        _state.asymptoticReductions = window._asymptoticLinesCompleted || 0;
    }

    //------------------------------------------------------------------------
    //-------------------PUBLIC API: LIFECYCLE--------------------------------
    //------------------------------------------------------------------------

    // Resets all tracked state to its level-start values and builds the panel.
    // Call this once when a new level begins.
    function init() {
        const poissonInterval = _getPoissonInterval();

        _state.randomWalkTimer = INTERVAL_RANDOM_WALK;
        _state.poissonTimer = poissonInterval;
        _state.poissonInterval = poissonInterval;
        _state.timedStasisTimer = INTERVAL_TIMED_STASIS;
        _state.lawOfLargeNumbersTimer = INTERVAL_LOLN;
        _state.binomialBurstFills = 0;
        _state.streakBonusFills = 0;
        _state.sampleEffFills = 0;
        _state.gamblersFills = 0;
        _state.bayesianBonus = 0;
        _state.asymptoticReductions = 0;
        _state.errorFeedbackMistakes = 0;
        _visible = true;

        _buildPanel();
    }

    // Removes the panel and the tooltip singleton from the DOM.
    // Call this when leaving a level or navigating away from gameplay.
    function destroy() {
        const panelEl = document.getElementById('pt-tracker-panel');
        if (panelEl) panelEl.remove();
        _panel = null;

        const tipEl = document.getElementById('pt-tracker-tooltip');
        if (tipEl) tipEl.remove();
    }

    //------------------------------------------------------------------------
    //-------------------PUBLIC API: TIMER TICK-------------------------------
    //------------------------------------------------------------------------

    // Main heartbeat - call this every second from the game timer.
    // Advances all countdown timers, syncs external state, and redraws rows.
    function onTimerTick() {
        _tickAllCountdowns();
        _syncExternalState();
        _updatePanel();
    }

    //------------------------------------------------------------------------
    //-------------------PUBLIC API: GAME EVENT HOOKS------------------------
    //------------------------------------------------------------------------
    // These are called from game.js whenever the corresponding player actions
    // or automatic game events occur. They update internal counters and
    // immediately refresh the panel display.

    // Player filled a correct cell.
    function onCorrectFill() {
        _state.binomialBurstFills++;
        _state.streakBonusFills++;
        _state.sampleEffFills++;
        _state.gamblersFills++;
        _updatePanel();
    }

    // Player made a mistake.
    function onMistake() {
        _state.streakBonusFills = 0;
        _state.sampleEffFills = 0;
        _state.errorFeedbackMistakes++;
        // Note: bayesianBonus is not reset here; it auto-syncs via _syncExternalState.
        _updatePanel();
    }

    // Streak was reset externally (e.g. by a game mechanic other than a direct mistake).
    function onStreakReset() {
        _state.streakBonusFills = 0;
        _state.sampleEffFills = 0;
        _updatePanel();
    }

    // Binomial Burst passive triggered - reset the fill counter and flash the row.
    function onBinomialTrigger() {
        _state.binomialBurstFills = 0;
        _flashRow('binomial');
        _updatePanel();
    }

    // Streak Bonus (Focused Momentum) triggered - reset streak counter and flash.
    function onStreakBonusTrigger() {
        _state.streakBonusFills = 0;
        _flashRow('streak');
        _updatePanel();
    }

    // Sample Efficiency triggered - reset consecutive-fill counter and flash.
    function onSampleEffTrigger() {
        _state.sampleEffFills = 0;
        _flashRow('sample_eff');
        _updatePanel();
    }

    // Bayesian Adjustment triggered - zero out the stacked bonus and flash.
    function onBayesianTrigger() {
        _state.bayesianBonus = 0;
        _flashRow('bayesian');
        _updatePanel();
    }

    //------------------------------------------------------------------------
    //-------------------EXPORTS----------------------------------------------
    //------------------------------------------------------------------------

    return {
        // Lifecycle
        init,
        destroy,
        refreshVisibility,
        // Timer heartbeat
        onTimerTick,
        // Game event hooks
        onCorrectFill,
        onMistake,
        onStreakReset,
        onBinomialTrigger,
        onStreakBonusTrigger,
        onSampleEffTrigger,
        onBayesianTrigger,
    };

})();
