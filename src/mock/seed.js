/**
 * Mock 种子数据。仅在 `npm run dev:mock` 下使用，不代表后端真实数据。
 * 所有账号密码均为 123456（与后端默认管理员一致），注册验证码固定为 123456。
 */
import xueyuanImage from '@/assets/images/canteen/学苑食堂.png';
import canteenImage2 from '@/assets/images/canteen/食堂2.png';
import canteenImage3 from '@/assets/images/canteen/食堂3.png';
import canteenImage4 from '@/assets/images/canteen/食堂4.png';
import nanbeiImage from '@/assets/images/stalls/南北风味.png';
import stallImage1 from '@/assets/images/stalls/档口01.webp';
import stallImage2 from '@/assets/images/stalls/档口02.jpg';
import beefNoodleImage from '@/assets/images/dishs/红烧牛肉面-学苑.png';
import beefNoodleImage2 from '@/assets/images/dishs/红烧牛肉面.jpg';
import claypotImage from '@/assets/images/dishs/煲仔饭.webp';
import tomatoBeefImage from '@/assets/images/dishs/番茄肥牛饭.jpg';
import sourNoodleImage from '@/assets/images/dishs/酸汤米线.png';
import chickenImage from '@/assets/images/dishs/黑胶鸡腿饭.png';
import sketchFood1 from '@/assets/images/decoration/手绘美食01.png';
import sketchFood2 from '@/assets/images/decoration/手绘美食02.png';
import sketchFood3 from '@/assets/images/decoration/手绘美食03.png';

export const MOCK_PASSWORD = '123456';
export const MOCK_VERIFICATION_CODE = '123456';

/** 管理端新建条目时没有上传图片，用这些占位图展示。 */
export const DEFAULT_IMAGES = {
  canteen: canteenImage2,
  stall: stallImage1,
  dish: sketchFood1,
};

const DAY = 24 * 60 * 60 * 1000;

/** 相对现在的 ISO 时间，便于生成“几天前”的数据。 */
function daysAgo(days, hours = 0) {
  return new Date(Date.now() - days * DAY - hours * 3600 * 1000).toISOString();
}

function user(id, account, nickname, role, extra = {}) {
  return {
    id,
    account,
    email: `${account}@foodtime.local`,
    nickname,
    role,
    password: MOCK_PASSWORD,
    account_status: 'active',
    created_at: daysAgo(30),
    ...extra,
  };
}

function dish(canteenId, stallId, slug, name, price, extra = {}) {
  return {
    id: `${stallId}-${slug}`,
    canteenId,
    stallId,
    name,
    price,
    rating: 0,
    description: '',
    valueNote: '',
    imageUrl: sketchFood1,
    gallery: [],
    recommendVotes: 0,
    avoidVotes: 0,
    ...extra,
  };
}

function review(id, dishId, userId, rating, comment, status, createdAt) {
  return { id, dishId, userId, rating, comment, status, createdAt };
}

/**
 * 生成一份全新的 mock 数据库。每次调用返回独立对象，测试之间互不影响。
 * @returns {object}
 */
export function createSeed() {
  const users = [
    user('u-superadmin', 'superadmin', '超管小周', 'superadmin', {
      created_at: daysAgo(90),
    }),
    user('u-admin', 'admin', '管理员阿花', 'admin', {
      created_at: daysAgo(60),
    }),
    user('u-student', 'student', '干饭同学', 'user'),
    user('u-foodie', 'foodie', '北交吃货', 'user', {
      created_at: daysAgo(0, 3),
    }),
    user('u-banned', 'banned', '被封禁的人', 'user', {
      account_status: 'banned',
    }),
  ];

  const canteens = [
    {
      id: 'xueyuan',
      name: '学苑食堂',
      shortName: '学苑',
      location: '北京交通大学主校区东侧',
      openHours: '06:30-09:00, 11:00-13:30, 17:00-19:30',
      avgPrice: '¥15',
      summary: '主校区人气最高的食堂，面食和盖饭选择多，饭点排队要趁早。',
      imageUrl: xueyuanImage,
    },
    {
      id: 'minghu',
      name: '明湖食堂',
      shortName: '明湖',
      location: '明湖旁',
      openHours: '11:00-13:30, 17:00-20:00',
      avgPrice: '¥18',
      summary: '靠近明湖，二楼有风味小炒，适合约饭。',
      imageUrl: canteenImage2,
    },
    {
      id: 'fanghua',
      name: '芳华食堂',
      shortName: '芳华',
      location: '学生公寓区',
      openHours: '06:30-20:30',
      avgPrice: '¥13',
      summary: '离宿舍最近，夜宵档口营业到很晚。',
      imageUrl: canteenImage3,
    },
    {
      id: 'tianyou',
      name: '天佑食堂',
      shortName: '天佑',
      location: '天佑会堂北侧',
      openHours: '11:00-13:00, 17:00-19:00',
      avgPrice: '¥20',
      summary: '新开的食堂，装修明亮，自选称重很受欢迎。',
      imageUrl: canteenImage4,
    },
  ];

  const stalls = [
    {
      id: 'xueyuan-nanbei',
      canteenId: 'xueyuan',
      name: '南北风味',
      avgPrice: '¥14 左右',
      summary: '北方面食加南方小吃，一碗红烧牛肉面是招牌。',
      imageUrl: nanbeiImage,
    },
    {
      id: 'xueyuan-gaifan',
      canteenId: 'xueyuan',
      name: '家常盖饭',
      avgPrice: '¥16 左右',
      summary: '现炒浇头，米饭可免费加。',
      imageUrl: stallImage1,
    },
    {
      id: 'minghu-xiaochao',
      canteenId: 'minghu',
      name: '风味小炒',
      avgPrice: '¥20 左右',
      summary: '一锅一炒，适合两三个人拼菜。',
      imageUrl: stallImage2,
    },
    {
      id: 'minghu-mixian',
      canteenId: 'minghu',
      name: '云南米线',
      avgPrice: '¥15 左右',
      summary: '酸汤和清汤两种锅底。',
      imageUrl: stallImage1,
    },
    {
      id: 'fanghua-baozai',
      canteenId: 'fanghua',
      name: '广式煲仔',
      avgPrice: '¥18 左右',
      summary: '砂锅现做，锅巴是灵魂。',
      imageUrl: stallImage2,
    },
    {
      id: 'tianyou-ziyuan',
      canteenId: 'tianyou',
      name: '自选称重',
      avgPrice: '按重量计价',
      summary: '荤素随便挑，3 元一两。',
      imageUrl: stallImage1,
    },
  ];

  const dishes = [
    dish('xueyuan', 'xueyuan-nanbei', 'niuroumian', '红烧牛肉面', 14, {
      rating: 4.5,
      description: '大块牛腱慢炖，汤头浓郁，面条筋道。',
      valueNote: '学苑必吃',
      imageUrl: beefNoodleImage,
      gallery: [beefNoodleImage2],
      recommendVotes: 128,
      avoidVotes: 6,
    }),
    dish('xueyuan', 'xueyuan-nanbei', 'roujiamo', '腊汁肉夹馍', 8, {
      rating: 4.3,
      description: '白吉馍烤得酥脆，肉汁足。',
      imageUrl: sketchFood2,
      recommendVotes: 56,
      avoidVotes: 4,
    }),
    dish('xueyuan', 'xueyuan-nanbei', 'liangpi', '擀面皮', 9, {
      rating: 3.9,
      description: '夏天限定，酸辣爽口。',
      imageUrl: sketchFood3,
      recommendVotes: 21,
      avoidVotes: 5,
    }),
    dish('xueyuan', 'xueyuan-gaifan', 'feiniufan', '番茄肥牛饭', 17, {
      rating: 5,
      description: '番茄熬出沙，肥牛片量足。',
      valueNote: '下饭',
      imageUrl: tomatoBeefImage,
      recommendVotes: 88,
      avoidVotes: 7,
    }),
    dish('xueyuan', 'xueyuan-gaifan', 'jituifan', '黑椒鸡腿饭', 16, {
      rating: 4.1,
      description: '整只去骨鸡腿，黑椒汁偏咸。',
      imageUrl: chickenImage,
      recommendVotes: 43,
      avoidVotes: 12,
    }),
    dish('minghu', 'minghu-xiaochao', 'gongbao', '宫保鸡丁', 18, {
      rating: 4.0,
      description: '花生米脆，微辣。',
      imageUrl: sketchFood2,
      recommendVotes: 30,
      avoidVotes: 6,
    }),
    dish('minghu', 'minghu-xiaochao', 'yuxiang', '鱼香肉丝', 16, {
      rating: 3.6,
      description: '偏甜，配饭不错。',
      imageUrl: sketchFood3,
      recommendVotes: 18,
      avoidVotes: 9,
    }),
    dish('minghu', 'minghu-mixian', 'suantang', '酸汤米线', 15, {
      rating: 4.4,
      description: '酸汤开胃，可以加肥牛。',
      imageUrl: sourNoodleImage,
      recommendVotes: 67,
      avoidVotes: 5,
    }),
    dish('fanghua', 'fanghua-baozai', 'larou', '腊味煲仔饭', 18, {
      rating: 5,
      description: '腊肠腊肉双拼，锅巴焦香。',
      valueNote: '锅巴党首选',
      imageUrl: claypotImage,
      recommendVotes: 95,
      avoidVotes: 3,
    }),
    dish('tianyou', 'tianyou-ziyuan', 'sucai', '时令素菜', 3, {
      rating: 3.8,
      description: '按两计价，每天换菜。',
      imageUrl: sketchFood1,
      recommendVotes: 12,
      avoidVotes: 2,
    }),
  ];

  const reviews = [
    review(
      'r-1',
      'xueyuan-nanbei-niuroumian',
      'u-student',
      5,
      '牛肉给得超多，汤喝光了。',
      'approved',
      daysAgo(3),
    ),
    review(
      'r-2',
      'xueyuan-nanbei-niuroumian',
      'u-foodie',
      4,
      '好吃但是中午排队太久。',
      'approved',
      daysAgo(1),
    ),
    review(
      'r-3',
      'xueyuan-gaifan-feiniufan',
      'u-student',
      5,
      '番茄汁拌饭一绝。',
      'approved',
      daysAgo(2),
    ),
    review(
      'r-4',
      'fanghua-baozai-larou',
      'u-foodie',
      5,
      '锅巴脆到响。',
      'approved',
      daysAgo(5),
    ),
    review(
      'r-5',
      'xueyuan-gaifan-jituifan',
      'u-foodie',
      2,
      '今天的鸡腿有点柴，酱也太咸。',
      'pending',
      daysAgo(0, 2),
    ),
    review(
      'r-6',
      'minghu-mixian-suantang',
      'u-student',
      4,
      '酸汤很正宗，就是有点烫嘴。',
      'pending',
      daysAgo(0, 1),
    ),
  ];

  const rants = [
    {
      id: 'rant-1',
      author: 'student',
      tag: '排队',
      content: '学苑中午 12 点的面食窗口能排到门口。',
      status: 'approved',
      createdAt: daysAgo(2),
    },
    {
      id: 'rant-2',
      author: 'foodie',
      tag: '价格',
      content: '明湖小炒又涨价了，一份宫保鸡丁要 18。',
      status: 'pending',
      createdAt: daysAgo(0, 4),
    },
    {
      id: 'rant-3',
      author: 'student',
      tag: '卫生',
      content: '芳华二楼的桌子希望能及时擦一下。',
      status: 'pending',
      createdAt: daysAgo(0, 2),
    },
  ];

  const submissions = [
    {
      id: 's-1',
      dish_name: '老北京炸酱面',
      canteen_id: 'xueyuan',
      canteen_name: '学苑食堂',
      stall_id: 'xueyuan-nanbei',
      stall_name: '南北风味',
      price: 13,
      description: '南北风味新上的炸酱面，黄瓜丝给得很多。',
      submitter_account: 'student',
      status: 'pending',
      created_at: daysAgo(0, 5),
    },
    {
      id: 's-2',
      dish_name: '番茄牛腩米线',
      canteen_id: 'minghu',
      canteen_name: '明湖食堂',
      stall_id: 'minghu-mixian',
      stall_name: '云南米线',
      price: 18,
      description: '新锅底，牛腩炖得软烂。',
      submitter_account: 'foodie',
      status: 'pending',
      created_at: daysAgo(0, 3),
    },
  ];

  const inviteCodes = [
    {
      code: 'FOOD2026',
      created_by: 'u-superadmin',
      used_by: null,
      expires_at: new Date(Date.now() + 7 * DAY).toISOString(),
    },
  ];

  const logs = [
    ['superadmin', 'update_role', 'user', 'u-admin', '将 admin 设为管理员', 20],
    ['admin', 'create_canteen', 'canteen', 'tianyou', '新增天佑食堂', 10],
    ['admin', 'audit_review', 'review', 'r-1', '通过点评', 3],
    ['admin', 'audit_rant', 'rant', 'rant-1', '通过吐槽', 2],
  ].map(([operator, action, targetType, targetId, detail, days], index) => ({
    id: `log-${index + 1}`,
    operator_account: operator,
    action,
    target_type: targetType,
    target_id: targetId,
    detail,
    created_at: daysAgo(days),
  }));

  return {
    users,
    canteens,
    stalls,
    dishes,
    reviews,
    rants,
    submissions,
    inviteCodes,
    logs,
    sequence: 100,
  };
}
