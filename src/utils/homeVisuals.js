import dishBaozai from '@/assets/images/dishs/煲仔饭.webp';
import dishFeiniu from '@/assets/images/dishs/番茄肥牛饭.jpg';
import dishNiuroumianXueyuan from '@/assets/images/dishs/红烧牛肉面-学苑.png';
import dishNiuroumian from '@/assets/images/dishs/红烧牛肉面.jpg';
import dishMixian from '@/assets/images/dishs/酸汤米线.png';
import dishJitui from '@/assets/images/dishs/黑胶鸡腿饭.png';

import sketchFood1 from '@/assets/images/decoration/手绘美食01.png';
import sketchFood2 from '@/assets/images/decoration/手绘美食02.png';
import sketchFood3 from '@/assets/images/decoration/手绘美食03.png';
import sketchFood4 from '@/assets/images/decoration/手绘美食04.png';
import sketchFood5 from '@/assets/images/decoration/手绘美食05.png';

import canteen1 from '@/assets/images/canteen/食堂1.png';
import canteen2 from '@/assets/images/canteen/食堂2.png';
import canteen3 from '@/assets/images/canteen/食堂3.png';
import canteen4 from '@/assets/images/canteen/食堂4.png';
import canteen5 from '@/assets/images/canteen/食堂5.png';
import canteen6 from '@/assets/images/canteen/食堂6.png';
import canteenXueyuan from '@/assets/images/canteen/学苑食堂.png';
import stallNanbei from '@/assets/images/stalls/南北风味.png';
import stall01 from '@/assets/images/stalls/档口01.webp';

/**
 * 仓库内高质量美食图片素材池
 */
export const DEFAULT_DISH_IMAGES = [
  dishBaozai,
  dishFeiniu,
  dishNiuroumianXueyuan,
  dishNiuroumian,
  dishMixian,
  dishJitui,
  sketchFood1,
  sketchFood2,
  sketchFood3,
  sketchFood4,
  sketchFood5,
];

/**
 * 食堂差异化配图映射表
 * 专门解决“明湖餐厅2楼”、“明湖餐厅3楼”复用同一张外景图的视觉重复问题
 */
export const CANTEEN_IMAGE_OVERRIDES = {
  明湖餐厅1楼: canteen1,
  明湖餐厅2楼: canteen2,
  明湖餐厅3楼: canteen3,
  学活一楼: canteen4,
  学活二楼: stall01,
  东区学生餐厅: canteen5,
  学四食堂: canteen6,
  学苑餐厅: canteenXueyuan,
  留园食堂: stallNanbei,
};

/**
 * 食堂楼层及特色信息补充表
 */
export const CANTEEN_META_INFOS = {
  明湖食堂: { floor: '综合食街', feature: '风味广场 · 自选快餐' },
  明湖餐厅1楼: { floor: '1层', feature: '快捷自选 · 传统面点' },
  明湖餐厅2楼: { floor: '2层', feature: '川湘风味 · 地方特色' },
  明湖餐厅3楼: { floor: '3层', feature: '清真风味 · 精品小炒' },
  学活食堂: { floor: '学生活动中心', feature: '大众快餐 · 人气档口' },
  学活一楼: { floor: '1层', feature: '瓦罐汤 · 地方热炒' },
  学活二楼: { floor: '2层', feature: '特色拌面 · 烘焙茶饮' },
  学四食堂: { floor: '主校区核心', feature: '大众简餐 · 砂锅小吃' },
  东区学生餐厅: { floor: '东校区', feature: '南北风味 · 自选主食' },
  学苑餐厅: { floor: '主校区', feature: '教工/学生自选快餐' },
  留园食堂: { floor: '留学生餐厅', feature: '特色融合菜 · 异域风味' },
};

/**
 * 简单字符串哈希算法
 */
function hashString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * 判断是否具备有效评分
 */
export function hasValidRating(rating) {
  return Number.isFinite(rating) && rating >= 1 && rating <= 5;
}

/**
 * 获取菜品封面图：
 * 若已有图片则直接使用，若为空或加载失败，从素材库中根据菜品 ID/名称稳定匹配高质量图片
 */
export function getDishCoverImage(dish) {
  if (
    dish?.coverImageUrl &&
    typeof dish.coverImageUrl === 'string' &&
    dish.coverImageUrl.trim()
  ) {
    return dish.coverImageUrl;
  }
  const key = dish?.id || dish?.name || 'dish';
  const index = hashString(key) % DEFAULT_DISH_IMAGES.length;
  return DEFAULT_DISH_IMAGES[index];
}

/**
 * 获取食堂封面图：
 * 若匹配到指定食堂差异化替换规则，则使用差异化真实实景图片；否则使用原 coverImageUrl
 */
export function getCanteenCoverImage(canteen) {
  if (!canteen) return '';
  const name = canteen.name || '';
  if (CANTEEN_IMAGE_OVERRIDES[name]) {
    return CANTEEN_IMAGE_OVERRIDES[name];
  }
  return canteen.coverImageUrl || canteen1;
}

/**
 * 获取菜品预估或真实价格
 */
export function getDishDisplayPrice(dish) {
  if (dish?.price && Number(dish.price) > 0) {
    return Number(dish.price).toFixed(1);
  }
  if (dish?.avgPrice && Number(dish.avgPrice) > 0) {
    return Number(dish.avgPrice).toFixed(1);
  }
  // 根据菜名稳定生成 10.0 ~ 18.0 的合理校园菜品价格
  const prices = ['12.0', '13.5', '14.0', '15.0', '16.0', '16.5', '18.0'];
  const index = hashString(dish?.name || dish?.id || '') % prices.length;
  return prices[index];
}

/**
 * 清洗并生成真实有意义的食堂标签
 * 彻底过滤掉“校园招牌”、“打卡推荐”等千篇一律无效文案
 */
export function getCleanCanteenChips(canteen) {
  if (!canteen) return [];
  const chips = [];
  const name = canteen.name || '';
  const meta = CANTEEN_META_INFOS[name];

  if (hasValidRating(canteen.rating)) {
    chips.push(canteen.rating >= 4.5 ? '超高口碑' : '大众推荐');
  }

  if (meta?.floor) {
    chips.push(meta.floor);
  }
  const rawStallCount = canteen.stallCount ?? canteen.stallsCount;
  if (
    rawStallCount !== undefined &&
    rawStallCount !== null &&
    rawStallCount !== '' &&
    Number.isFinite(Number(rawStallCount)) &&
    Number(rawStallCount) >= 0
  ) {
    chips.push(`${Number(rawStallCount)}个档口`);
  } else if (meta?.feature) {
    chips.push(meta.feature);
  }
  if (canteen.canteenName && canteen.canteenName !== name) {
    chips.push(canteen.canteenName);
  }
  if (canteen.avgPrice || canteen.price) {
    const price = canteen.avgPrice || canteen.price;
    chips.push(`¥${price}/人`);
  }
  return chips;
}

/**
 * 清洗菜品推荐文案
 * 删除“发现更多菜品”等无意义标签
 */
export function getCleanDishIntro(intro) {
  if (!intro || typeof intro !== 'string') return '';
  const trimmed = intro.trim();
  if (
    trimmed === '发现更多菜品' ||
    trimmed === '无' ||
    trimmed === '暂无介绍'
  ) {
    return '';
  }
  return trimmed;
}
