// D1 query helpers. Thin wrappers so handlers read cleanly.

// ---- users -------------------------------------------------------------
export async function countUsers(db) {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM users').first();
  return row ? row.n : 0;
}

export function getUserByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
}

export function getUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
}

export async function listUsers(db) {
  const { results } = await db
    .prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at')
    .all();
  return results || [];
}

export function createUser(db, { email, name, role, hash, salt }) {
  return db
    .prepare(
      'INSERT INTO users (email, name, role, password_hash, password_salt) VALUES (?,?,?,?,?) RETURNING id, email, name, role'
    )
    .bind(email.toLowerCase(), name || '', role || 'employee', hash, salt)
    .first();
}

export function setUserPassword(db, id, hash, salt) {
  return db
    .prepare("UPDATE users SET password_hash=?, password_salt=?, updated_at=datetime('now') WHERE id=?")
    .bind(hash, salt, id)
    .run();
}

export function setUserFields(db, id, { name, role }) {
  return db
    .prepare("UPDATE users SET name=?, role=?, updated_at=datetime('now') WHERE id=?")
    .bind(name || '', role || 'employee', id)
    .run();
}

export function deleteUser(db, id) {
  return db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
}

// ---- sessions ----------------------------------------------------------
export function createSession(db, token, userId, expiresAt) {
  return db
    .prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)')
    .bind(token, userId, expiresAt)
    .run();
}

export function getSession(db, token) {
  return db
    .prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')")
    .bind(token)
    .first();
}

export function deleteSession(db, token) {
  return db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

export function deleteUserSessions(db, userId) {
  return db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
}

// ---- team profiles -----------------------------------------------------
export async function listTeam(db, { publishedOnly = false } = {}) {
  const sql = publishedOnly
    ? 'SELECT * FROM team_profiles WHERE published = 1 ORDER BY sort_order, id'
    : 'SELECT * FROM team_profiles ORDER BY sort_order, id';
  const { results } = await db.prepare(sql).all();
  return results || [];
}

export function getProfile(db, id) {
  return db.prepare('SELECT * FROM team_profiles WHERE id = ?').bind(id).first();
}

export function getProfileByUser(db, userId) {
  return db.prepare('SELECT * FROM team_profiles WHERE user_id = ? ORDER BY id LIMIT 1').bind(userId).first();
}

export function createProfile(db, p) {
  return db
    .prepare(
      `INSERT INTO team_profiles (user_id, name, role, bio, working_on, photo_url, linkedin_url, sort_order, published)
       VALUES (?,?,?,?,?,?,?,?,?) RETURNING *`
    )
    .bind(p.user_id || null, p.name, p.role, p.bio, p.working_on, p.photo_url, p.linkedin_url || '', p.sort_order || 0, p.published ? 1 : 0)
    .first();
}

export function updateProfile(db, id, p) {
  return db
    .prepare(
      `UPDATE team_profiles SET name=?, role=?, bio=?, working_on=?, photo_url=?, linkedin_url=?,
       sort_order=?, published=?, updated_at=datetime('now') WHERE id=?`
    )
    .bind(p.name, p.role, p.bio, p.working_on, p.photo_url, p.linkedin_url || '', p.sort_order || 0, p.published ? 1 : 0, id)
    .run();
}

export function assignProfileUser(db, id, userId) {
  return db.prepare("UPDATE team_profiles SET user_id=?, updated_at=datetime('now') WHERE id=?").bind(userId || null, id).run();
}

export function deleteProfile(db, id) {
  return db.prepare('DELETE FROM team_profiles WHERE id = ?').bind(id).run();
}

// ---- news --------------------------------------------------------------
export async function listNews(db, { publishedOnly = false } = {}) {
  const sql = publishedOnly
    ? 'SELECT * FROM news_posts WHERE published = 1 ORDER BY date DESC, id DESC'
    : 'SELECT * FROM news_posts ORDER BY date DESC, id DESC';
  const { results } = await db.prepare(sql).all();
  return results || [];
}

export function getNews(db, id) {
  return db.prepare('SELECT * FROM news_posts WHERE id = ?').bind(id).first();
}

export function slugExists(db, slug, exceptId = 0) {
  return db.prepare('SELECT id FROM news_posts WHERE slug = ? AND id != ?').bind(slug, exceptId).first();
}

export function createNews(db, p) {
  return db
    .prepare(
      `INSERT INTO news_posts (slug, title, date, excerpt, body, image_url, published, author_id)
       VALUES (?,?,?,?,?,?,?,?) RETURNING *`
    )
    .bind(p.slug, p.title, p.date, p.excerpt, p.body, p.image_url, p.published ? 1 : 0, p.author_id || null)
    .first();
}

export function updateNews(db, id, p) {
  return db
    .prepare(
      `UPDATE news_posts SET slug=?, title=?, date=?, excerpt=?, body=?, image_url=?,
       published=?, updated_at=datetime('now') WHERE id=?`
    )
    .bind(p.slug, p.title, p.date, p.excerpt, p.body, p.image_url, p.published ? 1 : 0, id)
    .run();
}

export function deleteNews(db, id) {
  return db.prepare('DELETE FROM news_posts WHERE id = ?').bind(id).run();
}

// ---- open roles --------------------------------------------------------
export async function listRoles(db, { publishedOnly = false } = {}) {
  const sql = publishedOnly
    ? 'SELECT * FROM open_roles WHERE published = 1 ORDER BY sort_order, id'
    : 'SELECT * FROM open_roles ORDER BY sort_order, id';
  const { results } = await db.prepare(sql).all();
  return results || [];
}

export function getRole(db, id) {
  return db.prepare('SELECT * FROM open_roles WHERE id = ?').bind(id).first();
}

export function createRole(db, r) {
  return db
    .prepare(
      `INSERT INTO open_roles (title, type, description, detail, sort_order, published)
       VALUES (?,?,?,?,?,?) RETURNING *`
    )
    .bind(r.title, r.type, r.description, r.detail, r.sort_order || 0, r.published ? 1 : 0)
    .first();
}

export function updateRole(db, id, r) {
  return db
    .prepare(
      `UPDATE open_roles SET title=?, type=?, description=?, detail=?, sort_order=?,
       published=?, updated_at=datetime('now') WHERE id=?`
    )
    .bind(r.title, r.type, r.description, r.detail, r.sort_order || 0, r.published ? 1 : 0, id)
    .run();
}

export function deleteRole(db, id) {
  return db.prepare('DELETE FROM open_roles WHERE id = ?').bind(id).run();
}
