'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Query } from 'appwrite';
import { account, databases, Profile, DATABASE_ID, PROFILES_ID, mapDoc } from '@/lib/appwrite';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        PROFILES_ID,
        [Query.equal('user_id', userId), Query.limit(1)]
      );
      if (response.documents.length > 0) {
        setProfile(mapDoc<Profile>(response.documents[0]));
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Failed to fetch profile', error);
      setProfile(null);
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
      await fetchProfile(currentUser.$id);
    } catch (error) {
      // Not logged in
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.$id);
    else await checkSession();
  }, [user, fetchProfile, checkSession]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const signOut = async () => {
    try {
      await account.deleteSession('current');
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
