<script setup>
defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (value) =>
      ['default', 'primary', 'danger', 'stamp-red', 'stamp-blue'].includes(
        value,
      ),
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
    :class="{
      'is-primary': variant === 'primary',
      'is-danger': variant === 'danger',
      'is-stamp-red': variant === 'stamp-red',
      'is-stamp-blue': variant === 'stamp-blue',
    }"
    :type="type"
    :disabled="disabled"
    @click="onClick"
  >
    <slot />
  </button>
</template>
