import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function LeaderboardPage() {
  const [tab, setTab] = useState('balance');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/leaderboard/${tab}`).then(r => { setData(r.data); setLoading(false); });
  }, [tab]);

  const medals = ['🥇','🥈','🥉'];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Rankings</h1>
        <p className="page-sub">The top players of the deep.</p>
      </div>

      <div className="auth-tabs" style={{maxWidth:'400px',marginBottom:'2rem'}}>
        {[['balance','💎 Richest'],['pvp','⚔️ PvP'],['collection','🎨 Collectors']].map(([k,l])=>(
          <button key={k} className={`auth-tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="lobby-table">
        <div className="lobby-table-head" style={{gridTemplateColumns:'40px 1fr 1fr 1fr'}}>
          <span>#</span><span>Player</span>
          {tab==='balance' && <><span>Balance</span><span>PvP W/L</span></>}
          {tab==='pvp'     && <><span>Wins</span><span>Win Rate</span></>}
          {tab==='collection' && <><span>NFTs</span><span></span></>}
        </div>
        {loading
          ? <p style={{padding:'2rem',color:'var(--text-2)',textAlign:'center'}}>Loading…</p>
          : data.map((row, i) => (
            <div key={row.id} className="lobby-row" style={{gridTemplateColumns:'40px 1fr 1fr 1fr'}}>
              <span style={{fontSize:'1.2rem'}}>{medals[i] || `#${i+1}`}</span>
              <span className="lobby-player">{row.username}</span>
              {tab==='balance' && <>
                <span className="lobby-amount">{Math.floor(parseFloat(row.balance)).toLocaleString()} SVT</span>
                <span style={{color:'var(--text-2)'}}>{row.pvp_wins}W / {row.pvp_losses}L</span>
              </>}
              {tab==='pvp' && <>
                <span className="lobby-amount">{row.pvp_wins}</span>
                <span style={{color:'var(--accent)'}}>{row.win_rate}%</span>
              </>}
              {tab==='collection' && <>
                <span className="lobby-amount">{row.nft_count}</span>
                <span></span>
              </>}
            </div>
          ))
        }
      </div>
    </div>
  );
}
