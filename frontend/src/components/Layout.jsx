import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import ActivityTicker from './ActivityTicker';
import NotificationBell from './NotificationBell';

export default function Layout() {
  const { user, balance, onlineCount, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="topbar-logo">🌊</span>
          <span className="topbar-title">NFT Sea</span>
          {onlineCount > 0 && (
            <span className="online-badge">● {onlineCount} online</span>
          )}
        </div>

        <nav className="topnav">
          <NavLink to="/"            className={({isActive}) => 'topnav-btn' + (isActive ? ' active' : '')}>Market</NavLink>
          <NavLink to="/mine"        className={({isActive}) => 'topnav-btn' + (isActive ? ' active' : '')}>Mine</NavLink>
          <NavLink to="/forge"       className={({isActive}) => 'topnav-btn' + (isActive ? ' active' : '')}>Forge</NavLink>
          <NavLink to="/lobby"       className={({isActive}) => 'topnav-btn' + (isActive ? ' active' : '')}>Lobby</NavLink>
          <NavLink to="/collection"  className={({isActive}) => 'topnav-btn' + (isActive ? ' active' : '')}>Collection</NavLink>
          <NavLink to="/leaderboard" className={({isActive}) => 'topnav-btn' + (isActive ? ' active' : '')}>Ranks</NavLink>
        </nav>

        <div className="topbar-right">
          <div className="wallet-chip">
            <span>💎</span>
            <span className="wallet-amount">{Math.floor(balance).toLocaleString()}</span>
            <span className="wallet-sym">SVT</span>
          </div>
          <NotificationBell />
          <NavLink to={`/u/${user?.username}`} className="user-avatar">
            {user?.username?.[0]?.toUpperCase()}
          </NavLink>
          <button className="btn-ghost" onClick={handleLogout} title="Logout">⏻</button>
        </div>
      </header>

      <ActivityTicker />

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
