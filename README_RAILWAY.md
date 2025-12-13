# Deploying backend-travel-yatra to Railway

This repo is prepared to run on Railway. Follow these steps to provision a MongoDB plugin, set environment variables, seed the database, and deploy.

1. Provision a MongoDB plugin on Railway
- In your Railway project, click "Add Plugin" → "MongoDB". This will create a database and provide a connection string.

2. Set environment variables
- In Railway project settings (Variables), add the following (values from Railway UI or your secrets):
  - `MONGO_URI` = (the connection string provided by Railway MongoDB plugin)
  - `SENDGRID_API_KEY` = (your SendGrid API key)
  - `SENDGRID_FROM_EMAIL` = (verified sender email)
  - `ADMIN_EMAIL` = (admin email to receive booking notifications)
  - `JWT_SECRET` = (your JWT secret)
  - `ALLOW_IN_MEMORY` = `false` (default; do NOT enable in production)

3. Deploy
- Railway will automatically detect this Node.js service and deploy on push to the branch you connect.

4. Seed the database (one-time)
- Open the Railway project and run a one-off command/console to seed admin & sample package:

```bash
# from project root (Railway run console / one-off command)
node scripts/seed-railway-db.js
```

Or run locally after setting `MONGO_URI` to the Railway URI:

```bash
export MONGO_URI="<your-railway-mongo-uri>"
export ADMIN_EMAIL="you@domain.com"
npm run seed:railway
```

Notes
- The app will not automatically start an in-memory MongoDB in production. If `MONGO_URI` is missing and `NODE_ENV=production`, the server will throw an error and exit. This protects production from trying to run `mongodb-memory-server` which depends on system libraries.
- If you prefer a custom Docker image that installs extra system libraries, create a `Dockerfile` and add it to Railway, but using the Railway MongoDB plugin is simpler.

If you want, I can:
- Add a `Dockerfile` that installs `libcurl` and other libs (useful if you insist on using `mongodb-memory-server` in Railway), or
- Help you provision the Railway MongoDB plugin via the Railway web UI step-by-step, or
- Push these changes to `deploy/railway` branch and open a PR to `main` for you.
