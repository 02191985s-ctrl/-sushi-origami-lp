const LIKED_KEY = 'familyHotelApp.likedIds';

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
  return localStorage.getItem('familyHotelApp.lastName') || '';
}

function saveLastName(name) {
  localStorage.setItem('familyHotelApp.lastName', name);
}

const prefectureSelect = document.getElementById('prefecture');
const filterSelect = document.getElementById('filter-prefecture');
const listEl = document.getElementById('hotel-list');
const formEl = document.getElementById('hotel-form');
const formError = document.getElementById('form-error');
const addedByInput = document.getElementById('addedBy');

let currentPrefecture = '';

async function init() {
  addedByInput.value = getLastName();

  const prefectures = await fetch('/api/prefectures').then((r) => r.json());
  for (const pref of prefectures) {
    const opt1 = document.createElement('option');
    opt1.value = pref;
    opt1.textContent = pref;
    prefectureSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = pref;
    opt2.textContent = pref;
    filterSelect.appendChild(opt2);
  }

  await loadHotels();
}

async function loadHotels() {
  const url = currentPrefecture
    ? `/api/hotels?prefecture=${encodeURIComponent(currentPrefecture)}`
    : '/api/hotels';
  const hotels = await fetch(url).then((r) => r.json());
  renderHotels(hotels);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderHotels(hotels) {
  if (hotels.length === 0) {
    listEl.innerHTML = '<p class="empty-state">まだホテルが登録されていません。最初の1件を追加してみましょう！</p>';
    return;
  }

  const likedIds = getLikedIds();

  listEl.innerHTML = hotels
    .map((h) => {
      const liked = likedIds.has(h.id);
      const date = new Date(h.createdAt).toLocaleDateString('ja-JP');
      const nameHtml = h.url
        ? `<a class="hotel-name" href="${escapeHtml(h.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(h.name)}</a>`
        : `<span class="hotel-name">${escapeHtml(h.name)}</span>`;

      return `
        <article class="hotel-card" data-id="${h.id}">
          <div class="hotel-top">
            ${nameHtml}
            <button class="like-btn ${liked ? 'liked' : ''}" data-action="like">
              <span class="heart">${liked ? '❤️' : '🤍'}</span>
              <span class="like-count">${h.likes}</span>
            </button>
          </div>
          <div class="badges">
            <span class="badge">${escapeHtml(h.prefecture)}</span>
            <span class="badge">${escapeHtml(h.source)}</span>
          </div>
          ${h.memo ? `<p class="hotel-memo">${escapeHtml(h.memo)}</p>` : ''}
          <div class="hotel-bottom">
            <span class="hotel-meta">${escapeHtml(h.addedBy)}さんが追加・${date}</span>
            <button class="delete-btn" data-action="delete">削除</button>
          </div>
        </article>
      `;
    })
    .join('');
}

filterSelect.addEventListener('change', () => {
  currentPrefecture = filterSelect.value;
  loadHotels();
});

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const card = e.target.closest('.hotel-card');
  const id = card.dataset.id;

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
    if (!confirm(`「${card.querySelector('.hotel-name').textContent}」を削除しますか？`)) return;
    const res = await fetch(`/api/hotels/${id}`, { method: 'DELETE' });
    if (res.ok) {
      card.remove();
    }
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
  await loadHotels();
});

init();
