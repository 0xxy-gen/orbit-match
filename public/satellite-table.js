// The satellite table, shared by the missions list and one mission.
//
// The columns are the intake form's per-satellite fields, in the order the form
// asks for them and under the same labels. One definition, so the record and
// the form can never drift into saying different things about the same data.
//
// Units live in the header, never in the cell. A column of "68 kg / 12 kg /
// 210 kg" makes you read past the unit on every row to compare the numbers;
// "Mass (kg)" says it once and leaves a clean column of figures. That is also
// why the stored values are bare — the unit is a property of the column, and
// the day someone sorts or filters on mass, the data is already a number.
//
// Two sets, not two tables. The list shows what decides a match; the mission
// itself shows everything that was entered. Both read from ALL, so a column
// added here appears in the right place in both.

export const SAT_COLUMNS = [
  ['name', 'Satellite'],
  ['form', 'Form factor'],
  ['mass', 'Mass (kg)'],
  ['dimensions', 'Dimensions L×W×H (mm)'],
  ['orbit', 'Orbit type'],
  ['inclination', 'Inclination (°)'],
  ['altitude', 'Altitude (km)'],
  ['ltan', 'LTAN'],
  ['window', 'Target window'],
  ['propulsion', 'Propulsion'],
  ['readiness', 'Build status'],
  ['shipBy', 'Ready to ship'],
  ['deployer', 'Deployer compatibility'],
  ['deployerMass', 'Buyer-supplied deployer (kg)'],
];

// The window is a span in the form, so it is a span here too — collapsed to one
// quarter when both ends agree, because "Q4 2026 – Q4 2026" reads as a mistake.
export function windowSpan(satellite) {
  const { windowFrom, windowTo } = satellite;
  if (!windowFrom && !windowTo) return '';
  if (!windowTo || windowTo === windowFrom) return windowFrom;
  if (!windowFrom) return windowTo;
  return `${windowFrom} – ${windowTo}`;
}

import {
  FORM_FACTORS, ORBIT_TYPES, PROPULSION, READINESS, DEPLOYERS, WINDOW_YEARS,
  orbitType, quarterParts, quarterValue, maskClock, grouped, DEPLOYER_MODES, deployerMode,
} from './mission-options.js';

// How each column is edited in place.
//
// Keyed off the same SAT_COLUMNS above, so a column and its editor cannot drift
// apart: add a column there, give it an entry here, and both the reading and
// the writing view pick it up.
//
// The values written are the labels the table already shows, not codes. That is
// only right because the fixture stores labels — when the record stores codes,
// these selects carry {value, label} pairs and the cell renders the label.
const labels = list => list.map(option => option.label);

// Bounds, taken from the same rules the intake form enforces. A record edited
// in a table and a record entered in the form are the same record, so they
// cannot have two standards — the looser one is the one quick corrections use.
function bounds(satellite, key) {
  const type = orbitType(String(satellite.orbit ?? '').toLowerCase().replace(' leo', ''))
    ?? ORBIT_TYPES.find(option => option.label === satellite.orbit);
  if (key === 'altitude') return type?.altitude ?? [150, 36000];
  if (key === 'inclination') return type?.inclination ?? [0, 180];
  if (key === 'mass') return [0.1, 20000];
  if (key === 'deployerMass') return [0.1, 5000];
  return null;
}

const EDITORS = {
  name: { type: 'text' },
  form: { type: 'select', options: () => ['Custom', ...labels(FORM_FACTORS).filter(l => l !== 'Not a CubeSat')] },
  mass: { type: 'number', step: 'any', min: 0.1 },
  dimensions: { type: 'sides' },
  orbit: { type: 'select', options: () => labels(ORBIT_TYPES) },
  inclination: { type: 'number', step: '0.01', min: 0, max: 180 },
  altitude: { type: 'number', step: '1', min: 0 },
  ltan: { type: 'clock' },
  window: { type: 'window' },
  propulsion: { type: 'select', options: () => labels(PROPULSION) },
  readiness: { type: 'select', options: () => labels(READINESS) },
  shipBy: { type: 'month' },
  deployer: { type: 'deployers' },
  deployerMass: { type: 'supply' },
};

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// "Other" is only half an answer — the words after it are the other half, and a
// column that shows "Other" without them has thrown away the useful part. The
// same for a custom deployer: "Custom" tells a seller nothing, the interface
// does.
const cell = (satellite, key) => {
  if (key === 'window') return windowSpan(satellite);
  if (key === 'form') return satellite.form && satellite.form !== 'Custom' ? satellite.form : '—';
  if (key === 'propulsion' && satellite.propulsionOther) {
    return `${satellite.propulsion} — ${satellite.propulsionOther}`;
  }
  // "Custom / to be discussed" was a list option; as a mode it is just the
  // frame around the description, and printing both says the same thing twice.
  if (key === 'deployer' && satellite.deployerOther) {
    return `Custom — ${satellite.deployerOther}`;
  }
  return satellite[key] ?? '—';
};

// Fourteen columns will not fit inside a card at any sane font size, so the
// table scrolls sideways rather than being cut down. Everything the intake
// collects is on the page; the card just does not stretch to hold it.
// One editable control for one field of one satellite. Writes straight into the
// row object: there is no server, so the record in memory is the record.
function editor(satellite, key, index = 0) {
  const spec = EDITORS[key];
  if (!spec) return document.createTextNode(cell(satellite, key) || '—');

  if (spec.type === 'window') {
    // Quarter and year as lists, exactly as the intake form asks for them. Free
    // text here would take "Q3-26" without complaint, and a window that no
    // matcher can parse is worse than a blank one.
    const wrap = el('span', 'cell-window');
    for (const [field, hint] of [['windowFrom', 'Earliest'], ['windowTo', 'Latest']]) {
      const parts = quarterParts(satellite[field]);
      const quarter = el('select', 'cell-input tight');
      quarter.add(new Option('Q–', ''));
      for (const number of ['1', '2', '3', '4']) quarter.add(new Option(`Q${number}`, number));
      quarter.value = parts.quarter;
      quarter.setAttribute('aria-label', `${satellite.name}, ${hint.toLowerCase()} window, quarter`);

      const year = el('select', 'cell-input tight');
      year.add(new Option('Year', ''));
      for (let value = WINDOW_YEARS.min; value <= WINDOW_YEARS.max; value += 1) {
        year.add(new Option(String(value), String(value)));
      }
      year.value = parts.year;
      year.setAttribute('aria-label', `${satellite.name}, ${hint.toLowerCase()} window, year`);

      const write = () => { satellite[field] = quarterValue(quarter.value, year.value); };
      quarter.addEventListener('change', write);
      year.addEventListener('change', write);
      wrap.append(quarter, year);
    }
    return wrap;
  }

  if (spec.type === 'clock') {
    const input = el('input', 'cell-input');
    input.type = 'text';
    input.value = satellite.ltan === '\u2014' ? '' : (satellite.ltan ?? '');
    input.setAttribute('aria-label', `${satellite.name}, LTAN`);
    maskClock(input);
    input.addEventListener('input', () => { satellite.ltan = input.value; });
    return input;
  }

  // Three numbers, as the form asks for them — one text box would accept
  // "700x700" and no matcher can measure that.
  if (spec.type === 'sides') {
    const wrap = el('span', 'cell-sides');
    const sides = String(satellite.dimensions ?? '').split(/\s*\u00d7\s*/).map(part => part.trim());
    const inputs = ['L', 'W', 'H'].map((tag, at) => {
      const input = el('input', 'cell-input side');
      input.type = 'number';
      input.step = 'any';
      input.min = '1';
      input.value = sides[at] ?? '';
      input.setAttribute('aria-label', `${satellite.name}, ${tag}`);
      input.addEventListener('keydown', event => {
        if (['-', '+', 'e', 'E'].includes(event.key)) event.preventDefault();
      });
      return input;
    });
    const write = () => {
      const filled = inputs.map(input => input.value.trim());
      satellite.dimensions = filled.every(Boolean) ? filled.join(' \u00d7 ') : '';
    };
    inputs.forEach((input, at) => {
      input.addEventListener('input', write);
      wrap.append(input);
      if (at < 2) wrap.append(el('span', 'cell-x', '\u00d7'));
    });
    return wrap;
  }

  // A month, as the form asks for it. "Mar 2026" typed freehand is a string
  // nobody can compare against an L\u2212 lead time.
  if (spec.type === 'month') {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const input = el('input', 'cell-input');
    input.type = 'month';
    const match = /^([A-Za-z]{3})\w*\s+(\d{4})$/.exec(String(satellite.shipBy ?? '').trim());
    if (match) {
      const at = MONTHS.findIndex(name => name.toLowerCase() === match[1].toLowerCase());
      if (at >= 0) input.value = `${match[2]}-${String(at + 1).padStart(2, '0')}`;
    }
    input.setAttribute('aria-label', `${satellite.name}, ready to ship by`);
    input.addEventListener('input', () => {
      const [year, month] = input.value.split('-');
      satellite.shipBy = year ? `${MONTHS[Number(month) - 1]} ${year}` : '';
    });
    return input;
  }

  // The form gates the mass behind "I supply the deployer", so this does too:
  // a mass box sitting open invites a number for a dispenser that is the
  // provider's to weigh, and the record then double-counts it.
  if (spec.type === 'supply') {
    const wrap = el('span', 'cell-stack supply-cell');
    const choices = el('span', 'supply-choices');
    let box;

    const mass = el('input', 'cell-input');
    mass.type = 'number';
    mass.step = 'any';
    mass.min = '0.1';
    mass.max = '5000';
    mass.value = satellite.deployerMass ?? '';
    mass.hidden = !satellite.deployerMass;
    mass.placeholder = 'kg';
    mass.setAttribute('aria-label', `${satellite.name}, deployer mass in kg`);
    mass.addEventListener('keydown', event => {
      if (['-', '+', 'e', 'E'].includes(event.key)) event.preventDefault();
    });
    mass.addEventListener('input', () => { satellite.deployerMass = mass.value; });

    for (const [mine, label] of [[false, 'The launch provider'], [true, 'I do']]) {
      const choice = el('label', 'tick small');
      const dot = el('input');
      dot.type = 'radio';
      dot.name = `supply-${satellite.name || Math.random().toString(36).slice(2)}`;
      dot.checked = Boolean(satellite.deployerMass) === mine;
      if (mine) box = dot;
      dot.addEventListener('change', () => {
        mass.hidden = !mine;
        if (!mine) { satellite.deployerMass = ''; mass.value = ''; }
      });
      choice.append(dot, el('span', null, label));
      choices.append(choice);
    }

    wrap.append(choices, mass);
    return wrap;
  }

  // Deployer compatibility: the same three modes the form offers. Choosing a
  // custom interface or "not yet decided" replaces the list rather than adding
  // to it.
  if (spec.type === 'deployers') {
    const wrap = el('span', 'cell-stack');
    let mode = deployerMode(satellite.deployer);
    const held = new Set(mode === 'list'
      ? String(satellite.deployer ?? '').split(',').map(name => name.trim()).filter(Boolean)
      : []);

    const body = el('span', 'cell-ticks');

    const drawBody = () => {
      body.replaceChildren();
      // the container is a grid of options in list mode and a single control
      // otherwise, so it says which it is
      body.className = mode === 'list' ? 'cell-ticks' : 'cell-stack';

      if (mode === 'list') {
        for (const [name, options] of grouped(DEPLOYERS)) {
          if (name) body.append(el('p', 'deployer-group', name));
          for (const option of options) {
            const tick = el('label', 'tick small');
            const box = el('input');
            box.type = 'checkbox';
            box.checked = held.has(option.label);
            box.addEventListener('change', () => {
              if (box.checked) held.add(option.label);
              else held.delete(option.label);
              satellite.deployer = [...held].join(', ');
            });
            const text = el('span', 'tick-text');
            text.append(el('span', null, option.label));
            if (option.size) text.append(el('span', 'tick-size', option.size));
            tick.append(box, text);
            body.append(tick);
          }
        }
        satellite.deployer = [...held].join(', ');
        return;
      }

      if (mode === 'custom') {
        const other = el('input', 'cell-input');
        other.type = 'text';
        other.placeholder = 'Which interface?';
        other.value = satellite.deployerOther ?? '';
        other.setAttribute('aria-label', `${satellite.name}, custom deployer interface`);
        other.addEventListener('input', () => { satellite.deployerOther = other.value; });
        satellite.deployer = 'Custom / to be discussed';
        body.append(other);
        return;
      }

      satellite.deployer = 'Not yet decided';
      satellite.deployerOther = '';
    };

    const modes = el('span', 'supply-choices');
    for (const option of DEPLOYER_MODES) {
      const choice = el('label', 'tick small');
      const dot = el('input');
      dot.type = 'radio';
      dot.name = `deployer-mode-${satellite.name || index}`;
      dot.checked = mode === option.value;
      dot.addEventListener('change', () => {
        mode = option.value;
        if (mode !== 'list') held.clear();
        if (mode !== 'custom') satellite.deployerOther = '';
        drawBody();
      });
      choice.append(dot, el('span', null, option.label));
      modes.append(choice);
    }

    drawBody();
    wrap.append(modes, body);
    return wrap;
  }

  if (spec.type === 'select') {
    const select = el('select', 'cell-input');
    select.setAttribute('aria-label', `${satellite.name}, ${key}`);
    for (const label of spec.options()) select.add(new Option(label, label));
    select.value = satellite[key] ?? '';

    if (key !== 'propulsion') {
      select.addEventListener('change', () => { satellite[key] = select.value; });
      return select;
    }

    const wrap = el('span', 'cell-stack');
    const other = el('input', 'cell-input');
    other.type = 'text';
    other.placeholder = 'Which propellant?';
    other.value = satellite.propulsionOther ?? '';
    other.hidden = satellite.propulsion !== 'Other';
    other.setAttribute('aria-label', `${satellite.name}, propellant`);
    other.addEventListener('input', () => { satellite.propulsionOther = other.value; });

    select.addEventListener('change', () => {
      satellite.propulsion = select.value;
      other.hidden = select.value !== 'Other';
      if (other.hidden) satellite.propulsionOther = '';
    });
    wrap.append(select, other);
    return wrap;
  }

  const input = el('input', 'cell-input');
  input.type = spec.type;
  input.value = satellite[key] ?? '';
  input.setAttribute('aria-label', `${satellite.name}, ${key}`);

  const range = spec.type === 'number' ? bounds(satellite, key) : null;
  if (spec.step) input.step = spec.step;
  if (range) { [input.min, input.max] = range.map(String); input.inputMode = 'decimal'; }

  const check = () => {
    if (!range || !input.value) { input.removeAttribute('aria-invalid'); input.title = ''; return; }
    const value = Number(input.value);
    const bad = !Number.isFinite(value) || value < range[0] || value > range[1];
    input.toggleAttribute('aria-invalid', bad);
    input.title = bad ? `Expected ${range[0]}–${range[1]}.` : '';
  };

  if (spec.type === 'number') {
    // the same keystroke guard the form uses: min/max alone never fires here,
    // because nothing submits
    input.addEventListener('keydown', event => {
      if (['-', '+', 'e', 'E'].includes(event.key)) event.preventDefault();
    });
  }

  input.addEventListener('input', () => {
    if (spec.type === 'number') input.value = input.value.replace(/[-eE+]/g, '');
    satellite[key] = input.value;
    check();
  });
  check();
  return input;
}

export function satelliteTable(list, columns = SAT_COLUMNS, { edit = false, onRemove, onDuplicate } = {}) {
  const scroller = el('div', 'sat-scroll');
  const table = el('table', 'sat-table');

  const thead = el('thead');
  const headRow = el('tr');
  for (const [key, label] of columns) {
    const th = el('th', null, label);
    th.dataset.col = key;
    headRow.append(th);
  }
  thead.append(headRow);

  if (edit) headRow.append(el('th', 'sat-actions-head', ''));
  const body = el('tbody');
  for (const [index, satellite] of list.entries()) {
    const row = el('tr');
    for (const [key] of columns) {
      const td = el('td', key === 'name' ? 'sat-name' : null);
      td.dataset.col = key;
      if (edit) td.append(editor(satellite, key));
      else td.textContent = cell(satellite, key) || '—';
      row.append(td);
    }
    if (edit) {
      const actions = el('td', 'sat-actions');
      // Duplicate first: a constellation is the same satellite several times
      // over, and retyping fourteen fields to add the second one is the thing
      // this table exists to avoid.
      const copy = el('button', 'sat-tool', 'Duplicate');
      copy.type = 'button';
      copy.addEventListener('click', () => onDuplicate?.(index));

      const remove = el('button', 'sat-tool', 'Remove');
      remove.type = 'button';
      remove.addEventListener('click', () => onRemove?.(index));

      actions.append(copy, remove);
      row.append(actions);
    }
    body.append(row);
  }

  table.append(thead, body);
  scroller.append(table);
  return scroller;
}

// ── editing a satellite, expanded ───────────────────────────────────────────
//
// A table is the right shape for reading fourteen columns and the wrong one for
// filling them in: the row runs 1,180px wide, so editing the ship date means
// scrolling past everything else and losing sight of the satellite you are on.
//
// So edit mode drops the grid and uses the same shape the intake form uses —
// one satellite expanded at a time, its fields grouped and wrapped, the rest
// folded to a line. Same editors, same labels, read from the same SAT_COLUMNS;
// only the arrangement changes.

const LABEL = Object.fromEntries(SAT_COLUMNS);

// A column header names what the cell holds; a field label names what it is
// asking. Usually the same words — but the deployer column shows a mass, while
// the question behind it is who supplies the thing.
const EDIT_LABEL = { deployerMass: 'Who supplies the deployer?' };
const fieldLabel = key => EDIT_LABEL[key] ?? LABEL[key] ?? key;

const GROUPS = [
  ['Physical', [['name', 'form', 'mass'], ['dimensions']]],
  ['Orbit', [['orbit', 'inclination', 'altitude'], ['ltan', 'window']]],
  ['Logistics', [['propulsion', 'readiness', 'shipBy'], ['deployer', 'deployerMass']]],
];

function field(satellite, key, index) {
  const wrap = el('div', 'field');
  wrap.append(el('span', 'field-label', fieldLabel(key)), editor(satellite, key, index));
  return wrap;
}

export function satelliteEditor(list, { onRemove, onDuplicate, onRedraw } = {}) {
  const open = new Set([0]);
  const host = el('div', 'sat-editor');

  const draw = () => {
    host.replaceChildren();

    list.forEach((satellite, index) => {
      const shown = open.has(index);
      const block = el('section', `sat-block${shown ? '' : ' folded'}`);

      const head = el('div', 'sat-block-head');
      const fold = el('button', 'sat-fold');
      fold.type = 'button';
      fold.setAttribute('aria-expanded', String(shown));
      const caret = el('span', 'sat-caret');
      caret.innerHTML = '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2.5 8 6l-4 3.5"/></svg>';
      fold.append(caret, el('span', `sat-block-n${satellite.name ? ' named' : ''}`,
        satellite.name || `Satellite ${index + 1}`));
      if (!shown) {
        const line = [satellite.form, satellite.mass && `${satellite.mass} kg`, satellite.orbit, windowSpan(satellite)]
          .filter(Boolean).join(' · ');
        fold.append(el('span', 'sat-block-sum', line || 'Nothing entered yet'));
      }
      fold.addEventListener('click', () => {
        if (shown) open.delete(index);
        else open.add(index);
        draw();
      });

      const tools = el('div', 'sat-block-tools');
      const copy = el('button', 'sat-tool', 'Duplicate');
      copy.type = 'button';
      copy.addEventListener('click', () => onDuplicate?.(index));
      tools.append(copy);
      if (list.length > 1) {
        const remove = el('button', 'sat-tool', 'Remove');
        remove.type = 'button';
        remove.addEventListener('click', () => onRemove?.(index));
        tools.append(remove);
      }

      head.append(fold, tools);
      block.append(head);

      if (shown) {
        for (const [name, rows] of GROUPS) {
          block.append(el('p', 'sat-group', name));
          for (const keys of rows) {
            const row = el('div', `row${keys.length === 3 ? ' three' : ''}`);
            for (const key of keys) row.append(field(satellite, key, index));
            block.append(row);
          }
        }
      }

      host.append(block);
    });

    onRedraw?.();
  };

  draw();
  return host;
}
