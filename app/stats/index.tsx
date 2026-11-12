// app/stats/index.tsx
import { HeatmapLegend, YearHeatmapGrid } from '@/components/stats/YearHeatmapGrid';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrentDay } from '@/hooks/useCurrentDay';
import { useYearStats } from '@/hooks/useYearStats';
import { capitalizeFirst } from '@/utils/text';
import { computeYearHeatmap, HeatmapDay } from '@/utils/yearHeatmap';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PADDING = 20;

export default function StatsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const today = useCurrentDay();
  const currentYear = parseISO(today).getFullYear();

  const [year, setYear] = useState(currentYear);
  const [habitFilter, setHabitFilter] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

  const { habits, completions, loading, error, refresh } = useYearStats(year);

  // Hábito filtrado que não existe mais (ex.: excluído) volta para "Todos".
  const filteredHabit = habits.find((h) => h.id === habitFilter) ?? null;
  const heatmap = useMemo(
    () =>
      computeYearHeatmap(
        filteredHabit ? [filteredHabit] : habits,
        completions,
        year,
        parseISO(today)
      ),
    [filteredHabit, habits, completions, year, today]
  );

  // Não volta para antes do ano em que o primeiro hábito foi criado.
  const firstYear = habits.reduce(
    (min, h) => Math.min(min, new Date(h.created_at).getFullYear()),
    currentYear
  );

  const changeYear = useCallback((delta: number) => {
    setYear((y) => y + delta);
    setSelectedDay(null);
  }, []);

  const handleDayPress = useCallback((day: HeatmapDay) => {
    setSelectedDay((current) => (current?.date === day.date ? null : day));
  }, []);

  const selectFilter = useCallback((habitId: string | null) => {
    setHabitFilter(habitId);
    setSelectedDay(null);
  }, []);

  const { stats } = heatmap;
  const single = filteredHabit !== null;
  // O dia selecionado é relido do mapa atual (que muda com o filtro).
  const selected = selectedDay
    ? (heatmap.months[parseISO(selectedDay.date).getMonth()].days.find(
        (d) => d.date === selectedDay.date
      ) ?? null)
    : null;

  const describeDay = (day: HeatmapDay) => {
    const date = capitalizeFirst(format(parseISO(day.date), "EEEE, d 'de' MMMM", { locale: ptBR }));
    if (day.future) return `${date}: dia futuro`;
    if (day.due === 0) return `${date}: nada programado`;
    if (single) return `${date}: ${day.done ? 'feito' : 'não feito'}`;
    return `${date}: ${day.done} de ${day.due} ${day.due === 1 ? 'hábito' : 'hábitos'}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: insets.top + 16,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Icon name="chevronLeft" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Estatísticas</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: PADDING, paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {/* Ano */}
        <View style={styles.yearRow}>
          <TouchableOpacity
            onPress={() => changeYear(-1)}
            disabled={year <= firstYear}
            style={[styles.yearButton, { opacity: year <= firstYear ? 0.3 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Ano anterior"
          >
            <Icon name="chevronLeft" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.year, { color: colors.textPrimary }]}>{year}</Text>
          <TouchableOpacity
            onPress={() => changeYear(1)}
            disabled={year >= currentYear}
            style={[styles.yearButton, { opacity: year >= currentYear ? 0.3 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Próximo ano"
          >
            <Icon name="chevronRight" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Filtro por hábito */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipsScroll}
        >
          {[null, ...habits.map((h) => h.id)].map((id) => {
            const habit = id ? habits.find((h) => h.id === id) : null;
            const active = (filteredHabit?.id ?? null) === id;
            const label = habit ? habit.name : 'Todos';
            return (
              <TouchableOpacity
                key={id ?? 'all'}
                onPress={() => selectFilter(id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label}${habit?.archived_at ? ', arquivado' : ''}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? colors.textInverse : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                  {habit?.archived_at ? ' (arquivado)' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />
        ) : error ? (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        ) : (
          <>
            {/* Totais */}
            <View style={styles.statsRow}>
              <StatCard value={String(stats.completions)} label="conclusões" />
              <StatCard
                value={String(stats.perfectDays)}
                label={single ? 'dias feitos' : 'dias completos'}
              />
              <StatCard
                value={stats.rate === null ? '—' : `${stats.rate}%`}
                label="aproveitamento"
              />
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <YearHeatmapGrid
                months={heatmap.months}
                year={year}
                width={width - PADDING * 2 - CARD_PADDING * 2}
                today={today}
                selected={selected?.date ?? null}
                onDayPress={handleDayPress}
              />
              <HeatmapLegend />
            </View>

            <Text
              style={[styles.dayInfo, { color: colors.textSecondary }]}
              accessibilityLiveRegion="polite"
            >
              {selected ? describeDay(selected) : 'Toque num dia para ver os detalhes.'}
            </Text>

            {habits.length === 0 && (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                Crie um hábito para começar a preencher o seu ano.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Fora do corpo da tela: definido dentro, seria remontado a cada render.
const StatCard = React.memo(function StatCard({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.statCard, { backgroundColor: colors.surface }]}
      accessible
      accessibilityLabel={`${value} ${label}`}
    >
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
});

const CARD_PADDING = 16;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerButton: { padding: 8, minWidth: 40 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  yearButton: { padding: 8 },
  year: { fontSize: 20, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  chipsScroll: { marginHorizontal: -PADDING, marginBottom: 16 },
  chips: { paddingHorizontal: PADDING, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 200,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  loading: { marginTop: 40 },
  error: { textAlign: 'center', marginTop: 24, fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: 12, padding: CARD_PADDING },
  dayInfo: { textAlign: 'center', marginTop: 14, fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 16, fontSize: 14 },
});
