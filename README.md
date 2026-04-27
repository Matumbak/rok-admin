# rok-admin

Admin panel for the 4028 Huns landing. Next.js 16 + Tailwind v4. Talks to
[`rok-api`](../rok-api) for CRUD on migration requirements, media, and DKP
scan uploads.

Auth is a simple bearer token typed once on `/login` and stored in
`localStorage`. The token must match `ADMIN_TOKEN` set on the API.

## Local development

```bash
npm install
cp .env.example .env.local
# point NEXT_PUBLIC_API_URL at your local or deployed rok-api
npm run dev -- -p 3001    # http://localhost:3001 (3000 is the landing)
```

## Free deploy

Full end-to-end walkthrough (Neon + Render + Vercel) lives in [`rok-api/DEPLOY.md`](../rok-api/DEPLOY.md). Short version:

### Vercel

1. Sign in at <https://vercel.com> with GitHub.
2. **Add New → Project** → pick this repo.
3. **Environment Variables** (Production + Preview):
   - `NEXT_PUBLIC_API_URL` = `https://<your-rok-api>.onrender.com`
   - `NEXT_PUBLIC_LANDING_URL` = `https://<your-landing>.vercel.app` (optional — used for the "View on landing" link on the DKP page)
4. **Deploy**.
5. Append the resulting Vercel URL to the API's `CORS_ORIGINS` env var on Render.
6. Open `https://rok-admin-xxx.vercel.app/login` and paste the `ADMIN_TOKEN` you set on the API.

## Pages

| Route           | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `/login`        | Token entry                                                |
| `/requirements` | CRUD migration requirements (icon picker, ordering, active flag) |
| `/media`        | CRUD YouTube media — paste URL, title auto-fetched via oEmbed; bulk re-fetch action |
| `/dkp`          | Drag-and-drop xlsx upload (replaces the entire scan); danger-zone wipe |

## Stack

Next.js 16 / React 19 / TypeScript / Tailwind v4 / Lucide.
