import {AmbientMixState, AmbientPresetId, AmbientSoundType} from '../types/quran';

export const AMBIENT_SOUNDS: AmbientSoundType[] = [
  'soft-rain',
  'heavy-rain',
  'forest-birds',
  'ocean-waves',
  'gentle-stream',
  'night-crickets',
  'soft-wind',
  'fireplace',
  'brown-noise',
];

export const DEFAULT_CHANNEL_VOLUMES: Record<AmbientSoundType, number> = {
  'soft-rain': 0.55,
  'heavy-rain': 0.5,
  'forest-birds': 0.5,
  'ocean-waves': 0.52,
  'gentle-stream': 0.55,
  'night-crickets': 0.48,
  'soft-wind': 0.45,
  fireplace: 0.58,
  'brown-noise': 0.42,
};

export const AMBIENT_PRESETS: Record<
  AmbientPresetId,
  Array<{id: AmbientSoundType; volume: number}>
> = {
  'deep-sleep': [
    {id: 'soft-rain', volume: 0.62},
    {id: 'soft-wind', volume: 0.36},
  ],
  focus: [
    {id: 'gentle-stream', volume: 0.58},
    {id: 'forest-birds', volume: 0.44},
  ],
  'calm-night': [
    {id: 'night-crickets', volume: 0.55},
    {id: 'soft-wind', volume: 0.38},
  ],
  cozy: [
    {id: 'fireplace', volume: 0.64},
    {id: 'soft-rain', volume: 0.46},
  ],
};

interface ActiveChannelNodes {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private softeningFilter: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  private bufferCache = new Map<AmbientSoundType, AudioBuffer>();
  private pendingFetches = new Map<AmbientSoundType, Promise<AudioBuffer>>();
  private activeChannels = new Map<AmbientSoundType, ActiveChannelNodes>();
  private loadingSounds = new Set<AmbientSoundType>();
  private listeners = new Set<() => void>();
  private syncToken = 0;
  private isFadingOutAll = false;
  private recitationActive = false;
  private currentMasterVolume = 0.65;

  private notifyListeners(): void {
    for (const cb of this.listeners) {
      cb();
    }
  }

  public subscribeLoading(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public getLoadingSounds(): AmbientSoundType[] {
    return Array.from(this.loadingSounds);
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Voice protection: gentle low-pass softening filter + capped master ducking gain
      this.softeningFilter = this.ctx.createBiquadFilter();
      this.softeningFilter.type = 'lowpass';
      this.softeningFilter.frequency.value = 2600;
      this.softeningFilter.Q.value = 0.5;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.computeEffectiveMasterGain(this.currentMasterVolume);

      this.softeningFilter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Cap ambient strictly below Quran recitation voice; duck gently further when speech is playing
  private computeEffectiveMasterGain(masterVolume: number): number {
    const clamped = Math.max(0, Math.min(1, masterVolume));
    const speechCeiling = this.recitationActive ? 0.36 : 0.48;
    return clamped * speechCeiling;
  }

  public setRecitationActive(active: boolean): void {
    this.recitationActive = active;
    if (!this.ctx || !this.masterGain || this.isFadingOutAll) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(
      Math.max(0.0001, this.computeEffectiveMasterGain(this.currentMasterVolume)),
      now,
      0.25
    );
  }

  // Trim MP3 encoder leading/trailing near-silent padding and apply a tiny 15ms seam crossfade
  private prepareSeamlessBuffer(ctx: AudioContext, raw: AudioBuffer): AudioBuffer {
    const threshold = 0.0008;
    const channels = raw.numberOfChannels;
    const len = raw.length;
    let startIdx = 0;
    let endIdx = len - 1;

    const ch0 = raw.getChannelData(0);
    while (startIdx < len - 1 && Math.abs(ch0[startIdx]) < threshold) {
      startIdx++;
    }
    while (endIdx > startIdx + 2048 && Math.abs(ch0[endIdx]) < threshold) {
      endIdx--;
    }

    // Add tiny safety margin inside non-silent region if trimmed
    const trimmedLen = Math.max(2048, endIdx - startIdx + 1);
    const out = ctx.createBuffer(channels, trimmedLen, raw.sampleRate);
    const seamSamples = Math.min(Math.floor(raw.sampleRate * 0.018), Math.floor(trimmedLen / 8));

    for (let c = 0; c < channels; c++) {
      const src = raw.getChannelData(c);
      const dst = out.getChannelData(c);
      for (let i = 0; i < trimmedLen; i++) {
        dst[i] = src[startIdx + i];
      }
      // Smooth 18ms loop boundary blend
      for (let i = 0; i < seamSamples; i++) {
        const t = i / seamSamples;
        const head = dst[i];
        const tail = dst[trimmedLen - seamSamples + i];
        dst[trimmedLen - seamSamples + i] = tail * (1 - t) + head * t;
      }
    }
    return out;
  }

  private async loadBuffer(id: AmbientSoundType): Promise<AudioBuffer> {
    const cached = this.bufferCache.get(id);
    if (cached) return cached;

    const existing = this.pendingFetches.get(id);
    if (existing) return existing;

    const ctx = this.ensureContext();
    this.loadingSounds.add(id);
    this.notifyListeners();

    const promise = (async () => {
      try {
        const res = await fetch(`./sounds/${id}.mp3`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const arr = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arr);
        const seamless = this.prepareSeamlessBuffer(ctx, decoded);
        this.bufferCache.set(id, seamless);
        return seamless;
      } finally {
        this.loadingSounds.delete(id);
        this.pendingFetches.delete(id);
        this.notifyListeners();
      }
    })();

    this.pendingFetches.set(id, promise);
    return promise;
  }

  public async syncMix(mix: AmbientMixState): Promise<void> {
    const token = ++this.syncToken;
    this.isFadingOutAll = false;
    this.currentMasterVolume = mix.masterVolume;

    const enabledIds = AMBIENT_SOUNDS.filter((id) => mix.channels[id]?.enabled);

    // Stop any channels that were turned off
    for (const [id, nodes] of this.activeChannels.entries()) {
      if (!mix.channels[id]?.enabled) {
        this.stopChannelSmooth(id, nodes);
      }
    }

    if (enabledIds.length === 0) {
      return;
    }

    const ctx = this.ensureContext();
    if (this.masterGain) {
      const now = ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(
        Math.max(0.0001, this.computeEffectiveMasterGain(mix.masterVolume)),
        now,
        0.12
      );
    }

    // Update volumes for already running channels, lazy-load & fade in newly enabled ones
    await Promise.all(
      enabledIds.map(async (id) => {
        const targetVol = Math.max(0.01, Math.min(1, mix.channels[id]?.volume ?? 0.5));
        const running = this.activeChannels.get(id);
        if (running) {
          const now = ctx.currentTime;
          running.gain.gain.cancelScheduledValues(now);
          running.gain.gain.setTargetAtTime(targetVol, now, 0.08);
          return;
        }

        try {
          const buffer = await this.loadBuffer(id);
          if (token !== this.syncToken || this.isFadingOutAll) return;
          if (!this.softeningFilter) return;

          // Double-check channel didn't get disabled while fetching
          if (this.activeChannels.has(id)) return;

          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;

          const gain = ctx.createGain();
          const now = ctx.currentTime;
          gain.gain.setValueAtTime(0.0001, now);
          // 1.5s gentle fade-in
          gain.gain.linearRampToValueAtTime(targetVol, now + 1.5);

          source.connect(gain);
          gain.connect(this.softeningFilter);
          source.start();

          this.activeChannels.set(id, {source, gain});
        } catch {
          // Ignore individual load errors (UI already surfaces loading state cleanly)
        }
      })
    );
  }

  private stopChannelSmooth(id: AmbientSoundType, nodes: ActiveChannelNodes): void {
    this.activeChannels.delete(id);
    if (!this.ctx) {
      try {
        nodes.source.stop();
        nodes.source.disconnect();
        nodes.gain.disconnect();
      } catch {
        // Ignore
      }
      return;
    }

    const now = this.ctx.currentTime;
    try {
      nodes.gain.gain.cancelScheduledValues(now);
      nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, now);
      nodes.gain.gain.linearRampToValueAtTime(0.0001, now + 0.35);
      window.setTimeout(() => {
        try {
          nodes.source.stop();
          nodes.source.disconnect();
          nodes.gain.disconnect();
        } catch {
          // Ignore
        }
      }, 380);
    } catch {
      // Ignore
    }
  }

  public setMasterVolume(volume: number): void {
    this.currentMasterVolume = volume;
    if (!this.ctx || !this.masterGain || this.isFadingOutAll) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(
      Math.max(0.0001, this.computeEffectiveMasterGain(volume)),
      now,
      0.08
    );
  }

  public setChannelVolume(id: AmbientSoundType, volume: number): void {
    const running = this.activeChannels.get(id);
    if (!running || !this.ctx || this.isFadingOutAll) return;
    const now = this.ctx.currentTime;
    running.gain.gain.cancelScheduledValues(now);
    running.gain.gain.setTargetAtTime(Math.max(0.0001, volume), now, 0.08);
  }

  public fadeOutAndStop(durationSeconds = 4): void {
    if (!this.ctx || !this.masterGain || this.activeChannels.size === 0) return;
    this.isFadingOutAll = true;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSeconds);

    window.setTimeout(() => {
      this.stopImmediate();
    }, durationSeconds * 1000 + 80);
  }

  public stop(): void {
    if (!this.ctx || !this.masterGain || this.activeChannels.size === 0) {
      this.stopImmediate();
      return;
    }
    this.isFadingOutAll = true;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.35);
    window.setTimeout(() => {
      this.stopImmediate();
    }, 380);
  }

  private stopImmediate(): void {
    this.syncToken++;
    for (const nodes of this.activeChannels.values()) {
      try {
        nodes.source.stop();
        nodes.source.disconnect();
        nodes.gain.disconnect();
      } catch {
        // Ignore
      }
    }
    this.activeChannels.clear();
    this.isFadingOutAll = false;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(
        this.computeEffectiveMasterGain(this.currentMasterVolume),
        now
      );
    }
  }
}

export const ambientEngine = new AmbientSoundEngine();
