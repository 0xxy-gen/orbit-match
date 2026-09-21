import { COMPANY_SIZES, INTENTS, SATELLITE_BANDS } from './options.js';

const form = document.getElementById('signup');
const submit = form.querySelector('.submit');
const formError = document.getElementById('form-error');

// Top-to-bottom order, so focus goes to the first problem on the page.
const FIELD_ORDER = ['firstName', 'lastName', 'email', 'phone', 'privacy', 'companyName', 'companySize',
  'role', 'intent', 'satellitesPerYear', 'password', 'confirmPassword'];

for (const [select, options] of [[form.companySize, COMPANY_SIZES], [form.satellitesPerYear, SATELLITE_BANDS]]) {
  for (const { value, label } of options) select.add(new Option(label, value));
  // Grey the select out while it still shows its prompt, like a placeholder.
  const sync = () => select.classList.toggle('placeholder', !select.value);
  select.addEventListener('change', sync);
  sync();
}

const ICON_PATHS = {
  // a satellite, for operators looking for a ride
  need: ['M13 7 9 3 5 7l4 4', 'm17 11 4 4-4 4-4-4', 'm8 12 4 4 6-6-4-4Z', 'm16 8 3-3', 'M9 21a6 6 0 0 0-6-6'],
  // a rocket, for providers selling capacity
  sell: ['M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z',
    'm12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z',
    'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0', 'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5'],
};

document.getElementById('intent').append(...INTENTS.map(({ value, title, description }) => {
  const choice = document.createElement('label');
  choice.className = 'choice';
  choice.innerHTML = `
    <span class="choice-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        ${ICON_PATHS[value].map(d => `<path d="${d}"/>`).join('')}
      </svg>
    </span>
    <span class="choice-text">
      <span class="choice-label">${title}</span>
      <span class="choice-help">${description}</span>
    </span>
    <input type="radio" name="intent" value="${value}">`;
  return choice;
}));

const toggle = document.getElementById('toggle-password');
toggle.addEventListener('click', () => {
  const show = form.password.type === 'password';
  form.password.type = form.confirmPassword.type = show ? 'text' : 'password';
  toggle.textContent = show ? 'Hide' : 'Show';
  toggle.setAttribute('aria-pressed', String(show));
});

// Live feedback on the password rules, so nobody has to submit to find out.
const passwordHint = document.getElementById('password-hint');
const confirmHint = document.getElementById('confirmPassword-hint');
function syncPasswordHints() {
  const { value: password } = form.password;
  const { value: confirm } = form.confirmPassword;
  passwordHint.classList.toggle('met', password.length >= 8);
  confirmHint.hidden = !(confirm && confirm === password);
  confirmHint.classList.toggle('met', !confirmHint.hidden);
}
form.password.addEventListener('input', syncPasswordHints);
form.confirmPassword.addEventListener('input', syncPasswordHints);

// The element that carries aria-invalid: the radio group for intent, the input otherwise.
const control = name => (name === 'intent' ? document.getElementById('intent') : form.elements[name]);

function setError(name, message) {
  document.getElementById(`${name}-error`).textContent = message;
  if (message) control(name).setAttribute('aria-invalid', 'true');
  else control(name).removeAttribute('aria-invalid');
}

function clearErrors() {
  for (const name of FIELD_ORDER) setError(name, '');
  formError.textContent = '';
}

function showErrors(fields) {
  for (const [name, message] of Object.entries(fields)) setError(name, message);
  const first = FIELD_ORDER.find(name => fields[name]);
  if (first === 'intent') form.querySelector('input[name="intent"]').focus();
  else if (first) form.elements[first].focus();
}

form.addEventListener('input', event => {
  const name = event.target.name;
  if (FIELD_ORDER.includes(name)) setError(name, '');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  clearErrors();

  const data = Object.fromEntries(new FormData(form));
  data.privacy = form.privacy.checked;

  const submitText = submit.querySelector('.submit-text');
  submit.disabled = true;
  submitText.textContent = 'Creating account…';
  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return showSuccess(body.account);
    if (body.fields) return showErrors(body.fields);
    formError.textContent = body.error || 'Something went wrong. Try again.';
  } catch {
    formError.textContent = 'Could not reach OrbitMatch. Check your connection and try again.';
  } finally {
    submit.disabled = false;
    submitText.textContent = 'Create account';
  }
});

function showSuccess(account) {
  const intent = INTENTS.find(option => option.value === account.intent);
  const card = document.createElement('section');
  card.className = 'success';
  card.tabIndex = -1;
  card.innerHTML = `
    <div class="success-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <h2></h2>
    <p class="muted">Your account has been created.</p>
    <dl class="summary"></dl>
    <a class="submit" href="/signup">Create another account</a>`;

  card.querySelector('h2').textContent = `Welcome to OrbitMatch, ${account.firstName}`;
  const summary = card.querySelector('.summary');
  for (const [term, detail] of [
    ['Name', `${account.firstName} ${account.lastName}`],
    ['Work email', account.email],
    ['Company', account.companyName],
    ['Account type', intent?.title ?? account.intent],
  ]) {
    const row = document.createElement('div');
    row.append(Object.assign(document.createElement('dt'), { textContent: term }),
      Object.assign(document.createElement('dd'), { textContent: detail }));
    summary.append(row);
  }

  document.getElementById('form-wrap').replaceChildren(card);
  card.focus();
}
