import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Refs ───────────────────────────────────────────────────────────────────
const tripsCol   = () => collection(db, 'trips');
const tripRef    = (id) => doc(db, 'trips', id);
const userRef    = (uid) => doc(db, 'users', uid);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 9);

// ─── User Profile ─────────────────────────────────────────────────────────────
export const upsertUserProfile = (user) =>
  setDoc(
    userRef(user.uid),
    {
      uid:         user.uid,
      email:       user.email.toLowerCase(),
      displayName: user.displayName || '',
      photoURL:    user.photoURL    || '',
    },
    { merge: true }
  );

// ─── Trip Listeners ──────────────────────────────────────────────────────────
/**
 * Subscribe to all trips the user owns or is a member of.
 * Returns an unsubscribe function.
 */
export const subscribeToTrips = (userId, onChange) => {
  let ownerTrips  = [];
  let memberTrips = [];
  const loaded    = { owner: false, member: false };

  const merge = () => {
    const all = [...ownerTrips];
    memberTrips.forEach((t) => { if (!all.find((x) => x.id === t.id)) all.push(t); });
    all.sort((a, b) => {
      if (a.createdAt && b.createdAt) return a.createdAt.seconds - b.createdAt.seconds;
      return (a.name || '').localeCompare(b.name || '');
    });
    onChange(all, loaded.owner && loaded.member);
  };

  const unsubOwner = onSnapshot(
    query(tripsCol(), where('ownerId', '==', userId)),
    (snap) => {
      ownerTrips = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      loaded.owner = true;
      merge();
    }
  );

  const unsubMember = onSnapshot(
    query(tripsCol(), where('memberIds', 'array-contains', userId)),
    (snap) => {
      memberTrips = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      loaded.member = true;
      merge();
    }
  );

  return () => { unsubOwner(); unsubMember(); };
};

// ─── Trip CRUD ───────────────────────────────────────────────────────────────
export const createTrip = async (userId, userEmail, userName, tripData) => {
  const id = genId();
  await setDoc(tripRef(id), {
    ...tripData,
    id,
    ownerId:           userId,
    ownerEmail:        userEmail.toLowerCase(),
    ownerName:         userName,
    memberIds:         [],
    memberEmails:      [],
    memberNames:       [],
    events:            [],
    collections:       {},
    customCollections: [],
    createdAt:         serverTimestamp(),
    updatedAt:         serverTimestamp(),
  });
  return id;
};

export const saveTrip = async (trip) => {
  const { id, ...data } = trip;
  await setDoc(tripRef(id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
};

export const deleteTrip = (tripId) => deleteDoc(tripRef(tripId));

export const leaveTrip = async (trip, userId, userEmail) => {
  const idx     = (trip.memberEmails || []).indexOf(userEmail.toLowerCase());
  const myName  = idx >= 0 ? (trip.memberNames || [])[idx] : null;
  const updates = {
    memberIds:    arrayRemove(userId),
    memberEmails: arrayRemove(userEmail.toLowerCase()),
    updatedAt:    serverTimestamp(),
  };
  if (myName) updates.memberNames = arrayRemove(myName);
  await updateDoc(tripRef(trip.id), updates);
};

// ─── Trip Membership ─────────────────────────────────────────────────────────
export const inviteMember = async (trip, email) => {
  const q    = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('NO_ACCOUNT');

  const profile = snap.docs[0].data();
  await updateDoc(tripRef(trip.id), {
    memberIds:    arrayUnion(profile.uid),
    memberEmails: arrayUnion(email.toLowerCase()),
    memberNames:  arrayUnion(profile.displayName || email),
    updatedAt:    serverTimestamp(),
  });
  return profile;
};

export const removeMember = async (trip, member) => {
  const updates = {
    memberEmails: arrayRemove(member.email),
    memberNames:  arrayRemove(member.name),
    updatedAt:    serverTimestamp(),
  };
  if (member.uid) updates.memberIds = arrayRemove(member.uid);
  await updateDoc(tripRef(trip.id), updates);
};
