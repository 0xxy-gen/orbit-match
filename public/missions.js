// Missions: what the intake actually collects.
//
// One row per mission — objective, budget, the regulatory answers, the ride
// preference — with its satellites underneath, each carrying the eight numbers
// that decide what it can fly on: mass, envelope, inclination, altitude, LTAN,
// target window and deployer compatibility.
//
// Nothing here is deal state. Where a mission stands belongs on the dashboard,
// which is a projection of events; this page is the record of what was entered.
import { MISSION_ROWS, VIEWS } from './demo-data.js';
import { satelliteTable } from './satellite-table.js';
import { assistant, toggleAssistant } from './assistant.js';
import { accountMenu } from './account-menu.js';
import { themeToggle } from './theme.js';

const STORE_VIEW = 'orbitmatch:view';

const read = key => { try { return localStorage.getItem(key); } catch { return null; } };

const canvas = document.getElementById('canvas');

const LEGACY = { need: 'buy' };
let view = new URLSearchParams(location.search).get('view') ?? read(STORE_VIEW) ?? 'buy';
view = LEGACY[view] ?? view;
if (view !== 'buy' && view !== 'sell') view = 'buy';

let saved = 'all';
let page = 0;
// Missions whose full satellite list has been asked for.
const expanded = new Set();

// Satellites are the substance of a mission, so they show by default. A long
// constellation truncates rather than hiding behind a toggle.
const SAT_PREVIEW = 4;

// 25 a page, the size a working list settles at.
const PER_PAGE = 25;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// Nothing here writes anything, so anything that looks like it would says so.
const toast = document.getElementById('toast');
let toastTimer;
function say(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function facts(pairs) {
  const list = el('dl', 'mission-facts');
  for (const [term, detail] of pairs) {
    if (!detail) continue;
    const row = el('div');
    row.append(el('dt', null, term), el('dd', null, detail));
    list.append(row);
  }
  return list;
}

// Every satellite on the mission, in one table. A long constellation truncates
// rather than hiding behind a toggle.
function satellites(row) {
  const wrap = el('div', 'mission-sats');
  const all = row.satellites;
  const open = expanded.has(row.name);
  const shown = open ? all : all.slice(0, SAT_PREVIEW);

  wrap.append(satelliteTable(shown));

  if (all.length > SAT_PREVIEW) {
    const more = el('button', 'sat-link', open
      ? 'Show fewer'
      : `Show all ${all.length} satellites`);
    more.type = 'button';
    more.addEventListener('click', () => {
      if (open) expanded.delete(row.name);
      else expanded.add(row.name);
      render();
    });
    wrap.append(more);
  }

  return wrap;
}

function missionRow(row) {
  const card = el('article', 'mission');

  const href = `/mission.html?id=${encodeURIComponent(row.id)}&view=${view}`;

  const head = el('div', 'mission-head');
  const titles = el('div', 'mission-titles');
  const nameRow = el('div', 'mission-name-row');

  // The name is the link. A list row has one job — open the record — and
  // everything else people might want to do lives on the record itself, behind
  // its tabs, rather than as a menu of buttons on every row.
  const name = el('h3');
  const link = el('a', 'mission-link', row.name);
  link.href = href;
  name.append(link);
  nameRow.append(name, el('span', `chip status ${row.status.toLowerCase()}`, row.status));
  titles.append(nameRow, el('p', 'mission-objective', row.objective));

  const open = el('a', 'ghost', 'Open →');
  open.href = href;

  head.append(titles, open);
  card.append(head);

  card.append(view === 'buy'
    ? facts([
      ['Target budget', row.budget],
      ['Country of manufacture', row.country],
      ['State of registry', row.registration],
      ['Export control status', row.exportControlOther
        ? `${row.exportControl} \u2014 ${row.exportControlOther}`
        : row.exportControl],
      ['Ride preference', row.ride],
      ['Can flex on', row.flexibility?.length ? row.flexibility.join(', ') : 'Nothing'],
      ['Satellites', String(row.satellites.length)],
    ])
    : facts([
      ['Capacity', row.capacity],
      ['Orbit', row.orbit],
      ['Window', row.window],
      ['Payload delivery', row.lMinus],
      ['Site', row.site],
      ['Deployers', row.deployers],
      ['Commercial terms', row.terms],
    ]));

  if (view === 'buy') card.append(satellites(row));
  return card;
}

function render() {
  const rows = MISSION_ROWS[view] ?? [];
  const views = VIEWS[view] ?? VIEWS.buy;
  const chosen = views.find(item => item.key === saved) ?? views[0];
  const shown = rows.filter(chosen.test);

  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  page = Math.min(page, pages - 1);
  const from = page * PER_PAGE;
  const onPage = shown.slice(from, from + PER_PAGE);

  canvas.dataset.view = view;
  canvas.replaceChildren();

  const head = el('div', 'list-head');
  head.append(el('h1', null, view === 'buy' ? 'Missions' : 'Listings'));

  // The one thing a list page is for besides reading it: making another. Filled,
  // top right, the same words the dashboard uses so it reads as the same action.
  const create = view === 'buy'
    ? Object.assign(el('a', 'submit compact', 'Add a Mission'), { href: `/new-mission.html?view=${view}` })
    : el('button', 'submit compact', 'Publish a Listing');
  if (create.tagName === 'BUTTON') {
    create.type = 'button';
    create.addEventListener('click', () => say('Publish a Listing — the listing form is not built in this prototype.'));
  }
  head.append(create);
  canvas.append(head);

  const pager = el('div', 'list-pager');
  pager.append(el('span', 'list-range', shown.length
    ? `${from + 1}–${from + onPage.length} of ${shown.length}`
    : '0 of 0'));
  const back = el('button', 'cal-arrow', '←');
  const forward = el('button', 'cal-arrow', '→');
  back.type = forward.type = 'button';
  back.setAttribute('aria-label', 'Previous page');
  forward.setAttribute('aria-label', 'Next page');
  back.disabled = page === 0;
  forward.disabled = page >= pages - 1;
  back.addEventListener('click', () => { page -= 1; render(); });
  forward.addEventListener('click', () => { page += 1; render(); });
  pager.append(back, forward);

  const layout = el('div', 'list-layout');

  const rail = el('nav', 'list-rail');
  rail.setAttribute('aria-label', 'Views');
  rail.append(el('p', 'rail-heading', 'Views'));
  for (const item of views) {
    const button = el('button', `rail-view${item.key === saved ? ' on' : ''}`);
    button.type = 'button';
    button.append(el('span', null, item.label), el('span', 'rail-count', String(rows.filter(item.test).length)));
    button.addEventListener('click', () => { saved = item.key; page = 0; render(); });
    rail.append(button);
  }

  const column = el('div', 'list-column');
  const list = el('div', 'list-rows');
  list.append(...(onPage.length ? onPage.map(missionRow) : [el('p', 'empty', 'Nothing in this view.')]));
  // Paging sits under the rows, where you arrive at the end of them, rather than
  // competing with the create button for the top right corner.
  column.append(list, pager);

  layout.append(rail, column);
  canvas.append(layout);

  document.getElementById('dash-link').href = `/home.html?view=${view}`;
  document.getElementById('browse-link').href = `/browse.html?view=${view}`;
}

render();

// the avatar menu, which is where the demo role switch now lives
accountMenu(view);
themeToggle();

// Cosmo: summoned from the nav bar, ⌘K, or any element with data-ask
assistant(view);
document.getElementById('ask-button')?.addEventListener('click', () => {
  toggleAssistant(document.getElementById('ask')?.hidden ?? true);
});
