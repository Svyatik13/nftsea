import { Router } from 'express';
import { pool } from '../db/schema.js';
import { authenticate } from '../middleware/auth.js';
import { io } from '../index.js';
import { logActivity } from '../services/activity.js';

const router = Router();

// GET /api/market
router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT l.*, n.serial, n.model, n.backdrop, n.rarity, n.emoji, n.color, n.backdrop_bg, u.username as seller_name,
      (SELECT MAX(amount) FROM bids WHERE listing_id = l.id) as top_bid
    FROM listings l
    JOIN nfts n ON l.nft_id = n.id
    JOIN users u ON l.seller_id = u.id
    ORDER BY l.created_at DESC
  `);
  res.json(rows);
});

// POST /api/market/list
router.post('/list', authenticate, async (req, res) => {
  const { nftId, price, auction, hoursUntilEnd } = req.body;
  if (!nftId || !price || price <= 0) return res.status(400).json({ error: 'Invalid params' });

  const { rows: [nft] } = await pool.query('SELECT * FROM nfts WHERE id = $1', [nftId]);
  if (!nft || nft.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your NFT' });

  const endsAt = auction && hoursUntilEnd ? new Date(Date.now() + hoursUntilEnd * 3600_000) : null;
  const { rows: [listing] } = await pool.query(
    `INSERT INTO listings (nft_id, seller_id, price, auction, ends_at) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [nftId, req.user.id, price, !!auction, endsAt]
  );

  const fullListing = { ...listing, serial: nft.serial, model: nft.model, emoji: nft.emoji, rarity: nft.rarity, seller_name: req.user.username };
  io.emit('market:listed', fullListing);
  await logActivity('list', req.user.username, { serial: nft.serial, price, auction: !!auction });
  io.emit('activity:new', { type: 'list', actor: req.user.username, details: { model: nft.model, serial: nft.serial, price } });

  res.json(fullListing);
});

// DELETE /api/market/:listingId
router.delete('/:id', authenticate, async (req, res) => {
  const { rows: [l] } = await pool.query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
  if (!l || l.seller_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  await pool.query('DELETE FROM listings WHERE id = $1', [req.params.id]);
  io.emit('market:delisted', { listingId: parseInt(req.params.id) });
  res.json({ success: true });
});

// POST /api/market/:listingId/buy
router.post('/:id/buy', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [listing] } = await client.query(
      'SELECT l.*, n.serial, n.model, n.emoji FROM listings l JOIN nfts n ON l.nft_id = n.id WHERE l.id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (!listing) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Listing not found' }); }
    if (listing.auction) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Use bid for auctions' }); }
    if (listing.seller_id === req.user.id) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Cannot buy own listing' }); }

    const { rows: [buyer] } = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    if (parseFloat(buyer.balance) < parseFloat(listing.price)) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Insufficient SVT' }); }

    await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [listing.price, req.user.id]);
    await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [listing.price, listing.seller_id]);
    await client.query('UPDATE nfts SET owner_id = $1 WHERE id = $2', [req.user.id, listing.nft_id]);
    await client.query('DELETE FROM listings WHERE id = $1', [listing.id]);
    await client.query('INSERT INTO transfers (nft_id, from_id, to_id) VALUES ($1,$2,$3)', [listing.nft_id, listing.seller_id, req.user.id]);
    await client.query('INSERT INTO notifications (user_id, type, message) VALUES ($1,$2,$3)',
      [listing.seller_id, 'sale', `${req.user.username} bought ${listing.model} #${listing.serial} for ${listing.price} SVT!`]);

    await client.query('COMMIT');

    const eventData = { listingId: listing.id, buyer: req.user.username, seller: listing.seller_name, price: listing.price, model: listing.model, serial: listing.serial };
    io.emit('market:sold', eventData);
    io.emit('activity:new', { type: 'sale', actor: req.user.username, details: eventData });
    io.to(`user:${listing.seller_id}`).emit('notification:new', { message: `${req.user.username} bought ${listing.model} for ${listing.price} SVT!` });
    io.to(`user:${req.user.id}`).emit('balance:update', { balance: parseFloat(buyer.balance) - parseFloat(listing.price) });

    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Purchase failed' });
  } finally { client.release(); }
});

// POST /api/market/:listingId/bid
router.post('/:id/bid', authenticate, async (req, res) => {
  const { amount } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [listing] } = await client.query('SELECT * FROM listings WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!listing || !listing.auction) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Not an auction' }); }
    if (listing.ends_at < new Date()) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Auction ended' }); }

    const { rows: [topBid] } = await client.query('SELECT MAX(amount) as max FROM bids WHERE listing_id = $1', [listing.id]);
    const minBid = Math.max(parseFloat(listing.price), parseFloat(topBid?.max || 0) + 1);
    if (amount < minBid) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Minimum bid: ${minBid} SVT` }); }

    const { rows: [u] } = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    if (parseFloat(u.balance) < amount) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Insufficient SVT' }); }

    await client.query('INSERT INTO bids (listing_id, bidder_id, amount) VALUES ($1,$2,$3)', [listing.id, req.user.id, amount]);
    await client.query('COMMIT');

    io.emit('market:bid', { listingId: listing.id, bidder: req.user.username, amount });
    io.emit('activity:new', { type: 'bid', actor: req.user.username, details: { amount, listingId: listing.id } });
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Bid failed' });
  } finally { client.release(); }
});

export default router;
