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
import {
  APK_DOWNLOAD_URL,
  APK_FILE_NAME,
  APK_SIZE,
} from '@/constants/download.js';
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
    <div class="auth-view__top-nav">
      <RouterLink :to="{ name: 'landing' }" class="auth-view__portal-link">
        <span aria-hidden="true">←</span> 进入官网
      </RouterLink>
    </div>
    <span class="sticker sticker--r-2">食堂手账 · SIGN IN</span>
    <h1><span>欢迎回来</span>登录</h1>
    <p class="auth-view__intro handwrite">先吃饱，再翻开今天的食堂档案。</p>
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

    <div class="auth-view__download-divider" aria-hidden="true">
      <span>或使用手机客户端</span>
    </div>
    <div class="auth-view__download-box">
      <a
        :href="APK_DOWNLOAD_URL"
        :download="APK_FILE_NAME"
        class="auth-view__download-btn button-ink is-stamp-blue"
        data-testid="login-download-apk-btn"
      >
        <span class="btn-icon" aria-hidden="true">📥</span>
        <span>下载安卓安装包</span>
      </a>
      <span class="auth-view__download-hint">
        官方客户端 · {{ APK_SIZE }} · 免商店直装
      </span>
    </div>
  </section>
</template>
<style scoped lang="scss">
.auth-view {
  position: relative;
  width: min(calc(100% - 32px), 420px);
  margin: 10vh auto;
  padding: var(--ft-space-4);
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  box-shadow: 8px 10px 0 rgb(58 36 24 / 24%);
  transform: rotate(-0.7deg);
}
h1 {
  margin: 0 0 var(--ft-space-3);
  font-family: var(--ft-font-family-title);
  font-size: 40px;

  span {
    display: block;
    color: var(--ft-color-primary);
    font-family: var(--ft-font-family-note);
    font-size: 22px;
    font-weight: 400;
  }
}
.auth-view__intro {
  margin: -8px 0 var(--ft-space-3);
  color: var(--ft-color-primary);
  font-size: 20px;
}
form {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}
.auth-view form :deep(.button-ink) {
  width: 100%;
}
.auth-view__error {
  color: var(--ft-color-danger);
  overflow-wrap: anywhere;
}
a {
  color: var(--ft-color-primary);
}

.auth-view__top-nav {
  margin-bottom: var(--ft-space-2);
}

.auth-view__portal-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--ft-font-size-sm);
  font-weight: 700;
  color: var(--ft-color-secondary);
  text-decoration: none;
  padding: 4px 10px;
  border-radius: var(--ft-radius-sm);
  background: rgb(58 36 24 / 6%);
  transition: all var(--ft-transition-fast);

  &:hover {
    color: var(--ft-color-primary);
    background: rgb(201 52 30 / 10%);
    transform: translateX(-2px);
  }
}

.auth-view__download-divider {
  display: flex;
  align-items: center;
  margin: var(--ft-space-3) 0 var(--ft-space-2);
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-xs);

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px dashed var(--ft-color-border);
  }

  span {
    padding: 0 10px;
  }
}

.auth-view__download-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;

  .auth-view__download-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-decoration: none;
    padding: 10px 16px;
    font-weight: 700;

    .btn-icon {
      font-size: 16px;
    }
  }

  .auth-view__download-hint {
    font-size: var(--ft-font-size-xs);
    color: var(--ft-color-text-muted);
  }
}

@media (max-width: 520px) {
  .auth-view {
    width: 100%;
    margin: 0;
    padding: var(--app-mobile-card-padding);
    box-shadow: var(--app-mobile-shadow);
    transform: none;
  }
}
</style>
