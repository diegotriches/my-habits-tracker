// index.js
import notifee, { EventType, AndroidImportance } from '@notifee/react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

console.log('INDEX.JS CARREGADO');

// Supabase client para headless/background execution
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const headlessSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Recupera a sessão do usuário antes de fazer queries
 * Necessário porque as RLS policies exigem autenticação
 */
async function ensureAuthenticated() {
  try {
    const { data: { session }, error } = await headlessSupabase.auth.getSession();
    if (error) {
      console.error('[BG] Erro ao recuperar sessão:', error);
      return false;
    }
    if (!session) {
      console.warn('[BG] Sem sessão ativa');
      return false;
    }
    console.log('[BG] Sessão recuperada para:', session.user?.email);
    return true;
  } catch (err) {
    console.error('[BG] Erro auth:', err);
    return false;
  }
}

// Background handler do Notifee
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('[BG-HEADLESS] Event:', type);

  if (type === EventType.ACTION_PRESS) {
    const actionId = detail.pressAction?.id;
    const data = detail.notification?.data;

    if (!data?.habitId) return;

    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }

    if (actionId === 'snooze') {
      const snoozeTime = Date.now() + 10 * 60 * 1000;

      await notifee.displayNotification({
        title: 'Lembrete adiado',
        body: `${data.habitName} — Voltarei em 10 minutos`,
        data: { habitId: data.habitId, habitName: data.habitName, type: 'snooze_reminder' },
        android: {
          channelId: 'habits',
          importance: AndroidImportance.LOW,
          smallIcon: 'ic_launcher',
        },
      });

      await notifee.createTriggerNotification(
        {
          title: 'Hora do seu hábito',
          body: `${data.habitName} — Última chance!`,
          data: { habitId: data.habitId, habitName: data.habitName, type: 'snooze_reminder' },
          android: {
            channelId: 'habits',
            importance: AndroidImportance.HIGH,
            smallIcon: 'ic_launcher',
            sound: 'default',
            actions: [
              { title: 'Feito', pressAction: { id: 'complete' } },
            ],
          },
        },
        { type: 0, timestamp: snoozeTime }
      );

      console.log('[BG] Snooze OK');

    } else if (actionId === 'complete') {
      try {
        const isAuth = await ensureAuthenticated();
        if (!isAuth) {
          await notifee.displayNotification({
            title: 'Sessão expirada',
            body: 'Abra o app para completar o hábito',
            android: { channelId: 'habits', importance: AndroidImportance.HIGH, smallIcon: 'ic_launcher' },
          });
          return;
        }

        const { data: habit, error: habitError } = await headlessSupabase
          .from('habits')
          .select('id, name, has_target, points_base, user_id')
          .eq('id', data.habitId)
          .single();

        if (habitError || !habit) {
          console.error('[BG] Erro ao buscar hábito:', habitError);
          await notifee.displayNotification({
            title: 'Erro',
            body: 'Hábito não encontrado',
            android: { channelId: 'habits', importance: AndroidImportance.HIGH, smallIcon: 'ic_launcher' },
          });
          return;
        }

        if (habit.has_target) {
          await notifee.displayNotification({
            title: 'Meta numérica',
            body: `Abra o app para registrar "${habit.name}"`,
            android: { channelId: 'habits', importance: AndroidImportance.HIGH, smallIcon: 'ic_launcher' },
          });
          return;
        }

        // Verificar se já completou hoje
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

        const { data: existing } = await headlessSupabase
          .from('completions')
          .select('id')
          .eq('habit_id', data.habitId)
          .gte('completed_at', startOfToday)
          .lte('completed_at', endOfToday)
          .maybeSingle();

        if (existing) {
          await notifee.displayNotification({
            title: 'Já completado',
            body: 'Você já fez isso hoje.',
            android: { channelId: 'habits', importance: AndroidImportance.LOW, smallIcon: 'ic_launcher' },
          });
          return;
        }

        // Registrar completion
        const { error: insertError } = await headlessSupabase.from('completions').insert({
          habit_id: data.habitId,
          completed_at: new Date().toISOString(),
          points_earned: habit.points_base,
          was_synced: true,
        });

        if (insertError) {
          console.error('[BG] Erro insert:', insertError);
          throw insertError;
        }

        // Atualizar pontos
        const { error: rpcError } = await headlessSupabase.rpc('increment_points', {
          user_id_param: habit.user_id,
          points_param: habit.points_base,
        });

        if (rpcError) {
          console.warn('[BG] Erro ao atualizar pontos:', rpcError);
        }

        await notifee.displayNotification({
          title: 'Completado!',
          body: `${habit.name} — +${habit.points_base} pontos`,
          android: {
            channelId: 'habits',
            importance: AndroidImportance.HIGH,
            smallIcon: 'ic_launcher',
            color: '#10B981',
            sound: 'default',
          },
        });

        console.log('[BG] Complete OK');
      } catch (err) {
        console.error('[BG] Erro complete:', err);
        await notifee.displayNotification({
          title: 'Erro',
          body: 'Não foi possível completar o hábito',
          android: { channelId: 'habits', importance: AndroidImportance.HIGH, smallIcon: 'ic_launcher' },
        });
      }
    }
  }
});

// Carregar Expo Router
import 'expo-router/entry';