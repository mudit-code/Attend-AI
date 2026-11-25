# AttendAI Deployment Guide (Test / Staging Branch)

This guide walks you through deploying **AttendAI** directly from your **`test-deployment`** branch.

---

## 1. Push the Branch to GitHub

Ensure your `test-deployment` branch is pushed to GitHub:

```bash
git push -u origin test-deployment
```

> **Note for Contributors:**
> If you have write access to `origin`, the above command succeeds.
> If you have fork-only access:
> 1. Fork the repo to your own GitHub account (`mudit-code/AttendAI`).
> 2. Add your fork remote: `git remote add myfork https://github.com/mudit-code/AttendAI.git`
> 3. Push: `git push -u myfork test-deployment`

---

## 2. Deploy Backend & Database (Render / Railway)

### Option A: Using Render (Recommended & Free)
1. Go to [Render.com](https://render.com) and create an account.
2. Click **New +** → **Blueprint** and connect your GitHub repo.
3. Select branch: `test-deployment`.
4. Render will detect `render.yaml` and provision:
   - **attendai-db**: A free managed PostgreSQL database.
   - **attendai-backend**: Node.js web service running the Express API.
5. In your Backend Service **Environment Variables**:
   - `DATABASE_URL`: Automatically linked from the Postgres database.
   - `JWT_SECRET`: Random 32+ character string.
   - `JWT_REFRESH_SECRET`: Another random 32+ character string.
   - `REDIS_URL`: (Optional) Free Redis instance from [Upstash.com](https://upstash.com) or leave default (server gracefully operates without cache).
   - `FRONTEND_URL`: Set to your deployed frontend domain (e.g. `https://your-app.vercel.app`).
6. Copy your live backend URL (e.g. `https://attendai-backend.onrender.com`).
7. Verify it is running by opening: `https://attendai-backend.onrender.com/api/v1/health`

---

## 3. Deploy Frontend PWA (Vercel / Netlify)

### Using Vercel (Recommended, < 2 minutes)
1. Go to [Vercel.com](https://vercel.com) and click **Add New Project**.
2. Select your GitHub repository and choose branch: **`test-deployment`**.
3. In **Project Configuration**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend` (Click *Edit* and choose `frontend`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   - `VITE_API_URL`: Your backend URL (e.g. `https://attendai-backend.onrender.com`)
   - `VITE_APP_VERSION`: `1.0.0`
5. Click **Deploy**!

> **SPA Routing & PWA:**
> The included `frontend/vercel.json` and `frontend/public/_redirects` will automatically handle client-side routing so refreshing `/student` or `/teacher` works without 404s.

---

## 4. Run Initial Database Migrations & Seed (One-time)

Once your database is online, push the schema tables:

From your local machine or hosting CLI:
```bash
cd backend
DATABASE_URL="your-production-database-url" npx prisma db push
DATABASE_URL="your-production-database-url" npx ts-node prisma/seed.ts
```

Your live AttendAI demo is now fully operational!
