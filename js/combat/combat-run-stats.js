//------------------------------------------------------------------------
//-------------------RUN STATISTICS (learning panel)----------------------
//------------------------------------------------------------------------
// Records what happened during a fight (hits dealt, crit rolls, hits taken,
// what avoided them, who dealt the damage) and shows it as a small
// statistics panel ("Combat Analytics") on the campaign win overlay (two
// columns: offense | defense) and the endgame map-win summary. The defeat
// screens (campaign and map) show only a log of the last hits taken. The map-win summary also offers one optional question built
// from the run's own numbers (average of the last hits, expected crits).
//
// Read-only observer: nothing here changes combat. Hooks call
// globalThis.RunStats.* (typeof-guarded) from encounter-damage.js,
// encounter-monster-damage.js, endgame-player-stats.js (_egRollCrit),
// encounter-kills.js (campaign defeat), timer.js (time up),
// scoring-rewards.js (win overlay) and encounter-chain.js (map summary).
//
// Side-effect module (no exports): it publishes globalThis.RunStats, which
// the other combat modules reach through globalThis (no import cycles).
import { t } from '../translation/translations.js';
import { _egAddGold } from '../loot/loot-gold.js';

(function () {
    const MAX_SAMPLES = 3000;
    const RECENT_COUNT = 5;
    const HIST_BINS = 8;
    const LOG_KEEP = 8;
    const REWARD_GOLD = 25;
    const STYLE_ID = 'rs-panel-styles';

    const tr = (key, vars) => {
        let s = t(key);
        if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
        return s;
    };

    // One run = one campaign level attempt, or one whole map-device run
    // (a map can chain several puzzles). A new key starts a fresh record.
    function currentKey() {
        const map = globalThis._egActiveMapItem;
        if (map) return map;
        return 'c' + (globalThis.levelStartTime || 0);
    }

    function fresh(key) {
        return {
            key,
            dealt: [], byKind: {}, dealtCount: 0, dealtSum: 0, dealtSq: 0, recent: [],
            critTrials: 0, crits: 0, critExp: 0, critVar: 0,
            hitsTaken: 0, dmgTaken: 0, log: [], sources: {},
            avoided: { dodge: 0, block: 0, parry: 0, other: 0 },
            rewarded: false,
        };
    }

    let data = null;
    function ensure() {
        const key = currentKey();
        if (!data || data.key !== key) data = fresh(key);
        return data;
    }
    function peek() {
        return (data && data.key === currentKey()) ? data : null;
    }

    // ── Recording ─────────────────────────────────────────────────────
    function hitDealt(amount, opts) {
        if (opts && (opts.isEcho || opts.isRicochet || opts.isPlayerFlat)) return;
        const dmg = Math.round(Number(amount) || 0);
        if (dmg <= 0) return;
        const d = ensure();
        d.dealtCount++;
        d.dealtSum += dmg;
        d.dealtSq += dmg * dmg;
        if (d.dealt.length >= MAX_SAMPLES) d.dealt.shift();
        d.dealt.push(dmg);
        d.recent.push(dmg);
        if (d.recent.length > RECENT_COUNT) d.recent.shift();
        const k = d.byKind[hitKind(opts)] || (d.byKind[hitKind(opts)] = { n: 0, sum: 0, crits: 0 });
        k.n++;
        k.sum += dmg;
        if (opts && opts.isCrit) k.crits++;
    }

    // Where a player hit came from, read from the tags the damage pipeline
    // already sets: spells carry uspSfx/spellId (or isPlayerSpell without
    // isPlayerHit), reveal/charged projectiles carry isPlayerHit, melee
    // strikes and melee arts carry isMelee. Untagged hits (cleave, splash,
    // chain, pierce) fall into 'other'.
    function hitKind(opts) {
        if (!opts) return 'other';
        if (opts.uspSfx !== undefined || opts.spellId || (opts.isPlayerSpell && !opts.isPlayerHit)) return 'spell';
        if (opts.isPlayerHit) return 'projectile';
        if (opts.isMelee) return 'melee';
        return 'other';
    }

    function critTrial(chancePct, isCrit) {
        const p = Math.min(1, Math.max(0, (Number(chancePct) || 0) / 100));
        if (p <= 0) return;
        const d = ensure();
        d.critTrials++;
        if (isCrit) d.crits++;
        d.critExp += p;
        d.critVar += p * (1 - p);
    }

    function hitTaken(amount, label, info) {
        const dmg = Math.round(Number(amount) || 0);
        if (dmg <= 0) return;
        const d = ensure();
        d.hitsTaken++;
        d.dmgTaken += dmg;
        const key = label || 'other';
        d.sources[key] = (d.sources[key] || 0) + dmg;
        // Ring buffer for the defeat screen's "last hits" log.
        d.log.push({ at: Date.now(), dmg, label: key, element: info && info.element, hp: info && info.hp });
        if (d.log.length > LOG_KEEP) d.log.shift();
    }

    function avoided(kind) {
        const d = ensure();
        const k = (kind === 'dodge' || kind === 'block' || kind === 'parry') ? kind : 'other';
        d.avoided[k]++;
    }

    // Source label for a hit on the player (monster name, boss ability, ...).
    function sourceLabel(isBossAbility, attacker) {
        if (attacker && attacker.name) return String(attacker.name);
        return isBossAbility ? tr('rs_src_boss') : tr('rs_src_other');
    }

    // ── Maths ─────────────────────────────────────────────────────────
    function meanSd(d) {
        const n = d.dealtCount;
        if (!n) return { mean: 0, sd: 0 };
        const mean = d.dealtSum / n;
        const variance = Math.max(0, d.dealtSq / n - mean * mean);
        return { mean, sd: Math.sqrt(variance) };
    }

    function fmt(x) {
        const r = Math.round(x * 10) / 10;
        return (Math.abs(r) >= 100 ? Math.round(r) : r).toString();
    }

    function esc(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function median(arr) {
        const s = [...arr].sort((a, b) => a - b);
        const m = s.length >> 1;
        return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    }

    // Picks 3 distinct wrong numbers from `candidates` (none equal to `right`).
    function pickWrong(right, candidates) {
        const out = [];
        for (const c of candidates) {
            const v = Math.round(c);
            if (v < 0 || v === right || out.includes(v)) continue;
            out.push(v);
            if (out.length === 3) return out;
        }
        for (let k = 1; out.length < 3 && k < 50; k++) {
            for (const v of [right + k, right - k]) {
                if (out.length < 3 && v >= 0 && v !== right && !out.includes(v)) out.push(v);
            }
        }
        return out;
    }

    // ── Question from the run's own numbers ───────────────────────────
    function buildQuestion(d) {
        const options = [];
        const meanOk = d.recent.length === RECENT_COUNT;
        const n = d.critTrials;
        const p = n ? d.critExp / n : 0;
        const expected = d.critExp;
        const critOk = n >= 10 && p >= 0.02 && p <= 0.98 && Math.round(expected) >= 1;
        if (meanOk) options.push('mean');
        if (critOk) options.push('crit');
        if (!options.length) return null;
        const kind = options[Math.floor(Math.random() * options.length)];

        if (kind === 'mean') {
            const list = d.recent;
            const sum = list.reduce((a, b) => a + b, 0);
            const right = Math.round(sum / list.length);
            const wrong = pickWrong(right, shuffle([
                median(list), Math.max(...list), right * 1.25, right * 0.75, right * 1.5, right * 0.5,
            ]));
            return {
                text: tr('rs_q_mean', { list: list.join(', ') }),
                choices: shuffle([right, ...wrong]),
                right,
                why: tr('rs_q_mean_why', { sum: list.join(' + '), mean: right }),
            };
        }

        const right = Math.round(expected);
        const wrong = pickWrong(right, shuffle([
            n * (1 - p), expected * 2, expected / 2, n / 2, expected + 3, expected - 3,
        ]));
        const sigma = Math.sqrt(d.critVar);
        const lo = Math.max(0, Math.round(expected - 2 * sigma));
        const hi = Math.round(expected + 2 * sigma);
        const z = sigma > 0 ? (d.crits - expected) / sigma : 0;
        const verdict = tr(z >= 2 ? 'rs_verdict_lucky' : (z <= -2 ? 'rs_verdict_unlucky' : 'rs_verdict_normal'));
        return {
            text: tr('rs_q_crit', { n, p: fmt(p * 100) }),
            choices: shuffle([right, ...wrong]),
            right,
            why: tr('rs_q_crit_why', {
                n, p: fmt(p * 100), e: fmt(expected), two: fmt(2 * sigma), lo, hi, k: d.crits, verdict,
            }),
        };
    }

    // ── Rendering ─────────────────────────────────────────────────────
    function injectStyles() {
        if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
        const st = document.createElement('style');
        st.id = STYLE_ID;
        st.textContent = `
        .rs-panel { margin: 10px auto; max-width: 560px; padding: 10px 14px; text-align: left;
            background: rgba(20,20,40,0.78); border: 1px solid #5555aa; border-radius: 8px;
            color: #dde; font-size: 13px; line-height: 1.45; }
        .rs-panel.rs-lose { border-color: #aa5566; }
        .rs-title { font-weight: 700; margin-bottom: 6px; letter-spacing: 0.5px; }
        .rs-row { margin: 2px 0; }
        .rs-hist { display: flex; align-items: flex-end; gap: 3px; height: 54px; margin: 6px 0 2px; }
        .rs-bar { flex: 1; background: #6a7bd8; border-radius: 2px 2px 0 0; min-height: 2px; }
        .rs-hist-axis { display: flex; justify-content: space-between; font-size: 11px; opacity: 0.7; }
        .rs-hist-cap { font-size: 11px; opacity: 0.7; margin-top: 2px; }
        .rs-src { display: flex; align-items: center; gap: 8px; margin: 2px 0; }
        .rs-src-name { flex: 0 0 38%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rs-kind { margin: 3px 0; text-align: left; }
        .rs-kind-top { display: flex; justify-content: space-between; gap: 6px; }
        .rs-kind-bar { height: 6px; background: #6a7bd8; border-radius: 2px; margin-top: 1px; }
        .rs-src-bar { height: 8px; background: #d86a7b; border-radius: 2px; }
        .rs-src-val { font-size: 12px; opacity: 0.8; }
        .rs-ca-title { font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; color: var(--accent2, #9fd); }
        .rs-col-head { font-weight: 700; opacity: 0.9; }
        .rs-col { font-size: clamp(10px, 1.3vw, 13px); line-height: 1.4; color: #dde; }
        .rs-col .rs-hist, .rs-col .rs-hist-axis, .rs-col .rs-hist-cap { display: none; }
        .rs-col .rs-src-name { flex-basis: 34%; }
        .rs-log-row { display: flex; gap: 8px; align-items: baseline; padding: 1px 0; font-size: 12px; }
        .rs-log-t { flex: 0 0 44px; opacity: 0.65; }
        .rs-log-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rs-log-dmg { flex: 0 0 52px; text-align: right; color: #f0a0b0; font-weight: 700; }
        .rs-log-hp { flex: 0 0 76px; text-align: right; opacity: 0.7; }
        .rs-log-last { color: #ff8da0; font-weight: 700; }
        .rs-q { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #5555aa; }
        .rs-q-title { font-weight: 700; margin-bottom: 4px; }
        .rs-choices { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
        .rs-choice { min-width: 56px; padding: 5px 12px; cursor: pointer; border-radius: 6px;
            border: 1px solid #7777cc; background: #23233a; color: #fff; font: inherit; }
        .rs-choice:hover:not(:disabled) { background: #33335a; }
        .rs-choice:disabled { cursor: default; opacity: 0.85; }
        .rs-choice.rs-right { background: #1f6b3a; border-color: #4fd17f; }
        .rs-choice.rs-miss { background: #6b1f2c; border-color: #d14f66; }
        .rs-result { margin-top: 6px; }
        .rs-result.ok { color: #7fe0a0; }
        .rs-result.no { color: #f0a0b0; }
        .rs-why { margin-top: 4px; opacity: 0.9; }
        `;
        document.head.appendChild(st);
    }

    function histogramHTML(d) {
        const vals = d.dealt;
        if (vals.length < 2) return '';
        const min = Math.min(...vals), max = Math.max(...vals);
        const bins = new Array(HIST_BINS).fill(0);
        const span = max - min;
        for (const v of vals) {
            const i = span === 0 ? 0 : Math.min(HIST_BINS - 1, Math.floor((v - min) / span * HIST_BINS));
            bins[i]++;
        }
        const top = Math.max(...bins);
        const bars = bins.map(c => `<div class="rs-bar" style="height:${Math.max(4, Math.round(c / top * 100))}%" title="${c}"></div>`).join('');
        return `<div class="rs-hist">${bars}</div>
            <div class="rs-hist-axis"><span>${min}</span><span>${max}</span></div>
            <div class="rs-hist-cap">${esc(tr('rs_hist_caption'))}</div>`;
    }

    function sourcesHTML(d) {
        const entries = Object.entries(d.sources).sort((a, b) => b[1] - a[1]).slice(0, 4);
        if (!entries.length) return '';
        const top = entries[0][1];
        const rows = entries.map(([name, dmg]) => `
            <div class="rs-src"><span class="rs-src-name">${esc(name)}</span>
                <div style="flex:1"><div class="rs-src-bar" style="width:${Math.max(4, Math.round(dmg / top * 100))}%"></div></div>
                <span class="rs-src-val">${dmg} (${Math.round(dmg / d.dmgTaken * 100)}%)</span></div>`).join('');
        return `<div class="rs-row" style="margin-top:6px"><b>${esc(tr('rs_sources'))}</b></div>${rows}`;
    }

    const KIND_ORDER = ['melee', 'spell', 'projectile', 'other'];
    function kindsHTML(d) {
        const rows = KIND_ORDER.filter(k => d.byKind[k] && d.byKind[k].n > 0);
        if (!rows.length || d.dealtSum <= 0) return '';
        const top = Math.max(...rows.map(k => d.byKind[k].sum));
        return rows.map(k => {
            const e = d.byKind[k];
            const share = Math.round(e.sum / d.dealtSum * 100);
            return `<div class="rs-kind"><div class="rs-kind-top"><b>${esc(tr('rs_kind_' + k))}</b>
                <span class="rs-src-val">${esc(tr('rs_kind_val', { n: e.n, avg: fmt(e.sum / e.n), c: e.crits, pct: share }))}</span></div>
                <div class="rs-kind-bar" style="width:${Math.max(4, Math.round(e.sum / top * 100))}%"></div></div>`;
        }).join('');
    }

    function offenseHTML(d) {
        const { mean, sd } = meanSd(d);
        const parts = [];
        if (d.dealtCount > 0) {
            parts.push(`<div class="rs-row">${esc(tr('rs_dealt', { n: d.dealtCount }))} &middot; ${esc(tr('rs_avg', { mean: fmt(mean), sd: fmt(sd) }))}</div>`);
            parts.push(kindsHTML(d));
            parts.push(histogramHTML(d));
        }
        if (d.critTrials > 0) {
            const pct = Math.round(d.crits / d.critTrials * 100);
            const exp = Math.round(d.critExp / d.critTrials * 100);
            parts.push(`<div class="rs-row">${esc(tr('rs_crit', { k: d.crits, n: d.critTrials, pct, exp }))}</div>`);
        }
        return parts.join('');
    }

    function defenseHTML(d, always) {
        const parts = [];
        if (d.hitsTaken > 0 || always) {
            parts.push(`<div class="rs-row" style="margin-top:6px">${esc(tr('rs_taken', { n: d.hitsTaken, dmg: d.dmgTaken }))}</div>`);
            const a = d.avoided;
            const total = a.dodge + a.block + a.parry + a.other;
            if (total > 0) parts.push(`<div class="rs-row">${esc(tr('rs_avoided', { n: total, d: a.dodge, b: a.block, p: a.parry, o: a.other }))}</div>`);
            parts.push(sourcesHTML(d));
        }
        return parts.join('');
    }

    function panelHTML(d, lose) {
        return `<div class="rs-title">${esc(tr('rs_title_win'))}</div>`
            + offenseHTML(d) + defenseHTML(d, lose);
    }

    // Campaign win overlay: two extra columns (offense | defense) in the
    // stats row, next to score and time, under one "Combat Analytics" caption.
    function renderWinColumns(d) {
        const cols = document.querySelector('#ov-win .ov-stats-columns');
        if (!cols) return;
        cols.classList.remove('has-combat');
        const old = cols.querySelector('.ov-ca');
        if (old) old.remove();
        if (!d || (d.dealtCount === 0 && d.hitsTaken === 0 && d.critTrials === 0)) return;
        const ca = document.createElement('div');
        ca.className = 'ov-ca';
        ca.innerHTML = `<div class="rs-ca-title">${esc(tr('rs_title_win'))}</div>
            <div class="ov-ca-cols">
                <div class="ov-col rs-col"><div class="rs-col-head">${esc(tr('rs_offense'))}</div>${offenseHTML(d) || '<div class="rs-row">&ndash;</div>'}</div>
                <div class="ov-col rs-col"><div class="rs-col-head">${esc(tr('rs_defense'))}</div>${defenseHTML(d, true)}</div>
            </div>`;
        cols.appendChild(ca);
        cols.classList.add('has-combat');
    }

    const ELEMENT_ICON = { fire: '🔥', cold: '❄️', lightning: '⚡', shadow: '🌑', physical: '⚔️' };

    // Defeat screen: only the last hits that took Life, oldest first, the
    // killing blow last and highlighted.
    function defeatLogHTML(d) {
        const log = d.log;
        if (!log.length) return '';
        const end = log[log.length - 1].at;
        const rows = log.map((h, i) => {
            const secs = ((end - h.at) / 1000).toFixed(1);
            const icon = ELEMENT_ICON[h.element] || '';
            const left = h.hp != null ? esc(tr('rs_log_left', { hp: Math.max(0, Math.round(h.hp)) })) : '';
            return `<div class="rs-log-row${i === log.length - 1 ? ' rs-log-last' : ''}">
                <span class="rs-log-t">${i === log.length - 1 ? '☠' : '−' + secs + 's'}</span>
                <span class="rs-log-name">${icon} ${esc(h.label)}</span>
                <span class="rs-log-dmg">−${h.dmg}</span>
                <span class="rs-log-hp">${left}</span></div>`;
        }).join('');
        return `<div class="rs-title">${esc(tr('rs_title_lose'))}</div>${rows}`;
    }

    function wireQuestion(panel, d, q, reward) {
        const box = document.createElement('div');
        box.className = 'rs-q';
        box.innerHTML = `<div class="rs-q-title">${esc(tr('rs_q_title'))}</div>
            <div class="rs-q-text">${esc(q.text)}</div>
            <div class="rs-choices"></div>
            <div class="rs-result" style="display:none"></div>
            <div class="rs-why" style="display:none"></div>`;
        const choicesEl = box.querySelector('.rs-choices');
        const resEl = box.querySelector('.rs-result');
        const whyEl = box.querySelector('.rs-why');
        for (const value of q.choices) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'rs-choice';
            btn.textContent = String(value);
            btn.addEventListener('click', () => {
                const ok = value === q.right;
                choicesEl.querySelectorAll('button').forEach(b => {
                    b.disabled = true;
                    if (Number(b.textContent) === q.right) b.classList.add('rs-right');
                });
                if (!ok) btn.classList.add('rs-miss');
                let line = tr(ok ? 'rs_correct' : 'rs_wrong');
                if (ok && reward && !d.rewarded) {
                    d.rewarded = true;
                    line += ' ' + reward.give();
                }
                resEl.className = 'rs-result ' + (ok ? 'ok' : 'no');
                resEl.textContent = line;
                resEl.style.display = '';
                whyEl.textContent = q.why;
                whyEl.style.display = '';
            });
            choicesEl.appendChild(btn);
        }
        panel.appendChild(box);
    }

    // kind: 'win' | 'lose' | 'map-win' | 'map-lose'. `host` is the overlay
    // element for map summaries (the leave-map transition).
    function renderInto(kind, host) {
        if (typeof document === 'undefined') return;
        injectStyles();
        const lose = kind === 'lose' || kind === 'map-lose';
        const isMap = kind === 'map-win' || kind === 'map-lose';

        if (kind === 'win') { injectStyles(); renderWinColumns(peek()); return; }

        let anchor = null;
        if (isMap) anchor = host && host.querySelector('#eg-leave-summary-container');
        else if (kind === 'win') anchor = document.getElementById('item-reward-zone');
        else anchor = document.querySelector('#ov-lose .ov-btns');
        if (!anchor || !anchor.parentNode) return;
        const old = anchor.parentNode.querySelector('.rs-panel');
        if (old) old.remove();

        const d = peek();
        if (!d || (d.dealtCount === 0 && d.hitsTaken === 0 && d.critTrials === 0)) return;
        if (lose && !d.log.length) return;

        const panel = document.createElement('div');
        panel.className = 'rs-panel' + (lose ? ' rs-lose' : '');
        panel.innerHTML = lose ? defeatLogHTML(d) : panelHTML(d, lose);

        const q = kind === 'map-win' ? buildQuestion(d) : null;
        if (q) {
            let reward = null;
            if (kind === 'map-win') {
                reward = {
                    give() {
                        _egAddGold(REWARD_GOLD);
                        return tr('rs_reward_gold', { n: REWARD_GOLD });
                    },
                };
            }
            wireQuestion(panel, d, q, reward);
        }
        anchor.parentNode.insertBefore(panel, anchor);
    }

    globalThis.RunStats = {
        hitDealt, critTrial, hitTaken, avoided, sourceLabel, renderInto,
        // test hooks
        _peek: peek, _buildQuestion: buildQuestion, _meanSd: meanSd, _reset() { data = null; },
    };
})();
