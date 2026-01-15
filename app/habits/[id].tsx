import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Hábito</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.placeholder}>
          Tela de detalhes em construção...
        </Text>
        <Text style={styles.id}>Habit ID: {id}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  backButton: {
    fontSize: 16,
    color: '#3b82f6',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholder: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  id: {
    fontSize: 12,
    color: '#9ca3af',
  },
});