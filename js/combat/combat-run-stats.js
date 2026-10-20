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
// encounter-monster-damage.js, combat-player-stats.js (_rollCrit),
// encounter-kills.js (campaign defeat), timer.js (time up),
// scoring-rewards.js (win overlay) and encounter-chain.js (map summary).
//
// Side-effect module (no exports): it publishes globalThis.RunStats, which
// the other combat modules reach through globalThis (no import cycles).
import { t } from '../translation/translations.js';
import { _addGold } from '../loot/loot-gold.js';
import { trackAchStat, setAchStat } from '../achievements/achievements.js';

(function () {
    const MAX_SAMPLES = 3000;
    const RECENT_COUNT = 5;
    const HIST_BINS = 8;
    const LOG_KEEP = 8;
    const REWARD_GOLD = 25;

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

    // ── Achievement feed (category "combat") ──────────────────────────
    // Hits arrive many times a second, but every trackAchStat call rewrites
    // the achievement save, so counters are collected here and flushed in
    // one go after a short quiet period (and when the page is hidden).
    // Achievements are global across save slots, unlike the per-run record.
    const achCounts = {};
    let achBiggestHit = 0;
    let achFlushTimer = null;

    function flushAch() {
        achFlushTimer = null;
        for (const key of Object.keys(achCounts)) {
            const n = achCounts[key];
            delete achCounts[key];
            if (n > 0) trackAchStat(key, n);
        }
        if (achBiggestHit > 0) setAchStat('combatBiggestHit', achBiggestHit);
    }
    function achAdd(key, n) {
        achCounts[key] = (achCounts[key] || 0) + n;
        if (!achFlushTimer) achFlushTimer = setTimeout(flushAch, 2000);
    }
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => { if (document.hidden) flushAch(); });
    }

    // Fight finished in victory: untouched / clutch wins. Idempotent per run
    // (the win panel can be rendered more than once for the same fight).
    function achFightWon(d) {
        if (!d || d.achWon || d.dealtCount === 0) return;
        d.achWon = true;
        if (d.hitsTaken === 0) trackAchStat('combatUntouchedWins', 1);
        const hp = Number(globalThis.playerCurrentHP);
        const max = Number(globalThis.playerMaxHP);
        if (hp > 0 && max > 0 && hp / max < 0.1) trackAchStat('combatClutchWins', 1);
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

        achAdd('combatDamageDealt', dmg);
        if (dmg > achBiggestHit) { achBiggestHit = dmg; if (!achFlushTimer) achFlushTimer = setTimeout(flushAch, 2000); }
        if (hitKind(opts) === 'melee') achAdd('combatMeleeHits', 1);
        else if (hitKind(opts) === 'projectile') achAdd('combatProjectileHits', 1);
        else if (hitKind(opts) === 'spell') achAdd('combatSpellHits', 1);
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
        if (isCrit) { d.crits++; achAdd('combatCrits', 1); }
        d.critExp += p;
        d.critVar += p * (1 - p);
    }

    function hitTaken(amount, label, info) {
        const dmg = Math.round(Number(amount) || 0);
        if (dmg <= 0) return;
        const d = ensure();
        d.hitsTaken++;
        d.dmgTaken += dmg;
        achAdd('combatDamageTaken', dmg);
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
        if (k === 'dodge') achAdd('combatDodges', 1);
        else if (k === 'block') achAdd('combatBlocks', 1);
        else if (k === 'parry') achAdd('combatParries', 1);
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
    // Styles live in css/combat/run-summary.css (this stays a no-op hook).
    function injectStyles() {}

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
                <div class="rs-track"><div class="rs-fill rs-fill-bad" style="width:${Math.max(4, Math.round(dmg / top * 100))}%"></div></div>
                <span class="rs-src-val">${dmg} (${Math.round(dmg / d.dmgTaken * 100)}%)</span></div>`).join('');
        return `<div class="rs-sources" title="${esc(tr('rs_sources'))}">${rows}</div>`;
    }

    function statTile(label, value, sub, bad) {
        return `<div class="rs-stat${bad ? ' rs-bad' : ''}"><div class="rs-stat-val">${esc(String(value))}</div>
            <div class="rs-stat-label">${esc(label)}</div>${sub ? `<div class="rs-stat-sub">${esc(sub)}</div>` : ''}</div>`;
    }

    const KIND_ORDER = ['melee', 'spell', 'projectile', 'other'];
    const KIND_ICON = { melee: '⚔️', spell: '✨', projectile: '🏹', other: '💥' };
    function kindsHTML(d) {
        const rows = KIND_ORDER.filter(k => d.byKind[k] && d.byKind[k].n > 0);
        if (!rows.length || d.dealtSum <= 0) return '';
        const html = rows.map(k => {
            const e = d.byKind[k];
            const share = Math.round(e.sum / d.dealtSum * 100);
            return `<div class="rs-kind"><span class="rs-kind-name">${KIND_ICON[k]} ${esc(tr('rs_kind_' + k))}</span>
                <div class="rs-track"><div class="rs-fill" style="width:${Math.max(3, share)}%"></div></div>
                <span class="rs-kind-pct">${share}%</span>
                <span class="rs-kind-sub">${esc(tr('rs_kind_sub', { n: e.n, avg: fmt(e.sum / e.n), c: e.crits }))}</span></div>`;
        }).join('');
        return `<div class="rs-kinds">${html}</div>`;
    }

    function offenseHTML(d) {
        const { mean, sd } = meanSd(d);
        const parts = [];
        const tiles = [];
        if (d.dealtCount > 0) {
            tiles.push(statTile(tr('rs_stat_hits'), d.dealtCount));
            tiles.push(statTile(tr('rs_stat_avg'), fmt(mean), tr('rs_stat_avg_sub', { sd: fmt(sd) })));
        }
        if (d.critTrials > 0) {
            const pct = Math.round(d.crits / d.critTrials * 100);
            const exp = Math.round(d.critExp / d.critTrials * 100);
            tiles.push(statTile(tr('rs_stat_crit'), pct + '%', tr('rs_stat_crit_sub', { k: d.crits, n: d.critTrials, exp })));
        }
        if (tiles.length) parts.push(`<div class="rs-tiles">${tiles.join('')}</div>`);
        if (d.dealtCount > 0) {
            parts.push(kindsHTML(d));
            parts.push(histogramHTML(d));
        }
        return parts.join('');
    }

    function defenseHTML(d, always) {
        const parts = [];
        if (d.hitsTaken > 0 || always) {
            const a = d.avoided;
            const total = a.dodge + a.block + a.parry + a.other;
            parts.push(`<div class="rs-tiles">${statTile(tr('rs_stat_taken'), d.hitsTaken)}${statTile(tr('rs_stat_dmg'), d.dmgTaken, '', true)}${statTile(tr('rs_stat_avoided'), total)}</div>`);
            if (total > 0) {
                const pills = ['dodge', 'block', 'parry', 'other'].filter(k => a[k] > 0)
                    .map(k => `<span class="rs-pill">${esc(tr('rs_av_' + k))} ${a[k]}</span>`).join('');
                parts.push(`<div class="rs-pills">${pills}</div>`);
            }
            parts.push(sourcesHTML(d));
        }
        return parts.join('');
    }

    function panelHTML(d, lose) {
        const off = offenseHTML(d);
        const def = defenseHTML(d, lose);
        return `<div class="rs-title">${esc(tr('rs_title_win'))}</div>`
            + (off ? `<div class="rs-section-head">${esc(tr('rs_offense'))}</div>${off}` : '')
            + (def ? `<div class="rs-section-head">${esc(tr('rs_defense'))}</div>${def}` : '');
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
        const hint = (reward && !d.rewarded)
            ? `<div class="rs-q-hint">${esc(tr('rs_q_hint', { n: REWARD_GOLD }))}</div>` : '';
        box.innerHTML = `<div class="rs-q-title">${esc(tr('rs_q_title'))}</div>
            ${hint}
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

        if (kind === 'win' || kind === 'map-win') achFightWon(peek());
        if (kind === 'win') { injectStyles(); renderWinColumns(peek()); return; }

        let anchor = null;
        if (isMap) anchor = host && host.querySelector('#sx-leave-summary-container');
        else if (kind === 'win') anchor = document.getElementById('item-reward-zone');
        else anchor = document.querySelector('#ov-lose .ov-btns');
        if (!anchor || !anchor.parentNode) return;
        // Map summaries show the analytics beside the loot panel (the overlay
        // is a flex row), not stacked above the loot.
        const oldHost = isMap ? host : anchor.parentNode;
        const old = oldHost.querySelector('.rs-panel');
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
                        _addGold(REWARD_GOLD);
                        return tr('rs_reward_gold', { n: REWARD_GOLD });
                    },
                };
            }
            wireQuestion(panel, d, q, reward);
        }
        if (isMap) {
            panel.classList.add('rs-side');
            host.classList.add('sx-has-side');
            host.appendChild(panel);
        } else {
            anchor.parentNode.insertBefore(panel, anchor);
        }
    }

    globalThis.RunStats = {
        hitDealt, critTrial, hitTaken, avoided, sourceLabel, renderInto,
        // test hooks
        _peek: peek, _buildQuestion: buildQuestion, _meanSd: meanSd, _reset() { data = null; },
    };
})();
