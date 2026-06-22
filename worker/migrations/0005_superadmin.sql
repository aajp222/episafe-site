-- Super-admin tier: promote the founding owner (the first account) so they can
-- manage other admins. New installs create the owner as 'superadmin' directly
-- via /api/setup, so on a fresh database this updates nothing — it only
-- promotes an owner that was created before this tier existed.
UPDATE users SET role = 'superadmin', updated_at = datetime('now')
WHERE id = (SELECT MIN(id) FROM users) AND role = 'admin';
