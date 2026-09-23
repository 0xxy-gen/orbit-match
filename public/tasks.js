// Tasks: what is waiting on you.
//
// Nothing here is new information. Every row is already true somewhere else —
// on a deal, on a mission — and this page is a projection of it, the same way
// the dashboard is. That is deliberate: a task list that holds its own state
// drifts from the records it describes, and then people work from the wrong
// one. Tick nothing here; go and do the thing, and the row stops being true.
//
// Two kinds, kept apart because they behave differently. A deal waiting on you
// has a clock somebody else set and a cost for missing it. A loose end on your
// own mission has neither: nobody is waiting, it just is not finished.
import { DEALS, MISSION_ROWS } from './demo-data.js';
import { assistant, toggleAssistant } from './assistant.js';
import { accountMenu } from './account-menu.js';
import { themeToggle } from './theme.js';

const STORE_VIEW = 'orbitmatch:view';
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };

const canvas = document.getElementById('canvas');

let view = new URLSearchParams(location.search).get('view') ?? read(STORE_VIEW) ?? 'buy';
if (view !== 'buy' && view !== 'sell') view = 'buy';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// The clocks in the record are sentences, because that is how they read on a
// deal: "validity ends in 9 days", "expires in 4 business days". Sorting needs
// the number, so it is pulled out rather than stored twice.
const DAYS = /(\d+)\s+(?:business\s+)?day/i;
const daysIn = clock => {
  const found = DAYS.exec(clock ?? '');
  return found ? Number(found[1]) : null;
};

// ── what is waiting ─────────────────────────────────────────────────────────

function waiting() {
  return (DEALS[view] ?? [])
    .filter(deal => deal.waiting?.side === 'you')
    .map(deal => ({
      what: deal.waiting.what,
      where: `${deal.subject} · ${deal.counterpart}`,
      clock: deal.waiting.clock,
      days: daysIn(deal.waiting.clock),
      href: `/deal.html?view=${view}`,
    }))
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999));
}

// Missions of your own that are not finished. No clock, nobody waiting: these
// cost you reach rather than a deadline, so they are listed second and never
// coloured as though they were urgent.
function loose() {
  if (view !== 'buy') return [];
  const out = [];

  for (const row of MISSION_ROWS.buy ?? []) {
    if (row.status === 'Draft') {
      out.push({
        what: 'Not published, so it is matched against nothing',
        where: row.name,
        href: `/mission.html?id=${row.id}&view=buy`,
      });
    }

    const stated = (row.configurations ?? []).some(option => option.added);
    if ((row.satellites ?? []).length > 1 && !stated) {
      out.push({
        what: 'No launch configuration, so sellers will assume any grouping works',
        where: row.name,
        href: `/mission.html?id=${row.id}&view=buy&tab=configuration`,
      });
    }
  }
  return out;
}

// ── page ────────────────────────────────────────────────────────────────────

function taskRow(task) {
  const row = el('a', 'task');
  row.href = task.href;

  const said = el('div', 'task-said');
  said.append(el('span', 'task-what', task.what), el('span', 'task-where', task.where));
  row.append(said);

  if (task.clock) {
    // Five days is the line the dashboard already draws, so it is drawn here
    // too rather than inventing a second idea of urgent.
    const urgent = task.days !== null && task.days <= 5;
    row.append(el('span', `task-clock${urgent ? ' urgent' : ''}`, task.clock));
  }
  return row;
}

function panel(title, note, tasks, empty) {
  const box = el('section', 'box');
  const head = el('div', 'box-head');
  head.append(el('h2', 'box-title', title));
  if (tasks.length) head.append(el('span', 'tab-count', String(tasks.length)));
  box.append(head);
  box.append(el('p', 'task-panel-note', note));

  if (!tasks.length) {
    box.append(el('p', 'empty task-panel-empty', empty));
    return box;
  }

  const list = el('div', 'task-list');
  for (const task of tasks) list.append(taskRow(task));
  box.append(list);
  return box;
}

function render() {
  canvas.dataset.view = view;
  canvas.replaceChildren();

  // No standfirst: each panel already says what it holds, and the page does not
  // need to explain itself above them.
  const head = el('header', 'page-head');
  head.append(el('h1', null, 'Tasks'));
  canvas.append(head);

  const owed = waiting();
  const ends = loose();

  canvas.append(panel(
    'Waiting on you',
    view === 'buy'
      ? 'A seller has done their part and the next move is yours. These have clocks somebody else set.'
      : 'A buyer has done their part and the next move is yours. These have clocks somebody else set.',
    owed,
    'Nothing is waiting on you.',
  ));

  if (view === 'buy') {
    canvas.append(panel(
      'Loose ends',
      'Your own missions, unfinished. Nobody is waiting and no clock is running, but each one costs you reach.',
      ends,
      'Every mission is published and grouped.',
    ));
  }
}

accountMenu();
themeToggle();
assistant(view);
document.getElementById('ask-button')?.addEventListener('click', () => toggleAssistant());
render();
