/**
 * Zero-dependency Web Audio API procedural sound synthesizer.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.squeezeNode = null;
    this.lastCreakAt = 0;
  }

  unlock() {
    if (this.muted) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playBounce(intensity = 0.5) {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    const amp = Math.min(0.28, Math.max(0.03, intensity * 0.24));
    const baseFreq = 120 + Math.min(1, intensity) * 180;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq * 1.4, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(55, baseFreq * 0.55), now + 0.085);

    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playSqueezeTick(charge) {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const t = performance.now();
    if (t - this.lastCreakAt < 75) return;
    this.lastCreakAt = t;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    const freq = 240 + charge * 520;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq + 65, now + 0.045);

    gain.gain.setValueAtTime(0.025 + charge * 0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  playPop() {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;

    // Punchy low thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.11);
    oscGain.gain.setValueAtTime(0.32, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(oscGain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);

    // Crisp noise snap
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.07);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const nGain = this.ctx.createGain();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    nGain.gain.setValueAtTime(0.28, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    noise.connect(filter).connect(nGain).connect(this.ctx.destination);
    noise.start(now);
  }

  playReassemble() {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    const notes = [330, 440, 554.37, 659.25];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + idx * 0.045;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.17);
    });
  }

  playSmash(combo = 1, isGold = false) {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    const semitone = Math.min(14, combo - 1);
    const base = (isGold ? 660 : 392) * Math.pow(2, semitone / 12);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isGold ? "triangle" : "square";
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.5, now + 0.08);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playTick() {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  playGameOver() {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.07;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }
}
