import { Tabs } from 'expo-router';
import React from 'react';
import { Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hábitos',
          tabBarIcon: ({ color }) => <TabBarIcon name="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Estatísticas',
          tabBarIcon: ({ color }) => <TabBarIcon name="📊" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <TabBarIcon name="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabBarIcon({ name, color }: { name: string; color: string }) {
  return (
    <Text style={{ fontSize: 24, opacity: color === '#3b82f6' ? 1 : 0.5 }}>
      {name}
    </Text>
  );
}