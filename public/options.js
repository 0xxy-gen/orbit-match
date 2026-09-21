// The choices offered on the sign-up form. Imported by the browser to build the
// form and by the server to validate it, so the two can never disagree.

export const COMPANY_SIZES = [
  { value: '1-10', label: '1–10 employees' },
  { value: '11-50', label: '11–50 employees' },
  { value: '51-200', label: '51–200 employees' },
  { value: '201-1000', label: '201–1,000 employees' },
  { value: '1000+', label: 'More than 1,000 employees' },
];

export const INTENTS = [
  { value: 'need', title: 'I need a launch', description: 'I have satellites looking for a ride to orbit.' },
  { value: 'sell', title: 'I sell launches', description: 'I have launch capacity to offer.' },
];

export const SATELLITE_BANDS = [
  { value: '0', label: 'None yet' },
  { value: '1-5', label: '1–5 per year' },
  { value: '6-20', label: '6–20 per year' },
  { value: '21-50', label: '21–50 per year' },
  { value: '50+', label: 'More than 50 per year' },
];
