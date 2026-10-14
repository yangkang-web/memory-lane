import './style.css';
import { createCampus, locations } from './school.js';
import { interiorStops } from './school-interior.js';

const icons = {
  school: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-6h6v6M9 10h.01M15 10h.01"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  walk: '<circle cx="14" cy="4" r="2"/><path d="m7 12 3-4 5 1 3 4m-7-4-1 7-4 5m5-7 4 3 1 4"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
document.querySelector('#app').innerHTML = `
  <canvas id="world" aria-label="Interactive 3D school campus"></canvas>
  <div id="loading" role="status"><span class="loader"></span>Building your campus…</div>
  <header class="topbar">
    <a class="brand" href="#" aria-label="Return to campus overview"><span class="brand-mark">${icon('school')}</span><span>Westbridge<small>ACADEMY · EST. 1968</small></span></a>
    <div class="top-right"><span class="scene-status"><i></i>INTERACTIVE CAMPUS</span><button id="student-focus" class="icon-button" aria-label="Meet the student">${icon('walk')}<span>Meet student</span></button><button id="light" class="icon-button" title="Switch to sunset" aria-label="Switch to sunset">${icon('sun')}<span>Daylight</span></button></div>
  </header>
  <section class="intro"><div class="eyebrow">A LITTLE WORLD OF LEARNING</div><h1>A place to belong.</h1><p>Quiet courtyards. Open doors. Room to discover.</p></section>
  <aside class="places" aria-label="Campus destinations"><div class="places-heading"><span>Around campus</span><span>04 PLACES</span></div>${locations.map((p,i)=>`<button class="place" data-place="${p.id}"><span class="place-number">0${i+1}</span><span><strong>${p.title}</strong><small>${p.en}</small></span><span class="place-arrow">↗</span></button>`).join('')}<div class="place-footer"><span class="dot"></span><span id="mode-description">Choose a place to explore</span></div></aside>
  <nav class="indoor-route" aria-label="Explore the school"><div class="route-heading">Step inside <span>WALK INSIDE</span></div><div class="route-stops">${interiorStops.map((p,i)=>`<button data-stop="${p.id}" class="route-stop"><span class="route-step">${i+1}</span><span><strong>${p.title}</strong><small>${p.subtitle}</small></span><span class="route-enter">↗</span></button>`).join('')}</div><p>Doors open as you approach</p></nav>
  <section class="student-controls" aria-label="Student actions" hidden>
    <div class="student-heading"><div><small>ON THE WAY TO CLASS</small><strong>Meet Alex</strong></div><span id="student-state" role="status">Walking</span></div>
    <div class="student-actions"><button data-student-action="idle" aria-pressed="false">Stand</button><button data-student-action="walk" aria-pressed="false">Walk</button><button data-student-action="wave" aria-pressed="false">Wave</button></div>
    <p>Drag to look around · Scroll to zoom</p>
  </section>
  <div id="labels" aria-hidden="true"></div>
  <div class="view-caption"><span class="caption-line"></span><div><small>YOUR VIEW</small><strong id="view-name">Campus overview</strong></div></div>
  <nav class="toolbar" aria-label="Scene controls"><button id="overview" class="tool active">${icon('compass')}<span>Overview</span></button><button id="walk" class="tool">${icon('walk')}<span>Walk</span></button><span class="divider"></span><button id="labels-toggle" class="tool active" aria-pressed="true">${icon('pin')}<span>Labels</span></button><button id="reset" class="tool" title="Reset view">${icon('reset')}<span>Reset</span></button></nav>
  <div class="help" id="help"><span>Drag to orbit</span><b>·</b><span>Scroll to zoom</span><b>·</b><span>Right-drag to pan</span></div>
  <div class="north" aria-hidden="true"><span>N</span><svg viewBox="0 0 40 40"><path d="M20 3 28 33 20 27 12 33Z" fill="currentColor"/><path d="M20 3v24l8 6Z" fill="#abb4a2"/></svg></div>
  <div id="touch-move" aria-label="Walking controls" hidden><button data-move="w" aria-label="Forward">↑</button><div><button data-move="a" aria-label="Move left">←</button><button data-move="s" aria-label="Backward">↓</button><button data-move="d" aria-label="Move right">→</button></div></div>
  <div id="error" role="alert" hidden></div>
`;
let world;
try {
  world = createCampus(document.querySelector('#world'), document.querySelector('#labels'), name => { document.querySelector('#view-name').textContent=name; });
  document.querySelector('#loading').remove();
} catch (error) {
  document.querySelector('#loading').remove();
  document.querySelector('#error').hidden = false;
  document.querySelector('#error').textContent = 'Unable to load the campus. Please refresh in a WebGL 2 compatible browser.';
  console.error(error);
}
if (world) {
  let walking = false, sunset = false, showLabels = true;
  const setWalking = value => {
    walking = value; world.setWalking(value);
    document.querySelector('#app').classList.remove('student-view');
    document.querySelector('.student-controls').hidden=true;
    document.querySelector('#app').classList.toggle('walking',value);
    document.querySelector('#walk').classList.toggle('active',value);
    document.querySelector('#overview').classList.toggle('active',!value);
    document.querySelector('#walk').setAttribute('aria-pressed',String(value));
    document.querySelector('#touch-move').hidden = !value;
    document.querySelector('#help').innerHTML = value ? '<span>WASD / arrows to move</span><b>·</b><span>Drag to look · Auto doors</span><b>·</b><span>Esc for overview</span>' : '<span>Drag to orbit</span><b>·</b><span>Scroll to zoom</span><b>·</b><span>Right-drag to pan</span>';
    document.querySelector('#view-name').textContent = value ? 'Exploring campus' : 'Campus overview';
    document.querySelector('#mode-description').textContent = value ? 'Explore the hall and classrooms' : 'Choose a place to explore';
    document.querySelectorAll('.place,.route-stop').forEach(b=>b.classList.remove('selected'));
  };
  const syncStudent = () => {
    const action=world.studentAction;
    document.querySelector('#student-state').textContent={idle:'Standing',walk:'Walking',wave:'Waving'}[action];
    document.querySelectorAll('[data-student-action]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.studentAction===action)));
  };
  const meetStudent=()=>{
    setWalking(false);world.focusStudent();
    document.querySelector('#app').classList.add('student-view');
    document.querySelector('.student-controls').hidden=false;
    document.querySelector('#view-name').textContent='Alex · Campus student';
    syncStudent();
  };
  document.querySelector('#student-focus').onclick=meetStudent;
  document.querySelectorAll('[data-student-action]').forEach(b=>b.onclick=()=>{world.setStudentAction(b.dataset.studentAction);syncStudent();});
  const reset = () => { setWalking(false); world.overview(); };
  document.querySelector('.brand').onclick = e => {e.preventDefault();reset();};
  document.querySelector('#overview').onclick = reset;
  document.querySelector('#reset').onclick = reset;
  document.querySelector('#walk').onclick = () => { if(walking)reset();else setWalking(true); };
  document.querySelectorAll('.place').forEach(button=>button.onclick=()=>{
    setWalking(false); world.focus(button.dataset.place);button.classList.add('selected');
    document.querySelector('#view-name').textContent = locations.find(p=>p.id===button.dataset.place).title;
  });
  document.querySelectorAll('[data-stop]').forEach(button=>button.onclick=()=>{
    setWalking(true);world.visit(button.dataset.stop);button.classList.add('selected');
  });
  document.querySelector('#light').onclick = e => {
    sunset=!sunset;world.setSunset(sunset);
    const b=e.currentTarget;b.querySelector('span').textContent=sunset?'Sunset':'Daylight';
    b.title=b.ariaLabel=sunset?'Switch to daylight':'Switch to sunset';
  };
  document.querySelector('#labels-toggle').onclick=e=>{
    showLabels=!showLabels;world.setLabels(showLabels);e.currentTarget.classList.toggle('active',showLabels);e.currentTarget.setAttribute('aria-pressed',String(showLabels));
  };
  addEventListener('keydown',e=>{if(e.key==='Escape')reset();});
  if(new URLSearchParams(location.search).has('student'))meetStudent();
  document.querySelectorAll('[data-move]').forEach(b=>{
    b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);world.moveKey(b.dataset.move,true);};
    b.onpointerup=b.onpointercancel=()=>world.moveKey(b.dataset.move,false);
  });
}
