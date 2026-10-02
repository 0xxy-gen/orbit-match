// Messages — where the other side talks back.
//
// Why this page exists at all, when the Matches tab already holds the decision:
// a proposal needs the comparison table beside it, and a reply does not. Once
// Isar has answered, there is nothing to compare — there is a thread, and a
// thread is correspondence. Correspondence has always lived in a list of
// conversations, and it should here too.
//
// One thread per deal, never per company. Isar may be carrying Aurora-1 on
// Spectrum F3 and quoting Aurora-T on Spectrum F5 at the same time. Those are
// different negotiations with different numbers, and merging them into one
// conversation with "Isar Aerospace" is exactly how a price from one gets
// quoted against the other.
//
// NOTHING IS SENT. There is no outbox in this prototype, and no mail is
// forwarded anywhere. The email panel is the shape of the setting, not the
// setting.
import { THREADS } from './demo-data.js';
import { assistant, toggleAssistant, STAR } from './assistant.js';
import { accountMenu, currentUser } from './account-menu.js';
import { themeToggle } from './theme.js';

const STORE_VIEW = 'orbitmatch:view';
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };

const canvas = document.getElementById('canvas');

let view = new URLSearchParams(location.search).get('view') ?? read(STORE_VIEW) ?? 'buy';
if (view !== 'buy' && view !== 'sell') view = 'buy';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

let noteTimer;
function say(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { toast.hidden = true; }, 4000);
}

const threads = () => THREADS[view] ?? [];

let openId = new URLSearchParams(location.search).get('thread') ?? threads()[0]?.id ?? null;
let syncing = false;   // the email panel, open or not

// Front end only, and it says so. A real version of this is a mail domain and
// an inbound route; none of that exists here, so the panel stores its answers
// in the session and forgets them.
const email = {
  on: false,
  when: 'waiting',   // 'all' | 'waiting'
};

// ── the list ────────────────────────────────────────────────────────────────

const last = thread => thread.messages[thread.messages.length - 1];

// "Isar Aerospace" is who you are talking to; "Spectrum F3 · Boreal" is what
// about. Both are needed, because the same seller can be two threads.
function threadRow(thread) {
  const row = el('button', `thread${thread.id === openId ? ' on' : ''}`);
  row.type = 'button';
  row.addEventListener('click', () => {
    openId = thread.id;
    thread.unread = 0;
    const url = new URL(location.href);
    url.searchParams.set('thread', thread.id);
    history.replaceState(null, '', url);
    render();
  });

  const top = el('div', 'thread-top');
  top.append(el('span', 'thread-who', thread.seller));
  if (thread.unread) top.append(el('span', 'thread-dot'));
  top.append(el('span', 'thread-when', last(thread).at.split(',')[0]));
  row.append(top);

  row.append(el('p', 'thread-about', `${thread.listing} · ${thread.mission}`));
  row.append(el('p', 'thread-snip', last(thread).text));

  const foot = el('div', 'thread-foot');
  foot.append(el('span', `stage-pill ${thread.stage.replace(/\s+/g, '-').toLowerCase()}`, thread.stage));
  if (last(thread).from !== 'you') foot.append(el('span', 'thread-turn', 'Your turn'));
  row.append(foot);

  return row;
}

// ── the conversation ────────────────────────────────────────────────────────

function bubble(message) {
  const wrap = el('div', `note from-${message.from}`);

  const head = el('div', 'note-head');
  if (message.from === 'cosmo') {
    const mark = el('span', 'note-mark');
    mark.innerHTML = STAR(12);
    head.append(mark, el('span', 'note-who', 'Cosmo'));
  } else {
    head.append(el('span', 'note-who', message.from === 'you' ? 'You' : 'Them'));
  }
  head.append(el('span', 'note-when', message.at));
  wrap.append(head);

  wrap.append(el('p', 'note-text', message.text));

  // A message Cosmo wrote says so for ever, not just on the day it went. Six
  // months later, reading back, "who actually promised this" is the question.
  if (message.sent) wrap.append(el('p', 'note-sent', message.sent));

  return wrap;
}

function conversation(thread) {
  const pane = el('section', 'convo');

  const head = el('div', 'convo-head');
  const titles = el('div');
  titles.append(el('h2', 'convo-who', thread.who.name));
  titles.append(el('p', 'convo-sub',
    `${thread.who.role} · ${thread.seller} — about ${thread.listing} on ${thread.mission}`));
  head.append(titles);

  // Back to where the decision is made. The thread is the talking; the table is
  // the deciding, and the two should never be more than one click apart.
  const toTable = el('a', 'ghost small', 'Open in Matches');
  toTable.href = `/mission.html?id=m1&view=${view}&tab=matches`;
  head.append(toTable);
  pane.append(head);

  const body = el('div', 'convo-body');
  for (const message of thread.messages) body.append(bubble(message));
  pane.append(body);

  const form = el('form', 'convo-form');
  const box = el('textarea', 'convo-input');
  box.rows = 3;
  box.placeholder = `Reply to ${thread.who.name.split(' ')[0]}…`;
  box.setAttribute('aria-label', `Reply to ${thread.who.name}`);

  const tools = el('div', 'convo-tools');
  const send = el('button', 'primary small', 'Send');
  send.type = 'submit';
  tools.append(send);
  tools.append(el('span', 'convo-quiet',
    email.on ? 'A copy goes to your email.' : 'Nothing leaves this prototype.'));

  form.append(box, tools);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!box.value.trim()) return;
    box.value = '';
    say('Nothing was sent. This prototype has no outbox.');
  });
  pane.append(form);

  return pane;
}

// ── email ───────────────────────────────────────────────────────────────────

// Sync, not export.
//
// The useful version of this is not "email me a copy" — it is that a reply typed
// in a mail client lands back in the thread, so nobody has to remember which
// window a conversation lives in. That is the whole feature, and it is one
// sentence, so it is said in one sentence.
function emailPanel() {
  const box = el('section', 'sync');

  box.append(el('h2', 'sync-title', 'Send these threads to your email'));
  box.append(el('p', 'sync-note',
    'Messages arrive in your inbox, and a reply sent from there lands back in the thread. '
    + 'Nobody has to remember which window a conversation lives in.'));

  const me = currentUser();
  const line = el('label', 'sync-switch');
  const toggle = el('input');
  toggle.type = 'checkbox';
  toggle.checked = email.on;
  toggle.addEventListener('change', () => { email.on = toggle.checked; render(); });
  line.append(toggle, el('span', null, `Forward to ${me.email}`));
  box.append(line);

  // Only shown once it is on: choices for a thing that is off are noise.
  if (email.on) {
    const choices = el('div', 'sync-choices');
    for (const [key, label, why] of [
      ['waiting', 'Only when it is your turn', 'a reply you owe, or a clock running'],
      ['all', 'Every message', 'including your own, for your records'],
    ]) {
      const pick = el('label', 'sync-choice');
      const radio = el('input');
      radio.type = 'radio';
      radio.name = 'sync-when';
      radio.checked = email.when === key;
      radio.addEventListener('change', () => { email.when = key; render(); });
      const said = el('span', 'sync-choice-said');
      said.append(el('span', 'sync-choice-what', label), el('span', 'sync-choice-why', why));
      pick.append(radio, said);
      choices.append(pick);
    }
    box.append(choices);

    box.append(el('p', 'sync-reply',
      'Replies come back from reply@mail.orbitmatch.app — keep the subject line and the thread stays joined up.'));
  }

  box.append(el('p', 'sync-demo',
    'DEMO ONLY. Nothing is forwarded, no address is registered, and this setting is forgotten when you reload.'));

  return box;
}

// ── page ────────────────────────────────────────────────────────────────────

function render() {
  canvas.dataset.view = view;
  canvas.replaceChildren();

  const all = threads();

  const head = el('header', 'page-head');
  const titles = el('div');
  titles.append(el('h1', null, 'Messages'));
  const unread = all.reduce((total, thread) => total + (thread.unread ? 1 : 0), 0);
  titles.append(el('p', 'page-sub', unread
    ? `${unread} of ${all.length} need a reply.`
    : 'Nothing is waiting on you.'));
  head.append(titles);

  const sync = el('button', `ghost small${syncing ? ' on' : ''}`, syncing ? 'Close' : 'Sync to email');
  sync.type = 'button';
  sync.addEventListener('click', () => { syncing = !syncing; render(); });
  head.append(sync);
  canvas.append(head);

  if (syncing) canvas.append(emailPanel());

  if (!all.length) {
    canvas.append(el('p', 'empty',
      'No conversations yet. Asking a seller from a mission’s Matches tab starts one.'));
    return;
  }

  // Two panes, because a thread list that replaces itself with a conversation
  // loses the one thing a list is for: seeing that three other people are also
  // waiting on you.
  const split = el('div', 'inbox');

  const list = el('div', 'thread-list');
  for (const thread of all) list.append(threadRow(thread));
  split.append(list);

  const open = all.find(thread => thread.id === openId) ?? all[0];
  split.append(conversation(open));

  canvas.append(split);

  // the pip in the bar is this number, so it is this number
  const pip = document.getElementById('message-count');
  if (pip) {
    pip.textContent = String(unread);
    pip.hidden = !unread;
  }
}

accountMenu(view);
themeToggle();
assistant(view);
document.getElementById('ask-button')?.addEventListener('click', () => toggleAssistant());
render();
