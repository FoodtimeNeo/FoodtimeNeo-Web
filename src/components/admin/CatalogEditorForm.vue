<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { PRICE_UNITS } from '@/utils/priceHistory.js';
import { DEFAULT_DISH_TAGS, groupDishTags } from '@/utils/dishTags.js';
import { fetchDishTags } from '@/api/smartRecommend.api.js';
import { saveManagedItem, fetchManagedItems } from '@/api/admin-manage.api.js';
import { uploadImage } from '@/api/submission.api.js';
import { validatePrice } from '@/utils/submissionValidation.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import ParentPicker from '@/components/admin/ParentPicker.vue';
import ImageFileField from '@/components/submission/ImageFileField.vue';
import MediaImage from '@/components/base/MediaImage.vue';
const props = defineProps({
  type: { type: String, required: true },
  item: { type: Object, default: null },
});
const emit = defineEmits(['saved', 'cancel']);
const auth = useAuthStore();
const loadParents = (page, options) =>
  fetchManagedItems(
    props.type === 'stalls' ? 'dining-halls' : 'stalls',
    page,
    '',
    options,
  );
const form = reactive({
  parentId: props.item?.parentId || '',
  name: props.item?.name || '',
  description: props.item?.description || '',
  price: props.item?.price === null ? '' : String(props.item?.price ?? ''),
  priceUnit: props.item?.priceUnit || 'unspecified',
  status: props.item?.status || 'active',
  sortOrder: String(props.item?.sortOrder ?? 0),
  latitude:
    props.item?.latitude === null || props.item?.latitude === undefined
      ? ''
      : String(props.item.latitude),
  longitude:
    props.item?.longitude === null || props.item?.longitude === undefined
      ? ''
      : String(props.item.longitude),
});
const file = ref(null);
const removeCover = ref(false);
const writing = ref(false);
const error = ref('');
const tagCatalog = ref([...DEFAULT_DISH_TAGS]);
const tagGroups = computed(() => groupDishTags(tagCatalog.value));
const selectedTags = ref(
  Array.isArray(props.item?.tags) ? [...props.item.tags] : [],
);
const tagsDirty = ref(false);
const resetAutoTags = ref(false);
let reference = '';
let active = true;
onMounted(async () => {
  if (props.type !== 'dishes') return;
  try {
    const loaded = await fetchDishTags();
    if (active && Array.isArray(loaded) && loaded.length) {
      tagCatalog.value = loaded;
    }
  } catch {
    // Fallback to DEFAULT_DISH_TAGS
  }
});
function toggleDishTag(code) {
  resetAutoTags.value = false;
  tagsDirty.value = true;
  const idx = selectedTags.value.indexOf(code);
  if (idx >= 0) selectedTags.value.splice(idx, 1);
  else selectedTags.value.push(code);
}
onUnmounted(() => {
  active = false;
  file.value = null;
  reference = '';
});
function chooseFile(value) {
  file.value = value;
  reference = '';
  if (value) removeCover.value = false;
}
async function submit() {
  if (writing.value) return;
  error.value = '';
  if (
    !form.name.trim() ||
    form.name.trim().length > (props.type === 'dishes' ? 120 : 100)
  ) {
    error.value = '请填写有效名称';
    return;
  }
  if (props.type !== 'dining-halls' && !form.parentId) {
    error.value = '请选择所属记录';
    return;
  }
  if (form.description && form.description.trim().length > 500) {
    error.value = '简介不能超过 500 字';
    return;
  }
  if (
    props.type === 'dishes' &&
    validatePrice(form.price, { required: true })
  ) {
    error.value = validatePrice(form.price, { required: true });
    return;
  }
  if (
    props.type !== 'dishes' &&
    (!/^-?\d+$/.test(form.sortOrder) ||
      Number(form.sortOrder) < -2147483648 ||
      Number(form.sortOrder) > 2147483647)
  ) {
    error.value = '排序值须为 32 位整数';
    return;
  }
  let latitude;
  let longitude;
  let clearCoordinates;
  if (props.type === 'dining-halls') {
    const latStr = String(form.latitude ?? '').trim();
    const lngStr = String(form.longitude ?? '').trim();
    if (latStr || lngStr) {
      if (!latStr || !lngStr) {
        error.value = '经纬度需同时填写或同时留空';
        return;
      }
      const parsedLat = Number(latStr);
      const parsedLng = Number(lngStr);
      if (
        !Number.isFinite(parsedLat) ||
        !Number.isFinite(parsedLng) ||
        parsedLat < -90 ||
        parsedLat > 90 ||
        parsedLng < -180 ||
        parsedLng > 180
      ) {
        error.value = '请输入合法的 WGS84 经纬度坐标';
        return;
      }
      latitude = parsedLat;
      longitude = parsedLng;
    } else if (
      props.item &&
      ((props.item.latitude !== null && props.item.latitude !== undefined) ||
        (props.item.longitude !== null && props.item.longitude !== undefined))
    ) {
      clearCoordinates = true;
    }
  }
  const actor = auth.user?.id;
  writing.value = true;
  try {
    if (file.value && !reference)
      reference = (await uploadImage(file.value)).imageUrl;
    if (!active || actor !== auth.user?.id) return;
    const result = await saveManagedItem(props.type, props.item?.id || '', {
      ...form,
      name: form.name.trim(),
      description: form.description || null,
      price: props.type === 'dishes' ? Number(form.price) : undefined,
      tags:
        props.type === 'dishes' && tagsDirty.value && !resetAutoTags.value
          ? [...selectedTags.value]
          : undefined,
      resetAutoTags:
        props.type === 'dishes' && resetAutoTags.value ? true : undefined,
      sortOrder: Number(form.sortOrder),
      latitude,
      longitude,
      clearCoordinates,
      coverImageUrl: removeCover.value
        ? null
        : reference || props.item?.coverImageUrl || null,
    });
    if (active) emit('saved', result);
  } catch (failure) {
    if (active) error.value = failure.message || '保存失败，请确认结果后再试';
  } finally {
    if (active) writing.value = false;
  }
}
</script>
<template>
  <form class="editor catalog-editor" @submit.prevent="submit">
    <h3>
      {{ item ? '编辑' : '新增'
      }}{{ { 'dining-halls': '食堂', stalls: '档口', dishes: '菜品' }[type] }}
    </h3>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="item && type !== 'dining-halls'">
      所属 ID：{{ item.parentId }}（保持原归属）
    </p>
    <ParentPicker
      v-else-if="type !== 'dining-halls'"
      v-model="form.parentId"
      :loader="loadParents"
      :disabled="writing"
    />
    <label
      >名称<input
        v-model="form.name"
        :maxlength="type === 'dishes' ? 120 : 100"
        :disabled="writing"
        required
    /></label>
    <label
      >简介<textarea
        v-model="form.description"
        :disabled="writing"
        rows="3"
        maxlength="500"
      />
    </label>
    <label v-if="type === 'dishes'"
      >价格<input v-model="form.price" inputmode="decimal" :disabled="writing"
    /></label>
    <label v-if="type === 'dishes'"
      >计价单位<select
        v-model="form.priceUnit"
        aria-label="计价单位"
        :disabled="writing"
      >
        <option
          v-for="(label, value) in PRICE_UNITS"
          :key="value"
          :value="value"
        >
          {{ label }}
        </option>
      </select></label
    >
    <fieldset v-if="type === 'dishes'" class="dish-tags-fieldset">
      <legend>
        菜品标签（{{
          resetAutoTags
            ? '保存后恢复自动识别'
            : tagsDirty || item?.tagsCustomized
              ? '人工覆写'
              : '自动识别'
        }}）
      </legend>
      <div
        v-for="group in tagGroups"
        :key="group.dimension"
        class="dish-tags-group"
      >
        <span class="dish-tags-group__title">{{ group.dimensionLabel }}</span>
        <div class="dish-tags-chips">
          <button
            v-for="tag in group.items"
            :key="tag.code"
            type="button"
            class="dish-tag-chip"
            :class="{
              'is-active': !resetAutoTags && selectedTags.includes(tag.code),
            }"
            :aria-pressed="!resetAutoTags && selectedTags.includes(tag.code)"
            :disabled="writing"
            @click="toggleDishTag(tag.code)"
          >
            {{ tag.label }}
          </button>
        </div>
      </div>
      <label v-if="item?.tagsCustomized" class="dish-tags-reset">
        <input v-model="resetAutoTags" type="checkbox" :disabled="writing" />
        <span>恢复系统自动识别标签</span>
      </label>
    </fieldset>
    <template v-if="type !== 'dishes'">
      <div v-if="type === 'dining-halls'" class="coord-grid">
        <label
          >纬度（可选）<input
            v-model="form.latitude"
            inputmode="decimal"
            placeholder="例如 39.951828"
            :disabled="writing"
        /></label>
        <label
          >经度（可选）<input
            v-model="form.longitude"
            inputmode="decimal"
            placeholder="例如 116.337199"
            :disabled="writing"
        /></label>
      </div>
      <label
        >排序值（数值越小越靠前）<input
          v-model="form.sortOrder"
          inputmode="numeric"
          placeholder="默认 0，支持负数"
          :disabled="writing"
      /></label>
      <MediaImage
        v-if="item?.coverImageUrl && !removeCover"
        :src="item.coverImageUrl"
        alt="现有封面"
        class="cover"
      />
      <label v-if="item?.coverImageUrl"
        >移除现有封面<input
          v-model="removeCover"
          type="checkbox"
          :disabled="writing"
      /></label>
      <ImageFileField
        :disabled="writing"
        :required="false"
        publication-hint="封面保存后随启用目录展示。"
        @change="chooseFile"
      />
      <p>目录封面可留空；选择图片后将上传本人文件。</p>
    </template>
    <label
      >状态<select
        v-model="form.status"
        aria-label="目录状态"
        :disabled="writing"
      >
        <option value="active">启用</option>
        <option value="inactive">停用</option>
      </select></label
    >
    <div>
      <button type="button" :disabled="writing" @click="emit('cancel')">
        取消</button
      ><button type="submit" :disabled="writing">
        {{ writing ? '保存中…' : '保存' }}
      </button>
    </div>
  </form>
</template>
<style scoped>
.editor {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 2px solid var(--ft-color-text);
  background: var(--zine-paper-card);
}
label {
  display: grid;
  gap: 8px;
}
input,
select,
textarea,
button {
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
}
button {
  margin-right: 12px;
  cursor: pointer;
}
.coord-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.cover {
  width: min(100%, 480px);
  height: 270px;
}
[role='alert'] {
  color: var(--ft-color-danger);
}
.dish-tags-fieldset {
  display: grid;
  gap: 10px;
  padding: 12px;
  margin: 0;
  border: 1px dashed var(--ft-border-control);
}
.dish-tags-fieldset legend {
  font-weight: 700;
  font-size: 13px;
  padding: 0 4px;
}
.dish-tags-group {
  display: grid;
  gap: 6px;
}
.dish-tags-group__title {
  font-size: 12px;
  color: var(--ft-color-text-muted);
}
.dish-tags-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.dish-tag-chip {
  min-height: 34px;
  margin-right: 0;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 999px;
}
.dish-tag-chip.is-active {
  background: var(--ft-color-primary);
  border-color: var(--ft-color-primary);
  color: #fff;
}
.dish-tags-reset {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.dish-tags-reset input {
  min-height: 18px;
  width: 18px;
  padding: 0;
}
</style>
