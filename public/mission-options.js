// The choices offered on the mission intake form.
//
// Kept beside the form rather than inside it so the same lists can be used to
// validate what comes back — and, when there is a server, imported there too so
// the two sides can never disagree about what a valid answer is.

export const EXPORT_CONTROL = [
  { value: 'none', label: 'None' },
  { value: 'itar', label: 'ITAR components' },
  { value: 'ear', label: 'EAR / dual-use' },
  { value: 'other', label: 'Other — needs review' },
  { value: 'unknown', label: 'Not yet determined' },
];

export const RIDE_PREFERENCES = [
  { value: 'rideshare', label: 'Rideshare', description: 'Share a launch with other payloads.' },
  { value: 'dedicated', label: 'Dedicated', description: 'The whole vehicle for this mission.' },
  { value: 'both', label: 'Open to both', description: 'Whichever fits the window and the budget.' },
];

// Windows are typed as a quarter and a year rather than picked from a list.
//
// A dropdown has to stop somewhere, and wherever it stops is a customer whose
// programme runs past it — a constellation planned out to 2031 should not have
// to pick the last option and explain itself. Typing also beats scrolling for
// something everyone already knows the answer to.
//
// The stored shape stays "Q3 2026", so one string still says everything, and
// the rank below is what makes two of them comparable.
export const WINDOW_YEARS = { min: 2026, max: 2040 };

// A window as a single number, so ranges can be checked without parsing twice.
export const quarterRank = value => {
  const match = /^Q([1-4]) (\d{4})$/.exec(String(value ?? '').trim());
  return match ? Number(match[2]) * 4 + Number(match[1]) : null;
};

export const quarterParts = value => {
  const match = /^Q([1-4]) (\d{4})$/.exec(String(value ?? '').trim());
  return match ? { quarter: match[1], year: match[2] } : { quarter: '', year: '' };
};

export const quarterValue = (quarter, year) =>
  (quarter && year ? `Q${quarter} ${year}` : '');

// What a satellite can actually be deployed by.
//
// The first version of this list was wrong in a way worth recording: it mixed
// port classes (ESPA Grande) with CubeSat sizes (6U dispenser) and named almost
// no real hardware. "6U dispenser" is not a product — it is a size, and half a
// dozen vendors make one. A buyer ticking it has told a seller nothing about
// which interface their spacecraft actually mates to.
//
// So the list is grouped by the question being answered. A CubeSat asks which
// dispenser it fits inside; a microsat asks which port or separation system it
// bolts to. Those are different conversations and a satellite is usually in
// exactly one of them.
//
// TODO: the products are real and current, but the sizes and mass limits move
// with each revision — check these against live datasheets before launch, and
// expect the list to need adding to. It is deliberately not exhaustive.
//
// The size sits beside the name rather than inside it. A dispenser's capacity
// and a ring's bolt circle are what decide whether a spacecraft physically
// fits, so they have to be visible while choosing — but the match is made on
// the hardware, and folding "24 in" into the label would make the label the
// key and break the moment a vendor adds a size.
export const DEPLOYERS = [
  // CubeSats ride inside a dispenser, so the question is capacity
  { value: 'exopod-nova', label: 'Exolaunch EXOpod Nova', size: 'up to 16U', group: 'CubeSat dispensers' },
  { value: 'exopod', label: 'Exolaunch EXOpod', size: 'up to 12U', group: 'CubeSat dispensers' },
  { value: 'quadpack', label: 'ISISPACE QuadPack', size: 'up to 12U', group: 'CubeSat dispensers' },
  { value: 'csd', label: 'Rocket Lab CSD', size: '3U / 6U / 12U / 27U', group: 'CubeSat dispensers' },
  { value: 'spl', label: 'Astrofein SPL', size: '1U – 3U', group: 'CubeSat dispensers' },
  { value: 'any-dispenser', label: 'Any standard CubeSat dispenser', size: 'to be agreed', group: 'CubeSat dispensers' },

  // Larger spacecraft bolt to a port, so the question is the bolt circle
  { value: 'espa', label: 'ESPA port', size: '15 in / 381 mm', group: 'Ports & separation systems' },
  { value: 'espa-grande', label: 'ESPA Grande port', size: '24 in / 610 mm', group: 'Ports & separation systems' },
  { value: 'lightband', label: 'Rocket Lab Motorized Lightband', size: '8 – 24 in', group: 'Ports & separation systems' },
  { value: 'carbonix', label: 'Exolaunch CarboNIX', size: '8 / 11 / 15 / 24 in', group: 'Ports & separation systems' },
  { value: 'clampband', label: 'Clamp band', size: '937 / 1194 mm', group: 'Ports & separation systems' },

];

// Three ways to answer the deployer question, only one of which is a list.
//
// "Custom" and "Not yet decided" were options fourteen and fifteen in the list
// above, which made no sense: a satellite cannot be compatible with an EXOpod
// Nova *and* undecided, and ticking a bespoke clamp band alongside three
// standard dispensers says nothing a seller can act on. They are not items —
// they are answers that replace the list, so they replace the list.
export const DEPLOYER_MODES = [
  { value: 'list', label: 'Pick from the list' },
  { value: 'custom', label: 'A custom interface' },
  // A concept-stage mission genuinely does not know yet, and forcing a guess
  // puts a wrong answer into a field a match is decided on. This tells a seller
  // to ask rather than to assume.
  { value: 'tbd', label: 'Not yet decided' },
];

// What a stored deployer string means, for records written before the modes
// existed.
export const deployerMode = written => {
  const text = String(written ?? '').trim().toLowerCase();
  if (!text || text.startsWith('not yet')) return 'tbd';
  if (text.startsWith('custom')) return 'custom';
  return 'list';
};

// The options in the order they should be shown, grouped.
export const grouped = list => {
  const out = new Map();
  for (const option of list) {
    const name = option.group ?? '';
    if (!out.has(name)) out.set(name, []);
    out.get(name).push(option);
  }
  return [...out];
};

export const labelFor = (list, value) => list.find(option => option.value === value)?.label ?? '';

// What a buyer is willing to move when nothing matches exactly.
//
// A single "search outside my preferences" box would be easier to build and
// worse to use: it cannot say whether 15 km of altitude is fine but a quarter
// of slip is not. Naming the dimension lets the matcher widen one axis and
// leave the others alone, and tells the seller something worth knowing.
//
// Every option here is a dimension the intake actually collects — there is no
// point offering to relax a constraint that was never stated. Note that the
// last one is not the same kind of promise as the first three: a window or an
// altitude is rescheduling, while mass and envelope means re-engineering the
// spacecraft, which is slower and costs money. It belongs in the list because
// buyers really do shave mass to make a ride, but a seller reading it should
// know it is the expensive answer.
export const FLEXIBILITY = [
  { value: 'window', label: 'Launch window', description: 'Could fly a quarter earlier or later.' },
  { value: 'altitude', label: 'Altitude', description: 'A different altitude in the same regime works.' },
  { value: 'inclination', label: 'Inclination', description: 'A degree or two either side is acceptable.' },
  { value: 'ltan', label: 'LTAN', description: 'A different local time at the ascending node works.' },
  { value: 'ship', label: 'Ship date', description: 'Could have the spacecraft at the site earlier or later.' },
  { value: 'mass', label: 'Mass and envelope', description: 'Could trim the spacecraft to fit a tighter ride.' },
];

// CubeSat form factors, as a fast way to fill the dimensions — not as a second
// field beside them.
//
// Storing "12U" next to "226 × 226 × 340" gives you two records of one fact and
// no rule for which wins when they disagree. So picking a size writes the
// envelope into the three boxes and leaves them editable: the dimensions stay
// the single source of truth, and the picker is a shortcut for the people who
// think in U — which is everyone flying a CubeSat.
//
// These are nominal envelopes. Real dispensers differ, and deployables, tuna
// cans and oversize rails all push past them, which is why the fields stay
// editable after the pick. Masses are the usual per-dispenser ceilings, shown
// as guidance only — nothing here rejects a heavier spacecraft.
export const FORM_FACTORS = [
  // No default. A pre-selected "Custom" is the form answering its own question,
  // and it makes every satellite look one field further along than it is.
  { value: 'custom', label: 'Not a CubeSat' },
  { value: '1U', label: '1U', dims: [100, 100, 113.5], mass: 2 },
  { value: '2U', label: '2U', dims: [100, 100, 227], mass: 4 },
  { value: '3U', label: '3U', dims: [100, 100, 340.5], mass: 6 },
  { value: '6U', label: '6U', dims: [100, 226.3, 366], mass: 12 },
  { value: '12U', label: '12U', dims: [226.3, 226.3, 366], mass: 24 },
  { value: '16U', label: '16U', dims: [226.3, 226.3, 454], mass: 32 },
];

// Propulsion, asked as a hazard question rather than a spec one.
//
// What is on board decides range-safety review, fuelling at the site and, for
// some rideshare programmes, whether you are carried at all — several will not
// take hydrazine on a shared stack. That makes it a matching constraint of the
// same kind as export control, and one worth knowing before a match rather
// than after a quote.
export const PROPULSION = [
  { value: 'none', label: 'None' },
  { value: 'cold-gas', label: 'Cold gas' },
  { value: 'electric', label: 'Electric (xenon / krypton)' },
  { value: 'green', label: 'Green monopropellant' },
  { value: 'hydrazine', label: 'Hydrazine' },
  { value: 'other', label: 'Other' },
  { value: 'tbd', label: 'Not yet decided' },
];

// Where the spacecraft actually is, which is context for the date beside it.
// "Concept, ready in four months" and "in integration, ready in four months"
// are the same date and very different risks.
export const READINESS = [
  { value: 'concept', label: 'Concept / design' },
  { value: 'build', label: 'In build' },
  { value: 'integration', label: 'Integration & test' },
  { value: 'ready', label: 'Ready to ship' },
];

// Countries: the full ISO 3166-1 alpha-2 list, sorted by name.
//
// Typed free, this field produces "UK", "United Kingdom", "Great Britain" and
// "GB" for one country — and this is the field export-control rules are written
// against, so four spellings is four bugs. The stored value is the code, which
// is what a rule should be written in; the label is only for reading.
//
// The whole standard is here rather than a space-faring subset, because the
// subset is a judgement about who is allowed to have a satellite and that is
// not ours to make. Territories are included as the standard lists them; a
// launch provider's export team cares about the difference between Guernsey and
// the United Kingdom even when nobody else does.
export const COUNTRIES = [
  ['AF', 'Afghanistan'],
  ['AX', 'Åland Islands'],
  ['AL', 'Albania'],
  ['DZ', 'Algeria'],
  ['AS', 'American Samoa'],
  ['AD', 'Andorra'],
  ['AO', 'Angola'],
  ['AI', 'Anguilla'],
  ['AQ', 'Antarctica'],
  ['AG', 'Antigua and Barbuda'],
  ['AR', 'Argentina'],
  ['AM', 'Armenia'],
  ['AW', 'Aruba'],
  ['AU', 'Australia'],
  ['AT', 'Austria'],
  ['AZ', 'Azerbaijan'],
  ['BS', 'Bahamas'],
  ['BH', 'Bahrain'],
  ['BD', 'Bangladesh'],
  ['BB', 'Barbados'],
  ['BY', 'Belarus'],
  ['BE', 'Belgium'],
  ['BZ', 'Belize'],
  ['BJ', 'Benin'],
  ['BM', 'Bermuda'],
  ['BT', 'Bhutan'],
  ['BO', 'Bolivia'],
  ['BQ', 'Bonaire, Sint Eustatius and Saba'],
  ['BA', 'Bosnia and Herzegovina'],
  ['BW', 'Botswana'],
  ['BV', 'Bouvet Island'],
  ['BR', 'Brazil'],
  ['IO', 'British Indian Ocean Territory'],
  ['BN', 'Brunei Darussalam'],
  ['BG', 'Bulgaria'],
  ['BF', 'Burkina Faso'],
  ['BI', 'Burundi'],
  ['CV', 'Cabo Verde'],
  ['KH', 'Cambodia'],
  ['CM', 'Cameroon'],
  ['CA', 'Canada'],
  ['KY', 'Cayman Islands'],
  ['CF', 'Central African Republic'],
  ['TD', 'Chad'],
  ['CL', 'Chile'],
  ['CN', 'China'],
  ['CX', 'Christmas Island'],
  ['CC', 'Cocos (Keeling) Islands'],
  ['CO', 'Colombia'],
  ['KM', 'Comoros'],
  ['CG', 'Congo'],
  ['CD', 'Congo, Democratic Republic of the'],
  ['CK', 'Cook Islands'],
  ['CR', 'Costa Rica'],
  ['CI', "Côte d'Ivoire"],
  ['HR', 'Croatia'],
  ['CU', 'Cuba'],
  ['CW', 'Curaçao'],
  ['CY', 'Cyprus'],
  ['CZ', 'Czechia'],
  ['DK', 'Denmark'],
  ['DJ', 'Djibouti'],
  ['DM', 'Dominica'],
  ['DO', 'Dominican Republic'],
  ['EC', 'Ecuador'],
  ['EG', 'Egypt'],
  ['SV', 'El Salvador'],
  ['GQ', 'Equatorial Guinea'],
  ['ER', 'Eritrea'],
  ['EE', 'Estonia'],
  ['SZ', 'Eswatini'],
  ['ET', 'Ethiopia'],
  ['FK', 'Falkland Islands'],
  ['FO', 'Faroe Islands'],
  ['FJ', 'Fiji'],
  ['FI', 'Finland'],
  ['FR', 'France'],
  ['GF', 'French Guiana'],
  ['PF', 'French Polynesia'],
  ['TF', 'French Southern Territories'],
  ['GA', 'Gabon'],
  ['GM', 'Gambia'],
  ['GE', 'Georgia'],
  ['DE', 'Germany'],
  ['GH', 'Ghana'],
  ['GI', 'Gibraltar'],
  ['GR', 'Greece'],
  ['GL', 'Greenland'],
  ['GD', 'Grenada'],
  ['GP', 'Guadeloupe'],
  ['GU', 'Guam'],
  ['GT', 'Guatemala'],
  ['GG', 'Guernsey'],
  ['GN', 'Guinea'],
  ['GW', 'Guinea-Bissau'],
  ['GY', 'Guyana'],
  ['HT', 'Haiti'],
  ['HM', 'Heard Island and McDonald Islands'],
  ['VA', 'Holy See'],
  ['HN', 'Honduras'],
  ['HK', 'Hong Kong'],
  ['HU', 'Hungary'],
  ['IS', 'Iceland'],
  ['IN', 'India'],
  ['ID', 'Indonesia'],
  ['IR', 'Iran'],
  ['IQ', 'Iraq'],
  ['IE', 'Ireland'],
  ['IM', 'Isle of Man'],
  ['IL', 'Israel'],
  ['IT', 'Italy'],
  ['JM', 'Jamaica'],
  ['JP', 'Japan'],
  ['JE', 'Jersey'],
  ['JO', 'Jordan'],
  ['KZ', 'Kazakhstan'],
  ['KE', 'Kenya'],
  ['KI', 'Kiribati'],
  ['KP', "Korea, Democratic People's Republic of"],
  ['KR', 'Korea, Republic of'],
  ['KW', 'Kuwait'],
  ['KG', 'Kyrgyzstan'],
  ['LA', "Lao People's Democratic Republic"],
  ['LV', 'Latvia'],
  ['LB', 'Lebanon'],
  ['LS', 'Lesotho'],
  ['LR', 'Liberia'],
  ['LY', 'Libya'],
  ['LI', 'Liechtenstein'],
  ['LT', 'Lithuania'],
  ['LU', 'Luxembourg'],
  ['MO', 'Macao'],
  ['MG', 'Madagascar'],
  ['MW', 'Malawi'],
  ['MY', 'Malaysia'],
  ['MV', 'Maldives'],
  ['ML', 'Mali'],
  ['MT', 'Malta'],
  ['MH', 'Marshall Islands'],
  ['MQ', 'Martinique'],
  ['MR', 'Mauritania'],
  ['MU', 'Mauritius'],
  ['YT', 'Mayotte'],
  ['MX', 'Mexico'],
  ['FM', 'Micronesia'],
  ['MD', 'Moldova'],
  ['MC', 'Monaco'],
  ['MN', 'Mongolia'],
  ['ME', 'Montenegro'],
  ['MS', 'Montserrat'],
  ['MA', 'Morocco'],
  ['MZ', 'Mozambique'],
  ['MM', 'Myanmar'],
  ['NA', 'Namibia'],
  ['NR', 'Nauru'],
  ['NP', 'Nepal'],
  ['NL', 'Netherlands'],
  ['NC', 'New Caledonia'],
  ['NZ', 'New Zealand'],
  ['NI', 'Nicaragua'],
  ['NE', 'Niger'],
  ['NG', 'Nigeria'],
  ['NU', 'Niue'],
  ['NF', 'Norfolk Island'],
  ['MK', 'North Macedonia'],
  ['MP', 'Northern Mariana Islands'],
  ['NO', 'Norway'],
  ['OM', 'Oman'],
  ['PK', 'Pakistan'],
  ['PW', 'Palau'],
  ['PS', 'Palestine, State of'],
  ['PA', 'Panama'],
  ['PG', 'Papua New Guinea'],
  ['PY', 'Paraguay'],
  ['PE', 'Peru'],
  ['PH', 'Philippines'],
  ['PN', 'Pitcairn'],
  ['PL', 'Poland'],
  ['PT', 'Portugal'],
  ['PR', 'Puerto Rico'],
  ['QA', 'Qatar'],
  ['RE', 'Réunion'],
  ['RO', 'Romania'],
  ['RU', 'Russian Federation'],
  ['RW', 'Rwanda'],
  ['BL', 'Saint Barthélemy'],
  ['SH', 'Saint Helena, Ascension and Tristan da Cunha'],
  ['KN', 'Saint Kitts and Nevis'],
  ['LC', 'Saint Lucia'],
  ['MF', 'Saint Martin (French part)'],
  ['PM', 'Saint Pierre and Miquelon'],
  ['VC', 'Saint Vincent and the Grenadines'],
  ['WS', 'Samoa'],
  ['SM', 'San Marino'],
  ['ST', 'Sao Tome and Principe'],
  ['SA', 'Saudi Arabia'],
  ['SN', 'Senegal'],
  ['RS', 'Serbia'],
  ['SC', 'Seychelles'],
  ['SL', 'Sierra Leone'],
  ['SG', 'Singapore'],
  ['SX', 'Sint Maarten (Dutch part)'],
  ['SK', 'Slovakia'],
  ['SI', 'Slovenia'],
  ['SB', 'Solomon Islands'],
  ['SO', 'Somalia'],
  ['ZA', 'South Africa'],
  ['GS', 'South Georgia and the South Sandwich Islands'],
  ['SS', 'South Sudan'],
  ['ES', 'Spain'],
  ['LK', 'Sri Lanka'],
  ['SD', 'Sudan'],
  ['SR', 'Suriname'],
  ['SJ', 'Svalbard and Jan Mayen'],
  ['SE', 'Sweden'],
  ['CH', 'Switzerland'],
  ['SY', 'Syrian Arab Republic'],
  ['TW', 'Taiwan'],
  ['TJ', 'Tajikistan'],
  ['TZ', 'Tanzania'],
  ['TH', 'Thailand'],
  ['TL', 'Timor-Leste'],
  ['TG', 'Togo'],
  ['TK', 'Tokelau'],
  ['TO', 'Tonga'],
  ['TT', 'Trinidad and Tobago'],
  ['TN', 'Tunisia'],
  ['TR', 'Türkiye'],
  ['TM', 'Turkmenistan'],
  ['TC', 'Turks and Caicos Islands'],
  ['TV', 'Tuvalu'],
  ['UG', 'Uganda'],
  ['UA', 'Ukraine'],
  ['AE', 'United Arab Emirates'],
  ['GB', 'United Kingdom'],
  ['US', 'United States'],
  ['UM', 'United States Minor Outlying Islands'],
  ['UY', 'Uruguay'],
  ['UZ', 'Uzbekistan'],
  ['VU', 'Vanuatu'],
  ['VE', 'Venezuela'],
  ['VN', 'Viet Nam'],
  ['VG', 'Virgin Islands (British)'],
  ['VI', 'Virgin Islands (U.S.)'],
  ['WF', 'Wallis and Futuna'],
  ['EH', 'Western Sahara'],
  ['YE', 'Yemen'],
  ['ZM', 'Zambia'],
  ['ZW', 'Zimbabwe'],
].map(([value, label]) => ({ value, label }));

// Orbit type, asked before the numbers rather than derived from them.
//
// It could be computed — 97.4° at 520 km is sun-synchronous whether or not
// anyone says so — but a mission often knows "we need SSO" months before it
// knows the altitude, and the type is how both sides of the marketplace talk:
// listings are already filed under it on Browse. Asking first also lets the
// fields underneath narrow themselves, so a GEO mission is not fighting an
// altitude box that stops at 2,000 km.
//
// The ranges are deliberately generous. They are there to catch a typo or a
// unit slip, not to tell an operator what orbit they are allowed to want.
export const ORBIT_TYPES = [
  {
    value: 'leo', label: 'LEO', altitude: [150, 2000], inclination: [0, 180],
    note: 'Low Earth orbit below 2,000 km.',
  },
  {
    value: 'sso', label: 'SSO', altitude: [300, 1400], inclination: [95, 102], ltan: true,
    note: 'Sun-synchronous — near-polar and retrograde, so LTAN applies.',
  },
  {
    value: 'polar', label: 'Polar LEO', altitude: [150, 2000], inclination: [80, 100],
    note: 'Near-polar but not sun-synchronous.',
  },
  {
    value: 'meo', label: 'MEO', altitude: [2000, 35000], inclination: [0, 180],
    note: 'Medium Earth orbit, above LEO and below geostationary.',
  },
  {
    value: 'gto', label: 'GTO', altitude: [200, 36000], inclination: [0, 30],
    // A transfer orbit is an ellipse, so one altitude cannot describe it.
    note: 'A transfer orbit is elliptical. Give the apogee here — a real intake needs perigee and apogee both.',
  },
  {
    value: 'geo', label: 'GEO', altitude: [35700, 35900], inclination: [0, 5], fill: [35786, 0],
    note: 'Geostationary: one altitude and one inclination, both fixed.',
  },
];

export const orbitType = value => ORBIT_TYPES.find(option => option.value === value);

// Label back to value.
//
// The demo fixtures store what a field looks like ("United Kingdom", "Cold
// gas") rather than what it is ("GB", "cold-gas"), so opening a saved mission
// in the form means translating back. A real record stores the code and this
// goes away — it is here because the fixture is a display artefact, and that is
// worth fixing in the schema rather than papering over twice.
const head = label => String(label ?? '').split('—')[0].split('/')[0].trim().toLowerCase();

export function valueFor(list, label) {
  if (!label) return '';
  const wanted = head(label);
  const hit = list.find(option => head(option.label) === wanted)
    ?? list.find(option => option.value.toLowerCase() === wanted);
  return hit?.value ?? '';
}

// LTAN is a clock, so the field behaves like one.
//
// Free text lets someone produce "1030", "10.30" or "10:3 0" — all of which
// read fine to a person and none of which a matcher can compare. The colon is
// structure rather than input: digits are all you type, and the separator is
// placed for you and cannot be deleted on its own.
export function maskClock(input) {
  const format = () => {
    const digits = input.value.replace(/\D/g, '').slice(0, 4);
    input.value = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
  };
  input.inputMode = 'numeric';
  input.maxLength = 5;
  input.placeholder = input.placeholder || '10:30';
  input.addEventListener('input', format);
  format();
  return input;
}
