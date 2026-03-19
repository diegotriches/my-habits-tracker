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
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class ExactAlarmModule extends ReactContextBaseJavaModule {
    private static final String TAG = "ExactAlarmModule";
    private static final String HABIT_COMPLETE_ACTION = "com.dtriches.myhabitstracker.HABIT_COMPLETE_LOCAL";
    private static final String JS_EVENT_NAME = "HabitCompleteFromNotification";

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

    private void registerHabitCompleteReceiver() {
        habitCompleteReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String habitId   = intent.getStringExtra("habitId");
                String habitName = intent.getStringExtra("habitName");

                Log.d(TAG, "LocalBroadcast HABIT_COMPLETE recebido: " + habitId);

                if (habitId == null) return;

                WritableMap params = Arguments.createMap();
                params.putString("habitId", habitId);
                params.putString("habitName", habitName != null ? habitName : "");

                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(JS_EVENT_NAME, params);

                Log.d(TAG, "Evento " + JS_EVENT_NAME + " emitido para JS: " + habitId);
            }
        };

        LocalBroadcastManager.getInstance(reactContext)
            .registerReceiver(habitCompleteReceiver, new IntentFilter(HABIT_COMPLETE_ACTION));

        Log.d(TAG, "HabitCompleteReceiver registrado via LocalBroadcastManager");
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

            Intent intent = new Intent(reactContext, AlarmReceiver.class);
            intent.setAction("com.dtriches.myhabitstracker.EXACT_ALARM");
            intent.putExtra("alarmId", alarmId);
            intent.putExtra("timestamp", (long) timestamp);

            if (data.hasKey("habitId"))    intent.putExtra("habitId",    data.getString("habitId"));
            if (data.hasKey("habitName"))  intent.putExtra("habitName",  data.getString("habitName"));
            if (data.hasKey("title"))      intent.putExtra("title",      data.getString("title"));
            if (data.hasKey("body"))       intent.putExtra("body",       data.getString("body"));
            if (data.hasKey("reminderId")) intent.putExtra("reminderId", data.getString("reminderId"));
            if (data.hasKey("dayOfWeek"))  intent.putExtra("dayOfWeek",  data.getString("dayOfWeek"));
            if (data.hasKey("time"))       intent.putExtra("time",       data.getString("time"));

            int requestCode = alarmId.hashCode();
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            long triggerTime = (long) timestamp;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
            }

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
            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                promise.reject("ALARM_MANAGER_NULL", "AlarmManager não disponível");
                return;
            }

            Intent intent = new Intent(reactContext, AlarmReceiver.class);
            intent.setAction("com.dtriches.myhabitstracker.EXACT_ALARM");

            int requestCode = alarmId.hashCode();
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext, requestCode, intent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );

            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent);
                pendingIntent.cancel();
            }

            Log.d(TAG, "Alarme cancelado: " + alarmId);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao cancelar alarme: " + e.getMessage(), e);
            promise.reject("CANCEL_ERROR", e.getMessage(), e);
        }
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
                Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
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

    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(double count) {}
}