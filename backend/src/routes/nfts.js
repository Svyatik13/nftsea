import { Router } from 'express';
import { pool } from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';
import { io } from '../index.js';
import { logActivity } from '../services/activity.js';

const router = Router();

const MODELS = [
  { name: 'Void Shark',     emoji: '🦈', rarity: 'legendary', color: '#ff9d3d' },
  { name: 'Crystal Squid',  emoji: '🦑', rarity: 'epic',      color: '#b04dff' },
  { name: 'Neon Jellyfish', emoji: '🪼', rarity: 'rare',      color: '#4d7fff' },
  { name: 'Prism Ray',      emoji: '🐡', rarity: 'rare',      color: '#4d7fff' },
  { name: 'Ancient Turtle', emoji: '🐢', rarity: 'common',    color: '#7c7c8c' },
  { name: 'Ghost Angler',   emoji: '🐟', rarity: 'common',    color: '#7c7c8c' },
  { name: 'Titan Crab',     emoji: '🦀', rarity: 'epic',      color: '#b04dff' },
  { name: 'Pearl Orca',     emoji: '🐋', rarity: 'legendary', color: '#ff9d3d' },
];
const BACKDROPS = [
  { name: 'Abyssal Void',    bg: '#000814', glow: '#001aff' },
  { name: 'Biolume Reef',    bg: '#001a18', glow: '#3ddfcc' },
  { name: 'Volcanic Rift',   bg: '#1a0500', glow: '#ff4500' },
  { name: 'Sunken Archive',  bg: '#1a1200', glow: '#ffcc00' },
  { name: 'Twilight Trench', bg: '#0d0020', glow: '#b04dff' },
  { name: 'Coral Garden',    bg: '#1a0010', glow: '#ff4d7f' },
];
const MINT_COST = 500;

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const genSerial = () => 'SEA-' + Math.floor(Math.random() * 90000 + 10000);

// GET /api/nfts/mine
router.get('/mine', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM nfts WHERE owner_id = $1 AND id NOT IN (SELECT nft_id FROM listings WHERE nft_id IS NOT NULL) ORDER BY minted_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// GET /api/nfts/:serial  — detail
router.get('/:serial', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT n.*, u.username as owner_name FROM nfts n LEFT JOIN users u ON n.owner_id = u.id WHERE n.serial = $1`,
    [req.params.serial]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const transfers = await pool.query(
    `SELECT t.*, f.username as from_name, tt.username as to_name FROM transfers t LEFT JOIN users f ON t.from_id = f.id LEFT JOIN users tt ON t.to_id = tt.id WHERE t.nft_id = $1 ORDER BY t.created_at DESC`,
    [rows[0].id]
  );
  res.json({ ...rows[0], transfers: transfers.rows });
});

// POST /api/nfts/mint
router.post('/mint', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [u] } = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    if (parseFloat(u.balance) < MINT_COST) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient SVT balance' });
    }
    const model = rand(MODELS);
    const backdrop = rand(BACKDROPS);
    const serial = genSerial();

    await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [MINT_COST, req.user.id]);
    const { rows: [nft] } = await client.query(
      `INSERT INTO nfts (serial, model, backdrop, rarity, emoji, color, backdrop_bg, owner_id, minted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
      [serial, model.name, backdrop.name, model.rarity, model.emoji, model.color, backdrop.bg, req.user.id]
    );
    await client.query('COMMIT');

    await logActivity('mint', req.user.username, { serial, model: model.name, backdrop: backdrop.name, rarity: model.rarity });
    io.emit('activity:new', { type: 'mint', actor: req.user.username, details: { serial, model: model.name, rarity: model.rarity } });

    res.json({ nft, newBalance: parseFloat(u.balance) - MINT_COST });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Mint failed' });
  } finally { client.release(); }
});

// POST /api/nfts/:id/transfer
router.post('/:id/transfer', authenticate, async (req, res) => {
  const { toUsername, note } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [nft] } = await client.query('SELECT * FROM nfts WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!nft || nft.owner_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not your NFT' });
    }
    const { rows: [toUser] } = await client.query('SELECT id FROM users WHERE username = $1', [toUsername.toLowerCase()]);
    if (!toUser) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'User not found' }); }
    if (toUser.id === req.user.id) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Cannot gift to yourself' }); }

    await client.query('UPDATE nfts SET owner_id = $1 WHERE id = $2', [toUser.id, nft.id]);
    await client.query(
      'INSERT INTO transfers (nft_id, from_id, to_id, note) VALUES ($1,$2,$3,$4)',
      [nft.id, req.user.id, toUser.id, note || null]
    );
    await client.query(
      `INSERT INTO notifications (user_id, type, message) VALUES ($1,'gift',$2)`,
      [toUser.id, `${req.user.username} gifted you ${nft.model} #${nft.serial}!`]
    );
    await client.query('COMMIT');

    await logActivity('transfer', req.user.username, { serial: nft.serial, to: toUsername, model: nft.model });
    io.emit('activity:new', { type: 'gift', actor: req.user.username, details: { to: toUsername, model: nft.model, serial: nft.serial } });
    io.to(`user:${toUser.id}`).emit('notification:new', { message: `${req.user.username} gifted you ${nft.model} #${nft.serial}!` });

    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Transfer failed' });
  } finally { client.release(); }
});

export default router;
