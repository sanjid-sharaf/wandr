import { useState } from 'react';
import { Icon } from '@/components/shared/Icon';
import { ConfirmModal } from '@/components/shared/Modal';
import { PlaceFormModal, CustomCollectionModal } from './FormModals';
import { COLLECTION_TYPES, genId } from '@/lib/constants';

export const CollectionsView = ({ trip, saveTrip, showToast }) => {
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
    ...customCollections.map((c) => ({ value: c.id, label: c.name, icon: '📁', isCustom: true })),
  ];

  const mutateCol = (newCol, newCustom) =>
    saveTrip({ ...trip, collections: newCol, customCollections: newCustom ?? trip.customCollections ?? [] });

  const handleQuickAdd = async () => {
    const text = importText.trim(); if (!text) return;
    const isLink = text.startsWith('http');
    const place = { id: genId(), name: isLink ? 'Saved Place' : text, category: importCat, location: '', notes: '', link: isLink ? text : '', favorite: false };
    await mutateCol({ ...collections, [importCat]: [...(collections[importCat] || []), place] });
    showToast('Place added', 'success'); setImportText('');
  };

  const handleSavePlace = async (place) => {
    const isEdit = !!editPlace; const oldCat = editPlace?.category;
    let newCol = { ...collections };
    if (isEdit && oldCat && oldCat !== place.category)
      newCol[oldCat] = (newCol[oldCat] || []).filter((p) => p.id !== place.id);
    if (isEdit) {
      newCol[place.category] = (newCol[place.category] || []).map((p) => p.id === place.id ? { ...p, ...place } : p);
      if (!newCol[place.category].find((p) => p.id === place.id))
        newCol[place.category] = [...(newCol[place.category] || []), { ...place, favorite: false }];
    } else {
      newCol[place.category] = [...(newCol[place.category] || []), { ...place, favorite: false }];
    }
    await mutateCol(newCol);
    showToast(isEdit ? 'Place updated' : 'Place added', 'success');
    setShowPlaceForm(false); setEditPlace(null);
  };

  const handleDeletePlace = async (placeId, category) => {
    await mutateCol({ ...collections, [category]: (collections[category] || []).filter((p) => p.id !== placeId) });
    showToast('Place removed', 'success');
  };

  const handleToggleFav = async (placeId, category) => {
    await mutateCol({ ...collections, [category]: (collections[category] || []).map((p) => p.id === placeId ? { ...p, favorite: !p.favorite } : p) });
  };

  const handleDeleteCustomCol = async (colId) => {
    const newCustom = customCollections.filter((c) => c.id !== colId);
    const newCol = { ...collections }; delete newCol[colId];
    await mutateCol(newCol, newCustom);
    showToast('Collection deleted', 'success');
  };

  const favorites = allColTypes.flatMap((ct) =>
    (collections[ct.value] || []).filter((p) => p.favorite).map((p) => ({ ...p, collectionName: ct.label, collectionIcon: ct.icon }))
  );

  const openAdd = (cat) => { setDefaultCat(cat); setEditPlace(null); setShowPlaceForm(true); };

  const PlaceCard = ({ place, showColLabel = false }) => (
    <div className="card place-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="place-card-name">{place.name}</div>
          {showColLabel && (
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>
              {place.collectionIcon} {place.collectionName}
            </div>
          )}
        </div>
        <button
          className={`favorite-btn ${place.favorite ? 'active' : ''}`}
          onClick={() => handleToggleFav(place.id, place.category)}
        >
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
            onChange={(e) => setImportText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
            placeholder="e.g. Colosseum, Rome  or  https://maps.google.com/…"
          />
          <select value={importCat} onChange={(e) => setImportCat(e.target.value)} style={{ width: 140 }}>
            {allColTypes.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={handleQuickAdd} disabled={!importText.trim()}>Add</button>
        </div>
      </div>

      <div className="view-tabs">
        <button className={`view-tab ${colTab === 'all' ? 'active' : ''}`} onClick={() => setColTab('all')}>
          📌 All Collections
        </button>
        <button className={`view-tab ${colTab === 'favorites' ? 'active' : ''}`} onClick={() => setColTab('favorites')}>
          ⭐ Favorites {favorites.length > 0 && <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.7 }}>({favorites.length})</span>}
        </button>
      </div>

      {colTab === 'favorites' && (
        favorites.length === 0
          ? <div className="empty-state"><div className="icon">⭐</div><h3>No favorites yet</h3><p>Star any place to add it here</p></div>
          : <div className="col-grid">{favorites.map((p) => <PlaceCard key={p.id} place={p} showColLabel />)}</div>
      )}

      {colTab === 'all' && (
        <div>
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCustomModal(true)}>
              <Icon name="plus" size={12} /> New Custom Collection
            </button>
          </div>
          {allColTypes.map((ct) => {
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
                  : <div className="col-grid">{items.map((p) => <PlaceCard key={p.id} place={p} />)}</div>
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
          onSave={async (col) => {
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
