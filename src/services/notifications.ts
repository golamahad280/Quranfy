import {Capacitor} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';

const REMINDER_NOTIFICATION_ID = 11401;

export async function scheduleDailyReminder(
  enabled: boolean,
  timeHHMM: string,
  language: 'en' | 'ar'
): Promise<{ok: boolean; message: string}> {
  const [hourStr, minStr] = timeHHMM.split(':');
  const hour = Math.min(23, Math.max(0, Number(hourStr) || 20));
  const minute = Math.min(59, Math.max(0, Number(minStr) || 0));

  const title = language === 'ar' ? 'وقت القرآن اليومي' : 'Daily Quran Time';
  const body =
    language === 'ar'
      ? 'خصّص دقائق هادئة للاستماع إلى القرآن وتدبره.'
      : 'Take a few calm minutes to listen and reflect on the Quran.';

  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') {
        return {
          ok: false,
          message:
            language === 'ar'
              ? 'يرجى السماح بالإشعارات من إعدادات الجهاز.'
              : 'Notification permission was denied.',
        };
      }

      await LocalNotifications.cancel({notifications: [{id: REMINDER_NOTIFICATION_ID}]});

      if (enabled) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: REMINDER_NOTIFICATION_ID,
              title,
              body,
              schedule: {
                on: {hour, minute},
                repeats: true,
                allowWhileIdle: true,
              },
            },
          ],
        });
      }
      return {
        ok: true,
        message: enabled
          ? language === 'ar'
            ? 'تم جدولة التذكير اليومي.'
            : `Daily reminder set for ${timeHHMM}.`
          : language === 'ar'
          ? 'تم إيقاف التذكير اليومي.'
          : 'Daily reminder turned off.',
      };
    } catch {
      return {
        ok: false,
        message:
          language === 'ar'
            ? 'تعذر جدولة الإشعار على هذا الجهاز.'
            : 'Could not schedule native notification.',
      };
    }
  }

  // Web / PWA fallback using Notification API
  if (!('Notification' in window)) {
    return {
      ok: true,
      message:
        language === 'ar'
          ? 'تم حفظ تفضيل التذكير محلياً (إشعارات النظام متاحة في تطبيق Android).'
          : 'Reminder preference saved locally (native schedule activates in Android APK).',
    };
  }

  if (enabled && Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      return {
        ok: false,
        message:
          language === 'ar'
            ? 'يرجى السماح بإشعارات المتصفح.'
            : 'Browser notification permission was not granted.',
      };
    }
  }

  return {
    ok: true,
    message: enabled
      ? language === 'ar'
        ? `تم حفظ التذكير للساعة ${timeHHMM}.`
        : `Daily reminder saved for ${timeHHMM}.`
      : language === 'ar'
      ? 'تم إيقاف التذكير.'
      : 'Daily reminder turned off.',
  };
}

export async function sendTestNotification(language: 'en' | 'ar'): Promise<boolean> {
  const title = language === 'ar' ? 'تذكير قرآنفاي' : 'Quranfy Reminder';
  const body =
    language === 'ar'
      ? 'تذكير لطيف لوردك اليومي من القرآن الكريم.'
      : 'A gentle reminder for your daily Quran listening goal.';

  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return false;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: REMINDER_NOTIFICATION_ID + 1,
            title,
            body,
            schedule: {at: new Date(Date.now() + 1500)},
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }

  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (Notification.permission === 'granted') {
      new Notification(title, {body, icon: './pwa-192x192.png'});
      return true;
    }
  }
  return false;
}
