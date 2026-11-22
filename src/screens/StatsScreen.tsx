import {Bell, Flame, Target} from 'lucide-react';
import React, {useMemo, useState} from 'react';
import {TRANSLATIONS} from '../data/i18n';
import {scheduleDailyReminder, sendTestNotification} from '../services/notifications';
import {calculateStreakDays, getTodayDateKey, useQuranStore} from '../store/useQuranStore';
import {formatMinutesLabel} from '../utils/formatters';

export const StatsScreen: React.FC = () => {
  const dailyGoalMinutes = useQuranStore((s) => s.dailyGoalMinutes);
  const listeningSecondsByDate = useQuranStore((s) => s.listeningSecondsByDate);
  const reminderEnabled = useQuranStore((s) => s.reminderEnabled);
  const reminderTime = useQuranStore((s) => s.reminderTime);
  const lang = useQuranStore((s) => s.settings.language);

  const setDailyGoalMinutes = useQuranStore((s) => s.setDailyGoalMinutes);
  const setReminder = useQuranStore((s) => s.setReminder);
  const showToast = useQuranStore((s) => s.showToast);

  const [reminderStatus, setReminderStatus] = useState<string | null>(null);
  const t = TRANSLATIONS[lang];

  const todayKey = getTodayDateKey();
  const todaySeconds = listeningSecondsByDate[todayKey] || 0;
  const todayMinutes = Math.floor(todaySeconds / 60);
  const goalPct = Math.min(100, Math.round((todaySeconds / (dailyGoalMinutes * 60)) * 100));

  const streakDays = useMemo(
    () => calculateStreakDays(listeningSecondsByDate),
    [listeningSecondsByDate]
  );

  const totalSecondsAllTime = useMemo(
    () => Object.values(listeningSecondsByDate).reduce((sum, sec) => sum + sec, 0),
    [listeningSecondsByDate]
  );

  const last7Days = useMemo(() => {
    const arr: Array<{key: string; label: string; minutes: number}> = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;
      const label = d.toLocaleDateString(
        lang === 'ar' ? 'ar-SA' : lang === 'bn' ? 'bn-BD' : 'en-US',
        {
          weekday: 'short',
        }
      );
      arr.push({
        key,
        label,
        minutes: Math.round((listeningSecondsByDate[key] || 0) / 60),
      });
    }
    return arr;
  }, [listeningSecondsByDate, lang]);

  const maxChartMin = Math.max(dailyGoalMinutes, ...last7Days.map((d) => d.minutes), 10);

  // SVG Ring math
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (goalPct / 100) * circumference;

  const handleToggleReminder = async (nextEnabled: boolean, nextTime = reminderTime) => {
    setReminder(nextEnabled, nextTime);
    const res = await scheduleDailyReminder(nextEnabled, nextTime, lang);
    setReminderStatus(res.message);
  };

  return (
    <div className="space-y-6 pb-8">
      <h2 className="text-lg font-bold text-ink dark:text-ink-dark">{t.stats.title}</h2>

      {/* Top 2 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Daily Goal Ring Card */}
        <div className="rounded-3xl glass-strong p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted dark:text-muted-dark">
              {t.stats.todayProgress}
            </p>
            <p className="text-2xl font-bold text-ink dark:text-ink-dark mt-1 tabular-nums">
              {todayMinutes} / {dailyGoalMinutes} {lang === 'ar' ? 'د' : lang === 'bn' ? 'মি.' : 'min'}
            </p>
            <p className="text-xs font-semibold text-brand-700 dark:text-accent mt-1 tabular-nums">
              {goalPct}% {lang === 'ar' ? 'من الهدف اليومي' : lang === 'bn' ? 'দৈনিক লক্ষ্যের' : 'of daily goal'}
            </p>
          </div>

          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 84 84" aria-hidden="true">
              <circle
                cx="42"
                cy="42"
                r={radius}
                strokeWidth="8"
                fill="none"
                className="stroke-brand-200 dark:stroke-white/12"
              />
              <circle
                cx="42"
                cy="42"
                r={radius}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                className="stroke-brand-600 dark:stroke-accent transition-all duration-500"
              />
            </svg>
            <span className="absolute text-xs font-bold tabular-nums">{goalPct}%</span>
          </div>
        </div>

        {/* Streak & Total Card */}
        <div className="rounded-3xl glass-strong p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted dark:text-muted-dark">
                {t.stats.streak}
              </p>
              <p className="text-2xl font-bold text-ink dark:text-ink-dark mt-1 tabular-nums">
                {streakDays} {t.stats.days}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-accent/20 text-accent-600 dark:text-accent flex items-center justify-center">
              <Flame className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-muted dark:text-muted-dark mt-3 tabular-nums">
            {t.stats.totalTime}: {formatMinutesLabel(totalSecondsAllTime, lang)}
          </p>
        </div>
      </div>

      {/* 7-Day Listening Chart */}
      <div className="rounded-3xl glass p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold">{t.stats.thisWeek}</h3>
          <span className="text-xs text-muted dark:text-muted-dark tabular-nums">
            {t.stats.dailyGoal}: {dailyGoalMinutes}m
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 items-end h-44 pt-4">
          {last7Days.map((day) => {
            const heightPct = Math.max(6, Math.round((day.minutes / maxChartMin) * 100));
            const metGoal = day.minutes >= dailyGoalMinutes;
            return (
              <div key={day.key} className="flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[11px] font-medium text-muted dark:text-muted-dark tabular-nums">
                  {day.minutes}m
                </span>
                <div className="w-full max-w-[34px] flex-1 flex items-end justify-center bg-brand-600/10 dark:bg-white/10 rounded-xl overflow-hidden">
                  <div
                    className={`w-full rounded-xl transition-all duration-300 ${
                      metGoal
                        ? 'bg-brand-600 dark:bg-accent'
                        : 'bg-brand-600/45 dark:bg-accent/45'
                    }`}
                    style={{height: `${heightPct}%`}}
                  />
                </div>
                <span className="text-[11px] text-muted dark:text-muted-dark">{day.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Goal Selector */}
      <div className="rounded-3xl glass p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <Target className="w-4 h-4 text-brand-600 dark:text-accent" />
          <h3 className="text-sm font-bold">{t.stats.goalMinutes}</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[10, 15, 20, 30, 45, 60].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDailyGoalMinutes(m)}
              className={`md-ripple min-h-[48px] rounded-2xl text-xs font-semibold tabular-nums transition-colors ${
                dailyGoalMinutes === m
                  ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                  : 'glass text-ink dark:text-ink-dark'
              }`}
            >
              {m} {lang === 'ar' ? 'د' : lang === 'bn' ? 'মি.' : 'min'}
            </button>
          ))}
        </div>
      </div>

      {/* Daily Local Notification Reminder */}
      <div className="rounded-3xl glass p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-600/14 dark:bg-white/10 text-brand-700 dark:text-accent flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{t.stats.reminderTitle}</h3>
              <p className="text-xs text-muted dark:text-muted-dark mt-0.5">
                {t.stats.reminderDesc}
              </p>
            </div>
          </div>

          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => handleToggleReminder(e.target.checked)}
            aria-label={t.stats.enableReminder}
            className="w-5 h-5 accent-brand-600 dark:accent-accent cursor-pointer mt-1"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-brand-500/12 dark:border-white/10">
          <label className="flex items-center gap-2 text-xs font-semibold">
            <span>{t.stats.reminderTime}</span>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => handleToggleReminder(reminderEnabled, e.target.value)}
              className="min-h-[44px] rounded-2xl glass px-3 text-xs tabular-nums"
            />
          </label>

          <button
            type="button"
            onClick={async () => {
              const ok = await sendTestNotification(lang);
              showToast(
                ok
                  ? lang === 'ar'
                    ? 'تم إرسال إشعار تجريبي'
                    : 'Test notification sent'
                  : lang === 'ar'
                  ? 'يرجى السماح بالإشعارات'
                  : 'Notification permission needed'
              );
            }}
            className="md-ripple px-4 min-h-[44px] rounded-2xl bg-brand-600/14 dark:bg-white/10 text-xs font-semibold text-brand-700 dark:text-accent"
          >
            {t.stats.testReminder}
          </button>
        </div>

        {reminderStatus && (
          <p className="text-xs font-medium text-brand-700 dark:text-accent">{reminderStatus}</p>
        )}
      </div>
    </div>
  );
};
