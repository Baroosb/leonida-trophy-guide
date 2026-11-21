// atlas-store.js — progress state for the Leonida Platinum Atlas.
// Earned trophies and the spoiler-shield setting live in localStorage only;
// nothing leaves the browser except the progress file the user exports.
const STORAGE_KEY = 'leonida-platinum-atlas-v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { earned: new Set(), spoiler: false };
    const parsed = JSON.parse(raw);
    return {
      earned: new Set(Array.isArray(parsed.earned) ? parsed.earned : []),
      spoiler: Boolean(parsed.spoiler),
    };
  } catch {
    return { earned: new Set(), spoiler: false };
  }
}

export function saveState(state) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ earned: [...state.earned], spoiler: state.spoiler }),
  );
}

export function toggleEarned(state, trophyId) {
  if (state.earned.has(trophyId)) state.earned.delete(trophyId);
  else state.earned.add(trophyId);
  saveState(state);
}

export function exportProgress(state) {
  const payload = {
    app: 'leonida-platinum-atlas',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: [...state.earned].sort((a, b) => a - b),
    spoiler: state.spoiler,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'leonida-platinum-atlas-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

// Accepts this app's export shape, or a bare array of trophy ids or names.
export function importProgress(state, trophies, fileText) {
  const parsed = JSON.parse(fileText);
  const byName = new Map(trophies.map((t) => [t.name, t.id]));
  let entries = [];
  if (Array.isArray(parsed)) entries = parsed;
  else if (Array.isArray(parsed.earned)) entries = parsed.earned;
  const ids = entries
    .map((e) => (typeof e === 'number' ? e : byName.get(e)))
    .filter((id) => Number.isInteger(id) && byName.size && [...byName.values()].includes(id));
  state.earned = new Set(ids);
  if (parsed && typeof parsed === 'object' && 'spoiler' in parsed) state.spoiler = Boolean(parsed.spoiler);
  saveState(state);
  return state.earned.size;
}
