// Story progress as a state machine. Each segment is entered once per run and advances on what the player does;
// time spent looking around never counts against the story.
export const SEGMENTS = [
  { id: 'explore', label: '序 · 月下教堂' },
  { id: 'danger', label: 'I · 危险' },
  { id: 'rescue', label: 'II · 救援' },
  { id: 'wound', label: 'III · 伤口' },
  { id: 'intimacy', label: 'IV · 每一滴' },
  { id: 'gift', label: 'V · 信物' },
  { id: 'wear', label: 'VI · 戴上' },
  { id: 'end', label: '尾声' },
];
const IDS = SEGMENTS.map(segment => segment.id);
export const CHECKPOINT_KEY = 'memory-lane.bloodbound.checkpoint';

export class StoryFlow {
  constructor({ onEnter = () => {}, storage = null } = {}) {
    this.onEnter = onEnter;
    this.storage = storage;
    this.segment = null;
    this.elapsed = 0;
    // Seconds since the player last did something that moves the story along; drives the "stuck" hint.
    this.idle = 0;
    this.played = 0;
  }

  get index() { return IDS.indexOf(this.segment); }
  get label() { return SEGMENTS[this.index]?.label ?? ''; }

  go(id) {
    if (!IDS.includes(id)) throw new Error(`Unknown segment ${id}`);
    this.segment = id;
    this.elapsed = 0;
    this.idle = 0;
    this.save();
    this.onEnter(id);
    return id;
  }

  // Each segment advances only from itself, so a late trigger from the previous segment cannot skip one.
  advance(from) {
    if (from !== this.segment || this.index >= IDS.length - 1) return false;
    this.go(IDS[this.index + 1]);
    return true;
  }

  progress() { this.idle = 0; }

  update(dt) {
    const step = Math.min(Math.max(dt, 0), 0.1);
    this.elapsed += step;
    this.idle += step;
    this.played += step;
  }

  save() {
    if (!this.storage) return;
    try {
      if (this.segment === 'explore' || this.segment === 'end') this.storage.removeItem(CHECKPOINT_KEY);
      else this.storage.setItem(CHECKPOINT_KEY, JSON.stringify({ version: 1, segment: this.segment, savedAt: Date.now() }));
    } catch {}
  }

  clear() { try { this.storage?.removeItem(CHECKPOINT_KEY); } catch {} }
}

// Saved data is untrusted: anything that is not exactly a known checkpoint is ignored and removed.
export function readCheckpoint(storage) {
  let raw = null;
  try { raw = storage?.getItem(CHECKPOINT_KEY); } catch { return null; }
  if (raw == null) return null;
  try {
    const value = JSON.parse(raw);
    const keys = value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).sort().join() : '';
    if (keys === 'savedAt,segment,version' && value.version === 1 && Number.isFinite(value.savedAt)
      && IDS.includes(value.segment) && !['explore', 'end'].includes(value.segment)) return value.segment;
  } catch {}
  try { storage.removeItem(CHECKPOINT_KEY); } catch {}
  return null;
}

// Whether the memory plays itself. Stored as exactly "on" or "off"; anything else is removed and the default, on, used.
export const AUTOPLAY_KEY = 'memory-lane.bloodbound.autoplay';
export function readAutoplay(storage) {
  let raw = null;
  try { raw = storage?.getItem(AUTOPLAY_KEY); } catch { return true; }
  if (raw === 'on' || raw === 'off') return raw === 'on';
  if (raw != null) try { storage.removeItem(AUTOPLAY_KEY); } catch {}
  return true;
}
export function saveAutoplay(storage, on) { try { storage?.setItem(AUTOPLAY_KEY, on ? 'on' : 'off'); } catch {} }
