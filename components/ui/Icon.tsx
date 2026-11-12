// components/ui/Icon.tsx
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { IconName, Icons } from '../../constants/Icons';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color, strokeWidth = 2 }: IconProps) {
  const { colors } = useTheme();
  const IconComponent = Icons[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <IconComponent size={size} color={color || colors.textPrimary} strokeWidth={strokeWidth} />
  );
}
