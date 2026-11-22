import {TextToSpeech} from '@capacitor-community/text-to-speech';
import {Capacitor} from '@capacitor/core';
import {AppLanguage, HadithCollectionSlug} from '../types/quran';
import {resolveHadithAudioUrl} from './hadithApi';

export type HadithSpeakLanguage = 'en';

const EN_TAGS = ['en-US', 'en-GB', 'en'];

class HadithTtsService {
  private activeToken = 0;
  private audioEl: HTMLAudioElement | null = null;
  private isPaused = false;
  private currentText = '';
  private currentRate = 1;
  private onCompleteCb: (() => void) | null = null;
  private onErrorCb: ((msg: string, missingVoice: boolean) => void) | null = null;

  async checkEnglishAvailability(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        for (const tag of EN_TAGS) {
          const res = await TextToSpeech.isLanguageSupported({lang: tag});
          if (res.supported) return true;
        }
        return false;
      } catch {
        return true;
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return true;
      return voices.some((v) => v.lang.toLowerCase().startsWith('en'));
    }

    return false;
  }

  async speak(params: {
    text: string;
    lang: AppLanguage;
    rate: number;
    collectionSlug: HadithCollectionSlug;
    hadithNumber: number;
    allowExperimentalDeviceTts: boolean;
    onComplete?: () => void;
    onError?: (msg: string, missingVoice: boolean) => void;
  }): Promise<void> {
    await this.stop();

    const token = ++this.activeToken;
    this.isPaused = false;
    this.currentText = params.text.trim();
    this.currentRate = params.rate;
    this.onCompleteCb = params.onComplete || null;
    this.onErrorCb = params.onError || null;

    // 1. Pluggable hook for future licensed human audio (works for any language once registered)
    try {
      const externalUrl = await resolveHadithAudioUrl(
        params.collectionSlug,
        params.hadithNumber,
        params.lang
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
            this.onErrorCb?.('Failed to stream licensed hadith audio.', false);
          }
        };
        await audio.play();
        return;
      }
    } catch {
      // No external audio URL available
    }

    // 2. Device TTS is strictly English-only and gated behind the experimental Settings toggle
    if (params.lang !== 'en') {
      params.onError?.('Device voice is disabled for Arabic and Bangla.', false);
      return;
    }

    if (!params.allowExperimentalDeviceTts) {
      params.onError?.(
        'Enable "Experimental: device voice for English hadith" in Settings to use device TTS.',
        false
      );
      return;
    }

    if (!this.currentText) {
      params.onError?.('No English text available for this hadith.', false);
      return;
    }

    const available = await this.checkEnglishAvailability();
    if (!available) {
      this.onErrorCb?.('No English TTS voice found on this device.', true);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      await this.speakNativeEnglish(token, this.currentText, params.rate);
    } else {
      this.speakWebEnglish(token, this.currentText, params.rate);
    }
  }

  private async speakNativeEnglish(token: number, text: string, rate: number): Promise<void> {
    let chosenTag = EN_TAGS[0];
    try {
      for (const candidate of EN_TAGS) {
        const res = await TextToSpeech.isLanguageSupported({lang: candidate});
        if (res.supported) {
          chosenTag = candidate;
          break;
        }
      }
    } catch {
      // keep default
    }

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
        this.onErrorCb?.('Unable to synthesize English device voice.', true);
      }
    }
  }

  private speakWebEnglish(token: number, text: string, rate: number): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.onErrorCb?.('Text-to-speech is not supported in this browser.', true);
      return;
    }

    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const matchingVoice =
      voices.find((v) => v.lang.toLowerCase() === 'en-us') ||
      voices.find((v) => v.lang.toLowerCase().startsWith('en'));

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = matchingVoice?.lang || 'en-US';
    if (matchingVoice) utterance.voice = matchingVoice;
    utterance.rate = rate;

    utterance.onend = () => {
      if (token === this.activeToken && !this.isPaused) {
        this.onCompleteCb?.();
      }
    };
    utterance.onerror = (ev) => {
      if (token === this.activeToken && ev.error !== 'interrupted' && ev.error !== 'canceled') {
        this.onErrorCb?.('English device voice synthesis failed.', true);
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
      await this.speakNativeEnglish(token, this.currentText, this.currentRate);
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        const token = ++this.activeToken;
        this.speakWebEnglish(token, this.currentText, this.currentRate);
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
