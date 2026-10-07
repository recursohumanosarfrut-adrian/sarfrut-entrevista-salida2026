# SARFRUT · Entrevista de salida V4

Versión sin Supabase ni base de datos obligatoria.

## Qué hace

- Formulario corporativo de entrevista de salida.
- Al finalizar genera y descarga automáticamente un **PDF A4** con:
  - datos generales;
  - motivos de salida;
  - evaluación de los 7 aspectos;
  - comentarios finales;
  - promedio global;
  - resumen ejecutivo;
  - análisis descriptivo automático;
  - fortalezas, áreas de atención y acciones sugeridas;
  - espacios de firma.
- El PDF se genera **en el navegador**: Vercel no recibe ni guarda la entrevista.
- No requiere variables de entorno.
- No requiere Supabase.

## Dos modos de uso

### Modo A · Privacidad total (predeterminado)

`config.js` viene así:

```js
window.SARFRUT_CONFIG = {
  SAVE_TO_GOOGLE_SHEETS: false,
  GOOGLE_SHEETS_WEB_APP_URL: ''
};
```

En este modo no queda registro en el sitio. El único expediente es el PDF descargado.

### Modo B · Histórico estadístico en Google Sheets

Si RH necesita estadísticas acumuladas, se puede activar una hoja de Google Sheets sin guardar datos identificables ni comentarios abiertos.

Se conservan únicamente: fecha, puesto, área, tipo/motivos de salida, siete calificaciones, recomendaría/regresaría y promedio.

Consulta `google-apps-script/INSTRUCCIONES.md`.

## Dashboard sin base de datos

La ruta `/rh` permite cargar un CSV exportado de Google Sheets. El dashboard se calcula en el navegador e incluye:

- filtros por área, tipo y fechas;
- total de entrevistas;
- porcentaje que recomendaría SARFRUT;
- porcentaje que regresaría;
- satisfacción promedio;
- principales causas de salida;
- promedio por aspecto;
- impresión / Guardar como PDF del reporte filtrado.

El CSV no se sube al servidor.

## Publicar en Vercel

Es un proyecto estático. Sube estos archivos a la carpeta que Vercel usa como **Root Directory** y haz commit a `main`.

No configures `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD` ni `SESSION_SECRET`: esta versión no los usa.

## Dependencias del navegador

Para generar el PDF se cargan jsPDF y jsPDF-AutoTable desde jsDelivr. Por ello el dispositivo necesita conexión a internet al momento de abrir/generar el documento.

## Importante sobre el análisis

El análisis incluido en el PDF es una interpretación descriptiva basada en las calificaciones, motivos seleccionados y respuestas Sí/No. No es un diagnóstico, evaluación psicológica ni dictamen laboral.
