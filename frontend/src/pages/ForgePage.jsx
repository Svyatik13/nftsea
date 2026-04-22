import { useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store';

export default function ForgePage() {
  const { balance, adjustBalance } = useStore();
  const [result, setResult] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [spinEmoji, setSpinEmoji] = useState('?');
  const EMOJIS = ['🦈','🦑','🪼','🐡','🐢','🐟','🦀','🐋'];

  const mint = async () => {
    if (balance < 500) return alert('Need at least 500 SVT to mint!');
    setResult(null); setSpinning(true);

    // Slot machine animation
    let ticks = 0;
    const spin = setInterval(() => {
      setSpinEmoji(EMOJIS[Math.floor(Math.random()*EMOJIS.length)]);
      ticks++;
      if (ticks >= 14) {
        clearInterval(spin);
        api.post('/nfts/mint')
          .then(({ data }) => {
            setSpinEmoji(data.nft.emoji);
            setResult(data.nft);
            adjustBalance(-500);
          })
          .catch(e => alert(e.response?.data?.error || 'Mint failed'))
          .finally(() => setSpinning(false));
      }
    }, 80);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Biolume Forge</h1>
        <p className="page-sub">Spend 500 SVT to create a unique artifact.</p>
      </div>

      <div className="forge-center">
        <div className="forge-card">
          <div className={`forge-preview ${result ? 'ready' : ''}`} style={result ? { background: result.backdrop_bg } : {}}>
            <span style={{ fontSize: '5rem' }}>{result ? result.emoji : spinEmoji}</span>
          </div>

          {result ? (
            <div className="forge-result">
              <div className="forge-result-name">{result.backdrop} {result.model}</div>
              <div className="forge-result-serial">#{result.serial}</div>
              <span className={`rarity-pill rarity-${result.rarity}`}>{result.rarity}</span>
              <br/><br/>
              <button className="btn-primary" style={{width:'100%'}} onClick={() => setResult(null)}>Mint Another</button>
            </div>
          ) : (
            <>
              <p style={{color:'var(--text-2)',fontSize:'.9rem',marginBottom:'1.5rem'}}>Each artifact is uniquely generated with random model, backdrop and serial number.</p>
              <button className="btn-primary" style={{width:'100%',padding:'1rem',fontSize:'1rem'}} onClick={mint} disabled={spinning}>
                {spinning ? 'Forging…' : 'Mint Artifact — 500 SVT'}
              </button>
            </>
          )}
        </div>

        <div className="forge-trait-grid">
          {['Void Shark 🦈','Crystal Squid 🦑','Neon Jellyfish 🪼','Prism Ray 🐡','Ancient Turtle 🐢','Titan Crab 🦀','Ghost Angler 🐟','Pearl Orca 🐋'].map(t => (
            <div key={t} className="forge-trait-pill">{t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
