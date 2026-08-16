const LIKED_KEY = 'familyHotelApp.likedIds';
const NAME_KEY = 'familyHotelApp.lastName';

const ROW_COLORS = ['#ff9500', '#ff2d55', '#5856d6', '#34c759', '#007aff', '#af52de', '#ff3b30'];

function getLikedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveLikedIds(set) {
  localStorage.setItem(LIKED_KEY, JSON.stringify([...set]));
}

function getLastName() {
  return localStorage.getItem(NAME_KEY) || '';
}

function saveLastName(name) {
  localStorage.setItem(NAME_KEY, name);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function colorForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ROW_COLORS[hash % ROW_COLORS.length];
}

// ---------- Elements ----------

const chipScroll = document.getElementById('chip-scroll');
const listEl = document.getElementById('hotel-list');
const formEl = document.getElementById('hotel-form');
const prefectureSelect = document.getElementById('prefecture');
const addedByInput = document.getElementById('addedBy');
const formError = document.getElementById('form-error');

const addOverlay = document.getElementById('add-overlay');
const addSheet = document.getElementById('add-sheet');
const openAddBtn = document.getElementById('open-add');
const addCancelBtn = document.getElementById('add-cancel');

const deleteOverlay = document.getElementById('delete-overlay');
const deleteSheet = document.getElementById('delete-sheet');
const deleteTargetName = document.getElementById('delete-target-name');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');

let currentPrefecture = '';
let pendingDeleteId = null;

// ---------- Sheets ----------

function openSheet(overlay, sheet) {
  document.body.classList.add('sheet-open');
  overlay.classList.add('open');
  sheet.classList.add('open');
}

function closeSheet(overlay, sheet) {
  document.body.classList.remove('sheet-open');
  overlay.classList.remove('open');
  sheet.classList.remove('open');
}

openAddBtn.addEventListener('click', () => {
  formError.textContent = '';
  openSheet(addOverlay, addSheet);
});
addCancelBtn.addEventListener('click', () => closeSheet(addOverlay, addSheet));
addOverlay.addEventListener('click', () => closeSheet(addOverlay, addSheet));

cancelDeleteBtn.addEventListener('click', () => {
  pendingDeleteId = null;
  closeSheet(deleteOverlay, deleteSheet);
});
deleteOverlay.addEventListener('click', () => {
  pendingDeleteId = null;
  closeSheet(deleteOverlay, deleteSheet);
});

confirmDeleteBtn.addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  closeSheet(deleteOverlay, deleteSheet);
  pendingDeleteId = null;
  const res = await fetch(`/api/hotels/${id}`, { method: 'DELETE' });
  if (res.ok) {
    document.querySelector(`.hotel-row[data-id="${id}"]`)?.remove();
    if (!listEl.querySelector('.hotel-row')) {
      renderHotels([]);
    }
  }
});

// ---------- Init ----------

async function init() {
  addedByInput.value = getLastName();

  const prefectures = await fetch('/api/prefectures').then((r) => r.json());

  for (const pref of prefectures) {
    const opt = document.createElement('option');
    opt.value = pref;
    opt.textContent = pref;
    prefectureSelect.appendChild(opt);
  }

  renderChips(prefectures);
  await loadHotels();
}

function renderChips(prefectures) {
  const chips = ['すべて', ...prefectures];
  chipScroll.innerHTML = chips
    .map((label) => {
      const value = label === 'すべて' ? '' : label;
      const active = value === currentPrefecture ? 'active' : '';
      return `<button type="button" class="chip ${active}" data-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
    })
    .join('');
}

chipScroll.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  currentPrefecture = chip.dataset.value;
  [...chipScroll.querySelectorAll('.chip')].forEach((c) =>
    c.classList.toggle('active', c === chip)
  );
  loadHotels();
});

async function loadHotels() {
  const url = currentPrefecture
    ? `/api/hotels?prefecture=${encodeURIComponent(currentPrefecture)}`
    : '/api/hotels';
  const hotels = await fetch(url).then((r) => r.json());
  renderHotels(hotels);
}

function renderHotels(hotels) {
  if (hotels.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏨</div>
        <p class="empty-title">まだ登録がありません</p>
        <p class="empty-sub">右上の ＋ から、気になったホテルを追加しましょう</p>
      </div>
    `;
    return;
  }

  const likedIds = getLikedIds();

  listEl.innerHTML = `
    <div class="ios-list">
      ${hotels
        .map((h) => {
          const liked = likedIds.has(h.id);
          const date = new Date(h.createdAt).toLocaleDateString('ja-JP');
          const nameHtml = h.url
            ? `<a class="hotel-name is-link" href="${escapeHtml(h.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(h.name)}</a>`
            : `<span class="hotel-name">${escapeHtml(h.name)}</span>`;

          return `
            <div class="hotel-row" data-id="${h.id}">
              <div class="row-icon" style="background:${colorForId(h.id)}">🏨</div>
              <div class="row-body">
                <div class="row-top">
                  ${nameHtml}
                  <div class="row-actions">
                    <button class="like-btn ${liked ? 'liked' : ''}" data-action="like" aria-label="いいね">
                      <span class="heart">${liked ? '❤️' : '🤍'}</span>
                      <span class="like-count">${h.likes}</span>
                    </button>
                    <button class="more-btn" data-action="delete" aria-label="削除">•••</button>
                  </div>
                </div>
                <div class="badges">
                  <span class="badge">${escapeHtml(h.prefecture)}</span>
                  <span class="badge">${escapeHtml(h.source)}</span>
                </div>
                ${h.memo ? `<p class="hotel-memo">${escapeHtml(h.memo)}</p>` : ''}
                <p class="hotel-meta">${escapeHtml(h.addedBy)}さんが追加・${date}</p>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const row = e.target.closest('.hotel-row');
  if (!row) return;
  const id = row.dataset.id;

  if (btn.dataset.action === 'like') {
    const likedIds = getLikedIds();
    const isLiked = likedIds.has(id);
    const endpoint = isLiked ? 'unlike' : 'like';
    const res = await fetch(`/api/hotels/${id}/${endpoint}`, { method: 'POST' });
    if (!res.ok) return;
    const updated = await res.json();

    if (isLiked) {
      likedIds.delete(id);
    } else {
      likedIds.add(id);
    }
    saveLikedIds(likedIds);

    btn.classList.toggle('liked', !isLiked);
    btn.querySelector('.heart').textContent = isLiked ? '🤍' : '❤️';
    btn.querySelector('.like-count').textContent = updated.likes;
  }

  if (btn.dataset.action === 'delete') {
    pendingDeleteId = id;
    const name = row.querySelector('.hotel-name').textContent;
    deleteTargetName.textContent = name;
    openSheet(deleteOverlay, deleteSheet);
  }
});

formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';

  const addedBy = addedByInput.value.trim();
  saveLastName(addedBy);

  const payload = {
    name: document.getElementById('name').value,
    prefecture: prefectureSelect.value,
    source: document.getElementById('source').value,
    url: document.getElementById('url').value,
    memo: document.getElementById('memo').value,
    addedBy,
  };

  const res = await fetch('/api/hotels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    formError.textContent = err.error || '追加に失敗しました';
    return;
  }

  formEl.reset();
  addedByInput.value = addedBy;
  closeSheet(addOverlay, addSheet);
  await loadHotels();
});

init();
