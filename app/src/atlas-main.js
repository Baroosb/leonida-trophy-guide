// atlas-main.js — wiring for the Leonida Platinum Atlas: loads the trophy
// data, holds the tracker state, and connects the toolbar, checklist,
// detail panel and roadmap. Runs entirely offline from app/'s own files.
import { loadState, saveState, toggleEarned, exportProgress, importProgress } from './atlas-store.js';
import {
  renderProgress, renderChips, renderList, renderDetail, renderRoadmap, renderSourceFooter,
} from './atlas-view.js';

const doc = await (await fetch('data/trophies.json')).json();
const state = loadState();
const view = { kind: 'all', query: '', selectedId: 28, tab: 'tracker' };
const root = document;

const handlers = {
  onToggle(id) {
    toggleEarned(state, id);
    renderAll();
  },
  onSelect(id) {
    view.selectedId = id;
    renderAll();
  },
};

function selectedTrophy() {
  return doc.trophies.find((t) => t.id === view.selectedId) ?? null;
}

function renderAll() {
  renderProgress(doc, state, root);
  renderChips(doc, view.kind, (kind) => { view.kind = kind; renderAll(); }, root);
  renderList(doc, state, view, handlers, root);
  renderDetail(doc, state, selectedTrophy(), handlers, root);
  renderRoadmap(doc, state, root);
}

root.querySelector('#search').addEventListener('input', (ev) => {
  view.query = ev.target.value;
  renderAll();
});

const spoilerBox = root.querySelector('#spoiler');
spoilerBox.checked = state.spoiler;
spoilerBox.addEventListener('change', () => {
  state.spoiler = spoilerBox.checked;
  saveState(state);
  renderAll();
});

root.querySelector('#export').addEventListener('click', () => exportProgress(state));
root.querySelector('#import').addEventListener('change', async (ev) => {
  const file = ev.target.files?.[0];
  if (!file) return;
  try {
    importProgress(state, doc.trophies, await file.text());
  } catch {
    alert('That file could not be read as atlas progress.');
  }
  ev.target.value = '';
  renderAll();
});

const trackerView = root.querySelector('#tracker-view');
const roadmapView = root.querySelector('#roadmap-view');
function showTab(tab) {
  view.tab = tab;
  trackerView.hidden = tab !== 'tracker';
  roadmapView.hidden = tab !== 'roadmap';
  root.querySelector('#tab-tracker').classList.toggle('active', tab === 'tracker');
  root.querySelector('#tab-roadmap').classList.toggle('active', tab === 'roadmap');
}
root.querySelector('#tab-tracker').addEventListener('click', () => showTab('tracker'));
root.querySelector('#tab-roadmap').addEventListener('click', () => showTab('roadmap'));

// Deep links used by the maker's screenshots and handy for readers:
// ?view=roadmap, ?kind=missable, ?trophy=28, ?spoiler=1
const params = new URLSearchParams(location.search);
if (params.get('view') === 'roadmap') showTab('roadmap');
if (params.get('kind')) view.kind = params.get('kind');
if (params.get('trophy')) view.selectedId = Number(params.get('trophy')) || view.selectedId;
if (params.get('spoiler') === '1') {
  state.spoiler = true;
  spoilerBox.checked = true;
}

renderSourceFooter(doc, root);
renderAll();
