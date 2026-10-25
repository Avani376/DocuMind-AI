export type Theme = 'dark' | 'light';

export function getSavedTheme(): Theme {
  return localStorage.getItem('documind_theme') === 'light'
    ? 'light'
    : 'dark';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('documind_theme', theme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#05080d' : '#f4f8fb');
}
