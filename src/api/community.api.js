import { http, ApiError } from './http.js';
import { useAuthStore } from '@/store/useAuthStore.js';

/**
 * 社区预置 Mock 数据。
 * 包含多图、单图、不同宽高比配图，展示校园美食手账风格。
 */
export const INITIAL_POSTS = [
  {
    id: 'post-101',
    title: '学一餐厅瓦罐汤！入秋后的第一碗热汤绝了🍲',
    content:
      '今天下课后直奔学一二楼，点了老鸭汤和排骨汤。汤底很浓郁，瓦罐煨得很透，排骨软烂入味，配上一碗热米饭和手撕包菜，瞬间驱散寒气。窗口阿姨态度特别好，强烈推荐大家去尝尝！',
    author: {
      id: 'u-101',
      name: '北交干饭达人',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-101-1',
        url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600, // 4:3
      },
      {
        id: 'img-101-2',
        url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1000, // 4:5
      },
      {
        id: 'img-101-3',
        url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 800, // 1:1
      },
    ],
    status: 'approved',
    createdAt: '2026-10-19T10:15:00.000Z',
    likeCount: 42,
    favoriteCount: 16,
    commentCount: 3,
  },
  {
    id: 'post-102',
    title: '明湖餐厅酸汤牛肉粉！酸辣开胃巨过瘾🍜',
    content:
      '酸汤底很地道，牛肉片分量适中，米粉爽滑劲道。中午十二点去的时候人比较多，建议提前或者稍微晚一点去避开高峰。加一份溏心蛋浸入酸汤是神仙吃法！',
    author: {
      id: 'u-102',
      name: '交大嗦粉人',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-102-1',
        url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1060, // 竖长图
      },
      {
        id: 'img-102-2',
        url: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 800,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-19T09:30:00.000Z',
    likeCount: 35,
    favoriteCount: 9,
    commentCount: 2,
  },
  {
    id: 'post-103',
    title: '留园铁板烧！滋滋冒油的幸福感🥩',
    content:
      '留园一楼铁板照烧鸡腿饭，配菜丰富有西兰花和玉米粒，黑椒汁浓郁拌饭简直一绝！价格实惠分量足，干饭人必打卡。',
    author: {
      id: 'u-103',
      name: '铁板专家小王',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-103-1',
        url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 533, // 横图 3:2
      },
    ],
    status: 'approved',
    createdAt: '2026-10-18T18:40:00.000Z',
    likeCount: 88,
    favoriteCount: 27,
    commentCount: 4,
  },
  {
    id: 'post-104',
    title: '东区二楼手工水饺，皮薄馅大热腾腾🥟',
    content:
      '荠菜鲜肉和三鲜都很推荐，现包现煮的口感特别劲道。配上香醋和辣椒油，晚自习前吃上一盘整个人都暖和了。',
    author: {
      id: 'u-104',
      name: '自习室常客',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-104-1',
        url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 800,
      },
      {
        id: 'img-104-2',
        url: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-18T12:10:00.000Z',
    likeCount: 19,
    favoriteCount: 5,
    commentCount: 1,
  },
  {
    id: 'post-105',
    title: '学苑餐厅西点房蛋挞出炉！酥到掉渣🥐',
    content:
      '刚出炉的葡式蛋挞奶香浓郁，挞皮层层起酥，甜度恰到好处，下午两点到三点通常有新鲜出炉的批次，下课路过可以带两个当下午茶点心。',
    author: {
      id: 'u-105',
      name: '甜品研究所',
      avatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-105-1',
        url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1100, // 竖构图
      },
    ],
    status: 'approved',
    createdAt: '2026-10-17T15:20:00.000Z',
    likeCount: 64,
    favoriteCount: 22,
    commentCount: 2,
  },
  {
    id: 'post-107',
    title: '清真餐厅手抓羊肉与大盘鸡！聚餐首选🍗',
    content:
      '清真餐厅的大盘鸡份量太实诚了，土豆软糯沙甜，宽面吸饱了浓香汤汁。羊肉串肉质紧实，孜然焦香四溢，几位室友聚餐人均二十吃到撑！',
    author: {
      id: 'u-107',
      name: '清真食堂迷',
      avatar:
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-107-1',
        url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600, // 4:3
      },
      {
        id: 'img-107-2',
        url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1000,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-17T11:45:00.000Z',
    likeCount: 51,
    favoriteCount: 18,
    commentCount: 5,
  },
  {
    id: 'post-108',
    title: '学二二楼自选麻辣烫！骨汤浓郁选菜自由🥦',
    content:
      '可以自己选骨汤、微辣或者藤椒风味。菜品很新鲜，特别推荐藕片、小油菜和手工牛肉丸，称重计价很良心，淋上一勺蒜泥和麻酱，满足感拉满。',
    author: {
      id: 'u-108',
      name: '麻辣烫品鉴家',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-108-1',
        url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1080, // 长竖图
      },
    ],
    status: 'approved',
    createdAt: '2026-10-16T19:20:00.000Z',
    likeCount: 73,
    favoriteCount: 31,
    commentCount: 6,
  },
  {
    id: 'post-109',
    title: '明湖韩式石锅拌饭！金黄锅巴嘎嘣脆🍳',
    content:
      '端上来的时候还在滋滋作响，趁热把太阳蛋、西葫芦、胡萝卜丝和辣酱拌匀。底部那层焦脆焦脆的锅巴简直是这碗饭的灵魂！',
    author: {
      id: 'u-109',
      name: '锅巴收割机',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-109-1',
        url: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 750,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-16T12:30:00.000Z',
    likeCount: 29,
    favoriteCount: 11,
    commentCount: 2,
  },
  {
    id: 'post-110',
    title: '东区一层老北京炸酱面，菜码丰富酱香浓郁🍜',
    content:
      '手擀面劲道爽口，配菜有黄瓜丝、心儿里美萝卜丝和黄豆芽。黑亮油润的炸酱肉丁分明，拌开后每一根面条都裹满了酱香味。',
    author: {
      id: 'u-110',
      name: '老北京面王',
      avatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-110-1',
        url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 533, // 3:2 横图
      },
      {
        id: 'img-110-2',
        url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 800,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-15T18:10:00.000Z',
    likeCount: 47,
    favoriteCount: 14,
    commentCount: 3,
  },
  {
    id: 'post-111',
    title: '留园二楼川湘小炒：小炒黄牛肉鲜辣下饭🌶️',
    content:
      '猛火现炒的黄牛肉片嫩滑多汁，配上野山椒和香菜段，辣意直击味蕾。配上两碗大米饭，碳水快乐直接拉满！',
    author: {
      id: 'u-111',
      name: '无辣不欢同学',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-111-1',
        url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 980,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-15T12:05:00.000Z',
    likeCount: 62,
    favoriteCount: 19,
    commentCount: 4,
  },
  {
    id: 'post-112',
    title: '学一早点铺鲜肉小笼包配热豆浆🥟',
    content:
      '早八人的元气早点！小笼包咬开有一汪鲜美的肉汁，包子皮软糯微甜。搭配一杯现磨热豆浆，开启一整天的活力学习。',
    author: {
      id: 'u-112',
      name: '早八追光者',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-112-1',
        url: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
      {
        id: 'img-112-2',
        url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 800,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-14T07:45:00.000Z',
    likeCount: 38,
    favoriteCount: 8,
    commentCount: 1,
  },
  {
    id: 'post-113',
    title: '学苑日式照烧鸡排饭！溏心蛋裹着米饭太香了🍱',
    content:
      '外皮煎得金黄酥脆的厚切鸡排，淋上咸甜浓稠的照烧酱汁。用筷子戳破溏心蛋，蛋液流在晶莹的米饭上，性价比超高的一餐。',
    author: {
      id: 'u-113',
      name: '日料爱好者',
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-113-1',
        url: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1050, // 竖长图
      },
    ],
    status: 'approved',
    createdAt: '2026-10-14T12:15:00.000Z',
    likeCount: 56,
    favoriteCount: 20,
    commentCount: 3,
  },
  {
    id: 'post-114',
    title: '清真烤肉拌饭！特调千岛酱与烤肉粒的绝妙碰撞🥙',
    content:
      '肉量铺得满满当当，烤鸡肉外皮焦香内里多汁，配菜有爽口的生菜丝和腌黄瓜。特调酱料搅拌开来，每一口都很满足！',
    author: {
      id: 'u-114',
      name: '肉食主义者',
      avatar:
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-114-1',
        url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-13T17:50:00.000Z',
    likeCount: 44,
    favoriteCount: 15,
    commentCount: 2,
  },
  {
    id: 'post-115',
    title: '明湖负一层柳州螺蛳粉加超大炸蛋！酸笋臭香谁懂啊🌶️',
    content:
      '螺蛳熬制的红油高汤，配菜有酸豆角、木耳丝和香脆花生。浸饱了汤汁的虎皮炸蛋咬下去直接爆汁，嗦粉的快乐不过如此！',
    author: {
      id: 'u-115',
      name: '柳州嗦粉大户',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-115-1',
        url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1120, // 超长竖图
      },
      {
        id: 'img-115-2',
        url: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 800,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-13T12:00:00.000Z',
    likeCount: 95,
    favoriteCount: 41,
    commentCount: 7,
  },
  {
    id: 'post-116',
    title: '东区广式生滚牛肉粥加现炸香脆油条🥣',
    content:
      '生滚滑牛肉片薄且嫩，米粒已经熬煮得绵密起胶。冬天晚自习出来喝上一大碗，胃里暖洋洋的，还可以免费加葱花和胡椒粉。',
    author: {
      id: 'u-116',
      name: '广式靓汤达人',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-116-1',
        url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 550,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-12T20:30:00.000Z',
    likeCount: 33,
    favoriteCount: 12,
    commentCount: 1,
  },
  {
    id: 'post-117',
    title: '学二窗口脆皮烤鸭饭！鸭皮油脂丰盈甜面酱绝配🦆',
    content:
      '烤鸭外皮烤得深红油亮，切块整齐。配上半颗卤蛋、烫青菜和浓甜面酱，米饭吸饱了鸭油肉汁，性价比极高的经典午餐。',
    author: {
      id: 'u-117',
      name: '烤鸭脑袋',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-117-1',
        url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 800, // 正方形 1:1
      },
      {
        id: 'img-117-2',
        url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-12T11:50:00.000Z',
    likeCount: 68,
    favoriteCount: 25,
    commentCount: 4,
  },
  {
    id: 'post-118',
    title: '西门外咖啡馆燕麦拿铁与抹茶瑞士卷☕🍰',
    content:
      '期末复习周的续命去处。燕麦奶香和深烘咖啡豆很搭，抹茶瑞士卷蛋糕体湿润细腻，中间的红豆奶油甜而不腻，拍照也很出片。',
    author: {
      id: 'u-118',
      name: '咖啡自习中',
      avatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-118-1',
        url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1020, // 竖长图
      },
      {
        id: 'img-118-2',
        url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 800,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-11T15:10:00.000Z',
    likeCount: 82,
    favoriteCount: 39,
    commentCount: 5,
  },
  {
    id: 'post-119',
    title: '留园教工餐厅对外开放时的招牌红烧狮子头🧆',
    content:
      '大颗狮子头肥瘦比例三七开，肉馅里切了爽脆的荸荠碎，口感丝毫不油腻，酱汁浓郁拌饭可以连吃两碗！',
    author: {
      id: 'u-119',
      name: '教工食堂常客',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-119-1',
        url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-11T12:00:00.000Z',
    likeCount: 46,
    favoriteCount: 17,
    commentCount: 2,
  },
  {
    id: 'post-120',
    title: '学一麻辣香锅！放学后三个人拼一大锅的快乐🥘',
    content:
      '土豆片煎得焦焦脆脆，宽粉 Q 弹，培根和午餐肉浸满了麻辣酱香。三个人点了一大盆才六十多块钱，干饭人社交必备！',
    author: {
      id: 'u-120',
      name: '香锅小分队',
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-120-1',
        url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1040, // 竖长图
      },
      {
        id: 'img-120-2',
        url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-10T18:30:00.000Z',
    likeCount: 91,
    favoriteCount: 35,
    commentCount: 8,
  },
  {
    id: 'post-121',
    title: '学苑老坛酸菜鱼米线，汤白鱼嫩酸爽过瘾🐟',
    content:
      '老坛酸菜酸香扑鼻，黑鱼片去骨切薄无刺，煮得白嫩嫩的。吸溜一大口米线再喝两口酸汤，胃口瞬间打开。',
    author: {
      id: 'u-121',
      name: '酸汤鱼专家',
      avatar:
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-121-1',
        url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 720,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-10T12:10:00.000Z',
    likeCount: 53,
    favoriteCount: 21,
    commentCount: 3,
  },
  {
    id: 'post-106',
    title: '（待审核示例）测试新帖发布审核机制',
    content: '此帖处于待审核状态，正常情况下不会在公共列表中展示。',
    author: {
      id: 'u-admin',
      name: '系统测试员',
      avatar: '',
    },
    images: [
      {
        id: 'img-106-1',
        url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
    ],
    status: 'pending',
    createdAt: '2026-10-19T11:00:00.000Z',
    likeCount: 0,
    favoriteCount: 0,
    commentCount: 0,
  },
];

export const INITIAL_COMMENTS = {
  'post-101': [
    {
      id: 'cmt-101-1',
      postId: 'post-101',
      author: {
        id: 'u-201',
        name: '红果园干饭喵',
        avatar:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80',
      },
      content: '这个汤冬天喝真的太舒服了！排骨汤每次去都必点！',
      createdAt: '2026-10-19T10:45:00.000Z',
      likeCount: 3,
    },
    {
      id: 'cmt-101-2',
      postId: 'post-101',
      author: {
        id: 'u-202',
        name: '九号楼学长',
        avatar: '',
      },
      content: '排队人多吗？大概几点去不用等太久？',
      createdAt: '2026-10-19T11:05:00.000Z',
      likeCount: 1,
    },
    {
      id: 'cmt-101-3',
      postId: 'post-101',
      author: {
        id: 'u-203',
        name: '晨跑小分队',
        avatar: '',
      },
      content: '老鸭汤里面加枸杞的，特别养生。',
      createdAt: '2026-10-19T11:20:00.000Z',
      likeCount: 0,
    },
  ],
  'post-102': [
    {
      id: 'cmt-102-1',
      postId: 'post-102',
      author: {
        id: 'u-204',
        name: '香菜爱好者',
        avatar: '',
      },
      content: '可以多加一份香菜吗？看着太有食欲了！',
      createdAt: '2026-10-19T09:40:00.000Z',
      likeCount: 2,
    },
  ],
};

// 本地内存与 LocalStorage 缓存
let postsMemory = null;
let commentsMemory = null;

function cloneDeep(data) {
  return JSON.parse(JSON.stringify(data));
}

function getStoredPosts() {
  if (postsMemory) return postsMemory;
  try {
    const raw = localStorage.getItem('ft_community_posts');
    if (raw) {
      postsMemory = JSON.parse(raw);
      return postsMemory;
    }
  } catch {
    // 忽略 localStorage 错误
  }
  postsMemory = cloneDeep(INITIAL_POSTS);
  return postsMemory;
}

function saveStoredPosts(posts) {
  postsMemory = posts;
  try {
    localStorage.setItem('ft_community_posts', JSON.stringify(posts));
  } catch {
    // 忽略存储超额
  }
}

function getStoredComments() {
  if (commentsMemory) return commentsMemory;
  try {
    const raw = localStorage.getItem('ft_community_comments');
    if (raw) {
      commentsMemory = JSON.parse(raw);
      return commentsMemory;
    }
  } catch {
    // 忽略 localStorage 错误
  }
  commentsMemory = cloneDeep(INITIAL_COMMENTS);
  return commentsMemory;
}

function saveStoredComments(comments) {
  commentsMemory = comments;
  try {
    localStorage.setItem('ft_community_comments', JSON.stringify(comments));
  } catch {
    // 忽略存储超额
  }
}

/**
 * 重置 Mock 数据（用于测试或重置体验）
 */
export function resetCommunityMockData() {
  postsMemory = cloneDeep(INITIAL_POSTS);
  commentsMemory = cloneDeep(INITIAL_COMMENTS);
  try {
    localStorage.removeItem('ft_community_posts');
    localStorage.removeItem('ft_community_comments');
  } catch {
    // 忽略
  }
}

/**
 * 获取社区帖子列表（默认仅展示 approved 审核通过的帖子，按时间倒序）
 * @param {Object} [params]
 * @param {number} [params.page=1]
 * @param {number} [params.size=20]
 * @param {string|null} [params.status='approved'] - 'approved' | 'pending' | 'all'
 * @param {Object} [options]
 */
export async function fetchCommunityPosts(
  { page = 1, size = 20, status = 'approved' } = {},
  options = {},
) {
  if (options.useRealApi) {
    return await http.get('/community/posts', {
      ...options,
      params: { page, size, status },
    });
  }

  // 前端高保真 Mock 适配器（严格按审核状态过滤与时间倒序）
  const all = getStoredPosts();
  const filtered = all.filter((item) => {
    if (status && status !== 'all') {
      return item.status === status;
    }
    return true;
  });

  filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const offset = (page - 1) * size;
  const items = filtered.slice(offset, offset + size);

  return {
    items: cloneDeep(items),
    total: filtered.length,
    page,
    size,
  };
}

/**
 * 获取帖子详情
 * @param {string} postId
 * @param {Object} [options]
 */
export async function fetchCommunityPostDetail(postId, options = {}) {
  if (options.useRealApi) {
    return await http.get(
      `/community/posts/${encodeURIComponent(postId)}`,
      options,
    );
  }

  const all = getStoredPosts();
  const target = all.find((p) => p.id === postId);
  if (!target) {
    throw new ApiError('帖子不存在或已被删除', {
      status: 404,
      code: 'NOT_FOUND',
    });
  }
  return cloneDeep(target);
}

/**
 * 发送新帖子（默认审核状态为 pending 待审核）
 * @param {Object} payload
 * @param {string} payload.title
 * @param {string} payload.content
 * @param {Array<string|Object>} [payload.images]
 * @param {Object} [options]
 */
export async function createCommunityPost(payload, options = {}) {
  const { title, content, images = [] } = payload;
  if (!title || !title.trim()) {
    throw new ApiError('帖子标题不能为空', {
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  }
  if (!content || !content.trim()) {
    throw new ApiError('帖子内容不能为空', {
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  if (options.useRealApi) {
    return await http.post('/community/posts', payload, options);
  }

  let authUser;
  try {
    const auth = useAuthStore();
    authUser = {
      id: auth.user?.id || 'u-current',
      name: auth.displayName || '热心干饭人',
      avatar: auth.user?.avatar || '',
    };
  } catch {
    authUser = {
      id: 'u-visitor',
      name: '校园干饭人',
      avatar: '',
    };
  }

  const normalizedImages = images.map((img, index) => {
    if (typeof img === 'string') {
      return {
        id: `img-${Date.now()}-${index}`,
        url: img,
        width: 800,
        height: 800,
      };
    }
    return {
      id: img.id || `img-${Date.now()}-${index}`,
      url: img.url || '',
      width: img.width || 800,
      height: img.height || 800,
    };
  });

  const newPost = {
    id: `post-${Date.now()}`,
    title: title.trim(),
    content: content.trim(),
    author: authUser,
    images: normalizedImages,
    status: 'pending', // 审核机制：默认为 pending 待审核
    createdAt: new Date().toISOString(),
    likeCount: 0,
    favoriteCount: 0,
    commentCount: 0,
  };

  const all = getStoredPosts();
  all.unshift(newPost);
  saveStoredPosts(all);

  return cloneDeep(newPost);
}

/**
 * 获取指定帖子的评论列表
 * @param {string} postId
 * @param {Object} [options]
 */
export async function fetchPostComments(postId, options = {}) {
  if (options.useRealApi) {
    return await http.get(
      `/community/posts/${encodeURIComponent(postId)}/comments`,
      options,
    );
  }

  const commentsMap = getStoredComments();
  const list = commentsMap[postId] || [];
  const sorted = [...list].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return cloneDeep(sorted);
}

/**
 * 为帖子发表新评论
 * @param {string} postId
 * @param {Object} payload
 * @param {string} payload.content
 * @param {Object} [options]
 */
export async function createPostComment(postId, payload, options = {}) {
  const { content } = payload;
  if (!content || !content.trim()) {
    throw new ApiError('评论内容不能为空', {
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  if (options.useRealApi) {
    return await http.post(
      `/community/posts/${encodeURIComponent(postId)}/comments`,
      payload,
      options,
    );
  }

  let authUser;
  try {
    const auth = useAuthStore();
    authUser = {
      id: auth.user?.id || 'u-current',
      name: auth.displayName || '热心同学',
      avatar: auth.user?.avatar || '',
    };
  } catch {
    authUser = {
      id: 'u-visitor',
      name: '美食观察员',
      avatar: '',
    };
  }

  const newComment = {
    id: `cmt-${Date.now()}`,
    postId,
    author: authUser,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    likeCount: 0,
  };

  const commentsMap = getStoredComments();
  if (!commentsMap[postId]) {
    commentsMap[postId] = [];
  }
  commentsMap[postId].push(newComment);
  saveStoredComments(commentsMap);

  const allPosts = getStoredPosts();
  const targetPost = allPosts.find((p) => p.id === postId);
  if (targetPost) {
    targetPost.commentCount = (targetPost.commentCount || 0) + 1;
    saveStoredPosts(allPosts);
  }

  return cloneDeep(newComment);
}
