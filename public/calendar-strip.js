// Delivery & launch calendar: one month on the left, its dates on the right.
//
// Three spans, switched like a calendar app: month, quarter, year. Day and week
// are deliberately absent — a launch buyer has a handful of dated events a year,
// so those views would be empty almost every time they were opened. Quarter is
// here because a launch window is written as one (Q3 2026).
//
// An empty span still says something useful: what the next date is, and when.
//
// Hollow marks a payload delivery deadline (window + L−), filled marks the
// launch. A day struck through is where a date sat before WindowChanged moved
// it, so a slip leaves a trace in the calendar as well as in the list.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = MONTHS.map(name => name.slice(0, 3));
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const AGENDA = 5;

const el = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const day = 86400000;
const key = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const fmt = date => `${date.getDate()} ${SHORT[date.getMonth()]} ${date.getFullYear()}`;
const mondayFirst = date => (date.getDay() + 6) % 7;

function distance(date, today) {
  const days = Math.round((date - today) / day);
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 45) return `in ${days} days`;
  const months = Math.round(days / 30.4);
  return `in ${months} month${months === 1 ? '' : 's'}`;
}

export function calendarStrip(options = {}) {
  // The grid always draws — an empty month is still a calendar. Only the list
  // beside it changes, to a single line.
  const view = options.view === 'sell' ? 'sell' : 'buy';
  const today = options.today ? new Date(options.today) : new Date();
  const items = (options.items ?? [])
    .map(item => ({ ...item, at: new Date(item.date), was: item.previous ? new Date(item.previous) : null }))
    .sort((a, b) => a.at - b.at);

  const root = el('div', 'cal');

  const byDay = new Map();
  const ghosts = new Set();
  for (const item of items) {
    byDay.set(key(item.at), [...(byDay.get(key(item.at)) ?? []), item]);
    if (item.was) ghosts.add(key(item.was));
  }

  let cursor = { year: today.getFullYear(), month: today.getMonth() };
  let mode = options.mode ?? 'month';   // month | quarter | year
  let pickedDay = null;

  // Which months the current span covers, and what to call it.
  function span() {
    if (mode === 'year') {
      return {
        months: Array.from({ length: 12 }, (unused, index) => ({ year: cursor.year, month: index })),
        label: String(cursor.year),
      };
    }
    if (mode === 'quarter') {
      const first = Math.floor(cursor.month / 3) * 3;
      return {
        months: [0, 1, 2].map(offset => ({ year: cursor.year, month: first + offset })),
        label: `Q${first / 3 + 1} ${cursor.year}`,
      };
    }
    return { months: [cursor], label: `${MONTHS[cursor.month]} ${cursor.year}` };
  }

  const inSpan = date => span().months
    .some(part => date.getFullYear() === part.year && date.getMonth() === part.month);

  const month = el('div', 'cal-month-panel');
  const side = el('aside', 'cal-side');
  const split = el('div', 'cal-split');
  split.append(month, side);
  root.append(split);

  const step = delta => {
    const months = mode === 'year' ? 12 : mode === 'quarter' ? 3 : 1;
    const next = new Date(cursor.year, cursor.month + delta * months, 1);
    cursor = { year: next.getFullYear(), month: next.getMonth() };
    pickedDay = null;
    draw();
  };

  // One month, drawn the way a calendar is: a full block of weeks, with the
  // days either side of the month shown greyed rather than left as holes.
  function monthGrid(part, compact) {
    const wrap = el('div', 'cal-month');
    if (mode !== 'month') {
      // Just the month: the header above already carries the year.
      wrap.append(el('div', 'cal-month-label', MONTHS[part.month]));
    }

    const card = el('div', 'cal-card');
    const header = el('div', 'cal-grid cal-head-row');
    for (const [index, name] of DOW.entries()) {
      header.append(el('span', `cal-dow${index > 4 ? ' weekend' : ''}`, compact ? name[0] : name.toUpperCase()));
    }
    card.append(header);

    const grid = el('div', 'cal-grid');
    const first = new Date(part.year, part.month, 1);
    const lead = mondayFirst(first);
    const days = new Date(part.year, part.month + 1, 0).getDate();
    const before = new Date(part.year, part.month, 0).getDate();

    for (let index = lead; index > 0; index--) {
      grid.append(el('span', 'cal-day out', String(before - index + 1)));
    }

    for (let number = 1; number <= days; number++) {
      const date = new Date(part.year, part.month, number);
      const on = byDay.get(key(date)) ?? [];
      const kinds = new Set(on.map(item => item.kind));

      const weekend = mondayFirst(date) > 4;
      const cell = on.length ? el('button', 'cal-day') : el('span', 'cal-day');
      if (weekend) cell.classList.add('weekend');
      cell.setAttribute('aria-label', `${number} ${MONTHS[part.month]} ${part.year}`);
      cell.append(el('span', 'cal-num', String(number)));

      if (on.length) {
        cell.type = 'button';
        cell.classList.add('has');
        const marks = el('span', 'cal-marks');
        for (const kind of ['delivery', 'launch']) {
          if (kinds.has(kind)) marks.append(el('span', `cal-mark ${kind}`));
        }
        cell.append(marks);
        cell.title = on.map(item => `${item.subject} · ${item.kind}`).join('\n');
        cell.addEventListener('click', () => {
          pickedDay = pickedDay === key(date) ? null : key(date);
          draw();
        });
      }

      if (ghosts.has(key(date))) cell.classList.add('ghost');
      if (key(date) === key(today)) {
        cell.classList.add('today');
        cell.setAttribute('aria-current', 'date');
      }
      if (pickedDay === key(date)) {
        cell.classList.add('on');
        cell.setAttribute('aria-pressed', 'true');
      }
      grid.append(cell);
    }

    const trail = (7 - ((lead + days) % 7)) % 7;
    for (let number = 1; number <= trail; number++) grid.append(el('span', 'cal-day out', String(number)));

    card.append(grid);
    wrap.append(card);
    return wrap;
  }

  function drawMonth() {
    month.replaceChildren();
    const current = span();

    const head = el('div', 'cal-month-head');
    const title = el('div', 'cal-month-title');
    title.append(el('span', 'cal-month-name', current.label));

    // month · quarter · year — no day or week, they would be empty
    const modes = el('div', 'cal-modes');
    modes.setAttribute('role', 'group');
    modes.setAttribute('aria-label', 'Calendar span');
    for (const value of ['month', 'quarter', 'year']) {
      const button = el('button', 'cal-mode', value[0].toUpperCase() + value.slice(1));
      button.type = 'button';
      button.setAttribute('aria-pressed', String(value === mode));
      button.addEventListener('click', () => { mode = value; pickedDay = null; draw(); });
      modes.append(button);
    }

    // [Today] [←] [→] — one cluster, always present so the header never shifts,
    // and disabled while today is already on screen so its state says where you are.
    const nav = el('div', 'cal-nav');

    const now = el('button', 'cal-today', 'Today');
    now.type = 'button';
    now.disabled = inSpan(today);
    now.addEventListener('click', () => {
      cursor = { year: today.getFullYear(), month: today.getMonth() };
      pickedDay = null;
      draw();
    });

    const back = el('button', 'cal-arrow', '←');
    const forward = el('button', 'cal-arrow', '→');
    back.type = forward.type = 'button';
    back.setAttribute('aria-label', `Previous ${mode}`);
    forward.setAttribute('aria-label', `Next ${mode}`);
    back.addEventListener('click', () => step(-1));
    forward.addEventListener('click', () => step(1));
    nav.append(now, back, forward);

    head.append(title, modes, nav);
    month.append(head);

    const months = el('div', 'cal-months');
    months.dataset.mode = mode;
    for (const part of current.months) months.append(monthGrid(part, mode === 'year'));
    month.append(months);

  }

  function drawSide() {
    side.replaceChildren();

    // The list is what is coming, not what the calendar happens to be showing —
    // so paging to 2023 does not empty it. Picking a day narrows it to that day.
    const upcoming = items.filter(item => item.at >= new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    const rows = pickedDay ? items.filter(item => key(item.at) === pickedDay) : upcoming;

    const head = el('div', 'cal-side-head');
    head.append(el('span', 'cal-side-title', pickedDay ? fmt(rows[0]?.at ?? today) : 'Upcoming Events'));

    if (pickedDay) {
      const clear = el('button', 'quiet-link', 'Upcoming');
      clear.type = 'button';
      clear.addEventListener('click', () => { pickedDay = null; draw(); });
      head.append(clear);
    } else if (rows.length) {
      head.append(el('span', 'cal-side-count', `${rows.length} event${rows.length === 1 ? '' : 's'}`));
    }
    side.append(head);

    if (!rows.length) {
      side.append(el('p', 'cal-empty', 'No upcoming events.'));
      return;
    }

    for (const item of rows.slice(0, AGENDA)) {
      const row = el('div', 'cal-row');
      row.append(el('span', `cal-dot ${item.kind}`));

      const body = el('span', 'cal-row-body');
      const top = el('span', 'cal-row-top');
      top.append(el('span', 'cal-subject', item.subject), el('span', 'cal-kind', item.kind));

      const bottom = el('span', 'cal-row-bottom');
      bottom.append(el('span', 'cal-date', fmt(item.at)), el('span', 'cal-when', distance(item.at, today)));
      if (item.note) bottom.append(el('span', 'cal-note', item.note));
      if (item.was) bottom.append(el('span', 'cal-moved', `moved from ${fmt(item.was)}`));

      body.append(top, bottom, el('span', 'cal-counterpart', item.counterpart));
      row.append(body);
      side.append(row);
    }

    if (rows.length > AGENDA) {
      side.append(el('p', 'cal-more', `${rows.length - AGENDA} more further out`));
    }
  }

  function draw() {
    drawMonth();
    drawSide();
  }

  draw();
  return root;
}
