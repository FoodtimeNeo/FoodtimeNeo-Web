<script setup>
import { computed, nextTick, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/store/useAuthStore.js';
import { fetchCaptcha } from '@/api/auth.api.js';
import AuthField from '@/components/auth/AuthField.vue';
import InkButton from '@/components/base/InkButton.vue';
import TestingApkDownload from '@/components/common/TestingApkDownload.vue';
import {
  validateLoginId,
  validatePassword,
  safeRedirect,
} from '@/utils/authValidators.js';
import {
  APK_DOWNLOAD_URL,
  APK_FILE_NAME,
  APK_SIZE,
  APK_VERSION,
} from '@/constants/download.js';
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const form = reactive({ loginId: '', password: '' });
const errors = reactive({ loginId: '', password: '' });
const submitting = ref(false);
const serverError = ref('');
const formElement = ref(null);
const captcha = ref(null);
const captchaAnswer = ref('');
const captchaError = ref('');
const captchaLoading = ref(false);
const captchaImage = computed(
  () => captcha.value && `data:image/png;base64,${captcha.value.imageBase64}`,
);
async function loadCaptcha() {
  captchaLoading.value = true;
  captchaError.value = '';
  try {
    captcha.value = await fetchCaptcha();
    captchaAnswer.value = '';
  } catch (error) {
    captcha.value = null;
    captchaError.value = error.message || '无法获取验证码，请重试';
  } finally {
    captchaLoading.value = false;
  }
}
async function handleSubmit() {
  if (submitting.value || captchaLoading.value) return;
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
    const payload = {
      loginId: form.loginId.trim(),
      password: form.password,
    };
    if (captcha.value?.challengeId && captchaAnswer.value.trim()) {
      payload.challengeId = captcha.value.challengeId;
      payload.challengeAnswer = captchaAnswer.value.trim();
    }
    await auth.login(payload);
    form.password = '';
    captcha.value = null;
    captchaAnswer.value = '';
    await router.replace(
      auth.isRestricted
        ? { name: 'appealOnly' }
        : safeRedirect(route.query.redirect) || { name: 'home' },
    );
  } catch (error) {
    serverError.value = error.message || '登录失败';
    if (['CAPTCHA_REQUIRED', 'CAPTCHA_INVALID'].includes(error?.bizCode)) {
      await loadCaptcha();
      if (captchaError.value) serverError.value = captchaError.value;
    }
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
    <p v-if="route.query.accountDeleted === '1'" role="status">
      账号已注销。邮箱冷却 1
      小时后可重新注册；重新注册是全新账号，不继承原账号数据。
    </p>
    <img
      src="@/assets/images/decoration02/B/stickers/B_better-campus-food-stamp.png"
      alt=""
      class="auth-view__stamp-decor"
      aria-hidden="true"
    />
    <form ref="formElement" novalidate @submit.prevent="handleSubmit">
      <p v-if="serverError" role="alert" class="auth-view__error">
        {{ serverError }}
      </p>
      <AuthField
        v-model="form.loginId"
        label="邮箱或学号"
        type="text"
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
      <p v-if="captchaLoading" role="status">正在获取验证码…</p>
      <div v-if="captcha" class="auth-view__captcha">
        <img :src="captchaImage" alt="登录验证码图片" width="160" height="60" />
        <AuthField
          v-model="captchaAnswer"
          label="验证码答案"
          inputmode="numeric"
          autocomplete="off"
          :maxlength="4"
        />
        <button
          type="button"
          class="auth-view__captcha-refresh"
          :disabled="captchaLoading"
          @click="loadCaptcha"
        >
          换一题
        </button>
      </div>
      <p v-if="captchaError" role="alert" class="auth-view__error">
        {{ captchaError }}
      </p>
      <InkButton
        variant="primary"
        type="submit"
        :disabled="submitting || captchaLoading"
        >{{ submitting ? '登录中…' : '登录' }}</InkButton
      >
      <RouterLink :to="{ name: 'forgotPassword' }">忘记密码？</RouterLink>
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
        正式版 {{ APK_VERSION }} · {{ APK_SIZE }} · 免商店直装
      </span>
    </div>
    <TestingApkDownload />
  </section>
</template>
<style scoped lang="scss">
.auth-view {
  position: relative;
  width: min(calc(100% - 32px), 440px);
  margin: 8vh auto;
  padding: 28px 32px 32px;
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-lg);
  background: var(--zine-paper-card);
  box-shadow: var(--ft-shadow-card-hover);

  .sticker {
    border-color: var(--ft-border-subtle);
    border-radius: var(--ft-radius-pill);
    background: var(--zine-paper-card-alt);
    box-shadow: none;
    color: var(--ft-color-text-muted);
    transform: none;
  }
}
h1 {
  margin: 12px 0 var(--ft-space-3);
  font-family: var(--ft-font-family-title);
  font-size: 36px;
  line-height: 1.2;

  span {
    display: block;
    margin-bottom: 2px;
    color: var(--ft-color-primary);
    font-family: var(--ft-font-family-note);
    font-size: 21px;
    font-weight: 400;
  }
}
.auth-view__stamp-decor {
  position: absolute;
  top: 20px;
  right: 22px;
  width: 68px;
  height: auto;
  opacity: 0.78;
  transform: rotate(8deg);
  pointer-events: none;
  filter: drop-shadow(0 2px 4px rgb(58 36 24 / 12%));
}
form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.auth-view form :deep(.button-ink) {
  width: 100%;
}
.auth-view__error {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgb(201 52 30 / 28%);
  border-radius: var(--ft-radius-md);
  background: var(--zine-stamp-red-soft);
  color: var(--ft-color-danger);
  font-size: var(--ft-font-size-sm);
  overflow-wrap: anywhere;
}
.auth-view__captcha {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-md);
  background: var(--zine-paper-card-alt);

  img {
    border: 1px solid var(--ft-border-control);
    border-radius: var(--ft-radius-sm);
    background: var(--ft-color-surface);
  }
}
.auth-view__captcha-refresh {
  border: 0;
  padding: 4px 0;
  background: transparent;
  color: var(--ft-color-primary);
  font-size: var(--ft-font-size-sm);
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}
a {
  color: var(--ft-color-primary);
  font-weight: 600;
}

.auth-view__top-nav {
  margin-bottom: var(--ft-space-2);
}

.auth-view__portal-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--ft-font-size-sm);
  font-weight: 700;
  color: var(--ft-color-text-muted);
  text-decoration: none;
  padding: 5px 12px;
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-pill);
  background: var(--zine-paper-card-alt);
  transition: all var(--ft-transition-fast);

  &:hover {
    color: var(--ft-color-primary);
    border-color: var(--ft-color-primary);
    background: var(--zine-stamp-red-soft);
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
    border-bottom: 1px solid var(--ft-border-subtle);
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
    font-family: var(--ft-font-family);
    font-size: var(--ft-font-size-sm);
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
    width: calc(100% - 24px);
    margin: 20px auto;
    padding: 22px 18px 24px;
    box-shadow: var(--ft-shadow-card);
  }
}
</style>
