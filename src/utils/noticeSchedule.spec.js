import { afterEach, expect, it, vi } from 'vitest';
import {
  noticeInstant,
  noticeInputTime,
  noticeScheduleForm,
  noticeSchedulePayload,
  formatNoticeTime,
} from './noticeSchedule.js';
afterEach(() => vi.unstubAllEnvs());
it('UTC+8 输入转换不随设备时区或夏令时变化', () => {
  for (const zone of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
    vi.stubEnv('TZ', zone);
    expect(noticeInstant('2026-11-11T15:30')).toBe('2026-11-11T07:30:00.000Z');
    expect(noticeInputTime('2026-11-11T07:30:00Z')).toBe('2026-11-11T15:30');
    expect(formatNoticeTime('2026-11-11T07:30:00Z')).toContain(
      '15:30（UTC+8）',
    );
  }
});
it('草稿和日期截止精度可完整往返，空开始时间由服务端沿用发布', () => {
  const form = noticeScheduleForm({
    expiresOn: '2026-11-15',
    publishedAt: '2026-11-11T07:30:00Z',
    enabled: false,
    published: false,
  });
  const payload = noticeSchedulePayload(form);
  expect(payload).toMatchObject({
    publishedAt: '2026-11-11T07:30:00Z',
    displayStartsAt: null,
    displayEndsAt: null,
    expiresOn: '2026-11-15',
    enabled: false,
    published: false,
  });
});
it('仅切换弹窗开关时保留原有秒和微秒，不把发布时间截断到分钟', () => {
  const row = {
    publishedAt: '2026-11-11T07:30:28.123456Z',
    displayStartsAt: '2026-11-11T07:30:28.123456Z',
    displayEndsAt: '2026-11-11T08:30:28.234567Z',
    enabled: true,
    published: true,
  };
  expect(
    noticeSchedulePayload(noticeScheduleForm(row), { enabled: false }),
  ).toMatchObject({
    publishedAt: row.publishedAt,
    displayStartsAt: row.displayStartsAt,
    displayEndsAt: row.displayEndsAt,
  });
});
it('拒绝无效日期、开始早于发布、截止不晚于开始', () => {
  expect(() => noticeInstant('2026-02-30T10:00')).toThrow('无效');
  expect(() => noticeInstant('2026-11-11')).toThrow('小时和分钟');
  const form = noticeScheduleForm();
  Object.assign(form, {
    publishedAt: '2026-11-11T15:30',
    displayStartsAt: '2026-11-11T15:29',
  });
  expect(() => noticeSchedulePayload(form)).toThrow('不能早于');
  Object.assign(form, {
    displayStartsAt: '',
    deadlineMode: 'minute',
    displayEndsAt: '2026-11-11T15:30',
  });
  expect(() => noticeSchedulePayload(form)).toThrow('必须晚于');
});
