// The dashboard. Panels live in home.html; this wires the greeting, the two
// actions, the calendar widget, the layout editor and the account menu.
import { calendarStrip } from './calendar-strip.js';
import { dashboardEdit } from './dashboard-edit.js';
import { assistant, toggleAssistant } from './assistant.js';
import { accountMenu, currentUser } from './account-menu.js';
import { themeToggle } from './theme.js';
import { widgetTips } from './widget-tips.js';

const STORE_VIEW = 'orbitmatch:view';
const STORE_EMAIL = 'orbitmatch:email';

const read = key => { try { return localStorage.getItem(key); } catch { return null; } };

const canvas = document.getElementById('canvas');

// A sign-up answer of need/sell maps onto the spec's buyer/seller.
const LEGACY = { need: 'buy' };
let view = new URLSearchParams(location.search).get('view') ?? read(STORE_VIEW) ?? 'buy';
view = LEGACY[view] ?? view;
if (view !== 'buy' && view !== 'sell') view = 'buy';

function render() {
  canvas.dataset.view = view;

  // Greeting and the two actions the dashboard was missing. Deliberately no
  // saved-view dropdown: it promises behaviour that does not exist yet.
  document.getElementById('greeting').textContent = `Hello, ${currentUser().name}!`;

  document.getElementById('browse-action').textContent =
    view === 'buy' ? 'Browse Launch Listings' : 'Browse Payloads';
  document.getElementById('browse-action').href = `/browse.html?view=${view}`;
  document.getElementById('primary-action').textContent =
    view === 'buy' ? 'Add a Mission' : 'Publish a Listing';

  document.getElementById('browse-link').href = `/browse.html?view=${view}`;
  document.getElementById('missions-link').href = `/missions.html?view=${view}`;
  document.getElementById('missions-see-all').href = `/missions.html?view=${view}`;

  // The calendar widget: pass it dated items and it draws the grid and the
  // list. Items look like
  //   { subject, counterpart, kind: 'delivery' | 'launch', date, previous?, note? }
  document.getElementById('calendar').replaceChildren(calendarStrip({ view, items: [] }));
}

// The buyer's primary action has a form behind it now; the seller's does not.
document.getElementById('primary-action').addEventListener('click', event => {
  if (view === 'buy') { location.href = `/new-mission.html?view=${view}`; return; }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = `${event.target.textContent} — not built in this prototype.`;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 2600);
});

render();

// choose which panels show, and in what order
dashboardEdit();

// the avatar menu, which is where the demo role switch now lives
accountMenu(view);
themeToggle();

// what each panel is for, on the header
widgetTips();

// Ask Aether: summoned from the nav bar, ⌘K, or any element with data-ask
assistant(view);
document.getElementById('ask-button')?.addEventListener('click', () => {
  toggleAssistant(document.getElementById('ask')?.hidden ?? true);
});
