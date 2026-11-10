import { computed, toValue } from 'vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import { useCatalogSearchStore } from '@/store/useCatalogSearchStore.js';

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase();
}

export function filterCatalogByName(items, query) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return (items || []).filter((item) =>
    terms.every((term) => normalize(item.name).includes(term)),
  );
}

export function useCatalogSearch(items, scope) {
  const preferences = useCatalogSearchStore();
  const auth = useAuthStore();
  const key = computed(() => `${auth.user?.id || 'guest'}:${toValue(scope)}`);
  const query = computed({
    get: () => preferences.queries[key.value] || '',
    set: (value) => preferences.setQuery(key.value, value),
  });
  const matches = computed(() =>
    filterCatalogByName(toValue(items), query.value),
  );
  return { query, matches };
}
