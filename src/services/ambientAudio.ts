import {AmbientSoundType} from '../types/quran';

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeOscillators: OscillatorNode[] = [];
  private currentSound: AmbientSoundType | null = null;
  private volume = 0.35;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, type: 'white' | 'pink' | 'brown'): AudioBuffer {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const output = buffer.getChannelData(channel);
      if (type === 'white') {
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.35;
        }
      } else if (type === 'pink') {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.07;
          b6 = white * 0.115926;
        }
      } else {
        // Brown noise
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 1.8;
        }
      }
    }
    return buffer;
  }

  public start(sound: AmbientSoundType, volume: number): void {
    this.volume = volume;
    if (this.currentSound === sound && this.activeNodes.length > 0) {
      this.setVolume(volume);
      return;
    }

    this.stopImmediate();
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    this.currentSound = sound;
    const now = ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0.001, now);
    this.masterGain.gain.linearRampToValueAtTime(Math.max(0.001, volume), now + 0.6);

    const source = ctx.createBufferSource();
    source.loop = true;

    if (sound === 'rain') {
      source.buffer = this.createNoiseBuffer(ctx, 'pink');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 220;

      source.connect(hp);
      hp.connect(lp);
      lp.connect(this.masterGain);
      source.start();
      this.activeNodes.push(source, hp, lp);
    } else if (sound === 'ocean') {
      source.buffer = this.createNoiseBuffer(ctx, 'brown');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 520;

      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.65;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.11; // ~9s ocean wave cycle

      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 0.35;

      const freqDepth = ctx.createGain();
      freqDepth.gain.value = 260;

      lfo.connect(lfoDepth);
      lfoDepth.connect(waveGain.gain);
      lfo.connect(freqDepth);
      freqDepth.connect(lp.frequency);

      source.connect(lp);
      lp.connect(waveGain);
      waveGain.connect(this.masterGain);
      source.start();
      lfo.start();
      this.activeNodes.push(source, lp, waveGain, lfoDepth, freqDepth);
      this.activeOscillators.push(lfo);
    } else if (sound === 'wind') {
      source.buffer = this.createNoiseBuffer(ctx, 'pink');
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 420;
      bp.Q.value = 1.4;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.08;

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 190;
      lfo.connect(lfoGain);
      lfoGain.connect(bp.frequency);

      source.connect(bp);
      bp.connect(this.masterGain);
      source.start();
      lfo.start();
      this.activeNodes.push(source, bp, lfoGain);
      this.activeOscillators.push(lfo);
    } else if (sound === 'forest') {
      source.buffer = this.createNoiseBuffer(ctx, 'pink');
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 950;
      bp.Q.value = 0.7;

      const rustleGain = ctx.createGain();
      rustleGain.gain.value = 0.5;

      const lfo = ctx.createOscillator();
      lfo.type = 'triangle';
      lfo.frequency.value = 0.17;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 0.25;
      lfo.connect(lfoDepth);
      lfoDepth.connect(rustleGain.gain);

      source.connect(bp);
      bp.connect(rustleGain);
      rustleGain.connect(this.masterGain);
      source.start();
      lfo.start();
      this.activeNodes.push(source, bp, rustleGain, lfoDepth);
      this.activeOscillators.push(lfo);
    } else if (sound === 'night') {
      source.buffer = this.createNoiseBuffer(ctx, 'brown');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 280;

      // Subtle warm nocturnal shimmer
      const shimmer = ctx.createOscillator();
      shimmer.type = 'sine';
      shimmer.frequency.value = 196;
      const shimmerGain = ctx.createGain();
      shimmerGain.gain.value = 0.015;

      source.connect(lp);
      lp.connect(this.masterGain);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(this.masterGain);

      source.start();
      shimmer.start();
      this.activeNodes.push(source, lp, shimmerGain);
      this.activeOscillators.push(shimmer);
    } else {
      // Softened white noise
      source.buffer = this.createNoiseBuffer(ctx, 'white');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3400;

      source.connect(lp);
      lp.connect(this.masterGain);
      source.start();
      this.activeNodes.push(source, lp);
    }
  }

  public setVolume(volume: number): void {
    this.volume = volume;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(Math.max(0.0001, volume), now, 0.08);
    }
  }

  public fadeOutAndStop(durationSeconds = 4): void {
    if (!this.ctx || !this.masterGain || !this.currentSound) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSeconds);
    setTimeout(() => {
      this.stopImmediate();
    }, durationSeconds * 1000 + 80);
  }

  public stop(): void {
    if (!this.ctx || !this.masterGain || !this.currentSound) {
      this.stopImmediate();
      return;
    }
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.25);
    setTimeout(() => {
      this.stopImmediate();
    }, 280);
  }

  private stopImmediate(): void {
    for (const node of this.activeNodes) {
      try {
        if ('stop' in node && typeof (node as AudioBufferSourceNode).stop === 'function') {
          (node as AudioBufferSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore
      }
    }
    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignore
      }
    }
    this.activeNodes = [];
    this.activeOscillators = [];
    this.currentSound = null;
  }
}

export const ambientEngine = new AmbientSoundEngine();
