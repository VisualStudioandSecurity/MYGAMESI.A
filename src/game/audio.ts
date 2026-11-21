import type { AudioCue, GamePhase } from './types';

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicActive = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopMusic();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public syncMusic(phase: GamePhase): void {
    const shouldPlay = phase === 'playing' && !this.muted;
    if (shouldPlay && !this.musicActive) {
      this.startMusic();
    } else if (!shouldPlay && this.musicActive) {
      this.stopMusic();
    }
  }

  private startMusic(): void {
    if (this.musicActive || this.muted || typeof window === 'undefined') return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.musicActive = true;
    // Upbeat cheerful 8-bar pentatonic chiptune motif (original melody)
    const melody = [
      659.25, 0, 659.25, 0, 523.25, 659.25, 783.99, 0,
      392.0, 0, 523.25, 0, 392.0, 329.63, 440.0, 493.88,
      466.16, 440.0, 392.0, 659.25, 783.99, 880.0, 698.46, 783.99,
      659.25, 0, 523.25, 587.33, 493.88, 0, 523.25, 0,
    ];
    const bass = [
      130.81, 196.0, 130.81, 196.0, 146.83, 220.0, 196.0, 196.0,
      130.81, 196.0, 130.81, 196.0, 146.83, 196.0, 130.81, 196.0,
      174.61, 220.0, 196.0, 246.94, 174.61, 220.0, 196.0, 196.0,
      130.81, 196.0, 146.83, 196.0, 196.0, 146.83, 130.81, 0,
    ];

    this.musicTimer = window.setInterval(() => {
      if (!this.musicActive || this.muted) return;
      const c = this.ctx;
      if (!c || c.state !== 'running') return;
      const idx = this.musicStep % melody.length;
      this.musicStep += 1;

      const leadFreq = melody[idx];
      const bassFreq = bass[idx];
      const now = c.currentTime;

      if (leadFreq > 0) {
        this.playTone(c, leadFreq, 'square', now, 0.11, 0.035);
      }
      if (bassFreq > 0) {
        this.playTone(c, bassFreq, 'triangle', now, 0.14, 0.045);
      }
    }, 165);
  }

  public stopMusic(): void {
    this.musicActive = false;
    if (this.musicTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    volume: number,
    endFreq?: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
    }
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  public playCue(cue: AudioCue): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const jitter = 0.94 + Math.random() * 0.12;

    switch (cue) {
      case 'jump':
        this.playTone(ctx, 290 * jitter, 'square', now, 0.16, 0.08, 620 * jitter);
        break;
      case 'jump_big':
        this.playTone(ctx, 210 * jitter, 'square', now, 0.19, 0.08, 490 * jitter);
        break;
      case 'coin':
        this.playTone(ctx, 987.77 * jitter, 'square', now, 0.07, 0.075);
        this.playTone(ctx, 1318.51 * jitter, 'square', now + 0.065, 0.2, 0.075);
        break;
      case 'bump':
        this.playTone(ctx, 150 * jitter, 'triangle', now, 0.09, 0.12, 85);
        break;
      case 'brick':
        this.playTone(ctx, 220 * jitter, 'sawtooth', now, 0.11, 0.1, 70);
        this.playTone(ctx, 140 * jitter, 'square', now + 0.03, 0.1, 0.08, 55);
        break;
      case 'powerup_spawn':
        this.playTone(ctx, 330, 'triangle', now, 0.08, 0.08, 523);
        this.playTone(ctx, 440, 'triangle', now + 0.07, 0.12, 0.08, 659);
        break;
      case 'powerup': {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((n, idx) => this.playTone(ctx, n, 'square', now + idx * 0.055, 0.11, 0.075));
        break;
      }
      case 'one_up': {
        const notes = [329.63, 392.0, 659.25, 523.25, 587.33, 783.99];
        notes.forEach((n, idx) => this.playTone(ctx, n, 'square', now + idx * 0.06, 0.1, 0.075));
        break;
      }
      case 'stomp':
        this.playTone(ctx, 320 * jitter, 'triangle', now, 0.09, 0.13, 110);
        this.playTone(ctx, 540 * jitter, 'square', now + 0.02, 0.07, 0.06, 260);
        break;
      case 'kick':
        this.playTone(ctx, 480 * jitter, 'square', now, 0.08, 0.09, 180);
        break;
      case 'fireball':
        this.playTone(ctx, 720 * jitter, 'sawtooth', now, 0.09, 0.07, 220);
        break;
      case 'hurt':
        this.playTone(ctx, 340, 'sawtooth', now, 0.14, 0.11, 130);
        this.playTone(ctx, 220, 'square', now + 0.1, 0.18, 0.09, 95);
        break;
      case 'die': {
        this.stopMusic();
        const notes = [493.88, 523.25, 493.88, 440.0, 392.0, 329.63, 261.63];
        notes.forEach((n, idx) => this.playTone(ctx, n, 'square', now + idx * 0.09, 0.14, 0.085));
        break;
      }
      case 'flagpole':
        this.stopMusic();
        this.playTone(ctx, 523.25, 'square', now, 0.12, 0.09, 783.99);
        this.playTone(ctx, 783.99, 'square', now + 0.12, 0.35, 0.09, 1046.5);
        break;
      case 'victory': {
        this.stopMusic();
        const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
        const times = [0, 0.11, 0.22, 0.34, 0.52, 0.66];
        notes.forEach((n, idx) => this.playTone(ctx, n, 'square', now + times[idx], 0.18, 0.085));
        break;
      }
      case 'gameover': {
        this.stopMusic();
        const notes = [392.0, 349.23, 329.63, 261.63];
        notes.forEach((n, idx) => this.playTone(ctx, n, 'triangle', now + idx * 0.18, 0.24, 0.1));
        break;
      }
    }
  }
}

export const audioEngine = new RetroAudioEngine();
