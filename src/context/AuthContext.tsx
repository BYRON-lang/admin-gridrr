'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User as SupabaseUser, SupabaseClient } from '@supabase/supabase-js';
// Remove the Database type import since we're not using it and it's causing errors
// import type { Database } from '@/types/supabase';

type User = {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
  };
} | null;

type AuthContextType = {
  user: User;
  supabase: SupabaseClient; // Remove generic type parameter
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  initialized: boolean;
};

// Create a default Supabase client for the default context
const defaultSupabase = createClientComponentClient();

const defaultContext: AuthContextType = {
  user: null,
  supabase: defaultSupabase,
  login: async () => ({ success: false, error: 'AuthContext not initialized' }),
  signup: async () => ({ success: false, error: 'AuthContext not initialized' }),
  logout: async () => {},
  loading: true,
  initialized: false,
};

const AuthContext = createContext<AuthContextType>(defaultContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  // Check storage buckets on component mount
  useEffect(() => {
    const checkStorage = async () => {
      try {
        const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'Gridrr';
        console.log(`Checking access to bucket: ${bucketName}`);
        
        // Try to list files directly in the bucket
        const { data: files, error: listError } = await supabase.storage
          .from(bucketName)
          .list();
        
        if (listError) {
          console.error('Error accessing bucket:', listError);
          console.log('This usually means the bucket name is incorrect or the client lacks permissions');
          return;
        }
        
        console.log(`✅ Successfully accessed bucket: ${bucketName}`);
        console.log(`📁 Files in bucket:`, files);
        
        // Also check if we can get the public URL of a known file
        if (files && files.length > 0) {
          const testFile = files[0].name;
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(testFile);
          console.log(`🔗 Public URL for ${testFile}:`, publicUrl);
        }
      } catch (err) {
        console.error('Error checking storage:', err);
      }
    };
    
    // Only check storage if we have a user
    if (user) {
      checkStorage();
    }
  }, [user, supabase]);
  
  // Expose supabase client through context
  const contextValue: AuthContextType = {
    user,
    supabase,
    loading,
    initialized,
    login: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return {
        success: !error,
        error: error?.message
      };
    },
    signup: async (email: string, password: string, name?: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || ''
          }
        }
      });
      return {
        success: !error,
        error: error?.message
      };
    },
    logout: async () => {
      await supabase.auth.signOut();
      router.push('/signin');
    }
  };

  // Helper function to transform Supabase user to our User type
  const transformUser = useCallback((supabaseUser: SupabaseUser | null): User => {
    if (!supabaseUser) return null;
    
    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      user_metadata: supabaseUser.user_metadata || {}
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setUser(null);
          }
          return;
        }

        if (mounted) {
          setUser(transformUser(session?.user || null));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
        } else if (session?.user) {
          setUser(transformUser(session.user));
        }

        setLoading(false);
        setInitialized(true);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [transformUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
      }

      if (data?.user) {
        // The auth state change listener will handle setting the user
        return { success: true };
      }
      
      return { success: false, error: 'Login failed - no user data returned' };
    } catch (error: any) {
      console.error('Unexpected login error:', error);
      return { success: false, error: error.message || 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    try {
      setLoading(true);
      
      const signupOptions = {
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: name ? { name } : undefined,
        },
      };

      const { data, error } = await supabase.auth.signUp(signupOptions);

      if (error) {
        console.error('Signup error:', error);
        return { success: false, error: error.message };
      }

      // Check if user needs to verify email
      if (data?.user && !data.session) {
        return { 
          success: true, 
          error: 'Please check your email to verify your account' 
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      return { success: false, error: error.message || 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        // Still try to clear local state even if logout fails
      }
      
      setUser(null);
      
      // Small delay to ensure state is updated before navigation
      setTimeout(() => {
        router.push('/signin');
      }, 100);
    } catch (error) {
      console.error('Unexpected logout error:', error);
      // Clear local state even if there's an error
      setUser(null);
      router.push('/signin');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const value = {
    user,
    login,
    signup,
    logout,
    loading,
    initialized,
  };

  return (
    <AuthContext.Provider value={{
      ...contextValue,
      supabase
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};