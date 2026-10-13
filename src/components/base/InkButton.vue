<script setup>
defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'primary'].includes(value),
  },
  type: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'submit', 'reset'].includes(value),
  },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['click']);

function onClick(event) {
  emit('click', event);
}
</script>

<template>
  <button
    class="button-ink"
    :class="{ 'is-primary': variant === 'primary' }"
    :type="type"
    :disabled="disabled"
    @click="onClick"
  >
    <slot />
  </button>
</template>
