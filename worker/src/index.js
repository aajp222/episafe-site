// EpiSafe CMS — Cloudflare Worker
// Serves the /api backend and the /dashboard single-page app.

import {
  hashPassword, verifyPassword, newSessionToken, sessionExpiry,
  sessionCookie, clearCookie, readCookieToken,
} from './auth.js';
import {
  json, error, corsHeaders, originAllowed, readJson, slugify, clean, isEmail,
} from './utils.js';
import * as db from './db.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    try {
      if (path === '/api' || path.startsWith('/api/')) {
        const res = await handleApi(request, env, url);
        // merge CORS headers onto every API response
        const cors = corsHeaders(request, env);
        cors.forEach((v, k) => res.headers.set(k, v));
        return res;
      }

      // Legacy /admin and the bare root → the dashboard.
      if (path === '/' || path === '/admin' || path === '/admin/' || path.startsWith('/admin/')) {
        return Response.redirect(new URL('/dashboard/', url.origin).toString(), 301);
      }

      // Dashboard SPA — serve static assets, falling back to the app shell so
      // client-side routes (e.g. /dashboard/news) still load.
      if (path === '/dashboard' || path.startsWith('/dashboard/')) {
        return serveAdmin(request, env, url);
      }

      // Uploaded images live in KV; serve them publicly with a long cache.
      if (path.startsWith('/uploads/')) {
        return serveUpload(request, env, url, ctx);
      }
    } catch (err) {
      if (err && err.response) {
        const res = err.response;
        const cors = corsHeaders(request, env);
        cors.forEach((v, k) => res.headers.set(k, v));
        return res;
      }
      return error(500, 'Server error', { detail: String(err && err.message || err) });
    }

    return new Response('Not found', { status: 404 });
  },
};

async function serveAdmin(request, env, url) {
  if (!env.ASSETS) return new Response('Admin assets not configured', { status: 404 });
  const res = await env.ASSETS.fetch(request);
  if (res.status === 404 && (url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/'))) {
    // SPA fallback to the app shell.
    const shellUrl = new URL('/dashboard/index.html', url.origin);
    return env.ASSETS.fetch(new Request(shellUrl, request));
  }
  return res;
}

// Serve an uploaded image from KV. Public + immutable, with edge caching so
// repeat views don't re-read KV.
async function serveUpload(request, env, url, ctx) {
  if (!env.UPLOADS) return new Response('Not found', { status: 404 });
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;

  const key = decodeURIComponent(url.pathname.slice('/uploads/'.length));
  if (!key) return new Response('Not found', { status: 404 });
  const obj = await env.UPLOADS.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!obj || !obj.value) return new Response('Not found', { status: 404 });

  const type = (obj.metadata && obj.metadata.contentType) || 'application/octet-stream';
  const res = new Response(obj.value, {
    headers: {
      'content-type': type,
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
  if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(request, res.clone()));
  return res;
}

// ---------------------------------------------------------------------------
// API router
// ---------------------------------------------------------------------------
async function handleApi(request, env, url) {
  if (!env.DB) return error(500, 'Database not configured');
  const path = url.pathname;
  const method = request.method;
  const seg = path.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  // seg = [] for /api, ['public','team'] for /api/public/team, etc.

  // ---- waitlist (public: join + live count) -----------------------------
  if (seg[0] === 'public' && seg[1] === 'waitlist') {
    if (method === 'GET') return json({ count: await db.countWaitlist(env.DB) });
    if (method === 'POST') {
      if (!originAllowed(request, env)) return error(403, 'Bad origin');
      const body = await readJson(request);
      if (!body || !isEmail(body.email)) return error(400, 'A valid email is required');
      await db.addWaitlist(env.DB, {
        email: String(body.email).trim().toLowerCase().slice(0, 200),
        source: clean(body.source, 60),
        referrer: clean(body.referrer, 300),
      });
      return json({ ok: true, count: await db.countWaitlist(env.DB) });
    }
    return error(405, 'Method not allowed');
  }

  // ---- public (no auth) -------------------------------------------------
  if (seg[0] === 'public' && method === 'GET') {
    if (seg[1] === 'team') return json({ team: shapeTeam(await db.listTeam(env.DB, { publishedOnly: true })) });
    if (seg[1] === 'roles') return json({ roles: await db.listRoles(env.DB, { publishedOnly: true }) });
    if (seg[1] === 'news') {
      const posts = await db.listNews(env.DB, { publishedOnly: true });
      return json({ news: posts.map(stripDraftFields) });
    }
    return error(404, 'Unknown resource');
  }

  // ---- first-run setup --------------------------------------------------
  if (seg[0] === 'setup') {
    const userCount = await db.countUsers(env.DB);
    if (method === 'GET') return json({ needsSetup: userCount === 0 });
    if (method === 'POST') {
      if (userCount > 0) return error(409, 'Setup already complete');
      if (!originAllowed(request, env)) return error(403, 'Bad origin');
      const body = await readJson(request);
      if (!body || !isEmail(body.email)) return error(400, 'Valid email required');
      if (!body.password || body.password.length < 8) return error(400, 'Password must be at least 8 characters');
      const { hash, salt } = await hashPassword(body.password);
      const user = await db.createUser(env.DB, {
        email: body.email, name: clean(body.name, 120), role: 'superadmin', hash, salt,
      });
      return startSession(env, request, user);
    }
    return error(405, 'Method not allowed');
  }

  // ---- login / logout ---------------------------------------------------
  if (seg[0] === 'login' && method === 'POST') {
    if (!originAllowed(request, env)) return error(403, 'Bad origin');
    const body = await readJson(request);
    if (!body || !body.email || !body.password) return error(400, 'Email and password required');
    const user = await db.getUserByEmail(env.DB, String(body.email));
    if (!user) return error(401, 'Invalid email or password');
    const ok = await verifyPassword(body.password, user.password_salt, user.password_hash);
    if (!ok) return error(401, 'Invalid email or password');
    return startSession(env, request, user);
  }

  if (seg[0] === 'logout' && method === 'POST') {
    const token = readCookieToken(request);
    if (token) await db.deleteSession(env.DB, token);
    return json({ ok: true }, { headers: { 'Set-Cookie': clearCookie(request) } });
  }

  // ---- everything below requires a session ------------------------------
  const auth = await authenticate(request, env);
  if (!auth) return error(401, 'Not signed in');
  const user = auth;

  if (seg[0] === 'me' && method === 'GET') {
    const profile = await db.getProfileByUser(env.DB, user.id);
    return json({ user: publicUser(user), profile: profile || null });
  }

  // Writes must pass an origin check.
  const isWrite = method !== 'GET';
  if (isWrite && !originAllowed(request, env)) return error(403, 'Bad origin');

  // ---- image uploads (any signed-in user) -------------------------------
  // Stored in KV and served back from /uploads/<key>. Employees need this for
  // their own profile photo, so it's allowed for every authenticated user.
  if (seg[0] === 'uploads' && method === 'POST') {
    if (!env.UPLOADS) return error(501, 'Image uploads are not configured');
    const form = await request.formData().catch(() => null);
    const file = form && form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') return error(400, 'No image file received');
    const ext = {
      'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif',
      'image/webp': 'webp', 'image/avif': 'avif',
    }[file.type || ''];
    if (!ext) return error(415, 'Unsupported image type — use PNG, JPG, GIF, WebP, or AVIF');
    const buf = await file.arrayBuffer();
    if (buf.byteLength === 0) return error(400, 'The image is empty');
    if (buf.byteLength > 5 * 1024 * 1024) return error(413, 'Image too large — max 5 MB');
    const key = 'u/' + Date.now().toString(36) + '-' + crypto.randomUUID().slice(0, 8) + '.' + ext;
    await env.UPLOADS.put(key, buf, { metadata: { contentType: file.type } });
    return json({ url: url.origin + '/uploads/' + key, key });
  }

  // ---- account (self) ---------------------------------------------------
  if (seg[0] === 'account' && seg[1] === 'password' && method === 'POST') {
    const body = await readJson(request);
    if (!body || !body.current || !body.next) return error(400, 'Current and new password required');
    const full = await db.getUserById(env.DB, user.id);
    const ok = await verifyPassword(body.current, full.password_salt, full.password_hash);
    if (!ok) return error(403, 'Current password is incorrect');
    if (body.next.length < 8) return error(400, 'New password must be at least 8 characters');
    const { hash, salt } = await hashPassword(body.next);
    await db.setUserPassword(env.DB, user.id, hash, salt);
    return json({ ok: true });
  }

  // ---- team profiles ----------------------------------------------------
  if (seg[0] === 'profiles') {
    if (method === 'GET' && !seg[1]) {
      const all = await db.listTeam(env.DB);
      const visible = isAdmin(user) ? all : all.filter((p) => p.user_id === user.id);
      return json({ profiles: visible });
    }
    if (method === 'POST' && !seg[1]) {
      requireAdmin(user);
      const b = await readJson(request) || {};
      const created = await db.createProfile(env.DB, profileFromBody(b, { admin: true }));
      return json({ profile: created }, { status: 201 });
    }
    const id = Number(seg[1]);
    if (id) {
      const existing = await db.getProfile(env.DB, id);
      if (!existing) return error(404, 'Profile not found');
      const owns = existing.user_id === user.id;
      if (!isAdmin(user) && !owns) return error(403, 'You can only edit your own profile');

      if (method === 'GET') return json({ profile: existing });
      if (method === 'PUT') {
        const b = await readJson(request) || {};
        // Employees may edit content but not publish state / order / ownership.
        const merged = isAdmin(user)
          ? profileFromBody(b, { admin: true })
          : {
              ...existing,
              name: clean(b.name, 120),
              role: clean(b.role, 120),
              bio: clean(b.bio, 4000),
              working_on: clean(b.working_on, 2000),
              photo_url: clean(b.photo_url, 1000),
              linkedin_url: clean(b.linkedin_url, 500),
            };
        await db.updateProfile(env.DB, id, merged);
        if (isAdmin(user) && 'user_id' in b) await db.assignProfileUser(env.DB, id, b.user_id || null);
        return json({ profile: await db.getProfile(env.DB, id) });
      }
      if (method === 'DELETE') {
        requireAdmin(user);
        await db.deleteProfile(env.DB, id);
        return json({ ok: true });
      }
    }
    return error(404, 'Unknown profile route');
  }

  // ---- news (admin only) ------------------------------------------------
  if (seg[0] === 'news') {
    requireAdmin(user);
    if (method === 'GET' && !seg[1]) return json({ news: await db.listNews(env.DB) });
    if (method === 'POST' && !seg[1]) {
      const b = await readJson(request) || {};
      const p = newsFromBody(b);
      p.slug = await uniqueSlug(env.DB, p.slug || slugify(p.title));
      p.author_id = user.id;
      return json({ post: await db.createNews(env.DB, p) }, { status: 201 });
    }
    const id = Number(seg[1]);
    if (id) {
      const existing = await db.getNews(env.DB, id);
      if (!existing) return error(404, 'Post not found');
      if (method === 'PUT') {
        const b = await readJson(request) || {};
        const p = newsFromBody(b);
        p.slug = await uniqueSlug(env.DB, p.slug || slugify(p.title), id);
        await db.updateNews(env.DB, id, p);
        return json({ post: await db.getNews(env.DB, id) });
      }
      if (method === 'DELETE') {
        await db.deleteNews(env.DB, id);
        return json({ ok: true });
      }
    }
    return error(404, 'Unknown news route');
  }

  // ---- open roles (admin only) -----------------------------------------
  if (seg[0] === 'roles') {
    requireAdmin(user);
    if (method === 'GET' && !seg[1]) return json({ roles: await db.listRoles(env.DB) });
    if (method === 'POST' && !seg[1]) {
      const b = await readJson(request) || {};
      return json({ role: await db.createRole(env.DB, roleFromBody(b)) }, { status: 201 });
    }
    const id = Number(seg[1]);
    if (id) {
      const existing = await db.getRole(env.DB, id);
      if (!existing) return error(404, 'Role not found');
      if (method === 'PUT') {
        await db.updateRole(env.DB, id, roleFromBody(await readJson(request) || {}));
        return json({ role: await db.getRole(env.DB, id) });
      }
      if (method === 'DELETE') {
        await db.deleteRole(env.DB, id);
        return json({ ok: true });
      }
    }
    return error(404, 'Unknown roles route');
  }

  // ---- users (admins manage employees; super admins manage everyone) ----
  if (seg[0] === 'users') {
    requireAdmin(user);
    if (method === 'GET' && !seg[1]) return json({ users: await db.listUsers(env.DB) });
    if (method === 'POST' && !seg[1]) {
      const b = await readJson(request) || {};
      if (!isEmail(b.email)) return error(400, 'Valid email required');
      if (!b.password || b.password.length < 8) return error(400, 'Password must be at least 8 characters');
      const role = resolveRole(user, b.role); // throws if a plain admin asks for admin/super
      const exists = await db.getUserByEmail(env.DB, b.email);
      if (exists) return error(409, 'A user with that email already exists');
      const { hash, salt } = await hashPassword(b.password);
      const created = await db.createUser(env.DB, {
        email: b.email, name: clean(b.name, 120), role, hash, salt,
      });
      return json({ user: created }, { status: 201 });
    }
    const id = Number(seg[1]);
    if (id) {
      const target = await db.getUserById(env.DB, id);
      if (!target) return error(404, 'User not found');
      // Only a super admin may modify another admin or super admin.
      if (isAdmin(target) && !isSuper(user)) return error(403, 'Only a super admin can manage admins');

      if (method === 'PUT') {
        const b = await readJson(request) || {};
        const role = resolveRole(user, b.role);
        if (id === user.id && role !== 'superadmin') return error(400, "You can't remove your own super admin access");
        await db.setUserFields(env.DB, id, { name: clean(b.name, 120), role });
        return json({ user: await db.getUserById(env.DB, id) });
      }
      if (seg[2] === 'password' && method === 'POST') {
        const b = await readJson(request) || {};
        if (!b.password || b.password.length < 8) return error(400, 'Password must be at least 8 characters');
        const { hash, salt } = await hashPassword(b.password);
        await db.setUserPassword(env.DB, id, hash, salt);
        await db.deleteUserSessions(env.DB, id); // force re-login
        return json({ ok: true });
      }
      if (method === 'DELETE') {
        if (id === user.id) return error(400, "You can't delete your own account");
        await db.deleteUser(env.DB, id);
        return json({ ok: true });
      }
    }
    return error(404, 'Unknown users route');
  }

  // ---- waitlist (admin only) -------------------------------------------
  if (seg[0] === 'waitlist') {
    requireAdmin(user);
    if (method === 'GET' && !seg[1]) {
      const rows = await db.listWaitlist(env.DB);
      return json({ waitlist: rows, count: rows.length });
    }
    const id = Number(seg[1]);
    if (id && method === 'DELETE') {
      await db.deleteWaitlist(env.DB, id);
      return json({ ok: true });
    }
    return error(404, 'Unknown waitlist route');
  }

  return error(404, 'Unknown API route');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function authenticate(request, env) {
  const token = readCookieToken(request);
  if (!token) return null;
  const session = await db.getSession(env.DB, token);
  if (!session) return null;
  const user = await db.getUserById(env.DB, session.user_id);
  return user || null;
}

async function startSession(env, request, user) {
  const token = newSessionToken();
  await db.createSession(env.DB, token, user.id, sessionExpiry());
  return json(
    { user: publicUser(user) },
    { headers: { 'Set-Cookie': sessionCookie(token, request) } }
  );
}

function isAdmin(user) {
  return user.role === 'admin' || user.role === 'superadmin';
}
function isSuper(user) {
  return user.role === 'superadmin';
}
function requireAdmin(user) {
  if (!isAdmin(user)) {
    throw Object.assign(new Error('forbidden'), { response: error(403, 'Admin access required') });
  }
}
function requireSuperadmin(user) {
  if (!isSuper(user)) {
    throw Object.assign(new Error('forbidden'), { response: error(403, 'Super admin access required') });
  }
}
// Validate a requested role against who's asking. Regular admins can only ever
// create/keep employees; only a super admin can grant admin / super-admin.
function resolveRole(requester, requested) {
  const r = ['employee', 'admin', 'superadmin'].includes(requested) ? requested : 'employee';
  if (r !== 'employee' && !isSuper(requester)) {
    throw Object.assign(new Error('forbidden'), { response: error(403, 'Only a super admin can grant admin access') });
  }
  return r;
}

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

function profileFromBody(b, { admin } = {}) {
  return {
    user_id: admin ? (b.user_id || null) : undefined,
    name: clean(b.name, 120),
    role: clean(b.role, 120),
    bio: clean(b.bio, 4000),
    working_on: clean(b.working_on, 2000),
    photo_url: clean(b.photo_url, 1000),
    linkedin_url: clean(b.linkedin_url, 500),
    sort_order: Number(b.sort_order) || 0,
    published: b.published ? 1 : 0,
  };
}

function newsFromBody(b) {
  return {
    slug: clean(b.slug, 80),
    title: clean(b.title, 200),
    date: clean(b.date, 20) || new Date().toISOString().slice(0, 10),
    excerpt: clean(b.excerpt, 500),
    body: clean(b.body, 20000),
    image_url: clean(b.image_url, 1000),
    published: b.published ? 1 : 0,
  };
}

function roleFromBody(b) {
  return {
    title: clean(b.title, 160),
    type: clean(b.type, 80),
    description: clean(b.description, 2000),
    detail: clean(b.detail, 2000),
    sort_order: Number(b.sort_order) || 0,
    published: b.published ? 1 : 0,
  };
}

function shapeTeam(rows) {
  return rows.map((r) => ({
    id: r.id, name: r.name, role: r.role, bio: r.bio,
    working_on: r.working_on, photo_url: r.photo_url,
    linkedin_url: r.linkedin_url || '',
  }));
}

function stripDraftFields(p) {
  return {
    id: p.id, slug: p.slug, title: p.title, date: p.date,
    excerpt: p.excerpt, body: p.body, image_url: p.image_url,
  };
}

async function uniqueSlug(database, base, exceptId = 0) {
  let slug = slugify(base);
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await db.slugExists(database, slug, exceptId)) {
    slug = `${slugify(base)}-${n++}`;
  }
  return slug;
}
