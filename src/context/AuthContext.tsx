import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// Firebase client
import { auth as firebaseAuth, db as firebaseDb } from '@/lib/firebaseClient';
import {
  signInWithEmailAndPassword as fbSignIn,
  createUserWithEmailAndPassword as fbSignUp,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  User as FBUser,
} from 'firebase/auth';
import {
  doc as fbDoc,
  getDoc as fbGetDoc,
  setDoc as fbSetDoc,
  serverTimestamp as fbServerTimestamp,
  onSnapshot as fbOnSnapshot,
} from 'firebase/firestore';
import { toast } from 'sonner';

type Profile = {
  id: string;
  full_name: string;
  role: string;
  seller_status?: string;
  stripe_account_id?: string;
  phone?: string;
  address?: string;
  
};

type PlatformSettings = {
  marketplace_locked: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  updated_at?: any;
};

type AuthContextType = {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  platformSettings: PlatformSettings;
  settingsLoading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ user: any | null; error?: any }>; 
  signIn: (email: string, password: string) => Promise<{ user: any | null; error?: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    marketplace_locked: false,
    maintenance_mode: false,
    maintenance_message: '',
  });

  // Load platform settings globally - use realtime listener
  useEffect(() => {
    let settingsUnsub: (() => void) | undefined;
    try {
      const ref = fbDoc(firebaseDb, 'settings', 'platform');
      settingsUnsub = fbOnSnapshot(ref, (snap) => {
        if (snap.exists()) {
          setPlatformSettings(snap.data() as PlatformSettings);
        }
        setSettingsLoading(false);
      }, (error) => {
        console.error('Error loading platform settings:', error);
        setSettingsLoading(false);
      });
    } catch (error) {
      console.error('Error setting up platform settings listener:', error);
      setSettingsLoading(false);
    }

    return () => {
      try { if (settingsUnsub) settingsUnsub(); } catch (e) { /* ignore */ }
    };
  }, []);



  useEffect(() => {
    // Firebase auth listener
    let profileUnsub: (() => void) | undefined;
    const unsub = fbOnAuthStateChanged(firebaseAuth, async (fbUser: FBUser | null) => {
      setUser(fbUser);
      // tear down previous profile listener
      if (profileUnsub) {
        try { profileUnsub(); } catch (e) { /* ignore */ }
        profileUnsub = undefined;
      }

      if (fbUser) {
        const ref = fbDoc(firebaseDb, 'profiles', fbUser.uid);
        // attach realtime listener
        profileUnsub = fbOnSnapshot(ref, async (snap) => {
          try {
            if (snap.exists()) {
              setProfile(snap.data() as Profile);
            } else {
              const defaultProfile: Profile = { id: fbUser.uid, full_name: 'User', role: 'customer' };
              await fbSetDoc(ref, { ...defaultProfile, created_at: fbServerTimestamp(), updated_at: fbServerTimestamp() });
              setProfile(defaultProfile);
            }
          } catch (err) {
            console.error('Realtime profile listener error:', err);
          } finally {
            setLoading(false);
          }
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => {
      try { unsub(); } catch (e) { /* ignore */ }
      try { if (profileUnsub) profileUnsub(); } catch (e) { /* ignore */ }
    };
  }, []);

  // Sign up
  const signUp = async (email: string, password: string, fullName = 'User') => {
    const res: { user: any | null; error?: any } = { user: null };
    try {
      const cred = await fbSignUp(firebaseAuth, email, password);
      res.user = cred.user;
      // create profile
      const ref = fbDoc(firebaseDb, 'profiles', cred.user.uid);
      await fbSetDoc(ref, { id: cred.user.uid, full_name: fullName, role: 'customer', created_at: fbServerTimestamp(), updated_at: fbServerTimestamp() });
    } catch (error) {
      console.error('Firebase signUp error:', error);
      res.error = error;
    }
    return res;
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    const res: { user: any | null; error?: any } = { user: null };
    try {
      const cred = await fbSignIn(firebaseAuth, email, password);
      res.user = cred.user;
    } catch (error) {
      console.error('Firebase signIn error:', error);
      res.error = error;
    }
    return res;
  };

  // Sign out
  const signOut = async () => {
    try {
      await fbSignOut(firebaseAuth);
    } catch (error) {
      console.error('Error signing out:', error);
    }

    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');
    const ref = fbDoc(firebaseDb, 'profiles', user.uid);
    await fbSetDoc(ref, { ...updates, updated_at: fbServerTimestamp() }, { merge: true });
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const value: AuthContextType = { user, profile, loading, platformSettings, settingsLoading, signUp, signIn, signOut, updateProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
