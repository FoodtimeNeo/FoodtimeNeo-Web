<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchCanteen, fetchStalls } from '@/api/canteen.api.js';
import StallEntryCard from '@/components/canteen/StallEntryCard.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import MediaImage from '@/components/base/MediaImage.vue';

const route = useRoute();
const canteenId = computed(() => String(route.params.canteenId));

const {
  data: canteen,
  error: canteenError,
  loading: canteenLoading,
  load: loadCanteen,
} = useAsyncData(() => fetchCanteen(canteenId.value));

const {
  data: stalls,
  error: stallsError,
  loading: stallsLoading,
  load: loadStalls,
} = useAsyncData(() => fetchStalls(canteenId.value), { initial: [] });
</script>

<template>
  <main class="canteen-detail">
    <nav class="canteen-detail__back">
      <RouterLink :to="{ name: 'canteenList' }">← 返回食堂列表</RouterLink>
    </nav>

    <LoadingState v-if="canteenLoading" message="正在打开食堂…" />
    <ErrorState
      v-else-if="canteenError"
      :title="canteenError.code === 'NOT_FOUND' ? '食堂不存在' : '暂时无法加载'"
      :description="canteenError.message"
      @retry="loadCanteen"
    />
    <template v-else-if="canteen">
      <header class="canteen-detail__hero torn-edge">
        <MediaImage
          class="canteen-detail__hero-image"
          frame="polygon"
          :src="canteen.coverImageUrl || ''"
          :alt="canteen.name"
          empty="暂未上传食堂图片"
        />
        <div class="canteen-detail__hero-content">
          <span class="sticker sticker--r-1">食堂档案</span>
          <h1 class="section-title">{{ canteen.name }}</h1>
          <p class="dropcap">
            从这里翻开档口名册，继续找到今天想吃的那一道菜。
          </p>
          <RouterLink
            class="button-ink is-primary"
            :to="{ name: 'stallSubmission', params: { canteenId } }"
            >投稿档口</RouterLink
          >
        </div>
      </header>

      <section aria-labelledby="stalls-title">
        <div class="section-rule">
          <span class="section-rule__index">03</span>
          <span class="section-rule__line"></span>
        </div>
        <h2 id="stalls-title" class="canteen-detail__subtitle">档口</h2>

        <LoadingState v-if="stallsLoading" message="正在清点档口…" />
        <ErrorState
          v-else-if="stallsError"
          :description="stallsError.message"
          @retry="loadStalls"
        />
        <EmptyState
          v-else-if="!stalls.length"
          title="这个食堂还没有档口"
          description="管理员添加后会显示在这里。"
        />
        <ul v-else class="canteen-detail__grid">
          <li v-for="stall in stalls" :key="stall.id">
            <StallEntryCard :stall="stall" :canteen-id="canteenId" />
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>

<style scoped lang="scss">
.canteen-detail {
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  margin: var(--ft-space-5) auto;

  &__back {
    margin-bottom: var(--ft-space-3);

    a {
      color: var(--ft-color-primary);
      font-weight: 700;
      text-decoration: none;
    }
  }

  &__summary {
    margin: var(--ft-space-2) 0 0;
    color: var(--ft-color-text-muted);
  }

  &__hero {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    overflow: hidden;
    border: 1px solid var(--ft-color-secondary);
    background: var(--ft-color-surface);
  }

  &__hero-image {
    min-height: 360px;
  }

  &__hero-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    padding: var(--ft-space-3);

    h1 {
      margin-top: 12px;
      font-size: clamp(44px, 6vw, 68px);
      line-height: 0.95;
    }

    p {
      color: var(--ft-color-secondary-soft);
    }
  }

  &__subtitle {
    margin: var(--ft-space-4) 0 0;
    font-family: var(--ft-font-family-title);
    font-size: var(--ft-font-size-xl);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--ft-space-3);
    margin: var(--ft-space-3) 0 0;
    padding: 0;
    list-style: none;
  }
}

@media (max-width: 768px) {
  .canteen-detail {
    width: calc(100% - var(--zine-page-padding-mobile) * 2);

    &__grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: var(--ft-space-2);
    }

    &__hero {
      grid-template-columns: 1fr;
    }

    &__hero-image {
      min-height: 0;
      aspect-ratio: 16 / 10;
    }

    &__hero-content {
      padding: var(--app-mobile-card-padding);
    }
  }
}
</style>
