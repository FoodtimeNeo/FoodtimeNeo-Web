import axios from 'axios';
import { clearSession, getToken } from '@/utils/authSession.js';

/**
 * 统一的接口错误。页面只依赖 code / status / message，不直接读取 axios 错误结构。
 * code 的取值：
 * - 传输层：TIMEOUT / NETWORK
 * - HTTP 层：UNAUTHORIZED(401) / FORBIDDEN(403) / NOT_FOUND(404) / SERVER(5xx) / REQUEST(其他 4xx)
 * - 业务层：后端返回的字符串业务码（如 AUTH_401_001），放在 bizCode 中
 */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: string, bizCode?: string, cause?: unknown }} [options]
   */
  constructor(
    message,
    { status = 0, code = 'UNKNOWN', bizCode = '', cause } = {},
  ) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.bizCode = bizCode;
  }
}

const STATUS_CODES = {
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
};

/**
 * 鉴权失效回调。由路由层通过 setUnauthorizedHandler 注入，避免 api 层直接依赖 router。
 * @type {(() => void) | null}
 */
let unauthorizedHandler = null;

/**
 * 注册 401 处理器（清理会话后跳转登录）。
 * @param {() => void} handler
 */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

/**
 * 把 axios 错误或业务错误转换为 ApiError。
 * @param {any} error
 * @returns {ApiError}
 */
export function toApiError(error) {
  if (error instanceof ApiError) return error;

  if (error?.code === 'ECONNABORTED') {
    return new ApiError('请求超时，请稍后重试', {
      code: 'TIMEOUT',
      cause: error,
    });
  }

  const status = error?.response?.status;
  if (!status) {
    return new ApiError('网络连接失败', { code: 'NETWORK', cause: error });
  }

  const body = error.response.data;
  const code = STATUS_CODES[status] ?? (status >= 500 ? 'SERVER' : 'REQUEST');
  return new ApiError(body?.message || `请求失败（${status}）`, {
    status,
    code,
    bizCode: typeof body?.code === 'string' ? body.code : '',
    cause: error,
  });
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    const body = response.data;
    // 后端统一结构：{ code, message, data }，code === 0 为成功，返回 data。
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data;
      throw new ApiError(body.message || '请求失败', {
        status: response.status,
        code: 'BUSINESS',
        bizCode: typeof body.code === 'string' ? body.code : String(body.code),
      });
    }
    return body;
  },
  (error) => {
    const apiError = toApiError(error);
    if (apiError.status === 401) {
      clearSession();
      if (unauthorizedHandler) unauthorizedHandler();
    }
    return Promise.reject(apiError);
  },
);
