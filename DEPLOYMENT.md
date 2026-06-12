# Production Deployment Guide - Slot Booking System

This guide outlines the production deployment setup for the **Slot Booking System** using **Render** for the backend, **Vercel** for the frontend, and **Neon** for the PostgreSQL database.

---

## 🗄️ 1. Database Setup (Neon)

Neon is a serverless Postgres provider. For production, Neon provides two connection URLs in your project console:

1. **Direct Connection** (Port `5432`): Best for one-off operations, migrations, and schema updates.
2. **Pooled Connection** (Port `6543`, ends with `-pooler`): Enforces pgBouncer connection pooling. **You must use this URL for the backend application server** to prevent the server from exhausting database connections under high load.

### 1.1 Obtain Database URLs
1. Sign up at [Neon.tech](https://neon.tech) and create a project (e.g., `slot-booking`).
2. On your Neon dashboard, copy the **Connection string**.
3. Toggle between **Pooled connection** and **Direct connection** to copy both strings.

### 1.2 Initialize Database Tables
To run migrations locally before deploying:
```bash
cd registration-backend
# Set DATABASE_URL in your local .env to the Direct Connection string
node migrate.js
```

---

## 🚀 2. Backend Deployment (Render)

Render hosts the Express backend API. By setting up a **Release Command**, Render will run migrations automatically before every new build goes live.

### 2.1 Render Environment Variables
Add these variables in the **Environment** tab of your Render Web Service:

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Listening port (Render binds automatically) | `3000` |
| `DATABASE_URL` | Neon **Pooled connection string** (ends in `-pooler`) | `postgresql://user:pass@host-pooler.neon.tech/dbname?sslmode=require` |
| `FRONTEND_URL` | Base URL of your deployed frontend | `https://your-frontend.vercel.app` |
| `FRONTEND_ORIGINS` | Allowed CORS origins (comma-separated if multiple) | `https://your-frontend.vercel.app` |
| `JWT_SECRET` | Strong secret key for signing auth cookies | *Generate a random 32-character string* |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | *From Google Developer Console* |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | *From Google Developer Console* |
| `GOOGLE_CALLBACK_URL` | Google callback endpoint | `https://your-backend.onrender.com/auth/google/callback` |
| `SENDGRID_API_KEY` | SendGrid authentication key | `SG.xxxxxxxxxxxxxxxxxxxxxx` |
| `SENDGRID_FROM_EMAIL` | Verified SendGrid sender email | `dharunsuriyat.23csd@kongu.edu` |
| `RATE_LIMIT_PER_MINUTE` | Global API rate limit per IP per minute | `300` |
| `AUTH_RATE_LIMIT` | Auth-specific rate limit per 15 mins (login/signup) | `30` |
| `PG_POOL_MAX` | Maximum Postgres connection pool limit | `10` |

### 2.2 Configure Render Web Service
1. Log in to [Render](https://render.com) and click **New +** → **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `slot-booking-backend`
   - **Root Directory**: `registration-backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Release Command**: `npm run migrate` *(This runs migrations automatically on deploy)*
4. Under **Advanced**, add the environment variables listed in 2.1.
5. Click **Create Web Service**.

---

## 🎨 3. Frontend Deployment (Vercel)

Vercel hosts the React/Vite frontend. The `vercel.json` configuration in the codebase automatically handles rewriting SPA routes to `/index.html` to avoid `404 Not Found` errors when reloading React Router pages.

### 3.1 Deploying on Vercel
1. Log in to [Vercel](https://vercel.com) and click **Add New** → **Project**.
2. Import your Git repository.
3. Configure the project details:
   - **Root Directory**: `registeration-frontend/registeration-frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the following **Environment Variable**:
   - `VITE_API_BASE_URL`: `https://your-backend-domain.onrender.com` (Your Render Web Service URL)
5. Click **Deploy**.

---

## 🔐 4. Auth & Email Provider Setups

### 4.1 Google OAuth Console Configuration
1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Navigate to **APIs & Services** → **Credentials**.
3. Create/select your OAuth Client ID (Web Application type).
4. Update the domains:
   - **Authorized JavaScript Origins**: `https://your-frontend.vercel.app`
   - **Authorized Redirect URIs**: `https://your-backend-domain.onrender.com/auth/google/callback`
5. Click **Save** and verify credentials match in your Render environment.

### 4.2 SendGrid Email Setup
1. Log in to [SendGrid](https://sendgrid.com).
2. Go to **Settings** → **Sender Authentication** and verify your sender email or domain.
3. Go to **API Keys** and generate a new key with full or restricted email-sending permissions.
4. Update `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` on Render.

---

## ✅ 5. Production Health Check & Monitoring

Our backend includes a production-grade `/health` check:
- **Endpoint**: `https://your-backend.onrender.com/health`
- **Behavior**: Runs a query (`SELECT 1`) against your Neon database to verify live database connectivity, not just the HTTP server state.
- **Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "timestamp": "2026-06-12T11:21:33Z",
    "services": {
      "database": "healthy",
      "server": "healthy"
    }
  }
  ```
- **Failure Response (`503 Service Unavailable`)**: Returns detailed service health to help container health checks restart failed pods automatically.
