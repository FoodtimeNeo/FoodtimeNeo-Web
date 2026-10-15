import { computed, toValue } from 'vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import { useCatalogSearchStore } from '@/store/useCatalogSearchStore.js';

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase();
}

export function useCatalogSearch(items, scope) {
  const preferences = useCatalogSearchStore();
  const auth = useAuthStore();
  const key = computed(() => `${auth.user?.id || 'guest'}:${toValue(scope)}`);
  const query = computed({
    get: () => preferences.queries[key.value] || '',
    set: (value) => preferences.setQuery(key.value, value),
  });
  const matches = computed(() => {
    const terms = normalize(query.value).trim().split(/\s+/).filter(Boolean);
    return (toValue(items) || []).filter((item) =>
      terms.every((term) => normalize(item.name).includes(term)),
    );
  });
  return { query, matches };
}
