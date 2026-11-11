<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/store/useAuthStore.js';
import { invalidateSession } from '@/api/http.js';
import { fetchAccountLifecycle } from '@/api/account-lifecycle.api.js';
import { formatTime } from '@/utils/recordLabels.js';
import AccountEmailAction from '@/components/profile/AccountEmailAction.vue';
import BackLink from '@/components/base/BackLink.vue';

const auth = useAuthStore(),
  router = useRouter(),
  route = useRoute();
const summary = ref(null),
  error = ref(''),
  message = ref(''),
  loading = ref(false),
  busy = ref(false);
const receipt = computed(() =>
  route.query.unboundAccount === auth.user?.id &&
  Number.isFinite(Date.parse(route.query.schoolEmailReusableAt))
    ? `学校邮箱已解绑，当前为访客身份。学校邮箱可在 ${formatTime(route.query.schoolEmailReusableAt)}（UTC+8）后重新绑定。`
    : '',
);
let sequence = 0,
  active = true;
onBeforeUnmount(() => {
  active = false;
  sequence++;
});
async function load() {
  const ticket = ++sequence;
  loading.value = true;
  error.value = '';
  summary.value = null;
  try {
    const value = await fetchAccountLifecycle();
    if (active && ticket === sequence) summary.value = value;
  } catch (failure) {
    if (active && ticket === sequence)
      error.value = failure.message || '读取失败，请重试';
  } finally {
    if (active && ticket === sequence) loading.value = false;
  }
}
watch(
  () => `${auth.user?.id}:${auth.role}`,
  () => {
    busy.value = false;
    summary.value = null;
    if (auth.user) load();
    else sequence++;
  },
  { immediate: true },
);
async function unbound(result) {
  const id = result.profile.id;
  auth.setSession({ user: result.profile });
  message.value = `学校邮箱已解绑，当前为访客身份。学校邮箱可在 ${formatTime(result.schoolEmailReusableAt)}（UTC+8）后重新绑定。`;
  await router.replace({
    name: 'accountLifecycle',
    query: {
      unboundAccount: id,
      schoolEmailReusableAt: result.schoolEmailReusableAt,
    },
  });
}
async function deleted(result) {
  auth.clear();
  invalidateSession();
  await router.replace({ name: 'login', query: { accountDeleted: '1' } });
  ElMessage.success(
    `账号已注销，邮箱可在 ${formatTime(result.emailsReusableAt)}（UTC+8）后重新使用。`,
  );
}
</script>
<template>
  <section class="account-lifecycle">
    <BackLink />
    <h1 class="section-title">账号安全与注销</h1>
    <p>管理员和超级管理员不能注销、绑定或解绑学校邮箱。</p>
    <p v-if="loading" role="status">读取账号状态中…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="message || receipt" role="status">{{ message || receipt }}</p>
    <button :disabled="loading || busy" @click="load">重新读取账号状态</button>
    <template v-if="summary">
      <p v-if="!summary.canDelete">
        此账号为管理账号，不能执行注销或学校邮箱变更。
      </p>
      <AccountEmailAction
        v-if="summary.canUnbind"
        :key="`${auth.user.id}:unbind:${summary.schoolEmail}`"
        kind="unbind"
        :locked="busy"
        :email="summary.schoolEmail"
        @done="unbound"
        @busy="busy = $event"
      />
      <p v-else-if="summary.canDelete">
        当前未绑定学校邮箱。注销时验证注册邮箱；绑定学校邮箱可前往个人页。
      </p>
      <AccountEmailAction
        v-if="summary.canDelete"
        :key="`${auth.user.id}:delete:${summary.verificationEmail}`"
        kind="delete"
        :locked="busy"
        :email="summary.verificationEmail"
        :available-at="summary.deletionCodeAvailableAt"
        @done="deleted"
        @refresh="load"
        @busy="busy = $event"
      />
    </template>
  </section>
</template>
<style scoped>
.account-lifecycle {
  max-width: 760px;
  margin: auto;
  overflow-wrap: anywhere;
}
button {
  padding: 10px 16px;
  min-height: 44px;
  font: inherit;
  background: var(--zine-paper-card);
  color: var(--ft-color-text);
  border: 1px solid var(--ft-color-border);
}
[role='alert'] {
  color: var(--ft-color-danger);
}
</style>
