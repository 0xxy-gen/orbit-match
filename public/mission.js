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
import { MISSION_ROWS, LISTINGS, SERVICES } from './demo-data.js';
import { COUNTRIES, EXPORT_CONTROL, RIDE_PREFERENCES, FLEXIBILITY, quarterRank } from './mission-options.js';
import { satelliteTable, satelliteEditor } from './satellite-table.js';
import { assistant, toggleAssistant, STAR, PORTRAIT } from './assistant.js';
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
let landed = false;   // a deep link is followed once, not on every render

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
  if (event.key === 'Escape' && asking) {
    asking = null;
    render();
    return;
  }
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

  // Launch configurations, in the record rather than in a tab of their own.
  //
  // They were a tab, and a tab made them feel like a separate exercise you
  // might or might not get round to. They are not: a configuration is a thing
  // you are telling sellers, exactly like the notes above it, and it belongs in
  // the same breath. Sitting under "Notes to sellers" is the honest placement —
  // both are what the other side gets to see.
  //
  // Not while editing. The record is open for changes and a grouping you can
  // drag is not one of the fields being changed.
  // Shown on every mission, including the ones with a single satellite.
  //
  // Hiding it below two satellites made the page a different shape on Lyra and
  // Halcyon than on the rest, and an absent section cannot explain itself —
  // "where did launch configurations go" is a worse question than one line
  // saying there is nothing here to group. The panel already had that line
  // written; the guard meant it could never render.
  if (view === 'buy' && !editing) {
    const added = (row.configurations ?? []).filter(option => option.added).length;
    // No rule above it. The band marks a change of kind, which is why Activity
    // has one — but configurations are the same kind of thing as the notes
    // above them: the record, and the part of it sellers read. A rule here
    // would say "new section" while the placement says "same breath".
    const heading = el('h3', 'panel-heading');
    heading.id = 'configurations';
    heading.append(document.createTextNode('Launch configurations'), el('span', 'shared-badge', 'Shared'));
    if (added) heading.append(el('span', 'tab-count', String(added)));
    wrap.append(heading, configuration());
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

// Which launch of which configuration an offer fills.
//
// Not just "Configuration A": A is two launches and a deal answers one of them.
// Exact, not a subset — a launch carrying one satellite out of a batch of two
// has not filled that batch, and saying it had would hide the gap.
function fillsFor(on) {
  const riding = new Set(on.map(satellite => satellite.name));
  return (row.configurations ?? [])
    .filter(option => option.added)
    .flatMap(option => option.batches
      .map((names, at) => ({ option, at, names }))
      .filter(({ names }) => names.length === riding.size && names.every(who => riding.has(who))));
}

// ── one row per offer, because the job is comparing them ────────────────────
//
// This was a card each, a thousand pixels tall, so telling two offers apart
// meant scrolling between them and holding the first in your head. The columns
// are the things you actually weigh one against another; everything else opens
// under the row it belongs to.

// What you can do, and it depends where the deal is.
//
// A single Accept on every row would mean a different thing on each one:
// accepting an NDA is not accepting a quote. The seventeen-step path already
// names whose turn it is and what the move is called, so the buttons come from
// there rather than from a generic set.
//
// Declining takes a reason, optionally. A decline with no reason is information
// lost twice over: the seller cannot fix what they were not told about, and
// matching learns nothing about what you will not take.
// One table, with the state as a column.
//
// This was two tables with their own headings, which said the same thing more
// loudly and cost a header row each. The distinction that split them was real
// though: a matched listing's figure is arithmetic off an advertised rate,
// while a quote is a number someone has committed to. That now lives in the
// value — "~$4.90M" against "$6.53M" — rather than in a column heading that
// could only say one of them at a time. The tilde is the whole marker: a word
// beside it said the same thing a third time and read like a typo.

// The one date format this app writes: 28 Sept 2026, matching the fixture.
// toDateString gives "Sep 28 2026", which sat next to "22 Sept 2026" and read
// like two different systems.
function today() {
  const now = new Date();
  const month = now.toLocaleString('en-GB', { month: 'short' });
  return `${now.getDate()} ${month === 'Sep' ? 'Sept' : month} ${now.getFullYear()}`;
}

// How long ago the matcher paired this listing with the mission.
function sinceMatch(when) {
  const days = Math.round((Date.now() - Date.parse(`${String(when).replace('Sept', 'Sep')} 12:00`)) / (24 * 60 * 60 * 1000));
  if (!Number.isFinite(days) || days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? 'a week ago' : `${weeks} weeks ago`;
  }
  const months = Math.round(days / 30);
  return months === 1 ? 'a month ago' : `${months} months ago`;
}

// Which satellites an offer is for.
//
// `carries` when the offer names them, because several competing offers can
// name the same satellite and only one can ever be committed to. Otherwise the
// satellites actually assigned to this launch.
function carriedBy(launch) {
  if (launch.carries) {
    return row.satellites.filter(satellite => launch.carries.includes(satellite.name));
  }
  return row.satellites.filter(satellite => satellite.launch === launch.id);
}

// Everything on one row.
//
// The listing spec is about thirty fields and they are all here as columns,
// because the point of a table is reading down one: "Testing" says +$41k,
// +$50k, +$38k, not offered — which no amount of per-row detail can do.
//
// It is wide and it scrolls sideways. That trade is deliberate: a panel folded
// under each row hides exactly the comparison you came for.
const MATCH_GROUPS = [
  ['', ['Listing', 'Vehicle']],
  ['Seller', ['Company', 'Nationality']],
  ['Match', ['Carrying', 'Matched on']],
  ['Flight', ['Status', 'Offer', 'Launch window', 'Launch site', 'Integration site']],
  ['Orbit', ['Type', 'Altitude', 'Inclination', 'LTAN']],
  ['Capacity', ['Ports', 'Mass per port', 'Spare', 'Deployers']],
  ['Commercial', ['Cost per kg', 'Respond by', 'Estimated payload delivery', 'Rebooking']],
  ['', ['Additional services']],
  ['', ['']],
];

// Two tiers of heading: thirty columns need saying which family each is in.
function matchHead() {
  const head = el('thead');

  const top = el('tr', 'wide-groups');
  for (const [group, columns] of MATCH_GROUPS) {
    const th = el('th', group ? 'wide-group' : null, group);
    th.colSpan = columns.length;
    top.append(th);
  }
  head.append(top);

  const row = el('tr');
  for (const [, columns] of MATCH_GROUPS) {
    for (const label of columns) row.append(el('th', null, label));
  }
  head.append(row);
  return head;
}

function matchCells(launch) {
  const listing = LISTINGS.find(each => each.launcher === launch.listing) ?? {};
  const on = carriedBy(launch);

  // One column, two lines: what is in the price, then what is not.
  //
  // Seven columns read down beautifully and were mostly dashes. The comparison
  // that matters survives the fold — D-Orbit's line says delivery and OTV are
  // included where nobody else's does.
  const included = SERVICES.filter(name => listing.services?.[name] === 'included');
  const extra = SERVICES
    .filter(name => listing.services?.[name] && listing.services[name] !== 'included')
    .map(name => `${name.toLowerCase()} ${listing.services[name]}`);

  return [
    [launch.listing, 'wide-name'],
    [listing.vehicle ?? '—'],

    [launch.seller],
    [listing.nation ?? '—'],

    [on.map(satellite => satellite.name).join(', ') || '—'],
    [launch.matchedOn ?? '—'],

    [listing.confirmed === undefined ? '—' : listing.confirmed ? 'Confirmed' : 'Tentative'],
    [listing.offer ?? '—'],
    [listing.window ?? launch.window],
    [listing.site ?? '—'],
    [listing.integration?.join(' or ') ?? '—'],

    [listing.orbit ?? '—'],
    [listing.altitude ?? '—'],
    [listing.inclination ?? '—'],
    [listing.ltan ?? '—'],

    [String(listing.ports ?? '—')],
    [listing.massPerPort ? `${listing.massPerPort} kg` : '—'],
    [listing.spareMass ? `${listing.spareMass} kg` : '—'],
    [listing.deployers?.join(', ') ?? '—'],

    [listing.price ?? '—'],
    [listing.respondBy ?? '—'],
    [listing.delivery ? `${listing.delivery} (${listing.lMinus})` : '—'],
    [listing.rebooking ?? '—'],

    [included.length ? included.join(', ') : 'Nothing included',
     'wide-services', extra.length ? extra.join(', ') : 'nothing else offered'],
  ];
}

function offerActs(launch, as = 'td') {
  const td = el(as, 'offer-acts');

  // One ask, for the two things that answer the same question.
  //
  // A ballpark you cannot physically fit into is worth nothing, and the Payload
  // User's Guide is what says whether you fit — so asking for one without the
  // other is half a decision.
  //
  // It is armed rather than sent on the first click, because a seller cannot
  // share either until there is a mutual NDA. The button is really "open an
  // NDA", and a button should not do something bigger than it says.
  if (launch.rom) {
    const open = el('button', 'ghost small offer-go', 'Open the ROM');
    open.type = 'button';
    open.addEventListener('click', () => say(`Reading ${launch.rom.version} is not wired up in this prototype.`));
    td.append(open);
    return td;
  }

  if (launch.asked) {
    td.append(el('span', 'offer-asked', `Requested ${launch.asked} · NDA out for signature`));
    return td;
  }

  const armed = asking === launch.id;
  if (armed) {
    td.append(el('p', 'offer-asking',
      `${launch.seller} cannot share either until a mutual NDA is signed. Requesting proposes one.`));
  }

  const tools = el('div', 'offer-asking-tools');
  const ask = el('button', 'ghost small offer-go',
    armed ? 'Request and sign the NDA' : "Request ROM and Payload User's Guide");
  ask.type = 'button';
  ask.addEventListener('click', () => {
    if (!armed) { asking = launch.id; render(); return; }
    launch.asked = today();
    asking = null;
    log({ event: 'NdaProposed', text: `Mutual NDA proposed with ${launch.seller} on ${launch.listing}.` });
    log({ event: 'RfiSubmitted', text: `Asked ${launch.seller} for a ROM and the PUG on ${launch.listing}.` });
    render();
    say('Requested in this session only. Nothing left the prototype.');
  });
  tools.append(ask);

  if (armed) {
    const back = el('button', 'ghost small', 'Not yet');
    back.type = 'button';
    back.addEventListener('click', () => { asking = null; render(); });
    tools.append(back);
  }
  td.append(tools);

  return td;
}


// ── Cosmo, brokering ────────────────────────────────────────────────────────
//
// The match is the easy part. The hard part is that somebody has to write the
// first message to a stranger, and in this market that stranger is a launch
// company you are about to ask for several million dollars of their manifest.
// That blank box is where the funnel dies.
//
// So Cosmo writes it, and Cosmo asks. Four rules, all of them load-bearing:
//
//   Evidence, not adjectives.  Every line of the pitch is a field already in
//   the record, so Cosmo cannot flatter a listing into looking better than it
//   is. "320 kg spare against your 12 kg" survives being checked; "great fit"
//   does not.
//
//   You consent before they are told.  Nobody is exposed to a match they did
//   not agree to, on either side. Until you press send, the seller does not
//   know you looked.
//
//   Cosmo drafts, you approve, Cosmo sends.  Never auto-send. An agent that
//   emails a counterparty technical detail unseen is an export-control problem,
//   not a convenience — Lyra is flagged ITAR, and that is the ordinary case
//   here, not the exception. Approval can be one click; it cannot be none.
//
//   It carries its own off switch.  Anything that proposes things unprompted
//   has to say, on the same screen, how to make it stop.

let pitching = null;   // the listing whose draft is open, if any
const passed = new Set();   // "not this one", for this session

// Why this one, in facts you can check.
//
// Each line names a field and a number. Nothing here is Cosmo's opinion, which
// is the point: the reasons are re-derived on every render, so a listing that
// stops fitting stops being argued for.
function reasonsFor(launch) {
  const listing = LISTINGS.find(each => each.launcher === launch.listing) ?? {};
  const on = carriedBy(launch);
  const out = [];

  // A satellite states a window as a range, so "their window" means the
  // listing lands inside it — not that the two strings happen to match.
  const at = quarterRank(listing.window);
  if (on.length && at) {
    const inside = on.filter(satellite => {
      const from = quarterRank(satellite.windowFrom);
      const to = quarterRank(satellite.windowTo) ?? from;
      return from && at >= from && at <= to;
    });
    if (inside.length) {
      out.push(`Flies ${sentenceList(inside.map(satellite => satellite.name))} in ${listing.window} — inside their window.`);
    }
  }

  // Mass is held as a string on the record, because the field it comes from is
  // a text input. Adding it up without saying so gives you '06868'.
  const riding = on.reduce((total, satellite) => total + (Number(satellite.mass) || 0), 0);
  if (listing.spareMass && riding) {
    out.push(`${listing.spareMass} kg spare against your ${riding} kg.`);
  }

  const fills = fillsFor(on);
  if (fills.length) {
    out.push(`Matches configuration ${fills[0].option.letter}.`);
  }

  const included = SERVICES.filter(name => listing.services?.[name] === 'included');
  if (included.length) {
    out.push(`${sentenceList(included)} included in the price.`);
  }

  if (listing.price) out.push(`${listing.price}, before anything is negotiated.`);

  return out;
}

// The one worth asking about: unasked, not passed on, and with the most to say
// for itself. One card, never a ranked list — a list is a second comparison
// table, and there is already a very good one underneath.
function worthAsking(all) {
  return all
    .filter(launch => stageOf(launch) === 'Matched' && !passed.has(launch.id))
    .map(launch => ({ launch, why: reasonsFor(launch) }))
    .sort((a, b) => b.why.length - a.why.length)[0];
}

// What is missing, which is what there is to ask for.
//
// Derived from the blank cells in the row rather than a fixed list, so the ask
// is about this listing: no point asking for an LTAN that is already published.
function asksFor(launch) {
  const listing = LISTINGS.find(each => each.launcher === launch.listing) ?? {};
  const on = carriedBy(launch);
  const riding = sentenceList(on.map(satellite => satellite.name)) || 'these satellites';

  // `short` rather than lowercasing the label: "A ROM" does not become "a rom",
  // and the sentence it goes into wants "a ROM for Aurora-1 and Aurora-2"
  // regardless of how the checkbox above it reads.
  const asks = [
    { label: 'A ROM for this configuration', short: `a ROM for ${riding}`,
      why: `nothing is quoted for ${riding} yet`, on: true },
    { label: "The Payload User's Guide", short: "your Payload User's Guide",
      why: 'deployer compatibility is not published', on: true },
  ];

  if (!listing.ltan) {
    asks.push({ label: 'Their LTAN', short: 'your LTAN', why: 'the listing does not state one', on: true });
  }
  if (!listing.delivery) {
    asks.push({ label: 'A payload delivery date', short: 'a payload delivery date',
      why: 'the listing does not state one', on: true });
  }
  if (row.exportControl && row.exportControl !== 'None') {
    asks.push({ label: 'How they handle export control', short: 'how you handle export control',
      why: `${row.name} is flagged ${row.exportControl.toLowerCase()}`, on: true });
  }
  asks.push({ label: 'Insurance terms', short: 'your insurance terms',
    why: 'not usually published, and you have not asked before', on: false });
  return asks;
}

// The message, written from the record.
//
// Returned as parts rather than a string so the sourced values can be marked in
// the preview: you should be able to see at a glance which words came out of
// your mission and which ones Cosmo wrote.
const windowOf = satellite => {
  if (!satellite?.windowFrom) return 'our window';
  return satellite.windowTo && satellite.windowTo !== satellite.windowFrom
    ? `${satellite.windowFrom} to ${satellite.windowTo}`
    : satellite.windowFrom;
};

function draftTo(launch, asks) {
  const on = carriedBy(launch);
  const part = (text, sourced = false) => ({ text, sourced });
  return [
    [part('Hello — I am writing on behalf of '), part(row.country ? `a ${row.country}-based operator` : 'an operator', true),
     part(' about '), part(launch.listing, true), part('.')],
    [part('Our mission '), part(row.name, true), part(' flies '),
     part(sentenceList(on.map(satellite => `${satellite.name} (${satellite.mass} kg)`)) || 'our satellites', true),
     part(' to '), part(`${on[0]?.altitude ?? '—'} km`, true), part(' at '),
     part(`${on[0]?.inclination ?? '—'}°`, true), part(', targeting '),
     part(windowOf(on[0]), true), part('.')],
    [part('We would like to ask for '),
     part(sentenceList(asks.map(ask => ask.short)) || 'more detail', true),
     part('. Happy to sign a mutual NDA first.')],
  ];
}

function introCard(all) {
  const best = worthAsking(all);
  if (!best) return null;
  const { launch, why } = best;

  const card = el('section', 'cosmo-card');

  const head = el('div', 'cosmo-card-head');
  const face = el('span', 'cosmo-card-face');
  face.innerHTML = PORTRAIT;
  head.append(face, el('span', 'cosmo-card-who', 'Cosmo'), el('span', 'ask-ai', 'AI'));
  card.append(head);

  card.append(el('p', 'cosmo-card-lede', `Worth asking: ${launch.listing}`),
    el('p', 'cosmo-card-sub', `${launch.seller} · matched ${sinceMatch(launch.matchedOn)}`));

  if (why.length) {
    const list = el('ul', 'cosmo-why');
    for (const line of why) list.append(el('li', null, line));
    card.append(list);
  }

  if (pitching === launch.id) {
    card.append(draftPanel(launch));
  } else {
    const tools = el('div', 'cosmo-card-tools');

    const go = el('button', 'primary small', 'Ask them');
    go.type = 'button';
    go.addEventListener('click', () => { pitching = launch.id; render(); });

    const no = el('button', 'ghost small', 'Not this one');
    no.type = 'button';
    no.addEventListener('click', () => { passed.add(launch.id); render(); });

    tools.append(go, no);
    card.append(tools);

    // The whole proposition, and it belongs on screen rather than in a tooltip.
    card.append(el('p', 'cosmo-card-quiet',
      `${launch.seller} will not know you looked unless you send this.`));
  }

  const off = el('button', 'cosmo-off', `Stop suggesting matches for ${row.name}`);
  off.type = 'button';
  off.addEventListener('click', () => {
    for (const launch_ of all) passed.add(launch_.id);
    render();
    say('Suggestions off for this session only. Nothing is saved in this prototype.');
  });
  card.append(off);

  return card;
}

// Opens in place, under the card, rather than in a dialog — the same rule the
// record editor follows. A dialog would hide the table you are deciding from.
function draftPanel(launch) {
  const wrap = el('div', 'cosmo-draft');
  const chosen = new Set();

  const asks = asksFor(launch);
  asks.forEach((ask, at) => { if (ask.on) chosen.add(at); });

  const picked = () => asks.filter((_, at) => chosen.has(at));

  wrap.append(el('h3', 'cosmo-draft-title', `What I would ask ${launch.seller} for`));

  const list = el('div', 'cosmo-asks');
  asks.forEach((ask, at) => {
    const line = el('label', 'cosmo-ask');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = chosen.has(at);
    box.addEventListener('change', () => {
      if (box.checked) chosen.add(at); else chosen.delete(at);
      paintDraft();
    });
    const said = el('span', 'cosmo-ask-said');
    said.append(el('span', 'cosmo-ask-what', ask.label), el('span', 'cosmo-ask-why', ask.why));
    line.append(box, said);
    list.append(line);
  });
  wrap.append(list);

  wrap.append(el('h3', 'cosmo-draft-title', 'And this is what I would send'));

  const preview = el('div', 'cosmo-note');
  let editing = false;
  let edited = null;
  const area = el('textarea', 'cosmo-note-edit');

  const asText = () => draftTo(launch, picked())
    .map(line => line.map(part => part.text).join(''))
    .join('\n\n');

  function paintDraft() {
    if (editing) return;
    preview.replaceChildren();
    for (const line of draftTo(launch, picked())) {
      const para = el('p');
      for (const part of line) {
        para.append(part.sourced ? el('span', 'cosmo-sourced', part.text) : document.createTextNode(part.text));
      }
      preview.append(para);
    }
  }
  paintDraft();

  wrap.append(preview, area);
  area.hidden = true;

  // Tinting the sourced words is the honesty: you can see at a glance which of
  // this came out of your own record and which of it Cosmo wrote.
  wrap.append(el('p', 'cosmo-key', 'Tinted words are read from this mission. The rest is mine.'));

  const tools = el('div', 'cosmo-draft-tools');

  const edit = el('button', 'ghost small', 'Edit wording');
  edit.type = 'button';
  edit.addEventListener('click', () => {
    editing = !editing;
    if (editing) {
      area.value = edited ?? asText();
      area.rows = Math.max(6, area.value.split('\n').length + 2);
      edit.textContent = 'Done editing';
    } else {
      edited = area.value;
      edit.textContent = 'Edit wording';
      paintDraft();
    }
    preview.hidden = editing;
    area.hidden = !editing;
  });

  const send = el('button', 'primary small', `Send to ${launch.seller}`);
  send.type = 'button';
  send.addEventListener('click', () => {
    launch.asked = today();
    pitching = null;
    log({ event: 'NdaProposed', text: `Mutual NDA proposed with ${launch.seller} on ${launch.listing}.` });
    log({
      event: 'RfiSubmitted',
      text: `Cosmo asked ${launch.seller} for ${sentenceList(picked().map(ask => ask.short))} on ${launch.listing}.`,
    });
    render();
    say('Nothing was sent. This prototype has no outbox.');
  });

  const back = el('button', 'ghost small', 'Cancel');
  back.type = 'button';
  back.addEventListener('click', () => { pitching = null; render(); });

  tools.append(send, edit, back);
  wrap.append(tools);

  wrap.append(el('p', 'cosmo-card-quiet',
    `I will not send anything you have not read. — Cosmo`));

  return wrap;
}


// ── Matches ─────────────────────────────────────────────────────────────────
//
// Managing matches, before a deal exists.
//
// A match is not an offer. Nobody has quoted anything, nobody has committed,
// and the seller may not know you exist — so the one question this tab has to
// answer, beside the comparison, is where each match has got to and whether
// anything is stuck.
//
// That question asks for a kanban board and does not get one. A board's whole
// affordance is that you drag the card, and nobody here can: a match moves when
// an event fires, half of them from the other side. A board you cannot drag is
// a list grouped by stage, laid out sideways — and laying it out sideways costs
// the one thing this table is for, which is reading down a column.
//
// So the stage is carried three other ways, and the rows stay in one table:
//   1. under the listing name, in the column that never scrolls away
//   2. a strip of counts across the top, each one a filter
//   3. a grouping toggle, which is the board's information without its shape

// Four stages, and they stop at the point a match stops being a match.
//
// Anything past a quote has become a deal and leaves this tab, which is why
// there is no Quoted or Booked column to sit empty for ever.
const MATCH_STAGES = [
  ['Matched', 'A listing fits. Neither side has done anything yet.'],
  ['Requested', 'You have asked for the ROM and the PUG. The ball is with them.'],
  ['Documents', 'The NDA is executed and their numbers are readable.'],
  ['In procurement', 'This one has become a deal. It is here for context only.'],
];

// Derived, never stored. Two matches in the same stage got there by different
// routes — one from the fixture, one from a request made in this session — and
// storing a stage on the record would make those drift apart the first time
// someone clicked Request.
function stageOf(launch) {
  if (['in procurement', 'commercially closed', 'booked'].includes(launch.status)) return 'In procurement';
  if (launch.rom) return 'Documents';
  if (launch.asked || launch.status === 'NDA pending' || launch.status === 'channel open') return 'Requested';
  return 'Matched';
}

let stageOnly = null;      // the stage being filtered to, if any
let stageGrouped = false;  // rows gathered under stage headings

// Counts across the top, each a filter.
//
// Empty stages are shown and not hidden: a zero is the most useful number here.
// "Requested 0" is the sentence "you have matched five launches and asked none
// of them for anything", which is the whole reason to look at this strip.
function stageStrip(all) {
  const strip = el('div', 'stage-strip');

  const chip = (label, count, on, onClick) => {
    const button = el('button', `stage-chip${on ? ' on' : ''}${count ? '' : ' none'}`);
    button.type = 'button';
    button.append(el('span', 'stage-chip-name', label), el('span', 'stage-chip-count', String(count)));
    button.setAttribute('aria-pressed', String(on));
    if (count) button.addEventListener('click', onClick);
    else button.disabled = true;
    return button;
  };

  strip.append(chip('All', all.length, stageOnly === null, () => { stageOnly = null; render(); }));
  for (const [name, note] of MATCH_STAGES) {
    const count = all.filter(launch => stageOf(launch) === name).length;
    const button = chip(name, count, stageOnly === name, () => {
      stageOnly = stageOnly === name ? null : name;
      render();
    });
    button.title = note;
    strip.append(button);
  }

  const group = el('button', `stage-group-toggle${stageGrouped ? ' on' : ''}`,
    stageGrouped ? 'Ungroup' : 'Group by stage');
  group.type = 'button';
  group.setAttribute('aria-pressed', String(stageGrouped));
  group.addEventListener('click', () => { stageGrouped = !stageGrouped; render(); });
  strip.append(group);

  return strip;
}

// The same row, with the stage tucked under the listing name.
//
// Under the name rather than in a column of its own because that column is the
// sticky one: scroll out to Rebooking, three thousand pixels right, and the
// stage is still there. A stage column would have scrolled away exactly when
// you were furthest from remembering which row you were on.
function offerRow(launch, { showStage = true } = {}) {
  const line = el('tr', 'offer-row');
  const on = carriedBy(launch);
  const fills = fillsFor(on);
  const stage = stageOf(launch);

  matchCells(launch).forEach(([text, className, under], at) => {
    const td = el('td', className, under ? undefined : text);
    if (under) {
      td.append(el('span', 'wide-top', text), el('span', 'wide-under', under));
    }
    if (at === 0) {
      // redundant with the heading above it when the rows are grouped
      if (showStage) td.append(el('span', `stage-pill ${stage.replace(/\s+/g, '-').toLowerCase()}`, stage));
      if (!fills.length && (row.configurations ?? []).some(option => option.added)) {
        td.append(el('span', 'offer-flag', 'outside your configurations'));
      }
    }
    line.append(td);
  });

  line.append(offerActs(launch));
  return line;
}

function launches() {
  const wrap = el('div', 'mission-panel');

  const offeredAt = launch => {
    const parsed = Date.parse(String(launch.matchedOn ?? '').replace('Sept', 'Sep'));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const all = [...(row.launches ?? [])].sort((a, b) => {
    const clock = (a.days ?? Infinity) - (b.days ?? Infinity);
    return clock !== 0 ? clock : offeredAt(b) - offeredAt(a);
  });

  if (!all.length) {
    wrap.append(el('p', 'empty', row.status === 'Published'
      ? `No matches yet. Nothing published fits ${row.name}'s orbit and window.`
      : `${row.name} is a draft, so it is not being matched. Publish it to start.`));
    return wrap;
  }

  // A filter that survives switching missions would silently hide rows on a
  // mission you have not looked at, so it is cleared when the stage is not here.
  if (stageOnly && !all.some(launch => stageOf(launch) === stageOnly)) stageOnly = null;

  const pitch = introCard(all);
  if (pitch) wrap.append(pitch);

  wrap.append(stageStrip(all));

  const shown = stageOnly ? all.filter(launch => stageOf(launch) === stageOnly) : all;

  const grid = el('table', 'offer-table wide-table');
  grid.append(matchHead());
  const body = el('tbody');

  if (stageGrouped) {
    // Every stage that has rows, in pipeline order rather than sorted order:
    // the point of grouping is to see the shape of the run, and a run has a
    // direction.
    for (const [name, note] of MATCH_STAGES) {
      const here = shown.filter(launch => stageOf(launch) === name);
      if (!here.length) continue;

      const head = el('tr', 'stage-head');
      const cell = el('td', 'stage-head-cell');
      cell.colSpan = MATCH_GROUPS.reduce((total, [, columns]) => total + columns.length, 0);
      const inner = el('div', 'stage-head-inner');
      inner.append(
        el('span', 'stage-head-name', name),
        el('span', 'stage-head-count', String(here.length)),
        el('span', 'stage-head-note', note),
      );
      cell.append(inner);
      head.append(cell);
      body.append(head);

      for (const launch of here) body.append(offerRow(launch, { showStage: false }));
    }
  } else {
    for (const launch of shown) body.append(offerRow(launch));
  }

  grid.append(body);

  const scroll = el('div', 'sat-scroll');
  scroll.append(grid);
  wrap.append(scroll);

  if (stageOnly) {
    wrap.append(el('p', 'stage-filtered',
      `Showing ${shown.length} of ${all.length} — ${stageOnly.toLowerCase()} only.`));
  }

  const loose = row.satellites.filter(satellite =>
    !all.some(launch => carriedBy(launch).some(each => each.name === satellite.name)));
  if (loose.length) {
    const group = el('section', 'launch-group loose');
    group.append(
      el('div', 'launch-name', 'No match yet'),
      el('p', 'launch-meta',
        `${sentenceList(loose.map(satellite => satellite.name))} — nothing published fits them so far.`),
    );
    wrap.append(group);
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
let asking = null;   // the match whose request is armed, if any
let dragging = null;   // index of the configuration being dragged, if any

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
// A rocket with its payloads drawn inside it.
//
// The outline is the fairing and the blocks are what rides in it, so two blocks
// in one rocket is "these two fly together" — seen rather than read. That is the
// single fact a configuration exists to state, and it was being carried only by
// the word "and" in a line of text.
//
// Outlined rather than solid with bands across it. Bands were the first attempt
// and they vanished: a 1px line in the card colour, over a body five pixels
// wide, is invisible at any size this row can afford, so a one-satellite launch
// and a two-satellite launch drew identically. An outline gives the payloads
// the card background to sit on, and then they read.
//
// Drawn at 19x25, which is larger than an icon wants to be and is the point:
// at 13px the payload blocks were there and indistinguishable, so a one- and a
// two-satellite launch rendered the same. The row is two lines of text tall
// either way, so the height is free; only about six pixels of card width is
// being spent, and it buys the one thing the glyph is for.
function rocketGlyph(count) {
  // Every block the same size, stacked up from the floor of the bay.
  //
  // They used to divide the bay between them, so one satellite drew as a single
  // tall block and looked larger than either half of a pair — which is backwards
  // twice over: a satellite is a satellite, and a fuller rocket should look
  // fuller, not more finely divided. Fixed blocks fix both, and the space left
  // above them reads as the room still going spare.
  const floor = 12.2;
  const tall = 1.65;
  const gap = 0.42;
  const many = Math.min(count, 3);

  const load = [];
  for (let at = 0; at < many; at += 1) {
    const y = floor - (at + 1) * tall - at * gap;
    load.push(`<rect x="4.95" y="${y.toFixed(2)}" width="4.1" height="${tall}" rx=".3"/>`);
  }
  // a fourth and beyond would be a stack of hairlines, so the count says it
  const over = count > 3 ? '<path d="M7 13.1v.9" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>' : '';

  return `
    <svg viewBox="0 0 14 18" width="19" height="25" aria-hidden="true">
      <path d="M7 1.4c2 1.9 2.95 3.9 2.95 5.5v6.1h-5.9V6.9C4.05 5.3 5 3.3 7 1.4Z"
            fill="none" stroke="currentColor" stroke-width="1.05" stroke-linejoin="round"/>
      <g fill="currentColor">
        ${load.join('')}
        <path d="M3.3 9.9 1.5 12.2v2.3l1.8-1.5Z"/>
        <path d="M10.7 9.9l1.8 2.3v2.3l-1.8-1.5Z"/>
        <path d="M5.8 14.1h2.4L7 16.6Z"/>
      </g>
      ${over}
    </svg>`;
}

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
    // Orbit is near enough constant inside one mission, so printing it on every
    // launch of every configuration is a column of the same string. It earns
    // its line only when the group does not agree.
    mixed: altitudes.length > 1 || orbits.length > 1,
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
  const ranked = options.filter(option => option.added).length > 1;

  const intro = el('div', 'config-intro');
  // What adding actually does, and what not adding does — because the second
  // was only ever said on the empty state, and someone with one configuration
  // already added could not tell whether this step was required or optional.
  // It is optional: adding narrows the search rather than switching it on.
  intro.append(el('p', 'panel-note',
    'Ways these satellites could be grouped onto launches. '
    + 'Add the ones you would accept and matching looks only for launches that fit them. '
    + 'Add none and matching still runs, taking any grouping as acceptable. '
    + (ranked ? 'Yours sit left to right in order of preference — drag a card or use the arrows. ' : '')
    + "Tinted cards are Cosmo's — nothing is chosen for you, and nothing is shared until you add it."));

  // "New", not "Add". Add is already the verb on Cosmo's cards, where it means
  // take that existing shape into your list; this one builds one that does not
  // exist yet. Two meanings for one word, six inches apart, is how people end
  // up pressing the wrong thing.
  //
  // It was "Group them yourself", which worked while Cosmo's suggestions sat in
  // a box of their own — "yourself" was the contrast. The box has gone and the
  // contrast is carried by the tint and the star on each card, so the word was
  // answering a question nobody was still asking.
  const add = el('button', 'ghost group-own', '+ New configuration');
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
        if (at >= 0) {
          Object.assign(options[at], saved);
          log({ event: 'ConfigurationUpdated',
            text: `Configuration ${options[at].letter} regrouped — ${shapeOf(options[at])}.` });
        } else {
          const made = { id: `own-${Date.now()}`, added: true, letter: freeLetter(options), ...saved };
          options.push(made);
          log({ event: 'ConfigurationUpdated', text: `Configuration ${made.letter} added — ${shapeOf(made)}.` });
        }
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
  const shapeOf = option => option.batches
    .map((names, at) => `Launch ${at + 1}: ${names.join(' + ')}`).join('; ');

  const move = (option, by) => {
    moveWithin(options, option, by);
    const order = options.filter(each => each.added).map(each => each.letter).join(', ');
    log({ event: 'ConfigurationUpdated', text: `Preference order is now ${order}.` });
    render();
  };

  const letter = option => `Configuration ${option.letter ?? '?'}`;

  const draw = option => {
    const card = el('section', `config${option.added ? '' : option.from === 'Cosmo' ? ' from-cosmo' : ''}${option.needs ? ' conditional' : ''}${option.dismissed ? ' dismissed' : ''}`);

    const head = el('div', 'config-head');

    const count = option.batches.length;
    const shape = `${count} launch${count === 1 ? '' : 'es'}`;

    const titles = el('div');
    const name = el('div', 'config-name');

    name.append(el('span', 'config-title', option.added ? letter(option) : shape));

    // Where it came from, on the card. It used to be said once by the box these
    // sat in; out in the open row with your own shapes, each one has to carry
    // it. The tint says it at a glance and the star says it in words.
    if (!option.added && option.from === 'Cosmo') {
      const from = el('span', 'config-from');
      const star = el('span', 'config-from-star');
      star.innerHTML = STAR(11);
      from.append(star, el('span', null, option.needs ? 'Cosmo · if something moves' : 'Cosmo'));
      name.append(from);
    }

    // Once it is yours the heading is the letter, so the shape moves underneath
    // it. On a suggestion the shape is already the heading and there is nothing
    // left to say here.
    titles.append(name);
    if (option.added) {
      // "2 launches, and the last satellite is ready in August" is what you
      // need to know about a configuration before opening it.
      const ready = option.batches.map(names => batchFacts(names).ship).filter(Boolean).at(-1);
      titles.append(el('p', 'config-meta', ready ? `${shape} · ready by ${ready}` : shape));
    }

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
        log({ event: 'ConfigurationUpdated', text: `Configuration ${option.letter} added — ${shapeOf(option)}.` });
      } else {
        log({ event: 'ConfigurationUpdated', text: `Configuration ${option.letter} removed.` });
        if (option.from) {
          // came from Cosmo, so it goes back to the box rather than vanishing
          option.added = false;
        } else {
          options.splice(options.indexOf(option), 1);
        }
      }
      render();
    });

    acts.append(act);
    head.append(titles, acts);
    card.append(head);
    }

    // One row per launch, and only what a launch adds.
    //
    // This was a row per satellite restating orbit, inclination, altitude,
    // LTAN, window, ship date, mass and envelope — every one of which the
    // satellites table states already, now that configurations live on the same
    // page as it. Said twice on one screen is not thoroughness, it is noise,
    // and it buried the only thing a configuration is actually for.
    //
    // What survives is what you cannot read off that table, because it is the
    // result of the grouping rather than a property of a satellite: who flies
    // together, what they weigh together, the orbit they must share, the window
    // where their windows overlap, and the date the last of them is ready. Add
    // 68 and 68 and intersect two quarters by eye and you get the same answers;
    // the point is that you should not have to.
    const table = el('div', 'config-legs');

    let broken = false;
    option.batches.forEach((names, group) => {
      const facts = batchFacts(names);
      if (facts.clash) broken = true;

      const leg = el('div', `config-leg${facts.clash ? ' clash' : ''}`);

      // A rocket and a number rather than the words "Launch 1". At five cards to
      // a row that label was wider than the fact it labelled — but the two
      // marks here are not interchangeable and both stay: the rocket says what
      // kind of row this is, which a bare number never did, and the number says
      // which one, which three identical rockets never could. Notes and offers
      // both refer to "Launch 2", so the identifier has to survive.
      const mark = el('span', 'config-leg-n');
      const rocket = el('span', 'config-leg-rocket');
      rocket.innerHTML = rocketGlyph(names.length);
      mark.append(rocket, el('span', 'config-leg-no', String(group + 1)));
      mark.title = `Launch ${group + 1} — ${names.length} satellite${names.length === 1 ? '' : 's'}`;
      leg.append(mark);

      const said = el('div', 'config-leg-said');
      said.append(el('p', 'config-leg-who', sentenceList(names)));

      // Mass and window: the two that decide, and the two that are results of
      // the grouping rather than properties of a satellite. Orbit joins them
      // only when the group disagrees about it, which is when it matters.
      const says = [`${facts.mass} kg`, facts.window, facts.mixed ? facts.orbit : null].filter(Boolean);
      said.append(el('p', `config-leg-says${facts.clash ? ' clash' : ''}`, says.join(' · ')));

      leg.append(said);
      table.append(leg);
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

        // Quiet, because of what this is.
        //
        // A filled accent button made the loudest control in the section the
        // least consequential action on the page — a private aside to your own
        // team — while "Make this change", which rewrites a satellite's orbit
        // and window, sits there as a ghost. Weight should follow stakes.
        //
        // Keyboard first, buttons as the visible fallback: Enter saves, Escape
        // backs out, which is the rule everything else on this page follows.
        const save = () => {
          const written = area.value.trim();
          if (written) option.note = written;
          else delete option.note;
          noting = null;
          render();
        };

        area.addEventListener('keydown', event => {
          if (event.key === 'Escape') { event.preventDefault(); noting = null; render(); }
          if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save(); }
        });

        const tools = el('div', 'log-tools note-tools');
        const keep = el('button', 'link-button note-save', 'Save');
        keep.type = 'button';
        keep.addEventListener('click', save);
        const cancel = el('button', 'link-button note-cancel', 'Cancel');
        cancel.type = 'button';
        cancel.addEventListener('click', () => { noting = null; render(); });
        tools.append(keep, cancel);
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

  // One row, every candidate shape.
  //
  // Your own groupings and Cosmo's used to be two sections with a box around
  // the second, which made them read as different kinds of thing. They are not:
  // they are all shapes this mission could take, and the job is choosing
  // between them. Two sections meant comparing across a heading and a scroll.
  //
  // What the box used to say, the card now says: a suggestion carries Cosmo's
  // tint and Cosmo's name. Rank is safe to mix in because it is printed as a
  // number on the strip, not implied by position — so an unranked card sitting
  // after a ranked one takes nothing away from it.
  const mine = options.filter(option => option.added);
  const cosmo = list => list.filter(option =>
    option.from === 'Cosmo' && !option.added && !option.dismissed);
  const suggested = [...cosmo(ready), ...cosmo(conditional)];

  const required = options.find(option =>
    option.added && !option.from && option.batches.length === 1
    && option.batches[0].length === row.satellites.length);

  if (!mine.length) {
    // A notice, not a question.
    //
    // This was a gate at publish, then a choice between two answers here. Both
    // were heavier than the fact: stating a grouping is optional, and it exists
    // so sellers can see a preference. What silence means is said out loud, so
    // leaving it empty is an informed choice rather than an oversight.
    const notice = el('p', 'config-notice');
    notice.append(
      el('span', 'config-notice-mark', '!'),
      document.createTextNode(`Nothing added yet, so sellers will not see a preference for ${row.name}. Add one if you would rather they knew how you want these grouped.`),
    );
    wrap.append(notice);
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

    // The rank, and the two buttons that are the accessible way to change it.
    //
    // Draggable, but never only draggable: a pointer gesture cannot be done
    // from a keyboard, on a touch screen it fights with scrolling, and it
    // leaves no trace of what it did. The arrows are the real control and the
    // drag is the shortcut, so both move the same list.
    const rank = el('div', 'config-rank-tools');

    // Regroup and Remove ride up here rather than sitting under the title. At
    // this width they wrapped to a row of their own, which cost every card a
    // line to say nothing.
    const acts = card.querySelector('.config-acts');

    if (mine.length > 1) {
      const grip = el('span', 'config-grip');
      grip.innerHTML = `
        <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true" fill="currentColor">
          <circle cx="2" cy="3" r="1.15"/><circle cx="8" cy="3" r="1.15"/>
          <circle cx="2" cy="8" r="1.15"/><circle cx="8" cy="8" r="1.15"/>
          <circle cx="2" cy="13" r="1.15"/><circle cx="8" cy="13" r="1.15"/>
        </svg>`;
      rank.append(grip);
      rank.append(el('span', 'config-rank-n', String(at + 1)));
      const up = el('button', 'config-rank-btn', '←');
      up.type = 'button';
      up.title = 'Prefer this more';
      up.setAttribute('aria-label', `Move ${letter(option)} up`);
      up.disabled = at === 0;
      up.addEventListener('click', () => move(option, -1));
      const down = el('button', 'config-rank-btn', '→');
      down.type = 'button';
      down.title = 'Prefer this less';
      down.setAttribute('aria-label', `Move ${letter(option)} down`);
      down.disabled = at === mine.length - 1;
      down.addEventListener('click', () => move(option, 1));
      rank.append(up, down);
    }

    if (acts) rank.append(acts);
    card.prepend(rank);
    list.append(card);
  });

  // Every card gets the same top strip, so the buttons line up across the row.
  //
  // Yours carries the rank and its arrows on the left; Cosmo's carries the star
  // and what it is. Both put the actions on the right, at the same height, so
  // Dismiss sits where Remove sits and the eye does not have to go looking.
  const topStrip = card => {
    const strip = el('div', 'config-rank-tools plain');
    const from = card.querySelector('.config-from');
    if (from) strip.append(from);
    const acts = card.querySelector('.config-acts');
    if (acts) strip.append(acts);
    if (strip.childElementCount) card.prepend(strip);
    return card;
  };

  for (const option of suggested) list.append(topStrip(draw(option)));

  const turnedDown = options.filter(option => option.dismissed);
  if (showDismissed) for (const option of turnedDown) list.append(topStrip(draw(option)));

  if (list.childElementCount) wrap.append(list);

  // Why the row has nothing of Cosmo's in it. An absent suggestion cannot
  // explain itself, so the reason is given rather than left to be guessed at.
  if (!suggested.length) {
    const anyFromCosmo = options.some(option => option.from === 'Cosmo');
    wrap.append(el('p', 'empty',
      turnedDown.length ? `Nothing left for Cosmo to suggest. ${turnedDown.length === 1 ? 'One is' : `${turnedDown.length} are`} dismissed.`
        : anyFromCosmo ? 'You have taken all of Cosmo\u2019s suggestions.'
        : required ? `Nothing for Cosmo to suggest. ${row.name} requires every satellite on one launch, so there is only one shape it can take.`
        : 'Nothing for Cosmo to suggest yet. Proposals appear once the satellites have windows, orbits and masses to work from.'));
  }

  if (turnedDown.length) {
    const toggle = el('button', 'link-button cosmo-dismissed',
      `${turnedDown.length} dismissed${showDismissed ? ' · hide' : ' · show'}`);
    toggle.type = 'button';
    toggle.addEventListener('click', () => { showDismissed = !showDismissed; render(); });
    wrap.append(toggle);
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
      ['matches', 'Matches', launches, (row.launches ?? []).length],
    ]
    : [['overview', 'Overview', overview]];

  // ?tab=satellites was a real tab until the merge; send those links to where
  // the satellites went rather than dropping them on a default.
  if (tab === 'satellites') tab = 'overview';
  // and configurations have joined it, under Notes to sellers
  if (tab === 'configuration') tab = 'overview';
  // every name this tab has had, so old links still land
  for (const was of ['launches', 'procurement', 'procurement2', 'offers', 'offers2', 'matches2']) {
    if (tab === was) tab = 'matches';
  }
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

  // The browser resolved the hash before any of this existed, so landing on a
  // deep link is this script's job. Once only — re-rendering on every keystroke
  // should not drag the page back up.
  if (location.hash && !landed) {
    landed = true;
    document.getElementById(location.hash.slice(1))
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

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
