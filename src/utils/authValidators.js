// 与后端注册白名单一致；允许子域（如 vip.qq.com）。
export const allowedEmailDomains = [
  'qq.com',
  'foxmail.com',
  '163.com',
  '126.com',
  'yeah.net',
  'sina.com',
  'sina.cn',
  'sohu.com',
  '139.com',
  '189.cn',
  'wo.cn',
  'aliyun.com',
  '21cn.com',
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'yahoo.com',
  'proton.me',
  'protonmail.com',
  'bjtu.edu.cn',
];
export function validateEmail(value) {
  const email = value.trim().toLowerCase();
  if (!email) return '请输入邮箱';
  // 与后端一致：任意可用邮箱；校园邮箱注册可直接发布内容。
  if (
    email.length > 254 ||
    !/^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(\.[A-Za-z0-9-]{1,63})+$/.test(
      email,
    )
  )
    return '请输入有效邮箱';
  const domain = email.slice(email.lastIndexOf('@') + 1);
  if (
    !allowedEmailDomains.some(
      (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
    )
  )
    return '请使用主流邮箱注册，如 QQ、163、126、Gmail、Outlook 或学校邮箱';
  return '';
}
/** 学生常直接输入学号：登录时补全为学校邮箱。 */
export function normalizeLoginId(value) {
  const account = value.trim();
  return /^\d{1,20}$/.test(account) ? `${account}@bjtu.edu.cn` : account;
}
export function validateLoginId(value) {
  const email = value.trim();
  if (!email) return '请输入邮箱或学号';
  // 纯数字视为学号，提交时补全 @bjtu.edu.cn。
  if (/^\d{1,20}$/.test(email)) return '';
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
/** 与后端邀请码字符集一致：排除 I/O 与 0/1，12 位。 */
export function validateInvitationCode(value, required = false) {
  const code = typeof value === 'string' ? value.trim() : '';
  if (!code) return required ? '当前注册需要邀请码' : '';
  return /^[A-HJ-NP-Z2-9]{12}$/.test(code) ? '' : '邀请码为 12 位发放字符';
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
