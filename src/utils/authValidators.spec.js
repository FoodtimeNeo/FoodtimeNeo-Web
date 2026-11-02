import { describe, expect, it } from 'vitest';
import {
  validateEmail,
  validateLoginId,
  validatePassword,
  validateVerificationCode,
  safeRedirect,
} from './authValidators.js';
describe('认证输入与安全跳转', () => {
  it('注册只接受主流邮箱，拒绝畸形地址与域名伪装', () => {
    expect(validateEmail(' 20260001@BJTU.EDU.CN ')).toBe('');
    expect(validateEmail('someone@gmail.com')).toBe('');
    expect(validateEmail('someone@qq.com')).toBe('');
    expect(validateEmail('someone@vip.163.com')).toBe('');
    expect(validateEmail('someone@outlook.com')).toBe('');
    expect(validateEmail('student@example.com')).not.toBe('');
    expect(validateEmail('student@qq.com.evil.com')).not.toBe('');
    expect(validateEmail('student@evilqq.com')).not.toBe('');
    expect(validateEmail('123@example')).not.toBe('');
    expect(validateEmail('123@.com')).not.toBe('');
    expect(validateEmail('a b@example.com')).not.toBe('');
    expect(validateLoginId('user01')).not.toBe('');
    expect(validateLoginId('existing@example.com')).toBe('');
  });
  it('登录不追加新密码复杂度，但限制ASCII与长度', () => {
    expect(validatePassword('12345678')).toBe('');
    expect(validatePassword('12345678', { isNew: true })).not.toBe('');
    expect(validatePassword('Pass2026!', { isNew: true })).toBe('');
    expect(validatePassword('password ')).not.toBe('');
    expect(validatePassword('中文password')).not.toBe('');
    expect(validatePassword('a'.repeat(129))).not.toBe('');
  });
  it('验证码必须为六位；跳转只能留在站内', () => {
    expect(validateVerificationCode('012345')).toBe('');
    expect(validateVerificationCode('12a456')).not.toBe('');
    expect(safeRedirect('/profile?tab=reviews')).toBe('/profile?tab=reviews');
    [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      '/\nfoo',
      [],
      null,
    ].forEach((v) => expect(safeRedirect(v)).toBeNull());
  });
});
