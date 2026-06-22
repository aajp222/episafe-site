/* EpiSafe CMS hydration — progressively replaces static team / roles / news
   content with live, published content from the admin backend.

   Safe by design: if the API is unreachable or returns nothing, the existing
   hand-written HTML stays exactly as it is. Set window.EPISAFE_API to point at
   a different API origin (e.g. for local preview); defaults to same-origin. */
(function () {
  'use strict';

  var API = (window.EPISAFE_API || '') + '/api/public';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function get(path) {
    return fetch(API + path, { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function delay(i) { return 'style="--d:' + (i * 80) + 'ms"'; }

  var LI_BADGE = '<span class="li-badge" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.8 0 0 .77 0 1.73v20.54C0 23.22.8 24 1.77 24h20.45c.97 0 1.78-.78 1.78-1.73V1.73C24 .77 23.19 0 22.22 0z"/></svg></span>';

  // ---- team founders ----
  function renderTeam(items) {
    var grid = document.getElementById('cms-team');
    if (!grid || !items || !items.length) return;
    grid.innerHTML = items.map(function (p, i) {
      var img = p.photo_url
        ? '<img src="' + esc(p.photo_url) + '" alt="' + esc(p.name) + '">'
        : '';
      var photo = p.linkedin_url
        ? '<a class="li-link" href="' + esc(p.linkedin_url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(p.name) + ' on LinkedIn">' + img + LI_BADGE + '</a>'
        : img;
      var now = p.working_on
        ? '<div class="tm-card__now"><span class="tm-card__now-k">Working on</span>' +
          '<span class="tm-card__now-v">' + esc(p.working_on) + '</span></div>'
        : '';
      return '<article class="tm-card glass reveal is-in" ' + delay(i) + '>' +
        '<div class="tm-card__photo">' + photo + '</div><div>' +
        '<h2 class="tm-card__name">' + esc(p.name) + '</h2>' +
        '<span class="tm-card__role">' + esc(p.role) + '</span>' +
        '<p class="tm-card__bio">' + esc(p.bio) + '</p>' + now +
        '</div></article>';
    }).join('');
  }

  // ---- open roles ----
  var GHOST_ICON = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="16" r="7"/><path d="M8 40c2-7 9-12 16-12s14 5 16 12"/></svg>';
  function renderRoles(items) {
    var grid = document.getElementById('cms-roles');
    if (!grid || !items || !items.length) return;
    grid.innerHTML = items.map(function (r, i) {
      var detail = r.detail
        ? '<div class="tm-card__now"><span class="tm-card__now-k">Open role</span>' +
          '<span class="tm-card__now-v">' + esc(r.detail) + '</span></div>'
        : '';
      return '<article class="tm-card tm-card--ghost glass reveal is-in" ' + delay(i) + '>' +
        '<div class="tm-card__photo tm-card__photo--ghost" aria-hidden="true">' + GHOST_ICON + '</div><div>' +
        '<h2 class="tm-card__name muted">' + esc(r.title) + '</h2>' +
        '<span class="tm-card__role tm-card__role--open">' + esc(r.type) + '</span>' +
        '<p class="tm-card__bio">' + esc(r.description) + '</p>' + detail +
        '</div></article>';
    }).join('');
  }

  // ---- news ----
  function fmtDate(d) {
    if (!d) return '';
    var dt = new Date(d + 'T00:00:00');
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }
  function renderNews(items) {
    var grid = document.getElementById('cms-news');
    if (!grid || !items || !items.length) return;
    grid.innerHTML = items.map(function (p, i) {
      var media = p.image_url
        ? '<div class="nw-post__media"><img src="' + esc(p.image_url) + '" alt="' + esc(p.title) + '"></div>'
        : '';
      var meta = p.date
        ? '<div class="nw-meta"><span class="nw-meta__date">' + esc(fmtDate(p.date)) + '</span></div>'
        : '';
      var text = p.excerpt || p.body || '';
      return '<article class="nw-post glass reveal is-in" ' + delay(i) + '>' +
        media + meta +
        '<h3 class="nw-post__title">' + esc(p.title) + '</h3>' +
        '<p class="nw-post__body">' + esc(text) + '</p>' +
        '</article>';
    }).join('');
  }

  function run() {
    if (document.getElementById('cms-team')) get('/team').then(function (d) { if (d) renderTeam(d.team); });
    if (document.getElementById('cms-roles')) get('/roles').then(function (d) { if (d) renderRoles(d.roles); });
    if (document.getElementById('cms-news')) get('/news').then(function (d) { if (d) renderNews(d.news); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
