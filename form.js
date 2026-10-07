const ratingFields = [
  ['salario_prestaciones', 'Salario y prestaciones'],
  ['funciones_carga', 'Funciones y carga de trabajo'],
  ['liderazgo', 'Liderazgo de su jefe(a) inmediato(a)'],
  ['ambiente_companeros', 'Ambiente con sus compañeros'],
  ['comunicacion_interna', 'Comunicación interna'],
  ['capacitacion_desarrollo', 'Capacitación y desarrollo'],
  ['instalaciones_herramientas', 'Instalaciones, seguridad y herramientas']
];

const ratingLabels = {1:'Muy insatisfecho',2:'Insatisfecho',3:'Neutral',4:'Satisfecho',5:'Muy satisfecho'};
const form = document.getElementById('exitForm');
const ratings = document.getElementById('ratings');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');
const message = document.getElementById('formMessage');
const submitBtn = document.getElementById('submitBtn');
const successModal = document.getElementById('successModal');
const config = window.SARFRUT_CONFIG || {};
let lastPayload = null;
let lastAnalysis = null;

function renderRatings(){
  const legend = document.createElement('div');
  legend.className = 'rating-legend';
  legend.innerHTML = `<div></div><div>${[1,2,3,4,5].map(v=>`<span title="${ratingLabels[v]}">${v}</span>`).join('')}</div>`;
  ratings.appendChild(legend);
  ratingFields.forEach(([name,label]) => {
    const row = document.createElement('div');
    row.className = 'rating-row';
    row.innerHTML = `<div class="rating-label">${label}</div><div class="rating-options">${[1,2,3,4,5].map(v=>`<label class="rating-option" title="${ratingLabels[v]}"><input type="radio" name="${name}" value="${v}" required><span>${v}</span></label>`).join('')}</div>`;
    ratings.appendChild(row);
  });
}
renderRatings();

document.getElementById('fechaAplicacion').value = new Date().toISOString().slice(0,10);

const privacyModeText = document.getElementById('privacyModeText');
if(config.SAVE_TO_GOOGLE_SHEETS && config.GOOGLE_SHEETS_WEB_APP_URL){
  privacyModeText.textContent = 'el PDF se genera en este dispositivo. Además, se enviará un registro estadístico a la hoja privada de Recursos Humanos; Vercel no almacena la entrevista.';
}

function syncConditional(){
  const tipo = form.querySelector('input[name="tipo_salida"]:checked')?.value;
  document.getElementById('tipoOtroWrap').hidden = tipo !== 'Otro';
  const otroMotivo = [...form.querySelectorAll('input[name="motivos"]')].some(x => x.value === 'Otro' && x.checked);
  document.getElementById('motivoOtroWrap').hidden = !otroMotivo;
}
form.addEventListener('change', syncConditional);

function updateProgress(){
  const requiredGroups = [
    !!form.nombre.value.trim(), !!form.puesto.value.trim(), !!form.departamento.value.trim(),
    !!form.fecha_salida.value, !!form.querySelector('input[name="tipo_salida"]:checked'),
    !!form.motivo_principal.value.trim(),
    ...ratingFields.map(([name]) => !!form.querySelector(`input[name="${name}"]:checked`)),
    !!form.querySelector('input[name="recomendaria"]:checked'),
    !!form.querySelector('input[name="regresaria"]:checked'),
    !!form.entrevistador.value.trim(), form.confirmacion.checked
  ];
  const pct = Math.round(requiredGroups.filter(Boolean).length / requiredGroups.length * 100);
  progressText.textContent = `${pct}%`;
  progressBar.style.width = `${pct}%`;
}
form.addEventListener('input', updateProgress);
form.addEventListener('change', updateProgress);
updateProgress();

form.querySelectorAll('textarea[maxlength]').forEach(el => {
  const counter = form.querySelector(`[data-count-for="${el.name}"]`);
  if(counter) el.addEventListener('input', () => counter.textContent = el.value.length);
});

function serializeForm(){
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  data.motivos = fd.getAll('motivos');
  ratingFields.forEach(([name]) => data[name] = Number(fd.get(name)));
  data.recomendaria = fd.get('recomendaria') === 'true';
  data.regresaria = fd.get('regresaria') === 'true';
  data.confirmacion = fd.get('confirmacion') === 'on';
  data.generated_at = new Date().toISOString();
  return data;
}

function avgScore(data){
  return ratingFields.reduce((sum,[key])=>sum + Number(data[key]||0),0) / ratingFields.length;
}

function buildAnalysis(data){
  const average = avgScore(data);
  const scores = ratingFields.map(([key,label])=>({key,label,score:Number(data[key])}));
  const strengths = scores.filter(x=>x.score>=4).sort((a,b)=>b.score-a.score);
  const opportunities = scores.filter(x=>x.score<=2).sort((a,b)=>a.score-b.score);
  const neutrals = scores.filter(x=>x.score===3);
  const motives = data.motivos || [];

  let general;
  if(average >= 4.3) general = 'La experiencia global reportada es muy favorable, aunque la salida puede estar relacionada con factores externos o una oportunidad específica.';
  else if(average >= 3.6) general = 'La experiencia global es favorable, con algunos factores puntuales que conviene revisar para fortalecer la permanencia del personal.';
  else if(average >= 2.8) general = 'La experiencia global es mixta. Hay elementos satisfactorios, pero también señales claras de mejora que pueden influir en la desvinculación.';
  else if(average >= 2.1) general = 'La experiencia global refleja insatisfacción relevante. Conviene revisar los factores señalados y contrastarlos con otras entrevistas del área.';
  else general = 'La experiencia global refleja una insatisfacción alta. Se recomienda revisar de forma prioritaria los factores asociados a la salida y la experiencia del área.';

  const signals = [];
  const has = m => motives.includes(m);
  const score = key => Number(data[key]);
  if(has('Mejor oportunidad o salario') || score('salario_prestaciones') <= 2) signals.push('Compensación y competitividad salarial');
  if(has('Crecimiento profesional') || score('capacitacion_desarrollo') <= 2) signals.push('Desarrollo y oportunidades de crecimiento');
  if(has('Relación con jefatura o equipo') || score('liderazgo') <= 2) signals.push('Liderazgo y relación con la jefatura');
  if(has('Ambiente laboral') || score('ambiente_companeros') <= 2) signals.push('Ambiente y relaciones de trabajo');
  if(has('Horario o traslado')) signals.push('Horario, traslado o compatibilidad operativa');
  if(score('comunicacion_interna') <= 2) signals.push('Comunicación interna');
  if(score('funciones_carga') <= 2) signals.push('Carga y organización del trabajo');
  if(score('instalaciones_herramientas') <= 2) signals.push('Instalaciones, seguridad y herramientas');

  let retention;
  if(data.recomendaria && data.regresaria) retention = 'Mantiene una percepción general favorable de la organización y existe apertura a una relación laboral futura.';
  else if(!data.recomendaria && !data.regresaria) retention = 'La desvinculación muestra una percepción negativa sostenida; conviene revisar con prioridad los factores de insatisfacción declarados.';
  else if(data.regresaria) retention = 'Existe apertura a regresar, aunque la persona no recomendaría actualmente a la organización; hay una oportunidad concreta de mejorar la experiencia.';
  else retention = 'La persona recomendaría la organización, pero no considera regresar; la salida puede responder a objetivos personales o condiciones específicas de permanencia.';

  const recommendations = [];
  if(signals.length) recommendations.push(`Revisar: ${signals.slice(0,3).join('; ')}.`);
  if(opportunities.length) recommendations.push(`Dar seguimiento a los aspectos con menor calificación: ${opportunities.slice(0,3).map(x=>x.label).join('; ')}.`);
  if(data.mejorar?.trim()) recommendations.push('Contrastar el comentario de mejora con otras entrevistas del mismo departamento para detectar recurrencias.');
  if(data.permanecer?.trim()) recommendations.push('Considerar la condición de permanencia declarada como insumo para acciones de retención, cuando sea viable.');
  if(!recommendations.length) recommendations.push('Mantener monitoreo por área y comparar esta respuesta con tendencias históricas para detectar patrones.');

  return {average, general, strengths, opportunities, neutrals, signals:[...new Set(signals)], retention, recommendations};
}

function fmtDate(value){
  if(!value) return '—';
  const [y,m,d] = String(value).slice(0,10).split('-');
  return y&&m&&d ? `${d}/${m}/${y}` : value;
}
function yesNo(v){ return v ? 'Sí' : 'No'; }
function safeFilename(s){ return String(s||'colaborador').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,70); }

async function logoDataUrl(){
  try{
    const res = await fetch('/assets/logo-sarfrut.jpg');
    const blob = await res.blob();
    return await new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(blob); });
  }catch{ return null; }
}

function splitOrDash(doc, text, width){
  const clean = String(text||'').trim();
  return doc.splitTextToSize(clean || '—', width);
}

async function generatePdf(data, analysis){
  if(!window.jspdf?.jsPDF) throw new Error('No se pudo cargar el generador de PDF. Revisa la conexión a internet e inténtalo de nuevo.');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'mm',format:'a4',orientation:'portrait'});
  const W = 210, H = 297, ml = 15, mr = 15, usable = W-ml-mr;
  const green = [8,120,63], dark = [11,76,49], orange = [244,154,26], muted = [94,109,100], line = [220,228,223];
  let y = 16;

  const logo = await logoDataUrl();
  if(logo) doc.addImage(logo,'JPEG',ml,y-2,24,24);
  doc.setTextColor(...dark); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text('SARFRUT S.A. DE C.V.',ml+30,y+3);
  doc.setFontSize(18); doc.text('ENTREVISTA DE SALIDA',ml+30,y+11);
  doc.setTextColor(...green); doc.setFontSize(8); doc.text('RECURSOS HUMANOS · RESUMEN Y ANÁLISIS',ml+30,y+17);
  doc.setDrawColor(...orange); doc.setLineWidth(1.2); doc.line(ml,y+25,W-mr,y+25); y += 34;

  doc.setFillColor(239,247,242); doc.roundedRect(ml,y,usable,10,2,2,'F');
  doc.setTextColor(...dark); doc.setFontSize(7.8); doc.setFont('helvetica','normal');
  doc.text('Documento confidencial de uso interno. El análisis es descriptivo y se basa únicamente en las respuestas registradas.',ml+3,y+6.3); y += 15;

  const section = title => { ensure(12); doc.setFillColor(...green); doc.roundedRect(ml,y,usable,8,1.5,1.5,'F'); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text(title,ml+3,y+5.3); y+=12; };
  const ensure = space => { if(y+space > H-16){ doc.addPage(); y=16; } };
  const keyValue = (label,value,x,width) => {
    doc.setTextColor(...muted); doc.setFontSize(6.8); doc.setFont('helvetica','bold'); doc.text(label.toUpperCase(),x,y);
    doc.setTextColor(30,45,37); doc.setFontSize(9); doc.setFont('helvetica','normal');
    const lines = splitOrDash(doc,value,width); doc.text(lines,x,y+4.7); return lines.length*4.2+5;
  };
  const textBlock = (label,value) => {
    ensure(18); doc.setTextColor(...green); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text(label,ml,y);
    doc.setTextColor(47,63,54); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    const lines = splitOrDash(doc,value,usable); doc.text(lines,ml,y+5); y += 7 + lines.length*4.2;
  };

  section('1. DATOS GENERALES');
  const colW=(usable-7)/2;
  let h1=keyValue('Nombre completo',data.nombre,ml,colW), h2=keyValue('Puesto',data.puesto,ml+colW+7,colW); y += Math.max(h1,h2)+2;
  h1=keyValue('Departamento / Área',data.departamento,ml,colW); h2=keyValue('Jefe(a) inmediato(a)',data.jefe,ml+colW+7,colW); y += Math.max(h1,h2)+2;
  h1=keyValue('Fecha de ingreso',fmtDate(data.fecha_ingreso),ml,colW); h2=keyValue('Fecha de salida',fmtDate(data.fecha_salida),ml+colW+7,colW); y += Math.max(h1,h2)+2;
  h1=keyValue('Tipo de salida',data.tipo_salida==='Otro' ? `${data.tipo_salida}: ${data.tipo_salida_otro||''}` : data.tipo_salida,ml,colW); h2=keyValue('Entrevistó',data.entrevistador,ml+colW+7,colW); y += Math.max(h1,h2)+3;

  section('2. MOTIVO DE SALIDA');
  textBlock('Motivos seleccionados',(data.motivos||[]).join(' · ') + (data.motivo_otro ? ` · ${data.motivo_otro}` : ''));
  textBlock('Motivo principal',data.motivo_principal);

  section('3. EVALUACIÓN DE LA EXPERIENCIA LABORAL');
  doc.autoTable({
    startY:y,
    head:[['Aspecto','Calificación','Lectura']],
    body:ratingFields.map(([key,label])=>[label,`${data[key]} / 5`,ratingLabels[data[key]]]),
    theme:'grid',
    styles:{font:'helvetica',fontSize:7.7,cellPadding:2.3,textColor:[42,55,48],lineColor:line},
    headStyles:{fillColor:green,textColor:[255,255,255],fontStyle:'bold'},
    columnStyles:{0:{cellWidth:105},1:{cellWidth:28,halign:'center'},2:{cellWidth:47}},
    margin:{left:ml,right:mr}
  });
  y = doc.lastAutoTable.finalY + 7;
  ensure(18);
  doc.setFillColor(255,246,230); doc.roundedRect(ml,y,usable,12,2,2,'F');
  doc.setTextColor(...dark); doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text(`Promedio global: ${analysis.average.toFixed(1)} / 5`,ml+4,y+5);
  doc.setTextColor(...muted); doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.text('Promedio simple de los siete aspectos evaluados.',ml+4,y+9); y += 18;

  section('4. COMENTARIOS FINALES');
  textBlock('Lo que más le gustó',data.gusto);
  textBlock('Qué considera que debemos mejorar',data.mejorar);
  textBlock('Qué habría hecho que decidiera permanecer',data.permanecer);
  ensure(16);
  doc.setTextColor(...dark); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
  doc.text(`¿Recomendaría SARFRUT?  ${yesNo(data.recomendaria)}`,ml,y);
  doc.text(`¿Consideraría regresar?  ${yesNo(data.regresaria)}`,ml+92,y); y+=7;
  textBlock('Sugerencias o comentarios adicionales',data.comentarios);

  section('5. RESUMEN EJECUTIVO Y ANÁLISIS DESCRIPTIVO');
  textBlock('Lectura general',analysis.general);
  if(analysis.strengths.length) textBlock('Fortalezas observadas',analysis.strengths.map(x=>`${x.label} (${x.score}/5)`).join(' · '));
  if(analysis.opportunities.length) textBlock('Áreas con menor valoración',analysis.opportunities.map(x=>`${x.label} (${x.score}/5)`).join(' · '));
  if(analysis.signals.length) textBlock('Factores que requieren atención',analysis.signals.join(' · '));
  textBlock('Señal de vínculo / retorno',analysis.retention);
  textBlock('Acciones sugeridas',analysis.recommendations.map((x,i)=>`${i+1}. ${x}`).join('\n'));

  ensure(28);
  doc.setDrawColor(180,191,184); doc.line(ml,y+13,88,y+13); doc.line(115,y+13,W-mr,y+13);
  doc.setTextColor(...dark); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.text(data.nombre||'Colaborador(a)',ml,y+17); doc.text(data.entrevistador||'Quien entrevista',115,y+17);
  doc.setTextColor(...muted); doc.setFontSize(6.8); doc.setFont('helvetica','normal');
  doc.text('Nombre y firma del colaborador(a)',ml,y+21); doc.text('Nombre y firma de quien entrevista',115,y+21); y+=28;

  const pages=doc.getNumberOfPages();
  for(let i=1;i<=pages;i++){
    doc.setPage(i); doc.setDrawColor(...line); doc.line(ml,H-11,W-mr,H-11);
    doc.setTextColor(...muted); doc.setFontSize(6.5); doc.text('SARFRUT S.A. DE C.V. · Recursos Humanos · Documento de uso interno',ml,H-6);
    doc.text(`Página ${i} de ${pages}`,W-mr,H-6,{align:'right'});
  }

  const filename=`Entrevista_Salida_${safeFilename(data.nombre)}_${data.fecha_salida||new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(filename);
}

async function saveStatisticalRecord(data, analysis){
  if(!config.SAVE_TO_GOOGLE_SHEETS || !config.GOOGLE_SHEETS_WEB_APP_URL) return {enabled:false};
  const payload = {
    schema_version:'sarfrut_exit_v4',
    generated_at:data.generated_at,
    fecha_aplicacion:data.fecha_aplicacion,
    fecha_salida:data.fecha_salida,
    puesto:data.puesto,
    departamento:data.departamento,
    tipo_salida:data.tipo_salida,
    motivos:data.motivos,
    salario_prestaciones:data.salario_prestaciones,
    funciones_carga:data.funciones_carga,
    liderazgo:data.liderazgo,
    ambiente_companeros:data.ambiente_companeros,
    comunicacion_interna:data.comunicacion_interna,
    capacitacion_desarrollo:data.capacitacion_desarrollo,
    instalaciones_herramientas:data.instalaciones_herramientas,
    recomendaria:data.recomendaria,
    regresaria:data.regresaria,
    promedio:Number(analysis.average.toFixed(2))
  };
  await fetch(config.GOOGLE_SHEETS_WEB_APP_URL,{
    method:'POST',
    mode:'no-cors',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify(payload),
    keepalive:true
  });
  return {enabled:true};
}

function renderAnalysisPreview(data,analysis){
  const strengths = analysis.strengths.slice(0,2).map(x=>x.label).join(', ') || 'Sin fortalezas sobresalientes en la escala';
  const attention = analysis.signals.slice(0,3).join(', ') || 'Sin alertas principales por escala/motivo';
  document.getElementById('analysisPreview').innerHTML = `
    <div><span>Promedio global</span><strong>${analysis.average.toFixed(1)} / 5</strong></div>
    <div><span>Fortalezas</span><strong>${escapeHtml(strengths)}</strong></div>
    <div><span>Atención</span><strong>${escapeHtml(attention)}</strong></div>`;
}
function escapeHtml(s){ return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  message.textContent = '';
  message.classList.remove('success');
  if(!form.reportValidity()) return;
  const motives = [...form.querySelectorAll('input[name="motivos"]:checked')];
  if(motives.length === 0){
    message.textContent = 'Selecciona al menos un motivo de salida.';
    document.querySelector('[data-section="2"]').scrollIntoView({behavior:'smooth'});
    return;
  }

  submitBtn.disabled = true;
  submitBtn.querySelector('span:first-child').textContent = 'Generando…';
  try{
    const data = serializeForm();
    const analysis = buildAnalysis(data);
    lastPayload = data; lastAnalysis = analysis;
    await generatePdf(data,analysis);
    let stat = {enabled:false};
    try{ stat = await saveStatisticalRecord(data,analysis); }catch(err){ console.warn('No se pudo enviar el registro estadístico',err); }
    renderAnalysisPreview(data,analysis);
    document.getElementById('successText').textContent = stat.enabled
      ? 'El PDF se descargó en este dispositivo. También se envió el registro estadístico configurado para RH.'
      : 'El PDF se descargó en este dispositivo. Esta versión no guardó una copia en Vercel ni en una base de datos.';
    message.textContent = 'Documento generado correctamente.';
    message.classList.add('success');
    successModal.hidden = false;
  }catch(err){
    console.error(err);
    message.textContent = err.message || 'No fue posible generar el documento. Intenta nuevamente.';
  }finally{
    submitBtn.disabled = false;
    submitBtn.querySelector('span:first-child').textContent = 'Generar PDF';
  }
});

document.getElementById('downloadAgain').addEventListener('click', async()=>{
  if(lastPayload && lastAnalysis) await generatePdf(lastPayload,lastAnalysis);
});

document.getElementById('closeSuccess').addEventListener('click', () => {
  successModal.hidden = true;
  form.reset();
  lastPayload = null; lastAnalysis = null;
  document.getElementById('fechaAplicacion').value = new Date().toISOString().slice(0,10);
  document.querySelectorAll('[data-count-for]').forEach(x=>x.textContent='0');
  syncConditional(); updateProgress(); window.scrollTo({top:0,behavior:'smooth'});
});
