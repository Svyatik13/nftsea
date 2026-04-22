import { Router } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { pool } from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password) return res.status(400).json({ error: 'Missing fields' });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'Username must be 3-20 chars' });

  try {
    const hash = await argon2.hash(password);
    const { rows } = await pool.query(
      `INSERT INTO users (username, password, avatar_seed) VALUES ($1, $2, $3) RETURNING id, username, balance`,
      [username.toLowerCase(), hash, Math.random().toString(36).slice(2)]
    );
    const token = jwt.sign({ id: rows[0].id, username: rows[0].username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Username already taken' });
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  const { rows } = await pool.query(
    `SELECT * FROM users WHERE username = $1`, [username.toLowerCase()]
  );
  if (!rows.length) return res.status(400).json({ error: 'Invalid credentials' });

  const valid = await argon2.verify(rows[0].password, password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: rows[0].id, username: rows[0].username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token, user: { id: rows[0].id, username: rows[0].username, balance: rows[0].balance } });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { rows: [u] } = await pool.query(
    'SELECT id, username, balance, pvp_wins, pvp_losses FROM users WHERE id = $1', [req.user.id]
  );
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json(u);
});

// GET /api/users/:username  (public profile)
router.get('/:username', async (req, res) => {
  const { rows: [u] } = await pool.query(
    'SELECT id, username, balance, pvp_wins, pvp_losses, created_at FROM users WHERE username = $1',
    [req.params.username.toLowerCase()]
  );
  if (!u) return res.status(404).json({ error: 'User not found' });
  const { rows: nfts } = await pool.query('SELECT * FROM nfts WHERE owner_id = $1 LIMIT 20', [u.id]);
  res.json({ ...u, nfts });
});

export default router;
