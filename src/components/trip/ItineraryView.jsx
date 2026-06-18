import { useState, useMemo } from 'react';
import { Icon } from '@/components/shared/Icon';
import { ConfirmModal } from '@/components/shared/Modal';
import { EventFormModal } from './FormModals';
import { PERIODS, catInfo } from '@/lib/constants';
import { daysBetween, getDayLabel, fmtTime } from '@/lib/dates';

export const ItineraryView = ({ trip, saveTrip, showToast }) => {
  const totalDays  = daysBetween(trip.startDate, trip.endDate) || 1;
  const [activeDay, setActiveDay] = useState(0);
  const [showForm,  setShowForm]  = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [defPeriod, setDefPeriod] = useState('morning');

  const dayEvents = useMemo(
    () => (trip.events || []).filter((e) => e.dayIndex === activeDay),
    [trip.events, activeDay]
  );

  const byPeriod = useMemo(() => {
    const map = {};
    PERIODS.forEach((p) => { map[p.id] = []; });
    dayEvents.forEach((e) => { if (map[e.period]) map[e.period].push(e); });
    return map;
  }, [dayEvents]);

  const mutateEvents = (evs) => saveTrip({ ...trip, events: evs });

  const handleSave = async (ev) => {
    const evs = trip.events || [];
    await mutateEvents(editEvent ? evs.map((e) => (e.id === ev.id ? ev : e)) : [...evs, ev]);
    showToast(editEvent ? 'Event updated' : 'Event added', 'success');
    setShowForm(false); setEditEvent(null);
  };

  const handleDelete = async (evId) => {
    await mutateEvents((trip.events || []).filter((e) => e.id !== evId));
    showToast('Event removed', 'success');
  };

  const openAdd = (period) => { setDefPeriod(period); setEditEvent(null); setShowForm(true); };

  return (
    <div className="planner-layout">
      <aside className="sidebar">
        <div className="card day-nav">
          <div className="day-nav-header"><span className="day-nav-title">Days</span></div>
          <div className="day-list">
            {Array.from({ length: totalDays }, (_, i) => (
              <div
                key={i}
                className={`day-item ${i === activeDay ? 'active' : ''}`}
                onClick={() => setActiveDay(i)}
              >
                <div>
                  <div className="day-item-label">Day {i + 1}</div>
                  <div className="day-item-date">{getDayLabel(trip.startDate, i)}</div>
                </div>
                <span className="event-count">
                  {(trip.events || []).filter((e) => e.dayIndex === i).length}
                </span>
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
          {PERIODS.map((period) => {
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
                  {pevents.map((ev) => {
                    const cat = catInfo(ev.category);
                    return (
                      <div key={ev.id} className="card event-card">
                        <div className="event-time-col">
                          {ev.startTime
                            ? <>
                                <div style={{ fontWeight: 500 }}>{fmtTime(ev.startTime)}</div>
                                {ev.endTime && <div style={{ color: 'var(--ink3)' }}>{fmtTime(ev.endTime)}</div>}
                              </>
                            : <div style={{ color: 'var(--ink3)' }}>—</div>}
                        </div>
                        <div className="event-body">
                          <div className="event-title">{ev.title}</div>
                          <div className="event-meta">
                            <span className={`cat-badge ${cat.cls}`}>{cat.label}</span>
                          </div>
                          {ev.notes && <div className="event-notes">{ev.notes}</div>}
                          {ev.link && (
                            <a href={ev.link} target="_blank" rel="noopener noreferrer" className="event-link">
                              🔗 Open link
                            </a>
                          )}
                        </div>
                        <div className="event-actions">
                          <button className="btn-icon" onClick={() => { setEditEvent(ev); setShowForm(true); }}>
                            <Icon name="edit" size={13} />
                          </button>
                          <button className="btn-icon" onClick={() => setDeleting(ev.id)}>
                            <Icon name="trash" size={13} />
                          </button>
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
