// Authentication: password hashing (PBKDF2 via WebCrypto), session tokens,
// and the cookie helpers. No external dependencies.

const PBKDF2_ITERATIONS = 100_000;
const SESSION_TTL_DAYS = 14;
const COOKIE_NAME = 'es_session';

function bytesToB64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64url(bytes) {
  return bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hashPassword(password, existingSaltB64) {
  const enc = new TextEncoder();
  const salt = existingSaltB64
    ? b64ToBytes(existingSaltB64)
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { hash: bytesToB64(new Uint8Array(bits)), salt: bytesToB64(salt) };
}

// Constant-time string compare.
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password, saltB64, expectedHashB64) {
  const { hash } = await hashPassword(password, saltB64);
  return safeEqual(hash, expectedHashB64);
}

export function newSessionToken() {
  return b64url(crypto.getRandomValues(new Uint8Array(32)));
}

export function sessionExpiry() {
  const d = new Date(Date.now() + SESSION_TTL_DAYS * 86400 * 1000);
  return d.toISOString();
}

export function sessionCookie(token, request) {
  const secure = new URL(request.url).protocol === 'https:';
  const maxAge = SESSION_TTL_DAYS * 86400;
  return (
    `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}` +
    (secure ? '; Secure' : '')
  );
}

export function clearCookie(request) {
  const secure = new URL(request.url).protocol === 'https:';
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` + (secure ? '; Secure' : '');
}

export function readCookieToken(request) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE_NAME) return v.join('=');
  }
  return null;
}
