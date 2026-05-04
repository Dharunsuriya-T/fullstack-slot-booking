# Deployment Guide - Slot Booking System

This guide covers deploying the slot booking system to production using Render for the backend and Vercel for the frontend.

## Prerequisites

- Node.js 18+ installed locally
- Git repository with your code
- Neon PostgreSQL database
- Google OAuth application
- SendGrid account for emails
- Render account (for backend)
- Vercel account (for frontend)

## 1. Database Setup (Neon)

### 1.1 Create Neon Database
1. Sign up at [Neon](https://neon.tech)
2. Create a new project
3. Note the connection string from the dashboard

### 1.2 Run Migrations
```bash
# Clone your repository
git clone <your-repo-url>
cd <repo-directory>/registration-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Set DATABASE_URL in .env
DATABASE_URL=your_neon_connection_string

# Run migrations
node migrate.js
```

## 2. Backend Deployment (Render)

### 2.1 Prepare Environment Variables
Create a `.env.production` file with:

```env
DATABASE_URL=your_neon_connection_string
FRONTEND_URL=https://your-frontend-domain.vercel.app
FRONTEND_ORIGINS=https://your-frontend-domain.vercel.app
JWT_SECRET=your_super_long_random_secret_key_at_least_32_characters
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-backend-domain.onrender.com/auth/google/callback
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your-email@kongu.edu
PG_POOL_MAX=20
PG_POOL_IDLE_TIMEOUT_MS=30000
PG_POOL_CONN_TIMEOUT_MS=10000
NODE_ENV=production
RATE_LIMIT_PER_MINUTE=300
```

### 2.2 Deploy to Render
1. Go to [Render](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your Git repository
4. Configure:
   - **Name**: slot-booking-backend
   - **Root Directory**: `registration-backend`
   - **Runtime**: Node 18
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (to start) or Standard
5. Add all environment variables from step 2.1
6. Click "Create Web Service"

### 2.3 Verify Backend
- Your backend will be available at `https://your-backend-domain.onrender.com`
- Test health endpoint: `https://your-backend-domain.onrender.com/health`

## 3. Frontend Deployment (Vercel)

### 3.1 Prepare Environment Variables
Create `.env.production` in the frontend directory:

```env
VITE_API_BASE_URL=https://your-backend-domain.onrender.com
```

### 3.2 Deploy to Vercel
1. Go to [Vercel](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Configure:
   - **Root Directory**: `registeration-frontend/registeration-frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm install && npm run build`
   - **Output Directory**: `dist`
5. Add environment variable:
   - `VITE_API_BASE_URL`: `https://your-backend-domain.onrender.com`
6. Click "Deploy"

## 4. Google OAuth Setup

### 4.1 Create Google OAuth Application
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project or create a new one
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Configure:
   - **Application type**: Web application
   - **Name**: Slot Booking System
   - **Authorized JavaScript origins**: `https://your-frontend-domain.vercel.app`
   - **Authorized redirect URIs**: `https://your-backend-domain.onrender.com/auth/google/callback`
6. Save the Client ID and Client Secret

### 4.2 Update Environment Variables
Add the Google OAuth credentials to your Render environment variables:
- `GOOGLE_CLIENT_ID`: Your Google Client ID
- `GOOGLE_CLIENT_SECRET`: Your Google Client Secret
- `GOOGLE_CALLBACK_URL`: `https://your-backend-domain.onrender.com/auth/google/callback`

## 5. SendGrid Setup

### 5.1 Create SendGrid Account
1. Sign up at [SendGrid](https://sendgrid.com)
2. Verify your sender identity
3. Create an API key

### 5.2 Configure SendGrid
Add to your Render environment variables:
- `SENDGRID_API_KEY`: Your SendGrid API key
- `SENDGRID_FROM_EMAIL`: Your verified sender email (should be @kongu.edu)

## 6. Post-Deployment Checklist

### 6.1 Test All Features
- [ ] Registration with `name.yeardept@kongu.edu` format emails
- [ ] Login with registered credentials
- [ ] Google OAuth login
- [ ] Email verification (check inbox)
- [ ] Password reset flow
- [ ] Form creation and submission
- [ ] Admin dashboard functionality

### 6.2 Security Checklist
- [ ] All environment variables are set
- [ ] HTTPS is enforced
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Database connection uses SSL

### 6.3 Performance Checklist
- [ ] Database pooling is configured
- [ ] Compression is enabled
- [ ] Static assets are optimized
- [ ] Monitoring is set up

## 7. Scaling Considerations

### 7.1 Database Scaling
- Monitor connection pool usage
- Consider read replicas for high traffic
- Implement connection pooling limits

### 7.2 Backend Scaling
- Enable auto-scaling on Render
- Monitor CPU and memory usage
- Consider CDN for static assets

### 7.3 Frontend Scaling
- Vercel automatically scales globally
- Monitor build times
- Optimize bundle size

## 8. Monitoring and Maintenance

### 8.1 Logs
- Render provides application logs
- Vercel provides build and runtime logs
- Set up error tracking (Sentry, etc.)

### 8.2 Backups
- Neon handles database backups automatically
- Code is versioned in Git
- Consider backup strategies for user uploads

### 8.3 Updates
- Test updates in staging first
- Use feature flags for major changes
- Monitor for breaking dependencies

## 9. Troubleshooting

### 9.1 Common Issues
- **CORS errors**: Check `FRONTEND_ORIGINS` configuration
- **Database connection**: Verify `DATABASE_URL` and SSL settings
- **OAuth failures**: Check redirect URIs and environment variables
- **Email not sending**: Verify SendGrid API key and sender identity

### 9.2 Debug Mode
For debugging, you can temporarily set:
```env
NODE_ENV=development
```
Remember to set it back to `production` after debugging.

## 10. Domain Configuration (Optional)

### 10.1 Custom Domain for Frontend
1. In Vercel dashboard, go to "Settings" → "Domains"
2. Add your custom domain
3. Configure DNS records as instructed

### 10.2 Custom Domain for Backend
1. In Render dashboard, go to "Settings" → "Custom Domains"
2. Add your custom domain
3. Configure DNS records as instructed
4. Update Google OAuth redirect URI
5. Update CORS configuration

## Support

For issues:
1. Check application logs
2. Verify environment variables
3. Test API endpoints individually
4. Review this guide for missed steps
