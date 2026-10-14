/**
 * Mock 后端：按真实接口的路径、权限和响应结构 { code, message, data } 处理请求。
 * 只在 `npm run dev:mock` 下由 axios adapter 调用，不发出任何网络请求。
 * 权限规则对齐后端（含 fix/admin-audit-access 等修复分支的行为），
 * 便于在没有后端时走通登录、点评、审核、内容管理和超管流程。
 */
import { DEFAULT_IMAGES, MOCK_VERIFICATION_CODE } from './seed.js';

const TOKEN_PREFIX = 'mock-token.';
const ROLES = ['user', 'admin', 'superadmin'];

class MockError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function fail(status, code, message) {
  throw new MockError(status, code, message);
}

function toCamel(key) {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/** 把管理端提交的 snake_case 字段转成存储用的 camelCase，丢弃空字段。 */
function pickFields(payload, keys) {
  const result = {};
  for (const key of keys) {
    if (payload[key] === undefined) continue;
    result[toCamel(key)] = payload[key];
  }
  return result;
}

function now() {
  return new Date().toISOString();
}

function byNewest(field) {
  return (a, b) => String(b[field]).localeCompare(String(a[field]));
}

function paginate(list, query) {
  const page = Math.max(1, Number(query.page) || 1);
  const perPage = Math.max(1, Number(query.per_page) || 20);
  const start = (page - 1) * perPage;
  return {
    items: list.slice(start, start + perPage),
    total: list.length,
    page,
    per_page: perPage,
  };
}

function publicUser(user) {
  const rest = { ...user };
  delete rest.password;
  return rest;
}

/**
 * 创建一个绑定到 db 的 mock 服务。db 会被原地修改，调用方负责持久化。
 * @param {object} db createSeed() 的返回值或其持久化副本
 */
export function createMockServer(db) {
  db.votes ??= [];

  const nextId = (prefix) => `${prefix}-${(db.sequence += 1)}`;
  const findUser = (id) => db.users.find((item) => item.id === id);
  const findCanteen = (id) => db.canteens.find((item) => item.id === id);
  const findStall = (id) => db.stalls.find((item) => item.id === id);
  const findDish = (id) => db.dishes.find((item) => item.id === id);

  function record(operator, action, targetType, targetId, detail) {
    db.logs.push({
      id: nextId('log'),
      operator_account: operator.account,
      action,
      target_type: targetType,
      target_id: targetId,
      detail,
      created_at: now(),
    });
  }

  function dishOut(dish) {
    const stall = findStall(dish.stallId);
    const canteen = findCanteen(dish.canteenId);
    return {
      ...dish,
      stallName: stall?.name ?? '',
      canteenName: canteen?.name ?? '',
    };
  }

  function stallOut(stall) {
    return {
      ...stall,
      dishes: db.dishes
        .filter((dish) => dish.stallId === stall.id)
        .map(dishOut),
    };
  }

  function reviewerName(userId) {
    return findUser(userId)?.nickname ?? '匿名同学';
  }

  function reviewAdminOut(review) {
    const dish = findDish(review.dishId);
    return {
      id: review.id,
      status: review.status,
      rating: review.rating,
      comment: review.comment,
      reason: review.reason ?? '',
      reviewer: reviewerName(review.userId),
      dish_id: review.dishId,
      dish_name: dish?.name ?? '已删除的菜品',
      canteen_name: findCanteen(dish?.canteenId)?.name ?? '',
      stall_name: findStall(dish?.stallId)?.name ?? '',
      created_at: review.createdAt,
    };
  }

  /** 点评审核通过后，用已通过点评的平均分刷新菜品评分。 */
  function refreshRating(dishId) {
    const dish = findDish(dishId);
    if (!dish) return;
    const ratings = db.reviews
      .filter((item) => item.dishId === dishId && item.status === 'approved')
      .map((item) => item.rating);
    if (!ratings.length) return;
    const average =
      ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
    dish.rating = Math.round(average * 10) / 10;
  }

  function removeDishes(predicate) {
    const removed = new Set(db.dishes.filter(predicate).map((dish) => dish.id));
    db.dishes = db.dishes.filter((dish) => !removed.has(dish.id));
    db.reviews = db.reviews.filter((review) => !removed.has(review.dishId));
    db.votes = db.votes.filter((vote) => !removed.has(vote.dishId));
  }

  function currentUser(ctx) {
    if (!ctx.token) return null;
    const user = findUser(ctx.token.slice(TOKEN_PREFIX.length));
    if (!ctx.token.startsWith(TOKEN_PREFIX) || !user) {
      fail(401, 'AUTH_401_001', '登录已过期，请重新登录');
    }
    if (user.account_status === 'banned') {
      fail(403, 'AUTH_403_002', '账号已被封禁');
    }
    return user;
  }

  function requireUser(ctx) {
    const user = currentUser(ctx);
    if (!user) fail(401, 'AUTH_401_001', '请先登录');
    return user;
  }

  function requireAdmin(ctx) {
    const user = requireUser(ctx);
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      fail(403, 'AUTH_403_001', '权限不足');
    }
    return user;
  }

  function requireSuperadmin(ctx) {
    const user = requireUser(ctx);
    if (user.role !== 'superadmin') fail(403, 'AUTH_403_001', '权限不足');
    return user;
  }

  function validInviteCode(code) {
    return db.inviteCodes.find(
      (item) =>
        item.code === code &&
        !item.used_by &&
        new Date(item.expires_at) > new Date(),
    );
  }

  function requireAuditBody(body) {
    if (!['approved', 'rejected'].includes(body.status)) {
      fail(422, 'AUDIT_422_001', '审核结果只能是通过或驳回');
    }
    const reason = String(body.reason ?? '').trim();
    if (!reason) fail(422, 'AUDIT_422_002', '请填写审核原因');
    return reason;
  }

  function register({ body }) {
    const email = String(body.email ?? '').trim();
    if (db.users.some((item) => item.email === email)) {
      fail(409, 'AUTH_409_001', '该邮箱已注册');
    }
    if (body.verification_code !== MOCK_VERIFICATION_CODE) {
      fail(
        422,
        'AUTH_422_002',
        `验证码错误（Mock 模式固定为 ${MOCK_VERIFICATION_CODE}）`,
      );
    }
    const role = body.role === 'admin' ? 'admin' : 'user';
    let invite = null;
    if (role === 'admin') {
      invite = validInviteCode(body.invite_code);
      if (!invite) fail(422, 'AUTH_422_003', '邀请码无效或已过期');
    }
    const base = email.split('@')[0] || 'user';
    let account = base;
    let suffix = 2;
    while (db.users.some((item) => item.account === account)) {
      account = `${base}${suffix}`;
      suffix += 1;
    }
    const user = {
      id: nextId('u'),
      account,
      email,
      nickname: String(body.nickname ?? '').trim() || account,
      role,
      password: body.password,
      account_status: 'active',
      created_at: now(),
    };
    db.users.push(user);
    if (invite) invite.used_by = user.id;
    return [201, publicUser(user)];
  }

  function login({ body }) {
    const loginId = String(body.login_id ?? '').trim();
    const user = db.users.find(
      (item) => item.account === loginId || item.email === loginId,
    );
    if (!user || user.password !== body.password) {
      fail(401, 'AUTH_401_002', '账号或密码错误');
    }
    if (user.account_status === 'banned') {
      fail(403, 'AUTH_403_002', '账号已被封禁');
    }
    return { ...publicUser(user), token: TOKEN_PREFIX + user.id };
  }

  function currentInviteCode(ctx) {
    const user = requireAdmin(ctx);
    const code = db.inviteCodes
      .filter((item) => item.created_by === user.id)
      .reverse()
      .find((item) => validInviteCode(item.code));
    return code ? { code: code.code, expires_at: code.expires_at } : null;
  }

  function generateInviteCode(ctx) {
    const user = requireAdmin(ctx);
    const code = {
      code: Math.random().toString(36).slice(2, 10).toUpperCase(),
      created_by: user.id,
      used_by: null,
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    };
    db.inviteCodes.push(code);
    record(
      user,
      'generate_invite_code',
      'invite_code',
      code.code,
      '生成邀请码',
    );
    return [201, { code: code.code, expires_at: code.expires_at }];
  }

  function getCanteen({ params }) {
    const canteen = findCanteen(params.id);
    if (!canteen) fail(404, 'DINING_404_001', '食堂不存在');
    return canteen;
  }

  function listStalls({ params }) {
    if (!findCanteen(params.id)) fail(404, 'DINING_404_001', '食堂不存在');
    return db.stalls
      .filter((stall) => stall.canteenId === params.id)
      .map(stallOut);
  }

  function rankings() {
    const stamps = ['人气王', '回头客', '口碑好'];
    return [...db.dishes]
      .filter((dish) => dish.rating > 0)
      .sort(
        (a, b) => b.rating - a.rating || b.recommendVotes - a.recommendVotes,
      )
      .slice(0, 10)
      .map((dish, index) => ({
        rank: index + 1,
        dishId: dish.id,
        canteenId: dish.canteenId,
        dishName: dish.name,
        score: dish.rating,
        stamp: stamps[index] ?? '',
      }));
  }

  function dailyRecommendations() {
    return [...db.dishes]
      .sort((a, b) => b.recommendVotes - a.recommendVotes)
      .slice(0, 4)
      .map((dish) => ({
        id: 'daily-' + dish.id,
        dishId: dish.id,
        canteenId: dish.canteenId,
        name: dish.name,
        canteenName: findCanteen(dish.canteenId)?.name ?? '',
        stall: findStall(dish.stallId)?.name ?? '',
        price: dish.price,
        rating: dish.rating,
        imageUrl: dish.imageUrl,
      }));
  }

  function getDish({ params }) {
    const dish = findDish(params.id);
    if (!dish) fail(404, 'DINING_404_002', '菜品不存在');
    return dishOut(dish);
  }

  function dishReviews({ params }) {
    return db.reviews
      .filter((item) => item.dishId === params.id && item.status === 'approved')
      .sort(byNewest('createdAt'))
      .map((item) => ({
        id: item.id,
        rating: item.rating,
        comment: item.comment,
        reviewer: reviewerName(item.userId),
        createdAt: item.createdAt,
      }));
  }

  /** 推荐 / 避雷，每人每道菜每种只能投一次。 */
  function voteDish(kind) {
    return (ctx) => {
      const user = requireUser(ctx);
      const dish = findDish(ctx.params.id);
      if (!dish) fail(404, 'DINING_404_002', '菜品不存在');
      const voted = db.votes.some(
        (vote) =>
          vote.userId === user.id &&
          vote.dishId === dish.id &&
          vote.kind === kind,
      );
      if (voted) fail(409, 'DISH_409_001', '你已经投过这一票了');
      db.votes.push({ userId: user.id, dishId: dish.id, kind });
      if (kind === 'recommend') dish.recommendVotes += 1;
      else dish.avoidVotes += 1;
      return {
        recommendVotes: dish.recommendVotes,
        avoidVotes: dish.avoidVotes,
      };
    };
  }

  function createReview(ctx) {
    const user = requireUser(ctx);
    const { dish_id: dishId, rating, comment } = ctx.body;
    if (!findDish(dishId)) fail(404, 'DINING_404_002', '菜品不存在');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      fail(422, 'REVIEW_422_001', '评分须为 1–5 的整数');
    }
    const text = String(comment ?? '').trim();
    if (!text) fail(422, 'REVIEW_422_002', '请填写点评内容');
    const review = {
      id: nextId('r'),
      dishId,
      userId: user.id,
      rating,
      comment: text,
      status: 'pending',
      createdAt: now(),
    };
    db.reviews.push(review);
    return [201, { id: review.id, status: review.status }];
  }

  function adminReviews(ctx) {
    requireAdmin(ctx);
    return [...db.reviews].sort(byNewest('createdAt')).map(reviewAdminOut);
  }

  function auditReview(ctx) {
    const user = requireAdmin(ctx);
    const review = db.reviews.find((item) => item.id === ctx.params.id);
    if (!review) fail(404, 'REVIEW_404_001', '点评不存在');
    const reason = requireAuditBody(ctx.body);
    Object.assign(review, {
      status: ctx.body.status,
      reason,
      auditor: user.account,
    });
    refreshRating(review.dishId);
    record(user, 'audit_review', 'review', review.id, reason);
    return reviewAdminOut(review);
  }

  /** 投稿列表：管理员看全部；普通用户只能看自己的（对齐 fix/admin-audit-access）。 */
  function listSubmissions(ctx) {
    const user = requireUser(ctx);
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    const account = ctx.query.account;
    if (!isAdmin && account && account !== user.account) {
      fail(403, 'AUTH_403_001', '只能查看自己的投稿');
    }
    const owner = isAdmin ? account : user.account;
    const items = db.submissions
      .filter((item) => !owner || item.submitter_account === owner)
      .sort(byNewest('created_at'));
    return { items, total: items.length };
  }

  /** 投稿审核通过时，把菜品加入对应档口。 */
  function auditSubmission(ctx) {
    const user = requireAdmin(ctx);
    const submission = db.submissions.find((item) => item.id === ctx.params.id);
    if (!submission) fail(404, 'SUBMISSION_404_001', '投稿不存在');
    const reason = requireAuditBody(ctx.body);
    Object.assign(submission, {
      status: ctx.body.status,
      reason,
      auditor_account: user.account,
    });
    if (submission.status === 'approved' && findStall(submission.stall_id)) {
      db.dishes.push({
        id: nextId(submission.stall_id),
        canteenId: submission.canteen_id,
        stallId: submission.stall_id,
        name: submission.dish_name,
        price: submission.price,
        rating: 0,
        description: submission.description,
        valueNote: '',
        imageUrl: DEFAULT_IMAGES.dish,
        gallery: [],
        recommendVotes: 0,
        avoidVotes: 0,
      });
    }
    record(user, 'audit_submission', 'submission', submission.id, reason);
    return submission;
  }

  /** 吐槽列表：公开只返回已通过的；按状态筛选或查看全部需要管理员。 */
  function listRants(ctx) {
    const user = currentUser(ctx);
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    if (ctx.query.status && !isAdmin) fail(403, 'AUTH_403_001', '权限不足');
    const status = ctx.query.status || (isAdmin ? '' : 'approved');
    return db.rants
      .filter((item) => !status || item.status === status)
      .sort(byNewest('createdAt'));
  }

  function auditRant(ctx) {
    const user = requireAdmin(ctx);
    const rant = db.rants.find((item) => item.id === ctx.params.id);
    if (!rant) fail(404, 'RANT_404_001', '吐槽不存在');
    const reason = requireAuditBody(ctx.body);
    Object.assign(rant, {
      status: ctx.body.status,
      reason,
      auditor: user.account,
    });
    record(user, 'audit_rant', 'rant', rant.id, reason);
    return rant;
  }

  const CANTEEN_FIELDS = [
    'name',
    'short_name',
    'location',
    'open_hours',
    'avg_price',
    'summary',
  ];
  const STALL_FIELDS = ['name', 'avg_price', 'summary'];
  const DISH_FIELDS = ['name', 'price', 'value_note', 'description'];

  function requireName(body) {
    if (!String(body.name ?? '').trim())
      fail(422, 'DINING_422_001', '请填写名称');
  }

  function createCanteen(ctx) {
    const user = requireAdmin(ctx);
    requireName(ctx.body);
    const id = ctx.body.id || nextId('canteen');
    if (findCanteen(id)) fail(409, 'DINING_409_001', `食堂ID「${id}」已存在`);
    const canteen = {
      id,
      imageUrl: DEFAULT_IMAGES.canteen,
      ...pickFields(ctx.body, CANTEEN_FIELDS),
    };
    db.canteens.push(canteen);
    record(user, 'create_canteen', 'canteen', id, '新增' + canteen.name);
    return [201, { id }];
  }

  function updateCanteen(ctx) {
    const user = requireAdmin(ctx);
    const canteen = findCanteen(ctx.params.id);
    if (!canteen) fail(404, 'DINING_404_001', '食堂不存在');
    Object.assign(canteen, pickFields(ctx.body, CANTEEN_FIELDS));
    record(
      user,
      'update_canteen',
      'canteen',
      canteen.id,
      '修改' + canteen.name,
    );
    return {};
  }

  function deleteCanteen(ctx) {
    const user = requireAdmin(ctx);
    const canteen = findCanteen(ctx.params.id);
    if (!canteen) fail(404, 'DINING_404_001', '食堂不存在');
    removeDishes((dish) => dish.canteenId === canteen.id);
    db.stalls = db.stalls.filter((stall) => stall.canteenId !== canteen.id);
    db.canteens = db.canteens.filter((item) => item.id !== canteen.id);
    record(
      user,
      'delete_canteen',
      'canteen',
      canteen.id,
      '删除' + canteen.name,
    );
    return {};
  }

  function createStall(ctx) {
    const user = requireAdmin(ctx);
    if (!findCanteen(ctx.params.id)) fail(404, 'DINING_404_001', '食堂不存在');
    requireName(ctx.body);
    const id = ctx.body.id || nextId(ctx.params.id);
    if (findStall(id)) fail(409, 'DINING_409_001', `档口ID「${id}」已存在`);
    const stall = {
      id,
      canteenId: ctx.params.id,
      imageUrl: DEFAULT_IMAGES.stall,
      ...pickFields(ctx.body, STALL_FIELDS),
    };
    db.stalls.push(stall);
    record(user, 'create_stall', 'stall', id, '新增' + stall.name);
    return [201, { id }];
  }

  function updateStall(ctx) {
    const user = requireAdmin(ctx);
    const stall = findStall(ctx.params.id);
    if (!stall) fail(404, 'DINING_404_003', '档口不存在');
    Object.assign(stall, pickFields(ctx.body, STALL_FIELDS));
    record(user, 'update_stall', 'stall', stall.id, '修改' + stall.name);
    return {};
  }

  function deleteStall(ctx) {
    const user = requireAdmin(ctx);
    const stall = findStall(ctx.params.id);
    if (!stall) fail(404, 'DINING_404_003', '档口不存在');
    removeDishes((dish) => dish.stallId === stall.id);
    db.stalls = db.stalls.filter((item) => item.id !== stall.id);
    record(user, 'delete_stall', 'stall', stall.id, '删除' + stall.name);
    return {};
  }

  function createDish(ctx) {
    const user = requireAdmin(ctx);
    const stall = findStall(ctx.body.stall_id);
    if (!stall) fail(404, 'DINING_404_003', '档口不存在');
    requireName(ctx.body);
    const dish = {
      id: ctx.body.id || nextId(stall.id),
      canteenId: stall.canteenId,
      stallId: stall.id,
      rating: 0,
      description: '',
      valueNote: '',
      imageUrl: DEFAULT_IMAGES.dish,
      gallery: [],
      recommendVotes: 0,
      avoidVotes: 0,
      ...pickFields(ctx.body, DISH_FIELDS),
    };
    db.dishes.push(dish);
    record(user, 'create_dish', 'dish', dish.id, '新增' + dish.name);
    return [201, { id: dish.id }];
  }

  function updateDish(ctx) {
    const user = requireAdmin(ctx);
    const dish = findDish(ctx.params.id);
    if (!dish) fail(404, 'DINING_404_002', '菜品不存在');
    Object.assign(dish, pickFields(ctx.body, DISH_FIELDS));
    record(user, 'update_dish', 'dish', dish.id, '修改' + dish.name);
    return {};
  }

  function deleteDish(ctx) {
    const user = requireAdmin(ctx);
    const dish = findDish(ctx.params.id);
    if (!dish) fail(404, 'DINING_404_002', '菜品不存在');
    removeDishes((item) => item.id === dish.id);
    record(user, 'delete_dish', 'dish', dish.id, '删除' + dish.name);
    return {};
  }

  function dashboard(ctx) {
    requireSuperadmin(ctx);
    const today = new Date().toDateString();
    const count = (list, predicate = () => true) =>
      list.filter(predicate).length;
    const pending = (item) => item.status === 'pending';
    return {
      user_count: db.users.length,
      active_users: count(db.users, (item) => item.account_status === 'active'),
      banned_users: count(db.users, (item) => item.account_status === 'banned'),
      user_today: count(
        db.users,
        (item) => new Date(item.created_at).toDateString() === today,
      ),
      admin_count: count(db.users, (item) => item.role === 'admin'),
      superadmin_count: count(db.users, (item) => item.role === 'superadmin'),
      canteen_count: db.canteens.length,
      stall_count: db.stalls.length,
      dish_count: db.dishes.length,
      pending_reviews: count(db.reviews, pending),
      pending_rants: count(db.rants, pending),
      pending_submissions: count(db.submissions, pending),
      total_reviews: db.reviews.length,
      total_rants: db.rants.length,
      total_submissions: db.submissions.length,
      total_invite_codes: db.inviteCodes.length,
    };
  }

  function auditLogs(ctx) {
    requireSuperadmin(ctx);
    return paginate([...db.logs].sort(byNewest('created_at')), ctx.query);
  }

  function listUsers(ctx) {
    requireSuperadmin(ctx);
    const keyword = String(ctx.query.search ?? '')
      .trim()
      .toLowerCase();
    const matched = db.users.filter(
      (item) =>
        !keyword ||
        [item.account, item.email, item.nickname].some((value) =>
          String(value).toLowerCase().includes(keyword),
        ),
    );
    const page = paginate(matched, ctx.query);
    return { ...page, items: page.items.map(publicUser) };
  }

  /** 超管修改他人账号；不允许改自己的角色或状态（对齐 fix/superadmin-self-role）。 */
  function targetUser(ctx, message) {
    const operator = requireSuperadmin(ctx);
    const target = findUser(ctx.params.id);
    if (!target) fail(404, 'USER_404_001', '用户不存在');
    if (message && target.id === operator.id)
      fail(422, 'USER_422_001', message);
    return { operator, target };
  }

  function updateRole(ctx) {
    const { operator, target } = targetUser(ctx, '不能修改自己的角色');
    if (!ROLES.includes(ctx.body.role)) fail(422, 'USER_422_002', '角色无效');
    target.role = ctx.body.role;
    record(
      operator,
      'update_role',
      'user',
      target.id,
      `将 ${target.account} 设为 ${target.role}`,
    );
    return publicUser(target);
  }

  function updateStatus(ctx) {
    const { operator, target } = targetUser(ctx, '不能封禁自己');
    if (!['active', 'banned'].includes(ctx.body.status)) {
      fail(422, 'USER_422_003', '状态无效');
    }
    target.account_status = ctx.body.status;
    record(
      operator,
      'update_status',
      'user',
      target.id,
      `${target.account} → ${target.account_status}`,
    );
    return publicUser(target);
  }

  function resetPassword(ctx) {
    const { operator, target } = targetUser(ctx);
    const password = String(ctx.body.password ?? '');
    if (password.length < 6 || password.length > 128) {
      fail(422, 'USER_422_004', '密码长度须为 6–128 位');
    }
    target.password = password;
    record(
      operator,
      'reset_password',
      'user',
      target.id,
      '重置 ' + target.account + ' 的密码',
    );
    return {};
  }

  const routes = [
    ['POST', '/auth/login', login],
    ['POST', '/auth/register', register],
    ['POST', '/auth/send-code', () => ({})],
    [
      'PUT',
      '/auth/profile',
      (ctx) => {
        const user = requireUser(ctx);
        Object.assign(user, pickFields(ctx.body, ['nickname', 'email']));
        return publicUser(user);
      },
    ],
    ['GET', '/auth/invite-code', currentInviteCode],
    ['POST', '/auth/invite-code/generate', generateInviteCode],

    ['GET', '/canteens', () => db.canteens],
    ['POST', '/canteens', createCanteen],
    ['GET', '/canteens/:id', getCanteen],
    ['PUT', '/canteens/:id', updateCanteen],
    ['DELETE', '/canteens/:id', deleteCanteen],
    ['GET', '/canteens/:id/stalls', listStalls],
    ['POST', '/canteens/:id/stalls', createStall],
    [
      'GET',
      '/canteens/:id/dishes',
      ({ params }) =>
        db.dishes.filter((dish) => dish.canteenId === params.id).map(dishOut),
    ],
    ['PUT', '/stalls/:id', updateStall],
    ['DELETE', '/stalls/:id', deleteStall],
    ['POST', '/dishes', createDish],
    ['GET', '/dishes/:id', getDish],
    ['PUT', '/dishes/:id', updateDish],
    ['DELETE', '/dishes/:id', deleteDish],
    ['GET', '/dishes/:id/reviews', dishReviews],
    ['POST', '/dishes/:id/recommend', voteDish('recommend')],
    ['POST', '/dishes/:id/avoid', voteDish('avoid')],
    ['GET', '/rankings', rankings],
    ['GET', '/recommendations/daily', dailyRecommendations],

    ['POST', '/reviews', createReview],
    ['GET', '/reviews/admin', adminReviews],
    ['PUT', '/reviews/:id/audit', auditReview],
    ['GET', '/submissions', listSubmissions],
    ['PUT', '/submissions/:id/audit', auditSubmission],
    ['GET', '/rants', listRants],
    ['PUT', '/rants/:id/audit', auditRant],

    ['GET', '/superadmin/dashboard', dashboard],
    ['GET', '/superadmin/logs', auditLogs],
    ['GET', '/superadmin/users', listUsers],
    ['PUT', '/superadmin/users/:id/role', updateRole],
    ['PUT', '/superadmin/users/:id/status', updateStatus],
    ['PUT', '/superadmin/users/:id/password', resetPassword],
  ].map(([method, path, handler]) => {
    const pattern = new RegExp(
      '^' + path.replace(/:([a-z]+)/g, '(?<$1>[^/]+)') + '$',
    );
    return { method, pattern, handler };
  });

  /**
   * 处理一次请求。
   * @param {{ method: string, url: string, query?: object, body?: object, token?: string }} request
   * @returns {{ status: number, body: object }}
   */
  function handle({ method, url, query = {}, body = {}, token = '' }) {
    const path = url.split('?')[0].replace(/\/+$/, '') || '/';
    for (const route of routes) {
      if (route.method !== method.toUpperCase()) continue;
      const match = route.pattern.exec(path);
      if (!match) continue;
      const params = Object.fromEntries(
        Object.entries(match.groups ?? {}).map(([key, value]) => [
          key,
          decodeURIComponent(value),
        ]),
      );
      try {
        const result = route.handler({
          params,
          query,
          body: body ?? {},
          token,
        });
        const [status, data] =
          Array.isArray(result) && typeof result[0] === 'number'
            ? result
            : [200, result];
        return { status, body: { code: 0, message: 'success', data } };
      } catch (error) {
        if (!(error instanceof MockError)) throw error;
        return {
          status: error.status,
          body: { code: error.code, message: error.message },
        };
      }
    }
    return {
      status: 404,
      body: { code: 'MOCK_404', message: `Mock 未实现：${method} ${path}` },
    };
  }

  return { handle };
}
