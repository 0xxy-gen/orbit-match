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
  quarterParts, quarterValue, labelFor,
} from './mission-options.js';
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

const form = document.getElementById('mission');
const list = document.getElementById('satellites');

const MISSION_FIELDS = ['name', 'objective', 'budget', 'country', 'registration', 'exportControl', 'ride'];

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// ── the satellites, which are the part that repeats ─────────────────────────

const blank = () => ({
  name: '', form: 'custom', mass: '', length: '', width: '', height: '',
  orbit: '', inclination: '', altitude: '', ltan: '', windowFrom: '', windowTo: '', deployers: [],
  propulsion: '', propulsionOther: '', readiness: '', shipBy: '', deployerOther: '',
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
  fold.append(caret, el('span', 'sat-block-n', satellite.name || `Satellite ${index + 1}`));
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
  for (const { value, label } of FORM_FACTORS) formSelect.add(new Option(label, value));
  formSelect.value = satellite.form ?? 'custom';
  const formHint = el('p', 'hint');
  formHint.id = `${formId}-hint`;
  formSelect.setAttribute('aria-describedby', formHint.id);

  const describeForm = () => {
    const chosen = FORM_FACTORS.find(option => option.value === formSelect.value);
    formHint.textContent = chosen?.dims
      ? `Standard ${chosen.label} envelope, filled in below — edit it if yours differs. Dispensers usually cap a ${chosen.label} at about ${chosen.mass} kg.`
      : 'Choose a CubeSat size to fill the dimensions, or enter them yourself.';
  };
  describeForm();

  formSelect.addEventListener('change', () => {
    satellite.form = formSelect.value;
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
  formField.append(formLabel, formSelect, formHint);
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
    wrap.append(input, el('span', 'dim-tag', side[0].toUpperCase()), error);
    boxes.append(wrap);
    if (side !== 'height') boxes.append(el('span', 'dim-x', '×'));
  }
  dims.append(boxes);
  block.append(dims);

  // the orbit numbers
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

  const row = el('div', 'row three');
  for (const [key, label, placeholder, bounds, hint] of [MASS, ...orbitNumbers(satellite)]) {
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
  ltan.maxLength = 5;
  ltan.inputMode = 'numeric';
  ltan.placeholder = '10:30';
  ltan.value = satellite.ltan;
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

  // deployers: a set, so checkboxes
  const deployerField = el('div', 'field');
  const deployerId = `sat-${index}-deployers`;
  deployerField.append(el('span', 'field-label', 'Deployer compatibility'));
  const boxesWrap = el('div', 'deployers');
  boxesWrap.id = deployerId;
  for (const { value, label } of DEPLOYERS) {
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
      if (value === 'custom') renderSatellites();
    });
    choice.append(box, el('span', null, label));
    boxesWrap.append(choice);
  }
  const deployerError = el('p', 'error');
  deployerError.id = `${deployerId}-error`;
  deployerError.setAttribute('aria-live', 'polite');
  deployerField.append(boxesWrap, deployerError);
  block.append(deployerField);

  if (satellite.deployers.includes('custom')) {
    block.append(revealField({
      id: `sat-${index}-deployerOther`,
      label: 'Which interface?',
      placeholder: 'e.g. bespoke clamp band, 24 in diameter',
      value: satellite.deployerOther,
      onInput: written => { satellite.deployerOther = written; },
    }));
  }

  // Who supplies the deployer, and what it weighs.
  //
  // This is the ambiguity people try to solve with an "includes deployer" tick
  // on the mass field. A tick gives one number two meanings, so every reader
  // downstream has to branch on it and nothing catches a mis-tick — 68 kg and
  // 80 kg both look reasonable. Asking for the kilograms instead keeps the
  // spacecraft mass meaning one thing and makes the total addable.
  const supplyWrap = el('div', 'field');
  const supply = el('label', 'tick');
  const supplyBox = el('input');
  supplyBox.type = 'checkbox';
  supplyBox.checked = satellite.suppliesDeployer;
  supplyBox.addEventListener('change', () => {
    satellite.suppliesDeployer = supplyBox.checked;
    if (!supplyBox.checked) satellite.deployerMass = '';
    renderSatellites();
  });
  supply.append(supplyBox, el('span', null, 'I supply the deployer'));
  supplyWrap.append(supply);
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

  card.append(icon, el('h2', null, input.name
    ? `${input.name} — ${missionStatus === 'Draft' ? 'saved as a draft' : 'published'}`
    : missionStatus === 'Draft' ? 'Saved as a draft' : 'Published'));

  const filled = satellites.filter(satellite => Object.values(satellite).some(value => value.length));
  card.append(el('p', 'muted', missionStatus === 'Draft'
    ? 'A draft is not matched against any listing until you publish it.'
    : 'A published mission is matched against every published listing — this would write MissionPublished, then a MatchFound for each listing that fits.'));

  const summary = el('dl', 'summary');
  const rows = [
    ['Objective', input.objective],
    ['Target budget', input.budget ? `$${input.budget}` : ''],
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

  const back = el('a', 'submit', 'Back to Missions');
  back.href = `/missions.html?view=${view}`;
  const again = el('a', 'submit secondary', 'Add another mission');
  again.href = '/new-mission.html';
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

document.getElementById('form-wrap').insertBefore(
  documentIntake({
    onApply: applyProposals,
    onAsk: () => openAssistant('I have an RFI for a new mission. Read it and fill in the intake form for me.'),
  }),
  form,
);

renderSatellites();

accountMenu(view);
themeToggle();

assistant(view);
document.getElementById('ask-button')?.addEventListener('click', () => {
  toggleAssistant(document.getElementById('ask')?.hidden ?? true);
});
