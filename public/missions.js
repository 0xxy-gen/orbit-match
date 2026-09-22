// Missions: blank for now. The role comes from the account menu, so both sides
// can be designed on this one page.
import { assistant, toggleAssistant } from './assistant.js';
import { accountMenu } from './account-menu.js';

const STORE_VIEW = 'orbitmatch:view';

const read = key => { try { return localStorage.getItem(key); } catch { return null; } };

const canvas = document.getElementById('canvas');

const LEGACY = { need: 'buy' };
let view = new URLSearchParams(location.search).get('view') ?? read(STORE_VIEW) ?? 'buy';
view = LEGACY[view] ?? view;
if (view !== 'buy' && view !== 'sell') view = 'buy';

function render() {
  canvas.dataset.view = view;
  document.getElementById('dash-link').href = `/home.html?view=${view}`;
  document.getElementById('browse-link').href = `/browse.html?view=${view}`;

  // ── build here ──────────────────────────────────────────────────────────
  // canvas.replaceChildren(...);
}

render();

// the avatar menu, which is where the demo role switch now lives
accountMenu(view);

// Ask Aether: summoned from the nav bar, ⌘K, or any element with data-ask
assistant(view);
document.getElementById('ask-button')?.addEventListener('click', () => {
  toggleAssistant(document.getElementById('ask')?.hidden ?? true);
});
