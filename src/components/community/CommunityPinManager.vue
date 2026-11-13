<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ElDialog } from 'element-plus';
import { useAuthStore } from '@/store/useAuthStore.js';
import {
  fetchManagedPins,
  pinPost,
  unpinPost,
  reorderPins,
} from '@/api/community-pins.api.js';
const props = defineProps({ post: { type: Object, default: null } });
const emit = defineEmits(['changed']);
const auth = useAuthStore(),
  open = ref(false),
  loading = ref(false),
  writing = ref(false),
  error = ref(''),
  value = ref(null);
const allowed = computed(() => !!auth.can?.('community.pin.manage'));
const actor = () => `${auth.user?.id}:${auth.role}`;
let active = true,
  sequence = 0,
  request;
const selected = computed(() =>
  value.value?.items.some((row) => row.id === props.post?.id),
);
async function load() {
  if (!allowed.value || writing.value) return;
  const ticket = ++sequence,
    owner = actor();
  request?.abort();
  request = new AbortController();
  loading.value = true;
  error.value = '';
  try {
    const result = await fetchManagedPins({ signal: request.signal });
    if (active && ticket === sequence && owner === actor() && open.value)
      value.value = result;
  } catch (failure) {
    if (active && ticket === sequence && owner === actor())
      error.value = failure.message || '读取失败，请重试';
  } finally {
    if (active && ticket === sequence) loading.value = false;
  }
}
async function change(work) {
  if (!allowed.value || !value.value || loading.value || writing.value) return;
  const owner = actor(),
    revision = value.value.revision;
  writing.value = true;
  error.value = '';
  try {
    const result = await work(revision);
    if (active && owner === actor() && open.value) {
      value.value = result;
      emit('changed');
    }
  } catch (failure) {
    if (active && owner === actor())
      error.value = failure.message || '操作失败，请刷新后重试';
  } finally {
    if (active && owner === actor()) writing.value = false;
  }
}
function move(index, offset) {
  const ids = value.value.items.map((row) => row.id),
    other = index + offset;
  if (other < 0 || other >= ids.length) return;
  [ids[index], ids[other]] = [ids[other], ids[index]];
  change((revision) => reorderPins(ids, revision));
}
function close(done) {
  if (!writing.value) done();
}
watch(open, (shown) => {
  if (shown) {
    value.value = null;
    load();
  } else {
    sequence++;
    request?.abort();
  }
});
watch(actor, () => {
  sequence++;
  request?.abort();
  open.value = false;
  value.value = null;
  writing.value = false;
  loading.value = false;
});
onBeforeUnmount(() => {
  active = false;
  sequence++;
  request?.abort();
});
</script>
<template>
  <button
    v-if="allowed"
    type="button"
    class="button-ink pin-entry"
    @click="open = true"
  >
    置顶管理
  </button>
  <ElDialog
    v-if="allowed"
    v-model="open"
    class="community-pin-dialog"
    title="置顶食记管理"
    width="min(92vw, 600px)"
    append-to-body
    :before-close="close"
    :close-on-click-modal="false"
  >
    <div class="pin-manager">
      <p>
        最多保留 3 条。修改后待审核或被拒的帖子保留名额，审核通过后恢复原顺序。
      </p>
      <p v-if="error" role="alert">{{ error }}</p>
      <button type="button" :disabled="loading || writing" @click="load">
        {{ loading ? '读取中…' : '刷新置顶列表' }}
      </button>
      <template v-if="value">
        <button
          v-if="post && !selected && post.status === 'approved'"
          type="button"
          :disabled="loading || writing || value.items.length >= 3"
          @click="change((revision) => pinPost(post.id, revision))"
        >
          置顶当前帖子
        </button>
        <p v-if="!value.items.length">当前没有置顶食记。</p>
        <ol>
          <li v-for="(row, index) in value.items" :key="row.id">
            <strong>{{ row.title }}</strong>
            <small
              >@{{ row.userDisplayName }} ·
              {{
                row.status === 'approved'
                  ? '公开中'
                  : row.status === 'pending'
                    ? '待审核，保留名额'
                    : '未通过，保留名额'
              }}</small
            >
            <div class="pin-manager__actions">
              <button
                type="button"
                :aria-label="`上移 ${row.title}`"
                :disabled="loading || writing || index === 0"
                @click="move(index, -1)"
              >
                上移
              </button>
              <button
                type="button"
                :aria-label="`下移 ${row.title}`"
                :disabled="
                  loading || writing || index === value.items.length - 1
                "
                @click="move(index, 1)"
              >
                下移
              </button>
              <button
                type="button"
                :disabled="loading || writing"
                @click="change((revision) => unpinPost(row.id, revision))"
              >
                取消置顶
              </button>
            </div>
          </li>
        </ol>
      </template>
    </div>
  </ElDialog>
</template>
<style scoped>
.pin-entry {
  margin: 8px 0 12px;
  min-height: 44px;
}
.pin-manager {
  display: grid;
  gap: 12px;
  color: var(--ft-color-text);
  font-size: 1rem;
  overflow-wrap: anywhere;
}
.pin-manager p {
  margin: 0;
  line-height: 1.6;
}
.pin-manager ol {
  margin: 0;
  padding-left: 24px;
}
.pin-manager li {
  padding: 12px 0;
  border-bottom: 1px dashed var(--ft-color-border);
}
.pin-manager small {
  display: block;
  margin: 6px 0;
}
.pin-manager__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.pin-manager button {
  min-height: 44px;
  min-width: 44px;
  padding: 8px 12px;
  color: inherit;
  background: var(--zine-paper-card);
  border: 1px solid var(--ft-color-border);
  font: inherit;
  cursor: pointer;
}
.pin-manager button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
<style>
.el-dialog.community-pin-dialog {
  display: flex;
  flex-direction: column;
  max-height: 90dvh;
  margin-top: 5dvh;
}
.el-dialog.community-pin-dialog .el-dialog__body {
  min-height: 0;
  max-height: calc(90dvh - 110px);
  overflow-y: auto;
}
.el-dialog.community-pin-dialog .el-dialog__headerbtn {
  width: 44px;
  height: 44px;
}
.el-dialog.community-pin-dialog .el-dialog__title {
  font-size: 1.125rem;
}
</style>
