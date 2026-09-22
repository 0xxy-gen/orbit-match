// Light and dark.
//
// The choice is written on <html> as data-theme, and read back before first
// paint by the one-line script in each page's <head>. Without that line a light
// user gets a black flash on every navigation, which is worse than having no
// switch at all.
//
// A first-time visitor gets whatever their machine is set to — asking someone
// who has already told their operating system what they want is asking twice.
// After that their choice here wins, because it was made on purpose.

const STORE = 'orbitmatch:theme';

const read = () => { try { return localStorage.getItem(STORE); } catch { return null; } };
const write = value => { try { localStorage.setItem(STORE, value); } catch { /* private window */ } };

const systemTheme = () => (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

export const currentTheme = () =>
  (document.documentElement.dataset.theme || read() || systemTheme());

export function applyTheme(choice) {
  document.documentElement.dataset.theme = choice;
  write(choice);
  return choice;
}

// The icon is the destination, and it means what it looks like: a sun takes you
// to light, a moon takes you to dark. Clicking a sun to get a dark screen is
// the version of this control everyone has to think twice about.
const ICONS = {
  light: '<circle cx="10" cy="10" r="3.6"/><path d="M10 2.4v1.8M10 15.8v1.8M17.6 10h-1.8M4.2 10H2.4M15.4 4.6l-1.3 1.3M5.9 14.1l-1.3 1.3M15.4 15.4l-1.3-1.3M5.9 5.9 4.6 4.6"/>',
  dark: '<path d="M16 11.4A6.6 6.6 0 0 1 8.6 4a6.8 6.8 0 1 0 7.4 7.4Z"/>',
};

export function themeToggle(target = document.getElementById('theme-toggle')) {
  if (!target) return;

  const paint = choice => {
    const next = choice === 'dark' ? 'light' : 'dark';
    target.innerHTML = `<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[next]}</svg>`;
    target.title = `Switch to ${next} mode`;
    target.setAttribute('aria-label', `Switch to ${next} mode`);
    target.setAttribute('aria-pressed', String(choice === 'light'));
  };

  paint(currentTheme());

  target.addEventListener('click', () => {
    paint(applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  });
}
