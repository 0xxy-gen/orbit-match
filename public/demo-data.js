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

// ─── the people on your side of the deal ────────────────────────────────────
//
// Who can be tagged in an activity entry. A real build reads this from the
// account's organisation; here it is the set of people who already appear in
// the logs, so a tag always resolves to somebody you can see posting.
export const TEAM = [
  { name: 'Rohit', role: 'Programme lead' },
  { name: 'Marta', role: 'Thermal' },
  { name: 'Dana', role: 'Launch integration' },
  { name: 'Pau', role: 'Export compliance' },
  { name: 'Tane', role: 'Systems' },
  { name: 'Ingrid', role: 'AIV' },
  { name: 'Aoife', role: 'Contracts' },
];

// ─── supply side: listings ──────────────────────────────────────────────────
export const LISTINGS = [
  {
    id: 'l1', alt: 520, inc: 97.5, seller: 'Isar Aerospace', launcher: 'Spectrum F3', site: 'Andøya, Norway',
    orbit: 'SSO', altitude: '520 km', inclination: '97.5°', window: 'Q3 2026',
    lMinus: 'L−6 weeks', delivery: '12 Jun 2026', spareMass: 180, price: '£38k / kg',
    watchers: 6, matches: 2,
  },
  {
    id: 'l2', alt: 560, inc: 97.8, seller: 'Arianespace', launcher: 'Vega C VV29', site: 'Kourou, French Guiana',
    orbit: 'SSO', altitude: '560 km', inclination: '97.8°', window: 'Q4 2026',
    lMinus: 'L−8 weeks', delivery: '02 Sep 2026', spareMass: 420, price: '£31k / kg',
    watchers: 3, matches: 1,
  },
  {
    id: 'l3', alt: 450, inc: 51.6, seller: 'SpaceX', launcher: 'Bandwagon-5', site: 'Cape Canaveral, USA',
    orbit: 'LEO', altitude: '450 km', inclination: '51.6°', window: 'Q1 2027',
    lMinus: 'L−10 weeks', delivery: '21 Nov 2026', spareMass: 1200, price: '£24k / kg',
    watchers: 1, matches: 0,
  },
  {
    id: 'l4', alt: 505, inc: 97.4, seller: 'NSIL', launcher: 'PSLV-C64', site: 'Sriharikota, India',
    orbit: 'SSO', altitude: '505 km', inclination: '97.4°', window: 'Q2 2027',
    lMinus: 'L−6 weeks', delivery: '19 Feb 2027', spareMass: 95, price: 'On request',
    watchers: 4, matches: 2,
  },
  {
    id: 'l5', alt: 600, inc: 89.9, seller: 'RFA', launcher: 'RFA ONE F4', site: 'SaxaVord, Shetland',
    orbit: 'Polar', altitude: '600 km', inclination: '89.9°', window: 'Q4 2026',
    lMinus: 'L−8 weeks', delivery: '05 Sep 2026', spareMass: 240, price: '£35k / kg',
    watchers: 2, matches: 0,
  },
  {
    id: 'l6', alt: null, inc: 6, seller: 'Arianespace', launcher: 'Ariane 6 VA265', site: 'Kourou, French Guiana',
    orbit: 'GTO', altitude: '—', inclination: '6°', window: 'Q3 2027',
    lMinus: 'L−10 weeks', delivery: '14 May 2027', spareMass: 800, price: '£29k / kg',
    watchers: 0, matches: 0,
  },
  {
    id: 'l7', alt: 540, inc: 97.6, seller: 'Isar Aerospace', launcher: 'Spectrum F5', site: 'Andøya, Norway',
    orbit: 'SSO', altitude: '540 km', inclination: '97.6°', window: 'Q4 2027',
    lMinus: 'L−6 weeks', delivery: '12 Sep 2027', spareMass: 210, price: '£36k / kg',
    watchers: 5, matches: 1,
  },
  {
    id: 'l8', alt: 570, inc: 97.9, seller: 'RFA', launcher: 'RFA ONE F6', site: 'SaxaVord, Shetland',
    orbit: 'SSO', altitude: '570 km', inclination: '97.9°', window: 'Q1 2028',
    lMinus: 'L−8 weeks', delivery: '14 Nov 2027', spareMass: 320, price: '£33k / kg',
    watchers: 2, matches: 2,
  },
  {
    id: 'l9', alt: 480, inc: 45, seller: 'SpaceX', launcher: 'Bandwagon-6', site: 'Cape Canaveral, USA',
    orbit: 'LEO', altitude: '480 km', inclination: '45°', window: 'Q2 2028',
    lMinus: 'L−10 weeks', delivery: '19 Feb 2028', spareMass: 900, price: '£26k / kg',
    watchers: 0, matches: 0,
  },
  {
    id: 'l10', alt: 620, inc: 90.1, seller: 'NSIL', launcher: 'SSLV-D5', site: 'Sriharikota, India',
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
      id: 'd1', subject: 'Aurora-1', counterpart: 'Spectrum F3 · Isar Aerospace',
      status: 'in procurement', phase: 'E3', lastEvent: 'QuoteSubmitted v2', lastAt: '2 days ago',
      waiting: { side: 'you', what: 'Quote v2 awaiting acceptance', clock: 'validity ends in 9 days' },
      window: 'Q3 2026', delivery: 'Delivery 12 Jun 2026 (L−6 weeks)',
    },
    {
      id: 'd2', subject: 'Aurora-2', counterpart: 'Spectrum F3 · Isar Aerospace',
      status: 'channel open', phase: 'E1', lastEvent: 'RfiSubmitted', lastAt: '3 days ago',
      waiting: { side: 'them', what: 'ROM owed by seller', clock: 'no clock — informal step' },
      window: 'Q3 2026', delivery: 'Delivery 12 Jun 2026 (L−6 weeks)',
    },
    {
      id: 'd3', subject: 'Aurora-T', counterpart: 'RFA ONE F6 · RFA',
      status: 'NDA pending', phase: 'D3', lastEvent: 'NdaProposed', lastAt: '1 day ago',
      waiting: { side: 'you', what: 'NDA awaiting your signature', clock: 'expires in 4 business days' },
      window: 'Q1 2028', delivery: 'Delivery 14 Nov 2027 (L−8 weeks)',
    },
    {
      id: 'd4', subject: 'Aurora-2', counterpart: 'PSLV-C64 · NSIL',
      status: 'matched', phase: 'C', lastEvent: 'RequestCreated (quotation)', lastAt: '4 days ago',
      waiting: { side: 'them', what: 'Request awaiting response', clock: '6 business days left of 10' },
      window: 'Q2 2027', delivery: 'Delivery 19 Feb 2027 (L−6 weeks)',
    },
    {
      id: 'd5', subject: 'Aurora-1', counterpart: 'Vega C VV29 · Arianespace',
      status: 'matched', phase: 'B', lastEvent: 'MatchFound', lastAt: '6 days ago',
      waiting: { side: 'you', what: 'No request sent yet', clock: 'nothing running' },
      window: 'Q4 2026', delivery: 'Delivery 02 Sep 2026 (L−8 weeks)',
    },
    {
      id: 'd6', subject: 'Aurora-0', counterpart: 'Spectrum F2 · Isar Aerospace',
      status: 'booked', phase: 'G', lastEvent: 'SatelliteBooked', lastAt: '3 weeks ago',
      waiting: { side: 'none', what: 'Nothing outstanding', clock: 'window holds' },
      window: 'Q3 2026', delivery: 'Delivery 12 Jun 2026 (L−6 weeks)',
    },
  ],
  sell: [
    {
      id: 'e1', subject: 'Spectrum F3', counterpart: 'Connectivity constellation',
      status: 'matched', phase: 'C', lastEvent: 'RequestCreated (quotation)', lastAt: '2 hours ago',
      waiting: { side: 'you', what: 'Quotation request to accept or decline', clock: '10 business days left of 10' },
      window: 'Q3 2026', delivery: 'Delivery 12 Jun 2026 (L−6 weeks)',
    },
    {
      id: 'e2', subject: 'Spectrum F5', counterpart: 'University research group',
      status: 'channel open', phase: 'E1', lastEvent: 'RfiSubmitted', lastAt: '1 day ago',
      waiting: { side: 'you', what: 'RFI received — ROM owed', clock: 'no clock — informal step' },
      window: 'Q4 2027', delivery: 'Delivery 12 Sep 2027 (L−6 weeks)',
    },
    {
      id: 'e3', subject: 'Spectrum F3', counterpart: 'Earth-observation buyer',
      status: 'in procurement', phase: 'E3', lastEvent: 'QuoteSubmitted v2', lastAt: '2 days ago',
      waiting: { side: 'them', what: 'Quote v2 with the buyer', clock: 'validity ends in 9 days' },
      window: 'Q3 2026', delivery: 'Delivery 12 Jun 2026 (L−6 weeks)',
    },
    {
      id: 'e4', subject: 'Spectrum F4', counterpart: 'Climate research institute',
      status: 'commercially closed', phase: 'F2', lastEvent: 'QuoteAccepted v1', lastAt: '4 days ago',
      waiting: { side: 'you', what: 'Agreement to draft (LSA + SOW)', clock: 'nothing running' },
      window: 'Q1 2028', delivery: 'Delivery 14 Nov 2027 (L−8 weeks)',
    },
    {
      id: 'e5', subject: 'Spectrum F3', counterpart: 'Imaging constellation',
      status: 'NDA pending', phase: 'D3', lastEvent: 'NdaSigned (them)', lastAt: '1 day ago',
      waiting: { side: 'you', what: 'NDA awaiting your signature', clock: 'expires in 4 business days' },
      window: 'Q3 2026', delivery: 'Delivery 12 Jun 2026 (L−6 weeks)',
    },
    {
      id: 'e6', subject: 'Spectrum F3', counterpart: 'Maritime monitoring buyer',
      status: 'booked', phase: 'G', lastEvent: 'SatelliteBooked', lastAt: '2 weeks ago',
      waiting: { side: 'none', what: 'Nothing outstanding', clock: 'window holds' },
      window: 'Q3 2026', delivery: 'Delivery 12 Jun 2026 (L−6 weeks)',
    },
  ],
};

// ─── the bell: one line per event on the other side, read-only ──────────────
export const ACTIVITY = {
  buy: [
    { event: 'QuoteSubmitted', line: 'Isar Aerospace sent quote v2 for Aurora-1 × Spectrum F3', at: '3h' },
    { event: 'WindowChanged', line: 'RFA ONE F6 moved to Q1 2028 — delivery date now 14 Nov 2027', at: '1d' },
    { event: 'NdaProposed', line: 'Match formed with RFA — NDA to sign', at: '1d' },
    { event: 'MatchFound', line: '3 listings match Aurora-2', at: '2d' },
    { event: 'ListingUpdated', line: 'Vega C VV29 capacity now 420 kg — you watch this listing', at: '5d' },
  ],
  sell: [
    { event: 'RequestCreated', line: 'Quotation request on Spectrum F3 from a connectivity constellation', at: '2h' },
    { event: 'RomAccepted', line: 'University research group accepted ROM v1 for Spectrum F5', at: '1d' },
    { event: 'MatchFound', line: '2 satellites match Spectrum F5', at: '2d' },
    { event: 'WatchCreated', line: '6 buyers now watch Spectrum F3', at: '3d' },
    { event: 'QuoteAccepted', line: 'Climate research institute accepted quote v1 for Spectrum F4', at: '4d' },
  ],
};

// ─── your own rows ──────────────────────────────────────────────────────────
export const MY_SATELLITES = [
  { name: 'Aurora-1', meta: 'Boreal · SSO 520 km · 68 kg · Q3 2026', status: 'Published', alt: 520, inc: 97.45, window: 'Q3 2026', mass: 68 },
  { name: 'Aurora-2', meta: 'Boreal · SSO 520 km · 68 kg · Q3 2026', status: 'Published', alt: 520, inc: 97.45, window: 'Q3 2026', mass: 68 },
  { name: 'Aurora-T', meta: 'Boreal · SSO 550 km · 12 kg · Q1 2027', status: 'Draft', alt: 550, inc: 97.6, window: 'Q1 2027', mass: 12 },
];

export const MY_LISTINGS = [
  { name: 'Spectrum F3', meta: 'SSO 520 km · 180 kg spare · Q3 2026', status: 'Published', alt: 520, inc: 97.5, window: 'Q3 2026', spareMass: 180 },
  { name: 'Spectrum F5', meta: 'SSO 540 km · 210 kg spare · Q4 2027', status: 'Published', alt: 540, inc: 97.6, window: 'Q4 2027', spareMass: 210 },
  { name: 'Spectrum F4', meta: 'LEO 450 km · 640 kg spare · Q1 2027', status: 'Draft', alt: 450, inc: 51.6, window: 'Q1 2027', spareMass: 640 },
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
      flexibility: ['Launch window', 'Ship date'],
      sellerNotes: 'Integration team is in Toulouse and can support a late slot swap with two weeks of notice. Happy to share the CAD under NDA.',
      activity: [
        { at: '2026-09-22T17:05', who: 'Rohit', text: 'Ticked the two-and-one configuration. Aurora-T can wait for its own slot if it buys us the 550 km.' },
        { at: '2026-09-18T11:20', who: 'Marta', text: 'Thermal review moved Aurora-T to the later window. Nothing changes for 1 and 2.' },
        { at: '2026-09-18T11:02', event: 'MissionUpdated', text: 'Aurora-T launch window: Q3 2026 - Q4 2026 to Q1 2027 - Q2 2027.' },
        { at: '2026-09-04T09:30', who: 'Rohit', text: 'Budget signed off at 18M. That is the ceiling, not a target.' },
        { at: '2026-08-27T14:12', event: 'MissionPublished', text: 'Published to sellers.' },
      ],
      // Possible ways to group these satellites onto launches. Shapes, not
      // purchases: no listing, no seller, no price. A configuration says "these
      // two ride together and this one goes alone", which is the thing matching
      // then goes looking for.
      //
      // Only the grouping is stored. Mass, envelope, orbit, window and delivery
      // are worked out from the satellites in each batch, because a batch has no
      // properties of its own — it has the properties its members give it, and
      // anything typed here by hand would be a second copy waiting to go stale.
      configurations: [
        {
          id: 'c1', from: 'Cosmo', added: true, letter: 'A',
          batches: [['Aurora-1', 'Aurora-2'], ['Aurora-T']],
        },
        {
          // Only reachable if something moves, and only suggested at all because
          // the mission says it can flex on the launch window. Without that
          // flexibility Cosmo would not raise it.
          id: 'c2', from: 'Cosmo',
          batches: [['Aurora-1', 'Aurora-2', 'Aurora-T']],
          needs: 'Launch window',
          // What would have to move, as fields rather than a sentence. The
          // sentence on the card is written from these, and so is the change
          // itself if you accept it, so the two can never drift apart.
          changes: [
            { satellite: 'Aurora-T', field: 'windowFrom', to: 'Q3 2026' },
            { satellite: 'Aurora-T', field: 'windowTo', to: 'Q4 2026' },
            { satellite: 'Aurora-T', field: 'altitude', to: '520' },
          ],
        },
        {
          id: 'c3', from: 'Cosmo',
          batches: [['Aurora-1'], ['Aurora-2'], ['Aurora-T']],
        },
      ],
      // Three satellites, two launches: a mission is not one flight. Your spec
      // allows one agreement to cover several satellites on one listing — a
      // launch batch — so the satellites group by the launch they are on.
      launches: [
        { id: 'b1', listing: 'Spectrum F3', seller: 'Isar Aerospace', window: 'Q3 2026', status: 'in procurement', reached: 2, detail: 'Quote v2 · 9 days of validity left', clock: 'Quote v2 expires', days: 9 },
        { id: 'b2', listing: 'RFA ONE F6', seller: 'RFA', window: 'Q1 2027', status: 'NDA pending', reached: 1, detail: 'NDA expires in 4 business days', clock: 'NDA expires', days: 4 },
      ],
      satellites: [
        {
          name: 'Aurora-1', launch: 'b1', form: 'Custom', mass: '68', orbit: 'SSO', deployerMass: '', dimensions: '700 × 700 × 700',
          inclination: '97.45', altitude: '520', ltan: '10:30',
          windowFrom: 'Q3 2026', windowTo: 'Q4 2026',
          propulsion: 'Cold gas', readiness: 'Integration & test', shipBy: 'Mar 2026',
          deployer: 'ESPA Grande port, Rocket Lab CSD',
        },
        {
          name: 'Aurora-2', launch: 'b1', form: 'Custom', mass: '68', orbit: 'SSO', deployerMass: '', dimensions: '700 × 700 × 700',
          inclination: '97.45', altitude: '520', ltan: '10:30',
          windowFrom: 'Q3 2026', windowTo: 'Q4 2026',
          propulsion: 'Cold gas', readiness: 'In build', shipBy: 'May 2026',
          deployer: 'ESPA Grande port, Rocket Lab CSD',
        },
        {
          name: 'Aurora-T', launch: 'b2', form: '12U', mass: '12', orbit: 'SSO', deployerMass: '12', dimensions: '226.3 × 226.3 × 366',
          inclination: '97.6', altitude: '550', ltan: '10:30',
          windowFrom: 'Q1 2027', windowTo: 'Q2 2027',
          propulsion: 'None', readiness: 'Concept / design', shipBy: 'Aug 2026',
          deployer: 'ISISPACE QuadPack',
        },
      ],
    },
    {
      id: 'm2', name: 'Lyra', objective: 'Ku-band connectivity demonstrator',
      status: 'Draft', budget: '$5,400,000', country: 'United Kingdom', exportControl: 'ITAR components',
      registration: 'United Kingdom', ride: 'Open to both',
      flexibility: [],
      activity: [
        { at: '2026-09-17T14:30', who: 'Rohit', text: 'Waiting on the mass budget before this goes out. 210 kg is the current estimate and it has moved twice.' },
        { at: '2026-09-05T10:05', who: 'Aoife', text: 'ITAR components confirmed on the payload side. Any seller we talk to needs a TAA in place first.' },
      ],
      launches: [],
      satellites: [
        {
          name: 'Lyra-1', form: 'Custom', mass: '210', orbit: 'LEO', deployerMass: '', dimensions: '1000 × 1000 × 1100',
          inclination: '51.6', altitude: '450', ltan: '—',
          windowFrom: 'Q4 2026', windowTo: 'Q4 2026',
          propulsion: 'Hydrazine', readiness: 'Concept / design', shipBy: 'Feb 2026',
          deployer: 'Not yet decided',
        },
      ],
    },
    {
      id: 'm3', name: 'Sagara', objective: 'Maritime AIS monitoring, polar coverage',
      status: 'Published', budget: '$8,700,000', country: 'Norway', exportControl: 'None',
      registration: 'Norway', ride: 'Dedicated',
      flexibility: ['Launch window', 'Altitude'],
      configurations: [
        {
          id: 'g1', from: 'Cosmo',
          batches: [['Sagara-1', 'Sagara-2']],
        },
        {
          id: 'g2', from: 'Cosmo',
          batches: [['Sagara-1'], ['Sagara-2']],
        },
      ],
      activity: [
        { at: '2026-09-19T16:45', who: 'Rohit', text: 'RFA came back matched. Holding off on the RFI until Sagara-2 has a firm ship date.' },
        { at: '2026-09-19T08:00', event: 'MatchFound', text: 'Matched with RFA ONE F4, RFA, Q4 2026.' },
        { at: '2026-09-11T13:25', who: 'Ingrid', text: 'Both spacecraft are on the same bus, so whatever we agree for one should carry to the other.' },
        { at: '2026-08-30T10:15', event: 'MissionPublished', text: 'Published to sellers.' },
      ],
      launches: [
        { id: 'b3', listing: 'RFA ONE F4', seller: 'RFA', window: 'Q4 2026', status: 'matched', reached: 0, detail: 'No request sent yet', clock: 'No request sent', days: null },
      ],
      satellites: [
        {
          name: 'Sagara-1', launch: 'b3', form: 'Custom', mass: '46', orbit: 'Polar LEO', deployerMass: '', dimensions: '600 × 600 × 600',
          inclination: '90.0', altitude: '600', ltan: '—',
          windowFrom: 'Q4 2026', windowTo: 'Q1 2027',
          propulsion: 'Green monopropellant', readiness: 'In build', shipBy: 'Apr 2026',
          deployer: 'Rocket Lab CSD',
        },
        {
          name: 'Sagara-2', form: 'Custom', mass: '46', orbit: 'Polar LEO', deployerMass: '', dimensions: '600 × 600 × 600',
          inclination: '90.0', altitude: '600', ltan: '—',
          windowFrom: 'Q4 2026', windowTo: 'Q1 2027',
          propulsion: 'Green monopropellant', readiness: 'In build', shipBy: 'Apr 2026',
          deployer: 'Rocket Lab CSD',
        },
      ],
    },
    {
      id: 'm4', name: 'Verdeña', objective: 'Methane plume detection over European gas infrastructure',
      status: 'Draft', budget: '$3,200,000', country: 'Spain',
      exportControl: 'Other', exportControlOther: 'Spanish dual-use licence, application pending',
      registration: 'Spain', ride: 'Rideshare',
      flexibility: ['Launch window', 'Altitude', 'LTAN'],
      configurations: [
        {
          id: 'v1', from: 'Cosmo',
          batches: [['Verde-1', 'Verde-2']],
        },
        {
          id: 'v2', from: 'Cosmo',
          batches: [['Verde-1'], ['Verde-2']],
        },
      ],
      activity: [
        { at: '2026-09-23T09:12', who: 'Rohit', text: 'Still a draft on purpose. Nothing goes out to sellers until the dual-use licence is back.' },
        { at: '2026-09-15T15:40', who: 'Pau', text: 'Licence application went in on the 14th. They quoted six to eight weeks.' },
        { at: '2026-09-15T15:38', event: 'MissionUpdated', text: 'Export control: None to Other. Can flex on: added LTAN.' },
        { at: '2026-09-02T11:55', who: 'Rohit', text: 'Payload team would rather have a morning LTAN, but they will live with anything between 09:30 and 11:00.' },
      ],
      launches: [],
      satellites: [
        {
          name: 'Verde-1', form: '6U', mass: '11', orbit: 'SSO', deployerMass: '',
          dimensions: '100 × 226.3 × 366',
          inclination: '97.8', altitude: '580', ltan: '09:30',
          windowFrom: 'Q2 2027', windowTo: 'Q4 2027',
          propulsion: 'None', readiness: 'Concept / design', shipBy: 'Nov 2026',
          deployer: 'Exolaunch EXOpod Nova',
        },
        {
          name: 'Verde-2', form: '6U', mass: '11', orbit: 'SSO', deployerMass: '',
          dimensions: '100 × 226.3 × 366',
          inclination: '97.8', altitude: '580', ltan: '09:30',
          windowFrom: 'Q2 2027', windowTo: 'Q4 2027',
          propulsion: 'None', readiness: 'Concept / design', shipBy: 'Nov 2026',
          deployer: 'Exolaunch EXOpod Nova',
        },
      ],
    },
    {
      id: 'm5', name: 'Tumbleweed', objective: 'Ionospheric scintillation mapping from a polar constellation',
      status: 'Published', budget: '$6,100,000', country: 'New Zealand', exportControl: 'None',
      registration: 'New Zealand', ride: 'Rideshare',
      flexibility: ['Inclination', 'Ship date'],
      sellerNotes: 'Both spacecraft must fly on the same launch. We can be flexible on inclination to make that work.',
      // Stated by the buyer, not suggested: "these two must fly together" is a
      // requirement, so it is already added and there is nothing for Cosmo to
      // propose alongside it. Splitting them is not an option to be weighed.
      configurations: [
        {
          id: 't1', added: true, letter: 'A',
          batches: [['Tumbleweed-1', 'Tumbleweed-2']],
        },
      ],
      activity: [
        { at: '2026-09-21T08:40', who: 'Rohit', text: 'LSA is with legal. Expect signature inside two weeks.' },
        { at: '2026-09-16T12:05', who: 'Tane', text: 'Isar asked again whether the two can be split. They cannot. Both have to be in the same plane on day one.' },
        { at: '2026-09-09T15:55', event: 'QuoteAccepted', text: 'Accepted Isar quote v1 for Spectrum F5.' },
        { at: '2026-08-25T09:20', event: 'NdaExecuted', text: 'NDA executed with Isar Aerospace.' },
        { at: '2026-08-11T13:40', event: 'MissionPublished', text: 'Published to sellers.' },
      ],
      launches: [
        { id: 'b4', listing: 'Spectrum F5', seller: 'Isar Aerospace', window: 'Q4 2027', status: 'in contract', reached: 3, detail: 'LSA out for signature', clock: 'Signature due', days: 12 },
      ],
      satellites: [
        {
          name: 'Tumbleweed-1', launch: 'b4', form: '12U', mass: '19', orbit: 'Polar LEO', deployerMass: '9',
          dimensions: '226.3 × 226.3 × 366',
          inclination: '87.9', altitude: '500', ltan: '—',
          windowFrom: 'Q4 2027', windowTo: 'Q1 2028',
          propulsion: 'Cold gas', readiness: 'In build', shipBy: 'Jun 2027',
          deployer: 'Rocket Lab CSD',
        },
        {
          name: 'Tumbleweed-2', launch: 'b4', form: '12U', mass: '19', orbit: 'Polar LEO', deployerMass: '9',
          dimensions: '226.3 × 226.3 × 366',
          inclination: '87.9', altitude: '500', ltan: '—',
          windowFrom: 'Q4 2027', windowTo: 'Q1 2028',
          propulsion: 'Cold gas', readiness: 'In build', shipBy: 'Jun 2027',
          deployer: 'Rocket Lab CSD',
        },
      ],
    },
    {
      id: 'm6', name: 'Halcyon', objective: 'Ka-band relay demonstrator for maritime users',
      status: 'Published', budget: '$12,400,000', country: 'United States', exportControl: 'ITAR components',
      registration: 'United States', ride: 'Dedicated',
      flexibility: [],
      sellerNotes: 'Spacecraft is already through environmental testing. We need the encapsulation date confirmed six weeks out so the shipping crate can be booked.',
      activity: [
        { at: '2026-09-20T10:30', who: 'Rohit', text: 'Delivery is 21 November. Working back from that, the crate has to leave here by the 7th.' },
        { at: '2026-09-08T14:00', who: 'Dana', text: 'SpaceX confirmed the encapsulation slot. No change to the launch date.' },
        { at: '2026-08-14T09:45', event: 'SatelliteBooked', text: 'Halcyon-1 manifested on Bandwagon-5, Q1 2027.' },
        { at: '2026-07-29T16:20', event: 'QuoteAccepted', text: 'Accepted SpaceX quote v2.' },
        { at: '2026-06-18T11:10', event: 'MissionPublished', text: 'Published to sellers.' },
      ],
      launches: [
        { id: 'b5', listing: 'Bandwagon-5', seller: 'SpaceX', window: 'Q1 2027', status: 'booked', reached: 4, detail: 'Manifested — delivery 21 Nov 2026', clock: 'Delivery due', days: 59 },
      ],
      satellites: [
        {
          name: 'Halcyon-1', launch: 'b5', form: 'Custom', mass: '340', orbit: 'LEO', deployerMass: '',
          dimensions: '1400 × 1200 × 1600',
          inclination: '51.6', altitude: '450', ltan: '—',
          windowFrom: 'Q1 2027', windowTo: 'Q1 2027',
          propulsion: 'Other', propulsionOther: 'HAN-based monopropellant',
          readiness: 'Integration & test', shipBy: 'Oct 2026',
          deployer: 'Custom / to be discussed', deployerOther: 'bespoke 24 in clamp band',
        },
      ],
    },
  ],
  sell: [
    {
      id: 'n1', name: 'Spectrum F3', objective: 'Andøya · SSO rideshare',
      status: 'Published', capacity: '180 kg spare of 1,200 kg', orbit: 'SSO 520 km · 97.5°',
      window: 'Q3 2026', lMinus: 'L−6 weeks', site: 'Andøya, Norway',
      deployers: 'ESPA Grande, CSD, 12U dispenser', terms: '£38k / kg',
    },
    {
      id: 'n2', name: 'Spectrum F5', objective: 'Andøya · SSO rideshare',
      status: 'Published', capacity: '210 kg spare of 1,200 kg', orbit: 'SSO 540 km · 97.6°',
      window: 'Q4 2027', lMinus: 'L−6 weeks', site: 'Andøya, Norway',
      deployers: 'ESPA Grande, CSD', terms: '£36k / kg',
    },
    {
      id: 'n3', name: 'Spectrum F4', objective: 'Cape Canaveral · mid-inclination LEO',
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
  listing: 'Spectrum F3',
  seller: 'Isar Aerospace',
  status: 'in procurement',
  window: 'Q3 2026',
  delivery: '3 Nov 2026',
  deliveryWas: '27 Oct 2026',
  waiting: { side: 'you', what: 'Quote v2 awaiting your decision', clock: '9 days of validity left' },
  summary: ['Matched', 'NDA', 'Procurement', 'Contract', 'Booked'],
  reached: 2,
  // Where this deal has got to along the path, keyed by step. The path itself
  // is PROCUREMENT_PATH below: every launch walks the same seventeen steps, and
  // only the progress differs, so the two are stored apart. Keeping a full copy
  // of the steps per deal meant a label could be edited in one place and not
  // the other.
  marks: {
    'Mission published': { at: '12 Mar 2026' },
    'Mission matched': { at: '14 Mar 2026', detail: '3 listings matched Aurora-1' },
    'Sign mutual NDA': { at: '2 Apr 2026', detail: 'Signed by both, channel opened' },
    'Draft RFI': { at: '5 Apr 2026' },
    'Send RFI': { at: '6 Apr 2026' },
    'ROM received': { at: '13 Apr 2026', detail: 'v1 · ballpark, not binding' },
    'Approve, reject or negotiate the ROM': { at: '16 Apr 2026', rounds: 'settled in 1 round' },
    'Draft RFQ': { at: '20 Apr 2026' },
    'Send RFQ': { at: '21 Apr 2026', detail: 'With ComplianceMatrixAttached' },
    'Quote received': { at: '8 May 2026', detail: 'v2 · supersedes v1' },
    'Approve, reject or negotiate the quote': {
      rounds: 'round 2 · 2 compliance rows contested',
      detail: 'Quote v2 valid for 9 more days',
    },
    'Launch booked': { detail: 'Exclusivity begins here' },
  },
};

// The whole procurement road, the same for every launch.
//
// Seventeen steps because someone about to commit millions should be able to
// see the entire path, not a progress bar. A step with no event is your own
// work and says so, since the other side cannot see it and should not appear
// to be waiting on it.
export const PROCUREMENT_PATH = [
  { label: 'Mission published', event: 'SatelliteReady', actor: 'You' },
  { label: 'Mission matched', event: 'MatchFound', actor: 'System' },
  { label: 'Sign mutual NDA', event: 'NdaExecuted', actor: 'Both' },
  { label: 'Draft RFI', actor: 'You', note: 'Your draft — the seller sees nothing until it is sent' },
  { label: 'Send RFI', event: 'RfiSubmitted', actor: 'You' },
  { label: 'ROM received', event: 'RomSubmitted', actor: 'Seller' },
  { label: 'Approve, reject or negotiate the ROM', event: 'RomAccepted', actor: 'You' },
  { label: 'Draft RFQ', actor: 'You', note: 'Your draft — includes the compliance matrix' },
  { label: 'Send RFQ', event: 'RfqSubmitted', actor: 'You' },
  { label: 'Quote received', event: 'QuoteSubmitted', actor: 'Seller' },
  { label: 'Approve, reject or negotiate the quote', event: 'TermProposed / TermAccepted', actor: 'You' },
  { label: 'Request the LSA and SOW', actor: 'You' },
  { label: 'LSA and SOW received', event: 'AgreementDrafted', actor: 'Seller' },
  { label: 'Approve, reject or negotiate the agreement', event: 'TermProposed / TermAccepted', actor: 'Both' },
  { label: 'LSA and SOW signature', event: 'AgreementSigned ×2 → AgreementExecuted', actor: 'Both' },
  { label: 'Billing', actor: '—', untracked: true, note: 'No events for this in v1 of the flow — it needs a model before it can be tracked' },
  { label: 'Launch booked', event: 'SatelliteBooked', actor: 'System' },
];

// Which step each of the five summary phases lands on, so a launch that only
// records "reached: 2" can still say where it is on the long path.
export const PHASE_STEP = [1, 2, 10, 14, 16];
