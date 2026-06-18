import { useState } from 'react';
import { Icon } from '@/components/shared/Icon';
import { ConfirmModal } from '@/components/shared/Modal';
import { TripFormModal } from '@/components/trip/FormModals';
import { ShareTripModal } from '@/components/trip/ShareTripModal';
import { formatDate, daysBetween } from '@/lib/dates';
import { tripTypeInfo } from '@/lib/constants';

export const Dashboard = ({
  trips, currentUser, saveTrip, createTrip, deleteTrip, leaveTrip,
  onOpenTrip, showToast,
}) => {
  const [showForm,      setShowForm]      = useState(false);
  const [editTrip,      setEditTrip]      = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [shareTrip,     setShareTrip]     = useState(null);

  const handleExport = () => {
    const myTrips = trips.filter((t) => t.ownerId === currentUser.uid);
    const blob = new Blob([JSON.stringify({ trips: myTrips }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: 'wandr-backup.json',
    });
    a.click();
    showToast('Backup exported', 'success');
  };

  const handleImport = () => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' });
    input.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!Array.isArray(data.trips)) throw new Error();
          for (const t of data.trips) {
            const { id, ownerId, ownerEmail, ownerName, memberIds, memberEmails, memberNames, createdAt, updatedAt, ...rest } = t;
            await createTrip(rest);
          }
          showToast('Backup imported', 'success');
        } catch { showToast('Invalid backup file', 'error'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const now = new Date();

  const categorise = (list) => {
    const active   = list.filter((t) => t.startDate && t.endDate && new Date(t.startDate + 'T00:00:00') <= now && now <= new Date(t.endDate + 'T00:00:00'));
    const upcoming = list.filter((t) => t.startDate && new Date(t.startDate + 'T00:00:00') > now);
    const past     = list.filter((t) => t.endDate && new Date(t.endDate + 'T00:00:00') < now && !active.includes(t));
    const none     = list.filter((t) => !t.startDate);
    return [
      ...(active.length   ? [{ label: '✈️ Active',   items: active   }] : []),
      ...(upcoming.length ? [{ label: '🗓️ Upcoming', items: upcoming }] : []),
      ...(past.length     ? [{ label: '📁 Past',     items: past     }] : []),
      ...(none.length     ? [{ label: 'All Trips',   items: none     }] : []),
    ];
  };

  const myTrips      = trips.filter((t) => t.ownerId === currentUser.uid);
  const sharedWithMe = trips.filter((t) => t.ownerId !== currentUser.uid);

  const renderTrip = (trip) => {
    const ti          = tripTypeInfo(trip.type);
    const days        = daysBetween(trip.startDate, trip.endDate);
    const evCount     = (trip.events || []).length;
    const placeCount  = Object.values(trip.collections || {}).reduce((s, a) => s + a.length, 0);
    const isOwner     = trip.ownerId === currentUser.uid;
    const memberCount = (trip.memberIds || []).length;

    return (
      <div
        key={trip.id}
        className="card trip-card"
        onClick={() => onOpenTrip(trip)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpenTrip(trip)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`trip-type-badge ${ti.cls}`}>{ti.label}</span>
            {!isOwner && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--teal)', background: 'rgba(45,212,191,0.12)', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase' }}>
                Shared
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
            {isOwner && (
              <button className="btn-icon" title="Share" onClick={() => setShareTrip(trip)}>
                <Icon name="share" size={13} />
              </button>
            )}
            {isOwner && (
              <button className="btn-icon" title="Edit" onClick={() => { setEditTrip(trip); setShowForm(true); }}>
                <Icon name="edit" size={13} />
              </button>
            )}
            <button
              className="btn-icon"
              title={isOwner ? 'Delete' : 'Leave'}
              onClick={() => setConfirmAction({ trip, action: isOwner ? 'delete' : 'leave' })}
            >
              <Icon name={isOwner ? 'trash' : 'leave'} size={13} />
            </button>
          </div>
        </div>

        <div className="trip-card-title">{trip.name}</div>
        {!isOwner && (
          <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 2 }}>
            Shared by {trip.ownerName || trip.ownerEmail}
          </div>
        )}
        <div className="trip-card-dates">
          {trip.startDate ? `${formatDate(trip.startDate)} → ${formatDate(trip.endDate)}` : 'No dates set'}
        </div>
        <div className="trip-card-meta">
          <div className="trip-meta-item"><strong>{days}</strong>days</div>
          <div className="trip-meta-item"><strong>{evCount}</strong>events</div>
          <div className="trip-meta-item"><strong>{placeCount}</strong>places</div>
          {memberCount > 0 && (
            <div className="trip-meta-item"><strong>{memberCount}</strong>{memberCount === 1 ? 'member' : 'members'}</div>
          )}
        </div>
      </div>
    );
  };

  const myGrouped     = categorise(myTrips);
  const sharedGrouped = categorise(sharedWithMe);
  const totalTrips    = trips.length;

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
          {myGrouped.map((g) => (
            <div key={g.label} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                {g.label}
              </div>
              <div className="trip-grid">{g.items.map(renderTrip)}</div>
            </div>
          ))}

          {sharedWithMe.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="users" size={12} /> Shared with me
              </div>
              <div className="trip-grid">{sharedGrouped.flatMap((g) => g.items).map(renderTrip)}</div>
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
          currentUser={currentUser}
          onCreate={async (data) => {
            await createTrip(data);
            showToast('Trip created!', 'success');
            setShowForm(false);
          }}
          onSave={async (t) => {
            await saveTrip(t);
            showToast('Trip updated', 'success');
            setShowForm(false);
          }}
          onClose={() => { setShowForm(false); setEditTrip(null); }}
        />
      )}

      {confirmAction && (
        <ConfirmModal
          message={
            confirmAction.action === 'leave'
              ? `Leave "${confirmAction.trip.name}"? You'll lose access to this trip.`
              : `Delete "${confirmAction.trip.name}" and all its data? This cannot be undone.`
          }
          confirmLabel={confirmAction.action === 'leave' ? 'Leave' : 'Delete'}
          onConfirm={async () => {
            if (confirmAction.action === 'leave') {
              await leaveTrip(confirmAction.trip);
              showToast('Left trip', 'success');
            } else {
              await deleteTrip(confirmAction.trip.id);
              showToast('Trip deleted', 'success');
            }
          }}
          onClose={() => setConfirmAction(null)}
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
