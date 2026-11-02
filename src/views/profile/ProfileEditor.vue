<script setup>
import { onUnmounted, ref, useId } from 'vue';
import { updateOwnProfile, uploadAvatar } from '@/api/profile.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import AvatarCropper from '@/components/profile/AvatarCropper.vue';
import MediaImage from '@/components/base/MediaImage.vue';
import { validateAvatarFile } from '@/utils/avatarCrop.js';
import InkButton from '@/components/base/InkButton.vue';

const props = defineProps({ user: { type: Object, required: true } });
const emit = defineEmits(['saved', 'cancel']);
const auth = useAuthStore();
const nameId = useId();
const displayName = ref(props.user.displayName);
const removeAvatar = ref(false);
const file = ref(null);
const fileInput = ref(null),
  cropFile = ref(null),
  preview = ref(''),
  invalidSelection = ref(false);
const saving = ref(false);
const error = ref('');
let uploaded = null;
let active = true;
onUnmounted(() => {
  active = false;
  if (preview.value) URL.revokeObjectURL(preview.value);
});

function choose(event) {
  const selected = event.target.files?.[0];
  event.target.value = '';
  if (!selected || saving.value) return;
  error.value = validateAvatarFile(selected);
  invalidSelection.value = Boolean(error.value);
  if (!error.value) cropFile.value = selected;
}
function acceptCrop(selected) {
  if (preview.value) URL.revokeObjectURL(preview.value);
  file.value = selected;
  preview.value = URL.createObjectURL(selected);
  cropFile.value = null;
  removeAvatar.value = false;
  uploaded = null;
  error.value = '';
}
async function save() {
  if (saving.value || cropFile.value || invalidSelection.value) return;
  error.value = '';
  const name = displayName.value.trim();
  if (!name || name.length > 50) {
    error.value = '昵称须为1–50个字符';
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
      if (!uploaded) uploaded = await uploadAvatar(file.value);
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
    <div class="profile-editor__avatar">
      <img
        v-if="preview && !removeAvatar"
        :src="preview"
        alt="新头像预览，尚未保存"
      />
      <MediaImage
        v-else-if="user.avatarUrl && !removeAvatar"
        :src="user.avatarUrl"
        alt="当前头像"
        compact
      />
      <span v-else aria-label="默认头像">{{
        displayName.slice(0, 1) || '同'
      }}</span>
      <p v-if="file && !removeAvatar">方形头像已裁剪，保存资料后更新。</p>
    </div>
    <input
      ref="fileInput"
      hidden
      type="file"
      accept="image/jpeg,image/png"
      aria-label="头像图片文件"
      :disabled="saving || removeAvatar"
      @change="choose"
    />
    <InkButton
      type="button"
      :disabled="saving || removeAvatar"
      @click="fileInput?.click()"
      >选择新头像</InkButton
    >
    <p>JPEG / PNG，原图不超过10MB。选择后进行1:1方形裁剪。</p>
    <InkButton
      v-if="invalidSelection"
      type="button"
      @click="
        invalidSelection = false;
        error = '';
      "
      >取消选择</InkButton
    >
    <AvatarCropper
      v-if="cropFile"
      :file="cropFile"
      @confirm="acceptCrop"
      @cancel="cropFile = null"
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
      <InkButton
        type="submit"
        :disabled="saving || Boolean(cropFile) || invalidSelection"
        >{{ saving ? '保存中…' : '保存资料' }}</InkButton
      >
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
.profile-editor__avatar {
  display: flex;
  align-items: center;
  gap: 16px;
}
.profile-editor__avatar > img,
.profile-editor__avatar > span,
.profile-editor__avatar > :deep(.media-image) {
  width: 88px;
  height: 88px;
  object-fit: cover;
}
.profile-editor__avatar > span {
  display: grid;
  place-items: center;
  background: var(--ft-color-bg);
  font-size: 30px;
}
input[hidden] {
  display: none !important;
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
