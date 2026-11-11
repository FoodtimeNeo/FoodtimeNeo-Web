import { http, getCsrf, invalidateSession } from './http.js';
import { normalizeLoginId } from '@/utils/authValidators.js';
export async function login({ loginId, password }) {
  const data = await http.post(
    '/auth/login',
    { account: normalizeLoginId(loginId).toLowerCase(), password },
    { skipUnauthorized: true },
  );
  invalidateSession();
  await getCsrf();
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
