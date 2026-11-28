/**
 * Canonical 4-dimension dish tag vocabulary matching Backend Flyway V62 (`foodtime.dish_tags`).
 * Used as instant fallback when `/api/v1/dishes/tags` is still loading or mocked in tests.
 */
export const DISH_TAG_DIMENSIONS = Object.freeze([
  { code: 'category', label: '主食/品类' },
  { code: 'ingredient', label: '肉类/食材' },
  { code: 'method', label: '做法' },
  { code: 'style', label: '饮食偏向' },
]);

export const DEFAULT_DISH_TAGS = Object.freeze([
  // category
  {
    code: 'rice',
    label: '米饭/盖饭',
    dimension: 'category',
    dimensionLabel: '主食/品类',
    sortOrder: 10,
  },
  {
    code: 'noodle',
    label: '面食/粉面',
    dimension: 'category',
    dimensionLabel: '主食/品类',
    sortOrder: 20,
  },
  {
    code: 'western',
    label: '西餐/轻食',
    dimension: 'category',
    dimensionLabel: '主食/品类',
    sortOrder: 30,
  },
  {
    code: 'breakfast',
    label: '粥饼/早点',
    dimension: 'category',
    dimensionLabel: '主食/品类',
    sortOrder: 40,
  },
  {
    code: 'home_dish',
    label: '小炒/家常菜',
    dimension: 'category',
    dimensionLabel: '主食/品类',
    sortOrder: 50,
  },
  // ingredient
  {
    code: 'pork',
    label: '猪肉',
    dimension: 'ingredient',
    dimensionLabel: '肉类/食材',
    sortOrder: 110,
  },
  {
    code: 'poultry',
    label: '鸡鸭禽类',
    dimension: 'ingredient',
    dimensionLabel: '肉类/食材',
    sortOrder: 120,
  },
  {
    code: 'beef_lamb',
    label: '牛羊肉',
    dimension: 'ingredient',
    dimensionLabel: '肉类/食材',
    sortOrder: 130,
  },
  {
    code: 'seafood',
    label: '鱼虾海鲜',
    dimension: 'ingredient',
    dimensionLabel: '肉类/食材',
    sortOrder: 140,
  },
  {
    code: 'vegetarian',
    label: '素菜/蛋豆',
    dimension: 'ingredient',
    dimensionLabel: '肉类/食材',
    sortOrder: 150,
  },
  // method
  {
    code: 'steamed',
    label: '蒸',
    dimension: 'method',
    dimensionLabel: '做法',
    sortOrder: 210,
  },
  {
    code: 'stewed',
    label: '炖/煮/汤',
    dimension: 'method',
    dimensionLabel: '做法',
    sortOrder: 220,
  },
  {
    code: 'stir_fried',
    label: '炒/煎',
    dimension: 'method',
    dimensionLabel: '做法',
    sortOrder: 230,
  },
  {
    code: 'roasted',
    label: '烤',
    dimension: 'method',
    dimensionLabel: '做法',
    sortOrder: 240,
  },
  {
    code: 'fried',
    label: '炸/酥脆',
    dimension: 'method',
    dimensionLabel: '做法',
    sortOrder: 250,
  },
  {
    code: 'cold_braised',
    label: '凉拌/卤',
    dimension: 'method',
    dimensionLabel: '做法',
    sortOrder: 260,
  },
  // style
  {
    code: 'healthy',
    label: '健康清淡',
    dimension: 'style',
    dimensionLabel: '饮食偏向',
    sortOrder: 310,
  },
  {
    code: 'spicy',
    label: '香辣/麻辣',
    dimension: 'style',
    dimensionLabel: '饮食偏向',
    sortOrder: 320,
  },
  {
    code: 'savory',
    label: '下饭重口',
    dimension: 'style',
    dimensionLabel: '饮食偏向',
    sortOrder: 330,
  },
]);

const DEFAULT_LABEL_MAP = new Map(
  DEFAULT_DISH_TAGS.map((tag) => [tag.code, tag.label]),
);
const DEFAULT_ORDER_MAP = new Map(
  DEFAULT_DISH_TAGS.map((tag) => [tag.code, tag.sortOrder]),
);

export function groupDishTags(tags = DEFAULT_DISH_TAGS) {
  const source = Array.isArray(tags) && tags.length ? tags : DEFAULT_DISH_TAGS;
  const groups = new Map();
  for (const dim of DISH_TAG_DIMENSIONS) {
    groups.set(dim.code, {
      dimension: dim.code,
      dimensionLabel: dim.label,
      items: [],
    });
  }
  for (const tag of source) {
    if (!tag?.code) continue;
    const key = tag.dimension || 'style';
    if (!groups.has(key)) {
      groups.set(key, {
        dimension: key,
        dimensionLabel: tag.dimensionLabel || key,
        items: [],
      });
    }
    groups.get(key).items.push(tag);
  }
  return [...groups.values()].filter((g) => g.items.length > 0);
}

export function dishTagLabel(code, catalog = DEFAULT_DISH_TAGS) {
  if (!code) return '';
  if (Array.isArray(catalog) && catalog.length) {
    const found = catalog.find((item) => item?.code === code);
    if (found?.label) return found.label;
  }
  return DEFAULT_LABEL_MAP.get(code) || code;
}

export function dishTagBadges(codes, catalog = DEFAULT_DISH_TAGS, limit = 3) {
  if (!Array.isArray(codes) || !codes.length) return [];
  const seen = new Set();
  const ordered = [];
  for (const raw of codes) {
    const code = String(raw || '').trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    ordered.push(code);
  }
  ordered.sort(
    (a, b) =>
      (DEFAULT_ORDER_MAP.get(a) ?? 999) - (DEFAULT_ORDER_MAP.get(b) ?? 999),
  );
  return ordered.slice(0, limit).map((code) => ({
    code,
    label: dishTagLabel(code, catalog),
  }));
}
