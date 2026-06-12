# Complete Production Deployment Guide - Vercel + Render + Neon DB

This comprehensive guide walks you through deploying the slot-booking application to production using **Vercel** (frontend), **Render** (backend), and **Neon** (serverless PostgreSQL database).

---

## 📋 1. Prerequisites Checklist

Before starting, make sure you have:
- [ ] A GitHub account with the code pushed to a repository.
- [ ] A Neon PostgreSQL account ([neon.tech](https://neon.tech)).
- [ ] A Google Cloud Console account (for OAuth login).
- [ ] A SendGrid account (for system emails).
- [ ] A Vercel account ([vercel.com](https://vercel.com)).
- [ ] A Render account ([render.com](https://render.com)).

---

## 🗄️ 2. Database Setup (Neon)

Neon is a serverless Postgres service. Because it scales dynamically, Neon handles connections differently.

### 2.1 Get Connection Strings
1. Log in to your **Neon** console.
2. Under your project, click **Connection Details**.
3. You will see a dropdown containing two strings:
   - **Direct Connection** (Default: port `5432`): Used for initializing schemas and running local scripts.
   - **Pooled Connection** (ends in `-pooler`, port `6543`): Enforces connection pooling via pgBouncer. **Must be used for your deployed web server on Render.**

### 2.2 Run Database Migrations (Local Setup)
To setup the tables on your database before deployment:
1. Open terminal on your machine and navigate to the backend folder:
   ```bash
   cd registration-backend
   ```
2. Open/create `.env` and set `DATABASE_URL` to your **Direct Connection string**.
3. Run the migration script:
   ```bash
   node migrate.js
   ```
   *Note: This will execute the SQL files in `src/migrations/` sequentially, setting up the tables, indexes, and constraints.*

---

## 🔐 3. Google OAuth Setup

### 3.1 Create Credentials in Google Cloud
1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Create a project or select an existing one.
3. Search for **OAuth consent screen**, select **External**, and fill in the required app details (use the user type allowed by your organisation).
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**.
5. Select **Web application** and set:
   - **Name**: `Slot Booking System`
   - **Authorized JavaScript origins**:
     - Local: `http://localhost:5173`
     - Production: `https://your-frontend-domain.vercel.app` (Your Vercel deployment URL)
   - **Authorized redirect URIs**:
     - Local: `http://localhost:3000/auth/google/callback`
     - Production: `https://your-backend-domain.onrender.com/auth/google/callback` (Your Render deployment URL)
6. Click **Create** and note down the **Client ID** and **Client Secret**.

---

## 📧 4. SendGrid Email Setup

### 4.1 Authenticate Sender Identity
1. Log in to your [SendGrid Dashboard](https://sendgrid.com).
2. Go to **Settings** → **Sender Authentication**.
3. Set up **Single Sender Verification** or **Domain Authentication** for your sending email (e.g., `your-email@kongu.edu`).

### 4.2 Generate API Key
1. Go to **Settings** → **API Keys** → **Create API Key**.
2. Give it a name (e.g., `Slot Booking System API`), choose **Full Access** or **Restricted Access (Mail Send)**, and click **Create & View**.
3. Copy the key immediately (starts with `SG.`).

---

## 🚀 5. Backend Deployment (Render)

Render hosts the Node/Express backend. To make the backend production-ready, we will configure connection pooling and set up automatic release command migrations.

### 5.1 Create Web Service
1. Sign up on [Render.com](https://render.com) and click **New** → **Web Service**.
2. Link your GitHub repository.
3. Configure the service parameters:
   - **Name**: `slot-booking-backend`
   - **Region**: Choose the region closest to your Neon database server.
   - **Branch**: `main` (or your production branch)
   - **Root Directory**: `registration-backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Release Command**: `npm run migrate` *(This will automatically run database migrations before the new deployment is cut over, ensuring schema synchronization)*

### 5.2 Environment Variables
Under the **Environment** tab on Render, add these variables:

```env
NODE_ENV=production
DATABASE_URL=your_neon_POOLED_connection_string
FRONTEND_URL=https://your-frontend-domain.vercel.app
FRONTEND_ORIGINS=https://your-frontend-domain.vercel.app
JWT_SECRET=your_super_long_random_jwt_signing_key
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-backend-domain.onrender.com/auth/google/callback
SENDGRID_API_KEY=SG.your_sendgrid_key
SENDGRID_FROM_EMAIL=your-verified-sender-email@kongu.edu
PG_POOL_MAX=10
RATE_LIMIT_PER_MINUTE=300
AUTH_RATE_LIMIT=30
```

4. Click **Create Web Service**. Wait for the build and deployment process to complete.

---

## 🎨 6. Frontend Deployment (Vercel)

Vercel hosts the static React/Vite frontend. The repository contains a pre-configured `vercel.json` file that resolves single-page application (SPA) client routing refreshes (redirecting all paths to `index.html`).

### 6.1 Deploy Project
1. Log in to [Vercel.com](https://vercel.com).
2. Click **Add New** → **Project** and import your repository.
3. Configure settings:
   - **Root Directory**: `registeration-frontend/registeration-frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-backend-domain.onrender.com` (Your Render deployment URL)
5. Click **Deploy**.

---

## ✅ 7. Health Checks and Testing

Our backend includes built-in safeguards to verify that the app is production-ready.

### 7.1 Verify Health Check Endpoint
To verify the health of both the server and database, run:
```bash
curl https://your-backend-domain.onrender.com/health
```
**Expected Response:**
```json
{
  "status": "success",
  "timestamp": "2026-06-12T11:21:33.000Z",
  "services": {
    "database": "healthy",
    "server": "healthy"
  }
}
```
*If database connectivity fails, it will respond with `503 Service Unavailable` and list the service as unhealthy, alerting container platforms (such as Render) to automatically restart the service.*

---

## 🔧 8. Troubleshooting Production Issues

### CORS Block / Cookie Issues
- **Problem**: Frontend cannot communicate with the backend, or user is not logged in after authenticating.
- **Solution**:
  1. Confirm `FRONTEND_URL` and `FRONTEND_ORIGINS` are set to the exact Vercel URL (including `https://` but without a trailing slash) in Render env vars.
  2. Ensure the cookies are secure (CORS cookie transfer requires HTTPS, which Vercel and Render handle automatically).
  3. Ensure that frontend API requests have `{ credentials: 'include' }` (Vite Axios or fetch settings).

### Database Connections Exhausted
- **Problem**: Database operations hang or show connection timeout errors.
- **Solution**:
  1. Verify the Render `DATABASE_URL` is set to the **Pooled Connection** (port `6543`, ends with `-pooler`), not the Direct Connection string.
  2. Set `PG_POOL_MAX` to a conservative number (e.g. `10`) to prevent Node instances from acquiring too many concurrent connections.

### Rate Limiting block
- **Problem**: Users see a "Too many requests" page during high activity.
- **Solution**:
  1. Increase `RATE_LIMIT_PER_MINUTE` to a higher number if your user base is large.
  2. Adjust `AUTH_RATE_LIMIT` to limit brute-force attacks on login and signup endpoints.
