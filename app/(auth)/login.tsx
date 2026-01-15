import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // true = login, false = registro
  const { signInWithEmail, signUpWithEmail, loading } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter no mínimo 6 caracteres');
      return;
    }

    try {
      if (isLogin) {
        // Login
        const { error } = await signInWithEmail(email, password);
        if (error) {
          Alert.alert('Erro no Login', error.message);
        } else {
          // Redirecionar para a home
          router.replace('/(tabs)');
        }
      } else {
        // Registro
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          Alert.alert('Erro no Cadastro', error.message);
        } else {
          Alert.alert(
            'Sucesso!',
            'Conta criada com sucesso! Verifique seu email para confirmação.',
            [{ text: 'OK', onPress: () => setIsLogin(true) }]
          );
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro inesperado');
      console.error(error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🎯</Text>
          <Text style={styles.title}>My Habits Tracker</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Entrar' : 'Cadastrar'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle Login/Registro */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsLogin(!isLogin)}
            disabled={loading}
          >
            <Text style={styles.toggleText}>
              {isLogin
                ? 'Não tem conta? Cadastre-se'
                : 'Já tem conta? Faça login'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Versão 1.0.0 • My Habits Tracker
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 12,
  },
});