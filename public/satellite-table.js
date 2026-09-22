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
  ['deployerMass', 'Deployer mass (kg)'],
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

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const cell = (satellite, key) => {
  if (key === 'window') return windowSpan(satellite);
  if (key === 'form') return satellite.form && satellite.form !== 'Custom' ? satellite.form : '—';
  return satellite[key] ?? '—';
};

// Fourteen columns will not fit inside a card at any sane font size, so the
// table scrolls sideways rather than being cut down. Everything the intake
// collects is on the page; the card just does not stretch to hold it.
export function satelliteTable(list, columns = SAT_COLUMNS) {
  const scroller = el('div', 'sat-scroll');
  const table = el('table', 'sat-table');

  const thead = el('thead');
  const headRow = el('tr');
  for (const [, label] of columns) headRow.append(el('th', null, label));
  thead.append(headRow);

  const body = el('tbody');
  for (const satellite of list) {
    const row = el('tr');
    for (const [key] of columns) {
      row.append(el('td', key === 'name' ? 'sat-name' : null, cell(satellite, key) || '—'));
    }
    body.append(row);
  }

  table.append(thead, body);
  scroller.append(table);
  return scroller;
}
