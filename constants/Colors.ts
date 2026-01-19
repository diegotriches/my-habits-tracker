// constants/Colors.ts

// Mantendo compatibilidade com código antigo
const tintColorLight = '#3b82f6';
const tintColorDark = '#60A5FA';

// Sistema de cores expandido
export const Colors = {
  light: {
    // Compatibilidade (antigo)
    text: '#1F2937',
    background: '#FFFFFF',
    tint: tintColorLight,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    
    // Novo sistema expandido
    // Backgrounds
    surface: '#F9FAFB',
    surfaceElevated: '#FFFFFF',
    
    // Brand Colors
    primary: '#3B82F6',
    primaryLight: '#DBEAFE',
    primaryDark: '#1E40AF',
    secondary: '#8B5CF6',
    secondaryLight: '#EDE9FE',
    accent: '#F59E0B',
    
    // Status Colors
    success: '#10B981',
    successLight: '#D1FAE5',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    
    // Text (expandido)
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textInverse: '#FFFFFF',
    textDisabled: '#D1D5DB',
    
    // UI Elements
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    divider: '#E5E7EB',
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Interactive
    ripple: 'rgba(59, 130, 246, 0.12)',
    hover: 'rgba(59, 130, 246, 0.08)',
    pressed: 'rgba(59, 130, 246, 0.16)',
    
    // Special
    streak: '#F97316',
    streakLight: '#FED7AA',
    points: '#EAB308',
    level: '#8B5CF6',
  },
  
  dark: {
    // Compatibilidade (antigo)
    text: '#F1F5F9',
    background: '#0F172A',
    tint: tintColorDark,
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorDark,
    
    // Novo sistema expandido
    // Backgrounds
    surface: '#1E293B',
    surfaceElevated: '#334155',
    
    // Brand Colors
    primary: '#60A5FA',
    primaryLight: '#1E3A8A',
    primaryDark: '#93C5FD',
    secondary: '#A78BFA',
    secondaryLight: '#4C1D95',
    accent: '#FCD34D',
    
    // Status Colors
    success: '#34D399',
    successLight: '#064E3B',
    danger: '#F87171',
    dangerLight: '#7F1D1D',
    warning: '#FCD34D',
    warningLight: '#78350F',
    info: '#60A5FA',
    infoLight: '#1E3A8A',
    
    // Text (expandido)
    textPrimary: '#F1F5F9',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
    textInverse: '#0F172A',
    textDisabled: '#475569',
    
    // UI Elements
    border: '#334155',
    borderLight: '#1E293B',
    divider: '#334155',
    shadow: 'rgba(0, 0, 0, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.7)',
    
    // Interactive
    ripple: 'rgba(96, 165, 250, 0.12)',
    hover: 'rgba(96, 165, 250, 0.08)',
    pressed: 'rgba(96, 165, 250, 0.16)',
    
    // Special
    streak: '#FB923C',
    streakLight: '#78350F',
    points: '#FDE047',
    level: '#C4B5FD',
  },
};

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof Colors.light;

// Export default para compatibilidade com código antigo
export default Colors;