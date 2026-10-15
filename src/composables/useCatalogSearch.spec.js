import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { useCatalogSearch } from './useCatalogSearch.js';
import { useAuthStore } from '@/store/useAuthStore.js';

beforeEach(() => setActivePinia(createPinia()));
describe('目录搜索', () => {
  const items = [{ name: 'ABC 排骨小锅' }, { name: '大虾炒鸡饭' }];
  it('兼容全角字母、大小写和多个关键词，保留原始服务端名称', () => {
    const search = useCatalogSearch(ref(items), 'dishes:s1');
    search.query.value = '  ａｂＣ  小锅 ';
    expect(search.matches.value).toEqual([items[0]]);
    search.query.value = '   ';
    expect(search.matches.value).toEqual(items);
  });
  it('按用户和目录隔离，并随数据更新重新匹配', () => {
    const data = ref(items);
    const first = useCatalogSearch(data, 'dishes:s1');
    first.query.value = '排骨';
    expect(useCatalogSearch(data, 'dishes:s1').query.value).toBe('排骨');
    expect(useCatalogSearch(data, 'dishes:s2').query.value).toBe('');
    data.value = [{ name: '排骨中锅' }];
    expect(first.matches.value).toEqual(data.value);
    useAuthStore().user = { id: 'another-user' };
    expect(first.query.value).toBe('');
  });
});
