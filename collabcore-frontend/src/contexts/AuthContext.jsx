import { createContext, useState, useEffect, useCallback } from 'react';
import { subscribeToAuthChanges, logout as logoutService } from '../services/authService';
import { auth } from '../config/firebase';
import { getRedirectResult } from 'firebase/auth';
import { syncFirebaseProfileToFirestore } from '../services/firestoreService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(({ user: userData }) => {
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    // Handle redirect result from signInWithRedirect (popup-blocked fallback)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await syncFirebaseProfileToFirestore(result.user);
        }
      })
      .catch(() => { /* ignore redirect errors */ });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Login function - updates the user state after successful login
  const login = useCallback((userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await logoutService();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear state even if logout fails
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  // Update user data
  const updateUser = useCallback((userData) => {
    setUser((prev) => ({ ...prev, ...userData }));
  }, []);

  // Get current Firebase user
  const getFirebaseUser = useCallback(() => {
    return auth.currentUser;
  }, []);

  // Get fresh ID token
  const getIdToken = useCallback(async (forceRefresh = false) => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      return await firebaseUser.getIdToken(forceRefresh);
    }
    return null;
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    getFirebaseUser,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
