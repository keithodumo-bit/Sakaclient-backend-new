
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const DB_PATH = process.env.SQLITE_FILE || './data/sakaclient.db';
const CUSTOMER_CARE = process.env.POCHI_NUMBER || '0758170835';

async function openDb() {
  return open({ filename: DB_PATH, driver: sqlite3.Database });
}

app.get('/ping', (req, res) => res.send('SakaClient backend is working ✅'));
app.get('/api/health', (req, res) => res.json({ ok: true, name: 'SakaClient Backend', time: new Date().toISOString(), customerCare: CUSTOMER_CARE }));

app.post('/api/auth/login-phone', async (req, res) => {
  const phone = req.body && req.body.phone ? req.body.phone : null;
  if (!phone) return res.status(400).json({ error: 'phone required', customerCare: CUSTOMER_CARE });
  const db = await openDb();
  try {
    const row = await db.get('SELECT * FROM users WHERE phone = ?', phone);
    if (row) return res.json({ ok: true, user: { id: row.id, phone: row.phone, isDesigner: !!row.is_designer }, customerCare: CUSTOMER_CARE });
    const isDesigner = (process.env.DESIGNER_PHONES||'').split(',').map(s=>s.trim()).includes(phone) ? 1 : 0;
    const r = await db.run('INSERT INTO users (phone, is_designer) VALUES (?,?)', phone, isDesigner);
    const newUser = await db.get('SELECT * FROM users WHERE id = ?', r.lastID);
    return res.json({ ok: true, user: { id: newUser.id, phone: newUser.phone, isDesigner: !!newUser.is_designer }, customerCare: CUSTOMER_CARE });
  } catch (e) {
    return res.status(500).json({ error: e.message, customerCare: CUSTOMER_CARE });
  } finally {
    await db.close();
  }
});

app.get('/api/auth/access/:phone', async (req, res) => {
  const phone = req.params.phone;
  const db = await openDb();
  try {
    const user = await db.get('SELECT * FROM users WHERE phone = ?', phone);
    if (!user) return res.status(404).json({ error: 'user not found', customerCare: CUSTOMER_CARE });
    const sub = await db.get('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY expires_at DESC LIMIT 1', user.id);
    const now = Date.now();
    const activePaid = sub && sub.expires_at > now;
    return res.json({ ok: true, access: { isDesigner: !!user.is_designer, activePaid, expiresAt: sub ? sub.expires_at : 0 }, customerCare: CUSTOMER_CARE });
  } catch (e) {
    return res.status(500).json({ error: e.message, customerCare: CUSTOMER_CARE });
  } finally {
    await db.close();
  }
});

app.post('/api/payments/start', async (req, res) => {
  const { phone, plan } = req.body;
  const plans = { daily:1, weekly:7, monthly:30 };
  if (!phone || !plans[plan]) return res.status(400).json({ error: 'phone & valid plan required', customerCare: CUSTOMER_CARE });
  const db = await openDb();
  try {
    const user = await db.get('SELECT * FROM users WHERE phone = ?', phone);
    if (!user) return res.status(404).json({ error: 'user not found', customerCare: CUSTOMER_CARE });
    const now = Date.now();
    const expires = now + plans[plan] * 24 * 60 * 60 * 1000;
    await db.run('INSERT INTO subscriptions (user_id, plan, expires_at) VALUES (?,?,?)', user.id, plan, expires);
    return res.json({ ok: true, message: 'Payment simulated - plan active', expires, customerCare: CUSTOMER_CARE });
  } catch (e) {
    return res.status(500).json({ error: e.message, customerCare: CUSTOMER_CARE });
  } finally {
    await db.close();
  }
});

app.post('/api/payments/activate/manual', async (req, res) => {
  const { phone, plan } = req.body;
  const plans = { daily:1, weekly:7, monthly:30 };
  if (!phone || !plans[plan]) return res.status(400).json({ error: 'phone & valid plan required', customerCare: CUSTOMER_CARE });
  const db = await openDb();
  try {
    const user = await db.get('SELECT * FROM users WHERE phone = ?', phone);
    if (!user) return res.status(404).json({ error: 'user not found', customerCare: CUSTOMER_CARE });
    const now = Date.now();
    const expires = now + plans[plan] * 24 * 60 * 60 * 1000;
    await db.run('INSERT INTO subscriptions (user_id, plan, expires_at) VALUES (?,?,?)', user.id, plan, expires);
    return res.json({ ok: true, expires, customerCare: CUSTOMER_CARE });
  } catch (e) {
    return res.status(500).json({ error: e.message, customerCare: CUSTOMER_CARE });
  } finally {
    await db.close();
  }
});

app.post('/api/calls/originate', async (req, res) => {
  const { phone, clientNumber, mode='precoded', message='' } = req.body;
  if (!phone || !clientNumber) return res.status(400).json({ error: 'phone & clientNumber required', customerCare: CUSTOMER_CARE });
  const db = await openDb();
  try {
    const user = await db.get('SELECT * FROM users WHERE phone = ?', phone);
    if (!user) return res.status(404).json({ error: 'user not found', customerCare: CUSTOMER_CARE });
    const callId = 'SIM-' + Math.random().toString(36).slice(2,10);
    const status = 'completed';
    const note = JSON.stringify({ provider: 'simulated', mode, message });
    await db.run('INSERT INTO calls (user_id, client_number, status, note) VALUES (?,?,?,?)', user.id, clientNumber, status, note);
    return res.json({ ok: true, callId, status, customerCare: CUSTOMER_CARE });
  } catch (e) {
    return res.status(500).json({ error: e.message, customerCare: CUSTOMER_CARE });
  } finally {
    await db.close();
  }
});

app.get('/api/calls/history/:phone', async (req, res) => {
  const phone = req.params.phone;
  const db = await openDb();
  try {
    const user = await db.get('SELECT * FROM users WHERE phone = ?', phone);
    if (!user) return res.status(404).json({ error: 'user not found', customerCare: CUSTOMER_CARE });
    const rows = await db.all('SELECT * FROM calls WHERE user_id = ? ORDER BY id DESC LIMIT 200', user.id);
    return res.json({ ok: true, rows, customerCare: CUSTOMER_CARE });
  } catch (e) {
    return res.status(500).json({ error: e.message, customerCare: CUSTOMER_CARE });
  } finally {
    await db.close();
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`SakaClient backend listening on :${port}`));

