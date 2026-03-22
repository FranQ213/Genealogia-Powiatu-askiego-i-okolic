const STORAGE_KEY = 'genealogia_powiatu_laskiego_i_okolic_data_v2';
const LEGACY_KEYS = [
  'genealogia_laski_demo_v1'
];

function uid() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const defaultData = {
  ranks: [
    { id: uid(), name: 'Administrator', desc: 'Pełne uprawnienia do zarządzania systemem.' },
    { id: uid(), name: 'Sympatyk', desc: 'Dostęp do przeglądania i podstawowych funkcji.' },
    { id: uid(), name: 'Genealog', desc: 'Osoba indeksująca i porządkująca dane.' },
    { id: uid(), name: 'Zwykłe konto', desc: 'Konto z dostępem do przeglądania i własnego profilu.' }
  ],
  users: [
    { id: uid(), username: 'KrawczykP', password: 'MuchaUcha25!!', display: 'KrawczykP', rank: 'Administrator' },
    { id: uid(), username: 'Sympatyk1', password: 'haslo123', display: 'Sympatyk 1', rank: 'Sympatyk' }
  ],
  parishes: [
    { id: uid(), name: 'Parafia św. Katarzyny', town: 'Łask', desc: 'Przykładowa parafia do demonstracji panelu.' },
    { id: uid(), name: 'Parafia Najświętszej Maryi Panny', town: 'Sędziejowice', desc: 'Przykładowy wpis z lokalnego katalogu.' }
  ],
  indexes: [
    {
      id: uid(),
      parishId: null,
      parishName: 'Parafia św. Katarzyny',
      town: 'Łask',
      year: '1894',
      act: '12',
      person: 'Jan Kowalski',
      parents: 'Piotr i Maria',
      info: 'Akt urodzenia, zapis do sprawdzenia i doprecyzowania.',
      scan: 'https://example.com',
      createdByUsername: 'KrawczykP',
      createdByDisplay: 'KrawczykP'
    }
  ]
};

const $ = (id) => document.getElementById(id);
const state = {
  data: loadData(),
  currentUser: null,
  activeSection: 'dashboard',
  authTab: 'login'
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function migrateData(data) {
  const next = clone(defaultData);
  const src = data && typeof data === 'object' ? data : {};

  next.ranks = Array.isArray(src.ranks) && src.ranks.length ? src.ranks : next.ranks;
  next.users = Array.isArray(src.users) && src.users.length ? src.users : next.users;
  next.parishes = Array.isArray(src.parishes) && src.parishes.length ? src.parishes : next.parishes;
  next.indexes = Array.isArray(src.indexes) && src.indexes.length ? src.indexes : next.indexes;

  if (!next.ranks.some(r => r.name === 'Zwykłe konto')) {
    next.ranks.push({ id: uid(), name: 'Zwykłe konto', desc: 'Konto z dostępem do przeglądania i własnego profilu.' });
  }

  next.users = next.users.map(u => ({
    id: u.id || uid(),
    username: String(u.username || '').trim(),
    password: String(u.password ?? ''),
    display: String(u.display || u.username || '').trim(),
    rank: String(u.rank || 'Zwykłe konto').trim() || 'Zwykłe konto'
  })).filter(u => u.username);

  next.parishes = next.parishes.map(p => ({
    id: p.id || uid(),
    name: String(p.name || '').trim(),
    town: String(p.town || '').trim(),
    desc: String(p.desc || '').trim()
  })).filter(p => p.name);

  next.indexes = next.indexes.map(ix => ({
    id: ix.id || uid(),
    parishId: ix.parishId ?? null,
    parishName: String(ix.parishName || '').trim(),
    town: String(ix.town || '').trim(),
    year: String(ix.year || '').trim(),
    act: String(ix.act || '').trim(),
    person: String(ix.person || '').trim(),
    parents: String(ix.parents || '').trim(),
    info: String(ix.info || '').trim(),
    scan: String(ix.scan || '').trim(),
    createdByUsername: String(ix.createdByUsername || ix.author || '').trim(),
    createdByDisplay: String(ix.createdByDisplay || ix.createdByUsername || ix.author || '').trim()
  }));

  // Ensure admin exists
  if (!next.users.some(u => u.username === 'KrawczykP')) {
    next.users.unshift({ id: uid(), username: 'KrawczykP', password: 'MuchaUcha25!!', display: 'KrawczykP', rank: 'Administrator' });
  }

  // Ensure at least one admin rank exists
  if (!next.ranks.some(r => r.name === 'Administrator')) {
    next.ranks.unshift({ id: uid(), name: 'Administrator', desc: 'Pełne uprawnienia do zarządzania systemem.' });
  }

  return next;
}

function loadData() {
  let raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    for (const key of LEGACY_KEYS) {
      raw = localStorage.getItem(key);
      if (raw) break;
    }
  }
  if (!raw) return clone(defaultData);
  try {
    return migrateData(JSON.parse(raw));
  } catch {
    return clone(defaultData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function persist() {
  state.data = migrateData(state.data);
  saveData();
}

function initials(text) {
  const t = String(text || 'G').trim();
  return t
    .split(/\s+/)
    .slice(0, 2)
    .map(x => x[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'G';
}

function canAdmin() {
  return state.currentUser && state.currentUser.rank === 'Administrator';
}

function formatDate() {
  return new Date().toLocaleString('pl-PL', { dateStyle: 'full', timeStyle: 'short' });
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

function escapeAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}

function showApp() {
  $('authOverlay').classList.add('hidden');
  $('appShell').classList.remove('hidden');
}

function showAuth() {
  $('authOverlay').classList.remove('hidden');
  $('appShell').classList.add('hidden');
}

function setSection(name) {
  state.activeSection = name;
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('active', b.dataset.section === name));
  document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === name));
}

function openScan(url) {
  if (!url) return alert('Brak adresu skanu.');
  window.open(url, '_blank', 'noopener,noreferrer');
}

function login(username, password) {
  const user = state.data.users.find(u => u.username === username && u.password === password);
  if (!user) {
    alert('Nieprawidłowa nazwa użytkownika lub hasło.');
    return;
  }
  state.currentUser = user;
  showApp();
  renderAll();
  setSection('dashboard');
}

function register(username, display, password) {
  const cleanUser = username.trim();
  const cleanPass = password;
  const cleanDisplay = display.trim() || cleanUser;

  if (!cleanUser || !cleanPass) {
    alert('Podaj nazwę użytkownika i hasło.');
    return;
  }
  if (state.data.users.some(u => u.username.toLowerCase() === cleanUser.toLowerCase())) {
    alert('Taki użytkownik już istnieje.');
    return;
  }

  const newUser = {
    id: uid(),
    username: cleanUser,
    password: cleanPass,
    display: cleanDisplay,
    rank: 'Zwykłe konto'
  };
  state.data.users.unshift(newUser);
  persist();
  state.currentUser = newUser;
  showApp();
  renderAll();
  setSection('dashboard');
}

function logout() {
  state.currentUser = null;
  $('loginPass').value = '';
  $('regPass').value = '';
  showAuth();
}

function addParish(name, town, desc) {
  state.data.parishes.unshift({
    id: uid(),
    name: name.trim(),
    town: town.trim(),
    desc: desc.trim()
  });
  persist();
  renderAll();
}

function addIndex(form) {
  const parishId = form.indexParish.value;
  const parish = state.data.parishes.find(p => p.id === parishId);
  state.data.indexes.unshift({
    id: uid(),
    parishId,
    parishName: parish ? parish.name : '—',
    town: form.indexTown.value.trim(),
    year: form.indexYear.value.trim(),
    act: form.indexAct.value.trim(),
    person: form.indexPerson.value.trim(),
    parents: form.indexParents.value.trim(),
    info: form.indexInfo.value.trim(),
    scan: form.indexScan.value.trim(),
    createdByUsername: state.currentUser?.username || '—',
    createdByDisplay: state.currentUser?.display || state.currentUser?.username || '—'
  });
  persist();
  renderAll();
}

function addRank(name, desc) {
  state.data.ranks.unshift({ id: uid(), name: name.trim(), desc: desc.trim() });
  persist();
  renderAll();
}

function addUser(username, password, rank, display) {
  state.data.users.unshift({
    id: uid(),
    username: username.trim(),
    password,
    display: display.trim() || username.trim(),
    rank
  });
  persist();
  renderAll();
}

function deleteItem(type, id) {
  if (!confirm('Usunąć ten element?')) return;
  state.data[type] = state.data[type].filter(x => x.id !== id);
  persist();
  renderAll();
}

function updateUserRank(userId, rank) {
  const user = state.data.users.find(u => u.id === userId);
  if (!user) return;
  user.rank = rank;
  if (state.currentUser && state.currentUser.id === user.id) {
    state.currentUser = user;
  }
  persist();
  renderAll();
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'genealogia_backup.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function setAuthTab(tab) {
  state.authTab = tab;
  document.querySelectorAll('[data-auth-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.authTab === tab));
  $('loginPane').classList.toggle('active', tab === 'login');
  $('registerPane').classList.toggle('active', tab === 'register');
}

function renderSideStats() {
  $('pillUser').textContent = state.currentUser ? `Użytkownik: ${state.currentUser.display || state.currentUser.username}` : 'Gość';
  $('pillRole').textContent = state.currentUser ? `Ranga: ${state.currentUser.rank}` : 'Brak roli';
  $('sidebarUser').textContent = state.currentUser ? (state.currentUser.display || state.currentUser.username) : 'Gość';
  $('sidebarInfo').textContent = state.currentUser ? 'Zalogowano pomyślnie' : 'Zaloguj się, aby zarządzać danymi';
  $('sidebarRole').textContent = state.currentUser ? state.currentUser.rank : 'Brak';
  $('avatar').textContent = initials(state.currentUser ? (state.currentUser.display || state.currentUser.username) : 'G');
  $('statUser').textContent = state.currentUser ? '1' : '0';
  $('statRanks').textContent = state.data.ranks.length;
  $('statParish').textContent = state.data.parishes.length;
  $('statIndex').textContent = state.data.indexes.length;
  $('statParishSide').textContent = state.data.parishes.length;
  $('statIndexSide').textContent = state.data.indexes.length;
}

function renderRanks() {
  const list = $('rankList');
  list.innerHTML = '';
  if (!state.data.ranks.length) {
    list.innerHTML = '<div class="empty">Brak rang.</div>';
    return;
  }
  state.data.ranks.forEach(rank => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <div class="item-top">
        <div>
          <h3>${escapeHtml(rank.name)}</h3>
          <p>${escapeHtml(rank.desc || '')}</p>
        </div>
        <div class="controls">
          ${canAdmin() && rank.name !== 'Administrator' ? `<button class="danger" data-del="ranks" data-id="${rank.id}">Usuń</button>` : ''}
        </div>
      </div>
    `;
    list.appendChild(el);
  });
}

function renderParishes() {
  const list = $('parishList');
  list.innerHTML = '';
  if (!state.data.parishes.length) {
    list.innerHTML = '<div class="empty">Brak parafii.</div>';
    return;
  }
  state.data.parishes.forEach(p => {
    const count = state.data.indexes.filter(i => i.parishId === p.id || i.parishName === p.name).length;
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <div class="item-top">
        <div>
          <h3>${escapeHtml(p.name)}</h3>
          <div class="chips">
            <span class="chip">${escapeHtml(p.town || '—')}</span>
            <span class="chip">${count} indeksów</span>
          </div>
          <p>${escapeHtml(p.desc || '')}</p>
        </div>
        <div class="controls">
          ${canAdmin() ? `<button class="danger" data-del="parishes" data-id="${p.id}">Usuń</button>` : ''}
        </div>
      </div>
    `;
    list.appendChild(el);
  });
}

function renderIndexes() {
  const table = $('indexTable');
  table.innerHTML = '';
  if (!state.data.indexes.length) {
    table.innerHTML = '<div class="empty">Brak indeksów.</div>';
    return;
  }

  const head = document.createElement('div');
  head.className = 'row head';
  head.innerHTML = '<div>Rok</div><div>Numer aktu</div><div>Osoba</div><div>Rodzice</div><div>Miejscowość / info</div><div>Akcje</div>';
  table.appendChild(head);

  state.data.indexes.forEach(ix => {
    const row = document.createElement('div');
    row.className = 'row';
    const author = ix.createdByDisplay || ix.createdByUsername || '—';
    row.innerHTML = `
      <div><strong>${escapeHtml(ix.year || '—')}</strong><div class="small">${escapeHtml(ix.parishName || '—')}</div></div>
      <div>${escapeHtml(ix.act || '—')}</div>
      <div>${escapeHtml(ix.person || '—')}</div>
      <div>${escapeHtml(ix.parents || '—')}</div>
      <div>
        <div><strong>${escapeHtml(ix.town || '—')}</strong></div>
        <div class="small">${escapeHtml(ix.info || '—')}</div>
      </div>
      <div class="actions">
        <button class="secondary" data-scan="${escapeAttr(ix.scan || '')}">Skan</button>
        <button class="ghost" title="Autor: ${escapeAttr(author)}">A</button>
        ${canAdmin() ? `<button class="danger" data-del="indexes" data-id="${ix.id}">Usuń</button>` : ''}
      </div>
    `;
    table.appendChild(row);
  });
}

function renderUsers() {
  const list = $('userList');
  list.innerHTML = '';
  if (!state.data.users.length) {
    list.innerHTML = '<div class="empty">Brak użytkowników.</div>';
    return;
  }

  state.data.users.forEach(u => {
    const el = document.createElement('div');
    el.className = 'item';
    const isSelf = state.currentUser && state.currentUser.id === u.id;
    const isAdminUser = u.rank === 'Administrator';
    const userRanks = state.data.ranks.map(r => r.name);

    el.innerHTML = `
      <div class="item-top">
        <div>
          <h3>${escapeHtml(u.display || u.username)}</h3>
          <div class="chips">
            <span class="chip">@${escapeHtml(u.username)}</span>
            <span class="chip">${escapeHtml(u.rank)}</span>
          </div>
          <p>Hasło demo przechowywane lokalnie: <strong>${escapeHtml(u.password)}</strong></p>
        </div>
        <div class="controls">
          ${canAdmin() && !isSelf ? `<button class="danger" data-del="users" data-id="${u.id}">Usuń</button>` : ''}
        </div>
      </div>
    `;

    if (canAdmin()) {
      const row = document.createElement('div');
      row.style.marginTop = '10px';
      row.className = 'inline';
      row.innerHTML = `
        <div style="min-width:260px;flex:1">
          <label class="small">Zmień rangę${isSelf ? ' (Twoje konto)' : ''}</label>
          <select ${isAdminUser && !isSelf ? '' : ''} data-rank-user="${u.id}" ${isAdminUser && isSelf ? 'disabled' : ''}>
            ${userRanks.map(r => `<option value="${escapeAttr(r)}" ${r === u.rank ? 'selected' : ''}>${escapeHtml(r)}</option>`).join('')}
          </select>
        </div>
        <button class="secondary" data-save-rank="${u.id}" ${isAdminUser && isSelf ? 'disabled' : ''}>Zapisz rangę</button>
      `;
      el.appendChild(row);
    }

    list.appendChild(el);
  });
}

function renderSelects() {
  const parishSelect = $('indexParish');
  parishSelect.innerHTML = '';
  state.data.parishes.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} — ${p.town || ''}`;
    parishSelect.appendChild(opt);
  });

  const rankSelect = $('newUserRank');
  rankSelect.innerHTML = '';
  state.data.ranks.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.name;
    opt.textContent = r.name;
    rankSelect.appendChild(opt);
  });
}

function renderRecent() {
  const recent = $('recentIndexes');
  recent.innerHTML = '';
  const items = state.data.indexes.slice(0, 4);
  if (!items.length) {
    recent.innerHTML = '<div class="empty">Brak indeksów do pokazania.</div>';
    return;
  }
  items.forEach(ix => {
    const author = ix.createdByDisplay || ix.createdByUsername || '—';
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <div class="item-top">
        <div>
          <h3>${escapeHtml(ix.person || '—')}</h3>
          <div class="chips">
            <span class="chip">${escapeHtml(ix.year || '—')}</span>
            <span class="chip">Akt ${escapeHtml(ix.act || '—')}</span>
            <span class="chip">${escapeHtml(ix.parishName || '—')}</span>
          </div>
          <p>${escapeHtml(ix.town || '—')} · ${escapeHtml(ix.parents || '—')} · ${escapeHtml(ix.info || '')}</p>
        </div>
        <div class="controls">
          <button class="secondary" data-scan="${escapeAttr(ix.scan || '')}">Skan</button>
          <button class="ghost" title="Autor: ${escapeAttr(author)}">A</button>
        </div>
      </div>
    `;
    recent.appendChild(el);
  });
  $('lastUpdate').textContent = `Ostatnia aktualizacja: ${formatDate()}`;
}

function updateAdminVisibility() {
  document.querySelectorAll('.admin-only').forEach(el => {
    el.classList.toggle('is-hidden', !canAdmin());
  });

  $('quickAddExample').classList.toggle('hidden', !canAdmin());
  $('exportBtn').classList.toggle('hidden', !state.currentUser);

  if (!canAdmin()) {
    $('parishHint').textContent = 'Tylko administrator może tworzyć i edytować parafie.';
  } else {
    $('parishHint').textContent = 'Administrator może tworzyć i edytować parafie.';
  }
}

function renderAll() {
  renderSideStats();
  renderSelects();
  renderRanks();
  renderParishes();
  renderIndexes();
  renderUsers();
  renderRecent();
  updateAdminVisibility();
}

// Auth tabs
$('authOverlay').addEventListener('click', (e) => {
  const tab = e.target.closest('[data-auth-tab]');
  if (tab) setAuthTab(tab.dataset.authTab);
});

// Login / register events
$('loginBtn').addEventListener('click', () => login($('loginUser').value.trim(), $('loginPass').value));
$('fillAdmin').addEventListener('click', () => {
  $('loginUser').value = 'KrawczykP';
  $('loginPass').value = 'MuchaUcha25!!';
});
$('loginPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') login($('loginUser').value.trim(), $('loginPass').value);
});
$('registerBtn').addEventListener('click', () => register($('regUser').value, $('regDisplay').value, $('regPass').value));
$('regPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') register($('regUser').value, $('regDisplay').value, $('regPass').value);
});
$('loginUser').addEventListener('keydown', e => { if (e.key === 'Enter') $('loginPass').focus(); });
$('regUser').addEventListener('keydown', e => { if (e.key === 'Enter') $('regDisplay').focus(); });
$('regDisplay').addEventListener('keydown', e => { if (e.key === 'Enter') $('regPass').focus(); });

$('logoutBtn').addEventListener('click', logout);
$('exportBtn').addEventListener('click', exportBackup);

$('resetDemo').addEventListener('click', () => {
  if (!confirm('Przywrócić dane demo?')) return;
  state.data = clone(defaultData);
  persist();
  if (state.currentUser && !state.data.users.some(u => u.username === state.currentUser.username)) state.currentUser = null;
  renderAll();
  if (!state.currentUser) showAuth();
});

$('quickAddExample').addEventListener('click', () => {
  if (!canAdmin()) return alert('Tylko administrator może dodawać dane w tej sekcji.');
  const parish = state.data.parishes[0];
  state.data.indexes.unshift({
    id: uid(),
    parishId: parish?.id || null,
    parishName: parish?.name || 'Parafia przykładowa',
    town: parish?.town || '—',
    year: '1902',
    act: String(Math.floor(Math.random() * 90) + 1),
    person: 'Przykładowa Osoba',
    parents: 'Ojciec i Matka',
    info: 'Przykładowy wpis dodany jednym kliknięciem.',
    scan: 'https://example.com',
    createdByUsername: state.currentUser?.username || '—',
    createdByDisplay: state.currentUser?.display || state.currentUser?.username || '—'
  });
  persist();
  renderAll();
  setSection('indeksy');
});

document.querySelectorAll('.nav button').forEach(btn => {
  btn.addEventListener('click', () => setSection(btn.dataset.section));
});

document.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) {
    if (!canAdmin()) return alert('Brak uprawnień.');
    deleteItem(del.dataset.del, del.dataset.id);
    return;
  }

  const scan = e.target.closest('[data-scan]');
  if (scan) openScan(scan.dataset.scan);

  const saveRank = e.target.closest('[data-save-rank]');
  if (saveRank) {
    if (!canAdmin()) return alert('Brak uprawnień.');
    const uidUser = saveRank.dataset.saveRank;
    const select = document.querySelector(`[data-rank-user="${CSS.escape(uidUser)}"]`);
    if (!select) return;
    updateUserRank(uidUser, select.value);
  }
});

$('parishForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!canAdmin()) return alert('Brak uprawnień.');
  const name = $('parishName').value.trim();
  const town = $('parishTown').value.trim();
  const desc = $('parishDesc').value.trim();
  if (!name) return alert('Podaj nazwę parafii.');
  addParish(name, town, desc);
  e.target.reset();
});

$('indexForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!canAdmin()) return alert('Brak uprawnień.');
  if (!$('indexParish').value) return alert('Wybierz parafię.');
  addIndex(e.target);
  e.target.reset();
  $('indexParish').selectedIndex = 0;
});

$('rankForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!canAdmin()) return alert('Brak uprawnień.');
  const name = $('rankName').value.trim();
  const desc = $('rankDesc').value.trim();
  if (!name) return alert('Podaj nazwę rangi.');
  addRank(name, desc);
  e.target.reset();
});

$('userForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!canAdmin()) return alert('Brak uprawnień.');
  const username = $('newUserName').value.trim();
  const password = $('newUserPass').value;
  const rank = $('newUserRank').value;
  const display = $('newUserDisplay').value.trim();
  if (!username || !password) return alert('Podaj nazwę użytkownika i hasło.');
  if (state.data.users.some(u => u.username.toLowerCase() === username.toLowerCase())) return alert('Taki użytkownik już istnieje.');
  addUser(username, password, rank, display);
  e.target.reset();
});

// Init
state.data = migrateData(state.data);
persist();
if (state.currentUser) showApp(); else showAuth();
setAuthTab('login');
renderAll();
setSection('dashboard');
