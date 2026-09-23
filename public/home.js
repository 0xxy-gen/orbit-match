// The dashboard. Panels live in home.html; this wires the greeting, the two
// actions, the calendar widget, the layout editor and the account menu.
import { calendarStrip } from './calendar-strip.js';
import { dashboardEdit } from './dashboard-edit.js';
import { assistant, toggleAssistant } from './assistant.js';
import { accountMenu, currentUser } from './account-menu.js';
import { themeToggle } from './theme.js';
import { widgetTips } from './widget-tips.js';
import { MISSION_ROWS, PHASES } from './demo-data.js';

const STORE_VIEW = 'orbitmatch:view';
const STORE_EMAIL = 'orbitmatch:email';

const read = key => { try { return localStorage.getItem(key); } catch { return null; } };

const canvas = document.getElementById('canvas');

// A sign-up answer of need/sell maps onto the spec's buyer/seller.
const LEGACY = { need: 'buy' };
let view = new URLSearchParams(location.search).get('view') ?? read(STORE_VIEW) ?? 'buy';
view = LEGACY[view] ?? view;
if (view !== 'buy' && view !== 'sell') view = 'buy';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// ── Mission List ───────────────────────────────────────────────────────────
//
// The same rows as the Missions page, read from the same MISSION_ROWS — a
// dashboard that disagrees with the page it links to is worse than a dashboard
// with nothing on it.
//
// Shorter, though, and answering a different question. The Missions page
// answers "what are my missions"; a dashboard answers "which one needs me
// today". So a row is one line: the mission, where it has got to, and the
// nearest thing with a clock on it. Satellite counts and window spans are the
// record, not the alarm, and they cost the rows that would let you see the
// whole programme at once.
//
// Per the event model this panel is a projection. Nothing here writes anything:
// a row is a way through to the mission, never a place to act on it.

// The soonest deadline across a mission's launches. A mission is only as calm
// as its most urgent clock, so that is the one the row reports.
function nearest(row) {
  const launches = (row.launches ?? []).filter(launch => launch.clock);
  if (!launches.length) {
    return row.status === 'Draft'
      ? { text: 'Not published', quiet: true }
      : { text: 'Awaiting matches', quiet: true };
  }
  const ticking = launches.filter(launch => typeof launch.days === 'number');
  if (!ticking.length) return { text: launches[0].clock, quiet: true };

  const soonest = ticking.reduce((a, b) => (a.days <= b.days ? a : b));
  return {
    text: `${soonest.clock} in ${soonest.days}d`,
    // five business days is the spec's NDA window — inside that, a thing is
    // not a date any more, it is a task
    urgent: soonest.days <= 5,
  };
}

function phaseOf(row) {
  const launches = row.launches ?? [];
  if (!launches.length) return row.status === 'Draft' ? 'Draft' : 'Published';
  return PHASES[Math.max(...launches.map(launch => launch.reached ?? 0))] ?? PHASES[0];
}

function missionRow(row) {
  const item = el('li', 'mini-row');

  const name = el('a', 'mini-name', row.name);
  name.href = `/mission.html?id=${encodeURIComponent(row.id)}&view=${view}`;

  const clock = nearest(row);
  const due = el('span', `mini-clock${clock.urgent ? ' urgent' : ''}${clock.quiet ? ' quiet' : ''}`, clock.text);

  item.append(name, el('span', 'mini-phase', phaseOf(row)), due);
  return item;
}

function missionList() {
  const rows = MISSION_ROWS[view] ?? [];
  const body = document.querySelector('.box[data-widget="missions"] .box-body');
  if (!body) return;

  document.getElementById('missions-title').textContent = view === 'buy' ? 'Mission List' : 'Listings';

  // Soonest deadline first: the list orders itself by what needs attention
  // rather than by when a mission happened to be created.
  const ordered = [...rows].sort((a, b) => {
    const clock = row => Math.min(...(row.launches ?? [])
      .map(launch => (typeof launch.days === 'number' ? launch.days : Infinity)), Infinity);
    return clock(a) - clock(b);
  });

  body.replaceChildren(rows.length
    ? el('ul', 'mini-list')
    : el('p', 'box-empty', view === 'buy' ? 'No missions yet.' : 'No listings yet.'));

  const list = body.querySelector('.mini-list');
  if (list) list.append(...ordered.map(missionRow));
}

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

  missionList();
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
