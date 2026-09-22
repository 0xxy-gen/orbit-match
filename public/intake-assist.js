// Start a mission from a document, or from Cosmo.
//
// Most operators already have the answers written down — an RFI, an RFP, a
// spec sheet — and retyping fourteen fields per satellite out of a PDF is the
// worst part of this form. So the form can read the document instead.
//
// The important design decision is what happens next. Auto-fill that silently
// writes fourteen fields is dangerous: a mass misread by one digit is a wrong
// quote, and nobody re-checks a field they did not type. So extraction
// *proposes*, and a person confirms:
//
//   · every proposed value shows where in the document it came from
//   · a low-confidence reading arrives unticked, so the default is to ignore it
//   · nothing is written until Apply, and Apply only writes what is ticked
//
// NOT CONNECTED. There is no server in this prototype, so no file is read and
// no model is called. The panel below shows the review step with sample values
// and says so in as many words — the flow is real, the extraction is not.

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// ── DEMO ONLY ───────────────────────────────────────────────────────────────
// What an extraction would come back with. Delete this and read the real
// response when there is a service behind the upload; the review UI below does
// not care where the list came from.
const SAMPLE = [
  { scope: 'mission', key: 'name', label: 'Mission name', value: 'Boreal', source: 'p.1 · “Programme name”', sure: true },
  { scope: 'mission', key: 'objective', label: 'Objective', value: 'Sub-metre optical imaging of Arctic shipping lanes', source: 'p.1 · “Mission summary”', sure: true },
  { scope: 'mission', key: 'budget', label: 'Target budget', value: '18000000', show: '$18,000,000', source: 'p.3 · “Not-to-exceed”', sure: true },
  { scope: 'mission', key: 'country', label: 'Country of manufacture', value: 'GB', show: 'United Kingdom', source: 'p.2 · letterhead', sure: true },
  { scope: 'mission', key: 'registration', label: 'State of registry', value: 'GB', show: 'United Kingdom', source: 'p.2 · inferred from operator', sure: false },
  { scope: 'mission', key: 'exportControl', label: 'Export control status', value: 'itar', show: 'ITAR components', source: 'p.4 · “US-origin components”', sure: false },
  { scope: 'mission', key: 'ride', label: 'Ride preference', value: 'rideshare', show: 'Rideshare', source: 'p.3 · “shared launch acceptable”', sure: true },
  { scope: 'satellite', key: 'name', label: 'Satellite name', value: 'Aurora-1', source: 'Annex A · table 1', sure: true },
  { scope: 'satellite', key: 'mass', label: 'Mass (kg)', value: '68', source: 'Annex A · “mass at separation”', sure: true },
  { scope: 'satellite', key: 'orbit', label: 'Orbit type', value: 'sso', show: 'SSO', source: 'Annex A · “SSO, LTDN 10:30”', sure: true },
  { scope: 'satellite', key: 'inclination', label: 'Inclination (°)', value: '97.45', source: 'Annex A · table 2', sure: true },
  { scope: 'satellite', key: 'altitude', label: 'Altitude (km)', value: '520', source: 'Annex A · table 2', sure: true },
  { scope: 'satellite', key: 'ltan', label: 'LTAN', value: '10:30', source: 'Annex A · “LTDN 10:30”', sure: false },
  { scope: 'satellite', key: 'propulsion', label: 'Propulsion', value: 'cold-gas', show: 'Cold gas', source: 'Annex B · “GN2 system”', sure: false },
];
// ── end DEMO ────────────────────────────────────────────────────────────────

const ACCEPTS = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function documentIntake({ onApply, onAsk }) {
  const panel = el('section', 'assist');

  const head = el('div', 'assist-head');
  const mark = el('span', 'assist-mark');
  mark.innerHTML = `
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path d="M10.6 2.2c.62 5.9 2.9 8.3 8.4 9.3-5.5 1-7.78 3.4-8.4 9.3-.62-5.9-2.9-8.3-8.4-9.3 5.5-1 7.78-3.4 8.4-9.3Z" fill="currentColor"/>
    </svg>`;
  const titles = el('div');
  titles.append(
    el('h2', 'assist-title', 'Start from a document'),
    el('p', 'assist-sub', 'Upload an RFI, RFP or spec sheet and Cosmo proposes the fields. You confirm each one before anything is written.'),
  );
  head.append(mark, titles);

  const tools = el('div', 'assist-tools');

  const file = el('input');
  file.type = 'file';
  file.id = 'rfi-file';
  file.accept = ACCEPTS;
  file.className = 'sr-only';

  const choose = el('label', 'ghost assist-btn', 'Choose a file');
  choose.htmlFor = file.id;

  const ask = el('button', 'ghost assist-btn', 'Ask Cosmo instead');
  ask.type = 'button';
  ask.addEventListener('click', () => onAsk?.());

  tools.append(choose, file, ask, el('span', 'assist-types', 'PDF, DOC or DOCX'));

  const review = el('div', 'assist-review');
  review.hidden = true;

  panel.append(head, tools, review);

  file.addEventListener('change', () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    drawReview(chosen.name);
  });

  function drawReview(filename) {
    review.replaceChildren();
    review.hidden = false;

    // confident readings start ticked; the rest wait to be looked at
    const ticked = new Set(
      SAMPLE.map((item, index) => (item.sure ? index : -1)).filter(index => index >= 0));

    const bar = el('div', 'assist-bar');
    const summary = el('p', 'assist-summary');
    const unsure = SAMPLE.filter(item => !item.sure).length;
    summary.append(
      el('strong', null, filename),
      document.createTextNode(` · ${SAMPLE.length} fields proposed`),
    );
    if (unsure) summary.append(el('span', 'assist-unsure', `${unsure} need a look`));
    bar.append(summary);

    const actions = el('div', 'assist-actions');
    const apply = el('button', 'submit compact', 'Apply');
    apply.type = 'button';
    const discard = el('button', 'ghost assist-btn', 'Discard');
    discard.type = 'button';
    discard.addEventListener('click', () => {
      review.hidden = true;
      file.value = '';
    });
    actions.append(discard, apply);
    bar.append(actions);
    review.append(bar);

    const list = el('div', 'assist-rows');
    SAMPLE.forEach((item, index) => {
      const row = el('label', `assist-row${item.sure ? '' : ' unsure'}`);
      const box = el('input');
      box.type = 'checkbox';
      box.checked = item.sure;
      box.addEventListener('change', () => {
        if (box.checked) ticked.add(index);
        else ticked.delete(index);
        count();
      });

      const body = el('div', 'assist-body');
      const line = el('div', 'assist-line');
      line.append(el('span', 'assist-field', item.label), el('span', 'assist-value', item.show ?? item.value));
      body.append(line, el('p', 'assist-source', item.sure ? item.source : `${item.source} — low confidence`));

      row.append(box, body);
      list.append(row);
    });
    review.append(list);

    const note = el('p', 'assist-note',
      'Prototype — the file was not read and no model was called. These are sample values, shown so the review step is real even though the extraction is not.');
    review.append(note);

    const count = () => { apply.textContent = ticked.size ? `Apply ${ticked.size}` : 'Apply'; };
    count();

    apply.addEventListener('click', () => {
      onApply?.(SAMPLE.filter((_, index) => ticked.has(index)));
      review.hidden = true;
      file.value = '';
    });
  }

  return panel;
}
