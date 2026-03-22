const ADMIN_USER = 'KrawczykP';
const ADMIN_PASS = 'MuchaUcha25!!';

const defaultData = {
  ranks: [
    { id: crypto.randomUUID(), name: 'Administrator', description: 'Pełny dostęp do panelu', isSystem: true },
    { id: crypto.randomUUID(), name: 'Sympatyk', description: 'Użytkownik wspierający projekt', isSystem: true },
    { id: crypto.randomUUID(), name: 'Badacz', description: 'Osoba przeglądająca i porządkująca indeksy', isSystem: true }
  ],
  parishes: [
    { id: crypto.randomUUID(), name: 'Łask', description: 'Główna parafia w projekcie' },
    { id: crypto.randomUUID(), name: 'Sędziejowice', description: 'Przykładowa parafia do uzupełniania' }
  ],
  indexes: [
    {
      id: crypto.randomUUID(),
      parishId: null,
      rankId: null,
      year: 1892,
      act: '14',
      person: 'Jan Kowalski',
      parents: 'Piotr i Marianna',
      info: 'Chrzest, wieś, świadkowie i dodatkowe informacje',
      scan: 'https://example.com'
    }
  ]
};

const els = {
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  loginForm: document.getElementById('loginForm'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  loginMessage: document.getElementById('loginMessage'),
  adminPanel: document.getElementById('adminPanel'),
  rankForm: document.getElementById('rankForm'),
  parishForm: document.getElementById('parishForm'),
  indexForm: document.getElementById('indexForm'),
  rankName: document.getElementById('rankName'),
  rankDescription: document.getElementById('rankDescription'),
  parishName: document.getElementById('parishName'),
  parishDescription: document.getElementById('parishDescription'),
  indexParish: document.getElementById('indexParish'),
  indexRank: document.getElementById('indexRank'),
  indexYear: document.getElementById('indexYear'),
  indexAct: document.getElementById('indexAct'),
  indexPerson: document.getElementById('indexPerson'),
  indexParents: document.getElementById('indexParents'),
  indexInfo: document.getElementById('indexInfo'),
  indexScan: document.getElementById('indexScan'),
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  parishList: document.getElementById('parishList'),
  rankList: document.getElementById('rankList'),
  indexList: document.getElementById('indexList'),
  parishCount: document.getElementById('parishCount'),
  rankCount: document.getElementById('rankCount'),
  indexCount: document.getElementById('indexCount'),
  indexTemplate: document.getElementById('indexTemplate')
};

const STORAGE_KEY = 'genealogia-powiat-laski-v1';
const SESSION_KEY = 'genealogia-session-v1';

let state = loadState();
let session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');

function uid() { return crypto.randomUUID(); }

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultData);
  try {
    const parsed = JSON.parse(raw);
    return {
      ranks: Array.isArray(parsed.ranks) && parsed.ranks.length ? parsed.ranks : structuredClone(defaultData.ranks),
      parishes: Array.isArray(parsed.parishes) && parsed.parishes.length ? parsed.parishes : structuredClone(defaultData.parishes),
      indexes: Array.isArray(parsed.indexes) ? parsed.indexes : []
    };
  } catch {
    return structuredClone(defaultData);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveSession(value) {
  session = value;
  localStorage.setItem(SESSION_KEY, JSON.stringify(value));
}

function isAdmin() {
  return session?.user === ADMIN_USER;
}

function lookupById(items, id) {
  return items.find(item => item.id === id);
}

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderSelects() {
  const parishOptions = ['<option value="">Wybierz parafię</option>']
    .concat(state.parishes.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`))
    .join('');
  const rankOptions = ['<option value="">Wybierz rangę</option>']
    .concat(state.ranks.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`))
    .join('');
  els.indexParish.innerHTML = parishOptions;
  els.indexRank.innerHTML = rankOptions;
}

function renderLists() {
  els.parishCount.textContent = state.parishes.length;
  els.rankCount.textContent = state.ranks.length;
  els.indexCount.textContent = state.indexes.length;

  els.parishList.innerHTML = state.parishes.map(p => `
    <div class="list-item">
      <strong>${escapeHtml(p.name)}</strong>
      <span>${escapeHtml(p.description || 'Brak opisu')}</span>
    </div>
  `).join('') || '<div class="list-item">Brak parafii.</div>';

  els.rankList.innerHTML = state.ranks.map(r => `
    <div class="list-item">
      <strong>${escapeHtml(r.name)}</strong>
      <span>${escapeHtml(r.description || 'Brak opisu')}</span>
    </div>
  `).join('') || '<div class="list-item">Brak rang.</div>';
}

function parishName(id) {
  return lookupById(state.parishes, id)?.name || 'Bez parafii';
}

function rankName(id) {
  return lookupById(state.ranks, id)?.name || 'Bez rangi';
}

function renderIndexes() {
  const query = els.searchInput.value.trim().toLowerCase();
  const indexes = state.indexes.filter(item => {
    const parish = parishName(item.parishId);
    const rank = rankName(item.rankId);
    const haystack = [item.year, item.act, item.person, item.parents, item.info, parish, rank].join(' ').toLowerCase();
    return !query || haystack.includes(query);
  });

  els.indexList.innerHTML = '';
  if (!indexes.length) {
    els.indexList.innerHTML = '<div class="list-item">Brak wyników.</div>';
    return;
  }

  const template = els.indexTemplate;
  indexes.forEach(item => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.index-card');
    const meta = node.querySelector('.index-meta');
    const title = node.querySelector('.index-title');
    const parents = node.querySelector('.index-parents');
    const info = node.querySelector('.index-info');
    const badge = node.querySelector('.index-badge');
    const scanLink = node.querySelector('.scan-link');
    const deleteBtn = node.querySelector('.delete-index');

    meta.textContent = `${item.year || '—'} • akt ${item.act || '—'} • ${parishName(item.parishId)} • ${rankName(item.rankId)}`;
    title.textContent = item.person || 'Bez imienia';
    parents.textContent = `Rodzice: ${item.parents || 'brak danych'}`;
    info.textContent = item.info || 'Brak dodatkowych informacji';
    badge.textContent = 'Indeks';

    const scanUrl = item.scan?.trim() || 'https://example.com';
    scanLink.href = scanUrl;
    scanLink.addEventListener('click', e => e.stopPropagation());
    deleteBtn.classList.toggle('hidden', !isAdmin());
    deleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      state.indexes = state.indexes.filter(x => x.id !== item.id);
      saveState();
      renderAll();
    });

    card.addEventListener('click', () => window.open(scanUrl, '_blank', 'noopener'));
    els.indexList.appendChild(node);
  });
}

function renderAuth() {
  const logged = isAdmin();
  els.adminPanel.classList.toggle('hidden', !logged);
  els.logoutBtn.classList.toggle('hidden', !logged);
  els.loginBtn.classList.toggle('hidden', logged);
}

function renderAll() {
  renderAuth();
  renderSelects();
  renderLists();
  renderIndexes();
}

els.loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const user = els.username.value.trim();
  const pass = els.password.value;
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    saveSession({ user: ADMIN_USER });
    els.loginMessage.textContent = 'Zalogowano jako Administrator.';
    els.loginMessage.style.color = 'green';
    els.password.value = '';
    renderAll();
    return;
  }
  els.loginMessage.textContent = 'Błędny login lub hasło.';
  els.loginMessage.style.color = 'crimson';
});

els.logoutBtn.addEventListener('click', () => {
  saveSession(null);
  els.loginMessage.textContent = 'Wylogowano.';
  els.loginMessage.style.color = 'inherit';
  renderAll();
});

els.rankForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!isAdmin()) return;
  const name = els.rankName.value.trim();
  const description = els.rankDescription.value.trim();
  if (!name) return;
  state.ranks.unshift({ id: uid(), name, description, isSystem: false });
  els.rankForm.reset();
  saveState();
  renderAll();
});

els.parishForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!isAdmin()) return;
  const name = els.parishName.value.trim();
  const description = els.parishDescription.value.trim();
  if (!name) return;
  state.parishes.unshift({ id: uid(), name, description });
  els.parishForm.reset();
  saveState();
  renderAll();
});

els.indexForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!isAdmin()) return;
  const newIndex = {
    id: uid(),
    parishId: els.indexParish.value || null,
    rankId: els.indexRank.value || null,
    year: els.indexYear.value.trim(),
    act: els.indexAct.value.trim(),
    person: els.indexPerson.value.trim(),
    parents: els.indexParents.value.trim(),
    info: els.indexInfo.value.trim(),
    scan: els.indexScan.value.trim()
  };
  if (!newIndex.person) return;
  state.indexes.unshift(newIndex);
  els.indexForm.reset();
  saveState();
  renderAll();
});

els.searchInput.addEventListener('input', renderIndexes);
els.clearSearch.addEventListener('click', () => {
  els.searchInput.value = '';
  renderIndexes();
});

els.loginBtn.addEventListener('click', () => {
  els.username.focus();
});

// Initial rendering
renderAll();
