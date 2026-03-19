// components/habits/DraggableHabitList.tsx
import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  UIManager,
  View,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Habit } from '@/types/database';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticFeedback } from '@/utils/haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DraggableHabitListProps {
  habits: Habit[];
  orderedIds: string[];
  onOrderChange: (newOrder: string[]) => void;
  renderItem: (habit: Habit) => React.ReactNode;
  ListHeaderComponent?: React.ReactElement;
  refreshControl?: React.ReactElement;
  contentContainerStyle?: object;
}

interface ItemLayout {
  height: number;
}

export function DraggableHabitList({
  habits,
  orderedIds,
  onOrderChange,
  renderItem,
  ListHeaderComponent,
  refreshControl,
  contentContainerStyle,
}: DraggableHabitListProps) {
  const { colors } = useTheme();

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [floatingTop, setFloatingTop] = useState(0);

  const floatingScale = useSharedValue(1);
  const floatingOpacity = useSharedValue(0);

  // Apenas altura de cada item — y é calculado acumulando alturas anteriores
  const itemHeights = useRef<Record<string, number>>({});
  const draggingIndexRef = useRef<number | null>(null);
  const dragTargetIndexRef = useRef<number | null>(null);
  const scrollOffsetY = useRef(0);
  const containerRef = useRef<View>(null);
  const containerPageY = useRef(0);
  const touchOffsetInCard = useRef(0);
  // Altura do ListHeaderComponent
  const headerHeight = useRef(0);

  const sortedHabits = orderedIds
    .map(id => habits.find(h => h.id === id))
    .filter(Boolean) as Habit[];

  // Calcula o Y acumulado de um item somando alturas dos itens anteriores
  const getItemY = useCallback((index: number): number => {
    let y = headerHeight.current;
    for (let i = 0; i < index; i++) {
      const id = sortedHabits[i]?.id;
      y += itemHeights.current[id] ?? 0;
    }
    return y;
  }, [sortedHabits]);

  const getIndexFromAbsoluteY = useCallback((absoluteY: number): number => {
    const relativeY = absoluteY - containerPageY.current + scrollOffsetY.current;
    let accumulated = headerHeight.current;
    for (let i = 0; i < sortedHabits.length; i++) {
      const id = sortedHabits[i].id;
      accumulated += itemHeights.current[id] ?? 0;
      if (relativeY < accumulated) return i;
    }
    return sortedHabits.length - 1;
  }, [sortedHabits]);

  const startDrag = useCallback((index: number, absoluteY: number) => {
    if (!containerRef.current) return;

    containerRef.current.measure((_x, _y, _w, _h, _px, pageY) => {
      containerPageY.current = pageY;

      const cardY = getItemY(index);
      const cardHeight = itemHeights.current[sortedHabits[index]?.id] ?? 0;

      // Posição absoluta do topo do card na tela
      const cardAbsoluteTop = pageY + cardY - scrollOffsetY.current;
      // Onde dentro do card o dedo tocou
      touchOffsetInCard.current = absoluteY - cardAbsoluteTop;
      // Top do card flutuante relativo ao container
      const cardTopInContainer = cardY - scrollOffsetY.current;

      setFloatingTop(cardTopInContainer);
      floatingScale.value = withSpring(1.04, { damping: 14, stiffness: 180 });
      floatingOpacity.value = withTiming(1, { duration: 100 });

      draggingIndexRef.current = index;
      dragTargetIndexRef.current = index;
      setDraggingIndex(index);
      setDragTargetIndex(index);
      hapticFeedback.selection();
    });
  }, [sortedHabits, floatingScale, floatingOpacity, getItemY]);

  const moveDrag = useCallback((absoluteY: number) => {
    if (draggingIndexRef.current === null) return;

    const newTop = absoluteY - containerPageY.current - touchOffsetInCard.current;
    setFloatingTop(newTop);

    const newTarget = getIndexFromAbsoluteY(absoluteY);
    if (newTarget !== dragTargetIndexRef.current) {
      dragTargetIndexRef.current = newTarget;
      hapticFeedback.selection();
      setDragTargetIndex(newTarget);
    }
  }, [getIndexFromAbsoluteY]);

  const endDrag = useCallback(() => {
    const from = draggingIndexRef.current;
    const to = dragTargetIndexRef.current;

    floatingScale.value = withSpring(1, { damping: 14, stiffness: 180 });
    floatingOpacity.value = withTiming(0, { duration: 150 });

    if (from !== null && to !== null && from !== to) {
      const newOrder = [...orderedIds];
      const [moved] = newOrder.splice(from, 1);
      newOrder.splice(to, 0, moved);
      onOrderChange(newOrder);
      hapticFeedback.success();
    }

    draggingIndexRef.current = null;
    dragTargetIndexRef.current = null;
    setDraggingIndex(null);
    setDragTargetIndex(null);
  }, [floatingScale, floatingOpacity, orderedIds, onOrderChange]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      runOnJS(moveDrag)(e.absoluteY);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(endDrag)();
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(endDrag)();
    })
    .enabled(draggingIndex !== null);

  const floatingAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: floatingScale.value }],
    opacity: floatingOpacity.value,
  }));

  const draggingHabit = draggingIndex !== null ? sortedHabits[draggingIndex] : null;
  const draggingHeight = draggingHabit ? (itemHeights.current[draggingHabit.id] ?? 0) : 0;

  return (
    <GestureDetector gesture={panGesture}>
      <View ref={containerRef} style={{ flex: 1 }}>
        <FlatList
          data={sortedHabits}
          keyExtractor={(item) => item.id}
          scrollEnabled={draggingIndex === null}
          refreshControl={refreshControl as React.ReactElement<any>}
          ListHeaderComponent={
            ListHeaderComponent ? (
              <View onLayout={(e) => { headerHeight.current = e.nativeEvent.layout.height; }}>
                {ListHeaderComponent}
              </View>
            ) : undefined
          }
          contentContainerStyle={contentContainerStyle}
          onScroll={(e) => { scrollOffsetY.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => (
            <DraggableItem
              key={item.id}
              habit={item}
              index={index}
              isDragging={draggingIndex === index}
              isDragTarget={dragTargetIndex === index && draggingIndex !== index}
              onDragStart={startDrag}
              renderItem={renderItem}
              onItemLayout={(id, height) => {
                itemHeights.current[id] = height;
              }}
            />
          )}
        />

        {draggingHabit && draggingHeight > 0 && (
          <Animated.View
            style={[
              styles.floatingCard,
              {
                top: floatingTop,
                height: draggingHeight,
                shadowColor: colors.textPrimary,
              },
              floatingAnimStyle,
            ]}
            pointerEvents="none"
          >
            {renderItem(draggingHabit)}
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}

interface DraggableItemProps {
  habit: Habit;
  index: number;
  isDragging: boolean;
  isDragTarget: boolean;
  onDragStart: (index: number, absoluteY: number) => void;
  renderItem: (habit: Habit) => React.ReactNode;
  onItemLayout: (id: string, height: number) => void;
}

function DraggableItem({
  habit,
  index,
  isDragging,
  isDragTarget,
  onDragStart,
  renderItem,
  onItemLayout,
}: DraggableItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: isDragging ? 0 : isDragTarget ? 0.4 : 1,
  }));

  const longPressGesture = Gesture.LongPress()
    .minDuration(350)
    .onStart((e) => {
      'worklet';
      scale.value = withSpring(1.02, { damping: 14, stiffness: 200 });
      runOnJS(onDragStart)(index, e.absoluteY);
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 14, stiffness: 200 });
    });

  return (
    <GestureDetector gesture={longPressGesture}>
      <Animated.View
        style={animatedStyle}
        onLayout={(e) => {
          onItemLayout(habit.id, e.nativeEvent.layout.height);
        }}
      >
        {renderItem(habit)}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  floatingCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
});