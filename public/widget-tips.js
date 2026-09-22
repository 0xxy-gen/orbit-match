// What each dashboard panel is for.
//
// The trigger is the panel's header, not the whole panel. A tooltip that fires
// anywhere over a 400px-tall widget would cover the rows you were reading and
// re-open every time the pointer crossed it. The header is the part you look at
// when you are asking "what is this?", and it is out of the way once you know.
//
// It also hangs off a small ⓘ button, so it can be reached by keyboard and read
// by a screen reader — a description that only exists on hover does not exist
// for everyone.
//
// The text lives in data-tip on each panel in home.html, beside the panel it
// describes, so nobody has to keep two lists in step.

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const INFO = `
  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
    <circle cx="10" cy="10" r="7.2"/>
    <path d="M10 9v4.4" stroke-linecap="round"/>
    <circle cx="10" cy="6.4" r=".95" fill="currentColor" stroke="none"/>
  </svg>`;

export function widgetTips(scope = document) {
  const bubble = el('div', 'tip');
  bubble.setAttribute('role', 'tooltip');
  bubble.hidden = true;
  document.body.append(bubble);

  let open = null;

  function show(panel, anchor) {
    const text = panel.dataset.tip;
    if (!text) return;
    open = panel;
    bubble.textContent = text;
    bubble.hidden = false;

    // Below the header by default; above it if there is no room underneath.
    const box = anchor.getBoundingClientRect();
    const size = bubble.getBoundingClientRect();
    const margin = 12;

    let left = box.left;
    left = Math.min(left, innerWidth - size.width - margin);
    left = Math.max(margin, left);

    const below = box.bottom + 10;
    const top = below + size.height > innerHeight - margin
      ? box.top - size.height - 10
      : below;

    bubble.style.left = `${Math.round(left)}px`;
    bubble.style.top = `${Math.round(top + scrollY)}px`;
  }

  function hide(panel) {
    if (panel && open !== panel) return;
    open = null;
    bubble.hidden = true;
  }

  for (const panel of scope.querySelectorAll('.box[data-tip]')) {
    const head = panel.querySelector('.box-head');
    const title = panel.querySelector('.box-title');
    if (!head || !title) continue;

    const button = el('button', 'tip-btn');
    button.type = 'button';
    button.innerHTML = INFO;
    button.setAttribute('aria-label', `About ${panel.dataset.label?.replace('&amp;', '&') ?? 'this panel'}`);
    button.tabIndex = 0;
    title.after(button);

    head.addEventListener('pointerenter', () => show(panel, head));
    head.addEventListener('pointerleave', () => hide(panel));
    button.addEventListener('focus', () => show(panel, button));
    button.addEventListener('blur', () => hide(panel));
    // Tapping tells a touch screen, which has no hover, what this is.
    button.addEventListener('click', event => {
      event.preventDefault();
      if (open === panel) hide(panel);
      else show(panel, button);
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') hide();
  });
  addEventListener('scroll', () => hide(), { passive: true });
}
