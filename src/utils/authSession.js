/**
 * 会话存储。token 与当前用户信息持久化在 localStorage，供 api 层读取 token、
 * store 层恢复会话共用。所有读写都容错，隐私模式或禁用存储时退化为无会话。
 */
const STORAGE_KEY = 'foodtime_auth_session';

/**
 * 读取会话。
 * @returns {{ token: string, user: object } | null}
 */
export function readSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && typeof session.token === 'string') return session;
    return null;
  } catch {
    return null;
  }
}

/**
 * 写入会话。
 * @param {{ token: string, user: object }} session
 */
export function writeSession(session) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // 存储不可用时忽略：会话退化为仅本次内存有效
  }
}

/**
 * 清空会话。
 */
export function clearSession() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 同上
  }
}

/**
 * 读取当前 token。
 * @returns {string}
 */
export function getToken() {
  return readSession()?.token ?? '';
}
