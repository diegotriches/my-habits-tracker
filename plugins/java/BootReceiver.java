package com.dtriches.myhabitstracker;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Reagenda todos os alarmes persistidos em AlarmStorage após:
 * - BOOT_COMPLETED: o dispositivo reiniciou (AlarmManager perde tudo)
 * - MY_PACKAGE_REPLACED: o app foi atualizado (idem)
 *
 * Sem este receiver, a corrente de alarmes (que se auto-reagenda a
 * cada disparo em AlarmReceiver.rescheduleNextWeek) morre para sempre
 * no primeiro reboot que acontecer.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        Log.d(TAG, "Recebido: " + action);

        if (!action.equals(Intent.ACTION_BOOT_COMPLETED)
            && !action.equals(Intent.ACTION_MY_PACKAGE_REPLACED)) {
            return;
        }

        try {
            JSONArray alarms = AlarmStorage.getAll(context);
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                Log.w(TAG, "AlarmManager indisponivel, abortando reagendamento");
                return;
            }

            long now = System.currentTimeMillis();
            int rescheduled = 0;

            for (int i = 0; i < alarms.length(); i++) {
                JSONObject obj = alarms.getJSONObject(i);
                String alarmId    = obj.optString("alarmId", null);
                String habitId    = obj.optString("habitId", null);
                String habitName  = obj.optString("habitName", null);
                String reminderId = obj.optString("reminderId", null);
                String dayOfWeek  = obj.optString("dayOfWeek", null);
                String time       = obj.optString("time", null);
                long timestamp    = obj.optLong("timestamp", 0);

                if (alarmId == null || timestamp <= 0) {
                    Log.w(TAG, "Entrada de alarme invalida, pulando: " + obj);
                    continue;
                }

                // Se o dispositivo ficou desligado por mais de uma semana,
                // o horario salvo pode estar no passado. Empurra para a
                // proxima ocorrencia do mesmo dia/horario em vez de disparar
                // tudo de uma vez ao ligar o aparelho.
                while (timestamp <= now) {
                    timestamp += 7L * 24 * 60 * 60 * 1000;
                }

                Intent alarmIntent = new Intent(context, AlarmReceiver.class);
                alarmIntent.setAction("com.dtriches.myhabitstracker.EXACT_ALARM");
                alarmIntent.putExtra("alarmId", alarmId);
                alarmIntent.putExtra("habitId", habitId);
                alarmIntent.putExtra("habitName", habitName);
                alarmIntent.putExtra("reminderId", reminderId);
                alarmIntent.putExtra("dayOfWeek", dayOfWeek);
                alarmIntent.putExtra("time", time);
                alarmIntent.putExtra("timestamp", timestamp);

                PendingIntent pending = PendingIntent.getBroadcast(
                    context, alarmId.hashCode(), alarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pending);
                    } else {
                        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pending);
                    }
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pending);
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, timestamp, pending);
                }

                // Atualiza o storage com o novo timestamp calculado
                AlarmStorage.save(context, alarmId, timestamp, habitId, habitName, reminderId, dayOfWeek, time);

                rescheduled++;
            }

            Log.d(TAG, rescheduled + " alarme(s) reagendado(s) apos " + action);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao reagendar alarmes: " + e.getMessage(), e);
        }
    }
}