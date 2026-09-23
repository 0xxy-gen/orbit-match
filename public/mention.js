// Tagging a colleague in an activity entry.
//
// Two halves that have to agree: a picker that helps you write "@Marta", and a
// renderer that shows it as a tag afterwards. Both work off the same TEAM list,
// so a name is only ever a tag if it belongs to somebody real. Typing "@lunch"
// stays plain text rather than becoming a broken link to nobody.
//
// The picker is keyboard-first, because it appears while your hands are already
// on the keys: arrows move, Enter or Tab takes the highlighted name, Escape
// dismisses it and leaves what you typed alone.
import { TEAM } from './demo-data.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// The "@" that starts a tag has to be at a word boundary, so an email address
// does not open the picker halfway through typing it.
const TRIGGER = /(^|\s)@(\w*)$/;

export function mentioned(text) {
  const names = new Set(TEAM.map(person => person.name.toLowerCase()));
  const found = [];
  for (const match of String(text ?? '').matchAll(/(^|\s)@(\w+)/g)) {
    if (names.has(match[2].toLowerCase())) found.push(match[2]);
  }
  return [...new Set(found)];
}

// Renders text with the real tags marked up and everything else left as text.
// Built with createTextNode rather than innerHTML: an activity entry is typed by
// a person, and typed text must never be parsed as markup.
export function withMentions(text) {
  const frag = document.createDocumentFragment();
  const names = new Map(TEAM.map(person => [person.name.toLowerCase(), person]));
  let at = 0;

  for (const match of String(text ?? '').matchAll(/(^|\s)@(\w+)/g)) {
    const person = names.get(match[2].toLowerCase());
    if (!person) continue;
    const start = match.index + match[1].length;
    if (start > at) frag.append(document.createTextNode(text.slice(at, start)));
    const tag = el('span', 'mention', `@${person.name}`);
    tag.title = `${person.name} — ${person.role}`;
    frag.append(tag);
    at = start + match[2].length + 1;
  }
  if (at < String(text ?? '').length) frag.append(document.createTextNode(text.slice(at)));
  return frag;
}

// Attaches the picker to one textarea.
export function mentionPicker(area) {
  const menu = el('div', 'mention-menu');
  menu.hidden = true;
  menu.setAttribute('role', 'listbox');
  document.body.append(menu);

  let matches = [];
  let at = 0;

  const close = () => {
    menu.hidden = true;
    matches = [];
  };

  function place() {
    // Under the field rather than at the caret: measuring the caret means
    // mirroring the textarea in a hidden div, and being 200px out is worse than
    // being consistently in one place.
    const box = area.getBoundingClientRect();
    menu.style.left = `${Math.round(box.left)}px`;
    menu.style.top = `${Math.round(box.bottom + 4 + scrollY)}px`;
    menu.style.width = `${Math.round(Math.min(280, box.width))}px`;
  }

  function paint() {
    menu.replaceChildren();
    matches.forEach((person, index) => {
      const item = el('button', `mention-item${index === at ? ' on' : ''}`);
      item.type = 'button';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(index === at));
      item.append(el('span', 'mention-name', person.name), el('span', 'mention-role', person.role));
      // mousedown, not click: the field must not lose focus before we insert
      item.addEventListener('mousedown', event => {
        event.preventDefault();
        take(person);
      });
      menu.append(item);
    });
  }

  function take(person) {
    const upto = area.value.slice(0, area.selectionStart);
    const rest = area.value.slice(area.selectionStart);
    const start = upto.search(/@\w*$/);
    area.value = `${upto.slice(0, start)}@${person.name} ${rest}`;
    const caret = start + person.name.length + 2;
    area.setSelectionRange(caret, caret);
    close();
    area.focus();
    area.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function look() {
    const upto = area.value.slice(0, area.selectionStart);
    const hit = upto.match(TRIGGER);
    if (!hit) return close();

    const typed = hit[2].toLowerCase();
    matches = TEAM.filter(person => person.name.toLowerCase().startsWith(typed));
    if (!matches.length) return close();

    at = 0;
    menu.hidden = false;
    place();
    paint();
  }

  area.addEventListener('input', look);
  area.addEventListener('blur', () => setTimeout(close, 120));
  area.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      at = (at + (event.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length;
      paint();
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      take(matches[at]);
    } else if (event.key === 'Escape') {
      // dismiss the menu without touching what has been typed
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });

  return close;
}
