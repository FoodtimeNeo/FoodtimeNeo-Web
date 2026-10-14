<script setup>
import { nextTick, onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { changePassword } from '@/api/auth.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import { validatePassword } from '@/utils/authValidators.js';
import AuthField from '@/components/auth/AuthField.vue';
import InkButton from '@/components/base/InkButton.vue';
const router = useRouter();
const auth = useAuthStore();
const form = reactive({ oldPassword: '', newPassword: '' });
const errors = reactive({ oldPassword: '', newPassword: '' });
const submitting = ref(false);
const message = ref('');
const element = ref(null);
onUnmounted(() => {
  form.oldPassword = '';
  form.newPassword = '';
});
async function submit() {
  if (submitting.value) return;
  errors.oldPassword = validatePassword(form.oldPassword);
  errors.newPassword =
    validatePassword(form.newPassword, { isNew: true }) ||
    (form.newPassword === form.oldPassword ? '新密码不能与旧密码相同' : '');
  message.value = '';
  if (errors.oldPassword || errors.newPassword) {
    await nextTick();
    element.value?.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  submitting.value = true;
  try {
    await changePassword({ ...form });
    form.oldPassword = '';
    form.newPassword = '';
    auth.clear();
    await router.replace({ name: 'login' });
  } catch (error) {
    message.value = error.message || '修改失败，请确认结果后再试';
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <div class="password-page">
    <RouterLink :to="{ name: 'profile' }">← 返回我的</RouterLink>
    <h1 class="section-title">修改密码</h1>
    <form ref="element" novalidate @submit.prevent="submit">
      <p v-if="message" role="alert">{{ message }}</p>
      <AuthField
        v-model="form.oldPassword"
        label="旧密码"
        type="password"
        autocomplete="current-password"
        :error="errors.oldPassword"
      />
      <AuthField
        v-model="form.newPassword"
        label="新密码"
        type="password"
        autocomplete="new-password"
        :error="errors.newPassword"
      />
      <p>8–128 位 ASCII 字符，须含字母和数字。修改后需要重新登录。</p>
      <InkButton type="submit" variant="primary" :disabled="submitting">{{
        submitting ? '修改中…' : '修改密码'
      }}</InkButton>
    </form>
  </div>
</template>
<style scoped>
.password-page {
  padding: var(--ft-space-3);
  width: min(100%, 540px);
  margin: auto;
}
form {
  display: grid;
  gap: 16px;
}
[role='alert'] {
  color: var(--ft-color-danger);
}
</style>
