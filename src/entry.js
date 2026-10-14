const path = window.location.pathname.replace(/\/+$/, '') || '/';

if (path === '/apocalypse') {
  await import('./map.js');
} else {
  await import('./main.js');
}
