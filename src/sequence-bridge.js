// Only the same-origin journey opts into cinematic playback. Standalone pages keep their controls.
export const inSequence = new URLSearchParams(location.search).get('sequence') === '1' && parent !== window;
if (inSequence) {
  document.documentElement.classList.add('sequence-mode');
  const style = document.createElement('style');
  style.textContent = `
    .sequence-mode body { margin:0; overflow:hidden; }
    .sequence-mode #app { pointer-events:none; }
    .sequence-mode .sea-heading,.sequence-mode .sea-number,.sequence-mode .sea-controls,.sequence-mode .sea-caption,
    .sequence-mode .story-entry,.sequence-mode .story-header,.sequence-mode .story-start,.sequence-mode .story-caption,.sequence-mode .story-controls,.sequence-mode #story-notice,
    .sequence-mode .narrative-title,.sequence-mode .narrative-subtitles,.sequence-mode .narrative-controls,.sequence-mode .narrative-ending,
    .sequence-mode .memory-stage > :not(canvas):not(.film-shade):not(.grain):not(.cinema-matte):not(.flash):not(.fade) { display:none!important; }
    .sequence-mode #app > :not(canvas):not(.story-player):not(.narrative-player):not(.memory-stage):not(.sea-vignette):not(.sea-dialogue):not(.annual) { visibility:hidden!important; }
  `;
  document.head.append(style);
  addEventListener('keydown',event=>{if(event.code==='Escape'){event.preventDefault();event.stopImmediatePropagation();sequenceEvent('pause');}},true);
}
export function snapshot(canvas, render = () => {}) {
  render();
  const copy = document.createElement('canvas');
  copy.width = canvas.width; copy.height = canvas.height;
  copy.getContext('2d').drawImage(canvas, 0, 0);
  return copy;
}
export function sequenceEvent(type, detail = {}) {
  if (inSequence) parent.postMessage({ channel:'memory-lane-sequence', type, ...detail }, location.origin);
}
export function installSequence(adapter) {
  if (!inSequence) return;
  window.memorySequenceScene = adapter;
  Promise.resolve(adapter.ready).then(() => sequenceEvent('ready')).catch(error => sequenceEvent('error', {message:String(error.message || error)}));
}
