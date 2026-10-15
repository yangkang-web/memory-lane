const path = window.location.pathname.replace(/\/+$/, '') || '/';

if (path === '/seaside') {
  await import('./seaside.js');
} else if (path === '/apocalypse') {
  await import('./map.js');
} else {
  await import('./main.js');
}
