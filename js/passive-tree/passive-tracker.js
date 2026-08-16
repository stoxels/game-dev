// passive-tracker.js
// Passive Tree Effect Tracker Panel
// Shows live countdowns, fill counters, stacked bonuses, and summaries
// for all active passive-tree effects during gameplay.
// Rendered as a floating, draggable panel — position is persisted in localStorage.

'use strict';

const PassiveTracker = (() => {

    //------------------------------------------------------------------------
    //-------------------CONSTANTS & CONFIGURATION----------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Default intervals (in seconds) used to initialise timers at level start.
    // These match the values defined in the passive skill tree.
    const INTERVAL_RANDOM_WALK = 30;
    const INTERVAL_POISSON_SLOW = 120;   // poisson_process_1 only
    const INTERVAL_POISSON_MED = 90;    // poisson_process_2
    const INTERVAL_POISSON_FAST = 60;    // poisson_process_3
    const INTERVAL_TIMED_STASIS = 600;   // 10 minutes
    const INTERVAL_LOLN = 300;   // Law of Large Numbers, 5 minutes

    // Panel default spawn position (pixels from top-left).
    // The panel will be placed higher than the very bottom edge.
    const PANEL_DEFAULT_LEFT = 20;
    const PANEL_DEFAULT_BOTTOM_OFFSET = 400;  // window.innerHeight - this value

    // localStorage key used to persist the panel's drag position.
    const STORAGE_KEY_POS = 'pt_tracker_pos';

    // Minimum panel size assumed when clamping saved position to viewport.
    const PANEL_MIN_WIDTH = 240;
    const PANEL_MIN_HEIGHT = 80;

    //------------------------------------------------------------------------
    //-------------------MODULE STATE-----------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Reference to the root panel DOM element. Null when panel is not built.
    let _panel = null;

    // Whether the panel body is currently expanded (true) or collapsed (false).
    let _visible = true;

    // Per-level runtime counters. These are reset on each call to init() and
    // updated by the public event hooks (onCorrectFill, onMistake, etc.).
    const _state = {
        // Countdown timers — seconds remaining until the next automatic trigger.
        randomWalkTimer: 0,
        poissonTimer: 0,
        timedStasisTimer: 0,
        lawOfLargeNumbersTimer: 0,

        // Fill counters — cumulative or streak counts that drive passive effects.
        binomialBurstFills: 0,   // total correct fills; checked mod 10 for burst
        streakBonusFills: 0,   // consecutive correct fills; resets on mistake
        sampleEffFills: 0,   // consecutive correct fills; resets on mistake
        gamblersFills: 0,   // total correct fills since level start
        errorFeedbackMistakes: 0, // total mistakes; checked mod threshold

        // Stacked bonuses — accumulate over time and reset when they trigger.
        bayesianBonus: 0,   // current stacked bayesian bonus percentage
        asymptoticReductions: 0,  // completed lines count (synced from window global)

        // Cached interval for poisson, computed from which tier is active.
        poissonInterval: INTERVAL_POISSON_SLOW,
    };

    //------------------------------------------------------------------------
    //-------------------UTILITY HELPERS--------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Formats a raw second count into a human-readable string.
    // Values under 60 seconds: "42s". Values 60+: "1:05".
    function _formatSeconds(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return minutes > 0
            ? `${minutes}:${String(seconds).padStart(2, '0')}`
            : `${seconds}s`;
    }

    // Clamps a number between min and max (inclusive).
    function _clamp(value, min, max) {
        return Math.max(min, Math.min(value, max));
    }

    // Converts a current/max pair to a 0–100 percentage, safe against max=0.
    function _toPercent(current, max) {
        return max > 0 ? _clamp((current / max) * 100, 0, 100) : 0;
    }

    // Returns the correct Poisson interval based on which tier is unlocked.
    function _getPoissonInterval() {
        if (ptHasSkill('poisson_process_3')) return INTERVAL_POISSON_FAST;
        if (ptHasSkill('poisson_process_2')) return INTERVAL_POISSON_MED;
        return INTERVAL_POISSON_SLOW;
    }

    //------------------------------------------------------------------------
    //-------------------POSITION PERSISTENCE---------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Saves the panel's current pixel position to localStorage.
    function _savePosition(x, y) {
        try {
            localStorage.setItem(STORAGE_KEY_POS, JSON.stringify({ x, y }));
        } catch (_) { /* storage unavailable — silently ignore */ }
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
    //------------------------------------------------------------------------

    // Creates the header DOM element including the collapse button and its
    // click handler that toggles the panel body visibility.
    function _buildPanelHeader() {
        const header = document.createElement('div');
        header.className = 'pt-tracker-header';
        header.innerHTML = `
            <span class="pt-tracker-title">🌿 PASSIVES</span>
            <button class="pt-tracker-collapse" title="Toggle panel">−</button>
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

    // Main panel assembly function.
    // Tears down any existing panel, gathers all active row definitions,
    // then builds header + body + rows and inserts the result into the game.
    function _buildPanel() {
        // Remove any previously built panel before rebuilding.
        const existing = document.getElementById('pt-tracker-panel');
        if (existing) existing.remove();

        const rows = _getActiveRows();
        if (rows.length === 0) return;  // Nothing to show — skip building.

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
        if (!_panel) return;
        _getActiveRows().forEach(rowDef => {
            const rowEl = _panel.querySelector(`.pt-tracker-row[data-id="${rowDef.id}"]`);
            if (rowEl) _updateSingleRow(rowEl, rowDef);
        });
    }

    //------------------------------------------------------------------------
    //-------------------FLASH EFFECT-----------------------------------------
    //------------------------------------------------------------------------
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
    //-------------------ROW DEFINITIONS: COUNTDOWN TIMERS-------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Each function below returns a row definition object if the relevant
    // passive(s) are active, or null if not. The caller filters out nulls.

    function _getRowRandomWalk() {
        if (!ptHasSkill('keystone_random_walk')) return null;
        return {
            id: 'random_walk',
            icon: '🚶',
            label: 'Random Walk',
            type: 'countdown',
            current: _state.randomWalkTimer,
            max: INTERVAL_RANDOM_WALK,
            tooltip: 'Every 30 seconds, 1 random unfilled cell is automatically filled or marked. <span class="tip-warn">⚠ Level fails on 2 mistakes!</span>',
            color: '#e8a020',
        };
    }

    function _getRowPoissonProcess() {
        if (!ptHasSkill('poisson_process_1')) return null;
        const interval = _getPoissonInterval();
        return {
            id: 'poisson',
            icon: '⚗️',
            label: 'Poisson Process',
            type: 'countdown',
            current: _state.poissonTimer,
            max: interval,
            tooltip: `Every <b>${interval}s</b> a random incorrect empty cell is automatically marked ✕.`,
            color: '#66fcf1',
        };
    }

    function _getRowTimedStasis() {
        if (!ptHasSkill('timed_stasis_1')) return null;
        let duration = 1;
        if (ptHasSkill('timed_stasis_2')) duration += 0.5;
        if (ptHasSkill('timed_stasis_3')) duration += 0.5;
        return {
            id: 'timed_stasis',
            icon: '⏸️',
            label: 'Timed Stasis',
            type: 'countdown',
            current: _state.timedStasisTimer,
            max: INTERVAL_TIMED_STASIS,
            tooltip: `Every 10 minutes the level freezes for <b>${duration}s</b>.`,
            color: '#a0c8ff',
        };
    }

    function _getRowLawOfLargeNumbers() {
        if (!ptHasSkill('keystone_law_of_large_numbers')) return null;
        return {
            id: 'loln',
            icon: '📉',
            label: 'Law of Large Numbers',
            type: 'countdown',
            current: _state.lawOfLargeNumbersTimer,
            max: INTERVAL_LOLN,
            tooltip: 'Every 5 minutes, auto-reveals 1 row and column with &lt;2 filled cells. <span class="tip-mute">Does not fire in last 15 min.</span>',
            color: '#c8a0ff',
        };
    }

    //------------------------------------------------------------------------
    //-------------------ROW DEFINITIONS: FILL COUNTERS----------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    function _getRowBinomialBurst() {
        if (!ptHasSkill('binomial_burst_1')) return null;
        let chance = 20;
        if (ptHasSkill('binomial_burst_2')) chance += 10;
        if (ptHasSkill('binomial_burst_3')) chance += 20;
        return {
            id: 'binomial',
            icon: '💢',
            label: 'Binomial Burst',
            type: 'fill_counter',
            current: _state.binomialBurstFills % 10,
            max: 10,
            tooltip: `Every 10 correct fills: <b>${chance}%</b> chance to auto-mark 1 wrong cell.`,
            color: '#ff9060',
        };
    }

    function _getRowSampleEfficiency() {
        if (!ptHasSkill('sample_efficiency_1')) return null;
        let threshold = 20;
        if (ptHasSkill('sample_efficiency_2')) threshold -= 2;
        if (ptHasSkill('sample_efficiency_3')) threshold -= 3;
        return {
            id: 'sample_eff',
            icon: '📈',
            label: 'Sample Efficiency',
            type: 'fill_counter',
            current: _state.sampleEffFills,
            max: threshold,
            tooltip: `Every <b>${threshold}</b> consecutive correct fills without a mistake: reveal 1 random correct cell. Resets on mistake.`,
            color: '#6dbf40',
        };
    }

    function _getRowStreakBonus() {
        if (!ptHasSkill('streak_bonus_1')) return null;
        let bonus = 15;
        if (ptHasSkill('streak_bonus_2')) bonus += 5;
        if (ptHasSkill('streak_bonus_3')) bonus += 10;
        return {
            id: 'streak',
            icon: '🔥',
            label: 'Focused Momentum',
            type: 'fill_counter',
            current: _state.streakBonusFills,
            max: 15,
            tooltip: `Every <b>15</b> consecutive correct fills without a mistake: gain <b>+${bonus}s</b>. Resets on mistake.`,
            color: '#ffb830',
        };
    }

    function _getRowGamblersRuin() {
        if (!ptHasSkill('keystone_gamblers_ruin')) return null;
        return {
            id: 'gamblers',
            icon: '🎰',
            label: "Gambler's Ruin",
            type: 'fill_counter',
            current: _state.gamblersFills,
            max: 20,
            noReset: true,
            showCount: true,
            tooltip: 'Each correct fill: <b>+3s</b> to timer. Each mistake: <b>−60s extra</b>. All bonus time from other sources disabled.',
            color: '#e8a020',
        };
    }

    function _getRowErrorFeedback() {
        if (!ptHasSkill('standard_deviation_1')) return null;
        // Threshold: 2 mistakes with standard_deviation_2, otherwise 3.
        const threshold = ptHasSkill('standard_deviation_2') ? 2 : 3;
        // Reveal count: 2 cells with standard_deviation_3, otherwise 1.
        const revealCount = ptHasSkill('standard_deviation_3') ? 2 : 1;
        return {
            id: 'error_feedback',
            icon: '📏',
            label: 'Error Feedback',
            type: 'fill_counter',
            current: _state.errorFeedbackMistakes % threshold,
            max: threshold,
            tooltip: `Every <b>${threshold}</b> errors <b>${revealCount}</b> random correct tiles will get revealed.`,
            color: '#ff6080',
        };
    }

    //------------------------------------------------------------------------
    //-------------------ROW DEFINITIONS: STACKED BONUSES--------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    function _getRowBayesianAdjustment() {
        if (!ptHasSkill('bayesian_update_1') && !ptHasSkill('bayesian_update_2') && !ptHasSkill('bayesian_update_3')) return null;
        return {
            id: 'bayesian',
            icon: '🔃',
            label: 'Bayesian Adjustment',
            type: 'stacked_bonus',
            current: _state.bayesianBonus,
            max: 100,
            unit: '%',
            tooltip: 'Each mistake stacks +5% chance on the next auto-mark or auto-reveal. Resets to 0 after it triggers.',
            color: '#d4b870',
        };
    }

    function _getRowAsymptoticMastery() {
        if (!ptHasSkill('keystone_asymptotic_mastery')) return null;
        const lines = window._asymptoticLinesCompleted || 0;
        const reduction = lines * 5;
        return {
            id: 'asymptotic',
            icon: '♾️',
            label: 'Asymptotic Mastery',
            type: 'stacked_bonus',
            current: lines,
            max: null,
            unit: ' lines',
            tooltip: `Completed lines: <b>${lines}</b>. Mistake time cost reduced by <b>${reduction}s</b> total. Shields disabled.`,
            color: '#ff6080',
        };
    }

    //------------------------------------------------------------------------
    //-------------------ROW DEFINITIONS: DYNAMIC SUMMARY ROWS---------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------
    // These rows show their current state visually (color / warn flag) but
    // do not have a numeric bar — they use the summary dot style.

    function _getRowOverfitting() {
        if (!ptHasSkill('keystone_overfitting')) return null;
        // Fetch the current phase from the game module if available.
        const phase = typeof _overfittingGetPhase === 'function' ? _overfittingGetPhase() : 'free';
        const isHardMode = phase === 'hard';
        return {
            id: 'overfitting',
            icon: '📉',
            label: 'Overfitting',
            type: 'summary',
            tooltip: isHardMode
                ? '<span class="tip-warn">⚠ 15% Threshold crossed! Mistakes now cost <b>TRIPLE TIME (3×)</b>!</span>'
                : 'First 15% of fills are free. <span class="tip-safe">Mistake cost currently: 0s.</span>',
            // Color flips green → red when the hard phase activates.
            color: isHardMode ? '#ff6080' : '#6dbf40',
            warn: isHardMode,
        };
    }

    //------------------------------------------------------------------------
    //-------------------ROW DEFINITIONS: PASSIVE SUMMARIES------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------
    // Static summary rows: these don't track a live counter but remind the
    // player which passive modifiers are affecting the current level.

    function _getSummaryMomentum() {
        const hasMomentum = ptHasSkill('chain_reaction') || ptHasSkill('precise_momentum')
            || ptHasSkill('exponential_growth') || ptHasSkill('god_of_statistics');
        if (!hasMomentum) return null;

        const bonusParts = [];
        if (ptHasSkill('chain_reaction')) bonusParts.push('+1s/trigger');
        if (ptHasSkill('precise_momentum')) bonusParts.push('+2s/trigger');
        if (ptHasSkill('exponential_growth')) bonusParts.push('+1s stack');
        if (ptHasSkill('god_of_statistics')) bonusParts.push('×2 bonus');

        // Penalty description depends on which damage-reduction passives are active.
        const hasBoth = ptHasSkill('learning_from_mistakes') && ptHasSkill('mistakes_no_matter');
        const hasEither = ptHasSkill('learning_from_mistakes') || ptHasSkill('mistakes_no_matter');
        const penalty = hasBoth ? '−10' : hasEither ? '−12' : 'reset';

        return {
            id: 'momentum',
            icon: '⚡',
            label: 'Momentum',
            type: 'summary',
            tooltip: `Momentum bonuses: <b>${bonusParts.join(', ')}</b>. Mistake penalty: streak <b>${penalty}</b>.`,
            color: '#6dbf40',
        };
    }

    function _getSummaryShieldBoost() {
        if (!ptHasSkill('reinforced_shield') && !ptHasSkill('fortified_shield') && !ptHasSkill('frozen_resilience')) return null;

        const extraAbsorb = (ptHasSkill('reinforced_shield') ? 1 : 0) + (ptHasSkill('fortified_shield') ? 1 : 0);
        const parts = [];
        if (extraAbsorb > 0) parts.push(`Shield absorbs +${extraAbsorb} extra mistakes`);
        if (ptHasSkill('frozen_resilience')) parts.push('5 fills during Absolute Zero → +1 shield charge');

        return {
            id: 'shield_boost',
            icon: '🛡️',
            label: 'Shield Boost',
            type: 'summary',
            tooltip: parts.join('<br>'),
            color: '#a0c8ff',
        };
    }

    function _getSummaryBayesianInsight() {
        const hasAny = ptHasSkill('prior_knowledge') || ptHasSkill('updated_beliefs')
            || ptHasSkill('posterior_insight') || ptHasSkill('convergent_evidence')
            || ptHasSkill('god_of_probabilities');
        if (!hasAny) return null;

        const marks = (ptHasSkill('prior_knowledge') ? 1 : 0)
            + (ptHasSkill('updated_beliefs') ? 1 : 0)
            + (ptHasSkill('posterior_insight') ? 1 : 0)
            + (ptHasSkill('convergent_evidence') ? 1 : 0);

        let reveals = ptHasSkill('confirmed_hypothesis') ? 1 : 0;
        if (ptHasSkill('god_of_probabilities')) reveals++;

        const revealPart = reveals > 0 ? ` + reveals <b>${reveals}</b> correct cell(s)` : '';

        return {
            id: 'bayesian_insight',
            icon: '🧪',
            label: 'Bayesian Insight',
            type: 'summary',
            tooltip: `Start of level: auto-marks <b>${marks}</b> random wrong cells${revealPart}.`,
            color: '#66fcf1',
        };
    }

    function _getSummaryConfidenceInterval() {
        if (!ptHasSkill('confidence_interval_1')) return null;
        let secs = 1;
        if (ptHasSkill('confidence_interval_2')) secs++;
        if (ptHasSkill('confidence_interval_3')) secs++;
        return {
            id: 'conf_interval',
            icon: '📐',
            label: 'Confidence Interval',
            type: 'summary',
            tooltip: `After a mistake: next mistake within <b>${secs}s</b> is ignored. Cannot trigger back-to-back.`,
            color: '#a0c8ff',
        };
    }

    function _getSummaryPatternMomentum() {
        if (!ptHasSkill('regression_reward_1')) return null;
        let time = 5;
        if (ptHasSkill('regression_reward_2')) time += 5;
        if (ptHasSkill('regression_reward_3')) time += 5;
        return {
            id: 'pattern_momentum',
            icon: '📉',
            label: 'Pattern Momentum',
            type: 'summary',
            tooltip: `Completing a full row or column: <b>+${time}s</b>.`,
            color: '#6dbf40',
        };
    }

    function _getSummaryResidualAnalysis() {
        if (!ptHasSkill('residual_analysis_1')) return null;
        let chance = 10;
        if (ptHasSkill('residual_analysis_2')) chance += 5;
        if (ptHasSkill('residual_analysis_3')) chance += 10;
        return {
            id: 'residual',
            icon: '🔄',
            label: 'Residual Analysis',
            type: 'summary',
            tooltip: `Completing a row/column: <b>${chance}%</b> chance to auto-mark 1 wrong cell in an adjacent line.`,
            color: '#66fcf1',
        };
    }

    // --- Keystone summary rows (simple on/off, no scaling) ---

    function _getSummaryVeilOfPurity() {
        if (!ptHasSkill('keystone_veil_of_purity')) return null;
        return {
            id: 'veil_purity', icon: '✨', label: 'Veil of Purity', type: 'summary',
            tooltip: 'First cursed item each level: <b>no downside</b>. Further cursed items: <b>double downside</b>.', color: '#d4b870'
        };
    }

    function _getSummaryBlindingTruth() {
        if (!ptHasSkill('keystone_blinding_truth')) return null;
        return {
            id: 'blinding_truth', icon: '💡', label: 'Blinding Truth', type: 'summary',
            tooltip: 'Reveal items <b>50% more effective</b>. Mark-wrong items <b>cannot be used</b>.', color: '#ffb830'
        };
    }

    function _getSummaryApexCollector() {
        if (!ptHasSkill('keystone_apex_collector')) return null;
        return {
            id: 'apex_collector', icon: '🌟', label: 'Apex Collector', type: 'summary',
            tooltip: 'Codex of Completion can drop (3%). Items <b>below Epic cannot be obtained</b> as rewards.', color: '#d4b870'
        };
    }

    function _getSummaryIronDoctrine() {
        if (!ptHasSkill('keystone_iron_doctrine')) return null;
        return {
            id: 'iron_doctrine', icon: '⚔️', label: 'Iron Doctrine', type: 'summary', warn: true,
            tooltip: 'Shields disabled. Each mistake <b>−60s extra</b>. Tutor and Timer items: <b>+300% effectiveness</b>.', color: '#ff6080'
        };
    }

    function _getSummaryCurseEmbrace() {
        if (!ptHasSkill('keystone_curse_embrace')) return null;
        return {
            id: 'curse_embrace', icon: '👁️', label: 'Curse Embrace', type: 'summary',
            tooltip: 'Immune to cursed item downsides. Non-cursed items <b>50% weaker</b>.', color: '#c080ff'
        };
    }

    function _getSummaryCountdownCrisis() {
        if (!ptHasSkill('keystone_countdown_crisis')) return null;
        return {
            id: 'countdown_crisis', icon: '⚡', label: 'Countdown Crisis', type: 'summary', warn: true,
            tooltip: 'Timer items <b>reduce</b> the timer. Reveal items are <b>5× stronger</b> while timer &lt;3 min.', color: '#ff9060'
        };
    }

    function _getSummaryStochasticResonance() {
        if (!ptHasSkill('keystone_stochastic_resonance')) return null;
        return {
            id: 'stochastic_res', icon: '〰️', label: 'Stochastic Resonance', type: 'summary',
            tooltip: 'Each mistake: <b>25% chance</b> to reveal 1 correct cell instead of counting as mistake. Cannot trigger twice in a row.', color: '#66fcf1'
        };
    }

    function _getSummaryNullHypothesis() {
        if (!ptHasSkill('keystone_null_hypothesis')) return null;
        return {
            id: 'null_hyp', icon: '🔬', label: 'Null Hypothesis', type: 'summary', warn: true,
            tooltip: 'Level start: all wrong cells in the sparsest row and column are auto-marked. <b>No mistake shields</b> of any kind.', color: '#ff9060'
        };
    }

    function _getSummaryVarianceCollapse() {
        if (!ptHasSkill('keystone_variance_collapse')) return null;
        return {
            id: 'variance_collapse', icon: '💥', label: 'Variance Collapse', type: 'summary', warn: true,
            tooltip: 'Lucky Tiles appear on ALL grid sizes. Revealing one <b>−10 minutes</b> from timer.', color: '#e8a020'
        };
    }

    function _getSummaryTheOracle() {
        if (!ptHasSkill('keystone_the_oracle')) return null;
        return {
            id: 'oracle', icon: '👁️', label: 'The Oracle', type: 'summary', warn: true,
            tooltip: 'Solution shown for 5s at start, then hidden. All clues hidden. Auto-reveals disabled (class abilities only). <b>Large/Massive grids only.</b>', color: '#c080ff'
        };
    }

    function _getSummaryMaximumLikelihood() {
        if (!ptHasSkill('keystone_maximum_likelihood')) return null;
        return {
            id: 'max_likelihood', icon: '🏔️', label: 'Maximum Likelihood', type: 'summary', warn: true,
            tooltip: 'Level start: densest row and column auto-solved. <b>−15 minutes</b> from timer.', color: '#ff6080'
        };
    }

    function _getSummarySignalToNoise() {
        if (!ptHasSkill('keystone_signal_to_noise')) return null;
        return {
            id: 'signal_noise', icon: '📡', label: 'Signal to Noise', type: 'summary',
            tooltip: '15% of clues randomized at start. Completing 75% of grid reveals true values. Class cooldowns −15s.', color: '#a0c8ff'
        };
    }

    function _getSummaryDeadReckoning() {
        if (!ptHasSkill('keystone_dead_reckoning')) return null;
        return {
            id: 'dead_reckoning', icon: '🧭', label: 'Dead Reckoning', type: 'summary',
            tooltip: 'Clues shown as row/col sums instead of exact runs. <b>25% completion</b> reveals exact clues. +10 min to timer.', color: '#d4b870'
        };
    }

    function _getSummaryFrequentistsBurden() {
        if (!ptHasSkill('keystone_frequentists_burden')) return null;
        return {
            id: 'freq_burden', icon: '📜', label: "Frequentist's Burden", type: 'summary',
            tooltip: 'All clues hidden. Every <b>5 correct fills</b> reveals 1 random clue. Class cooldowns −15s.', color: '#c080ff'
        };
    }

    function _getSummarySparsePrior() {
        if (!ptHasSkill('keystone_sparse_prior')) return null;
        return {
            id: 'sparse_prior', icon: '🫥', label: 'Sparse Prior', type: 'summary',
            tooltip: 'All clues hidden at start. Completing a row/column reveals adjacent clues.', color: '#a0c8ff'
        };
    }

    function _getSummaryErgodicField() {
        if (!ptHasSkill('keystone_ergodic_field')) return null;
        return {
            id: 'ergodic', icon: '🌊', label: 'Ergodic Field', type: 'summary', warn: true,
            tooltip: 'All auto-reveals, marks, and field scans disabled. Every 3 min: full solution flashes for <b>1 second</b>.', color: '#66fcf1'
        };
    }

    function _getSummaryDegreesOfFreedom() {
        if (!ptHasSkill('keystone_degrees_of_freedom')) return null;
        return {
            id: 'dof', icon: '🎛️', label: 'Degrees of Freedom', type: 'summary',
            tooltip: 'Either all row or all column clues are hidden. They flash visible every 30s for 5s. Class cooldowns −30s.', color: '#d4b870'
        };
    }

    function _getSummaryAdjacencyMatrix() {
        if (!ptHasSkill('adjacency_matrix')) return null;
        return {
            id: 'adj_matrix', icon: '🔢', label: 'Adjacency Matrix', type: 'summary',
            tooltip: 'Row/column clues hidden. Each empty cell shows count of its 8 neighbours that are solution cells.', color: '#66fcf1'
        };
    }

    //------------------------------------------------------------------------
    //-------------------ACTIVE ROW AGGREGATION-------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Collects all passive summaries (static informational rows) into one array.
    // Each helper returns a row definition or null; nulls are filtered out.
    function _buildSummaryRows() {
        return [
            _getSummaryMomentum(),
            _getSummaryShieldBoost(),
            _getSummaryBayesianInsight(),
            _getSummaryConfidenceInterval(),
            _getSummaryPatternMomentum(),
            _getSummaryResidualAnalysis(),
            _getSummaryVeilOfPurity(),
            _getSummaryBlindingTruth(),
            _getSummaryApexCollector(),
            _getSummaryIronDoctrine(),
            _getSummaryCurseEmbrace(),
            _getSummaryCountdownCrisis(),
            _getSummaryStochasticResonance(),
            _getSummaryNullHypothesis(),
            _getSummaryVarianceCollapse(),
            _getSummaryTheOracle(),
            _getSummaryMaximumLikelihood(),
            _getSummarySignalToNoise(),
            _getSummaryDeadReckoning(),
            _getSummaryFrequentistsBurden(),
            _getSummarySparsePrior(),
            _getSummaryErgodicField(),
            _getSummaryDegreesOfFreedom(),
            _getSummaryAdjacencyMatrix(),
        ].filter(Boolean);
    }

    // Returns the full ordered list of row definitions that should currently
    // be visible in the panel. Sections appear in this order:
    //   1. Countdown timers
    //   2. Fill counters
    //   3. Stacked bonuses
    //   4. Dynamic summary rows (state-dependent appearance)
    //   5. Static passive summaries
    function _getActiveRows() {
        return [
            // — Countdown timers —
            _getRowRandomWalk(),
            _getRowPoissonProcess(),
            _getRowTimedStasis(),
            _getRowLawOfLargeNumbers(),

            // — Fill counters —
            _getRowBinomialBurst(),
            _getRowSampleEfficiency(),
            _getRowStreakBonus(),
            _getRowGamblersRuin(),
            _getRowErrorFeedback(),

            // — Stacked bonuses —
            _getRowBayesianAdjustment(),
            _getRowAsymptoticMastery(),

            // — Dynamic summary rows —
            _getRowOverfitting(),

            // — Static passive summaries —
            ..._buildSummaryRows(),
        ].filter(Boolean);
    }

    //------------------------------------------------------------------------
    //-------------------TIMER TICK: COUNTDOWN UPDATES-----------------------
    //------------------------------------------------------------------------
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
    //------------------------------------------------------------------------

    // Main heartbeat — call this every second from the game timer.
    // Advances all countdown timers, syncs external state, and redraws rows.
    function onTimerTick() {
        _tickAllCountdowns();
        _syncExternalState();
        _updatePanel();
    }

    //------------------------------------------------------------------------
    //-------------------PUBLIC API: GAME EVENT HOOKS------------------------
    //------------------------------------------------------------------------
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

    // Binomial Burst passive triggered — reset the fill counter and flash the row.
    function onBinomialTrigger() {
        _state.binomialBurstFills = 0;
        _flashRow('binomial');
        _updatePanel();
    }

    // Streak Bonus (Focused Momentum) triggered — reset streak counter and flash.
    function onStreakBonusTrigger() {
        _state.streakBonusFills = 0;
        _flashRow('streak');
        _updatePanel();
    }

    // Sample Efficiency triggered — reset consecutive-fill counter and flash.
    function onSampleEffTrigger() {
        _state.sampleEffFills = 0;
        _flashRow('sample_eff');
        _updatePanel();
    }

    // Bayesian Adjustment triggered — zero out the stacked bonus and flash.
    function onBayesianTrigger() {
        _state.bayesianBonus = 0;
        _flashRow('bayesian');
        _updatePanel();
    }

    //------------------------------------------------------------------------
    //-------------------EXPORTS----------------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    return {
        // Lifecycle
        init,
        destroy,
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