/**
 * 鉴权接口模块。只做请求与字段适配，错误统一为 ApiError（见 http.js）。
 * 后端前缀 /api/v1/auth，响应已在拦截器中解包为 data。
 */
import { http } from './http.js';

/**
 * 用户注册。
 * @param {{ email: string, password: string, nickname: string, verificationCode: string, role?: string, inviteCode?: string }} params
 * @returns {Promise<{ id: string, account: string, email: string, nickname: string, role: string }>}
 */
export function register(params) {
  return http.post('/auth/register', {
    email: params.email,
    password: params.password,
    nickname: params.nickname,
    verification_code: params.verificationCode,
    role: params.role || 'user',
    invite_code: params.inviteCode || '',
  });
}

/**
 * 用户登录。
 * @param {{ loginId: string, password: string }} params loginId 可为邮箱或账号
 * @returns {Promise<{ id: string, account: string, email: string, nickname: string, role: string, token: string }>}
 */
export function login(params) {
  return http.post('/auth/login', {
    login_id: params.loginId,
    password: params.password,
  });
}

/**
 * 发送邮箱验证码。
 * @param {string} email
 * @returns {Promise<object>}
 */
export function sendVerificationCode(email) {
  return http.post('/auth/send-code', { email });
}

/**
 * 更新当前登录用户资料。
 * @param {{ nickname?: string, email?: string }} data
 * @returns {Promise<object>}
 */
export function updateProfile(data) {
  return http.put('/auth/profile', data);
}
