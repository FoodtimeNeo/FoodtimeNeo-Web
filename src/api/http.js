import axios from 'axios';
import { holdPageUpdate } from '@/utils/updateSafety.js';
import {
  prepareCatalogRequest,
  restoreCatalogResponse,
  saveCatalogResponse,
  discardCatalogRequest,
  clearCatalogMediaRegistry,
} from '@/utils/publicCatalogCache.js';
const CLIENT_BUILD = import.meta.env.VITE_BUILD_ID || 'development';
const SAFE_ID = /^[a-zA-Z0-9._-]{1,64}$/;
let failureHandler = () => {};
export function setApiFailureHandler(handler) {
  failureHandler = handler || (() => {});
}
function observeFailure(error) {
  if (
    error.code === 'PROTOCOL' ||
    error.code === 'NETWORK' ||
    error.code === 'TIMEOUT' ||
    error.status >= 500
  ) {
    try {
      failureHandler(error);
    } catch {
      /* Diagnostics cannot mask an API failure. */
    }
  }
}
export class ApiError extends Error {
  constructor(
    message,
    {
      status = 0,
      code = 'UNKNOWN',
      bizCode = '',
      retryAfter = 0,
      fields = null,
      requestId = '',
      clientBuild = CLIENT_BUILD,
    } = {},
  ) {
    const safeId =
      typeof requestId === 'string' && SAFE_ID.test(requestId) ? requestId : '';
    super(
      status >= 500 && safeId ? `${message}（请求编号：${safeId}）` : message,
    );
    this.name = 'ApiError';
    Object.assign(this, {
      status,
      code,
      bizCode,
      retryAfter,
      fields,
      requestId: safeId,
      clientBuild,
    });
  }
}
let unauthorizedHandler = null;
let forbiddenHandler = null;
let csrf = null;
let csrfRequest = null;
let csrfVersion = 0;
let sessionVersion = 0;
export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};
export const setForbiddenHandler = (handler) => {
  forbiddenHandler = handler;
};
export function clearCsrf() {
  csrfVersion += 1;
  csrf = null;
  csrfRequest = null;
}
// 切换身份后丢弃上一身份未完成的响应。
export function invalidateSession() {
  sessionVersion += 1;
  clearCsrf();
  clearCatalogMediaRegistry();
}
export function toApiError(error) {
  if (error instanceof ApiError) return error;
  if (axios.isCancel(error))
    return new ApiError('请求已取消', { code: 'CANCELLED' });
  if (error?.code === 'ECONNABORTED')
    return new ApiError('请求超时，请确认操作结果后再试', { code: 'TIMEOUT' });
  const status = error?.response?.status || 0;
  if (!status)
    return new ApiError('网络连接失败，请确认操作结果后再试', {
      code: 'NETWORK',
    });
  const body = error.response.data;
  if (status === 403 && body === 'Invalid CORS request')
    return new ApiError(
      '当前页面来源未获后端允许，本地开发请使用 localhost:5173 或 localhost:3000',
      { status, code: 'FORBIDDEN', bizCode: 'CORS_DENIED' },
    );
  const codes = {
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    429: 'RATE_LIMITED',
  };
  // 不保留请求配置和Axios错误，避免错误日志带出密码或验证码。
  return new ApiError(body?.message || `请求失败（${status}）`, {
    status,
    code: codes[status] || (status >= 500 ? 'SERVER' : 'REQUEST'),
    bizCode: typeof body?.code === 'string' ? body.code : '',
    retryAfter: Number(error.response.headers?.['retry-after']) || 0,
    fields: body?.data || null,
    requestId: body?.requestId || error.response.headers?.['x-request-id'],
  });
}
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
if (!/^\/api\/v1\/?$/.test(baseURL))
  throw new ApiError('接口必须使用同站 /api/v1 代理', {
    code: 'CONFIGURATION',
  });
export const http = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  // 后端按 /auth/register 等路径识别官方客户端，未知客户端在 enforce 模式下会被拒绝。
  headers: { 'X-Foodtime-Client': 'web', 'X-Foodtime-Web-Build': CLIENT_BUILD },
});
export async function getCsrf() {
  if (csrf) return csrf;
  if (!csrfRequest) {
    const version = csrfVersion;
    const pending = http
      .get('/auth/csrf', { skipUnauthorized: true })
      .then((data) => {
        if (version !== csrfVersion)
          throw new ApiError('会话已变化，请重试', { code: 'SESSION_CHANGED' });
        if (
          data?.headerName !== 'X-CSRF-TOKEN' ||
          typeof data.token !== 'string' ||
          !data.token
        )
          throw new ApiError('CSRF响应不符合接口约定', { code: 'PROTOCOL' });
        csrf = data;
        return data;
      })
      .finally(() => {
        if (csrfRequest === pending) csrfRequest = null;
      });
    csrfRequest = pending;
  }
  return csrfRequest;
}
http.interceptors.request.use(async (config) => {
  const requestSession = sessionVersion;
  if (
    config.baseURL !== baseURL ||
    typeof config.url !== 'string' ||
    !config.url.startsWith('/') ||
    config.url.startsWith('//') ||
    /[\\\r\n]/.test(config.url) ||
    config.url
      .split(/[?#]/)[0]
      .split('/')
      .some((part) => {
        try {
          return decodeURIComponent(part) === '..';
        } catch {
          return true;
        }
      })
  ) {
    throw new ApiError('禁止向接口代理之外发送会话请求', {
      code: 'UNSAFE_URL',
    });
  }
  config.withCredentials = true;
  config.headers.delete('Authorization');
  config.headers.set('X-Foodtime-Web-Build', CLIENT_BUILD);
  const isWrite = !['get', 'head', 'options'].includes(
    (config.method || 'get').toLowerCase(),
  );
  if (isWrite) {
    config.finishPageWrite = holdPageUpdate();
  }
  try {
    if (isWrite) {
      const token = await getCsrf();
      if (requestSession !== sessionVersion)
        throw new ApiError('会话已变化，请确认身份后重试', {
          code: 'SESSION_CHANGED',
        });
      config.headers.set(token.headerName, token.token);
    }
    await prepareCatalogRequest(config, http.getUri(config));
    if (requestSession !== sessionVersion)
      throw new ApiError('会话已变化，请刷新后重试', {
        code: 'SESSION_CHANGED',
      });
  } catch (error) {
    config.finishPageWrite?.();
    throw error;
  }
  config.sessionVersion = requestSession;
  return config;
});
http.interceptors.response.use(
  async (response) => {
    try {
      if (response.config.sessionVersion !== sessionVersion)
        throw new ApiError('会话已变化，请刷新后查看操作结果', {
          code: 'SESSION_CHANGED',
        });
      if (response.status === 304 && response.config.catalogKey) {
        const restored = restoreCatalogResponse(response);
        if (restored) response.data = restored;
        else {
          await discardCatalogRequest(response.config);
          if (response.config.catalogUnconditional)
            throw new ApiError('服务器缓存响应异常', { code: 'PROTOCOL' });
          return http.request({
            ...response.config,
            catalogUnconditional: true,
          });
        }
      }
      const body = response.data;
      if (
        !body ||
        typeof body !== 'object' ||
        typeof body.code !== 'string' ||
        !('data' in body)
      )
        throw new ApiError('服务器响应不符合接口约定', { code: 'PROTOCOL' });
      if (body.code !== 'OK')
        throw new ApiError(body.message || '请求失败', {
          status: response.status,
          code: 'BUSINESS',
          bizCode: body.code,
        });
      await saveCatalogResponse(response);
      if (response.config.sessionVersion !== sessionVersion)
        throw new ApiError('会话已变化，请刷新后重试', {
          code: 'SESSION_CHANGED',
        });
      return body.data;
    } catch (error) {
      observeFailure(error);
      throw error;
    } finally {
      response.config.finishPageWrite?.();
    }
  },
  async (error) => {
    error.config?.finishPageWrite?.();
    if (
      error.config?.sessionVersion !== undefined &&
      error.config.sessionVersion !== sessionVersion
    )
      return Promise.reject(
        new ApiError('会话已变化，请刷新后查看操作结果', {
          code: 'SESSION_CHANGED',
        }),
      );
    const apiError = toApiError(error);
    const config = error.config;
    if ([401, 403, 404].includes(apiError.status))
      await discardCatalogRequest(config);
    // Only one bounded retry for read-only transient failures. Never replay writes or genuine 500s.
    if (
      config &&
      config.method?.toLowerCase() === 'get' &&
      !config.foodtimeReadRetried &&
      config.retryRead !== false &&
      navigator.onLine !== false &&
      (['NETWORK', 'TIMEOUT'].includes(apiError.code) ||
        [502, 503, 504].includes(apiError.status))
    ) {
      config.foodtimeReadRetried = true;
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (config.sessionVersion !== sessionVersion)
        throw new ApiError('会话已变化，请刷新后查看操作结果', {
          code: 'SESSION_CHANGED',
        });
      if (config.signal?.aborted)
        throw new ApiError('请求已取消', { code: 'CANCELLED' });
      return http.request(config);
    }
    observeFailure(apiError);
    if (apiError.bizCode === 'CSRF_INVALID') clearCsrf();
    if (apiError.status === 401 && !error.config?.skipUnauthorized) {
      invalidateSession();
      unauthorizedHandler?.();
    } else if (apiError.status === 403 && apiError.bizCode !== 'CSRF_INVALID')
      forbiddenHandler?.(apiError);
    // 写请求不自动重试，避免超时后重复写入。
    return Promise.reject(apiError);
  },
);
