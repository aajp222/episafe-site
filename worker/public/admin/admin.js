/* EpiSafe Admin — vanilla SPA. No build step, matches the site's approach. */
(function () {
  'use strict';

  const LOGO = 'https://episafe.co/assets/logo-glyph.png';
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  let state = { user: null, profile: null };

  document.documentElement.classList.add('ready');

  // ---------- utilities ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function attr(s) { return esc(s); }

  async function api(method, path, body) {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch('/api' + path, opts);
    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (!res.ok) throw new Error((data && data.error) || ('Request failed (' + res.status + ')'));
    return data;
  }

  let toastTimer;
  function toast(msg, kind) {
    toastEl.textContent = msg;
    toastEl.className = 'toast show ' + (kind || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.className = 'toast ' + (kind || ''); }, 2600);
  }

  function fmtDate(d) {
    if (!d) return '';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return d; }
  }

  // ---------- boot ----------
  async function boot() {
    app.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';
    try {
      const me = await api('GET', '/me');
      state.user = me.user;
      state.profile = me.profile;
      renderShell();
      navigate(me.user.role === 'admin' ? 'dashboard' : 'profile');
    } catch (e) {
      const setup = await api('GET', '/setup').catch(() => ({ needsSetup: false }));
      if (setup.needsSetup) renderSetup();
      else renderLogin();
    }
  }

  // ---------- auth screens ----------
  function renderLogin(errMsg) {
    app.innerHTML =
      '<div class="auth-wrap"><form class="auth-card glass" id="loginForm">' +
        brandBlock('Control panel') +
        '<h1>Sign in</h1><p class="sub">Welcome back. Sign in to manage the EpiSafe site.</p>' +
        (errMsg ? '<div class="auth-error">' + esc(errMsg) + '</div>' : '') +
        field('Email', '<input type="email" name="email" required autocomplete="username" autofocus>') +
        field('Password', '<input type="password" name="password" required autocomplete="current-password">') +
        '<button class="btn btn--primary btn--block" type="submit">Sign in</button>' +
      '</form></div>';
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const btn = f.querySelector('button');
      btn.disabled = true;
      try {
        await api('POST', '/login', { email: f.email.value.trim(), password: f.password.value });
        boot();
      } catch (err) { btn.disabled = false; renderLogin(err.message); }
    });
  }

  function renderSetup(errMsg) {
    app.innerHTML =
      '<div class="auth-wrap"><form class="auth-card glass" id="setupForm">' +
        brandBlock('First-time setup') +
        '<h1>Create owner account</h1><p class="sub">No accounts exist yet. Create the first admin — this is you, the owner.</p>' +
        (errMsg ? '<div class="auth-error">' + esc(errMsg) + '</div>' : '') +
        field('Your name', '<input type="text" name="name" autocomplete="name">') +
        field('Email', '<input type="email" name="email" required autocomplete="username" autofocus>') +
        field('Password', '<input type="password" name="password" required minlength="8" autocomplete="new-password">', 'At least 8 characters.') +
        '<button class="btn btn--primary btn--block" type="submit">Create account</button>' +
      '</form></div>';
    document.getElementById('setupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const btn = f.querySelector('button');
      btn.disabled = true;
      try {
        await api('POST', '/setup', { name: f.name.value.trim(), email: f.email.value.trim(), password: f.password.value });
        toast('Welcome to EpiSafe Admin', 'ok');
        boot();
      } catch (err) { btn.disabled = false; renderSetup(err.message); }
    });
  }

  function brandBlock(tag) {
    return '<div class="auth-card__brand"><img src="' + LOGO + '" alt="" onerror="this.style.display=\'none\'">' +
      '<span class="wordmark">EpiSafe</span><span class="tag">' + esc(tag) + '</span></div>';
  }

  // ---------- app shell ----------
  const ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 3-5 5.5-5s4.9 1.8 5.5 5"/><path d="M16 5.5a3 3 0 0 1 0 5.5M18 19c-.2-1.6-.8-3-1.8-4"/></svg>',
    profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.4-5.5 7-5.5s6.2 1.9 7 5.5"/></svg>',
    news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h7M7 16h5"/></svg>',
    roles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="3.2"/><path d="M5 19c.7-3.4 3.3-5 7-5s6.3 1.6 7 5"/></svg>',
    account: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.6c.1-.3.1-.7.1-1z"/></svg>',
    signout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/></svg>',
  };

  function navItems() {
    if (state.user.role === 'admin') {
      return [
        ['dashboard', 'Dashboard'], ['team', 'Team'], ['news', 'News'],
        ['roles', 'Open roles'], ['people', 'People'], ['account', 'Account'],
      ];
    }
    return [['profile', 'My profile'], ['account', 'Account']];
  }

  function renderShell() {
    const u = state.user;
    const items = navItems().map(([k, label]) =>
      '<a class="nav-item" data-view="' + k + '" href="#' + k + '">' + ICONS[k] + '<span>' + esc(label) + '</span></a>'
    ).join('');
    app.innerHTML =
      '<div class="shell">' +
        '<aside class="sidebar glass-quiet">' +
          '<div class="sidebar__brand"><img src="' + LOGO + '" alt="" onerror="this.style.display=\'none\'">' +
            '<span class="wordmark">EpiSafe</span><span class="tag">Admin</span></div>' +
          items +
          '<button class="nav-item sidebar__signout" id="signoutTop">' + ICONS.signout + '</button>' +
          '<div class="sidebar__spacer"></div>' +
          '<div class="sidebar__user">' +
            '<div class="name">' + esc(u.name || u.email) + '</div>' +
            '<div class="meta">' + esc(u.email) + '</div>' +
            '<span class="role-badge ' + u.role + '">' + u.role + '</span>' +
            '<div style="margin-top:14px"><button class="btn btn--ghost btn--sm btn--block" id="signoutBtn">' + ICONS.signout + ' Sign out</button></div>' +
          '</div>' +
        '</aside>' +
        '<main class="main" id="main"></main>' +
      '</div>';

    app.querySelectorAll('.nav-item[data-view]').forEach((a) => {
      a.addEventListener('click', (e) => { e.preventDefault(); navigate(a.dataset.view); });
    });
    const so = () => doSignout();
    document.getElementById('signoutBtn').addEventListener('click', so);
    document.getElementById('signoutTop').addEventListener('click', so);
  }

  async function doSignout() {
    try { await api('POST', '/logout'); } catch (e) {}
    state = { user: null, profile: null };
    renderLogin();
  }

  function setActiveNav(view) {
    app.querySelectorAll('.nav-item[data-view]').forEach((a) => {
      a.classList.toggle('is-active', a.dataset.view === view);
    });
  }

  const main = () => document.getElementById('main');

  function navigate(view) {
    setActiveNav(view);
    const fn = VIEWS[view];
    if (fn) fn();
  }

  function pageHead(title, sub, actionHtml) {
    return '<div class="page-head"><div><h1>' + esc(title) + '</h1>' +
      (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>' +
      (actionHtml ? '<div>' + actionHtml + '</div>' : '') + '</div>';
  }
  function field(label, control, hint) {
    return '<label class="field"><span class="field__label">' + esc(label) + '</span>' + control +
      (hint ? '<span class="field__hint">' + esc(hint) + '</span>' : '') + '</label>';
  }
  function toggle(name, label, checked) {
    return '<label class="toggle field"><input type="checkbox" name="' + name + '"' + (checked ? ' checked' : '') + '>' +
      '<span class="toggle__track"></span><span class="toggle__label">' + esc(label) + '</span></label>';
  }
  function pubPill(p) { return p ? '<span class="pill pub">Live</span>' : '<span class="pill draft">Draft</span>'; }

  // ============================================================
  // Views
  // ============================================================
  const VIEWS = {};

  VIEWS.dashboard = async function () {
    main().innerHTML = pageHead('Dashboard', 'Everything you can manage on episafe.co.') +
      '<div id="stats" class="stat-grid"></div>' +
      '<div class="page-head" style="margin-top:8px"><div><h1 style="font-size:20px">Quick actions</h1></div></div>' +
      '<div class="list">' +
        actionRow('team', 'Edit team profiles', 'Founder cards on the Team page') +
        actionRow('news', 'Write a news post', 'Publish an update to the News page') +
        actionRow('roles', 'Manage open roles', 'Hiring cards on the Team page') +
        actionRow('people', 'Manage people', 'Invite employees and set access') +
      '</div>';
    main().querySelectorAll('[data-go]').forEach((r) => r.addEventListener('click', () => navigate(r.dataset.go)));
    try {
      const [team, news, roles, users] = await Promise.all([
        api('GET', '/profiles'), api('GET', '/news'), api('GET', '/roles'), api('GET', '/users'),
      ]);
      const stat = (n, k) => '<div class="stat glass"><div class="n">' + n + '</div><div class="k">' + k + '</div></div>';
      document.getElementById('stats').innerHTML =
        stat(team.profiles.length, 'Team profiles') +
        stat(news.news.filter((p) => p.published).length, 'Live posts') +
        stat(roles.roles.filter((r) => r.published).length, 'Open roles') +
        stat(users.users.length, 'People');
    } catch (e) { document.getElementById('stats').innerHTML = ''; }
  };
  function actionRow(go, title, sub) {
    return '<div class="list-row glass" data-go="' + go + '" style="cursor:pointer">' +
      '<div class="list-row__main"><div class="list-row__title">' + esc(title) + '</div>' +
      '<div class="list-row__sub">' + esc(sub) + '</div></div>' +
      '<div class="list-row__actions"><span class="btn btn--ghost btn--sm">Open →</span></div></div>';
  }

  // ---- Team (admin) ----
  VIEWS.team = async function () {
    main().innerHTML = pageHead('Team profiles', 'Founder cards shown on the Team page. Drag order with the sort number.',
      '<button class="btn btn--primary" id="addProfile">+ Add profile</button>') +
      '<div id="teamList" class="list"><div class="spinner"></div></div><div id="teamEditor"></div>';
    document.getElementById('addProfile').addEventListener('click', () => openProfileEditor(null));
    await loadTeam();
  };
  async function loadTeam() {
    const { profiles } = await api('GET', '/profiles');
    const users = (await api('GET', '/users').catch(() => ({ users: [] }))).users;
    const userMap = {}; users.forEach((u) => { userMap[u.id] = u; });
    const list = document.getElementById('teamList');
    if (!profiles.length) { list.innerHTML = '<div class="empty">No profiles yet. Add the first one.</div>'; return; }
    list.innerHTML = profiles.map((p) =>
      '<div class="list-row glass">' +
        '<img class="list-row__thumb" src="' + thumb(p.photo_url) + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
        '<div class="list-row__main"><div class="list-row__title">' + esc(p.name || '(no name)') + ' ' + pubPill(p.published) +
          (p.user_id && userMap[p.user_id] ? '<span class="pill draft">' + esc(userMap[p.user_id].email) + '</span>' : '') + '</div>' +
          '<div class="list-row__sub">' + esc(p.role) + '</div></div>' +
        '<div class="list-row__actions">' +
          '<button class="btn btn--ghost btn--sm" data-edit="' + p.id + '">Edit</button>' +
          '<button class="btn btn--danger btn--sm" data-del="' + p.id + '">Delete</button>' +
        '</div></div>'
    ).join('');
    list.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openProfileEditor(profiles.find((p) => p.id == b.dataset.edit), users)));
    list.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this profile? This removes it from the live site.')) return;
      await api('DELETE', '/profiles/' + b.dataset.del); toast('Profile deleted', 'ok'); loadTeam();
    }));
  }
  function openProfileEditor(p, users) {
    p = p || {};
    const ed = document.getElementById('teamEditor');
    const userOpts = '<option value="">— not linked —</option>' +
      (users || []).map((u) => '<option value="' + u.id + '"' + (p.user_id == u.id ? ' selected' : '') + '>' + esc(u.name || u.email) + ' (' + esc(u.email) + ')</option>').join('');
    ed.innerHTML = '<form class="editor glass" id="profileForm">' +
      '<h2>' + (p.id ? 'Edit profile' : 'New profile') + '</h2>' +
      field('Name', '<input type="text" name="name" value="' + attr(p.name) + '" required>') +
      field('Role', '<input type="text" name="role" value="' + attr(p.role) + '" placeholder="CEO · Founder">') +
      field('Bio', '<textarea name="bio">' + esc(p.bio) + '</textarea>') +
      field('Working on', '<textarea name="working_on">' + esc(p.working_on) + '</textarea>') +
      field('Photo URL', '<input type="text" name="photo_url" value="' + attr(p.photo_url) + '" placeholder="assets/team-name.png">', 'Path on the site or a full https:// image URL.') +
      '<div class="row2">' +
        field('Sort order', '<input type="number" name="sort_order" value="' + attr(p.sort_order || 0) + '">') +
        field('Linked login', '<select name="user_id">' + userOpts + '</select>') +
      '</div>' +
      toggle('published', 'Show on the live site', p.published !== 0 && p.published !== false ? (p.id ? p.published : true) : false) +
      editorFoot(!!p.id) + '</form>';
    bindEditor('profileForm', ed, async (data) => {
      const payload = {
        name: data.name, role: data.role, bio: data.bio, working_on: data.working_on,
        photo_url: data.photo_url, sort_order: Number(data.sort_order) || 0,
        published: !!data.published, user_id: data.user_id ? Number(data.user_id) : null,
      };
      if (p.id) await api('PUT', '/profiles/' + p.id, payload);
      else await api('POST', '/profiles', payload);
      toast('Profile saved', 'ok'); loadTeam();
    });
  }

  // ---- My profile (employee) ----
  VIEWS.profile = async function () {
    const me = await api('GET', '/me');
    state.profile = me.profile;
    if (!me.profile) {
      main().innerHTML = pageHead('My profile', 'Your founder card on the Team page.') +
        '<div class="empty">No profile is linked to your account yet.<br>Ask an admin to create one and link it to <strong>' + esc(state.user.email) + '</strong>.</div>';
      return;
    }
    const p = me.profile;
    main().innerHTML = pageHead('My profile', 'This is your card on the EpiSafe Team page. Changes go live when saved.',
      '<a class="btn btn--ghost" href="https://episafe.co/team.html" target="_blank" rel="noopener">View on site ↗</a>') +
      '<form class="editor glass" id="myProfileForm">' +
        '<h2>' + esc(p.name || 'Your profile') + '</h2>' +
        field('Name', '<input type="text" name="name" value="' + attr(p.name) + '" required>') +
        field('Role', '<input type="text" name="role" value="' + attr(p.role) + '" placeholder="Title · Founder">') +
        field('Bio', '<textarea name="bio">' + esc(p.bio) + '</textarea>') +
        field('Working on', '<textarea name="working_on">' + esc(p.working_on) + '</textarea>') +
        field('Photo URL', '<input type="text" name="photo_url" value="' + attr(p.photo_url) + '">', 'Path on the site or a full https:// image URL.') +
        '<div class="editor__foot"><button class="btn btn--primary" type="submit">Save changes</button>' +
        (p.published ? '<span class="pill pub">Live</span>' : '<span class="pill draft">Hidden — ask an admin to publish</span>') + '</div>' +
      '</form>';
    bindEditor('myProfileForm', null, async (data) => {
      await api('PUT', '/profiles/' + p.id, {
        name: data.name, role: data.role, bio: data.bio, working_on: data.working_on, photo_url: data.photo_url,
      });
      toast('Profile saved', 'ok');
    });
  };

  // ---- News (admin) ----
  VIEWS.news = async function () {
    main().innerHTML = pageHead('News', 'Posts on the News page. Drafts stay hidden until you publish.',
      '<button class="btn btn--primary" id="addNews">+ New post</button>') +
      '<div id="newsList" class="list"><div class="spinner"></div></div><div id="newsEditor"></div>';
    document.getElementById('addNews').addEventListener('click', () => openNewsEditor(null));
    await loadNews();
  };
  async function loadNews() {
    const { news } = await api('GET', '/news');
    const list = document.getElementById('newsList');
    if (!news.length) { list.innerHTML = '<div class="empty">No posts yet. Write the first update.</div>'; return; }
    list.innerHTML = news.map((p) =>
      '<div class="list-row glass">' +
        (p.image_url ? '<img class="list-row__thumb" src="' + thumb(p.image_url) + '" alt="" onerror="this.style.visibility=\'hidden\'">' : '') +
        '<div class="list-row__main"><div class="list-row__title">' + esc(p.title || '(untitled)') + ' ' + pubPill(p.published) + '</div>' +
          '<div class="list-row__sub">' + esc(fmtDate(p.date)) + (p.excerpt ? ' · ' + esc(p.excerpt) : '') + '</div></div>' +
        '<div class="list-row__actions">' +
          '<button class="btn btn--ghost btn--sm" data-edit="' + p.id + '">Edit</button>' +
          '<button class="btn btn--danger btn--sm" data-del="' + p.id + '">Delete</button>' +
        '</div></div>'
    ).join('');
    list.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openNewsEditor(news.find((p) => p.id == b.dataset.edit))));
    list.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this post?')) return;
      await api('DELETE', '/news/' + b.dataset.del); toast('Post deleted', 'ok'); loadNews();
    }));
  }
  function openNewsEditor(p) {
    p = p || { date: new Date().toISOString().slice(0, 10) };
    const ed = document.getElementById('newsEditor');
    ed.innerHTML = '<form class="editor glass" id="newsForm">' +
      '<h2>' + (p.id ? 'Edit post' : 'New post') + '</h2>' +
      field('Title', '<input type="text" name="title" value="' + attr(p.title) + '" required>') +
      '<div class="row2">' +
        field('Date', '<input type="date" name="date" value="' + attr(p.date) + '">') +
        field('Image URL', '<input type="text" name="image_url" value="' + attr(p.image_url) + '" placeholder="assets/story-lab.jpg">') +
      '</div>' +
      field('Excerpt', '<textarea name="excerpt" style="min-height:60px">' + esc(p.excerpt) + '</textarea>', 'Short summary shown in the list.') +
      field('Body', '<textarea name="body" style="min-height:220px">' + esc(p.body) + '</textarea>', 'Plain text or simple HTML.') +
      toggle('published', 'Publish to the live site', !!p.published) +
      editorFoot(!!p.id) + '</form>';
    bindEditor('newsForm', ed, async (data) => {
      const payload = {
        title: data.title, date: data.date, image_url: data.image_url,
        excerpt: data.excerpt, body: data.body, published: !!data.published,
      };
      if (p.id) await api('PUT', '/news/' + p.id, payload);
      else await api('POST', '/news', payload);
      toast('Post saved', 'ok'); loadNews();
    });
  }

  // ---- Open roles (admin) ----
  VIEWS.roles = async function () {
    main().innerHTML = pageHead('Open roles', 'The "Coming soon" hiring cards on the Team page.',
      '<button class="btn btn--primary" id="addRole">+ Add role</button>') +
      '<div id="rolesList" class="list"><div class="spinner"></div></div><div id="rolesEditor"></div>';
    document.getElementById('addRole').addEventListener('click', () => openRoleEditor(null));
    await loadRoles();
  };
  async function loadRoles() {
    const { roles } = await api('GET', '/roles');
    const list = document.getElementById('rolesList');
    if (!roles.length) { list.innerHTML = '<div class="empty">No open roles yet.</div>'; return; }
    list.innerHTML = roles.map((r) =>
      '<div class="list-row glass"><div class="list-row__main">' +
        '<div class="list-row__title">' + esc(r.title || '(untitled)') + ' ' + pubPill(r.published) + '</div>' +
        '<div class="list-row__sub">' + esc(r.type) + (r.description ? ' · ' + esc(r.description) : '') + '</div></div>' +
        '<div class="list-row__actions">' +
          '<button class="btn btn--ghost btn--sm" data-edit="' + r.id + '">Edit</button>' +
          '<button class="btn btn--danger btn--sm" data-del="' + r.id + '">Delete</button>' +
        '</div></div>'
    ).join('');
    list.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openRoleEditor(roles.find((r) => r.id == b.dataset.edit))));
    list.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this role?')) return;
      await api('DELETE', '/roles/' + b.dataset.del); toast('Role deleted', 'ok'); loadRoles();
    }));
  }
  function openRoleEditor(r) {
    r = r || {};
    const ed = document.getElementById('rolesEditor');
    ed.innerHTML = '<form class="editor glass" id="roleForm">' +
      '<h2>' + (r.id ? 'Edit role' : 'New role') + '</h2>' +
      '<div class="row2">' +
        field('Title', '<input type="text" name="title" value="' + attr(r.title) + '" required>') +
        field('Type', '<input type="text" name="type" value="' + attr(r.type) + '" placeholder="Hiring · Full-time">') +
      '</div>' +
      field('Description', '<textarea name="description">' + esc(r.description) + '</textarea>') +
      field('Detail', '<textarea name="detail" style="min-height:60px">' + esc(r.detail) + '</textarea>', 'The "Open role" requirement line.') +
      '<div class="row2">' +
        field('Sort order', '<input type="number" name="sort_order" value="' + attr(r.sort_order || 0) + '">') +
        '<div></div>' +
      '</div>' +
      toggle('published', 'Show on the live site', r.id ? !!r.published : true) +
      editorFoot(!!r.id) + '</form>';
    bindEditor('roleForm', ed, async (data) => {
      const payload = {
        title: data.title, type: data.type, description: data.description,
        detail: data.detail, sort_order: Number(data.sort_order) || 0, published: !!data.published,
      };
      if (r.id) await api('PUT', '/roles/' + r.id, payload);
      else await api('POST', '/roles', payload);
      toast('Role saved', 'ok'); loadRoles();
    });
  }

  // ---- People (admin) ----
  VIEWS.people = async function () {
    main().innerHTML = pageHead('People', 'Who can sign in. Employees can edit only their own team profile.',
      '<button class="btn btn--primary" id="addUser">+ Add person</button>') +
      '<div id="peopleList" class="list"><div class="spinner"></div></div><div id="peopleEditor"></div>';
    document.getElementById('addUser').addEventListener('click', () => openUserEditor(null));
    await loadPeople();
  };
  async function loadPeople() {
    const { users } = await api('GET', '/users');
    const list = document.getElementById('peopleList');
    list.innerHTML = users.map((u) =>
      '<div class="list-row glass"><div class="list-row__main">' +
        '<div class="list-row__title">' + esc(u.name || u.email) + ' <span class="role-badge ' + u.role + '">' + u.role + '</span>' +
          (u.id == state.user.id ? '<span class="pill draft">you</span>' : '') + '</div>' +
        '<div class="list-row__sub">' + esc(u.email) + '</div></div>' +
        '<div class="list-row__actions">' +
          '<button class="btn btn--ghost btn--sm" data-edit="' + u.id + '">Edit</button>' +
          (u.id == state.user.id ? '' : '<button class="btn btn--danger btn--sm" data-del="' + u.id + '">Delete</button>') +
        '</div></div>'
    ).join('');
    list.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openUserEditor(users.find((u) => u.id == b.dataset.edit))));
    list.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this person? They will lose access immediately.')) return;
      await api('DELETE', '/users/' + b.dataset.del); toast('Person removed', 'ok'); loadPeople();
    }));
  }
  function openUserEditor(u) {
    const isNew = !u; u = u || { role: 'employee' };
    const ed = document.getElementById('peopleEditor');
    const roleSel = '<select name="role">' +
      '<option value="employee"' + (u.role === 'employee' ? ' selected' : '') + '>Employee — edits own profile</option>' +
      '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>Admin — edits everything</option></select>';
    ed.innerHTML = '<form class="editor glass" id="userForm">' +
      '<h2>' + (isNew ? 'Add person' : 'Edit ' + esc(u.name || u.email)) + '</h2>' +
      field('Name', '<input type="text" name="name" value="' + attr(u.name) + '">') +
      (isNew ? field('Email', '<input type="email" name="email" required>') : '') +
      field('Role', roleSel) +
      (isNew ? field('Temporary password', '<input type="text" name="password" required minlength="8">', 'Share this with them; they can change it after signing in.')
             : '') +
      '<div class="editor__foot"><button class="btn btn--primary" type="submit">' + (isNew ? 'Create person' : 'Save') + '</button>' +
        '<div class="spacer"></div>' +
        (isNew ? '' : '<button type="button" class="btn btn--ghost" id="resetPw">Reset password</button>') +
        '<button type="button" class="btn btn--ghost" data-cancel>Cancel</button>' +
      '</div></form>';
    const form = document.getElementById('userForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = formData(form);
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      try {
        if (isNew) await api('POST', '/users', { name: data.name, email: data.email.trim(), role: data.role, password: data.password });
        else await api('PUT', '/users/' + u.id, { name: data.name, role: data.role });
        toast('Saved', 'ok'); ed.innerHTML = ''; loadPeople();
      } catch (err) { btn.disabled = false; toast(err.message, 'err'); }
    });
    ed.querySelector('[data-cancel]').addEventListener('click', () => { ed.innerHTML = ''; });
    if (!isNew) {
      document.getElementById('resetPw').addEventListener('click', async () => {
        const pw = prompt('New temporary password for ' + (u.name || u.email) + ' (min 8 characters):');
        if (!pw) return;
        try { await api('POST', '/users/' + u.id + '/password', { password: pw }); toast('Password reset — they must sign in again', 'ok'); }
        catch (err) { toast(err.message, 'err'); }
      });
    }
  }

  // ---- Account (self) ----
  VIEWS.account = function () {
    main().innerHTML = pageHead('Account', 'Update your own password.') +
      '<form class="editor glass" id="pwForm" style="max-width:480px">' +
        '<h2>Change password</h2>' +
        field('Current password', '<input type="password" name="current" required autocomplete="current-password">') +
        field('New password', '<input type="password" name="next" required minlength="8" autocomplete="new-password">', 'At least 8 characters.') +
        '<div class="editor__foot"><button class="btn btn--primary" type="submit">Update password</button></div>' +
      '</form>';
    const form = document.getElementById('pwForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = formData(form);
      const btn = form.querySelector('button'); btn.disabled = true;
      try { await api('POST', '/account/password', { current: data.current, next: data.next }); toast('Password updated', 'ok'); form.reset(); }
      catch (err) { toast(err.message, 'err'); }
      finally { btn.disabled = false; }
    });
  };

  // ---------- shared editor plumbing ----------
  function editorFoot(isEdit) {
    return '<div class="editor__foot"><button class="btn btn--primary" type="submit">' + (isEdit ? 'Save changes' : 'Create') + '</button>' +
      '<div class="spacer"></div><button type="button" class="btn btn--ghost" data-cancel>Cancel</button></div>';
  }
  function formData(form) {
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v; });
    form.querySelectorAll('input[type=checkbox]').forEach((c) => { data[c.name] = c.checked; });
    return data;
  }
  function bindEditor(formId, container, onSave) {
    const form = document.getElementById(formId);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      try { await onSave(formData(form)); if (container) container.innerHTML = ''; }
      catch (err) { toast(err.message, 'err'); btn.disabled = false; }
    });
    if (container) {
      const cancel = form.querySelector('[data-cancel]');
      if (cancel) cancel.addEventListener('click', () => { container.innerHTML = ''; });
    }
  }
  function thumb(url) {
    if (!url) return '';
    if (/^https?:\/\//.test(url) || url.startsWith('/')) return url;
    return 'https://episafe.co/' + url.replace(/^\.?\//, '');
  }

  boot();
})();
