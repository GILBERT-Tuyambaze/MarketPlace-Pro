import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// Supabase client (fallback)
import { createClient } from '@supabase/supabase-js';

// Firebase client (optional)
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

// Supabase setup (kept for compatibility). If Firebase is configured, prefer Firebase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = import.meta.env.VITE_FIREBASE_PROJECT_ID
  ? null
  : supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

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

const useFirebase = Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID);

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

  // Fetch profile from Firestore
  const fetchFirebaseProfile = async (uid: string) => {
    try {
      const ref = fbDoc(firebaseDb, 'profiles', uid);
      const snap = await fbGetDoc(ref);
      if (snap.exists()) {
        setProfile(snap.data() as Profile);
      } else {
        // create default profile
        const defaultProfile: Profile = { id: uid, full_name: 'User', role: 'customer' };
        await fbSetDoc(ref, { ...defaultProfile, created_at: fbServerTimestamp(), updated_at: fbServerTimestamp() });
        setProfile(defaultProfile);
      }
    } catch (err) {
      console.error('Error fetching Firebase profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // Supabase profile fetch
  const fetchSupabaseProfile = async (userId: string) => {
    if (!supabase) return setLoading(false);
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) {
        console.error('Error fetching Supabase profile:', error);
      } else {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Error fetching Supabase profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load platform settings globally - use realtime listener
  useEffect(() => {
    if (!useFirebase) {
      setSettingsLoading(false);
      return;
    }
    
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
    if (useFirebase) {
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
    }

    // Supabase listener / initial session
    (async () => {
      if (!supabase) return setLoading(false);
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) await fetchSupabaseProfile(session.user.id);
      else setLoading(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) await fetchSupabaseProfile(session.user.id);
        else {
          setProfile(null);
          setLoading(false);
        }
      });
      return () => subscription.unsubscribe();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sign up
  const signUp = async (email: string, password: string, fullName = 'User') => {
    if (useFirebase) {
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
    }

    if (!supabase) return { user: null, error: 'No auth provider configured' };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (data.user) {
      await supabase.from('profiles').insert([{ id: data.user.id, full_name: fullName, role: 'customer' }]);
    }
    return { user: data.user, error };
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    if (useFirebase) {
      const res: { user: any | null; error?: any } = { user: null };
      try {
        const cred = await fbSignIn(firebaseAuth, email, password);
        res.user = cred.user;
      } catch (error) {
        console.error('Firebase signIn error:', error);
        res.error = error;
      }
      return res;
    }

    if (!supabase) return { user: null, error: 'No auth provider configured' };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data.user, error };
  };

  // Sign out
  const signOut = async () => {
    if (useFirebase) {
      await fbSignOut(firebaseAuth);
      setUser(null);
      setProfile(null);
      return;
    }
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (useFirebase) {
      if (!user) throw new Error('No user logged in');
      const ref = fbDoc(firebaseDb, 'profiles', user.uid);
      await fbSetDoc(ref, { ...updates, updated_at: fbServerTimestamp() }, { merge: true });
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return;
    }
    if (!supabase || !user) throw new Error('No user logged in or no auth provider');
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) throw error;
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const value: AuthContextType = { user, profile, loading, platformSettings, settingsLoading, signUp, signIn, signOut, updateProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
