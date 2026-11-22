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
      const label = d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        weekday: 'short',
      });
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
      <h2 className="text-lg font-bold text-[#13201C] dark:text-[#ECF2EF]">{t.stats.title}</h2>

      {/* Top 2 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Daily Goal Ring Card */}
        <div className="rounded-3xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#546660] dark:text-[#96ABA3]">
              {t.stats.todayProgress}
            </p>
            <p className="text-2xl font-bold text-[#13201C] dark:text-[#ECF2EF] mt-1 tabular-nums">
              {todayMinutes} / {dailyGoalMinutes} {lang === 'ar' ? 'د' : 'min'}
            </p>
            <p className="text-xs text-[#0F5C4D] dark:text-[#4ECBA9] mt-1 tabular-nums">
              {goalPct}% {lang === 'ar' ? 'من الهدف اليومي' : 'of daily goal'}
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
                className="stroke-[#E5ECE8] dark:stroke-[#1E2F29]"
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
                className="stroke-[#0F5C4D] dark:stroke-[#4ECBA9] transition-all duration-500"
              />
            </svg>
            <span className="absolute text-xs font-bold tabular-nums">{goalPct}%</span>
          </div>
        </div>

        {/* Streak & Total Card */}
        <div className="rounded-3xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#546660] dark:text-[#96ABA3]">
                {t.stats.streak}
              </p>
              <p className="text-2xl font-bold text-[#13201C] dark:text-[#ECF2EF] mt-1 tabular-nums">
                {streakDays} {t.stats.days}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#C69749]/15 text-[#C69749] flex items-center justify-center">
              <Flame className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-[#546660] dark:text-[#96ABA3] mt-3 tabular-nums">
            {t.stats.totalTime}: {formatMinutesLabel(totalSecondsAllTime, lang)}
          </p>
        </div>
      </div>

      {/* 7-Day Listening Chart */}
      <div className="rounded-3xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold">{t.stats.thisWeek}</h3>
          <span className="text-xs text-[#546660] dark:text-[#96ABA3] tabular-nums">
            {t.stats.dailyGoal}: {dailyGoalMinutes}m
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 items-end h-44 pt-4">
          {last7Days.map((day) => {
            const heightPct = Math.max(6, Math.round((day.minutes / maxChartMin) * 100));
            const metGoal = day.minutes >= dailyGoalMinutes;
            return (
              <div key={day.key} className="flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[11px] font-medium text-[#546660] dark:text-[#96ABA3] tabular-nums">
                  {day.minutes}m
                </span>
                <div className="w-full max-w-[34px] flex-1 flex items-end justify-center bg-[#F3F6F4] dark:bg-[#192823] rounded-xl overflow-hidden">
                  <div
                    className={`w-full rounded-xl transition-all duration-300 ${
                      metGoal
                        ? 'bg-[#0F5C4D] dark:bg-[#4ECBA9]'
                        : 'bg-[#0F5C4D]/45 dark:bg-[#4ECBA9]/45'
                    }`}
                    style={{height: `${heightPct}%`}}
                  />
                </div>
                <span className="text-[11px] text-[#546660] dark:text-[#96ABA3]">{day.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Goal Selector */}
      <div className="rounded-3xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <Target className="w-4 h-4 text-[#0F5C4D] dark:text-[#4ECBA9]" />
          <h3 className="text-sm font-semibold">{t.stats.goalMinutes}</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[10, 15, 20, 30, 45, 60].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDailyGoalMinutes(m)}
              className={`min-h-[42px] rounded-2xl text-xs font-semibold tabular-nums transition-colors ${
                dailyGoalMinutes === m
                  ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                  : 'bg-[#F3F6F4] dark:bg-[#192823] text-[#13201C] dark:text-[#DCE6E2]'
              }`}
            >
              {m} {lang === 'ar' ? 'د' : 'min'}
            </button>
          ))}
        </div>
      </div>

      {/* Daily Local Notification Reminder */}
      <div className="rounded-3xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EDF3F0] dark:bg-[#1B2B25] text-[#0F5C4D] dark:text-[#4ECBA9] flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t.stats.reminderTitle}</h3>
              <p className="text-xs text-[#546660] dark:text-[#96ABA3] mt-0.5">
                {t.stats.reminderDesc}
              </p>
            </div>
          </div>

          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => handleToggleReminder(e.target.checked)}
            aria-label={t.stats.enableReminder}
            className="w-5 h-5 accent-[#0F5C4D] dark:accent-[#4ECBA9] cursor-pointer mt-1"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/6 dark:border-white/8">
          <label className="flex items-center gap-2 text-xs font-medium">
            <span>{t.stats.reminderTime}</span>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => handleToggleReminder(reminderEnabled, e.target.value)}
              className="min-h-[40px] rounded-xl bg-[#F3F6F4] dark:bg-[#192823] px-3 text-xs tabular-nums"
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
            className="md-ripple px-4 min-h-[40px] rounded-xl bg-[#EDF3F0] dark:bg-[#1B2B25] text-xs font-semibold text-[#0F5C4D] dark:text-[#4ECBA9]"
          >
            {t.stats.testReminder}
          </button>
        </div>

        {reminderStatus && (
          <p className="text-xs text-[#0F5C4D] dark:text-[#4ECBA9]">{reminderStatus}</p>
        )}
      </div>
    </div>
  );
};
