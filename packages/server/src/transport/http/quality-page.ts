export const qualityDashboardHtml = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Proxus — Agent Quality</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f1f5f9;color:#0f172a;height:100vh;overflow:hidden;display:flex;flex-direction:column}

    /* ── Top bar ── */
    .topbar{display:flex;align-items:center;justify-content:space-between;padding:.875rem 1.5rem;border-bottom:1px solid #e2e8f0;background:#fff;gap:1rem;flex-shrink:0}
    .logo-row{display:flex;align-items:center;gap:.625rem}
    .logo{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#38bdf8,#6366f1);display:grid;place-items:center;font-weight:800;font-size:.75rem;color:#fff}
    .app-name{font-weight:700;font-size:.95rem;color:#0f172a}
    .app-sub{font-size:.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em}
    .topbar-actions{display:flex;align-items:center;gap:.75rem}
    .btn{display:inline-flex;align-items:center;gap:.35rem;border:1px solid #cbd5e1;border-radius:99px;padding:.3rem .8rem;font-size:.75rem;color:#64748b;background:#fff;cursor:pointer}
    .btn:hover{border-color:#38bdf8;color:#0284c7}
    .meta-text{font-size:.7rem;color:#94a3b8}

    /* ── Layout: two independent panels filling the remaining viewport height ── */
    .layout{display:grid;grid-template-columns:1fr 650px;flex:1;min-height:0;overflow:hidden}
    .panel{display:flex;flex-direction:column;min-height:0;overflow:hidden;background:#f8fafc}
    .panel-right{background:#fff;border-left:1px solid #e2e8f0}
    .panel-header{padding:.75rem 1.25rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#fff}
    .panel-title{font-size:1.25rem;font-weight:800;letter-spacing:.02em;color:#0284c7}
    .panel-count{font-size:.75rem;color:#94a3b8}

    /* Left panel: scrollable trace list */
    .panel-body{flex:1;overflow-y:auto;padding:.75rem;min-height:0}

    /* ── KPI cards ── */
    .kpi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.5rem;padding:.75rem;flex:1;min-height:0;align-content:stretch}
    .kpi-card{border-radius:14px;text-align:center;border:1px solid;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.3rem;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.04)}
    .kpi-value{font-size:3rem;font-weight:800;line-height:1;letter-spacing:-.03em}
    .kpi-label{font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b;font-weight:600}
    .kpi-sub{font-size:.62rem;color:#94a3b8}
    .kpi-green{border-color:#bbf7d0}.kpi-green .kpi-value{color:#16a34a}
    .kpi-amber{border-color:#fde68a}.kpi-amber .kpi-value{color:#d97706}
    .kpi-red{border-color:#fecaca}.kpi-red .kpi-value{color:#dc2626}
    .kpi-purple{border-color:#ddd6fe}.kpi-purple .kpi-value{color:#7c3aed}
    .kpi-empty{border-color:#e2e8f0}.kpi-empty .kpi-value{color:#cbd5e1;font-size:1.4rem}

    @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .kpi-card.updated{animation:fadeIn .4s ease both}

    /* ── Run evaluation button — full-width CTA inside the eval panel ── */
    .eval-action{padding:.875rem 1.25rem 1.25rem;border-top:1px solid #e2e8f0;flex-shrink:0;background:#fff}
    .btn-run{width:100%;padding:1.1rem 1.5rem;background:#7c3aed;border:none;border-radius:14px;color:#fff;font-size:1rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.5rem;transition:background .15s;letter-spacing:.02em;box-shadow:0 2px 8px rgba(124,58,237,.25)}
    .btn-run:hover{background:#6d28d9;box-shadow:0 4px 12px rgba(124,58,237,.35)}
    .btn-run:disabled{background:#94a3b8;box-shadow:none;cursor:not-allowed}
    @keyframes spin{to{transform:rotate(360deg)}}
    .spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}

    /* ── Traces ── */
    .trace{border:1px solid #e2e8f0;border-radius:10px;margin-bottom:.4rem;overflow:hidden;cursor:pointer;background:#fff;transition:border-color .15s;box-shadow:0 1px 2px rgba(0,0,0,.03)}
    .trace:hover{border-color:#93c5fd}
    .trace.open{border-color:#93c5fd}
    .trace-header{padding:.5rem .75rem;display:flex;align-items:center;gap:.5rem}
    .dot{width:6px;height:6px;border-radius:99px;flex-shrink:0}
    .dot-ok{background:#22c55e}.dot-err{background:#ef4444}.dot-idle{background:#cbd5e1}
    .trace-input{font-size:.75rem;color:#334155;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .trace-meta{font-size:.65rem;color:#94a3b8;flex-shrink:0;text-align:right;line-height:1.4}
    .trace-body{padding:.5rem .75rem;border-top:1px solid #f1f5f9;background:#f8fafc;display:none}
    .trace.open .trace-body{display:block}
    .step{display:flex;gap:.4rem;margin-bottom:.375rem;font-size:.7rem}
    .step:last-child{margin-bottom:0}
    .step-tag{padding:.08rem .35rem;border-radius:4px;font-weight:600;white-space:nowrap;flex-shrink:0;font-size:.64rem}
    .t-user{background:#dbeafe;color:#1d4ed8}
    .t-call{background:#dcfce7;color:#15803d}
    .t-result{background:#ede9fe;color:#7c3aed}
    .t-fail{background:#fee2e2;color:#dc2626}
    .t-assistant{background:#f1f5f9;color:#334155}
    .step-txt{color:#64748b;word-break:break-all;line-height:1.4}
    .step-txt.final{color:#0f172a}
    .trace-footer{font-size:.65rem;color:#94a3b8;margin-top:.375rem}

    .empty{text-align:center;padding:2.5rem 1rem;color:#94a3b8;font-size:.8rem;line-height:1.8}
    .loading{text-align:center;padding:2rem;color:#94a3b8;font-size:.75rem}
  </style>
</head>
<body>
  <div class="topbar">
    <div class="logo-row">
      <div class="logo">P</div>
      <div>
        <div class="app-name">Proxus — Agent Quality</div>
        <div class="app-sub">Observability &amp; Evaluation</div>
      </div>
    </div>
    <div class="topbar-actions">
      <button class="btn" onclick="loadAll()">↻ Refresh</button>
    </div>
  </div>

  <div class="layout">
    <!-- Left: scrollable trace list -->
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Observability — live traces</span>
        <span class="panel-count" id="trace-count"></span>
      </div>
      <div class="panel-body" id="traces-body"><div class="loading">Loading…</div></div>
    </div>

    <!-- Right: fixed KPI cards + prominent run button at the bottom -->
    <div class="panel panel-right">
      <div class="panel-header">
        <span class="panel-title">Evaluation scores</span>
        <span class="meta-text" id="eval-time"></span>
      </div>
      <div class="kpi-grid" id="kpi-grid">
        ${[0,1,2,3,4,5].map(()=>'<div class="kpi-card kpi-empty"><div class="kpi-value">–</div></div>').join('')}
      </div>
      <div class="eval-action">
        <button class="btn-run" id="judge-btn" onclick="runJudge()">▶ Run evaluation</button>
      </div>
    </div>
  </div>

  <script>
    const esc = s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const cut = (s,n)=>{s=String(s||'');return s.length>n?s.slice(0,n)+'…':s;};
    const fmt = iso=>iso?new Date(iso).toLocaleString(undefined,{dateStyle:'short',timeStyle:'short'}):'–';

    function pctColor(p){return p===null?'kpi-empty':p>=80?'kpi-green':p>=60?'kpi-amber':'kpi-red'}
    function latColor(s){return s===null?'kpi-empty':s<5?'kpi-green':s<10?'kpi-amber':'kpi-red'}

    function kpiCard(value,label,sub,cls){
      return '<div class="kpi-card '+cls+'">'
        +'<div class="kpi-value">'+(value??'–')+'</div>'
        +'<div class="kpi-label">'+label+'</div>'
        +(sub?'<div class="kpi-sub">'+sub+'</div>':'')
        +'</div>';
    }

    function renderKpis(scored,_evals,traces){
      const s=scored?.scores;
      const tp=v=>v?Math.round(v/5*100):null;
      const acc=tp(s?.accuracy),help=tp(s?.helpfulness),gnd=tp(s?.groundedness);
      const lats=(traces||[]).filter(t=>t&&t.durationMs>0).map(t=>t.durationMs/1000);
      const avgLat=lats.length?Math.round(lats.reduce((a,b)=>a+b,0)/lats.length*10)/10:null;
      const sub=scored?scored.tracesEvaluated+' traces':null;

      // Token estimation: ~4 chars per token across all trace messages
      let totalTok=0;
      (traces||[]).forEach(t=>{
        (t.messages||[]).forEach(m=>{
          const txt=m.role==='tool-call'?JSON.stringify(m.input||''):
                    m.role==='tool-result'?JSON.stringify(m.result||''):
                    String(m.content||'');
          totalTok+=Math.round(txt.length/4);
        });
      });
      const fmtTok=totalTok>999999?(totalTok/1e6).toFixed(2)+'M':
                   totalTok>999?Math.round(totalTok/1000)+'K':
                   totalTok>0?String(totalTok):null;
      // Cost estimate: gemini-2.5-flash $0.15/1M input + $0.60/1M output, blended ~$0.30/1M
      const costUsd=totalTok/1e6*0.30;
      const fmtCost=totalTok>0?'$'+costUsd.toFixed(4):null;

      document.getElementById('kpi-grid').innerHTML=[
        kpiCard(acc!==null?acc+'%':null,'Accuracy',sub,pctColor(acc)),
        kpiCard(help!==null?help+'%':null,'Helpfulness',null,pctColor(help)),
        kpiCard(gnd!==null?gnd+'%':null,'Groundedness',null,pctColor(gnd)),
        kpiCard(avgLat!==null?avgLat+'s':null,'Avg latency',lats.length?lats.length+' calls':null,latColor(avgLat)),
        kpiCard(fmtTok,'Est. tokens','~4 chars/tok',fmtTok?'kpi-purple':'kpi-empty'),
        kpiCard(fmtCost,'Est. cost','flash 2.5 pricing',fmtCost?'kpi-purple':'kpi-empty')
      ].join('');
      if(scored) document.getElementById('eval-time').textContent='Last eval: '+fmt(scored.scoredAt);
    }

    function renderTraces(traces){
      if(!traces||traces.length===0){
        document.getElementById('trace-count').textContent='';
        return '<div class="empty">No traces yet.<br>Use the tutor at <b>localhost:5173</b><br>and the conversations appear here automatically.</div>';
      }
      document.getElementById('trace-count').textContent=traces.length+' trace'+(traces.length===1?'':'s');
      return traces.map((t,i)=>{
        const hasErr=(t.messages||[]).some(m=>m.role==='tool-result'&&m.isFailure);
        const toolCnt=(t.messages||[]).filter(m=>m.role==='tool-call').length;
        const dot=hasErr?'dot-err':toolCnt>0?'dot-ok':'dot-idle';
        const steps=(t.messages||[]).map(m=>{
          let tag='',cls='';
          if(m.role==='user'){tag='user';cls='t-user';}
          else if(m.role==='tool-call'){tag=m.name;cls='t-call';}
          else if(m.role==='tool-result'){tag=(m.isFailure?'✗ ':'')+m.name;cls=m.isFailure?'t-fail':'t-result';}
          else{tag='tutor';cls='t-assistant';}
          const raw=m.role==='tool-call'?JSON.stringify(m.input):m.role==='tool-result'?(typeof m.result==='string'?m.result:JSON.stringify(m.result)):(m.content||'');
          return '<div class="step"><span class="step-tag '+cls+'">'+esc(tag)+'</span><span class="step-txt'+(m.role==='assistant'?' final':'')+'" >'+esc(cut(raw,220))+'</span></div>';
        }).join('');
        return '<div class="trace" id="tr'+i+'">'
          +'<div class="trace-header" onclick="tog('+i+')">'
          +'<div class="dot '+dot+'"></div>'
          +'<div class="trace-input">'+esc(cut(t.input,75))+'</div>'
          +'<div class="trace-meta">'+fmt(t.timestamp)+'<br>'+(t.durationMs?(t.durationMs/1000).toFixed(1)+'s':'')+'</div>'
          +'</div>'
          +'<div class="trace-body">'+steps+'<div class="trace-footer">'+(t.durationMs?(t.durationMs/1000).toFixed(1)+'s':'')+'&nbsp;·&nbsp;'+(t.messages?t.messages.length:0)+' steps</div></div>'
          +'</div>';
      }).join('');
    }

    async function loadAll(){
      const [tr,sc]=await Promise.allSettled([
        fetch('/quality/traces').then(r=>r.json()),
        fetch('/quality/scores').then(r=>r.json())
      ]);
      const traces=tr.status==='fulfilled'?tr.value:[];
      const data=sc.status==='fulfilled'?sc.value:{};
      document.getElementById('traces-body').innerHTML=renderTraces(traces);
      renderKpis(data.scored||null,null,traces);
    }

    function tog(i){const el=document.getElementById('tr'+i);if(el)el.classList.toggle('open');}

    async function runJudge(){
      const btn=document.getElementById('judge-btn');
      btn.innerHTML='<span class="spinner"></span> Evaluating…';
      btn.disabled=true;
      try{
        const res=await fetch('/quality/run-judge',{method:'POST'});
        if(res.ok){
          const scored=await res.json();
          const traces=await fetch('/quality/traces').then(r=>r.json()).catch(()=>[]);
          renderKpis(scored,null,traces);
          document.querySelectorAll('.kpi-card').forEach(el=>{
            el.classList.remove('updated');
            void el.offsetWidth;
            el.classList.add('updated');
          });
          btn.innerHTML='✓ Done';
          btn.style.background='#16a34a';
          setTimeout(()=>{
            btn.innerHTML='▶ Run evaluation';
            btn.style.background='';
            btn.disabled=false;
          },2500);
        }
      }catch{
        btn.innerHTML='▶ Run evaluation';
        btn.disabled=false;
        alert('Eval failed. Run manually:\\npnpm --filter @proxus/server run eval:judge');
      }
    }

    loadAll();
    setInterval(loadAll,30000);
  </script>
</body>
</html>`;
