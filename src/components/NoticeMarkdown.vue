<script setup>
import { computed } from 'vue';
import { renderNoticeMarkdown } from '@/utils/noticeMarkdown.js';
const props = defineProps({ content: { type: String, default: '' } });
const rendered = computed(() => renderNoticeMarkdown(props.content));
</script>

<template>
  <!-- Raw HTML is disabled in the parser and sanitized at this rendering boundary. -->
  <!-- eslint-disable-next-line vue/no-v-html -- renderNoticeMarkdown disables raw HTML and sanitizes the result. -->
  <div class="notice-markdown" v-html="rendered"></div>
</template>

<style scoped>
.notice-markdown {
  min-width: 0;
  font-size: 16px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.notice-markdown :deep(h1),
.notice-markdown :deep(h2),
.notice-markdown :deep(h3) {
  line-height: 1.4;
  margin: 1.2em 0 0.6em;
}
.notice-markdown :deep(> :first-child) {
  margin-top: 0;
}
.notice-markdown :deep(a) {
  color: var(--ft-color-primary);
  text-decoration: underline;
}
.notice-markdown :deep(a:focus-visible) {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}
.notice-markdown :deep(pre) {
  overflow-x: auto;
  padding: 12px;
  background: var(--zine-paper-card, #f7f2e8);
  border: 1px solid var(--ft-color-text-muted);
}
.notice-markdown :deep(code) {
  white-space: break-spaces;
}
.notice-markdown :deep(pre code) {
  white-space: pre;
}
.notice-markdown :deep(blockquote) {
  margin-inline: 0;
  padding-left: 16px;
  border-left: 3px solid var(--ft-color-primary);
}
.notice-markdown :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}
.notice-markdown :deep(th),
.notice-markdown :deep(td) {
  padding: 8px;
  border: 1px solid var(--ft-color-text-muted);
}
.notice-markdown :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
}
</style>
