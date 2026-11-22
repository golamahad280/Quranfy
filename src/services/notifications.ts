import {Capacitor} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {pickLang} from '../data/i18n';
import {AppLanguage} from '../types/quran';

const REMINDER_NOTIFICATION_ID = 11401;

export async function scheduleDailyReminder(
  enabled: boolean,
  timeHHMM: string,
  language: AppLanguage
): Promise<{ok: boolean; message: string}> {
  const [hourStr, minStr] = timeHHMM.split(':');
  const hour = Math.min(23, Math.max(0, Number(hourStr) || 20));
  const minute = Math.min(59, Math.max(0, Number(minStr) || 0));

  const title = pickLang(
    language,
    'Daily Quran Time',
    'وقت القرآن اليومي',
    'দৈনিক কুরআনের সময়'
  );
  const body = pickLang(
    language,
    'Take a few calm minutes to listen and reflect on the Quran.',
    'خصّص دقائق هادئة للاستماع إلى القرآن وتدبره.',
    'কুরআন তিলাওয়াত শুনতে ও অনুধাবন করতে কিছু শান্ত সময় দিন।'
  );

  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') {
        return {
          ok: false,
          message: pickLang(
            language,
            'Notification permission was denied.',
            'يرجى السماح بالإشعارات من إعدادات الجهاز.',
            'নোটিফিকেশনের অনুমতি দেওয়া হয়নি।'
          ),
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
          ? pickLang(
              language,
              `Daily reminder set for ${timeHHMM}.`,
              'تم جدولة التذكير اليومي.',
              `দৈনিক রিমাইন্ডার ${timeHHMM}-এ সেট করা হয়েছে।`
            )
          : pickLang(
              language,
              'Daily reminder turned off.',
              'تم إيقاف التذكير اليومي.',
              'দৈনিক রিমাইন্ডার বন্ধ করা হয়েছে।'
            ),
      };
    } catch {
      return {
        ok: false,
        message: pickLang(
          language,
          'Could not schedule native notification.',
          'تعذر جدولة الإشعار على هذا الجهاز.',
          'এই ডিভাইসে নোটিফিকেশন নির্ধারণ করা যায়নি।'
        ),
      };
    }
  }

  // Web / PWA fallback using Notification API
  if (!('Notification' in window)) {
    return {
      ok: true,
      message: pickLang(
        language,
        'Reminder preference saved locally (native schedule activates in Android APK).',
        'تم حفظ تفضيل التذكير محلياً (إشعارات النظام متاحة في تطبيق Android).',
        'রিমাইন্ডার স্থানীয়ভাবে সংরক্ষিত হয়েছে (Android অ্যাপে নির্ধারিত সময় কাজ করবে)।'
      ),
    };
  }

  if (enabled && Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      return {
        ok: false,
        message: pickLang(
          language,
          'Browser notification permission was not granted.',
          'يرجى السماح بإشعارات المتصفح.',
          'ব্রাউজার নোটিফিকেশনের অনুমতি দেওয়া হয়নি।'
        ),
      };
    }
  }

  return {
    ok: true,
    message: enabled
      ? pickLang(
          language,
          `Daily reminder saved for ${timeHHMM}.`,
          `تم حفظ التذكير للساعة ${timeHHMM}.`,
          `দৈনিক রিমাইন্ডার ${timeHHMM}-এ সংরক্ষিত হয়েছে।`
        )
      : pickLang(
          language,
          'Daily reminder turned off.',
          'تم إيقاف التذكير.',
          'দৈনিক রিমাইন্ডার বন্ধ করা হয়েছে।'
        ),
  };
}

export async function sendTestNotification(language: AppLanguage): Promise<boolean> {
  const title = pickLang(language, 'Quranfy Reminder', 'تذكير قرآنفاي', 'কুরআনফাই রিমাইন্ডার');
  const body = pickLang(
    language,
    'A gentle reminder for your daily Quran listening goal.',
    'تذكير لطيف لوردك اليومي من القرآن الكريم.',
    'আপনার দৈনিক কুরআন শোনার লক্ষ্যের একটি কোমল স্মরণ।'
  );

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
