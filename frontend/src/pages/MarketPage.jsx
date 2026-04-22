import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store';
import { getSocket } from '../lib/api';
import NftCard from '../components/NftCard';

export default function MarketPage() {
  const { balance, adjustBalance } = useStore();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);

  const fetchListings = async () => {
    const { data } = await api.get('/market');
    setListings(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchListings();
    const socket = getSocket();
    socket.on('market:listed', (listing) => setListings(p => [listing, ...p]));
    socket.on('market:sold', ({ listingId }) => setListings(p => p.filter(l => l.id !== listingId)));
    socket.on('market:delisted', ({ listingId }) => setListings(p => p.filter(l => l.id !== listingId)));
    socket.on('market:bid', ({ listingId, amount }) => setListings(p => p.map(l => l.id === listingId ? { ...l, top_bid: amount } : l)));
    return () => {
      socket.off('market:listed'); socket.off('market:sold'),
      socket.off('market:delisted'); socket.off('market:bid');
    };
  }, []);

  const buy = async (listingId, price) => {
    if (balance < price) return alert('Insufficient SVT balance!');
    setBuying(listingId);
    try {
      await api.post(`/market/${listingId}/buy`);
      setListings(p => p.filter(l => l.id !== listingId));
      adjustBalance(-price);
    } catch (e) { alert(e.response?.data?.error || 'Purchase failed'); }
    finally { setBuying(null); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="hero-section">
          <div className="hero-glow" />
          <div className="hero-text">
            <div className="hero-badge">✦ Drop #001 — Season 1</div>
            <h1 className="hero-title">Ocean<br />Artifacts</h1>
            <p className="hero-desc">Real users. Real trades. Every NFT uniquely minted.</p>
            <div className="hero-stats">
              <div><div className="hero-stat-val">{listings.length}</div><div className="hero-stat-lbl">Listed</div></div>
              <div><div className="hero-stat-val">6</div><div className="hero-stat-lbl">Backdrops</div></div>
              <div><div className="hero-stat-val">4</div><div className="hero-stat-lbl">Rarities</div></div>
            </div>
          </div>
          <div className="hero-visual">🌊</div>
        </div>
      </div>

      <p className="section-heading">Market Listings</p>

      {loading
        ? <div className="loading-grid">{Array.from({length:8}).map((_,i)=><div key={i} className="skeleton-card"/>)}</div>
        : listings.length === 0
          ? <p className="empty-state">No listings yet. Be the first to list an NFT!</p>
          : (
            <div className="nft-grid">
              {listings.map(listing => (
                <NftCard key={listing.id} nft={listing} action={
                  <button
                    className="btn-buy"
                    disabled={buying === listing.id}
                    onClick={() => buy(listing.id, parseFloat(listing.price))}
                  >
                    {listing.auction
                      ? `Bid ${listing.top_bid ? `(top: ${listing.top_bid})` : listing.price + ' SVT'}`
                      : `Buy ${parseFloat(listing.price).toLocaleString()} SVT`
                    }
                  </button>
                } />
              ))}
            </div>
          )
      }
    </div>
  );
}
