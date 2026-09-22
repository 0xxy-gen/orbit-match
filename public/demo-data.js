// Sample rows for the prototype. Everything here is invented — buyers, sellers,
// listings, prices and deals — so nothing implies a real company's plans.
//
// Names follow Aether — Event Flow v1: launch buyer / launch seller, mission →
// satellite, listing, match, request, watchlist / waitlist, and the event names
// (NounVerbed) that the dashboard and the bell are both projections of.

// ─── deal status ────────────────────────────────────────────────────────────
// Derived, never typed: a projection of the stored events, in spec order.
export const STATUSES = [
  'matched',
  'NDA pending',
  'channel open',
  'in procurement',
  'commercially closed',
  'in contract',
  'executed',
  'booked',
];

// ─── supply side: listings ──────────────────────────────────────────────────
export const LISTINGS = [
  {
    id: 'l1', alt: 520, inc: 97.5, seller: 'Meridian Launch', launcher: 'Aster-2', site: 'Andøya, Norway',
    orbit: 'SSO', altitude: '520 km', inclination: '97.5°', window: 'Q3 2026',
    lMinus: 'L−6 weeks', delivery: '12 Jun 2026', spareMass: 180, price: '£38k / kg',
    watchers: 6, matches: 2,
  },
  {
    id: 'l2', alt: 560, inc: 97.8, seller: 'Verda Space', launcher: 'Halo-1', site: 'Kourou, French Guiana',
    orbit: 'SSO', altitude: '560 km', inclination: '97.8°', window: 'Q4 2026',
    lMinus: 'L−8 weeks', delivery: '02 Sep 2026', spareMass: 420, price: '£31k / kg',
    watchers: 3, matches: 1,
  },
  {
    id: 'l3', alt: 450, inc: 51.6, seller: 'Kestrel Launch Systems', launcher: 'K-9 Heavy', site: 'Cape Canaveral, USA',
    orbit: 'LEO', altitude: '450 km', inclination: '51.6°', window: 'Q1 2027',
    lMinus: 'L−10 weeks', delivery: '21 Nov 2026', spareMass: 1200, price: '£24k / kg',
    watchers: 1, matches: 0,
  },
  {
    id: 'l4', alt: 505, inc: 97.4, seller: 'Tanaris Aerospace', launcher: 'Tanaris-B', site: 'Sriharikota, India',
    orbit: 'SSO', altitude: '505 km', inclination: '97.4°', window: 'Q2 2027',
    lMinus: 'L−6 weeks', delivery: '19 Feb 2027', spareMass: 95, price: 'On request',
    watchers: 4, matches: 2,
  },
  {
    id: 'l5', alt: 600, inc: 89.9, seller: 'Northwind Orbital', launcher: 'NW-4', site: 'Sutherland, Scotland',
    orbit: 'Polar', altitude: '600 km', inclination: '89.9°', window: 'Q4 2026',
    lMinus: 'L−8 weeks', delivery: '05 Sep 2026', spareMass: 240, price: '£35k / kg',
    watchers: 2, matches: 0,
  },
  {
    id: 'l6', alt: null, inc: 6, seller: 'Verda Space', launcher: 'Halo-2', site: 'Kourou, French Guiana',
    orbit: 'GTO', altitude: '—', inclination: '6°', window: 'Q3 2027',
    lMinus: 'L−10 weeks', delivery: '14 May 2027', spareMass: 800, price: '£29k / kg',
    watchers: 0, matches: 0,
  },
  {
    id: 'l7', alt: 540, inc: 97.6, seller: 'Meridian Launch', launcher: 'Aster-4', site: 'Andøya, Norway',
    orbit: 'SSO', altitude: '540 km', inclination: '97.6°', window: 'Q4 2027',
    lMinus: 'L−6 weeks', delivery: '12 Sep 2027', spareMass: 210, price: '£36k / kg',
    watchers: 5, matches: 1,
  },
  {
    id: 'l8', alt: 570, inc: 97.9, seller: 'Northwind Orbital', launcher: 'NW-5', site: 'Sutherland, Scotland',
    orbit: 'SSO', altitude: '570 km', inclination: '97.9°', window: 'Q1 2028',
    lMinus: 'L−8 weeks', delivery: '14 Nov 2027', spareMass: 320, price: '£33k / kg',
    watchers: 2, matches: 2,
  },
  {
    id: 'l9', alt: 480, inc: 45, seller: 'Kestrel Launch Systems', launcher: 'K-9', site: 'Cape Canaveral, USA',
    orbit: 'LEO', altitude: '480 km', inclination: '45°', window: 'Q2 2028',
    lMinus: 'L−10 weeks', delivery: '19 Feb 2028', spareMass: 900, price: '£26k / kg',
    watchers: 0, matches: 0,
  },
  {
    id: 'l10', alt: 620, inc: 90.1, seller: 'Tanaris Aerospace', launcher: 'Tanaris-C', site: 'Sriharikota, India',
    orbit: 'Polar', altitude: '620 km', inclination: '90.1°', window: 'Q3 2027',
    lMinus: 'L−6 weeks', delivery: '28 May 2027', spareMass: 150, price: 'On request',
    watchers: 1, matches: 0,
  },
];

// ─── demand side: satellites published by launch buyers ─────────────────────
// Banded on purpose: a requirement is commercially sensitive, so a seller sees
// the shape of it, never the buyer's exact figures.
export const SATELLITES = [
  {
    id: 's1', alt: 525, inc: 97.4, buyer: 'Earth-observation buyer', country: 'Germany', mission: 'Boreal',
    orbit: 'SSO', altitude: '500–550 km', massBand: '50–100 kg', window: 'Q3 2026', count: 2, fits: 2,
  },
  {
    id: 's2', alt: 450, inc: 51.6, buyer: 'Connectivity constellation', country: 'United Kingdom', mission: 'Lyra',
    orbit: 'LEO', altitude: '400–500 km', massBand: '150–250 kg', window: 'Q4 2026', count: 6, fits: 1,
  },
  {
    id: 's3', alt: 550, inc: 97.5, buyer: 'University research group', country: 'Netherlands', mission: 'Delta-U',
    orbit: 'SSO', altitude: '500–600 km', massBand: '10–25 kg', window: 'Q1 2027', count: 1, fits: 2,
  },
  {
    id: 's4', alt: 600, inc: 90, buyer: 'Maritime monitoring buyer', country: 'Norway', mission: 'Sagara',
    orbit: 'Polar', altitude: '550–650 km', massBand: '25–50 kg', window: 'Q4 2026', count: 3, fits: 0,
  },
  {
    id: 's5', alt: 500, inc: 97.35, buyer: 'Weather data startup', country: 'Spain', mission: 'Meridiem',
    orbit: 'SSO', altitude: '480–520 km', massBand: '100–150 kg', window: 'Q2 2027', count: 4, fits: 1,
  },
  {
    id: 's6', alt: null, inc: 6, buyer: 'Navigation payload owner', country: 'Italy', mission: 'Hansa',
    orbit: 'GTO', altitude: '—', massBand: '250–400 kg', window: 'Q3 2027', count: 1, fits: 0,
  },
  {
    id: 's7', alt: 530, inc: 97.45, buyer: 'Imaging constellation', country: 'Finland', mission: 'Zephyr',
    orbit: 'SSO', altitude: '500–560 km', massBand: '50–100 kg', window: 'Q4 2027', count: 8, fits: 2,
  },
  {
    id: 's8', alt: 650, inc: 90.2, buyer: 'Climate research institute', country: 'France', mission: 'TF-Verde',
    orbit: 'Polar', altitude: '600–700 km', massBand: '100–150 kg', window: 'Q1 2028', count: 2, fits: 1,
  },
  {
    id: 's9', alt: 475, inc: 45, buyer: 'In-orbit servicing startup', country: 'United Kingdom', mission: 'Atacama',
    orbit: 'LEO', altitude: '450–500 km', massBand: '400–600 kg', window: 'Q2 2028', count: 1, fits: 0,
  },
];

// ─── deals: one satellite × one listing ─────────────────────────────────────
// `waiting.side` is what the gate is waiting on — the dashboard's whole job is
// making that legible. Clocks are the spec's: connect 5, quotation 10 business
// days, NDA 5, waitlist = the listing's own deadline, quote validity per version.
export const DEALS = {
  buy: [
    {
      id: 'd1', subject: 'Aurora-1', counterpart: 'Aster-2 · Meridian Launch',
      status: 'in procurement', phase: 'E3', lastEvent: 'QuoteSubmitted v2', lastAt: '2 days ago',
      waiting: { side: 'you', what: 'Quote v2 awaiting acceptance', clock: 'validity ends in 9 days' },
      window: 'Q3 2026', delivery: 'Delivery 12 Jun 2026 (L−6 weeks)',
    },
    {
      id: 'd2', subject: 'Aurora-2', counterpart: 'Aster-2 · Meridian Launch',
      status: 'channel open', phase: 'E1', lastEvent: 'RfiSubmitted', lastAt: '3 days ago',
      waiting: { side: 'them', what: 'ROM owed by seller', clock: 'no clock — informal step' },
      window: 'Q3 2026', delivery: 'Delivery 12 Jun 2026 (L−6 weeks)',
    },
    {
      id: 'd3', subject: 'Aurora-T', counterpart: 'NW-5 · Northwind Orbital',
      status: 'NDA pending', phase: 'D3', lastEvent: 'NdaProposed', lastAt: '1 day ago',
      waiting: { side: 'you', what: 'NDA awaiting your signature', clock: 'expires in 4 business days' },
      window: 'Q1 2028', delivery: 'Delivery 14 Nov 2027 (L−8 weeks)',
    },
    {
      id: 'd4', subject: 'Aurora-2', counterpart: 'Tanaris-B · Tanaris Aerospace',
      status: 'matched', phase: 'C', lastEvent: 'RequestCreated (quotation)', lastAt: '4 days ago',
      waiting: { side: 'them', what: 'Request awaiting response', clock: '6 business days left of 10' },
      window: 'Q2 2027', delivery: 'Delivery 19 Feb 2027 (L−6 weeks)',
    },
    {
      id: 'd5', subject: 'Aurora-1', counterpart: 'Halo-1 · Verda Space',
      status: 'matched', phase: 'B', lastEvent: 'MatchFound', lastAt: '6 days ago',
      waiting: { side: 'you', what: 'No request sent yet', clock: 'nothing running' },
      window: 'Q4 2026', delivery: 'Delivery 02 Sep 2026 (L−8 weeks)',
    },
    {
      id: 'd6', subject: 'Aurora-0', counterpart: 'Aster-1 · Meridian Launch',
      status: 'booked', phase: 'G', lastEvent: 'SatelliteBooked', lastAt: '3 weeks ago',
      waiting: { side: 'none', what: 'Nothing outstanding', clock: 'window holds' },
      window: 'Q3 2026', delivery: 'Delivery 12 Jun 2026 (L−6 weeks)',
    },
  ],
  sell: [
    {
      id: 'e1', subject: 'Aster-2', counterpart: 'Connectivity constellation',
      status: 'matched', phase: 'C', lastEvent: 'RequestCreated (quotation)', lastAt: '2 hours ago',
      waiting: { side: 'you', what: 'Quotation request to accept or decline', clock: '10 business days left of 10' },
      window: 'Q3 2026', delivery: 'Delivery 12 Jun 2026 (L−6 weeks)',
    },
    {
      id: 'e2', subject: 'Aster-4', counterpart: 'University research group',
      status: 'channel open', phase: 'E1', lastEvent: 'RfiSubmitted', lastAt: '1 day ago',
      waiting: { side: 'you', what: 'RFI received — ROM owed', clock: 'no clock — informal step' },
      window: 'Q4 2027', delivery: 'Delivery 12 Sep 2027 (L−6 weeks)',
    },
    {
      id: 'e3', subject: 'Aster-2', counterpart: 'Earth-observation buyer',
      status: 'in procurement', phase: 'E3', lastEvent: 'QuoteSubmitted v2', lastAt: '2 days ago',
      waiting: { side: 'them', what: 'Quote v2 with the buyer', clock: 'validity ends in 9 days' },
      window: 'Q3 2026', delivery: 'Delivery 12 Jun 2026 (L−6 weeks)',
    },
    {
      id: 'e4', subject: 'Aster-3', counterpart: 'Climate research institute',
      status: 'commercially closed', phase: 'F2', lastEvent: 'QuoteAccepted v1', lastAt: '4 days ago',
      waiting: { side: 'you', what: 'Agreement to draft (LSA + SOW)', clock: 'nothing running' },
      window: 'Q1 2028', delivery: 'Delivery 14 Nov 2027 (L−8 weeks)',
    },
    {
      id: 'e5', subject: 'Aster-2', counterpart: 'Imaging constellation',
      status: 'NDA pending', phase: 'D3', lastEvent: 'NdaSigned (them)', lastAt: '1 day ago',
      waiting: { side: 'you', what: 'NDA awaiting your signature', clock: 'expires in 4 business days' },
      window: 'Q3 2026', delivery: 'Delivery 12 Jun 2026 (L−6 weeks)',
    },
    {
      id: 'e6', subject: 'Aster-2', counterpart: 'Maritime monitoring buyer',
      status: 'booked', phase: 'G', lastEvent: 'SatelliteBooked', lastAt: '2 weeks ago',
      waiting: { side: 'none', what: 'Nothing outstanding', clock: 'window holds' },
      window: 'Q3 2026', delivery: 'Delivery 12 Jun 2026 (L−6 weeks)',
    },
  ],
};

// ─── the bell: one line per event on the other side, read-only ──────────────
export const ACTIVITY = {
  buy: [
    { event: 'QuoteSubmitted', line: 'Meridian Launch sent quote v2 for Aurora-1 × Aster-2', at: '3h' },
    { event: 'WindowChanged', line: 'NW-5 moved to Q1 2028 — delivery date now 14 Nov 2027', at: '1d' },
    { event: 'NdaProposed', line: 'Match formed with Northwind Orbital — NDA to sign', at: '1d' },
    { event: 'MatchFound', line: '3 listings match Aurora-2', at: '2d' },
    { event: 'ListingUpdated', line: 'Halo-1 capacity now 420 kg — you watch this listing', at: '5d' },
  ],
  sell: [
    { event: 'RequestCreated', line: 'Quotation request on Aster-2 from a connectivity constellation', at: '2h' },
    { event: 'RomAccepted', line: 'University research group accepted ROM v1 for Aster-4', at: '1d' },
    { event: 'MatchFound', line: '2 satellites match Aster-4', at: '2d' },
    { event: 'WatchCreated', line: '6 buyers now watch Aster-2', at: '3d' },
    { event: 'QuoteAccepted', line: 'Climate research institute accepted quote v1 for Aster-3', at: '4d' },
  ],
};

// ─── your own rows ──────────────────────────────────────────────────────────
export const MY_SATELLITES = [
  { name: 'Aurora-1', meta: 'Boreal · SSO 520 km · 68 kg · Q3 2026', status: 'Published', alt: 520, inc: 97.45, window: 'Q3 2026', mass: 68 },
  { name: 'Aurora-2', meta: 'Boreal · SSO 520 km · 68 kg · Q3 2026', status: 'Published', alt: 520, inc: 97.45, window: 'Q3 2026', mass: 68 },
  { name: 'Aurora-T', meta: 'Boreal · SSO 550 km · 12 kg · Q1 2027', status: 'Draft', alt: 550, inc: 97.6, window: 'Q1 2027', mass: 12 },
];

export const MY_LISTINGS = [
  { name: 'Aster-2', meta: 'SSO 520 km · 180 kg spare · Q3 2026', status: 'Published', alt: 520, inc: 97.5, window: 'Q3 2026', spareMass: 180 },
  { name: 'Aster-4', meta: 'SSO 540 km · 210 kg spare · Q4 2027', status: 'Published', alt: 540, inc: 97.6, window: 'Q4 2027', spareMass: 210 },
  { name: 'Aster-3', meta: 'LEO 450 km · 640 kg spare · Q1 2027', status: 'Draft', alt: 450, inc: 51.6, window: 'Q1 2027', spareMass: 640 },
];

// The compatibility rule, as numbers: a satellite fits a listing when the orbit
// type matches, inclination is within 1.5° and altitude within 150 km. The plot
// draws this as a box, so a near-miss is visible rather than merely absent.
export const FIT = { inclination: 1.5, altitude: 150 };

// Sun-synchronous inclination is a function of altitude — the spine most of the
// market sits on. Measured points; the plot interpolates between them.
export const SSO_CURVE = [
  [300, 96.67], [400, 97.03], [500, 97.4], [600, 97.79], [700, 98.19], [800, 98.6],
];

// ─── the missions list ──────────────────────────────────────────────────────
// The fields are the ones the mission intake actually asks for: the mission and
// its objective, budget, the regulatory answers, the ride preference, how many
// satellites, and then per satellite the eight numbers that decide what it can
// fly on.
export const MISSION_ROWS = {
  // Buyer rows carry exactly what the intake form asks for — the same fields in
  // the same words — so a mission shows what somebody actually typed into it.
  buy: [
    {
      id: 'm1', name: 'Boreal', objective: 'Sub-metre optical imaging of Arctic shipping lanes',
      status: 'Published', budget: '$18,000,000', country: 'United Kingdom', exportControl: 'None',
      registration: 'United Kingdom', ride: 'Rideshare',
      flexibility: ['Launch window'],
      // Three satellites, two launches: a mission is not one flight. Your spec
      // allows one agreement to cover several satellites on one listing — a
      // launch batch — so the satellites group by the launch they are on.
      launches: [
        { id: 'b1', listing: 'Aster-2', seller: 'Meridian Launch', window: 'Q3 2026', status: 'in procurement', reached: 2, detail: 'Quote v2 · 9 days of validity left' },
        { id: 'b2', listing: 'NW-5', seller: 'Northwind Orbital', window: 'Q1 2027', status: 'NDA pending', reached: 1, detail: 'NDA expires in 4 business days' },
      ],
      satellites: [
        {
          name: 'Aurora-1', launch: 'b1', form: 'Custom', mass: '68', orbit: 'SSO', deployerMass: '', dimensions: '700 × 700 × 700',
          inclination: '97.45', altitude: '520', ltan: '10:30',
          windowFrom: 'Q3 2026', windowTo: 'Q4 2026',
          propulsion: 'Cold gas', readiness: 'Integration & test', shipBy: 'Mar 2026',
          deployer: 'ESPA Grande, CSD',
        },
        {
          name: 'Aurora-2', launch: 'b1', form: 'Custom', mass: '68', orbit: 'SSO', deployerMass: '', dimensions: '700 × 700 × 700',
          inclination: '97.45', altitude: '520', ltan: '10:30',
          windowFrom: 'Q3 2026', windowTo: 'Q4 2026',
          propulsion: 'Cold gas', readiness: 'In build', shipBy: 'May 2026',
          deployer: 'ESPA Grande, CSD',
        },
        {
          name: 'Aurora-T', launch: 'b2', form: '12U', mass: '12', orbit: 'SSO', deployerMass: '12', dimensions: '226.3 × 226.3 × 366',
          inclination: '97.6', altitude: '550', ltan: '10:30',
          windowFrom: 'Q1 2027', windowTo: 'Q2 2027',
          propulsion: 'None', readiness: 'Concept / design', shipBy: 'Aug 2026',
          deployer: '12U dispenser',
        },
      ],
    },
    {
      id: 'm2', name: 'Lyra', objective: 'Ku-band connectivity demonstrator',
      status: 'Draft', budget: '$5,400,000', country: 'United Kingdom', exportControl: 'ITAR components',
      registration: 'United Kingdom', ride: 'Open to both',
      flexibility: [],
      launches: [],
      satellites: [
        {
          name: 'Lyra-1', form: 'Custom', mass: '210', orbit: 'LEO', deployerMass: '', dimensions: '1000 × 1000 × 1100',
          inclination: '51.6', altitude: '450', ltan: '—',
          windowFrom: 'Q4 2026', windowTo: 'Q4 2026',
          propulsion: 'Hydrazine', readiness: 'Concept / design', shipBy: 'Feb 2026',
          deployer: 'ESPA Grande',
        },
      ],
    },
    {
      id: 'm3', name: 'Sagara', objective: 'Maritime AIS monitoring, polar coverage',
      status: 'Published', budget: '$8,700,000', country: 'Norway', exportControl: 'None',
      registration: 'Norway', ride: 'Dedicated',
      flexibility: ['Launch window', 'Altitude'],
      launches: [
        { id: 'b3', listing: 'NW-4', seller: 'Northwind Orbital', window: 'Q4 2026', status: 'matched', reached: 0, detail: 'No request sent yet' },
      ],
      satellites: [
        {
          name: 'Sagara-1', launch: 'b3', form: 'Custom', mass: '46', orbit: 'Polar LEO', deployerMass: '', dimensions: '600 × 600 × 600',
          inclination: '90.0', altitude: '600', ltan: '—',
          windowFrom: 'Q4 2026', windowTo: 'Q1 2027',
          propulsion: 'Green monopropellant', readiness: 'In build', shipBy: 'Apr 2026',
          deployer: 'CSD',
        },
        {
          name: 'Sagara-2', form: 'Custom', mass: '46', orbit: 'Polar LEO', deployerMass: '', dimensions: '600 × 600 × 600',
          inclination: '90.0', altitude: '600', ltan: '—',
          windowFrom: 'Q4 2026', windowTo: 'Q1 2027',
          propulsion: 'Green monopropellant', readiness: 'In build', shipBy: 'Apr 2026',
          deployer: 'CSD',
        },
      ],
    },
  ],
  sell: [
    {
      id: 'n1', name: 'Aster-2', objective: 'Andøya · SSO rideshare',
      status: 'Published', capacity: '180 kg spare of 1,200 kg', orbit: 'SSO 520 km · 97.5°',
      window: 'Q3 2026', lMinus: 'L−6 weeks', site: 'Andøya, Norway',
      deployers: 'ESPA Grande, CSD, 12U dispenser', terms: '£38k / kg',
    },
    {
      id: 'n2', name: 'Aster-4', objective: 'Andøya · SSO rideshare',
      status: 'Published', capacity: '210 kg spare of 1,200 kg', orbit: 'SSO 540 km · 97.6°',
      window: 'Q4 2027', lMinus: 'L−6 weeks', site: 'Andøya, Norway',
      deployers: 'ESPA Grande, CSD', terms: '£36k / kg',
    },
    {
      id: 'n3', name: 'Aster-3', objective: 'Cape Canaveral · mid-inclination LEO',
      status: 'Draft', capacity: '640 kg spare of 2,000 kg', orbit: 'LEO 450 km · 51.6°',
      window: 'Q1 2027', lMinus: 'L−10 weeks', site: 'Cape Canaveral, USA',
      deployers: 'ESPA Grande', terms: 'On request',
    },
  ],
};

export const VIEWS = {
  buy: [
    { key: 'all', label: 'All missions', test: () => true },
    { key: 'published', label: 'Published', test: row => row.status === 'Published' },
    { key: 'drafts', label: 'Drafts', test: row => row.status === 'Draft' },
  ],
  sell: [
    { key: 'all', label: 'All listings', test: () => true },
    { key: 'published', label: 'Published', test: row => row.status === 'Published' },
    { key: 'drafts', label: 'Drafts', test: row => row.status === 'Draft' },
  ],
};

// ─── one deal, end to end ───────────────────────────────────────────────────
// The procurement path as a checklist. `actor` says whose move it is, `event`
// names what the step writes (a step with no event is your own work and the
// other side cannot see it), and a loop step carries `rounds` instead of
// pretending to be a single milestone.
export const PHASES = ['Matched', 'NDA', 'Procurement', 'Contract', 'Booked'];

export const DEAL = {
  satellite: 'Aurora-1',
  mission: 'Boreal',
  listing: 'Aster-2',
  seller: 'Meridian Launch',
  status: 'in procurement',
  window: 'Q3 2026',
  delivery: '3 Nov 2026',
  deliveryWas: '27 Oct 2026',
  waiting: { side: 'you', what: 'Quote v2 awaiting your decision', clock: '9 days of validity left' },
  summary: ['Matched', 'NDA', 'Procurement', 'Contract', 'Booked'],
  reached: 2,
  steps: [
    { label: 'Mission published', event: 'SatelliteReady', actor: 'You', state: 'done', at: '12 Mar 2026' },
    { label: 'Mission matched', event: 'MatchFound', actor: 'Matcher', state: 'done', at: '14 Mar 2026', detail: '3 listings matched Aurora-1' },
    { label: 'Sign mutual NDA', event: 'NdaExecuted', actor: 'Both', state: 'done', at: '2 Apr 2026', detail: 'Signed by both, channel opened' },
    { label: 'Draft RFI', actor: 'You', state: 'done', at: '5 Apr 2026', note: 'Your draft — the seller saw nothing until it was sent' },
    { label: 'Send RFI', event: 'RfiSubmitted', actor: 'You', state: 'done', at: '6 Apr 2026' },
    { label: 'ROM received', event: 'RomSubmitted', actor: 'Meridian Launch', state: 'done', at: '13 Apr 2026', detail: 'v1 · ballpark, not binding' },
    { label: 'Approve, reject or negotiate the ROM', event: 'RomAccepted', actor: 'You', state: 'done', at: '16 Apr 2026', rounds: 'settled in 1 round' },
    { label: 'Draft RFQ', actor: 'You', state: 'done', at: '20 Apr 2026', note: 'Your draft — includes the compliance matrix' },
    { label: 'Send RFQ', event: 'RfqSubmitted', actor: 'You', state: 'done', at: '21 Apr 2026', detail: 'With ComplianceMatrixAttached' },
    { label: 'Quote received', event: 'QuoteSubmitted', actor: 'Meridian Launch', state: 'done', at: '8 May 2026', detail: 'v2 · supersedes v1' },
    {
      label: 'Approve, reject or negotiate the quote', event: 'TermProposed / TermAccepted', actor: 'You',
      state: 'current', rounds: 'round 2 · 2 compliance rows contested',
      detail: 'Quote v2 valid for 9 more days',
    },
    { label: 'Request the LSA and SOW', actor: 'You', state: 'next' },
    { label: 'LSA and SOW received', event: 'AgreementDrafted', actor: 'Meridian Launch', state: 'next' },
    { label: 'Approve, reject or negotiate the agreement', event: 'TermProposed / TermAccepted', actor: 'Both', state: 'next' },
    { label: 'LSA and SOW signature', event: 'AgreementSigned ×2 → AgreementExecuted', actor: 'Both', state: 'next' },
    { label: 'Billing', actor: '—', state: 'untracked', note: 'No events for this in v1 of the flow — it needs a model before it can be tracked' },
    { label: 'Launch booked', event: 'SatelliteBooked', actor: 'Platform', state: 'next', detail: 'Exclusivity begins here' },
  ],
};
