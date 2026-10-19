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
    id: 'post-122',
    title: '学一二楼黄焖鸡米饭！浓稠汤汁拌饭太绝了🍗',
    content:
      '鸡腿肉切块非常大，炖得软烂多汁，香菇和青椒吸饱了浓郁的酱汁。一定要点微辣，把汤汁浇在热米饭上，碳水狂欢停不下来！',
    author: {
      id: 'u-122',
      name: '思源东楼干饭王',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-122-1',
        url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600, // 4:3
      },
      {
        id: 'img-122-2',
        url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1000,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-09T18:20:00.000Z',
    likeCount: 78,
    favoriteCount: 29,
    commentCount: 4,
  },
  {
    id: 'post-123',
    title: '明湖铁板鸭血粉丝汤加脆锅巴！热气腾腾暖胃首选🍲',
    content:
      '鸭血细嫩无腥味，鸭胗和油豆腐给得很多，白胡椒粉的微辣感特别暖胃。加一块刚出炉的脆锅巴泡进汤里，吸饱了汤汁半脆半软，简直绝配！',
    author: {
      id: 'u-123',
      name: '粉丝汤品鉴官',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-123-1',
        url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1080, // 竖长图
      },
    ],
    status: 'approved',
    createdAt: '2026-10-09T12:00:00.000Z',
    likeCount: 65,
    favoriteCount: 24,
    commentCount: 3,
  },
  {
    id: 'post-124',
    title: '留园一楼脆皮炸鸡汉堡套餐！赶DDL时的大满足🍔',
    content:
      '刚出炉的炸鸡外皮咔嚓脆，一口咬下去肉汁直接爆开。配上大份粗薯条和冰可乐，写论文刷题的疲惫一扫而空！',
    author: {
      id: 'u-124',
      name: '九号楼熬夜大师',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-124-1',
        url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
      {
        id: 'img-124-2',
        url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 800,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-08T20:45:00.000Z',
    likeCount: 89,
    favoriteCount: 34,
    commentCount: 5,
  },
  {
    id: 'post-125',
    title: '东区三楼清汤牛腩面！牛腩大块白萝卜清甜🍜',
    content:
      '牛腩炖得极其软烂，筷子一夹就散。汤头清亮不油腻，炖透的白萝卜甘甜多汁，撒上一把芹菜粒和葱花，连汤都能喝个精光。',
    author: {
      id: 'u-125',
      name: '牛腩面忠粉',
      avatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-125-1',
        url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1040,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-08T12:30:00.000Z',
    likeCount: 57,
    favoriteCount: 19,
    commentCount: 2,
  },
  {
    id: 'post-126',
    title: '清真餐厅手抓羊排配洋葱孜然！焦香爆汁🐑',
    content:
      '羊排贴骨肉连筋带肉，烤得焦香金黄，孜然和辣椒面撒得很均匀。配上生洋葱条解腻提味，聚餐必点硬菜！',
    author: {
      id: 'u-126',
      name: '大西北风味控',
      avatar:
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-126-1',
        url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-07T18:10:00.000Z',
    likeCount: 104,
    favoriteCount: 48,
    commentCount: 6,
  },
  {
    id: 'post-127',
    title: '学苑三楼川味冒菜！午餐自选快乐🥗',
    content:
      '红油香浓，豆皮、鸭血、宽粉和牛肉丸都煮得很入味，最后淋上一大勺蒜泥香油，配两碗米饭吃得心满意足。',
    author: {
      id: 'u-127',
      name: '冒菜研究员',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-127-1',
        url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 800,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-07T12:05:00.000Z',
    likeCount: 49,
    favoriteCount: 16,
    commentCount: 3,
  },
  {
    id: 'post-128',
    title: '学二地下一层烤冷面！加里脊金针菇夜宵顶流🌯',
    content:
      '酸甜辣口味调得恰到好处，冷面皮煎得焦软适中，裹着洋葱碎、香菜和热腾腾的煎里脊肉，晚自习下课必须来一份！',
    author: {
      id: 'u-128',
      name: '八号楼夜猫子',
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-128-1',
        url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1020,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-06T21:30:00.000Z',
    likeCount: 92,
    favoriteCount: 38,
    commentCount: 5,
  },
  {
    id: 'post-129',
    title: '学一手工刀削面配西红柿鸡蛋卤！量大管饱🍜',
    content:
      '阿姨削面动作行云流水，面叶中间厚两边薄，口感劲道有嚼劲。西红柿鸡蛋卤汤汁酸甜浓郁，撒上一勺辣椒油，实惠又顶饱！',
    author: {
      id: 'u-129',
      name: '碳水爱好者小张',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-129-1',
        url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-06T12:15:00.000Z',
    likeCount: 41,
    favoriteCount: 13,
    commentCount: 2,
  },
  {
    id: 'post-130',
    title: '明湖韩式炸鸡拌饭配蜂蜜芥末酱！甜脆解压🍱',
    content:
      '无骨炸鸡块炸得金黄酥脆，外层裹满了特调蜂蜜芥末酱。拌上海苔碎和溏心荷包蛋，甜香与鸡肉的鲜嫩完美融合。',
    author: {
      id: 'u-130',
      name: '炸鸡星球常驻',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-130-1',
        url: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1080,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-05T17:40:00.000Z',
    likeCount: 77,
    favoriteCount: 28,
    commentCount: 4,
  },
  {
    id: 'post-131',
    title: '留园二楼排骨煨藕汤！粉糯拉丝清甜可口🍲',
    content:
      '湖北风味的排骨莲藕汤，莲藕粉糯拉丝，排骨肉质鲜甜。汤色微微泛红，清润不腻，秋天喝上一瓦罐整个人都暖和了。',
    author: {
      id: 'u-131',
      name: '江城老饕',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-131-1',
        url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 700,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-05T11:50:00.000Z',
    likeCount: 68,
    favoriteCount: 25,
    commentCount: 3,
  },
  {
    id: 'post-132',
    title: '东区二楼金牌烧肉双拼饭！叉烧油鸡外脆里嫩🍗',
    content:
      '广式明炉烧味，叉烧肥瘦相间蜜汁浓郁，油鸡皮滑肉嫩。配上秘制酸梅酱和姜葱蓉，拌米饭吃简直停不下来。',
    author: {
      id: 'u-132',
      name: '烧腊发烧友',
      avatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-132-1',
        url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-04T12:20:00.000Z',
    likeCount: 52,
    favoriteCount: 18,
    commentCount: 2,
  },
  {
    id: 'post-133',
    title: '学苑一楼沙县柳叶蒸饺与花生酱飘香拌面🥟',
    content:
      '蒸饺皮薄馅鲜，蘸上特调甜辣酱；热气腾腾的拌面裹满浓香的花生酱，几块钱就能吃得饱饱的平价快乐！',
    author: {
      id: 'u-133',
      name: '沙县小吃十级学者',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-133-1',
        url: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-04T08:30:00.000Z',
    likeCount: 39,
    favoriteCount: 12,
    commentCount: 2,
  },
  {
    id: 'post-134',
    title: '清真餐厅孜然牛肉炒拉条子！镬气十足筋道弹牙🍜',
    content:
      '现拉的手工拉条子粗细均匀极其筋道，大火爆炒出浓郁的镬气。牛肉片嫩滑，青红椒爽脆，孜然香气扑鼻，北方人的心头好。',
    author: {
      id: 'u-134',
      name: '面食爱好者王同学',
      avatar:
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-134-1',
        url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 980,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-03T18:00:00.000Z',
    likeCount: 84,
    favoriteCount: 31,
    commentCount: 4,
  },
  {
    id: 'post-135',
    title: '学二二楼黑椒铁板肥牛饭！滋滋作响拌饭神仙🥩',
    content:
      '铁板烧得滚烫，肥牛片迅速变色锁住肉汁，黑椒洋葱汁浇上去的瞬间香气四溢。拌上一颗半熟温泉蛋，整碗饭被蛋液包裹太诱人了。',
    author: {
      id: 'u-135',
      name: '铁板狂热分子',
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-135-1',
        url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-03T12:10:00.000Z',
    likeCount: 71,
    favoriteCount: 26,
    commentCount: 3,
  },
  {
    id: 'post-136',
    title: '明湖二楼正宗海南鸡饭！姜葱酱配鸡油饭绝了🍚',
    content:
      '白切文昌鸡皮爽肉滑，骨髓带红刚刚熟透。三色蘸料（红辣椒酱、姜葱蓉、甜黑酱油）风味各异，米饭是用鸡汤煮的格外甘香。',
    author: {
      id: 'u-136',
      name: '南洋风味寻觅者',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-136-1',
        url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1040,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-02T12:00:00.000Z',
    likeCount: 63,
    favoriteCount: 22,
    commentCount: 3,
  },
  {
    id: 'post-137',
    title: '留园地下一层潮汕鲜牛肉汤河粉！汤清肉嫩爽口🍜',
    content:
      '鲜牛肉现切现烫，保持了粉嫩的质感。牛骨高汤清甜醇正，河粉爽滑吸味，配上一小碟沙茶酱蘸牛肉，百吃不腻。',
    author: {
      id: 'u-137',
      name: '潮汕美食课代表',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-137-1',
        url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 750,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-02T18:30:00.000Z',
    likeCount: 58,
    favoriteCount: 20,
    commentCount: 2,
  },
  {
    id: 'post-138',
    title: '学一西侧现炒糖炒栗子与热烘烘的烤红薯🍠🌰',
    content:
      '秋冬校园里最治愈的味道！栗子颗颗开口好剥，甜糯沙软不粘壳；烤红薯流着蜜汁，捧在手心里暖融融的，下课带回宿舍吃超幸福。',
    author: {
      id: 'u-138',
      name: '秋冬暖手宝',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-138-1',
        url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1000,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-01T16:20:00.000Z',
    likeCount: 96,
    favoriteCount: 42,
    commentCount: 5,
  },
  {
    id: 'post-139',
    title: '学苑西点房杨枝甘露毛巾卷！果肉满满甜而不腻🍰',
    content:
      '班戟皮薄软筋道，包裹着新鲜芒果粒和西柚果肉。特调芒果奶油甜度适中，下午复习累了来一块，精神立刻提起来了！',
    author: {
      id: 'u-139',
      name: '甜品治愈所',
      avatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-139-1',
        url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
    ],
    status: 'approved',
    createdAt: '2026-10-01T14:10:00.000Z',
    likeCount: 83,
    favoriteCount: 35,
    commentCount: 4,
  },
  {
    id: 'post-140',
    title: '东区小火锅单人套餐！番茄菌汤双拼鸳鸯锅🍲',
    content:
      '一个人也能畅快吃火锅！番茄浓汤底酸甜浓郁，涮肥牛和响铃卷一绝。菜品自选称重，一人一锅干净卫生，下课独享美味。',
    author: {
      id: 'u-140',
      name: '单人干饭王者',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-140-1',
        url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 960,
      },
    ],
    status: 'approved',
    createdAt: '2026-09-30T18:40:00.000Z',
    likeCount: 74,
    favoriteCount: 27,
    commentCount: 3,
  },
  {
    id: 'post-141',
    title: '学二早点档口香脆煎饼果子！双蛋双薄脆酱香四溢🍳',
    content:
      '绿豆面糊摊得薄脆金黄，刷上特制面酱和红油辣酱，撒葱花黑芝麻。趁热咬上一大口，薄脆在口中咔嚓作响，早八排队也值了！',
    author: {
      id: 'u-141',
      name: '晨间觅食鸟',
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-141-1',
        url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 600,
      },
    ],
    status: 'approved',
    createdAt: '2026-09-30T07:40:00.000Z',
    likeCount: 66,
    favoriteCount: 21,
    commentCount: 3,
  },
  {
    id: 'post-142',
    title: '明湖水煮肉片配豆芽金针菇！麻辣红亮超级下饭🌶️',
    content:
      '肉片滑嫩多汁，垫底的金针菇和豆芽吸足了麻辣鲜香的红油汤汁。顶上撒了花椒面和干辣椒段，滚油一浇香气扑鼻，配大米饭吃简直神仙！',
    author: {
      id: 'u-142',
      name: '川菜胃本胃',
      avatar:
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80',
    },
    images: [
      {
        id: 'img-142-1',
        url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1080,
      },
    ],
    status: 'approved',
    createdAt: '2026-09-29T12:10:00.000Z',
    likeCount: 88,
    favoriteCount: 36,
    commentCount: 4,
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
    {
      id: 'cmt-102-2',
      postId: 'post-102',
      author: {
        id: 'u-205',
        name: '八号楼干饭王',
        avatar: '',
      },
      content: '酸汤加辣很爽，米粉分量很足，中午吃完下午自习不犯困！',
      createdAt: '2026-10-19T10:10:00.000Z',
      likeCount: 4,
    },
  ],
  'post-103': [
    {
      id: 'cmt-103-1',
      postId: 'post-103',
      author: {
        id: 'u-206',
        name: '机械小李',
        avatar: '',
      },
      content: '留园一楼铁板鸡排真是永远的神，黑椒汁必须多浇两勺！',
      createdAt: '2026-10-18T19:00:00.000Z',
      likeCount: 5,
    },
    {
      id: 'cmt-103-2',
      postId: 'post-103',
      author: {
        id: 'u-207',
        name: '嘉园自习人',
        avatar: '',
      },
      content: '米饭可以免费续吗？每次都觉得汤汁拌饭不够吃。',
      createdAt: '2026-10-18T19:25:00.000Z',
      likeCount: 1,
    },
    {
      id: 'cmt-103-3',
      postId: 'post-103',
      author: {
        id: 'u-103',
        name: '铁板专家小王',
        avatar: '',
      },
      content: '@嘉园自习人 可以让阿姨多打一点饭的，阿姨很热情！',
      createdAt: '2026-10-18T19:30:00.000Z',
      likeCount: 3,
    },
    {
      id: 'cmt-103-4',
      postId: 'post-103',
      author: {
        id: 'u-208',
        name: '晚自习出逃',
        avatar: '',
      },
      content: '西兰花很新鲜，不会煮得软烂，好评！',
      createdAt: '2026-10-18T20:10:00.000Z',
      likeCount: 0,
    },
  ],
  'post-107': [
    {
      id: 'cmt-107-1',
      postId: 'post-107',
      author: {
        id: 'u-209',
        name: '肉食星人',
        avatar: '',
      },
      content: '大盘鸡的宽面简直是灵魂！每次去都要加一份宽面！',
      createdAt: '2026-10-17T12:00:00.000Z',
      likeCount: 6,
    },
    {
      id: 'cmt-107-2',
      postId: 'post-107',
      author: {
        id: 'u-210',
        name: '经管学姐',
        avatar: '',
      },
      content: '清真餐厅的手抓饭也很正宗，胡萝卜甜甜的。',
      createdAt: '2026-10-17T12:35:00.000Z',
      likeCount: 2,
    },
    {
      id: 'cmt-107-3',
      postId: 'post-107',
      author: {
        id: 'u-211',
        name: '土豆爱好者',
        avatar: '',
      },
      content: '土豆炖得很沙很入味，推荐 3-4 个人一起吃大份。',
      createdAt: '2026-10-17T13:10:00.000Z',
      likeCount: 1,
    },
  ],
  'post-108': [
    {
      id: 'cmt-108-1',
      postId: 'post-108',
      author: {
        id: 'u-212',
        name: '藤椒狂人',
        avatar: '',
      },
      content: '学二二楼的藤椒骨汤汤底真的一绝，麻麻辣辣很过瘾！',
      createdAt: '2026-10-16T19:40:00.000Z',
      likeCount: 7,
    },
    {
      id: 'cmt-108-2',
      postId: 'post-108',
      author: {
        id: 'u-213',
        name: '爱吃藕片的小刘',
        avatar: '',
      },
      content: '称重很公道，蔬菜种类很多，还有香菇贡丸和鱼豆腐！',
      createdAt: '2026-10-16T20:00:00.000Z',
      likeCount: 3,
    },
  ],
  'post-115': [
    {
      id: 'cmt-115-1',
      postId: 'post-115',
      author: {
        id: 'u-214',
        name: '螺蛳粉本命',
        avatar: '',
      },
      content: '那个大炸蛋泡在红油酸笋汤里直接封神！必须点炸蛋！',
      createdAt: '2026-10-13T12:20:00.000Z',
      likeCount: 12,
    },
    {
      id: 'cmt-115-2',
      postId: 'post-115',
      author: {
        id: 'u-215',
        name: '下课冲刺第一名',
        avatar: '',
      },
      content: '十二点下课直接排长队，建议十一点四十分或者一点以后去！',
      createdAt: '2026-10-13T12:45:00.000Z',
      likeCount: 5,
    },
    {
      id: 'cmt-115-3',
      postId: 'post-115',
      author: {
        id: 'u-216',
        name: '微辣就好',
        avatar: '',
      },
      content: '不能吃太辣的同学记得选微辣，中辣已经很猛了。',
      createdAt: '2026-10-13T13:00:00.000Z',
      likeCount: 2,
    },
  ],
  'post-120': [
    {
      id: 'cmt-120-1',
      postId: 'post-120',
      author: {
        id: 'u-217',
        name: '宿舍干饭四人组',
        avatar: '',
      },
      content: '我们宿舍每周五晚上必去拼一锅香锅，培根和土豆片炒得太香了！',
      createdAt: '2026-10-10T19:00:00.000Z',
      likeCount: 8,
    },
    {
      id: 'cmt-120-2',
      postId: 'post-120',
      author: {
        id: 'u-218',
        name: '香锅小能手',
        avatar: '',
      },
      content: '一定要加方便面！方便面炒得微焦吸收了酱料，碳水天花板。',
      createdAt: '2026-10-10T19:15:00.000Z',
      likeCount: 6,
    },
  ],
  'post-122': [
    {
      id: 'cmt-122-1',
      postId: 'post-122',
      author: {
        id: 'u-219',
        name: '黄焖鸡忠实信徒',
        avatar: '',
      },
      content: '学一这个窗口开了好多年了，汤汁浓得能挂在饭粒上，绝！',
      createdAt: '2026-10-09T18:40:00.000Z',
      likeCount: 4,
    },
    {
      id: 'cmt-122-2',
      postId: 'post-122',
      author: {
        id: 'u-220',
        name: '今天吃饱了吗',
        avatar: '',
      },
      content: '微辣刚好，鸡肉软烂，配一碗紫菜蛋花汤很舒服。',
      createdAt: '2026-10-09T19:05:00.000Z',
      likeCount: 2,
    },
  ],
  'post-126': [
    {
      id: 'cmt-126-1',
      postId: 'post-126',
      author: {
        id: 'u-221',
        name: '烤羊肉串狂热者',
        avatar: '',
      },
      content: '这个羊排真的不膻，肥瘦相间烤得很透，洋葱丝是解腻神配菜！',
      createdAt: '2026-10-07T18:45:00.000Z',
      likeCount: 9,
    },
    {
      id: 'cmt-126-2',
      postId: 'post-126',
      author: {
        id: 'u-222',
        name: '组会解压人',
        avatar: '',
      },
      content: '开完组会拉着同门去吃，瞬间回血！人均二十几性价比超高。',
      createdAt: '2026-10-07T19:20:00.000Z',
      likeCount: 5,
    },
  ],
  'post-128': [
    {
      id: 'cmt-128-1',
      postId: 'post-128',
      author: {
        id: 'u-223',
        name: '夜宵小霸王',
        avatar: '',
      },
      content: '学二烤冷面是我的深夜白月光，多刷糖醋酱，洋葱烤出甜味最香！',
      createdAt: '2026-10-06T21:45:00.000Z',
      likeCount: 8,
    },
    {
      id: 'cmt-128-2',
      postId: 'post-128',
      author: {
        id: 'u-224',
        name: '主楼自习生',
        avatar: '',
      },
      content: '晚上九点多去经常要排七八个人，师傅动作特别利索。',
      createdAt: '2026-10-06T22:00:00.000Z',
      likeCount: 3,
    },
  ],
  'post-135': [
    {
      id: 'cmt-135-1',
      postId: 'post-135',
      author: {
        id: 'u-225',
        name: '牛肉盖饭迷',
        avatar: '',
      },
      content: '滋滋作响端上来的时候仪式感拉满，黑椒味很浓，肥牛分量给得很足！',
      createdAt: '2026-10-03T12:30:00.000Z',
      likeCount: 5,
    },
    {
      id: 'cmt-135-2',
      postId: 'post-135',
      author: {
        id: 'u-226',
        name: '七号楼干饭小队',
        avatar: '',
      },
      content: '温泉蛋一定要戳破拌开，每一颗米粒都裹着蛋液和黑椒汁！',
      createdAt: '2026-10-03T12:50:00.000Z',
      likeCount: 4,
    },
  ],
  'post-138': [
    {
      id: 'cmt-138-1',
      postId: 'post-138',
      author: {
        id: 'u-227',
        name: '秋天第一颗栗子',
        avatar: '',
      },
      content: '栗子真的很好剥！而且没有坏果，热乎乎的甜糯可口。',
      createdAt: '2026-10-01T16:50:00.000Z',
      likeCount: 6,
    },
    {
      id: 'cmt-138-2',
      postId: 'post-138',
      author: {
        id: 'u-228',
        name: '红薯真香定律',
        avatar: '',
      },
      content: '红薯流蜜，皮烤得焦焦的很容易撕开，晚上自习备考利器。',
      createdAt: '2026-10-01T17:15:00.000Z',
      likeCount: 3,
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
