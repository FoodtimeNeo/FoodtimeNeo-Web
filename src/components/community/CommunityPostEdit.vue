<script setup>
import { computed, ref } from 'vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import PostCreateModal from './PostCreateModal.vue';
const props = defineProps({ post: { type: Object, required: true } });
const emit = defineEmits(['edited']);
const auth = useAuthStore(),
  open = ref(false);
const allowed = computed(
  () =>
    auth.user?.id === props.post.userId &&
    !auth.isRestricted &&
    ['user', 'admin', 'superadmin'].includes(auth.role),
);
</script>
<template>
  <div v-if="allowed" class="post-edit-entry">
    <button type="button" class="button-ink" @click="open = true">
      修改食记
    </button>
    <PostCreateModal
      v-if="open"
      v-model="open"
      :edit-post="post"
      :initial-data="post"
      @edited="emit('edited', $event)"
    />
  </div>
</template>
<style scoped>
.post-edit-entry {
  margin: 8px 0 12px;
}
button {
  min-height: 44px;
}
</style>
