import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ANDROID_DIR = path.join(ROOT, 'android');

if (!fs.existsSync(ANDROID_DIR)) {
  console.error('[patch-android] Error: android/ directory does not exist.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const versionName = String(pkg.version || '1.0.0');
const rawRun = Number.parseInt(process.env.GITHUB_RUN_NUMBER || '1', 10);
const versionCode = Number.isFinite(rawRun) && rawRun > 0 ? rawRun : 1;

console.log(`[patch-android] Patching Android project (versionName=${versionName}, versionCode=${versionCode})...`);

// 1. Ensure minSdkVersion = 24 in android/variables.gradle
const variablesPath = path.join(ANDROID_DIR, 'variables.gradle');
if (fs.existsSync(variablesPath)) {
  let varsContent = fs.readFileSync(variablesPath, 'utf8');
  if (/minSdkVersion\s*=/.test(varsContent)) {
    varsContent = varsContent.replace(/minSdkVersion\s*=\s*\d+/, 'minSdkVersion = 24');
  } else {
    varsContent = varsContent.replace(/ext\s*\{/, 'ext {\n    minSdkVersion = 24');
  }
  fs.writeFileSync(variablesPath, varsContent, 'utf8');
  console.log('[patch-android] Updated android/variables.gradle (minSdkVersion = 24).');
}

// 2. Patch android/app/build.gradle (versionCode, versionName, applicationId, release signingConfig)
const appGradlePath = path.join(ANDROID_DIR, 'app', 'build.gradle');
if (fs.existsSync(appGradlePath)) {
  let gradle = fs.readFileSync(appGradlePath, 'utf8');

  gradle = gradle.replace(/applicationId\s+["'][^"']+["']/, 'applicationId "com.quranfy.app"');
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName\s+["'][^"']+["']/, `versionName "${versionName}"`);

  // Ensure minifyEnabled false in release buildType
  if (/buildTypes\s*\{[\s\S]*?release\s*\{/.test(gradle)) {
    if (/minifyEnabled\s+\w+/.test(gradle)) {
      gradle = gradle.replace(/minifyEnabled\s+\w+/, 'minifyEnabled false');
    } else {
      gradle = gradle.replace(/release\s*\{/, 'release {\n            minifyEnabled false');
    }
  }

  const keystorePath = path.join(ROOT, 'android-keystore', 'quranfy.keystore');
  if (fs.existsSync(keystorePath)) {
    if (!gradle.includes('signingConfigs {')) {
      const signingBlock = `    signingConfigs {
        release {
            storeFile file('../../android-keystore/quranfy.keystore')
            storePassword 'quranfy123'
            keyAlias 'quranfy'
            keyPassword 'quranfy123'
        }
    }
    buildTypes {`;
      gradle = gradle.replace(/\s*buildTypes\s*\{/, `\n${signingBlock}`);
    }

    if (!gradle.includes('signingConfig signingConfigs.release')) {
      gradle = gradle.replace(
        /(buildTypes\s*\{[\s\S]*?release\s*\{)/,
        '$1\n            signingConfig signingConfigs.release'
      );
    }
    console.log('[patch-android] Configured release signingConfig with android-keystore/quranfy.keystore.');
  } else {
    console.log('[patch-android] Keystore not found at android-keystore/quranfy.keystore; skipping release signingConfig.');
  }

  fs.writeFileSync(appGradlePath, gradle, 'utf8');
  console.log('[patch-android] Updated android/app/build.gradle.');
}

// 3. Patch AndroidManifest.xml (permissions, usesCleartextTraffic="false", foreground service & receiver)
const manifestPath = path.join(ANDROID_DIR, 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');

  const requiredPermissions = [
    'android.permission.INTERNET',
    'android.permission.WAKE_LOCK',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  ];

  const missingPerms = requiredPermissions.filter((perm) => !manifest.includes(`"${perm}"`));
  if (missingPerms.length > 0) {
    const permLines = missingPerms
      .map((perm) => `    <uses-permission android:name="${perm}" />`)
      .join('\n');
    manifest = manifest.replace('</manifest>', `${permLines}\n</manifest>`);
  }

  if (manifest.includes('android:usesCleartextTraffic=')) {
    manifest = manifest.replace(
      /android:usesCleartextTraffic="[^"]*"/,
      'android:usesCleartextTraffic="false"'
    );
  } else {
    manifest = manifest.replace(
      '<application',
      '<application\n        android:usesCleartextTraffic="false"'
    );
  }

  const fgServiceLine =
    '        <service android:name="io.capawesome.capacitorjs.plugins.foregroundservice.AndroidForegroundService" android:foregroundServiceType="mediaPlayback" android:exported="false" />';
  const fgReceiverLine =
    '        <receiver android:name="io.capawesome.capacitorjs.plugins.foregroundservice.NotificationActionBroadcastReceiver" android:exported="false" />';

  const appInsertions = [];
  if (!manifest.includes('io.capawesome.capacitorjs.plugins.foregroundservice.AndroidForegroundService')) {
    appInsertions.push(fgServiceLine);
  }
  if (!manifest.includes('io.capawesome.capacitorjs.plugins.foregroundservice.NotificationActionBroadcastReceiver')) {
    appInsertions.push(fgReceiverLine);
  }

  if (appInsertions.length > 0) {
    manifest = manifest.replace(
      '</application>',
      `${appInsertions.join('\n')}\n    </application>`
    );
  }

  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('[patch-android] Updated AndroidManifest.xml.');
}

// 4. Create android/app/src/main/res/drawable/ic_stat_quranfy.xml (white 24dp crescent + open book)
const drawableDir = path.join(ANDROID_DIR, 'app', 'src', 'main', 'res', 'drawable');
fs.mkdirSync(drawableDir, {recursive: true});
const iconXmlPath = path.join(drawableDir, 'ic_stat_quranfy.xml');
const iconXml = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M13.3,3.5C11.1,3.9 9.4,5.7 9.4,8.0C9.4,10.5 11.4,12.5 13.9,12.5C15.0,12.5 16.0,12.1 16.8,11.4C16.1,13.1 14.5,14.2 12.6,14.2C9.9,14.2 7.8,12.1 7.8,9.4C7.8,6.5 10.2,3.8 13.3,3.5Z" />
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M4.5,15.3C4.5,14.5 5.1,13.9 5.9,13.9C8.2,13.9 10.4,14.6 12.0,15.8C13.6,14.6 15.8,13.9 18.1,13.9C18.9,13.9 19.5,14.5 19.5,15.3V20.0C19.5,20.7 19.0,21.2 18.3,21.2C16.0,21.2 13.9,21.8 12.0,22.8C10.1,21.8 8.0,21.2 5.7,21.2C5.0,21.2 4.5,20.7 4.5,20.0V15.3Z" />
</vector>
`;
fs.writeFileSync(iconXmlPath, iconXml, 'utf8');
console.log('[patch-android] Created drawable/ic_stat_quranfy.xml.');

// 5. Generate Android launcher icons from public/pwa-512x512.png
const sourceIcon = path.join(ROOT, 'public', 'pwa-512x512.png');
if (fs.existsSync(sourceIcon)) {
  const assetsDir = path.join(ROOT, 'assets');
  const createdAssetsDir = !fs.existsSync(assetsDir);
  fs.mkdirSync(assetsDir, {recursive: true});

  const copiedIconOnly = path.join(assetsDir, 'icon-only.png');
  fs.copyFileSync(sourceIcon, copiedIconOnly);

  let generated = false;
  try {
    execSync(
      'npx --yes @capacitor/assets generate --android --iconBackgroundColor "#0E0B1F" --iconBackgroundColorDark "#0E0B1F" --splashBackgroundColor "#0E0B1F" --splashBackgroundColorDark "#0E0B1F"',
      {stdio: 'inherit'}
    );
    generated = true;
    console.log('[patch-android] Generated Android launcher icons via @capacitor/assets.');
  } catch (err) {
    console.warn('[patch-android] @capacitor/assets failed, falling back to sharp resize:', err?.message || err);
  }

  if (!generated) {
    try {
      const sharpMod = await import('sharp').catch(() => null);
      const sharp = sharpMod?.default;
      if (sharp) {
        const mipmaps = [
          {dir: 'mipmap-mdpi', size: 48, fgSize: 108},
          {dir: 'mipmap-hdpi', size: 72, fgSize: 162},
          {dir: 'mipmap-xhdpi', size: 96, fgSize: 216},
          {dir: 'mipmap-xxhdpi', size: 144, fgSize: 324},
          {dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432},
        ];
        const resDir = path.join(ANDROID_DIR, 'app', 'src', 'main', 'res');
        for (const m of mipmaps) {
          const outDir = path.join(resDir, m.dir);
          fs.mkdirSync(outDir, {recursive: true});
          await sharp(sourceIcon).resize(m.size, m.size).png().toFile(path.join(outDir, 'ic_launcher.png'));
          await sharp(sourceIcon).resize(m.size, m.size).png().toFile(path.join(outDir, 'ic_launcher_round.png'));
          await sharp(sourceIcon).resize(m.fgSize, m.fgSize).png().toFile(path.join(outDir, 'ic_launcher_foreground.png'));
        }
        console.log('[patch-android] Generated Android launcher icons via sharp fallback.');
      } else {
        console.warn('[patch-android] Neither @capacitor/assets nor sharp available; keeping default launcher icons.');
      }
    } catch (sharpErr) {
      console.warn('[patch-android] sharp fallback failed:', sharpErr?.message || sharpErr);
    }
  }

  // Clean up temporary assets/ directory so CI git workspace remains clean
  if (createdAssetsDir) {
    fs.rmSync(assetsDir, {recursive: true, force: true});
  }
}

// 6. Write android/local.properties from ANDROID_HOME / ANDROID_SDK_ROOT
const sdkDir = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (sdkDir) {
  const normalizedSdk = sdkDir.replace(/\\/g, '\\\\');
  fs.writeFileSync(path.join(ANDROID_DIR, 'local.properties'), `sdk.dir=${normalizedSdk}\n`, 'utf8');
  console.log(`[patch-android] Wrote android/local.properties (sdk.dir=${sdkDir}).`);
} else {
  console.log('[patch-android] ANDROID_HOME not set; skipped android/local.properties.');
}
