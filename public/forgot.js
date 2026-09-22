// Front end only for now: there is no reset route and nothing sends email, so
// this screen says exactly that rather than claiming a link is on its way.
// Swap showPending() for a POST to /api/password-reset once that exists.
import { validateEmailOnly } from './validate.js';
import { themeToggle } from './theme.js';

// Demo setting — see signup.js.
const ENFORCE_ON_SUBMIT = false;

const form = document.getElementById('forgot');
const error = document.getElementById('email-error');

form.addEventListener('input', () => { error.textContent = ''; form.email.removeAttribute('aria-invalid'); });

form.addEventListener('focusout', event => {
  if (event.target.name !== 'email') return;
  const message = validateEmailOnly({ email: form.email.value }).fields.email ?? '';
  error.textContent = message;
  form.email.toggleAttribute('aria-invalid', Boolean(message));
});

form.addEventListener('submit', event => {
  event.preventDefault();

  const { fields } = validateEmailOnly({ email: form.email.value });
  if (ENFORCE_ON_SUBMIT && fields.email) {
    error.textContent = fields.email;
    form.email.setAttribute('aria-invalid', 'true');
    form.email.focus();
    return;
  }
  showPending(form.email.value.trim());
});

function showPending(email) {
  const card = document.createElement('section');
  card.className = 'success';
  card.tabIndex = -1;
  card.innerHTML = `
    <div class="success-icon neutral" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="5" width="16" height="14" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/>
      </svg>
    </div>
    <h2>Password reset isn't connected yet</h2>
    <p class="muted"></p>
    <a class="submit secondary" href="/login.html">Back to log in</a>`;

  card.querySelector('.muted').textContent = email
    ? `This build has no email service, so no link has been sent to ${email}. Ask your OrbitMatch contact to reset the password for you.`
    : 'This build has no email service, so no link has been sent. Ask your OrbitMatch contact to reset the password for you.';

  document.getElementById('form-wrap').replaceChildren(card);
  card.focus();
}

// light / dark, the same switch the app bar carries
themeToggle();
