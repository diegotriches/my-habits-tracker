import * as Haptics from 'expo-haptics';

/**
 * Utility para feedback háptico (vibração)
 * Melhora a experiência do usuário com feedback tátil
 */

export const hapticFeedback = {
  /**
   * Feedback leve - Para interações simples
   * Uso: Pressionar botões, selecionar items
   */
  light: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Silenciosamente falha se haptics não estiver disponível
    }
  },

  /**
   * Feedback médio - Para ações importantes
   * Uso: Completar hábito, salvar dados
   */
  medium: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Silenciosamente falha se haptics não estiver disponível
    }
  },

  /**
   * Feedback pesado - Para ações críticas
   * Uso: Deletar item, confirmar ação importante
   */
  heavy: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      // Silenciosamente falha se haptics não estiver disponível
    }
  },

  /**
   * Feedback de sucesso - Quando algo dá certo
   * Uso: Hábito completado com sucesso, streak atingido
   */
  success: async () => {
    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    } catch (error) {
      // Silenciosamente falha se haptics não estiver disponível
    }
  },

  /**
   * Feedback de aviso - Quando precisa atenção
   * Uso: Validação de formulário, limite atingido
   */
  warning: async () => {
    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );
    } catch (error) {
      // Silenciosamente falha se haptics não estiver disponível
    }
  },

  /**
   * Feedback de erro - Quando algo dá errado
   * Uso: Erro ao salvar, ação não permitida
   */
  error: async () => {
    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );
    } catch (error) {
      // Silenciosamente falha se haptics não estiver disponível
    }
  },

  /**
   * Feedback de seleção - Para mudanças de estado
   * Uso: Toggle de switches, mudança de tabs
   */
  selection: async () => {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      // Silenciosamente falha se haptics não estiver disponível
    }
  },
};