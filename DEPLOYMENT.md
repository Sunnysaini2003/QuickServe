# QuickServe Deployment Setup

QuickServe uses one codebase for local development and production. URLs and secrets come from environment variables.

## Local frontend

`client/.env.local`

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## Local backend

`server/.env.local`

Use your local MySQL credentials and local secrets. `COOKIE_SECURE=false` and `COOKIE_SAME_SITE=lax` are recommended for local HTTP.

## Vercel frontend

Add these environment variables to the Vercel project:

```env
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
VITE_SOCKET_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

Redeploy after changing Vercel environment variables because Vite values are injected at build time.

## Render backend

Set these variables in Render:

```env
NODE_ENV=production
PORT=10000
CLIENT_URL=https://YOUR-VERCEL-APP.vercel.app
DB_HOST=YOUR-AIVEN-HOST
DB_PORT=YOUR-AIVEN-PORT
DB_USER=YOUR-AIVEN-USER
DB_PASSWORD=YOUR-AIVEN-PASSWORD
DB_NAME=YOUR-AIVEN-DATABASE
DB_SSL=true
DB_SSL_CA=<AIVEN-CA-CERTIFICATE>
JWT_SECRET=<LONG-RANDOM-PRODUCTION-SECRET>
CUSTOMER_JWT_SECRET=<LONG-RANDOM-PRODUCTION-CUSTOMER-SECRET>
REFRESH_JWT_SECRET=<LONG-RANDOM-PRODUCTION-REFRESH-SECRET>
JWT_ACCESS_EXPIRES_IN=30m
REFRESH_TOKEN_EXPIRES_IN=7d
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

`COOKIE_SAME_SITE=none` is required for the Vercel frontend calling a Render backend on a different site, together with `COOKIE_SECURE=true` and HTTPS.

## Render service

Set the Render root directory to `server`, build command to `npm install`, and start command to `npm start`.

## Aiven MySQL

Enable TLS/SSL and provide the Aiven CA certificate in `DB_SSL_CA`. The server accepts either a normal certificate value or one containing escaped `\\n` line breaks.

## Secrets

Never commit `server/.env` or `server/.env.local`. Keep environment files out of Git. Production secrets belong in Render/Vercel environment settings.

## Uploads

Uploads are stored under `server/uploads` and are referenced through `/uploads/...`. The code now resolves the upload directory from the server source location rather than the process working directory, which makes Render startup location safer. Render local disk is ephemeral; move uploads to object storage later if persistent client uploads are required.
