// Cosmo — a slide-over assistant, not a permanent column.
//
// Summoned (nav button, ⌘K) rather than always open: a chat box sitting there
// with nothing in it implies the product does not know what you need. The
// useful work is contextual — openAssistant('Why doesn’t Spectrum F3 fit?') from a
// listing, a quote, a deal.
//
// Named Cosmo, roled "Mission assistant" rather than "Mission manager": mission
// manager is the customer's own job title, and an assistant should not wear it.
// The AI tag is deliberate — nobody should have to wonder what they are
// talking to.
//
// NOT CONNECTED. Nothing here talks to a model, and it does not invent an
// answer: an assistant that appears to make up a match, a price or a date is
// worse than none. Every reply has a source line reserved, because when this is
// wired up each answer should name the events it read.

const STORE_OPEN = 'orbitmatch:assistant';
const NAME = 'Cosmo';
const ROLE = 'Mission assistant';

const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* private window */ } };

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// What Cosmo is actually for, in this domain.
const SUGGESTIONS = {
  buy: [
    'What changed since I was last here?',
    'Why doesn’t this listing fit my satellites?',
    'Draft the RFI for Aurora-1',
    'What happens after I accept a ROM?',
  ],
  sell: [
    'What changed since I was last here?',
    'Which satellites fit Spectrum F3 and why?',
    'Summarise this quote against the last version',
    'What happens if I decline a request?',
  ],
};

let panel;
let thread;
let input;
let chips;
let sendButton;
let opener;

// Two marks, each drawn for its size.
//
// The star is the glyph: it works at 13px in the nav button and beside every
// message, and it is the shorthand people now read as "AI".
export const STAR = size => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">
      <path d="M10.6 2.2c.62 5.9 2.9 8.3 8.4 9.3-5.5 1-7.78 3.4-8.4 9.3-.62-5.9-2.9-8.3-8.4-9.3 5.5-1 7.78-3.4 8.4-9.3Z" fill="currentColor"/>
      <path d="M19.4 14.2c.22 2.05.98 2.88 2.9 3.2-1.92.32-2.68 1.15-2.9 3.2-.22-2.05-.98-2.88-2.9-3.2 1.92-.32 2.68-1.15 2.9-3.2Z" fill="currentColor" opacity=".62"/>
    </svg>`;

// The portrait: a solid helmet with the dog cut out of it in negative space —
// one shape, one colour, no rendering of fur or glass. That style survives being
// shrunk, printed, or put on a dark background, which a detailed drawing does
// not. Laika is the most famous passenger in launch history, so a space dog is
// the right kind of joke: warm, and about this industry.
export const PORTRAIT = `
    <svg viewBox="0 0 48 48" width="38" height="38" aria-hidden="true">
      <g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <!-- the dome is cut off where it meets the base, not a circle resting on it -->
        <path d="M18 35.6a14.6 14.6 0 1 1 12 0"/>
        <path d="M24 14.6c4.3 0 7.4 3 7.4 7.3v2.6c0 4.3-3.1 7.3-7.4 7.3s-7.4-3-7.4-7.3v-2.6c0-4.3 3.1-7.3 7.4-7.3Z"/>
        <path d="M21.6 27.6c.8.9 1.7.9 2.4.1"/>
        <path d="M24 27.7c.7.8 1.6.8 2.4-.1"/>
        <path d="M24 24.9v1.8"/>
      </g>

      <!-- the base of the helmet, solid, with its fittings knocked out -->
      <mask id="cosmo-base">
        <rect x="11" y="34" width="26" height="9" fill="#fff"/>
        <circle cx="18.6" cy="38.1" r="1.4" fill="#000"/>
        <rect x="21.8" y="37.1" width="6.2" height="2.1" rx="1.05" fill="#000"/>
      </mask>
      <rect x="12.6" y="35.2" width="22.8" height="5.8" rx="2.7" fill="currentColor" mask="url(#cosmo-base)"/>

      <!-- ears, eyes and nose -->
      <ellipse cx="14.9" cy="22.4" rx="2.6" ry="4.8" transform="rotate(16 14.9 22.4)" fill="currentColor"/>
      <ellipse cx="33.1" cy="22.4" rx="2.6" ry="4.8" transform="rotate(-16 33.1 22.4)" fill="currentColor"/>
      <circle cx="21" cy="21.6" r="1.55" fill="currentColor"/>
      <circle cx="27" cy="21.6" r="1.55" fill="currentColor"/>
      <path d="M22.5 23.3h3l-1.5 1.7Z" fill="currentColor"/>
    </svg>`;

const badge = (large = false) => {
  const mark = el('span', large ? 'cosmo-portrait' : 'cosmo-mark');
  mark.innerHTML = large ? PORTRAIT : STAR(13);
  return mark;
};

export function assistant(view = 'buy') {
  if (panel) return;

  panel = el('aside', 'ask');
  panel.id = 'ask';
  panel.hidden = true;
  panel.setAttribute('aria-label', `${NAME}, ${ROLE}`);

  const head = el('div', 'ask-head');
  const who = el('div', 'ask-who');
  const titles = el('div', 'ask-titles');
  const nameRow = el('div', 'ask-name-row');
  nameRow.append(el('h2', 'ask-title', NAME), el('span', 'ask-ai', 'AI'));
  titles.append(nameRow, el('p', 'ask-role', ROLE));
  who.append(badge(true), titles);

  const close = el('button', 'icon-btn', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', () => toggleAssistant(false));
  head.append(who, close);

  thread = el('div', 'ask-thread');
  thread.setAttribute('role', 'log');
  thread.setAttribute('aria-live', 'polite');

  chips = el('div', 'ask-chips');
  for (const prompt of SUGGESTIONS[view] ?? SUGGESTIONS.buy) {
    const chip = el('button', 'ask-chip', prompt);
    chip.type = 'button';
    chip.addEventListener('click', () => send(prompt));
    chips.append(chip);
  }

  const form = el('form', 'ask-form');
  input = el('textarea', 'ask-input');
  input.rows = 1;
  input.placeholder = `Ask ${NAME} about a listing, a deal, a date…`;
  input.setAttribute('aria-label', `Ask ${NAME}`);
  sendButton = el('button', 'ask-send');
  sendButton.type = 'submit';
  sendButton.disabled = true;
  sendButton.setAttribute('aria-label', 'Send');
  sendButton.innerHTML = `
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M10 16V4.5M5 9.5 10 4l5 5.5"/>
    </svg>`;

  // grows with the question; Enter sends, Shift+Enter starts a line
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
    sendButton.disabled = !input.value.trim();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (input.value.trim()) send(input.value.trim());
    }
  });

  form.append(input, sendButton);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (input.value.trim()) send(input.value.trim());
  });

  panel.append(head, thread, chips, form);
  document.body.append(panel);

  greet();
  if (read(STORE_OPEN) === 'open') toggleAssistant(true);

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      toggleAssistant(panel.hidden);
    }
    if (event.key === 'Escape' && !panel.hidden) toggleAssistant(false);
  });

  for (const button of document.querySelectorAll('[data-ask]')) {
    button.addEventListener('click', () => openAssistant(button.dataset.ask));
  }
}

function message(from, lines) {
  const wrap = el('div', `ask-msg from-${from}`);
  if (from === 'cosmo') wrap.append(badge());
  const body = el('div', 'ask-body');
  body.append(el('p', 'ask-text', lines.text));
  if (lines.source) body.append(el('p', 'ask-source', lines.source));
  wrap.append(body);
  thread.append(wrap);
  thread.scrollTop = thread.scrollHeight;
}

function greet() {
  message('cosmo', {
    text: `I read what your account has stored — matches, requests, quotes, windows — and answer from that. I never invent a match, a price or a date.`,
    source: 'Not connected in this prototype.',
  });
}

function send(text) {
  input.value = '';
  input.style.height = 'auto';
  sendButton.disabled = true;
  chips.hidden = true;   // suggestions are for the empty state only

  message('me', { text });
  message('cosmo', {
    text: `I’m not connected in this prototype, so there’s no answer to give.`,
    source: 'When I am, the answer appears here with the events it rests on — MatchFound, ListingUpdated, QuoteSubmitted — so you can check my working.',
  });
}

export function toggleAssistant(open) {
  if (!panel) return;
  opener = opener ?? document.getElementById('ask-button');
  panel.hidden = !open;
  document.body.classList.toggle('asking', open);
  write(STORE_OPEN, open ? 'open' : 'closed');
  opener?.setAttribute('aria-expanded', String(open));
  if (open) input.focus();
  else opener?.focus();
}

// Contextual entry: open with the question already asked, from a listing or a deal.
export function openAssistant(prompt) {
  toggleAssistant(true);
  if (prompt) send(prompt);
}
