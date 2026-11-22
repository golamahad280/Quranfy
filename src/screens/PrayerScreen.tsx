import {
  CalculationMethod,
  Coordinates,
  Madhab,
  PrayerTimes,
  Qibla,
} from 'adhan';
import {Bell, Compass, LocateFixed, MapPin, Navigation} from 'lucide-react';
import React, {useEffect, useMemo, useState} from 'react';
import {OFFLINE_CITIES} from '../data/cities';
import {pickLang} from '../data/i18n';
import {syncPrayerNotifications} from '../services/prayerNotifications';
import {useQuranStore} from '../store/useQuranStore';
import {PrayerCalculationMethodId, PrayerKey} from '../types/quran';

interface OrientationEventWithWebkit extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

interface DeviceOrientationStatic {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

function resolveCalculationParams(id: PrayerCalculationMethodId, madhab: 'shafi' | 'hanafi') {
  const params = (() => {
    switch (id) {
      case 'Egyptian':
        return CalculationMethod.Egyptian();
      case 'Karachi':
        return CalculationMethod.Karachi();
      case 'UmmAlQura':
        return CalculationMethod.UmmAlQura();
      case 'Dubai':
        return CalculationMethod.Dubai();
      case 'MoonsightingCommittee':
        return CalculationMethod.MoonsightingCommittee();
      case 'NorthAmerica':
        return CalculationMethod.NorthAmerica();
      case 'Kuwait':
        return CalculationMethod.Kuwait();
      case 'Qatar':
        return CalculationMethod.Qatar();
      case 'Singapore':
        return CalculationMethod.Singapore();
      case 'Tehran':
        return CalculationMethod.Tehran();
      case 'Turkey':
        return CalculationMethod.Turkey();
      case 'MuslimWorldLeague':
      default:
        return CalculationMethod.MuslimWorldLeague();
    }
  })();
  params.madhab = madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

const METHOD_OPTIONS: Array<{id: PrayerCalculationMethodId; label: string}> = [
  {id: 'MuslimWorldLeague', label: 'Muslim World League'},
  {id: 'UmmAlQura', label: 'Umm al-Qura (Makkah)'},
  {id: 'Karachi', label: 'University of Islamic Sciences, Karachi'},
  {id: 'Egyptian', label: 'Egyptian General Authority'},
  {id: 'NorthAmerica', label: 'ISNA (North America)'},
  {id: 'Singapore', label: 'MUIS (Singapore / SE Asia)'},
  {id: 'Turkey', label: 'Diyanet (Turkey)'},
  {id: 'Dubai', label: 'Dubai'},
  {id: 'Qatar', label: 'Qatar'},
  {id: 'Kuwait', label: 'Kuwait'},
  {id: 'MoonsightingCommittee', label: 'Moonsighting Committee'},
  {id: 'Tehran', label: 'Institute of Geophysics, Tehran'},
];

export const PrayerScreen: React.FC = () => {
  const lang = useQuranStore((s) => s.settings.language);
  const prayerSettings = useQuranStore((s) => s.prayerSettings);
  const updatePrayerSettings = useQuranStore((s) => s.updatePrayerSettings);
  const showToast = useQuranStore((s) => s.showToast);

  const [now, setNow] = useState(() => new Date());
  const [locatingGps, setLocatingGps] = useState(false);
  const [customLat, setCustomLat] = useState(String(prayerSettings.latitude));
  const [customLng, setCustomLng] = useState(String(prayerSettings.longitude));
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [compassError, setCompassError] = useState<string | null>(null);
  const [needsIosPermission, setNeedsIosPermission] = useState<boolean>(() => {
    if (typeof DeviceOrientationEvent === 'undefined') return false;
    return typeof (DeviceOrientationEvent as unknown as DeviceOrientationStatic).requestPermission === 'function';
  });

  useEffect(() => {
    setCustomLat(String(prayerSettings.latitude));
    setCustomLng(String(prayerSettings.longitude));
  }, [prayerSettings.latitude, prayerSettings.longitude]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Device compass listener (Android + standard web)
  useEffect(() => {
    if (needsIosPermission || typeof window === 'undefined') return;

    const handler = (ev: DeviceOrientationEvent) => {
      const webkitHeading = (ev as OrientationEventWithWebkit).webkitCompassHeading;
      if (typeof webkitHeading === 'number' && !Number.isNaN(webkitHeading)) {
        setCompassHeading(webkitHeading);
      } else if (typeof ev.alpha === 'number') {
        setCompassHeading((360 - ev.alpha) % 360);
      }
    };

    window.addEventListener('deviceorientationabsolute' as keyof WindowEventMap, handler as EventListener);
    window.addEventListener('deviceorientation', handler);
    return () => {
      window.removeEventListener('deviceorientationabsolute' as keyof WindowEventMap, handler as EventListener);
      window.removeEventListener('deviceorientation', handler);
    };
  }, [needsIosPermission]);

  const coords = useMemo(
    () => new Coordinates(prayerSettings.latitude, prayerSettings.longitude),
    [prayerSettings.latitude, prayerSettings.longitude]
  );

  const prayerTimes = useMemo(() => {
    const params = resolveCalculationParams(prayerSettings.method, prayerSettings.madhab);
    return new PrayerTimes(coords, now, params);
  }, [coords, prayerSettings.method, prayerSettings.madhab, now]);

  const qiblaBearing = useMemo(() => Qibla(coords), [coords]);

  const rows = useMemo(
    () => [
      {
        key: 'fajr' as const,
        label: pickLang(lang, 'Fajr', 'الفجر', 'ফজর'),
        time: prayerTimes.fajr,
        hasNotif: true,
      },
      {
        key: 'sunrise' as const,
        label: pickLang(lang, 'Sunrise', 'الشروق', 'সূর্যোদয়'),
        time: prayerTimes.sunrise,
        hasNotif: false,
      },
      {
        key: 'dhuhr' as const,
        label: pickLang(lang, 'Dhuhr', 'الظهر', 'যোহর'),
        time: prayerTimes.dhuhr,
        hasNotif: true,
      },
      {
        key: 'asr' as const,
        label: pickLang(lang, 'Asr', 'العصر', 'আসর'),
        time: prayerTimes.asr,
        hasNotif: true,
      },
      {
        key: 'maghrib' as const,
        label: pickLang(lang, 'Maghrib', 'المغرب', 'মাগরিব'),
        time: prayerTimes.maghrib,
        hasNotif: true,
      },
      {
        key: 'isha' as const,
        label: pickLang(lang, 'Isha', 'العشاء', 'ইশা'),
        time: prayerTimes.isha,
        hasNotif: true,
      },
    ],
    [prayerTimes, lang]
  );

  const nextPrayerInfo = useMemo(() => {
    const upcoming = rows.find((r) => r.time.getTime() > now.getTime());
    if (upcoming) {
      return {label: upcoming.label, target: upcoming.time};
    }
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const params = resolveCalculationParams(prayerSettings.method, prayerSettings.madhab);
    const tomorrowPt = new PrayerTimes(coords, tomorrow, params);
    return {
      label: pickLang(lang, 'Fajr', 'الفجر', 'ফজর'),
      target: tomorrowPt.fajr,
    };
  }, [rows, now, coords, prayerSettings.method, prayerSettings.madhab, lang]);

  const diffSec = Math.max(0, Math.floor((nextPrayerInfo.target.getTime() - now.getTime()) / 1000));
  const remH = Math.floor(diffSec / 3600);
  const remM = Math.floor((diffSec % 3600) / 60);
  const remS = diffSec % 60;

  const formatClock = (dt: Date) =>
    dt.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : lang === 'bn' ? 'bn-BD' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleUseGps = () => {
    if (!('geolocation' in navigator)) {
      showToast(pickLang(lang, 'GPS not available on this device', 'الموقع غير متاح', 'জিপিএস পাওয়া যায়নি'));
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingGps(false);
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        updatePrayerSettings({
          latitude: lat,
          longitude: lng,
          cityName: pickLang(lang, 'GPS Location', 'موقعي الحالي', 'জিপিএস অবস্থান'),
        });
        showToast(pickLang(lang, 'Location updated from GPS', 'تم تحديث الموقع', 'অবস্থান আপডেট হয়েছে'));
      },
      () => {
        setLocatingGps(false);
        showToast(
          pickLang(
            lang,
            'Could not access GPS. Select a city or enter coordinates below.',
            'تعذر الوصول للموقع. اختر مدينة يدوياً.',
            'জিপিএস অনুমতি মেলেনি। নিচের তালিকা থেকে শহর নির্বাচন করুন।'
          )
        );
      },
      {enableHighAccuracy: false, timeout: 10000}
    );
  };

  const handleApplyCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(customLat);
    const lng = Number(customLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      showToast(pickLang(lang, 'Enter valid latitude (-90..90) and longitude (-180..180)', 'إحداثيات غير صالحة', 'সঠিক অক্ষাংশ ও দ্রাঘিমাংশ দিন'));
      return;
    }
    updatePrayerSettings({
      latitude: lat,
      longitude: lng,
      cityName: `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
    });
    showToast(pickLang(lang, 'Coordinates saved', 'تم حفظ الإحداثيات', 'স্থানাঙ্ক সংরক্ষিত হয়েছে'));
  };

  const handleTogglePrayerNotif = async (key: PrayerKey) => {
    const nextNotifications = {
      ...prayerSettings.notifications,
      [key]: !prayerSettings.notifications[key],
    };
    updatePrayerSettings({notifications: nextNotifications});
    const res = await syncPrayerNotifications(
      {
        fajr: prayerTimes.fajr,
        dhuhr: prayerTimes.dhuhr,
        asr: prayerTimes.asr,
        maghrib: prayerTimes.maghrib,
        isha: prayerTimes.isha,
      },
      nextNotifications,
      prayerSettings.cityName,
      lang
    );
    showToast(res.message);
  };

  const handleEnableIosCompass = async () => {
    try {
      const fn = (DeviceOrientationEvent as unknown as DeviceOrientationStatic).requestPermission;
      if (fn) {
        const res = await fn();
        if (res === 'granted') {
          setNeedsIosPermission(false);
        } else {
          setCompassError('Compass permission denied');
        }
      }
    } catch {
      setCompassError('Compass sensor unavailable');
    }
  };

  const relativeQiblaAngle =
    compassHeading !== null ? (qiblaBearing - compassHeading + 360) % 360 : qiblaBearing;

  return (
    <div className="space-y-6 pb-8 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-ink dark:text-ink-dark">
          {pickLang(lang, 'Prayer Times & Qibla', 'مواقيت الصلاة والقبلة', 'নামাজের সময় ও কিবলা')}
        </h2>
        <p className="text-xs text-muted dark:text-muted-dark">
          {pickLang(
            lang,
            'Calculated completely offline on your device via Adhan',
            'حساب محلي دقيق للمواقيت والقبلة بدون إنترنت',
            'সম্পূর্ণ অফলাইনে আপনার অবস্থানের নামাজের সময় ও কিবলার দিক'
          )}
        </p>
      </div>

      {/* Hero Next Prayer Card */}
      <div className="rounded-3xl glass-strong p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 border border-brand-500/20 dark:border-accent/25">
        <div>
          <p className="text-xs font-semibold text-brand-700 dark:text-accent flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>{prayerSettings.cityName}</span>
          </p>
          <p className="text-sm text-muted dark:text-muted-dark mt-2">
            {pickLang(lang, 'Next Prayer', 'الصلاة القادمة', 'পরবর্তী ওয়াক্ত')}:{' '}
            <strong className="text-ink dark:text-ink-dark">{nextPrayerInfo.label}</strong> ·{' '}
            <span className="tabular-nums">{formatClock(nextPrayerInfo.target)}</span>
          </p>
        </div>
        <div className="text-end">
          <p className="text-[11px] text-muted dark:text-muted-dark">
            {pickLang(lang, 'Time Remaining', 'الوقت المتبقي', 'বাকি সময়')}
          </p>
          <p className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-brand-700 dark:text-accent">
            {String(remH).padStart(2, '0')}:{String(remM).padStart(2, '0')}:
            {String(remS).padStart(2, '0')}
          </p>
        </div>
      </div>

      {/* Prayer Schedule + Notification Toggles */}
      <section className="rounded-3xl glass p-4 sm:p-5 divide-y divide-brand-500/10 dark:divide-white/10">
        {rows.map((row) => {
          const isNext = nextPrayerInfo.label === row.label;
          const notifOn = row.hasNotif && prayerSettings.notifications[row.key as PrayerKey];
          return (
            <div
              key={row.key}
              className={`flex items-center justify-between gap-3 py-3 px-2 rounded-2xl ${
                isNext ? 'bg-brand-600/10 dark:bg-accent/12' : ''
              }`}
            >
              <span className="text-sm font-semibold text-ink dark:text-ink-dark">
                {row.label}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold tabular-nums text-brand-700 dark:text-accent">
                  {formatClock(row.time)}
                </span>
                {row.hasNotif ? (
                  <button
                    type="button"
                    onClick={() => void handleTogglePrayerNotif(row.key as PrayerKey)}
                    aria-label={`Toggle ${row.label} notification`}
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl transition-colors ${
                      notifOn
                        ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                        : 'glass text-muted dark:text-muted-dark'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="w-[44px]" />
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Live Qibla Compass */}
      <section className="rounded-3xl glass p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="space-y-2 text-center sm:text-start">
          <div className="inline-flex items-center gap-2 text-brand-700 dark:text-accent font-bold text-sm">
            <Compass className="w-4 h-4" />
            <span>{pickLang(lang, 'Qibla Direction', 'اتجاه القبلة', 'কিবলার দিক')}</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-ink dark:text-ink-dark">
            {qiblaBearing.toFixed(1)}°{' '}
            <span className="text-xs font-medium text-muted dark:text-muted-dark">
              {pickLang(lang, 'from True North', 'من الشمال الجغرافي', 'উত্তর দিক থেকে')}
            </span>
          </p>
          <p className="text-xs text-muted dark:text-muted-dark">
            {compassHeading !== null
              ? pickLang(
                  lang,
                  `Live sensor heading: ${Math.round(compassHeading)}°`,
                  `اتجاه البوصلة الحية: ${Math.round(compassHeading)}°`,
                  `লাইভ কম্পাস: ${Math.round(compassHeading)}°`
                )
              : pickLang(
                  lang,
                  'Static bearing shown (hold phone flat for live compass if supported).',
                  'يُعرض الاتجاه الثابت (ضع الهاتف أفقياً للبوصلة الحية عند الدعم).',
                  'স্থির কিবলা দিক দেখানো হচ্ছে (সাপোর্ট থাকলে ফোন সমান্তরাল রাখুন)।'
                )}
          </p>
          {needsIosPermission && (
            <button
              type="button"
              onClick={() => void handleEnableIosCompass()}
              className="md-ripple px-4 min-h-[44px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-semibold"
            >
              {pickLang(lang, 'Enable Live Compass', 'تفعيل البوصلة', 'কম্পাস চালু করুন')}
            </button>
          )}
          {compassError && <p className="text-xs text-rose-500">{compassError}</p>}
        </div>

        {/* SVG Qibla Dial */}
        <div className="relative w-40 h-40 shrink-0 flex items-center justify-center rounded-full glass-strong border border-brand-500/20 dark:border-accent/25">
          <span className="absolute top-2 text-[10px] font-bold text-muted dark:text-muted-dark">N</span>
          <span className="absolute bottom-2 text-[10px] font-bold text-muted dark:text-muted-dark">S</span>
          <span className="absolute right-2.5 text-[10px] font-bold text-muted dark:text-muted-dark">E</span>
          <span className="absolute left-2.5 text-[10px] font-bold text-muted dark:text-muted-dark">W</span>
          <div
            className="w-24 h-24 flex items-center justify-center transition-transform duration-200"
            style={{transform: `rotate(${relativeQiblaAngle}deg)`}}
          >
            <Navigation className="w-10 h-10 text-brand-600 dark:text-accent fill-current" />
          </div>
        </div>
      </section>

      {/* Location & Calculation Method Controls */}
      <section className="rounded-3xl glass p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-brand-700 dark:text-accent">
            {pickLang(lang, 'Location & Calculation Settings', 'إعدادات الموقع وطريقة الحساب', 'অবস্থান ও হিসাব পদ্ধতি')}
          </h3>
          <button
            type="button"
            disabled={locatingGps}
            onClick={handleUseGps}
            className="md-ripple inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-semibold disabled:opacity-60"
          >
            <LocateFixed className="w-4 h-4" />
            <span>
              {locatingGps
                ? pickLang(lang, 'Locating...', 'جاري التحديد...', 'খোঁজা হচ্ছে...')
                : pickLang(lang, 'Use GPS', 'استخدام GPS', 'GPS ব্যবহার করুন')}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted dark:text-muted-dark mb-1.5">
              {pickLang(lang, 'City Preset (Offline)', 'اختر مدينة', 'শহর নির্বাচন (অফলাইন)')}
            </label>
            <select
              value={
                OFFLINE_CITIES.find((c) => c.name === prayerSettings.cityName)?.name ?? ''
              }
              onChange={(e) => {
                const city = OFFLINE_CITIES.find((c) => c.name === e.target.value);
                if (city) {
                  updatePrayerSettings({
                    cityName: city.name,
                    latitude: city.latitude,
                    longitude: city.longitude,
                    method: city.defaultMethod,
                  });
                }
              }}
              className="w-full min-h-[48px] rounded-2xl glass px-3 text-xs font-medium"
            >
              <option value="" className="bg-surface-light dark:bg-surface-dark">
                -- {prayerSettings.cityName} --
              </option>
              {OFFLINE_CITIES.map((city) => (
                <option
                  key={city.name}
                  value={city.name}
                  className="bg-surface-light dark:bg-surface-dark"
                >
                  {city.name} ({city.country})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted dark:text-muted-dark mb-1.5">
              {pickLang(lang, 'Calculation Method', 'طريقة الحساب', 'হিসাবের পদ্ধতি')}
            </label>
            <select
              value={prayerSettings.method}
              onChange={(e) =>
                updatePrayerSettings({method: e.target.value as PrayerCalculationMethodId})
              }
              className="w-full min-h-[48px] rounded-2xl glass px-3 text-xs font-medium"
            >
              {METHOD_OPTIONS.map((m) => (
                <option key={m.id} value={m.id} className="bg-surface-light dark:bg-surface-dark">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted dark:text-muted-dark mb-1.5">
            {pickLang(lang, 'Asr Juristic Method (Madhab)', 'مذهب صلاة العصر', 'আসরের মাজহাব')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {id: 'shafi', label: pickLang(lang, 'Shafi / Standard', 'الجمهور (الشافعي)', 'শাফেয়ী / সাধারণ')},
                {id: 'hanafi', label: pickLang(lang, 'Hanafi', 'الحنفي', 'হানাফী')},
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => updatePrayerSettings({madhab: opt.id})}
                className={`md-ripple min-h-[48px] rounded-2xl text-xs font-semibold ${
                  prayerSettings.madhab === opt.id
                    ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                    : 'glass text-ink dark:text-ink-dark'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleApplyCoords} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <input
            type="number"
            step="0.0001"
            value={customLat}
            onChange={(e) => setCustomLat(e.target.value)}
            placeholder="Latitude"
            aria-label="Latitude"
            className="min-h-[44px] rounded-2xl glass px-3 text-xs tabular-nums"
          />
          <input
            type="number"
            step="0.0001"
            value={customLng}
            onChange={(e) => setCustomLng(e.target.value)}
            placeholder="Longitude"
            aria-label="Longitude"
            className="min-h-[44px] rounded-2xl glass px-3 text-xs tabular-nums"
          />
          <button
            type="submit"
            className="md-ripple min-h-[44px] rounded-2xl glass font-semibold text-xs text-brand-700 dark:text-accent"
          >
            {pickLang(lang, 'Apply Coordinates', 'تطبيق الإحداثيات', 'স্থানাঙ্ক সেট করুন')}
          </button>
        </form>
      </section>
    </div>
  );
};
export default PrayerScreen;
