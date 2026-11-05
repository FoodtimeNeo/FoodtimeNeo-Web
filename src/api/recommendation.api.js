import { http, ApiError } from './http.js';

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const reasons = [
  'GOOD_REPUTATION',
  'RECENTLY_POPULAR',
  'DAILY_DISCOVERY',
  'LESS_EXPOSED',
];

export function recommendationCards(data) {
  const invalid = () => {
    throw new ApiError('今日推荐数据异常，请稍后重试', { code: 'PROTOCOL' });
  };
  if (
    !data ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
    Number.isNaN(Date.parse(`${data.date}T00:00:00Z`)) ||
    new Date(`${data.date}T00:00:00Z`).toISOString().slice(0, 10) !==
      data.date ||
    typeof data.algorithmVersion !== 'string' ||
    !data.algorithmVersion.trim() ||
    !Array.isArray(data.items) ||
    !Number.isInteger(data.total) ||
    data.total !== data.items.length
  )
    invalid();
  const seen = new Set();
  return data.items.map((item) => {
    if (
      !item ||
      ['dishId', 'diningHallId', 'stallId'].some(
        (key) => !uuid.test(item[key]),
      ) ||
      ['dishName', 'diningHallName', 'stallName', 'reason'].some(
        (key) => typeof item[key] !== 'string' || !item[key].trim(),
      ) ||
      seen.has(item.dishId) ||
      !Number.isInteger(item.reviewCount) ||
      item.reviewCount < 0 ||
      !(
        item.averageRating === null ||
        (Number.isFinite(item.averageRating) &&
          item.averageRating >= 1 &&
          item.averageRating <= 5)
      ) ||
      !(item.imageUrl === null || typeof item.imageUrl === 'string') ||
      !['QUALITY', 'EXPLORE'].includes(item.recommendationType) ||
      !reasons.includes(item.reasonCode) ||
      !Number.isFinite(item.recommendationScore) ||
      item.recommendationScore < 0 ||
      item.recommendationScore > 1
    )
      invalid();
    seen.add(item.dishId);
    return {
      id: item.dishId,
      name: item.dishName,
      canteenName: `${item.diningHallName} · ${item.stallName}`,
      intro: item.reason,
      rating: item.averageRating,
      coverImageUrl: item.imageUrl,
      route: {
        name: 'dishDetail',
        params: {
          canteenId: item.diningHallId,
          stallId: item.stallId,
          dishId: item.dishId,
        },
      },
    };
  });
}

export async function fetchDailyRecommendations(options = {}) {
  return recommendationCards(await http.get('/recommendations/daily', options));
}
