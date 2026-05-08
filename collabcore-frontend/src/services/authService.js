import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import api, { authAPI } from './api';
import { ACCESS_TOKEN_KEY } from '../utils/constants';
import { syncFirebaseProfileToFirestore, createUserProfileInFirestore } from './firestoreService';

const mapSocialAuthError = (error, providerName) => {
  if (error?.code === 'auth/operation-not-allowed') {
    return new Error(
      `${providerName} sign-in is disabled in Firebase. Enable it in Firebase Console > Authentication > Sign-in method, then save.`
    );
  }

  if (error?.code === 'auth/unauthorized-domain') {
    return new Error(
      'This domain is not authorized for Firebase Auth. Add your Vercel domain in Firebase Console > Authentication > Settings > Authorized domains.'
    );
  }

  return error;
};

// ============ REGISTER ============

/**
 * Register a new user with Firebase and create profile in backend
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} User data
 */
export const register = async (userData) => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );

    const user = userCredential.user;

    // Require real/accessible email by sending verification mail.
    try {
      await sendEmailVerification(user);
    } catch (_e) {
      // best-effort: proceed even if verification email fails to send
    }

    // Get ID token
    const idToken = await user.getIdToken();
    localStorage.setItem(ACCESS_TOKEN_KEY, idToken);

    // Try backend first; fall back to Firestore if backend is not deployed
    let userProfile = null;
    try {
      await api.post('/api/auth/signup', {
        email: userData.email,
        password: userData.password,
        full_name: userData.full_name,
        university: userData.university,
        bio: userData.bio || '',
        skills: userData.skills || [],
        role: userData.role || 'student',
      });
      const response = await authAPI.getMe();
      userProfile = response.data.user;
    } catch (backendError) {
      if (!backendError.response) {
        // Backend is offline — save profile directly to Firestore
        await createUserProfileInFirestore(user.uid, {
          email: userData.email,
          full_name: userData.full_name || '',
          university: userData.university || '',
          bio: userData.bio || '',
          skills: userData.skills || [],
          role: userData.role || 'student',
          avatar_url: null,
        });
        userProfile = {
          uid: user.uid,
          email: userData.email,
          full_name: userData.full_name || '',
        };
      } else {
        // Backend is reachable but returned an error (e.g. 400 duplicate)
        if (backendError.response?.data?.detail) {
          throw new Error(backendError.response.data.detail);
        }
        throw backendError;
      }
    }

    // Force verification-first flow for email/password accounts.
    await signOut(auth);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    
    return {
      user: userProfile,
      idToken,
      requiresEmailVerification: true,
    };
  } catch (error) {
    console.error('Registration error:', error);

    // Friendly error handling for Firebase auth
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email is already in use. Please login or use another email.');
    }

    if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.');
    }

    if (error.code === 'auth/weak-password') {
      throw new Error('Weak password. Please choose a stronger password with at least 6 characters.');
    }

    throw error;
  }
};

// ============ LOGIN ============

/**
 * Login user with email and password using Firebase
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User data and token
 */
export const login = async (email, password) => {
  try {
    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Enforce verified email for email/password accounts.
    try {
      await reload(user);
    } catch (_networkErr) {
      // If reload fails due to network, proceed with existing user data
    }
    if (!user.emailVerified) {
      try { await sendEmailVerification(user); } catch (_e) { /* best-effort */ }
      await signOut(auth);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      throw new Error('Please verify your email first. A verification link has been sent to your inbox.');
    }

    await syncFirebaseProfileToFirestore(user);

    // Get ID token
    const idToken = await user.getIdToken();
    localStorage.setItem(ACCESS_TOKEN_KEY, idToken);

    // Try to get user profile from backend; fall back to Firebase data if backend unreachable
    try {
      const response = await authAPI.getMe();
      return {
        user: response.data.user,
        idToken,
      };
    } catch (backendError) {
      // No response means network/connection error (backend not deployed or offline)
      if (!backendError.response) {
        return {
          user: {
            uid: user.uid,
            email: user.email,
            full_name: user.displayName || '',
            avatar_url: user.photoURL || null,
            role: 'student',
          },
          idToken,
        };
      }
      throw backendError;
    }
  } catch (error) {
    console.error('Login error:', error);
    
    // Provide user-friendly error messages (includes newer auth/invalid-credential)
    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential'
    ) {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later.');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    throw error;
  }
};

// ============ SOCIAL LOGIN ============

/**
 * Login with Google
 */
export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    let userCredential;
    try {
      userCredential = await signInWithPopup(auth, provider);
    } catch (popupError) {
      if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
        await signInWithRedirect(auth, provider);
        return { redirecting: true };
      }
      throw popupError;
    }
    const user = userCredential.user;
    await syncFirebaseProfileToFirestore(user);

    const idToken = await user.getIdToken();
    localStorage.setItem(ACCESS_TOKEN_KEY, idToken);

    // Try to get user profile; if backend is not available, keep using Firebase profile.
    try {
      const response = await authAPI.getMe();
      return {
        user: response.data.user,
        idToken,
      };
    } catch (error) {
      if (error.response?.status === 404 || !error.response) {
        return {
          user: {
            uid: user.uid,
            email: user.email,
            full_name: user.displayName || '',
            avatar_url: user.photoURL || null,
            role: 'student',
          },
          idToken,
        };
      }
      throw error;
    }
  } catch (error) {
    console.error('Google login error:', error);
    throw mapSocialAuthError(error, 'Google');
  }
};

/**
 * Login with GitHub
 */
export const loginWithGithub = async () => {
  try {
    const provider = new GithubAuthProvider();
    provider.addScope('user:email');
    let userCredential;
    try {
      userCredential = await signInWithPopup(auth, provider);
    } catch (popupError) {
      if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
        await signInWithRedirect(auth, provider);
        return { redirecting: true };
      }
      throw popupError;
    }
    const user = userCredential.user;
    await syncFirebaseProfileToFirestore(user);

    const idToken = await user.getIdToken();
    localStorage.setItem(ACCESS_TOKEN_KEY, idToken);

    // Try to get user profile; if backend is not available, keep using Firebase profile.
    try {
      const response = await authAPI.getMe();
      return {
        user: response.data.user,
        idToken,
      };
    } catch (error) {
      if (error.response?.status === 404 || !error.response) {
        return {
          user: {
            uid: user.uid,
            email: user.email,
            full_name: user.displayName || '',
            avatar_url: user.photoURL || null,
            role: 'student',
          },
          idToken,
        };
      }
      throw error;
    }
  } catch (error) {
    console.error('GitHub login error:', error);
    throw mapSocialAuthError(error, 'GitHub');
  }
};

// ============ LOGOUT ============

/**
 * Logout current user
 */
export const logout = async () => {
  try {
    await signOut(auth);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Logout error:', error);
    // Clear local storage even if signOut fails
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    throw error;
  }
};

// ============ GET CURRENT USER ============

/**
 * Get current authenticated user's profile from backend
 * @returns {Promise<Object>} User data
 */
export const getCurrentUser = async () => {
  try {
    const response = await authAPI.getMe();
    return response.data.user;
  } catch (error) {
    console.error('Get current user error:', error);

    // Fallback: if profile is missing in Firestore, try backend login endpoint by email
    if (error.response?.status === 404) {
      const firebaseUser = auth.currentUser;
      if (firebaseUser?.email) {
        const loginResponse = await authAPI.loginBackend(firebaseUser.email);
        return loginResponse.data.user;
      }
    }

    // Network error: backend unreachable (e.g. only frontend deployed on Vercel)
    // Fall back to basic Firebase user data so the app stays usable
    if (!error.response) {
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        await syncFirebaseProfileToFirestore(firebaseUser);
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          full_name: firebaseUser.displayName || '',
          avatar_url: firebaseUser.photoURL || null,
          role: 'student',
        };
      }
    }

    throw error;
  }
};

// ============ AUTH STATE LISTENER ============

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Callback function to handle auth state changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const isPasswordProvider = user.providerData?.some((p) => p.providerId === 'password');
        if (isPasswordProvider && !user.emailVerified) {
          await signOut(auth);
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          callback({ user: null, idToken: null });
          return;
        }

        await syncFirebaseProfileToFirestore(user);
        // Get fresh ID token — declared outside try so catch block can access it
        let idToken = localStorage.getItem(ACCESS_TOKEN_KEY) || '';
        try {
          idToken = await user.getIdToken();
          localStorage.setItem(ACCESS_TOKEN_KEY, idToken);
        } catch (_tokenErr) {
          // use existing token from localStorage if refresh fails
        }

        // Get user profile from backend (falls back to Firebase user if backend unreachable)
        const userData = await getCurrentUser();
        callback({ user: userData, idToken });
      } catch (error) {
        console.error('Error getting user data:', error);
        // If backend is unreachable but Firebase user is valid, keep user logged in
        const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY) || '';
        if (!error.response && user) {
          callback({
            user: {
              uid: user.uid,
              email: user.email,
              full_name: user.displayName || '',
              avatar_url: user.photoURL || null,
              role: 'student',
            },
            idToken: savedToken,
          });
        } else {
          callback({ user: null, idToken: null });
        }
      }
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      callback({ user: null, idToken: null });
    }
  });
};

// ============ CHECK AUTHENTICATION ============

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
export const isAuthenticated = () => {
  return !!auth.currentUser && !!localStorage.getItem(ACCESS_TOKEN_KEY);
};

// ============ REFRESH TOKEN ============

/**
 * Refresh Firebase ID token
 * @returns {Promise<string>} New ID token
 */
export const refreshToken = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    const idToken = await user.getIdToken(true); // Force refresh
    localStorage.setItem(ACCESS_TOKEN_KEY, idToken);
    return idToken;
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
};

// ============ FORGOT PASSWORD ============

/**
 * Send a password reset email to the given address
 * @param {string} email
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with that email address.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    }
    throw new Error(error.message || 'Failed to send reset email. Please try again.');
  }
};
