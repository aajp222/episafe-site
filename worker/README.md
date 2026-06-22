# EpiSafe Admin — backend + control panel

A small, serverless backend that lets you and your team **log in and edit the
site**: team profiles, news posts, and open roles. Built on Cloudflare Workers
+ D1 (SQLite), styled to match the EpiSafe liquid-glass design.

Nothing here changes the public site until it's deployed and the `routes` are
turned on — see **Going live** below.

---

## What you get

- **Login** at `episafe.co/admin` (email + password).
- **Two roles**
  - **Admin (you):** edit everything — team profiles, news, open roles — plus
    add/remove people and reset their passwords.
  - **Employee:** edit only their own team profile.
- **Live content** — `team.html` and `news.html` pull published content from the
  API. If the backend is ever down, the existing static content still shows.

## How it fits together

```
episafe.co/admin   → Worker serves the admin panel (worker/public/admin)
episafe.co/api/*   → Worker serves the JSON API (worker/src)
episafe.co/*       → your existing static site, unchanged
                     team.html / news.html fetch /api/public/* to show live content
```

The database has five tables: `users`, `sessions`, `team_profiles`,
`news_posts`, `open_roles` (see `migrations/0001_init.sql`).

---

## Local preview

```bash
cd worker
npm install
npm run db:migrate:local   # creates a local DB + seeds current site content
npm run dev                # http://localhost:8787/admin
```

First visit to `/admin` walks you through creating the owner (admin) account.

---

## Going live (one-time)

You need a Cloudflare account with the `episafe.co` zone (where the site is
already hosted). Then:

```bash
cd worker

# 1. Create the database, then paste the printed database_id into wrangler.toml
npm run db:create

# 2. Create the tables + seed current content on the real database
npm run db:migrate
npm run db:seed

# 3. Deploy the Worker
npm run deploy
```

Then in `wrangler.toml` **uncomment the `routes` block** and run `npm run deploy`
once more. That puts the Worker in front of `/admin` and `/api` on the live
domain. Everything else keeps serving from your current host.

Finally, open `https://episafe.co/admin` and create your owner account.

> Claude can run all of these steps for you against your connected Cloudflare
> account when you're ready — just say the word.

### Profile photo uploads

Built in. Every image field in the panel has an **Upload image** button with a
live preview — pick a file (PNG/JPG/GIF/WebP/AVIF, up to 5 MB) and it's stored
in a Cloudflare **KV** namespace (`UPLOADS` binding) and served back from
`/uploads/<key>` with a long, immutable cache. You can still paste a path or a
full `https://…` URL instead if you prefer.

---

## Security notes

- Passwords are hashed with **PBKDF2-SHA256** (100k iterations, per-user salt).
  Plaintext passwords are never stored.
- Sessions are random 256-bit tokens in an **HttpOnly, Secure, SameSite=Lax**
  cookie, with server-side revocation (logout / password reset kills sessions).
- All write requests are checked against an **origin allow-list**
  (`ALLOWED_ORIGINS` in `wrangler.toml`) to block cross-site requests.
- Role checks are enforced **server-side** on every endpoint, not just in the UI.
