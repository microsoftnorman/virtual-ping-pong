/** Audio Manager — Web Audio API synthesized sounds */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicEnabled = true;
    this.musicGain = null;
    this.masterGain = null;
    this.musicOsc = null;
  }

  /** Initialize audio context (must be called after user gesture) */
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.08;
    this.musicGain.connect(this.masterGain);
  }

  /** Resume audio context if suspended */
  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /** Play a named sound effect */
  play(name, options = {}) {
    if (!this.enabled || !this.ctx) return;

    switch (name) {
      case 'hit': this._playHit(options.force || 0.5); break;
      case 'wallBounce': this._playWallBounce(); break;
      case 'score': this._playScore(); break;
      case 'countdown': this._playCountdown(options.number || 3); break;
      case 'go': this._playGo(); break;
      case 'win': this._playWin(); break;
      case 'lose': this._playLose(); break;
      default: break;
    }
  }

  /** Paddle hit — short ping, pitch varies with force */
  _playHit(force) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600 + force * 800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);

    gain.gain.setValueAtTime(0.4 + force * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /** Wall bounce — softer thud */
  _playWallBounce() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** Score — ascending arpeggio */
  _playScore() {
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784]; // C5, E5, G5

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, t + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, t + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.25);
    });
  }

  /** Countdown beep */
  _playCountdown(number) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = number === 0 ? 880 : 440;

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  /** GO! — higher pitch burst */
  _playGo() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.3);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /** Win fanfare */
  _playWin() {
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.value = freq;

      const start = t + i * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.03);
      gain.gain.setValueAtTime(0.25, start + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  /** Lose sound — descending */
  _playLose() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.5);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.55);
  }

  /** Start ambient background music */
  startMusic() {
    if (!this.musicEnabled || !this.ctx || this.musicOsc) return;

    // Simple ambient drone with filter
    this.musicOsc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();

    this.musicOsc.type = 'sine';
    this.musicOsc.frequency.value = 110; // A2

    osc2.type = 'sine';
    osc2.frequency.value = 165; // E3

    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 2;

    const musicGainNode = this.ctx.createGain();
    musicGainNode.gain.value = 0.04;

    this.musicOsc.connect(filter);
    osc2.connect(filter);
    filter.connect(musicGainNode);
    musicGainNode.connect(this.musicGain);

    this.musicOsc.start();
    osc2.start();

    // Store for cleanup
    this.musicOsc._osc2 = osc2;
    this.musicOsc._gain = musicGainNode;
  }

  /** Stop background music */
  stopMusic() {
    if (this.musicOsc) {
      try {
        this.musicOsc.stop();
        if (this.musicOsc._osc2) this.musicOsc._osc2.stop();
      } catch { /* already stopped */ }
      this.musicOsc = null;
    }
  }

  setEnabled(on) {
    this.enabled = on;
  }

  setMusicEnabled(on) {
    this.musicEnabled = on;
    if (!on) this.stopMusic();
    else this.startMusic();
  }
}

export const audio = new AudioManager();
