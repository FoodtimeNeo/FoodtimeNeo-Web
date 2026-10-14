<script setup>
import { computed, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  deleteCanteen,
  deleteDish,
  deleteStall,
  fetchManagedCanteens,
  fetchManagedStalls,
  saveCanteen,
  saveDish,
  saveStall,
} from '@/api/admin-manage.api.js';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import InkButton from '@/components/base/InkButton.vue';

const sections = [
  { id: 'canteens', label: '食堂' },
  { id: 'stalls', label: '档口' },
  { id: 'dishes', label: '菜品' },
];
const fields = {
  canteens: [
    { key: 'name', label: '名称', required: true },
    { key: 'short_name', label: '简称' },
    { key: 'location', label: '位置' },
    { key: 'summary', label: '简介', multiline: true },
  ],
  stalls: [
    { key: 'name', label: '名称', required: true },
    { key: 'avg_price', label: '人均价格说明' },
    { key: 'summary', label: '简介', multiline: true },
  ],
  dishes: [
    { key: 'name', label: '名称', required: true },
    { key: 'price', label: '价格（元）', type: 'number', min: 0 },
    { key: 'value_note', label: '推荐短语' },
    { key: 'description', label: '介绍', multiline: true },
  ],
};

const kind = ref('canteens');
const canteens = ref([]);
const stalls = ref([]);
const selectedCanteenId = ref('');
const selectedStallId = ref('');
const canteensLoading = ref(false);
const stallsLoading = ref(false);
const canteensError = ref(null);
const stallsError = ref(null);
const editingId = ref('');
const formOpen = ref(false);
const form = ref({});
const formError = ref('');
const actionError = ref('');
const saving = ref(false);
const deletingId = ref('');

const selectedStall = computed(() =>
  stalls.value.find((stall) => stall.id === selectedStallId.value),
);
const items = computed(() => {
  if (kind.value === 'canteens') return canteens.value;
  if (kind.value === 'stalls') return stalls.value;
  return selectedStall.value?.dishes ?? [];
});
const loading = computed(
  () =>
    canteensLoading.value || (kind.value !== 'canteens' && stallsLoading.value),
);
const error = computed(
  () => canteensError.value || (kind.value !== 'canteens' && stallsError.value),
);
const canCreate = computed(
  () =>
    kind.value === 'canteens' ||
    (kind.value === 'stalls' && !!selectedCanteenId.value) ||
    (kind.value === 'dishes' && !!selectedStallId.value),
);

async function loadCanteens(preferredId = selectedCanteenId.value) {
  canteensLoading.value = true;
  canteensError.value = null;
  try {
    const data = await fetchManagedCanteens();
    canteens.value = Array.isArray(data) ? data : [];
    selectedCanteenId.value = canteens.value.some(
      (item) => item.id === preferredId,
    )
      ? preferredId
      : (canteens.value[0]?.id ?? '');
  } catch (caught) {
    canteensError.value = caught;
    canteens.value = [];
    selectedCanteenId.value = '';
  } finally {
    canteensLoading.value = false;
  }
}

async function loadStalls(preferredId = selectedStallId.value) {
  const canteenId = selectedCanteenId.value;
  if (!canteenId) {
    stalls.value = [];
    selectedStallId.value = '';
    stallsError.value = null;
    return;
  }
  stallsLoading.value = true;
  stallsError.value = null;
  try {
    const data = await fetchManagedStalls(canteenId);
    if (canteenId !== selectedCanteenId.value) return;
    stalls.value = Array.isArray(data) ? data : [];
    selectedStallId.value = stalls.value.some((item) => item.id === preferredId)
      ? preferredId
      : (stalls.value[0]?.id ?? '');
  } catch (caught) {
    if (canteenId !== selectedCanteenId.value) return;
    stallsError.value = caught;
    stalls.value = [];
    selectedStallId.value = '';
  } finally {
    if (canteenId === selectedCanteenId.value) stallsLoading.value = false;
  }
}

function resetForm() {
  formOpen.value = false;
  editingId.value = '';
  formError.value = '';
  actionError.value = '';
}

function startCreate() {
  if (!canCreate.value) return;
  editingId.value = '';
  form.value = Object.fromEntries(
    fields[kind.value].map(({ key }) => [key, '']),
  );
  formError.value = '';
  formOpen.value = true;
}

function startEdit(item) {
  editingId.value = item.id;
  form.value = Object.fromEntries(
    fields[kind.value].map(({ key }) => [
      key,
      item[key] ??
        item[key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())] ??
        '',
    ]),
  );
  formError.value = '';
  formOpen.value = true;
}

async function save() {
  if (saving.value) return;
  formError.value = '';
  const payload = Object.fromEntries(
    Object.entries(form.value).map(([key, value]) => [
      key,
      String(value).trim(),
    ]),
  );
  if (!payload.name) {
    formError.value = '请填写名称。';
    return;
  }
  if (kind.value === 'dishes') {
    if (
      payload.price &&
      (!Number.isFinite(Number(payload.price)) || Number(payload.price) < 0)
    ) {
      formError.value = '价格须为不小于 0 的数字。';
      return;
    }
    payload.price = payload.price === '' ? null : Number(payload.price);
    if (!editingId.value) {
      payload.canteen_id = selectedCanteenId.value;
      payload.stall_id = selectedStallId.value;
    }
  }
  saving.value = true;
  try {
    let result;
    if (kind.value === 'canteens')
      result = await saveCanteen(editingId.value, payload);
    else if (kind.value === 'stalls')
      result = await saveStall(
        selectedCanteenId.value,
        editingId.value,
        payload,
      );
    else result = await saveDish(editingId.value, payload);
    const wasEditing = !!editingId.value;
    resetForm();
    ElMessage.success(wasEditing ? '修改成功' : '创建成功');
    if (kind.value === 'canteens')
      await loadCanteens(result?.id || selectedCanteenId.value);
    else if (kind.value === 'stalls')
      await loadStalls(result?.id || selectedStallId.value);
    else await loadStalls();
  } catch (caught) {
    formError.value = caught.message || '保存失败，请稍后重试。';
  } finally {
    saving.value = false;
  }
}

async function remove(item) {
  if (deletingId.value) return;
  try {
    await ElMessageBox.confirm(
      `确定删除「${item.name}」吗？删除后不可恢复。`,
      '二次确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  deletingId.value = item.id;
  actionError.value = '';
  try {
    if (kind.value === 'canteens') {
      await deleteCanteen(item.id);
      selectedCanteenId.value = '';
      await loadCanteens();
    } else if (kind.value === 'stalls') {
      await deleteStall(item.id);
      selectedStallId.value = '';
      await loadStalls();
    } else {
      await deleteDish(item.id);
      await loadStalls();
    }
    resetForm();
    ElMessage.success('删除成功');
  } catch (caught) {
    actionError.value = caught.message || '删除失败，请稍后重试。';
  } finally {
    deletingId.value = '';
  }
}

watch(selectedCanteenId, () => {
  stalls.value = [];
  selectedStallId.value = '';
  stallsLoading.value = false;
  loadStalls();
});
watch([kind, selectedCanteenId, selectedStallId], resetForm);
loadCanteens();
</script>

<template>
  <section class="admin-manage" aria-labelledby="manage-title">
    <div class="admin-manage__heading">
      <div>
        <h2 id="manage-title">食堂内容管理</h2>
        <p>按食堂 → 档口 → 菜品的顺序维护内容。</p>
      </div>
      <InkButton
        :disabled="loading"
        @click="kind === 'canteens' ? loadCanteens() : loadStalls()"
      >
        刷新列表
      </InkButton>
    </div>

    <div class="admin-manage__tabs" role="group" aria-label="管理类型">
      <button
        v-for="section in sections"
        :key="section.id"
        type="button"
        :aria-pressed="kind === section.id"
        @click="kind = section.id"
      >
        {{ section.label }}
      </button>
    </div>

    <div v-if="kind !== 'canteens'" class="admin-manage__filters">
      <label for="manage-canteen">所属食堂</label>
      <select
        id="manage-canteen"
        v-model="selectedCanteenId"
        :disabled="canteensLoading"
      >
        <option
          v-for="canteen in canteens"
          :key="canteen.id"
          :value="canteen.id"
        >
          {{ canteen.name }}
        </option>
      </select>
      <template v-if="kind === 'dishes' && stalls.length">
        <label for="manage-stall">所属档口</label>
        <select
          id="manage-stall"
          v-model="selectedStallId"
          :disabled="stallsLoading"
        >
          <option v-for="stall in stalls" :key="stall.id" :value="stall.id">
            {{ stall.name }}
          </option>
        </select>
      </template>
    </div>

    <LoadingState v-if="loading" message="正在读取内容…" />
    <ErrorState
      v-else-if="error"
      :description="error.message"
      @retry="canteensError ? loadCanteens() : loadStalls()"
    />
    <template v-else>
      <div class="admin-manage__toolbar">
        <strong
          >{{ sections.find((section) => section.id === kind).label }}（{{
            items.length
          }}）</strong
        >
        <InkButton v-if="canCreate" @click="startCreate">新增</InkButton>
      </div>
      <p v-if="actionError" class="admin-manage__error" role="alert">
        {{ actionError }}
      </p>
      <EmptyState
        v-if="!items.length"
        :title="
          kind === 'canteens'
            ? '还没有食堂'
            : kind === 'stalls'
              ? '该食堂还没有档口'
              : '该档口还没有菜品'
        "
        description="可以使用上方的新增按钮开始录入。"
      />
      <ul v-else class="admin-manage__list">
        <li v-for="item in items" :key="item.id" class="admin-manage__item">
          <div>
            <strong>{{ item.name }}</strong>
            <small v-if="kind === 'dishes'">{{
              item.price == null ? '未标价' : `¥${item.price}`
            }}</small>
            <p v-if="item.summary || item.description">
              {{ item.summary || item.description }}
            </p>
          </div>
          <div class="admin-manage__actions">
            <InkButton :disabled="!!deletingId" @click="startEdit(item)"
              >编辑</InkButton
            >
            <InkButton :disabled="!!deletingId" @click="remove(item)">
              {{ deletingId === item.id ? '删除中…' : '删除' }}
            </InkButton>
          </div>
        </li>
      </ul>
    </template>

    <form v-if="formOpen" class="admin-manage__form" @submit.prevent="save">
      <h3>
        {{ editingId ? '编辑' : '新增'
        }}{{ sections.find((section) => section.id === kind).label }}
      </h3>
      <div
        v-for="field in fields[kind]"
        :key="field.key"
        class="admin-manage__field"
      >
        <label :for="`manage-${field.key}`"
          >{{ field.label }}{{ field.required ? ' *' : '' }}</label
        >
        <textarea
          v-if="field.multiline"
          :id="`manage-${field.key}`"
          v-model="form[field.key]"
          rows="3"
          :disabled="saving"
        />
        <input
          v-else
          :id="`manage-${field.key}`"
          v-model="form[field.key]"
          :type="field.type || 'text'"
          :min="field.min"
          :step="field.type === 'number' ? '0.01' : undefined"
          :required="field.required"
          :disabled="saving"
        />
      </div>
      <p v-if="formError" class="admin-manage__error" role="alert">
        {{ formError }}
      </p>
      <div class="admin-manage__actions">
        <InkButton type="submit" variant="primary" :disabled="saving">
          {{ saving ? '保存中…' : '保存' }}
        </InkButton>
        <InkButton :disabled="saving" @click="resetForm">取消</InkButton>
      </div>
    </form>
  </section>
</template>

<style scoped lang="scss">
.admin-manage {
  &__heading,
  &__toolbar,
  &__item,
  &__actions,
  &__tabs,
  &__filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ft-space-2);
  }

  &__heading,
  &__toolbar,
  &__item {
    justify-content: space-between;
  }

  &__heading h2,
  &__form h3 {
    margin: 0;
    font-family: var(--ft-font-family-title);
  }

  &__heading p,
  &__item p {
    margin-bottom: 0;
    color: var(--ft-color-text-muted);
  }

  &__tabs,
  &__filters,
  &__toolbar {
    margin: var(--ft-space-3) 0;
  }

  &__tabs button,
  &__filters select,
  &__field input,
  &__field textarea {
    min-height: 44px;
    padding: 8px 12px;
    border: 1px solid var(--ft-color-text);
    background: var(--zine-paper-card);
    color: var(--ft-color-text);
    font: inherit;
  }

  &__tabs button {
    font-weight: 700;
    cursor: pointer;
  }

  &__tabs button[aria-pressed='true'] {
    background: var(--ft-color-text);
    color: var(--zine-paper-card);
  }

  &__list {
    display: grid;
    gap: var(--ft-space-2);
    padding: 0;
    list-style: none;
  }

  &__item,
  &__form {
    padding: var(--ft-space-2);
    border: 2px solid var(--ft-color-text);
    background: var(--zine-paper-card-alt);
    box-shadow: 4px 4px 0 var(--ft-color-text);
  }

  &__item small {
    margin-left: var(--ft-space-1);
  }

  &__form {
    display: grid;
    gap: var(--ft-space-2);
    margin-top: var(--ft-space-4);
  }

  &__field {
    display: grid;
    gap: var(--ft-space-1);
  }

  &__error {
    color: var(--ft-color-danger);
  }
}
</style>
