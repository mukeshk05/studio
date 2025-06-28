
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase'; // Assuming firebase.ts is in lib
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';


interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<User | null>;
  signupWithEmail: (email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Force a token refresh to ensure the backend recognizes the user.
          // This is the critical step to prevent race conditions.
          await user.getIdToken(true); 
          setCurrentUser(user);
        } catch (error) {
          console.error("AuthContext: Critical token refresh failed. User session might be invalid.", error);
          // If token refresh fails, it's safer to treat the user as logged out.
          setCurrentUser(null);
        } finally {
          setLoading(false);
        }
      } else {
        // No user, just set state and finish loading.
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return unsubscribe; // Unsubscribe on unmount
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle setting currentUser and loading state
      router.push('/planner'); // Redirect after successful login
      toast({ title: "Login Successful", description: "Welcome back!" });
    } catch (error: any) {
      console.error("Google login error:", error);
      toast({ title: "Login Failed", description: error.message || "Could not sign in with Google.", variant: "destructive" });
      setLoading(false);
    }
  };
  
  const loginWithEmail = async (email: string, pass: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting currentUser and loading state
      router.push('/planner');
      toast({ title: "Login Successful", description: "Welcome back!" });
      return userCredential.user;
    } catch (error: any) {
      console.error("Email login error:", error);
      toast({ title: "Login Failed", description: error.message || "Invalid email or password.", variant: "destructive" });
      setLoading(false);
      return null;
    }
  };

  const signupWithEmail = async (email: string, pass: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting currentUser and loading state
      router.push('/planner'); 
      toast({ title: "Signup Successful", description: "Welcome to BudgetRoam!" });
      return userCredential.user;
    } catch (error: any) {
      console.error("Email signup error:", error);
      toast({ title: "Signup Failed", description: error.message || "Could not create account.", variant: "destructive" });
      setLoading(false);
      return null;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set currentUser to null and loading to false
      router.push('/'); // Redirect to landing page after logout
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (error: any) {
      console.error("Logout error: ", error);
      toast({ title: "Logout Failed", description: error.message || "Could not log out.", variant: "destructive" });
    } finally {
      // onAuthStateChanged will set loading to false, but we can do it here too just in case
      if (auth.currentUser === null) {
        setLoading(false);
      }
    }
  };


  const value = {
    currentUser,
    loading,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
