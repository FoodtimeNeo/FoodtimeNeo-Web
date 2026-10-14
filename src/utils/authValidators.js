export function validateEmail(value) {
  const email = value.trim().toLowerCase();
  if (!email) return '请输入邮箱';
  if (email.length > 254 || !/^[0-9]+@bjtu\.edu\.cn$/.test(email))
    return '请使用数字学号 @bjtu.edu.cn 邮箱';
  return '';
}
export function validateLoginId(value) {
  const email = value.trim();
  if (!email) return '请输入邮箱';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return '请输入完整邮箱';
  return '';
}
export function validatePassword(value, { isNew = false } = {}) {
  if (!value) return '请输入密码';
  if (value.length < 8 || value.length > 128) return '密码须为 8–128 位';
  if (!/^[!-~]+$/.test(value))
    return '密码只能包含 ASCII 字母、数字及半角符号，不能有空白';
  if (isNew && (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)))
    return '新密码须包含字母和数字';
  return '';
}
export function validateVerificationCode(value) {
  if (!/^[0-9]{6}$/.test(value)) return '验证码为 6 位数字';
  return '';
}
export function safeRedirect(value) {
  return typeof value === 'string' &&
    /^\/(?!\/)/.test(value) &&
    [...value].every(
      (character) => character.charCodeAt(0) > 32 && character !== '\\',
    )
    ? value
    : null;
}
