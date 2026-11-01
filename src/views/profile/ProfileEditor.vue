<script setup>
import { onUnmounted, ref, useId } from 'vue';
import { updateOwnProfile } from '@/api/profile.api.js';
import { uploadImage } from '@/api/submission.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import ImageFileField from '@/components/submission/ImageFileField.vue';
import InkButton from '@/components/base/InkButton.vue';

const props = defineProps({ user: { type: Object, required: true } });
const emit = defineEmits(['saved', 'cancel']);
const auth = useAuthStore();
const nameId = useId();
const displayName = ref(props.user.displayName);
const removeAvatar = ref(false);
const file = ref(null);
const imageField = ref(null);
const checking = ref(false);
const saving = ref(false);
const error = ref('');
let uploaded = null;
let active = true;
onUnmounted(() => {
  active = false;
});

function choose(selected) {
  file.value = selected;
  uploaded = null;
  error.value = '';
}
async function save() {
  if (saving.value || checking.value) return;
  error.value = '';
  const name = displayName.value.trim();
  if (!name || name.length > 50) {
    error.value = '昵称须为1–50个字符';
    return;
  }
  if (!removeAvatar.value && !imageField.value.isValid()) {
    imageField.value.focus();
    return;
  }
  const actor = props.user.id;
  const sameUser = () => active && auth.user?.id === actor;
  if (!sameUser()) {
    error.value = '登录状态已变化，请重新打开资料页';
    return;
  }
  saving.value = true;
  try {
    let avatarUrl = removeAvatar.value ? null : props.user.avatarUrl || null;
    if (file.value && !removeAvatar.value) {
      if (!uploaded) uploaded = await uploadImage(file.value);
      avatarUrl = uploaded.imageUrl;
    }
    if (!sameUser()) throw new Error('登录状态已变化，请重新打开资料页');
    const updated = await updateOwnProfile({ displayName: name, avatarUrl });
    if (sameUser()) emit('saved', updated);
  } catch (failure) {
    if (active) error.value = failure.message || '保存失败，请重试';
  } finally {
    if (active) saving.value = false;
  }
}
</script>

<template>
  <form
    class="profile-editor"
    aria-label="编辑个人资料"
    :aria-busy="saving"
    @submit.prevent="save"
  >
    <h2>编辑资料</h2>
    <label :for="nameId">昵称</label>
    <input
      :id="nameId"
      v-model="displayName"
      name="displayName"
      autocomplete="nickname"
      maxlength="50"
      :disabled="saving"
      :aria-describedby="`${nameId}-help`"
    />
    <p :id="nameId + '-help'">1–50个字符。未选择新头像时保留当前头像。</p>
    <ImageFileField
      ref="imageField"
      label="新头像"
      :required="false"
      :disabled="saving || removeAvatar"
      publication-hint="保存资料后更新头像。"
      @change="choose"
      @checking="checking = $event"
    />
    <label v-if="user.avatarUrl" class="profile-editor__clear">
      <input
        v-model="removeAvatar"
        type="checkbox"
        :disabled="saving"
      />移除当前头像
    </label>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="saving" role="status">正在保存资料…</p>
    <div class="profile-editor__actions">
      <InkButton type="submit" :disabled="saving || checking">{{
        saving ? '保存中…' : '保存资料'
      }}</InkButton>
      <InkButton type="button" :disabled="saving" @click="emit('cancel')"
        >取消</InkButton
      >
    </div>
  </form>
</template>

<style scoped>
.profile-editor {
  display: grid;
  gap: 12px;
  padding: var(--ft-space-3);
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  margin: 24px 0;
}
h2,
p {
  margin: 0;
}
input[name='displayName'] {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  box-sizing: border-box;
  border: 1px solid var(--ft-color-text);
  font: inherit;
  color: var(--ft-color-text);
  background: var(--zine-paper-card);
}
.profile-editor__clear,
.profile-editor__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-height: 44px;
}
.profile-editor__clear input {
  width: 24px;
  height: 24px;
}
[role='alert'] {
  color: var(--ft-color-danger);
}
</style>
