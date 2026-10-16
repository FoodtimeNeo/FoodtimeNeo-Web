import { computed, ref, watch } from 'vue';
import { useAsyncData } from './useAsyncData.js';
import { ApiError } from '@/api/http.js';
export function usePagedData(loader) {
  const page = ref(1);
  const state = useAsyncData(
    async (options) => {
      const result = await loader(page.value, options);
      if (
        !Array.isArray(result?.items) ||
        !Number.isInteger(result.total) ||
        result.total < 0 ||
        !Number.isInteger(result.size) ||
        result.size < 1
      )
        throw new ApiError('分页响应不符合接口约定', { code: 'PROTOCOL' });
      return result;
    },
    { initial: { items: [], total: 0, page: 1, size: 20 } },
  );
  watch(page, state.load);
  return {
    ...state,
    page,
    items: computed(() => state.data.value.items),
    total: computed(() => state.data.value.total),
    size: computed(() => state.data.value.size),
  };
}
