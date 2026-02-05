// android/app/src/main/java/com/dtriches/myhabitstracker/ExactAlarmModule.java
package com.dtriches.myhabitstracker;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class ExactAlarmModule extends ReactContextBaseJavaModule {
    private static final String TAG = "ExactAlarmModule";
    private final ReactApplicationContext reactContext;

    public ExactAlarmModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return "ExactAlarmModule";
    }

    /**
     * Agenda um alarme exato
     * @param alarmId ID único do alarme
     * @param timestamp Timestamp em milissegundos
     * @param data Dados para passar ao alarme (título, corpo, habitId, etc)
     * @param promise Promise JS
     */
    @ReactMethod
    public void scheduleExactAlarm(String alarmId, double timestamp, ReadableMap data, Promise promise) {
        try {
            Log.d(TAG, "📅 Agendando alarme: " + alarmId + " para " + (long)timestamp);

            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager == null) {
                promise.reject("ALARM_MANAGER_NULL", "AlarmManager não disponível");
                return;
            }

            // Criar intent para o BroadcastReceiver
            Intent intent = new Intent(reactContext, AlarmReceiver.class);
            intent.setAction("com.dtriches.myhabitstracker.EXACT_ALARM");
            intent.putExtra("alarmId", alarmId);
            intent.putExtra("timestamp", (long)timestamp);
            
            // Passar dados do hábito
            if (data.hasKey("habitId")) {
                intent.putExtra("habitId", data.getString("habitId"));
            }
            if (data.hasKey("habitName")) {
                intent.putExtra("habitName", data.getString("habitName"));
            }
            if (data.hasKey("title")) {
                intent.putExtra("title", data.getString("title"));
            }
            if (data.hasKey("body")) {
                intent.putExtra("body", data.getString("body"));
            }
            if (data.hasKey("reminderId")) {
                intent.putExtra("reminderId", data.getString("reminderId"));
            }
            if (data.hasKey("dayOfWeek")) {
                intent.putExtra("dayOfWeek", data.getString("dayOfWeek"));
            }
            if (data.hasKey("time")) {
                intent.putExtra("time", data.getString("time"));
            }

            // PendingIntent único para cada alarme
            int requestCode = alarmId.hashCode();
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Agendar alarme EXATO
            long triggerTime = (long) timestamp;
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) { // Android 12+
                // Verificar se pode agendar alarmes exatos
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingIntent
                    );
                    Log.d(TAG, "✅ Alarme agendado com setExactAndAllowWhileIdle");
                } else {
                    // Fallback para alarme inexato se permissão não concedida
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingIntent
                    );
                    Log.w(TAG, "⚠️ Permissão de alarme exato não concedida, usando alarme inexato");
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) { // Android 6+
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                );
                Log.d(TAG, "✅ Alarme agendado com setExactAndAllowWhileIdle");
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                );
                Log.d(TAG, "✅ Alarme agendado com setExact");
            }

            promise.resolve(alarmId);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao agendar alarme: " + e.getMessage(), e);
            promise.reject("SCHEDULE_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Cancela um alarme específico
     */
    @ReactMethod
    public void cancelAlarm(String alarmId, Promise promise) {
        try {
            Log.d(TAG, "🗑️ Cancelando alarme: " + alarmId);

            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager == null) {
                promise.reject("ALARM_MANAGER_NULL", "AlarmManager não disponível");
                return;
            }

            Intent intent = new Intent(reactContext, AlarmReceiver.class);
            intent.setAction("com.dtriches.myhabitstracker.EXACT_ALARM");
            
            int requestCode = alarmId.hashCode();
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                requestCode,
                intent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );

            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent);
                pendingIntent.cancel();
                Log.d(TAG, "✅ Alarme cancelado: " + alarmId);
            } else {
                Log.w(TAG, "⚠️ Alarme não encontrado: " + alarmId);
            }

            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao cancelar alarme: " + e.getMessage(), e);
            promise.reject("CANCEL_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Verifica se pode agendar alarmes exatos
     */
    @ReactMethod
    public void canScheduleExactAlarms(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
                if (alarmManager != null) {
                    boolean canSchedule = alarmManager.canScheduleExactAlarms();
                    Log.d(TAG, "📱 Pode agendar alarmes exatos: " + canSchedule);
                    promise.resolve(canSchedule);
                } else {
                    promise.resolve(false);
                }
            } else {
                // Antes do Android 12, não precisa de permissão especial
                promise.resolve(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao verificar permissão: " + e.getMessage(), e);
            promise.reject("CHECK_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Abre as configurações de alarmes exatos
     */
    @ReactMethod
    public void openAlarmSettings(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
                promise.resolve(true);
            } else {
                promise.resolve(false);
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao abrir configurações: " + e.getMessage(), e);
            promise.reject("SETTINGS_ERROR", e.getMessage(), e);
        }
    }
}
