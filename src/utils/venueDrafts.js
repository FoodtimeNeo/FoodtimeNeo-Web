const drafts = new Map();
let owner = null;
export function venueDraft(userId, type, id) {
  if (owner !== userId) clearVenueDrafts();
  owner = userId;
  const key = `${type}:${id}`;
  if (!drafts.has(key))
    drafts.set(key, { rating: 0, content: '', operation: null });
  return drafts.get(key);
}
export function clearVenueDrafts() {
  drafts.clear();
  owner = null;
}
