<script setup>
import { onMounted, onUnmounted } from 'vue';
import CommunityPostContent from './CommunityPostContent.vue';

defineOptions({
  name: 'CommunityPostDetailModal',
});

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  postId: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue', 'deleted', 'close']);

function close() {
  emit('update:modelValue', false);
  emit('close');
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    close();
  }
}

function handleKeydown(e) {
  if (props.modelValue && e.key === 'Escape') {
    close();
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown);
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="redbook-fade">
      <div
        v-if="modelValue"
        class="redbook-modal"
        role="dialog"
        aria-modal="true"
        aria-label="帖子详情"
        @click="handleOverlayClick"
      >
        <!-- 电脑端悬浮半透明圆形关闭按钮 -->
        <button
          type="button"
          class="redbook-modal__close-btn"
          aria-label="关闭详情弹窗"
          @click="close"
        >
          ×
        </button>

        <!-- 弹窗主体卡片 -->
        <div class="redbook-modal__card" @click.stop>
          <CommunityPostContent
            v-if="modelValue && postId"
            :key="postId"
            :post-id="postId"
            is-modal
            @deleted="
              emit('deleted');
              emit('update:modelValue', false);
            "
            @close="close"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.redbook-modal {
  position: fixed;
  inset: 0;
  z-index: 2500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 68%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 24px;
  box-sizing: border-box;
  overflow: hidden;

  &__close-btn {
    position: absolute;
    top: 24px;
    right: 28px;
    z-index: 2600;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 0;
    background: rgb(255 255 255 / 85%);
    color: #222;
    font-size: 28px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 16px rgb(0 0 0 / 25%);
    backdrop-filter: blur(6px);
    transition:
      background 180ms ease,
      transform 180ms ease;

    &:hover {
      background: #fff;
      transform: scale(1.08);
    }
  }

  &__card {
    position: relative;
    width: min(94vw, 1120px);
    height: min(88vh, 840px);
    background: #fff;
    border-radius: 18px;
    box-shadow: 0 24px 64px rgb(0 0 0 / 38%);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}

// 移动端响应式（<= 768px）
@media (max-width: 768px) {
  .redbook-modal {
    padding: 0;
    background: #fff;
    backdrop-filter: none;

    &__close-btn {
      display: none;
    }

    &__card {
      width: 100vw;
      height: 100vh;
      max-height: 100vh;
      border-radius: 0;
      box-shadow: none;
    }
  }
}

// 过渡淡入动画
.redbook-fade-enter-active,
.redbook-fade-leave-active {
  transition: opacity 220ms ease;

  .redbook-modal__card {
    transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
  }
}

.redbook-fade-enter-from,
.redbook-fade-leave-to {
  opacity: 0;

  .redbook-modal__card {
    transform: scale(0.96) translateY(12px);
  }
}
</style>
