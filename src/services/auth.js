import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { upsertUserProfile } from './firestore';

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, provider);
  await upsertUserProfile(result.user);
  return result.user;
};

export const logout = () => signOut(auth);
