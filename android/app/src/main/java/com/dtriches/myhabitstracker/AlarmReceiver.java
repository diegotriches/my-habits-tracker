// android/app/src/main/java/com/dtriches/myhabitstracker/AlarmReceiver.java
package com.dtriches.myhabitstracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

/**
 * BroadcastReceiver que recebe alarmes e dispara notificações Notifee
 */
public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "🔔 Alarme disparado!");

        if (intent == null || intent.getAction() == null) {
            Log.w(TAG, "⚠️ Intent nulo");
            return;
        }

        if (!intent.getAction().equals("com.dtriches.myhabitstracker.EXACT_ALARM")) {
            Log.w(TAG, "⚠️ Action incorreta: " + intent.getAction());
            return;
        }

        try {
            // Extrair dados do intent
            String alarmId = intent.getStringExtra("alarmId");
            long timestamp = intent.getLongExtra("timestamp", 0);
            String habitId = intent.getStringExtra("habitId");
            String habitName = intent.getStringExtra("habitName");
            String title = intent.getStringExtra("title");
            String body = intent.getStringExtra("body");
            String reminderId = intent.getStringExtra("reminderId");
            String dayOfWeek = intent.getStringExtra("dayOfWeek");
            String time = intent.getStringExtra("time");

            Log.d(TAG, "📊 Dados do alarme:");
            Log.d(TAG, "   alarmId: " + alarmId);
            Log.d(TAG, "   habitId: " + habitId);
            Log.d(TAG, "   habitName: " + habitName);
            Log.d(TAG, "   timestamp: " + timestamp);

            // Criar bundle para passar ao HeadlessJS task
            WritableMap data = Arguments.createMap();
            data.putString("alarmId", alarmId);
            data.putDouble("timestamp", timestamp);
            
            if (habitId != null) data.putString("habitId", habitId);
            if (habitName != null) data.putString("habitName", habitName);
            if (title != null) data.putString("title", title);
            if (body != null) data.putString("body", body);
            if (reminderId != null) data.putString("reminderId", reminderId);
            if (dayOfWeek != null) data.putString("dayOfWeek", dayOfWeek);
            if (time != null) data.putString("time", time);

            // Iniciar HeadlessJS task para disparar notificação Notifee
            Intent serviceIntent = new Intent(context, AlarmHeadlessTaskService.class);
            serviceIntent.putExtras(Arguments.toBundle(data));
            context.startService(serviceIntent);

            Log.d(TAG, "✅ HeadlessJS task iniciado");

        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao processar alarme: " + e.getMessage(), e);
        }
    }
}
