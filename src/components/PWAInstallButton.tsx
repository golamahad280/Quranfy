import {Download, Smartphone, X} from 'lucide-react';
import React, {useState} from 'react';
import {usePWAInstall} from '../hooks/usePWAInstall';
import {useQuranStore} from '../store/useQuranStore';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({compact = false}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const lang = useQuranStore((s) => s.settings.language);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`md-ripple inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 font-semibold whitespace-nowrap shrink-0 transition-colors hover:bg-brand-700 dark:hover:bg-accent-300 ${
          compact ? 'px-3.5 min-h-[42px] text-xs' : 'w-full px-4 min-h-[48px] text-sm'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>
          {lang === 'ar'
            ? 'تثبيت التطبيق'
            : lang === 'bn'
            ? 'অ্যাপ ইনস্টল'
            : 'Install App'}
        </span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`md-ripple inline-flex items-center justify-center gap-2 rounded-2xl glass text-brand-700 dark:text-accent font-semibold whitespace-nowrap shrink-0 ${
            compact ? 'px-3.5 min-h-[42px] text-xs' : 'w-full px-4 min-h-[48px] text-sm'
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>
            {lang === 'ar'
              ? 'إضافة للشاشة الرئيسية'
              : lang === 'bn'
              ? 'হোম স্ক্রিনে যোগ'
              : 'Add to Home Screen'}
          </span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-950/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl glass-strong p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-ink dark:text-ink-dark">
                  {lang === 'ar' ? 'تثبيت قرآنفاي على iPhone' : 'Install Quranfy on iPhone / iPad'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close"
                  className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="mt-4 space-y-2 text-sm text-muted dark:text-muted-dark leading-relaxed">
                <li>
                  {lang === 'ar'
                    ? '١. اضغط على زر المشاركة (Share) في شريط سفاري.'
                    : '1. Tap the Share button in the Safari toolbar.'}
                </li>
                <li>
                  {lang === 'ar'
                    ? '٢. مرّر للأسفل واختر "إضافة إلى الشاشة الرئيسية".'
                    : '2. Scroll down and tap "Add to Home Screen".'}
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="md-ripple mt-5 w-full min-h-[48px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-sm font-semibold"
              >
                {lang === 'ar' ? 'حسناً' : 'Done'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
