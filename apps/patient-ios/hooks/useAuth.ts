import { useState, useEffect } from 'react';
import { onAuthStateChanged } from '../lib/auth';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((userData) => {
      setUser(userData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
}
