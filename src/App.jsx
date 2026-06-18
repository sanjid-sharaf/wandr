import { useState, useMemo, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useTrips } from '@/hooks/useTrips';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { TripView } from '@/components/trip/TripView';
import { Toast } from '@/components/shared/Toast';
import { ThemePicker } from '@/components/shared/ThemePicker';
import { Icon } from '@/components/shared/Icon';

const Spinner = () => (
  <div className="loading-screen">
    <div className="spinner" />
    <div className="loading-text">Loading…</div>
  </div>
);

export const App = () => {
  const authUser = useAuth();
  const { trips, loading, saving, createTrip, saveTrip, deleteTrip, leaveTrip } = useTrips();
  const { theme, setTheme } = useTheme();
  const { toast, setToast, showToast } = useToast();

  const [activeTrip,      setActiveTrip]      = useState(null);
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Keep activeTrip in sync with live Firestore data
  const liveTrip = useMemo(() => {
    if (!activeTrip) return null;
    return trips.find((t) => t.id === activeTrip.id) ?? null;
  }, [activeTrip, trips]);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setActiveTrip(null);
  }, []);

  // Still resolving auth state
  if (authUser === undefined) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <nav className="nav">
        <div className="nav-brand">Wandr<span className="dot">.</span></div>
      </nav>
      <Spinner />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <nav className="nav">
        <div className="nav-brand" onClick={() => setActiveTrip(null)} style={{ cursor: 'pointer' }}>
          Wandr<span className="dot">.</span>
        </div>

        {liveTrip && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="map" size={14} />
            <span style={{ fontSize: 13, color: 'var(--ink2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {liveTrip.name}
            </span>
          </div>
        )}

        <div className="nav-actions">
          {saving && (
            <div className="saving-indicator">
              <div className="saving-dot" /><span>Saving…</span>
            </div>
          )}
          <button className="btn-icon" onClick={() => setShowThemePicker(true)} title="Theme" style={{ fontSize: 15 }}>
            🎨
          </button>
          {authUser && (
            <>
              {authUser.photoURL && <img className="user-avatar" src={authUser.photoURL} alt="" referrerPolicy="no-referrer" />}
              <span className="user-name">{authUser.displayName?.split(' ')[0]}</span>
              <button className="btn-icon" onClick={handleLogout} title="Sign out">
                <Icon name="logout" size={14} />
              </button>
            </>
          )}
        </div>
      </nav>

      {!authUser ? (
        <AuthScreen />
      ) : loading ? (
        <Spinner />
      ) : liveTrip ? (
        <TripView
          trip={liveTrip}
          currentUser={authUser}
          saveTrip={saveTrip}
          showToast={showToast}
          onBack={() => setActiveTrip(null)}
        />
      ) : (
        <Dashboard
          trips={trips}
          currentUser={authUser}
          saveTrip={saveTrip}
          createTrip={createTrip}
          deleteTrip={deleteTrip}
          leaveTrip={leaveTrip}
          onOpenTrip={setActiveTrip}
          showToast={showToast}
        />
      )}

      <Toast toast={toast} setToast={setToast} />
      {showThemePicker && (
        <ThemePicker theme={theme} setTheme={setTheme} onClose={() => setShowThemePicker(false)} />
      )}
    </div>
  );
};
