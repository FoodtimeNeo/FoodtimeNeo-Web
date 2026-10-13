<script setup>
import { computed, onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/store/useAuthStore.js';
import { sendVerificationCode } from '@/api/auth.api.js';
import AuthField from '@/components/auth/AuthField.vue';
import InkButton from '@/components/base/InkButton.vue';
import {
  validateEmail,
  validateNickname,
  validatePassword,
  validateVerificationCode,
} from '@/utils/authValidators.js';

const router = useRouter();
const auth = useAuthStore();

const form = reactive({
  role: 'user',
  email: '',
  nickname: '',
  password: '',
  verificationCode: '',
  inviteCode: '',
});
const errors = reactive({
  email: '',
  nickname: '',
  password: '',
  verificationCode: '',
  inviteCode: '',
});
const submitting = ref(false);

// 验证码发送倒计时（秒）
const countdown = ref(0);
let timer = null;
const canSendCode = computed(
  () => countdown.value === 0 && !validateEmail(form.email),
);

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

async function handleSendCode() {
  errors.email = validateEmail(form.email);
  if (errors.email) return;
  try {
    await sendVerificationCode(form.email);
    ElMessage.success('验证码已发送，请查收邮箱');
    countdown.value = 60;
    timer = setInterval(() => {
      countdown.value -= 1;
      if (countdown.value <= 0) clearInterval(timer);
    }, 1000);
  } catch (error) {
    ElMessage.error(error.message || '发送失败');
  }
}

function validate() {
  errors.email = validateEmail(form.email);
  errors.nickname = validateNickname(form.nickname);
  errors.password = validatePassword(form.password);
  errors.verificationCode = validateVerificationCode(form.verificationCode);
  errors.inviteCode =
    form.role === 'admin' && !form.inviteCode.trim()
      ? '管理员注册需要邀请码'
      : '';
  return !Object.values(errors).some(Boolean);
}

async function handleSubmit() {
  if (submitting.value || !validate()) return;
  submitting.value = true;
  try {
    await auth.register({
      email: form.email.trim(),
      nickname: form.nickname.trim(),
      password: form.password,
      verificationCode: form.verificationCode,
      role: form.role,
      inviteCode: form.role === 'admin' ? form.inviteCode.trim() : '',
    });
    ElMessage.success('注册成功，请登录');
    router.replace({ name: 'login' });
  } catch (error) {
    ElMessage.error(error.message || '注册失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="auth-view">
    <h1 class="auth-view__title">注册</h1>
    <p class="auth-view__hint">用户可直接注册；管理员注册需要邀请码。</p>

    <div class="auth-view__roles">
      <button
        type="button"
        class="auth-view__role"
        :class="{ 'is-active': form.role === 'user' }"
        @click="form.role = 'user'"
      >
        普通用户
      </button>
      <button
        type="button"
        class="auth-view__role"
        :class="{ 'is-active': form.role === 'admin' }"
        @click="form.role = 'admin'"
      >
        管理员
      </button>
    </div>

    <form class="auth-view__form" novalidate @submit.prevent="handleSubmit">
      <AuthField
        v-model="form.email"
        label="邮箱"
        type="email"
        autocomplete="email"
        :error="errors.email"
      />
      <div class="auth-view__code">
        <AuthField
          v-model="form.verificationCode"
          label="验证码"
          :error="errors.verificationCode"
        />
        <InkButton :disabled="!canSendCode" @click="handleSendCode">
          {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
        </InkButton>
      </div>
      <AuthField
        v-model="form.nickname"
        label="昵称"
        :error="errors.nickname"
      />
      <AuthField
        v-model="form.password"
        label="密码"
        type="password"
        autocomplete="new-password"
        :error="errors.password"
      />
      <AuthField
        v-if="form.role === 'admin'"
        v-model="form.inviteCode"
        label="管理员邀请码"
        :error="errors.inviteCode"
      />
      <InkButton variant="primary" type="submit" :disabled="submitting">
        {{ submitting ? '注册中…' : '注册' }}
      </InkButton>
    </form>

    <p class="auth-view__switch">
      已有账号？
      <RouterLink :to="{ name: 'login' }">去登录</RouterLink>
    </p>
  </section>
</template>

<style scoped lang="scss">
.auth-view {
  width: min(100% - 32px, 440px);
  margin: 8vh auto;
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

  &__roles {
    display: flex;
    gap: var(--ft-space-2);
    margin-bottom: var(--ft-space-3);
  }

  &__role {
    flex: 1;
    padding: 10px;
    border: 2px solid var(--ft-color-text);
    background: var(--zine-paper-card);
    font-weight: 700;
    cursor: pointer;

    &.is-active {
      background: var(--ft-color-primary);
      color: #fff;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: var(--ft-space-2);
  }

  &__code {
    display: flex;
    gap: var(--ft-space-2);
    align-items: flex-end;
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
