/* ─────────────────────────────────────────────
   Wandr — app.js  (complete rewrite)
   Clean invite → shared trip flow
───────────────────────────────────────────── */

const { initializeApp }              = window.firebaseApp;
const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = window.firebaseAuth;
const {
  getFirestore, collection, doc, query, where,
  onSnapshot, setDoc, deleteDoc, getDoc, getDocs,
  serverTimestamp, arrayUnion, arrayRemove, updateDoc
} = window.firebaseFirestore;

const firebaseConfig = {
  apiKey:            "AIzaSyDNFQ7QR8ND5ht7ZLVcMyXLPGAcXLNvEsc",
  authDomain:        "wandr-cba96.firebaseapp.com",
  projectId:         "wandr-cba96",
  storageBucket:     "wandr-cba96.firebasestorage.app",
  messagingSenderId: "121115293183",
  appId:             "1:121115293183:web:0ecd47bae79cc1a3ebe3ca",
  measurementId:     "G-YBNVB04ZFQ"
};

const fbApp = initializeApp(firebaseConfig);
const auth  = getAuth(fbApp);
const db    = getFirestore(fbApp);

const { useState, useEffect, useCallback, useMemo, useRef } = React;

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);

const TRIP_TYPES = [
  { value: 'road',     label: '🚗 Road Trip',  cls: 'type-road'     },
  { value: 'vacation', label: '🌴 Vacation',    cls: 'type-vacation' },
  { value: 'city',     label: '🏙️ City Break',  cls: 'type-city'     },
  { value: 'custom',   label: '✨ Custom',       cls: 'type-custom'   },
];

const CATEGORIES = [
  { value: 'restaurant', label: '🍽️ Restaurant', cls: 'cat-restaurant' },
  { value: 'cafe',       label: '☕ Cafe',        cls: 'cat-cafe'       },
  { value: 'bar',        label: '🍺 Bar',         cls: 'cat-bar'        },
  { value: 'park',       label: '🌿 Park',        cls: 'cat-park'       },
  { value: 'attraction', label: '🏛️ Attraction',  cls: 'cat-attraction' },
  { value: 'travel',     label: '🚌 Travel',      cls: 'cat-travel'     },
  { value: 'event',      label: '💃 Event',       cls: 'cat-event'      },
  { value: 'free',       label: '🎲 Free Time',   cls: 'cat-free'       },
];

const COLLECTION_TYPES = [
  { value: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { value: 'bar',        label: 'Bars',        icon: '🍺' },
  { value: 'cafe',       label: 'Cafes',       icon: '☕' },
  { value: 'park',       label: 'Parks',       icon: '🌿' },
  { value: 'attraction', label: 'Attractions', icon: '🏛️' },
  { value: 'event',      label: 'Events',      icon: '💃' },
];

const PERIODS = [
  { id: 'morning',   label: 'Morning',   range: '6am – 12pm' },
  { id: 'afternoon', label: 'Afternoon', range: '12pm – 6pm' },
  { id: 'evening',   label: 'Evening',   range: '6pm – late' },
];

const THEMES = [
  { id: 'dark',   label: 'Dark',     swatch: ['#0f1117','#6c7ff2'] },
  { id: 'light',  label: 'Light',    swatch: ['#f4f5f7','#4f63e8'] },
  { id: 'blue',   label: 'Midnight', swatch: ['#00277c','#38bdf8'] },
  { id: 'red',    label: 'Crimson',  swatch: ['#a60000','#f87171'] },
  { id: 'pink',   label: 'Rose',     swatch: ['#b90075','#f472b6'] },
  { id: 'green',  label: 'Forest',   swatch: ['#00601b','#4ade80'] },
  { id: 'sunset', label: 'Sunset',   swatch: ['#e26301','#f59e0b'] },
  { id: 'purple', label: 'Violet',   swatch: ['#6600ff','#a78bfa'] },
  { id: 'sand',   label: 'Sand',     swatch: ['#ffdfab','#b45309'] },
];

const catInfo      = (val) => CATEGORIES.find(c => c.value === val)  || CATEGORIES[4];
const tripTypeInfo = (val) => TRIP_TYPES.find(t => t.value === val)  || TRIP_TYPES[3];

/* ─────────────────────────────────────────────
   Firestore helpers
   
   ARCHITECTURE:
   /users/{uid}/trips/{tripId}       — owner's private trips
   /sharedTrips/{tripId}             — collaborative copy (created on first invite)
   /invites/{tripId}_{safeEmail}     — one doc per pending invite
   /userProfiles/{uid}               — email → uid lookup
───────────────────────────────────────────── */
const tripsCol     = (uid)          => collection(db, 'users', uid, 'trips');
const tripRef      = (uid, tripId)  => doc(db, 'users', uid, 'trips', tripId);
const sharedRef    = (tripId)       => doc(db, 'sharedTrips', tripId);
const inviteRef    = (tripId, email)=> doc(db, 'invites', `${tripId}_${email.replace(/[@.]/g, '_')}`);
const profileRef   = (uid)          => doc(db, 'userProfiles', uid);

const upsertProfile = (user) =>
  setDoc(profileRef(user.uid), {
    uid:         user.uid,
    email:       user.email.toLowerCase(),
    displayName: user.displayName || '',
    photoURL:    user.photoURL    || '',
  }, { merge: true });

/* ─────────────────────────────────────────────
   Date helpers
───────────────────────────────────────────── */
const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const daysBetween = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start + 'T00:00:00'), e = new Date(end + 'T00:00:00');
  return Math.max(0, Math.round((e - s) / 86400000) + 1);
};

const getDayLabel = (startDate, idx) => {
  if (!startDate) return `Day ${idx + 1}`;
  const d = new Date(startDate + 'T00:00:00');
  d.setDate(d.getDate() + idx);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

/* ─────────────────────────────────────────────
   Theme hook
───────────────────────────────────────────── */
const useTheme = () => {
  const [theme, setRaw] = useState(() => localStorage.getItem('wandr_theme') || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wandr_theme', theme);
  }, [theme]);
  return { theme, setTheme: setRaw };
};

/* ─────────────────────────────────────────────
   Icons
───────────────────────────────────────────── */
const Icon = ({ name, size = 16 }) => {
  const icons = {
    plus:        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    x:           <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    edit:        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
    back:        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
    map:         <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
    download:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    upload:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    link:        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    check:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    logout:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    share:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
    users:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    bell:        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    star:        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    starOutline: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  };
  return icons[name] || null;
};

/* ─────────────────────────────────────────────
   Toast
───────────────────────────────────────────── */
const Toast = ({ toast, setToast }) => {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.kind || 'success'}`}>
      {(toast.kind === 'success' || !toast.kind) && <Icon name="check" size={14} />}
      {toast.msg}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Modal
───────────────────────────────────────────── */
const Modal = ({ title, onClose, footer, children, size = 500 }) => {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: size }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn-icon" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

const ConfirmModal = ({ message, onConfirm, onClose, confirmLabel = 'Delete', danger = true }) => (
  <Modal title="Confirm" onClose={onClose}
    footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose(); }}>
          {confirmLabel}
        </button>
      </>
    }
  >
    <p style={{ color: 'var(--ink2)', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
  </Modal>
);

/* ─────────────────────────────────────────────
   Auth Screen
───────────────────────────────────────────── */
const AuthScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const handleGoogle = async () => {
    setLoading(true); setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
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
          {loading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : (
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.5 39.5 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.2-4.1 5.6l6.2 5.2C37 38.1 44 33 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
          )}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>
        {error && <p style={{ color: 'var(--rose)', fontSize: 12, marginTop: 12 }}>{error}</p>}
        <p className="auth-note">Your trips are synced and private to your account.</p>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Theme Picker
───────────────────────────────────────────── */
const ThemePicker = ({ theme, setTheme, onClose }) => (
  <Modal title="Choose Theme" onClose={onClose} size={380}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {THEMES.map(t => (
        <button key={t.id} onClick={() => { setTheme(t.id); onClose(); }} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          padding: '12px 8px', borderRadius: 'var(--radius-sm)',
          border: theme === t.id ? '2px solid var(--accent)' : '2px solid var(--border)',
          background: theme === t.id ? 'var(--accent-soft)' : 'var(--surface2)',
          cursor: 'pointer', transition: 'var(--transition)',
        }}>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: t.swatch[0], border: '1px solid rgba(255,255,255,0.08)' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.swatch[1] }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 500, color: theme === t.id ? 'var(--accent)' : 'var(--ink2)' }}>{t.label}</span>
        </button>
      ))}
    </div>
  </Modal>
);

/* ─────────────────────────────────────────────
   Share Trip Modal
   
   FLOW:
   1. Owner enters email
   2. sharedTrips doc created/updated (owner in memberUids, invitee NOT yet)
   3. Invite doc created at /invites/{tripId}_{safeEmail}
   4. Private trip updated with pendingInvites list (for display)
   
   REVOKE:
   1. Invite doc deleted
   2. Invitee removed from sharedTrips.memberUids (if they had accepted)
   3. If sharedTrips has no non-owner members and no pending invites → could clean up,
      but we keep the doc for simplicity (owner stays in memberUids)
───────────────────────────────────────────── */
const ShareTripModal = ({ trip, currentUser, onClose, showToast }) => {
  const [email,    setEmail]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [revoking, setRevoking] = useState(null); // email being revoked

  // Show all invited emails (pending + accepted) from the sharedTrip's invitedEmails list
  const pendingInvites  = trip.pendingInvites  || [];   // emails with pending invites
  const acceptedMembers = (trip.memberEmails   || []).filter(e => e !== currentUser.email.toLowerCase());

  const handleInvite = async () => {
    const e = email.trim().toLowerCase();
    if (!e.includes('@')) return;
    if (e === currentUser.email.toLowerCase()) { showToast("That's your own email", 'error'); return; }
    if (pendingInvites.includes(e))  { showToast('Already invited', 'error'); return; }
    if (acceptedMembers.includes(e)) { showToast('Already a member', 'error'); return; }
    setSending(true);
    try {
      // 1. Create/update sharedTrips doc — owner is member, invitee not yet
      const { _own, _shared, id: tripId, ...tripData } = trip;
      await setDoc(sharedRef(trip.id), {
        ...tripData,
        ownerId:        currentUser.uid,
        ownerEmail:     currentUser.email.toLowerCase(),
        // memberUids/memberEmails only contains ACCEPTED members + owner
        memberUids:     arrayUnion(currentUser.uid),
        memberEmails:   arrayUnion(currentUser.email.toLowerCase()),
        // pendingInvites tracks emails that have been invited but not yet accepted
        pendingInvites: arrayUnion(e),
        updatedAt:      serverTimestamp(),
      }, { merge: true });

      // 2. Create invite doc
      await setDoc(inviteRef(trip.id, e), {
        tripId:      trip.id,
        tripName:    trip.name,
        ownerUid:    currentUser.uid,
        ownerEmail:  currentUser.email.toLowerCase(),
        ownerName:   currentUser.displayName || currentUser.email,
        inviteeEmail:e,
        status:      'pending',
        createdAt:   serverTimestamp(),
      });

      // 3. Mirror pendingInvites on the private trip doc so ShareModal stays in sync
      await updateDoc(tripRef(currentUser.uid, trip.id), {
        pendingInvites: arrayUnion(e),
      });

      setEmail('');
      showToast(`Invite sent to ${e}`, 'success');
    } catch (err) {
      console.error('Invite error:', err);
      showToast('Failed to send invite. Check console.', 'error');
    }
    setSending(false);
  };

  const handleRevoke = async (memberEmail) => {
    setRevoking(memberEmail);
    try {
      // 1. Delete the invite doc (whether pending or already accepted)
      await deleteDoc(inviteRef(trip.id, memberEmail));

      // 2. Remove from sharedTrips: remove from memberUids/memberEmails AND pendingInvites
      //    We need their uid to remove from memberUids — query userProfiles
      const q = query(collection(db, 'userProfiles'), where('email', '==', memberEmail));
      const snap = await getDocs(q);
      const memberUid = snap.empty ? null : snap.docs[0].id;

      const sharedUpdate = {
        pendingInvites: arrayRemove(memberEmail),
        memberEmails:   arrayRemove(memberEmail),
        updatedAt:      serverTimestamp(),
      };
      if (memberUid) sharedUpdate.memberUids = arrayRemove(memberUid);
      await updateDoc(sharedRef(trip.id), sharedUpdate);

      // 3. Update private trip
      await updateDoc(tripRef(currentUser.uid, trip.id), {
        pendingInvites: arrayRemove(memberEmail),
      });

      showToast('Access removed', 'success');
    } catch (err) {
      console.error('Revoke error:', err);
      showToast('Failed to remove access', 'error');
    }
    setRevoking(null);
  };

  const Row = ({ emailAddr, label }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', background: 'var(--surface2)',
      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
    }}>
      <div>
        <span style={{ fontSize: 13, color: 'var(--ink2)' }}>{emailAddr}</span>
        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink3)' }}>{label}</span>
      </div>
      <button
        className="btn btn-ghost btn-sm"
        style={{ color: 'var(--rose)', borderColor: 'var(--rose)', opacity: revoking === emailAddr ? 0.5 : 0.8 }}
        onClick={() => handleRevoke(emailAddr)}
        disabled={revoking === emailAddr}
      >
        {revoking === emailAddr ? '…' : 'Remove'}
      </button>
    </div>
  );

  return (
    <Modal title={`Share "${trip.name}"`} onClose={onClose} size={460}
      footer={<button className="btn btn-ghost" onClick={onClose}>Done</button>}
    >
      <div className="field">
        <label>Invite by email</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !sending && handleInvite()}
            placeholder="friend@email.com"
            type="email"
            autoFocus
          />
          <button className="btn btn-primary" onClick={handleInvite} disabled={sending || !email.trim()}>
            {sending ? '…' : 'Invite'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6 }}>
          They'll see a pending invite when they sign in. They must accept to join.
        </p>
      </div>

      {(pendingInvites.length > 0 || acceptedMembers.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            People with access
          </div>
          {acceptedMembers.map(m => <Row key={m} emailAddr={m} label="✓ joined" />)}
          {pendingInvites.map(m => <Row key={m} emailAddr={m} label="⏳ pending" />)}
        </div>
      )}
    </Modal>
  );
};

/* ─────────────────────────────────────────────
   Pending Invites Banner
───────────────────────────────────────────── */
const InvitesBanner = ({ invites, onAccept, onDecline }) => {
  if (!invites.length) return null;
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="bell" size={13} /> Pending Invites ({invites.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {invites.map(inv => (
          <div key={inv.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            padding: '14px 18px', background: 'var(--surface)',
            border: '1px solid var(--accent)', borderRadius: 'var(--radius)',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{inv.tripName}</div>
              <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3 }}>
                Invited by {inv.ownerName || inv.ownerEmail}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--rose)', borderColor: 'var(--rose)' }} onClick={() => onDecline(inv)}>
                Decline
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => onAccept(inv)}>
                Accept
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   useData — all Firestore listeners + mutations
───────────────────────────────────────────── */
const useData = (userId, userEmail) => {
  const [ownTrips,    setOwnTrips]    = useState([]);
  const [sharedTrips, setSharedTrips] = useState([]);
  const [invites,     setInvites]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);

  /* ── Listeners ── */

  // Own private trips
  useEffect(() => {
    if (!userId) return;
    return onSnapshot(tripsCol(userId), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data(), _own: true }));
      data.sort((a, b) => {
        if (a.createdAt && b.createdAt) return a.createdAt.seconds - b.createdAt.seconds;
        return (a.name || '').localeCompare(b.name || '');
      });
      setOwnTrips(data);
      setLoading(false);
    });
  }, [userId]);

  // Shared trips where user is an accepted member
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'sharedTrips'), where('memberUids', 'array-contains', userId));
    return onSnapshot(q, snap => {
      setSharedTrips(snap.docs.map(d => ({ id: d.id, ...d.data(), _shared: true })));
    });
  }, [userId]);

  // Pending invites addressed to this user's email
  useEffect(() => {
    if (!userEmail) return;
    const q = query(
      collection(db, 'invites'),
      where('inviteeEmail', '==', userEmail.toLowerCase()),
      where('status', '==', 'pending')
    );
    return onSnapshot(q, snap => {
      setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [userEmail]);

  /* ── Trip mutations ── */

  const saveTrip = useCallback(async (trip) => {
    if (!userId) return;
    setSaving(true);
    try {
      const { id, _own, _shared, ...data } = trip;
      if (_shared) {
        // Write to sharedTrips (collaborative copy)
        await setDoc(sharedRef(id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        // Write to private trips
        await setDoc(tripRef(userId, id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
        // Also keep sharedTrips in sync if this trip has been shared
        const sSnap = await getDoc(sharedRef(id));
        if (sSnap.exists()) {
          await setDoc(sharedRef(id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
        }
      }
    } finally { setSaving(false); }
  }, [userId]);

  const removeTrip = useCallback(async (trip) => {
    if (!userId) return;
    if (trip._shared) {
      // Leave the shared trip (remove self from memberUids)
      await updateDoc(sharedRef(trip.id), {
        memberUids:   arrayRemove(userId),
        memberEmails: arrayRemove(userEmail.toLowerCase()),
        updatedAt:    serverTimestamp(),
      });
    } else {
      // Delete private trip
      await deleteDoc(tripRef(userId, trip.id));
      // If it had a sharedTrip doc and owner is deleting, delete that too
      const sSnap = await getDoc(sharedRef(trip.id));
      if (sSnap.exists() && sSnap.data().ownerId === userId) {
        await deleteDoc(sharedRef(trip.id));
      }
    }
  }, [userId, userEmail]);

  /* ── Invite mutations ── */

  // Accept: add self to sharedTrips memberUids, delete invite, remove from pendingInvites
  const acceptInvite = useCallback(async (invite) => {
    if (!userId || !userEmail) return;
    // sharedTrips doc is guaranteed to exist (created when invite was sent)
    await updateDoc(sharedRef(invite.tripId), {
      memberUids:     arrayUnion(userId),
      memberEmails:   arrayUnion(userEmail.toLowerCase()),
      pendingInvites: arrayRemove(userEmail.toLowerCase()),
      updatedAt:      serverTimestamp(),
    });
    await deleteDoc(doc(db, 'invites', invite.id));
    // Sync pendingInvites on owner's private trip
    try {
      await updateDoc(tripRef(invite.ownerUid, invite.tripId), {
        pendingInvites: arrayRemove(userEmail.toLowerCase()),
      });
    } catch { /* owner's private trip write may fail if we don't have access — acceptable */ }
  }, [userId, userEmail]);

  // Decline: just delete the invite doc + remove from pendingInvites
  const declineInvite = useCallback(async (invite) => {
    await deleteDoc(doc(db, 'invites', invite.id));
    // Remove from sharedTrips pendingInvites list
    try {
      await updateDoc(sharedRef(invite.tripId), {
        pendingInvites: arrayRemove(userEmail.toLowerCase()),
        updatedAt:      serverTimestamp(),
      });
    } catch { /* sharedTrip may not exist if owner deleted it */ }
  }, [userEmail]);

  return {
    ownTrips, sharedTrips, invites,
    loading, saving,
    saveTrip, removeTrip,
    acceptInvite, declineInvite,
  };
};

/* ─────────────────────────────────────────────
   Form Modals
───────────────────────────────────────────── */
const TripFormModal = ({ trip, onSave, onClose }) => {
  const [form, setForm] = useState({
    name:      trip?.name      || '',
    startDate: trip?.startDate || '',
    endDate:   trip?.endDate   || '',
    type:      trip?.type      || 'vacation',
    notes:     trip?.notes     || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim() && form.startDate && form.endDate && form.endDate >= form.startDate;

  const handleSave = () => {
    if (!valid) return;
    onSave({
      id:               trip?.id             || uid(),
      events:           trip?.events         || [],
      collections:      trip?.collections    || {},
      customCollections:trip?.customCollections || [],
      pendingInvites:   trip?.pendingInvites  || [],
      memberEmails:     trip?.memberEmails    || [],
      memberUids:       trip?.memberUids      || [],
      ...form,
      name: form.name.trim(),
    });
  };

  return (
    <Modal title={trip?.id ? 'Edit Trip' : 'New Trip'} onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!valid}>
            {trip?.id ? 'Save Changes' : 'Create Trip'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Trip Name</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Summer in Italy" autoFocus />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Start Date</label>
          <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </div>
        <div className="field">
          <label>End Date</label>
          <input type="date" value={form.endDate} min={form.startDate} onChange={e => set('endDate', e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Trip Type</label>
        <select value={form.type} onChange={e => set('type', e.target.value)}>
          {TRIP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Notes <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any trip-wide notes…" rows={2} />
      </div>
    </Modal>
  );
};

const EventFormModal = ({ event, dayIndex, onSave, onClose }) => {
  const [form, setForm] = useState({
    title:     event?.title     || '',
    period:    event?.period    || 'morning',
    startTime: event?.startTime || '',
    endTime:   event?.endTime   || '',
    category:  event?.category  || 'attraction',
    notes:     event?.notes     || '',
    link:      event?.link      || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.title.trim();
  const handleSave = () => {
    if (!valid) return;
    onSave({ id: event?.id || uid(), dayIndex, ...form, title: form.title.trim() });
  };
  return (
    <Modal title={event?.id ? 'Edit Event' : 'Add Event'} onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!valid}>
            {event?.id ? 'Save Changes' : 'Add Event'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Title</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Visit the Colosseum" autoFocus />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Period</label>
          <select value={form.period} onChange={e => set('period', e.target.value)}>
            {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Start Time <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
          <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
        </div>
        <div className="field">
          <label>End Time <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
          <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Notes <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any details…" rows={2} />
      </div>
      <div className="field">
        <label>Link <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
        <input value={form.link} onChange={e => set('link', e.target.value)} placeholder="Google Maps, website URL…" />
      </div>
    </Modal>
  );
};

const PlaceFormModal = ({ place, defaultCategory, customCollections, onSave, onClose }) => {
  const allOptions = [
    ...COLLECTION_TYPES,
    ...(customCollections || []).map(c => ({ value: c.id, label: c.name, icon: '📁' })),
  ];
  const [form, setForm] = useState({
    name:     place?.name     || '',
    category: place?.category || defaultCategory || 'restaurant',
    location: place?.location || '',
    notes:    place?.notes    || '',
    link:     place?.link     || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim();
  const handleSave = () => {
    if (!valid) return;
    onSave({ id: place?.id || uid(), ...form, name: form.name.trim() });
  };
  return (
    <Modal title={place ? 'Edit Place' : 'Add to Collection'} onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!valid}>
            {place ? 'Save Changes' : 'Add Place'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Place Name</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Trevi Fountain" autoFocus />
      </div>
      <div className="field">
        <label>Collection</label>
        <select value={form.category} onChange={e => set('category', e.target.value)}>
          {allOptions.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Location / Address <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
        <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Piazza di Trevi, Rome" />
      </div>
      <div className="field">
        <label>Notes <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Opening hours, tips…" rows={2} />
      </div>
      <div className="field">
        <label>Link <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
        <input value={form.link} onChange={e => set('link', e.target.value)} placeholder="Google Maps or website URL" />
      </div>
    </Modal>
  );
};

const CustomCollectionModal = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const handleSave = () => { if (!name.trim()) return; onSave({ id: uid(), name: name.trim() }); };
  return (
    <Modal title="New Custom Collection" onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim()}>Create</button>
        </>
      }
    >
      <div className="field">
        <label>Collection Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nightlife, Shopping…" autoFocus onKeyDown={e => e.key === 'Enter' && handleSave()} />
      </div>
    </Modal>
  );
};

/* ─────────────────────────────────────────────
   Dashboard
───────────────────────────────────────────── */
const Dashboard = ({ ownTrips, sharedTrips, invites, currentUser, saveTrip, removeTrip, acceptInvite, declineInvite, onOpenTrip, showToast }) => {
  const [showForm,      setShowForm]      = useState(false);
  const [editTrip,      setEditTrip]      = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [shareTrip,     setShareTrip]     = useState(null);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ trips: ownTrips }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'wandr-backup.json' });
    a.click();
    showToast('Backup exported', 'success');
  };

  const handleImport = () => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' });
    input.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async ev => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!Array.isArray(data.trips)) throw new Error();
          for (const t of data.trips) await saveTrip(t);
          showToast('Backup imported', 'success');
        } catch { showToast('Invalid backup file', 'error'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const now = new Date();
  const categorise = list => {
    const active   = list.filter(t => t.startDate && t.endDate && new Date(t.startDate+'T00:00:00') <= now && now <= new Date(t.endDate+'T00:00:00'));
    const upcoming = list.filter(t => t.startDate && new Date(t.startDate+'T00:00:00') > now);
    const past     = list.filter(t => t.endDate && new Date(t.endDate+'T00:00:00') < now && !active.includes(t));
    const none     = list.filter(t => !t.startDate);
    return [
      ...(active.length   ? [{ label: '✈️ Active',   items: active   }] : []),
      ...(upcoming.length ? [{ label: '🗓️ Upcoming', items: upcoming }] : []),
      ...(past.length     ? [{ label: '📁 Past',     items: past     }] : []),
      ...(none.length     ? [{ label: 'All Trips',   items: none     }] : []),
    ];
  };

  const renderTrip = trip => {
    const ti          = tripTypeInfo(trip.type);
    const days        = daysBetween(trip.startDate, trip.endDate);
    const evCount     = (trip.events || []).length;
    const placeCount  = Object.values(trip.collections || {}).reduce((s, a) => s + a.length, 0);
    const isShared    = !!trip._shared;
    const memberCount = ((trip.memberEmails || []).filter(e => e !== currentUser?.email?.toLowerCase())).length;

    return (
      <div key={trip.id} className="card trip-card" onClick={() => onOpenTrip(trip)} role="button" tabIndex={0}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`trip-type-badge ${ti.cls}`}>{ti.label}</span>
            {isShared && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--teal)', background: 'rgba(45,212,191,0.12)', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase' }}>
                Shared
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
            {!isShared && (
              <button className="btn-icon" title="Share" onClick={() => setShareTrip(trip)}>
                <Icon name="share" size={13} />
              </button>
            )}
            {!isShared && (
              <button className="btn-icon" title="Edit" onClick={() => { setEditTrip(trip); setShowForm(true); }}>
                <Icon name="edit" size={13} />
              </button>
            )}
            <button className="btn-icon" title={isShared ? 'Leave' : 'Delete'} onClick={() => setConfirmDelete(trip)}>
              <Icon name="trash" size={13} />
            </button>
          </div>
        </div>

        <div className="trip-card-title">{trip.name}</div>
        {isShared && <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 2 }}>by {trip.ownerEmail}</div>}
        <div className="trip-card-dates">
          {trip.startDate ? `${formatDate(trip.startDate)} → ${formatDate(trip.endDate)}` : 'No dates set'}
        </div>
        <div className="trip-card-meta">
          <div className="trip-meta-item"><strong>{days}</strong>days</div>
          <div className="trip-meta-item"><strong>{evCount}</strong>events</div>
          <div className="trip-meta-item"><strong>{placeCount}</strong>places</div>
          {memberCount > 0 && (
            <div className="trip-meta-item"><strong>{memberCount}</strong>{memberCount === 1 ? 'collab' : 'collabs'}</div>
          )}
        </div>
      </div>
    );
  };

  const ownGrouped    = categorise(ownTrips);
  const sharedGrouped = categorise(sharedTrips);
  const totalTrips    = ownTrips.length + sharedTrips.length;

  return (
    <div className="main">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Your Trips</h1>
          <p className="page-subtitle">{totalTrips} trip{totalTrips !== 1 ? 's' : ''} planned</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleImport}><Icon name="upload" size={13} /> Import</button>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}><Icon name="download" size={13} /> Export</button>
          <button className="btn btn-primary" onClick={() => { setEditTrip(null); setShowForm(true); }}>
            <Icon name="plus" size={14} /> New Trip
          </button>
        </div>
      </div>

      <InvitesBanner
        invites={invites}
        onAccept={async inv => {
          try { await acceptInvite(inv); showToast(`Joined "${inv.tripName}"`, 'success'); }
          catch (e) { console.error(e); showToast('Failed to accept invite', 'error'); }
        }}
        onDecline={async inv => {
          await declineInvite(inv);
          showToast('Invite declined', 'success');
        }}
      />

      {totalTrips === 0 ? (
        <div className="empty-state">
          <div className="icon">🗺️</div>
          <h3>No trips yet</h3>
          <p>Create your first trip to start planning</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Icon name="plus" size={14} /> Create Trip
          </button>
        </div>
      ) : (
        <>
          {ownGrouped.map(g => (
            <div key={g.label} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                {g.label}
              </div>
              <div className="trip-grid">{g.items.map(renderTrip)}</div>
            </div>
          ))}

          {sharedTrips.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="users" size={12} /> Shared with me
              </div>
              <div className="trip-grid">{sharedGrouped.flatMap(g => g.items).map(renderTrip)}</div>
            </div>
          )}

          <div className="trip-grid">
            <div className="card trip-card-new" onClick={() => { setEditTrip(null); setShowForm(true); }}>
              <Icon name="plus" size={24} /><span>Plan a new trip</span>
            </div>
          </div>
        </>
      )}

      {showForm && (
        <TripFormModal
          trip={editTrip}
          onSave={async t => {
            await saveTrip({ ...t, createdAt: editTrip?.createdAt || null });
            showToast(editTrip ? 'Trip updated' : 'Trip created!', 'success');
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          message={
            confirmDelete._shared
              ? `Leave "${confirmDelete.name}"? You'll lose access to this shared trip.`
              : `Delete "${confirmDelete.name}" and all its data? This cannot be undone.`
          }
          confirmLabel={confirmDelete._shared ? 'Leave' : 'Delete'}
          onConfirm={async () => {
            await removeTrip(confirmDelete);
            showToast(confirmDelete._shared ? 'Left trip' : 'Trip deleted', 'success');
          }}
          onClose={() => setConfirmDelete(null)}
        />
      )}

      {shareTrip && (
        <ShareTripModal
          trip={shareTrip}
          currentUser={currentUser}
          onClose={() => setShareTrip(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   ItineraryView
───────────────────────────────────────────── */
const ItineraryView = ({ trip, saveTrip, showToast }) => {
  const totalDays   = daysBetween(trip.startDate, trip.endDate) || 1;
  const [activeDay, setActiveDay] = useState(0);
  const [showForm,  setShowForm]  = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [defPeriod, setDefPeriod] = useState('morning');

  const dayEvents = useMemo(
    () => (trip.events || []).filter(e => e.dayIndex === activeDay),
    [trip.events, activeDay]
  );

  const byPeriod = useMemo(() => {
    const map = {}; PERIODS.forEach(p => { map[p.id] = []; });
    dayEvents.forEach(e => { if (map[e.period]) map[e.period].push(e); });
    return map;
  }, [dayEvents]);

  const fmtTime = t => {
    if (!t) return '';
    const [h, m] = t.split(':'); const hr = parseInt(h);
    return `${hr === 0 ? 12 : hr > 12 ? hr - 12 : hr}:${m}${hr >= 12 ? 'pm' : 'am'}`;
  };

  const mutateEvents = evs => saveTrip({ ...trip, events: evs });

  const handleSave = async ev => {
    const evs = trip.events || [];
    await mutateEvents(editEvent ? evs.map(e => e.id === ev.id ? ev : e) : [...evs, ev]);
    showToast(editEvent ? 'Event updated' : 'Event added', 'success');
    setShowForm(false); setEditEvent(null);
  };

  const handleDelete = async evId => {
    await mutateEvents((trip.events || []).filter(e => e.id !== evId));
    showToast('Event removed', 'success');
  };

  const openAdd = period => { setDefPeriod(period); setEditEvent(null); setShowForm(true); };

  return (
    <div className="planner-layout">
      <aside className="sidebar">
        <div className="card day-nav">
          <div className="day-nav-header"><span className="day-nav-title">Days</span></div>
          <div className="day-list">
            {Array.from({ length: totalDays }, (_, i) => (
              <div key={i} className={`day-item ${i === activeDay ? 'active' : ''}`} onClick={() => setActiveDay(i)}>
                <div>
                  <div className="day-item-label">Day {i + 1}</div>
                  <div className="day-item-date">{getDayLabel(trip.startDate, i)}</div>
                </div>
                <span className="event-count">{(trip.events || []).filter(e => e.dayIndex === i).length}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="day-view">
        <div className="day-view-header">
          <div>
            <div className="day-view-title">Day {activeDay + 1} — {getDayLabel(trip.startDate, activeDay)}</div>
            <div className="day-view-subtitle">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled</div>
          </div>
          <button className="btn btn-primary" onClick={() => openAdd('morning')}>
            <Icon name="plus" size={14} /> Add Event
          </button>
        </div>

        <div className="time-periods">
          {PERIODS.map(period => {
            const pevents = byPeriod[period.id] || [];
            return (
              <div key={period.id} className="period-section">
                <div className="period-header">
                  <span className="period-label">{period.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{period.range}</span>
                  <div className="period-line" />
                </div>
                <div className="events-list">
                  {pevents.length === 0 && (
                    <button className="add-event-btn" onClick={() => openAdd(period.id)}>
                      <Icon name="plus" size={13} /> Add {period.label.toLowerCase()} event
                    </button>
                  )}
                  {pevents.map(ev => {
                    const cat = catInfo(ev.category);
                    return (
                      <div key={ev.id} className="card event-card">
                        <div className="event-time-col">
                          {ev.startTime
                            ? <><div style={{ fontWeight: 500 }}>{fmtTime(ev.startTime)}</div>{ev.endTime && <div style={{ color: 'var(--ink3)' }}>{fmtTime(ev.endTime)}</div>}</>
                            : <div style={{ color: 'var(--ink3)' }}>—</div>}
                        </div>
                        <div className="event-body">
                          <div className="event-title">{ev.title}</div>
                          <div className="event-meta">
                            <span className={`cat-badge ${cat.cls}`}>{cat.label}</span>
                          </div>
                          {ev.notes && <div className="event-notes">{ev.notes}</div>}
                          {ev.link && <a href={ev.link} target="_blank" rel="noopener noreferrer" className="event-link">🔗 Open link</a>}
                        </div>
                        <div className="event-actions">
                          <button className="btn-icon" onClick={() => { setEditEvent(ev); setShowForm(true); }}><Icon name="edit" size={13} /></button>
                          <button className="btn-icon" onClick={() => setDeleting(ev.id)}><Icon name="trash" size={13} /></button>
                        </div>
                      </div>
                    );
                  })}
                  {pevents.length > 0 && (
                    <button className="add-event-btn" onClick={() => openAdd(period.id)}>
                      <Icon name="plus" size={13} /> Add another
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && (
        <EventFormModal
          event={editEvent || { period: defPeriod }}
          dayIndex={activeDay}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditEvent(null); }}
        />
      )}
      {deleting && (
        <ConfirmModal
          message="Remove this event from your itinerary?"
          confirmLabel="Remove"
          onConfirm={() => handleDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   CollectionsView
───────────────────────────────────────────── */
const CollectionsView = ({ trip, saveTrip, showToast }) => {
  const [showPlaceForm,      setShowPlaceForm]      = useState(false);
  const [editPlace,          setEditPlace]          = useState(null);
  const [defaultCat,         setDefaultCat]         = useState('restaurant');
  const [confirmDeletePlace, setConfirmDeletePlace] = useState(null);
  const [confirmDeleteCol,   setConfirmDeleteCol]   = useState(null);
  const [importText,         setImportText]         = useState('');
  const [importCat,          setImportCat]          = useState('restaurant');
  const [showCustomModal,    setShowCustomModal]    = useState(false);
  const [colTab,             setColTab]             = useState('all');

  const collections       = trip.collections       || {};
  const customCollections = trip.customCollections || [];
  const allColTypes = [
    ...COLLECTION_TYPES,
    ...customCollections.map(c => ({ value: c.id, label: c.name, icon: '📁', isCustom: true })),
  ];

  const mutateCol = (newCol, newCustom) =>
    saveTrip({ ...trip, collections: newCol, customCollections: newCustom ?? trip.customCollections ?? [] });

  const handleQuickAdd = async () => {
    const text = importText.trim(); if (!text) return;
    const isLink = text.startsWith('http');
    const place = { id: uid(), name: isLink ? 'Saved Place' : text, category: importCat, location: '', notes: '', link: isLink ? text : '', favorite: false };
    await mutateCol({ ...collections, [importCat]: [...(collections[importCat] || []), place] });
    showToast('Place added', 'success'); setImportText('');
  };

  const handleSavePlace = async place => {
    const isEdit = !!editPlace; const oldCat = editPlace?.category;
    let newCol = { ...collections };
    if (isEdit && oldCat && oldCat !== place.category)
      newCol[oldCat] = (newCol[oldCat] || []).filter(p => p.id !== place.id);
    if (isEdit) {
      newCol[place.category] = (newCol[place.category] || []).map(p => p.id === place.id ? { ...p, ...place } : p);
      if (!newCol[place.category].find(p => p.id === place.id))
        newCol[place.category] = [...(newCol[place.category] || []), { ...place, favorite: false }];
    } else {
      newCol[place.category] = [...(newCol[place.category] || []), { ...place, favorite: false }];
    }
    await mutateCol(newCol);
    showToast(isEdit ? 'Place updated' : 'Place added', 'success');
    setShowPlaceForm(false); setEditPlace(null);
  };

  const handleDeletePlace = async (placeId, category) => {
    await mutateCol({ ...collections, [category]: (collections[category] || []).filter(p => p.id !== placeId) });
    showToast('Place removed', 'success');
  };

  const handleToggleFav = async (placeId, category) => {
    await mutateCol({ ...collections, [category]: (collections[category] || []).map(p => p.id === placeId ? { ...p, favorite: !p.favorite } : p) });
  };

  const handleDeleteCustomCol = async colId => {
    const newCustom = customCollections.filter(c => c.id !== colId);
    const newCol = { ...collections }; delete newCol[colId];
    await mutateCol(newCol, newCustom);
    showToast('Collection deleted', 'success');
  };

  const favorites = allColTypes.flatMap(ct =>
    (collections[ct.value] || []).filter(p => p.favorite).map(p => ({ ...p, collectionName: ct.label, collectionIcon: ct.icon }))
  );

  const openAdd = cat => { setDefaultCat(cat); setEditPlace(null); setShowPlaceForm(true); };

  const PlaceCard = ({ place, showColLabel = false }) => (
    <div className="card place-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="place-card-name">{place.name}</div>
          {showColLabel && <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{place.collectionIcon} {place.collectionName}</div>}
        </div>
        <button className={`favorite-btn ${place.favorite ? 'active' : ''}`} onClick={() => handleToggleFav(place.id, place.category)}>
          <Icon name={place.favorite ? 'star' : 'starOutline'} size={14} />
        </button>
      </div>
      {place.location && <div className="place-card-loc">📍 {place.location}</div>}
      {place.notes    && <div className="place-card-notes">{place.notes}</div>}
      <div className="place-card-footer">
        {place.link
          ? <a href={place.link} target="_blank" rel="noopener noreferrer" className="event-link"><Icon name="link" size={11} /> Open link</a>
          : <span />}
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-icon" onClick={() => { setEditPlace(place); setDefaultCat(place.category); setShowPlaceForm(true); }}>
            <Icon name="edit" size={13} />
          </button>
          <button className="btn-icon" onClick={() => setConfirmDeletePlace({ id: place.id, category: place.category })}>
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="collections-view">
      <div className="import-box">
        <div className="import-box-title">⚡ Quick Add — paste a place name or Google Maps link</div>
        <div className="import-row">
          <input
            value={importText}
            onChange={e => setImportText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
            placeholder="e.g. Colosseum, Rome  or  https://maps.google.com/…"
          />
          <select value={importCat} onChange={e => setImportCat(e.target.value)} style={{ width: 140 }}>
            {allColTypes.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={handleQuickAdd} disabled={!importText.trim()}>Add</button>
        </div>
      </div>

      <div className="view-tabs">
        <button className={`view-tab ${colTab === 'all' ? 'active' : ''}`} onClick={() => setColTab('all')}>📌 All Collections</button>
        <button className={`view-tab ${colTab === 'favorites' ? 'active' : ''}`} onClick={() => setColTab('favorites')}>
          ⭐ Favorites {favorites.length > 0 && <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.7 }}>({favorites.length})</span>}
        </button>
      </div>

      {colTab === 'favorites' && (
        favorites.length === 0
          ? <div className="empty-state"><div className="icon">⭐</div><h3>No favorites yet</h3><p>Star any place to add it here</p></div>
          : <div className="col-grid">{favorites.map(p => <PlaceCard key={p.id} place={p} showColLabel />)}</div>
      )}

      {colTab === 'all' && (
        <div>
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCustomModal(true)}>
              <Icon name="plus" size={12} /> New Custom Collection
            </button>
          </div>
          {allColTypes.map(ct => {
            const items = collections[ct.value] || [];
            return (
              <div key={ct.value} className="collection-section">
                <div className="collection-section-header">
                  <div className="collection-section-title">
                    <span>{ct.icon}</span> {ct.label}
                    <span style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 400 }}>({items.length})</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openAdd(ct.value)}>
                      <Icon name="plus" size={12} /> Add
                    </button>
                    {ct.isCustom && (
                      <button className="btn-icon" onClick={() => setConfirmDeleteCol(ct.value)}>
                        <Icon name="trash" size={13} />
                      </button>
                    )}
                  </div>
                </div>
                {items.length === 0
                  ? <div style={{ color: 'var(--ink3)', fontSize: 13, padding: '8px 0 4px' }}>
                      No {ct.label.toLowerCase()} yet.{' '}
                      <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => openAdd(ct.value)}>Add one →</span>
                    </div>
                  : <div className="col-grid">{items.map(p => <PlaceCard key={p.id} place={p} />)}</div>
                }
              </div>
            );
          })}
        </div>
      )}

      {showPlaceForm && (
        <PlaceFormModal
          place={editPlace}
          defaultCategory={defaultCat}
          customCollections={customCollections}
          onSave={handleSavePlace}
          onClose={() => { setShowPlaceForm(false); setEditPlace(null); }}
        />
      )}
      {confirmDeletePlace && (
        <ConfirmModal
          message="Remove this place from your collection?"
          confirmLabel="Remove"
          onConfirm={() => handleDeletePlace(confirmDeletePlace.id, confirmDeletePlace.category)}
          onClose={() => setConfirmDeletePlace(null)}
        />
      )}
      {confirmDeleteCol && (
        <ConfirmModal
          message="Delete this custom collection and all its places? This cannot be undone."
          onConfirm={() => handleDeleteCustomCol(confirmDeleteCol)}
          onClose={() => setConfirmDeleteCol(null)}
        />
      )}
      {showCustomModal && (
        <CustomCollectionModal
          onSave={async col => {
            await saveTrip({ ...trip, customCollections: [...customCollections, col] });
            showToast(`Collection "${col.name}" created!`, 'success');
            setShowCustomModal(false);
          }}
          onClose={() => setShowCustomModal(false)}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   TripView
───────────────────────────────────────────── */
const TripView = ({ trip, currentUser, saveTrip, showToast, onBack }) => {
  const [tab,          setTab]          = useState('itinerary');
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [showShare,    setShowShare]    = useState(false);

  if (!trip) return null;

  const ti          = tripTypeInfo(trip.type);
  const isShared    = !!trip._shared;
  const isOwner     = trip.ownerId === currentUser?.uid || !isShared;
  const memberCount = ((trip.memberEmails || []).filter(e => e !== currentUser?.email?.toLowerCase())).length;

  return (
    <div className="main">
      <button className="back-btn" onClick={onBack}><Icon name="back" size={14} /> All Trips</button>

      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className={`trip-type-badge ${ti.cls}`}>{ti.label}</span>
            {isShared && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--teal)', background: 'rgba(45,212,191,0.12)', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase' }}>
                Shared by {trip.ownerEmail}
              </span>
            )}
            {!isShared && memberCount > 0 && (
              <span style={{ fontSize: 11, color: 'var(--ink3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="users" size={12} /> {memberCount} collaborator{memberCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <h1 className="page-title">{trip.name}</h1>
          {trip.startDate && (
            <p className="page-subtitle">
              {formatDate(trip.startDate)} → {formatDate(trip.endDate)} · {daysBetween(trip.startDate, trip.endDate)} days
            </p>
          )}
          {trip.notes && <p style={{ marginTop: 6, fontSize: 13, color: 'var(--ink3)' }}>{trip.notes}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isOwner && !isShared && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowShare(true)}>
              <Icon name="share" size={13} /> Share
            </button>
          )}
          {isOwner && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowEditTrip(true)}>
              <Icon name="edit" size={13} /> Edit Trip
            </button>
          )}
        </div>
      </div>

      <div className="view-tabs">
        <button className={`view-tab ${tab === 'itinerary' ? 'active' : ''}`} onClick={() => setTab('itinerary')}>📅 Itinerary</button>
        <button className={`view-tab ${tab === 'collections' ? 'active' : ''}`} onClick={() => setTab('collections')}>📌 Collections</button>
      </div>

      {tab === 'itinerary'   && <ItineraryView   trip={trip} saveTrip={saveTrip} showToast={showToast} />}
      {tab === 'collections' && <CollectionsView trip={trip} saveTrip={saveTrip} showToast={showToast} />}

      {showEditTrip && (
        <TripFormModal
          trip={trip}
          onSave={async t => { await saveTrip(t); showToast('Trip updated', 'success'); setShowEditTrip(false); }}
          onClose={() => setShowEditTrip(false)}
        />
      )}
      {showShare && (
        <ShareTripModal
          trip={trip}
          currentUser={currentUser}
          onClose={() => setShowShare(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   App Root
───────────────────────────────────────────── */
const App = () => {
  const [authUser,        setAuthUser]        = useState(undefined); // undefined = loading
  const [activeTrip,      setActiveTrip]      = useState(null);
  const [toast,           setToast]           = useState(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const { theme, setTheme } = useTheme();

  const showToast = useCallback((msg, kind = 'success') => setToast({ msg, kind }), []);

  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      if (user) {
        await upsertProfile(user);
        setAuthUser(user);
      } else {
        setAuthUser(null);
      }
    });
  }, []);

  const { ownTrips, sharedTrips, invites, loading, saving, saveTrip, removeTrip, acceptInvite, declineInvite } =
    useData(authUser?.uid, authUser?.email);

  // Keep activeTrip in sync with live Firestore data
  const liveTrip = useMemo(() => {
    if (!activeTrip) return null;
    return [...ownTrips, ...sharedTrips].find(t => t.id === activeTrip.id) ?? null;
  }, [activeTrip, ownTrips, sharedTrips]);

  const handleLogout = async () => { await signOut(auth); setActiveTrip(null); };

  // Initial load screen
  if (authUser === undefined) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <nav className="nav"><div className="nav-brand">Wandr<span className="dot">.</span></div></nav>
      <div className="loading-screen"><div className="spinner" /><div className="loading-text">Loading…</div></div>
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
          {invites.length > 0 && !liveTrip && (
            <div style={{ fontSize: 11, fontWeight: 600, background: 'var(--accent)', color: '#fff', borderRadius: 99, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="bell" size={11} /> {invites.length}
            </div>
          )}
          <button className="btn-icon" onClick={() => setShowThemePicker(true)} title="Theme" style={{ fontSize: 15 }}>🎨</button>
          {authUser && (
            <>
              {authUser.photoURL && <img className="user-avatar" src={authUser.photoURL} alt="" />}
              <span className="user-name">{authUser.displayName?.split(' ')[0]}</span>
              <button className="btn-icon" onClick={handleLogout} title="Sign out"><Icon name="logout" size={14} /></button>
            </>
          )}
        </div>
      </nav>

      {!authUser ? (
        <AuthScreen />
      ) : loading ? (
        <div className="loading-screen"><div className="spinner" /><div className="loading-text">Loading your trips…</div></div>
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
          ownTrips={ownTrips}
          sharedTrips={sharedTrips}
          invites={invites}
          currentUser={authUser}
          saveTrip={saveTrip}
          removeTrip={removeTrip}
          acceptInvite={acceptInvite}
          declineInvite={declineInvite}
          onOpenTrip={setActiveTrip}
          showToast={showToast}
        />
      )}

      <Toast toast={toast} setToast={setToast} />
      {showThemePicker && <ThemePicker theme={theme} setTheme={setTheme} onClose={() => setShowThemePicker(false)} />}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);