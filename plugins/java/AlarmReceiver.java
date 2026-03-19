package com.dtriches.myhabitstracker;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * BroadcastReceiver que recebe alarmes do AlarmManager e dispara
 * notificações diretamente via NotificationCompat.
 * Não depende de Notifee nem de HeadlessJS tasks.
 */
public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";
    private static final String CHANNEL_ID = "habits";
    private static final String CHANNEL_NAME = "Lembretes de Habitos";

    // Actions para os botões da notificação
    public static final String ACTION_SNOOZE = "com.dtriches.myhabitstracker.ACTION_SNOOZE";
    public static final String ACTION_COMPLETE = "com.dtriches.myhabitstracker.ACTION_COMPLETE";

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
        if (!action.equals("com.dtriches.myhabitstracker.EXACT_ALARM")) {
            Log.w(TAG, "Action desconhecida: " + action);
            return;
        }

        try {
            String alarmId   = intent.getStringExtra("alarmId");
            String habitId   = intent.getStringExtra("habitId");
            String habitName = intent.getStringExtra("habitName");
            String reminderId = intent.getStringExtra("reminderId");
            String dayOfWeek = intent.getStringExtra("dayOfWeek");
            String time      = intent.getStringExtra("time");

            Log.d(TAG, "Dados: alarmId=" + alarmId + " habitId=" + habitId + " habitName=" + habitName);

            ensureChannel(context);
            showNotification(context, alarmId, habitId, habitName, reminderId, dayOfWeek, time);
            rescheduleNextWeek(context, intent, alarmId, habitId, habitName, reminderId, dayOfWeek, time);

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
        String reminderId,
        String dayOfWeek,
        String time
    ) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        int notifId = alarmId != null ? alarmId.hashCode() : habitId.hashCode();
        String title = "Hora do seu habito!";
        String body  = habitName != null ? habitName : "Hora de praticar";

        // Intent para abrir o app ao tocar na notificação
        Intent openIntent = context.getPackageManager()
            .getLaunchIntentForPackage(context.getPackageName());
        if (openIntent != null) {
            openIntent.putExtra("habitId", habitId);
            openIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        }
        PendingIntent openPending = PendingIntent.getActivity(
            context, notifId, openIntent != null ? openIntent : new Intent(),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // PendingIntent — botão Adiar
        Intent snoozeIntent = new Intent(context, AlarmReceiver.class);
        snoozeIntent.setAction(ACTION_SNOOZE);
        snoozeIntent.putExtra("habitId", habitId);
        snoozeIntent.putExtra("habitName", habitName);
        snoozeIntent.putExtra("notifId", notifId);
        PendingIntent snoozePending = PendingIntent.getBroadcast(
            context, notifId + 1, snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // PendingIntent — botão Feito
        Intent completeIntent = new Intent(context, AlarmReceiver.class);
        completeIntent.setAction(ACTION_COMPLETE);
        completeIntent.putExtra("habitId", habitId);
        completeIntent.putExtra("habitName", habitName);
        completeIntent.putExtra("notifId", notifId);
        PendingIntent completePending = PendingIntent.getBroadcast(
            context, notifId + 2, completeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(openPending)
            .addAction(0, "Adiar", snoozePending)
            .addAction(0, "Feito", completePending);

        nm.notify(notifId, builder.build());
        Log.d(TAG, "Notificacao exibida: " + notifId);
    }

    // -------------------------------------------------------------------------
    // Re-agendar para daqui 7 dias (AlarmManager é one-shot)
    // -------------------------------------------------------------------------
    private void rescheduleNextWeek(
        Context context,
        Intent originalIntent,
        String alarmId,
        String habitId,
        String habitName,
        String reminderId,
        String dayOfWeek,
        String time
    ) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            long nextTrigger = System.currentTimeMillis() + (7L * 24 * 60 * 60 * 1000);

            Intent nextIntent = new Intent(context, AlarmReceiver.class);
            nextIntent.setAction("com.dtriches.myhabitstracker.EXACT_ALARM");
            nextIntent.putExtra("alarmId", alarmId);
            nextIntent.putExtra("habitId", habitId);
            nextIntent.putExtra("habitName", habitName);
            nextIntent.putExtra("reminderId", reminderId);
            nextIntent.putExtra("dayOfWeek", dayOfWeek);
            nextIntent.putExtra("time", time);
            nextIntent.putExtra("timestamp", nextTrigger);

            int requestCode = alarmId != null ? alarmId.hashCode() : habitId.hashCode();
            PendingIntent pending = PendingIntent.getBroadcast(
                context, requestCode, nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTrigger, pending);
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTrigger, pending);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTrigger, pending);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, nextTrigger, pending);
            }

            Log.d(TAG, "Proximo alarme agendado para 7 dias: " + alarmId);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao re-agendar: " + e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Botão Adiar: cancela notificação atual e reagenda em 10 minutos
    // -------------------------------------------------------------------------
    private void handleSnooze(Context context, Intent intent) {
        try {
            String habitId   = intent.getStringExtra("habitId");
            String habitName = intent.getStringExtra("habitName");
            int    notifId   = intent.getIntExtra("notifId", 0);

            // Cancelar notificação atual
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(notifId);

            // Agendar nova notificação em 10 minutos
            long snoozeTime = System.currentTimeMillis() + (10L * 60 * 1000);
            String snoozeAlarmId = habitId + "_snooze";

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Intent snoozeAlarm = new Intent(context, AlarmReceiver.class);
            snoozeAlarm.setAction("com.dtriches.myhabitstracker.EXACT_ALARM");
            snoozeAlarm.putExtra("alarmId", snoozeAlarmId);
            snoozeAlarm.putExtra("habitId", habitId);
            snoozeAlarm.putExtra("habitName", habitName);
            snoozeAlarm.putExtra("timestamp", snoozeTime);

            PendingIntent pending = PendingIntent.getBroadcast(
                context, snoozeAlarmId.hashCode(), snoozeAlarm,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, snoozeTime, pending);
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, snoozeTime, pending);
            }

            Log.d(TAG, "Snooze agendado para 10 minutos: " + habitName);
        } catch (Exception e) {
            Log.e(TAG, "Erro no snooze: " + e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Botão Feito: cancela notificação e envia broadcast para o app JS
    // -------------------------------------------------------------------------
    private void handleComplete(Context context, Intent intent) {
        try {
            String habitId   = intent.getStringExtra("habitId");
            String habitName = intent.getStringExtra("habitName");
            int    notifId   = intent.getIntExtra("notifId", 0);

            // Cancelar notificação atual
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(notifId);

            // Enviar broadcast local para o app JS processar a conclusão
            Intent completeEvent = new Intent("com.dtriches.myhabitstracker.HABIT_COMPLETE");
            completeEvent.putExtra("habitId", habitId);
            completeEvent.putExtra("habitName", habitName);
            context.sendBroadcast(completeEvent);

            Log.d(TAG, "Broadcast HABIT_COMPLETE enviado para: " + habitId);
        } catch (Exception e) {
            Log.e(TAG, "Erro no complete: " + e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Garantir que o canal de notificação existe
    // -------------------------------------------------------------------------
    private void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (nm.getNotificationChannel(CHANNEL_ID) != null) return;

            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Lembretes para seus habitos diarios");
            channel.enableVibration(true);
            channel.enableLights(true);
            nm.createNotificationChannel(channel);
            Log.d(TAG, "Canal criado: " + CHANNEL_ID);
        }
    }
}