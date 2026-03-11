const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'grupinho_secret_2024_mude_isso';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

// ─── PASTAS ───────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
[DATA_DIR, UPLOADS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ─── BANCO ────────────────────────────────────────────
const db = new Database(path.join(DATA_DIR, 'db.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    data TEXT,
    ip TEXT,
    ua TEXT,
    ts INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS active_sessions (
    sid TEXT PRIMARY KEY,
    ts INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ─── CONFIG PADRÃO ────────────────────────────────────
function getConfig(key, fallback = '') {
  const row = db.prepare('SELECT value FROM config WHERE key=?').get(key);
  return row ? row.value : fallback;
}
function setConfig(key, value) {
  db.prepare('INSERT OR REPLACE INTO config(key,value) VALUES(?,?)').run(key, JSON.stringify(value));
}
function getConfigJSON(key, fallback) {
  const raw = getConfig(key, null);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

// Inicializar configs padrão
const defaultConfig = {
  links: { mensal: '', trimestral: '', anual: '' },
  groupName: 'Grupinho VIP 🔥',
  groupAvatar: 'https://e-volutionn.com/wp-content/uploads/2026/02/CASADA-DISPONIVEL-2026-02-27T215240.415.png',
  girls: [
    { img: 'https://e-volutionn.com/wp-content/uploads/2026/02/CASADA-DISPONIVEL-2026-02-27T215240.415.png', name: 'Amanda', age: 29 },
    { img: 'https://e-volutionn.com/wp-content/uploads/2026/02/CASADA-DISPONIVEL-2026-02-27T215248.624.png', name: 'Juliana', age: 34 },
    { img: 'https://e-volutionn.com/wp-content/uploads/2026/02/CASADA-DISPONIVEL-2026-02-02T173655.254.png', name: 'Camila', age: 27 },
    { img: 'https://e-volutionn.com/wp-content/uploads/2026/01/a1T4tn7f.jpeg', name: 'Fernanda', age: 32 },
    { img: 'https://e-volutionn.com/wp-content/uploads/2026/01/QEPIrF4q.jpeg', name: 'Patrícia', age: 36 },
    { img: 'https://e-volutionn.com/wp-content/uploads/2025/11/WhatsApp-Image-2025-11-05-at-18.58.32.jpeg', name: 'Larissa', age: 28 },
    { img: 'https://e-volutionn.com/wp-content/uploads/2025/11/WhatsApp-Image-2025-11-05-at-18.58.32-1.jpeg', name: 'Renata', age: 33 },
    { img: 'https://e-volutionn.com/wp-content/uploads/2025/11/WhatsApp-Image-2025-11-05-at-17.09.29-4.jpeg', name: 'Beatriz', age: 30 },
    { img: 'https://e-volutionn.com/wp-content/uploads/2025/11/WhatsApp-Image-2025-11-05-at-15.53.07.jpeg', name: 'Thaís', age: 31 }
  ],
  groupMsgs: [
    { n: 'Amanda S.', c: '#c0392b', t: 'Boa noite gente! Sou da sua cidade 🌙', typ: 'txt' },
    { n: 'Juliana M.', c: '#8b1a4a', t: 'Também sou daqui! Alguém acordado? 😏', typ: 'txt' },
    { n: 'Camila R.', c: '#922040', t: 'que ótimo! finalmente alguém perto 😍', typ: 'txt' },
    { n: 'Amanda S.', c: '#c0392b', t: '@Juliana vem no meu privado?', typ: 'txt' },
    { n: 'Juliana M.', c: '#8b1a4a', t: 'indo agora 💋', typ: 'txt' },
    { n: 'Patrícia L.', c: '#7a1533', t: 'Gente daqui também 🙋‍♀️', typ: 'txt' },
    { n: 'Fernanda T.', c: '#a01e42', t: '', typ: 'foto', blur: false, img: '' },
    { n: 'Larissa O.', c: '#851738', t: 'Meu Deus Fernanda 🥵🥵', typ: 'txt' },
    { n: 'Camila R.', c: '#922040', t: 'alguém quer conversar no privado comigo? 🌹', typ: 'txt' },
    { n: 'Amanda S.', c: '#c0392b', t: '', typ: 'foto', blur: true, img: '' },
    { n: 'Patrícia L.', c: '#7a1533', t: '@Camila te mandei msg no pv', typ: 'txt' },
    { n: 'Renata K.', c: '#6e1230', t: '', typ: 'foto', blur: true, img: '' },
    { n: 'Beatriz N.', c: '#922040', t: 'Boa noite a todos daqui 💋', typ: 'txt' },
    { n: 'Juliana M.', c: '#8b1a4a', t: 'esse grupo tá pegando fogo hoje 🔥', typ: 'txt' },
    { n: 'Fernanda T.', c: '#a01e42', t: '@Beatriz oi vizinha 😂', typ: 'txt' },
    { n: 'Amanda S.', c: '#c0392b', t: 'vou dormir, mas antes... 👀', typ: 'txt' }
  ],
  testimonials: [
    { img: 'https://e-volutionn.com/wp-content/uploads/2026/01/a1T4tn7f.jpeg', name: 'Ricardo M.', city: 'São Paulo, SP', text: 'Entrei sem acreditar muito. Na primeira semana já tinha marcado dois encontros. As mulheres são reais, mandam foto, conversam de verdade.', tag: '2 encontros na 1ª semana' },
    { img: 'https://e-volutionn.com/wp-content/uploads/2026/01/QEPIrF4q.jpeg', name: 'Felipe A.', city: 'Belo Horizonte, MG', text: 'Já tentei outros aplicativos e nunca deu nada. Aqui foi diferente. As mulheres estão lá porque querem.', tag: 'Encontro em 3 dias' },
    { img: 'https://e-volutionn.com/wp-content/uploads/2025/11/WhatsApp-Image-2025-11-05-at-18.58.32.jpeg', name: 'Marcos T.', city: 'Rio de Janeiro, RJ', text: 'Assino há 3 meses. Vale demais cada centavo. Mais de 6 encontros. Mulheres de verdade, discretas.', tag: '6 encontros em 3 meses' }
  ]
};

Object.entries(defaultConfig).forEach(([k, v]) => {
  const exists = db.prepare('SELECT 1 FROM config WHERE key=?').get(k);
  if (!exists) setConfig(k, v);
});

// ─── MULTER ───────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── MIDDLEWARES ──────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// ─── AUTH MIDDLEWARE ──────────────────────────────────
function authRequired(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token necessário' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// ─── RASTREIO ─────────────────────────────────────────
const insertEvent = db.prepare('INSERT INTO events(type,data,ip,ua) VALUES(?,?,?,?)');
const upsertSession = db.prepare('INSERT OR REPLACE INTO active_sessions(sid,ts) VALUES(?,strftime(\'%s\',\'now\'))');
const deleteOldSessions = db.prepare("DELETE FROM active_sessions WHERE ts < strftime('%s','now') - 120");

function track(type, data, req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  const ua = req.headers['user-agent'] || '';
  insertEvent.run(type, JSON.stringify(data || {}), ip, ua);
}

// ─── ROTAS PÚBLICAS ───────────────────────────────────

// Página principal (serve o index.html gerado)
app.get('/', (req, res) => {
  track('pageview', {}, req);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Heartbeat de sessão ativa (ping a cada 30s do browser)
app.post('/api/ping', (req, res) => {
  const { sid } = req.body;
  if (sid) {
    deleteOldSessions.run();
    upsertSession.run(sid);
  }
  res.json({ ok: true });
});

// Rastrear clique
app.post('/api/track', (req, res) => {
  const { event, data } = req.body;
  track(event || 'click', data || {}, req);
  res.json({ ok: true });
});

// Config pública para a página carregar
app.get('/api/site-config', (req, res) => {
  res.json({
    links:        getConfigJSON('links', defaultConfig.links),
    groupName:    getConfigJSON('groupName', defaultConfig.groupName),
    groupAvatar:  getConfigJSON('groupAvatar', defaultConfig.groupAvatar),
    girls:        getConfigJSON('girls', defaultConfig.girls),
    groupMsgs:    getConfigJSON('groupMsgs', defaultConfig.groupMsgs),
    testimonials: getConfigJSON('testimonials', defaultConfig.testimonials),
  });
});

// ─── LOGIN ────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { user, pass } = req.body;
  if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  }
  const token = jwt.sign({ user }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// ─── ROTAS DO ADMIN (protegidas) ─────────────────────

// Métricas gerais
app.get('/api/admin/metrics', authRequired, (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;

  // Sessões ativas agora
  deleteOldSessions.run();
  const activeNow = db.prepare('SELECT COUNT(*) as n FROM active_sessions').get().n;

  // Pageviews hoje
  const pvToday = db.prepare("SELECT COUNT(*) as n FROM events WHERE type='pageview' AND ts >= ?")
    .get(now - day).n;

  // Total histórico
  const pvTotal = db.prepare("SELECT COUNT(*) as n FROM events WHERE type='pageview'").get().n;

  // Cliques por tipo (hoje)
  const clicks = db.prepare("SELECT data, COUNT(*) as n FROM events WHERE type='click' AND ts >= ? GROUP BY data")
    .all(now - day);

  // Cliques nos planos (todos os tempos)
  const planClicks = db.prepare("SELECT data, COUNT(*) as n FROM events WHERE type='click' GROUP BY data ORDER BY n DESC LIMIT 20")
    .all();

  // Gráfico por hora (últimas 24h)
  const hourly = db.prepare(`
    SELECT 
      strftime('%H', datetime(ts, 'unixepoch')) as hora,
      COUNT(*) as acessos
    FROM events 
    WHERE type='pageview' AND ts >= ?
    GROUP BY hora
    ORDER BY hora
  `).all(now - day);

  // Gráfico por dia (últimos 30 dias)
  const daily = db.prepare(`
    SELECT 
      strftime('%d/%m', datetime(ts, 'unixepoch')) as dia,
      COUNT(*) as acessos
    FROM events 
    WHERE type='pageview' AND ts >= ?
    GROUP BY dia
    ORDER BY dia
  `).all(now - 30 * day);

  // Últimos acessos
  const recent = db.prepare("SELECT type, data, ip, ua, ts FROM events ORDER BY ts DESC LIMIT 50").all();

  res.json({ activeNow, pvToday, pvTotal, clicks, planClicks, hourly, daily, recent });
});

// Salvar config
app.post('/api/admin/config', authRequired, (req, res) => {
  const { key, value } = req.body;
  const allowed = ['links', 'groupName', 'groupAvatar', 'girls', 'groupMsgs', 'testimonials'];
  if (!allowed.includes(key)) return res.status(400).json({ error: 'Chave inválida' });
  setConfig(key, value);
  res.json({ ok: true });
});

// Upload de imagem
app.post('/api/admin/upload', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  res.json({ url: '/uploads/' + req.file.filename });
});

// Deletar imagem
app.delete('/api/admin/upload/:filename', authRequired, (req, res) => {
  const file = path.join(UPLOADS_DIR, req.params.filename);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ ok: true });
});

// Listar uploads
app.get('/api/admin/uploads', authRequired, (req, res) => {
  const files = fs.readdirSync(UPLOADS_DIR).map(f => '/uploads/' + f);
  res.json(files);
});

// ─── ADMIN PANEL (serve o HTML do painel) ─────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// ─── START ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
});
