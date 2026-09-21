import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { COMPANY_SIZES, INTENTS, SATELLITE_BANDS } from './public/options.js';

const root = import.meta.dirname;
const PORT = Number(process.env.PORT) || 3200;
const scrypt = promisify(scryptCallback);

mkdirSync(join(root, 'data'), { recursive: true });
const db = new DatabaseSync(join(root, 'data', 'orbitmatch.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id                  INTEGER PRIMARY KEY,
    first_name          TEXT NOT NULL,
    last_name           TEXT NOT NULL,
    email               TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone               TEXT NOT NULL,
    privacy_accepted_at TEXT NOT NULL,
    company_name        TEXT NOT NULL,
    company_size        TEXT NOT NULL,
    role                TEXT NOT NULL,
    intent              TEXT NOT NULL CHECK (intent IN ('need', 'sell')),
    satellites_per_year TEXT NOT NULL,
    password_hash       TEXT NOT NULL,
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`);

// scrypt with a per-account random salt, stored as scrypt$<salt>$<hash>.
async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]+$/;
const valuesOf = list => new Set(list.map(option => option.value));
const SIZES = valuesOf(COMPANY_SIZES);
const INTENT_VALUES = valuesOf(INTENTS);
const BANDS = valuesOf(SATELLITE_BANDS);
const text = value => (typeof value === 'string' ? value.trim() : '');

// Errors are keyed by the form's input names, so the page can show each one
// under the field it belongs to.
function validate(body) {
  const b = body && typeof body === 'object' ? body : {};
  const v = {
    firstName: text(b.firstName),
    lastName: text(b.lastName),
    email: text(b.email).toLowerCase(),
    phone: text(b.phone),
    companyName: text(b.companyName),
    companySize: text(b.companySize),
    role: text(b.role),
    intent: text(b.intent),
    satellitesPerYear: text(b.satellitesPerYear),
    password: typeof b.password === 'string' ? b.password : '',
  };
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

  if (b.privacy !== true) fields.privacy = 'Agree to the Privacy Policy to continue.';

  required('companyName', 'Enter your company name.', 200);
  if (!SIZES.has(v.companySize)) fields.companySize = 'Choose your company size.';
  required('role', 'Enter your role.');
  if (!INTENT_VALUES.has(v.intent)) fields.intent = 'Choose whether you need a launch or sell launches.';
  if (!BANDS.has(v.satellitesPerYear)) fields.satellitesPerYear = 'Choose how many satellites you launch per year.';

  if (!v.password) fields.password = 'Create a password.';
  else if (v.password.length < 8) fields.password = 'Use at least 8 characters.';
  else if (v.password.length > 200) fields.password = 'Keep your password under 200 characters.';

  if (!b.confirmPassword) fields.confirmPassword = 'Confirm your password.';
  else if (b.confirmPassword !== v.password) fields.confirmPassword = 'Passwords don’t match.';

  return { values: v, fields };
}

const EMAIL_TAKEN = 'An account with this email already exists.';
const findByEmail = db.prepare('SELECT 1 FROM accounts WHERE email = ?');
const insertAccount = db.prepare(`
  INSERT INTO accounts (first_name, last_name, email, phone, privacy_accepted_at, company_name,
                        company_size, role, intent, satellites_per_year, password_hash)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const app = express();
app.use(express.json({ limit: '20kb' }));

app.get('/', (req, res) => res.redirect('/signup'));
app.use(express.static(join(root, 'public'), { extensions: ['html'] }));

app.post('/api/signup', async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Send the form as JSON.' });

  const { values: v, fields } = validate(req.body);
  if (!fields.email && findByEmail.get(v.email)) fields.email = EMAIL_TAKEN;
  if (Object.keys(fields).length) return res.status(400).json({ fields });

  const passwordHash = await hashPassword(v.password);
  try {
    insertAccount.run(v.firstName, v.lastName, v.email, v.phone, new Date().toISOString(), v.companyName,
      v.companySize, v.role, v.intent, v.satellitesPerYear, passwordHash);
  } catch (err) {
    // Two sign-ups racing on the same email: the UNIQUE constraint catches the loser.
    if (String(err.message).includes('UNIQUE')) return res.status(400).json({ fields: { email: EMAIL_TAKEN } });
    throw err;
  }

  res.status(201).json({
    account: { firstName: v.firstName, lastName: v.lastName, email: v.email, companyName: v.companyName, intent: v.intent },
  });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request was malformed.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Try again.' });
});

app.listen(PORT, () => console.log(`OrbitMatch running at http://localhost:${PORT}`));
