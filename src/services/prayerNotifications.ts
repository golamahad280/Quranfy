import {Capacitor} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {pickLang} from '../data/i18n';
import {AppLanguage, PrayerKey} from '../types/quran';

const PRAYER_NOTIFICATION_IDS: Record<PrayerKey, number> = {
  fajr: 11500,
  dhuhr: 11501,
  asr: 11502,
  maghrib: 11503,
  isha: 11504,
};

const PRAYER_LABELS: Record<PrayerKey, {en: string; ar: string; bn: string}> = {
  fajr: {en: 'Fajr', ar: 'الفجر', bn: 'ফজর'},
  dhuhr: {en: 'Dhuhr', ar: 'الظهر', bn: 'যোহর'},
  asr: {en: 'Asr', ar: 'العصر', bn: 'আসর'},
  maghrib: {en: 'Maghrib', ar: 'المغرب', bn: 'মাগরিব'},
  isha: {en: 'Isha', ar: 'العشاء', bn: 'ইশা'},
};

export async function syncPrayerNotifications(
  times: Record<PrayerKey, Date>,
  enabledMap: Record<PrayerKey, boolean>,
  cityName: string,
  lang: AppLanguage
): Promise<{ok: boolean; message: string}> {
  const anyEnabled = Object.values(enabledMap).some(Boolean);
  const allIds = Object.values(PRAYER_NOTIFICATION_IDS).map((id) => ({id}));

  if (!Capacitor.isNativePlatform()) {
    if ('Notification' in window && anyEnabled && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    return {
      ok: true,
      message: pickLang(
        lang,
        'Prayer alert preferences saved locally (scheduled background alerts run in Android APK).',
        'تم حفظ تفضيلات تنبيهات الصلاة محلياً (تعمل في تطبيق Android).',
        'নামাজের সতর্কতা পছন্দ সংরক্ষিত হয়েছে (Android অ্যাপে নির্ধারিত সময়ে নোটিফিকেশন আসবে)।'
      ),
    };
  }

  try {
    if (anyEnabled) {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') {
        return {
          ok: false,
          message: pickLang(
            lang,
            'Notification permission was denied.',
            'تم رفض إذن الإشعارات.',
            'নোটিফিকেশনের অনুমতি দেওয়া হয়নি।'
          ),
        };
      }
    }

    await LocalNotifications.cancel({notifications: allIds});

    const toSchedule = (Object.keys(PRAYER_NOTIFICATION_IDS) as PrayerKey[])
      .filter((key) => enabledMap[key])
      .map((key) => {
        const dt = times[key];
        const prayerName = pickLang(
          lang,
          PRAYER_LABELS[key].en,
          PRAYER_LABELS[key].ar,
          PRAYER_LABELS[key].bn
        );
        return {
          id: PRAYER_NOTIFICATION_IDS[key],
          title: `${prayerName} · ${cityName}`,
          body: pickLang(
            lang,
            `Time for ${PRAYER_LABELS[key].en} prayer`,
            `حان الآن وقت صلاة ${PRAYER_LABELS[key].ar}`,
            `${PRAYER_LABELS[key].bn} ওয়াক্তের সময় হয়েছে`
          ),
          schedule: {
            on: {hour: dt.getHours(), minute: dt.getMinutes()},
            repeats: true,
            allowWhileIdle: true,
          },
        };
      });

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({notifications: toSchedule});
    }

    return {
      ok: true,
      message: pickLang(
        lang,
        'Prayer notifications updated.',
        'تم تحديث تنبيهات الصلاة.',
        'নামাজের নোটিফিকেশন আপডেট হয়েছে।'
      ),
    };
  } catch {
    return {
      ok: false,
      message: pickLang(
        lang,
        'Could not schedule prayer alerts on this device.',
        'تعذر جدولة تنبيهات الصلاة.',
        'এই ডিভাইসে নামাজের নোটিফিকেশন সেট করা যায়নি।'
      ),
    };
  }
}
