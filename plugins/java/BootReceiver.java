package com.dtriches.myhabitstracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
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
                String sound      = obj.optString("sound", null);
                boolean hasTarget = obj.optBoolean("hasTarget", false);
                long timestamp    = obj.optLong("timestamp", 0);

                if (alarmId == null || timestamp <= 0) {
                    Log.w(TAG, "Entrada de alarme invalida, pulando: " + obj);
                    continue;
                }

                // Snoozes antigos eram persistidos por engano como alarmes
                // semanais. Snooze não sobrevive a reboot: descarta.
                if (alarmId.endsWith("_snooze")) {
                    AlarmStorage.remove(context, alarmId);
                    continue;
                }

                // Ainda no futuro: mantém o horário salvo. Já passou (aparelho
                // desligado no horário): vai para a próxima ocorrência do mesmo
                // dia/horário, em vez de disparar tudo de uma vez ao ligar.
                if (timestamp <= now) {
                    timestamp = AlarmReceiver.nextWeeklyTrigger(dayOfWeek, time, timestamp, now);
                }

                AlarmReceiver.scheduleAlarm(context, alarmId, timestamp, habitId, habitName, reminderId, dayOfWeek, time, sound, hasTarget);

                // Atualiza o storage com o novo timestamp calculado
                AlarmStorage.save(context, alarmId, timestamp, habitId, habitName, reminderId, dayOfWeek, time, sound, hasTarget);

                rescheduled++;
            }

            Log.d(TAG, rescheduled + " alarme(s) reagendado(s) apos " + action);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao reagendar alarmes: " + e.getMessage(), e);
        }
    }
}
