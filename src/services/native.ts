import {App} from '@capacitor/app';
import {Capacitor} from '@capacitor/core';
import {StatusBar, Style} from '@capacitor/status-bar';
import {useQuranStore} from '../store/useQuranStore';

let nativeInitialized = false;
let hadithBackHandler: (() => boolean) | null = null;

/**
 * Allows HadithScreen to intercept Android hardware back button presses
 * when navigating inside Reading mode / Hadith detail / sections before returning to Home.
 */
export function registerHadithBackHandler(fn: (() => boolean) | null): void {
  hadithBackHandler = fn;
}

export async function syncNativeStatusBar(isDark: boolean, isSleep: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setStyle({style: isDark ? Style.Dark : Style.Light});
    if (Capacitor.getPlatform() === 'android') {
      const color = isSleep ? '#070514' : isDark ? '#0E0B1F' : '#F5F4FF';
      await StatusBar.setBackgroundColor({color});
    }
  } catch {
    // Ignore on platforms where StatusBar customization is unsupported
  }
}

export function initNativeAndroid(): void {
  if (!Capacitor.isNativePlatform() || nativeInitialized) return;
  nativeInitialized = true;

  const state = useQuranStore.getState();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark =
    state.focusMode === 'sleep' ||
    state.settings.theme === 'dark' ||
    (state.settings.theme === 'auto' && prefersDark);
  void syncNativeStatusBar(isDark, state.focusMode === 'sleep');

  void App.addListener('backButton', async () => {
    const store = useQuranStore.getState();

    if (store.shareImagePayload) {
      store.closeShareImageModal();
      return;
    }

    if (store.tafsirTarget) {
      store.closeTafsirSheet();
      return;
    }

    if (store.isFullPlayerOpen) {
      store.setFullPlayerOpen(false);
      return;
    }

    if (store.isAmbientSheetOpen) {
      store.setAmbientSheetOpen(false);
      return;
    }

    if (store.isSearchOpen) {
      store.setSearchOpen(false);
      return;
    }

    if (store.readerSurahNumber !== null) {
      store.closeReader();
      return;
    }

    if (store.activeTab === 'hadith' && hadithBackHandler && hadithBackHandler()) {
      return;
    }

    if (store.activeTab === 'more' && store.moreSection !== null) {
      store.setMoreSection(null);
      return;
    }

    if (store.activeTab !== 'home') {
      store.setActiveTab('home');
      return;
    }

    try {
      await App.minimizeApp();
    } catch {
      // Ignore if minimizeApp is unavailable
    }
  });
}
