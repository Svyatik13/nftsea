import { Router } from 'express';
import { pool } from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';
import { io } from '../index.js';
import { logActivity } from '../services/activity.js';

const router = Router();

// GET /api/pvp/lobby
router.get('/lobby', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, u.username as creator_name FROM pvp_games g JOIN users u ON g.creator_id = u.id WHERE g.status = 'open' ORDER BY g.created_at DESC LIMIT 50`
  );
  res.json(rows);
});

// POST /api/pvp/create
router.post('/create', authenticate, async (req, res) => {
  const { amount, side } = req.body;
  if (!amount || amount <= 0 || !['Heads', 'Tails'].includes(side)) return res.status(400).json({ error: 'Invalid params' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [u] } = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    if (parseFloat(u.balance) < amount) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Insufficient SVT' }); }
    await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, req.user.id]);
    const { rows: [game] } = await client.query(
      `INSERT INTO pvp_games (creator_id, amount, side) VALUES ($1,$2,$3) RETURNING *`,
      [req.user.id, amount, side]
    );
    await client.query('COMMIT');

    const full = { ...game, creator_name: req.user.username };
    io.emit('pvp:open', full);
    res.json(full);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Failed' });
  } finally { client.release(); }
});

// POST /api/pvp/:id/join
router.post('/:id/join', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [game] } = await client.query(
      `SELECT g.*, u.username as creator_name FROM pvp_games g JOIN users u ON g.creator_id = u.id WHERE g.id = $1 AND g.status = 'open' FOR UPDATE`,
      [req.params.id]
    );
    if (!game) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Game not found or already taken' }); }
    if (game.creator_id === req.user.id) { await client.query('ROLLBACK'); return res.status(400).json({ error: "Can't join your own game" }); }

    const { rows: [joiner] } = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    if (parseFloat(joiner.balance) < parseFloat(game.amount)) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Insufficient SVT' }); }
    await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [game.amount, req.user.id]);

    // Resolve flip
    const creatorWins = Math.random() > 0.5;
    const winnerId = creatorWins ? game.creator_id : req.user.id;
    const prize = parseFloat(game.amount) * 2;

    await client.query('UPDATE users SET balance = balance + $1, pvp_wins = pvp_wins + 1 WHERE id = $2', [prize, winnerId]);
    const loserId = creatorWins ? req.user.id : game.creator_id;
    await client.query('UPDATE users SET pvp_losses = pvp_losses + 1 WHERE id = $1', [loserId]);
    await client.query(`UPDATE pvp_games SET status='resolved', joiner_id=$1, winner_id=$2 WHERE id=$3`, [req.user.id, winnerId, game.id]);

    await client.query('COMMIT');

    const winnerName = creatorWins ? game.creator_name : req.user.username;
    const loserName  = creatorWins ? req.user.username : game.creator_name;

    io.emit('pvp:closed', { gameId: game.id });
    io.emit('activity:new', { type: 'pvp', actor: winnerName, details: { amount: game.amount, loser: loserName } });
    await logActivity('pvp', winnerName, { amount: game.amount, loser: loserName });

    io.to(`user:${winnerId}`).emit('pvp:result', { win: true,  amount: prize,          opponent: loserName });
    io.to(`user:${loserId}`).emit('pvp:result',  { win: false, amount: game.amount,    opponent: winnerName });
    io.to(`user:${winnerId}`).emit('balance:update', { delta: +prize });
    io.to(`user:${loserId}`).emit('balance:update',  { delta: -parseFloat(game.amount) });

    res.json({ win: winnerId === req.user.id, amount: game.amount, prize, opponent: game.creator_name });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Join failed' });
  } finally { client.release(); }
});

// POST /api/pvp/:id/cancel
router.post('/:id/cancel', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [game] } = await client.query(`SELECT * FROM pvp_games WHERE id = $1 AND status = 'open' FOR UPDATE`, [req.params.id]);
    if (!game || game.creator_id !== req.user.id) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Forbidden' }); }
    await client.query(`UPDATE pvp_games SET status='cancelled' WHERE id=$1`, [game.id]);
    await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [game.amount, req.user.id]);
    await client.query('COMMIT');
    io.emit('pvp:closed', { gameId: game.id });
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Cancel failed' });
  } finally { client.release(); }
});

export default router;
