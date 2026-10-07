let allRows = [];
let filteredRows = [];

const ratingMap = [
  ['salario_prestaciones','Salario y prestaciones'],
  ['funciones_carga','Funciones y carga de trabajo'],
  ['liderazgo','Liderazgo de su jefe(a) inmediato(a)'],
  ['ambiente_companeros','Ambiente con sus compañeros'],
  ['comunicacion_interna','Comunicación interna'],
  ['capacitacion_desarrollo','Capacitación y desarrollo'],
  ['instalaciones_herramientas','Instalaciones, seguridad y herramientas']
];

const byId = id => document.getElementById(id);

byId('csvFile').addEventListener('change', e => e.target.files[0] && loadCsvFile(e.target.files[0]));
byId('changeFileBtn').addEventListener('click', ()=>{
  byId('csvFile').value='';
  byId('importView').hidden=false;
  byId('dashboardView').hidden=true;
  window.scrollTo({top:0,behavior:'smooth'});
});
byId('printDashboardBtn').addEventListener('click', printDashboardReport);
byId('clearFilters').addEventListener('click', ()=>{
  ['filterArea','filterType','filterFrom','filterTo'].forEach(id=>byId(id).value='');
  applyFilters();
});
['filterArea','filterType','filterFrom','filterTo'].forEach(id=>byId(id).addEventListener('change',applyFilters));

const drop = document.querySelector('.file-drop');
['dragenter','dragover'].forEach(evt=>drop.addEventListener(evt,e=>{e.preventDefault();drop.classList.add('dragging');}));
['dragleave','drop'].forEach(evt=>drop.addEventListener(evt,e=>{e.preventDefault();drop.classList.remove('dragging');}));
drop.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f)loadCsvFile(f);});

async function loadCsvFile(file){
  byId('csvMessage').textContent='Leyendo archivo…';
  try{
    const text = await file.text();
    const parsed = parseCSV(text);
    if(parsed.length < 2) throw new Error('El CSV no contiene registros.');
    const headers=parsed[0].map(x=>normalizeHeader(x));
    allRows=parsed.slice(1).filter(row=>row.some(v=>String(v).trim())).map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]??''])));
    if(!headers.includes('departamento') || !headers.includes('fecha_salida')) throw new Error('El archivo no parece corresponder al formato SARFRUT V4.');
    normalizeRows();
    fillFilters();
    applyFilters();
    byId('importView').hidden=true;
    byId('dashboardView').hidden=false;
    byId('lastUpdated').textContent=`${file.name} · ${allRows.length} registros · cargado localmente`;
    byId('csvMessage').textContent='';
  }catch(err){
    byId('csvMessage').textContent=err.message || 'No fue posible leer el CSV.';
  }
}

function normalizeHeader(h){
  return String(h||'').trim().toLowerCase().replace(/\s+/g,'_');
}

function normalizeRows(){
  const numeric=[...ratingMap.map(x=>x[0]),'promedio'];
  allRows.forEach(r=>{
    numeric.forEach(k=>{
      const n=Number(String(r[k]??'').replace(',','.'));
      r[k]=Number.isFinite(n) && n!==0 ? n : null;
    });
    r.recomendaria = parseBool(r.recomendaria);
    r.regresaria = parseBool(r.regresaria);
    r.motivos_array=String(r.motivos||'').split(/\s*\|\s*/).filter(Boolean);
  });
}

function parseBool(v){
  const s=String(v??'').trim().toLowerCase();
  return ['sí','si','true','1','yes'].includes(s);
}

function parseCSV(text){
  const rows=[];
  let row=[],field='',quoted=false;
  text=String(text||'').replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){
      if(c==='"' && text[i+1]==='"'){ field+='"'; i++; }
      else if(c==='"') quoted=false;
      else field+=c;
    }else{
      if(c==='"') quoted=true;
      else if(c===','){ row.push(field); field=''; }
      else if(c==='\n'){ row.push(field.replace(/\r$/,'')); rows.push(row); row=[]; field=''; }
      else field+=c;
    }
  }
  if(field.length || row.length){ row.push(field.replace(/\r$/,'')); rows.push(row); }
  return rows;
}

function fillFilters(){
  const areas=[...new Set(allRows.map(r=>r.departamento).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  const types=[...new Set(allRows.map(r=>r.tipo_salida).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  byId('filterArea').innerHTML='<option value="">Todas</option>'+areas.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
  byId('filterType').innerHTML='<option value="">Todos</option>'+types.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
}

function applyFilters(){
  const area=byId('filterArea').value;
  const type=byId('filterType').value;
  const from=byId('filterFrom').value;
  const to=byId('filterTo').value;
  filteredRows=allRows.filter(r=>(!area||r.departamento===area)&&(!type||r.tipo_salida===type)&&(!from||r.fecha_salida>=from)&&(!to||r.fecha_salida<=to));
  renderKPIs();
  renderReasons();
  renderRatings();
  renderTable();
  renderFilterSummary();
}

const percent=(n,d)=>d?`${Math.round(n/d*100)}%`:'—';

function rowAverage(r){
  if(Number.isFinite(r.promedio) && r.promedio) return r.promedio;
  const vals=ratingMap.map(([k])=>Number(r[k])).filter(v=>Number.isFinite(v)&&v>0);
  return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
}

function renderKPIs(){
  const n=filteredRows.length;
  byId('kpiTotal').textContent=n;
  byId('kpiRecommend').textContent=percent(filteredRows.filter(r=>r.recomendaria).length,n);
  byId('kpiReturn').textContent=percent(filteredRows.filter(r=>r.regresaria).length,n);
  const avgs=filteredRows.map(rowAverage).filter(v=>v!==null);
  byId('kpiAverage').textContent=avgs.length?(avgs.reduce((a,b)=>a+b,0)/avgs.length).toFixed(1):'—';
}

function reasonEntries(){
  const counts={};
  filteredRows.forEach(r=>(r.motivos_array||[]).forEach(m=>counts[m]=(counts[m]||0)+1));
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]);
}

function ratingEntries(){
  return ratingMap.map(([k,label])=>{
    const vals=filteredRows.map(r=>Number(r[k])).filter(v=>Number.isFinite(v)&&v>0);
    return [label,vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null];
  }).filter(x=>x[1]!==null);
}

function renderReasons(){
  const entries=reasonEntries();
  const max=entries[0]?.[1]||1;
  byId('reasonsChart').innerHTML=entries.length?entries.map(([label,n])=>`<div class="bar-item"><div class="bar-label">${escapeHtml(label)}</div><div class="bar-track"><div class="bar-fill" style="width:${n/max*100}%"></div></div><div class="bar-value">${n}</div></div>`).join(''):'<div class="empty-state">No hay datos para estos filtros.</div>';
}

function renderRatings(){
  const entries=ratingEntries();
  byId('ratingsChart').innerHTML=entries.length?entries.map(([label,v])=>`<div class="bar-item"><div class="bar-label">${escapeHtml(label)}</div><div class="bar-track"><div class="bar-fill" style="width:${v/5*100}%"></div></div><div class="bar-value">${v.toFixed(1)}</div></div>`).join(''):'<div class="empty-state">No hay datos para estos filtros.</div>';
}

function renderTable(){
  byId('tableCount').textContent=filteredRows.length;
  byId('responsesTable').innerHTML=filteredRows.length?filteredRows.map(r=>`<tr><td>${fmtDate(r.fecha_salida)}</td><td>${escapeHtml(r.departamento||'—')}</td><td>${escapeHtml(r.puesto||'—')}</td><td>${escapeHtml(r.tipo_salida||'—')}</td><td>${escapeHtml(r.motivos||'—')}</td><td>${rowAverage(r)?.toFixed(1)||'—'}</td></tr>`).join(''):'<tr><td colspan="6"><div class="empty-state">No hay registros.</div></td></tr>';
}

function renderFilterSummary(){
  const area=byId('filterArea').value||'Todas las áreas';
  const type=byId('filterType').value||'Todos los tipos';
  const from=byId('filterFrom').value;
  const to=byId('filterTo').value;
  let period='Todas las fechas';
  if(from&&to) period=`${fmtDate(from)} a ${fmtDate(to)}`;
  else if(from) period=`Desde ${fmtDate(from)}`;
  else if(to) period=`Hasta ${fmtDate(to)}`;
  byId('activeFilterSummary').textContent=`${area} · ${type} · ${period}`;
}

function printDashboardReport(){
  if(!filteredRows.length){ alert('No hay registros para los filtros seleccionados.'); return; }
  const n=filteredRows.length;
  const avgs=filteredRows.map(rowAverage).filter(v=>v!==null);
  const average=avgs.length?(avgs.reduce((a,b)=>a+b,0)/avgs.length).toFixed(1):'—';
  const reasons=reasonEntries();
  const ratings=ratingEntries();
  const reasonMax=reasons[0]?.[1]||1;
  const area=byId('filterArea').value||'Todas las áreas';
  const type=byId('filterType').value||'Todos los tipos de salida';
  const from=byId('filterFrom').value;
  const to=byId('filterTo').value;
  let period='Todas las fechas';
  if(from&&to) period=`${fmtDate(from)} – ${fmtDate(to)}`;
  else if(from) period=`Desde ${fmtDate(from)}`;
  else if(to) period=`Hasta ${fmtDate(to)}`;

  const bars=(items,max,scaleLabel)=>items.map(([label,value])=>`<div class="pbar"><span>${escapeHtml(label)}</span><i><b style="width:${Math.max(2,(value/max)*100)}%"></b></i><strong>${scaleLabel(value)}</strong></div>`).join('');
  const rows=filteredRows.map(r=>`<tr><td>${fmtDate(r.fecha_salida)}</td><td>${escapeHtml(r.departamento||'—')}</td><td>${escapeHtml(r.puesto||'—')}</td><td>${escapeHtml(r.tipo_salida||'—')}</td><td>${rowAverage(r)?.toFixed(1)||'—'}</td></tr>`).join('');

  const w=window.open('','_blank');
  if(!w){ alert('Permite ventanas emergentes para imprimir el reporte.'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de salida - ${escapeHtml(area)}</title><style>${printCss()}</style></head><body><header><img src="${location.origin}/assets/logo-sarfrut.png"><div><b>SARFRUT S.A. DE C.V.</b><h1>REPORTE DE ENTREVISTAS DE SALIDA</h1><small>Recursos Humanos · análisis estadístico</small></div></header><div class="notice">Documento confidencial de uso interno. Fuente: archivo CSV cargado localmente.</div><div class="filters"><div><b>Área</b><span>${escapeHtml(area)}</span></div><div><b>Tipo</b><span>${escapeHtml(type)}</span></div><div><b>Periodo</b><span>${escapeHtml(period)}</span></div></div><div class="kpis"><div><b>${n}</b><span>Entrevistas</span></div><div><b>${percent(filteredRows.filter(r=>r.recomendaria).length,n)}</b><span>Recomendarían</span></div><div><b>${percent(filteredRows.filter(r=>r.regresaria).length,n)}</b><span>Regresarían</span></div><div><b>${average}/5</b><span>Satisfacción</span></div></div><main><section><h2>Principales causas de salida</h2>${bars(reasons,reasonMax,v=>`${v}`)}</section><section><h2>Promedio por aspecto</h2>${bars(ratings,5,v=>`${v.toFixed(1)}/5`)}</section></main><section class="table"><h2>Registros incluidos</h2><table><thead><tr><th>Salida</th><th>Área</th><th>Puesto</th><th>Tipo</th><th>Prom.</th></tr></thead><tbody>${rows}</tbody></table></section><footer>SARFRUT S.A. DE C.V. · Recursos Humanos · Generado ${new Date().toLocaleString('es-MX')}</footer><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350));<\/script></body></html>`);
  w.document.close();
}

function printCss(){
  return `@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#203128;margin:0;font-size:10px}header{display:flex;align-items:center;gap:14px;border-bottom:4px solid #08783f;padding-bottom:8px}header img{width:50px;height:50px;object-fit:contain}h1{font-size:20px;color:#0b4c31;margin:3px 0}header small{color:#66756c;text-transform:uppercase}.notice{margin:8px 0;background:#edf7f1;padding:7px;color:#0b4c31}.filters,.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:8px 0}.filters div,.kpis div{border:1px solid #dce4df;border-radius:6px;padding:7px}.filters b,.filters span{display:block}.filters span{margin-top:2px}.kpis{grid-template-columns:repeat(4,1fr)}.kpis b{display:block;font-size:20px;color:#08783f}.kpis span{color:#6a786f}main{display:grid;grid-template-columns:1fr 1fr;gap:10px}section{border:1px solid #dfe6e1;border-radius:7px;padding:9px}h2{font-size:12px;color:#0b4c31;margin:0 0 8px}.pbar{display:grid;grid-template-columns:150px 1fr 38px;gap:7px;align-items:center;margin:6px 0}.pbar i{height:7px;background:#eef2ef;border-radius:9px;overflow:hidden}.pbar i b{display:block;height:100%;background:#08783f}.pbar strong{text-align:right}.table{margin-top:10px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e5ebe7;padding:5px;text-align:left}th{background:#f4f8f5;color:#0b4c31}footer{margin-top:8px;border-top:1px solid #dfe6e1;padding-top:6px;color:#718078;font-size:8px}`;
}

function fmtDate(v){
  if(!v) return '—';
  const s=String(v).slice(0,10);
  const p=s.split('-');
  return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v;
}

function escapeHtml(s){
  return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
