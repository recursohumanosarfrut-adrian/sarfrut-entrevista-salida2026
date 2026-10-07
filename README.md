# SARFRUT · Entrevista de salida V5

Versión sin Supabase y sin base de datos de respuestas.

## Flujo

`Colaborador → formulario → PDF en memoria → función de Vercel → Google Apps Script → correo de RH`

El colaborador **no descarga ni recibe el PDF**. Cuando termina, únicamente ve la confirmación de que la entrevista fue enviada a Recursos Humanos.

## Qué recibe RH

Cada correo contiene:

- asunto estandarizado `[SARFRUT][EXIT] Área | Puesto | Fecha`;
- resumen estructurado en el cuerpo del correo;
- calificación de los 7 aspectos;
- promedio global y factores de atención;
- PDF A4 adjunto con todas las respuestas, comentarios, resumen ejecutivo y análisis descriptivo;
- logo SARFRUT integrado dentro del propio PDF, sin depender de cargar una imagen externa.

El formato del correo está pensado para que el buzón de RH pueda servir como archivo y posteriormente sea posible hacer resúmenes por área, motivo o periodo sin mantener una base de datos adicional.

## Privacidad / persistencia

Esta versión no usa Supabase ni Google Sheets. El sitio no mantiene una tabla de entrevistas. La información se procesa de forma transitoria para construir y enviar el correo. La copia persistente prevista es el correo recibido por Recursos Humanos y su PDF adjunto.

## Configuración necesaria

Consulta `google-apps-script/INSTRUCCIONES.md`.

En Vercel solo necesitas dos variables de entorno:

- `APPS_SCRIPT_WEB_APP_URL`
- `MAIL_BRIDGE_SECRET`

No se usan `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD` ni `SESSION_SECRET`.

## Archivos principales

- `entrevista.html` — formulario.
- `form.js` — validación, análisis, creación del PDF y envío.
- `logo-data.js` — logo optimizado embebido para el PDF.
- `api/send-interview.js` — función de Vercel que entrega el correo al Apps Script.
- `google-apps-script/EmailGateway.gs` — envía el correo desde Google.
- `google-apps-script/INSTRUCCIONES.md` — configuración paso a paso.

## Dashboard local

Se conserva `/rh` como herramienta local para analizar un CSV si RH prepara uno en el futuro. No se alimenta automáticamente porque esta versión no mantiene una base de datos.

## Dependencias del navegador

jsPDF y jsPDF-AutoTable se cargan desde jsDelivr. El dispositivo necesita internet para abrir el formulario y generar el PDF.

## Análisis

El análisis del PDF es descriptivo y se construye con reglas a partir de las respuestas de la entrevista. No es una evaluación psicológica ni un dictamen laboral.
