/**
 * 鉴权表单的纯函数校验。返回错误文案字符串，空串表示通过。
 * 最终校验以后端为准，这里只做即时反馈，减少无效请求。
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {string} value
 * @returns {string}
 */
export function validateEmail(value) {
  if (!value) return '请输入邮箱';
  if (!EMAIL_PATTERN.test(value)) return '邮箱格式不正确';
  return '';
}

/**
 * 登录账号：邮箱或账号，这里只校验非空。
 * @param {string} value
 * @returns {string}
 */
export function validateLoginId(value) {
  if (!value.trim()) return '请输入邮箱或账号';
  return '';
}

/**
 * @param {string} value
 * @returns {string}
 */
export function validatePassword(value) {
  if (!value) return '请输入密码';
  if (value.length < 6) return '密码至少 6 位';
  return '';
}

/**
 * @param {string} value
 * @returns {string}
 */
export function validateNickname(value) {
  if (!value.trim()) return '请输入昵称';
  if (value.trim().length > 20) return '昵称不超过 20 个字符';
  return '';
}

/**
 * @param {string} value
 * @returns {string}
 */
export function validateVerificationCode(value) {
  if (!value) return '请输入验证码';
  if (!/^\d{6}$/.test(value)) return '验证码为 6 位数字';
  return '';
}
