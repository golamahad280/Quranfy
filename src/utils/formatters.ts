import {AppLanguage} from '../types/quran';

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export function formatMinutesLabel(seconds: number, lang: AppLanguage): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) {
    if (lang === 'ar') return `${mins} د`;
    if (lang === 'bn') return `${mins} মি.`;
    return `${mins}m`;
  }
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (lang === 'ar') {
    return rem > 0 ? `${hrs} س ${rem} د` : `${hrs} س`;
  }
  if (lang === 'bn') {
    return rem > 0 ? `${hrs} ঘ. ${rem} মি.` : `${hrs} ঘ.`;
  }
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}
