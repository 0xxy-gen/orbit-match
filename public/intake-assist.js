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

import { PORTRAIT } from './assistant.js';

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

const DOC_ICON = `
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M11.5 2.5H6.2a1.7 1.7 0 0 0-1.7 1.7v11.6a1.7 1.7 0 0 0 1.7 1.7h7.6a1.7 1.7 0 0 0 1.7-1.7V6.5Z"/>
    <path d="M11.5 2.5v4h4"/>
    <path d="M7.6 11.2h4.8M7.6 13.9h3.2"/>
  </svg>`;

const OK = /\.(pdf|docx?)$/i;

const fileSize = bytes => (bytes >= 1024 * 1024
  ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`);

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
    el('p', 'assist-sub', 'Upload an RFI, RFP or spec sheet and the fields are pulled out of it. You confirm each one before anything is written.'),
  );
  head.append(mark, titles);

  const file = el('input');
  file.type = 'file';
  file.id = 'rfi-file';
  file.accept = ACCEPTS;
  file.className = 'sr-only';

  // ── the drop zone ─────────────────────────────────────────────────────────
  //
  // A named target rather than "drop anywhere": people who have not dropped a
  // file into this product before need to see where it goes, and a dashed
  // rectangle is the one shape everyone already reads as "put it here". It is
  // also the click target, so dragging and browsing are the same control
  // rather than two.
  const zone = el('button', 'drop-zone');
  zone.type = 'button';
  zone.innerHTML = `
    <span class="drop-icon">${DOC_ICON}</span>
    <span class="drop-line">Drag a document here, or <span class="drop-link">choose a file</span></span>
    <span class="drop-types">PDF, DOC or DOCX</span>`;
  zone.addEventListener('click', () => file.click());

  // ── what you attached, before anything is read ────────────────────────────
  //
  // Dropping a file and having it parsed in the same motion gives you no beat
  // to notice you grabbed last year's RFI. The file sits here, named, until you
  // ask for it to be read.
  const attached = el('div', 'drop-file');
  attached.hidden = true;

  // "Extract fields", and Cosmo's name stays off it.
  //
  // Cosmo is who you ask things — a conversation. Pulling values out of a
  // document is a feature, and attaching his name to it blurs what he is for:
  // the next person then expects him to do every automated job in the product.
  // The word also promises exactly what comes back. Not "Scan", which is what a
  // flatbed does to paper, and not "Fill the form", which the review step below
  // immediately contradicts — fields come out, and you decide what goes in.
  const scan = el('button', 'submit compact scan');
  scan.type = 'button';
  scan.innerHTML = DOC_ICON;
  scan.append(document.createTextNode('Extract fields'));

  const ask = el('button', 'ghost assist-btn cosmo');
  ask.type = 'button';
  // 22px, not 18: the drawing is the same, but the ears and the helmet base
  // are solid shapes and they close up on the face below about that size.
  ask.innerHTML = PORTRAIT.replace('width="38" height="38"', 'width="22" height="22"');
  ask.append(document.createTextNode('Ask Cosmo instead'));
  ask.addEventListener('click', () => onAsk?.());

  const actions = el('div', 'assist-tools');
  actions.append(scan, ask);
  scan.hidden = true;

  const reject = el('p', 'assist-reject');
  reject.hidden = true;
  reject.setAttribute('role', 'status');

  const review = el('div', 'assist-review');
  review.hidden = true;

  panel.append(head, zone, attached, reject, actions, review);

  let held = null;

  function hold(chosen) {
    if (!chosen) return;
    if (!OK.test(chosen.name)) {
      reject.textContent = `${chosen.name} is not a PDF, DOC or DOCX.`;
      reject.hidden = false;
      return;
    }
    reject.hidden = true;
    held = chosen;

    attached.replaceChildren();
    const icon = el('span', 'drop-file-icon');
    icon.innerHTML = DOC_ICON;
    const names = el('div', 'drop-file-name');
    names.append(el('strong', null, chosen.name), el('span', 'drop-file-size', fileSize(chosen.size)));
    const remove = el('button', 'sat-tool', 'Remove');
    remove.type = 'button';
    remove.addEventListener('click', clear);
    attached.append(icon, names, remove);

    attached.hidden = false;
    zone.hidden = true;
    scan.hidden = false;
    review.hidden = true;
  }

  function clear() {
    held = null;
    file.value = '';
    attached.hidden = true;
    zone.hidden = false;
    scan.hidden = true;
    review.hidden = true;
  }

  scan.addEventListener('click', () => { if (held) drawReview(held.name); });
  file.addEventListener('change', () => hold(file.files?.[0]));
  panel.append(file);

  // dragenter and dragleave fire for every child element, so nesting is counted
  // rather than trusted — otherwise the highlight flickers off the moment the
  // pointer crosses something inside the zone.
  let depth = 0;
  const setDrop = on => zone.classList.toggle('over', on);

  for (const target of [zone, panel]) {
    target.addEventListener('dragenter', event => {
      event.preventDefault();
      depth += 1;
      if (!zone.hidden) setDrop(true);
    });
    target.addEventListener('dragover', event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });
    target.addEventListener('dragleave', () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDrop(false);
    });
    target.addEventListener('drop', event => {
      event.preventDefault();
      event.stopPropagation();
      depth = 0;
      setDrop(false);
      hold(event.dataTransfer.files?.[0]);
    });
  }

  // A browser's default response to a dropped file is to navigate to it. Without
  // this, a near-miss on the zone replaces the page with a PDF and throws away
  // everything typed into the form.
  for (const name of ['dragover', 'drop']) {
    addEventListener(name, event => event.preventDefault());
  }

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
    discard.addEventListener('click', clear);
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
      'Prototype — the file was not read and nothing was extracted. These are sample values, shown so the review step is real even though the extraction is not.');
    review.append(note);

    const count = () => { apply.textContent = ticked.size ? `Apply ${ticked.size}` : 'Apply'; };
    count();

    apply.addEventListener('click', () => {
      onApply?.(SAMPLE.filter((_, index) => ticked.has(index)));
      clear();
    });
  }

  return panel;
}
