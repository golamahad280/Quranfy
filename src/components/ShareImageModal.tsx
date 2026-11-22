import {Download, Loader2, Share2, X} from 'lucide-react';
import React, {useEffect, useState} from 'react';
import {pickLang} from '../data/i18n';
import {renderAyahShareCard} from '../services/shareImage';
import {useQuranStore} from '../store/useQuranStore';

export const ShareImageModal: React.FC = () => {
  const payload = useQuranStore((s) => s.shareImagePayload);
  const closeShareImageModal = useQuranStore((s) => s.closeShareImageModal);
  const showToast = useQuranStore((s) => s.showToast);
  const lang = useQuranStore((s) => s.settings.language);

  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pngBlob, setPngBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!payload) {
      setPreviewUrl(null);
      setPngBlob(null);
      return;
    }

    let active = true;
    setGenerating(true);
    renderAyahShareCard(payload)
      .then(({blob, dataUrl}) => {
        if (!active) return;
        setPngBlob(blob);
        setPreviewUrl(dataUrl);
        setGenerating(false);
      })
      .catch(() => {
        if (!active) return;
        setGenerating(false);
        showToast(pickLang(lang, 'Could not generate image card', 'تعذر إنشاء البطاقة', 'ছবি তৈরি করা যায়নি'));
      });

    return () => {
      active = false;
    };
  }, [payload, lang, showToast]);

  if (!payload) return null;

  const fileName = `quranfy-${payload.surahNumber}-${payload.ayahNumber}.png`;

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = fileName;
    a.click();
    showToast(pickLang(lang, 'Image saved', 'تم حفظ الصورة', 'ছবি ডাউনলোড হয়েছে'));
  };

  const handleNativeShare = async () => {
    if (!pngBlob) return;
    const file = new File([pngBlob], fileName, {type: 'image/png'});
    if (navigator.canShare && navigator.canShare({files: [file]})) {
      try {
        await navigator.share({
          title: `${payload.surahNameEn} ${payload.surahNumber}:${payload.ayahNumber}`,
          files: [file],
        });
        return;
      } catch {
        // Fall through to download
      }
    }
    handleDownload();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-950/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share Ayah as Image"
      onClick={closeShareImageModal}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl glass-strong p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-ink dark:text-ink-dark">
            {pickLang(lang, 'Share as Image', 'مشاركة كصورة', 'ছবি হিসেবে শেয়ার করুন')}
          </h3>
          <button
            type="button"
            onClick={closeShareImageModal}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex items-center justify-center py-2">
          {generating ? (
            <div className="py-16 flex flex-col items-center gap-3 text-muted dark:text-muted-dark">
              <Loader2 className="w-7 h-7 animate-spin text-brand-600 dark:text-accent" />
              <span className="text-xs font-medium">
                {pickLang(lang, 'Rendering ayah card...', 'جاري تجهيز البطاقة...', 'কার্ড তৈরি হচ্ছে...')}
              </span>
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt={`${payload.surahNameEn} ${payload.surahNumber}:${payload.ayahNumber}`}
              className="w-full rounded-2xl shadow-xl border border-white/15"
            />
          ) : null}
        </div>

        <div className="pt-4 flex items-center gap-2.5 pb-safe">
          <button
            type="button"
            disabled={!previewUrl}
            onClick={handleDownload}
            className="md-ripple flex-1 min-h-[48px] rounded-2xl glass text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span>{pickLang(lang, 'Download PNG', 'حفظ PNG', 'PNG ডাউনলোড')}</span>
          </button>

          <button
            type="button"
            disabled={!pngBlob}
            onClick={handleNativeShare}
            className="md-ripple flex-1 min-h-[48px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Share2 className="w-4 h-4" />
            <span>{pickLang(lang, 'Share Image', 'مشاركة الصورة', 'ছবি শেয়ার')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default ShareImageModal;
