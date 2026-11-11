package com.dtriches.myhabitstracker;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

/**
 * Persiste os dados de cada alarme agendado em SharedPreferences.
 *
 * O AlarmManager descarta TODOS os alarmes pendentes quando o
 * dispositivo reinicia ou quando o app é atualizado (MY_PACKAGE_REPLACED).
 * Como o design atual re-agenda cada alarme para 7 dias à frente só
 * quando o alarme ANTERIOR dispara (AlarmReceiver.rescheduleNextWeek),
 * um reboot no meio do caminho quebra a corrente para sempre — nada
 * volta a agendar depois, mesmo reabrindo o app.
 *
 * Esta classe guarda uma cópia dos dados de cada alarme ativo para que
 * o BootReceiver consiga reconstruir tudo após esses eventos.
 */
public class AlarmStorage {
    private static final String TAG = "AlarmStorage";
    private static final String PREFS_NAME = "exact_alarms_storage";
    private static final String KEY_IDS = "alarm_ids";

    public static void save(
        Context context,
        String alarmId,
        long timestamp,
        String habitId,
        String habitName,
        String reminderId,
        String dayOfWeek,
        String time,
        String sound,
        boolean hasTarget
    ) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            Set<String> ids = new HashSet<>(prefs.getStringSet(KEY_IDS, new HashSet<>()));
            ids.add(alarmId);
            editor.putStringSet(KEY_IDS, ids);

            JSONObject obj = new JSONObject();
            obj.put("timestamp", timestamp);
            obj.put("habitId", habitId);
            obj.put("habitName", habitName);
            obj.put("reminderId", reminderId);
            obj.put("dayOfWeek", dayOfWeek);
            obj.put("time", time);
            obj.put("sound", sound);
            obj.put("hasTarget", hasTarget);

            editor.putString("alarm_" + alarmId, obj.toString());
            editor.apply();

            Log.d(TAG, "Alarme persistido: " + alarmId + " para " + timestamp);
        } catch (JSONException e) {
            Log.e(TAG, "Erro ao persistir alarme " + alarmId + ": " + e.getMessage(), e);
        }
    }

    public static void remove(Context context, String alarmId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        Set<String> ids = new HashSet<>(prefs.getStringSet(KEY_IDS, new HashSet<>()));
        if (ids.remove(alarmId)) {
            editor.putStringSet(KEY_IDS, ids);
        }
        editor.remove("alarm_" + alarmId);
        editor.apply();

        Log.d(TAG, "Alarme removido do storage: " + alarmId);
    }

    /**
     * Retorna todos os alarmes persistidos. Cada objeto do array
     * inclui o campo "alarmId" além dos dados salvos em save().
     */
    public static JSONArray getAll(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        Set<String> ids = prefs.getStringSet(KEY_IDS, new HashSet<>());
        JSONArray result = new JSONArray();

        for (String alarmId : ids) {
            String raw = prefs.getString("alarm_" + alarmId, null);
            if (raw == null) continue;
            try {
                JSONObject obj = new JSONObject(raw);
                obj.put("alarmId", alarmId);
                result.put(obj);
            } catch (JSONException e) {
                Log.e(TAG, "Erro ao ler alarme persistido " + alarmId + ": " + e.getMessage(), e);
            }
        }
        return result;
    }
}