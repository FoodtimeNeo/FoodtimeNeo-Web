<script setup>
import { computed, onScopeDispose, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  bindSchoolEmail,
  sendSchoolEmailCode,
} from '@/api/school-email.api.js';

const emit = defineEmits(['bound']);
const email = ref('');
const code = ref('');
const sending = ref(false);
const submitting = ref(false);
const countdown = ref(0);
const failure = ref('');
let timer = null;

onScopeDispose(() => clearInterval(timer));

const validEmail = computed(() =>
  /^[0-9]+@bjtu\.edu\.cn$/.test(email.value.trim().toLowerCase()),
);
const canSend = computed(
  () => validEmail.value && !sending.value && countdown.value === 0,
);
const canSubmit = computed(
  () =>
    validEmail.value &&
    /^[0-9]{6}$/.test(code.value.trim()) &&
    !submitting.value,
);

function startCountdown() {
  countdown.value = 60;
  clearInterval(timer);
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) clearInterval(timer);
  }, 1000);
}

async function sendCode() {
  if (!canSend.value) return;
  sending.value = true;
  failure.value = '';
  try {
    await sendSchoolEmailCode(email.value.trim().toLowerCase());
    ElMessage.success('验证码已发送到学校邮箱');
    startCountdown();
  } catch (error) {
    failure.value = error.message || '发送失败，请稍后重试';
  } finally {
    sending.value = false;
  }
}

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  failure.value = '';
  try {
    const profile = await bindSchoolEmail({
      email: email.value.trim().toLowerCase(),
      verificationCode: code.value.trim(),
    });
    ElMessage.success('绑定成功，已解锁发布权限');
    emit('bound', profile);
  } catch (error) {
    failure.value = error.message || '绑定失败，请核对验证码';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="school-binder" aria-label="绑定学校邮箱">
    <h2>绑定学校邮箱</h2>
    <p class="school-binder__hint">
      当前是访客身份，只能浏览。绑定学号邮箱后即可发帖、评论、点赞与投稿。
    </p>
    <p v-if="failure" role="alert">{{ failure }}</p>
    <label class="school-binder__field">
      <span>学校邮箱</span>
      <input
        v-model="email"
        type="email"
        inputmode="email"
        autocomplete="email"
        placeholder="例如 20260001@bjtu.edu.cn"
      />
    </label>
    <div class="school-binder__actions">
      <button
        type="button"
        class="button-ink"
        :disabled="!canSend"
        @click="sendCode"
      >
        {{
          sending
            ? '发送中…'
            : countdown > 0
              ? `${countdown}s 后可重发`
              : '发送验证码'
        }}
      </button>
    </div>
    <label class="school-binder__field">
      <span>验证码</span>
      <input
        v-model="code"
        inputmode="numeric"
        maxlength="6"
        autocomplete="one-time-code"
        placeholder="6 位数字"
      />
    </label>
    <button
      type="button"
      class="button-ink"
      :disabled="!canSubmit"
      @click="submit"
    >
      {{ submitting ? '绑定中…' : '绑定并解锁' }}
    </button>
  </section>
</template>

<style scoped>
.school-binder {
  display: grid;
  gap: 12px;
  margin: 16px 0 24px;
  padding: 16px;
  border: 1px dashed var(--zine-stamp-red);
  background: var(--ft-color-surface);
}
.school-binder h2 {
  margin: 0;
  font-size: 18px;
}
.school-binder__hint {
  margin: 0;
  color: var(--ft-color-text-muted);
  font-size: 14px;
}
.school-binder__field {
  display: grid;
  gap: 6px;
  font-weight: 700;
}
.school-binder__field input {
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--ft-color-border);
  background: var(--ft-color-surface);
  font: inherit;
}
.school-binder__actions {
  display: flex;
}
</style>
