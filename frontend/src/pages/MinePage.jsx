import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store';

const PASSIVE_RATE = 0.1; // SVT/s
const BOOST_RATE   = 1.0;
const BOOST_DUR    = 3000; // ms

export default function MinePage() {
  const { adjustBalance } = useStore();
  const [unclaimed, setUnclaimed] = useState(0);
  const [boosted, setBoosted] = useState(false);
  const [bubbles, setBubbles] = useState([]);
  const intervalRef = useRef(null);
  const boostTimer  = useRef(null);
  const rateRef     = useRef(PASSIVE_RATE);

  // Mining tick
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setUnclaimed(p => +(p + rateRef.current / 10).toFixed(3));
    }, 100);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Bubble spawner
  useEffect(() => {
    const id = setInterval(() => {
      if (boosted) return;
      const bubble = {
        id: Date.now(),
        x: 10 + Math.random() * 80,
        size: 44 + Math.random() * 24,
        dur: 6 + Math.random() * 4,
      };
      setBubbles(b => [...b.slice(-8), bubble]);
    }, 3500);
    return () => clearInterval(id);
  }, [boosted]);

  const activateBoost = useCallback((bubbleId) => {
    setBubbles(b => b.filter(b => b.id !== bubbleId));
    setBoosted(true);
    rateRef.current = BOOST_RATE;
    clearTimeout(boostTimer.current);
    boostTimer.current = setTimeout(() => {
      setBoosted(false);
      rateRef.current = PASSIVE_RATE;
    }, BOOST_DUR);
  }, []);

  const claim = async () => {
    if (unclaimed < 0.01) return;
    const amount = unclaimed;
    setUnclaimed(0);
    try {
      const { data } = await api.post('/mine/claim', { amount: +amount.toFixed(4), boosted: false });
      adjustBalance(amount);
    } catch (e) { alert(e.response?.data?.error || 'Claim failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Extraction Zone</h1>
        <p className="page-sub">Click bubbles for a 10× power boost!</p>
      </div>

      <div className="mine-arena">
        <div className="mine-arena-bg" />
        <span className={`mine-emoji ${boosted ? 'boosted' : ''}`}>⛏️</span>
        <div className="mine-rate-display">{unclaimed.toFixed(2)}</div>
        <p className="mine-rate-label">UNCLAIMED SVT</p>
        {boosted && <div className="boost-pill">⚡ 10× BOOST ACTIVE</div>}
        <button className="btn-primary" onClick={claim}>Claim SVT</button>

        <div className="mine-stats-row">
          <div className="mine-stat"><div className="mine-stat-lbl">Rate</div><div className="mine-stat-val">{boosted ? '1.0' : '0.1'} SVT/s</div></div>
          <div className="mine-stat"><div className="mine-stat-lbl">Status</div><div className="mine-stat-val">{boosted ? '⚡ Boosted' : '● Active'}</div></div>
        </div>
      </div>

      {/* Bubble Layer */}
      {bubbles.map(b => (
        <div
          key={b.id}
          className="bubble"
          style={{ left: `${b.x}vw`, width: b.size, height: b.size, '--dur': `${b.dur}s` }}
          onClick={() => activateBoost(b.id)}
        >💎</div>
      ))}
    </div>
  );
}
