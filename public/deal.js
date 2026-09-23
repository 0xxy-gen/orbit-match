// One deal, end to end.
//
// Two altitudes. The track at the top is for a glance — five nodes, the phases
// from the spec's derived status. The checklist beneath is the whole
// procurement path, seventeen steps, because someone about to commit millions
// should be able to see the entire road, not a progress bar.
//
// Three honesties in the list. A step with no event is your own work and is
// marked as such, because the other side cannot see it and should not appear to
// be waiting. A negotiation is a loop, so it reports its round rather than
// pretending to be a milestone. Billing has no events in v1 of the flow, so it
// says so instead of sitting there for ever incomplete.
import { DEAL } from './demo-data.js';
import { stepsFor, stepList } from './procurement-path.js';
import { assistant, toggleAssistant, openAssistant } from './assistant.js';
import { accountMenu } from './account-menu.js';
import { themeToggle } from './theme.js';

const STORE_VIEW = 'orbitmatch:view';
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };

const canvas = document.getElementById('canvas');
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

function summaryTrack(deal) {
  const wrap = el('div', 'track');
  deal.summary.forEach((phase, index) => {
    const step = el('div', `track-step${index <= deal.reached ? ' done' : ''}${index === deal.reached ? ' here' : ''}`);
    step.append(el('span', 'track-dot'));
    const labels = el('div', 'track-labels');
    labels.append(el('span', 'track-phase', phase));
    step.append(labels);
    wrap.append(step);
  });
  return wrap;
}

function render() {
  const deal = DEAL;
  canvas.dataset.view = view;
  canvas.replaceChildren();

  const back = el('a', 'back-link', '← Missions');
  back.href = `/missions.html?view=${view}`;
  canvas.append(back);

  const head = el('div', 'deal-head');
  const titles = el('div');
  const line = el('div', 'deal-title');
  line.append(
    el('h1', null, deal.satellite),
    el('span', 'deal-x', '×'),
    el('h1', 'deal-listing', deal.listing),
  );
  titles.append(line, el('p', 'muted', `${deal.mission} · ${deal.seller} · ${deal.window}`));

  const tools = el('div', 'mission-tools');
  const ask = el('button', 'ghost ask-inline', 'Ask Cosmo');
  ask.type = 'button';
  ask.addEventListener('click', () => openAssistant(`What is outstanding on ${deal.satellite} × ${deal.listing}?`));
  tools.append(ask);

  head.append(titles, tools);
  canvas.append(head);

  const chips = el('div', 'deal-chips');
  chips.append(el('span', `chip status ${deal.status.replace(/\s+/g, '-')}`, deal.status));
  chips.append(el('span', `chip wait ${deal.waiting.side}`,
    `${deal.waiting.side === 'you' ? 'You' : 'Them'} — ${deal.waiting.what}`));
  chips.append(el('span', 'listrow-clock', deal.waiting.clock));
  const delivery = el('span', 'listrow-clock');
  delivery.append(document.createTextNode(`Delivery ${deal.delivery} `));
  if (deal.deliveryWas) delivery.append(el('span', 'cal-moved', deal.deliveryWas));
  chips.append(delivery);
  canvas.append(chips);

  const card = el('section', 'deal-card');
  card.append(summaryTrack(deal));
  canvas.append(card);

  const list = el('section', 'steps');
  list.append(el('h2', 'steps-title', 'The whole path'));
  list.append(stepList(stepsFor(deal.reached, deal.marks)));
  canvas.append(list);

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
