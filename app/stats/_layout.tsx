// app/stats/_layout.tsx
import { Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

export default function StatsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
