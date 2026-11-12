import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { router } from 'expo-router';
import { isSameDay } from 'date-fns';
import { Completion, Habit } from '@/types/database';

interface UseRegisterProgressActionParams {
  /** Parâmetro `action` da rota; "register" vem do botão "Registrar" da notificação. */
  action: string | undefined;
  habit: Habit | null;
  completions: Completion[];
  loading: boolean;
  openProgressForDay: (date: Date, isCompleted: boolean, currentValue?: number) => void;
}

/**
 * O botão "Registrar" da notificação de um hábito com meta numérica abre
 * `habittracker://habits/<id>?action=register`. Assim que os dados carregam,
 * abre o modal de progresso de hoje (com o valor já registrado, se houver)
 * e limpa o parâmetro, para não reabrir o modal a cada render.
 */
export function useRegisterProgressAction({
  action,
  habit,
  completions,
  loading,
  openProgressForDay,
}: UseRegisterProgressActionParams) {
  const handledRef = useRef(false);

  useEffect(() => {
    if (action !== 'register') {
      // Libera para um próximo "Registrar" com a tela já aberta.
      handledRef.current = false;
      return;
    }
    if (handledRef.current || loading || !habit) return;
    handledRef.current = true;
    console.log('Registrar via notificacao:', { habitId: habit.id, hasTarget: habit.has_target });

    if (!habit.has_target) {
      router.setParams({ action: undefined });
      return;
    }

    const today = new Date();
    const todayCompletion = completions.find((c) => isSameDay(new Date(c.completed_at), today));
    // No Android, um Modal aberto durante a animação de entrada da tela pode
    // não aparecer: espera a navegação terminar. Sem cleanup que cancele a
    // tarefa: limpar o parâmetro muda `action` e re-executa este efeito, o que
    // cancelaria a abertura (o handledRef já impede abrir duas vezes).
    InteractionManager.runAfterInteractions(() => {
      console.log('Registrar via notificacao: abrindo modal de progresso');
      openProgressForDay(today, !!todayCompletion, todayCompletion?.value_achieved ?? 0);
      router.setParams({ action: undefined });
    });
  }, [action, habit, completions, loading, openProgressForDay]);
}
