import axios from 'axios';

/**
 * 统一的接口错误。页面只依赖 code / status / message，不直接读取 axios 错误结构。
 */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: string, cause?: unknown }} [options]
   */
  constructor(message, { status = 0, code = 'UNKNOWN', cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const STATUS_CODES = {
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
};

/**
 * 把 axios 错误转换为 ApiError。
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

  const serverMessage = error.response.data?.message;
  const code = STATUS_CODES[status] ?? (status >= 500 ? 'SERVER' : 'REQUEST');
  return new ApiError(serverMessage || `请求失败（${status}）`, {
    status,
    code,
    cause: error,
  });
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
});

http.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(toApiError(error)),
);
