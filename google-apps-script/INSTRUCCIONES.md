# Configurar el envío por correo · SARFRUT RH V5

Esta versión no usa Supabase ni Google Sheets. El sitio genera el PDF de la entrevista en memoria y lo envía a Recursos Humanos. La única copia persistente prevista es el correo recibido por RH.

## 1. Crear el Apps Script

1. Entra a `script.google.com` con la cuenta desde la que quieres enviar los correos.
2. Crea un **Nuevo proyecto**.
3. Borra el contenido de `Code.gs`.
4. Copia y pega todo el contenido de `EmailGateway.gs` de esta carpeta.
5. Guarda el proyecto con un nombre como `SARFRUT RH - Entrevistas de salida`.

## 2. Configurar propiedades privadas

En Apps Script entra a **Configuración del proyecto → Propiedades del script** y agrega:

- `RECIPIENT_EMAIL` → el correo de RH que debe recibir los PDFs. Puede ser un correo o varios separados por coma.
- `MAIL_BRIDGE_SECRET` → una cadena larga y aleatoria. Ejemplo de formato: `sarfrut-rh-2026-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

No pongas estas dos cosas dentro del código ni en GitHub.

## 3. Publicar como aplicación web

1. **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Ejecutar como: **Yo**.
4. Quién tiene acceso: **Cualquiera**.
5. Autoriza los permisos de Gmail/MailApp cuando Google los solicite.
6. Copia la URL que termina en `/exec`.

La URL por sí sola no puede enviar correos válidos porque el script exige el secreto configurado en Propiedades del script.

## 4. Configurar Vercel

En el mismo proyecto de Vercel ve a **Settings → Environment Variables** y agrega en Production:

- `APPS_SCRIPT_WEB_APP_URL` → pega la URL `/exec` del Apps Script.
- `MAIL_BRIDGE_SECRET` → pega exactamente el mismo secreto que configuraste en Apps Script.

Después haz un **Redeploy**.

## 5. Probar

1. Abre `/entrevista`.
2. Llena una entrevista ficticia.
3. Pulsa **Enviar entrevista**.
4. La persona que responde solo verá una confirmación; no se descargará el PDF.
5. En el correo de RH debe llegar un mensaje con asunto parecido a:
   `[SARFRUT][EXIT] Producción | Ayudante General | 2026-10-07`
6. El PDF completo estará adjunto.

## Archivo para futuros resúmenes

El correo incluye campos estructurados (área, puesto, tipo de salida, motivos, calificaciones, promedio, recomendaría/regresaría) además del PDF. Por eso el buzón de RH puede funcionar como histórico sin una base de datos adicional.

## Nota de privacidad

La aplicación no guarda entrevistas en Supabase, Google Sheets ni otra base de datos propia. La entrevista viaja de forma transitoria por Vercel y Apps Script para enviarse al correo configurado. El correo recibido sí constituye una copia persistente y quedará sujeto a las políticas de retención de la cuenta de correo.
