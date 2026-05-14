# PasarMitra DevOps & Production Guide

## 1. Environment Strategy
- **Local**: Development with local Supabase CLI or dev project.
- **Staging**: Identical to production, uses `staging` branch. Automatic deployment on push.
- **Production**: High-availability environment. Uses `main` branch.

## 2. Security Checklist
- [ ] **HTTPS Only**: Enforce SSL at the load balancer/edge level.
- [ ] **Supabase RLS**: Ensure Row Level Security is active for ALL tables.
- [ ] **Secret Management**: Never commit `.env`. Use Vercel/GitHub Environment Secrets.
- [ ] **Dependency Audit**: Run `npm audit` monthly.
- [ ] **Content Security Policy (CSP)**: Configure Nginx/Vercel headers to prevent XSS.

## 3. Performance Optimization
- **Code Splitting**: Routes are already lazy-loaded via `React.lazy`.
- **Image CDN**: Use Supabase Storage for assets and use image resizing parameters.
- **Caching**: 
  - Static assets: 1 year (Immutable).
  - HTML: `no-cache` (Ensure latest build).
- **Vite Plugins**: Use `vite-plugin-pwa` for offline capability and faster subsequent loads.

## 4. Monitoring & Logging
- **Error Tracking**: Integrate **Sentry** for frontend crash reporting.
- **Analytics**: Use **PostHog** or **Google Analytics 4** for user behavior.
- **Uptime**: Monitor via **BetterStack** or **UptimeRobot**.
- **Supabase Logs**: Monitor edge function execution and DB performance via Supabase Dashboard.

## 5. Backup Strategy (Supabase)
- **Automated Backups**: Enabled by default in Supabase (Daily for Pro).
- **Point-in-Time Recovery (PITR)**: Enable for mission-critical production data.
- **Custom Exports**: Weekly cron job to export DB schema and seeds to a secure S3 bucket.

## 6. Scaling Recommendations
- **Database**: Scale Supabase instance (Compute) as concurrent user count grows.
- **Storage**: Use CDN-based storage for product images to offload the main server.
- **Horizontal Scaling**: If using Docker/VPS, use an Nginx Load Balancer to distribute traffic across 2+ containers.

## 7. Cost Optimization
- **Vercel**: Utilize the Free tier for early-stage SPAs; move to Pro for team features.
- **Supabase**: Use the compute-based pricing wisely. Avoid unnecessary frequent polling; prefer Realtime Subscriptions.
- **Bundle Size**: Keep vendor libs small (lucide-react, motion, etc.) to reduce bandwidth costs.

## 8. Deployment Guide
### To Vercel (Recommended)
1. Link GitHub Repository.
2. Add Environment Variables from `.env.example`.
3. Set Build Command: `npm run build`.
4. Set Output Directory: `dist`.

### To VPS (Docker)
1. Install Docker & Docker Compose.
2. Run `docker build -t pasarmitra-app .`
3. Run `docker run -p 3000:3000 pasarmitra-app`
