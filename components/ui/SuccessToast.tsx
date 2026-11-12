import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface SuccessToastProps {
  visible: boolean;
  message: string;
  duration?: number;
  onHide?: () => void;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({
  visible,
  message,
  duration = 3000,
  onHide,
}) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  // As telas passam `onHide` como função criada na hora; guardá-la num ref
  // deixa o hideToast estável — senão, no array de dependências do efeito,
  // o timer recomeçaria a cada render da tela e o toast poderia não sumir.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHideRef.current?.();
    });
  }, [opacity, translateY]);

  useEffect(() => {
    if (visible) {
      // Aparecer
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide após duração
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, hideToast, opacity, translateY]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.success,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Icon name="checkCircle" size={20} color="#FFFFFF" />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});
