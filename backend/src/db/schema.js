import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      username    TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      balance     NUMERIC(18,4) DEFAULT 10000,
      avatar_seed TEXT,
      pvp_wins    INT DEFAULT 0,
      pvp_losses  INT DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS nfts (
      id           SERIAL PRIMARY KEY,
      serial       TEXT UNIQUE NOT NULL,
      model        TEXT NOT NULL,
      backdrop     TEXT NOT NULL,
      rarity       TEXT NOT NULL,
      emoji        TEXT NOT NULL,
      color        TEXT NOT NULL,
      backdrop_bg  TEXT NOT NULL,
      owner_id     INT REFERENCES users(id) ON DELETE SET NULL,
      minted_by    INT REFERENCES users(id) ON DELETE SET NULL,
      minted_at    TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS listings (
      id          SERIAL PRIMARY KEY,
      nft_id      INT UNIQUE REFERENCES nfts(id) ON DELETE CASCADE,
      seller_id   INT REFERENCES users(id) ON DELETE CASCADE,
      price       NUMERIC(18,4) NOT NULL,
      auction     BOOLEAN DEFAULT false,
      ends_at     TIMESTAMPTZ,
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bids (
      id          SERIAL PRIMARY KEY,
      listing_id  INT REFERENCES listings(id) ON DELETE CASCADE,
      bidder_id   INT REFERENCES users(id) ON DELETE CASCADE,
      amount      NUMERIC(18,4),
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS pvp_games (
      id          SERIAL PRIMARY KEY,
      creator_id  INT REFERENCES users(id),
      joiner_id   INT REFERENCES users(id),
      amount      NUMERIC(18,4),
      side        TEXT,
      winner_id   INT REFERENCES users(id),
      status      TEXT DEFAULT 'open',
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id         SERIAL PRIMARY KEY,
      type       TEXT NOT NULL,
      actor      TEXT NOT NULL,
      details    JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id         SERIAL PRIMARY KEY,
      nft_id     INT REFERENCES nfts(id),
      from_id    INT REFERENCES users(id),
      to_id      INT REFERENCES users(id),
      note       TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id         SERIAL PRIMARY KEY,
      user_id    INT REFERENCES users(id) ON DELETE CASCADE,
      type       TEXT,
      message    TEXT,
      read       BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('[DB] Schema ready');
}
