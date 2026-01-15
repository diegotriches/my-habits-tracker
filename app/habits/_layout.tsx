import { Stack } from 'expo-router';

export default function HabitsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}