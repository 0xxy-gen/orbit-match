// One mission, opened from the list.
//
// This is where the depth lives. The list stays a list — name, status, the
// intake facts, the satellites — and everything else moves in here behind
// tabs, so the row does not have to carry a menu of destinations.
//
// Overview is what was entered. Satellites is the eight numbers per spacecraft
// that decide what it can fly on. Procurement is where the mission actually
// stands, and it is one track per launch, never one per mission: a mission of
// three satellites can be on two launches at different points, and a single
// track would have to lie about one of them.
import { MISSION_ROWS, PHASES } from './demo-data.js';
import { satelliteTable } from './satellite-table.js';
import { assistant, toggleAssistant, openAssistant } from './assistant.js';
import { accountMenu } from './account-menu.js';
import { themeToggle } from './theme.js';

const STORE_VIEW = 'orbitmatch:view';
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };

const canvas = document.getElementById('canvas');
const params = new URLSearchParams(location.search);

const LEGACY = { need: 'buy' };
let view = params.get('view') ?? read(STORE_VIEW) ?? 'buy';
view = LEGACY[view] ?? view;
if (view !== 'buy' && view !== 'sell') view = 'buy';

const rows = MISSION_ROWS[view] ?? [];
const row = rows.find(item => item.id === params.get('id')) ?? rows[0];

let tab = params.get('tab') ?? 'overview';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function launchTrack(launch) {
  const wrap = el('div', 'track mini');
  PHASES.forEach((phase, index) => {
    const step = el('div', `track-step${index <= launch.reached ? ' done' : ''}${index === launch.reached ? ' here' : ''}`);
    step.append(el('span', 'track-dot'));
    const labels = el('div', 'track-labels');
    labels.append(el('span', 'track-phase', phase));
    step.append(labels);
    wrap.append(step);
  });
  return wrap;
}

// ── the three panels ────────────────────────────────────────────────────────

function overview() {
  const wrap = el('div', 'mission-panel');
  wrap.append(view === 'buy'
    ? facts([
      ['Target budget', row.budget],
      ['Country of manufacture', row.country],
      ['State of registry', row.registration],
      ['Export control status', row.exportControl],
      ['Ride preference', row.ride],
      ['Can flex on', row.flexibility?.length ? row.flexibility.join(', ') : 'Nothing'],
      ['Satellites', String(row.satellites.length)],
      ['Launches', String((row.launches ?? []).length)],
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
  return wrap;
}

function satellites() {
  const wrap = el('div', 'mission-panel');
  wrap.append(satelliteTable(row.satellites));
  return wrap;
}

function procurement() {
  const wrap = el('div', 'mission-panel launch-groups');
  const launches = row.launches ?? [];

  for (const launch of launches) {
    const on = row.satellites.filter(satellite => satellite.launch === launch.id);

    const group = el('section', 'launch-group');
    const head = el('div', 'launch-head');
    const titles = el('div');
    const name = el('div', 'launch-name');
    name.append(
      el('span', 'launch-listing', launch.listing),
      el('span', 'launch-seller', launch.seller),
      el('span', `chip status ${launch.status.replace(/\s+/g, '-')}`, launch.status),
    );
    titles.append(name, el('p', 'launch-meta',
      `${launch.window} · ${on.length} satellite${on.length === 1 ? '' : 's'} on this launch`
      + (on.length ? ` · ${on.map(satellite => satellite.name).join(', ')}` : '')));

    const open = el('a', 'ghost', 'Open deal →');
    open.href = `/deal.html?view=${view}`;
    head.append(titles, open);

    group.append(head, launchTrack(launch));
    if (launch.detail) group.append(el('p', 'launch-detail', launch.detail));
    wrap.append(group);
  }

  const loose = row.satellites.filter(satellite => !satellite.launch);
  if (loose.length) {
    const group = el('section', 'launch-group loose');
    group.append(
      el('div', 'launch-name', 'Not yet on a launch'),
      el('p', 'launch-meta',
        `${loose.map(satellite => satellite.name).join(', ')} — still matching against published listings.`),
    );
    wrap.append(group);
  }

  if (!wrap.childElementCount) {
    wrap.append(el('p', 'empty', 'Nothing has been requested against this mission yet.'));
  }
  return wrap;
}

// ── page ────────────────────────────────────────────────────────────────────

function render() {
  canvas.dataset.view = view;
  canvas.replaceChildren();

  if (!row) {
    canvas.append(el('p', 'empty', 'No such mission.'));
    return;
  }

  const back = el('a', 'back-link', '← Missions');
  back.href = `/missions.html?view=${view}`;
  canvas.append(back);

  const head = el('div', 'mission-head detail');
  const titles = el('div', 'mission-titles');
  const nameRow = el('div', 'mission-name-row');
  nameRow.append(el('h1', null, row.name), el('span', `chip status ${row.status.toLowerCase()}`, row.status));
  titles.append(nameRow, el('p', 'mission-objective', row.objective));

  // Cosmo belongs here, where there is something to be contextual about — not
  // repeated on every row of a list.
  const ask = el('button', 'ghost ask-inline', 'Ask Cosmo');
  ask.type = 'button';
  ask.addEventListener('click', () => openAssistant(`Summarise the ${row.name} mission and where it stands.`));

  head.append(titles, ask);
  canvas.append(head);

  const panels = view === 'buy'
    ? [
      ['overview', 'Overview', overview],
      ['satellites', `Satellites (${row.satellites.length})`, satellites],
      ['procurement', `Procurement (${(row.launches ?? []).length})`, procurement],
    ]
    : [['overview', 'Overview', overview]];

  if (!panels.some(([key]) => key === tab)) tab = 'overview';

  const bar = el('nav', 'mission-tabs');
  bar.setAttribute('aria-label', 'Mission sections');
  for (const [key, label] of panels) {
    const button = el('button', `mission-tab${key === tab ? ' on' : ''}`, label);
    button.type = 'button';
    button.setAttribute('aria-current', String(key === tab));
    button.addEventListener('click', () => {
      tab = key;
      const url = new URL(location.href);
      url.searchParams.set('tab', key);
      history.replaceState(null, '', url);
      render();
    });
    bar.append(button);
  }
  canvas.append(bar);

  canvas.append(panels.find(([key]) => key === tab)[2]());

  document.getElementById('dash-link').href = `/home.html?view=${view}`;
  document.getElementById('missions-link').href = `/missions.html?view=${view}`;
  document.getElementById('browse-link').href = `/browse.html?view=${view}`;
}

render();

accountMenu(view);
themeToggle();

assistant(view);
document.getElementById('ask-button')?.addEventListener('click', () => {
  toggleAssistant(document.getElementById('ask')?.hidden ?? true);
});
