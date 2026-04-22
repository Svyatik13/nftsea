import { Router } from 'express';
import { pool } from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const MAX_RATE     = 0.1;   // SVT per second (passive)
const BOOST_RATE   = 1.0;   // SVT per second (boosted)
const BOOST_WINDOW = 3;     // seconds

// POST /api/mine/claim
router.post('/claim', authenticate, async (req, res) => {
  const { amount, boosted } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  // Server-side anti-cheat: cap the claimable amount per request
  const cap = boosted ? BOOST_RATE * BOOST_WINDOW * 2 : MAX_RATE * 60; // max 1 min passive
  if (amount > cap) return res.status(400).json({ error: `Claim exceeds limit (max ${cap} SVT per request)` });

  const { rows: [u] } = await pool.query(
    'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
    [amount, req.user.id]
  );
  res.json({ newBalance: parseFloat(u.balance) });
});

// GET /api/mine/rate
router.get('/rate', authenticate, (req, res) => {
  res.json({ passiveRate: MAX_RATE, boostRate: BOOST_RATE, boostDuration: BOOST_WINDOW });
});

export default router;
