import { useNavigate } from 'react-router-dom';

const RARITY_MAP = { legendary: 'rarity-legendary', epic: 'rarity-epic', rare: 'rarity-rare', common: 'rarity-common' };

function Stars() {
  return (
    <div className="nft-card-stars" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="star" style={{
          left: `${Math.random()*90}%`, top: `${Math.random()*90}%`,
          '--dur': `${(1.5+Math.random()*2).toFixed(1)}s`,
          '--delay': `${(Math.random()*2).toFixed(1)}s`
        }} />
      ))}
    </div>
  );
}

export default function NftCard({ nft, action }) {
  return (
    <div className="nft-card" role="button" tabIndex={0}>
      <div className="nft-card-visual" style={{ background: nft.backdrop_bg || '#0a0a10' }}>
        <div className="nft-card-bg" style={{ '--glow': nft.color }} />
        <Stars />
        <span className="nft-card-emoji" style={{ filter: `drop-shadow(0 0 14px ${nft.color})` }}>
          {nft.emoji}
        </span>
      </div>
      <div className="nft-card-info">
        <div className="nft-card-serial">#{nft.serial}</div>
        <div className="nft-card-name">{nft.backdrop} {nft.model}</div>
        <div className="nft-card-meta">
          <span className={`rarity-pill ${RARITY_MAP[nft.rarity] || ''}`}>{nft.rarity}</span>
          {action}
        </div>
      </div>
    </div>
  );
}
