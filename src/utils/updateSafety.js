const holds = new Set();
const listeners = new Set();
let pageIsDirty = () => false;

export function notifyUpdateSafety() {
  for (const listener of listeners) listener();
}

/** Hold across a whole write/upload/save operation, including asynchronous preparation. */
export function holdPageUpdate() {
  const token = {};
  holds.add(token);
  return () => {
    if (holds.delete(token)) notifyUpdateSafety();
  };
}

export function subscribeUpdateSafety(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isPageUpdateSafe() {
  return holds.size === 0 && !pageIsDirty();
}

function editable(element) {
  return (
    element instanceof Element &&
    (element.matches('textarea, select, input:not([type=hidden])') ||
      element.isContentEditable)
  );
}

function valueOf(element, initial = false) {
  if (element.type === 'file') return element.files?.length ? 'selected' : '';
  if (['checkbox', 'radio'].includes(element.type))
    return initial ? element.defaultChecked : element.checked;
  if (element.tagName === 'SELECT')
    return [...element.options]
      .filter((option) => (initial ? option.defaultSelected : option.selected))
      .map((option) => option.value)
      .join('\u0000');
  return element.isContentEditable
    ? element.textContent
    : initial
      ? element.defaultValue
      : element.value;
}

function visible(element) {
  if (!element.isConnected) return false;
  for (let node = element; node instanceof Element; node = node.parentElement) {
    if (node.hidden || getComputedStyle(node).display === 'none') return false;
  }
  return true;
}

/** Inputs remain in this page; passwords and arbitrary forms are never persisted. */
export function installPageEditGuard(doc = document) {
  const baseline = new WeakMap();
  const changed = new Set();
  const widgets = new Map();
  let composing = null;
  const widgetValue = (element) =>
    [element, ...element.querySelectorAll('[aria-checked],[aria-valuenow]')]
      .map(
        (node) =>
          `${node.getAttribute('aria-checked')}:${node.getAttribute('aria-valuenow')}`,
      )
      .join('|');
  const widget = ({ target }) => {
    const group =
      target instanceof Element &&
      target.closest('[role=radiogroup],[role=slider],[role=switch]');
    if (group && !widgets.has(group)) widgets.set(group, widgetValue(group));
  };
  const compositionStart = ({ target }) => {
    composing = target;
  };
  const compositionEnd = () => {
    composing = null;
    notifyUpdateSafety();
  };
  const focus = ({ target }) => {
    widget({ target });
    if (editable(target) && !baseline.has(target))
      baseline.set(target, valueOf(target));
  };
  const edit = ({ target }) => {
    if (!editable(target)) return;
    if (!baseline.has(target)) baseline.set(target, valueOf(target, true));
    changed.add(target);
    notifyUpdateSafety();
  };
  const dirty = () => {
    if (composing && visible(composing)) return true;
    for (const [element, value] of widgets) {
      if (!visible(element)) widgets.delete(element);
      else if (widgetValue(element) !== value) return true;
    }
    for (const element of changed) {
      if (!visible(element)) {
        changed.delete(element);
        continue;
      }
      if (element.type === 'file' && element.files?.length) return true;
      if (valueOf(element) !== baseline.get(element)) return true;
      changed.delete(element);
    }
    return [...doc.querySelectorAll('[role=dialog],dialog[open]')].some(
      visible,
    );
  };
  pageIsDirty = dirty;
  doc.addEventListener('focusin', focus, true);
  doc.addEventListener('input', edit, true);
  doc.addEventListener('change', edit, true);
  doc.addEventListener('pointerdown', widget, true);
  doc.addEventListener('keydown', widget, true);
  doc.addEventListener('compositionstart', compositionStart, true);
  doc.addEventListener('compositionend', compositionEnd, true);
  return () => {
    doc.removeEventListener('focusin', focus, true);
    doc.removeEventListener('input', edit, true);
    doc.removeEventListener('change', edit, true);
    doc.removeEventListener('pointerdown', widget, true);
    doc.removeEventListener('keydown', widget, true);
    doc.removeEventListener('compositionstart', compositionStart, true);
    doc.removeEventListener('compositionend', compositionEnd, true);
    widgets.clear();
    changed.clear();
    if (pageIsDirty === dirty) pageIsDirty = () => false;
  };
}
