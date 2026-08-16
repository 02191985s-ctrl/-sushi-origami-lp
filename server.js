const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'hotels.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) return [];
  const raw = fs.readFileSync(DB_FILE, 'utf-8').trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

function writeDB(hotels) {
  fs.writeFileSync(DB_FILE, JSON.stringify(hotels, null, 2));
}

const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県',
  '岐阜県','静岡県','愛知県','三重県',
  '滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
  '鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県',
  '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県',
  '沖縄県'
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/prefectures', (req, res) => {
  res.json(PREFECTURES);
});

app.get('/api/hotels', (req, res) => {
  const { prefecture } = req.query;
  let hotels = readDB();
  if (prefecture) {
    hotels = hotels.filter((h) => h.prefecture === prefecture);
  }
  hotels.sort((a, b) => b.createdAt - a.createdAt);
  res.json(hotels);
});

app.post('/api/hotels', (req, res) => {
  const { name, url, source, prefecture, memo, addedBy } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'ホテル名は必須です' });
  }
  if (!prefecture || !PREFECTURES.includes(prefecture)) {
    return res.status(400).json({ error: '都道府県を選択してください' });
  }

  const hotel = {
    id: crypto.randomUUID(),
    name: name.trim(),
    url: (url || '').trim(),
    source: source || 'その他',
    prefecture,
    memo: (memo || '').trim(),
    addedBy: (addedBy || '').trim() || '匿名',
    likes: 0,
    createdAt: Date.now(),
  };

  const hotels = readDB();
  hotels.push(hotel);
  writeDB(hotels);
  res.status(201).json(hotel);
});

app.post('/api/hotels/:id/like', (req, res) => {
  const hotels = readDB();
  const hotel = hotels.find((h) => h.id === req.params.id);
  if (!hotel) return res.status(404).json({ error: '見つかりません' });
  hotel.likes += 1;
  writeDB(hotels);
  res.json(hotel);
});

app.post('/api/hotels/:id/unlike', (req, res) => {
  const hotels = readDB();
  const hotel = hotels.find((h) => h.id === req.params.id);
  if (!hotel) return res.status(404).json({ error: '見つかりません' });
  hotel.likes = Math.max(0, hotel.likes - 1);
  writeDB(hotels);
  res.json(hotel);
});

app.delete('/api/hotels/:id', (req, res) => {
  const hotels = readDB();
  const next = hotels.filter((h) => h.id !== req.params.id);
  if (next.length === hotels.length) {
    return res.status(404).json({ error: '見つかりません' });
  }
  writeDB(next);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`家族ホテル共有アプリ起動中: http://localhost:${PORT}`);
});
