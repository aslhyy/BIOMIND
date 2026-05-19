import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const USERS_COLLECTION = 'usuarios';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeProfile = null;

    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      if (!isMounted) {
        return;
      }

      setLoading(true);
      setUser(nextUser);

      if (!nextUser) {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const profileRef = doc(db, USERS_COLLECTION, nextUser.uid);

        if (unsubscribeProfile) {
          unsubscribeProfile();
        }

        unsubscribeProfile = onSnapshot(
          profileRef,
          (snapshot) => {
            if (!isMounted) {
              return;
            }

            setProfile(snapshot.exists() ? snapshot.data() : null);
            setLoading(false);
          },
          () => {
            if (isMounted) {
              setProfile(null);
              setLoading(false);
            }
          }
        );
      } catch {
        if (isMounted) {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      unsub();
    };
  }, []);

  return {
    user,
    profile,
    loading,
    isAuthenticated: Boolean(user),
  };
}
