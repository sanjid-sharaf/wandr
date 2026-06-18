import { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { TRIP_TYPES, CATEGORIES, PERIODS, COLLECTION_TYPES, genId } from '@/lib/constants';

// ─── TripFormModal ────────────────────────────────────────────────────────────
export const TripFormModal = ({ trip, onCreate, onSave, onClose }) => {
  const [form, setForm] = useState({
    name:      trip?.name      || '',
    startDate: trip?.startDate || '',
    endDate:   trip?.endDate   || '',
    type:      trip?.type      || 'vacation',
    notes:     trip?.notes     || '',
  });
  const set   = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim() && form.startDate && form.endDate && form.endDate >= form.startDate;
  const isEdit = !!trip?.id;

  const handleSave = async () => {
    if (!valid) return;
    const payload = { ...form, name: form.name.trim() };
    if (isEdit) await onSave({ ...trip, ...payload });
    else        await onCreate({ ...payload, events: [], collections: {}, customCollections: [] });
  };

  return (
    <Modal
      title={isEdit ? 'Edit Trip' : 'New Trip'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!valid}>
            {isEdit ? 'Save Changes' : 'Create Trip'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Trip Name</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Summer in Italy" autoFocus />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Start Date</label>
          <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </div>
        <div className="field">
          <label>End Date</label>
          <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => set('endDate', e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Trip Type</label>
        <select value={form.type} onChange={(e) => set('type', e.target.value)}>
          {TRIP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Notes <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any trip-wide notes…" rows={2} />
      </div>
    </Modal>
  );
};

// ─── EventFormModal ───────────────────────────────────────────────────────────
export const EventFormModal = ({ event, dayIndex, onSave, onClose }) => {
  const [form, setForm] = useState({
    title:     event?.title     || '',
    period:    event?.period    || 'morning',
    startTime: event?.startTime || '',
    endTime:   event?.endTime   || '',
    category:  event?.category  || 'attraction',
    notes:     event?.notes     || '',
    link:      event?.link      || '',
  });
  const set   = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.title.trim();

  const handleSave = () => {
    if (!valid) return;
    onSave({ id: event?.id || genId(), dayIndex, ...form, title: form.title.trim() });
  };

  return (
    <Modal
      title={event?.id ? 'Edit Event' : 'Add Event'}
      onClose={onClose}
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
        <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Visit the Colosseum" autoFocus />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Period</label>
          <select value={form.period} onChange={(e) => set('period', e.target.value)}>
            {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Category</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Start Time <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
          <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
        </div>
        <div className="field">
          <label>End Time <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
          <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Notes <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any details…" rows={2} />
      </div>
      <div className="field">
        <label>Link <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
        <input value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="Google Maps, website URL…" />
      </div>
    </Modal>
  );
};

// ─── PlaceFormModal ───────────────────────────────────────────────────────────
export const PlaceFormModal = ({ place, defaultCategory, customCollections, onSave, onClose }) => {
  const allOptions = [
    ...COLLECTION_TYPES,
    ...(customCollections || []).map((c) => ({ value: c.id, label: c.name, icon: '📁' })),
  ];
  const [form, setForm] = useState({
    name:     place?.name     || '',
    category: place?.category || defaultCategory || 'restaurant',
    location: place?.location || '',
    notes:    place?.notes    || '',
    link:     place?.link     || '',
  });
  const set   = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim();

  const handleSave = () => {
    if (!valid) return;
    onSave({ id: place?.id || genId(), ...form, name: form.name.trim() });
  };

  return (
    <Modal
      title={place ? 'Edit Place' : 'Add to Collection'}
      onClose={onClose}
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
        <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Trevi Fountain" autoFocus />
      </div>
      <div className="field">
        <label>Collection</label>
        <select value={form.category} onChange={(e) => set('category', e.target.value)}>
          {allOptions.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Location / Address <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
        <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Piazza di Trevi, Rome" />
      </div>
      <div className="field">
        <label>Notes <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Opening hours, tips…" rows={2} />
      </div>
      <div className="field">
        <label>Link <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span></label>
        <input value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="Google Maps or website URL" />
      </div>
    </Modal>
  );
};

// ─── CustomCollectionModal ────────────────────────────────────────────────────
export const CustomCollectionModal = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const handleSave = () => { if (!name.trim()) return; onSave({ id: genId(), name: name.trim() }); };
  return (
    <Modal
      title="New Custom Collection"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim()}>Create</button>
        </>
      }
    >
      <div className="field">
        <label>Collection Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Nightlife, Shopping…"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
      </div>
    </Modal>
  );
};
