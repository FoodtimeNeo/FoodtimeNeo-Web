<script setup>
import { nextTick, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/store/useAuthStore.js';
import AuthField from '@/components/auth/AuthField.vue';
import InkButton from '@/components/base/InkButton.vue';
import {
  validateLoginId,
  validatePassword,
  safeRedirect,
} from '@/utils/authValidators.js';
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const form = reactive({ loginId: '', password: '' });
const errors = reactive({ loginId: '', password: '' });
const submitting = ref(false);
const serverError = ref('');
const formElement = ref(null);
async function handleSubmit() {
  if (submitting.value) return;
  errors.loginId = validateLoginId(form.loginId);
  errors.password = validatePassword(form.password);
  serverError.value = '';
  if (errors.loginId || errors.password) {
    await nextTick();
    formElement.value?.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  submitting.value = true;
  try {
    await auth.login({ loginId: form.loginId.trim(), password: form.password });
    form.password = '';
    await router.replace(
      safeRedirect(route.query.redirect) || { name: 'home' },
    );
  } catch (error) {
    serverError.value = error.message || '登录失败';
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <section class="auth-view">
    <h1>登录</h1>
    <form ref="formElement" novalidate @submit.prevent="handleSubmit">
      <p v-if="serverError" role="alert" class="auth-view__error">
        {{ serverError }}
      </p>
      <AuthField
        v-model="form.loginId"
        label="邮箱"
        type="email"
        autocomplete="username"
        :error="errors.loginId"
      />
      <AuthField
        v-model="form.password"
        label="密码"
        type="password"
        autocomplete="current-password"
        :error="errors.password"
      />
      <InkButton variant="primary" type="submit" :disabled="submitting">{{
        submitting ? '登录中…' : '登录'
      }}</InkButton>
    </form>
    <p>
      还没有账号？<RouterLink :to="{ name: 'register' }">去注册</RouterLink>
    </p>
  </section>
</template>
<style scoped>
.auth-view {
  width: min(calc(100% - 32px), 420px);
  margin: 10vh auto;
  padding: var(--ft-space-4);
  border: 2px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  box-shadow: 8px 8px 0 var(--ft-color-text);
}
h1 {
  margin: 0 0 var(--ft-space-3);
  font-family: var(--ft-font-family-title);
  font-size: 40px;
}
form {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}
.auth-view__error {
  color: var(--ft-color-danger);
  overflow-wrap: anywhere;
}
a {
  color: var(--ft-color-primary);
}
</style>
