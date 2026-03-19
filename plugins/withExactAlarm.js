// plugins/withExactAlarm.js
const { withAppBuildGradle, withMainApplication, withAndroidManifest } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.dtriches.myhabitstracker';
const PACKAGE_PATH = 'app/src/main/java/com/dtriches/myhabitstracker';

// ---------------------------------------------------------------------------
// 1. Copiar arquivos Java nativos para o projeto Android gerado pelo prebuild
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 2. Registrar ExactAlarmPackage no MainApplication.kt
// ---------------------------------------------------------------------------
function withMainApplicationPackage(config) {
  return withMainApplication(config, (mod) => {
    const contents = mod.modResults.contents;

    // Evitar duplicação
    if (contents.includes('ExactAlarmPackage')) {
      console.log('[withExactAlarm] ExactAlarmPackage já registrado');
      return mod;
    }

    // Adicionar import
    const withImport = contents.replace(
      /^(package com\.dtriches\.myhabitstracker\n)/m,
      `$1import com.dtriches.myhabitstracker.ExactAlarmPackage\n`
    );

    // Adicionar add(ExactAlarmPackage()) dentro do apply { }
    const withPackage = withImport.replace(
      /PackageList\(this\)\.packages\.apply \{(\s*?)(\})/,
      `PackageList(this).packages.apply {$1  add(ExactAlarmPackage())\n$2`
    );

    mod.modResults.contents = withPackage;
    console.log('[withExactAlarm] ExactAlarmPackage registrado no MainApplication');
    return mod;
  });
}

// ---------------------------------------------------------------------------
// 3. Adicionar permissões e receiver/service no AndroidManifest
// ---------------------------------------------------------------------------
function withAlarmManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const app = manifest.application[0];

    // --- Permissões ---
    const permissions = [
      'android.permission.WAKE_LOCK',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
    ];

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    for (const perm of permissions) {
      const already = manifest['uses-permission'].some(
        (p) => p.$['android:name'] === perm
      );
      if (!already) {
        manifest['uses-permission'].push({ $: { 'android:name': perm } });
        console.log(`[withExactAlarm] Permissão adicionada: ${perm}`);
      }
    }

    // --- Receiver ---
    if (!app.receiver) app.receiver = [];

    const receiverExists = app.receiver.some(
      (r) => r.$['android:name'] === '.AlarmReceiver'
    );

    if (!receiverExists) {
      app.receiver.push({
        $: {
          'android:name': '.AlarmReceiver',
          'android:enabled': 'true',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': `${PACKAGE_NAME}.EXACT_ALARM` } },
              { $: { 'android:name': `${PACKAGE_NAME}.ACTION_SNOOZE` } },
              { $: { 'android:name': `${PACKAGE_NAME}.ACTION_COMPLETE` } },
            ],
          },
        ],
      });
      console.log('[withExactAlarm] AlarmReceiver adicionado ao AndroidManifest');
    }

    return mod;
  });
}

// ---------------------------------------------------------------------------
// Plugin principal — compõe os três modificadores
// ---------------------------------------------------------------------------
module.exports = function withExactAlarm(config) {
  config = withJavaFiles(config);
  config = withMainApplicationPackage(config);
  config = withAlarmManifest(config);
  return config;
};