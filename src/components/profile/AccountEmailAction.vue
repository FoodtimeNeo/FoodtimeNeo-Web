<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { useAuthStore } from '@/store/useAuthStore.js';
import {
  sendAccountActionCode,
  confirmAccountAction,
} from '@/api/account-lifecycle.api.js';
import { formatTime } from '@/utils/recordLabels.js';

const props = defineProps({
  kind: { type: String, required: true },
  email: { type: String, required: true },
  availableAt: { type: String, default: null },
  locked: { type: Boolean, default: false },
});
const emit = defineEmits(['done', 'refresh', 'busy']);
const auth = useAuthStore();
const deleting = computed(() => props.kind === 'delete');
const title = computed(() => (deleting.value ? '注销账号' : '解绑学校邮箱'));
const code = ref(''),
  accepted = ref(false),
  failure = ref(''),
  message = ref('');
const working = ref(false),
  seconds = ref(0),
  nextSendAt = ref(props.availableAt);
let timer,
  active = true;
const actor = `${auth.user?.id}:${auth.role}`;
const validActor = () =>
  active &&
  actor === `${auth.user?.id}:${auth.role}` &&
  ['visitor', 'user'].includes(auth.role);
onBeforeUnmount(() => {
  active = false;
  clearInterval(timer);
  code.value = '';
});
function busy(value) {
  working.value = value;
  emit('busy', value);
}
async function send() {
  if (
    !validActor() ||
    props.locked ||
    working.value ||
    seconds.value ||
    (deleting.value && nextSendAt.value)
  )
    return;
  busy(true);
  failure.value = '';
  message.value = '';
  try {
    const result = await sendAccountActionCode(props.kind);
    if (!validActor()) return;
    if (
      result?.verificationEmail !== props.email ||
      !Number.isFinite(Date.parse(result?.expiresAt)) ||
      !Number.isFinite(Date.parse(result?.nextSendAt))
    ) {
      emit('refresh');
      throw new Error('验证邮箱或账号状态已变化，请重新读取状态后检查邮箱');
    }
    nextSendAt.value = result.nextSendAt;
    message.value = deleting.value
      ? '验证码已发送，今天不能再次发送，请在 15 分钟内完成验证。'
      : '验证码已发送到当前学校邮箱，15 分钟内有效。';
    if (!deleting.value) {
      seconds.value = 60;
      clearInterval(timer);
      timer = setInterval(() => {
        if (--seconds.value <= 0) clearInterval(timer);
      }, 1000);
    }
  } catch (error) {
    if (validActor()) {
      failure.value = error.message || '发送失败，请重新读取状态后重试';
      if (error.bizCode === 'DELETION_CODE_DAILY_LIMIT') emit('refresh');
    }
  } finally {
    if (active) busy(false);
  }
}
async function submit() {
  if (
    !validActor() ||
    props.locked ||
    working.value ||
    !accepted.value ||
    !/^[0-9]{6}$/.test(code.value.trim())
  )
    return;
  busy(true);
  failure.value = '';
  message.value = '';
  try {
    await ElMessageBox.confirm(
      deleting.value
        ? '注销立即生效且不可撤销。历史内容显示“已注销用户”，新注册账号不继承旧数据；登录邮箱和学校邮箱需冷却 1 小时后才能重新使用。'
        : '解绑会移除学校邮箱认证，账号保留，可用功能按平台当前权限策略执行；学校邮箱需冷却 1 小时后才能重新绑定。',
      title.value,
      {
        confirmButtonText: deleting.value ? '确认注销账号' : '确认解绑',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
    if (!validActor()) return;
    const result = await confirmAccountAction(props.kind, code.value.trim());
    if (!validActor()) return;
    code.value = '';
    emit('done', result);
  } catch (error) {
    if (validActor() && error !== 'cancel' && error !== 'close')
      failure.value =
        error.message || '操作未确认，请重新读取账号状态后核对结果';
  } finally {
    if (active) busy(false);
  }
}
</script>
<template>
  <section class="account-action" :aria-label="title">
    <h2>{{ title }}</h2>
    <template v-if="deleting">
      <p>
        注销立即生效且不可撤销。已发布的帖子、评论、点评和反馈保留，并显示“已注销用户”。所有设备上的旧登录会失效。
      </p>
      <p>
        登录邮箱和学校邮箱冷却
        <strong>1 小时</strong
        >后可重新注册或绑定；重新注册是全新账号，不继承旧账号数据。
      </p>
      <p>
        <strong
          >注销验证码每天只能成功发送一次，UTC+8 每天 00:00
          重置。邮件发送失败可重试；发送成功后请在 15 分钟内完成验证。</strong
        >
      </p>
    </template>
    <p v-else>
      解绑后账号依然存在，学校邮箱认证将移除，可用功能按平台当前权限策略执行。学校邮箱冷却
      <strong>1 小时</strong>后才可重新绑定；登录邮箱继续用于原账号登录。
    </p>
    <p>
      验证邮箱：<strong>{{ email }}</strong>
    </p>
    <p v-if="deleting && nextSendAt">
      今天已申请注销验证码，请检查邮箱；再次发送时间：{{
        formatTime(nextSendAt)
      }}（UTC+8）。跨日后可重新读取账号状态。
    </p>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="failure" role="alert">{{ failure }}</p>
    <button
      type="button"
      :disabled="working || locked || seconds > 0 || (deleting && !!nextSendAt)"
      @click="send"
    >
      {{
        working
          ? '处理中…'
          : seconds > 0
            ? `${seconds}s 后可重发`
            : '发送邮箱验证码'
      }}
    </button>
    <form @submit.prevent="submit">
      <label
        >邮箱验证码<input
          v-model="code"
          inputmode="numeric"
          maxlength="6"
          autocomplete="one-time-code"
          :disabled="working || locked"
      /></label>
      <label class="acknowledge"
        ><input
          v-model="accepted"
          type="checkbox"
          :disabled="working || locked"
        />{{
          deleting
            ? '我已知晓注销不可撤销，新账号不继承旧数据及邮箱 1 小时冷却规则'
            : '我已知晓解绑会移除学校邮箱认证及学校邮箱 1 小时冷却规则'
        }}</label
      >
      <button
        type="submit"
        :disabled="
          working || locked || !accepted || !/^[0-9]{6}$/.test(code.trim())
        "
      >
        {{ working ? '处理中…' : title }}
      </button>
    </form>
  </section>
</template>
<style scoped>
.account-action {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid var(--ft-color-border);
  background: var(--zine-paper-card);
  overflow-wrap: anywhere;
}
h2 {
  font-size: 22px;
}
p {
  line-height: 1.7;
}
form,
label {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}
button,
input {
  font: inherit;
  box-sizing: border-box;
  min-height: 44px;
  padding: 8px 12px;
  max-width: 100%;
  color: var(--ft-color-text);
  background: var(--ft-color-surface);
  border: 1px solid var(--ft-color-border);
}
button {
  cursor: pointer;
}
button:disabled {
  opacity: 0.55;
  cursor: default;
}
.acknowledge {
  display: flex;
  align-items: center;
}
.acknowledge input {
  flex-shrink: 0;
}
[role='alert'] {
  color: var(--ft-color-danger);
}
</style>
