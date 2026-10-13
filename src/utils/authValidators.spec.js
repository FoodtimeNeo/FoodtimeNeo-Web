import { describe, expect, it } from 'vitest';
import {
  validateEmail,
  validateLoginId,
  validateNickname,
  validatePassword,
  validateVerificationCode,
} from './authValidators.js';

describe('authValidators', () => {
  it('校验邮箱', () => {
    expect(validateEmail('')).not.toBe('');
    expect(validateEmail('bad')).not.toBe('');
    expect(validateEmail('a@b.c')).toBe('');
  });

  it('登录账号只校验非空', () => {
    expect(validateLoginId('  ')).not.toBe('');
    expect(validateLoginId('user01')).toBe('');
  });

  it('校验密码长度', () => {
    expect(validatePassword('123')).not.toBe('');
    expect(validatePassword('123456')).toBe('');
  });

  it('校验昵称', () => {
    expect(validateNickname('')).not.toBe('');
    expect(validateNickname('a'.repeat(21))).not.toBe('');
    expect(validateNickname('小明')).toBe('');
  });

  it('校验验证码为 6 位数字', () => {
    expect(validateVerificationCode('12a')).not.toBe('');
    expect(validateVerificationCode('123456')).toBe('');
  });
});
