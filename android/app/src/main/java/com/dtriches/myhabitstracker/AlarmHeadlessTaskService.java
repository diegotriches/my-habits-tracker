// android/app/src/main/java/com/dtriches/myhabitstracker/AlarmHeadlessTaskService.java
package com.dtriches.myhabitstracker;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;

import javax.annotation.Nullable;

/**
 * Service para executar código JS quando o app está em background
 */
public class AlarmHeadlessTaskService extends HeadlessJsTaskService {
    private static final String TAG = "AlarmHeadlessTask";

    @Override
    protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        Bundle extras = intent.getExtras();
        
        if (extras != null) {
            Log.d(TAG, "🚀 Iniciando HeadlessJS task com dados");
            
            return new HeadlessJsTaskConfig(
                "HabitAlarmTask", // Nome da task registrada no JS
                Arguments.fromBundle(extras),
                60000, // Timeout: 60 segundos
                true  // Permitir em foreground também
            );
        }
        
        Log.w(TAG, "⚠️ Extras nulos");
        return null;
    }
}
