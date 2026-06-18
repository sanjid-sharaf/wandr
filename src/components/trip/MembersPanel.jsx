import { useState } from 'react';
import { Icon } from '@/components/shared/Icon';
import { ConfirmModal } from '@/components/shared/Modal';
import { removeMember } from '@/services/firestore';
import { updateDoc, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { doc } from 'firebase/firestore';

export const MembersPanel = ({ trip, currentUser, showToast }) => {
  const [confirm, setConfirm] = useState(null);
  const isOwner = trip.ownerId === currentUser.uid;

  const memberEmails = trip.memberEmails || [];
  const memberNames  = trip.memberNames  || [];
  const memberIds    = trip.memberIds    || [];

  const members = memberEmails.map((e, i) => ({
    email: e,
    name:  memberNames[i] || e,
    uid:   memberIds[i]   || null,
  }));

  const handleLeave = async () => {
    try {
      const me = members.find((m) => m.uid === currentUser.uid);
      if (!me) return;
      await updateDoc(doc(db, 'trips', trip.id), {
        memberIds:    arrayRemove(currentUser.uid),
        memberEmails: arrayRemove(currentUser.email.toLowerCase()),
        memberNames:  arrayRemove(me.name),
        updatedAt:    serverTimestamp(),
      });
      showToast('You left the trip', 'success');
    } catch { showToast('Failed to leave trip', 'error'); }
  };

  const handleRemove = async (member) => {
    try {
      await removeMember(trip, member);
      showToast(`${member.name} removed`, 'success');
    } catch { showToast('Failed to remove member', 'error'); }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="users" size={13} /> Trip Members
      </div>

      {/* Owner row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: 'var(--surface2)',
        borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 6,
      }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{trip.ownerName || trip.ownerEmail}</span>
          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink3)' }}>{trip.ownerEmail}</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: 99 }}>
          Owner
        </span>
      </div>

      {members.map((m) => (
        <div
          key={m.email}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', background: 'var(--surface2)',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 6,
          }}
        >
          <div>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{m.name}</span>
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink3)' }}>{m.email}</span>
          </div>
          {isOwner && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--rose)', borderColor: 'var(--rose)' }}
              onClick={() => setConfirm(m)}
            >
              Remove
            </button>
          )}
          {!isOwner && m.uid === currentUser.uid && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--rose)', borderColor: 'var(--rose)' }}
              onClick={() => setConfirm({ ...m, leaving: true })}
            >
              Leave
            </button>
          )}
        </div>
      ))}

      {members.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--ink3)', padding: '4px 0' }}>No collaborators yet.</p>
      )}

      {confirm && (
        <ConfirmModal
          message={
            confirm.leaving
              ? `Leave "${trip.name}"? You'll lose access.`
              : `Remove ${confirm.name} from "${trip.name}"?`
          }
          confirmLabel={confirm.leaving ? 'Leave' : 'Remove'}
          onConfirm={() => confirm.leaving ? handleLeave() : handleRemove(confirm)}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
};
