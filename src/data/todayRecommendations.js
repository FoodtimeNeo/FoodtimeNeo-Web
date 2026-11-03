import beefNoodles from '@/assets/images/dishs/红烧牛肉面.jpg';
import chickenLegRice from '@/assets/images/dishs/黑胶鸡腿饭.png';
import claypotRice from '@/assets/images/dishs/煲仔饭.webp';
import beefRice from '@/assets/images/dishs/红烧牛肉面-学苑.png';
import stallFood from '@/assets/images/stalls/档口01.webp';

// 首页先使用本地 mock，后续可直接替换为推荐接口返回的同结构数据。
export const todayRecommendations = [
  {
    id: 'mock-beef-noodles',
    name: '红烧牛肉面',
    intro: '阿姨今天的牛肉给得很实在，记住这碗热乎的。',
    rating: 4.9,
    price: 16,
    canteenName: '学苑食堂',
    coverImageUrl: beefNoodles,
    localImage: true,
  },
  {
    id: 'mock-chicken-leg-rice',
    name: '黑椒鸡腿饭',
    intro: '一口鸡腿一口溏心蛋，午饭能量补满。',
    rating: 4.8,
    price: 18,
    canteenName: '学苑食堂',
    coverImageUrl: chickenLegRice,
    localImage: true,
  },
  {
    id: 'mock-claypot-rice',
    name: '麻辣香锅',
    intro: '按自己的口味挑配菜，辣得过瘾也吃得踏实。',
    rating: 4.6,
    price: 22,
    canteenName: '明湖食堂',
    coverImageUrl: claypotRice,
    localImage: true,
  },
  {
    id: 'mock-tomato-beef-rice',
    name: '学苑招牌饭',
    intro: '酸甜汤汁裹住肥牛，适合今天想吃点热乎的你。',
    rating: 4.8,
    price: 20,
    canteenName: '学苑食堂',
    coverImageUrl: beefRice,
    localImage: true,
  },
  {
    id: 'mock-sour-rice-noodles',
    name: '今日小炒',
    intro: '酸香开胃，配一把小青菜就是舒服的一餐。',
    rating: 4.7,
    price: 14,
    canteenName: '明湖食堂',
    coverImageUrl: stallFood,
    localImage: true,
  },
];
