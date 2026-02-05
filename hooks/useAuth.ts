import { useState, useEffect } from 'react';
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

interface AuthResult {
  data: any;
  error: AuthError | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Buscar sessão inicial
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        });
      } catch (error) {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        // Se for um novo usuário logado, garantir que perfil existe
        if (event === 'SIGNED_IN' && session?.user) {
          await ensureProfileExists(session.user.id, session.user.email || '');
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
      subscription.unsubscribe();
    };
  }, []);

  // Helper: Criar perfil se não existir (fallback)
  const ensureProfileExists = async (userId: string, email: string) => {
    try {
      // Verificar se perfil já existe
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
        console.log('Profile already exists');
        return;
      }

      console.log('Creating profile for user:', userId);

      // Se não existe, criar usando insert direto com bypass de tipagem
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
        console.error('Error creating profile:', insertError);
        // Não lançar erro - o trigger pode ter criado ou pode ser conflito
      } else {
        console.log('Profile created successfully (fallback)');
      }
    } catch (error) {
      console.error('Error in ensureProfileExists:', error);
    }
  };

  // Traduzir erros do Supabase para português
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

  // Função de login com email/senha
  const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        const translatedError = {
          ...error,
          message: translateError(error),
        } as AuthError;
        
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
      const translatedError = {
        ...authError,
        message: translateError(authError),
      } as AuthError;
      
      setAuthState(prev => ({ ...prev, loading: false, error: translatedError }));
      return { data: null, error: translatedError };
    }
  };

  // Função de registro
  const signUpWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const cleanEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: cleanEmail.split('@')[0],
          },
        },
      });

      if (error) {
        const translatedError = {
          ...error,
          message: translateError(error),
        } as AuthError;
        
        setAuthState(prev => ({ ...prev, loading: false, error: translatedError }));
        return { data: null, error: translatedError };
      }

      // Fallback: garantir que perfil foi criado
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
      const translatedError = {
        ...authError,
        message: translateError(authError),
      } as AuthError;
      
      setAuthState(prev => ({ ...prev, loading: false, error: translatedError }));
      return { data: null, error: translatedError };
    }
  };

  // Função de login com Google
  const signInWithGoogle = async (): Promise<AuthResult> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const redirectUrl = makeRedirectUri({
        scheme: 'habittracker',
        path: 'auth/callback',
      });

      console.log('Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        const translatedError = {
          ...error,
          message: translateError(error),
        } as AuthError;
        
        setAuthState(prev => ({ ...prev, loading: false, error: translatedError }));
        return { data: null, error: translatedError };
      }

      // Abrir navegador para autenticação
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success') {
          // A sessão será atualizada pelo onAuthStateChange
          return { data: result, error: null };
        } else {
          const cancelError = {
            message: 'Login cancelado',
            name: 'AuthError',
            status: 400,
          } as AuthError;
          
          setAuthState(prev => ({ ...prev, loading: false, error: cancelError }));
          return { data: null, error: cancelError };
        }
      }

      setAuthState(prev => ({ ...prev, loading: false }));
      return { data, error: null };
    } catch (error) {
      const authError = error as AuthError;
      const translatedError = {
        ...authError,
        message: translateError(authError),
      } as AuthError;
      
      setAuthState(prev => ({ ...prev, loading: false, error: translatedError }));
      return { data: null, error: translatedError };
    }
  };

  // Função de logout
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
      const translatedError = {
        ...authError,
        message: translateError(authError),
      } as AuthError;
      
      setAuthState(prev => ({ ...prev, loading: false, error: translatedError }));
      return { error: translatedError };
    }
  };

  // Função para recuperar senha
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: 'habittracker://reset-password',
        }
      );

      if (error) {
        const translatedError = {
          ...error,
          message: translateError(error),
        } as AuthError;
        return { error: translatedError };
      }

      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      const translatedError = {
        ...authError,
        message: translateError(authError),
      } as AuthError;
      return { error: translatedError };
    }
  };

  return {
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
};