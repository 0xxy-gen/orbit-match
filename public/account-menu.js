// The avatar menu — and the home for the demo role switch.
//
// Which side of the marketplace you are on is a property of the account, not a
// control in the product, so it has no business sitting in the nav bar. It
// lives in here, under a DEMO heading, until accounts are real: then delete the
// demo section and the menu is just an account menu.

const STORE_VIEW = 'orbitmatch:view';
const STORE_EMAIL = 'orbitmatch:email';

// Placeholder person, so the prototype has a name to greet when nobody typed
// one — logging out and straight back in should not leave the page anonymous.
export const DEMO_USER = { name: 'Rohit', email: 'rohit@kestrel.example' };

// The signed-in person, or the placeholder.
export function currentUser() {
  let email = '';
  try { email = localStorage.getItem(STORE_EMAIL) ?? ''; } catch { email = ''; }
  if (!email) return { ...DEMO_USER, placeholder: true };
  const name = email.split('@')[0].split(/[._-]/)[0];
  return { name: name[0].toUpperCase() + name.slice(1), email, placeholder: false };
}

const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* private window */ } };

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const ROLES = [
  { value: 'buy', label: 'Launch buyer' },
  { value: 'sell', label: 'Launch seller' },
];

export function accountMenu(view) {
  const button = document.getElementById('avatar');
  if (!button) return;

  const user = currentUser();
  button.textContent = user.name[0].toUpperCase();
  button.title = user.email;
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');

  const menu = el('div', 'menu');
  menu.setAttribute('role', 'menu');
  menu.hidden = true;

  const who = el('div', 'menu-who');
  who.append(el('span', 'menu-who-name', user.name), el('span', 'menu-who-mail', user.email));
  menu.append(who);

  // ── DEMO ONLY ─────────────────────────────────────────────────────────────
  menu.append(el('div', 'menu-label', 'Demo — view as'));
  for (const role of ROLES) {
    const item = el('button', `menu-item${role.value === view ? ' on' : ''}`);
    item.type = 'button';
    item.setAttribute('role', 'menuitemradio');
    item.setAttribute('aria-checked', String(role.value === view));
    item.append(el('span', 'menu-tick', role.value === view ? '✓' : ''), el('span', null, role.label));
    item.addEventListener('click', () => {
      write(STORE_VIEW, role.value);
      const url = new URL(location.href);
      url.searchParams.set('view', role.value);
      location.href = url.toString();
    });
    menu.append(item);
  }
  menu.append(el('div', 'menu-rule'));
  // ── end DEMO ──────────────────────────────────────────────────────────────

  const logout = el('a', 'menu-item', 'Log out');
  logout.href = '/login.html';
  logout.setAttribute('role', 'menuitem');
  logout.addEventListener('click', () => {
    try { localStorage.removeItem(STORE_EMAIL); } catch { /* private window */ }
  });
  menu.append(logout);

  button.after(menu);

  const close = () => {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };

  button.addEventListener('click', event => {
    event.stopPropagation();
    menu.hidden = !menu.hidden;
    button.setAttribute('aria-expanded', String(!menu.hidden));
  });

  document.addEventListener('click', event => {
    if (!menu.hidden && !menu.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
  });
}
