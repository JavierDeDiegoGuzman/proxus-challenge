export const qualityDashboardHtml = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Proxus — Agent Quality</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #020617;
      color: #e2e8f0;
      min-height: 100vh;
      padding: 2rem 1.5rem 4rem;
    }
    a { color: #38bdf8; text-decoration: none; }
    a:hover { text-decoration: underline; }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 2.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #1e293b;
    }
    .header-left { display: flex; align-items: center; gap: 0.75rem; }
    .logo {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg, #38bdf8, #6366f1);
      display: grid; place-items: center;
      font-weight: 800; font-size: 0.9rem; color: #fff;
    }
    .title { font-size: 1.5rem; font-weight: 700; color: #f1f5f9; }
    .subtitle { font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.15rem; }
    .meta { font-size: 0.8rem; color: #475569; }

    .totals {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
      margin-bottom: 2.5rem;
    }
    .total-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
    }
    .total-card .value {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1;
    }
    .total-card .label {
      font-size: 0.75rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-top: 0.4rem;
    }
    .value.green { color: #34d399; }
    .value.red { color: #f87171; }
    .value.sky { color: #38bdf8; }

    .dataset {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 20px;
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    .dataset-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #1e293b;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }
    .dataset-id {
      font-size: 0.75rem;
      font-weight: 700;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }
    .dataset-desc {
      font-size: 0.85rem;
      color: #94a3b8;
      margin-top: 0.3rem;
    }
    .dataset-badge {
      white-space: nowrap;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 99px;
    }
    .badge-green { background: #064e3b; color: #34d399; }
    .badge-red { background: #450a0a; color: #f87171; }

    .case-list { list-style: none; }
    .case-item {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #0f172a;
      display: grid;
      gap: 0.5rem;
    }
    .case-item:last-child { border-bottom: none; }
    .case-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .case-id {
      font-size: 0.875rem;
      font-weight: 600;
      color: #cbd5e1;
    }
    .case-output {
      font-size: 0.75rem;
      color: #475569;
      font-family: monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 60ch;
    }
    .status-icon { font-size: 1rem; }

    .criteria { margin-top: 0.5rem; display: grid; gap: 0.3rem; }
    .criterion {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.78rem;
      color: #64748b;
    }
    .criterion.passed { color: #6ee7b7; }
    .criterion.failed { color: #fca5a5; }
    .crit-icon { flex-shrink: 0; margin-top: 0.05rem; }
    .crit-msg { color: inherit; }

    .empty {
      text-align: center;
      padding: 4rem 2rem;
      color: #475569;
    }
    .empty code {
      display: inline-block;
      margin-top: 0.75rem;
      padding: 0.5rem 1rem;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      font-family: monospace;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .refresh {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      border: 1px solid #1e293b;
      border-radius: 99px;
      padding: 0.35rem 0.9rem;
      font-size: 0.8rem;
      color: #94a3b8;
      background: transparent;
      cursor: pointer;
    }
    .refresh:hover { border-color: #38bdf8; color: #38bdf8; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="logo">P</div>
      <div>
        <div class="title">Agent Quality</div>
        <div class="subtitle">Proxus Tutor · Eval Dashboard</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:1rem;">
      <div class="meta" id="meta">Loading…</div>
      <button class="refresh" onclick="load()">↻ Refresh</button>
    </div>
  </div>

  <div class="totals" id="totals"></div>
  <div id="datasets"></div>

  <script>
    async function load() {
      document.getElementById('meta').textContent = 'Loading…';
      try {
        const res = await fetch('/quality/data');
        const data = await res.json();

        if (data.error) {
          document.getElementById('datasets').innerHTML =
            '<div class="empty"><p>' + data.error + '</p><code>pnpm --filter @proxus/server run eval:report</code></div>';
          document.getElementById('meta').textContent = '';
          document.getElementById('totals').innerHTML = '';
          return;
        }

        const { totals, datasets, generatedAt } = data;
        const pct = totals.total === 0 ? 0 : Math.round(totals.passed / totals.total * 100);

        document.getElementById('meta').textContent = 'Last run: ' + new Date(generatedAt).toLocaleString();

        document.getElementById('totals').innerHTML =
          '<div class="total-card"><div class="value sky">' + pct + '%</div><div class="label">Pass rate</div></div>' +
          '<div class="total-card"><div class="value green">' + totals.passed + '</div><div class="label">Passed</div></div>' +
          '<div class="total-card"><div class="value red">' + totals.failed + '</div><div class="label">Failed</div></div>' +
          '<div class="total-card"><div class="value" style="color:#94a3b8">' + totals.total + '</div><div class="label">Total checks</div></div>';

        document.getElementById('datasets').innerHTML = datasets.map(renderDataset).join('');
      } catch (e) {
        document.getElementById('meta').textContent = 'Error: ' + e.message;
      }
    }

    function renderDataset(dataset) {
      const passed = dataset.cases.filter(c => c.status === 'passed').length;
      const total = dataset.cases.length;
      const allPassed = passed === total;
      return '<div class="dataset">' +
        '<div class="dataset-header">' +
          '<div>' +
            '<div class="dataset-id">' + dataset.id + '</div>' +
            '<div class="dataset-desc">' + dataset.description + '</div>' +
          '</div>' +
          '<div class="dataset-badge ' + (allPassed ? 'badge-green' : 'badge-red') + '">' +
            passed + '/' + total + ' passed' +
          '</div>' +
        '</div>' +
        '<ul class="case-list">' + dataset.cases.map(renderCase).join('') + '</ul>' +
      '</div>';
    }

    function renderCase(c) {
      const icon = c.status === 'passed' ? '✓' : '✗';
      const color = c.status === 'passed' ? '#34d399' : '#f87171';
      const criteria = c.criteria.map(cr =>
        '<div class="criterion ' + cr.status + '">' +
          '<span class="crit-icon">' + (cr.status === 'passed' ? '✓' : '✗') + '</span>' +
          '<span class="crit-msg">' + cr.id + ': ' + cr.message + '</span>' +
        '</div>'
      ).join('');
      return '<li class="case-item">' +
        '<div class="case-row">' +
          '<div class="case-id"><span style="color:' + color + ';margin-right:0.5rem">' + icon + '</span>' + c.caseId + '</div>' +
          '<div class="case-output">' + (c.output ? c.output.slice(0, 80) + (c.output.length > 80 ? '…' : '') : '') + '</div>' +
        '</div>' +
        '<div class="criteria">' + criteria + '</div>' +
      '</li>';
    }

    load();
  </script>
</body>
</html>`;
