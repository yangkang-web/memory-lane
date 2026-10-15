// The score: 30 seconds in D major at 96 BPM, synthesised locally with Web Audio and rendered once, offline, before
// the show starts. Every cue sits on the same beat grid as the choreography in show.js.

const BPM = 96, BEAT = 60 / BPM, LENGTH = 31.5, RATE = 44100;
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const at = beat => beat * BEAT;

const CHORDS = [
  // [beat, beats, pad voicing, bass]
  [4, 4, [62, 66, 69, 74], 50],
  [8, 4, [59, 62, 66, 69], 47],
  [12, 4, [55, 59, 62, 66], 43],
  [16, 2, [57, 62, 64, 69], 45], [18, 2, [57, 61, 64, 69], 45],
  [20, 2, [62, 66, 69, 74], 42], [22, 1, [55, 59, 62, 64], 40], [23, 1, [55, 61, 64, 67], 45],
  [24, 2, [62, 66, 69, 74], 50], [26, 2, [55, 59, 62, 67], 43],
  [28, 2, [59, 62, 66, 71], 47], [30, 2, [55, 59, 62, 67], 43],
  [32, 1, [55, 59, 62, 64], 40], [33, 1, [55, 61, 64, 67], 45], [34, 2, [62, 66, 69, 74], 50],
  [36, 2, [55, 59, 62, 67], 43], [38, 2, [62, 66, 69, 74], 42],
  [40, 2, [55, 59, 62, 64], 40], [42, 2, [55, 61, 64, 67], 45],
  [44, 6, [62, 64, 66, 69, 74], 50],
];

const MELODY = [
  // [beat, midi, beats, velocity]
  [5, 69, 0.5, 0.7], [5.5, 74, 0.5, 0.75], [6, 78, 1, 0.85], [7, 76, 1, 0.7],
  [8, 74, 1.5, 0.8], [9.5, 73, 0.5, 0.6], [10, 71, 1, 0.7], [11, 81, 1, 0.75],
  // The five memories ring in as they land.
  [13, 78, 2, 0.9], [15, 81, 2, 0.9], [17, 83, 2, 0.9], [19, 86, 2, 0.95], [21, 90, 2, 0.9],
  [24, 78, 0.5, 0.8], [24.5, 81, 0.5, 0.7], [25, 86, 0.5, 0.85], [25.5, 81, 0.5, 0.7],
  [26, 83, 0.5, 0.8], [26.5, 79, 0.5, 0.7], [27, 83, 0.5, 0.8], [27.5, 86, 0.5, 0.85],
  [28, 78, 1, 0.8], [29, 76, 0.5, 0.7], [29.5, 74, 0.5, 0.7],
  [30, 86, 2, 1],
  [32, 79, 0.5, 0.75], [32.5, 78, 0.5, 0.7], [33, 76, 0.5, 0.75], [33.5, 85, 0.5, 0.8],
  [34, 86, 2, 1],
  [36, 83, 1, 0.85], [37, 81, 1, 0.8], [38, 78, 1.5, 0.8], [39.5, 76, 0.5, 0.7],
  [40, 79, 1, 0.8], [41, 78, 0.5, 0.7], [41.5, 76, 0.5, 0.7], [42, 76, 1, 0.75], [43, 73, 1, 0.7],
  [44, 74, 3, 0.85], [45, 81, 1, 0.55], [45.5, 86, 1, 0.55], [46, 88, 3, 0.6],
];

function noiseBuffer(context, seconds = 2) {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 1234567;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 4294967296) * 2 - 1;
  }
  return buffer;
}

function impulse(context, seconds = 2.6, decay = 3.2) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let seed = 99 + channel * 7919;
    for (let i = 0; i < length; i++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const t = i / length;
      data[i] = ((seed / 4294967296) * 2 - 1) * (1 - t) ** decay * (i < 200 ? i / 200 : 1);
    }
  }
  return buffer;
}

function random(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Applause from the house, as one stereo buffer: each clap is three short noise bursts, band-passed around 1.5 kHz. */
function applause(context, seconds) {
  const rate = context.sampleRate, length = Math.floor(rate * seconds);
  const buffer = context.createBuffer(2, length, rate);
  const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
  const r = random(42), noise = random(7);
  for (let i = 0; i < 700; i++) {
    const time = r() * seconds;
    const density = Math.exp(-(((time - 2) / 1.6) ** 2));
    if (r() > density) continue;
    const level = 0.07 * (0.22 + r() * 0.35), pan = r() * 1.6 - 0.8;
    const gl = level * Math.cos((pan + 1) * Math.PI / 4), gr = level * Math.sin((pan + 1) * Math.PI / 4);
    for (const delay of [0, 0.011, 0.023]) {
      const start = Math.floor((time + delay) * rate), span = Math.floor(0.09 * rate);
      for (let k = 0; k < span && start + k < length; k++) {
        const v = (noise() * 2 - 1) * Math.exp(-k / (0.018 * rate));
        left[start + k] += v * gl;
        right[start + k] += v * gr;
      }
    }
  }
  // Band-pass: the difference of two one-pole low-passes.
  const a = 1 - Math.exp(-2 * Math.PI * 2600 / rate), b = 1 - Math.exp(-2 * Math.PI * 850 / rate);
  for (const data of [left, right]) {
    let high = 0, low = 0;
    for (let k = 0; k < length; k++) { high += a * (data[k] - high); low += b * (data[k] - low); data[k] = (high - low) * 1.6; }
  }
  return buffer;
}

function compose(context) {
  const master = context.createGain();
  master.gain.value = 0.9;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.01;
  compressor.release.value = 0.25;
  master.connect(compressor).connect(context.destination);
  const reverb = context.createConvolver();
  reverb.buffer = impulse(context);
  const wet = context.createGain();
  wet.gain.value = 0.42;
  reverb.connect(wet).connect(master);
  const dry = context.createGain();
  dry.connect(master);
  const send = context.createGain();
  send.connect(reverb);
  const noise = noiseBuffer(context);

  const out = (node, pan = 0, reverbAmount = 0.35) => {
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    node.connect(panner);
    panner.connect(dry);
    const s = context.createGain();
    s.gain.value = reverbAmount;
    panner.connect(s).connect(send);
  };
  const envelope = (gain, start, attack, peak, hold, release) => {
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.setValueAtTime(peak, start + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
  };
  const tone = (type, frequency, start, stop, detune = 0) => {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    osc.start(start);
    osc.stop(stop);
    return osc;
  };
  const noiseSource = (start, duration, offset = 0) => {
    const source = context.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    source.start(start, offset % 1.9, duration);
    return source;
  };

  // Celesta: a bright sine with a short glassy overtone.
  function celesta(midi, start, beats, velocity = 0.8, pan = 0) {
    const f = hz(midi), length = Math.max(1.2, beats * BEAT * 1.6);
    const gain = context.createGain();
    envelope(gain, start, 0.004, 0.11 * velocity, 0.02, length);
    tone('sine', f, start, start + length + 0.1).connect(gain);
    const overtone = context.createGain();
    envelope(overtone, start, 0.002, 0.035 * velocity, 0, 0.35);
    tone('sine', f * 4, start, start + 0.5).connect(overtone);
    overtone.connect(gain);
    const body = context.createGain();
    envelope(body, start, 0.004, 0.03 * velocity, 0, length * 0.6);
    tone('triangle', f * 2, start, start + length).connect(body);
    body.connect(gain);
    out(gain, pan, 0.55);
  }
  // Bell for the memories: inharmonic partials with long tails.
  function bell(midi, start, velocity = 1, pan = 0) {
    const f = hz(midi);
    for (const [ratio, amp, decay] of [[1, 1, 3.2], [2, 0.35, 2.2], [2.76, 0.42, 1.6], [5.4, 0.2, 0.8], [8.93, 0.08, 0.4]]) {
      const gain = context.createGain();
      envelope(gain, start, 0.002, 0.05 * amp * velocity, 0, decay);
      tone('sine', f * ratio, start, start + decay + 0.1).connect(gain);
      out(gain, pan, 0.7);
    }
  }
  function pluck(midi, start, velocity = 0.7, pan = 0) {
    const gain = context.createGain();
    envelope(gain, start, 0.003, 0.08 * velocity, 0, 1.4);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(hz(midi) * 6, start);
    filter.frequency.exponentialRampToValueAtTime(hz(midi) * 1.5, start + 0.6);
    tone('triangle', hz(midi), start, start + 1.5).connect(filter).connect(gain);
    out(gain, pan, 0.6);
  }
  function pad(notes, start, duration, level = 1) {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.4;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.022 * level, start + 0.45);
    gain.gain.setValueAtTime(0.022 * level, start + duration);
    gain.gain.linearRampToValueAtTime(0, start + duration + 0.7);
    for (const [k, midi] of notes.entries()) for (const detune of [-8, 8]) tone('sawtooth', hz(midi), start, start + duration + 0.8, detune + k).connect(filter);
    filter.connect(gain);
    out(gain, 0, 0.6);
  }
  function bass(midi, start, duration, level = 1, short = false) {
    const gain = context.createGain();
    if (short) envelope(gain, start, 0.005, 0.2 * level, 0.02, 0.32);
    else {
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.16 * level, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.07 * level, start + duration);
      gain.gain.linearRampToValueAtTime(0, start + duration + 0.25);
    }
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    tone('sine', hz(midi - 12), start, start + duration + 0.4).connect(gain);
    tone('triangle', hz(midi), start, start + duration + 0.4).connect(filter).connect(gain);
    out(gain, 0, 0.12);
  }
  function kick(start, level = 1) {
    const osc = context.createOscillator();
    osc.frequency.setValueAtTime(130, start);
    osc.frequency.exponentialRampToValueAtTime(42, start + 0.16);
    osc.start(start);
    osc.stop(start + 0.5);
    const gain = context.createGain();
    envelope(gain, start, 0.002, 0.4 * level, 0.02, 0.32);
    osc.connect(gain);
    out(gain, 0, 0.08);
  }
  function hiss(start, duration, type, frequency, level, pan = 0, q = 0.8, reverbAmount = 0.3) {
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = context.createGain();
    envelope(gain, start, 0.002, level, 0, duration);
    noiseSource(start, duration + 0.05, start * 7.3).connect(filter).connect(gain);
    out(gain, pan, reverbAmount);
    return { filter, gain };
  }
  const shaker = (start, level = 1) => hiss(start, 0.07, 'highpass', 6500, 0.05 * level, 0.25, 0.7, 0.15);
  const clap = (start, level = 1, pan = 0) => { for (const d of [0, 0.011, 0.023]) hiss(start + d, 0.09, 'bandpass', 1500, 0.07 * level, pan, 1.1, 0.4); };
  const step = (start, pan) => hiss(start, 0.09, 'lowpass', 500, 0.16, pan, 0.6, 0.2);
  function swish(start, duration, level = 1) {
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(380, start);
    filter.frequency.exponentialRampToValueAtTime(2200, start + duration * 0.4);
    filter.frequency.exponentialRampToValueAtTime(520, start + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.11 * level, start + duration * 0.3);
    gain.gain.linearRampToValueAtTime(0, start + duration);
    noiseSource(start, duration + 0.05, 0.4).connect(filter).connect(gain);
    out(gain, 0, 0.5);
  }
  function boing(start, from = 260, to = 620) {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + 0.12);
    osc.start(start);
    osc.stop(start + 0.3);
    const gain = context.createGain();
    envelope(gain, start, 0.004, 0.07, 0.03, 0.16);
    osc.connect(gain);
    out(gain, 0, 0.3);
  }

  // —— Score ——
  // Bar 0: the dark house, a low drone and a breath of air.
  for (const midi of [38, 45]) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(0.05, 1.6);
    gain.gain.linearRampToValueAtTime(0.03, at(4));
    gain.gain.linearRampToValueAtTime(0, at(6));
    tone('sine', hz(midi), 0, at(6.5)).connect(gain);
    out(gain, 0, 0.5);
  }
  {
    const air = hiss(0.05, 2.6, 'bandpass', 900, 0.018, 0, 0.5, 0.6);
    air.gain.gain.cancelScheduledValues(0.05);
    air.gain.gain.setValueAtTime(0, 0.05);
    air.gain.gain.linearRampToValueAtTime(0.02, 1.5);
    air.gain.gain.linearRampToValueAtTime(0, 2.6);
  }

  // 2.5 s: the follow spot. A thump, a harp glissando, two soft bumps on the seam and the face popping through.
  kick(at(4), 0.75);
  hiss(at(4), 0.06, 'bandpass', 1400, 0.16, 0, 1.4, 0.5);
  [62, 66, 69, 74, 78, 81, 86, 90, 93].forEach((midi, i) => pluck(midi, at(4) + 0.08 + i * 0.045, 0.6 + i * 0.03, -0.6 + i * 0.15));
  for (const time of [2.78, 2.99]) hiss(time, 0.12, 'lowpass', 320, 0.12, 0, 0.6, 0.3);
  swish(3.1, 0.5, 0.35);
  boing(3.36, 240, 520);
  // 5 s: the curtain parts.
  swish(4.95, 2.1, 1);

  for (const [beat, beats, notes, root] of CHORDS) {
    const start = at(beat), duration = beats * BEAT;
    pad(notes, start, beat >= 44 ? 6 : duration, beat >= 24 && beat < 28 ? 0.8 : 1);
    if (beat >= 24 && beat < 28) for (let b = 0; b < beats; b++) bass(root + (b % 2 ? 7 : 0), at(beat + b), BEAT * 0.5, 1.1, true);
    else bass(root, start, beat >= 44 ? 4.5 : duration, beat < 8 ? 0.6 : 1);
  }
  for (const [beat, midi, beats, velocity] of MELODY) celesta(midi, at(beat), beats, velocity, (midi - 80) / 30);
  [78, 81, 83, 86, 90].forEach((midi, i) => bell(midi, at(13 + i * 2), 0.9, [-0.6, -0.3, 0, 0.3, 0.6][i]));
  // Soft broken chords under the memories.
  for (let beat = 12; beat < 24; beat += 0.5) {
    const chord = CHORDS.findLast(([b]) => b <= beat)[2];
    celesta(chord[Math.floor(beat * 2) % chord.length] + 12, at(beat), 0.5, 0.22, Math.sin(beat) * 0.5);
  }
  // Two steps back onto the mark, and a chime for the idea it once was.
  [5.75, 6.05, 6.38].forEach((time, i) => step(time, i % 2 ? -0.15 : 0.15));
  [86, 91, 95].forEach((midi, i) => celesta(midi, 6.3 + i * 0.07, 0.5, 0.5, 0.3));

  // 15 s: the dance.
  for (let b = 24; b < 28; b++) kick(at(b), 0.8);
  for (let b = 24; b < 28; b += 0.5) shaker(at(b + 0.25), 1);
  clap(at(25), 1, -0.2); clap(at(27), 1, 0.2);
  boing(15.0); boing(16.25, 300, 780);

  // 17.5 s: the memories pour into the question mark, 18.75 s it becomes a heart.
  [93, 95, 98, 100, 102].forEach((midi, i) => celesta(midi, 18.25 + i * 0.1, 0.5, 0.45, -0.4 + i * 0.2));
  [74, 78, 81, 86, 90, 93, 98].forEach((midi, i) => pluck(midi, at(30) - 0.2 + i * 0.03, 0.55, -0.5 + i * 0.16));
  for (const midi of [86, 90, 93]) bell(midi, at(30), 0.8, 0);
  swish(at(30) - 0.35, 0.8, 0.5);

  // 20 s: a reverse swell into the burst at 21.25 s.
  {
    const filter = context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000, 20.0);
    filter.frequency.exponentialRampToValueAtTime(1800, at(34));
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, 20.0);
    gain.gain.exponentialRampToValueAtTime(0.002, 20.1);
    gain.gain.exponentialRampToValueAtTime(0.13, at(34) - 0.01);
    gain.gain.linearRampToValueAtTime(0, at(34));
    noiseSource(20.0, 1.3, 0.9).connect(filter).connect(gain);
    out(gain, 0, 0.5);
  }
  kick(at(34), 1.2);
  hiss(at(34), 2.4, 'highpass', 3800, 0.12, 0, 0.5, 0.7);
  hiss(at(34), 0.12, 'bandpass', 900, 0.28, 0, 0.7, 0.4);
  for (let b = 35; b < 40; b++) kick(at(b), 0.55);
  for (let b = 34; b < 40; b += 0.5) shaker(at(b + 0.25), 0.7);

  // 22 s: applause from the house.
  // Hundreds of claps are written straight into one buffer: as separate nodes they would take seconds to render.
  {
    const source = context.createBufferSource();
    source.buffer = applause(context, 5.4);
    source.start(21.6);
    out(source, 0, 0.4);
  }
  {
    const bed = hiss(21.6, 5.2, 'bandpass', 1700, 0.03, 0, 0.4, 0.6);
    bed.gain.gain.cancelScheduledValues(21.6);
    bed.gain.gain.setValueAtTime(0, 21.6);
    bed.gain.gain.linearRampToValueAtTime(0.035, 23.2);
    bed.gain.gain.linearRampToValueAtTime(0, 26.8);
  }
  boing(21.42, 280, 700);

  // 26 s: the curtain closes; the last chord rings over the title.
  swish(26.0, 2.4, 0.8);
  [86, 90, 93, 98].forEach((midi, i) => celesta(midi, 28.3 + i * 0.16, 1, 0.4, -0.3 + i * 0.2));
}

/** Renders the whole score offline. Resolves to an AudioBuffer, or null where Web Audio is unavailable. */
export async function renderScore() {
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Offline) return null;
  const context = new Offline(2, Math.floor(RATE * LENGTH), RATE);
  compose(context);
  return context.startRendering();
}

/** Plays the rendered score from any point; a gain node handles mute without losing the clock. */
export function createPlayer(buffer) {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context || !buffer) return null;
  const context = new Context({ latencyHint: 'interactive' });
  const gain = context.createGain();
  gain.connect(context.destination);
  let source = null;
  const stop = () => {
    if (!source) return;
    try { source.stop(); } catch { /* already stopped */ }
    source.disconnect();
    source = null;
  };
  return {
    context,
    async start(offset) {
      stop();
      if (context.state !== 'running') await context.resume().catch(() => {});
      if (offset >= buffer.duration - 0.05) return;
      source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.start(context.currentTime + 0.01, Math.max(0, offset));
    },
    stop,
    setMuted(muted) { gain.gain.setTargetAtTime(muted ? 0 : 1, context.currentTime, 0.04); },
    /** A quick two-note giggle when Emochi is poked, outside the score. */
    giggle() {
      if (context.state !== 'running') return;
      const now = context.currentTime;
      [[84, 0], [88, 0.09], [91, 0.18]].forEach(([midi, delay]) => {
        const osc = context.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(hz(midi), now + delay);
        osc.frequency.exponentialRampToValueAtTime(hz(midi + 2), now + delay + 0.07);
        const g = context.createGain();
        g.gain.setValueAtTime(0, now + delay);
        g.gain.linearRampToValueAtTime(0.09, now + delay + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.18);
        osc.connect(g).connect(gain);
        osc.start(now + delay);
        osc.stop(now + delay + 0.2);
      });
    },
  };
}
