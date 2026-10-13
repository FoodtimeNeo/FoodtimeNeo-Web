import { describe, expect, it } from 'vitest';
import { APP_TITLE, resolveDocumentTitle } from './guards.js';
import { routes } from './routes.js';

describe('resolveDocumentTitle', () => {
  it('拼接页面标题', () => {
    expect(resolveDocumentTitle({ meta: { title: '首页' } })).toBe(
      `首页 · ${APP_TITLE}`,
    );
  });

  it('无标题时回退到应用名', () => {
    expect(resolveDocumentTitle({ meta: {} })).toBe(APP_TITLE);
  });
});

describe('routes', () => {
  it('路由名称唯一且为 camelCase', () => {
    const names = routes.map((route) => route.name);
    expect(new Set(names).size).toBe(names.length);
    names.forEach((name) => expect(name).toMatch(/^[a-z][a-zA-Z0-9]*$/));
  });

  it('兜底路由位于最后', () => {
    expect(routes.at(-1).name).toBe('notFound');
  });
});
