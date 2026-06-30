export const qualityDashboardHtml = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Proxus — Agent Quality</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#020617;color:#e2e8f0;min-height:100vh;display:flex;flex-direction:column}
    .topbar{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:1px solid #1e293b;gap:1rem;flex-shrink:0}
    .logo-row{display:flex;align-items:center;gap:.625rem}
    .logo{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#38bdf8,#6366f1);display:grid;place-items:center;font-weight:800;font-size:.75rem;color:#fff}
    .app-name{font-weight:700;font-size:1rem;color:#f1f5f9}
    .app-sub{font-size:.7rem;color:#475569;text-transform:uppercase;letter-spacing:.07em}
    .topbar-actions{display:flex;align-items:center;gap:.75rem}
    .btn{display:inline-flex;align-items:center;gap:.35rem;border:1px solid #1e293b;border-radius:99px;padding:.3rem .8rem;font-size:.75rem;color:#94a3b8;background:transparent;cursor:pointer;white-space:nowrap}
    .btn:hover{border-color:#38bdf8;color:#38bdf8}
    .btn-primary{background:#0284c7;border-color:#0284c7;color:#fff}
    .btn-primary:hover{background:#0369a1;border-color:#0369a1;color:#fff}
    .meta-text{font-size:.72rem;color:#475569}

    .layout{display:grid;grid-template-columns:1fr 380px;flex:1;min-height:0;overflow:hidden}
    .panel{display:flex;flex-direction:column;overflow:hidden}
    .panel-left{border-right:1px solid #1e293b}
    .panel-header{padding:.875rem 1.25rem;border-bottom:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-shrink:0}
    .panel-title{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#38bdf8}
    .panel-count{font-size:.7rem;color:#475569}
    .panel-body{flex:1;overflow-y:auto;padding:.75rem}

    /* Traces */
    .trace{border:1px solid #1e293b;border-radius:12px;margin-bottom:.5rem;overflow:hidden;cursor:pointer;transition:border-color .15s}
    .trace:hover{border-color:#334155}
    .trace.open{border-color:#334155}
    .trace-header{padding:.625rem .875rem;display:flex;align-items:center;gap:.625rem}
    .trace-dot{width:7px;height:7px;border-radius:99px;flex-shrink:0}
    .dot-ok{background:#34d399}
    .dot-err{background:#f87171}
    .dot-tool{background:#94a3b8}
    .trace-input{font-size:.8rem;color:#cbd5e1;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .trace-meta{font-size:.68rem;color:#475569;flex-shrink:0;text-align:right}
    .trace-body{padding:.625rem .875rem;border-top:1px solid #1e293b;background:#0a0f1a;display:none}
    .trace.open .trace-body{display:block}
    .step{display:flex;gap:.5rem;margin-bottom:.5rem;font-size:.73rem}
    .step:last-child{margin-bottom:0}
    .step-label{padding:.1rem .4rem;border-radius:4px;font-weight:600;white-space:nowrap;flex-shrink:0;font-size:.68rem}
    .label-user{background:#1e3a5f;color:#93c5fd}
    .label-tool-call{background:#1a2a1a;color:#86efac}
    .label-tool-result{background:#1a1a2a;color:#a78bfa}
    .label-tool-fail{background:#2a1a1a;color:#fca5a5}
    .label-assistant{background:#1e293b;color:#e2e8f0}
    .step-content{color:#94a3b8;word-break:break-all;line-height:1.4}
    .step-content.assistant{color:#e2e8f0}
    .duration{font-size:.68rem;color:#475569;margin-top:.375rem}

    .empty-state{text-align:center;padding:3rem 1rem;color:#475569}
    .empty-state code{display:inline-block;margin-top:.5rem;padding:.35rem .75rem;background:#0f172a;border:1px solid #1e293b;border-radius:6px;font-family:monospace;font-size:.75rem;color:#94a3b8}

    /* Scores panel */
    .scores-section{padding:.875rem 1rem;border-bottom:1px solid #1e293b}
    .score-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-top:.625rem}
    .score-card{background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:.625rem .75rem;text-align:center}
    .score-value{font-size:1.5rem;font-weight:800;line-height:1}
    .score-value.hi{color:#34d399}
    .score-value.mid{color:#fbbf24}
    .score-value.lo{color:#f87171}
    .score-value.na{color:#475569;font-size:1rem}
    .score-label{font-size:.65rem;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-top:.25rem}
    .score-meta{font-size:.68rem;color:#475569;margin-top:.375rem}

    .evals-section{padding:.875rem 1rem}
    .eval-row{display:flex;align-items:center;gap:.5rem;padding:.4rem 0;border-bottom:1px solid #0f172a;font-size:.75rem}
    .eval-row:last-child{border-bottom:none}
    .eval-icon{flex-shrink:0;font-size:.85rem}
    .eval-id{flex:1;color:#94a3b8;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .eval-badge{padding:.1rem .45rem;border-radius:99px;font-size:.65rem;font-weight:600;flex-shrink:0}
    .badge-ok{background:#064e3b;color:#34d399}
    .badge-fail{background:#450a0a;color:#f87171}
    .section-title{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#475569;margin-bottom:.5rem}
    .no-data{font-size:.75rem;color:#475569;padding:.5rem 0}

    .loading{text-align:center;padding:2rem;color:#475569;font-size:.8rem}
  </style>
</head>
<body>
  <div class="topbar">
    <div class="logo-row">
      <div class="logo">P</div>
      <div>
        <div class="app-name">Proxus — Agent Quality</div>
        <div class="app-sub">Observability & Evaluation</div>
      </div>
    </div>
    <div class="topbar-actions">
      <span class="meta-text" id="last-eval-time"></span>
      <button class="btn" onclick="loadAll()">↻ Refresh</button>
      <button class="btn btn-primary" onclick="runJudge()">▶ Run evaluation</button>
    </div>
  </div>

  <div class="layout">
    <!-- LEFT: Observability traces -->
    <div class="panel panel-left">
      <div class="panel-header">
        <span class="panel-title">Observability — real conversation traces</span>
        <span class="panel-count" id="trace-count"></span>
      </div>
      <div class="panel-body" id="traces-body">
        <div class="loading">Loading traces…</div>
      </div>
    </div>

    <!-- RIGHT: Evaluation scores -->
    <div class="panel panel-right">
      <div class="panel-header">
        <span class="panel-title">Last evaluation scores</span>
      </div>
      <div id="scores-body" style="overflow-y:auto;flex:1">
        <div class="loading">Loading scores…</div>
      </div>
    </div>
  </div>

  <script>
    function scoreColor(v) {
      if (!v || v === 0) return 'na';
      return v >= 4 ? 'hi' : v >= 3 ? 'mid' : 'lo';
    }

    function fmt(iso) {
      if (!iso) return '–';
      return new Date(iso).toLocaleString(undefined, {dateStyle:'short',timeStyle:'short'});
    }

    function truncate(s, n) {
      s = String(s || '');
      return s.length > n ? s.slice(0, n) + '…' : s;
    }

    function renderStep(msg) {
      let label = '', labelClass = '', content = '';
      if (msg.role === 'user') {
        label = 'user'; labelClass = 'label-user';
        content = truncate(msg.content, 200);
      } else if (msg.role === 'tool-call') {
        label = 'tool: ' + msg.name; labelClass = 'label-tool-call';
        content = truncate(JSON.stringify(msg.input), 200);
      } else if (msg.role === 'tool-result') {
        const fail = msg.isFailure;
        label = (fail ? '✗ ' : '') + msg.name; labelClass = fail ? 'label-tool-fail' : 'label-tool-result';
        content = truncate(typeof msg.result === 'string' ? msg.result : JSON.stringify(msg.result), 200);
      } else if (msg.role === 'assistant') {
        label = 'tutor'; labelClass = 'label-assistant';
        content = truncate(msg.content, 300);
      }
      return '<div class="step"><span class="step-label ' + labelClass + '">' + label + '</span><span class="step-content' + (msg.role === 'assistant' ? ' assistant' : '') + '">' + escHtml(content) + '</span></div>';
    }

    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function renderTraces(traces) {
      if (!traces || traces.length === 0) {
        return '<div class="empty-state"><p>No traces yet. Use the tutor in the app to generate conversations.</p><code>http://localhost:5173</code></div>';
      }
      document.getElementById('trace-count').textContent = traces.length + ' trace' + (traces.length === 1 ? '' : 's');
      return traces.map((t, i) => {
        const hasErr = t.messages && t.messages.some(m => m.role === 'tool-result' && m.isFailure);
        const toolCount = t.messages ? t.messages.filter(m => m.role === 'tool-call').length : 0;
        const dotClass = hasErr ? 'dot-err' : toolCount > 0 ? 'dot-ok' : 'dot-tool';
        const steps = (t.messages || []).map(renderStep).join('');
        return '<div class="trace" id="tr' + i + '">'
          + '<div class="trace-header" onclick="toggle(' + i + ')">'
            + '<div class="trace-dot ' + dotClass + '"></div>'
            + '<div class="trace-input">' + escHtml(truncate(t.input, 80)) + '</div>'
            + '<div class="trace-meta">' + fmt(t.timestamp) + '<br>' + (t.durationMs ? (t.durationMs/1000).toFixed(1) + 's' : '') + '</div>'
          + '</div>'
          + '<div class="trace-body">' + steps + '<div class="duration">Duration: ' + (t.durationMs ? (t.durationMs/1000).toFixed(1) + 's' : '–') + ' · ' + (t.messages ? t.messages.length : 0) + ' steps</div></div>'
        + '</div>';
      }).join('');
    }

    function renderScores(data) {
      const { scored, evals } = data || {};
      let html = '';

      if (scored) {
        const s = scored.scores;
        document.getElementById('last-eval-time').textContent = 'Last eval: ' + fmt(scored.scoredAt) + ' (' + scored.tracesEvaluated + ' traces)';
        html += '<div class="scores-section">'
          + '<div class="section-title">LLM-as-judge scores (avg / 5)</div>'
          + '<div class="score-cards">'
          + '<div class="score-card"><div class="score-value ' + scoreColor(s.accuracy) + '">' + (s.accuracy || '–') + '</div><div class="score-label">Accuracy</div></div>'
          + '<div class="score-card"><div class="score-value ' + scoreColor(s.helpfulness) + '">' + (s.helpfulness || '–') + '</div><div class="score-label">Helpfulness</div></div>'
          + '<div class="score-card"><div class="score-value ' + scoreColor(s.groundedness) + '">' + (s.groundedness || '–') + '</div><div class="score-label">Groundedness</div></div>'
          + '</div>'
          + '<div class="score-meta" style="margin-top:.5rem">'
          + (scored.perTrace || []).map(t =>
              '<div style="display:flex;justify-content:space-between;font-size:.68rem;color:#475569;padding:.2rem 0;border-bottom:1px solid #0f172a">'
              + '<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escHtml(truncate(t.input, 55)) + '</span>'
              + '<span style="flex-shrink:0;margin-left:.5rem">' + t.scores.accuracy + '/' + t.scores.helpfulness + '/' + t.scores.groundedness + '</span>'
              + '</div>'
            ).join('')
          + '</div>'
          + '</div>';
      } else {
        html += '<div class="scores-section"><div class="section-title">LLM-as-judge scores</div><div class="no-data">No evaluation run yet.<br>Click "Run evaluation" above or:<br><code style="font-size:.7rem;font-family:monospace;color:#94a3b8">pnpm --filter @proxus/server run eval:judge</code></div></div>';
      }

      if (evals) {
        const allCases = (evals.datasets || []).flatMap(d => (d.cases || []).map(c => ({...c, datasetId: d.id})));
        const passed = allCases.filter(c => c.status === 'passed').length;
        html += '<div class="evals-section"><div class="section-title">Fixed eval checks (' + passed + '/' + allCases.length + ' passed)</div>'
          + (allCases.length === 0 ? '<div class="no-data">No eval report yet. Run eval:report</div>' : '')
          + allCases.map(c =>
              '<div class="eval-row">'
              + '<span class="eval-icon">' + (c.status === 'passed' ? '✓' : '✗') + '</span>'
              + '<span class="eval-id">' + escHtml(c.caseId) + '</span>'
              + '<span class="eval-badge ' + (c.status === 'passed' ? 'badge-ok' : 'badge-fail') + '">' + c.status + '</span>'
              + '</div>'
            ).join('')
          + '</div>';
      }

      return html;
    }

    function toggle(i) {
      const el = document.getElementById('tr' + i);
      if (el) el.classList.toggle('open');
    }

    async function loadTraces() {
      try {
        const r = await fetch('/quality/traces');
        const traces = await r.json();
        document.getElementById('traces-body').innerHTML = renderTraces(traces);
      } catch(e) {
        document.getElementById('traces-body').innerHTML = '<div class="empty-state"><p>Could not load traces: ' + e.message + '</p></div>';
      }
    }

    async function loadScores() {
      try {
        const r = await fetch('/quality/scores');
        const data = await r.json();
        document.getElementById('scores-body').innerHTML = renderScores(data);
      } catch(e) {
        document.getElementById('scores-body').innerHTML = '<div class="scores-section"><div class="no-data">Could not load scores.</div></div>';
      }
    }

    function loadAll() {
      loadTraces();
      loadScores();
    }

    async function runJudge() {
      const btn = document.querySelector('.btn-primary');
      btn.textContent = 'Running…';
      btn.disabled = true;
      try {
        await fetch('/quality/run-judge', {method:'POST'});
        await loadScores();
      } catch(e) {
        alert('Run: pnpm --filter @proxus/server run eval:judge');
      } finally {
        btn.textContent = '▶ Run evaluation';
        btn.disabled = false;
      }
    }

    loadAll();
    setInterval(loadAll, 30000);
  </script>
</body>
</html>`;
