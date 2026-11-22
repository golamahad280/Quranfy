import {BookOpenCheck, Calendar, RotateCcw} from 'lucide-react';
import React, {useState} from 'react';
import {pickLang} from '../data/i18n';
import {TOTAL_QURAN_PAGES} from '../data/quranMeta';
import {useQuranStore} from '../store/useQuranStore';

export const KhatamScreen: React.FC = () => {
  const lang = useQuranStore((s) => s.settings.language);
  const khatamState = useQuranStore((s) => s.khatamState);
  const setKhatamGoal = useQuranStore((s) => s.setKhatamGoal);
  const logKhatamPages = useQuranStore((s) => s.logKhatamPages);
  const setKhatamPagesCompleted = useQuranStore((s) => s.setKhatamPagesCompleted);
  const resetKhatam = useQuranStore((s) => s.resetKhatam);

  const [manualPage, setManualPage] = useState(String(khatamState.pagesCompleted));

  const pct = Math.min(100, Math.round((khatamState.pagesCompleted / TOTAL_QURAN_PAGES) * 100));
  const remainingPages = Math.max(0, TOTAL_QURAN_PAGES - khatamState.pagesCompleted);
  const daysRemaining = Math.ceil(remainingPages / Math.max(1, khatamState.dailyPagesGoal));

  const estimatedCompletionDate = new Date();
  estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + daysRemaining);
  const formattedEstDate = estimatedCompletionDate.toLocaleDateString(
    lang === 'ar' ? 'ar-SA' : lang === 'bn' ? 'bn-BD' : 'en-US',
    {year: 'numeric', month: 'short', day: 'numeric'}
  );

  // SVG Ring math
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="space-y-6 pb-8 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink dark:text-ink-dark">
            {pickLang(lang, 'Khatam Tracker', 'متابعة الختمة', 'খতম ট্র্যাকার')}
          </h2>
          <p className="text-xs text-muted dark:text-muted-dark">
            {pickLang(
              lang,
              'Track your 604-page Mushaf completion with a daily goal',
              'تابع إنجاز ختمة المصحف (٦٠٤ صفحة) وفق هدفك اليومي',
              'দৈনিক লক্ষ্য অনুযায়ী ৬০৪ পৃষ্ঠার কুরআন খতম ট্র্যাক করুন'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetKhatam();
            setManualPage('0');
          }}
          className="md-ripple inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-2xl glass text-xs font-semibold"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{pickLang(lang, 'Reset Khatam', 'ختمة جديدة', 'নতুন খতম শুরু')}</span>
        </button>
      </div>

      {/* Ring Summary Card */}
      <section className="rounded-3xl glass-strong p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
          <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128" aria-hidden="true">
            <circle
              cx="64"
              cy="64"
              r={radius}
              strokeWidth="10"
              fill="none"
              className="stroke-brand-200 dark:stroke-white/12"
            />
            <circle
              cx="64"
              cy="64"
              r={radius}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              className="stroke-brand-600 dark:stroke-accent transition-all duration-500"
            />
          </svg>
          <div className="absolute text-center">
            <p className="text-2xl font-bold tabular-nums text-ink dark:text-ink-dark">{pct}%</p>
            <p className="text-[11px] text-muted dark:text-muted-dark tabular-nums">
              {khatamState.pagesCompleted}/{TOTAL_QURAN_PAGES}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-3 text-center sm:text-start">
          <div>
            <p className="text-xs font-medium text-muted dark:text-muted-dark">
              {pickLang(lang, 'Remaining Pages', 'الصفحات المتبقية', 'বাকি পৃষ্ঠা')}
            </p>
            <p className="text-2xl font-bold tabular-nums text-ink dark:text-ink-dark">
              {remainingPages}{' '}
              <span className="text-sm font-medium text-muted dark:text-muted-dark">
                {pickLang(lang, 'pages', 'صفحة', 'পৃষ্ঠা')}
              </span>
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-brand-600/10 dark:bg-accent/14 text-xs font-semibold text-brand-700 dark:text-accent">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>
              {remainingPages === 0
                ? pickLang(lang, 'Khatam Completed! Alhamdulillah', 'تمت الختمة بحمد الله', 'আলহামদুলিল্লাহ, খতম সম্পন্ন!')
                : pickLang(
                    lang,
                    `Est. completion: ${formattedEstDate} (${daysRemaining} days)`,
                    `تاريخ الختم المتوقع: ${formattedEstDate} (${daysRemaining} يوماً)`,
                    `সম্ভাব্য সমাপ্তি: ${formattedEstDate} (${daysRemaining} দিন)`
                  )}
            </span>
          </div>
        </div>
      </section>

      {/* Quick Logger */}
      <section className="rounded-3xl glass p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="w-4 h-4 text-brand-600 dark:text-accent" />
          <h3 className="text-sm font-bold text-ink dark:text-ink-dark">
            {pickLang(lang, 'Log Pages Read', 'تسجيل الصفحات المقروءة', 'পড়া পৃষ্ঠা যোগ করুন')}
          </h3>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[1, 5, 10, 20].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => {
                logKhatamPages(delta);
                setManualPage(String(Math.min(604, khatamState.pagesCompleted + delta)));
              }}
              className="md-ripple min-h-[48px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-bold tabular-nums shadow-sm"
            >
              +{delta}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const val = Math.max(0, Math.min(604, Number(manualPage) || 0));
            setKhatamPagesCompleted(val);
            setManualPage(String(val));
          }}
          className="flex items-center gap-2 pt-1"
        >
          <input
            type="number"
            min={0}
            max={604}
            value={manualPage}
            onChange={(e) => setManualPage(e.target.value)}
            aria-label="Set current page"
            className="flex-1 min-h-[48px] rounded-2xl glass px-4 text-sm font-semibold tabular-nums"
          />
          <button
            type="submit"
            className="md-ripple px-5 min-h-[48px] rounded-2xl glass text-xs font-semibold text-brand-700 dark:text-accent"
          >
            {pickLang(lang, 'Set Page', 'تعيين الصفحة', 'পৃষ্ঠা সেট করুন')}
          </button>
        </form>
      </section>

      {/* Daily Goal Setting */}
      <section className="rounded-3xl glass p-5 space-y-3">
        <div className="flex justify-between text-xs font-semibold">
          <span>{pickLang(lang, 'Daily Goal (pages / day)', 'الهدف اليومي (صفحة / يوم)', 'দৈনিক লক্ষ্য (পৃষ্ঠা / দিন)')}</span>
          <span className="tabular-nums text-brand-700 dark:text-accent">
            {khatamState.dailyPagesGoal}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            {pages: 4, label: '4 / day (5 mo)'},
            {pages: 10, label: '10 / day (2 mo)'},
            {pages: 20, label: '20 / day (30 d)'},
            {pages: 40, label: '40 / day (15 d)'},
          ].map((preset) => (
            <button
              key={preset.pages}
              type="button"
              onClick={() => setKhatamGoal(preset.pages)}
              className={`md-ripple min-h-[44px] px-2 rounded-2xl text-[11px] font-semibold ${
                khatamState.dailyPagesGoal === preset.pages
                  ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950'
                  : 'glass'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
export default KhatamScreen;
