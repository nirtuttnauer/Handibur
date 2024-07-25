'use strict';
import { useRouter, useSegments } from "expo-router";
import * as React from "react";
import { supabase } from "./supabaseClient";
import * as SecureStore from "expo-secure-store";

// types.ts
export type User = {
  id: string;
  email: string;
  // Add other user fields as necessary
};

const CREDENTIALS_KEY = 'userCredentials';

const AuthContext = React.createContext<any>(null);

export function useAuth() {
  return React.useContext(AuthContext);
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const segments = useSegments();
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    const getSession = async () => {
      // console.log("Fetching session...");
      const { data: { session } } = await supabase.auth.getSession();
      // console.log("Session fetched:", session);
      setUser((session?.user ?? null) as User | null);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", session);
      setUser((session?.user ?? null) as User | null);
    });

    return () => {
      console.log("Cleaning up auth listener...");
      authListener.subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    console.log("segments", segments);
    console.log("user state:", user);

    if (!user && segments[0] !== "(auth)") {
      // console.log("No user, redirecting to login...");
      router.replace("/(auth)/login");
    } else if (user && segments[0] === "(auth)") {
      // console.log("User logged in, redirecting to home...");
      router.replace("/");
    }
  }, [user, segments]);

  const logIn = async (email: string, password: string) => {
    console.log("Attempting to log in with email:", email);
  
    try {
      const response = await supabase.auth.signInWithPassword({ email, password });
      const { error, data } = response;
      if (error) {
        console.error("Login error:", error.message);
        console.error("Full response:", response);
        throw error;
      }
      const { session } = data;
      setUser((session?.user ?? null) as User | null);
      // Store credentials in secure store
      console.log("Storing credentials in secure store...");
      await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify({ email, password }));
      console.log("Login successful:", session);
    } catch (error) {
      console.error("An error occurred during login:", error);
    }
  };

  const signUp = async (email: string, password: string) => {
    console.log("Attempting to sign up with email:", email);
    
    try {
      const { error, data } = await supabase.auth.signUp({ email, password });
  
      if (error) {
        console.error("Signup error:", error.message);
        throw error;
      }
  
      const { session } = data;
      setUser((session?.user ?? null) as User | null);
      console.log("Signup successful:", session);
    } catch (error) {
      console.error("An error occurred during signup:", error);
    }
  };

  const logOut = async () => {
    console.log("Logging out...");
    await supabase.auth.signOut();
    setUser(null);
    // Remove credentials from secure store
    // await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    console.log("Logged out");
  };

  return (
    <AuthContext.Provider
      value={{
        user: user,
        logIn: logIn,
        signUp: signUp,
        logOut: logOut,
        
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}