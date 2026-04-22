import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initDb } from './db/schema.js';
import authRouter from './routes/auth.js';
import marketRouter from './routes/market.js';
import pvpRouter from './routes/pvp.js';
import mineRouter from './routes/mine.js';
import nftRouter from './routes/nfts.js';
import leaderboardRouter from './routes/leaderboard.js';
import activityRouter from './routes/activity.js';
import notifRouter from './routes/notifications.js';
import { registerSocketHandlers } from './services/socket.js';

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// --- Middleware ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 200 }));

// --- Routes ---
app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use('/api/auth',         authRouter);
app.use('/api/market',       marketRouter);
app.use('/api/pvp',          pvpRouter);
app.use('/api/mine',         mineRouter);
app.use('/api/nfts',         nftRouter);
app.use('/api/leaderboard',  leaderboardRouter);
app.use('/api/activity',     activityRouter);
app.use('/api/notifications', notifRouter);

// --- Socket.io ---
registerSocketHandlers(io);

// --- Boot ---
const PORT = process.env.PORT || 3000;

async function boot() {
  await initDb();
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[API] Listening on :${PORT}`);
  });
}

boot().catch(err => { console.error(err); process.exit(1); });
