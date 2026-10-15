const base = '/assets/bloodbound/audio/';

export class MemorySound {
  constructor() {
    this.context = new AudioContext({ latencyHint: 'interactive' });
    this.master = this.context.createGain();
    this.master.gain.value = 0.8;
    const limiter = this.context.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 12;
    limiter.ratio.value = 4;
    this.master.connect(limiter).connect(this.context.destination);
    this.voice = this.context.createGain();
    this.voice.gain.value = 0.9;
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 512;
    this.waveform = new Float32Array(512);
    this.voice.connect(this.analyser).connect(this.master);
    this.bed = this.context.createGain();
    this.bed.gain.value = 0.22;
    this.bed.connect(this.master);
    this.effects = this.context.createGain();
    this.effects.gain.value = 0.55;
    this.effects.connect(this.master);
    this.buffers = new Map();
    this.sources = new Map();
    this.loops = new Map();
    this.bedLevel = null;
    this.muted = false;
    this.manifest = { lines: [], effects: [] };
  }

  get now() { return this.context.currentTime; }

  get speechEnvelope() {
    this.analyser.getFloatTimeDomainData(this.waveform);
    let power = 0;
    for (const value of this.waveform) power += value * value;
    return Math.min(1, Math.sqrt(power / this.waveform.length) * 8);
  }

  async load() {
    const response = await fetch(`${base}manifest.json`);
    if (!response.ok) throw new Error('Voice assets are not ready');
    this.manifest = await response.json();
    const entries = [...(this.manifest.lines ?? []), ...(this.manifest.effects ?? []), ...(this.manifest.ambience ?? [])].filter(entry => entry.file);
    await Promise.all(entries.map(async entry => {
      if (typeof entry.file !== 'string' || !/^[\w.-]+\.(mp3|wav|ogg|opus)$/.test(entry.file)) throw new Error('Invalid audio asset path');
      const response = await fetch(`${base}${entry.file}`);
      if (!response.ok) throw new Error(`Missing audio: ${entry.id}`);
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      this.buffers.set(entry.id, buffer);
      entry.duration = buffer.duration;
    }));
    this.buffers.set('door-open', this.door());
    return this.manifest;
  }

  // An old oak door on iron hinges, made here rather than shipped: a knock as the latch gives, the low push of the
  // leaf, and the hinge creaking through the swing as a train of stick-slip clicks through two wood resonances.
  door() {
    const rate = this.context.sampleRate, length = Math.round(rate * 2.8);
    const buffer = this.context.createBuffer(1, length, rate), out = buffer.getChannelData(0);
    let seed = 7, low = 0, phase = 0, peak = 0;
    const noise = () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 2147483648 - 1);
    const resonators = [[820, .9965, .5], [1730, .994, .3], [310, .998, .35]].map(([f, r, g]) => ({ c: 2 * r * Math.cos(2 * Math.PI * f / rate), r2: r * r, g, y1: 0, y2: 0 }));
    for (let i = 0; i < length; i++) {
      const t = i / rate;
      // Latch knock.
      const knock = t < .25 ? Math.sin(2 * Math.PI * 68 * t) * Math.exp(-t * 22) * .9 : 0;
      low += (noise() - low) * .02;
      const swing = Math.min(1, Math.max(0, (t - .2) / .3)) * Math.max(0, 1 - (t - .2) / 2.3);
      // Hinge: the click rate wanders as the leaf slows and catches.
      const rateHz = 26 + 30 * Math.sin(t * 2.3) ** 2 + 12 * Math.sin(t * 9.1);
      phase += rateHz / rate;
      let excite = 0;
      if (phase >= 1 && t > .3 && t < 2.4) { phase -= 1; excite = (.6 + .4 * noise()) * swing; }
      let creak = 0;
      for (const o of resonators) { const y = o.c * o.y1 - o.r2 * o.y2 + excite * o.g; o.y2 = o.y1; o.y1 = y; creak += y; }
      out[i] = knock + low * 2.2 * swing + creak * .05;
      peak = Math.max(peak, Math.abs(out[i]));
    }
    for (let i = 0; i < length; i++) out[i] *= .4 / peak;
    return buffer;
  }

  async unlock() {
    if (this.context.state !== 'running') await this.context.resume();
    if (this.context.state !== 'running') throw new Error('Audio could not start');
  }

  play(id, delay = 0, offset = 0, category = 'voice', gain = 1, loop = false, pan = 0) {
    const buffer = this.buffers.get(id);
    if (!buffer || (!loop && offset >= buffer.duration)) return null;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    const volume = this.context.createGain();
    volume.gain.value = gain;
    if (pan) {
      const panner = this.context.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      source.connect(volume).connect(panner).connect(this[category]);
    } else source.connect(volume).connect(this[category]);
    source.start(this.now + Math.max(0, delay), loop ? offset % buffer.duration : offset);
    const set = loop ? this.loops : this.sources;
    set.set(source, volume);
    source.onended = () => { set.delete(source); source.disconnect(); volume.disconnect(); };
    return source;
  }

  stopScheduled() {
    for (const [source, volume] of this.sources) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); volume.disconnect(); }
    this.sources.clear();
  }

  stop() {
    this.stopScheduled();
    for (const [source, volume] of this.loops) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); volume.disconnect(); }
    this.loops.clear();
  }

  duration(id) { return this.buffers.get(id)?.duration ?? 0; }

  startAmbience() {
    if (this.loops.size) return;
    for (const entry of this.manifest.ambience ?? []) this.play(entry.id, 0, 0, 'bed', entry.gain ?? 1, true);
  }

  // Lower the bed while someone speaks so the line sits in front of the room.
  duck(on) {
    const level = on ? 0.1 : 0.22;
    if (this.bedLevel !== level) { this.bedLevel = level; this.bed.gain.setTargetAtTime(level, this.now, 0.18); }
  }

  // Pausing freezes every sound where it is, so a line resumes mid-word instead of restarting.
  async suspend() { if (this.context.state === 'running') await this.context.suspend(); }

  mute(value) {
    this.muted = value;
    this.master.gain.setTargetAtTime(value ? 0 : 0.8, this.now, 0.025);
  }

  async dispose() { this.stop(); await this.context.close(); }
}
