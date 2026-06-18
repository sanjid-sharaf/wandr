import { useState } from 'react';
import { signInWithGoogle } from '@/services/auth';

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.5 39.5 16.3 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.2-4.1 5.6l6.2 5.2C37 38.1 44 33 44 24c0-1.3-.1-2.6-.4-3.9z"/>
  </svg>
);

export const AuthScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleGoogle = async () => {
    setLoading(true); setError('');
    try {
      await signInWithGoogle();
    } catch {
      setError('Sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">Wandr<span className="dot">.</span></div>
        <p className="auth-tagline">Your personal trip planner — sign in to get started</p>
        <button className="btn-google" onClick={handleGoogle} disabled={loading}>
          {loading
            ? <div className="spinner" style={{ width: 18, height: 18 }} />
            : <GoogleLogo />}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>
        {error && <p style={{ color: 'var(--rose)', fontSize: 12, marginTop: 12 }}>{error}</p>}
        <p className="auth-note">Your trips are synced and private to your account.</p>
      </div>
    </div>
  );
};
