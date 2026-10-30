import { http } from './http.js';

/**
 * 手机端契约与默认预览数据（当后端接口未就绪或处于联调阶段时优雅回退）
 * 严格对齐 FoodtimeNeo-Android/docs/admin-dashboard-contract.md
 */
export const MOCK_ADMIN_DASHBOARD = {
  registeredUsers: 1248,
  onlineUsers: 86,
  reviews: 3862,
  replies: 5917,
  posts: 742,
  halls: 7,
  stalls: 46,
  dishes: 618,
  generatedAt: '2026-10-30T12:00:00Z',
  isMock: true,
  trend: [
    {
      day: '2026-10-24',
      newUsers: 7,
      newReviews: 68,
      newReplies: 104,
      newPosts: 12,
      onlinePeak: 91,
    },
    {
      day: '2026-10-25',
      newUsers: 9,
      newReviews: 75,
      newReplies: 118,
      newPosts: 15,
      onlinePeak: 96,
    },
    {
      day: '2026-10-26',
      newUsers: 6,
      newReviews: 61,
      newReplies: 97,
      newPosts: 11,
      onlinePeak: 88,
    },
    {
      day: '2026-10-27',
      newUsers: 12,
      newReviews: 88,
      newReplies: 143,
      newPosts: 19,
      onlinePeak: 112,
    },
    {
      day: '2026-10-28',
      newUsers: 8,
      newReviews: 79,
      newReplies: 126,
      newPosts: 16,
      onlinePeak: 105,
    },
    {
      day: '2026-10-29',
      newUsers: 11,
      newReviews: 95,
      newReplies: 158,
      newPosts: 22,
      onlinePeak: 127,
    },
    {
      day: '2026-10-30',
      newUsers: 10,
      newReviews: 92,
      newReplies: 151,
      newPosts: 24,
      onlinePeak: 119,
    },
  ],
};

/**
 * 获取平台数据看板（对齐手机端 admin-dashboard 接口契约）
 * 尝试请求真实接口，若接口尚未上线或请求失败则回退到 mock 数据，确保前端预览和功能可用
 * @param {{ days?: number }} params
 * @param {object} options
 */
export async function fetchAdminDashboard({ days = 7 } = {}, options = {}) {
  try {
    const res = await http.get('/admin/dashboard', {
      ...options,
      params: { days },
    });
    if (res && typeof res === 'object') {
      return { ...res, isMock: false };
    }
    return { ...MOCK_ADMIN_DASHBOARD };
  } catch (error) {
    // 捕获 404 / 500 / 网络异常，优先优雅降级回退至 mock 预览数据
    return { ...MOCK_ADMIN_DASHBOARD, isMock: true, loadError: error?.message };
  }
}

/**
 * 历史统计概览接口（保留兼容）
 */
export const fetchAnalyticsOverview = ({ from, to } = {}, options = {}) =>
  http.get('/admin/analytics/overview', {
    ...options,
    params: { from, to },
  });
