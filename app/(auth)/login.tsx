// app/(auth)/login.tsx
import { Icon } from '@/components/ui/Icon';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_SUBMIT_INTERVAL = 2000; // 2 seconds between attempts

export default function LoginScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const { signInWithEmail, signInWithGoogle, resetPassword, loading } = useAuth();
  const lastSubmitRef = useRef(0);

  const validateEmail = (value: string): boolean => {
    return EMAIL_REGEX.test(value.trim());
  };

  const handleEmailLogin = async () => {
    // Rate limiting
    const now = Date.now();
    if (now - lastSubmitRef.current < MIN_SUBMIT_INTERVAL) {
      return;
    }
    lastSubmitRef.current = now;

    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Erro', 'Digite um email válido');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter no mínimo 6 caracteres');
      return;
    }

    try {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        Alert.alert('Erro no Login', error.message);
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro inesperado');
      console.error(error);
    }
  };

  const handleGoogleSignIn = async () => {
    const now = Date.now();
    if (now - lastSubmitRef.current < MIN_SUBMIT_INTERVAL) {
      return;
    }
    lastSubmitRef.current = now;

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        if (error.message !== 'Login cancelado') {
          Alert.alert('Erro no Login com Google', error.message);
        }
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao fazer login com Google');
      console.error(error);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      Alert.alert('Erro', 'Digite seu email');
      return;
    }

    if (!validateEmail(forgotEmail)) {
      Alert.alert('Erro', 'Digite um email válido');
      return;
    }

    setSendingReset(true);
    try {
      const { error } = await resetPassword(forgotEmail);
      if (error) {
        Alert.alert('Erro', error.message);
      } else {
        Alert.alert(
          'Email enviado',
          'Se este email estiver cadastrado, você receberá um link para redefinir sua senha.',
          [{ text: 'OK', onPress: () => setShowForgotPassword(false) }]
        );
        setForgotEmail('');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar o email');
    } finally {
      setSendingReset(false);
    }
  };

  const goToSignup = () => {
    router.push('/(auth)/signup');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primaryLight }]}>
            <Icon name="target" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            My Habits Tracker
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Entre na sua conta
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Google Sign In Button */}
          <GoogleSignInButton
            onPress={handleGoogleSignIn}
            loading={loading}
            disabled={loading}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textTertiary }]}>ou</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {showForgotPassword ? (
            /* Forgot Password Form */
            <>
              <Text style={[styles.forgotTitle, { color: colors.textPrimary }]}>
                Redefinir senha
              </Text>
              <Text style={[styles.forgotDescription, { color: colors.textSecondary }]}>
                Digite seu email e enviaremos um link para redefinir sua senha.
              </Text>

              <View style={styles.inputContainer}>
                <View style={styles.inputIconContainer}>
                  <Icon name="mail" size={20} color={colors.textTertiary} />
                </View>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  }]}
                  placeholder="Email"
                  placeholderTextColor={colors.textTertiary}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!sendingReset}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleForgotPassword}
                disabled={sendingReset}
              >
                {sendingReset ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                    Enviar link
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowForgotPassword(false)}
              >
                <Text style={[styles.toggleText, { color: colors.primary }]}>
                  Voltar para login
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Login Form */
            <>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIconContainer}>
                  <Icon name="mail" size={20} color={colors.textTertiary} />
                </View>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  }]}
                  placeholder="Email"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIconContainer}>
                  <Icon name="lock" size={20} color={colors.textTertiary} />
                </View>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  }]}
                  placeholder="Senha"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icon
                    name={showPassword ? "eye" : "eyeOff"}
                    size={20}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotButton}
                onPress={() => {
                  setForgotEmail(email);
                  setShowForgotPassword(true);
                }}
              >
                <Text style={[styles.forgotText, { color: colors.primary }]}>
                  Esqueceu sua senha?
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleEmailLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <Icon
                      name="login"
                      size={20}
                      color={colors.textInverse}
                    />
                    <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                      Entrar
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Ir para Cadastro */}
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={goToSignup}
                disabled={loading}
              >
                <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
                  Não tem conta?{' '}
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>
                    Cadastre-se
                  </Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Versão 1.2.0 • My Habits Tracker
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    width: '100%',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  inputIconContainer: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 48,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 14,
    padding: 4,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: -8,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  forgotTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  forgotDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleText: {
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});