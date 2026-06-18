import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { upsertUserProfile } from '@/services/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // undefined = loading, null = signed out, object = signed in
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await upsertUserProfile(firebaseUser);
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
    });
  }, []);

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
