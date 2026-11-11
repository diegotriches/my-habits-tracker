package com.dtriches.myhabitstracker;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Set;
import java.util.UUID;

/**
 * Fila local das conclusões feitas pelo botão "Feito" da notificação.
 *
 * O AlarmReceiver roda sem o React Native (com o app fechado, que é o caso
 * mais comum), então não consegue gravar no Supabase. Ele registra a
 * conclusão aqui, com o horário do toque, e o JS esvazia a fila assim que
 * puder: na hora, se o app estiver aberto (via broadcast local), ou na
 * próxima vez que o app abrir.
 */
public class PendingCompletionStorage {
    private static final String TAG = "PendingCompletions";
    private static final String PREFS_NAME = "pending_completions_storage";
    private static final String KEY_ITEMS = "items";

    public static synchronized void add(Context context, String habitId, long completedAt) {
        try {
            JSONArray items = read(context);
            JSONObject obj = new JSONObject();
            obj.put("id", UUID.randomUUID().toString());
            obj.put("habitId", habitId);
            obj.put("completedAt", completedAt);
            items.put(obj);
            // commit() em vez de apply(): o processo pode morrer logo após o
            // broadcast, e a conclusão não pode se perder.
            prefs(context).edit().putString(KEY_ITEMS, items.toString()).commit();
            Log.d(TAG, "Conclusao enfileirada: " + habitId);
        } catch (JSONException e) {
            Log.e(TAG, "Erro ao enfileirar conclusao: " + e.getMessage(), e);
        }
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
