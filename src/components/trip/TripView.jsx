import { useState } from 'react';
import { Icon } from '@/components/shared/Icon';
import { TripFormModal } from './FormModals';
import { ShareTripModal } from './ShareTripModal';
import { ItineraryView } from './ItineraryView';
import { CollectionsView } from './CollectionsView';
import { MembersPanel } from './MembersPanel';
import { formatDate, daysBetween } from '@/lib/dates';
import { tripTypeInfo } from '@/lib/constants';

export const TripView = ({ trip, currentUser, saveTrip, showToast, onBack }) => {
  const [tab,          setTab]          = useState('itinerary');
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [showShare,    setShowShare]    = useState(false);

  if (!trip) return null;

  const ti          = tripTypeInfo(trip.type);
  const isOwner     = trip.ownerId === currentUser.uid;
  const memberCount = (trip.memberIds || []).length;

  return (
    <div className="main">
      <button className="back-btn" onClick={onBack}>
        <Icon name="back" size={14} /> All Trips
      </button>

      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className={`trip-type-badge ${ti.cls}`}>{ti.label}</span>
            {!isOwner && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--teal)', background: 'rgba(45,212,191,0.12)', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase' }}>
                Shared by {trip.ownerName || trip.ownerEmail}
              </span>
            )}
            {isOwner && memberCount > 0 && (
              <span style={{ fontSize: 11, color: 'var(--ink3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="users" size={12} /> {memberCount} member{memberCount > 1 ? 's' : ''}
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
          {isOwner && (
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
        <button className={`view-tab ${tab === 'itinerary'   ? 'active' : ''}`} onClick={() => setTab('itinerary')}>📅 Itinerary</button>
        <button className={`view-tab ${tab === 'collections' ? 'active' : ''}`} onClick={() => setTab('collections')}>📌 Collections</button>
        <button className={`view-tab ${tab === 'members'     ? 'active' : ''}`} onClick={() => setTab('members')}>
          👥 Members {(memberCount + 1) > 1 && <span style={{ fontSize: 11, opacity: 0.7 }}>({memberCount + 1})</span>}
        </button>
      </div>

      {tab === 'itinerary'   && <ItineraryView   trip={trip} saveTrip={saveTrip} showToast={showToast} />}
      {tab === 'collections' && <CollectionsView trip={trip} saveTrip={saveTrip} showToast={showToast} />}
      {tab === 'members'     && <MembersPanel    trip={trip} currentUser={currentUser} showToast={showToast} />}

      {showEditTrip && (
        <TripFormModal
          trip={trip}
          currentUser={currentUser}
          onSave={async (t) => { await saveTrip(t); showToast('Trip updated', 'success'); setShowEditTrip(false); }}
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
