/**
 * SARFRUT RH - Puente de correo sin base de datos
 * Recibe el PDF desde la función de Vercel y lo envía al correo configurado.
 * No guarda respuestas en Google Sheets ni Drive.
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents || '{}');
    var props = PropertiesService.getScriptProperties();
    var expectedSecret = props.getProperty('MAIL_BRIDGE_SECRET');
    var recipient = props.getProperty('RECIPIENT_EMAIL');

    if (!expectedSecret || data.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: 'Unauthorized' });
    }
    if (!recipient) {
      return jsonResponse({ ok: false, error: 'RECIPIENT_EMAIL no está configurado.' });
    }
    if (!data.pdfBase64 || !data.filename) {
      return jsonResponse({ ok: false, error: 'Falta el PDF.' });
    }

    var pdfBytes = Utilities.base64Decode(data.pdfBase64);
    var pdf = Utilities.newBlob(pdfBytes, 'application/pdf', data.filename);

    MailApp.sendEmail({
      to: recipient,
      subject: data.subject || '[SARFRUT][EXIT] Nueva entrevista de salida',
      body: data.textBody || 'Se recibió una nueva entrevista de salida. Consulta el PDF adjunto.',
      htmlBody: data.htmlBody || '',
      attachments: [pdf],
      name: 'SARFRUT Recursos Humanos'
    });

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return jsonResponse({ ok: true, service: 'SARFRUT RH Mail Gateway' });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
