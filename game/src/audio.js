// All of VOIDSTORM's sound is synthesized live with WebAudio: oscillator
// blips for lasers, filtered noise for explosions, and a small step
// sequencer that loops a bass line, an arpeggio and hats as the music.
// No audio files are loaded. The context is created lazily on the first
// user gesture, as browsers require, and every call is safe before that.

const MUSIC_BASS = [0, -1, 0, -1, 3, -1, 0, -1, 5, -1, 3, -1, 2, -1, 1, -1];
const MUSIC_ARP = [12, 15, 19, 15, 12, 15, 19, 22, 12, 15, 19, 15, 17, 15, 12, 10];
const ROOT_HZ = 55; // A1

function noteHz(semitones) {
  return ROOT_HZ * Math.pow(2, semitones / 12);
}

export class SoundSynth {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicTimer = null;
    this.step = 0;
    this.nextNoteTime = 0;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.34;
      this.musicGain.connect(this.master);
    } catch (err) {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  tone({ freq, freqEnd, type = 'square', dur = 0.12, vol = 0.2, when = 0, dest = null }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(dest ?? this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.3, vol = 0.3, freq = 1200, freqEnd = 120, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t0 + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(t0);
  }

  shoot() {
    this.tone({ freq: 880, freqEnd: 320, type: 'square', dur: 0.07, vol: 0.055 });
  }

  enemyShoot() {
    this.tone({ freq: 300, freqEnd: 140, type: 'sawtooth', dur: 0.1, vol: 0.045 });
  }

  enemyHit() {
    this.tone({ freq: 220, freqEnd: 90, type: 'triangle', dur: 0.05, vol: 0.07 });
  }

  explosion(big = false) {
    this.noise({ dur: big ? 0.7 : 0.32, vol: big ? 0.5 : 0.26, freq: big ? 2600 : 1700 });
    this.tone({ freq: big ? 130 : 160, freqEnd: 34, type: 'sine', dur: big ? 0.6 : 0.3, vol: 0.4 });
  }

  playerDown() {
    this.noise({ dur: 0.9, vol: 0.5, freq: 3000, freqEnd: 60 });
    this.tone({ freq: 420, freqEnd: 40, type: 'sawtooth', dur: 0.8, vol: 0.3 });
  }

  shieldUp() {
    this.tone({ freq: 520, type: 'sine', dur: 0.16, vol: 0.16 });
    this.tone({ freq: 780, type: 'sine', dur: 0.22, vol: 0.14, when: 0.07 });
  }

  powerup() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, i) => {
      this.tone({ freq, type: 'triangle', dur: 0.12, vol: 0.16, when: i * 0.055 });
    });
  }

  bomb() {
    this.noise({ dur: 1.1, vol: 0.55, freq: 3600, freqEnd: 40 });
    this.tone({ freq: 90, freqEnd: 26, type: 'sine', dur: 1.0, vol: 0.5 });
  }

  bossAlarm() {
    for (let i = 0; i < 3; i++) {
      this.tone({ freq: 196, type: 'square', dur: 0.16, vol: 0.14, when: i * 0.36 });
      this.tone({ freq: 147, type: 'square', dur: 0.16, vol: 0.14, when: i * 0.36 + 0.18 });
    }
  }

  waveClear() {
    const notes = [392, 523, 659, 784];
    notes.forEach((freq, i) => {
      this.tone({ freq, type: 'square', dur: 0.14, vol: 0.1, when: i * 0.07 });
    });
  }

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.06;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 40);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  scheduleMusic() {
    if (!this.ctx) return;
    const stepDur = 60 / 132 / 2; // 132 BPM, eighth notes
    while (this.nextNoteTime < this.ctx.currentTime + 0.14) {
      this.playStep(this.step, this.nextNoteTime);
      this.nextNoteTime += stepDur;
      this.step = (this.step + 1) % 64;
    }
  }

  playStep(step, when) {
    const offset = when - this.ctx.currentTime;
    const bar = Math.floor(step / 16);
    const bassNote = MUSIC_BASS[step % 16];
    if (bassNote >= 0) {
      this.tone({
        freq: noteHz(bassNote + (bar === 3 ? 0 : 0)),
        type: 'triangle', dur: 0.21, vol: 0.30, when: offset, dest: this.musicGain,
      });
    }
    if (step % 2 === 0) {
      const arpNote = MUSIC_ARP[(step / 2) % 16];
      this.tone({
        freq: noteHz(arpNote + 12), type: 'square', dur: 0.09, vol: 0.05, when: offset, dest: this.musicGain,
      });
    }
    if (step % 4 === 2) {
      this.noiseHat(offset);
    }
  }

  noiseHat(offset) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + offset;
    const frames = Math.floor(this.ctx.sampleRate * 0.03);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.05;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    source.start(t0);
  }
}
