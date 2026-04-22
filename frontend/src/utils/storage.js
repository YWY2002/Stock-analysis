const STATE_KEY = 'stockAnalysis.v1';
const DRAWINGS_KEY = 'stockAnalysis.drawings.v1';

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — silently ignore.
  }
}

export const loadState = () => read(STATE_KEY);
export const saveState = (state) => write(STATE_KEY, state);

export const loadDrawings = () => read(DRAWINGS_KEY) ?? [];
export const saveDrawings = (drawings) => write(DRAWINGS_KEY, drawings);
