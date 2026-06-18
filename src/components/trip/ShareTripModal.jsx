import { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { inviteMember, removeMember } from '@/services/firestore';

export const ShareTripModal = ({ trip, currentUser, onClose, showToast }) => {
  const [email,    setEmail]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [revoking, setRevoking] = useState(null);

  const memberEmails = trip.memberEmails || [];
  const memberNames  = trip.memberNames  || [];
  const memberIds    = trip.memberIds    || [];

  const members = memberEmails.map((e, i) => ({
    email: e,
    name:  memberNames[i] || e,
    uid:   memberIds[i]   || null,
  }));

  const handleInvite = async () => {
    const e = email.trim().toLowerCase();
    if (!e.includes('@')) return;
    if (e === currentUser.email.toLowerCase()) { showToast("That's your own email", 'error'); return; }
    if (memberEmails.includes(e)) { showToast('Already a member', 'error'); return; }

    setSending(true);
    try {
      const profile = await inviteMember(trip, e);
      setEmail('');
      showToast(`${profile.displayName || e} added to trip`, 'success');
    } catch (err) {
      if (err.message === 'NO_ACCOUNT') showToast('No Wandr account found for that email', 'error');
      else showToast('Failed to add member', 'error');
    } finally { setSending(false); }
  };

  const handleRevoke = async (member) => {
    setRevoking(member.email);
    try {
      await removeMember(trip, member);
      showToast(`${member.name || member.email} removed`, 'success');
    } catch {
      showToast('Failed to remove member', 'error');
    } finally { setRevoking(null); }
  };

  return (
    <Modal
      title={`Share "${trip.name}"`}
      onClose={onClose}
      size={460}
      footer={<button className="btn btn-ghost" onClick={onClose}>Done</button>}
    >
      <div className="field">
        <label>Invite by email</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !sending && handleInvite()}
            placeholder="friend@email.com"
            type="email"
            autoFocus
          />
          <button className="btn btn-primary" onClick={handleInvite} disabled={sending || !email.trim()}>
            {sending ? '…' : 'Add'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6 }}>
          They must have a Wandr account. They'll see this trip immediately.
        </p>
      </div>

      {members.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
            Members ({members.length})
          </div>
          {members.map((m) => (
            <div
              key={m.email}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', background: 'var(--surface2)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
              }}
            >
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{m.name}</span>
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink3)' }}>{m.email}</span>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--rose)', borderColor: 'var(--rose)', opacity: revoking === m.email ? 0.5 : 0.8 }}
                onClick={() => handleRevoke(m)}
                disabled={!!revoking}
              >
                {revoking === m.email ? '…' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}

      {members.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 8 }}>No members yet. Add someone above.</p>
      )}
    </Modal>
  );
};
