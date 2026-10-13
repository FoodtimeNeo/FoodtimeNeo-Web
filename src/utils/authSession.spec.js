import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSession,
  getToken,
  readSession,
  writeSession,
} from './authSession.js';

describe('authSession', () => {
  beforeEach(() => {
    clearSession();
  });

  it('无会话时返回 null 与空 token', () => {
    expect(readSession()).toBeNull();
    expect(getToken()).toBe('');
  });

  it('写入后可读回', () => {
    writeSession({ token: 't1', user: { id: 'u1', role: 'user' } });
    expect(readSession()).toEqual({
      token: 't1',
      user: { id: 'u1', role: 'user' },
    });
    expect(getToken()).toBe('t1');
  });

  it('清空后回到无会话', () => {
    writeSession({ token: 't1', user: {} });
    clearSession();
    expect(readSession()).toBeNull();
  });

  it('存储内容损坏时容错为无会话', () => {
    window.localStorage.setItem('foodtime_auth_session', '{bad json');
    expect(readSession()).toBeNull();
    expect(getToken()).toBe('');
  });
});
