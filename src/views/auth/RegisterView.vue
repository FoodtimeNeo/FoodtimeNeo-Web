<script setup>
import { computed, nextTick, onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/useAuthStore.js';
import { sendVerificationCode } from '@/api/auth.api.js';
import AuthField from '@/components/auth/AuthField.vue';
import InkButton from '@/components/base/InkButton.vue';
import {
  validateEmail,
  validatePassword,
  validateVerificationCode,
} from '@/utils/authValidators.js';
const router = useRouter();
const auth = useAuthStore();
const form = reactive({ email: '', password: '', verificationCode: '' });
const errors = reactive({ email: '', password: '', verificationCode: '' });
const submitting = ref(false);
const sending = ref(false);
const serverError = ref('');
const notice = ref('');
const countdown = ref(0);
const formElement = ref(null);
let timer;
const canSendCode = computed(
  () =>
    !sending.value &&
    !submitting.value &&
    countdown.value === 0 &&
    !validateEmail(form.email),
);
onUnmounted(() => clearInterval(timer));
async function handleSendCode() {
  if (!canSendCode.value) return;
  sending.value = true;
  serverError.value = '';
  notice.value = '';
  try {
    await sendVerificationCode(form.email);
    notice.value = '验证码已发送，请查收邮箱';
    countdown.value = 60;
    timer = setInterval(() => {
      countdown.value -= 1;
      if (!countdown.value) clearInterval(timer);
    }, 1000);
  } catch (error) {
    serverError.value = error.message;
  } finally {
    sending.value = false;
  }
}
async function handleSubmit() {
  if (submitting.value) return;
  errors.email = validateEmail(form.email);
  errors.password = validatePassword(form.password, { isNew: true });
  errors.verificationCode = validateVerificationCode(form.verificationCode);
  serverError.value = '';
  if (Object.values(errors).some(Boolean)) {
    await nextTick();
    formElement.value?.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  submitting.value = true;
  try {
    await auth.register({ ...form });
    form.password = '';
    form.verificationCode = '';
    await router.replace({ name: 'login' });
  } catch (error) {
    serverError.value = error.message || '注册失败';
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <section class="auth-view">
    <span class="sticker sticker--r2">食堂手账 · JOIN US</span>
    <h1><span>写下你的校园口味</span>注册</h1>
    <p class="auth-view__intro handwrite">
      以后每次排队、踩雷和真香都有地方记录。
    </p>
    <form ref="formElement" novalidate @submit.prevent="handleSubmit">
      <p v-if="serverError" role="alert" class="auth-view__error">
        {{ serverError }}
      </p>
      <p v-if="notice" role="status">{{ notice }}</p>
      <AuthField
        v-model="form.email"
        label="学号邮箱"
        type="email"
        autocomplete="email"
        :error="errors.email"
      />
      <AuthField
        v-model="form.verificationCode"
        label="邮箱验证码"
        :error="errors.verificationCode"
      />
      <InkButton :disabled="!canSendCode" @click="handleSendCode">{{
        sending
          ? '发送中…'
          : countdown
            ? countdown + 's 后可重新发送'
            : '发送验证码'
      }}</InkButton>
      <AuthField
        v-model="form.password"
        label="密码"
        type="password"
        autocomplete="new-password"
        :error="errors.password"
      />
      <p class="auth-view__hint">
        密码：8–128 位 ASCII 字符，须包含字母和数字。
      </p>
      <InkButton
        variant="primary"
        type="submit"
        :disabled="submitting || sending"
        >{{ submitting ? '注册中…' : '注册' }}</InkButton
      >
    </form>
    <p>已有账号？<RouterLink :to="{ name: 'login' }">去登录</RouterLink></p>
  </section>
</template>
<style scoped lang="scss">
.auth-view {
  position: relative;
  width: min(calc(100% - 32px), 440px);
  margin: 8vh auto;
  padding: var(--ft-space-4);
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  box-shadow: 8px 10px 0 rgb(58 36 24 / 24%);
  transform: rotate(0.7deg);
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
.auth-view__hint {
  margin: calc(-1 * var(--ft-space-1)) 0 0;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}
.auth-view__error {
  color: var(--ft-color-danger);
  overflow-wrap: anywhere;
}
a {
  color: var(--ft-color-primary);
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
