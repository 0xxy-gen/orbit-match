// Form rules, kept in one place and keyed by the form's input names so each
// message lands under the field it belongs to.
//
// NOTE FOR WHOEVER WIRES THIS UP: these run in the browser, so they are a
// courtesy to the person filling the form, never a security boundary. Every
// rule here has to be repeated on the server, which is the only side that
// decides whether a sign-up is accepted.
//
// Right now the pages call these to paint errors as you leave a field, but the
// submit button still goes through — see ENFORCE_ON_SUBMIT in signup.js,
// login.js and forgot.js.
import { COMPANY_SIZES, INTENTS, SATELLITE_BANDS } from './options.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]+$/;
const valuesOf = list => new Set(list.map(option => option.value));
const SIZES = valuesOf(COMPANY_SIZES);
const INTENT_VALUES = valuesOf(INTENTS);
const BANDS = valuesOf(SATELLITE_BANDS);
const text = value => (typeof value === 'string' ? value.trim() : '');

export function validateSignup(input) {
  const v = Object.fromEntries(
    ['firstName', 'lastName', 'email', 'phone', 'companyName', 'companySize', 'role', 'intent', 'satellitesPerYear']
      .map(key => [key, text(input[key])]),
  );
  v.email = v.email.toLowerCase();
  const password = typeof input.password === 'string' ? input.password : '';
  const confirmPassword = typeof input.confirmPassword === 'string' ? input.confirmPassword : '';

  const fields = {};
  const required = (key, message, max = 100) => {
    if (!v[key]) fields[key] = message;
    else if (v[key].length > max) fields[key] = `Keep this under ${max} characters.`;
  };

  required('firstName', 'Enter your first name.');
  required('lastName', 'Enter your last name.');

  if (!v.email) fields.email = 'Enter your work email.';
  else if (v.email.length > 254 || !EMAIL.test(v.email)) fields.email = 'Enter a valid email, like name@company.com.';

  const digits = v.phone.replace(/\D/g, '').length;
  if (!v.phone) fields.phone = 'Enter your business phone.';
  else if (!PHONE.test(v.phone) || digits < 7 || digits > 15) fields.phone = 'Enter a valid phone number.';

  if (input.privacy !== true) fields.privacy = 'Agree to the Privacy Policy to continue.';

  required('companyName', 'Enter your company name.', 200);
  if (!SIZES.has(v.companySize)) fields.companySize = 'Choose your company size.';
  required('role', 'Enter your role.');
  if (!INTENT_VALUES.has(v.intent)) fields.intent = 'Choose whether you need a launch or sell launches.';
  if (!BANDS.has(v.satellitesPerYear)) fields.satellitesPerYear = 'Choose how many satellites you launch per year.';

  if (!password) fields.password = 'Create a password.';
  else if (password.length < 8) fields.password = 'Use at least 8 characters.';
  else if (password.length > 200) fields.password = 'Keep your password under 200 characters.';

  if (!confirmPassword) fields.confirmPassword = 'Confirm your password.';
  else if (confirmPassword !== password) fields.confirmPassword = 'Passwords don’t match.';

  return { values: v, fields };
}

export function validateLogin(input) {
  const fields = {};
  const email = text(input.email).toLowerCase();
  const password = typeof input.password === 'string' ? input.password : '';

  if (!email) fields.email = 'Enter your work email.';
  else if (!EMAIL.test(email)) fields.email = 'Enter a valid email, like name@company.com.';
  if (!password) fields.password = 'Enter your password.';

  return { values: { email, password }, fields };
}

export function validateEmailOnly(input) {
  const fields = {};
  const email = text(input.email).toLowerCase();

  if (!email) fields.email = 'Enter your work email.';
  else if (!EMAIL.test(email)) fields.email = 'Enter a valid email, like name@company.com.';

  return { values: { email }, fields };
}
