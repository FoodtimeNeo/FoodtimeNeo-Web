import { expect, it } from 'vitest';
import { clearSession } from './authSession.js';
it('清除旧Token与Mock库，不删除无关用户设置', () => {
  localStorage.setItem('foodtime_auth_session', 'fake');
  localStorage.setItem('foodtime_mock_db_v1', 'fake');
  localStorage.setItem('theme', 'paper');
  clearSession();
  expect(localStorage.getItem('foodtime_auth_session')).toBeNull();
  expect(localStorage.getItem('foodtime_mock_db_v1')).toBeNull();
  expect(localStorage.getItem('theme')).toBe('paper');
  localStorage.clear();
});
