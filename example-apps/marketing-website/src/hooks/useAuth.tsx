import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import analytics from '@/services/analytics';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Track user ID for analytics
      if (currentUser) {
        analytics.setUserId(currentUser.uid);
        analytics.setUserProperties({
          email_verified: currentUser.emailVerified,
          auth_provider: currentUser.providerData[0]?.providerId || 'unknown',
        });
      } else {
        analytics.setUserId(null);
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const startTime = performance.now();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const duration = Math.round(performance.now() - startTime);
      analytics.apiCall('auth/signin', 'POST', true, duration);
      analytics.track('user_login', { method: 'email' });
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      analytics.apiCall('auth/signin', 'POST', false, duration);
      analytics.error('login_error', error instanceof Error ? error.message : 'Unknown error', { method: 'email' });
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    const startTime = performance.now();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      const duration = Math.round(performance.now() - startTime);
      analytics.apiCall('auth/signup', 'POST', true, duration);
      analytics.track('user_signup', { method: 'email' });
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      analytics.apiCall('auth/signup', 'POST', false, duration);
      analytics.error('signup_error', error instanceof Error ? error.message : 'Unknown error', { method: 'email' });
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    const startTime = performance.now();
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      const duration = Math.round(performance.now() - startTime);
      analytics.apiCall('auth/google', 'POST', true, duration);
      analytics.track('user_login', { method: 'google' });
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      analytics.apiCall('auth/google', 'POST', false, duration);
      analytics.error('login_error', error instanceof Error ? error.message : 'Unknown error', { method: 'google' });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      analytics.track('user_logout');
    } catch (error) {
      analytics.error('logout_error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
