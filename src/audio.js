export function createAmbience() {
  let ctx, master, enabled = true;
  function start() {
    if (ctx) { ctx.resume(); return; }
    ctx = new AudioContext();
    master = ctx.createGain(); master.gain.value = enabled ? 0.18 : 0; master.connect(ctx.destination);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
    const channel = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < channel.length; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02; channel[i] = last * 3; }
    const wind = ctx.createBufferSource(); wind.buffer = noise; wind.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 520;
    const windGain = ctx.createGain(); windGain.gain.value = 0.24;
    wind.connect(filter).connect(windGain).connect(master); wind.start();
    const notes = [130.81, 196, 261.63, 293.66, 392];
    function chime() {
      if (ctx.state !== 'running') return;
      const o = ctx.createOscillator(), g = ctx.createGain(), now = ctx.currentTime;
      o.type = 'sine'; o.frequency.value = notes[Math.floor(Math.random() * notes.length)];
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.12, now + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + 5);
      o.connect(g).connect(master); o.start(); o.stop(now + 5.1);
    }
    chime(); setInterval(chime, 5800);
  }
  return {
    start,
    pause() { if (ctx) ctx.suspend(); },
    setEnabled(value) { enabled = value; if (master) master.gain.setTargetAtTime(value ? 0.18 : 0, ctx.currentTime, 0.2); },
  };
}
