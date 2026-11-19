// components/habits/DraggableHabitList.tsx
//
// Lista da home com "segurar e arrastar" para reordenar.
//
// O arrasto roda inteiro na thread de UI (Reanimated): o card acompanha o
// dedo sem passar pelo React a cada quadro, os outros cards deslizam para
// abrir espaço onde ele vai cair e a lista rola sozinha perto das bordas.
// O React só é avisado no começo (trava a rolagem manual), a cada troca de
// posição (vibração) e no fim (grava a ordem nova).
//
// Um único gesto por card: Pan com `activateAfterLongPress`, então o mesmo
// toque que segurou já arrasta. Mexer o dedo antes do tempo cancela o gesto e
// deixa a lista rolar (ou a semana trocar, no deslize horizontal).
//
// Leitores de tela não arrastam: cada card recebe ações de acessibilidade
// "Mover para cima" / "Mover para baixo" (ver `ReorderAccessibility`).
//
// As contas ficam em `utils/dragOrder.ts` (com testes).

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityActionEvent,
  AccessibilityActionInfo,
  AccessibilityInfo,
  LayoutChangeEvent,
  RefreshControlProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  AnimatedRef,
  SharedValue,
  measure,
  runOnJS,
  scrollTo,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useScrollViewOffset,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Habit } from '@/types/database';
import { hapticFeedback } from '@/utils/haptics';
import { autoScrollStep, dropIndex, moveItem, offsetToIndex, shiftFor } from '@/utils/dragOrder';

/** Tempo segurando o card até o arrasto começar. */
const LONG_PRESS_MS = 350;
/** Faixa (px) junto ao topo/fundo da lista em que ela rola sozinha. */
const AUTO_SCROLL_EDGE = 80;
/** Velocidade máxima da rolagem automática (px por quadro). */
const AUTO_SCROLL_MAX_STEP = 12;
const SHIFT_DURATION = 180;
const DROP_DURATION = 160;
const LIFT_SCALE = 0.03;

/** Ações de "mover" para o TalkBack, aplicadas no elemento acessível do card. */
export interface ReorderAccessibility {
  accessibilityActions: AccessibilityActionInfo[];
  onAccessibilityAction: (event: AccessibilityActionEvent) => void;
}

interface DraggableHabitListProps {
  /** Já na ordem da tela. */
  habits: Habit[];
  onOrderChange: (newOrder: string[]) => void;
  renderItem: (habit: Habit, reorder: ReorderAccessibility) => React.ReactNode;
  ListHeaderComponent?: React.ReactElement;
  /** Fica depois dos hábitos e fora do arrastar (ex.: "Novo hábito"). */
  ListFooterComponent?: React.ReactElement;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

type Layouts = Record<string, { y: number; h: number }>;

/** Estado do arrasto compartilhado com a thread de UI. */
interface DragState {
  order: SharedValue<string[]>;
  layouts: SharedValue<Layouts>;
  activeId: SharedValue<string | null>;
  /** Solto: animando até o destino (a rolagem automática para). */
  dropping: SharedValue<boolean>;
  fromIndex: SharedValue<number>;
  toIndex: SharedValue<number>;
  dragDy: SharedValue<number>;
  startScroll: SharedValue<number>;
  scrollY: SharedValue<number>;
  lift: SharedValue<number>;
  fingerY: SharedValue<number>;
  viewportTop: SharedValue<number>;
}

export function DraggableHabitList({
  habits,
  onOrderChange,
  renderItem,
  ListHeaderComponent,
  ListFooterComponent,
  refreshControl,
  contentContainerStyle,
}: DraggableHabitListProps) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useScrollViewOffset(scrollRef);

  const ids = useMemo(() => habits.map((h) => h.id), [habits]);

  // Os shared values têm identidade estável; o objeto só os agrupa (o
  // primeiro fica no ref, para as props dos cards não mudarem a cada render).
  const drag: DragState = {
    order: useSharedValue<string[]>(ids),
    layouts: useSharedValue<Layouts>({}),
    activeId: useSharedValue<string | null>(null),
    dropping: useSharedValue(false),
    fromIndex: useSharedValue(-1),
    toIndex: useSharedValue(-1),
    dragDy: useSharedValue(0),
    startScroll: useSharedValue(0),
    scrollY,
    lift: useSharedValue(0),
    fingerY: useSharedValue(0),
    viewportTop: useSharedValue(0),
  };
  const dragRef = useRef(drag);
  const d = dragRef.current;

  const viewportHeight = useSharedValue(0);
  const contentHeight = useSharedValue(0);

  // Rolagem manual travada durante o arrasto (a automática continua).
  const [dragging, setDragging] = useState(false);
  const resetPendingRef = useRef(false);

  const idsRef = useRef(ids);
  idsRef.current = ids;
  const onOrderChangeRef = useRef(onOrderChange);
  onOrderChangeRef.current = onOrderChange;

  const handleTargetChange = useCallback(() => {
    hapticFeedback.selection();
  }, []);

  const autoScroll = useFrameCallback(() => {
    'worklet';
    if (d.activeId.value === null || d.dropping.value) return;
    const step = autoScrollStep(
      d.fingerY.value,
      viewportHeight.value,
      AUTO_SCROLL_EDGE,
      AUTO_SCROLL_MAX_STEP
    );
    if (step === 0) return;
    const maxScroll = Math.max(0, contentHeight.value - viewportHeight.value);
    const next = Math.min(maxScroll, Math.max(0, d.scrollY.value + step));
    if (next === d.scrollY.value) return;
    scrollTo(scrollRef, 0, next, false);
    // O card acompanha a rolagem (translateY soma scrollY - startScroll), e
    // o destino muda sem o dedo se mexer.
    updateTarget(d, handleTargetChange);
  }, false);

  // Depois que a ordem nova chega renderizada, zera o arrasto — antes disso,
  // os cards ainda estão na posição antiga e precisam do deslocamento.
  useLayoutEffect(() => {
    d.order.value = ids;
    if (!resetPendingRef.current) return;
    resetPendingRef.current = false;
    resetDrag(d);
    setDragging(false);
    autoScroll.setActive(false);
  }, [ids, d, autoScroll]);

  const handleDragStart = useCallback(() => {
    setDragging(true);
    autoScroll.setActive(true);
    hapticFeedback.selection();
  }, [autoScroll]);

  /** Chamado quando a animação de soltar termina. */
  const handleDrop = useCallback(
    (from: number, to: number) => {
      autoScroll.setActive(false);
      if (from === to || from < 0) {
        resetDrag(d);
        setDragging(false);
        return;
      }
      resetPendingRef.current = true;
      hapticFeedback.success();
      onOrderChangeRef.current(moveItem(idsRef.current, from, to));
      // Salvaguarda: se a lista não mudar (ordem recusada), não fica travada.
      setTimeout(() => {
        if (!resetPendingRef.current) return;
        resetPendingRef.current = false;
        resetDrag(d);
        setDragging(false);
      }, 1000);
    },
    [autoScroll, d]
  );

  const callbacks = useMemo(
    () => ({ onStart: handleDragStart, onTarget: handleTargetChange, onDrop: handleDrop }),
    [handleDragStart, handleTargetChange, handleDrop]
  );

  const moveBy = useCallback((habit: Habit, delta: number) => {
    const list = idsRef.current;
    const from = list.indexOf(habit.id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= list.length) return;
    onOrderChangeRef.current(moveItem(list, from, to));
    AccessibilityInfo.announceForAccessibility(
      `${habit.name} movido para a posição ${to + 1} de ${list.length}`
    );
  }, []);

  return (
    <Animated.ScrollView
      ref={scrollRef}
      style={styles.flex}
      scrollEnabled={!dragging}
      refreshControl={refreshControl}
      contentContainerStyle={contentContainerStyle}
      scrollEventThrottle={16}
      onLayout={(e: LayoutChangeEvent) => {
        viewportHeight.value = e.nativeEvent.layout.height;
      }}
      onContentSizeChange={(_w: number, h: number) => {
        contentHeight.value = h;
      }}
    >
      {ListHeaderComponent}
      {habits.map((habit, index) => (
        <DraggableItem
          key={habit.id}
          habit={habit}
          index={index}
          count={habits.length}
          drag={d}
          scrollRef={scrollRef}
          callbacks={callbacks}
          onMove={moveBy}
          renderItem={renderItem}
        />
      ))}
      {ListFooterComponent}
    </Animated.ScrollView>
  );
}

function resetDrag(d: DragState) {
  d.activeId.value = null;
  d.dropping.value = false;
  d.fromIndex.value = -1;
  d.toIndex.value = -1;
  d.dragDy.value = 0;
  d.lift.value = 0;
}

/** Recalcula onde o card arrastado cairia; avisa o JS (vibração) se mudou. */
function updateTarget(d: DragState, onTarget?: () => void) {
  'worklet';
  const id = d.activeId.value;
  if (id === null) return;
  const layouts = d.layouts.value;
  const own = layouts[id];
  if (!own) return;
  const centers = d.order.value.map((oid) => {
    const l = layouts[oid];
    return l ? l.y + l.h / 2 : 0;
  });
  const center = own.y + own.h / 2 + d.dragDy.value + (d.scrollY.value - d.startScroll.value);
  const to = dropIndex(centers, d.fromIndex.value, center);
  if (to !== d.toIndex.value) {
    d.toIndex.value = to;
    if (onTarget) runOnJS(onTarget)();
  }
}

interface DragCallbacks {
  onStart: () => void;
  onTarget: () => void;
  onDrop: (from: number, to: number) => void;
}

interface DraggableItemProps {
  habit: Habit;
  index: number;
  count: number;
  drag: DragState;
  scrollRef: AnimatedRef<Animated.ScrollView>;
  callbacks: DragCallbacks;
  onMove: (habit: Habit, delta: number) => void;
  renderItem: (habit: Habit, reorder: ReorderAccessibility) => React.ReactNode;
}

const DraggableItem = React.memo(function DraggableItem({
  habit,
  index,
  count,
  drag: d,
  scrollRef,
  callbacks,
  onMove,
  renderItem,
}: DraggableItemProps) {
  const id = habit.id;

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_MS)
        .onStart((e) => {
          'worklet';
          if (d.activeId.value !== null) return; // outro card já está sendo arrastado
          const m = measure(scrollRef);
          d.viewportTop.value = m ? m.pageY : 0;
          d.fingerY.value = e.absoluteY - d.viewportTop.value;
          d.startScroll.value = d.scrollY.value;
          d.dragDy.value = 0;
          d.fromIndex.value = index;
          d.toIndex.value = index;
          d.dropping.value = false;
          d.activeId.value = id;
          d.lift.value = withSpring(1, { damping: 15, stiffness: 220 });
          runOnJS(callbacks.onStart)();
        })
        .onUpdate((e) => {
          'worklet';
          if (d.activeId.value !== id || d.dropping.value) return;
          d.dragDy.value = e.translationY;
          d.fingerY.value = e.absoluteY - d.viewportTop.value;
          updateTarget(d, callbacks.onTarget);
        })
        .onFinalize(() => {
          'worklet';
          if (d.activeId.value !== id || d.dropping.value) return;
          d.dropping.value = true;
          const from = d.fromIndex.value;
          const to = d.toIndex.value;
          const layouts = d.layouts.value;
          const heights = d.order.value.map((oid) => layouts[oid]?.h ?? 0);
          // Anima até o lugar exato do destino, descontando a rolagem feita.
          const target = offsetToIndex(heights, from, to) - (d.scrollY.value - d.startScroll.value);
          d.lift.value = withTiming(0, { duration: DROP_DURATION });
          d.dragDy.value = withTiming(target, { duration: DROP_DURATION }, (finished) => {
            if (finished !== false) runOnJS(callbacks.onDrop)(from, to);
            else runOnJS(callbacks.onDrop)(from, from);
          });
        }),
    [d, id, index, scrollRef, callbacks]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const activeId = d.activeId.value;
    if (activeId === null) {
      // Sem arrasto (ou logo após gravar a ordem): posição natural, sem animar.
      return { transform: [{ translateY: 0 }, { scale: 1 }], zIndex: 0, opacity: 1 };
    }
    if (activeId === id) {
      return {
        transform: [
          { translateY: d.dragDy.value + (d.scrollY.value - d.startScroll.value) },
          { scale: 1 + LIFT_SCALE * d.lift.value },
        ],
        zIndex: 10,
        opacity: 0.97,
      };
    }
    const activeHeight = d.layouts.value[activeId]?.h ?? 0;
    const shift = shiftFor(index, d.fromIndex.value, d.toIndex.value, activeHeight);
    return {
      transform: [{ translateY: withTiming(shift, { duration: SHIFT_DURATION }) }, { scale: 1 }],
      zIndex: 0,
      opacity: 1,
    };
  });

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { y, height } = e.nativeEvent.layout;
      d.layouts.value = { ...d.layouts.value, [id]: { y, h: height } };
    },
    [d, id]
  );

  const reorder = useMemo<ReorderAccessibility>(
    () => ({
      accessibilityActions: [
        ...(index > 0 ? [{ name: 'moveUp', label: 'Mover para cima' }] : []),
        ...(index < count - 1 ? [{ name: 'moveDown', label: 'Mover para baixo' }] : []),
      ],
      onAccessibilityAction: (event) => {
        if (event.nativeEvent.actionName === 'moveUp') onMove(habit, -1);
        if (event.nativeEvent.actionName === 'moveDown') onMove(habit, 1);
      },
    }),
    [index, count, habit, onMove]
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle} onLayout={onLayout}>
        {renderItem(habit, reorder)}
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
