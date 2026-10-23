<script setup>
import { ElDialog } from 'element-plus';
import CommunityPostContent from './CommunityPostContent.vue';
defineProps({ modelValue: Boolean, postId: { type: String, default: '' } });
const emit = defineEmits(['update:modelValue', 'deleted']);
</script>
<template>
  <ElDialog
    :model-value="modelValue"
    title="校园食记"
    width="min(1080px, 96vw)"
    append-to-body
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <CommunityPostContent
      v-if="modelValue && postId"
      :key="postId"
      :post-id="postId"
      @deleted="
        emit('deleted');
        emit('update:modelValue', false);
      "
    />
  </ElDialog>
</template>
