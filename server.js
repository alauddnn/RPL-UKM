const express = require('express');
const cors = require('cors');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
// Provide default data to avoid lowdb "missing default data" error
const defaultData = { kegiatan: [], ukm: [], pendaftaran: [], users: [] };
const db = new Low(adapter, defaultData);

async function initDb() {
  await db.read();
  if (!db.data) db.data = defaultData;
  await db.write();
}

initDb();

// Helper to find user by username (or username field may be in different shapes)
function findUserByUsername(username) {
  return db.data.users.find(u => u.username === username || u.name === username);
}

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  await db.read();
  const user = db.data.users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  // Return a safe user object (omit password)
  const { password: pw, ...safe } = user;
  return res.json(safe);
});

// Register endpoint (mahasiswa)
app.post('/api/register', async (req, res) => {
  const { username, password, name, nim, role } = req.body || {};
  if (!username || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  await db.read();
  if (db.data.users.find(u => u.username === username)) return res.status(409).json({ error: 'Username exists' });
  const id = (db.data.users.reduce((m, x) => Math.max(m, x.id || 0), 0) || 0) + 1;
  const newUser = { id, username, password, name, nim: nim || '', role: role || 'mahasiswa' };
  db.data.users.push(newUser);
  await db.write();
  const { password: pw, ...safe } = newUser;
  res.status(201).json(safe);
});

// Get kegiatan
app.get('/api/kegiatan', async (req, res) => {
  await db.read();
  res.json(db.data.kegiatan || []);
});

// Get ukm
app.get('/api/ukm', async (req, res) => {
  await db.read();
  res.json(db.data.ukm || []);
});

// Get pendaftaran (optionally filter by mahasiswa)
app.get('/api/pendaftaran', async (req, res) => {
  await db.read();
  const { mahasiswa } = req.query;
  let list = db.data.pendaftaran || [];
  if (mahasiswa) list = list.filter(p => p.mahasiswa === mahasiswa);
  res.json(list);
});

// Create pendaftaran
app.post('/api/pendaftaran', async (req, res) => {
  const { kegiatanId, mahasiswa, nim } = req.body || {};
  if (!kegiatanId || !mahasiswa) return res.status(400).json({ error: 'Missing fields' });
  await db.read();
  const kegiatan = db.data.kegiatan.find(k => k.id === kegiatanId);
  if (!kegiatan) return res.status(404).json({ error: 'Kegiatan not found' });
  // check already registered
  if (db.data.pendaftaran.find(p => p.kegiatanId === kegiatanId && p.mahasiswa === mahasiswa)) return res.status(409).json({ error: 'Already registered' });
  const id = (db.data.pendaftaran.reduce((m, x) => Math.max(m, x.id || 0), 0) || 0) + 1;
  const newP = { id, kegiatanId, mahasiswa, nim: nim || '', status: 'pending', tanggalDaftar: new Date().toISOString().split('T')[0] };
  db.data.pendaftaran.push(newP);
  // increment terdaftar count locally
  kegiatan.terdaftar = (kegiatan.terdaftar || 0) + 1;
  await db.write();
  res.status(201).json(newP);
});

// Approve pendaftaran
app.post('/api/pendaftaran/:id/approve', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.read();
  const p = db.data.pendaftaran.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'Pendaftaran not found' });
  p.status = 'approved';
  await db.write();
  res.json({ ok: true });
});

// Reject pendaftaran
app.post('/api/pendaftaran/:id/reject', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { alasan } = req.body || {};
  await db.read();
  const p = db.data.pendaftaran.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'Pendaftaran not found' });
  p.status = 'rejected';
  p.alasan = alasan || '';
  // decrement kegiatan terdaftar if present
  const k = db.data.kegiatan.find(x => x.id === p.kegiatanId);
  if (k && k.terdaftar && k.terdaftar > 0) k.terdaftar = k.terdaftar - 1;
  await db.write();
  res.json({ ok: true });
});

// Admin endpoints for kegiatan CRUD
app.post('/api/kegiatan', async (req, res) => {
  const data = req.body || {};
  await db.read();
  const id = (db.data.kegiatan.reduce((m, x) => Math.max(m, x.id || 0), 0) || 0) + 1;
  const newK = { id, nama: data.nama || '', ukm: data.ukm || '', deskripsi: data.deskripsi || '', tanggal: data.tanggal || '', kuota: data.kuota || 0, terdaftar: data.terdaftar || 0, status: data.status || 'pending' };
  db.data.kegiatan.push(newK);
  await db.write();
  res.status(201).json(newK);
});

app.put('/api/kegiatan/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = req.body || {};
  await db.read();
  const k = db.data.kegiatan.find(x => x.id === id);
  if (!k) return res.status(404).json({ error: 'Kegiatan not found' });
  Object.assign(k, data);
  await db.write();
  res.json(k);
});

app.delete('/api/kegiatan/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.read();
  db.data.kegiatan = db.data.kegiatan.filter(x => x.id !== id);
  await db.write();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Mock API server running on http://localhost:${PORT}/api`));
