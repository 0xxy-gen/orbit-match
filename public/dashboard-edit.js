// Edit Dashboard: choose which panels appear, and in what order.
//
// Two states. Normally the dashboard is just the dashboard. In edit mode every
// panel grows a small toolbar — move left, move right, hide — and an "Add"
// menu appears beside the button listing whatever is hidden.
//
// The layout is saved in the browser as { order, hidden } keyed by nothing else,
// so it is per person per device. When there is a server, save the same two
// arrays against the account and drop the localStorage calls.
//
// Reordering is by button rather than drag: it survives a keyboard, a trackpad
// and a phone, and drag-and-drop on a 12-column grid needs a drop-target model
// this prototype does not have yet.

const STORE = 'orbitmatch:layout';

const read = () => {
  try { return JSON.parse(localStorage.getItem(STORE)) ?? {}; } catch { return {}; }
};
const write = state => {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* private window */ }
};

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export function dashboardEdit() {
  const grid = document.querySelector('.box-grid');
  const button = document.getElementById('edit-dashboard');
  const adder = document.getElementById('add-widget');
  if (!grid || !button) return;

  const panels = () => [...grid.querySelectorAll('.box[data-widget]')];
  const label = panel => panel.dataset.label ?? panel.dataset.widget;
  let editing = false;

  const state = read();
  let hidden = new Set(state.hidden ?? []);

  // Saved order first, anything new after it — a panel added later still shows up.
  if (state.order?.length) {
    const byName = new Map(panels().map(panel => [panel.dataset.widget, panel]));
    for (const name of state.order) {
      const panel = byName.get(name);
      if (panel) grid.append(panel);
      byName.delete(name);
    }
    for (const panel of byName.values()) grid.append(panel);
  }

  const save = () => write({ order: panels().map(panel => panel.dataset.widget), hidden: [...hidden] });

  function applyHidden() {
    for (const panel of panels()) panel.hidden = hidden.has(panel.dataset.widget);
  }

  function move(panel, delta) {
    const visible = panels().filter(item => !item.hidden);
    const index = visible.indexOf(panel);
    const target = visible[index + delta];
    if (!target) return;
    if (delta < 0) target.before(panel);
    else target.after(panel);
    save();
    drawControls();
  }

  function drawControls() {
    for (const panel of panels()) {
      panel.querySelector('.widget-tools')?.remove();
      if (!editing) continue;

      const tools = el('div', 'widget-tools');
      const visible = panels().filter(item => !item.hidden);
      const index = visible.indexOf(panel);

      const back = el('button', 'widget-tool', '←');
      back.type = 'button';
      back.title = 'Move earlier';
      back.setAttribute('aria-label', `Move ${label(panel)} earlier`);
      back.disabled = index <= 0;
      back.addEventListener('click', () => move(panel, -1));

      const forward = el('button', 'widget-tool', '→');
      forward.type = 'button';
      forward.title = 'Move later';
      forward.setAttribute('aria-label', `Move ${label(panel)} later`);
      forward.disabled = index === visible.length - 1;
      forward.addEventListener('click', () => move(panel, 1));

      const hide = el('button', 'widget-tool', 'Hide');
      hide.type = 'button';
      hide.setAttribute('aria-label', `Hide ${label(panel)}`);
      hide.addEventListener('click', () => {
        hidden.add(panel.dataset.widget);
        applyHidden();
        save();
        drawControls();
        drawAdder();
      });

      tools.append(back, forward, hide);
      panel.querySelector('.box-head')?.append(tools);
    }
  }

  function drawAdder() {
    adder.replaceChildren();
    const missing = panels().filter(panel => hidden.has(panel.dataset.widget));
    adder.hidden = !editing;
    if (!editing) return;

    if (!missing.length) {
      adder.append(el('span', 'add-none', 'Every panel is showing'));
      return;
    }

    adder.append(el('span', 'add-label', 'Add:'));
    for (const panel of missing) {
      const add = el('button', 'add-chip');
      add.type = 'button';
      add.innerHTML = '<span aria-hidden="true">+</span> ';
      add.append(document.createTextNode(panel.dataset.label?.replace('&amp;', '&') ?? panel.dataset.widget));
      add.addEventListener('click', () => {
        hidden.delete(panel.dataset.widget);
        applyHidden();
        save();
        drawControls();
        drawAdder();
      });
      adder.append(add);
    }
  }

  button.addEventListener('click', () => {
    editing = !editing;
    document.body.classList.toggle('editing', editing);
    button.classList.toggle('on', editing);
    button.lastChild.textContent = editing ? ' Done' : ' Edit Dashboard';
    drawControls();
    drawAdder();
  });

  applyHidden();
}
