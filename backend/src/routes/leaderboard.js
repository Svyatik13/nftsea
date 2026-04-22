import { Router } from 'express';
import { pool } from '../db/schema.js';

const router = Router();

// GET /api/leaderboard/balance
router.get('/balance', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, username, balance, pvp_wins, pvp_losses FROM users ORDER BY balance DESC LIMIT 20`
  );
  res.json(rows);
});

// GET /api/leaderboard/pvp
router.get('/pvp', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, username, pvp_wins, pvp_losses,
      CASE WHEN (pvp_wins + pvp_losses) = 0 THEN 0 ELSE ROUND(pvp_wins::numeric / (pvp_wins + pvp_losses) * 100, 1) END as win_rate
     FROM users WHERE (pvp_wins + pvp_losses) > 0 ORDER BY pvp_wins DESC LIMIT 20`
  );
  res.json(rows);
});

// GET /api/leaderboard/collection
router.get('/collection', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, COUNT(n.id) as nft_count FROM users u LEFT JOIN nfts n ON n.owner_id = u.id GROUP BY u.id ORDER BY nft_count DESC LIMIT 20`
  );
  res.json(rows);
});

export default router;
