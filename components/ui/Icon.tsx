// components/ui/Icon.tsx
import React from 'react';
import { Icons, IconName } from '../../constants/Icons';
import { useTheme } from '@/app/contexts/ThemeContext';

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
    <IconComponent
      size={size}
      color={color || colors.textPrimary}
      strokeWidth={strokeWidth}
    />
  );
}

// Variantes pré-configuradas para casos comuns
export function PrimaryIcon(props: Omit<IconProps, 'color'>) {
  const { colors } = useTheme();
  return <Icon {...props} color={colors.primary} />;
}

export function SecondaryIcon(props: Omit<IconProps, 'color'>) {
  const { colors } = useTheme();
  return <Icon {...props} color={colors.textSecondary} />;
}

export function TertiaryIcon(props: Omit<IconProps, 'color'>) {
  const { colors } = useTheme();
  return <Icon {...props} color={colors.textTertiary} />;
}

export function SuccessIcon(props: Omit<IconProps, 'color'>) {
  const { colors } = useTheme();
  return <Icon {...props} color={colors.success} />;
}

export function DangerIcon(props: Omit<IconProps, 'color'>) {
  const { colors } = useTheme();
  return <Icon {...props} color={colors.danger} />;
}

export function WarningIcon(props: Omit<IconProps, 'color'>) {
  const { colors } = useTheme();
  return <Icon {...props} color={colors.warning} />;
}

export function StreakIcon(props: Omit<IconProps, 'color' | 'name'>) {
  const { colors } = useTheme();
  return <Icon name="flame" {...props} color={colors.streak} />;
}

export function PointsIcon(props: Omit<IconProps, 'color' | 'name'>) {
  const { colors } = useTheme();
  return <Icon name="star" {...props} color={colors.points} />;
}