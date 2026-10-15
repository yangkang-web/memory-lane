const path = window.location.pathname.replace(/\/+$/, '') || '/';

if (path === '/seaside') {
  await import('./seaside.js');
} else if (path === '/apocalypse') {
  await import('./map.js');
} else if (path === '/white-room') {
  await import('./white-room.js');
} else {
  await import('./main.js');
}
