// Front end only: there is nothing to sign in to yet, so showSignedIn() stands
// in for a POST that would start a session.
import { validateLogin } from './validate.js';

// Demo setting. false: fields turn red as you leave them, but the button still
// goes through. true: the button stops on the first problem — which is what you
// want once a server is checking the password.
const ENFORCE_ON_SUBMIT = false;
const form = document.getElementById('login');
const submit = form.querySelector('.submit');
const formError = document.getElementById('form-error');
const FIELDS = ['email', 'password'];

const toggle = document.getElementById('toggle-password');
toggle.addEventListener('click', () => {
  const show = form.password.type === 'password';
  form.password.type = show ? 'text' : 'password';
  toggle.textContent = show ? 'Hide' : 'Show';
  toggle.setAttribute('aria-pressed', String(show));
});

function setError(name, message) {
  document.getElementById(`${name}-error`).textContent = message;
  form.elements[name].toggleAttribute('aria-invalid', Boolean(message));
}

form.addEventListener('input', event => {
  if (FIELDS.includes(event.target.name)) setError(event.target.name, '');
});

const readForm = () => ({ email: form.email.value, password: form.password.value });

form.addEventListener('focusout', event => {
  if (!FIELDS.includes(event.target.name)) return;
  setError(event.target.name, validateLogin(readForm()).fields[event.target.name] ?? '');
});

form.addEventListener('submit', event => {
  event.preventDefault();
  for (const name of FIELDS) setError(name, '');
  formError.textContent = '';

  const { fields } = validateLogin(readForm());
  if (ENFORCE_ON_SUBMIT && Object.keys(fields).length) {
    for (const [name, message] of Object.entries(fields)) setError(name, message);
    form.elements[FIELDS.find(name => fields[name])].focus();
    return;
  }
  // Straight into the app, the way it will behave with a server behind it.
  const email = form.email.value.trim();
  try { if (email) localStorage.setItem('orbitmatch:email', email); } catch { /* private window */ }
  location.href = 'home.html';
});

// Kept for the signed-in state a real session would show on this page.
function showSignedIn(email) {
  const card = document.createElement('section');
  card.className = 'success';
  card.tabIndex = -1;
  card.innerHTML = `
    <div class="success-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <h2>You're logged in</h2>
    <p class="muted"></p>
    <a class="submit secondary" href="/login.html">Log out</a>
    <p class="prototype-note">Prototype — no password was checked and no session was started.</p>`;

  const who = card.querySelector('.muted');
  if (email) who.textContent = email;
  else who.remove();
  document.getElementById('form-wrap').replaceChildren(card);
  card.focus();
}

// DEMO ONLY: one click into either side of the marketplace, no typing, no
// logging out. Delete this block and the .demo-entry markup for the real thing.
for (const button of document.querySelectorAll('.demo-entry button')) {
  button.addEventListener('click', () => {
    try {
      localStorage.setItem('orbitmatch:view', button.dataset.view);
      localStorage.setItem('orbitmatch:email',
        button.dataset.view === 'need' ? 'rohit@kestrel.example' : 'rohit@meridianlaunch.example');
    } catch { /* private window */ }
    location.href = `home.html?view=${button.dataset.view}`;
  });
}
