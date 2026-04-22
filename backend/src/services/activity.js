import { pool } from '../db/schema.js';

export async function logActivity(type, actor, details = {}) {
  try {
    await pool.query(
      'INSERT INTO activity_log (type, actor, details) VALUES ($1, $2, $3)',
      [type, actor, JSON.stringify(details)]
    );
  } catch (e) {
    console.error('[Activity] Failed to log:', e.message);
  }
}
