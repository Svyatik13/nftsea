import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import { getSocket, disconnectSocket, api } from './lib/api';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import MarketPage from './pages/MarketPage';
import MinePage from './pages/MinePage';
import ForgePage from './pages/ForgePage';
import LobbyPage from './pages/LobbyPage';
import CollectionPage from './pages/CollectionPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';

function PrivateRoute({ children }) {
  const token = useStore(s => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { token, user, setBalance, setOnline, addNotification, prependActivity, adjustBalance, logout } = useStore();

  // Hydrate balance + notifications on mount/login
  useEffect(() => {
    if (!token || !user) return;

    api.get('/auth/me').then(r => setBalance(parseFloat(r.data.balance))).catch(() => {});
    api.get('/notifications/mine').then(r => {
      r.data.forEach(n => addNotification(n));
    }).catch(() => {});

    const socket = getSocket();

    socket.on('balance:update', ({ balance, delta }) => {
      if (balance !== undefined) setBalance(balance);
      if (delta !== undefined) adjustBalance(delta);
    });
    socket.on('online:count', ({ count }) => setOnline(count));
    socket.on('notification:new', (n) => addNotification({ ...n, read: false, created_at: new Date() }));
    socket.on('activity:new', (item) => prependActivity(item));
    socket.on('connect_error', () => {});

    return () => {
      socket.off('balance:update');
      socket.off('online:count');
      socket.off('notification:new');
      socket.off('activity:new');
      disconnectSocket();
    };
  }, [token]);

  if (!token) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<MarketPage />} />
          <Route path="/mine" element={<MinePage />} />
          <Route path="/forge" element={<ForgePage />} />
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/u/:username" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
