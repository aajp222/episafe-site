// Small shared helpers for the EpiSafe CMS Worker.

export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function error(status, message, extra = {}) {
  return json({ error: message, ...extra }, { status });
}

// CORS — same-origin in production, but supports a configured allow-list for
// previews and local dev. Returns headers to merge onto responses.
export function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const headers = new Headers();
  if (origin && (allowed.includes(origin) || allowed.includes('*'))) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '86400');
  }
  return headers;
}

// Reject cross-site state-changing requests. Allows same-origin (no Origin
// header) and any explicitly allow-listed origin.
export function originAllowed(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // same-origin fetch / curl
  const url = new URL(request.url);
  if (origin === url.origin) return true;
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  return allowed.includes(origin) || allowed.includes('*');
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'post';
}

// Trim + cap a string field so the DB never gets unbounded input.
export function clean(value, max = 4000) {
  if (value === undefined || value === null) return '';
  return String(value).slice(0, max);
}

export function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
