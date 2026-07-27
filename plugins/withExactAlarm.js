// plugins/withExactAlarm.js
const { withAppBuildGradle, withMainApplication, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.dtriches.myhabitstracker';
const PACKAGE_PATH = 'app/src/main/java/com/dtriches/myhabitstracker';

function withJavaFiles(config) {
  return withAppBuildGradle(config, (mod) => {
    const androidDir = mod.modRequest.platformProjectRoot;
    const destDir = path.join(androidDir, PACKAGE_PATH);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const javaFiles = [
      'AlarmReceiver.java',
      'ExactAlarmModule.java',
      'ExactAlarmPackage.java',
      'AlarmStorage.java',
      'BootReceiver.java',
    ];
    const srcDir = path.join(mod.modRequest.projectRoot, 'plugins', 'java');

    for (const file of javaFiles) {
      const src = path.join(srcDir, file);
      const dest = path.join(destDir, file);
      if (!fs.existsSync(src)) {
        console.warn(`[withExactAlarm] Arquivo não encontrado: ${src}`);
        continue;
      }
      fs.copyFileSync(src, dest);
      console.log(`[withExactAlarm] Copiado: ${file}`);
    }

    return mod;
  });
}

function withMainApplicationPackage(config) {
  return withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;

    // Import — adicionar só se não existir
    if (!contents.includes('import com.dtriches.myhabitstracker.ExactAlarmPackage')) {
      contents = contents.replace(
        /^(package com\.dtriches\.myhabitstracker\s*\n)/m,
        `$1import com.dtriches.myhabitstracker.ExactAlarmPackage\n`
      );
      console.log('[withExactAlarm] Import adicionado');
    }

    // add() — adicionar só se não existir
    if (!contents.includes('add(ExactAlarmPackage())')) {
      contents = contents.replace(
        /(PackageList\(this\)\.packages\.apply\s*\{)([\s\S]*?)(\})/,
        (match, open, body, close) => `${open}${body}  add(ExactAlarmPackage())\n              ${close}`
      );
      console.log('[withExactAlarm] add(ExactAlarmPackage()) inserido');
    }

    mod.modResults.contents = contents;
    return mod;
  });
}

function withAlarmManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const app = manifest.application[0];

    if (!manifest['uses-permission']) manifest['uses-permission'] = [];

    const permissions = [
      'android.permission.WAKE_LOCK',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
    ];

    for (const perm of permissions) {
      if (!manifest['uses-permission'].some((p) => p.$['android:name'] === perm)) {
        manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }

    if (!app.receiver) app.receiver = [];

    if (!app.receiver.some((r) => r.$['android:name'] === '.AlarmReceiver')) {
      app.receiver.push({
        $: { 'android:name': '.AlarmReceiver', 'android:enabled': 'true', 'android:exported': 'false' },
        'intent-filter': [{
          action: [
            { $: { 'android:name': `${PACKAGE_NAME}.EXACT_ALARM` } },
            { $: { 'android:name': `${PACKAGE_NAME}.ACTION_SNOOZE` } },
            { $: { 'android:name': `${PACKAGE_NAME}.ACTION_COMPLETE` } },
          ],
        }],
      });
      console.log('[withExactAlarm] AlarmReceiver adicionado');
    }

    // BootReceiver: reagenda todos os alarmes persistidos após o
    // dispositivo reiniciar ou o app ser atualizado. Precisa de
    // android:exported="true" porque BOOT_COMPLETED e
    // MY_PACKAGE_REPLACED são broadcasts do sistema (fonte externa ao app).
    if (!app.receiver.some((r) => r.$['android:name'] === '.BootReceiver')) {
      app.receiver.push({
        $: { 'android:name': '.BootReceiver', 'android:enabled': 'true', 'android:exported': 'true' },
        'intent-filter': [{
          action: [
            { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
            { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
          ],
        }],
      });
      console.log('[withExactAlarm] BootReceiver adicionado');
    }

    return mod;
  });
}

module.exports = function withExactAlarm(config) {
  config = withJavaFiles(config);
  config = withMainApplicationPackage(config);
  config = withAlarmManifest(config);
  return config;
};