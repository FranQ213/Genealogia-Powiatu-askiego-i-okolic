const STORAGE_KEY = 'genealogia_powiatu_laskiego_i_okolic_data_v4';
const LEGACY_KEYS = [
  'genealogia_powiatu_laskiego_i_okolic_data_v3',
  'genealogia_powiatu_laskiego_i_okolic_data_v2',
  'genealogia_laski_demo_v1'
];

function uid() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const ACT_TYPES = ['urodzenia', 'małżeństwa', 'zgonu'];

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
      actType: 'urodzenia',
      act: '12',
      person: 'Jan Kowalski',
      parents: 'Piotr i Maria',
      info: 'Akt urodzenia, zapis do sprawdzenia i doprecyzowania.',
      scan: 'https://example.com',
      createdByUsername: 'KrawczykP',
      createdByDisplay: 'KrawczykP',
      createdAt: Date.now(),
      updatedAt: null
    }
  ]
};

const $ = (id) => document.getElementById(id);
const state = {
  data: loadData(),
  currentUser: null,
  activeSection: 'dashboard',
  authTab: 'login',
  editingIndexId: null,
  search: { query: '', parishId: '', town: '', actType: '' }
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalizeActType(value) {
  const cleaned = String(value || '').trim().toLowerCase();
  return ACT_TYPES.includes(cleaned) ? cleaned : 'urodzenia';
}

function migrateData(data) {
  const next = clone(defaultData);
  const src = data && typeof data === 'object' ? data : {};

  if (Array.isArray(src.ranks) && src.ranks.length) next.ranks = src.ranks;
  if (Array.isArray(src.users) && src.users.length) next.users = src.users;
  if (Array.isArray(src.parishes) && src.parishes.length) next.parishes = src.parishes;
  if (Array.isArray(src.indexes) && src.indexes.length) next.indexes = src.indexes;

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
    actType: normalizeActType(ix.actType || ix.type || ix.kind || (String(ix.info || '').toLowerCase().includes('małżeń') ? 'małżeństwa' : String(ix.info || '').toLowerCase().includes('zgon') ? 'zgonu' : 'urodzenia')),
    act: String(ix.act || '').trim(),
    person: String(ix.person || '').trim(),
    parents: String(ix.parents || '').trim(),
    info: String(ix.info || '').trim(),
    scan: String(ix.scan || '').trim(),
    createdByUsername: String(ix.createdByUsername || ix.author || '').trim(),
    createdByDisplay: String(ix.createdByDisplay || ix.createdByUsername || ix.author || '').trim(),
    createdAt: typeof ix.createdAt === 'number' ? ix.createdAt : Date.now(),
    updatedAt: typeof ix.updatedAt === 'number' ? ix.updatedAt : null
  }));

  if (!next.users.some(u => u.username === 'KrawczykP')) {
    next.users.unshift({ id: uid(), username: 'KrawczykP', password: 'MuchaUcha25!!', display: 'KrawczykP', rank: 'Administrator' });
  }

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
  return !!(state.currentUser && state.currentUser.rank === 'Administrator');
}

function formatDate(ts = Date.now()) {
  return new Date(ts).toLocaleString('pl-PL', { dateStyle: 'full', timeStyle: 'short' });
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

function readIndexForm() {
  const parishId = $('indexParish').value;
  const parish = state.data.parishes.find(p => p.id === parishId);
  return {
    parishId,
    parishName: parish ? parish.name : '—',
    town: $('indexTown').value.trim(),
    year: $('indexYear').value.trim(),
    actType: $('indexActType').value,
    act: $('indexAct').value.trim(),
    person: $('indexPerson').value.trim(),
    parents: $('indexParents').value.trim(),
    info: $('indexInfo').value.trim(),
    scan: $('indexScan').value.trim()
  };
}

function addOrUpdateIndex() {
  const payload = {
    ...readIndexForm(),
    updatedAt: Date.now()
  };

  if (state.editingIndexId) {
    const idx = state.data.indexes.findIndex(ix => ix.id === state.editingIndexId);
    if (idx === -1) {
      state.editingIndexId = null;
      alert('Nie znaleziono indeksu do edycji.');
      return;
    }
    const current = state.data.indexes[idx];
    state.data.indexes[idx] = {
      ...current,
      ...payload,
      id: current.id,
      createdByUsername: current.createdByUsername || state.currentUser?.username || '—',
      createdByDisplay: current.createdByDisplay || state.currentUser?.display || state.currentUser?.username || '—',
      createdAt: current.createdAt || Date.now()
    };
    state.editingIndexId = null;
  } else {
    state.data.indexes.unshift({
      id: uid(),
      ...payload,
      createdByUsername: state.currentUser?.username || '—',
      createdByDisplay: state.currentUser?.display || state.currentUser?.username || '—',
      createdAt: Date.now(),
      updatedAt: null
    });
  }

  persist();
  renderAll();
  renderIndexFormMode();
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
  if (type === 'indexes' && state.editingIndexId === id) {
    state.editingIndexId = null;
  }
  persist();
  renderAll();
  renderIndexFormMode();
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

function getFilteredIndexes() {
  const q = state.search.query.trim().toLowerCase();
  const parishId = state.search.parishId;
  const town = state.search.town.trim().toLowerCase();
  const actType = state.search.actType;

  return state.data.indexes.filter(ix => {
    const matchesQuery = !q || [
      ix.year, ix.act, ix.person, ix.parents, ix.info, ix.town, ix.parishName, ix.createdByUsername, ix.createdByDisplay, ix.actType
    ].some(v => String(v || '').toLowerCase().includes(q));
    const matchesParish = !parishId || ix.parishId === parishId;
    const matchesTown = !town || String(ix.town || '').toLowerCase().includes(town);
    const matchesType = !actType || ix.actType === actType;
    return matchesQuery && matchesParish && matchesTown && matchesType;
  });
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

function renderIndexFormMode() {
  const label = $('indexModeLabel');
  const submit = $('indexSubmitBtn');
  const cancel = $('cancelEditBtn');
  const hidden = $('indexEditingId');
  if (!label || !submit || !cancel || !hidden) return;
  const isEditing = !!state.editingIndexId;
  hidden.value = state.editingIndexId || '';
  label.textContent = isEditing ? 'Tryb: edycja indeksu' : 'Tryb: dodawanie';
  submit.textContent = isEditing ? 'Zapisz zmiany' : 'Dodaj indeks';
  cancel.classList.toggle('hidden', !isEditing);
}

function fillIndexForm(ix) {
  $('indexEditingId').value = ix.id;
  $('indexParish').value = ix.parishId || '';
  $('indexTown').value = ix.town || '';
  $('indexYear').value = ix.year || '';
  $('indexActType').value = normalizeActType(ix.actType);
  $('indexAct').value = ix.act || '';
  $('indexPerson').value = ix.person || '';
  $('indexParents').value = ix.parents || '';
  $('indexScan').value = ix.scan || '';
  $('indexInfo').value = ix.info || '';
  state.editingIndexId = ix.id;
  renderIndexFormMode();
}

function clearIndexForm() {
  $('indexForm').reset();
  $('indexParish').selectedIndex = 0;
  $('indexActType').value = 'urodzenia';
  state.editingIndexId = null;
  renderIndexFormMode();
}

function actTypeLabel(type) {
  return ({ urodzenia: 'Urodzenia', małżeństwa: 'Małżeństwa', zgonu: 'Zgonu' }[normalizeActType(type)]);
}

function renderIndexes() {
  const table = $('indexTable');
  table.innerHTML = '';
  const items = getFilteredIndexes();
  if (!items.length) {
    table.innerHTML = '<div class="empty">Brak indeksów dla wybranych filtrów.</div>';
    return;
  }

  const head = document.createElement('div');
  head.className = 'row head';
  head.innerHTML = '<div>Rok</div><div>Rodzaj aktu</div><div>Numer aktu</div><div>Osoba</div><div>Rodzice</div><div>Miejscowość / info</div><div>Akcje</div>';
  table.appendChild(head);

  items.forEach(ix => {
    const row = document.createElement('div');
    row.className = 'row';
    const author = ix.createdByDisplay || ix.createdByUsername || '—';
    const edited = ix.updatedAt ? `<div class="small">Edytowano: ${escapeHtml(formatDate(ix.updatedAt))}</div>` : '';
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(ix.year || '—')}</strong>
        <div class="small">${escapeHtml(ix.parishName || '—')}</div>
      </div>
      <div>${escapeHtml(actTypeLabel(ix.actType))}</div>
      <div>${escapeHtml(ix.act || '—')}</div>
      <div>${escapeHtml(ix.person || '—')}</div>
      <div>${escapeHtml(ix.parents || '—')}</div>
      <div>
        <div><strong>${escapeHtml(ix.town || '—')}</strong></div>
        <div class="small">${escapeHtml(ix.info || '—')}</div>
        ${edited}
      </div>
      <div class="actions">
        <button class="secondary" data-scan="${escapeAttr(ix.scan || '')}">Skan</button>
        <button class="ghost" title="Autor: ${escapeAttr(author)}">A</button>
        ${canAdmin() ? `<button class="secondary" data-edit-index="${ix.id}">Edytuj</button>` : ''}
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
          <select data-rank-user="${u.id}" ${isAdminUser && isSelf ? 'disabled' : ''}>
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

  const actSelect = $('indexActType');
  if (actSelect) {
    actSelect.innerHTML = ACT_TYPES.map(type => `<option value="${type}">${actTypeLabel(type)}</option>`).join('');
  }

  const searchParish = $('searchParish');
  if (searchParish) {
    searchParish.innerHTML = '<option value="">Wszystkie parafie</option>';
    state.data.parishes.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} — ${p.town || ''}`;
      if (p.id === state.search.parishId) opt.selected = true;
      searchParish.appendChild(opt);
    });
  }

  const searchActType = $('searchActType');
  if (searchActType) {
    searchActType.innerHTML = '<option value="">Wszystkie rodzaje</option>' + ACT_TYPES.map(type => `<option value="${type}" ${state.search.actType === type ? 'selected' : ''}>${actTypeLabel(type)}</option>`).join('');
  }

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
            <span class="chip">${escapeHtml(actTypeLabel(ix.actType))}</span>
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

  if ($('parishHint')) {
    $('parishHint').textContent = canAdmin()
      ? 'Administrator może tworzyć i edytować parafie.'
      : 'Tylko administrator może tworzyć i edytować parafie.';
  }

  renderIndexFormMode();
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

$('authOverlay').addEventListener('click', (e) => {
  const tab = e.target.closest('[data-auth-tab]');
  if (tab) setAuthTab(tab.dataset.authTab);
});

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
  state.editingIndexId = null;
  renderAll();
  renderIndexFormMode();
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
    actType: 'urodzenia',
    act: String(Math.floor(Math.random() * 90) + 1),
    person: 'Przykładowa Osoba',
    parents: 'Ojciec i Matka',
    info: 'Przykładowy wpis dodany jednym kliknięciem.',
    scan: 'https://example.com',
    createdByUsername: state.currentUser?.username || '—',
    createdByDisplay: state.currentUser?.display || state.currentUser?.username || '—',
    createdAt: Date.now(),
    updatedAt: null
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

  const edit = e.target.closest('[data-edit-index]');
  if (edit) {
    if (!canAdmin()) return alert('Brak uprawnień.');
    const ix = state.data.indexes.find(item => item.id === edit.dataset.editIndex);
    if (!ix) return alert('Nie znaleziono indeksu.');
    fillIndexForm(ix);
    setSection('indeksy');
    $('indexTown').focus();
    return;
  }

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
  if (!ACT_TYPES.includes($('indexActType').value)) return alert('Wybierz rodzaj aktu.');
  addOrUpdateIndex();
  e.target.reset();
  $('indexParish').selectedIndex = 0;
  $('indexActType').value = 'urodzenia';
  clearIndexForm();
});

$('cancelEditBtn').addEventListener('click', () => {
  clearIndexForm();
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

$('searchQuery').addEventListener('input', (e) => {
  state.search.query = e.target.value;
  renderIndexes();
});
$('searchTown').addEventListener('input', (e) => {
  state.search.town = e.target.value;
  renderIndexes();
});
$('searchParish').addEventListener('change', (e) => {
  state.search.parishId = e.target.value;
  renderIndexes();
});
$('searchActType').addEventListener('change', (e) => {
  state.search.actType = e.target.value;
  renderIndexes();
});
$('clearSearch').addEventListener('click', () => {
  state.search = { query: '', parishId: '', town: '', actType: '' };
  $('searchQuery').value = '';
  $('searchTown').value = '';
  $('searchParish').value = '';
  $('searchActType').value = '';
  renderIndexes();
});

function init() {
  state.data = migrateData(state.data);
  persist();
  if (state.currentUser) showApp(); else showAuth();
  setAuthTab('login');
  renderAll();
  renderIndexFormMode();
  setSection('dashboard');
}

init();
