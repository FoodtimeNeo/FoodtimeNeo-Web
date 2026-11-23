(() => {
  // Runs before CSS paints and remains compatible with script-src self.
  let mode = 'system';
  try {
    mode = localStorage.getItem('foodtime-appearance') || 'system';
  } catch {
    /* Storage can be disabled. */
  }
  const dark =
    mode === 'dark' ||
    (mode !== 'light' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();
