import { ref, readonly } from 'vue';

const KEY = 'foodtime-appearance';
const modes = ['system', 'light', 'dark'];
const mode = ref('system');
let media;
let installed = false;
function stored() {
  try {
    const value = localStorage.getItem(KEY);
    return modes.includes(value) ? value : 'system';
  } catch {
    return 'system';
  }
}
function apply() {
  const dark =
    mode.value === 'dark' || (mode.value === 'system' && media?.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}
export function installAppearance() {
  if (installed) return;
  installed = true;
  mode.value = stored();
  media = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (media?.addEventListener) media.addEventListener('change', apply);
  else media?.addListener?.(apply);
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) {
      mode.value = stored();
      apply();
    }
  });
  apply();
}
export function useAppearance() {
  installAppearance();
  return {
    appearance: readonly(mode),
    setAppearance(value) {
      if (!modes.includes(value)) return;
      mode.value = value;
      try {
        localStorage.setItem(KEY, value);
      } catch {
        /* Still works for this visit. */
      }
      apply();
    },
  };
}
