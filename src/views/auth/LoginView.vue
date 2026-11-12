<script setup>
import { computed, nextTick, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/store/useAuthStore.js';
import { fetchCaptcha } from '@/api/auth.api.js';
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
.auth-view__stamp-decor {
  position: absolute;
  top: 16px;
  right: 18px;
  width: 76px;
  height: auto;
  opacity: 0.86;
  transform: rotate(10deg);
  pointer-events: none;
  filter: drop-shadow(1px 2px 2px rgba(58, 36, 24, 0.12));
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
.auth-view__captcha {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
  align-items: flex-start;

  img {
    border: 1px solid var(--ft-color-secondary);
    background: #f8f4ec;
  }
}
.auth-view__captcha-refresh {
  border: 0;
  background: transparent;
  color: var(--ft-color-primary);
  cursor: pointer;
  text-decoration: underline;
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
