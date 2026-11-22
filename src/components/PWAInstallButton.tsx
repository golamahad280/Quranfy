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
        className={`md-ripple inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] font-medium whitespace-nowrap shrink-0 transition-colors hover:bg-[#0C4C3F] dark:hover:bg-[#65D8B9] ${
          compact ? 'px-3 min-h-[44px] text-xs' : 'w-full px-4 min-h-[48px] text-sm'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`md-ripple inline-flex items-center justify-center gap-2 rounded-2xl border border-[#0F5C4D]/25 text-[#0F5C4D] dark:border-[#4ECBA9]/30 dark:text-[#4ECBA9] font-medium whitespace-nowrap shrink-0 ${
            compact ? 'px-3 min-h-[44px] text-xs' : 'w-full px-4 min-h-[48px] text-sm'
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>{lang === 'ar' ? 'إضافة للشاشة الرئيسية' : 'Add to Home Screen'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#131F1C] p-6 shadow-2xl border border-black/5 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#13201C] dark:text-[#ECF2EF]">
                  {lang === 'ar' ? 'تثبيت قرآنفاي على iPhone' : 'Install Quranfy on iPhone / iPad'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="mt-4 space-y-2 text-sm text-[#43544E] dark:text-[#A4B7B0] leading-relaxed">
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
                className="mt-5 w-full min-h-[44px] rounded-2xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] text-sm font-medium"
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
