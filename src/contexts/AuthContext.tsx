import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  hasCompletedOnboarding: boolean;
  markOnboardingCompleted: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fast local check first to avoid any layout shift or flashing
        const localCompleted = localStorage.getItem(`onboarding_${currentUser.uid}`) === 'true';
        if (localCompleted) {
          setHasCompletedOnboarding(true);
        }

        // Check or create persistent user profile in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            // Very first time account creation
            await setDoc(userRef, {
              email: currentUser.email || '',
              displayName: currentUser.displayName || '',
              photoURL: currentUser.photoURL || '',
              hasCompletedOnboarding: localCompleted,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            setHasCompletedOnboarding(localCompleted);
          } else {
            const data = userDoc.data();
            const completed = Boolean(data?.hasCompletedOnboarding || localCompleted);
            setHasCompletedOnboarding(completed);
            if (completed) {
              localStorage.setItem(`onboarding_${currentUser.uid}`, 'true');
              // Sync to Firestore if only stored locally previously
              if (!data?.hasCompletedOnboarding) {
                await updateDoc(userRef, {
                  hasCompletedOnboarding: true,
                  updatedAt: serverTimestamp(),
                }).catch(err => console.warn('Could not sync onboarding to Firestore:', err));
              }
            }
          }
        } catch (error) {
          console.error('Error fetching user profile in Firestore:', error);
          // Fallback to local storage if Firestore network error occurs
          setHasCompletedOnboarding(localCompleted);
        }
      } else {
        setHasCompletedOnboarding(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const markOnboardingCompleted = async () => {
    setHasCompletedOnboarding(true);
    if (user) {
      localStorage.setItem(`onboarding_${user.uid}`, 'true');
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          hasCompletedOnboarding: true,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error recording onboarding completion in Firestore:', error);
      }
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setHasCompletedOnboarding(false);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, hasCompletedOnboarding, markOnboardingCompleted, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
