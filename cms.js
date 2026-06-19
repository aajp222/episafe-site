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

  // ---- team founders ----
  function renderTeam(items) {
    var grid = document.getElementById('cms-team');
    if (!grid || !items || !items.length) return;
    grid.innerHTML = items.map(function (p, i) {
      var photo = p.photo_url
        ? '<img src="' + esc(p.photo_url) + '" alt="' + esc(p.name) + '">'
        : '';
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
