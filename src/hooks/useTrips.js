import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToTrips,
  createTrip   as fsCreateTrip,
  saveTrip     as fsSaveTrip,
  deleteTrip   as fsDeleteTrip,
  leaveTrip    as fsLeaveTrip,
} from '@/services/firestore';

export const useTrips = () => {
  const user     = useAuth();
  const [trips,   setTrips]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (!user) { setTrips([]); setLoading(false); return; }
    setLoading(true);
    return subscribeToTrips(user.uid, (all, fullyLoaded) => {
      setTrips(all);
      if (fullyLoaded) setLoading(false);
    });
  }, [user?.uid]);

  const createTrip = useCallback(async (tripData) => {
    if (!user) return;
    setSaving(true);
    try {
      return await fsCreateTrip(
        user.uid,
        user.email,
        user.displayName || user.email,
        tripData
      );
    } finally { setSaving(false); }
  }, [user]);

  const saveTrip = useCallback(async (trip) => {
    setSaving(true);
    try { await fsSaveTrip(trip); }
    finally { setSaving(false); }
  }, []);

  const deleteTrip = useCallback((tripId) => fsDeleteTrip(tripId), []);

  const leaveTrip = useCallback((trip) => {
    if (!user) return;
    return fsLeaveTrip(trip, user.uid, user.email);
  }, [user]);

  return { trips, loading, saving, createTrip, saveTrip, deleteTrip, leaveTrip };
};
