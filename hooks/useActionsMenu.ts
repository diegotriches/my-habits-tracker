import { useRef, useState } from 'react';
import { Animated } from 'react-native';
import { hapticFeedback } from '@/utils/haptics';

/**
 * Hook genérico para controlar um menu dropdown de ações (estilo "...").
 * Cuida do estado de visibilidade e das animações de entrada/saída do
 * menu e de feedback de toque no botão que o aciona.
 *
 * Reutilizável em qualquer tela que precise desse padrão de menu.
 */
export function useActionsMenu() {
  const [visible, setVisible] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const triggerScale = useRef(new Animated.Value(1)).current;

  const open = () => {
    hapticFeedback.light();
    setVisible(true);
    Animated.spring(menuAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 9,
      tension: 90,
    }).start();
  };

  const close = () => {
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const toggle = () => {
    if (visible) {
      close();
    } else {
      open();
    }
  };

  const handlePressIn = () => {
    Animated.spring(triggerScale, { toValue: 0.85, useNativeDriver: true, friction: 5 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(triggerScale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  };

  return {
    visible,
    menuAnim,
    triggerScale,
    open,
    close,
    toggle,
    handlePressIn,
    handlePressOut,
  };
}