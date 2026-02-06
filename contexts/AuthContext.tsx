// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/services/supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

interface AuthContextType extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ data: any; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    console.log('🔐 AuthProvider: Initializing...');
    
    // Buscar sessão inicial
    const getSession = async () => {
      try {
        console.log('🔍 Fetching initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        console.log('📊 Initial session:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
        });
        
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('❌ Error fetching session:', error);
        setAuthState({
          user: null,
          session: null,
          loading: false,
          error: error as AuthError,
        });
      }
    };

    getSession();

    // Escutar mudanças de autenticação
    console.log('👂 Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, {
          hasUser: !!session?.user,
          userId: session?.user?.id,
        });
        
        // ✅ Ignorar INITIAL_SESSION - já processado em getSession()
        if (event === 'INITIAL_SESSION') {
          console.log('⏭️ Ignoring INITIAL_SESSION (already processed)');
          return;
        }
        
        // Se for um novo usuário logado, garantir que perfil existe
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in');
          await ensureProfileExists(session.user.id, session.user.email || '');
        }

        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
        }
        
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        });
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth listener...');
      subscription.unsubscribe();
    };
  }, []); // ✅ Array vazio - só executa UMA VEZ

  // Helper: Criar perfil se não existir
  const ensureProfileExists = async (userId: string, email: string) => {
    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking profile:', fetchError);
        return;
      }

      if (existingProfile) {
        console.log('✅ Profile already exists');
        return;
      }

      console.log('📝 Creating profile for user:', userId);
      const displayName = email.split('@')[0] || 'Usuário';
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          display_name: displayName,
          level: 1,
          total_points: 0,
        } as any);

      if (insertError) {
        console.error('❌ Error creating profile:', insertError);
      } else {
        console.log('✅ Profile created successfully');
      }
    } catch (error) {
      console.error('❌ Error in ensureProfileExists:', error);
    }
  };

  // Traduzir erros
  const translateError = (error: AuthError): string => {
    const errorMessages: { [key: string]: string } = {
      'Invalid login credentials': 'Email ou senha incorretos',
      'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
      'User already registered': 'Este email já está cadastrado',
      'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres',
      'Unable to validate email address: invalid format': 'Formato de email inválido',
      'Signup requires a valid password': 'Senha inválida',
      'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
      'Invalid email or password': 'Email ou senha inválidos',
    };
    return errorMessages[error.message] || error.message || 'Erro desconhecido';
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        const translatedError = { ...error, message: translateError(error) } as AuthError;
        setAuthState(prev => ({ ...prev, loading: false, error: translatedError }));
        return { data: null, error: translatedError };
      }

      setAuthState({
        user: data.user,
        session: data.session,
        loading: false,
        error: null,
      });

      return { data, error: null };
    } catch (error) {
      const authError = error as AuthError;
      const translatedError = { ...authError, message: translateError(authError) } as AuthError;
      setAuthState(prev => ({ ...prev, loading: false, error: translatedError }));
      return { data: null, error: translatedError };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { display_name: cleanEmail.split('@')[0] },
        },
      });

      if (error) {
        const translatedError = { ...error, message: translateError(error) } as AuthError;
        setAuthState(prev => ({ ...prev, loading: false, error: translatedError }));
        return { data: null, error: translatedError };
      }

      if (data.user) {
        await ensureProfileExists(data.user.id, cleanEmail);
      }

      setAuthState({
        user: data.user,
        session: data.session,
        loading: false,
        error: null,
      });

      return { data, error: null };
    } catch (error) {
      const authError = error as AuthError;
      const translatedError = { ...authError, message: translateError(authError) } as AuthError;
      setAuthState(prev => ({ ...prev, loading: false, error: translatedError }));
      return { data: null, error: translatedError };
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('🚀 ========== INICIANDO LOGIN GOOGLE ==========');
      console.log('📍 Called from:', new Error().stack?.split('\n')[2]?.trim() || 'unknown');
      
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const redirectUrl = makeRedirectUri({
        scheme: 'habittracker',
        path: 'auth/callback',
      });

      console.log('🔗 Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('❌ OAuth setup error:', error);
        const translatedError = { ...error, message: translateError(error) } as AuthError;
        setAuthState(prev => ({ ...prev, loading: false, error: translatedError }));
        return { data: null, error: translatedError };
      }

      if (data?.url) {
        console.log('🌐 Opening browser for OAuth...');
        console.log('📍 OAuth URL:', data.url.substring(0, 100) + '...');
        
        // ✅ NÃO AGUARDAR O RETORNO - apenas abrir o browser
        // O callback será processado pelo deep link listener no _layout.tsx
        console.log('⏳ Opening browser without waiting for return...');
        
        WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
          .then(result => {
            console.log('📱 Browser closed:', result.type);
            // Não fazer nada aqui - o deep link listener vai processar
          })
          .catch(err => {
            console.error('❌ Browser error:', err);
          });

        console.log('✅ Browser opened - waiting for callback via deep link');
        console.log('ℹ️ Deep link listener will process the OAuth callback');
        
        // Retornar imediatamente - deixar loading: true
        // O callback será processado pelo listener de deep link
        return { data, error: null };
      }

      console.log('⚠️ No OAuth URL returned');
      setAuthState(prev => ({ ...prev, loading: false }));
      return { data, error: null };
    } catch (error) {
      console.error('❌ Unexpected error in signInWithGoogle:', error);
      const authError = error as AuthError;
      const translatedError = { ...authError, message: translateError(authError) } as AuthError;
      setAuthState(prev => ({ ...prev, loading: false, error: translatedError }));
      return { data: null, error: translatedError };
    }
  };

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setAuthState({
        user: null,
        session: null,
        loading: false,
        error: null,
      });

      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      const translatedError = { ...authError, message: translateError(authError) } as AuthError;
      setAuthState(prev => ({ ...prev, loading: false, error: translatedError }));
      return { error: translatedError };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: 'habittracker://reset-password' }
      );

      if (error) {
        const translatedError = { ...error, message: translateError(error) } as AuthError;
        return { error: translatedError };
      }

      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      const translatedError = { ...authError, message: translateError(authError) } as AuthError;
      return { error: translatedError };
    }
  };

  const value: AuthContextType = {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    error: authState.error,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
    isAuthenticated: !!authState.user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}