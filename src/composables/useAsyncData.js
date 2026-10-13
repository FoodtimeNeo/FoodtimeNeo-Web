import { ref, shallowRef } from 'vue';

/**
 * 统一的异步取数状态机。页面与组件用它承载加载 / 成功 / 空 / 错误四态，
 * 避免每个页面各写一套 loading/error 布尔量。
 *
 * @template T
 * @param {() => Promise<T>} loader 取数函数，抛出的错误应为 ApiError
 * @param {{ immediate?: boolean, initial?: T }} [options]
 * @returns {{
 *   data: import('vue').ShallowRef<T>,
 *   error: import('vue').Ref<import('@/api/http.js').ApiError | null>,
 *   loading: import('vue').Ref<boolean>,
 *   load: () => Promise<void>,
 * }}
 */
export function useAsyncData(
  loader,
  { immediate = true, initial = null } = {},
) {
  const data = shallowRef(initial);
  const error = ref(null);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      data.value = await loader();
    } catch (err) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  }

  if (immediate) load();

  return { data, error, loading, load };
}
