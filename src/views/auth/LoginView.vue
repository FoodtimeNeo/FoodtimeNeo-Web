<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/store/useAuthStore.js';
import AuthField from '@/components/auth/AuthField.vue';
import InkButton from '@/components/base/InkButton.vue';
import { validateLoginId, validatePassword } from '@/utils/authValidators.js';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const form = reactive({ loginId: '', password: '' });
const errors = reactive({ loginId: '', password: '' });
const submitting = ref(false);

function validate() {
  errors.loginId = validateLoginId(form.loginId);
  errors.password = validatePassword(form.password);
  return !errors.loginId && !errors.password;
}

async function handleSubmit() {
  if (submitting.value || !validate()) return;
  submitting.value = true;
  try {
    await auth.login({ loginId: form.loginId.trim(), password: form.password });
    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : null;
    router.replace(redirect || { name: 'home' });
  } catch (error) {
    ElMessage.error(error.message || '登录失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="auth-view">
    <h1 class="auth-view__title">登录</h1>
    <p class="auth-view__hint">北交干饭吧 · 用邮箱或账号登录</p>
    <form class="auth-view__form" novalidate @submit.prevent="handleSubmit">
      <AuthField
        v-model="form.loginId"
        label="邮箱或账号"
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
      <InkButton variant="primary" type="submit" :disabled="submitting">
        {{ submitting ? '登录中…' : '登录' }}
      </InkButton>
    </form>
    <p class="auth-view__switch">
      还没有账号？
      <RouterLink :to="{ name: 'register' }">去注册</RouterLink>
    </p>
  </section>
</template>

<style scoped lang="scss">
.auth-view {
  width: min(100% - 32px, 420px);
  margin: 10vh auto;
  padding: var(--ft-space-4);
  border: 2px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  box-shadow: 8px 8px 0 var(--ft-color-text);

  &__title {
    margin: 0;
    font-family: var(--ft-font-family-title);
    font-size: 40px;
  }

  &__hint {
    margin: var(--ft-space-1) 0 var(--ft-space-3);
    color: var(--ft-color-text-muted);
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: var(--ft-space-2);
  }

  &__switch {
    margin-top: var(--ft-space-3);

    a {
      color: var(--ft-color-primary);
      font-weight: 700;
    }
  }
}
</style>
