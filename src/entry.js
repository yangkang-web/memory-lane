// Load only the selected experience so the mascot studio stays lightweight.
if (new URLSearchParams(location.search).has('emochi')) {
  import('./emochi-studio.js');
} else {
  import('./main.js');
}
