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
import { MISSION_ROWS, PHASES, DEAL } from './demo-data.js';
import { stepsFor, stepWindow } from './procurement-path.js';
import { COUNTRIES, EXPORT_CONTROL, RIDE_PREFERENCES, FLEXIBILITY, quarterRank } from './mission-options.js';
import { satelliteTable, satelliteEditor } from './satellite-table.js';
import { assistant, toggleAssistant, STAR } from './assistant.js';
import { accountMenu, currentUser } from './account-menu.js';
import { themeToggle } from './theme.js';
import { mentionPicker, withMentions, mentioned } from './mention.js';

const STORE_VIEW = 'orbitmatch:view';
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };

const canvas = document.getElementById('canvas');

// What actually changed, in words.
//
// A log entry saying "the mission was updated" is worth almost nothing: the
// question anyone asks later is which number moved, and an entry that cannot
// answer it makes you diff two versions by eye. So the save writes what it did.
const FIELD_NAME = {
  name: 'Mission name', objective: 'Objective', budget: 'Target budget',
  country: 'Country of manufacture', registration: 'State of registry',
  exportControl: 'Export control status', ride: 'Ride preference',
  flexibility: 'Can flex on', notes: 'Notes', status: 'Status',
};

const SAT_NAME = {
  name: 'name', form: 'form factor', mass: 'mass', dimensions: 'dimensions',
  orbit: 'orbit type', inclination: 'inclination', altitude: 'altitude',
  ltan: 'LTAN', windowFrom: 'earliest window', windowTo: 'latest window',
  propulsion: 'propulsion', propulsionOther: 'propellant', readiness: 'build status',
  shipBy: 'ready to ship', deployer: 'deployer compatibility',
  deployerOther: 'deployer interface', deployerMass: 'deployer mass',
};

const shown = value => (Array.isArray(value) ? (value.join(', ') || 'nothing') : (value || 'blank'));

function describeChanges(before, after) {
  const parts = [];

  for (const [key, label] of Object.entries(FIELD_NAME)) {
    if (JSON.stringify(before[key]) === JSON.stringify(after[key])) continue;
    parts.push(key === 'sellerNotes'
      ? 'Notes to sellers edited'
      : `${label}: ${shown(before[key])} → ${shown(after[key])}`);
  }

  after.satellites.forEach((satellite, index) => {
    const was = before.satellites[index];
    if (!was) { parts.push(`${satellite.name || 'A satellite'} added`); return; }
    for (const [key, label] of Object.entries(SAT_NAME)) {
      if (String(was[key] ?? '') === String(satellite[key] ?? '')) continue;
      parts.push(`${satellite.name || 'Satellite'} ${label}: ${shown(was[key])} → ${shown(satellite[key])}`);
    }
  });
  if (before.satellites.length > after.satellites.length) {
    parts.push(`${before.satellites.length - after.satellites.length} satellite(s) removed`);
  }

  if (!parts.length) return '';
  // Three is enough to see what happened; the rest would be a changelog, and
  // the record itself is the changelog.
  return parts.length <= 3
    ? `${parts.slice(0, 3).join('. ')}.`
    : `${parts.slice(0, 3).join('. ')}, and ${parts.length - 3} more.`;
}

function log(entry) {
  row.activity = row.activity ?? [];
  row.activity.unshift({ at: new Date().toISOString().slice(0, 16), ...entry });
}

// Saving does not "republish" — published is a state, not an act you repeat.
// What it does is re-run matching, because the mission's terms have changed
// underneath every match already made against them.
let confirming = false;

function save_() {
  if (!changed()) return;

  const republishes = row.status === 'Published' && matchingChanged();

  // Any change to a published mission is worth a beat, not only one where
  // somebody is mid-quote. Published means it is already out there being
  // matched, so saving is not "keep my work" — it is republishing under terms
  // other people have already acted on.
  if (republishes && !confirming) {
    confirming = true;
    render();
    return;
  }

  const wasPublished = row.status === 'Published';
  const what = describeChanges(backup, row);
  if (what) log({ event: 'MissionUpdated', text: what });

  editing = false;
  backup = null;
  armed = false;
  confirming = false;
  render();

  const busyNow = inProcurement();
  say(!wasPublished
    ? 'Saved. A draft is not matched against anything until you publish it. Nothing is saved in the prototype.'
    : republishes
      ? 'Saved. Would write MissionUpdated, then re-match: MatchFound where it now fits, MatchWithdrawn only where no request was ever sent.'
        + (busyNow
          ? ` The ${busyNow} seller${busyNow === 1 ? '' : 's'} already in procurement stay in it and are notified; a quote is theirs to revise or withdraw.`
          : '')
        + ' Nothing is saved in the prototype.'
      : 'Saved. Would write MissionUpdated. Nothing that decides a match changed. Nothing is saved in the prototype.');
}

// Esc leaves, ⌘Enter saves. A mode you enter with a click should be
// leavable without hunting for the button that does it.
addEventListener('keydown', event => {
  // Escape backs out of a pending confirmation rather than confirming it — the
  // key people press to mean "no" must never be the one that means "yes".
  if (event.key === 'Escape' && withdrawing) {
    withdrawing = false;
    render();
    return;
  }
  // The grouping editor is a mode too, so the key that leaves every other mode
  // leaves this one. It discards the draft, which is why Cancel says so.
  if (event.key === 'Escape' && noting) {
    noting = null;
    render();
    return;
  }
  if (event.key === 'Escape' && applying) {
    applying = null;
    render();
    return;
  }
  if (event.key === 'Escape' && grouping) {
    grouping = null;
    render();
    return;
  }
  if (!editing) return;
  if (event.key === 'Escape') {
    if (armed) { armed = false; render(); return; }
    document.querySelector('.mission-tools .ghost')?.click();
  }
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    save_();
  }
});

let noteTimer;
function say(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.id = 'toast';
    toast.setAttribute('role', 'status');
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { toast.hidden = true; }, 4000);
}
const params = new URLSearchParams(location.search);

const LEGACY = { need: 'buy' };
let view = params.get('view') ?? read(STORE_VIEW) ?? 'buy';
view = LEGACY[view] ?? view;
if (view !== 'buy' && view !== 'sell') view = 'buy';

const rows = MISSION_ROWS[view] ?? [];
const row = rows.find(item => item.id === params.get('id')) ?? rows[0];

let tab = params.get('tab') ?? 'overview';

// Editing happens on the record, not in a copy of the intake form. Opening a
// four-screen form to correct one altitude is the wrong amount of ceremony, and
// the table already shows every field in the shape people read them in — so the
// same table takes the corrections.
//
// NOTHING IS SAVED. Edits land on the in-memory row, so they survive moving
// around the prototype and disappear on reload, and the page says so.
let editing = false;
let backup = null;
let armed = false;        // Cancel has been pressed once and is asking to be sure
let withdrawing = false;  // Unpublish has, and is asking the same

const changed = () => Boolean(backup) && JSON.stringify(row) !== JSON.stringify(backup);

// Which fields a match is decided on.
//
// Renaming a mission changes nothing about what can carry it; changing an
// altitude changes everything. Only the second kind needs re-matching, so the
// warning fires on substance rather than on any keystroke.
const MATCHING = ['ride', 'exportControl', 'country', 'registration', 'flexibility'];
const MATCHING_SAT = ['mass', 'dimensions', 'orbit', 'inclination', 'altitude', 'ltan',
  'windowFrom', 'windowTo', 'deployer', 'deployerMass'];

function matchingChanged() {
  if (!backup) return false;
  if (MATCHING.some(key => JSON.stringify(row[key]) !== JSON.stringify(backup[key]))) return true;
  if (row.satellites.length !== backup.satellites.length) return true;
  return row.satellites.some((satellite, index) =>
    MATCHING_SAT.some(key => satellite[key] !== backup.satellites[index]?.[key]));
}

// Launches somebody is already working, which is what makes a re-match
// expensive rather than routine.
const inProcurement = () => (row.launches ?? []).filter(launch => (launch.reached ?? 0) > 0).length;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// A fact is a term and a value when you are reading, and a term and a control
// when you are editing. Same list either way, so the two cannot fall out of
// step.
const FACT_EDITORS = {
  budget: { type: 'text' },
  sellerNotes: { type: 'notes' },
  country: { type: 'select', options: () => COUNTRIES.map(option => option.label) },
  registration: { type: 'select', options: () => COUNTRIES.map(option => option.label) },
  exportControl: { type: 'select', options: () => EXPORT_CONTROL.map(option => option.label.split('—')[0].trim()) },
  exportControlOther: { type: 'text' },
  ride: { type: 'radio', options: () => RIDE_PREFERENCES.map(option => option.label) },
  flexibility: { type: 'flex' },
};

function factControl(key) {
  const spec = FACT_EDITORS[key];
  if (!spec) return null;

  if (spec.type === 'flex') {
    const wrap = el('div', 'fact-flex');
    for (const option of FLEXIBILITY) {
      const tick = el('label', 'tick');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = (row.flexibility ?? []).includes(option.label);
      box.addEventListener('change', () => {
        const held = new Set(row.flexibility ?? []);
        if (box.checked) held.add(option.label);
        else held.delete(option.label);
        row.flexibility = [...held];
      });
      tick.append(box, el('span', null, option.label));
      wrap.append(tick);
    }
    return wrap;
  }

  // A choice of three is radios on the form, so it is radios here — a dropdown
  // would hide two of the three options behind a click.
  if (spec.type === 'radio') {
    const wrap = el('div', 'fact-flex');
    for (const label of spec.options()) {
      const choice = el('label', 'tick small');
      const dot = el('input');
      dot.type = 'radio';
      dot.name = `fact-${key}`;
      dot.checked = row[key] === label;
      dot.addEventListener('change', () => { row[key] = label; });
      choice.append(dot, el('span', null, label));
      wrap.append(choice);
    }
    return wrap;
  }

  if (spec.type === 'select') {
    const select = el('select', 'cell-input');
    for (const label of spec.options()) select.add(new Option(label, label));
    select.value = row[key] ?? '';
    select.addEventListener('change', () => {
      row[key] = select.value;
      if (key === 'exportControl') render();
    });
    return select;
  }

  if (spec.type === 'notes') {
    const area = el('textarea', 'cell-input notes-input');
    area.rows = 3;
    area.maxLength = 2000;
    area.value = row[key] ?? '';
    area.placeholder = 'Anything a seller needs that the fields do not cover.';
    area.setAttribute('aria-label', 'Notes to sellers');
    area.addEventListener('input', () => { row[key] = area.value; });
    return area;
  }

  if (key === 'budget') {
    const wrap = el('div', 'money');
    wrap.append(el('span', 'money-unit', '$'));
    const input = el('input', 'cell-input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.value = String(row.budget ?? '').replace(/[^\d]/g, '');
    input.value = input.value ? Number(input.value).toLocaleString('en-US') : '';
    input.setAttribute('aria-label', 'Target budget in US dollars');
    input.addEventListener('input', () => {
      const digits = input.value.replace(/[^\d]/g, '').slice(0, 15);
      input.value = digits ? Number(digits).toLocaleString('en-US') : '';
      row.budget = input.value ? `$${input.value}` : '';
    });
    wrap.append(input);
    return wrap;
  }

  const input = el('input', 'cell-input');
  input.type = 'text';
  input.value = row[key] ?? '';
  input.addEventListener('input', () => { row[key] = input.value; });
  return input;
}

function facts(pairs) {
  const list = el('dl', 'mission-facts');
  for (const [term, detail, key] of pairs) {
    const control = editing && key ? factControl(key) : null;
    if (!detail && !control) continue;
    // Notes is prose, not a value, so it takes the whole row rather than the
    // narrow column the figures share.
    const item = el('div', key === 'notes' ? 'fact-wide' : null);
    item.append(el('dt', null, term));
    const value = el('dd');
    if (control) value.append(control);
    else value.textContent = detail;
    item.append(value);
    list.append(item);
  }
  return list;
}

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

// ── the two panels ──────────────────────────────────────────────────────────

// Overview is the mission: what was entered, and the spacecraft it is for.
//
// These were two tabs. They should not have been — eight facts do not earn a
// tab of their own, and the satellites are not an appendix to a mission, they
// are the thing itself. Opening a mission and being shown a key-value list with
// its actual contents one click away is the product hiding the answer.
//
// Procurement stays separate because it answers a different question: not what
// this mission is, but where it has got to commercially.
function overview() {
  const wrap = el('div', 'mission-panel');

  wrap.append(view === 'buy'
    ? facts([
      ['Target budget', row.budget, 'budget'],
      ['Country of manufacture', row.country, 'country'],
      ['State of registry', row.registration, 'registration'],
      ['Export control status', row.exportControlOther
        ? `${row.exportControl} \u2014 ${row.exportControlOther}`
        : row.exportControl, 'exportControl'],
      // Raising the "Other" flag without saying what it is helps nobody, so the
      // follow-up appears here exactly as it does in the form.
      ...(editing && row.exportControl === 'Other'
        ? [['Which regime or restriction?', row.exportControlOther, 'exportControlOther']]
        : []),
      ['Ride preference', row.ride, 'ride'],
      ['Can flex on', row.flexibility?.length ? row.flexibility.join(', ') : 'Nothing', 'flexibility'],
      // No launch count here. These are the answers somebody typed into the
      // intake form; a launch is deal state, and the Procurement tab already
      // carries the number.
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

  if (view === 'buy') {
    const count = row.satellites.length;
    wrap.append(el('h3', 'panel-heading', `Satellites (${count})`));

    const duplicate = index => {
      // Everything but the name, which is the one field that has to differ.
      const copy = { ...structuredClone(row.satellites[index]), name: '' };
      delete copy.launch;
      row.satellites.splice(index + 1, 0, copy);
      render();
    };
    const remove = index => { row.satellites.splice(index, 1); render(); };

    // Reading is a table; editing is a stack of cards. The table is unbeatable
    // for comparing fourteen values down a column and unusable for filling them
    // in, because the row is wider than the window.
    wrap.append(editing
      ? satelliteEditor(row.satellites, { onRemove: remove, onDuplicate: duplicate })
      : satelliteTable(row.satellites));

    if (editing) {
      const add = el('button', 'ghost add-sat', '+ Add a satellite');
      add.type = 'button';
      add.addEventListener('click', () => {
        row.satellites.push({ name: `Satellite ${row.satellites.length + 1}`, form: 'Custom' });
        render();
      });
      wrap.append(add);
    }
  }

  // Notes sits after the satellites, not before them.
  //
  // It is prose, and prose between the facts and the table pushes the record
  // itself down the page to make room for commentary. The structured mission
  // comes first; the human layer — what is always true, then what happened —
  // follows it.
  // There was an "Internal notes" field here. The activity log does that job
  // and does it better: a private note is almost always something that happened
  // on a date, and a field you overwrite keeps no record of when it changed.
  //
  // What the log does not do is hold something permanently true — "these two
  // must fly together" scrolls away after forty entries. If that starts biting,
  // the answer is a pinned entry rather than bringing the field back.
  //
  // Notes to sellers stays, and stays separate, because it is the one piece of
  // free text that leaves the building.
  if (view === 'buy' && (editing || row.sellerNotes)) {
    const heading = el('h3', 'panel-heading');
    heading.append(document.createTextNode('Notes to sellers'), el('span', 'shared-badge', 'Shared'));
    wrap.append(heading);
    wrap.append(el('p', 'panel-note', 'Sent with every request and readable by any seller you are matched with.'));
    wrap.append(editing ? factControl('sellerNotes') : el('p', 'mission-notes', row.sellerNotes));
  }

  // The log lives here rather than in a tab of its own. Four tabs to read one
  // mission is three too many, and what has happened to a mission belongs
  // beside what the mission is — not one click away from it.
  //
  // Not while editing, though: the record is open for changes and the log is
  // not part of what is being changed.
  if (view === 'buy' && !editing) {
    const count = (row.activity ?? []).length;
    // "Activity", not "Updates": the stream holds what the product recorded as
    // well as what anyone wrote, and Updates only names the second kind.
    // Everything above is the record: what the mission is, what flies, what
    // sellers get told. The log is a different kind of thing, a running account
    // of what happened, so it gets a rule and real space above it rather than
    // being one more heading in the same stack.
    const heading = el('h3', 'panel-heading band', 'Activity');
    // the same bubble the tabs use, so a count looks like a count everywhere
    if (count) heading.append(el('span', 'tab-count', String(count)));
    wrap.append(heading, updates());
  }

  return wrap;
}

// ── Procurement ─────────────────────────────────────────────────────────────
//
// One tab, not two. "Which of my satellites ride this launch" and "where has
// this launch got to" are different questions about the same object, and giving
// each its own tab means the same launch appears twice and you check both
// places to understand one thing.
//
// So a launch card carries both: the manifest — what is on it and what it
// weighs, which is the launch configuration — and the phase it has reached with
// whatever clock is running against it.
function launchCard(launch) {
  const on = row.satellites.filter(satellite => satellite.launch === launch.id);
  const mass = on.reduce((sum, satellite) => sum + (Number(satellite.mass) || 0)
    + (Number(satellite.deployerMass) || 0), 0);

  const group = el('section', 'launch-group');

  const head = el('div', 'launch-head');
  const titles = el('div');
  const name = el('div', 'launch-name');
  name.append(
    el('span', 'launch-listing', launch.listing),
    el('span', 'launch-seller', launch.seller),
    el('span', `chip status ${launch.status.replace(/\s+/g, '-')}`, launch.status),
  );
  // Which of your configurations this launch is filling.
  //
  // A launch in procurement is not free-floating: it exists because a seller
  // answered one of the shapes you stated. Saying which one is what makes the
  // Launch Configurations tab mean something once deals start — otherwise the
  // shapes are a thing you declared and never heard about again.
  const from = (row.configurations ?? []).find(option =>
    option.added && option.batches.some(names =>
      on.length && on.every(satellite => names.includes(satellite.name))));
  if (from) {
    const tag = el('a', 'launch-config');
    tag.href = `/mission.html?id=${row.id}&view=${view}&tab=configuration`;
    tag.textContent = `Configuration ${from.letter}`;
    name.append(tag);
  }

  titles.append(name, el('p', 'launch-meta', [
    launch.window,
    `${on.length} satellite${on.length === 1 ? '' : 's'}`,
    mass ? `${Number(mass.toFixed(1))} kg to orbit` : null,
  ].filter(Boolean).join(' \u00b7 ')));

  head.append(titles);
  group.append(head);

  // what is on the launch — the configuration half
  if (on.length) {
    const manifest = el('table', 'manifest');
    const body = el('tbody');
    for (const satellite of on) {
      const line = el('tr');
      line.append(
        el('td', 'manifest-name', satellite.name),
        el('td', null, satellite.mass ? `${satellite.mass} kg` : '—'),
        el('td', null, satellite.dimensions ?? '—'),
        el('td', 'manifest-fit', satellite.deployerMass
          ? `${satellite.deployer} · +${satellite.deployerMass} kg dispenser`
          : (satellite.deployer ?? '—')),
      );
      body.append(line);
    }
    manifest.append(body);
    group.append(manifest);
  }

  // where it has got to — the procurement half
  group.append(launchTrack(launch));
  if (launch.detail) group.append(el('p', 'launch-detail', launch.detail));

  // The road, here rather than behind an "Open deal" link.
  //
  // A page inside a page for one list is a navigation people have to learn. It
  // shows the step just done, the one running, and the one next — which is what
  // you want while scanning several launches — with the rest folded into a
  // count at either end for when this is the launch you came for.
  //
  // Only the deal the fixture actually describes carries dates and round
  // counts. Another launch gets the same path with nothing invented on it.
  const marks = launch.listing === DEAL.listing ? DEAL.marks : {};
  const seen = openPath.get(launch.id) ?? {};
  group.append(stepWindow(stepsFor(launch.reached, marks), {
    earlier: seen.earlier,
    later: seen.later,
    onEarlier: () => { openPath.set(launch.id, { ...seen, earlier: true }); render(); },
    onLater: () => { openPath.set(launch.id, { ...seen, later: true }); render(); },
  }));
  return group;
}

function launches() {
  const wrap = el('div', 'mission-panel launch-groups');
  for (const launch of row.launches ?? []) wrap.append(launchCard(launch));

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

// ── Updates ─────────────────────────────────────────────────────────────────
//
// A running log rather than a second Notes field, because the two answer
// different questions. Notes is standing context — what is always true about
// this mission. Updates are what happened and when, and editing that away
// destroys the thing it is for: "we told Isar the mass grew on 18 September"
// is only evidence while the date survives.
//
// Your own entries can be edited, because people mistype and a log nobody can
// correct fills up with asterisks. An edited entry says so, for the same reason
// a chat app marks them: a log you can silently rewrite is not a log.
//
// System events are not editable at all. They are a record of what the product
// observed, not of what anyone said, and they sit in the same stream because
// "Isar sent quote v2" and "I chased RFA" only mean something next to
// each other.

const DAY = 24 * 60 * 60 * 1000;

// Date and time, always. Three entries on the same day all reading "23 Sept"
// lose their order, and in a log the sequence is half the information —
// "we told them before the quote came in" is the whole point of some entries.
function when(iso) {
  const then = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
  const days = Math.round((Date.now() - then) / DAY);
  const clock = then.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const on = then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (days <= 0) return `Today, ${clock}`;
  if (days === 1) return `Yesterday, ${clock}`;
  if (days < 7) return `${days} days ago · ${on}, ${clock}`;
  return `${on}, ${clock}`;
}

let editingEntry = null;
let grouping = null;   // the configuration being built or edited, if any
let applying = null;   // the conditional suggestion whose change is armed, if any
let showDismissed = false;
let noting = null;     // the configuration whose note is open for editing, if any
let dragging = null;   // index of the configuration being dragged, if any
const openPath = new Map();  // launch id → which ends of its path are unfolded

function entryRow(entry, index) {
  const item = el('li', `log-entry${entry.event ? ' system' : ''}`);

  const head = el('div', 'log-head');
  head.append(el('span', 'log-who', entry.event ? 'OrbitMatch' : (entry.who ?? 'You')));
  if (entry.edited) head.append(el('span', 'log-edited', 'edited'));

  // Only your own words are yours to change. Somebody else's entry is a record
  // of what they said, and a colleague quietly rewriting it is worse than no
  // log at all — you would be reading Priya's name over Rohit's sentence.
  //
  // Matched on name here because the prototype has no accounts. A real build
  // compares an author id: two people called Sam would otherwise be able to
  // edit each other.
  const mine = !entry.event && (entry.who ?? '') === currentUser().name;

  // Marked, but still under your name. Replacing the name with "You" would
  // make the log read differently depending on who opened it, and the log is a
  // record of who said what. The tag says which one is yours; the Edit button
  // is the other half of the same fact, and the two should not disagree.
  if (mine) head.append(el('span', 'log-mine', 'You'));
  head.append(el('span', 'log-when', when(entry.at)));

  if (mine && editingEntry !== index) {
    const change = el('button', 'log-edit', 'Edit');
    change.type = 'button';
    change.addEventListener('click', () => { editingEntry = index; render(); });
    head.append(change);
  }
  item.append(head);

  if (entry.event) {
    const line = el('p', 'log-text');
    line.append(el('code', 'log-event', entry.event), document.createTextNode(` ${entry.text}`));
    item.append(line);
    return item;
  }

  if (mine && editingEntry === index) {
    const area = el('textarea', 'log-input');
    area.rows = 3;
    area.value = entry.text;
    area.setAttribute('aria-label', 'Edit this update');
    mentionPicker(area);

    const tools = el('div', 'log-tools');
    const save = el('button', 'submit compact', 'Save');
    save.type = 'button';
    save.addEventListener('click', () => {
      const written = area.value.trim();
      if (written && written !== entry.text) {
        entry.text = written;
        entry.edited = true;
      }
      editingEntry = null;
      render();
    });
    const cancel = el('button', 'ghost', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', () => { editingEntry = null; render(); });
    tools.append(cancel, save);

    item.append(area, tools);
    return item;
  }

  const line = el('p', 'log-text');
  line.append(withMentions(entry.text));
  item.append(line);
  return item;
}

function updates() {
  const wrap = el('div', 'log');
  row.activity = row.activity ?? [];

  const composer = el('div', 'log-composer');
  const area = el('textarea', 'log-input');
  area.rows = 2;
  // "Write", not "Post" or "Send". Post is left over from a button that now
  // says Send, and two verbs for one act is one too many. Send is wrong here in
  // a different way: the field is where you compose and the button is what
  // sends, so a placeholder that says Send describes the wrong control.
  area.placeholder = `Write an update on ${row.name}…`;
  area.setAttribute('aria-label', `Write an update on ${row.name}`);

  mentionPicker(area);

  const post = el('button', 'submit compact', 'Send');
  post.type = 'button';
  post.disabled = true;
  area.addEventListener('input', () => { post.disabled = !area.value.trim(); });
  post.addEventListener('click', () => {
    const written = area.value.trim();
    if (!written) return;
    row.activity.unshift({
      at: new Date().toISOString().slice(0, 16),
      who: currentUser().name,
      text: written,
    });
    const tagged = mentioned(written);
    render();
    // Say plainly that a tag does not reach anybody. A tag that looks like a
    // notification and is not is the worst of both.
    say(tagged.length
      ? `Added to this session only. ${tagged.map(name => '@' + name).join(' and ')} would be notified in a real build; nothing was sent.`
      : 'Added to this session only. The prototype saves nothing.');
  });

  const foot = el('div', 'log-composer-foot');
  foot.append(
    el('p', 'hint', 'Visible to your team. Type @ to tag a colleague. Sellers never see these, and nothing here is matched on.'),
    post,
  );
  composer.append(area, foot);
  wrap.append(composer);

  if (!row.activity.length) {
    wrap.append(el('p', 'empty', 'Nothing logged yet. Updates you post appear here alongside the events OrbitMatch records.'));
    return wrap;
  }

  const list = el('ol', 'log-list');
  row.activity.forEach((entry, index) => list.append(entryRow(entry, index)));
  wrap.append(list);
  return wrap;
}

// ── Launch configurations ───────────────────────────────────────────────────
//
// How this mission could be grouped onto launches. Shapes, not purchases.
//
// The first version of this listed real listings with sellers and prices, which
// was the wrong thing twice over. It put the launcher before the grouping, when
// the grouping is what matching goes looking for — and it turned an exploration
// into a checkout, where "use this configuration" reads as buying something
// nobody has quoted yet.
//
// So a configuration names only what rides with what, what that weighs, and
// whether it wants a rideshare or the whole vehicle. It is also where a
// constraint like "these two must fly together" finally becomes structured:
// putting them in one batch says it in a form a matcher can read.
//
// Several can be acceptable at once. A buyer who would take any of three
// arrangements is a buyer with three times the chance of a match, and saying so
// costs them nothing.
//
// NOT CONNECTED. The suggestions below are illustrative.
// What a batch weighs, needs and can accept — all of it worked out from the
// satellites in it, because a batch has no properties of its own.
//
// Three of these are not sums, and getting them wrong is how a configuration
// looks fine and cannot fly:
//
//   · the window is the *intersection* of the members' windows. Two satellites
//     that can never fly in the same quarter cannot share a launch, however
//     well the mass adds up.
//   · delivery is the *latest* ready-to-ship date. A batch leaves when its
//     slowest member is finished, not its fastest.
function batchFacts(names) {
  const on = row.satellites.filter(satellite => names.includes(satellite.name));

  // Spacecraft mass only. Deployers and separation systems are the launch
  // provider's side of the interface: which dispenser a satellite sits in is
  // decided with them, after a grouping exists, so it has no business shaping
  // the grouping. It was also making this disagree with the satellites table,
  // which reports the spacecraft's own mass.
  const mass = on.reduce((sum, s) => sum + (Number(s.mass) || 0), 0);


  const from = on.map(s => s.windowFrom).filter(Boolean).sort((a, b) => quarterRank(b) - quarterRank(a))[0];
  const to = on.map(s => s.windowTo).filter(Boolean).sort((a, b) => quarterRank(a) - quarterRank(b))[0];
  const clash = from && to && quarterRank(from) > quarterRank(to);

  const altitudes = [...new Set(on.map(s => Number(s.altitude)).filter(Boolean))].sort((a, b) => a - b);
  const orbits = [...new Set(on.map(s => s.orbit).filter(Boolean))];

  const ship = on.map(s => s.shipBy).filter(Boolean);
  const latest = ship.length ? ship[ship.length - 1] : '';

  return {
    count: on.length,
    mass: Number(mass.toFixed(1)),
    window: clash ? 'No shared window' : (from === to ? from : `${from} – ${to}`),
    clash,
    orbit: `${orbits.join(' / ')}${altitudes.length ? ` ${altitudes.length === 1 ? altitudes[0] : `${altitudes[0]}–${altitudes.at(-1)}`} km` : ''}`,
    ship: latest,
    ride: on.length > 1 ? 'Rideshare or dedicated' : 'Rideshare',
  };
}

// Which satellites ride with which, built by hand.
//
// It opens in place rather than in a dialog, the same as editing the record
// itself: this is a small structured change to something already on screen, and
// sending it to a modal would be the third place in this app where the same
// idea works differently.
//
// A select per satellite rather than dragging. Dragging looks better in a
// screenshot and is worse in every other way: it cannot be done from a
// keyboard, it needs a drop target for an empty launch, and it hides the one
// question being asked, which is simply which launch each satellite is on.
function grouper(draft, onDone) {
  const card = el('section', 'config config-editor');
  card.append(el('h4', 'cosmo-box-sub', 'Put each satellite on a launch'));

  const body = el('div', 'grouper');
  card.append(body);

  let lifting = null;   // index of the satellite being dragged

  // A chip that can be picked up, and can also be moved without a pointer.
  const chipFor = (at, where) => {
    const chip = el('span', 'grouper-sat', row.satellites[at].name);
    chip.draggable = true;
    chip.addEventListener('dragstart', event => {
      lifting = at;
      event.dataTransfer.effectAllowed = 'move';
      chip.classList.add('lifted');
    });
    chip.addEventListener('dragend', () => { lifting = null; chip.classList.remove('lifted'); });

    if (where !== null) {
      const off = el('button', 'grouper-off', '×');
      off.type = 'button';
      off.setAttribute('aria-label', `Take ${row.satellites[at].name} off launch ${where + 1}`);
      off.addEventListener('click', () => { draft.assign[at] = null; paint(); });
      chip.append(off);
    }
    return chip;
  };

  // Anything a chip can be dropped on behaves the same way.
  const asTarget = (node, to) => {
    node.addEventListener('dragover', event => {
      if (lifting === null || draft.assign[lifting] === to) return;
      event.preventDefault();
      node.classList.add('taking');
    });
    node.addEventListener('dragleave', () => node.classList.remove('taking'));
    node.addEventListener('drop', event => {
      event.preventDefault();
      node.classList.remove('taking');
      if (lifting === null) return;
      draft.assign[lifting] = to;
      lifting = null;
      paint();
    });
  };

  const paint = () => {
    body.replaceChildren();

    const launches = Math.max(draft.extra ?? 0, ...draft.assign.map(index => (index ?? -1) + 1));
    const waiting = row.satellites
      .map((satellite, at) => at)
      .filter(at => draft.assign[at] === null || draft.assign[at] === undefined);

    // Everything starts here and nothing is grouped until you group it.
    const tray = el('div', `grouper-tray${waiting.length ? '' : ' done'}`);
    const trayHead = el('div', 'grouper-bin-head');
    trayHead.append(
      el('span', 'grouper-bin-name', 'Not on a launch'),
      el('span', 'grouper-bin-facts', waiting.length
        ? `${waiting.length} to place`
        : 'all placed'),
    );
    tray.append(trayHead);

    const trayChips = el('div', 'grouper-chips');
    for (const at of waiting) trayChips.append(chipFor(at, null));
    if (!waiting.length) {
      trayChips.append(el('span', 'grouper-empty', 'Drag one back here to take it off a launch.'));
    }
    tray.append(trayChips);
    asTarget(tray, null);
    body.append(tray);

    let blocked = false;

    for (let index = 0; index < launches; index += 1) {
      const on = row.satellites.map((_, at) => at).filter(at => draft.assign[at] === index);
      const names = on.map(at => row.satellites[at].name);
      const facts = names.length ? batchFacts(names) : null;
      if (facts?.clash) blocked = true;

      const bin = el('div', `grouper-bin${facts?.clash ? ' clash' : ''}`);
      const head = el('div', 'grouper-bin-head');
      head.append(
        el('span', 'grouper-bin-name', `Launch ${index + 1}`),
        el('span', 'grouper-bin-facts', facts
          ? `${facts.mass} kg · ${facts.clash ? 'no shared window' : facts.window}`
          : 'nothing on it yet'),
      );

      // Removing a launch never leaves a satellite nowhere: its passengers go
      // back to the tray, where they are visibly still to be placed.
      const drop = el('button', 'grouper-drop', '×');
      drop.type = 'button';
      drop.setAttribute('aria-label', names.length
        ? `Remove launch ${index + 1} and put ${sentenceList(names)} back`
        : `Remove launch ${index + 1}`);
      drop.addEventListener('click', () => {
        draft.assign = draft.assign.map(seat => {
          if (seat === index) return null;
          return seat > index ? seat - 1 : seat;
        });
        draft.extra = Math.max(0, launches - 1);
        paint();
        if (names.length) say(`${sentenceList(names)} put back.`);
      });
      head.append(drop);
      bin.append(head);

      const chips = el('div', 'grouper-chips');
      for (const at of on) chips.append(chipFor(at, index));

      // The keyboard and touch route. Dragging is the shortcut, never the only
      // way: a pointer gesture cannot be done from a keyboard and fights with
      // scrolling on a touch screen.
      const elsewhere = row.satellites
        .map((satellite, at) => ({ name: satellite.name, at }))
        .filter(({ at }) => draft.assign[at] !== index);

      if (!names.length) {
        chips.append(el('span', 'grouper-empty', 'Drag satellites here'));
      }

      if (elsewhere.length) {
        const add = el('select', 'grouper-add');
        const prompt = el('option', null, names.length ? '+ Add' : 'or pick one');
        prompt.value = '';
        add.append(prompt);
        for (const { name, at } of elsewhere) {
          const choice = el('option', null, name);
          choice.value = String(at);
          add.append(choice);
        }
        add.setAttribute('aria-label', `Add a satellite to launch ${index + 1}`);
        add.addEventListener('change', () => {
          if (add.value === '') return;
          draft.assign[Number(add.value)] = index;
          paint();
        });
        chips.append(add);
      }
      bin.append(chips);

      if (facts?.clash) {
        bin.append(el('p', 'config-warn',
          `No overlapping launch window: ${sentenceList(names)} cannot fly together.`));
      }

      asTarget(bin, index);
      body.append(bin);
    }

    const more = el('button', 'ghost small', '+ Add a launch');
    more.type = 'button';
    more.addEventListener('click', () => { draft.extra = launches + 1; paint(); });
    body.append(more);

    const why = blocked
      ? 'One launch has no overlapping launch window. Move something before saving.'
      : waiting.length ? `Put ${waiting.length === 1 ? 'the last satellite' : `all ${waiting.length}`} on a launch to save.`
      : !launches ? 'Add a launch and put the satellites on it.'
      : '';
    if (why) body.append(el('p', 'hint warn', why));
    save.disabled = Boolean(why);
  };

  const tools = el('div', 'log-tools');
  const cancel = el('button', 'ghost', 'Cancel');
  cancel.type = 'button';
  cancel.addEventListener('click', () => onDone(null));
  const save = el('button', 'submit compact', 'Save grouping');
  save.type = 'button';
  save.addEventListener('click', () => onDone({ batches: batchesOf(draft) }));
  tools.append(cancel, save);
  card.append(tools);

  paint();
  return card;
}

// "A, B and C" rather than "A and B and C".
function sentenceList(items) {
  if (items.length < 3) return items.join(' and ');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

// Assignments to batches, dropping any launch nobody was put on.
function batchesOf(draft) {
  const groups = [];
  draft.assign.forEach((index, at) => {
    if (index === null || index === undefined) return;
    groups[index] = groups[index] ?? [];
    groups[index].push(row.satellites[at].name);
  });
  return groups.filter(Boolean);
}

// What a conditional suggestion is asking you to change, read off the mission
// as it stands. Written from the same list the change itself uses, so the
// sentence and the edit can never disagree.
function neededChanges(option) {
  return (option.changes ?? []).map(change => {
    const satellite = row.satellites.find(each => each.name === change.satellite) ?? {};
    return { ...change, from: satellite[change.field] ?? '', label: SAT_NAME[change.field] ?? change.field };
  });
}

const UNIT = { altitude: ' km', inclination: '°', mass: ' kg' };

function describeNeeded(option) {
  const changes = neededChanges(option);
  if (!changes.length) return '';
  const who = [...new Set(changes.map(change => change.satellite))].join(' and ');

  // The two ends of a window are one fact to a reader, so they are said once.
  const parts = [];
  const from = changes.find(change => change.field === 'windowFrom');
  const to = changes.find(change => change.field === 'windowTo');
  if (from || to) {
    const was = [from?.from, to?.from].filter(Boolean);
    const now = [from?.to, to?.to].filter(Boolean);
    parts.push(`its launch window from ${[...new Set(was)].join(' – ')} to ${[...new Set(now)].join(' – ')}`);
  }
  for (const change of changes) {
    if (change.field === 'windowFrom' || change.field === 'windowTo') continue;
    const unit = UNIT[change.field] ?? '';
    parts.push(`its ${change.label} from ${shown(change.from)}${unit} to ${shown(change.to)}${unit}`);
  }

  const last = parts.pop();
  return `${who} to move ${parts.length ? `${parts.join(', ')} and ${last}` : last}.`;
}

// The first letter nobody is using. Fixed for the life of a configuration.
function freeLetter(options) {
  const taken = new Set(options.filter(each => each.letter).map(each => each.letter));
  for (let at = 0; at < 26; at += 1) {
    const mark = String.fromCharCode(65 + at);
    if (!taken.has(mark)) return mark;
  }
  return '?';
}

// Move an accepted configuration through the order the others are in.
function moveWithin(options, option, by) {
  const added = options.filter(each => each.added);
  const from = added.indexOf(option);
  const to = Math.max(0, Math.min(added.length - 1, from + by));
  if (from === to) return;
  added.splice(from, 1);
  added.splice(to, 0, option);

  const rest = options.filter(each => !each.added);
  options.length = 0;
  options.push(...added, ...rest);
}

function configuration() {
  const wrap = el('div', 'mission-panel');
  const options = row.configurations ?? [];

  // A mission with one satellite has nothing to group. The tab used to invite
  // you to group it anyway, which is a question with no answer. Say why it is
  // empty instead of pretending there is work here.
  if ((row.satellites ?? []).length < 2) {
    wrap.append(el('p', 'empty',
      `${row.name} has one satellite, so there is nothing to group. Configurations appear once a mission has two or more.`));
    return wrap;
  }

  // The one thing you can start here sits at the top, beside the sentence that
  // explains the tab. At the bottom it was below every card, so the more
  // options Cosmo had the further you had to scroll to do the thing that does
  // not involve Cosmo at all.
  const intro = el('div', 'config-intro');
  intro.append(el('p', 'panel-note',
    'Ways these satellites could be grouped onto launches. Add the ones you would accept: matching looks for launches that fit any of them. No launch is chosen here and nothing is sent.'));

  const add = el('button', 'ghost group-own', '+ Group them yourself');
  add.type = 'button';
  add.addEventListener('click', () => {
    // everything on one launch to begin with: the commonest starting point, and
    // it means the preview has something to show from the first render
    grouping = { id: null, assign: row.satellites.map(() => null), extra: 1 };
    render();
  });
  intro.append(add);
  wrap.append(intro);

  if (grouping) {
    wrap.append(grouper(grouping, saved => {
      if (saved) {
        const at = options.findIndex(option => option.id === grouping.id);
        if (at >= 0) Object.assign(options[at], saved);
        else options.push({ id: `own-${Date.now()}`, added: true, letter: freeLetter(options), ...saved });
        say('Saved to this session only. The prototype stores nothing.');
      }
      grouping = null;
      render();
    }));
  }

  // Cosmo does not suggest a grouping that cannot fly.
  //
  // It will suggest one that needs something to move, but only when the mission
  // has already said it can flex on that thing — and then it says what would
  // have to give, under its own heading, rather than sitting among the options
  // that work today. A suggestion nobody can act on is noise, and one that
  // looks actionable and is not is worse than noise.
  const flexes = new Set(row.flexibility ?? []);
  const ready = options.filter(option => !option.needs);
  const conditional = options.filter(option => option.needs && flexes.has(option.needs));

  // Cosmo proposes, you take it.
  //
  // There used to be a checkbox on every card, which meant your decision was
  // stored inside Cosmo's list: the same surface held what Cosmo thought might
  // work and what you had agreed to, and the two are not the same thing. Add
  // moves the shape into your list, where it is yours, and Remove sends it
  // back. One state, and the list on the page is exactly the set matching runs
  // against.
  // A letter identifies a configuration. The number beside it is its rank.
  //
  // These used to be the same thing — the letter came from the position — so
  // dragging B above A renamed them both, and a note reading "B is the
  // fallback" became untrue the moment you reordered. The letter is fixed when
  // a configuration joins your list and travels with it; only the rank moves.
  //
  // Cosmo's suggestions have no letter: naming a proposal implies a standing
  // thing. One is assigned on the way in.
  //
  // And a letter is all there is. A typed name can be made false by the next
  // regroup — "Cheapest two-launch split" sitting over a table showing three —
  // while a letter cannot say anything untrue. Why you keep a configuration
  // goes in its note, which describes intent rather than shape and so survives
  // the shape changing.
  const move = (option, by) => { moveWithin(options, option, by); render(); };

  const letter = option => `Configuration ${option.letter ?? '?'}`;

  const draw = option => {
    const card = el('section', `config${option.needs ? ' conditional' : ''}${option.dismissed ? ' dismissed' : ''}`);

    const head = el('div', 'config-head');

    const count = option.batches.length;
    const shape = `${count} launch${count === 1 ? '' : 'es'}`;

    const titles = el('div');
    const name = el('div', 'config-name');

    name.append(el('span', 'config-title', option.added ? letter(option) : shape));

    // Once it is yours the heading is the letter, so the shape moves underneath
    // it. On a suggestion the shape is already the heading and there is nothing
    // left to say here.
    titles.append(name);
    if (option.added) titles.append(el('p', 'config-meta', shape));

    const acts = el('div', 'config-acts');
    if (option.added) {
      // Removing and rebuilding was the only way to change a shape, and
      // rebuilding was a toast. Every other object on this page edits in place.
      const change = el('button', 'ghost small', 'Regroup');
      change.type = 'button';
      change.addEventListener('click', () => {
        const assign = row.satellites.map(satellite => {
          const at = option.batches.findIndex(names => names.includes(satellite.name));
          return at < 0 ? null : at;
        });
        grouping = { id: option.id, assign };
        render();
      });
      acts.append(change);
    }

    // Turning one down is worth recording. Without it, "I looked at this and
    // ruled it out" and "I have not read it yet" are the same state, and the
    // shapes you have already rejected crowd the ones you have not.
    //
    // Nothing is destroyed: Cosmo's reasoning is not reproducible here, so a
    // dismissed shape folds away rather than going, and comes back on a click.
    if (!option.added) {
      const no = el('button', 'ghost small', option.dismissed ? 'Restore' : 'Dismiss');
      no.type = 'button';
      no.addEventListener('click', () => {
        option.dismissed = !option.dismissed;
        if (option.dismissed) applying = null;
        render();
      });
      acts.append(no);
    }

    // No Add on a shape that cannot fly.
    //
    // Accepting one put something in your list that matching could never find a
    // launch for, and the chip marking it was a label apologising for a state
    // that should not exist. Make it possible first; the card then moves up
    // into the ordinary suggestions and earns its Add there.
    if (option.needs && !option.added) {
      // Dismiss stays in the head where it is on every other suggestion, and
      // "Make this change" is the primary action at the foot. Two verbs, in the
      // same places as the two on an ordinary card.
      head.append(titles, acts);
      card.append(head);
    } else {

    const act = el('button', `ghost small${option.added ? '' : ' add-config'}`, option.added ? 'Remove' : 'Add');
    act.type = 'button';
    act.addEventListener('click', () => {
      if (!option.added) {
        option.added = true;
        option.letter = option.letter ?? freeLetter(options);
      } else if (option.from) {
        // came from Cosmo, so it goes back to the box rather than vanishing
        option.added = false;
      } else {
        options.splice(options.indexOf(option), 1);
      }
      render();
    });

    acts.append(act);
    head.append(titles, acts);
    card.append(head);
    }

    // Launch first, then the satellites on it.
    //
    // One flat grid rather than a row element per satellite, so the launch cell
    // can span the rows beneath it. Repeating "Launch 1" down the column was
    // the grouping stated once per satellite when it is a property of the
    // launch, and a merged cell draws the grouping instead of spelling it out.
    //
    // The summary line under each group has gone with it: every number on it
    // was already on the rows above or in the card heading. What was not
    // duplicated — how many listings could take the launch — moves into the
    // merged cell, where it belongs to the launch it describes.
    const table = el('div', 'config-table');
    const th = text => el('span', 'config-th', text);
    table.append(
      th('Launch'), th('Satellite'),
      th('Orbit type'), th('Inclination (°)'), th('Altitude (km)'), th('LTAN'),
      th('Launch window'), th('Ready to ship'), th('Mass (kg)'), th('L×W×H (mm)'),
    );

    let broken = false;
    option.batches.forEach((names, group) => {
      const facts = batchFacts(names);
      if (facts.clash) broken = true;
      const merged = el('div', `config-group${facts.clash ? ' clash' : ''}`);
      merged.style.setProperty('--span', String(names.length));
      merged.append(
        el('span', 'config-group-name', `Launch ${group + 1}`),
        // the one number that belongs to the launch rather than to a satellite
        el('span', 'config-group-mass', `${facts.mass} kg total`),
      );
      table.append(merged);

      for (const who of names) {
        const satellite = row.satellites.find(each => each.name === who) ?? {};
        const window = [...new Set([satellite.windowFrom, satellite.windowTo].filter(Boolean))];
        const cell = (className, label, text) => {
          const node = el('span', `config-td ${className}`, text);
          node.dataset.label = label;
          return node;
        };
        // Split out rather than "SSO 520 km": inclination and LTAN decide as
        // much about what can carry a satellite as the altitude does, and they
        // are the same columns the satellites table on Overview uses, so the
        // two read the same way.
        table.append(
          cell('config-sat', 'Satellite', who),
          cell('config-orbit', 'Orbit type', satellite.orbit || '—'),
          cell('config-inc num', 'Inclination (°)', satellite.inclination || '—'),
          cell('config-alt num', 'Altitude (km)', satellite.altitude || '—'),
          cell('config-ltan', 'LTAN', satellite.ltan || '—'),
          cell('config-window', 'Launch window', window.length ? window.join(' – ') : '—'),
          cell('config-ship', 'Ready to ship', satellite.shipBy || '—'),
          cell('config-mass num', 'Mass (kg)', satellite.mass || '—'),
          cell('config-dims num', 'L×W×H (mm)', satellite.dimensions || '—'),
        );
      }
    });
    card.append(table);

    // Why you keep this one.
    //
    // Cosmo's for-and-against came out because arguing both sides of a settled
    // decision reads as a choice still open. This is the other half of that: a
    // line in your own words about a shape you have actually chosen, which is a
    // record rather than an argument. Only on shapes that are yours, for the
    // same reason.
    if (option.added) {
      if (noting === option.id) {
        const note = el('div', 'config-note-edit');
        const area = el('textarea', 'log-input');
        area.rows = 2;
        area.value = option.note ?? '';
        area.placeholder = `Why ${letter(option)}?`;
        area.setAttribute('aria-label', `Note on ${letter(option)}`);
        mentionPicker(area);

        const tools = el('div', 'log-tools');
        const cancel = el('button', 'ghost', 'Cancel');
        cancel.type = 'button';
        cancel.addEventListener('click', () => { noting = null; render(); });
        const keep = el('button', 'submit compact', 'Save note');
        keep.type = 'button';
        keep.addEventListener('click', () => {
          const written = area.value.trim();
          if (written) option.note = written;
          else delete option.note;
          noting = null;
          render();
        });
        tools.append(cancel, keep);
        note.append(area, tools);
        card.append(note);
      } else if (option.note) {
        const note = el('p', 'config-note');
        note.append(withMentions(option.note));
        const change = el('button', 'log-edit', 'Edit');
        change.type = 'button';
        change.addEventListener('click', () => { noting = option.id; render(); });
        note.append(change);
        card.append(note);
      } else {
        const start = el('button', 'cosmo-dismissed', '+ Add a note');
        start.type = 'button';
        start.addEventListener('click', () => { noting = option.id; render(); });
        card.append(start);
      }
    }

    const needed = describeNeeded(option);
    if (broken) {
      card.append(el('p', needed ? 'config-needs' : 'config-warn',
        needed
          ? `Needs ${needed}`
          : 'No overlapping launch window, so these satellites cannot fly together.'));
    }

    // Cosmo says what would have to move; this is where you say yes to it.
    //
    // It changes the mission, not the configuration, so it is armed rather than
    // applied on the first click and the second button names the spacecraft it
    // touches. It is also only one way to make the shape work — the Auroras
    // could move later instead — which is why it is offered and not assumed.
    if (needed && !option.added) {
      const changes = neededChanges(option);
      const who = [...new Set(changes.map(change => change.satellite))].join(' and ');
      const armed = applying === option.id;

      const ask = el('div', 'config-apply');
      if (armed) {
        ask.append(el('p', 'config-apply-note', row.status === 'Published'
          ? `This edits ${who} on a published mission. Sellers you are matched with see the update.`
          : `This edits ${who}. Nothing is sent while the mission is a draft.`));
      }

      const tools = el('div', 'config-apply-tools');
      const go = el('button', `ghost small${armed ? ' add-config' : ''}`,
        armed ? `Yes, change ${who}` : 'Make this change');
      go.type = 'button';
      go.addEventListener('click', () => {
        if (!armed) { applying = option.id; render(); return; }
        const before = JSON.parse(JSON.stringify(row));
        for (const change of changes) {
          const satellite = row.satellites.find(each => each.name === change.satellite);
          if (satellite) satellite[change.field] = change.to;
        }
        delete option.needs;
        delete option.changes;
        applying = null;
        log({ text: describeChanges(before, row) || `Changed ${who}.` });
        render();
        say(`${who} updated in this session only. The prototype saves nothing.`);
      });
      tools.append(go);

      if (armed) {
        const stop = el('button', 'ghost small', 'Leave it as it is');
        stop.type = 'button';
        stop.addEventListener('click', () => { applying = null; render(); });
        tools.append(stop);
      }
      // There was a third button here, for resolving it some other way. It was
      // one too many on a card that already says everything it needs to, and
      // "Update mission" is at the top of every page for exactly that.

      ask.append(tools);
      card.append(ask);
    }

    return card;
  };

  // Cosmo's suggestions sit inside their own box, under the star.
  //
  // Everything on this tab looks alike, so without a boundary a suggestion and
  // a grouping you made yourself read as the same kind of thing. The box says
  // where these came from once, at the top, instead of repeating it on every
  // card.
  const mine = options.filter(option => option.added);
  const cosmo = list => list.filter(option =>
    option.from === 'Cosmo' && !option.added && !option.dismissed);

  if (mine.length) {
    // Order is preference, first is favourite.
    //
    // Draggable, but never only draggable: a pointer gesture cannot be done
    // from a keyboard, on a touch screen it fights with scrolling, and it
    // leaves no trace of what it did. The arrows are the real control and the
    // drag is the shortcut, so both move the same list.
    // What the order means, before the list rather than after it. It used to be
    // a hint underneath, so you read three cards and only then found out they
    // were ranked.
    if (mine.length > 1) {
      const says = el('div', 'rank-head');
      says.append(
        el('h4', 'cosmo-box-sub', 'In order of preference'),
        el('p', 'panel-note',
          'Drag a configuration, or use the arrows. If more than one works, sellers see which you would rather have.'),
      );
      wrap.append(says);
    }

    const list = el('div', 'config-rank');
    mine.forEach((option, at) => {
      const card = draw(option);
      card.draggable = true;
      card.dataset.at = String(at);

      card.addEventListener('dragstart', event => {
        dragging = at;
        event.dataTransfer.effectAllowed = 'move';
        card.classList.add('lifted');
      });
      card.addEventListener('dragend', () => { dragging = null; card.classList.remove('lifted'); });
      card.addEventListener('dragover', event => {
        if (dragging === null || dragging === at) return;
        event.preventDefault();
        card.classList.add(dragging < at ? 'under' : 'over');
      });
      card.addEventListener('dragleave', () => card.classList.remove('over', 'under'));
      card.addEventListener('drop', event => {
        event.preventDefault();
        card.classList.remove('over', 'under');
        if (dragging === null || dragging === at) return;
        move(mine[dragging], at - dragging);
      });

      // The rank, and the two buttons that are the accessible way to change it
      const rank = el('div', 'config-rank-tools');
      if (mine.length > 1) {
        // the conventional "this row moves" mark, so the card does not rely on
        // a sentence to say it is draggable
        const grip = el('span', 'config-grip');
        grip.innerHTML = `
          <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true" fill="currentColor">
            <circle cx="2" cy="3" r="1.15"/><circle cx="8" cy="3" r="1.15"/>
            <circle cx="2" cy="8" r="1.15"/><circle cx="8" cy="8" r="1.15"/>
            <circle cx="2" cy="13" r="1.15"/><circle cx="8" cy="13" r="1.15"/>
          </svg>`;
        rank.append(grip);
      }
      rank.append(el('span', 'config-rank-n', String(at + 1)));
      const up = el('button', 'config-rank-btn', '↑');
      up.type = 'button';
      up.title = 'Prefer this more';
      up.setAttribute('aria-label', `Move ${letter(option)} up`);
      up.disabled = at === 0;
      up.addEventListener('click', () => move(option, -1));
      const down = el('button', 'config-rank-btn', '↓');
      down.type = 'button';
      down.title = 'Prefer this less';
      down.setAttribute('aria-label', `Move ${letter(option)} down`);
      down.disabled = at === mine.length - 1;
      down.addEventListener('click', () => move(option, 1));
      rank.append(up, down);
      card.prepend(rank);

      list.append(card);
    });
    wrap.append(list);

  } else {
    // Only offer Cosmo as a way forward when Cosmo has actually put something
    // on the page. Pointing at a box that is not there reads as a bug.
    // A notice, not a question.
    //
    // This was a gate at publish, then a choice between two answers here. Both
    // were heavier than the fact: stating a grouping is optional, and it exists
    // so sellers can see a preference. What silence means is said out loud, so
    // leaving it empty is an informed choice rather than an oversight.
    const notice = el('p', 'config-notice');
    notice.append(
      el('span', 'config-notice-mark', '!'),
      document.createTextNode(`Set launch configuration preferences for ${row.name} if you want sellers to see how you would group these satellites. Without any, they will assume every grouping is acceptable.`),
    );
    wrap.append(notice);
  }

  const suggested = [...cosmo(ready), ...cosmo(conditional)];

  // The box is always here once a mission can be grouped at all.
  //
  // It used to vanish when Cosmo had nothing to offer, which reads as Cosmo
  // being broken rather than Cosmo having nothing to say. An absent panel
  // cannot explain itself, so it stays and gives the reason instead.
  const required = options.find(option =>
    option.added && !option.from && option.batches.length === 1
    && option.batches[0].length === row.satellites.length);

  {
    const box = el('section', 'cosmo-box');

    const head = el('div', 'cosmo-box-head');
    const mark = el('span', 'cosmo-box-star');
    mark.innerHTML = STAR(15);
    head.append(mark, el('h3', 'cosmo-box-title', "Cosmo's suggestions"));
    box.append(head, el('p', 'cosmo-box-note',
      'Shapes Cosmo thinks would work, from the windows, orbits and masses you entered. Nothing here is chosen for you.'));

    if (!suggested.length) {
      const anyFromCosmo = options.some(option => option.from === 'Cosmo');
      const turnedDown = options.filter(option => option.dismissed).length;
      box.append(el('p', 'empty',
        turnedDown ? `Nothing left to consider. ${turnedDown === 1 ? 'One is' : `${turnedDown} are`} dismissed below.`
          : anyFromCosmo ? 'You have taken all of them.'
          : required ? `Nothing to suggest. ${row.name} requires every satellite on one launch, so there is only one shape it can take.`
          : 'Nothing to suggest yet. Cosmo proposes groupings once the satellites have windows, orbits and masses to work from.'));
    }

    for (const option of cosmo(ready)) box.append(draw(option));

    // folded away at the foot of the box, with a count and a way back in
    const turnedDown = options.filter(option => option.dismissed);
    if (turnedDown.length) {
      const toggle = el('button', 'link-button cosmo-dismissed',
        `${turnedDown.length} dismissed${showDismissed ? '' : ' · show'}`);
      toggle.type = 'button';
      toggle.addEventListener('click', () => { showDismissed = !showDismissed; render(); });
      box.append(toggle);
      if (showDismissed) for (const option of turnedDown) box.append(draw(option));
    }

    if (cosmo(conditional).length) {
      box.append(el('h4', 'cosmo-box-sub', 'Possible if something moves'));
      box.append(el('p', 'cosmo-box-note',
        `These do not work as the mission stands. Cosmo raises them because it can flex on ${[...flexes].join(' and ').toLowerCase()}.`));
      for (const option of cosmo(conditional)) box.append(draw(option));
    }

    wrap.append(box);
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

  // A record you can type into should not look like a record you are reading —
  // the panel itself changes. No banner: the fields are visibly fields, the
  // buttons say Cancel and Save changes, and a strip of text repeating that is
  // a line to scroll past rather than information. The prototype's "nothing is
  // saved" belongs on the save, which is when it matters, not before.
  document.body.classList.toggle('editing-record', editing);

  const head = el('div', 'mission-head detail');
  const titles = el('div', 'mission-titles');
  const nameRow = el('div', 'mission-name-row');

  if (editing) {
    // The name and the objective are fields on the form, so they are fields
    // here — a record you cannot rename is not really editable.
    const name = el('input', 'title-input');
    name.type = 'text';
    name.value = row.name;
    name.maxLength = 120;
    name.setAttribute('aria-label', 'Mission name');
    name.addEventListener('input', () => { row.name = name.value; });
    nameRow.append(name);
  } else {
    nameRow.append(el('h1', null, row.name));
  }
  nameRow.append(el('span', `chip status ${row.status.toLowerCase()}`, row.status));

  if (editing) {
    const objective = el('input', 'sub-input');
    objective.type = 'text';
    objective.value = row.objective ?? '';
    objective.maxLength = 300;
    objective.setAttribute('aria-label', 'Objective');
    objective.addEventListener('input', () => { row.objective = objective.value; });
    titles.append(nameRow, objective);
  } else {
    titles.append(nameRow, el('p', 'mission-objective', row.objective));
  }

  // No Ask Cosmo here: the nav bar carries it on every page, and a second copy
  // of the same button three inches below the first is not a shortcut.
  const tools = el('div', 'mission-tools');

  if (editing) {
    // Cancel throws work away, so when there is work to throw away it asks
    // once — as a second press of the same button rather than a dialog, which
    // would cover the very changes you are deciding about.
    const cancel = el('button', `ghost${armed ? ' danger' : ''}`,
      confirming ? 'Keep editing' : (armed ? 'Discard changes' : 'Cancel'));
    cancel.type = 'button';
    cancel.addEventListener('click', () => {
      // while a save is being confirmed, this backs out of the question rather
      // than out of the edit
      if (confirming) { confirming = false; render(); return; }
      if (changed() && !armed) { armed = true; render(); return; }
      // The edits went straight into the row, so putting the record back means
      // restoring the copy taken when edit mode opened.
      Object.assign(row, structuredClone(backup));
      editing = false;
      backup = null;
      armed = false;
      confirming = false;
      render();
    });

    const save = el('button', 'submit compact', confirming ? 'Save and update listing' : 'Save changes');
    save.type = 'button';
    save.disabled = !changed();
    save.title = save.disabled
      ? 'Nothing has changed yet.'
      : row.status === 'Published'
        ? 'A published mission is re-matched against every listing when you save.'
        : '';
    save.addEventListener('click', save_);

    tools.append(cancel, save);

    // Said beside the button, and only while it is true. Built once and kept in
    // step by the input handler below: a re-render on every keystroke would
    // take the focus out of the field being typed into.
    const note = el('p', 'save-note');
    titles.append(note);

    const syncNote = () => {
      const live = row.status === 'Published' && matchingChanged();
      const busy = inProcurement();
      note.hidden = !live;
      note.classList.toggle('loud', confirming);
      if (!live) return;
      // A match is a suggestion and can be withdrawn when it stops fitting. A
      // launch in procurement is a relationship — a request sent, an NDA
      // signed, a quote issued — and changing your spec does not end it. The
      // seller is told what moved and decides for themselves whether to revise
      // or pull their quote. Nothing is cancelled on anyone's behalf.
      note.textContent = busy
        ? `${row.name} is published and ${busy} seller${busy === 1 ? ' is' : 's are'} in procurement against it. `
          + `Saving tells ${busy === 1 ? 'them' : 'each of them'} what changed. `
          + `${busy === 1 ? 'They' : 'They'} may revise or withdraw a quote; nothing is cancelled for you.`
        : `${row.name} is published. Saving re-matches it against every launch listing.`;
      save.textContent = confirming ? 'Save and update listing' : 'Save changes';
    };
    syncNote();
    canvas.addEventListener('input', syncNote);
    canvas.addEventListener('change', syncNote);
  } else {
    // Publishing is what makes a mission visible to matching, so the button says
    // which way it is going.
    //
    // Withdrawing while somebody is mid-quote is a real cost, and the first
    // version of this handled that by disabling the button and putting the
    // reason in a tooltip. That was wrong twice over: a disabled control with an
    // invisible reason reads as broken, and forbidding it is not ours to do —
    // a buyer may withdraw, they just need to know what it lands on. So the
    // button always works, and when it costs something it says so and asks
    // once, in the open.
    const busy = inProcurement();
    const published = row.status === 'Published';

    const swap = el('button', `ghost${withdrawing ? ' danger' : ''}`,
      published ? (withdrawing ? 'Withdraw anyway' : 'Unpublish') : 'Publish');
    swap.type = 'button';
    swap.title = published
      ? 'Stops this mission being matched against listings.'
      : 'Matches this mission against every published listing.';
    swap.addEventListener('click', () => {
      if (published && busy && !withdrawing) {
        withdrawing = true;
        render();
        return;
      }
      withdrawing = false;
      row.status = published ? 'Draft' : 'Published';
      log(published
        ? { event: 'MissionUnpublished', text: `Withdrawn from matching${busy ? `. ${busy} seller${busy === 1 ? '' : 's'} in procurement notified.` : '.'}` }
        : { event: 'MissionPublished', text: 'Published and matched against every launch listing.' });
      render();
      say(published
        ? `Withdrawn from matching — would write MissionUnpublished${busy ? `, and notify ${busy} seller${busy === 1 ? '' : 's'} already in procurement` : ''}. Nothing is saved in the prototype.`
        : 'Published — would write MissionPublished, then a MatchFound for each listing that fits. Nothing is saved in the prototype.');
    });

    // The reason, where it can be read rather than hovered for.
    if (published && busy && withdrawing) {
      titles.append(Object.assign(el('p', 'save-note loud'), {
        textContent: `${busy} launch${busy === 1 ? '' : 'es'} in procurement. Withdrawing leaves a seller mid-quote — they are told, and the match is closed.`,
      }));
    }

    // Arming a destructive action has to leave a way back that is as easy as
    // going forward. "Withdraw anyway" on its own means the only button that
    // resolves the question is the one that does the damage.
    //
    // Note this only swaps the buttons — it must not return early out of
    // render(), or the tabs and the whole panel below never get built and the
    // page goes blank behind the question.
    if (published && busy && withdrawing) {
      const keep = el('button', 'ghost', 'Keep published');
      keep.type = 'button';
      keep.addEventListener('click', () => { withdrawing = false; render(); });
      tools.append(keep, swap);
    } else {
      const edit = el('button', 'ghost', 'Update mission');
      edit.type = 'button';
      edit.addEventListener('click', () => {
        withdrawing = false;
        backup = structuredClone(row);
        editing = true;
        tab = 'overview';
        render();
      });
      tools.append(swap, edit);
    }
  }

  head.append(titles, tools);

  // Typing changes whether there is anything to save, and pressing Cancel once
  // stops meaning "are you sure" the moment you carry on editing.
  if (editing) {
    const live = () => {
      const save = tools.querySelector('.submit');
      if (!save) return;
      save.disabled = !changed();
      save.title = save.disabled ? 'Nothing has changed yet.' : '';
      if (armed) { armed = false; tools.querySelector('.ghost').textContent = 'Cancel'; tools.querySelector('.ghost').classList.remove('danger'); }
      // carrying on typing withdraws the pending "are you sure"
      if (confirming) confirming = false;
    };
    canvas.addEventListener('input', live);
    canvas.addEventListener('change', live);
  }
  canvas.append(head);

  // Procurement is deal state, not something this form edits, so it is out of
  // reach while the record is open for changes.
  const panels = view === 'buy' && !editing
    ? [
      ['overview', 'Overview', overview],
      // Counts what you have added, not what Cosmo has offered: the tab should
      // report your commitments, the same as Procurement reports real launches.
      ['configuration', 'Launch Configurations', configuration, (row.configurations ?? []).filter(option => option.added).length],
      ['procurement', 'Procurement', launches, (row.launches ?? []).length],
    ]
    : [['overview', 'Overview', overview]];

  // ?tab=satellites was a real tab until the merge; send those links to where
  // the satellites went rather than dropping them on a default.
  if (tab === 'satellites') tab = 'overview';
  if (tab === 'launches') tab = 'procurement';
  if (tab === 'updates') tab = 'overview';
  if (!panels.some(([key]) => key === tab)) tab = 'overview';

  const bar = el('nav', 'mission-tabs');
  bar.setAttribute('aria-label', 'Mission sections');
  for (const [key, label, , count] of panels) {
    const button = el('button', `mission-tab${key === tab ? ' on' : ''}`, label);
    button.type = 'button';
    // A bubble rather than "(2)". Brackets read as part of the tab's name; a
    // bubble reads as a quantity, and it is the same shape as the counts
    // already on the bell and the message icon.
    if (count) button.append(el('span', 'tab-count', String(count)));
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
