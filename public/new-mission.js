// Add a Mission — the intake form.
//
// The form is in two halves because the data is. The mission half is written
// once: what it is for, what it may cost, and the three compliance answers that
// decide which providers and which launch sites are even legal for you. The
// satellite half repeats, because a mission is a set of spacecraft and the
// matching is done per spacecraft — mass, envelope, orbit, window, deployer.
// Nothing above the satellite blocks can match anything on its own.
//
// Dimensions are three inputs, not one. "700 × 700 × 700" typed as text is a
// string someone has to parse later; three numbers are three numbers, and the
// table can format them however it likes.
//
// NOTHING IS SAVED. There is no server in this prototype, so submitting shows
// you what you entered and says so. When there is one, this form should POST
// the same shape the summary prints and let the server re-run validate.js.
import {
  EXPORT_CONTROL, RIDE_PREFERENCES, DEPLOYERS, FLEXIBILITY, FORM_FACTORS,
  PROPULSION, READINESS, COUNTRIES, ORBIT_TYPES, orbitType, WINDOW_YEARS,
  quarterParts, quarterValue, labelFor, valueFor, maskClock, grouped, DEPLOYER_MODES,
} from './mission-options.js';
import { MISSION_ROWS } from './demo-data.js';
import { validateMission } from './validate.js';
import { assistant, toggleAssistant, openAssistant } from './assistant.js';
import { documentIntake } from './intake-assist.js';
import { accountMenu } from './account-menu.js';
import { themeToggle } from './theme.js';

// Demo setting, the same one the sign-up and log-in forms carry. false: fields
// turn red as you leave them, but the button still goes through, so the flow
// can be walked without typing. true: the button stops on the first problem,
// which is how it should behave once a server is behind it.
const ENFORCE_ON_SUBMIT = false;

const STORE_VIEW = 'orbitmatch:view';
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };

const LEGACY = { need: 'buy' };
let view = new URLSearchParams(location.search).get('view') ?? read(STORE_VIEW) ?? 'buy';
view = LEGACY[view] ?? view;
if (view !== 'buy' && view !== 'sell') view = 'buy';

// One form, two modes. ?id= turns New mission into Edit mission rather than
// building a second set of fourteen satellite fields somewhere else — two
// copies of a form is two places for a field to be forgotten.
const editing = MISSION_ROWS[view]?.find(row => row.id === new URLSearchParams(location.search).get('id')) ?? null;

const form = document.getElementById('mission');
const list = document.getElementById('satellites');

const MISSION_FIELDS = ['name', 'objective', 'budget', 'sellerNotes', 'country', 'registration', 'exportControl', 'ride'];

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// ── the satellites, which are the part that repeats ─────────────────────────

const blank = () => ({
  name: '', form: '', mass: '', length: '', width: '', height: '',
  orbit: '', inclination: '', altitude: '', ltan: '', windowFrom: '', windowTo: '', deployers: [],
  propulsion: '', propulsionOther: '', readiness: '', shipBy: '',
  deployerMode: 'list', deployerOther: '',
  suppliesDeployer: false, deployerMass: '',
});

let satellites = [blank()];

// Which blocks have been touched, so a fresh block is not red before it has
// been filled in.
const touched = new Set();

// A constellation of eight satellites is eight identical blocks and an
// unusable page, so a satellite folds to one line once you leave it. The one
// you are working on is open; the rest read as a list you can scan.
const open = new Set([0]);

// What the buyer will let the matcher widen. Empty means every number is hard.
let flexibility = [];

// Sun-synchronous orbits are the only ones where LTAN means anything: a near-
// polar inclination at LEO altitude. Asking for it on a 51.6° orbit is asking
// for a number that does not exist, so the field says so and stays out of the
// way until the orbit calls for it.
const isSunSync = satellite => {
  const inclination = Number(satellite.inclination);
  const altitude = Number(satellite.altitude);
  return inclination >= 95 && inclination <= 102 && altitude >= 300 && altitude <= 1400;
};

// What a folded satellite says about itself.
function summarise(satellite) {
  const parts = [];
  if (satellite.form && satellite.form !== 'custom') parts.push(satellite.form);
  if (satellite.mass) parts.push(`${satellite.mass} kg`);
  const sides = [satellite.length, satellite.width, satellite.height];
  if (sides.every(Boolean)) parts.push(`${sides.join(' \u00d7 ')} mm`);
  if (satellite.altitude) parts.push(`${satellite.altitude} km`);
  if (satellite.inclination) parts.push(`${satellite.inclination}\u00b0`);
  if (satellite.windowFrom) {
    parts.push(satellite.windowTo && satellite.windowTo !== satellite.windowFrom
      ? `${satellite.windowFrom} \u2013 ${satellite.windowTo}`
      : satellite.windowFrom);
  }
  return parts.join(' \u00b7 ');
}

// Bounds, in one place and matching the rules in validate.js. A satellite has
// no negative mass and an orbit has no negative altitude, so those are not
// mistakes to be reported after the fact — they are values the field should
// never accept in the first place.
const MASS = ['mass', 'Mass (kg)', '68', { step: 'any', min: 0.1, max: 20000 },
  'Wet mass of the spacecraft alone, propellant included, deployer excluded.'];

// The orbit decides what counts as a sane altitude and inclination, so the two
// number fields take their bounds from whatever type is selected.
const orbitNumbers = satellite => {
  const type = orbitType(satellite.orbit);
  const [altLow, altHigh] = type?.altitude ?? [150, 36000];
  const [incLow, incHigh] = type?.inclination ?? [0, 180];
  return [
    ['inclination', 'Inclination (°)', '97.45', { step: '0.01', min: incLow, max: incHigh }],
    ['altitude', 'Altitude (km)', '520', { step: '1', min: altLow, max: altHigh }],
  ];
};

const SIDE = { step: 'any', min: 1, max: 10000 };

// A number field that cannot hold a non-number.
//
// min/max alone are advisory — the browser will let you type -520 and only
// complain on submit, and this form deliberately never blocks submit. So the
// characters that make a negative or an exponent are refused at the keystroke,
// and anything pasted in is stripped. The bounds stay on the element too, for
// the spinner, for a screen reader, and as documentation of the rule.
function numeric(input, { step, min, max }) {
  input.type = 'number';
  input.step = step;
  input.min = String(min);
  input.max = String(max);
  input.inputMode = step === '1' ? 'numeric' : 'decimal';

  input.addEventListener('keydown', event => {
    if (['-', '+', 'e', 'E'].includes(event.key)) event.preventDefault();
  });
  input.addEventListener('input', () => {
    if (input.value.includes('-') || input.value.includes('e')) {
      input.value = input.value.replace(/[-eE+]/g, '');
    }
  });
  return input;
}

function numberField(index, key, label, placeholder, bounds, hint) {
  const field = el('div', 'field');
  const id = `sat-${index}-${key}`;
  const tag = el('label', null, label);
  tag.htmlFor = id;

  const input = numeric(el('input'), bounds);
  input.id = input.name = id;
  input.placeholder = placeholder;
  input.value = satellites[index][key];
  input.setAttribute('aria-describedby', `${id}-error`);
  input.addEventListener('input', () => {
    satellites[index][key] = input.value;
    setError(id, '');
    tally();
    // altitude and inclination decide whether LTAN is a real question
    if (key === 'altitude' || key === 'inclination') syncLtan(index);
  });

  const error = el('p', 'error');
  error.id = `${id}-error`;
  error.setAttribute('aria-live', 'polite');

  field.append(tag, input);
  if (hint) {
    const note = el('p', 'hint', hint);
    note.id = `${id}-hint`;
    input.setAttribute('aria-describedby', `${note.id} ${id}-error`);
    field.append(note);
  }
  field.append(error);
  return field;
}

// "Other" is not an answer, it is a promise to give one.
//
// Whenever a choice means the list did not cover it, the field that says what
// it actually is appears directly underneath — inline, not in a dialog. A
// dialog for one line of text takes over the page, hides the question the
// answer belongs to, and has to be dismissed before you can check what you
// picked. Inline keeps the pair together and keeps the page scrollable.
function revealField({ id, label, placeholder, value, onInput }) {
  const field = el('div', 'field reveal-field');
  const tag = el('label', null, label);
  tag.htmlFor = id;

  const input = el('input');
  input.id = input.name = id;
  input.type = 'text';
  input.maxLength = 120;
  input.placeholder = placeholder;
  input.value = value ?? '';
  input.setAttribute('aria-describedby', `${id}-error`);
  input.addEventListener('input', () => { onInput(input.value); setError(id, ''); });

  const error = el('p', 'error');
  error.id = `${id}-error`;
  error.setAttribute('aria-live', 'polite');

  field.append(tag, input, error);
  return field;
}

// A labelled select bound to one field of one satellite.
function selectField(satellite, index, key, label, options, prompt, onChange) {
  const field = el('div', 'field');
  const id = `sat-${index}-${key}`;
  const tag = el('label', null, label);
  tag.htmlFor = id;

  const select = el('select');
  select.id = select.name = id;
  select.add(new Option(prompt, ''));
  for (const option of options) select.add(new Option(option.label, option.value));
  select.value = satellite[key] ?? '';
  select.classList.toggle('placeholder', !select.value);
  select.setAttribute('aria-describedby', `${id}-error`);
  select.addEventListener('change', () => {
    satellite[key] = select.value;
    select.classList.toggle('placeholder', !select.value);
    setError(id, '');
    onChange?.();
  });

  const error = el('p', 'error');
  error.id = `${id}-error`;
  error.setAttribute('aria-live', 'polite');

  field.append(tag, select, error);
  return field;
}

function satelliteBlock(satellite, index) {
  const shown = open.has(index);
  const block = el('section', `sat-block${shown ? '' : ' folded'}`);

  const head = el('div', 'sat-block-head');

  // The whole header folds the block. Once a satellite has a name it wears it,
  // so a folded list reads as Aurora-1, Aurora-2, Aurora-T rather than three
  // identical rows of "Satellite n".
  const fold = el('button', 'sat-fold');
  fold.type = 'button';
  fold.setAttribute('aria-expanded', String(shown));
  const caret = el('span', 'sat-caret');
  caret.innerHTML = '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2.5 8 6l-4 3.5"/></svg>';
  fold.append(caret, el('span', `sat-block-n${satellite.name ? ' named' : ''}`,
    satellite.name || `Satellite ${index + 1}`));
  if (!shown) {
    const line = summarise(satellite);
    fold.append(el('span', 'sat-block-sum', line || 'Nothing entered yet'));
  }
  fold.addEventListener('click', () => {
    if (shown) open.delete(index);
    else open.add(index);
    renderSatellites();
  });
  head.append(fold);

  const tools = el('div', 'sat-block-tools');
  const copy = el('button', 'sat-tool', 'Duplicate');
  copy.type = 'button';
  copy.addEventListener('click', () => {
    satellites.splice(index + 1, 0, { ...satellite, deployers: [...satellite.deployers], name: '' });
    open.clear();
    open.add(index + 1);
    renderSatellites();
  });
  tools.append(copy);

  if (satellites.length > 1) {
    const remove = el('button', 'sat-tool', 'Remove');
    remove.type = 'button';
    remove.addEventListener('click', () => {
      satellites.splice(index, 1);
      open.delete(index);
      renderSatellites();
    });
    tools.append(remove);
  }
  head.append(tools);
  block.append(head);

  if (!shown) return block;

  // Twelve fields at identical weight is a wall. Three quiet groups — what it
  // is, where it is going, what it takes to get it there — give the eye
  // somewhere to rest without adding a single new control.
  const group = name => block.append(el('p', 'sat-group', name));
  group('Physical');

  // name
  const nameField = el('div', 'field');
  const nameId = `sat-${index}-name`;
  const nameLabel = el('label', null, 'Satellite name');
  nameLabel.htmlFor = nameId;
  const nameInput = el('input');
  nameInput.id = nameInput.name = nameId;
  nameInput.type = 'text';
  nameInput.maxLength = 60;
  nameInput.placeholder = 'Aurora-1';
  nameInput.value = satellite.name;
  nameInput.setAttribute('aria-describedby', `${nameId}-error`);
  nameInput.addEventListener('input', () => { satellite.name = nameInput.value; setError(nameId, ''); });
  const nameError = el('p', 'error');
  nameError.id = `${nameId}-error`;
  nameError.setAttribute('aria-live', 'polite');
  nameField.append(nameLabel, nameInput, nameError);
  block.append(nameField);

  // form factor: a shortcut into the dimensions, not a rival to them
  const formField = el('div', 'field');
  const formId = `sat-${index}-form`;
  const formLabel = el('label', null, 'Form factor');
  formLabel.htmlFor = formId;
  const formSelect = el('select');
  formSelect.id = formSelect.name = formId;
  formSelect.add(new Option('Choose a size', ''));
  for (const { value, label } of FORM_FACTORS) formSelect.add(new Option(label, value));
  formSelect.value = satellite.form ?? '';
  formSelect.classList.toggle('placeholder', !formSelect.value);
  const formHint = el('p', 'hint');
  formHint.id = `${formId}-hint`;
  formSelect.setAttribute('aria-describedby', formHint.id);

  const describeForm = () => {
    const chosen = FORM_FACTORS.find(option => option.value === formSelect.value);
    formHint.textContent = chosen?.dims
      ? `Standard ${chosen.label} envelope, filled in below — edit it if yours differs. Dispensers usually cap a ${chosen.label} at about ${chosen.mass} kg.`
      : 'A CubeSat size fills the dimensions below. Anything else, enter them yourself.';
  };
  describeForm();

  formSelect.addEventListener('change', () => {
    satellite.form = formSelect.value;
    formSelect.classList.toggle('placeholder', !formSelect.value);
    const chosen = FORM_FACTORS.find(option => option.value === formSelect.value);
    if (chosen?.dims) {
      [satellite.length, satellite.width, satellite.height] = chosen.dims.map(String);
      // the boxes are the record, so they are what gets written
      for (const side of ['length', 'width', 'height']) setError(`sat-${index}-${side}`, '');
      renderSatellites();
      return;
    }
    describeForm();
  });
  const formError = el('p', 'error');
  formError.id = `${formId}-error`;
  formError.setAttribute('aria-live', 'polite');
  formSelect.setAttribute('aria-describedby', `${formHint.id} ${formError.id}`);
  formField.append(formLabel, formSelect, formHint, formError);
  block.append(formField);

  // dimensions: three boxes, because that is three numbers
  const dims = el('div', 'field');
  dims.append(el('span', 'field-label', 'Dimensions L × W × H (mm)'));
  const boxes = el('div', 'dims');
  for (const side of ['length', 'width', 'height']) {
    const id = `sat-${index}-${side}`;
    const wrap = el('div', 'dim');
    const input = numeric(el('input'), SIDE);
    input.id = input.name = id;
    input.placeholder = '700';
    input.value = satellite[side];
    input.setAttribute('aria-label', `${side} in millimetres`);
    input.setAttribute('aria-describedby', `${id}-error`);
    input.addEventListener('input', () => {
      satellite[side] = input.value;
      // typed over a stock envelope, so it is no longer that form factor
      if (satellite.form !== 'custom') {
        const stock = FORM_FACTORS.find(option => option.value === satellite.form);
        const sides = [satellite.length, satellite.width, satellite.height];
        if (stock?.dims && stock.dims.some((value, at) => String(value) !== sides[at])) {
          satellite.form = 'custom';
          formSelect.value = 'custom';
          describeForm();
        }
      }
      setError(id, '');
      tally();
    });
    const error = el('p', 'error');
    error.id = `${id}-error`;
    error.setAttribute('aria-live', 'polite');
    // three identical boxes need to say which is which on the page, not only
    // to a screen reader
    wrap.append(el('span', 'dim-tag', side[0].toUpperCase()), input, error);
    boxes.append(wrap);
    if (side !== 'height') boxes.append(el('span', 'dim-x', '×'));
  }
  dims.append(boxes);
  block.append(dims);

  const [massKey, massLabel, massPlaceholder, massBounds, massHint] = MASS;
  block.append(numberField(index, massKey, massLabel, massPlaceholder, massBounds, massHint));

  // the orbit numbers
  group('Orbit');

  // the orbit first, because it is what the two numbers below it mean
  block.append(selectField(satellite, index, 'orbit', 'Orbit type', ORBIT_TYPES, 'Choose an orbit', () => {
    const type = orbitType(satellite.orbit);
    if (type?.fill) [satellite.altitude, satellite.inclination] = type.fill.map(String);
    if (!type?.ltan) satellite.ltan = '';
    renderSatellites();
  }));

  const chosen = orbitType(satellite.orbit);
  if (chosen?.note) {
    const note = el('p', 'hint', chosen.note);
    note.id = `sat-${index}-orbit-hint`;
    block.append(note);
  }

  const row = el('div', 'row');
  for (const [key, label, placeholder, bounds, hint] of orbitNumbers(satellite)) {
    row.append(numberField(index, key, label, placeholder, bounds, hint));
  }
  block.append(row);

  // LTAN and the window
  const row2 = el('div', 'row');

  const ltanField = el('div', 'field');
  const ltanId = `sat-${index}-ltan`;
  const ltanLabel = el('label', null, 'LTAN');
  ltanLabel.htmlFor = ltanId;
  const ltan = el('input');
  ltan.id = ltan.name = ltanId;
  ltan.type = 'text';
  ltan.placeholder = '10:30';
  ltan.value = satellite.ltan;
  maskClock(ltan);
  ltan.setAttribute('aria-describedby', `${ltanId}-hint ${ltanId}-error`);
  ltan.addEventListener('input', () => { satellite.ltan = ltan.value; setError(ltanId, ''); });
  const ltanHint = el('p', 'hint');
  ltanHint.id = `${ltanId}-hint`;
  const ltanError = el('p', 'error');
  ltanError.id = `${ltanId}-error`;
  ltanError.setAttribute('aria-live', 'polite');
  ltanField.append(ltanLabel, ltan, ltanHint, ltanError);

  row2.append(ltanField);
  block.append(row2);
  ltanField.dataset.ltan = String(index);

  // A window is a span, not a date. Almost nobody needs exactly one quarter —
  // they need "not before this, not after that" — and a seller can only tell
  // whether a launch fits if they know both ends.
  const windowField = el('div', 'field');
  windowField.append(el('span', 'field-label', 'Target window'));
  const range = el('div', 'range');

  // A quarter and a year, each a short list. Four quarters and fifteen years are
  // both small enough to pick from, and picking cannot be mistyped — no parsing,
  // no "q3 26" to guess at, no year that reads 202 because someone tabbed early.
  const makeWindow = (key, labelText) => {
    const id = `sat-${index}-${key}`;
    const wrap = el('div', 'range-part');
    const box = el('div', 'quarter');
    box.id = id;
    const parts = quarterParts(satellite[key]);

    const write = () => {
      satellite[key] = quarterValue(quarter.value, year.value);
      // Filling only the earliest almost always means a single quarter, so the
      // latest follows it until someone says otherwise.
      if (key === 'windowFrom' && satellite[key] && !satellite.windowTo) {
        satellite.windowTo = satellite[key];
        renderSatellites();
        return;
      }
      setError(id, '');
      setError(`sat-${index}-windowTo`, '');
      tally();
    };

    const quarter = el('select', 'quarter-n');
    quarter.id = `${id}-q`;
    quarter.add(new Option('Q\u2013', ''));
    for (const number of ['1', '2', '3', '4']) quarter.add(new Option(`Q${number}`, number));
    quarter.value = parts.quarter;
    quarter.classList.toggle('placeholder', !parts.quarter);
    quarter.setAttribute('aria-label', `${labelText} window, quarter`);
    quarter.addEventListener('change', () => {
      quarter.classList.toggle('placeholder', !quarter.value);
      write();
    });

    const year = el('select', 'quarter-y');
    year.id = `${id}-y`;
    year.add(new Option('Year', ''));
    for (let value = WINDOW_YEARS.min; value <= WINDOW_YEARS.max; value += 1) {
      year.add(new Option(String(value), String(value)));
    }
    year.value = parts.year;
    year.classList.toggle('placeholder', !parts.year);
    year.setAttribute('aria-label', `${labelText} window, year`);
    year.addEventListener('change', () => {
      year.classList.toggle('placeholder', !year.value);
      write();
    });

    box.append(quarter, year);
    box.setAttribute('aria-describedby', `${id}-error`);

    const error = el('p', 'error');
    error.id = `${id}-error`;
    error.setAttribute('aria-live', 'polite');
    wrap.append(el('span', 'range-cap', labelText), box, error);
    return wrap;
  };

  range.append(makeWindow('windowFrom', 'Earliest'), el('span', 'range-to', 'to'), makeWindow('windowTo', 'Latest'));
  windowField.append(range);
  block.append(windowField);

  group('Logistics');

  // Propulsion and readiness: the two things that decide whether a launch can
  // carry you at all, rather than how well it fits.
  const row3 = el('div', 'row');
  row3.append(
    selectField(satellite, index, 'propulsion', 'Propulsion', PROPULSION, 'Choose a type', () => renderSatellites()),
    selectField(satellite, index, 'readiness', 'Build status', READINESS, 'Choose a status'),
  );
  block.append(row3);

  if (satellite.propulsion === 'other') {
    block.append(revealField({
      id: `sat-${index}-propulsionOther`,
      label: 'Which propellant?',
      placeholder: 'e.g. HAN-based monopropellant',
      value: satellite.propulsionOther,
      onInput: written => { satellite.propulsionOther = written; },
    }));
  }

  const shipField = el('div', 'field');
  const shipId = `sat-${index}-shipBy`;
  const shipLabel = el('label', null, 'Ready to ship by');
  shipLabel.htmlFor = shipId;
  const ship = el('input');
  ship.id = ship.name = shipId;
  ship.type = 'month';
  ship.value = satellite.shipBy;
  ship.setAttribute('aria-describedby', `${shipId}-hint ${shipId}-error`);
  ship.addEventListener('input', () => { satellite.shipBy = ship.value; setError(shipId, ''); });
  const shipHint = el('p', 'hint',
    'An estimate is fine — the build status above is what says how firm it is. '
    + 'Your satellite has to be at the site before launch, and L\u22126 to L\u221210 weeks is typical, '
    + 'so a window you cannot ship for is not a match however well the orbit fits.');
  shipHint.id = `${shipId}-hint`;
  const shipError = el('p', 'error');
  shipError.id = `${shipId}-error`;
  shipError.setAttribute('aria-live', 'polite');
  shipField.append(shipLabel, ship, shipHint, shipError);
  block.append(shipField);

  // Deployer compatibility: one question, three ways to answer it.
  //
  // The list is only one of them. Choosing a custom interface or saying you have
  // not decided replaces the list rather than adding to it, because a satellite
  // cannot be compatible with an EXOpod Nova and undecided at the same time.
  const deployerField = el('div', 'field');
  const deployerId = `sat-${index}-deployers`;
  deployerField.append(el('span', 'field-label', 'Deployer compatibility'));

  const modes = el('div', 'supply-choices');
  for (const mode of DEPLOYER_MODES) {
    const choice = el('label', 'tick');
    const dot = el('input');
    dot.type = 'radio';
    dot.name = `${deployerId}-mode`;
    dot.checked = (satellite.deployerMode ?? 'list') === mode.value;
    dot.addEventListener('change', () => {
      satellite.deployerMode = mode.value;
      if (mode.value !== 'list') satellite.deployers = [];
      if (mode.value !== 'custom') satellite.deployerOther = '';
      setError(deployerId, '');
      renderSatellites();
    });
    choice.append(dot, el('span', null, mode.label));
    modes.append(choice);
  }
  deployerField.append(modes);

  const mode = satellite.deployerMode ?? 'list';

  if (mode === 'list') {
    const boxesWrap = el('div', 'deployers');
    boxesWrap.id = deployerId;
    // Grouped, because a CubeSat is asking which dispenser it fits inside and a
    // microsat is asking which port it bolts to.
    for (const [name, options] of grouped(DEPLOYERS)) {
      if (name) boxesWrap.append(el('p', 'deployer-group', name));
      const set = el('div', 'deployer-set');
      for (const { value, label, size } of options) {
        const choice = el('label', 'tick');
        const box = el('input');
        box.type = 'checkbox';
        box.value = value;
        box.checked = satellite.deployers.includes(value);
        box.addEventListener('change', () => {
          satellite.deployers = box.checked
            ? [...satellite.deployers, value]
            : satellite.deployers.filter(item => item !== value);
          setError(deployerId, '');
        });
        const text = el('span', 'tick-text');
        text.append(el('span', null, label));
        if (size) text.append(el('span', 'tick-size', size));
        choice.append(box, text);
        set.append(choice);
      }
      boxesWrap.append(set);
    }
    deployerField.append(boxesWrap);
  }

  if (mode === 'custom') {
    const other = el('input');
    other.id = other.name = `sat-${index}-deployerOther`;
    other.type = 'text';
    other.maxLength = 120;
    other.placeholder = 'e.g. bespoke clamp band, 24 in diameter';
    other.value = satellite.deployerOther;
    other.setAttribute('aria-label', 'Which interface?');
    other.addEventListener('input', () => {
      satellite.deployerOther = other.value;
      setError(`sat-${index}-deployerOther`, '');
    });
    const error = el('p', 'error');
    error.id = `sat-${index}-deployerOther-error`;
    error.setAttribute('aria-live', 'polite');
    deployerField.append(other, error);
  }

  if (mode === 'tbd') {
    deployerField.append(el('p', 'hint',
      'A seller will ask. Until it is decided, this satellite is matched on its size and mass alone.'));
  }

  const deployerError = el('p', 'error');
  deployerError.id = `${deployerId}-error`;
  deployerError.setAttribute('aria-live', 'polite');
  deployerField.append(deployerError);
  block.append(deployerField);

  // Its own question, with its own rule above it. As a fourteenth tick under
  // the compatibility list it read as another interface you might be
  // compatible with, when it is asking something else entirely: who brings the
  // hardware. A pair of options also makes the default visible — most of the
  // time the provider supplies it, and that should be something you can see
  // rather than infer from an empty checkbox.
  const supplyWrap = el('div', 'field supply-field');
  supplyWrap.append(el('span', 'field-label', 'Who supplies the deployer?'));

  const choices = el('div', 'supply-choices');
  for (const [mine, label] of [[false, 'The launch provider'], [true, 'I do']]) {
    const choice = el('label', 'tick');
    const dot = el('input');
    dot.type = 'radio';
    dot.name = `sat-${index}-supply`;
    dot.checked = Boolean(satellite.suppliesDeployer) === mine;
    dot.addEventListener('change', () => {
      satellite.suppliesDeployer = mine;
      if (!mine) satellite.deployerMass = '';
      renderSatellites();
    });
    choice.append(dot, el('span', null, label));
    choices.append(choice);
  }
  supplyWrap.append(choices);
  block.append(supplyWrap);

  if (satellite.suppliesDeployer) {
    const massField = el('div', 'field reveal-field');
    const massId = `sat-${index}-deployerMass`;
    const massLabel = el('label', null, 'Deployer mass (kg)');
    massLabel.htmlFor = massId;
    const massInput = numeric(el('input'), { step: 'any', min: 0.1, max: 5000 });
    massInput.id = massInput.name = massId;
    massInput.placeholder = '12';
    massInput.value = satellite.deployerMass;
    massInput.setAttribute('aria-describedby', `${massId}-hint ${massId}-error`);
    massInput.addEventListener('input', () => {
      satellite.deployerMass = massInput.value;
      setError(massId, '');
      tally();
    });
    const massHint = el('p', 'hint',
      'Carried on top of the spacecraft mass above. A provider checks the pair against their spare capacity.');
    massHint.id = `${massId}-hint`;
    const massError = el('p', 'error');
    massError.id = `${massId}-error`;
    massError.setAttribute('aria-live', 'polite');
    massField.append(massLabel, massInput, massHint, massError);
    block.append(massField);
  }

  return block;
}

// LTAN only means something on a sun-synchronous orbit. Rather than let someone
// type a number that will be ignored, the field greys out and says why — and
// says so again, differently, once the orbit qualifies.
function syncLtan(index) {
  const field = list.querySelector(`[data-ltan="${index}"]`);
  if (!field) return;
  const satellite = satellites[index];
  const input = field.querySelector('input');
  const hint = field.querySelector('.hint');

  const type = orbitType(satellite.orbit);

  // The stated orbit decides whether LTAN is a question at all. The numbers
  // then act as a cross-check: an SSO whose figures are not sun-synchronous is
  // worth saying out loud rather than silently accepting.
  input.disabled = Boolean(satellite.orbit) && !type?.ltan;
  field.classList.toggle('off', input.disabled);

  const numbersDisagree = type?.ltan && satellite.inclination && satellite.altitude && !isSunSync(satellite);
  hint.textContent = !satellite.orbit
    ? 'Sun-synchronous orbits only — choose an orbit type above.'
    : !type?.ltan
      ? `LTAN does not apply to ${type?.label ?? 'this orbit'}.`
      : numbersDisagree
        ? 'These figures are not sun-synchronous — check the altitude and inclination.'
        : 'Sun-synchronous, so LTAN applies.';
  hint.classList.toggle('warn', Boolean(numbersDisagree));
}

// What you have built so far, kept in front of you on the action bar. Total
// mass is the number that decides what you can afford and what will carry you,
// so it is the one worth showing without asking.
function tally() {
  const slot = document.getElementById('tally');
  if (!slot) return;
  const filled = satellites.filter(satellite => Object.values(satellite).some(value => value.length));
  const mass = satellites.reduce((sum, satellite) => sum + (Number(satellite.mass) || 0), 0);
  // what the vehicle actually carries, once buyer-supplied deployers are on board
  const withDeployers = satellites.reduce(
    (sum, satellite) => sum + (Number(satellite.deployerMass) || 0), mass);
  const windows = [...new Set(satellites.map(satellite => satellite.windowFrom).filter(Boolean))];

  const parts = [`${filled.length || 0} satellite${filled.length === 1 ? '' : 's'}`];
  if (mass) {
    parts.push(withDeployers > mass
      ? `${Number(withDeployers.toFixed(1))} kg total with deployers`
      : `${Number(mass.toFixed(1))} kg total`);
  }
  if (windows.length === 1) parts.push(windows[0]);
  else if (windows.length > 1) parts.push(`${windows.length} windows`);
  slot.textContent = parts.join(' \u00b7 ');
}

function renderSatellites() {
  list.replaceChildren(...satellites.map(satelliteBlock));
  satellites.forEach((_, index) => syncLtan(index));
  tally();
  if (typeof drawRail === 'function') drawRail();
  // A block that was already complained about keeps its messages through a
  // re-render; a new one starts clean.
  if (touched.size) paintSatelliteErrors();
}

// ── errors ──────────────────────────────────────────────────────────────────

function control(name) {
  if (name === 'ride') return document.getElementById('ride');
  // groups that are a div rather than one input: deployers, a typed window
  return document.getElementById(name) ?? form.elements[name];
}

function setError(name, message) {
  const slot = document.getElementById(`${name}-error`);
  if (!slot) return;
  slot.textContent = message;
  const node = control(name);
  if (!node) return;
  if (message) node.setAttribute?.('aria-invalid', 'true');
  else node.removeAttribute?.('aria-invalid');
}

function currentErrors() {
  return validateMission(Object.fromEntries(new FormData(form)), satellites).fields;
}

function paintSatelliteErrors() {
  const fields = currentErrors();
  for (const [key, message] of Object.entries(fields)) {
    if (key.startsWith('sat-') && touched.has(key.split('-')[1])) setError(key, message);
  }
}

function clearErrors() {
  for (const name of MISSION_FIELDS) setError(name, '');
  setError('satellites', '');
  for (const slot of list.querySelectorAll('.error')) slot.textContent = '';
}

function showErrors(fields) {
  for (const [name, message] of Object.entries(fields)) setError(name, message);
  satellites.forEach((_, index) => touched.add(String(index)));

  const first = Object.keys(fields)[0];
  const node = first && control(first);
  (node?.focus ? node : node?.querySelector?.('input'))?.focus?.();
}

// ── the form itself ─────────────────────────────────────────────────────────

// Where it was built and where it is registered: the two questions a launch
// provider's export team asks first. The whole ISO list is here, so there is no
// "Other" to explain.
for (const key of ['country', 'registration']) {
  const select = form.elements[key];
  for (const { value, label } of COUNTRIES) select.add(new Option(label, value));
  const sync = () => select.classList.toggle('placeholder', !select.value);
  select.addEventListener('change', sync);
  sync();
}

const exportSelect = form.exportControl;
for (const { value, label } of EXPORT_CONTROL) exportSelect.add(new Option(label, value));

// "Other — needs review" is the answer that most needs words after it: it is
// the one a compliance officer will read first.
let exportOther = '';
const exportDetail = revealField({
  id: 'exportControlDetail',
  label: 'Which regime or restriction?',
  placeholder: 'e.g. UK Export Control Order, dual-use listed',
  value: '',
  onInput: written => { exportOther = written; },
});
exportDetail.hidden = true;
exportSelect.closest('.field').after(exportDetail);

const syncSelect = () => {
  exportSelect.classList.toggle('placeholder', !exportSelect.value);
  exportDetail.hidden = exportSelect.value !== 'other';
  if (exportDetail.hidden) setError('exportControlDetail', '');
};
exportSelect.addEventListener('change', syncSelect);
syncSelect();

document.getElementById('ride').append(...RIDE_PREFERENCES.map(({ value, label, description }) => {
  const choice = el('label', 'choice plain');
  const input = el('input');
  input.type = 'radio';
  input.name = 'ride';
  input.value = value;
  const text = el('span', 'choice-text');
  text.append(el('span', 'choice-label', label), el('span', 'choice-help', description));
  choice.append(text, input);
  return choice;
}));

// Budget: digits with thousands separators, so 14000000 does not have to be
// counted by eye. The dollar sign lives in the field furniture rather than the
// value, which keeps the stored figure a number.
const budget = form.budget;
budget.addEventListener('input', () => {
  const caretFromEnd = budget.value.length - budget.selectionStart;
  const digits = budget.value.replace(/[^\d]/g, '').slice(0, 15);
  budget.value = digits ? Number(digits).toLocaleString('en-US') : '';
  const caret = Math.max(0, budget.value.length - caretFromEnd);
  budget.setSelectionRange(caret, caret);
});

document.getElementById('flexibility').append(...FLEXIBILITY.map(({ value, label, description }) => {
  const choice = el('label', 'flex-item');
  const box = el('input');
  box.type = 'checkbox';
  box.value = value;
  box.addEventListener('change', () => {
    flexibility = box.checked
      ? [...flexibility, value]
      : flexibility.filter(item => item !== value);
  });
  const text = el('span', 'flex-text');
  text.append(el('span', 'flex-label', label), el('span', 'flex-help', description));
  choice.append(box, text);
  return choice;
}));

document.getElementById('add-satellite').addEventListener('click', () => {
  satellites.push(blank());
  open.clear();
  open.add(satellites.length - 1);
  renderSatellites();
  list.lastElementChild?.querySelector('input')?.focus();
});

// Leaving a field checks that one field, so a problem shows where it happened
// rather than all at once at the end.
form.addEventListener('focusout', event => {
  const name = event.target.name;
  if (!name) return;
  if (name.startsWith('sat-')) touched.add(name.split('-')[1]);
  const fields = currentErrors();
  if (MISSION_FIELDS.includes(name) || name.startsWith('sat-')) setError(name, fields[name] ?? '');
});

form.addEventListener('input', event => {
  if (MISSION_FIELDS.includes(event.target.name)) setError(event.target.name, '');
});

// Which button was pressed decides whether this is a draft or a published
// mission — the same form, two outcomes.
let status = 'Published';
for (const id of ['publish', 'draft']) {
  document.getElementById(id).addEventListener('click', event => { status = event.currentTarget.value; });
}

form.addEventListener('submit', event => {
  event.preventDefault();
  clearErrors();

  const input = Object.fromEntries(new FormData(form));
  input.exportControlDetail = exportOther;
  const { fields } = validateMission(input, satellites);
  if (ENFORCE_ON_SUBMIT && Object.keys(fields).length) return showErrors(fields);

  showSummary(input, status);
});

// ── what you entered, since nothing can be saved ────────────────────────────

function showSummary(input, missionStatus) {
  const card = el('section', 'success');
  card.tabIndex = -1;

  const icon = el('div', 'success-icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const verb = editing
    ? (missionStatus === 'Draft' ? 'unpublished' : 'updated')
    : (missionStatus === 'Draft' ? 'saved as a draft' : 'published');
  card.append(icon, el('h2', null, input.name ? `${input.name} — ${verb}` : `Mission ${verb}`));

  const filled = satellites.filter(satellite => Object.values(satellite).some(value => value.length));
  card.append(el('p', 'muted', missionStatus === 'Draft'
    ? 'A draft is not matched against any listing until you publish it.'
    : 'A published mission is matched against every published listing — this would write MissionPublished, then a MatchFound for each listing that fits.'));

  const summary = el('dl', 'summary');
  const rows = [
    ['Objective', input.objective],
    ['Target budget', input.budget ? `$${input.budget}` : ''],
    ['Notes to sellers', input.sellerNotes],
    ['Country of manufacture', labelFor(COUNTRIES, input.country)],
    ['State of registry', labelFor(COUNTRIES, input.registration)],
    ['Export control', input.exportControl === 'other' && exportOther
      ? `Other — ${exportOther}`
      : labelFor(EXPORT_CONTROL, input.exportControl)],
    ['Ride preference', labelFor(RIDE_PREFERENCES, input.ride)],
    ['Satellites', filled.length ? String(filled.length) : ''],
    ['Can flex on', flexibility.length
      ? flexibility.map(value => labelFor(FLEXIBILITY, value)).join(', ')
      : (input.name || filled.length ? 'Nothing — every number is a hard requirement' : '')],
  ].filter(([, detail]) => detail);

  for (const [term, detail] of rows) {
    const line = el('div');
    line.append(el('dt', null, term), el('dd', null, detail));
    summary.append(line);
  }

  if (rows.length) card.append(summary);
  else card.querySelector('.muted').textContent = 'You left the form blank, which is fine here.';

  const back = el('a', 'submit', editing ? `Back to ${editing.name}` : 'Back to Missions');
  back.href = editing
    ? `/mission.html?id=${encodeURIComponent(editing.id)}&view=${view}`
    : `/missions.html?view=${view}`;
  const again = el('a', 'submit secondary', editing ? 'Keep editing' : 'Add another mission');
  again.href = editing ? location.href : '/new-mission.html';
  card.append(back, again, el('p', 'prototype-note', 'Prototype — nothing was saved.'));

  document.getElementById('form-wrap').replaceChildren(card);
  card.focus();
}

// ── starting from a document, rather than from a blank form ────────────────

function applyProposals(proposals) {
  for (const item of proposals) {
    if (item.scope === 'satellite') {
      satellites[0][item.key] = item.value;
      continue;
    }
    if (item.key === 'ride') {
      const radio = form.querySelector(`input[name="ride"][value="${item.value}"]`);
      if (radio) { radio.checked = true; }
      continue;
    }
    const field = form.elements[item.key];
    if (!field) continue;
    field.value = item.value;
    field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  }

  // The first satellite is open, so whatever was written is in front of you
  // rather than folded away behind a summary line.
  open.clear();
  open.add(0);
  renderSatellites();

  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

form.parentNode.insertBefore(
  documentIntake({
    onApply: applyProposals,
    onAsk: () => openAssistant('I have an RFI for a new mission. Read it and fill in the intake form for me.'),
  }),
  form,
);

// ── the rail: where you are in a form four screens long ────────────────────
//
// The page is long because the data is, and the fix for a long form is not a
// second column — two columns leave the eye with no obvious path and put tab
// order at odds with the layout. It is orientation: what the sections are, how
// far down you have got, and what is still empty.
//
// Completion is counted, not asserted: a section is done when every control in
// it holds something. That makes the rail a checklist you can trust rather than
// decoration, and it is the same count whether or not submission is blocked.

const rail = document.getElementById('rail');

function sectionState(fieldset) {
  const controls = [...fieldset.querySelectorAll('input, select')].filter(node =>
    node.type !== 'checkbox'
    && node.type !== 'radio'
    && !node.disabled
    // a follow-up that is not showing is not a field you owe an answer to, and
    // counting it leaves a section stuck one short of complete
    && !node.closest('[hidden]'));
  const filled = controls.filter(node => node.value.trim()).length;
  const radios = [...fieldset.querySelectorAll('input[type="radio"]')];
  const radioGroups = new Set(radios.map(node => node.name));
  const radiosDone = [...radioGroups].every(name => fieldset.querySelector(`input[name="${name}"]:checked`));
  return {
    filled: filled + (radioGroups.size && radiosDone ? 1 : 0),
    total: controls.length + radioGroups.size,
  };
}

// A satellite is finished when nothing in it is still owed. Counting finished
// satellites beats counting fields: "1/17" before you have typed anything is
// both wrong — the 17th was the form's own default — and discouraging, and it
// multiplies by every satellite you add.
function satelliteProgress() {
  const { fields } = validateMission(Object.fromEntries(new FormData(form)), satellites);
  const done = satellites.filter((_, index) =>
    !Object.keys(fields).some(key => key.startsWith(`sat-${index}-`))).length;
  return { filled: done, total: satellites.length };
}

function drawRail() {
  const sections = [...form.querySelectorAll('fieldset')];
  rail.replaceChildren();

  const list = el('ol', 'rail-steps');
  sections.forEach((fieldset, index) => {
    const legend = fieldset.querySelector('legend');
    const name = legend.textContent.replace(/^\d+/, '').trim();
    const repeats = Boolean(fieldset.querySelector('#satellites'));
    const { filled, total } = repeats ? satelliteProgress() : sectionState(fieldset);
    const done = total > 0 && filled === total;

    const item = el('li', `rail-step${done ? ' done' : ''}${filled ? ' started' : ''}`);
    const link = el('button', 'rail-link');
    link.type = 'button';
    link.append(
      el('span', 'rail-dot', done ? '\u2713' : String(index + 1)),
      el('span', 'rail-name', name),
    );
    if (total) link.append(el('span', 'rail-count', `${filled}/${total}`));
    if (repeats) link.querySelector('.rail-count').title = `${filled} of ${total} satellites complete`;
    link.addEventListener('click', () => {
      fieldset.scrollIntoView({ behavior: 'smooth', block: 'start' });
      fieldset.querySelector('input, select')?.focus({ preventScroll: true });
    });
    item.append(link);

    // the satellites hang off their own step, because that is the part that
    // repeats and the part you lose your place in
    if (fieldset.contains(list) === false && fieldset.querySelector('#satellites')) {
      const subs = el('ul', 'rail-subs');
      satellites.forEach((satellite, at) => {
        const sub = el('li');
        const button = el('button', `rail-sub${open.has(at) ? ' on' : ''}`);
        button.type = 'button';
        button.textContent = satellite.name || `Satellite ${at + 1}`;
        button.addEventListener('click', () => {
          open.clear();
          open.add(at);
          renderSatellites();
          list.parentElement && el('div');
          document.querySelectorAll('.sat-block')[at]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        sub.append(button);
        subs.append(sub);
      });
      const add = el('li');
      const addButton = el('button', 'rail-sub add', '+ Add a satellite');
      addButton.type = 'button';
      addButton.addEventListener('click', () => document.getElementById('add-satellite').click());
      add.append(addButton);
      subs.append(add);
      item.append(subs);
    }

    list.append(item);
  });

  rail.append(list);

  // The running total lives with the progress it belongs to, rather than
  // floating over the page on a bar that follows you down it.
  const total = el('p', 'rail-tally');
  total.id = 'tally';
  rail.append(total);
  tally();

  markCurrent();
}

// The rail reflects the form, so it redraws whenever the form changes.
form.addEventListener('input', drawRail);
form.addEventListener('change', drawRail);

// …and follows you down it. Completion tells you what is left; this tells you
// where you are, which is the half a long form actually loses people on.
//
// Not an IntersectionObserver: the Satellites section is four times the height
// of the others, so it overlaps any sensible trigger band at almost every
// scroll position and wins permanently. Asking "which section have I scrolled
// past the top of?" is the question the rail is actually answering, and it is
// the same answer whatever the sections weigh.
const LINE = 140;

function markCurrent() {
  const sections = [...form.querySelectorAll('fieldset')];
  let at = sections.findLastIndex(section => section.getBoundingClientRect().top <= LINE);
  // above the first section, nothing is current rather than the last one
  if (at < 0) at = scrollY > 40 ? 0 : -1;
  rail.querySelectorAll('.rail-step').forEach((step, index) => {
    step.classList.toggle('current', index === at);
  });
}

// Called straight from the scroll event rather than deferred to an animation
// frame. A rAF-gated flag looks like the careful version and is the opposite:
// the callback does not run in a backgrounded tab, so the flag never clears and
// the rail stops following you for the rest of the session. This reads four
// rectangles and writes one class — it is cheaper than the bookkeeping.
addEventListener('scroll', markCurrent, { passive: true });
addEventListener('resize', markCurrent, { passive: true });

// ── 10. leaving without losing it by accident ──────────────────────────────
//
// Nothing is saved in this prototype, so the only protection worth having is
// the browser's own: if anything has been typed, a stray click on Cancel or the
// back button asks first.
let dirty = false;
form.addEventListener('input', () => { dirty = true; }, { once: true });
addEventListener('beforeunload', event => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = '';
});
// Submitting is not abandoning, so the guard stands down first.
form.addEventListener('submit', () => { dirty = false; });

// Mar 2026 → 2026-03, which is what a month input wants.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthValue(written) {
  const match = /^([A-Za-z]{3})\w*\s+(\d{4})$/.exec(String(written ?? '').trim());
  if (!match) return '';
  const at = MONTHS.findIndex(name => name.toLowerCase() === match[1].toLowerCase());
  return at < 0 ? '' : `${match[2]}-${String(at + 1).padStart(2, '0')}`;
}

// A saved mission, translated back into what the controls hold.
function load(row) {
  const set = (key, value) => {
    const field = form.elements[key];
    if (!field || !value) return;
    field.value = value;
    field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };

  set('name', row.name);
  set('objective', row.objective);
  set('budget', String(row.budget ?? '').replace(/[^\d]/g, ''));
  set('sellerNotes', row.sellerNotes);
  set('country', valueFor(COUNTRIES, row.country));
  set('registration', valueFor(COUNTRIES, row.registration));
  set('exportControl', valueFor(EXPORT_CONTROL, row.exportControl));
  if (row.exportControlOther) {
    const detail = document.getElementById('exportControlDetail');
    if (detail) { detail.value = row.exportControlOther; detail.dispatchEvent(new Event('input', { bubbles: true })); }
  }

  const ride = form.querySelector(`input[name="ride"][value="${valueFor(RIDE_PREFERENCES, row.ride)}"]`);
  if (ride) ride.checked = true;

  flexibility = (row.flexibility ?? []).map(label => valueFor(FLEXIBILITY, label)).filter(Boolean);
  for (const box of document.querySelectorAll('#flexibility input')) {
    box.checked = flexibility.includes(box.value);
  }

  satellites = row.satellites.map(satellite => {
    const [length = '', width = '', height = ''] = String(satellite.dimensions ?? '')
      .split(/\s*\u00d7\s*/).map(side => side.trim());
    const deployers = String(satellite.deployer ?? '')
      .split(',').map(name => valueFor(DEPLOYERS, name)).filter(Boolean);
    return {
      name: satellite.name ?? '',
      form: valueFor(FORM_FACTORS, satellite.form),
      mass: satellite.mass ?? '',
      length, width, height,
      orbit: valueFor(ORBIT_TYPES, satellite.orbit),
      inclination: satellite.inclination ?? '',
      altitude: satellite.altitude ?? '',
      ltan: satellite.ltan === '\u2014' ? '' : (satellite.ltan ?? ''),
      windowFrom: satellite.windowFrom ?? '',
      windowTo: satellite.windowTo ?? '',
      propulsion: valueFor(PROPULSION, satellite.propulsion),
      propulsionOther: satellite.propulsionOther ?? '',
      readiness: valueFor(READINESS, satellite.readiness),
      shipBy: monthValue(satellite.shipBy),
      deployers,
      deployerOther: satellite.deployerOther ?? '',
      suppliesDeployer: Boolean(satellite.deployerMass),
      deployerMass: satellite.deployerMass ?? '',
    };
  });

  open.clear();
  open.add(0);
}

if (editing) {
  // Editing a record is not starting from a document, so that panel steps out
  // of the way rather than offering to overwrite what is already there.
  document.querySelector('.assist')?.remove();

  document.title = `Edit ${editing.name} · OrbitMatch`;
  document.querySelector('.intake-head h1').textContent = `Edit ${editing.name}`;
  document.querySelector('.intake-head .muted').textContent =
    'Changing what a mission needs changes what it matches. Published missions are re-matched against every listing when you save.';
  document.getElementById('publish').textContent = 'Save changes';
  document.getElementById('draft').hidden = editing.status !== 'Published';
  document.getElementById('draft').textContent = 'Unpublish to draft';
  document.querySelector('.intake-cancel').href = `/mission.html?id=${encodeURIComponent(editing.id)}&view=${view}`;
  document.querySelector('.back-link').href = `/mission.html?id=${encodeURIComponent(editing.id)}&view=${view}`;
  document.querySelector('.back-link').textContent = `\u2190 ${editing.name}`;

  load(editing);
}

renderSatellites();
drawRail();

accountMenu(view);
themeToggle();

assistant(view);
document.getElementById('ask-button')?.addEventListener('click', () => {
  toggleAssistant(document.getElementById('ask')?.hidden ?? true);
});
