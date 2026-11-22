import {TextToSpeech} from '@capacitor-community/text-to-speech';
import {Capacitor} from '@capacitor/core';
import {AppLanguage, HadithCollectionSlug} from '../types/quran';
import {resolveHadithAudioUrl} from './hadithApi';

export type HadithSpeakLanguage = 'ar' | 'en' | 'bn';

const BCP47_MAP: Record<HadithSpeakLanguage, string[]> = {
  ar: ['ar-SA', 'ar-EG', 'ar'],
  en: ['en-US', 'en-GB', 'en'],
  bn: ['bn-BD', 'bn-IN', 'bn'],
};

class HadithTtsService {
  private activeToken = 0;
  private audioEl: HTMLAudioElement | null = null;
  private isPaused = false;
  private currentText = '';
  private currentLang: HadithSpeakLanguage = 'en';
  private currentRate = 1;
  private onCompleteCb: (() => void) | null = null;
  private onErrorCb: ((msg: string, missingVoice: boolean) => void) | null = null;

  async checkLanguageAvailability(lang: HadithSpeakLanguage): Promise<boolean> {
    const tags = BCP47_MAP[lang];
    if (Capacitor.isNativePlatform()) {
      try {
        for (const tag of tags) {
          const res = await TextToSpeech.isLanguageSupported({lang: tag});
          if (res.supported) return true;
        }
        return false;
      } catch {
        // Fallback optimistic true; speak() will surface real error if unsupported
        return true;
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return true; // Voices may load lazily
      const prefix = lang;
      return voices.some((v) => v.lang.toLowerCase().startsWith(prefix));
    }

    return false;
  }

  async openNativeTtsSettings(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await TextToSpeech.openInstall();
    } catch {
      // Ignore if unavailable
    }
  }

  async speak(params: {
    text: string;
    lang: HadithSpeakLanguage;
    rate: number;
    collectionSlug: HadithCollectionSlug;
    hadithNumber: number;
    onComplete?: () => void;
    onError?: (msg: string, missingVoice: boolean) => void;
  }): Promise<void> {
    await this.stop();

    const token = ++this.activeToken;
    this.isPaused = false;
    this.currentText = params.text.trim();
    this.currentLang = params.lang;
    this.currentRate = params.rate;
    this.onCompleteCb = params.onComplete || null;
    this.onErrorCb = params.onError || null;

    if (!this.currentText) {
      params.onError?.('No text available to read in this language.', false);
      return;
    }

    // Check optional pluggable human-recited MP3 resolver first
    try {
      const externalUrl = await resolveHadithAudioUrl(
        params.collectionSlug,
        params.hadithNumber,
        params.lang as AppLanguage
      );
      if (externalUrl && token === this.activeToken) {
        const audio = new Audio(externalUrl);
        audio.playbackRate = params.rate;
        this.audioEl = audio;
        audio.onended = () => {
          if (token === this.activeToken) this.onCompleteCb?.();
        };
        audio.onerror = () => {
          if (token === this.activeToken) {
            this.onErrorCb?.('Failed to stream external hadith audio.', false);
          }
        };
        await audio.play();
        return;
      }
    } catch {
      // Fall through to TTS
    }

    const available = await this.checkLanguageAvailability(params.lang);
    if (!available) {
      this.onErrorCb?.(
        `No ${params.lang.toUpperCase()} TTS voice found on this device.`,
        true
      );
      return;
    }

    if (Capacitor.isNativePlatform()) {
      await this.speakNative(token, this.currentText, params.lang, params.rate);
    } else {
      this.speakWeb(token, this.currentText, params.lang, params.rate);
    }
  }

  private async speakNative(
    token: number,
    text: string,
    lang: HadithSpeakLanguage,
    rate: number
  ): Promise<void> {
    // Pick best supported BCP47 tag
    let chosenTag = BCP47_MAP[lang][0];
    try {
      for (const candidate of BCP47_MAP[lang]) {
        const res = await TextToSpeech.isLanguageSupported({lang: candidate});
        if (res.supported) {
          chosenTag = candidate;
          break;
        }
      }
    } catch {
      // keep default
    }

    // Split long hadith into ~1500 char chunks cleanly at sentence boundaries for Android TTS stability
    const chunks = splitTextIntoChunks(text, 1500);
    try {
      for (const chunk of chunks) {
        if (token !== this.activeToken) return;
        await TextToSpeech.speak({
          text: chunk,
          lang: chosenTag,
          rate,
          pitch: 1.0,
          volume: 1.0,
          category: 'playback',
        });
      }
      if (token === this.activeToken && !this.isPaused) {
        this.onCompleteCb?.();
      }
    } catch {
      if (token === this.activeToken && !this.isPaused) {
        this.onErrorCb?.(
          `Unable to synthesize ${lang.toUpperCase()} voice on this device.`,
          true
        );
      }
    }
  }

  private speakWeb(
    token: number,
    text: string,
    lang: HadithSpeakLanguage,
    rate: number
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.onErrorCb?.('Text-to-speech is not supported in this browser.', true);
      return;
    }

    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const matchingVoice =
      voices.find((v) => v.lang.toLowerCase() === BCP47_MAP[lang][0].toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(lang));

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = matchingVoice?.lang || BCP47_MAP[lang][0];
    if (matchingVoice) utterance.voice = matchingVoice;
    utterance.rate = rate;

    utterance.onend = () => {
      if (token === this.activeToken && !this.isPaused) {
        this.onCompleteCb?.();
      }
    };
    utterance.onerror = (ev) => {
      if (token === this.activeToken && ev.error !== 'interrupted' && ev.error !== 'canceled') {
        this.onErrorCb?.(
          `Speech synthesis failed for ${lang.toUpperCase()}.`,
          true
        );
      }
    };

    synth.speak(utterance);
  }

  async pause(): Promise<void> {
    this.isPaused = true;
    if (this.audioEl && !this.audioEl.paused) {
      this.audioEl.pause();
      return;
    }
    if (Capacitor.isNativePlatform()) {
      this.activeToken++;
      try {
        await TextToSpeech.stop();
      } catch {
        // Ignore
      }
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  async resume(): Promise<void> {
    if (!this.isPaused) return;
    this.isPaused = false;
    if (this.audioEl) {
      await this.audioEl.play();
      return;
    }
    if (Capacitor.isNativePlatform()) {
      const token = ++this.activeToken;
      await this.speakNative(token, this.currentText, this.currentLang, this.currentRate);
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        const token = ++this.activeToken;
        this.speakWeb(token, this.currentText, this.currentLang, this.currentRate);
      }
    }
  }

  async stop(): Promise<void> {
    this.activeToken++;
    this.isPaused = false;
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = '';
      this.audioEl = null;
    }
    if (Capacitor.isNativePlatform()) {
      try {
        await TextToSpeech.stop();
      } catch {
        // Ignore
      }
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

function splitTextIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    if (cursor + maxLen >= text.length) {
      chunks.push(text.slice(cursor));
      break;
    }
    let splitAt = text.lastIndexOf('.', cursor + maxLen);
    if (splitAt <= cursor) splitAt = text.lastIndexOf(' ', cursor + maxLen);
    if (splitAt <= cursor) splitAt = cursor + maxLen;
    chunks.push(text.slice(cursor, splitAt + 1).trim());
    cursor = splitAt + 1;
  }
  return chunks.filter(Boolean);
}

export const hadithTts = new HadithTtsService();
