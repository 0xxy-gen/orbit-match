// Browse: the discovery surface, and the only place on these two pages where a
// person writes an event. Per Aether — Event Flow v1, actions happen on the
// thing itself — a request is created on a listing, a watch on a listing — never
// inside a notification and never on the dashboard.
//
// Buttons here name the event they would write (RequestCreated, WatchCreated,
// PugRequested) so the prototype and the code vocabulary stay in step.
import { LISTINGS, SATELLITES } from './demo-data.js';
import { assistant, toggleAssistant, openAssistant } from './assistant.js';
import { accountMenu } from './account-menu.js';
import { themeToggle } from './theme.js';

const STORE_VIEW = 'orbitmatch:view';

const QUARTERS = ['Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027', 'Q1 2028', 'Q2 2028'];
const ORBITS = ['SSO', 'LEO', 'Polar', 'GTO'];

const results = document.getElementById('results');
const orbitFilter = document.getElementById('orbit');
const timeline = document.getElementById('timeline');
const clearCell = document.getElementById('clear-cell');
const toast = document.getElementById('toast');

const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* private window */ } };

const VIEWS = {
  buy: {
    title: 'Listings',
    sub: 'Published capacity from launch sellers. Your satellites are matched against every one of them.',
    timelineSub: 'Listings by orbit and window. Pick a cell to filter.',
    resultsTitle: 'Listings that fit',
    primary: 'Add a satellite',
    rows: LISTINGS,
    unit: 'listing',
    card: listingCard,
  },
  sell: {
    title: 'Satellites',
    sub: 'Published requirements from launch buyers, banded — the shape of the demand, never their exact figures.',
    timelineSub: 'Demand by orbit and window. Pick a cell to filter.',
    resultsTitle: 'Satellites that fit',
    primary: 'Publish a listing',
    rows: SATELLITES,
    unit: 'satellite',
    card: satelliteCard,
  },
};

const LEGACY = { need: 'buy' };
let view = new URLSearchParams(location.search).get('view') ?? read(STORE_VIEW) ?? 'buy';
view = LEGACY[view] ?? view;
if (!VIEWS[view]) view = 'buy';
let cell = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let toastTimer;
function say(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function facts(pairs) {
  const list = el('dl', 'facts');
  for (const [term, detail] of pairs) {
    const row = el('div');
    row.append(el('dt', null, term), el('dd', null, detail));
    list.append(row);
  }
  return list;
}

// Each button names the event it would write, and says it wrote nothing.
function actions(buttons, askAbout) {
  const row = el('div', 'card-foot actions');
  for (const [label, event] of buttons) {
    const button = el('button', 'ghost', label);
    button.type = 'button';
    button.title = `Would write ${event}`;
    button.addEventListener('click', () => {
      say(`${event} — the event this would write. Nothing is stored in the prototype.`);
    });
    row.append(button);
  }

  // The assistant's real use is contextual: opened from the thing itself.
  if (askAbout) {
    const ask = el('button', 'ghost ask-inline', 'Ask');
    ask.type = 'button';
    ask.title = askAbout;
    ask.addEventListener('click', () => openAssistant(askAbout));
    row.append(ask);
  }
  return row;
}

function listingCard(listing) {
  const card = el('article', 'card');
  const head = el('div', 'card-head');
  const titles = el('div');
  titles.append(el('h3', null, listing.launcher), el('p', 'card-sub', listing.seller));
  head.append(titles, el('span', listing.matches ? 'badge fit' : 'badge',
    listing.matches ? `${listing.matches} of your satellites fit` : 'No fit yet'));

  card.append(head, facts([
    ['Orbit', `${listing.orbit} · ${listing.altitude}`],
    ['Inclination', listing.inclination],
    ['Window', listing.window],
    ['Delivery', `${listing.delivery} (${listing.lMinus})`],
    ['Spare capacity', `${listing.spareMass} kg`],
    ['Site', listing.site],
    ['Price', listing.price],
  ]), actions([
    ['Request a quotation', 'RequestCreated (quotation)'],
    ['Watch', 'WatchCreated'],
    ['Ask for the PUG', 'PugRequested'],
  ], `Why does ${listing.launcher} fit, or not fit, my satellites?`));
  return card;
}

function satelliteCard(satellite) {
  const card = el('article', 'card');
  const head = el('div', 'card-head');
  const titles = el('div');
  titles.append(el('h3', null, satellite.buyer), el('p', 'card-sub', `${satellite.mission} · ${satellite.country}`));
  head.append(titles, el('span', satellite.fits ? 'badge fit' : 'badge',
    satellite.fits ? `${satellite.fits} of your listings fit` : 'No fit yet'));

  card.append(head, facts([
    ['Orbit', `${satellite.orbit} · ${satellite.altitude}`],
    ['Mass', satellite.massBand],
    ['Window', satellite.window],
    ['Satellites', String(satellite.count)],
  ]), actions([
    ['Ask to connect', 'RequestCreated (connect)'],
    ['Ask for the CAD', 'CadRequested'],
  ], `Which of my listings fit ${satellite.mission}, and why?`));
  return card;
}

function renderTimeline(config) {
  timeline.replaceChildren();
  timeline.style.setProperty('--cols', String(QUARTERS.length));
  timeline.append(el('span', 'tl-corner', ''));
  for (const quarter of QUARTERS) timeline.append(el('span', 'tl-quarter', quarter));

  for (const orbit of ORBITS) {
    timeline.append(el('span', 'tl-orbit', orbit));
    for (const quarter of QUARTERS) {
      const count = config.rows.filter(row => row.orbit === orbit && row.window === quarter).length;
      const button = el('button', 'tl-cell', count ? String(count) : '');
      button.type = 'button';
      button.disabled = !count;
      button.setAttribute('aria-label', `${orbit}, ${quarter}: ${count} ${config.unit}${count === 1 ? '' : 's'}`);
      if (cell && cell.orbit === orbit && cell.window === quarter) button.classList.add('on');
      if (count) {
        button.classList.add('has');
        button.style.setProperty('--weight', String(Math.min(count, 3)));
        button.addEventListener('click', () => {
          cell = cell && cell.orbit === orbit && cell.window === quarter ? null : { orbit, window: quarter };
          render();
        });
      }
      timeline.append(button);
    }
  }
}

function render() {
  const config = VIEWS[view];

  document.getElementById('title').textContent = config.title;
  document.getElementById('timeline-sub').textContent = config.timelineSub;
  document.getElementById('action-primary').textContent = config.primary;
  document.getElementById('dash-link').href = `/home.html?view=${view}`;
  const missions = document.getElementById('missions-link');
  if (missions) missions.href = `/missions.html?view=${view}`;

  const orbits = [...new Set(config.rows.map(row => row.orbit))];
  const chosen = orbitFilter.value;
  orbitFilter.replaceChildren(new Option('All orbits', ''));
  for (const orbit of orbits) orbitFilter.add(new Option(orbit, orbit));
  orbitFilter.value = cell ? cell.orbit : (orbits.includes(chosen) ? chosen : '');

  let rows = config.rows;
  if (cell) rows = rows.filter(row => row.orbit === cell.orbit && row.window === cell.window);
  else if (orbitFilter.value) rows = rows.filter(row => row.orbit === orbitFilter.value);

  document.getElementById('sub').textContent = config.sub;
  document.getElementById('results-title').textContent = cell
    ? `${config.resultsTitle} — ${cell.orbit} · ${cell.window} (${rows.length} of ${config.rows.length})`
    : `${config.resultsTitle} (${rows.length})`;
  clearCell.hidden = !cell;

  results.replaceChildren(...(rows.length
    ? rows.map(config.card)
    : [el('p', 'empty', 'Nothing in that window yet. Try another cell.')]));

  renderTimeline(config);
}

orbitFilter.addEventListener('change', () => { cell = null; render(); });
clearCell.addEventListener('click', () => { cell = null; orbitFilter.value = ''; render(); });
document.getElementById('action-primary').addEventListener('click', event => {
  say(`${event.target.textContent} — not built in this prototype.`);
});

render();

// the avatar menu, which is where the demo role switch now lives
accountMenu(view);
themeToggle();

// Ask Aether: summoned from the nav bar, ⌘K, or any element with data-ask
assistant(view);
document.getElementById('ask-button')?.addEventListener('click', () => {
  toggleAssistant(document.getElementById('ask')?.hidden ?? true);
});
