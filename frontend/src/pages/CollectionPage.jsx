import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import NftCard from '../components/NftCard';

export default function CollectionPage() {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listModal, setListModal] = useState(null);
  const [giftModal, setGiftModal] = useState(null);
  const [price, setPrice] = useState('');
  const [giftTo, setGiftTo] = useState('');
  const [auction, setAuction] = useState(false);

  useEffect(() => {
    api.get('/nfts/mine').then(r => { setNfts(r.data); setLoading(false); });
  }, []);

  const list = async () => {
    if (!price || price <= 0) return;
    await api.post('/market/list', { nftId: listModal.id, price: parseFloat(price), auction, hoursUntilEnd: auction ? 12 : null });
    setNfts(p => p.filter(n => n.id !== listModal.id));
    setListModal(null); setPrice('');
  };

  const gift = async () => {
    if (!giftTo.trim()) return;
    try {
      await api.post(`/nfts/${giftModal.id}/transfer`, { toUsername: giftTo });
      setNfts(p => p.filter(n => n.id !== giftModal.id));
      setGiftModal(null); setGiftTo('');
    } catch (e) { alert(e.response?.data?.error || 'Transfer failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Collection</h1>
        <p className="page-sub">{nfts.length} artifact{nfts.length !== 1 ? 's' : ''} in your vault.</p>
      </div>

      {/* List Modal */}
      {listModal && (
        <div className="modal-overlay" onClick={() => setListModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2 style={{marginBottom:'1rem'}}>List {listModal.model}</h2>
            <input className="auth-input" placeholder="Price (SVT)" type="number" value={price} onChange={e => setPrice(e.target.value)} />
            <label style={{display:'flex',alignItems:'center',gap:'.5rem',margin:'.75rem 0',color:'var(--text-2)'}}>
              <input type="checkbox" checked={auction} onChange={e=>setAuction(e.target.checked)} />
              Timed Auction (12h)
            </label>
            <button className="btn-primary" style={{width:'100%'}} onClick={list}>List Now</button>
          </div>
        </div>
      )}

      {/* Gift Modal */}
      {giftModal && (
        <div className="modal-overlay" onClick={() => setGiftModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2 style={{marginBottom:'1rem'}}>Gift {giftModal.model}</h2>
            <input className="auth-input" placeholder="Recipient username" value={giftTo} onChange={e => setGiftTo(e.target.value)} />
            <button className="btn-primary" style={{width:'100%',marginTop:'1rem'}} onClick={gift}>Send Gift 🎁</button>
          </div>
        </div>
      )}

      {loading
        ? <p style={{color:'var(--text-2)'}}>Loading…</p>
        : nfts.length === 0
          ? <p className="empty-state">Vault empty. <a href="/forge" style={{color:'var(--accent)'}}>Mint your first NFT →</a></p>
          : (
            <div className="nft-grid">
              {nfts.map(nft => (
                <NftCard key={nft.id} nft={nft} action={
                  <div style={{display:'flex',gap:'.4rem'}}>
                    <button className="btn-buy" style={{fontSize:'.7rem',padding:'.3rem .6rem'}} onClick={() => { setListModal(nft); setPrice(''); }}>List</button>
                    <button className="btn-secondary" style={{fontSize:'.7rem',padding:'.3rem .6rem',border:'1px solid rgba(255,255,255,.1)',borderRadius:'6px',background:'transparent',color:'var(--text-1)',cursor:'pointer'}} onClick={() => setGiftModal(nft)}>Gift</button>
                  </div>
                } />
              ))}
            </div>
          )
      }
    </div>
  );
}
