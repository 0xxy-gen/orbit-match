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
import { quarterRank, WINDOW_YEARS, COUNTRIES, orbitType } from './mission-options.js';

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

// ── mission intake ──────────────────────────────────────────────────────────
//
// Same contract as the sign-up rules: a courtesy in the browser, never the
// decision. The mission fields are keyed by name; each satellite's problems are
// keyed `sat-<index>-<field>` so the message lands under the right row of the
// right satellite.
//
// Ranges rather than bare "required": an altitude of 40 km is not an orbit and
// an inclination of 400° is not an angle, and catching that at intake is
// cheaper than catching it in a quote.
const number = value => {
  const parsed = Number(String(value ?? '').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export function validateMission(input, satellites = []) {
  const v = Object.fromEntries(
    ['name', 'objective', 'budget', 'country', 'exportControl', 'registration', 'ride']
      .map(key => [key, text(input[key])]),
  );

  const fields = {};
  const required = (key, message, max = 120) => {
    if (!v[key]) fields[key] = message;
    else if (v[key].length > max) fields[key] = `Keep this under ${max} characters.`;
  };

  required('name', 'Name the mission.');
  required('objective', 'Say what the mission is for.', 300);
  // A budget is a number of dollars, so it is checked as one.
  const budgetDigits = v.budget.replace(/[^\d]/g, '');
  if (!v.budget) fields.budget = 'Enter a target budget.';
  else if (!budgetDigits || Number(budgetDigits) <= 0) fields.budget = 'Enter an amount in US dollars.';
  else if (Number(budgetDigits) < 10000) fields.budget = 'That looks low for a launch — check the figure.';
  // Countries are codes now, so they are checked against the list rather than
  // trusted as text.
  const codes = new Set(COUNTRIES.map(option => option.value));
  for (const [key, message] of [
    ['country', 'Choose the country of manufacture.'],
    ['registration', 'Choose the State of registry.'],
  ]) {
    if (!v[key]) fields[key] = message;
    else if (!codes.has(v[key])) fields[key] = 'Choose a country from the list.';
  }

  if (!v.exportControl) fields.exportControl = 'Choose an export control status.';
  // "Other" is a promise to say what, so the follow-up is required once it is
  // the answer — and only then.
  else if (v.exportControl === 'other' && !text(input.exportControlDetail)) {
    fields.exportControlDetail = 'Say which regime or restriction applies.';
  }
  if (!v.ride) fields.ride = 'Choose a ride preference.';

  if (!satellites.length) fields.satellites = 'Add at least one satellite.';

  const range = (key, index, value, low, high, message) => {
    const parsed = number(value);
    if (parsed === null || parsed <= 0) fields[`sat-${index}-${key}`] = message;
    else if (parsed < low || parsed > high) fields[`sat-${index}-${key}`] = `Expected ${low}–${high}.`;
  };

  satellites.forEach((satellite, index) => {
    if (!text(satellite.name)) fields[`sat-${index}-name`] = 'Name the satellite.';
    range('mass', index, satellite.mass, 0.1, 20000, 'Enter a mass in kg.');
    for (const side of ['length', 'width', 'height']) {
      range(side, index, satellite[side], 1, 10000, 'Enter a size in mm.');
    }
    // The orbit type sets what counts as a sane altitude and inclination, so a
    // GEO mission is not measured against LEO bounds.
    if (!text(satellite.orbit)) fields[`sat-${index}-orbit`] = 'Choose an orbit type.';
    const type = orbitType(satellite.orbit);
    const [incLow, incHigh] = type?.inclination ?? [0, 180];
    const [altLow, altHigh] = type?.altitude ?? [150, 36000];
    range('inclination', index, satellite.inclination, incLow, incHigh, 'Enter an inclination in degrees.');
    range('altitude', index, satellite.altitude, altLow, altHigh, 'Enter an altitude in km.');
    if (satellite.ltan && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(text(satellite.ltan))) {
      fields[`sat-${index}-ltan`] = 'Use a 24-hour time, like 10:30.';
    }
    // The window is a span, typed as a quarter and a year, so both ends have to
    // parse, sit inside a sane range of years, and be the right way round.
    const from = quarterRank(satellite.windowFrom);
    const to = quarterRank(satellite.windowTo);
    const inYears = value => {
      const year = Number(String(value ?? '').slice(-4));
      return year >= WINDOW_YEARS.min && year <= WINDOW_YEARS.max;
    };

    for (const [key, rank] of [['windowFrom', from], ['windowTo', to]]) {
      if (!text(satellite[key])) fields[`sat-${index}-${key}`] = 'Enter a quarter and a year.';
      else if (rank === null) fields[`sat-${index}-${key}`] = 'Use a quarter and a year, like Q3 2026.';
      else if (!inYears(satellite[key])) {
        fields[`sat-${index}-${key}`] = `Between ${WINDOW_YEARS.min} and ${WINDOW_YEARS.max}.`;
      }
    }
    if (from !== null && to !== null && to < from) {
      fields[`sat-${index}-windowTo`] = 'The latest window cannot be before the earliest.';
    }
    if (!text(satellite.propulsion)) fields[`sat-${index}-propulsion`] = 'Choose a propulsion type.';
    else if (satellite.propulsion === 'other' && !text(satellite.propulsionOther)) {
      fields[`sat-${index}-propulsionOther`] = 'Name the propellant.';
    }
    if (!text(satellite.readiness)) fields[`sat-${index}-readiness`] = 'Choose a build status.';
    // The date the satellite can be at the site. Without it a window cannot be
    // checked against the provider's L− lead time, which is the check that
    // decides whether a match is possible at all.
    if (!text(satellite.shipBy)) fields[`sat-${index}-shipBy`] = 'Give a month, even a rough one.';
    else if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(text(satellite.shipBy))) {
      fields[`sat-${index}-shipBy`] = 'Use a month, like 2026-07.';
    }
    if (!satellite.deployers?.length) fields[`sat-${index}-deployers`] = 'Pick at least one deployer.';
    else if (satellite.deployers.includes('custom') && !text(satellite.deployerOther)) {
      fields[`sat-${index}-deployerOther`] = 'Describe the interface.';
    }
    if (satellite.suppliesDeployer) {
      range('deployerMass', index, satellite.deployerMass, 0.1, 5000, 'Enter the deployer mass in kg.');
    }
  });

  return { values: v, fields };
}
