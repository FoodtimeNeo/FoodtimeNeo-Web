import { http } from './http.js';

/** 访客绑定学校邮箱：先发验证码，再带验证码完成绑定。 */
export const sendSchoolEmailCode = (email) =>
  http.post('/auth/bind-email/email-code', { email });

export const bindSchoolEmail = ({ email, verificationCode }) =>
  http.post('/users/me/bind-email', { email, verificationCode });
