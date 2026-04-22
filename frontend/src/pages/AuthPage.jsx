import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useStore } from '../store';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useStore();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post(`/auth/${mode}`, { username, password });
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-screen">
      <div className="auth-logo">
        <span className="auth-logo-icon">🌊</span>
        <h1 className="auth-logo-title">NFT Sea</h1>
        <p className="auth-logo-sub">The Deep Ocean Collectibles Vault</p>
      </div>

      <form className="auth-box" onSubmit={submit} noValidate>
        <div className="auth-tabs">
          <button type="button" className={`auth-tab ${mode==='login'?'active':''}`} onClick={() => { setMode('login'); setError(''); }}>Login</button>
          <button type="button" className={`auth-tab ${mode==='register'?'active':''}`} onClick={() => { setMode('register'); setError(''); }}>Register</button>
        </div>

        <input className="auth-input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required />
        <input className="auth-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />

        {error && <p className="auth-error">{error}</p>}

        <button className="btn-auth" type="submit" disabled={loading}>
          {loading ? 'Loading…' : mode === 'login' ? 'Enter the Deep' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}
