import { Router } from 'express';
import { pool } from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/mine', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json(rows);
});

router.post('/read-all', authenticate, async (req, res) => {
  await pool.query('UPDATE notifications SET read = true WHERE user_id = $1', [req.user.id]);
  res.json({ success: true });
});

export default router;
