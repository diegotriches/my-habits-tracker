package com.dtriches.myhabitstracker;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

public class ExactAlarmModule extends ReactContextBaseJavaModule {
    private static final String TAG = "ExactAlarmModule";
    private static final String JS_EVENT_NAME = "PendingCompletionsChanged";

    private final ReactApplicationContext reactContext;
    private BroadcastReceiver habitCompleteReceiver;

    public ExactAlarmModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        registerHabitCompleteReceiver();
    }

    @NonNull
    @Override
    public String getName() {
        return "ExactAlarmModule";
    }

    // -------------------------------------------------------------------------
    // Ponte: LocalBroadcastManager → DeviceEventEmitter → JS
    // -------------------------------------------------------------------------

    /**
     * O botão "Feito" enfileira a conclusão no PendingCompletionStorage e
     * envia este broadcast local. Se o React Native estiver rodando, o JS é
     * avisado para esvaziar a fila na hora; se não, a fila é lida na próxima
     * abertura do app.
     */
    private void registerHabitCompleteReceiver() {
        habitCompleteReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Log.d(TAG, "Fila de conclusoes alterada");
                if (!reactContext.hasActiveReactInstance()) return;

                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(JS_EVENT_NAME, null);
            }
        };

        LocalBroadcastManager.getInstance(reactContext)
            .registerReceiver(habitCompleteReceiver, new IntentFilter(AlarmReceiver.PENDING_COMPLETIONS_CHANGED));

        Log.d(TAG, "HabitCompleteReceiver registrado via LocalBroadcastManager");
    }

    // -------------------------------------------------------------------------
    // Fila de conclusões do botão "Feito"
    // -------------------------------------------------------------------------

    @ReactMethod
    public void getPendingCompletions(Promise promise) {
        try {
            JSONArray items = PendingCompletionStorage.getAll(reactContext);
            WritableArray result = Arguments.createArray();
            for (int i = 0; i < items.length(); i++) {
                JSONObject obj = items.optJSONObject(i);
                if (obj == null) continue;
                WritableMap map = Arguments.createMap();
                map.putString("id", obj.optString("id"));
                map.putString("habitId", obj.optString("habitId"));
                map.putDouble("completedAt", (double) obj.optLong("completedAt"));
                result.pushMap(map);
            }
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao ler fila de conclusoes: " + e.getMessage(), e);
            promise.reject("PENDING_READ_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void removePendingCompletions(ReadableArray ids, Promise promise) {
        try {
            Set<String> toRemove = new HashSet<>();
            for (int i = 0; i < ids.size(); i++) {
                toRemove.add(ids.getString(i));
            }
            PendingCompletionStorage.remove(reactContext, toRemove);
            promise.resolve(toRemove.size());
        } catch (Exception e) {
            Log.e(TAG, "Erro ao limpar fila de conclusoes: " + e.getMessage(), e);
            promise.reject("PENDING_REMOVE_ERROR", e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Agendar / cancelar alarmes
    // -------------------------------------------------------------------------

    @ReactMethod
    public void scheduleExactAlarm(String alarmId, double timestamp, ReadableMap data, Promise promise) {
        try {
            Log.d(TAG, "Agendando alarme: " + alarmId + " para " + (long) timestamp);

            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                promise.reject("ALARM_MANAGER_NULL", "AlarmManager não disponível");
                return;
            }

            String habitId    = data.hasKey("habitId")    ? data.getString("habitId")    : null;
            String habitName  = data.hasKey("habitName")  ? data.getString("habitName")  : null;
            String reminderId = data.hasKey("reminderId") ? data.getString("reminderId") : null;
            String dayOfWeek  = data.hasKey("dayOfWeek")  ? data.getString("dayOfWeek")  : null;
            String time       = data.hasKey("time")       ? data.getString("time")       : null;
            String sound      = data.hasKey("sound")      ? data.getString("sound")      : null;
            boolean hasTarget = data.hasKey("hasTarget") && data.getBoolean("hasTarget");

            long triggerTime = (long) timestamp;
            AlarmReceiver.scheduleAlarm(
                reactContext, alarmId, triggerTime, habitId, habitName, reminderId, dayOfWeek, time, sound, hasTarget
            );

            // Persiste os dados do alarme para que o BootReceiver consiga
            // reagendar após reboot ou atualização do app (AlarmManager
            // descarta todos os alarmes pendentes nesses dois casos).
            AlarmStorage.save(reactContext, alarmId, triggerTime, habitId, habitName, reminderId, dayOfWeek, time, sound, hasTarget);

            Log.d(TAG, "Alarme agendado: " + alarmId);
            promise.resolve(alarmId);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao agendar alarme: " + e.getMessage(), e);
            promise.reject("SCHEDULE_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void cancelAlarm(String alarmId, Promise promise) {
        try {
            cancelAlarmById(reactContext, alarmId);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao cancelar alarme: " + e.getMessage(), e);
            promise.reject("CANCEL_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Cancela todos os alarmes de um hábito: os persistidos no AlarmStorage
     * (qualquer lembrete), o snooze pendente e os ids legados
     * `${habitId}_${dia}` usados antes de o id incluir o reminderId.
     */
    @ReactMethod
    public void cancelAlarmsForHabit(String habitId, Promise promise) {
        try {
            Set<String> ids = new HashSet<>();
            JSONArray alarms = AlarmStorage.getAll(reactContext);
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject obj = alarms.getJSONObject(i);
                if (habitId.equals(obj.optString("habitId", null))) {
                    ids.add(obj.optString("alarmId"));
                }
            }
            ids.add(habitId + "_snooze");
            for (int day = 0; day < 7; day++) {
                ids.add(habitId + "_" + day);
            }

            for (String id : ids) {
                cancelAlarmById(reactContext, id);
            }

            promise.resolve(ids.size());
        } catch (Exception e) {
            Log.e(TAG, "Erro ao cancelar alarmes do habito: " + e.getMessage(), e);
            promise.reject("CANCEL_ERROR", e.getMessage(), e);
        }
    }

    /** Cancela todos os alarmes persistidos no AlarmStorage. */
    @ReactMethod
    public void cancelAllAlarms(Promise promise) {
        try {
            JSONArray alarms = AlarmStorage.getAll(reactContext);
            for (int i = 0; i < alarms.length(); i++) {
                cancelAlarmById(reactContext, alarms.getJSONObject(i).optString("alarmId"));
            }
            promise.resolve(alarms.length());
        } catch (Exception e) {
            Log.e(TAG, "Erro ao cancelar todos os alarmes: " + e.getMessage(), e);
            promise.reject("CANCEL_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Cancela o PendingIntent do alarme (mesma action + requestCode usados
     * no agendamento) e remove o registro do AlarmStorage.
     */
    static void cancelAlarmById(Context context, String alarmId) {
        if (alarmId == null || alarmId.isEmpty()) return;

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction("com.dtriches.myhabitstracker.EXACT_ALARM");

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context, alarmId.hashCode(), intent,
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );

        if (pendingIntent != null) {
            if (alarmManager != null) alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
        }

        AlarmStorage.remove(context, alarmId);
        Log.d(TAG, "Alarme cancelado: " + alarmId);
    }

    @ReactMethod
    public void canScheduleExactAlarms(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
                promise.resolve(alarmManager != null && alarmManager.canScheduleExactAlarms());
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.reject("CHECK_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void openAlarmSettings(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Com o pacote, abre direto a página do app em vez da lista.
                Intent intent = new Intent(
                    android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    android.net.Uri.parse("package:" + reactContext.getPackageName())
                );
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
                promise.resolve(true);
            } else {
                promise.resolve(false);
            }
        } catch (Exception e) {
            promise.reject("SETTINGS_ERROR", e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Otimização de bateria
    // -------------------------------------------------------------------------

    /**
     * Se o app está fora da otimização de bateria do Android (Doze/App
     * Standby). Não cobre as otimizações próprias de fabricantes (ex.:
     * "Apps em suspensão" da Samsung), que não têm API.
     */
    @ReactMethod
    public void isIgnoringBatteryOptimizations(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                android.os.PowerManager pm =
                    (android.os.PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
                promise.resolve(pm != null && pm.isIgnoringBatteryOptimizations(reactContext.getPackageName()));
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.reject("CHECK_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Abre a lista de otimização de bateria do sistema. Não usa
     * ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS de propósito: ele exige a
     * permissão REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, restrita pela Play Store.
     * Se a tela não existir no aparelho, cai nos detalhes do app.
     */
    @ReactMethod
    public void openBatteryOptimizationSettings(Promise promise) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                reactContext.startActivity(intent);
            } catch (android.content.ActivityNotFoundException notFound) {
                // Tentar abrir em vez de resolveActivity(): no Android 11+ a
                // visibilidade de pacotes pode esconder telas que existem.
                Intent details = new Intent(
                    android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    android.net.Uri.parse("package:" + reactContext.getPackageName())
                );
                details.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(details);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SETTINGS_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(double count) {}
}