import { ApiError, http, getCsrf, invalidateSession } from './http.js';
import { normalizeLoginId } from '@/utils/authValidators.js';
export async function login({
  loginId,
  password,
  challengeId,
  challengeAnswer,
}) {
  const payload = {
    account: normalizeLoginId(loginId).toLowerCase(),
    password,
  };
  if (challengeId && challengeAnswer) {
    payload.challengeId = challengeId;
    payload.challengeAnswer = String(challengeAnswer).trim();
  }
  const data = await http.post('/auth/login', payload, {
    skipUnauthorized: true,
  });
  invalidateSession();
  await getCsrf();
  return data;
}
/** 一次性设备绑定算术题；响应禁止缓存，答案不在客户端保存。 */
export async function fetchCaptcha() {
  const data = await http.get('/auth/captcha');
  if (
    !data ||
    typeof data.challengeId !== 'string' ||
    typeof data.imageBase64 !== 'string' ||
    typeof data.expiresAt !== 'string'
  ) {
    throw new ApiError('验证码响应不符合接口约定', { code: 'PROTOCOL' });
  }
  return data;
}
export const fetchCurrentUser = () =>
  http.get('/auth/me', { skipUnauthorized: true });
export const fetchProfile = () => http.get('/users/me/profile');
export const fetchRegistrationPolicy = () =>
  http.get('/auth/registration-policy');
export const register = ({
  email,
  password,
  verificationCode,
  invitationCode,
}) => {
  const payload = {
    email: email.trim().toLowerCase(),
    password,
    verificationCode,
  };
  const code = typeof invitationCode === 'string' ? invitationCode.trim() : '';
  if (code) payload.invitationCode = code;
  return http.post('/auth/register', payload);
};
export const sendVerificationCode = (email) =>
  http.post('/auth/register/email-code', { email: email.trim().toLowerCase() });
export const sendPasswordResetCode = (email) =>
  http.post(
    '/auth/password-reset/email-code',
    { email: email.trim().toLowerCase() },
    { skipUnauthorized: true },
  );
export const verifyPasswordResetCode = (email, verificationCode) =>
  http.post(
    '/auth/password-reset/verify',
    { email: email.trim().toLowerCase(), verificationCode },
    { skipUnauthorized: true },
  );
export async function resetPassword(resetToken, newPassword) {
  await http.post(
    '/auth/password-reset',
    { resetToken, newPassword },
    { skipUnauthorized: true },
  );
  invalidateSession();
}
export async function logout() {
  await http.post('/auth/logout', null, { skipUnauthorized: true });
  invalidateSession();
}
export async function changePassword({ oldPassword, newPassword }) {
  await http.put('/users/me/password', { oldPassword, newPassword });
  invalidateSession();
}
