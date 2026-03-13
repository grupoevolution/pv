const express = require('express');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT         = process.env.PORT         || 3000;
const JWT_SECRET   = process.env.JWT_SECRET   || 'grupinho_secret_mude_isso_2024';
const ADMIN_USER   = process.env.ADMIN_USER   || 'admin';
const ADMIN_PASS   = process.env.ADMIN_PASS   || '@Senha8203';
const ADMIN_ROUTE  = process.env.ADMIN_ROUTE  || 'patlxiyzlueig5';

const DATA_DIR    = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
[DATA_DIR, UPLOADS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const db = new Database(path.join(DATA_DIR, 'db.sqlite'));
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, data TEXT, ip TEXT, ua TEXT, fingerprint TEXT,
    ts INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS active_sessions (
    sid TEXT PRIMARY KEY,
    ts INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

function getConfigJSON(key, fallback) {
  const row = db.prepare('SELECT value FROM config WHERE key=?').get(key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
}
function setConfig(key, value) {
  db.prepare('INSERT OR REPLACE INTO config(key,value) VALUES(?,?)').run(key, JSON.stringify(value));
}

const defaultConfig = {
  links: { mensal: '', trimestral: '', anual: '', free: '' },
  discountMensal: '',
  groupName: 'Grupinho VIP 🔥',
  groupAvatar: 'https://e-volutionn.com/wp-content/uploads/2026/02/CASADA-DISPONIVEL-2026-02-27T215240.415.png',
  chatTimerMinutes: 4,
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
    { n:'Amanda S.',  avatar:'', c:'#c0392b', t:'Boa noite gente! Sou da sua cidade 🌙', typ:'txt' },
    { n:'Juliana M.', avatar:'', c:'#8b1a4a', t:'Também sou daqui! Alguém acordado? 😏', typ:'txt' },
    { n:'Camila R.',  avatar:'', c:'#922040', t:'que ótimo! finalmente alguém perto 😍', typ:'txt' },
    { n:'Amanda S.',  avatar:'', c:'#c0392b', t:'@Juliana vem no meu privado?', typ:'txt' },
    { n:'Juliana M.', avatar:'', c:'#8b1a4a', t:'indo agora 💋', typ:'txt' },
    { n:'Patrícia L.',avatar:'', c:'#7a1533', t:'Gente daqui também 🙋‍♀️', typ:'txt' },
    { n:'Fernanda T.',avatar:'', c:'#a01e42', t:'', typ:'foto', blur:false, img:'' },
    { n:'Larissa O.', avatar:'', c:'#851738', t:'Meu Deus Fernanda 🥵🥵', typ:'txt' },
    { n:'Camila R.',  avatar:'', c:'#922040', t:'alguém quer conversar no privado comigo? 🌹', typ:'txt' },
    { n:'Amanda S.',  avatar:'', c:'#c0392b', t:'', typ:'foto', blur:true, img:'' },
    { n:'Patrícia L.',avatar:'', c:'#7a1533', t:'@Camila te mandei msg no pv', typ:'txt' },
    { n:'Renata K.',  avatar:'', c:'#6e1230', t:'', typ:'foto', blur:true, img:'' },
    { n:'Beatriz N.', avatar:'', c:'#922040', t:'Boa noite a todos daqui 💋', typ:'txt' },
    { n:'Juliana M.', avatar:'', c:'#8b1a4a', t:'esse grupo tá pegando fogo hoje 🔥', typ:'txt' },
    { n:'Fernanda T.',avatar:'', c:'#a01e42', t:'@Beatriz oi vizinha 😂', typ:'txt' },
    { n:'Amanda S.',  avatar:'', c:'#c0392b', t:'vou dormir, mas antes... 👀', typ:'txt' }
  ],
  testimonials: [
    { avatar:'', img:'https://e-volutionn.com/wp-content/uploads/2026/01/a1T4tn7f.jpeg', name:'Ricardo M.', city:'São Paulo, SP', text:'Entrei sem acreditar muito. Na primeira semana já tinha marcado dois encontros. As mulheres são reais.', tag:'2 encontros na 1ª semana' },
    { avatar:'', img:'https://e-volutionn.com/wp-content/uploads/2026/01/QEPIrF4q.jpeg', name:'Felipe A.', city:'Belo Horizonte, MG', text:'Já tentei outros aplicativos e nunca deu nada. Aqui foi diferente.', tag:'Encontro em 3 dias' },
    { avatar:'', img:'https://e-volutionn.com/wp-content/uploads/2025/11/WhatsApp-Image-2025-11-05-at-18.58.32.jpeg', name:'Marcos T.', city:'Rio de Janeiro, RJ', text:'Assino há 3 meses. Vale demais. Mais de 6 encontros. Mulheres de verdade, discretas.', tag:'6 encontros em 3 meses' }
  ]
};

Object.entries(defaultConfig).forEach(([k, v]) => {
  if (!db.prepare('SELECT 1 FROM config WHERE key=?').get(k)) setConfig(k, v);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

function authRequired(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token necessário' });
  try { req.admin = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token inválido' }); }
}

const insertEvent   = db.prepare('INSERT INTO events(type,data,ip,ua,fingerprint) VALUES(?,?,?,?,?)');
const upsertSession = db.prepare("INSERT OR REPLACE INTO active_sessions(sid,ts) VALUES(?,strftime('%s','now'))");
const deleteOldSess = db.prepare("DELETE FROM active_sessions WHERE ts < strftime('%s','now') - 120");

function getIP(req) { return (req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '').trim(); }
function makeFingerprint(req) {
  const ip = getIP(req), ua = req.headers['user-agent'] || '';
  return Buffer.from(ip + ua).toString('base64').slice(0, 32);
}
function isUniqueVisit(fp) {
  const since = Math.floor(Date.now() / 1000) - 86400;
  return !db.prepare("SELECT 1 FROM events WHERE type='pageview' AND fingerprint=? AND ts>=? LIMIT 1").get(fp, since);
}
function track(type, data, req) {
  insertEvent.run(type, JSON.stringify(data || {}), getIP(req), req.headers['user-agent'] || '', makeFingerprint(req));
}

// ─── ROTAS PÚBLICAS ───────────────────────────────────
app.get('/', (req, res) => {
  const fp = makeFingerprint(req);
  track('pageview', { unique: isUniqueVisit(fp) }, req);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/ping', (req, res) => {
  const { sid } = req.body;
  if (sid) { deleteOldSess.run(); upsertSession.run(sid); }
  res.json({ ok: true });
});

app.post('/api/track', (req, res) => {
  track(req.body.event || 'click', req.body.data || {}, req);
  res.json({ ok: true });
});

app.get('/api/site-config', (req, res) => {
  res.json({
    links:            getConfigJSON('links',            defaultConfig.links),
    discountMensal:   getConfigJSON('discountMensal',   defaultConfig.discountMensal),
    groupName:        getConfigJSON('groupName',        defaultConfig.groupName),
    groupAvatar:      getConfigJSON('groupAvatar',      defaultConfig.groupAvatar),
    chatTimerMinutes: getConfigJSON('chatTimerMinutes', defaultConfig.chatTimerMinutes),
    girls:            getConfigJSON('girls',            defaultConfig.girls),
    groupMsgs:        getConfigJSON('groupMsgs',        defaultConfig.groupMsgs),
    testimonials:     getConfigJSON('testimonials',     defaultConfig.testimonials),
  });
});

app.post('/api/admin/login', (req, res) => {
  const { user, pass } = req.body;
  if (user !== ADMIN_USER || pass !== ADMIN_PASS)
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  res.json({ token: jwt.sign({ user }, JWT_SECRET, { expiresIn: '7d' }) });
});

// ─── MÉTRICAS ─────────────────────────────────────────
app.get('/api/admin/metrics', authRequired, (req, res) => {
  const { range, from, to } = req.query;
  const nowUTC = Math.floor(Date.now() / 1000);
  const BRT = -3 * 3600;
  let tsFrom = 0, tsTo = nowUTC;

  if (range === 'custom' && from && to) {
    tsFrom = Math.floor(new Date(from).getTime() / 1000);
    tsTo   = Math.floor(new Date(to).getTime()   / 1000) + 86399;
  } else if (range === 'today') {
    const d = new Date((nowUTC + BRT) * 1000);
    d.setUTCHours(0,0,0,0);
    tsFrom = Math.floor(d.getTime() / 1000) - BRT;
  } else if (range === 'week')  { tsFrom = nowUTC - 7*86400;
  } else if (range === 'month') { tsFrom = nowUTC - 30*86400;
  } else if (range === 'total') { tsFrom = 0;
  } else {
    const d = new Date((nowUTC + BRT) * 1000);
    d.setUTCHours(0,0,0,0);
    tsFrom = Math.floor(d.getTime() / 1000) - BRT;
  }

  deleteOldSess.run();
  const activeNow        = db.prepare('SELECT COUNT(*) as n FROM active_sessions').get().n;
  const pvTotal_period   = db.prepare("SELECT COUNT(*) as n FROM events WHERE type='pageview' AND ts>=? AND ts<=?").get(tsFrom, tsTo).n;
  const pvUnique_period  = db.prepare("SELECT COUNT(DISTINCT fingerprint) as n FROM events WHERE type='pageview' AND ts>=? AND ts<=?").get(tsFrom, tsTo).n;
  const pvUniqueTotal    = db.prepare("SELECT COUNT(DISTINCT fingerprint) as n FROM events WHERE type='pageview'").get().n;

  const clicks = db.prepare(
    "SELECT data, COUNT(*) as n FROM events WHERE type='click' AND ts>=? AND ts<=? GROUP BY data ORDER BY n DESC LIMIT 30"
  ).all(tsFrom, tsTo);

  const hourly = db.prepare(`
    SELECT strftime('%H', datetime(ts+${BRT},'unixepoch')) as hora,
      COUNT(*) as acessos, COUNT(DISTINCT fingerprint) as unicos
    FROM events WHERE type='pageview' AND ts>=? AND ts<=?
    GROUP BY hora ORDER BY hora
  `).all(tsFrom, tsTo);

  const daily = db.prepare(`
    SELECT strftime('%d/%m', datetime(ts+${BRT},'unixepoch')) as dia,
      COUNT(*) as acessos, COUNT(DISTINCT fingerprint) as unicos
    FROM events WHERE type='pageview' AND ts>=? AND ts<=?
    GROUP BY dia ORDER BY dia
  `).all(tsFrom, tsTo);

  const recent = db.prepare(
    "SELECT type,data,ip,ua,fingerprint,ts FROM events ORDER BY ts DESC LIMIT 100"
  ).all();

  res.json({ activeNow, pvTotal_period, pvUnique_period, pvUniqueTotal, clicks, hourly, daily, recent });
});

app.post('/api/admin/config', authRequired, (req, res) => {
  const allowed = ['links','discountMensal','groupName','groupAvatar','chatTimerMinutes','girls','groupMsgs','testimonials'];
  if (!allowed.includes(req.body.key)) return res.status(400).json({ error: 'Chave inválida' });
  setConfig(req.body.key, req.body.value);
  res.json({ ok: true });
});

app.post('/api/admin/upload', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo' });
  res.json({ url: '/uploads/' + req.file.filename });
});

app.delete('/api/admin/upload/:filename', authRequired, (req, res) => {
  const file = path.join(UPLOADS_DIR, req.params.filename);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ ok: true });
});

app.get('/api/admin/uploads', authRequired, (req, res) => {
  const files = fs.readdirSync(UPLOADS_DIR)
    .filter(f => /\.(jpg|jpeg|png|gif|webp|mp4|mov)$/i.test(f))
    .map(f => '/uploads/' + f);
  res.json(files);
});

app.get(`/${ADMIN_ROUTE}`, (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get(`/${ADMIN_ROUTE}/*`, (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

app.listen(PORT, () => {
  console.log(`Porta: ${PORT} | Painel: /${ADMIN_ROUTE}`);
});
