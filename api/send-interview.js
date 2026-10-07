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

function esc(value){
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function fmtDate(value){
  if(!value) return '—';
  const parts = String(value).slice(0,10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : esc(value);
}

function yesNo(v){ return v ? 'Sí' : 'No'; }

function clean(value, fallback='—'){
  const out = String(value ?? '').trim();
  return out || fallback;
}

function buildEmail(data, analysis){
  const motives = Array.isArray(data.motivos) ? data.motivos.join(' · ') : '—';
  const scoreRows = ratingFields.map(([key,label]) => {
    const n = Number(data[key] || 0);
    return `<tr><td style="padding:7px 8px;border-bottom:1px solid #e6ece8">${esc(label)}</td><td style="padding:7px 8px;border-bottom:1px solid #e6ece8;text-align:center"><b>${n}/5</b></td><td style="padding:7px 8px;border-bottom:1px solid #e6ece8">${esc(ratingLabels[n] || '—')}</td></tr>`;
  }).join('');

  const average = Number(analysis?.average || 0).toFixed(1);
  const signals = Array.isArray(analysis?.signals) && analysis.signals.length ? analysis.signals.join(' · ') : 'Sin alertas principales detectadas por escala/motivo.';

  const htmlBody = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#20372b;max-width:760px;margin:auto">
    <div style="border-bottom:4px solid #f49a1a;padding-bottom:12px;margin-bottom:18px">
      <div style="font-size:13px;color:#08783f;font-weight:700;letter-spacing:.04em">SARFRUT S.A. DE C.V. · RECURSOS HUMANOS</div>
      <h1 style="font-size:22px;margin:5px 0 0;color:#0b4c31">Nueva entrevista de salida</h1>
    </div>

    <p style="font-size:14px;line-height:1.5">Se recibió una nueva entrevista de salida. El PDF completo con respuestas, resumen ejecutivo y análisis descriptivo está adjunto a este correo.</p>

    <table style="border-collapse:collapse;width:100%;font-size:13px;margin:16px 0">
      <tr><td style="padding:7px 8px;background:#f5f9f6;width:32%"><b>Colaborador(a)</b></td><td style="padding:7px 8px">${esc(clean(data.nombre))}</td></tr>
      <tr><td style="padding:7px 8px;background:#f5f9f6"><b>Puesto</b></td><td style="padding:7px 8px">${esc(clean(data.puesto))}</td></tr>
      <tr><td style="padding:7px 8px;background:#f5f9f6"><b>Área</b></td><td style="padding:7px 8px">${esc(clean(data.departamento))}</td></tr>
      <tr><td style="padding:7px 8px;background:#f5f9f6"><b>Fecha de salida</b></td><td style="padding:7px 8px">${esc(fmtDate(data.fecha_salida))}</td></tr>
      <tr><td style="padding:7px 8px;background:#f5f9f6"><b>Tipo de salida</b></td><td style="padding:7px 8px">${esc(clean(data.tipo_salida))}</td></tr>
      <tr><td style="padding:7px 8px;background:#f5f9f6"><b>Motivos</b></td><td style="padding:7px 8px">${esc(motives)}</td></tr>
      <tr><td style="padding:7px 8px;background:#fff6e6"><b>Promedio global</b></td><td style="padding:7px 8px;background:#fff6e6"><b>${esc(average)} / 5</b></td></tr>
      <tr><td style="padding:7px 8px;background:#f5f9f6"><b>Recomendaría SARFRUT</b></td><td style="padding:7px 8px">${yesNo(data.recomendaria)}</td></tr>
      <tr><td style="padding:7px 8px;background:#f5f9f6"><b>Consideraría regresar</b></td><td style="padding:7px 8px">${yesNo(data.regresaria)}</td></tr>
    </table>

    <h2 style="font-size:16px;color:#08783f;margin:22px 0 8px">Evaluación de experiencia</h2>
    <table style="border-collapse:collapse;width:100%;font-size:12px;border:1px solid #dfe8e2">
      <thead><tr style="background:#08783f;color:white"><th style="padding:8px;text-align:left">Aspecto</th><th style="padding:8px">Calif.</th><th style="padding:8px;text-align:left">Lectura</th></tr></thead>
      <tbody>${scoreRows}</tbody>
    </table>

    <div style="margin-top:18px;padding:12px 14px;background:#f7fbf8;border-left:4px solid #08783f;font-size:13px;line-height:1.45"><b>Factores a revisar:</b> ${esc(signals)}</div>

    <p style="font-size:11px;color:#6a776f;margin-top:22px">Este correo funciona como archivo de la entrevista. La aplicación no utiliza una base de datos para conservar respuestas. Documento confidencial de uso interno.</p>
  </div>`;

  const textBody = [
    'SARFRUT S.A. DE C.V. - RECURSOS HUMANOS',
    'Nueva entrevista de salida',
    '',
    `Colaborador(a): ${clean(data.nombre)}`,
    `Puesto: ${clean(data.puesto)}`,
    `Área: ${clean(data.departamento)}`,
    `Fecha de salida: ${fmtDate(data.fecha_salida)}`,
    `Tipo de salida: ${clean(data.tipo_salida)}`,
    `Motivos: ${motives}`,
    `Promedio global: ${average}/5`,
    `Recomendaría SARFRUT: ${yesNo(data.recomendaria)}`,
    `Consideraría regresar: ${yesNo(data.regresaria)}`,
    '',
    `Factores a revisar: ${signals}`,
    '',
    'El PDF completo está adjunto. Documento confidencial de uso interno.'
  ].join('\n');

  return {htmlBody, textBody};
}

export default async function handler(req, res){
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'POST') return res.status(405).json({ok:false,error:'Método no permitido.'});

  const webAppUrl = process.env.APPS_SCRIPT_WEB_APP_URL;
  const bridgeSecret = process.env.MAIL_BRIDGE_SECRET;
  if(!webAppUrl || !bridgeSecret){
    return res.status(500).json({ok:false,error:'El correo de Recursos Humanos no está configurado en Vercel.'});
  }

  try{
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {data, analysis, filename, pdfBase64} = body;
    if(!data || !analysis || !filename || !pdfBase64) return res.status(400).json({ok:false,error:'Faltan datos para enviar la entrevista.'});
    if(typeof pdfBase64 !== 'string' || pdfBase64.length > 10_000_000) return res.status(413).json({ok:false,error:'El PDF excede el tamaño permitido.'});

    const area = clean(data.departamento, 'Sin área');
    const puesto = clean(data.puesto, 'Sin puesto');
    const fecha = clean(data.fecha_salida, 'Sin fecha');
    const subject = `[SARFRUT][EXIT] ${area} | ${puesto} | ${fecha}`;
    const {htmlBody, textBody} = buildEmail(data, analysis);

    const upstream = await fetch(webAppUrl, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        secret:bridgeSecret,
        subject,
        filename:String(filename).slice(0,180),
        pdfBase64,
        htmlBody,
        textBody
      })
    });

    const raw = await upstream.text();
    let result = {};
    try{ result = JSON.parse(raw); }catch{}
    if(!upstream.ok || result.ok !== true){
      throw new Error(result.error || `El servicio de correo respondió con estado ${upstream.status}.`);
    }

    return res.status(200).json({ok:true});
  }catch(err){
    console.error('send-interview failed:', err?.message || err);
    return res.status(500).json({ok:false,error:'No fue posible entregar la entrevista al correo de Recursos Humanos. Intenta nuevamente.'});
  }
}
