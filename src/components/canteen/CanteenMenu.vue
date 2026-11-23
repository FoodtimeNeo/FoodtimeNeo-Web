<script setup>
import { ref, reactive, watch, nextTick, onBeforeUnmount } from 'vue';
import { fetchStallDishes } from '@/api/canteen.api.js';
import { PRICE_UNITS } from '@/utils/priceHistory.js';
import { formatPrice } from '@/utils/mediaUrl.js';
const formatUnitPrice = (price, unit) =>
  price === null || price === undefined
    ? '价格未知'
    : `${formatPrice(price)}${unit && unit !== 'unspecified' && PRICE_UNITS[unit] ? '/' + PRICE_UNITS[unit] : ''}`;
import MediaImage from '@/components/base/MediaImage.vue';
const props = defineProps({
  canteenId: { type: String, required: true },
  stalls: { type: Array, required: true },
  ownerId: { type: String, default: '' },
});
const active = ref('');
const viewport = ref(null);
const navigation = ref(null);
const sections = new Map();
const buttons = new Map();
const rows = reactive({});
let controller,
  epoch = 0;
let requested = '';
let disposed = false;
let interacted = false;
const positionKey = () =>
  props.ownerId ? `foodtime:menu:${props.ownerId}:${props.canteenId}` : '';
function interact() {
  requested = '';
  interacted = true;
}
const sectionRef = (id, element) =>
  element ? sections.set(id, element) : sections.delete(id);
const buttonRef = (id, element) =>
  element ? buttons.set(id, element) : buttons.delete(id);
function select(id, smooth = true) {
  interacted = true;
  active.value = id;
  requested = id;
  const section = sections.get(id);
  if (section && viewport.value)
    viewport.value.scrollTo({
      top: section.offsetTop,
      behavior:
        smooth &&
        !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'smooth'
          : 'auto',
    });
}
function followScroll() {
  const root = viewport.value;
  if (!root) return;
  let id = props.stalls[0]?.id || '';
  for (const stall of props.stalls) {
    const section = sections.get(stall.id);
    if (section && section.offsetTop <= root.scrollTop + 24) id = stall.id;
  }
  if (
    root.scrollHeight > root.clientHeight + 1 &&
    root.scrollTop + root.clientHeight >= root.scrollHeight - 2
  )
    id = props.stalls.at(-1)?.id || id;
  if (id !== active.value) {
    active.value = id;
    const button = buttons.get(id);
    if (button && navigation.value)
      navigation.value.scrollTo({
        top: Math.max(0, button.offsetTop - navigation.value.clientHeight / 2),
        behavior: 'auto',
      });
  }
}
async function load(stall, ticket, signal) {
  rows[stall.id] = { status: 'loading', dishes: [], error: '' };
  try {
    const dishes = await fetchStallDishes(stall.id, { signal });
    if (disposed || ticket !== epoch) return;
    if (!Array.isArray(dishes)) throw new Error('菜品列表格式不正确');
    const anchor = sections.get(active.value);
    const offset =
      anchor && viewport.value
        ? anchor.offsetTop - viewport.value.scrollTop
        : null;
    rows[stall.id] = { status: 'ready', dishes, error: '' };
    await nextTick();
    if (offset !== null && !requested && viewport.value && ticket === epoch)
      viewport.value.scrollTop = anchor.offsetTop - offset;
  } catch (error) {
    if (disposed || ticket !== epoch || signal.aborted) return;
    rows[stall.id] = {
      status: 'error',
      dishes: [],
      error: error.message || '菜品加载失败',
    };
  }
  await nextTick();
  if (requested && ticket === epoch) select(requested, false);
}
function retry(stall) {
  void load(stall, epoch, controller.signal);
}
watch(
  () => [props.canteenId, props.stalls],
  async () => {
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal,
      ticket = ++epoch;
    active.value = props.stalls[0]?.id || '';
    requested = '';
    interacted = false;
    for (const id of Object.keys(rows)) delete rows[id];
    const queue = [...props.stalls];
    // Bound requests per hall; a failed stall never blocks another section.
    await Promise.all(
      Array.from({ length: Math.min(3, queue.length) }, async () => {
        while (queue.length && !signal.aborted)
          await load(queue.shift(), ticket, signal);
      }),
    );
    await nextTick();
    if (
      ticket === epoch &&
      !disposed &&
      !interacted &&
      !requested &&
      viewport.value &&
      positionKey()
    ) {
      try {
        viewport.value.scrollTop =
          Number(sessionStorage.getItem(positionKey())) || 0;
        followScroll();
      } catch {
        /* Best effort only. */
      }
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  if (positionKey() && viewport.value) {
    try {
      sessionStorage.setItem(positionKey(), String(viewport.value.scrollTop));
    } catch {
      /* Best effort only. */
    }
  }
  disposed = true;
  epoch++;
  controller?.abort();
});
</script>
<template>
  <div class="canteen-menu">
    <nav ref="navigation" class="canteen-menu__nav" aria-label="档口">
      <button
        v-for="stall in stalls"
        :key="stall.id"
        :ref="(element) => buttonRef(stall.id, element)"
        type="button"
        :aria-current="active === stall.id ? 'true' : undefined"
        @click="select(stall.id)"
      >
        {{ stall.name }}
      </button>
    </nav>
    <div
      ref="viewport"
      class="canteen-menu__dishes"
      tabindex="0"
      aria-label="食堂菜品"
      @scroll.passive="followScroll"
      @pointerdown="interact"
      @wheel.passive="interact"
      @keydown="interact"
    >
      <section
        v-for="stall in stalls"
        :key="stall.id"
        :ref="(element) => sectionRef(stall.id, element)"
        class="canteen-menu__section"
        :aria-label="stall.name"
      >
        <header>
          <h2>{{ stall.name }}</h2>
          <RouterLink
            :to="{
              name: 'stallDetail',
              params: { canteenId, stallId: stall.id },
            }"
            :aria-label="`${stall.name}档口详情`"
            >详情 ›</RouterLink
          >
        </header>
        <p
          v-if="!rows[stall.id] || rows[stall.id].status === 'loading'"
          class="canteen-menu__state"
          role="status"
        >
          加载中…
        </p>
        <div
          v-else-if="rows[stall.id].status === 'error'"
          class="canteen-menu__state"
        >
          <p role="alert">{{ rows[stall.id].error }}</p>
          <button type="button" @click="retry(stall)">重试</button>
        </div>
        <p
          v-else-if="!rows[stall.id].dishes.length"
          class="canteen-menu__state"
        >
          暂无菜品
        </p>
        <RouterLink
          v-for="dish in rows[stall.id]?.dishes || []"
          :key="dish.id"
          class="canteen-menu__dish"
          :to="{
            name: 'dishDetail',
            params: { canteenId, stallId: stall.id, dishId: dish.id },
          }"
        >
          <MediaImage
            compact
            fit="contain"
            :src="dish.coverImageUrl || ''"
            alt=""
            empty=""
          />
          <div>
            <h3>{{ dish.name }}</h3>
            <p v-if="dish.description" class="canteen-menu__description">
              {{ dish.description }}
            </p>
            <small>{{
              dish.averageScore == null
                ? '暂无评分'
                : Number(dish.averageScore).toFixed(1) + ' 分'
            }}</small
            ><strong>{{ formatUnitPrice(dish.price, dish.priceUnit) }}</strong>
          </div>
        </RouterLink>
      </section>
    </div>
  </div>
</template>
<style scoped>
.canteen-menu {
  display: grid;
  grid-template-columns: clamp(84px, 23%, 170px) minmax(0, 1fr);
  height: min(760px, calc(100svh - 154px));
  min-height: 300px;
  border-top: 1px solid var(--ft-color-border);
  background: var(--zine-paper-card);
}
.canteen-menu__nav {
  position: relative;
  overflow-y: auto;
  background: var(--ft-color-bg-soft);
  overscroll-behavior: contain;
}
.canteen-menu__nav button {
  display: block;
  width: 100%;
  min-height: 58px;
  padding: 16px 10px;
  border: 0;
  border-left: 3px solid transparent;
  background: transparent;
  color: var(--ft-color-text-muted);
  font: inherit;
  font-size: 14px;
  overflow-wrap: anywhere;
  cursor: pointer;
  text-align: left;
}
.canteen-menu__nav button[aria-current] {
  border-left-color: var(--ft-color-primary);
  color: var(--ft-color-primary);
  background: var(--zine-paper-card);
  font-weight: bold;
}
.canteen-menu__dishes {
  position: relative;
  overflow-y: auto;
  overscroll-behavior: contain;
  min-width: 0;
}
.canteen-menu__section {
  padding: 0 12px;
}
.canteen-menu__section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 0 6px;
}
.canteen-menu h2 {
  font: 20px var(--ft-font-family-title);
  margin: 0;
  overflow-wrap: anywhere;
}
.canteen-menu header a {
  display: flex;
  align-items: center;
  min-height: 44px;
  flex: none;
  color: var(--ft-color-text-muted);
  font-size: 12px;
}
.canteen-menu__dish {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 0;
  min-height: 112px;
  border-bottom: 1px dashed var(--ft-color-border);
}
.canteen-menu__dish :deep(.media-image) {
  width: clamp(64px, 20vw, 110px);
  height: clamp(64px, 20vw, 110px);
  min-height: 0;
  flex: none;
  border-radius: 10px;
  overflow: hidden;
  background: var(--ft-color-bg-soft);
}
.canteen-menu__dish > div:not(.media-image) {
  flex: 1;
  min-width: 0;
}
.canteen-menu h3 {
  margin: 0 0 6px;
  font-size: 16px;
  overflow-wrap: anywhere;
}
.canteen-menu__description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0 0 6px;
  color: var(--ft-color-text-muted);
  font-size: 12px;
}
.canteen-menu small {
  color: var(--ft-color-text-muted);
  font-size: 12px;
}
.canteen-menu strong {
  display: block;
  margin-top: 8px;
  color: var(--ft-color-primary);
  font-size: 18px;
  overflow-wrap: anywhere;
}
.canteen-menu__state {
  min-height: 100px;
  color: var(--ft-color-text-muted);
  font-size: 14px;
  padding: 16px 0;
}
.canteen-menu__state button {
  min-height: 44px;
  padding: 8px 16px;
  font: inherit;
  background: transparent;
  border: 1px solid var(--ft-color-border);
  cursor: pointer;
}
@media (max-width: 768px) {
  .canteen-menu {
    height: calc(100svh - 330px);
    min-height: 280px;
  }
}
</style>
