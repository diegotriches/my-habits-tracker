// app/habits/edit/[id].tsx
import { Icon } from '@/components/ui/Icon';
import { DIFFICULTY_CONFIG, HABIT_COLORS } from '@/constants/GameConfig';
import { useHabits } from '@/hooks/useHabits';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';

export default function EditHabitScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getHabit, updateHabit } = useHabits();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedColor, setSelectedColor] = useState<string>(HABIT_COLORS[0]);

  useEffect(() => {
    loadHabit();
  }, [id]);

  const loadHabit = async () => {
    const { data, error } = await getHabit(id as string);
    
    if (error || !data) {
      Alert.alert('Erro', 'Não foi possível carregar o hábito');
      router.back();
      return;
    }

    setName((data as any).name);
    setDescription((data as any).description || '');
    setDifficulty((data as any).difficulty);
    setSelectedColor((data as any).color);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite um nome para o hábito');
      return;
    }

    setSaving(true);

    const updates = {
      name: name.trim(),
      description: description.trim() || null,
      difficulty,
      points_base: DIFFICULTY_CONFIG[difficulty].points,
      color: selectedColor,
    };

    const { error } = await updateHabit(id as string, updates);

    setSaving(false);

    if (error) {
      Alert.alert('Erro', error);
    } else {
      Alert.alert('Sucesso!', 'Hábito atualizado com sucesso', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.cancelButton, { color: colors.textSecondary }]}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Editar Hábito</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveButton, { color: colors.primary }]}>Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Nome */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Nome do Hábito *</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary 
            }]}
            placeholder="Ex: Meditar, Ler, Exercitar..."
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { 
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary 
            }]}
            placeholder="Adicione detalhes sobre seu hábito..."
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* Dificuldade */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Dificuldade</Text>
          <View style={styles.difficultyContainer}>
            {(Object.keys(DIFFICULTY_CONFIG) as Array<'easy' | 'medium' | 'hard'>).map((key) => {
              const config = DIFFICULTY_CONFIG[key];
              const isSelected = difficulty === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.difficultyOption,
                    { borderColor: colors.border },
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
                      { color: colors.textSecondary },
                      isSelected && { color: config.color },
                    ]}
                  >
                    {config.label}
                  </Text>
                  <Text style={[styles.difficultyPoints, { color: colors.textTertiary }]}>
                    +{config.points} pts
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Cor */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Cor</Text>
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
        <View style={[styles.infoCard, { backgroundColor: colors.infoLight }]}>
          <Icon name="info" size={16} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.info }]}>
            Você ganhará <Text style={styles.infoBold}>+{DIFFICULTY_CONFIG[difficulty].points} pontos</Text> toda vez que completar este hábito!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    fontSize: 16,
  },
  saveButton: {
    fontSize: 16,
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
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
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
    alignItems: 'center',
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  difficultyPoints: {
    fontSize: 12,
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
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '600',
  },
});