// The seventeen steps, drawn wherever a launch is shown.
//
// One renderer, used by the Procurement tab on a mission and by the deal page,
// so the road looks the same whichever door you come in by. The path itself is
// PROCUREMENT_PATH in the fixture; a deal supplies only its own progress, and
// the state of each step is worked out from how far the launch has reached
// rather than stored per step.
import { PROCUREMENT_PATH, PHASE_STEP, PHASES } from './demo-data.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// `reached` is the index into the five summary phases; PHASE_STEP says which
// step on the long path that lands on. Everything before it is done, the step
// itself is where you are, everything after is still to come.
export function stepsFor(reached, marks = {}) {
  const at = PHASE_STEP[reached] ?? 0;
  return PROCUREMENT_PATH.map((step, index) => ({
    ...step,
    ...(marks[step.label] ?? {}),
    state: step.untracked ? 'untracked'
      : index < at ? 'done'
      : index === at ? 'current'
      : 'next',
  }));
}

function stepRow(step, index) {
  const row = el('li', `step-row ${step.state}`);

  const marker = el('span', 'step-marker');
  marker.append(el('span', 'step-dot', step.state === 'done' ? '✓' : String(index + 1)));
  row.append(marker);

  const body = el('div', 'step-body');
  const head = el('div', 'step-head');
  head.append(el('span', 'step-label', step.label));
  if (step.at) head.append(el('span', 'step-at', step.at));
  body.append(head);

  const meta = el('div', 'step-meta');
  // A step with no event is your own work: the other side cannot see it, and
  // saying so stops it reading as though someone is waiting on them.
  if (step.event) meta.append(el('code', null, step.event));
  else if (step.state !== 'untracked') meta.append(el('span', 'step-private', 'your draft · not shared'));
  if (step.actor && step.actor !== '—') meta.append(el('span', 'step-actor', step.actor));
  if (step.rounds) meta.append(el('span', 'step-rounds', step.rounds));
  if (meta.childElementCount) body.append(meta);

  if (step.detail) body.append(el('p', 'step-detail', step.detail));
  if (step.note) body.append(el('p', 'step-note', step.note));

  row.append(body);
  return row;
}

export function stepList(steps) {
  const list = el('ol', 'step-list');
  steps.forEach((step, index) => list.append(stepRow(step, index)));
  return list;
}

// A window onto the path: what just happened, what is happening, what is next.
//
// Seventeen steps answers "show me the whole road before I commit millions",
// which is the deal page's job. Beside three other launches on a mission the
// question is narrower — where are we and what comes next — so the rest folds
// into a count at each end.
//
// Counts rather than an inner scrollbar. A scroll region nested in a card traps
// the page scroll, is invisible until you hover it, and tells you nothing about
// how far along you are. "9 earlier steps" does.
export function stepWindow(steps, { earlier, later, onEarlier, onLater }) {
  const current = steps.findIndex(step => step.state === 'current');
  const at = current < 0 ? steps.length - 1 : current;

  const from = earlier ? 0 : Math.max(0, at - 1);
  const to = later ? steps.length : Math.min(steps.length, at + 2);

  const list = el('ol', 'step-list');

  const fold = (count, where, onClick) => {
    const row = el('li', 'step-more');
    const button = el('button', null, `${count} ${where} step${count === 1 ? '' : 's'}`);
    button.type = 'button';
    button.addEventListener('click', onClick);
    row.append(button);
    return row;
  };

  if (from > 0) list.append(fold(from, 'earlier', onEarlier));
  for (let index = from; index < to; index += 1) list.append(stepRow(steps[index], index));
  if (to < steps.length) list.append(fold(steps.length - to, 'later', onLater));

  return list;
}

// ── the path, folded into its phases ────────────────────────────────────────
//
// Seventeen steps shown at once is a wall, and a wall is read as "this will
// take for ever" rather than "here is the whole road". Windowing it to three
// was worse: it answered where you are and hid how far there is to go, which is
// the question someone about to commit millions actually has.
//
// Phases answer both. Four completed phases collapse to four ticked rows you
// can still open; the one you are in is open by default and shows every step in
// it. The road stays legible end to end, and the detail is where you are.
//
// No percentage. "Form completion 100%" is a vanity metric — the share of
// fields filled is not progress towards a booked launch. "3 of 8 steps done" is
// a real count of real things, so that is what it says.

const stateOf = (steps, at) => {
  const mine = steps.filter(step => step.phase === at);
  if (mine.some(step => step.state === 'current')) return 'current';
  return mine.every(step => step.state === 'done' || step.state === 'untracked') ? 'done' : 'next';
};

// What a phase says about itself on the right, which depends on where it is.
function phaseMeta(steps, at, state) {
  const mine = steps.filter(step => step.phase === at);
  const tracked = mine.filter(step => !step.untracked);

  if (state === 'done') {
    const landed = steps[PHASE_STEP[at]];
    return landed?.at ? `Done · ${landed.at}` : 'Done';
  }
  if (state === 'current') {
    const done = tracked.filter(step => step.state === 'done').length;
    return `In progress · ${done} of ${tracked.length} done`;
  }
  return 'Not started';
}

export function phasePath(steps, { open, onOpen }) {
  const wrap = el('div', 'phase-path');

  PHASES.forEach((name, at) => {
    const mine = steps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => step.phase === at);
    if (!mine.length) return;

    const state = stateOf(steps, at);
    const showing = open.has(at);

    const section = el('section', `phase ${state}${showing ? ' open' : ''}`);

    const head = el('button', 'phase-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', String(showing));
    head.addEventListener('click', () => onOpen(at));

    const mark = el('span', 'phase-mark', state === 'done' ? '✓' : '');
    head.append(mark, el('span', 'phase-name', name));
    head.append(el('span', 'phase-meta', phaseMeta(steps, at, state)));
    head.append(el('span', 'phase-count', `${mine.length} step${mine.length === 1 ? '' : 's'}`));
    head.append(el('span', 'phase-chevron', showing ? '⌃' : '⌄'));
    section.append(head);

    if (showing) {
      const list = el('ol', 'step-list');
      // numbered against the whole path, not the phase: step 11 of seventeen is
      // the number people quote to each other, and restarting at 1 in every
      // phase would invent a second numbering nobody uses.
      for (const { step, index } of mine) list.append(stepRow(step, index));
      section.append(list);
    }

    wrap.append(section);
  });

  return wrap;
}

// Which phase to open when the page loads: the one you are in.
export const livePhase = steps =>
  steps.find(step => step.state === 'current')?.phase ?? PHASES.length - 1;
