package com.dtriches.myhabitstracker;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Set;
import java.util.UUID;

/**
 * Fila local das conclusões feitas pelo botão "Feito" da notificação.
 *
 * O AlarmReceiver roda sem o React Native (com o app fechado, que é o caso
 * mais comum), então não consegue gravar no Supabase. Ele registra a
 * conclusão aqui, com o horário do toque e o do lembrete, e o JS esvazia a
 * fila assim que puder: na hora, se o app estiver aberto (via broadcast local), ou na
 * próxima vez que o app abrir.
 */
public class PendingCompletionStorage {
    private static final String TAG = "PendingCompletions";
    private static final String PREFS_NAME = "pending_completions_storage";
    private static final String KEY_ITEMS = "items";

    /**
     * @param completedAt horário do toque
     * @param reminderAt  horário do lembrete que mostrou o botão (0 = desconhecido)
     */
    public static synchronized void add(Context context, String habitId, long completedAt, long reminderAt) {
        try {
            JSONArray items = read(context);
            JSONObject obj = new JSONObject();
            obj.put("id", UUID.randomUUID().toString());
            obj.put("habitId", habitId);
            obj.put("completedAt", completedAt);
            if (reminderAt > 0) obj.put("reminderAt", reminderAt);
            items.put(obj);
            // commit() em vez de apply(): o processo pode morrer logo após o
            // broadcast, e a conclusão não pode se perder.
            prefs(context).edit().putString(KEY_ITEMS, items.toString()).commit();
            Log.d(TAG, "Conclusao enfileirada: " + habitId);
        } catch (JSONException e) {
            Log.e(TAG, "Erro ao enfileirar conclusao: " + e.getMessage(), e);
        }
    }

    /**
     * Se já há na fila um "Feito" do hábito para o dia (local) de `dayMillis`.
     * O dia de cada item segue a mesma regra do JS (notificationCompletionTime,
     * utils/completionOps.ts): o do lembrete, se conhecido e não posterior ao
     * toque; senão, o do toque.
     */
    public static synchronized boolean hasCompletionOnDay(Context context, String habitId, long dayMillis) {
        if (habitId == null) return false;
        JSONArray items = read(context);
        for (int i = 0; i < items.length(); i++) {
            JSONObject obj = items.optJSONObject(i);
            if (obj == null || !habitId.equals(obj.optString("habitId"))) continue;
            long tappedAt = obj.optLong("completedAt", 0);
            long reminderAt = obj.optLong("reminderAt", 0);
            long itemDay = (reminderAt > 0 && reminderAt <= tappedAt) ? reminderAt : tappedAt;
            if (itemDay > 0 && sameLocalDay(itemDay, dayMillis)) return true;
        }
        return false;
    }

    private static boolean sameLocalDay(long a, long b) {
        Calendar ca = Calendar.getInstance();
        ca.setTimeInMillis(a);
        Calendar cb = Calendar.getInstance();
        cb.setTimeInMillis(b);
        return ca.get(Calendar.YEAR) == cb.get(Calendar.YEAR)
            && ca.get(Calendar.DAY_OF_YEAR) == cb.get(Calendar.DAY_OF_YEAR);
    }

    public static synchronized JSONArray getAll(Context context) {
        return read(context);
    }

    public static synchronized void remove(Context context, Set<String> ids) {
        JSONArray items = read(context);
        JSONArray kept = new JSONArray();
        for (int i = 0; i < items.length(); i++) {
            JSONObject obj = items.optJSONObject(i);
            if (obj != null && !ids.contains(obj.optString("id"))) kept.put(obj);
        }
        prefs(context).edit().putString(KEY_ITEMS, kept.toString()).commit();
    }

    private static JSONArray read(Context context) {
        String raw = prefs(context).getString(KEY_ITEMS, null);
        if (raw == null) return new JSONArray();
        try {
            return new JSONArray(raw);
        } catch (JSONException e) {
            Log.e(TAG, "Fila corrompida, descartando: " + e.getMessage(), e);
            return new JSONArray();
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
}
