<script setup>
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue';
import AuthField from '@/components/auth/AuthField.vue';
import InkButton from '@/components/base/InkButton.vue';
import {
  sendPasswordResetCode,
  verifyPasswordResetCode,
  resetPassword,
} from '@/api/auth.api.js';
import {
  validateLoginId,
  validatePassword,
  validateVerificationCode,
} from '@/utils/authValidators.js';
import { useAuthStore } from '@/store/useAuthStore.js';

const auth = useAuthStore();
const stage = ref(1),
  busy = ref(false),
  sending = ref(false),
  serverError = ref(''),
  notice = ref('');
const form = reactive({
  email: '',
  verificationCode: '',
  password: '',
  confirmPassword: '',
});
const errors = reactive({
  email: '',
  verificationCode: '',
  password: '',
  confirmPassword: '',
});
const formElement = ref(null),
  countdown = ref(0),
  expired = ref(false);
let resetToken = '',
  expiresAt = 0,
  deadline = 0,
  alive = true;
const timer = setInterval(() => {
  countdown.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}, 1000);
onUnmounted(() => {
  alive = false;
  clearInterval(timer);
  resetToken = '';
  form.password = '';
  form.confirmPassword = '';
  form.verificationCode = '';
});
const canSend = computed(
  () =>
    !busy.value &&
    !sending.value &&
    countdown.value === 0 &&
    !validateLoginId(form.email),
);
watch(
  () => form.email,
  () => {
    form.verificationCode = '';
    notice.value = '';
  },
);
function reverify() {
  if (busy.value || sending.value) return;
  stage.value = 1;
  resetToken = '';
  expiresAt = 0;
  expired.value = false;
  form.password = '';
  form.confirmPassword = '';
  form.verificationCode = '';
  serverError.value = '';
  notice.value = '';
  Object.keys(errors).forEach((key) => (errors[key] = ''));
}
async function sendCode() {
  if (!canSend.value) return;
  sending.value = true;
  serverError.value = '';
  notice.value = '';
  try {
    const result = await sendPasswordResetCode(form.email);
    if (!alive) return;
    deadline = Date.now() + result.resendAfterSeconds * 1000;
    countdown.value = result.resendAfterSeconds;
    notice.value =
      '请求已受理。若该邮箱已注册且账号可用，将收到6位数字验证码。';
  } catch (error) {
    if (alive) serverError.value = error.message;
  } finally {
    if (alive) sending.value = false;
  }
}
async function submit() {
  if (busy.value || sending.value) return;
  serverError.value = '';
  notice.value = '';
  if (stage.value === 1) {
    errors.email = validateLoginId(form.email);
    errors.verificationCode = validateVerificationCode(form.verificationCode);
  } else {
    errors.password = validatePassword(form.password, { isNew: true });
    errors.confirmPassword = !form.confirmPassword
      ? '请再次输入新密码'
      : form.password !== form.confirmPassword
        ? '两次输入的新密码不一致'
        : '';
    if (!resetToken || Date.now() >= expiresAt) {
      expired.value = true;
      serverError.value = '验证已过期，请重新验证邮箱。';
      return;
    }
  }
  if (Object.values(errors).some(Boolean)) {
    await nextTick();
    formElement.value?.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  busy.value = true;
  try {
    if (stage.value === 1) {
      const result = await verifyPasswordResetCode(
        form.email,
        form.verificationCode,
      );
      if (!alive) return;
      if (
        typeof result.resetToken !== 'string' ||
        !result.resetToken ||
        !Number.isFinite(Date.parse(result.expiresAt))
      )
        throw new Error('验证响应异常，请重新验证邮箱');
      resetToken = result.resetToken;
      expiresAt = Date.parse(result.expiresAt);
      form.verificationCode = '';
      stage.value = 2;
      await nextTick();
      formElement.value?.querySelector('input')?.focus();
    } else {
      await resetPassword(resetToken, form.password);
      if (!alive) return;
      resetToken = '';
      form.password = '';
      form.confirmPassword = '';
      auth.clear();
      stage.value = 3;
    }
  } catch (error) {
    if (!alive) return;
    serverError.value = error.message;
    if (
      stage.value === 2 &&
      (['PASSWORD_RESET_TOKEN_INVALID', 'PASSWORD_RESET_UNAVAILABLE'].includes(
        error.bizCode || error.code,
      ) ||
        ['NETWORK', 'TIMEOUT', 'SERVER'].includes(error.code))
    ) {
      expired.value = true;
      resetToken = '';
    }
  } finally {
    if (alive) busy.value = false;
  }
}
</script>

<template>
  <section class="recovery-view">
    <RouterLink :to="{ name: 'login' }">← 返回登录</RouterLink>
    <span class="sticker">找回你的食堂手账</span>
    <h1>
      {{ stage === 1 ? '找回密码' : stage === 2 ? '设置新密码' : '密码已重置' }}
    </h1>
    <template v-if="stage < 3">
      <p class="steps">
        <strong :class="{ active: stage === 1 }">01 验证邮箱</strong
        ><strong :class="{ active: stage === 2 }">02 设置新密码</strong>
      </p>
      <p v-if="serverError" role="alert" class="error">{{ serverError }}</p>
      <p v-if="notice" role="status" class="hint">{{ notice }}</p>
      <form ref="formElement" novalidate @submit.prevent="submit">
        <template v-if="stage === 1">
          <AuthField
            v-model="form.email"
            label="账号绑定邮箱"
            type="email"
            autocomplete="email"
            :maxlength="254"
            :disabled="busy || sending"
            :error="errors.email"
          />
          <AuthField
            v-model="form.verificationCode"
            label="邮箱验证码"
            autocomplete="one-time-code"
            inputmode="numeric"
            :maxlength="6"
            :disabled="busy || sending"
            :error="errors.verificationCode"
          />
          <InkButton :disabled="!canSend" @click="sendCode">{{
            sending
              ? '发送中…'
              : countdown
                ? `${countdown}s 后重发`
                : '发送验证码'
          }}</InkButton>
          <p class="hint">
            验证码10分钟内有效。验证通过后，填写新密码并再次确认。
          </p>
        </template>
        <template v-else>
          <p class="hint">邮箱验证已通过。完成重置后，所有设备需要重新登录。</p>
          <AuthField
            v-model="form.password"
            label="新密码"
            type="password"
            autocomplete="new-password"
            :maxlength="128"
            :disabled="busy || expired"
            :error="errors.password"
          />
          <p class="hint">8–128 位ASCII可见字符，须包含字母和数字。</p>
          <AuthField
            v-model="form.confirmPassword"
            label="确认新密码"
            type="password"
            autocomplete="new-password"
            :maxlength="128"
            :disabled="busy || expired"
            :error="errors.confirmPassword"
          />
        </template>
        <InkButton
          variant="primary"
          type="submit"
          :disabled="busy || sending || expired"
          >{{
            busy ? '处理中…' : stage === 1 ? '验证并继续' : '确认重置密码'
          }}</InkButton
        >
        <InkButton v-if="stage === 2" :disabled="busy" @click="reverify"
          >更换邮箱 / 重新验证</InkButton
        >
      </form>
    </template>
    <div v-else role="status">
      <p>请使用新密码登录。此前登录的设备需要重新登录。</p>
      <RouterLink :to="{ name: 'login' }">返回登录</RouterLink>
    </div>
  </section>
</template>

<style scoped lang="scss">
.recovery-view {
  width: min(calc(100% - 32px), 440px);
  margin: 8vh auto;
  padding: var(--ft-space-4);
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  box-shadow: 8px 10px 0 rgb(58 36 24 / 24%);
}
.sticker {
  display: table;
  margin: 24px 0 12px;
}
h1 {
  font-family: var(--ft-font-family-title);
  font-size: 36px;
}
form {
  display: grid;
  gap: 16px;
}
.steps {
  display: flex;
  gap: 20px;
  padding-bottom: 16px;
  border-bottom: 1px dashed var(--ft-color-border);
  color: var(--ft-color-text-muted);
  font-size: 13px;
}
.active,
a {
  color: var(--ft-color-primary);
}
.error {
  color: var(--ft-color-danger);
  overflow-wrap: anywhere;
}
.hint {
  font-size: 14px;
  color: var(--ft-color-text-muted);
}
@media (max-width: 520px) {
  .recovery-view {
    width: 100%;
    margin: 0;
    padding: var(--app-mobile-card-padding);
    box-shadow: var(--app-mobile-shadow);
  }
}
</style>
