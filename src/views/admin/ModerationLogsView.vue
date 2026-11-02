<script setup>
import { ref } from 'vue';
import { ElDialog } from 'element-plus';
import ModerationLogContent from '@/components/admin/ModerationLogContent.vue';
import { fetchModerationLogs } from '@/api/admin-audit.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
const { items, page, total, size, loading, error, load } =
  usePagedData(fetchModerationLogs);
const selected = ref(null);
const types = {
  'hall-review': '餐厅点评',
  'stall-review': '档口点评',
  'hall-review-reply': '餐厅点评回复',
  'stall-review-reply': '档口点评回复',
  review: '点评',
  dish: '菜品',
  stall: '档口',
  photo: '图片',
  'dish-review-reply': '点评回复',
  'community-post': '社区食记',
  'community-comment': '社区评论／回复',
};
</script>
<template>
  <section class="logs">
    <h2 class="section-title">审核日志</h2>
    <LoadingState v-if="loading" /><ErrorState
      v-else-if="error"
      :description="error.message"
      @retry="load"
    /><EmptyState v-else-if="!items.length" title="暂无审核日志" />
    <article v-for="row in !loading && !error ? items : []" :key="row.id">
      <h3>
        {{ types[row.type] }} ·
        {{
          row.action === 'approve'
            ? '通过'
            : row.action === 'remove'
              ? '下架'
              : '驳回'
        }}
      </h3>
      <ModerationLogContent :row="row" />
      <div class="logs__actions">
        <button type="button" @click="selected = row">查看完整日志</button>
      </div>
    </article>
    <PaginationControls
      :page="page"
      :total="total"
      :size="size"
      :disabled="loading"
      @change="
        selected = null;
        page = $event;
      "
    />
  </section>
  <ElDialog
    :model-value="Boolean(selected)"
    title="完整审核日志"
    class="log-dialog"
    width="min(880px, calc(100vw - 24px))"
    top="16px"
    append-to-body
    destroy-on-close
    @update:model-value="
      (value) => {
        if (!value) selected = null;
      }
    "
  >
    <template v-if="selected">
      <h3>
        {{ types[selected.type] }} ·
        {{
          selected.action === 'approve'
            ? '通过'
            : selected.action === 'remove'
              ? '下架'
              : '驳回'
        }}
      </h3>
      <ModerationLogContent :row="selected" full />
    </template>
    <template #footer
      ><button type="button" @click="selected = null">关闭</button></template
    >
  </ElDialog>
</template>
<style scoped>
.logs {
  max-width: 1000px;
  margin: auto;
  overflow-wrap: anywhere;
}
.logs > .section-title {
  margin-bottom: 10px;
}
article {
  border: 1px solid var(--ft-color-secondary);
  padding: 12px 14px;
  margin: 10px 0;
  background: var(--zine-paper-card);
  box-shadow: 2px 2px 0 var(--zine-paper-shadow);
}
h3 {
  margin: 0 0 6px;
  color: var(--ft-color-secondary);
  font: 700 18px/1.4 var(--ft-font-family-title);
  overflow-wrap: anywhere;
}
.logs__actions {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--ft-color-border);
}
button {
  min-height: 44px;
  padding: 8px 12px;
  background: var(--zine-paper-card);
  color: var(--ft-color-text);
  border: 1px solid var(--ft-color-secondary);
  font: inherit;
  cursor: pointer;
}
button:hover {
  background: var(--zine-paper-card-alt);
}
button:focus-visible {
  outline: 2px solid var(--ft-color-primary);
  outline-offset: 3px;
}
:global(.log-dialog) {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 32px);
  margin-bottom: 16px;
  --el-dialog-bg-color: var(--zine-paper-card);
  border: 1px solid var(--ft-color-secondary);
}
:global(.log-dialog .el-dialog__header) {
  flex-shrink: 0;
  padding-right: 32px;
}
:global(.log-dialog .el-dialog__body) {
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
  color: var(--ft-color-text);
}
:global(.log-dialog .el-dialog__footer) {
  flex-shrink: 0;
  border-top: 1px solid var(--ft-color-border);
  padding-top: 10px;
}
@media (min-width: 769px) and (pointer: fine) {
  .logs__actions button {
    min-height: 36px;
    padding: 5px 12px;
    font-size: var(--ft-font-size-sm);
  }
}
</style>
