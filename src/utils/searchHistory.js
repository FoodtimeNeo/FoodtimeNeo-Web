const PREFIX = 'foodtime:dish-search:';
const memory = new Map();
const normalize = (value) =>
  typeof value === 'string' ? value.trim().slice(0, 50) : '';
const keyFor = (owner) => (owner ? PREFIX + owner : '');
export function readSearchHistory(owner) {
  const key = keyFor(owner);
  if (!key) return [];
  if (memory.has(key)) return memory.get(key);
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(value))
      return [...new Set(value.map(normalize).filter(Boolean))].slice(0, 10);
  } catch {
    /* Search remains usable when local storage is unavailable. */
  }
  return memory.get(key) || [];
}
function write(owner, values) {
  const key = keyFor(owner);
  if (!key) return [];
  memory.set(key, values);
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    /* Memory-only fallback. */
  }
  return values;
}
export function rememberSearch(owner, value) {
  const term = normalize(value);
  return term
    ? write(
        owner,
        [
          term,
          ...readSearchHistory(owner).filter((item) => item !== term),
        ].slice(0, 10),
      )
    : readSearchHistory(owner);
}
export function removeSearch(owner, term) {
  return write(
    owner,
    readSearchHistory(owner).filter((item) => item !== term),
  );
}
export function purgeSearchHistory(owner) {
  const key = keyFor(owner);
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    /* No persisted entry is accessible. */
  }
}
