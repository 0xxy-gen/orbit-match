// Marks the section you are reading in the contents rail.
const items = [...document.querySelectorAll('.toc li')].map(item => ({
  item,
  section: document.querySelector(item.querySelector('a').getAttribute('href')),
}));

// The last section whose heading has passed the top of the viewport wins, so a
// section stays marked while you read it, not only while its top edge shows.
function sync() {
  const read = items.filter(({ section }) => section.getBoundingClientRect().top <= 120);
  const active = (read.at(-1) ?? items[0]).item;
  for (const { item } of items) item.classList.toggle('active', item === active);
}

document.addEventListener('scroll', sync, { passive: true });
sync();
