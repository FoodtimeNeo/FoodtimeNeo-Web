/**
 * Mock 模式入口：把 axios 的传输层替换为本地 mock 服务。
 * 只在 VITE_USE_MOCK=true（`npm run dev:mock`）时由 main.js 动态加载，
 * 拦截器、错误映射和页面代码保持不变，切回真实后端无需改动页面。
 */
import { AxiosError } from 'axios';
import { createSeed } from './seed.js';
import { createMockServer } from './server.js';
import { clearSession } from '@/utils/authSession.js';

const STORAGE_KEY = 'foodtime_mock_db_v1';

function readHeader(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) ?? '';
  return headers[name] ?? '';
}

function parseBody(data) {
  if (!data) return {};
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * 创建 axios adapter。成功返回标准响应；非 2xx 抛出带 response 的 AxiosError，
 * 交给 http.js 的拦截器统一转换为 ApiError。
 * @param {{ handle: Function }} server
 * @param {{ delay?: number, onChange?: () => void }} [options]
 */
export function createMockAdapter(server, { delay = 0, onChange } = {}) {
  return async (config) => {
    const method = (config.method || 'get').toUpperCase();
    const token = readHeader(config.headers, 'Authorization').replace(
      /^Bearer\s+/,
      '',
    );
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));

    const { status, body } = server.handle({
      method,
      url: config.url || '',
      query: config.params || {},
      body: parseBody(config.data),
      token,
    });
    if (method !== 'GET' && onChange) onChange();

    const response = {
      data: body,
      status,
      statusText: String(status),
      headers: {},
      config,
      request: {},
    };
    if (status >= 200 && status < 300) return response;
    throw new AxiosError(
      body.message,
      status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      response,
    );
  };
}

function loadDb() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // 存储损坏时重新生成
  }
  return createSeed();
}

function saveDb(db) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // 存储不可用时只在内存中生效
  }
}

/** 页面角落的 Mock 标记，避免把 mock 数据误当成真实联调结果；点击可重置数据。 */
function mountBadge() {
  const badge = document.createElement('button');
  badge.type = 'button';
  badge.textContent = 'MOCK 数据 · 点击重置';
  badge.title = '当前为 Mock 模式，数据只保存在本浏览器';
  Object.assign(badge.style, {
    position: 'fixed',
    left: '12px',
    bottom: '12px',
    zIndex: '9999',
    padding: '4px 10px',
    border: '2px solid #2b2118',
    borderRadius: '4px',
    background: '#f4d35e',
    color: '#2b2118',
    font: '600 12px/1.4 sans-serif',
    boxShadow: '2px 2px 0 #2b2118',
    cursor: 'pointer',
  });
  badge.addEventListener('click', () => {
    if (!window.confirm('重置所有 Mock 数据并退出登录吗？')) return;
    window.localStorage.removeItem(STORAGE_KEY);
    clearSession();
    window.location.reload();
  });
  document.body.appendChild(badge);
}

/**
 * 在 http 实例上启用 mock。数据持久化到 localStorage，刷新页面后保留操作结果。
 * @param {import('axios').AxiosInstance} http
 */
export function installMock(http) {
  const db = loadDb();
  const server = createMockServer(db);
  http.defaults.adapter = createMockAdapter(server, {
    delay: 250,
    onChange: () => saveDb(db),
  });
  mountBadge();
  console.warn('[mock] 已启用 Mock 数据模式，所有接口请求均不会发往后端。');
}
