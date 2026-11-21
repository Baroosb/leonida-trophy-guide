// atlas-view.js — rendering for the Leonida Platinum Atlas: header progress,
// filter chips, the trophy checklist, the trophy detail panel, the roadmap
// and the sources footer. Pure DOM building from the loaded data + state.
export const KIND_LABELS = {
  all: 'All',
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
  misc: 'Misc & moments',
};
export const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function isMasked(trophy, state) {
  return state.spoiler && trophy.kind === 'story' && !state.earned.has(trophy.id);
}

export function renderProgress(doc, state, root) {
  const total = doc.trophies.length;
  const earned = state.earned.size;
  root.querySelector('#earned-count').textContent = String(earned);
  root.querySelector('#progress-bar').style.width = `${Math.round((earned / total) * 100)}%`;
  root.querySelector('#progress-pct').textContent =
    earned === total ? 'Platinum earned — Vice Got a Price!' : `${Math.round((earned / total) * 100)}% to the platinum`;
  const counts = root.querySelector('#grade-counts');
  counts.replaceChildren();
  for (const grade of GRADE_ORDER) {
    const inGrade = doc.trophies.filter((t) => t.grade === grade);
    const got = inGrade.filter((t) => state.earned.has(t.id)).length;
    const li = el('li');
    li.append(el('b', '', `${got}/${inGrade.length}`), document.createTextNode(` ${grade}`));
    counts.append(li);
  }
}

export function renderChips(doc, activeKind, onPick, root) {
  const counts = {
    all: doc.trophies.length,
    story: doc.trophies.filter((t) => t.kind === 'story').length,
    missable: doc.trophies.filter((t) => t.missable).length,
    collectibles: doc.trophies.filter((t) => t.kind === 'collectibles').length,
    activities: doc.trophies.filter((t) => t.kind === 'activities').length,
    online: doc.trophies.filter((t) => t.kind === 'online').length,
    misc: doc.trophies.filter((t) => t.kind === 'misc').length,
  };
  const wrap = root.querySelector('#kind-chips');
  wrap.replaceChildren();
  for (const kind of Object.keys(KIND_LABELS)) {
    const chip = el('button', `chip${kind === activeKind ? ' active' : ''}`);
    chip.type = 'button';
    chip.append(document.createTextNode(KIND_LABELS[kind]), el('span', 'n', ` ${counts[kind]}`));
    chip.addEventListener('click', () => onPick(kind));
    wrap.append(chip);
  }
}

export function trophyMatches(trophy, kind, query) {
  if (kind === 'missable' && !trophy.missable) return false;
  if (kind !== 'all' && kind !== 'missable' && trophy.kind !== kind) return false;
  if (query) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!hay.includes(query.toLowerCase())) return false;
  }
  return true;
}

export function renderList(doc, state, view, handlers, root) {
  const list = root.querySelector('#trophy-list');
  const meta = root.querySelector('#list-meta');
  list.replaceChildren();
  const shown = doc.trophies.filter((t) => trophyMatches(t, view.kind, view.query));
  meta.textContent =
    view.kind === 'online'
      ? 'Online trophies: none. All 55 trophies are offline and single-player (official list; PowerPyx roadmap).'
      : `Showing ${shown.length} of ${doc.trophies.length} trophies · ${state.earned.size} earned · click a trophy for its guide and sources`;
  if (!shown.length) {
    list.append(el('li', 'empty-note', 'No trophies match this filter.'));
    return;
  }
  for (const trophy of shown) {
    const masked = isMasked(trophy, state);
    const row = el('button', `trophy-row${state.earned.has(trophy.id) ? ' earned' : ''}${view.selectedId === trophy.id ? ' selected' : ''}`);
    row.type = 'button';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.earned.has(trophy.id);
    box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
    box.addEventListener('click', (ev) => ev.stopPropagation());
    box.addEventListener('change', () => handlers.onToggle(trophy.id));
    const main = el('span', 'trophy-main');
    main.append(
      el('span', 'trophy-name', masked ? 'Hidden story trophy' : trophy.name),
      el('span', 'trophy-desc', masked ? 'Name and description hidden by the spoiler shield until earned.' : trophy.description),
    );
    main.style.display = 'block';
    const tags = el('span', 'trophy-tags');
    tags.append(el('span', `tag grade-${trophy.grade}`, trophy.grade));
    if (trophy.missable) tags.append(el('span', 'tag missable', '⚠ missable'));
    if (masked) tags.append(el('span', 'tag spoilered', 'spoiler shielded'));
    row.append(box, main, tags);
    row.addEventListener('click', () => handlers.onSelect(trophy.id));
    const li = el('li');
    li.append(row);
    list.append(li);
  }
}

function sourceListItems(doc, trophy) {
  const ul = document.createElement('ul');
  for (const key of trophy.sources) {
    const src = doc.sources[key];
    if (!src) continue;
    const li = document.createElement('li');
    if (src.url) {
      const a = document.createElement('a');
      a.href = src.url;
      a.textContent = src.label;
      a.target = '_blank';
      a.rel = 'noreferrer';
      li.append(a);
    } else {
      li.textContent = src.label;
    }
    ul.append(li);
  }
  return ul;
}

export function renderDetail(doc, state, trophy, handlers, root) {
  const pane = root.querySelector('#detail-pane');
  pane.replaceChildren();
  if (!trophy) {
    pane.append(el('p', 'detail-empty', 'Select a trophy on the left to read its guide, its official description and its sources.'));
    return;
  }
  const masked = isMasked(trophy, state);
  pane.append(el('p', 'kicker', `Trophy ${trophy.id} of 55 · Roadmap phase ${trophy.stage}`));
  pane.append(el('h2', '', masked ? 'Hidden story trophy' : trophy.name));
  const meta = el('div', 'detail-meta');
  meta.append(
    el('span', `tag grade-${trophy.grade}`, trophy.grade),
    el('span', 'tag', KIND_LABELS[trophy.kind] ?? trophy.kind),
  );
  if (trophy.hidden) meta.append(el('span', 'tag', 'hidden on PSN until earned'));
  if (trophy.missable) meta.append(el('span', 'tag missable', '⚠ missable'));
  pane.append(meta);
  const official = el('div', 'official');
  official.append(
    el('small', '', 'Official description — as PlayStation publishes it'),
    document.createTextNode(masked ? 'Hidden by the spoiler shield until this trophy is earned.' : trophy.description),
  );
  pane.append(official);
  if (trophy.missable && trophy.missableNote) {
    pane.append(el('div', 'missable-box', `⚠ Missable — ${trophy.missableNote}`));
  }
  pane.append(el('h3', '', 'Guide'));
  pane.append(el('p', 'guide-text', trophy.guide));
  const sources = el('div', 'sources');
  sources.append(el('h3', '', 'Sources for this guide'));
  sources.append(sourceListItems(doc, trophy));
  pane.append(sources);
  const check = el('label', 'detail-check');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = state.earned.has(trophy.id);
  box.addEventListener('change', () => handlers.onToggle(trophy.id));
  check.append(box, document.createTextNode(' I have earned this trophy'));
  pane.append(check);
}

export function renderRoadmap(doc, state, root) {
  const list = root.querySelector('#phase-list');
  list.replaceChildren();
  for (const phase of doc.roadmap) {
    const card = el('li', 'phase-card');
    const h = el('h3');
    h.append(el('span', 'phase-no', `Phase ${phase.phase}`), document.createTextNode(phase.title));
    card.append(h, el('p', 'phase-time', phase.time), el('p', '', phase.text));
    const chips = el('div', 'phase-trophies');
    for (const trophy of doc.trophies.filter((t) => t.stage === phase.phase)) {
      chips.append(el('span', `tag${state.earned.has(trophy.id) ? ' done' : ''}`, trophy.name));
    }
    card.append(chips);
    for (const warning of phase.watch ?? []) {
      card.append(el('p', 'phase-watch', `⚠ Watch out: ${warning}`));
    }
    list.append(card);
  }
}

export function renderSourceFooter(doc, root) {
  const ul = root.querySelector('#source-list');
  ul.replaceChildren();
  for (const src of Object.values(doc.sources)) {
    const li = document.createElement('li');
    if (src.url) {
      const a = document.createElement('a');
      a.href = src.url;
      a.textContent = src.label;
      a.target = '_blank';
      a.rel = 'noreferrer';
      li.append(a);
    } else {
      li.textContent = src.label;
    }
    ul.append(li);
  }
}
