import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useHabits } from '@/hooks/useHabits';
import { DIFFICULTY_CONFIG, HABIT_COLORS } from '@/constants/GameConfig';
import { HabitInsert } from '@/types/database';

export default function CreateHabitScreen() {
  const { createHabit } = useHabits();
  const [loading, setLoading] = useState(false);

  // Estado do formulário
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedColor, setSelectedColor] = useState<string>(HABIT_COLORS[0]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite um nome para o hábito');
      return;
    }

    setLoading(true);

    const habitData: Omit<HabitInsert, 'user_id'> = {
      name: name.trim(),
      description: description.trim() || null,
      type: 'positive', // MVP: apenas hábitos positivos
      frequency_type: 'daily', // MVP: apenas diário
      frequency_days: null,
      has_target: false,
      target_value: null,
      target_unit: null,
      difficulty,
      points_base: DIFFICULTY_CONFIG[difficulty].points,
      color: selectedColor,
      icon: 'star', // MVP: ícone padrão
    };

    const { error } = await createHabit(habitData);

    setLoading(false);

    if (error) {
      Alert.alert('Erro', error);
    } else {
      Alert.alert('Sucesso!', 'Hábito criado com sucesso', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Hábito</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Text style={styles.saveButton}>Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Nome */}
        <View style={styles.section}>
          <Text style={styles.label}>Nome do Hábito *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Meditar, Ler, Exercitar..."
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Adicione detalhes sobre seu hábito..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* Dificuldade */}
        <View style={styles.section}>
          <Text style={styles.label}>Dificuldade</Text>
          <View style={styles.difficultyContainer}>
            {(Object.keys(DIFFICULTY_CONFIG) as Array<'easy' | 'medium' | 'hard'>).map((key) => {
              const config = DIFFICULTY_CONFIG[key];
              const isSelected = difficulty === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.difficultyOption,
                    isSelected && {
                      borderColor: config.color,
                      backgroundColor: config.color + '10',
                    },
                  ]}
                  onPress={() => setDifficulty(key)}
                >
                  <Text
                    style={[
                      styles.difficultyLabel,
                      isSelected && { color: config.color },
                    ]}
                  >
                    {config.label}
                  </Text>
                  <Text style={styles.difficultyPoints}>+{config.points} pts</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Cor */}
        <View style={styles.section}>
          <Text style={styles.label}>Cor</Text>
          <View style={styles.colorContainer}>
            {HABIT_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            💡 Você ganhará <Text style={styles.infoBold}>+{DIFFICULTY_CONFIG[difficulty].points} pontos</Text> toda vez que completar este hábito!
          </Text>
        </View>
      </ScrollView>
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
  cancelButton: {
    fontSize: 16,
    color: '#6b7280',
  },
  saveButton: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  difficultyPoints: {
    fontSize: 12,
    color: '#9ca3af',
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  infoCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '600',
  },
});