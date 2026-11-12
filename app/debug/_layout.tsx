// app/debug/_layout.tsx
import { Redirect, Slot } from 'expo-router';

/**
 * Telas de diagnóstico só existem em desenvolvimento. Esconder o botão no
 * menu não basta: a rota abria em qualquer build pelo deep link
 * habittracker://debug/... — em produção, ele agora cai na home.
 */
export default function DebugLayout() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Slot />;
}
