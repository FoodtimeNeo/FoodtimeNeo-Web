import { afterEach, describe, expect, it } from 'vitest';
import {
  holdPageUpdate,
  installPageEditGuard,
  isPageUpdateSafe,
} from './updateSafety.js';

let stop = () => {};
afterEach(() => {
  stop();
  document.body.replaceChildren();
});
function field(html) {
  document.body.innerHTML = html;
  stop = installPageEditGuard();
  const input = document.querySelector('input,textarea,select');
  input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  return input;
}
function input(element) {
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('safe page switching', () => {
  it('does not interrupt an IME composition or an unsaved custom star selection', () => {
    const element = field('<input>');
    element.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true }),
    );
    expect(isPageUpdateSafe()).toBe(false);
    element.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true }),
    );
    expect(isPageUpdateSafe()).toBe(true);
    document.body.innerHTML =
      '<div role="radiogroup"><button role="radio" aria-checked="false">5星</button></div>';
    const button = document.querySelector('button');
    button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    button.setAttribute('aria-checked', 'true');
    expect(isPageUpdateSafe()).toBe(false);
    button.parentElement.remove();
    expect(isPageUpdateSafe()).toBe(true);
  });
  it('waits for every overlapping write and ignores duplicate completion', () => {
    const one = holdPageUpdate(),
      two = holdPageUpdate();
    expect(isPageUpdateSafe()).toBe(false);
    one();
    one();
    expect(isPageUpdateSafe()).toBe(false);
    two();
    expect(isPageUpdateSafe()).toBe(true);
  });
  it('retains changed text and permits switching only after reverting or leaving the editor', () => {
    const element = field('<textarea>original</textarea>');
    element.value = 'changed';
    input(element);
    expect(isPageUpdateSafe()).toBe(false);
    element.value = 'original';
    input(element);
    expect(isPageUpdateSafe()).toBe(true);
    element.value = 'another change';
    input(element);
    element.remove();
    expect(isPageUpdateSafe()).toBe(true);
  });
  it('protects password input without persisting it', () => {
    localStorage.clear();
    sessionStorage.clear();
    const element = field('<input type="password">');
    element.value = 'private-password';
    input(element);
    expect(isPageUpdateSafe()).toBe(false);
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });
  it('blocks native file selection and modal confirmation', () => {
    const element = field('<input type="file">');
    Object.defineProperty(element, 'files', {
      value: [new File(['x'], 'sample.jpg')],
      configurable: true,
    });
    input(element);
    expect(isPageUpdateSafe()).toBe(false);
    element.remove();
    expect(isPageUpdateSafe()).toBe(true);
    document.body.innerHTML = '<aside role="dialog">确认</aside>';
    expect(isPageUpdateSafe()).toBe(false);
    document.querySelector('aside').style.display = 'none';
    expect(isPageUpdateSafe()).toBe(true);
  });
  it('protects checkbox changes and hidden editors do not trap subsequent navigation', () => {
    const element = field('<input type="checkbox">');
    element.checked = true;
    input(element);
    expect(isPageUpdateSafe()).toBe(false);
    element.hidden = true;
    expect(isPageUpdateSafe()).toBe(true);
  });
});
