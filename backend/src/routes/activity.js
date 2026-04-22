import { Router } from 'express';
import { pool } from '../db/schema.js';

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 100`
  );
  res.json(rows);
});

export default router;
