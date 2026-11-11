<script setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/useAuthStore.js';
import {
  fetchRegistrationPolicy,
  sendVerificationCode,
} from '@/api/auth.api.js';
import AuthField from '@/components/auth/AuthField.vue';
import InkButton from '@/components/base/InkButton.vue';
import {
  validateEmail,
  validateInvitationCode,
  validatePassword,
  validateVerificationCode,
} from '@/utils/authValidators.js';
const router = useRouter();
const auth = useAuthStore();
const form = reactive({
  email: '',
  invitationCode: '',
  password: '',
  confirmPassword: '',
  verificationCode: '',
});
const errors = reactive({
  email: '',
  invitationCode: '',
  password: '',
  confirmPassword: '',
  verificationCode: '',
});
const policy = ref(null);
const policyLoading = ref(false);
const policyError = ref('');
const policyReady = computed(
  () => Boolean(policy.value) && !policyLoading.value && !policyError.value,
);
const closed = computed(() => policy.value?.mode === 'closed');
const invitationRequired = computed(
  () => policy.value?.invitationRequired === true,
);
const showInvitation = computed(() => Boolean(policy.value) && !closed.value);
const canSendEmailCode = computed(
  () => policyReady.value && policy.value?.canSendEmailCode === true,
);
const invitationLabel = computed(() =>
  invitationRequired.value ? '邀请码（必填）' : '邀请码（可选）',
);
let policyRequest = 0;
async function loadPolicy() {
  const request = ++policyRequest;
  policyLoading.value = true;
  policyError.value = '';
  try {
    const data = await fetchRegistrationPolicy();
    if (request !== policyRequest) return;
    policy.value = data;
  } catch (error) {
    if (request !== policyRequest) return;
    policy.value = null;
    policyError.value = error.message || '无法读取注册策略，请重试';
  } finally {
    if (request === policyRequest) policyLoading.value = false;
  }
}
onMounted(loadPolicy);
const confirmationError = () =>
  !form.confirmPassword
    ? '请再次输入密码'
    : form.confirmPassword !== form.password
      ? '两次输入的密码不一致'
      : '';
watch(
  () => [form.password, form.confirmPassword],
  () => {
    if (form.confirmPassword || errors.confirmPassword)
      errors.confirmPassword = confirmationError();
  },
);
const submitting = ref(false);
const sending = ref(false);
const serverError = ref('');
const notice = ref('');
const countdown = ref(0);
const formElement = ref(null);
let timer;
const canSendCode = computed(
  () =>
    canSendEmailCode.value &&
    !sending.value &&
    !submitting.value &&
    countdown.value === 0 &&
    !validateEmail(form.email),
);
onUnmounted(() => {
  clearInterval(timer);
  policyRequest += 1;
});
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
    if (error?.bizCode === 'REGISTRATION_CLOSED') await loadPolicy();
  } finally {
    sending.value = false;
  }
}
async function handleSubmit() {
  if (submitting.value || !policyReady.value || closed.value) return;
  errors.email = validateEmail(form.email);
  errors.invitationCode = validateInvitationCode(
    form.invitationCode,
    invitationRequired.value,
  );
  errors.password = validatePassword(form.password, { isNew: true });
  errors.confirmPassword = confirmationError();
  errors.verificationCode = validateVerificationCode(form.verificationCode);
  serverError.value = '';
  if (Object.values(errors).some(Boolean)) {
    await nextTick();
    formElement.value?.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  submitting.value = true;
  try {
    const payload = {
      email: form.email,
      password: form.password,
      verificationCode: form.verificationCode,
    };
    const invitationCode = form.invitationCode.trim();
    if (invitationCode) payload.invitationCode = invitationCode;
    await auth.register(payload);
    form.password = '';
    form.confirmPassword = '';
    form.verificationCode = '';
    form.invitationCode = '';
    await router.replace({ name: 'login' });
  } catch (error) {
    serverError.value = error.message || '注册失败';
    if (
      ['REGISTRATION_CLOSED', 'INVITATION_REQUIRED'].includes(error?.bizCode)
    ) {
      await loadPolicy();
    }
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
    <p v-if="policyLoading" role="status" class="auth-view__hint">
      正在读取注册策略…
    </p>
    <p v-else-if="policyError" role="alert" class="auth-view__error">
      {{ policyError }}
      <button type="button" class="auth-view__retry" @click="loadPolicy">
        重试
      </button>
    </p>
    <section v-if="closed" class="auth-view__closed" role="alert">
      <h2>注册暂未开放</h2>
      <p>当前部署已关闭注册与邮箱验证码发送，请稍后再试。</p>
    </section>
    <form v-else ref="formElement" novalidate @submit.prevent="handleSubmit">
      <p v-if="serverError" role="alert" class="auth-view__error">
        {{ serverError }}
      </p>
      <p v-if="notice" role="status">{{ notice }}</p>
      <p class="auth-view__hint">
        支持 QQ、163、126、Gmail、Outlook
        等主流邮箱；使用学校邮箱注册可直接发帖评论，其他邮箱注册后为只读访客，可在「我的」绑定学校邮箱解锁。
      </p>
      <AuthField
        v-model="form.email"
        label="邮箱"
        type="email"
        autocomplete="email"
        :error="errors.email"
        :disabled="!policyReady"
      />
      <AuthField
        v-if="showInvitation"
        v-model="form.invitationCode"
        :label="invitationLabel"
        autocomplete="off"
        :maxlength="12"
        :error="errors.invitationCode"
        :disabled="!policyReady"
      />
      <p v-if="invitationRequired" class="auth-view__hint">
        当前注册需要平台发放的 12 位邀请码；大小写均可。
      </p>
      <AuthField
        v-model="form.verificationCode"
        label="邮箱验证码"
        :error="errors.verificationCode"
        :disabled="!policyReady"
      />
      <p v-if="policyReady && !canSendEmailCode" class="auth-view__hint">
        当前邮件验证码发送未启用，请联系管理员。
      </p>
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
        :disabled="!policyReady"
      />
      <p class="auth-view__hint">
        密码：8–128 位 ASCII 字符，须包含字母和数字。
      </p>
      <AuthField
        v-model="form.confirmPassword"
        label="确认密码"
        type="password"
        autocomplete="new-password"
        :error="errors.confirmPassword"
        :disabled="!policyReady"
      />
      <InkButton
        variant="primary"
        type="submit"
        :disabled="submitting || sending || !policyReady"
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
.auth-view__retry {
  margin-left: var(--ft-space-1);
  border: 0;
  background: transparent;
  color: var(--ft-color-primary);
  cursor: pointer;
  text-decoration: underline;
}
.auth-view__closed {
  padding: var(--ft-space-2);
  border: 1px dashed var(--ft-color-secondary);
  background: var(--zine-paper-card);

  h2 {
    margin: 0 0 var(--ft-space-1);
    font-family: var(--ft-font-family-title);
    font-size: 24px;
  }

  p {
    margin: 0;
    color: var(--ft-color-text-muted);
  }
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
