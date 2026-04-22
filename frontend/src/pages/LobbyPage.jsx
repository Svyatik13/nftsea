import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store';
import { getSocket } from '../lib/api';

export default function LobbyPage() {
  const { user, balance, adjustBalance } = useStore();
  const [games, setGames] = useState([]);
  const [flipId, setFlipId] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/pvp/lobby').then(r => { setGames(r.data); setLoading(false); });
    const socket = getSocket();
    socket.on('pvp:open',   (g) => setGames(p => [g, ...p]));
    socket.on('pvp:closed', ({ gameId }) => setGames(p => p.filter(g => g.id !== gameId)));
    socket.on('pvp:result', (r) => { setFlipId(null); setResult(r); });
    return () => { socket.off('pvp:open'); socket.off('pvp:closed'); socket.off('pvp:result'); };
  }, []);

  const create = async () => {
    const raw = prompt('Wager amount (SVT):');
    const amount = parseFloat(raw);
    if (!amount || amount <= 0) return;
    if (balance < amount) return alert('Insufficient SVT!');
    const side = Math.random() > .5 ? 'Heads' : 'Tails';
    try {
      await api.post('/pvp/create', { amount, side });
      adjustBalance(-amount);
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
  };

  const join = async (game) => {
    if (balance < game.amount) return alert('Insufficient SVT!');
    setFlipId(game.id);
    try {
      const { data } = await api.post(`/pvp/${game.id}/join`);
      adjustBalance(-game.amount);
      setResult(data);
    } catch (e) {
      setFlipId(null);
      alert(e.response?.data?.error || 'Failed');
    }
  };

  const cancel = async (gameId) => {
    await api.post(`/pvp/${gameId}/cancel`).catch(() => {});
  };

  return (
    <div>
      {/* Flip animation overlay */}
      {flipId && (
        <div className="flip-overlay">
          <div className="flip-coin">🪙</div>
          <p style={{color:'var(--text-2)'}}>Flipping…</p>
        </div>
      )}

      {/* Result modal */}
      {result && (
        <div className="modal-overlay" onClick={() => setResult(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{fontSize:'4rem'}}>{result.win ? '🏆' : '🌊'}</div>
            <div className={result.win ? 'modal-win' : 'modal-lose'}>
              {result.win ? `+${(result.prize || result.amount*2).toLocaleString()} SVT` : `-${parseFloat(result.amount).toLocaleString()} SVT`}
            </div>
            <p className="modal-sub">vs {result.opponent}</p>
            <button className="btn-primary" onClick={() => setResult(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="lobby-header">
        <div>
          <h1 className="page-title">Tide Lobby</h1>
          <p className="page-sub">True PvP — SVT held in escrow until the flip resolves.</p>
        </div>
        <button className="btn-primary" onClick={create}>+ Create Challenge</button>
      </div>

      <div className="lobby-table">
        <div className="lobby-table-head">
          <span>Player</span><span>Amount</span><span>Side</span><span></span>
        </div>
        <div>
          {loading && <p className="lobby-empty">Loading…</p>}
          {!loading && games.length === 0 && <p className="lobby-empty">No open games. Create one!</p>}
          {games.map(g => (
            <div key={g.id} className="lobby-row">
              <span className="lobby-player">{g.creator_name}</span>
              <span className="lobby-amount">{parseFloat(g.amount).toLocaleString()} SVT</span>
              <span className={`lobby-side-pill side-${g.side?.toLowerCase()}`}>{g.side}</span>
              <div className="lobby-row-actions">
                {g.creator_id === user?.id
                  ? <button className="btn-cancel" onClick={() => cancel(g.id)}>Cancel</button>
                  : <button className="btn-challenge" onClick={() => join(g)} disabled={!!flipId}>Challenge</button>
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
