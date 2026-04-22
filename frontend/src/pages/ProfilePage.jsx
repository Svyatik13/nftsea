import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import NftCard from '../components/NftCard';

export default function ProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/users/${username}`),
      api.get(`/nfts/mine`), // will be a public endpoint query in future
    ]).then(([p]) => {
      setProfile(p.data);
      setNfts(p.data.nfts || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [username]);

  if (loading) return <p style={{padding:'4rem',textAlign:'center',color:'var(--text-2)'}}>Loading profile…</p>;
  if (!profile) return <p style={{padding:'4rem',textAlign:'center',color:'var(--text-2)'}}>User not found.</p>;

  const wl = profile.pvp_wins + profile.pvp_losses;
  const winRate = wl > 0 ? ((profile.pvp_wins / wl) * 100).toFixed(1) : '—';

  return (
    <div>
      <div className="profile-hero">
        <div className="profile-avatar">{profile.username[0].toUpperCase()}</div>
        <div>
          <h1 className="page-title">{profile.username}</h1>
          <p style={{color:'var(--text-2)',fontSize:'.85rem'}}>Member since {new Date(profile.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="stats-row" style={{marginBottom:'2rem'}}>
        <div className="stat-card"><div className="stat-card-label">Balance</div><div className="stat-card-value accent">{Math.floor(parseFloat(profile.balance)).toLocaleString()} SVT</div></div>
        <div className="stat-card"><div className="stat-card-label">NFTs Owned</div><div className="stat-card-value">{nfts.length}</div></div>
        <div className="stat-card"><div className="stat-card-label">PvP Wins</div><div className="stat-card-value">{profile.pvp_wins}</div></div>
        <div className="stat-card"><div className="stat-card-label">Win Rate</div><div className="stat-card-value">{winRate}{wl>0?'%':''}</div></div>
      </div>

      {nfts.length > 0 && <>
        <p className="section-heading">Collection</p>
        <div className="nft-grid">{nfts.map(n => <NftCard key={n.id} nft={n} />)}</div>
      </>}
    </div>
  );
}
