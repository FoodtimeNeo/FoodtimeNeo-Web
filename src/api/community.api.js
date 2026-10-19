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
