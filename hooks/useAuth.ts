// hooks/useAuth.tsx
// ✅ PROXY - Re-exporta useAuth do AuthContext
// Mantém compatibilidade com imports antigos sem duplicar lógica

export { useAuth } from '@/contexts/AuthContext';