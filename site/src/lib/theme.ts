// Dark-first theme with a per-browser light option. Storage may be unavailable
// (private mode, blocked site data); every access is guarded.
export type Theme = 'dark' | 'light';
const KEY = 'catalog-theme';

export function readTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // ignore: the theme still applies for this page view
  }
}
