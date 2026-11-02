import { http, ApiError } from './http.js';

const COUNTERS = [
  'registeredUsers',
  'onlineUsers',
  'reviews',
  'replies',
  'posts',
  'halls',
  'stalls',
  'dishes',
];
const DAILY = [
  'newUsers',
  'newReviews',
  'newReplies',
  'newPosts',
  'onlinePeak',
];
const object = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const count = (value) => Number.isSafeInteger(value) && value >= 0;
function dayValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return NaN;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date.getTime()
    : NaN;
}
function snapshot(value, days) {
  const validTime =
    typeof value?.generatedAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/.test(
      value.generatedAt,
    ) &&
    Number.isFinite(dayValue(value.generatedAt.slice(0, 10))) &&
    Number.isFinite(Date.parse(value.generatedAt));
  if (
    !object(value) ||
    !COUNTERS.every((key) => count(value[key])) ||
    !validTime ||
    !Array.isArray(value.trend) ||
    value.trend.length !== days
  )
    throw invalid();
  let previous;
  const trend = value.trend.map((point) => {
    const day = dayValue(point?.day);
    if (
      !object(point) ||
      !Number.isFinite(day) ||
      (previous !== undefined && day !== previous + 86400000) ||
      !DAILY.every((key) => count(point[key]))
    )
      throw invalid();
    previous = day;
    return Object.freeze(
      Object.fromEntries(['day', ...DAILY].map((key) => [key, point[key]])),
    );
  });
  return Object.freeze({
    ...Object.fromEntries(COUNTERS.map((key) => [key, value[key]])),
    generatedAt: value.generatedAt,
    trend: Object.freeze(trend),
  });
}
function invalid() {
  return new ApiError('统计响应不完整或格式异常，请重试', {
    status: 502,
    code: 'DASHBOARD_INVALID_RESPONSE',
  });
}

/** Read the authenticated Backend snapshot. Errors remain errors, including 401/403. */
export async function fetchAdminDashboard({ days = 7 } = {}, options = {}) {
  if (!Number.isInteger(days) || days < 1 || days > 31)
    throw new RangeError('days须为1～31的整数');
  const data = await http.get('/admin/dashboard', {
    ...options,
    params: { days },
  });
  return snapshot(data, days);
}

/**
 * 历史统计概览接口（保留兼容）
 */
export const fetchAnalyticsOverview = ({ from, to } = {}, options = {}) =>
  http.get('/admin/analytics/overview', {
    ...options,
    params: { from, to },
  });
