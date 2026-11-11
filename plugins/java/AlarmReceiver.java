package com.dtriches.myhabitstracker;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import java.util.Calendar;

/**
 * BroadcastReceiver que recebe alarmes do AlarmManager e dispara
 * notificações diretamente via NotificationCompat.
 * Não depende de Notifee nem de HeadlessJS tasks.
 */
public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";
    static final String ACTION_EXACT_ALARM = "com.dtriches.myhabitstracker.EXACT_ALARM";
    static final String PENDING_COMPLETIONS_CHANGED = "com.dtriches.myhabitstracker.HABIT_COMPLETE_LOCAL";

    // Actions para os botões da notificação
    public static final String ACTION_SNOOZE = "com.dtriches.myhabitstracker.ACTION_SNOOZE";
    public static final String ACTION_COMPLETE = "com.dtriches.myhabitstracker.ACTION_COMPLETE";

    private static final String EXTRA_IS_SNOOZE = "isSnooze";
    private static final String SNOOZE_SUFFIX = "_snooze";
    private static final long WEEK_MS = 7L * 24 * 60 * 60 * 1000;

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "Alarme disparado!");

        if (intent == null || intent.getAction() == null) {
            Log.w(TAG, "Intent nulo ou action nula");
            return;
        }

        String action = intent.getAction();

        // Tratar ações dos botões da notificação
        if (action.equals(ACTION_SNOOZE)) {
            handleSnooze(context, intent);
            return;
        }

        if (action.equals(ACTION_COMPLETE)) {
            handleComplete(context, intent);
            return;
        }

        // Alarme principal
        if (!action.equals(ACTION_EXACT_ALARM)) {
            Log.w(TAG, "Action desconhecida: " + action);
            return;
        }

        try {
            String alarmId    = intent.getStringExtra("alarmId");
            String habitId    = intent.getStringExtra("habitId");
            String habitName  = intent.getStringExtra("habitName");
            String reminderId = intent.getStringExtra("reminderId");
            String dayOfWeek  = intent.getStringExtra("dayOfWeek");
            String time       = intent.getStringExtra("time");
            String sound      = intent.getStringExtra("sound");
            boolean hasTarget = intent.getBooleanExtra("hasTarget", false);
            long scheduledAt  = intent.getLongExtra("timestamp", 0);

            Log.d(TAG, "Dados: alarmId=" + alarmId + " habitId=" + habitId + " habitName=" + habitName);

            // Snooze é one-shot: não pode entrar na corrente semanal. O
            // sufixo "_snooze" cobre alarmes de snooze antigos, que eram
            // reagendados toda semana e persistidos no AlarmStorage.
            boolean isSnooze = intent.getBooleanExtra(EXTRA_IS_SNOOZE, false)
                || (alarmId != null && alarmId.endsWith(SNOOZE_SUFFIX));

            showNotification(context, alarmId, habitId, habitName, sound, hasTarget);

            if (isSnooze) {
                if (alarmId != null) AlarmStorage.remove(context, alarmId);
            } else {
                rescheduleNextWeek(context, alarmId, habitId, habitName, reminderId, dayOfWeek, time, sound, hasTarget, scheduledAt);
            }

        } catch (Exception e) {
            Log.e(TAG, "Erro ao processar alarme: " + e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Exibir notificação com botões Adiar / Feito
    // -------------------------------------------------------------------------
    private void showNotification(
        Context context,
        String alarmId,
        String habitId,
        String habitName,
        String sound,
        boolean hasTarget
    ) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        int notifId = alarmId != null ? alarmId.hashCode() : habitId.hashCode();
        String title = "Hora do seu habito!";
        String body  = habitName != null ? habitName : "Hora de praticar";

        // Tocar na notificação abre os detalhes do hábito. O deep link é
        // roteado pelo Expo Router (scheme "habittracker" do app.json).
        // FLAG_CANCEL_CURRENT (e não UPDATE_CURRENT) nos PendingIntents que
        // abrem o app: UPDATE_CURRENT reaproveita um PendingIntent existente
        // com o mesmo requestCode/link e só troca os extras, mantendo as flags
        // do intent antigo — inclusive de builds anteriores do app.
        PendingIntent openPending = PendingIntent.getActivity(
            context, notifId, buildOpenHabitIntent(context, habitId, false),
            PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // PendingIntent — botão Adiar
        Intent snoozeIntent = new Intent(context, AlarmReceiver.class);
        snoozeIntent.setAction(ACTION_SNOOZE);
        snoozeIntent.putExtra("habitId", habitId);
        snoozeIntent.putExtra("habitName", habitName);
        snoozeIntent.putExtra("sound", sound);
        snoozeIntent.putExtra("hasTarget", hasTarget);
        snoozeIntent.putExtra("notifId", notifId);
        PendingIntent snoozePending = PendingIntent.getBroadcast(
            context, notifId + 1, snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String channelId = ensureChannel(context, sound);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            // Silhueta monocromática gerada pelo plugin do expo-notifications
            // (o ic_launcher colorido vira um quadrado na barra de status).
            .setSmallIcon(R.drawable.notification_icon)
            .setColor(ContextCompat.getColor(context, R.color.notification_icon_color))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(openPending)
            .addAction(0, "Adiar", snoozePending);

        if (hasTarget) {
            // Meta numérica precisa de um valor: o botão abre o hábito já
            // com o modal de progresso de hoje (?action=register).
            PendingIntent registerPending = PendingIntent.getActivity(
                context, notifId + 2, buildOpenHabitIntent(context, habitId, true),
                PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            builder.addAction(0, "Registrar", registerPending);
        } else {
            Intent completeIntent = new Intent(context, AlarmReceiver.class);
            completeIntent.setAction(ACTION_COMPLETE);
            completeIntent.putExtra("habitId", habitId);
            completeIntent.putExtra("notifId", notifId);
            PendingIntent completePending = PendingIntent.getBroadcast(
                context, notifId + 2, completeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            builder.addAction(0, "Feito", completePending);
        }

        nm.notify(notifId, builder.build());
        Log.d(TAG, "Notificacao exibida: " + notifId + " (canal " + channelId + ")");
    }

    private static Intent buildOpenHabitIntent(Context context, String habitId, boolean register) {
        Intent intent;
        if (habitId != null) {
            String url = "habittracker://habits/" + habitId + (register ? "?action=register" : "");
            intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.setPackage(context.getPackageName());
        } else {
            intent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (intent == null) intent = new Intent();
        }
        // CLEAR_TASK é necessário: com o processo do app morto mas a tarefa
        // ainda nos recentes, o Android só traz a tarefa antiga para frente
        // e descarta o deep link (testado com NEW_TASK, SINGLE_TOP e
        // CLEAR_TOP). Recriando a tarefa, o link vira a URL inicial. Com o
        // app aberto, a interface é recriada (mesmo processo) e o link
        // também chega.
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        return intent;
    }

    // -------------------------------------------------------------------------
    // Re-agendar a próxima ocorrência (AlarmManager é one-shot)
    // -------------------------------------------------------------------------
    private void rescheduleNextWeek(
        Context context,
        String alarmId,
        String habitId,
        String habitName,
        String reminderId,
        String dayOfWeek,
        String time,
        String sound,
        boolean hasTarget,
        long scheduledAt
    ) {
        try {
            if (alarmId == null) return;

            long nextTrigger = nextWeeklyTrigger(dayOfWeek, time, scheduledAt, System.currentTimeMillis());
            scheduleAlarm(context, alarmId, nextTrigger, habitId, habitName, reminderId, dayOfWeek, time, sound, hasTarget);

            // Mantém o storage atualizado com o novo horário, para que o
            // BootReceiver sempre reagende a partir da ocorrência mais recente.
            AlarmStorage.save(context, alarmId, nextTrigger, habitId, habitName, reminderId, dayOfWeek, time, sound, hasTarget);

            Log.d(TAG, "Proximo alarme agendado: " + alarmId + " para " + nextTrigger);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao re-agendar: " + e.getMessage(), e);
        }
    }

    /**
     * Próxima ocorrência semanal estritamente no futuro, calculada a partir
     * do dia da semana (0 = domingo, como no JS) e do horário "HH:mm" do
     * lembrete. Usar "agora + 7 dias" fazia o horário derivar a cada semana
     * (atrasos de Doze ou de alarmes inexatos se acumulavam). Sem dia/horário
     * válidos (alarmes antigos), soma semanas ao horário previsto.
     */
    static long nextWeeklyTrigger(String dayOfWeek, String time, long scheduledAt, long now) {
        // Nunca antes do horário previsto: se este disparo chegou adiantado em
        // relação ao relógio, a ocorrência de hoje não pode ser repetida.
        long after = Math.max(now, scheduledAt);
        try {
            int jsDay = Integer.parseInt(dayOfWeek);
            String[] parts = time.split(":");
            int hours = Integer.parseInt(parts[0]);
            int minutes = Integer.parseInt(parts[1]);

            Calendar cal = Calendar.getInstance();
            cal.setTimeInMillis(after);
            cal.set(Calendar.HOUR_OF_DAY, hours);
            cal.set(Calendar.MINUTE, minutes);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);

            int diff = (jsDay + 1) - cal.get(Calendar.DAY_OF_WEEK); // Calendar.SUNDAY = 1
            if (diff < 0) diff += 7;
            cal.add(Calendar.DAY_OF_YEAR, diff);
            if (cal.getTimeInMillis() <= after) cal.add(Calendar.DAY_OF_YEAR, 7);
            return cal.getTimeInMillis();
        } catch (Exception e) {
            long next = scheduledAt > 0 ? scheduledAt : now;
            do {
                next += WEEK_MS;
            } while (next <= after);
            return next;
        }
    }

    /** Agenda (ou substitui) o alarme semanal com o id dado. */
    static void scheduleAlarm(
        Context context,
        String alarmId,
        long triggerAt,
        String habitId,
        String habitName,
        String reminderId,
        String dayOfWeek,
        String time,
        String sound,
        boolean hasTarget
    ) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction(ACTION_EXACT_ALARM);
        intent.putExtra("alarmId", alarmId);
        intent.putExtra("habitId", habitId);
        intent.putExtra("habitName", habitName);
        intent.putExtra("reminderId", reminderId);
        intent.putExtra("dayOfWeek", dayOfWeek);
        intent.putExtra("time", time);
        intent.putExtra("sound", sound);
        intent.putExtra("hasTarget", hasTarget);
        intent.putExtra("timestamp", triggerAt);

        PendingIntent pending = PendingIntent.getBroadcast(
            context, alarmId.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending);
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pending);
        }
    }

    // -------------------------------------------------------------------------
    // Botão Adiar: cancela notificação atual e reagenda em 10 minutos
    // -------------------------------------------------------------------------
    private void handleSnooze(Context context, Intent intent) {
        try {
            String habitId    = intent.getStringExtra("habitId");
            String habitName  = intent.getStringExtra("habitName");
            String sound      = intent.getStringExtra("sound");
            boolean hasTarget = intent.getBooleanExtra("hasTarget", false);
            int    notifId    = intent.getIntExtra("notifId", 0);

            // Cancelar notificação atual
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(notifId);

            // Agendar nova notificação em 10 minutos
            long snoozeTime = System.currentTimeMillis() + (10L * 60 * 1000);
            String snoozeAlarmId = habitId + SNOOZE_SUFFIX;

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Intent snoozeAlarm = new Intent(context, AlarmReceiver.class);
            snoozeAlarm.setAction(ACTION_EXACT_ALARM);
            snoozeAlarm.putExtra("alarmId", snoozeAlarmId);
            snoozeAlarm.putExtra("habitId", habitId);
            snoozeAlarm.putExtra("habitName", habitName);
            snoozeAlarm.putExtra("sound", sound);
            snoozeAlarm.putExtra("hasTarget", hasTarget);
            snoozeAlarm.putExtra("timestamp", snoozeTime);
            snoozeAlarm.putExtra(EXTRA_IS_SNOOZE, true);

            PendingIntent pending = PendingIntent.getBroadcast(
                context, snoozeAlarmId.hashCode(), snoozeAlarm,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, snoozeTime, pending);
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, snoozeTime, pending);
            }

            // Snooze é efêmero (10 min) — não persiste no storage de boot e,
            // ao disparar, não é reagendado (ver EXTRA_IS_SNOOZE em onReceive).
            // Se o celular reiniciar exatamente nesses 10 min, o pior caso é
            // perder esse lembrete pontual; a corrente semanal principal
            // permanece intacta pois seu registro no storage não é tocado aqui.

            Log.d(TAG, "Snooze agendado para 10 minutos: " + habitName);
        } catch (Exception e) {
            Log.e(TAG, "Erro no snooze: " + e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Botão Feito: enfileira a conclusão e avisa o JS, se estiver rodando
    // -------------------------------------------------------------------------
    private void handleComplete(Context context, Intent intent) {
        try {
            String habitId = intent.getStringExtra("habitId");
            int    notifId = intent.getIntExtra("notifId", 0);

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(notifId);

            if (habitId == null) return;

            // Com o app fechado não há React Native para gravar no banco: a
            // conclusão fica na fila, com o horário do toque, e o JS a envia
            // ao abrir. Com o app aberto, o broadcast faz o JS esvaziar a
            // fila na hora (o ExactAlarmModule o repassa como evento JS).
            PendingCompletionStorage.add(context, habitId, System.currentTimeMillis());
            LocalBroadcastManager.getInstance(context).sendBroadcast(new Intent(PENDING_COMPLETIONS_CHANGED));

            Log.d(TAG, "Conclusao enfileirada para: " + habitId);
        } catch (Exception e) {
            Log.e(TAG, "Erro no complete: " + e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Canais de notificação — um por som
    // -------------------------------------------------------------------------

    /**
     * No Android 8+ o som pertence ao canal, não à notificação (e um canal
     * não pode mudar de som depois de criado), então cada som tem o seu.
     * O JS cria os mesmos canais (services/notifications.ts) para o preview;
     * quem criar primeiro vale. Devolve o id do canal a usar.
     */
    static String ensureChannel(Context context, String sound) {
        String key = sound != null ? sound : "default";
        String channelId;
        String channelName;
        String rawName = null;
        boolean silent = false;

        switch (key) {
            case "water":   channelId = "habits-water";  channelName = "Lembretes (Gota d'água)"; rawName = "water_drop"; break;
            case "bell":    channelId = "habits-bell";   channelName = "Lembretes (Sino)";        rawName = "bell";       break;
            case "chime":   channelId = "habits-chime";  channelName = "Lembretes (Carrilhão)";   rawName = "chime";      break;
            case "silence": channelId = "habits-silent"; channelName = "Lembretes (Silencioso)";  silent = true;          break;
            default:        channelId = "habits";        channelName = "Lembretes de Habitos";                            break;
        }

        int rawId = rawName != null
            ? context.getResources().getIdentifier(rawName, "raw", context.getPackageName())
            : 0;
        if (rawName != null && rawId == 0) {
            // Arquivo de som ausente na build: cai no canal padrão.
            Log.w(TAG, "Som nao encontrado em res/raw: " + rawName);
            return ensureChannel(context, "default");
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null || nm.getNotificationChannel(channelId) != null) return channelId;

            NotificationChannel channel = new NotificationChannel(
                channelId, channelName, NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Lembretes para seus habitos diarios");
            channel.enableVibration(true);
            channel.enableLights(true);
            if (silent) {
                channel.setSound(null, null);
            } else if (rawId != 0) {
                AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                channel.setSound(Uri.parse("android.resource://" + context.getPackageName() + "/raw/" + rawName), attrs);
            }
            nm.createNotificationChannel(channel);
            Log.d(TAG, "Canal criado: " + channelId);
        }
        return channelId;
    }
}
