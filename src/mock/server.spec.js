import { beforeEach, describe, expect, it } from 'vitest';
import { createSeed, MOCK_PASSWORD, MOCK_VERIFICATION_CODE } from './seed.js';
import { createMockServer } from './server.js';
import { createMockAdapter } from './index.js';
import { ApiError, http } from '@/api/http.js';

let db;
let server;

function call(method, url, { body, query, token } = {}) {
  return server.handle({ method, url, body, query, token });
}

function loginAs(account) {
  const { body } = call('POST', '/auth/login', {
    body: { login_id: account, password: MOCK_PASSWORD },
  });
  return body.data.token;
}

beforeEach(() => {
  db = createSeed();
  server = createMockServer(db);
});

describe('mock 鉴权', () => {
  it('账号或邮箱加默认密码可以登录', () => {
    const byAccount = call('POST', '/auth/login', {
      body: { login_id: 'student', password: MOCK_PASSWORD },
    });
    expect(byAccount.status).toBe(200);
    expect(byAccount.body.data).toMatchObject({
      role: 'user',
      token: expect.any(String),
    });
    expect(byAccount.body.data.password).toBeUndefined();

    const byEmail = call('POST', '/auth/login', {
      body: { login_id: 'admin@foodtime.local', password: MOCK_PASSWORD },
    });
    expect(byEmail.body.data.role).toBe('admin');
  });

  it('错误密码返回 401，封禁账号返回 403', () => {
    expect(
      call('POST', '/auth/login', {
        body: { login_id: 'student', password: 'x' },
      }).status,
    ).toBe(401);
    expect(
      call('POST', '/auth/login', {
        body: { login_id: 'banned', password: MOCK_PASSWORD },
      }).status,
    ).toBe(403);
  });

  it('管理员注册需要有效邀请码，且邀请码只能用一次', () => {
    const payload = {
      email: 'new-admin@foodtime.local',
      password: MOCK_PASSWORD,
      nickname: '新管理员',
      verification_code: MOCK_VERIFICATION_CODE,
      role: 'admin',
      invite_code: 'FOOD2026',
    };
    expect(call('POST', '/auth/register', { body: payload }).status).toBe(201);
    expect(
      call('POST', '/auth/register', {
        body: { ...payload, email: 'another@foodtime.local' },
      }).status,
    ).toBe(422);
  });
});

describe('mock 权限', () => {
  it('访客、普通用户、管理员访问审核列表分别得到 401 / 403 / 200', () => {
    expect(call('GET', '/reviews/admin').status).toBe(401);
    expect(
      call('GET', '/reviews/admin', { token: loginAs('student') }).status,
    ).toBe(403);
    expect(
      call('GET', '/reviews/admin', { token: loginAs('admin') }).status,
    ).toBe(200);
  });

  it('普通用户不能查看他人投稿或按状态查询吐槽', () => {
    const token = loginAs('student');
    expect(
      call('GET', '/submissions', { token, query: { account: 'foodie' } })
        .status,
    ).toBe(403);
    const own = call('GET', '/submissions', { token });
    expect(
      own.body.data.items.every((item) => item.submitter_account === 'student'),
    ).toBe(true);
    expect(
      call('GET', '/rants', { token, query: { status: 'pending' } }).status,
    ).toBe(403);
  });

  it('超管看板仅超管可用，且不能修改自己的角色', () => {
    expect(
      call('GET', '/superadmin/dashboard', { token: loginAs('admin') }).status,
    ).toBe(403);
    const token = loginAs('superadmin');
    expect(call('GET', '/superadmin/dashboard', { token }).status).toBe(200);
    const self = call('PUT', '/superadmin/users/u-superadmin/role', {
      token,
      body: { role: 'user' },
    });
    expect(self.status).toBe(422);
  });
});

describe('mock 业务流程', () => {
  it('点评提交后待审，审核通过后才公开并刷新评分', () => {
    const dishId = 'minghu-xiaochao-yuxiang';
    const created = call('POST', '/reviews', {
      token: loginAs('student'),
      body: { dish_id: dishId, rating: 5, comment: '比想象中好吃' },
    });
    expect(created.status).toBe(201);
    expect(call('GET', `/dishes/${dishId}/reviews`).body.data).toHaveLength(0);

    const audit = call('PUT', `/reviews/${created.body.data.id}/audit`, {
      token: loginAs('admin'),
      body: { status: 'approved', reason: '内容真实' },
    });
    expect(audit.status).toBe(200);
    expect(call('GET', `/dishes/${dishId}/reviews`).body.data).toHaveLength(1);
    expect(call('GET', `/dishes/${dishId}`).body.data.rating).toBe(5);
  });

  it('审核必须填写原因', () => {
    const result = call('PUT', '/reviews/r-5/audit', {
      token: loginAs('admin'),
      body: { status: 'rejected', reason: ' ' },
    });
    expect(result.status).toBe(422);
  });

  it('删除食堂会级联删除档口、菜品和点评', () => {
    const result = call('DELETE', '/canteens/xueyuan', {
      token: loginAs('admin'),
    });
    expect(result.status).toBe(200);
    expect(db.stalls.some((stall) => stall.canteenId === 'xueyuan')).toBe(
      false,
    );
    expect(db.dishes.some((dish) => dish.canteenId === 'xueyuan')).toBe(false);
    expect(
      db.reviews.some((review) => review.dishId.startsWith('xueyuan')),
    ).toBe(false);
    expect(call('GET', '/canteens/xueyuan').status).toBe(404);
  });

  it('同一用户对同一道菜只能推荐一次', () => {
    const token = loginAs('student');
    const url = '/dishes/xueyuan-nanbei-niuroumian/recommend';
    expect(call('POST', url, { token }).status).toBe(200);
    expect(call('POST', url, { token }).status).toBe(409);
  });
});

describe('createMockAdapter', () => {
  it('经过真实 http 拦截器：成功解包 data，失败转换为 ApiError', async () => {
    const adapter = createMockAdapter(server);
    const canteens = await http.get('/canteens', { adapter });
    expect(canteens.map((item) => item.id)).toContain('xueyuan');

    const error = await http
      .get('/canteens/none', { adapter })
      .catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.bizCode).toBe('DINING_404_001');
    expect(error.message).toBe('食堂不存在');
  });
});
